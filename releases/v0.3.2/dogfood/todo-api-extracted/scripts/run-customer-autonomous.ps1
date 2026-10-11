param(
  [ValidateSet("autonomous", "supervised")]
  [string]$Mode = "autonomous",
  [switch]$SkipAdapterRun
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

# one-window display fields: project name, selected AI adapter, current lifecycle phase,
# current target version, current task, log updated time, release output status,
# completion gate status, blocked/known issue status, final PASS or FAIL summary.

$StatePath = Join-Path $RootDir "runtime/FULL_LIFECYCLE_RUN_STATE.json"
$ValidationScript = Join-Path $RootDir "scripts/verify-customer-delivery.ps1"
$RunDir = Join-Path $RootDir "codex_runs"
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogPath = Join-Path $RunDir "customer-$Mode-$Stamp.log"

function Read-LifecycleState {
  if (Test-Path $StatePath) {
    try { return Get-Content $StatePath -Raw | ConvertFrom-Json } catch { Write-Verbose "lifecycle state unreadable: $($_.Exception.Message)"; return $null }
  }

  return [pscustomobject]@{
    projectName = "unknown"
    selectedAdapterId = "codex"
    currentLifecyclePhase = "unknown"
    currentTargetVersion = "unknown"
    currentTask = "unknown"
    logUpdatedAt = "unknown"
    releaseOutputStatus = "unknown"
    completionGateStatus = "unknown"
    blockedStatus = "unknown"
    knownIssueStatus = "unknown"
    finalDeliveryStatus = "unknown"
  }
}

function Get-ReleaseOutputStatus {
  $Artifacts = @()
  if (Test-Path "artifacts") {
    $Artifacts += @(Get-ChildItem -Path "artifacts" -Filter "*.zip" -Recurse -ErrorAction SilentlyContinue)
  }
  if (Test-Path "releases") {
    $Artifacts += @(Get-ChildItem -Path "releases" -Filter "*.zip" -Recurse -ErrorAction SilentlyContinue)
  }
  if ($Artifacts.Count -gt 0) { return "$($Artifacts.Count) zip artifact(s)" }
  return "pending"
}

function Get-BlockedKnownIssueStatus {
  $Paths = @("common/BLOCKERS.md", "BLOCKERS.md", "common/KNOWN_ISSUES.md", "KNOWN_ISSUES.md")
  $Open = @()
  foreach ($Path in $Paths) {
    if (Test-Path $Path) {
      $Content = Get-Content $Path -Raw
      if (($Content -match "P0|P1") -and ($Content -notmatch "No open P0/P1") -and ($Content -notmatch "closed|resolved")) {
        $Open += $Path
      }
    }
  }
  if ($Open.Count -gt 0) { return "open P0/P1 in $($Open -join ', ')" }
  return "none"
}

function Show-CustomerDashboard {
  param([string]$State, [string]$FinalResult = "pending")
  $Lifecycle = Read-LifecycleState
  $ReleaseStatus = Get-ReleaseOutputStatus
  $BlockedStatus = Get-BlockedKnownIssueStatus
  $Updated = Get-Date -Format s

  Clear-Host
  Write-Host "AIMart Customer Runtime Runner"
  Write-Host "one-window customer dashboard"
  Write-Host ""
  Write-Host "project name: $($Lifecycle.projectName)"
  Write-Host "selected AI adapter: $($Lifecycle.selectedAdapterId)"
  Write-Host "current lifecycle phase: $($Lifecycle.currentLifecyclePhase)"
  Write-Host "current target version: $($Lifecycle.currentTargetVersion)"
  Write-Host "current task: $($Lifecycle.currentTask)"
  Write-Host "log updated time: $Updated"
  Write-Host "release output status: $ReleaseStatus"
  Write-Host "completion gate status: $($Lifecycle.completionGateStatus)"
  Write-Host "blocked/known issue status: $BlockedStatus"
  Write-Host "runner state: $State"
  Write-Host "log: $LogPath"
  Write-Host "final PASS or FAIL summary: $FinalResult"
}

Show-CustomerDashboard -State "starting"

$AdapterScript = if ($Mode -eq "supervised") {
  Join-Path $RootDir "agent_adapters/codex/run-codex-supervised.ps1"
} else {
  Join-Path $RootDir "agent_adapters/codex/run-codex-end-to-end-autonomous.ps1"
}

$AdapterExitCode = 0
if (-not $SkipAdapterRun) {
  if (-not (Test-Path $AdapterScript)) {
    throw "Missing selected adapter launcher: $AdapterScript"
  }
  & $AdapterScript 2>&1 | Tee-Object -FilePath $LogPath
  $AdapterExitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
}

Show-CustomerDashboard -State "verifying"

$ValidationExitCode = 1
if (Test-Path $ValidationScript) {
  try {
    & $ValidationScript
    $ValidationExitCode = 0
  } catch {
    Write-Host $_.Exception.Message
    $ValidationExitCode = 1
  }
} else {
  Write-Host "Missing customer validation script: $ValidationScript"
}

$FinalResult = if (($AdapterExitCode -eq 0) -and ($ValidationExitCode -eq 0)) { "PASS" } else { "FAIL" }
Show-CustomerDashboard -State "completed" -FinalResult $FinalResult
Write-Host ""
Write-Host "Final Summary"
Write-Host "-------------"
Write-Host "selected AI adapter: codex"
Write-Host "adapter exit code: $AdapterExitCode"
Write-Host "customer delivery verification exit code: $ValidationExitCode"
Write-Host "final PASS or FAIL summary: $FinalResult"

if ($FinalResult -eq "PASS") { exit 0 }
exit 1