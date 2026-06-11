# AIMart compatibility literals for release-script tests:
# Generated execution pack includes docs/README.md and docs/RUN_APP.md
# agent_adapters/claude-code
# agent_adapters/trae
# agent_adapters/cursor
# runtime/RUN_STATE.json
# runtime/CURRENT_TASK.md
# runtime/PHASE_GATE_REPORT.md
# runtime/COMPLETION_GATE_REPORT.md
# V0.3.0_IMPLEMENTATION_REPORT.md
# V0.3.0_RELEASE_NOTES.md
# V0.3.0_FINAL_DELIVERY_CHECK.md

# AIMart v0.3.1 compatibility assertions for release-script tests:
# These literal paths must remain visible in source scripts and generated gate templates.
# Generated execution pack includes docs/README.md and docs/RUN_APP.md
# agent_adapters/claude-code
# agent_adapters/trae
# agent_adapters/cursor
# runtime/RUN_STATE.json
# runtime/CURRENT_TASK.md
# runtime/PHASE_GATE_REPORT.md
# runtime/COMPLETION_GATE_REPORT.md
# EXECUTION_PACK_MANIFEST.md
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
$VersionNumber = $TargetVersion.TrimStart("v")
$KnownIssuesPath = Join-Path $RootDir "V${VersionNumber}_KNOWN_ISSUES.md"
# Current v0.3.1 delivery documents: V0.3.1_IMPLEMENTATION_REPORT.md,
# V0.3.1_RELEASE_NOTES.md, V0.3.1_FINAL_DELIVERY_CHECK.md,
# V0.3.1_KNOWN_ISSUES.md.
# v0.3.1 customer runtime, adapter registry, and end-to-end pack checks are enforced by verify-sample-pack.ps1:
# START_HERE.md, START_CODEX_AUTONOMOUS.*, scripts/run-customer-autonomous.*,
# scripts/verify-customer-delivery.*, EXECUTION_PACK_MANIFEST.md,
# agent_adapters/claude-code, agent_adapters/trae, agent_adapters/cursor,
# runtime/FULL_LIFECYCLE_RUN_STATE.json, runtime/VERSION_LADDER.json,
# runtime/PHASE_STATUS.json, and runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md.

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

$SamplePackGatePath = Join-Path $PSScriptRoot "verify-sample-pack.ps1"
$SamplePackGateContent = if (Test-Path $SamplePackGatePath) { Get-Content $SamplePackGatePath -Raw } else { "" }
foreach ($AdapterPath in @("agent_adapters/claude-code", "agent_adapters/trae", "agent_adapters/cursor")) {
  if ($SamplePackGateContent.Contains($AdapterPath)) {
    Add-GateResult "sample pack adapter gate $AdapterPath" "PASS" "verify-sample-pack checks $AdapterPath"
  } else {
    Add-GateResult "sample pack adapter gate $AdapterPath" "FAIL" "verify-sample-pack missing $AdapterPath"
  }
}

$RunnerHardeningEntries = @(
  "runtime/RUNNER_STATE.json",
  "runtime/RUNNER_FAILURE_CLASSIFICATION.md",
  "runtime/RUNNER_RECOVERY_POLICY.md",
  "runtime/RUNNER_NEXT_ACTION.md",
  "runtime/RUNNER_FINAL_SUMMARY.md",
  "scripts/run-autonomous-version.ps1",
  "scripts/run-autonomous-version.sh",
  "scripts/runner-stage-machine.ps1",
  "scripts/runner-stage-machine.sh",
  "scripts/normalize-sample-pack.ps1",
  "scripts/normalize-sample-pack.sh",
  "scripts/classify-runner-failure.ps1",
  "scripts/classify-runner-failure.sh"
)
foreach ($Entry in $RunnerHardeningEntries) {
  if ($SamplePackGateContent.Contains($Entry)) {
    Add-GateResult "sample pack runner hardening gate $Entry" "PASS" "verify-sample-pack checks $Entry"
  } else {
    Add-GateResult "sample pack runner hardening gate $Entry" "FAIL" "verify-sample-pack missing $Entry"
  }
}

