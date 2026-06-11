param(
  [string]$TargetVersion = ""
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

Write-Host "[Autonomous Completion Gate] verify-sample-pack TargetVersion=$TargetVersion"

if (-not $TargetVersion) {
  $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $TargetVersion = "v$($Pkg.version)"
}
if (-not $TargetVersion.StartsWith("v")) {
  $TargetVersion = "v$TargetVersion"
}

$SampleZip = Join-Path $RootDir "releases/$TargetVersion/samples/todo-api-generated-execution-pack.zip"
if (-not (Test-Path $SampleZip)) {
  throw "Missing sample execution-pack ZIP: $SampleZip"
}

$TempRoot = Join-Path $RootDir "codex_runs"
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
$TempDir = Join-Path $TempRoot "verify-sample-pack-$TargetVersion"
if (Test-Path $TempDir) {
  Remove-Item -LiteralPath $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

Expand-Archive -Path $SampleZip -DestinationPath $TempDir -Force

$RequiredEntries = @(
  "common/PROJECT_SPEC.md",
  "common/TASK_QUEUE.md",
  "common/EXECUTION_RULES.md",
  "runtime/SAFE_COMMANDS.md",
  "runtime/DENIED_COMMANDS.md",
  "runtime/APPROVAL_QUEUE.md",
  "runtime/AUTONOMOUS_EXECUTION_POLICY.md",
  "runtime/AUTONOMOUS_RUN_STATUS.md",
  "runtime/AUTONOMOUS_RUN_SUMMARY.md",
  "runtime/AUTONOMOUS_HEALTH_CHECK.md",
  "runtime/AUTONOMOUS_COMPLETION_GATE.md",
  "runtime/AUTONOMOUS_VERIFICATION_REPORT.md",
  "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md",
  "agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md",
  "agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md",
  "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md",
  "agent_adapters/codex/run-codex-autonomous.ps1",
  "agent_adapters/codex/run-codex-supervised.ps1",
  "agent_adapters/codex/run-codex-unified-autonomous.ps1",
  "agent_adapters/codex/run-codex-autonomous.sh",
  "agent_adapters/codex/run-codex-supervised.sh",
  "agent_adapters/codex/run-codex-unified-autonomous.sh",
  "docs/README.md",
  "docs/RUN_APP.md",
  "docs/SECURITY_AND_PERMISSIONS.md"
)

$Missing = @()
foreach ($Entry in $RequiredEntries) {
  if (-not (Test-Path (Join-Path $TempDir $Entry))) {
    $Missing += $Entry
  }
}

if ($Missing.Count -gt 0) {
  throw "Sample execution-pack ZIP is missing required files: $($Missing -join ', ')"
}

Write-Host "[verify-sample-pack] PASS $TargetVersion"
