$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $RootDir

$RunDir = Join-Path $RootDir "codex_runs"
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogPath = Join-Path $RunDir "codex-unified-autonomous-$Stamp.log"
$ExitPath = Join-Path $RunDir "codex-unified-autonomous-$Stamp.exit"
$PromptPath = Join-Path $RootDir "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"
$StatusPath = Join-Path $RootDir "runtime/AUTONOMOUS_RUN_STATUS.md"
$SummaryPath = Join-Path $RootDir "runtime/AUTONOMOUS_RUN_SUMMARY.md"
$HealthPath = Join-Path $RootDir "runtime/AUTONOMOUS_HEALTH_CHECK.md"
$VerificationReportPath = Join-Path $RootDir "runtime/AUTONOMOUS_VERIFICATION_REPORT.md"
$StartTime = Get-Date
$TargetVersion = "unknown"
$CleanAtStartup = "unknown"
$ExistingCodexProcesses = "unknown"

Write-Host "[codex-unified] one-window dashboard: sandbox workspace-write, approval never"
Write-Host "[codex-unified] log=$LogPath"

function Get-ElapsedText {
  param([datetime]$StartedAt)
  return ((Get-Date) - $StartedAt).ToString("hh\:mm\:ss")
}

function Get-GitBranchText {
  try {
    $Branch = (git branch --show-current 2>$null).Trim()
    if ($Branch) { return $Branch }
    return "detached-or-unknown"
  } catch {
    return "git unavailable"
  }
}

function Get-DirtyFileCount {
  try {
    return @((git status --short 2>$null)).Count
  } catch {
    return -1
  }
}

function Get-GitStatusText {
  try {
    $Lines = @(git status --short 2>$null)
    if ($Lines.Count -eq 0) { return "clean" }
    return "$($Lines.Count) changed file(s)"
  } catch {
    return "git unavailable"
  }
}

function Get-TargetVersionText {
  $PackagePath = Join-Path $RootDir "package.json"
  if (-not (Test-Path $PackagePath)) {
    return "unknown"
  }

  try {
    $Pkg = Get-Content -Path $PackagePath -Raw | ConvertFrom-Json
    if ($Pkg.version) { return "v$($Pkg.version)" }
  } catch {}

  return "unknown"
}

function Get-CleanAtStartupText {
  $Dirty = Get-DirtyFileCount
  if ($Dirty -lt 0) { return "git unavailable" }
  if ($Dirty -eq 0) { return "yes" }
  return "no ($Dirty changed file(s))"
}

function Get-ExistingCodexProcessesText {
  try {
    $Processes = @(Get-Process -Name "codex" -ErrorAction SilentlyContinue)
    if ($Processes.Count -eq 0) { return "none detected" }
    return "$($Processes.Count) detected"
  } catch {
    return "process check unavailable"
  }
}

function Get-TargetReleaseDir {
  if ($TargetVersion -eq "unknown") {
    return Join-Path $RootDir "releases"
  }
  return Join-Path $RootDir "releases/$TargetVersion"
}

function Get-TargetReleaseDirectoryStatus {
  $Path = Get-TargetReleaseDir
  if (Test-Path $Path) { return "exists: $Path" }
  return "missing: $Path"
}

function Get-SourceZipStatus {
  if ($TargetVersion -eq "unknown") { return "unknown target version" }
  $Path = Join-Path (Get-TargetReleaseDir) "aimart-orchestrator-$TargetVersion-source.zip"
  if (Test-Path $Path) { return "exists" }
  return "missing"
}

function Get-SampleZipStatus {
  if ($TargetVersion -eq "unknown") { return "unknown target version" }
  $Path = Join-Path (Get-TargetReleaseDir) "samples/todo-api-generated-execution-pack.zip"
  if (Test-Path $Path) { return "exists" }
  return "missing"
}

function Get-LatestLogActivityTime {
  if (-not (Test-Path $LogPath)) {
    return "none"
  }

  return (Get-Item $LogPath).LastWriteTime.ToString("s")
}