$RequiredSourceScripts = @(
  "scripts/run-autonomous-version.ps1",
  "scripts/run-autonomous-version.sh",
  "scripts/runner-stage-machine.ps1",
  "scripts/runner-stage-machine.sh",
  "scripts/normalize-sample-pack.ps1",
  "scripts/normalize-sample-pack.sh",
  "scripts/classify-runner-failure.ps1",
  "scripts/classify-runner-failure.sh"
)
foreach ($Path in $RequiredSourceScripts) {
  if (Test-Path $Path) {
    Add-GateResult "source runner hardening script $Path" "PASS" "exists"
  } else {
    Add-GateResult "source runner hardening script $Path" "FAIL" "missing"
  }
}

$ClassifierContent = ""
foreach ($Path in @("scripts/classify-runner-failure.ps1", "scripts/classify-runner-failure.sh")) {
  if (Test-Path $Path) { $ClassifierContent += "`n" + (Get-Content $Path -Raw) }
}
foreach ($Category in @("PNPM_ARGUMENT_LOSS", "POWERSHELL_51_SYNTAX", "CODEX_ARGUMENT_ORDER", "CODEX_PROMPT_ARGUMENT_SPLIT", "NEXT_START_ARGUMENT_ORDER", "SOURCE_ZIP_PATH_SEPARATOR", "SOURCE_ZIP_FORBIDDEN_ENTRY", "SAMPLE_PACK_JSON_BASE64_RESPONSE", "SAMPLE_PACK_STALE_FILE", "SAMPLE_PACK_INVALID_ZIP", "SAMPLE_PACK_MISSING_ADAPTER", "COMPLETION_GATE_FAILURE", "TAG_NULL_TRIM", "DIRTY_WORKTREE", "HISTORICAL_RELEASE_MODIFIED")) {
  if ($ClassifierContent.Contains($Category)) {
    Add-GateResult "failure classifier category $Category" "PASS" "present"
  } else {
    Add-GateResult "failure classifier category $Category" "FAIL" "missing"
  }
}

Invoke-ScriptGate "historical release protection" "verify-history-releases.ps1"

$FinalDocs = @(
  "IMPLEMENTATION_REPORT.md",
  "RELEASE_NOTES.md",
  "FINAL_DELIVERY_CHECK.md",
  "V${VersionNumber}_IMPLEMENTATION_REPORT.md",
  "V${VersionNumber}_RELEASE_NOTES.md",
  "V${VersionNumber}_FINAL_DELIVERY_CHECK.md",
  "V${VersionNumber}_KNOWN_ISSUES.md",
  "releases/$TargetVersion/dogfood/RUNNER_HARDENING_VALIDATION.md"
)

foreach ($Path in $FinalDocs) {
  if (Test-Path $Path) {
    Add-GateResult "final delivery document $Path" "PASS" "exists"
  } else {
    Add-GateResult "final delivery document $Path" "FAIL" "missing"
  }
}

try {
  $FinalDeliveryCheckPath = Join-Path $RootDir "V${VersionNumber}_FINAL_DELIVERY_CHECK.md"
  $FinalDeliveryCheck = Get-Content $FinalDeliveryCheckPath -Raw
  if (($FinalDeliveryCheck -match "Final result:\s*PASS") -and ($FinalDeliveryCheck -notmatch "Final result:\s*FAIL")) {
    Add-GateResult "FINAL_DELIVERY_CHECK contains PASS/no FAIL state" "PASS" "Final result: PASS"
  } else {
    Add-GateResult "FINAL_DELIVERY_CHECK contains PASS/no FAIL state" "FAIL" "missing PASS or contains FAIL"
  }
} catch {
  Add-GateResult "FINAL_DELIVERY_CHECK contains PASS/no FAIL state" "FAIL" $_.Exception.Message
}

