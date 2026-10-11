param([string]$TargetVersion = "")
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
Write-Host "[Autonomous Completion Gate] verify-sample-pack TargetVersion=$TargetVersion"
if (-not $TargetVersion) {
  $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $TargetVersion = "v$($Pkg.version)"
}
if (-not $TargetVersion.StartsWith("v")) { $TargetVersion = "v$TargetVersion" }
$SampleZip = Join-Path $RootDir "releases/$TargetVersion/samples/todo-api-generated-execution-pack.zip"
if (-not (Test-Path $SampleZip)) { throw "Missing sample execution-pack ZIP: $SampleZip" }
& (Join-Path $PSScriptRoot "normalize-sample-pack.ps1") -TargetVersion $TargetVersion -SamplePath $SampleZip
$TempDir = Join-Path $RootDir "codex_runs/verify-sample-pack-$TargetVersion"
if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
Expand-Archive -Path $SampleZip -DestinationPath $TempDir -Force
$Required = @(
  "START_HERE.md",
  "START_CODEX_AUTONOMOUS.cmd",
  "START_CODEX_AUTONOMOUS.ps1",
  "START_CODEX_SUPERVISED.cmd",
  "START_CODEX_SUPERVISED.ps1",
  "EXECUTION_PACK_MANIFEST.md",
  "common/PROJECT_SPEC.md", "common/TASK_QUEUE.md", "common/EXECUTION_RULES.md",
  "common/AUTONOMOUS_DELIVERY_ROADMAP.md", "common/VERSION_LADDER.md",
  "common/PHASE_GATE_PLAN.md", "common/CURRENT_PHASE.md",
  "runtime/SAFE_COMMANDS.md", "runtime/DENIED_COMMANDS.md", "runtime/APPROVAL_QUEUE.md",
  "runtime/AUTONOMOUS_EXECUTION_POLICY.md", "runtime/AUTONOMOUS_RUN_STATUS.md",
  "runtime/AUTONOMOUS_RUN_SUMMARY.md", "runtime/AUTONOMOUS_HEALTH_CHECK.md",
  "runtime/AUTONOMOUS_COMPLETION_GATE.md", "runtime/AUTONOMOUS_VERIFICATION_REPORT.md",
  "runtime/END_TO_END_AUTONOMOUS_POLICY.md", "runtime/RUN_STATE.json",
  "runtime/RUNNER_STATE.json",
  "runtime/RUNNER_FAILURE_CLASSIFICATION.md",
  "runtime/RUNNER_RECOVERY_POLICY.md",
  "runtime/RUNNER_NEXT_ACTION.md",
  "runtime/RUNNER_FINAL_SUMMARY.md",
  "runtime/FULL_LIFECYCLE_RUN_STATE.json",
  "runtime/VERSION_LADDER.json",
  "runtime/PHASE_STATUS.json",
  "runtime/CURRENT_TASK.md", "runtime/PHASE_GATE_REPORT.md",
  "runtime/CURRENT_PHASE.md", "runtime/NEXT_ACTION.md",
  "runtime/COMPLETION_GATE_REPORT.md",
  "runtime/FINAL_DELIVERY_STATUS.md",
  "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md",
  "runtime/MORNING_REPORT.md",
  "runtime/HANDOFF_TO_NEXT_VERSION.md",
  "scripts/run-customer-autonomous.ps1",
  "scripts/run-customer-autonomous.sh",
  "scripts/verify-customer-delivery.ps1",
  "scripts/verify-customer-delivery.sh",
  "scripts/run-autonomous-version.ps1",
  "scripts/run-autonomous-version.sh",
  "scripts/runner-stage-machine.ps1",
  "scripts/runner-stage-machine.sh",
  "scripts/normalize-sample-pack.ps1",
  "scripts/normalize-sample-pack.sh",
  "scripts/classify-runner-failure.ps1",
  "scripts/classify-runner-failure.sh",
  "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md",
  "agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md",
  "agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md",
  "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md",
  "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md",
  "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/codex/run-codex-autonomous.ps1",
  "agent_adapters/codex/run-codex-supervised.ps1",
  "agent_adapters/codex/run-codex-unified-autonomous.ps1",
  "agent_adapters/codex/run-codex-end-to-end-autonomous.ps1",
  "agent_adapters/codex/run-codex-autonomous.sh",
  "agent_adapters/codex/run-codex-supervised.sh",
  "agent_adapters/codex/run-codex-unified-autonomous.sh",
  "agent_adapters/codex/run-codex-end-to-end-autonomous.sh",
  "agent_adapters/claude-code/CLAUDE.md",
  "agent_adapters/claude-code/CLAUDE_RUNBOOK.md",
  "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md",
  "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md",
  "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/claude-code/settings.example.json",
  "agent_adapters/claude-code/run-claude-supervised.md",
  "agent_adapters/claude-code/run-claude-autonomous.md",
  "agent_adapters/trae/TRAE_RUNBOOK.md",
  "agent_adapters/trae/TRAE_TASK_PROMPT.md",
  "agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md",
  "agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/trae/TRAE_AGENT_CONFIG.yaml",
  "agent_adapters/trae/run-trae-supervised.md",
  "agent_adapters/trae/run-trae-autonomous.md",
  "agent_adapters/cursor/CURSOR_RUNBOOK.md",
  "agent_adapters/cursor/CURSOR_TASK_PROMPT.md",
  "agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md",
  "agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/cursor/rules/project-rules.md",
  "docs/README.md", "docs/RUN_APP.md", "docs/SECURITY_AND_PERMISSIONS.md"
)
foreach ($Entry in $Required) {
  if (-not (Test-Path (Join-Path $TempDir $Entry))) { throw "Missing sample pack file: $Entry" }
}
$RunStatePath = Join-Path $TempDir "runtime/RUN_STATE.json"
try {
  Get-Content $RunStatePath -Raw | ConvertFrom-Json | Out-Null
} catch {
  throw "runtime/RUN_STATE.json is not valid JSON"
}
foreach ($JsonEntry in @("runtime/RUNNER_STATE.json", "runtime/FULL_LIFECYCLE_RUN_STATE.json", "runtime/VERSION_LADDER.json", "runtime/PHASE_STATUS.json")) {
  try {
    Get-Content (Join-Path $TempDir $JsonEntry) -Raw | ConvertFrom-Json | Out-Null
  } catch {
    throw "$JsonEntry is not valid JSON"
  }
}
Write-Host "[verify-sample-pack] PASS"