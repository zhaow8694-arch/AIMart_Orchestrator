$ErrorActionPreference = "Continue"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

$ReportPath = Join-Path $RootDir "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md"
$Results = New-Object System.Collections.Generic.List[object]

function Add-Check([string]$Gate, [string]$Status, [string]$Details) {
  $Results.Add([pscustomobject]@{ Gate = $Gate; Status = $Status; Details = $Details }) | Out-Null
}

function Test-FileList([string[]]$Paths) {
  $Missing = @($Paths | Where-Object { -not (Test-Path $_) })
  if ($Missing.Count -eq 0) { return "PASS|ok" }
  return "FAIL|missing: $($Missing -join ', ')"
}

function Add-FileListCheck([string]$Gate, [string[]]$Paths) {
  $Result = Test-FileList $Paths
  $Parts = $Result -split "\|", 2
  Add-Check $Gate $Parts[0] $Parts[1]
}

function Test-NoOpenP0P1([string[]]$Paths) {
  $Open = @()
  foreach ($Path in $Paths) {
    if (Test-Path $Path) {
      $Content = Get-Content $Path -Raw
      if (($Content -match "P0|P1") -and ($Content -notmatch "No open P0/P1") -and ($Content -notmatch "closed|resolved")) {
        $Open += $Path
      }
    }
  }
  if ($Open.Count -eq 0) { return "PASS|no open P0/P1 blockers" }
  return "FAIL|open P0/P1 blockers in $($Open -join ', ')"
}

function Add-NoOpenP0P1Check([string]$Gate, [string[]]$Paths) {
  $Result = Test-NoOpenP0P1 $Paths
  $Parts = $Result -split "\|", 2
  Add-Check $Gate $Parts[0] $Parts[1]
}

function Add-LifecycleCoherenceCheck {
  $Required = @(
    "runtime/FULL_LIFECYCLE_RUN_STATE.json",
    "runtime/VERSION_LADDER.json",
    "runtime/PHASE_STATUS.json",
    "runtime/CURRENT_PHASE.md",
    "runtime/NEXT_ACTION.md",
    "runtime/FINAL_DELIVERY_STATUS.md",
    "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md"
  )
  $Missing = @($Required | Where-Object { -not (Test-Path $_) })
  if ($Missing.Count -gt 0) {
    Add-Check "lifecycle state files are present and coherent" "FAIL" "missing: $($Missing -join ', ')"
    return
  }
  try {
    $State = Get-Content "runtime/FULL_LIFECYCLE_RUN_STATE.json" -Raw | ConvertFrom-Json
    $Ladder = Get-Content "runtime/VERSION_LADDER.json" -Raw | ConvertFrom-Json
    $Phases = Get-Content "runtime/PHASE_STATUS.json" -Raw | ConvertFrom-Json
    $Versions = @($Ladder.versions | ForEach-Object { $_.version })
    $PhaseNames = @($Phases.phases | ForEach-Object { $_.phase })
    if (($Versions -notcontains $State.currentTargetVersion) -or ($PhaseNames -notcontains $State.currentLifecyclePhase)) {
      Add-Check "lifecycle state files are present and coherent" "FAIL" "state does not match ladder or phase status"
      return
    }
    Add-Check "lifecycle state files are present and coherent" "PASS" "JSON parsed and current phase/version are coherent"
  } catch {
    Add-Check "lifecycle state files are present and coherent" "FAIL" $_.Exception.Message
  }
}

function Add-SelectedAdapterRunbookCheck {
  try {
    $State = Get-Content "runtime/FULL_LIFECYCLE_RUN_STATE.json" -Raw | ConvertFrom-Json
    $Adapter = if ($State.selectedAdapterId) { $State.selectedAdapterId } else { "codex" }
    $Runbook = switch ($Adapter) {
      "claude-code" { "agent_adapters/claude-code/CLAUDE_RUNBOOK.md" }
      "trae" { "agent_adapters/trae/TRAE_RUNBOOK.md" }
      "cursor" { "agent_adapters/cursor/CURSOR_RUNBOOK.md" }
      default { "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md" }
    }
    if (Test-Path $Runbook) {
      Add-Check "selected adapter runbook exists" "PASS" $Runbook
    } else {
      Add-Check "selected adapter runbook exists" "FAIL" "missing: $Runbook"
    }
  } catch {
    Add-Check "selected adapter runbook exists" "FAIL" $_.Exception.Message
  }
}

Add-FileListCheck "generated project files" @("common/PROJECT_SPEC.md", "common/TASK_QUEUE.md", "common/EXECUTION_RULES.md")
Add-FileListCheck "generated docs" @("docs/README.md", "docs/RUN_APP.md", "docs/SECURITY_AND_PERMISSIONS.md")
Add-FileListCheck "tests/build instructions" @("scripts/test.ps1", "scripts/test.sh", "runtime/INSTALL_PLAN.md")
Add-FileListCheck "final artifact instructions" @("scripts/package.ps1", "scripts/package.sh", "scripts/finalize.ps1", "scripts/finalize.sh")
Add-NoOpenP0P1Check "BLOCKERS.md has no open P0/P1 blockers" @("common/BLOCKERS.md", "BLOCKERS.md")
Add-NoOpenP0P1Check "KNOWN_ISSUES has no P0/P1 blockers" @("common/KNOWN_ISSUES.md", "KNOWN_ISSUES.md")
Add-LifecycleCoherenceCheck
Add-SelectedAdapterRunbookCheck
Add-FileListCheck "completion gate report exists" @("runtime/COMPLETION_GATE_REPORT.md")

$Final = if (($Results | Where-Object { $_.Status -eq "FAIL" }).Count -eq 0) { "PASS" } else { "FAIL" }
$Lines = @(
  "# Customer Runtime Validation Report",
  "",
  "| Gate | Status | Notes |",
  "|---|---|---|"
)
foreach ($Result in $Results) {
  $Details = [regex]::Replace(($Result.Details -replace [regex]::Escape("|"), "/"), '\r?\n', " ")
  $Lines += "| $($Result.Gate) | $($Result.Status) | $Details |"
}
$Lines += @("", "Final result: $Final")
$Lines | Set-Content -Encoding UTF8 $ReportPath

Write-Host "[verify-customer-delivery] $Final report=$ReportPath"
if ($Final -eq "PASS") { return }
throw "Customer delivery verification FAIL. See $ReportPath"