#Requires -Version 5.1
# Phase 1 sandbox wrapper (degraded same-user path).
# No new account, NTFS deny ACE, WFP filter, or proxy. Those are later phases.
# This script still refuses an elevated parent, puts the child in a Job,
# launches it on a restricted token, strips secret environment variables,
# and writes runtime/sandbox/<runId>/audit.jsonl.
param(
  [string]$File = "",
  [string[]]$ArgumentList = @(),
  [string]$Cwd = "",
  [int]$TimeoutSec = 1200,
  [string]$ProfilePath = "",
  [string]$AuditPath = "",
  [string]$RunId = "",
  [string]$CommandId = "",
  [string]$AdapterId = "runner",
  [ValidateSet("supervised", "autonomous", "end_to_end_autonomous", "stage")]
  [string]$Mode = "stage",
  [string]$Stage = "",
  [string]$TargetVersion = "",
  [string]$StdoutPath = "",
  [string]$StderrPath = "",
  [string]$PolicyPath = "",
  [switch]$StageMark
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir
if (-not $RunId) { $RunId = [DateTime]::UtcNow.ToString("yyyyMMdd_HHmmss") }
if (-not $CommandId) {
  if ($StageMark -and $Stage) { $CommandId = "stage-$Stage-mark" } else { $CommandId = [guid]::NewGuid().ToString("n").Substring(0, 12) }
}
if (-not $Cwd) { $Cwd = $WorkspaceRoot }
if (-not $ProfilePath) { $ProfilePath = Join-Path $WorkspaceRoot "runtime\SANDBOX_PROFILE.json" }
if (-not $PolicyPath) { $PolicyPath = Join-Path $WorkspaceRoot "runtime\PERMISSION_POLICY.yaml" }
if (-not $AuditPath) { $AuditPath = Join-Path $WorkspaceRoot ("runtime\sandbox\{0}\audit.json" -f $RunId) }

$AuditDir = Split-Path -Parent $AuditPath
$AuditJsonl = Join-Path $AuditDir "audit.jsonl"
$TempRoot = Join-Path $WorkspaceRoot ".aimart\sandbox-temp"
$StartedUtc = [DateTime]::UtcNow
$script:Record = $null

function ConvertTo-PlainJson {
  param($Value)
  $json = $Value | ConvertTo-Json -Compress -Depth 8
  if ($null -eq $json) { return "{}" }
  return $json
}

function Publish-AuditRecord {
  param([int]$ExitCode, [bool]$TimedOut, [string]$KillMethod, [string]$DeniedByPolicy, [bool]$HistoricalReleaseDirty)
  if (-not $script:Record) { return }
  $ended = [DateTime]::UtcNow
  $script:Record.endedAt = $ended.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $script:Record.durationMs = [int][Math]::Max(0, ($ended - $StartedUtc).TotalMilliseconds)
  $script:Record.exitCode = $ExitCode
  $script:Record.timedOut = $TimedOut
  $script:Record.killMethod = $KillMethod
  $script:Record.deniedByPolicy = $DeniedByPolicy
  $script:Record.historicalReleaseDirty = $HistoricalReleaseDirty
  New-Item -ItemType Directory -Force -Path $AuditDir | Out-Null
  $json = ConvertTo-PlainJson $script:Record
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($AuditPath, $json + "`n", $utf8)
  [System.IO.File]::AppendAllText($AuditJsonl, $json + "`n", $utf8)
}

function Stop-Sandbox {
  param(
    [int]$Code,
    [string]$Token = "",
    [bool]$TimedOut = $false,
    [string]$KillMethod = "none",
    [string]$DeniedByPolicy = "",
    [bool]$HistoricalReleaseDirty = $false
  )
  try {
    Publish-AuditRecord -ExitCode $Code -TimedOut $TimedOut -KillMethod $KillMethod -DeniedByPolicy $DeniedByPolicy -HistoricalReleaseDirty $HistoricalReleaseDirty
  } catch {
    Write-Host ("sandbox audit write failed: {0}" -f $_.Exception.Message)
  }
  if ($Token) { Write-Output $Token }
  exit $Code
}

function Test-InsideRoot {
  param([string]$Path, [string]$Root)
  $full = [System.IO.Path]::GetFullPath($Path)
  $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\')
  if ($full.TrimEnd('\') -eq $rootFull) { return $true }
  return $full.StartsWith($rootFull + "\", [System.StringComparison]::OrdinalIgnoreCase)
}

function Format-WinArg {
  param([string]$Arg)
  if ($null -eq $Arg -or $Arg.Length -eq 0) { return '""' }
  if ($Arg -notmatch '[\s"&|<>^]') { return $Arg }
  return '"' + ($Arg.Replace('"', '\"')) + '"'
}

function Format-CommandLine {
  param([string[]]$Parts)
  return (($Parts | ForEach-Object { Format-WinArg $_ }) -join " ")
}

function ConvertFrom-YamlScalar {
  param([string]$Value)
  $text = $Value.Trim()
  if ($text.Length -ge 2 -and $text.StartsWith('"') -and $text.EndsWith('"')) {
    return $text.Substring(1, $text.Length - 2).Replace('\"', '"').Replace('\\', '\')
  }
  if ($text.Length -ge 2 -and $text.StartsWith("'") -and $text.EndsWith("'")) {
    return $text.Substring(1, $text.Length - 2).Replace("''", "'")
  }
  return $text
}

function Read-PermissionRules {
  param([string]$Path)
  $rules = @()
  if (-not (Test-Path -LiteralPath $Path)) { return $rules }
  $current = $null
  $inRules = $false
  foreach ($line in @(Get-Content -LiteralPath $Path)) {
    if ($line -match '^commandRules\s*:') { $inRules = $true; continue }
    if (-not $inRules) { continue }
    if ($line -match '^\S') { break }
    if ($line -match '^\s*-\s*command:\s*(.*)$') {
      if ($null -ne $current) { $rules += $current }
      $current = @{ command = (ConvertFrom-YamlScalar $Matches[1]); action = ""; reason = ""; riskLevel = "" }
      continue
    }
    if ($null -eq $current) { continue }
    if ($line -match '^\s*action:\s*(.*)$') { $current.action = ConvertFrom-YamlScalar $Matches[1] }
    elseif ($line -match '^\s*reason:\s*(.*)$') { $current.reason = ConvertFrom-YamlScalar $Matches[1] }
    elseif ($line -match '^\s*riskLevel:\s*(.*)$') { $current.riskLevel = ConvertFrom-YamlScalar $Matches[1] }
  }
  if ($null -ne $current) { $rules += $current }
  return $rules
}

function Test-CommandPrefix {
  param([string]$CommandLine, [string]$Prefix)
  $left = (($CommandLine -replace '\\', '/').Trim() -replace '\s+', ' ')
  $right = (($Prefix -replace '\\', '/').Trim() -replace '\s+', ' ')
  if (-not $right) { return $false }
  if ($right.Contains("*")) {
    $pattern = "^" + ([regex]::Escape($right).Replace('\*', '.*'))
    return $left -match $pattern
  }
  if ($left.Equals($right, [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
  return $left.StartsWith($right + " ", [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-LogicalCommands {
  param([string]$CommandFile, [string[]]$CommandArgs)
  $argText = ""
  if ($CommandArgs -and $CommandArgs.Count -gt 0) { $argText = " " + ($CommandArgs -join " ") }
  $names = New-Object System.Collections.Generic.List[string]
  [void]$names.Add($CommandFile)
  $fileName = [System.IO.Path]::GetFileName($CommandFile)
  if ($fileName) { [void]$names.Add($fileName) }
  $base = [System.IO.Path]::GetFileNameWithoutExtension($CommandFile)
  if ($base -and $base -ne $fileName) { [void]$names.Add($base) }
  $lines = @()
  foreach ($name in $names) { $lines += ($name + $argText).Trim() }
  return $lines
}

function Redact-Argument {
  param([string]$Text)
  if ($null -eq $Text) { return "" }
  if ($Text -match '(?i)(sk-[A-Za-z0-9]|ghp_|github_pat_|xox[baprs]-|AKIA[A-Z0-9]{8}|Bearer\s+\S|api[_-]?key\s*[=:]|token\s*[=:]|secret\s*[=:]|password\s*[=:]|BEGIN [A-Z ]*PRIVATE KEY)') {
    return "<redacted>"
  }
  return $Text
}

function Get-SandboxLimits {
  $limits = @{
    jobMemoryMb = 8192
    cpuRatePercent = 80
    activeProcessLimit = 128
    killOnJobClose = $true
  }
  if (Test-Path -LiteralPath $ProfilePath) {
    try {
      $profile = Get-Content -LiteralPath $ProfilePath -Raw | ConvertFrom-Json
      if ($profile.jobMemoryMb) { $limits.jobMemoryMb = [int]$profile.jobMemoryMb }
      if ($profile.cpuRatePercent) { $limits.cpuRatePercent = [int]$profile.cpuRatePercent }
      if ($profile.activeProcessLimit) { $limits.activeProcessLimit = [int]$profile.activeProcessLimit }
      if ($null -ne $profile.killOnJobClose) { $limits.killOnJobClose = [bool]$profile.killOnJobClose }
    } catch {
      Write-Host ("sandbox profile ignored: {0}" -f $_.Exception.Message)
    }
  }
  if ($limits.jobMemoryMb -lt 256) { $limits.jobMemoryMb = 256 }
  if ($limits.cpuRatePercent -lt 1) { $limits.cpuRatePercent = 1 }
  if ($limits.cpuRatePercent -gt 100) { $limits.cpuRatePercent = 100 }
  if ($limits.activeProcessLimit -lt 1) { $limits.activeProcessLimit = 1 }
  return $limits
}

function Get-ToolDirectory {
  param([string]$Name)
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command -or -not $command.Source) { return "" }
  return Split-Path -Parent $command.Source
}

function New-SandboxPath {
  param([string]$ToolFile)
  $dirs = New-Object System.Collections.Generic.List[string]
  $wantedNames = @("git.exe", "git.cmd", "node.exe", "pnpm.cmd", "pnpm.exe", "pnpm.ps1", "codex.exe", "codex.cmd", "claude.exe", "claude.cmd")
  foreach ($entry in @($env:PATH -split ';')) {
    if (-not $entry) { continue }
    $keep = $false
    foreach ($name in $wantedNames) {
      if (Test-Path -LiteralPath (Join-Path $entry $name)) { $keep = $true; break }
    }
    if ($keep) { [void]$dirs.Add($entry.TrimEnd('\')) }
  }
  foreach ($name in @("git", "node", "pnpm", "codex", "claude")) {
    $dir = Get-ToolDirectory $name
    if ($dir) { [void]$dirs.Add($dir.TrimEnd('\')) }
  }
  if ($ToolFile -and (Test-Path -LiteralPath $ToolFile)) {
    [void]$dirs.Add((Split-Path -Parent $ToolFile).TrimEnd('\'))
  }
  [void]$dirs.Add((Join-Path $env:SystemRoot "System32"))
  $unique = New-Object System.Collections.Generic.List[string]
  $seen = @{}
  foreach ($dir in $dirs) {
    if (-not $dir) { continue }
    $key = $dir.ToLowerInvariant()
    if ($seen.ContainsKey($key)) { continue }
    if (-not (Test-Path -LiteralPath $dir)) { continue }
    $seen[$key] = $true
    [void]$unique.Add($dir)
  }
  return ($unique -join ";")
}

function New-SandboxEnvironment {
  param([string]$PathValue)
  New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
  $pairs = [ordered]@{
    PATH = $PathValue
    TEMP = $TempRoot
    TMP = $TempRoot
    HOME = $env:USERPROFILE
    USERPROFILE = $env:USERPROFILE
    SYSTEMROOT = $env:SystemRoot
    COMSPEC = (Join-Path $env:SystemRoot "System32\cmd.exe")
    PATHEXT = $(if ($env:PATHEXT) { $env:PATHEXT } else { ".COM;.EXE;.BAT;.CMD;.PS1" })
    WINDIR = $(if ($env:WINDIR) { $env:WINDIR } else { $env:SystemRoot })
    SYSTEMDRIVE = $(if ($env:SYSTEMDRIVE) { $env:SYSTEMDRIVE } else { "C:" })
  }
  if ($env:PROCESSOR_ARCHITECTURE) { $pairs["PROCESSOR_ARCHITECTURE"] = $env:PROCESSOR_ARCHITECTURE }
  $block = New-Object System.Text.StringBuilder
  $names = @()
  foreach ($key in $pairs.Keys) {
    if ($null -eq $pairs[$key] -or [string]$pairs[$key] -eq "") { continue }
    [void]$block.Append($key)
    [void]$block.Append("=")
    [void]$block.Append([string]$pairs[$key])
    [void]$block.Append([char]0)
    $names += $key
  }
  [void]$block.Append([char]0)
  return @{ Block = $block.ToString(); Names = @($names) }
}

function Resolve-SandboxTool {
  param([string]$CommandFile)
  if (-not $CommandFile) { return "" }
  if (Test-Path -LiteralPath $CommandFile) {
    return (Resolve-Path -LiteralPath $CommandFile).Path
  }
  $command = Get-Command $CommandFile -ErrorAction SilentlyContinue
  if ($command -and $command.Source) { return $command.Source }
  return ""
}

function Get-HistoricalDirtyPaths {
  param([string]$Root, [string]$Version)
  $dirty = @()
  $lines = @()
  try {
    $lines = @(git -C $Root status --short --untracked-files=all 2>$null)
  } catch {
    return @()
  }
  $target = ""
  if ($Version) {
    $target = $Version.Trim()
    if ($target -notmatch '^v') { $target = "v$target" }
  }
  foreach ($line in $lines) {
    if ($line -notmatch 'releases/') { continue }
    $path = $line
    if ($path.Length -gt 3) { $path = $path.Substring(3) }
    $path = $path.Trim().Trim('"').Replace('\', '/')
    if ($path -match '^releases/([^/]+)(/|$)') {
      $folder = $Matches[1]
      $folderVersion = $folder
      if ($folderVersion -notmatch '^v') { $folderVersion = "v$folderVersion" }
      if ($target -and ($folderVersion -eq $target)) { continue }
      $dirty += $path
    }
  }
  return @($dirty)
}

function Add-ApprovalQueueRow {
  param([string]$CommandLine, [string]$RiskLevel, [string]$Reason)
  $queuePath = Join-Path $WorkspaceRoot "runtime\APPROVAL_QUEUE.md"
  $queueDir = Split-Path -Parent $queuePath
  New-Item -ItemType Directory -Force -Path $queueDir | Out-Null
  if (-not (Test-Path -LiteralPath $queuePath)) {
    @(
      "# Approval Queue",
      "",
      "| Time | Requested Action | Risk Level | Reason | Blocking? | Status |",
      "|---|---|---|---|---|---|"
    ) | Set-Content -Encoding UTF8 -LiteralPath $queuePath
  }
  $stamp = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
  $safeCommand = ($CommandLine -replace '\|', '/')
  $safeReason = ($(if ($Reason) { $Reason } else { "queue_for_approval" }) -replace '\|', '/')
  $safeRisk = $(if ($RiskLevel) { $RiskLevel } else { "L4" })
  $suggestion = "Do not run this command in autonomous mode. Continue safe work or ask a human to approve it."
  $row = "| $stamp | $safeCommand | $safeRisk | $safeReason | yes | queued; suggestion: $suggestion |"
  Add-Content -Encoding UTF8 -LiteralPath $queuePath -Value $row
}

if (-not ("AimartSandboxNative" -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Microsoft.Win32.SafeHandles;

public class SandboxOutputBuffer {
  private readonly object gate = new object();
  private readonly StringBuilder pending = new StringBuilder();
  public void Append(string text) {
    if (string.IsNullOrEmpty(text)) return;
    lock (gate) { pending.Append(text); }
  }
  public string Drain() {
    lock (gate) {
      string text = pending.ToString();
      pending.Length = 0;
      return text;
    }
  }
}

public class SandboxJobResult {
  public bool Ok;
  public long JobHandle;
  public int Win32Error;
  public string Error;
}

public class SandboxLaunchResult {
  public bool Ok;
  public long ProcessHandle;
  public int ProcessId;
  public int Win32Error;
  public string Error;
  public string UserSid;
  public bool Elevated;
  public string TokenMethod;
  public SandboxOutputBuffer Stdout;
  public SandboxOutputBuffer Stderr;
}

public static class AimartSandboxNative {
  const uint TOKEN_ASSIGN_PRIMARY = 0x0001;
  const uint TOKEN_DUPLICATE = 0x0002;
  const uint TOKEN_QUERY = 0x0008;
  const uint TOKEN_ADJUST_DEFAULT = 0x0080;
  const uint TOKEN_ADJUST_SESSIONID = 0x0100;
  const uint DISABLE_MAX_PRIVILEGE = 0x1;
  const uint GENERIC_READ = 0x80000000;
  const uint FILE_SHARE_READ = 0x00000001;
  const uint OPEN_EXISTING = 3;
  const uint CREATE_SUSPENDED = 0x00000004;
  const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
  const uint CREATE_NO_WINDOW = 0x08000000;
  const int STARTF_USESTDHANDLES = 0x00000100;
  const uint HANDLE_FLAG_INHERIT = 0x00000001;
  const int TokenElevation = 20;
  const int JobObjectExtendedLimitInformation = 9;
  const int JobObjectBasicAccountingInformation = 1;
  const int JobObjectCpuRateControlInformation = 15;
  const int JobObjectBasicProcessIdList = 3;
  const uint JOB_OBJECT_LIMIT_ACTIVE_PROCESS = 0x00000008;
  const uint JOB_OBJECT_LIMIT_JOB_MEMORY = 0x00000200;
  const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
  const uint JOB_OBJECT_CPU_RATE_CONTROL_ENABLE = 0x1;
  const uint JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP = 0x4;
  const uint SAFER_SCOPEID_USER = 2;
  const uint SAFER_LEVELID_NORMALUSER = 0x20000;
  const uint SAFER_LEVEL_OPEN = 1;

  [StructLayout(LayoutKind.Sequential)]
  struct SECURITY_ATTRIBUTES {
    public int nLength;
    public IntPtr lpSecurityDescriptor;
    public bool bInheritHandle;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct STARTUPINFO {
    public int cb;
    public string lpReserved;
    public string lpDesktop;
    public string lpTitle;
    public int dwX;
    public int dwY;
    public int dwXSize;
    public int dwYSize;
    public int dwXCountChars;
    public int dwYCountChars;
    public int dwFillAttribute;
    public int dwFlags;
    public short wShowWindow;
    public short cbReserved2;
    public IntPtr lpReserved2;
    public IntPtr hStdInput;
    public IntPtr hStdOutput;
    public IntPtr hStdError;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct PROCESS_INFORMATION {
    public IntPtr hProcess;
    public IntPtr hThread;
    public int dwProcessId;
    public int dwThreadId;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct SID_AND_ATTRIBUTES {
    public IntPtr Sid;
    public uint Attributes;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct LUID {
    public uint LowPart;
    public int HighPart;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct LUID_AND_ATTRIBUTES {
    public LUID Luid;
    public uint Attributes;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct TOKEN_ELEVATION_STRUCT {
    public int TokenIsElevated;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
    public long PerProcessUserTimeLimit;
    public long PerJobUserTimeLimit;
    public uint LimitFlags;
    public UIntPtr MinimumWorkingSetSize;
    public UIntPtr MaximumWorkingSetSize;
    public uint ActiveProcessLimit;
    public UIntPtr Affinity;
    public uint PriorityClass;
    public uint SchedulingClass;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct IO_COUNTERS {
    public ulong ReadOperationCount;
    public ulong WriteOperationCount;
    public ulong OtherOperationCount;
    public ulong ReadTransferCount;
    public ulong WriteTransferCount;
    public ulong OtherTransferCount;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
    public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
    public IO_COUNTERS IoInfo;
    public UIntPtr ProcessMemoryLimit;
    public UIntPtr JobMemoryLimit;
    public UIntPtr PeakProcessMemoryUsed;
    public UIntPtr PeakJobMemoryUsed;
  }

  [StructLayout(LayoutKind.Sequential)]
  struct JOBOBJECT_CPU_RATE_CONTROL_INFORMATION {
    public uint ControlFlags;
    public uint CpuRate;
  }

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern IntPtr GetCurrentProcess();

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool SetInformationJobObject(IntPtr hJob, int JobObjectInfoClass, IntPtr lpJobObjectInfo, uint cbJobObjectInfoLength);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool TerminateJobObject(IntPtr hJob, uint uExitCode);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool QueryInformationJobObject(IntPtr hJob, int JobObjectInformationClass, IntPtr lpJobObjectInfo, int cbJobObjectInfoLength, out int lpReturnLength);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool CloseHandle(IntPtr hObject);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool CreatePipe(out IntPtr hReadPipe, out IntPtr hWritePipe, ref SECURITY_ATTRIBUTES lpPipeAttributes, uint nSize);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool SetHandleInformation(IntPtr hObject, uint dwMask, uint dwFlags);

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern IntPtr CreateFile(string lpFileName, uint dwDesiredAccess, uint dwShareMode, ref SECURITY_ATTRIBUTES lpSecurityAttributes, uint dwCreationDisposition, uint dwFlagsAndAttributes, IntPtr hTemplateFile);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern uint ResumeThread(IntPtr hThread);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool GetExitCodeProcess(IntPtr hProcess, out uint lpExitCode);

  [DllImport("advapi32.dll", SetLastError = true)]
  static extern bool OpenProcessToken(IntPtr ProcessHandle, uint DesiredAccess, out IntPtr TokenHandle);

  [DllImport("advapi32.dll", SetLastError = true)]
  static extern bool GetTokenInformation(IntPtr TokenHandle, int TokenInformationClass, IntPtr TokenInformation, int TokenInformationLength, out int ReturnLength);

  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool CreateProcessAsUser(IntPtr hToken, string lpApplicationName, string lpCommandLine, IntPtr lpProcessAttributes, IntPtr lpThreadAttributes, bool bInheritHandles, uint dwCreationFlags, IntPtr lpEnvironment, string lpCurrentDirectory, ref STARTUPINFO lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation);

  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool CreateProcessWithTokenW(IntPtr hToken, uint dwLogonFlags, string lpApplicationName, string lpCommandLine, uint dwCreationFlags, IntPtr lpEnvironment, string lpCurrentDirectory, ref STARTUPINFO lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation);

  [DllImport("advapi32.dll", SetLastError = true)]
  static extern bool CreateRestrictedToken(IntPtr ExistingTokenHandle, uint Flags, uint DisableSidCount, SID_AND_ATTRIBUTES[] SidsToDisable, uint DeletePrivilegeCount, LUID_AND_ATTRIBUTES[] PrivilegesToDelete, uint RestrictedSidCount, SID_AND_ATTRIBUTES[] SidsToRestrict, out IntPtr NewTokenHandle);

  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool LookupPrivilegeValue(string lpSystemName, string lpName, out LUID lpLuid);

  [DllImport("advapi32.dll", SetLastError = true)]
  static extern bool SaferCreateLevel(uint dwScopeId, uint dwLevelId, uint OpenFlags, out IntPtr pLevelHandle, IntPtr lpReserved);

  [DllImport("advapi32.dll", SetLastError = true)]
  static extern bool SaferComputeTokenFromLevel(IntPtr LevelHandle, IntPtr InAccessToken, out IntPtr OutAccessToken, uint dwFlags, IntPtr lpReserved);

  [DllImport("advapi32.dll", SetLastError = true)]
  static extern bool SaferCloseLevel(IntPtr hLevelHandle);

  public static bool ParentTokenIsElevated() {
    IntPtr token;
    if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, out token)) return false;
    try {
      TOKEN_ELEVATION_STRUCT elevation = new TOKEN_ELEVATION_STRUCT();
      int size = Marshal.SizeOf(typeof(TOKEN_ELEVATION_STRUCT));
      IntPtr buffer = Marshal.AllocHGlobal(size);
      try {
        int returned;
        if (!GetTokenInformation(token, TokenElevation, buffer, size, out returned)) return false;
        elevation = (TOKEN_ELEVATION_STRUCT)Marshal.PtrToStructure(buffer, typeof(TOKEN_ELEVATION_STRUCT));
        return elevation.TokenIsElevated != 0;
      } finally {
        Marshal.FreeHGlobal(buffer);
      }
    } finally {
      CloseHandle(token);
    }
  }

  public static SandboxJobResult CreateJob(ulong memoryBytes, uint cpuPercent, uint activeProcessLimit, bool killOnClose) {
    SandboxJobResult result = new SandboxJobResult();
    IntPtr job = CreateJobObject(IntPtr.Zero, null);
    if (job == IntPtr.Zero) {
      result.Win32Error = Marshal.GetLastWin32Error();
      result.Error = "CreateJobObject failed";
      return result;
    }
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
    info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_JOB_MEMORY | JOB_OBJECT_LIMIT_ACTIVE_PROCESS;
    if (killOnClose) info.BasicLimitInformation.LimitFlags |= JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    info.BasicLimitInformation.ActiveProcessLimit = activeProcessLimit;
    info.JobMemoryLimit = new UIntPtr(memoryBytes);
    int extSize = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
    IntPtr extPtr = Marshal.AllocHGlobal(extSize);
    try {
      Marshal.StructureToPtr(info, extPtr, false);
      if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, extPtr, (uint)extSize)) {
        result.Win32Error = Marshal.GetLastWin32Error();
        result.Error = "SetInformationJobObject memory/process limit failed";
        CloseHandle(job);
        return result;
      }
    } finally {
      Marshal.FreeHGlobal(extPtr);
    }
    JOBOBJECT_CPU_RATE_CONTROL_INFORMATION cpu = new JOBOBJECT_CPU_RATE_CONTROL_INFORMATION();
    cpu.ControlFlags = JOB_OBJECT_CPU_RATE_CONTROL_ENABLE | JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP;
    cpu.CpuRate = cpuPercent * 100;
    int cpuSize = Marshal.SizeOf(typeof(JOBOBJECT_CPU_RATE_CONTROL_INFORMATION));
    IntPtr cpuPtr = Marshal.AllocHGlobal(cpuSize);
    try {
      Marshal.StructureToPtr(cpu, cpuPtr, false);
      if (!SetInformationJobObject(job, JobObjectCpuRateControlInformation, cpuPtr, (uint)cpuSize)) {
        result.Win32Error = Marshal.GetLastWin32Error();
        result.Error = "SetInformationJobObject CPU rate failed";
        CloseHandle(job);
        return result;
      }
    } finally {
      Marshal.FreeHGlobal(cpuPtr);
    }
    result.Ok = true;
    result.JobHandle = job.ToInt64();
    return result;
  }

  static IntPtr OpenCurrentToken() {
    IntPtr token;
    uint access = TOKEN_ASSIGN_PRIMARY | TOKEN_DUPLICATE | TOKEN_QUERY | TOKEN_ADJUST_DEFAULT | TOKEN_ADJUST_SESSIONID;
    if (!OpenProcessToken(GetCurrentProcess(), access, out token)) return IntPtr.Zero;
    return token;
  }

  static IntPtr AdministratorsSid() {
    var sid = new System.Security.Principal.SecurityIdentifier(System.Security.Principal.WellKnownSidType.BuiltinAdministratorsSid, null);
    byte[] bytes = new byte[sid.BinaryLength];
    sid.GetBinaryForm(bytes, 0);
    IntPtr pointer = Marshal.AllocHGlobal(bytes.Length);
    Marshal.Copy(bytes, 0, pointer, bytes.Length);
    return pointer;
  }

  static LUID_AND_ATTRIBUTES[] PrivilegesToDelete() {
    string[] names = new string[] {
      "SeDebugPrivilege",
      "SeImpersonatePrivilege",
      "SeAssignPrimaryTokenPrivilege",
      "SeTcbPrivilege",
      "SeBackupPrivilege",
      "SeRestorePrivilege"
    };
    var list = new System.Collections.Generic.List<LUID_AND_ATTRIBUTES>();
    for (int i = 0; i < names.Length; i++) {
      LUID luid;
      if (LookupPrivilegeValue(null, names[i], out luid)) {
        LUID_AND_ATTRIBUTES item = new LUID_AND_ATTRIBUTES();
        item.Luid = luid;
        item.Attributes = 0;
        list.Add(item);
      }
    }
    return list.ToArray();
  }

  static IntPtr CreateLimitedToken(IntPtr existing, out string method, out int win32) {
    method = "";
    win32 = 0;
    IntPtr admin = AdministratorsSid();
    try {
      SID_AND_ATTRIBUTES[] disable = new SID_AND_ATTRIBUTES[1];
      disable[0].Sid = admin;
      disable[0].Attributes = 0;
      LUID_AND_ATTRIBUTES[] privileges = PrivilegesToDelete();
      IntPtr restricted;
      if (CreateRestrictedToken(existing, DISABLE_MAX_PRIVILEGE, 1, disable, (uint)privileges.Length, privileges, 0, null, out restricted)) {
        method = "CreateRestrictedToken";
        return restricted;
      }
      win32 = Marshal.GetLastWin32Error();
    } finally {
      Marshal.FreeHGlobal(admin);
    }
    IntPtr level;
    if (SaferCreateLevel(SAFER_SCOPEID_USER, SAFER_LEVELID_NORMALUSER, SAFER_LEVEL_OPEN, out level, IntPtr.Zero)) {
      try {
        IntPtr saferToken;
        if (SaferComputeTokenFromLevel(level, existing, out saferToken, 0, IntPtr.Zero)) {
          method = "SaferComputeTokenFromLevel";
          win32 = 0;
          return saferToken;
        }
        win32 = Marshal.GetLastWin32Error();
      } finally {
        SaferCloseLevel(level);
      }
    } else {
      win32 = Marshal.GetLastWin32Error();
    }
    return IntPtr.Zero;
  }

  static bool TokenHasEnabledAdmin(IntPtr token) {
    try {
      var identity = new System.Security.Principal.WindowsIdentity(token);
      var principal = new System.Security.Principal.WindowsPrincipal(identity);
      return principal.IsInRole(System.Security.Principal.WindowsBuiltInRole.Administrator);
    } catch {
      return true;
    }
  }

  static string TokenSid(IntPtr token) {
    try {
      var identity = new System.Security.Principal.WindowsIdentity(token);
      if (identity.User == null) return "";
      return identity.User.Value;
    } catch {
      return "";
    }
  }

  static SECURITY_ATTRIBUTES InheritableSecurity() {
    SECURITY_ATTRIBUTES sa = new SECURITY_ATTRIBUTES();
    sa.nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES));
    sa.bInheritHandle = true;
    sa.lpSecurityDescriptor = IntPtr.Zero;
    return sa;
  }

  static void StartCopy(IntPtr readHandle, string path, SandboxOutputBuffer buffer) {
    Thread thread = new Thread(delegate() {
      FileStream stream = null;
      FileStream file = null;
      try {
        stream = new FileStream(new SafeFileHandle(readHandle, true), FileAccess.Read, 4096, false);
        file = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.ReadWrite);
        byte[] bytes = new byte[4096];
        int count;
        while ((count = stream.Read(bytes, 0, bytes.Length)) > 0) {
          file.Write(bytes, 0, count);
          file.Flush();
          buffer.Append(Encoding.UTF8.GetString(bytes, 0, count));
        }
      } catch (Exception ex) {
        buffer.Append(ex.Message);
      } finally {
        if (file != null) {
          try { file.Flush(); file.Dispose(); } catch (Exception disposeError) { System.Diagnostics.Trace.WriteLine(disposeError.Message); }
        }
        if (stream != null) {
          try { stream.Dispose(); } catch (Exception disposeError) { System.Diagnostics.Trace.WriteLine(disposeError.Message); }
        }
      }
    });
    thread.IsBackground = true;
    thread.Start();
  }

  public static SandboxLaunchResult Launch(long jobHandle, string application, string commandLine, string cwd, string envBlock, string stdoutPath, string stderrPath) {
    SandboxLaunchResult result = new SandboxLaunchResult();
    result.Stdout = new SandboxOutputBuffer();
    result.Stderr = new SandboxOutputBuffer();
    IntPtr existing = OpenCurrentToken();
    if (existing == IntPtr.Zero) {
      result.Win32Error = Marshal.GetLastWin32Error();
      result.Error = "OpenProcessToken failed";
      return result;
    }
    string method;
    int tokenError;
    IntPtr limited = CreateLimitedToken(existing, out method, out tokenError);
    CloseHandle(existing);
    if (limited == IntPtr.Zero) {
      result.Win32Error = tokenError;
      result.Error = "restricted token was not created";
      return result;
    }
    result.UserSid = TokenSid(limited);
    result.Elevated = TokenHasEnabledAdmin(limited);
    result.TokenMethod = method;
    bool combine = string.Equals(stdoutPath, stderrPath, StringComparison.OrdinalIgnoreCase);
    SECURITY_ATTRIBUTES sa = InheritableSecurity();
    IntPtr stdoutRead, stdoutWrite, stderrRead, stderrWrite, stdin;
    if (!CreatePipe(out stdoutRead, out stdoutWrite, ref sa, 0)) {
      result.Win32Error = Marshal.GetLastWin32Error();
      result.Error = "CreatePipe stdout failed";
      CloseHandle(limited);
      return result;
    }
    SetHandleInformation(stdoutRead, HANDLE_FLAG_INHERIT, 0);
    if (combine) {
      stderrRead = IntPtr.Zero;
      stderrWrite = stdoutWrite;
    } else if (!CreatePipe(out stderrRead, out stderrWrite, ref sa, 0)) {
      result.Win32Error = Marshal.GetLastWin32Error();
      result.Error = "CreatePipe stderr failed";
      CloseHandle(stdoutRead);
      CloseHandle(stdoutWrite);
      CloseHandle(limited);
      return result;
    } else {
      SetHandleInformation(stderrRead, HANDLE_FLAG_INHERIT, 0);
    }
    stdin = CreateFile("NUL", GENERIC_READ, FILE_SHARE_READ, ref sa, OPEN_EXISTING, 0, IntPtr.Zero);
    string stdoutDir = Path.GetDirectoryName(stdoutPath);
    if (!string.IsNullOrEmpty(stdoutDir)) Directory.CreateDirectory(stdoutDir);
    if (!combine) {
      string stderrDir = Path.GetDirectoryName(stderrPath);
      if (!string.IsNullOrEmpty(stderrDir)) Directory.CreateDirectory(stderrDir);
    }
    StartCopy(stdoutRead, stdoutPath, result.Stdout);
    if (!combine) StartCopy(stderrRead, stderrPath, result.Stderr);
    IntPtr env = Marshal.StringToHGlobalUni(envBlock);
    STARTUPINFO startup = new STARTUPINFO();
    startup.cb = Marshal.SizeOf(typeof(STARTUPINFO));
    startup.dwFlags = STARTF_USESTDHANDLES;
    startup.hStdInput = stdin;
    startup.hStdOutput = stdoutWrite;
    startup.hStdError = stderrWrite;
    PROCESS_INFORMATION processInfo;
    uint flags = CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | CREATE_NO_WINDOW;
    bool created = CreateProcessAsUser(limited, application, commandLine, IntPtr.Zero, IntPtr.Zero, true, flags, env, cwd, ref startup, out processInfo);
    if (!created) {
      int firstError = Marshal.GetLastWin32Error();
      created = CreateProcessWithTokenW(limited, 0, application, commandLine, flags, env, cwd, ref startup, out processInfo);
      if (created) result.TokenMethod = method + "+CreateProcessWithTokenW";
      else {
        result.Win32Error = firstError;
        result.Error = "CreateProcessAsUser failed: " + firstError + "; CreateProcessWithTokenW failed: " + Marshal.GetLastWin32Error();
      }
    }
    Marshal.FreeHGlobal(env);
    CloseHandle(stdin);
    CloseHandle(stdoutWrite);
    if (!combine) CloseHandle(stderrWrite);
    CloseHandle(limited);
    if (!created) return result;
    IntPtr job = new IntPtr(jobHandle);
    if (!AssignProcessToJobObject(job, processInfo.hProcess)) {
      result.Win32Error = Marshal.GetLastWin32Error();
      result.Error = "AssignProcessToJobObject failed";
      TerminateProcess(processInfo.hProcess, 1);
      CloseHandle(processInfo.hThread);
      CloseHandle(processInfo.hProcess);
      return result;
    }
    ResumeThread(processInfo.hThread);
    CloseHandle(processInfo.hThread);
    result.Ok = true;
    result.ProcessHandle = processInfo.hProcess.ToInt64();
    result.ProcessId = processInfo.dwProcessId;
    return result;
  }

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool TerminateProcess(IntPtr hProcess, uint uExitCode);

  public static bool Wait(long processHandle, int milliseconds) {
    uint waited = WaitForSingleObject(new IntPtr(processHandle), (uint)milliseconds);
    return waited == 0;
  }

  public static int GetExitCode(long processHandle) {
    uint code;
    if (!GetExitCodeProcess(new IntPtr(processHandle), out code)) return 1;
    return unchecked((int)code);
  }

  public static void Terminate(long jobHandle) {
    TerminateJobObject(new IntPtr(jobHandle), 1460);
  }

  public static int ActiveProcessCount(long jobHandle) {
    int size = 48;
    IntPtr buffer = Marshal.AllocHGlobal(size);
    try {
      int returned;
      if (!QueryInformationJobObject(new IntPtr(jobHandle), JobObjectBasicAccountingInformation, buffer, size, out returned)) return -1;
      return Marshal.ReadInt32(buffer, 40);
    } finally {
      Marshal.FreeHGlobal(buffer);
    }
  }

  public static int[] ListProcessIds(long jobHandle) {
    int size = 8 + (IntPtr.Size * 512);
    IntPtr buffer = Marshal.AllocHGlobal(size);
    try {
      int returned;
      if (!QueryInformationJobObject(new IntPtr(jobHandle), JobObjectBasicProcessIdList, buffer, size, out returned)) return new int[0];
      int count = Marshal.ReadInt32(buffer, 4);
      if (count < 0) count = 0;
      if (count > 512) count = 512;
      int[] ids = new int[count];
      int offset = 8;
      for (int i = 0; i < count; i++) {
        long value = Marshal.ReadIntPtr(buffer, offset).ToInt64();
        ids[i] = unchecked((int)value);
        offset += IntPtr.Size;
      }
      return ids;
    } finally {
      Marshal.FreeHGlobal(buffer);
    }
  }

  public static void CloseHandle64(long handle) {
    if (handle == 0) return;
    CloseHandle(new IntPtr(handle));
  }
}
'@ -Language CSharp -ReferencedAssemblies System.dll
}

$limits = Get-SandboxLimits
$parentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$parentPrincipal = New-Object Security.Principal.WindowsPrincipal($parentIdentity)
$roleElevated = $parentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$tokenElevated = [AimartSandboxNative]::ParentTokenIsElevated()
# A full admin token has the Administrators SID enabled. TokenElevation alone is
# not enough: a basic-user restricted token can still report TokenIsElevated.
$parentElevated = [bool]($roleElevated -and $tokenElevated)
$parentSid = $parentIdentity.User.Value
$writableRoots = @(( [System.IO.Path]::GetFullPath($WorkspaceRoot) ), ( [System.IO.Path]::GetFullPath($TempRoot) ))

$script:Record = [ordered]@{
  runId = $RunId
  commandId = $CommandId
  startedAt = $StartedUtc.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  endedAt = ""
  durationMs = 0
  adapterId = $AdapterId
  mode = $Mode
  stage = $Stage
  file = $(if ($StageMark) { "stage-boundary" } else { $File })
  argumentList = @()
  cwd = ""
  userSid = $parentSid
  elevated = $parentElevated
  filesystemIsolation = "degraded-same-user"
  networkIsolation = "none"
  jobMemoryMb = [int]$limits.jobMemoryMb
  cpuRatePercent = [int]$limits.cpuRatePercent
  activeProcessLimit = [int]$limits.activeProcessLimit
  timeoutSec = [int]$TimeoutSec
  exitCode = 1
  timedOut = $false
  killMethod = "none"
  stdoutPath = ""
  stderrPath = ""
  deniedByPolicy = ""
  proxyDeniedHosts = @()
  writableRoots = @($writableRoots)
  envNames = @()
  historicalReleaseDirty = $false
}

$normalizedArgs = @($ArgumentList)
$script:Record.argumentList = @($normalizedArgs | ForEach-Object { Redact-Argument ([string]$_) })
if ($parentElevated) {
  $script:Record.cwd = $Cwd
  Stop-Sandbox -Code 1462 -Token "SANDBOX_ELEVATED_PARENT"
}

try {
  if (-not (Test-InsideRoot -Path $Cwd -Root $WorkspaceRoot)) {
    $script:Record.cwd = $Cwd
    Stop-Sandbox -Code 1 -Token "sandbox cwd is outside the workspace root"
  }
} catch {
  $script:Record.cwd = $Cwd
  Stop-Sandbox -Code 1 -Token ("sandbox cwd is outside the workspace root: {0}" -f $_.Exception.Message)
}
$resolvedCwd = [System.IO.Path]::GetFullPath($Cwd)
$script:Record.cwd = $resolvedCwd

if ($StageMark) {
  $script:Record.stdoutPath = ""
  $script:Record.stderrPath = ""
  $script:Record.envNames = @()
  Stop-Sandbox -Code 0
}

if (-not $File) { Stop-Sandbox -Code 1 -Token "sandbox missing -File" }

$logicalLines = @(Get-LogicalCommands -CommandFile $File -CommandArgs $normalizedArgs)
$rules = @(Read-PermissionRules -Path $PolicyPath)
foreach ($line in $logicalLines) {
  foreach ($rule in $rules) {
    if ($rule.action -eq "deny" -and (Test-CommandPrefix -CommandLine $line -Prefix $rule.command)) {
      Stop-Sandbox -Code 1461 -DeniedByPolicy $line -Token "deniedByPolicy"
    }
  }
}
if ($Mode -ne "supervised") {
  foreach ($line in $logicalLines) {
    foreach ($rule in $rules) {
      if ($rule.action -eq "queue_for_approval" -and (Test-CommandPrefix -CommandLine $line -Prefix $rule.command)) {
        Add-ApprovalQueueRow -CommandLine $line -RiskLevel $rule.riskLevel -Reason $rule.reason
        Stop-Sandbox -Code 1461 -DeniedByPolicy $line -Token "deniedByPolicy"
      }
    }
  }
}

$resolvedTool = Resolve-SandboxTool -CommandFile $File
if (-not $resolvedTool) { Stop-Sandbox -Code 1 -Token ("sandbox executable not found: {0}" -f $File) }
$extension = [System.IO.Path]::GetExtension($resolvedTool).ToLowerInvariant()
$powerShellExe = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$cmdExe = Join-Path $env:SystemRoot "System32\cmd.exe"
if ($extension -eq ".ps1") {
  $application = $powerShellExe
  $commandLine = Format-CommandLine (@($powerShellExe, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $resolvedTool) + $normalizedArgs)
} elseif ($extension -eq ".cmd" -or $extension -eq ".bat") {
  $application = $cmdExe
  $inner = Format-CommandLine (@($resolvedTool) + $normalizedArgs)
  $commandLine = (Format-CommandLine @($cmdExe, "/d", "/s", "/c")) + " " + (Format-WinArg $inner)
} else {
  $application = $resolvedTool
  $commandLine = Format-CommandLine (@($resolvedTool) + $normalizedArgs)
}

if (-not $StdoutPath) { $StdoutPath = Join-Path $AuditDir ($CommandId + ".stdout.log") }
if (-not $StderrPath) { $StderrPath = Join-Path $AuditDir ($CommandId + ".stderr.log") }
$script:Record.stdoutPath = $StdoutPath
$script:Record.stderrPath = $StderrPath

$envInfo = New-SandboxEnvironment -PathValue (New-SandboxPath -ToolFile $resolvedTool)
$script:Record.envNames = @($envInfo.Names)
$memoryBytes = [uint64]$limits.jobMemoryMb * 1024 * 1024
$job = [AimartSandboxNative]::CreateJob($memoryBytes, [uint32]$limits.cpuRatePercent, [uint32]$limits.activeProcessLimit, [bool]$limits.killOnJobClose)
if (-not $job.Ok) {
  Stop-Sandbox -Code 1 -Token ("sandbox job was not created: {0} win32={1}" -f $job.Error, $job.Win32Error)
}

$dirtyBefore = @(Get-HistoricalDirtyPaths -Root $WorkspaceRoot -Version $TargetVersion)
$launch = $null
try {
  $launch = [AimartSandboxNative]::Launch($job.JobHandle, $application, $commandLine, $resolvedCwd, $envInfo.Block, $StdoutPath, $StderrPath)
} catch {
  [AimartSandboxNative]::CloseHandle64($job.JobHandle) | Out-Null
  Stop-Sandbox -Code 1 -Token ("sandbox launch failed: {0}" -f $_.Exception.Message)
}
if (-not $launch.Ok) {
  [AimartSandboxNative]::CloseHandle64($job.JobHandle) | Out-Null
  Stop-Sandbox -Code 1 -Token ("sandbox launch failed: {0} win32={1}" -f $launch.Error, $launch.Win32Error)
}

if ($launch.UserSid) { $script:Record.userSid = [string]$launch.UserSid }
$script:Record.elevated = [bool]$launch.Elevated
if ($launch.Elevated) {
  [AimartSandboxNative]::Terminate($job.JobHandle) | Out-Null
  Start-Sleep -Seconds 1
  [AimartSandboxNative]::CloseHandle64($launch.ProcessHandle) | Out-Null
  [AimartSandboxNative]::CloseHandle64($job.JobHandle) | Out-Null
  Stop-Sandbox -Code 1462 -Token "SANDBOX_ELEVATED_PARENT"
}

$deadline = (Get-Date).AddSeconds($TimeoutSec)
$timedOut = $false
$killMethod = "none"
while (-not [AimartSandboxNative]::Wait($launch.ProcessHandle, 200)) {
  $outText = $launch.Stdout.Drain()
  $errText = $launch.Stderr.Drain()
  if ($outText) { Write-Host -NoNewline $outText }
  if ($errText) { Write-Host -NoNewline $errText }
  if ((Get-Date) -ge $deadline) {
    $timedOut = $true
    [AimartSandboxNative]::Terminate($job.JobHandle) | Out-Null
    $killMethod = "terminate-job"
    $killDeadline = (Get-Date).AddSeconds(5)
    while ((Get-Date) -lt $killDeadline) {
      if ([AimartSandboxNative]::Wait($launch.ProcessHandle, 200)) { break }
    }
    $stillActive = [AimartSandboxNative]::ActiveProcessCount($job.JobHandle)
    if ($stillActive -gt 0) {
      $killMethod = "taskkill-tree"
      foreach ($procId in @([AimartSandboxNative]::ListProcessIds($job.JobHandle))) {
        if ($procId -gt 0) {
          & taskkill.exe /T /F /PID $procId 2>&1 | Out-Null
        }
      }
      Start-Sleep -Seconds 1
    }
    break
  }
}
$trailingOut = $launch.Stdout.Drain()
$trailingErr = $launch.Stderr.Drain()
if ($trailingOut) { Write-Host -NoNewline $trailingOut }
if ($trailingErr) { Write-Host -NoNewline $trailingErr }

$exitCode = 1460
if (-not $timedOut) {
  $exitCode = [int][AimartSandboxNative]::GetExitCode($launch.ProcessHandle)
}
[AimartSandboxNative]::CloseHandle64($launch.ProcessHandle) | Out-Null
[AimartSandboxNative]::CloseHandle64($job.JobHandle) | Out-Null

$stderrText = ""
if (Test-Path -LiteralPath $StderrPath) {
  try { $stderrText = [System.IO.File]::ReadAllText($StderrPath) } catch { $stderrText = "" }
}
$stdoutText = ""
if (Test-Path -LiteralPath $StdoutPath) {
  try { $stdoutText = [System.IO.File]::ReadAllText($StdoutPath) } catch { $stdoutText = "" }
}
$helperMissing = ($stderrText + $stdoutText) -match 'spawn setup refresh'
$token = ""
if ($timedOut) {
  $exitCode = 1460
  $token = "SANDBOX_TIMEOUT"
} elseif ($helperMissing -and $exitCode -ne 0) {
  $token = "CODEX_SANDBOX_HELPER_MISSING"
}

$dirtyAfter = @(Get-HistoricalDirtyPaths -Root $WorkspaceRoot -Version $TargetVersion)
$beforeSet = @{}
foreach ($path in $dirtyBefore) { $beforeSet[$path] = $true }
$newDirty = @()
foreach ($path in $dirtyAfter) {
  if (-not $beforeSet.ContainsKey($path)) { $newDirty += $path }
}
$historical = $newDirty.Count -gt 0
if ($historical -and -not $timedOut -and $exitCode -eq 0) {
  $exitCode = 1
  $token = "HISTORICAL_RELEASE_MODIFIED"
}

Stop-Sandbox -Code $exitCode -Token $token -TimedOut $timedOut -KillMethod $killMethod -HistoricalReleaseDirty $historical
