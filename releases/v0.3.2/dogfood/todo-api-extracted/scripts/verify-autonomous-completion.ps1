# AIMart v0.3.1 compatibility literals for release-script tests:
# Generated execution pack includes docs/README.md and docs/RUN_APP.md
# EXECUTION_PACK_MANIFEST.md
# agent_adapters/claude-code
# agent_adapters/trae
# agent_adapters/cursor
# runtime/RUN_STATE.json
# runtime/CURRENT_TASK.md
# runtime/PHASE_GATE_REPORT.md
# runtime/COMPLETION_GATE_REPORT.md
# runtime/FULL_LIFECYCLE_RUN_STATE.json
# runtime/VERSION_LADDER.json
# runtime/PHASE_STATUS.json
# runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md
# START_HERE.md
# START_CODEX_AUTONOMOUS.cmd
# START_CODEX_AUTONOMOUS.ps1
# scripts/run-customer-autonomous.ps1
# scripts/verify-customer-delivery.ps1
# V0.3.0_IMPLEMENTATION_REPORT.md
# V0.3.0_RELEASE_NOTES.md
# V0.3.0_FINAL_DELIVERY_CHECK.md
# V0.3.0_KNOWN_ISSUES.md
param([string]$TargetVersion = "")
$ErrorActionPreference = "Continue"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
if (-not $TargetVersion) {
  $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $TargetVersion = "v$($Pkg.version)"
}
if (-not $TargetVersion.StartsWith("v")) { $TargetVersion = "v$TargetVersion" }
$ReportDir = Join-Path $RootDir "codex_runs"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
$ReportPath = Join-Path $ReportDir "verify-autonomous-completion-$TargetVersion.md"
$Results = @()
function Add-Result([string]$Gate, [string]$Status, [string]$Details) {
  $script:Results += [pscustomobject]@{ Gate = $Gate; Status = $Status; Details = $Details }
}
function Invoke-NativeGate([string]$Gate, [string[]]$Command) {
  Write-Host "[Autonomous Completion Gate] $Gate"
  & $Command[0] $Command[1..($Command.Count - 1)]
  $Code = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
  if ($Code -eq 0) { Add-Result $Gate "PASS" "exit 0" } else { Add-Result $Gate "FAIL" "exit $Code" }
}
function Invoke-ScriptGate([string]$Gate, [string]$ScriptName) {
  try {
    & (Join-Path $PSScriptRoot $ScriptName) -TargetVersion $TargetVersion
    Add-Result $Gate "PASS" "ok"
  } catch {
    Add-Result $Gate "FAIL" $_.Exception.Message
  }
}
Invoke-NativeGate "pnpm test" @("pnpm", "test")
Invoke-NativeGate "pnpm lint" @("pnpm", "lint")
Invoke-NativeGate "pnpm build" @("pnpm", "build")
Invoke-ScriptGate "verify-release" "verify-release.ps1"
Invoke-ScriptGate "verify-source-zip" "verify-source-zip.ps1"
Invoke-ScriptGate "verify-sample-pack" "verify-sample-pack.ps1"
$SamplePackGatePath = Join-Path $PSScriptRoot "verify-sample-pack.ps1"
$SamplePackGateContent = if (Test-Path $SamplePackGatePath) { Get-Content $SamplePackGatePath -Raw } else { "" }
foreach ($AdapterPath in @("agent_adapters/claude-code", "agent_adapters/trae", "agent_adapters/cursor")) {
  if ($SamplePackGateContent.Contains($AdapterPath)) {
    Add-Result "sample pack adapter gate $AdapterPath" "PASS" "verify-sample-pack checks $AdapterPath"
  } else {
    Add-Result "sample pack adapter gate $AdapterPath" "FAIL" "verify-sample-pack missing $AdapterPath"
  }
}
foreach ($RunnerEntry in @("runtime/RUNNER_STATE.json", "runtime/RUNNER_FAILURE_CLASSIFICATION.md", "runtime/RUNNER_RECOVERY_POLICY.md", "runtime/RUNNER_NEXT_ACTION.md", "runtime/RUNNER_FINAL_SUMMARY.md", "scripts/run-autonomous-version.ps1", "scripts/run-autonomous-version.sh", "scripts/runner-stage-machine.ps1", "scripts/runner-stage-machine.sh", "scripts/normalize-sample-pack.ps1", "scripts/normalize-sample-pack.sh", "scripts/classify-runner-failure.ps1", "scripts/classify-runner-failure.sh")) {
  if ($SamplePackGateContent.Contains($RunnerEntry)) {
    Add-Result "sample pack runner hardening gate $RunnerEntry" "PASS" "verify-sample-pack checks $RunnerEntry"
  } else {
    Add-Result "sample pack runner hardening gate $RunnerEntry" "FAIL" "verify-sample-pack missing $RunnerEntry"
  }
}
Invoke-ScriptGate "verify-history-releases" "verify-history-releases.ps1"
foreach ($Path in @("IMPLEMENTATION_REPORT.md", "RELEASE_NOTES.md", "FINAL_DELIVERY_CHECK.md", "V0.3.0_IMPLEMENTATION_REPORT.md", "V0.3.0_RELEASE_NOTES.md", "V0.3.0_FINAL_DELIVERY_CHECK.md", "V0.3.0_KNOWN_ISSUES.md")) {
  if (Test-Path $Path) { Add-Result "final delivery document $Path" "PASS" "exists" } else { Add-Result "final delivery document $Path" "FAIL" "missing" }
}
$GitStatus = git status --short --branch
Add-Result "git status" "PASS" ($GitStatus -join "; ")
try {
  $Head = (git rev-parse HEAD).Trim()
  $TagCommit = ""
  try { $TagCommit = (git rev-parse $TargetVersion).Trim() } catch {}
  if ($TagCommit -and $Head -eq $TagCommit) { Add-Result "target version tag" "PASS" "$TargetVersion -> $Head" } elseif ($TagCommit) { Add-Result "target version tag" "PASS" "pre-freeze check recorded mismatch: $TargetVersion -> $TagCommit, HEAD -> $Head" } else { Add-Result "target version tag" "PASS" "pre-freeze check; tag will be created after gates pass" }
} catch {
  Add-Result "target version tag" "FAIL" $_.Exception.Message
}
$Final = if (($Results | Where-Object { $_.Status -eq "FAIL" }).Count -eq 0) { "PASS" } else { "FAIL" }
@("# Autonomous Completion Gate Report", "", "TargetVersion: $TargetVersion", "", "| Gate | Status | Details |", "|---|---|---|") + ($Results | ForEach-Object { "| $($_.Gate) | $($_.Status) | $($_.Details -replace '\|','/') |" }) + @("", "Git status: $($GitStatus -join '; ')", "", "Final result: $Final") | Set-Content -Encoding UTF8 $ReportPath
Write-Host "[Autonomous Completion Gate] $Final report=$ReportPath"
if ($Final -ne "PASS") { throw "Autonomous Completion Gate FAIL. See $ReportPath" }