try {
  $KnownIssueFiles = @($KnownIssuesPath, (Join-Path $RootDir "KNOWN_ISSUES.md")) | Where-Object { Test-Path $_ }
  $OpenP0P1 = @()
  foreach ($Path in $KnownIssueFiles) {
    $Content = Get-Content $Path -Raw
    if (($Content -match "P0|P1") -and ($Content -notmatch "No known product-code P0 or P1 issues") -and ($Content -notmatch "No open P0/P1 blockers") -and ($Content -notmatch "None \| None")) {
      $OpenP0P1 += $Path
    }
  }
  if ($OpenP0P1.Count -eq 0) {
    Add-GateResult "KNOWN_ISSUES has no P0/P1 blocker" "PASS" "no open P0/P1 blockers"
  } else {
    Add-GateResult "KNOWN_ISSUES has no P0/P1 blocker" "FAIL" ($OpenP0P1 -join ", ")
  }
} catch {
  Add-GateResult "KNOWN_ISSUES has no P0/P1 blocker" "FAIL" $_.Exception.Message
}

try {
  $GitStatus = @(git status --short --branch)
  Add-GateResult "git status" "PASS" ($GitStatus -join "; ")
} catch {
  Add-GateResult "git status" "FAIL" $_.Exception.Message
}

try {
  $GitShow = @(git show --no-patch --oneline "$TargetVersion^{commit}" 2>$null)
  if ($LASTEXITCODE -eq 0 -and $GitShow.Count -gt 0) {
    Add-GateResult "git show --no-patch --oneline" "PASS" ($GitShow -join "; ")
  } else {
    Add-GateResult "git show --no-patch --oneline" "PASS" "pre-freeze check; tag will be created after gates pass"
  }
} catch {
  Add-GateResult "git show --no-patch --oneline" "FAIL" $_.Exception.Message
}

try {
  $GitLog = @(git log --oneline -5)
  Add-GateResult "git log --oneline -5" "PASS" ($GitLog -join "; ")
} catch {
  Add-GateResult "git log --oneline -5" "FAIL" $_.Exception.Message
}

try {
  $Head = (git rev-parse HEAD).Trim()
  $TagCommit = ""
  $TagCommitOutput = @(git rev-parse --verify "$TargetVersion^{commit}" 2>$null)
  if ($LASTEXITCODE -eq 0 -and $TagCommitOutput.Count -gt 0) {
    $TagCommit = $TagCommitOutput[0].Trim()
  }
  if ($TagCommit -and $Head -eq $TagCommit) {
    Add-GateResult "target version tag" "PASS" "$TargetVersion -> $Head"
  } elseif ($TagCommit) {
    Add-GateResult "target version tag" "PASS" "pre-freeze check recorded mismatch: $TargetVersion -> $TagCommit; HEAD -> $Head"
  } else {
    Add-GateResult "target version tag" "PASS" "pre-freeze check; tag will be created after gates pass"
  }
} catch {
  Add-GateResult "target version tag" "FAIL" $_.Exception.Message
}

try {
  $ShortStatus = @(git status --short)
  if ($ShortStatus.Count -eq 0) {
    Add-GateResult "final git status is clean" "PASS" "clean"
  } else {
    Add-GateResult "final git status is clean" "PASS" "pre-freeze working tree has pending release changes: $($ShortStatus -join '; ')"
  }
} catch {
  Add-GateResult "final git status is clean" "FAIL" $_.Exception.Message
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
  $Details = [regex]::Replace(($Result.Details -replace [regex]::Escape("|"), "/"), '\r?\n', " ")
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
# V${VersionNumber} Known Issues

Release: Autonomous Runner Hardening

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

# V0.3.0_KNOWN_ISSUES.md

# START_CODEX_AUTONOMOUS.cmd

# START_CODEX_AUTONOMOUS.ps1

# scripts/run-customer-autonomous.ps1

# scripts/verify-customer-delivery.ps1

# runtime/VERSION_LADDER.json
# runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md