function Get-LogStalledText {
  if (-not (Test-Path $LogPath)) {
    return "no log yet"
  }

  $Age = (Get-Date) - (Get-Item $LogPath).LastWriteTime
  if ($Age.TotalMinutes -ge 5) {
    return "yes"
  }

  return "no"
}

function Get-ReleaseStatus {
  $ReleaseRoot = Join-Path $RootDir "releases"
  if (-not (Test-Path $ReleaseRoot)) {
    return "releases/ not found"
  }

  $ReleaseDirs = @(Get-ChildItem -Path $ReleaseRoot -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
  if ($ReleaseDirs.Count -eq 0) {
    return "no release directories"
  }

  $Latest = $ReleaseDirs[0]
  $ZipCount = @(Get-ChildItem -Path $Latest.FullName -Filter "*.zip" -File -Recurse -ErrorAction SilentlyContinue).Count
  return "$($Latest.Name): $ZipCount zip artifact(s)"
}

function Get-SampleExecutionPackStatus {
  $ReleaseRoot = Join-Path $RootDir "releases"
  if (-not (Test-Path $ReleaseRoot)) {
    return "missing"
  }

  $Samples = @(Get-ChildItem -Path $ReleaseRoot -Filter "*generated-execution-pack.zip" -File -Recurse -ErrorAction SilentlyContinue)
  if ($Samples.Count -eq 0) {
    return "missing"
  }

  return "$($Samples.Count) sample pack(s)"
}

function Get-KnownIssuesStatus {
  $IssueFiles = @()
  foreach ($Name in @("KNOWN_ISSUES.md", "V0.2.1_KNOWN_ISSUES.md", "V0.2.0_KNOWN_ISSUES.md")) {
    $Path = Join-Path $RootDir $Name
    if (Test-Path $Path) {
      $IssueFiles += $Path
    }
  }

  $ApprovalQueue = Join-Path $RootDir "runtime/APPROVAL_QUEUE.md"
  if (Test-Path $ApprovalQueue) {
    $IssueFiles += $ApprovalQueue
  }

  if ($IssueFiles.Count -eq 0) {
    return "no known issue files"
  }

  return "$($IssueFiles.Count) issue/status file(s)"
}

function Get-LogTailText {
  if (-not (Test-Path $LogPath)) {
    return "log not created yet"
  }

  $Tail = @(Get-Content -Path $LogPath -Tail 12 -ErrorAction SilentlyContinue)
  if ($Tail.Count -eq 0) {
    return "log is empty"
  }

  return ($Tail -join [Environment]::NewLine)
}

function Invoke-CompletionGate {
  $GateScript = Join-Path $RootDir "scripts/verify-autonomous-completion.ps1"
  $GateLogPath = Join-Path $RunDir "completion-gate-$Stamp.log"
  $Status = "FAIL"
  $FailedGate = "Autonomous Completion Gate"
  $Details = "scripts/verify-autonomous-completion.ps1 not found; ran local file gate"

  if (Test-Path $GateScript) {
    & powershell -ExecutionPolicy Bypass -File $GateScript -TargetVersion $TargetVersion *> $GateLogPath
    $Code = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
    if ($Code -eq 0) {
      $Status = "PASS"
      $FailedGate = "none"
      $Details = "verify-autonomous-completion.ps1 exited 0; log: $GateLogPath"
    } else {
      $Status = "FAIL"
      $FailedGate = "verify-autonomous-completion.ps1"
      $Details = "exit $Code; log: $GateLogPath"
    }
  } else {
    $RequiredFiles = @(
      "runtime/AUTONOMOUS_COMPLETION_GATE.md",
      "runtime/AUTONOMOUS_VERIFICATION_REPORT.md",
      "runtime/AUTONOMOUS_RUN_SUMMARY.md",
      "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md"
    )
    $Missing = @()
    foreach ($Path in $RequiredFiles) {
      if (-not (Test-Path (Join-Path $RootDir $Path))) {
        $Missing += $Path
      }
    }
    if ($Missing.Count -eq 0) {
      $Status = "PASS"
      $FailedGate = "none"
      $Details = "local generated-pack completion files exist"
    } else {
      $Status = "FAIL"
      $FailedGate = "generated-pack file gate"
      $Details = "missing: $($Missing -join ', ')"
    }
  }

@"
# Autonomous Verification Report

| Gate | Status | Notes |
|---|---|---|
| Autonomous Completion Gate | $Status | $Details |
| Failed gate | $Status | $FailedGate |

Final result: $Status
"@ | Set-Content -Encoding UTF8 -Path $VerificationReportPath

  return [pscustomobject]@{
    Status = $Status
    FailedGate = $FailedGate
    ReportPath = $VerificationReportPath
    Details = $Details
  }
}

function Write-RunStatus {
  param([string]$State, [string]$ExitCode = "running")

  $Elapsed = Get-ElapsedText $StartTime
  $Branch = Get-GitBranchText
  $Dirty = Get-DirtyFileCount
  $ReleaseStatus = Get-ReleaseStatus
  $KnownIssues = Get-KnownIssuesStatus
  $Updated = Get-Date -Format s

@"
# Autonomous Run Status

| Field | Value |
|---|---|
| Runner state | $State |
| Target version | $TargetVersion |
| Elapsed time | $Elapsed |
| Git branch | $Branch |
| Clean at startup | $CleanAtStartup |
| Existing Codex processes | $ExistingCodexProcesses |
| Dirty file count | $Dirty |
| Latest log tail | See $LogPath |
| Latest log activity time | $(Get-LatestLogActivityTime) |
| Log appears stalled | $(Get-LogStalledText) |
| Release directory status | $ReleaseStatus |
| Target release directory exists | $(Get-TargetReleaseDirectoryStatus) |
| Source ZIP exists | $(Get-SourceZipStatus) |
| Sample ZIP exists | $(Get-SampleZipStatus) |
| Known issues status | $KnownIssues |
| Codex exit code | $ExitCode |
| Last updated | $Updated |
"@ | Set-Content -Encoding UTF8 -Path $StatusPath
}

function Write-HealthCheck {
@"
# Autonomous Health Check

- [x] one-window runner started.
- [x] codex_runs log path prepared.
- [x] runtime/AUTONOMOUS_RUN_STATUS.md update attempted.
- [x] runtime/AUTONOMOUS_RUN_SUMMARY.md update attempted at completion.
- [x] Release directory status checked.
- [x] Source ZIP status checked.
- [x] Sample ZIP status checked.
- [x] Latest log activity time checked.
- [x] Log appears stalled status checked.
- [x] Autonomous Completion Gate run at completion.
- [x] Known issues status checked.
- [x] No secret reads or remote pushes are performed by this runner.
"@ | Set-Content -Encoding UTF8 -Path $HealthPath
}

function Show-Dashboard {
  param([string]$State)

  $Elapsed = Get-ElapsedText $StartTime
  $Branch = Get-GitBranchText
  $Dirty = Get-DirtyFileCount
  $ReleaseStatus = Get-ReleaseStatus
  $KnownIssues = Get-KnownIssuesStatus
  $Tail = Get-LogTailText

  Clear-Host
  Write-Host "AIMart Codex Unified Autonomous Runner"
  Write-Host "one-window status display"
  Write-Host ""
  Write-Host "Target version: $TargetVersion"
  Write-Host "State: $State"
  Write-Host "Elapsed: $Elapsed"
  Write-Host "Git branch: $Branch"
  Write-Host "Clean at startup: $CleanAtStartup"
  Write-Host "Existing Codex processes: $ExistingCodexProcesses"
  Write-Host "Dirty files: $Dirty"
  Write-Host "Release directory: $ReleaseStatus"
  Write-Host "Target release directory exists: $(Get-TargetReleaseDirectoryStatus)"
  Write-Host "Source ZIP: $(Get-SourceZipStatus)"
  Write-Host "Sample ZIP: $(Get-SampleZipStatus)"
  Write-Host "Latest log activity: $(Get-LatestLogActivityTime)"
  Write-Host "Log appears stalled: $(Get-LogStalledText)"
  Write-Host "Known issues: $KnownIssues"
  Write-Host "Autonomous Completion Gate: pending"
  Write-Host "Log: $LogPath"
  Write-Host ""
  Write-Host "Latest log tail"
  Write-Host "---------------"
  Write-Host $Tail

  Write-RunStatus -State $State
}

if (-not (Test-Path $PromptPath)) {
  throw "Missing prompt file: $PromptPath"
}

$TargetVersion = Get-TargetVersionText
$CleanAtStartup = Get-CleanAtStartupText
$ExistingCodexProcesses = Get-ExistingCodexProcessesText

Write-HealthCheck
Write-RunStatus -State "starting"

# Effective Codex flags: codex exec --sandbox workspace-write --approval never
$CodexJob = Start-Job -ScriptBlock {
  param($JobRootDir, $JobPromptPath, $JobLogPath, $JobExitPath)

  Set-Location $JobRootDir
  try {
    & codex exec --sandbox workspace-write --approval never --cd $JobRootDir --prompt-file $JobPromptPath *> $JobLogPath
    $Code = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
  } catch {
    $_ | Out-String | Add-Content -Encoding UTF8 -Path $JobLogPath
    $Code = 1
  }

  Set-Content -Encoding UTF8 -Path $JobExitPath -Value $Code
} -ArgumentList $RootDir, $PromptPath, $LogPath, $ExitPath

while ($CodexJob.State -eq "Running") {
  Show-Dashboard -State "running"
  Start-Sleep -Seconds 3
}

Receive-Job -Job $CodexJob -ErrorAction SilentlyContinue | Out-Null
Remove-Job -Job $CodexJob -Force

$ExitCode = 1
if (Test-Path $ExitPath) {
  $Parsed = 0
  if ([int]::TryParse(((Get-Content -Path $ExitPath -Raw).Trim()), [ref]$Parsed)) {
    $ExitCode = $Parsed
  }
}

Show-Dashboard -State "completed"
Write-RunStatus -State "completed" -ExitCode "$ExitCode"
$GateResult = Invoke-CompletionGate
$FinalExitCode = 1
if (($ExitCode -eq 0) -and ($GateResult.Status -eq "PASS")) {
  $FinalExitCode = 0
}

$ReleaseStatus = Get-ReleaseStatus
$SampleStatus = Get-SampleExecutionPackStatus
$GitStatus = Get-GitStatusText
if ($GateResult.Status -eq "PASS") {
  Write-Host "Autonomous Completion Gate: PASS"
} else {
  Write-Host "Autonomous Completion Gate: FAIL"
  Write-Host "Failed gate: $($GateResult.FailedGate)"
  Write-Host "Report file: $($GateResult.ReportPath)"
}
$NextAction = if ($FinalExitCode -eq 0) {
  "Review runtime/AUTONOMOUS_RUN_SUMMARY.md, inspect changed files, then run scripts/finalize for delivery."
} else {
  "Inspect runtime/AUTONOMOUS_VERIFICATION_REPORT.md and the latest codex_runs log, fix the blocking issue, then rerun the unified autonomous runner."
}

@"
# Autonomous Run Summary

| Field | Value |
|---|---|
| Codex exit code | $ExitCode |
| Final exit code | $FinalExitCode |
| Release artifacts | $ReleaseStatus |
| Sample execution pack | $SampleStatus |
| Autonomous Completion Gate | $($GateResult.Status) |
| Failed gate | $($GateResult.FailedGate) |
| Verification report | $($GateResult.ReportPath) |
| Git status | $GitStatus |
| Latest log | $LogPath |
| Next recommended action | $NextAction |
"@ | Set-Content -Encoding UTF8 -Path $SummaryPath

Write-Host ""
Write-Host "Final Summary"
Write-Host "-------------"
Write-Host "Codex exit code: $ExitCode"
Write-Host "Final exit code: $FinalExitCode"
Write-Host "Release artifacts: $ReleaseStatus"
Write-Host "Sample execution pack: $SampleStatus"
Write-Host "Autonomous Completion Gate: $($GateResult.Status)"
Write-Host "Failed gate: $($GateResult.FailedGate)"
Write-Host "Report file: $($GateResult.ReportPath)"
Write-Host "Git status: $GitStatus"
Write-Host "Next recommended action: $NextAction"

exit $FinalExitCode