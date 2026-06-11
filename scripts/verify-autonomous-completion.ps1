param(
  [string]$TargetVersion = ""
)

$ErrorActionPreference = "Continue"

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

if (-not $TargetVersion) {
  $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $TargetVersion = "v$($Pkg.version)"
}
if (-not $TargetVersion.StartsWith("v")) {
  $TargetVersion = "v$TargetVersion"
}

$ReportDir = Join-Path $RootDir "codex_runs"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
$ReportPath = Join-Path $ReportDir "verify-autonomous-completion-$TargetVersion.md"
$KnownIssuesPath = Join-Path $RootDir "V0.2.2_KNOWN_ISSUES.md"

$Results = New-Object System.Collections.Generic.List[object]

function Add-GateResult {
  param(
    [string]$Gate,
    [string]$Status,
    [string]$Details
  )
  $Results.Add([pscustomobject]@{
    Gate = $Gate
    Status = $Status
    Details = $Details
  }) | Out-Null
}

function Invoke-NativeGate {
  param(
    [string]$Gate,
    [string]$Executable,
    [string[]]$Arguments = @()
  )

  Write-Host "[Autonomous Completion Gate] $Gate"
  try {
    & $Executable @Arguments
    $Code = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
    if ($Code -eq 0) {
      Add-GateResult $Gate "PASS" "exit 0"
    } else {
      Add-GateResult $Gate "FAIL" "exit $Code"
    }
  } catch {
    Add-GateResult $Gate "FAIL" $_.Exception.Message
  }
}

function Invoke-ScriptGate {
  param(
    [string]$Gate,
    [string]$ScriptName
  )

  Write-Host "[Autonomous Completion Gate] $Gate"
  try {
    & (Join-Path $PSScriptRoot $ScriptName) -TargetVersion $TargetVersion
    Add-GateResult $Gate "PASS" "ok"
  } catch {
    Add-GateResult $Gate "FAIL" $_.Exception.Message
  }
}

Invoke-NativeGate "pnpm test" "pnpm" @("test")
Invoke-NativeGate "pnpm lint" "pnpm" @("lint")
Invoke-NativeGate "pnpm build" "pnpm" @("build")

Invoke-ScriptGate "release artifacts and SHA256 values" "verify-release.ps1"
Invoke-ScriptGate "source ZIP exclusions" "verify-source-zip.ps1"
Invoke-ScriptGate "sample execution-pack contents" "verify-sample-pack.ps1"
Invoke-ScriptGate "historical release protection" "verify-history-releases.ps1"

$FinalDocs = @(
  "IMPLEMENTATION_REPORT.md",
  "RELEASE_NOTES.md",
  "FINAL_DELIVERY_CHECK.md",
  "V0.2.2_IMPLEMENTATION_REPORT.md",
  "V0.2.2_RELEASE_NOTES.md",
  "V0.2.2_FINAL_DELIVERY_CHECK.md",
  "V0.2.2_KNOWN_ISSUES.md"
)

foreach ($Path in $FinalDocs) {
  if (Test-Path $Path) {
    Add-GateResult "final delivery document $Path" "PASS" "exists"
  } else {
    Add-GateResult "final delivery document $Path" "FAIL" "missing"
  }
}

try {
  $GitStatus = @(git status --short --branch)
  Add-GateResult "git status" "PASS" ($GitStatus -join "; ")
} catch {
  Add-GateResult "git status" "FAIL" $_.Exception.Message
}

try {
  $Head = (git rev-parse HEAD).Trim()
  $TagCommit = (git rev-parse $TargetVersion).Trim()
  if ($Head -eq $TagCommit) {
    Add-GateResult "target version tag" "PASS" "$TargetVersion -> $Head"
  } else {
    Add-GateResult "target version tag" "FAIL" "$TargetVersion -> $TagCommit; HEAD -> $Head"
  }
} catch {
  Add-GateResult "target version tag" "FAIL" $_.Exception.Message
}

$Failures = @($Results | Where-Object { $_.Status -eq "FAIL" })
$FinalStatus = if ($Failures.Count -eq 0) { "PASS" } else { "FAIL" }
$GitStatusText = ""
try {
  $GitStatusText = (git status --short --branch) -join [Environment]::NewLine
} catch {
  $GitStatusText = $_.Exception.Message
}

$ReportLines = @(
  "# Autonomous Completion Gate Report",
  "",
  "TargetVersion: $TargetVersion",
  "GeneratedAt: $(Get-Date -Format s)",
  "",
  "## Gate Results",
  "",
  "| Gate | Status | Details |",
  "|---|---|---|"
)

foreach ($Result in $Results) {
  $Details = ($Result.Details -replace "\|", "/") -replace "`r?`n", " "
  $ReportLines += "| $($Result.Gate) | $($Result.Status) | $Details |"
}

$ReportLines += @(
  "",
  "## Git Status",
  "",
  '```text',
  $GitStatusText,
  '```',
  "",
  "Final result: $FinalStatus"
)

$ReportLines | Set-Content -Encoding UTF8 $ReportPath

if ($FinalStatus -eq "FAIL") {
  $FailureText = ($Failures | ForEach-Object { "- $($_.Gate): $($_.Details)" }) -join [Environment]::NewLine
  @"
# V0.2.2 Known Issues

Autonomous Completion Gate result: FAIL

Report: $ReportPath

## Failed Gates

$FailureText
"@ | Set-Content -Encoding UTF8 $KnownIssuesPath

  Write-Host "[Autonomous Completion Gate] FAIL report=$ReportPath"
  Write-Host "Failed gate(s):"
  $Failures | ForEach-Object { Write-Host " - $($_.Gate): $($_.Details)" }
  throw "Autonomous Completion Gate FAIL. See $ReportPath"
}

Write-Host "[Autonomous Completion Gate] PASS report=$ReportPath"
