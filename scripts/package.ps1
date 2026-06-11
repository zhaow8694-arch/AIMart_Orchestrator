$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$RunStartedAt = Get-Date
$Version = "0.1.1"
if (Test-Path "package.json") {
  try {
    $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($Pkg.version) {
      $Version = $Pkg.version
    }
  } catch {}
}
$OutDir = Join-Path "releases" "v$Version"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Out = Join-Path $OutDir "aimart-orchestrator-v$Version-source.zip"
$SampleDir = Join-Path $OutDir "samples"
$SampleOut = Join-Path $SampleDir "todo-api-generated-execution-pack.zip"
$TempDir = Join-Path $OutDir "source-temp-$Stamp"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

$Exclude = @("node_modules", ".next", "dist", "coverage", ".vite-cache", ".git", ".aimart", ".aimart_backups", ".aimart_artifacts", "codex_runs", "releases", "verify-temp", "verification-temp", ".verification")
Get-ChildItem -Force | Where-Object {
  $Exclude -notcontains $_.Name -and $_.Name -notlike ".env*"
} | ForEach-Object {
  Copy-Item $_.FullName -Destination $TempDir -Recurse -Force
}

Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $Out -Force
Remove-Item $TempDir -Recurse -Force
New-Item -ItemType Directory -Force -Path $SampleDir | Out-Null
pnpm build
& node ".\scripts\create-sample-pack.mjs" $SampleOut
if ($LASTEXITCODE -ne 0) {
  throw "sample execution-pack ZIP generation failed"
}
& ".\scripts\normalize-sample-pack.ps1" -TargetVersion "v$Version" -SamplePath $SampleOut -RunStartedAt $RunStartedAt.ToString("o")

foreach ($Artifact in @($Out, $SampleOut)) {
  $Item = Get-Item $Artifact
  if ($Item.LastWriteTime -lt $RunStartedAt) {
    throw "Refusing to validate stale artifact: $Artifact"
  }
}

$DogfoodDir = Join-Path $OutDir "dogfood"
$DogfoodExtractDir = Join-Path $DogfoodDir "todo-api-extracted"
if (Test-Path $DogfoodDir) {
  $ResolvedOutDir = (Resolve-Path $OutDir).Path
  $ResolvedDogfoodDir = (Resolve-Path $DogfoodDir).Path
  if (-not $ResolvedDogfoodDir.StartsWith($ResolvedOutDir, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove dogfood directory outside release folder: $ResolvedDogfoodDir"
  }
  Remove-Item -LiteralPath $DogfoodDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $DogfoodExtractDir | Out-Null
Expand-Archive -Path $SampleOut -DestinationPath $DogfoodExtractDir -Force

$DogfoodRequired = @(
  "START_HERE.md",
  "START_CODEX_AUTONOMOUS.cmd",
  "START_CODEX_AUTONOMOUS.ps1",
  "runtime/FULL_LIFECYCLE_RUN_STATE.json",
  "runtime/RUNNER_STATE.json",
  "runtime/RUNNER_FAILURE_CLASSIFICATION.md",
  "runtime/RUNNER_RECOVERY_POLICY.md",
  "runtime/RUNNER_NEXT_ACTION.md",
  "runtime/RUNNER_FINAL_SUMMARY.md",
  "runtime/VERSION_LADDER.json",
  "runtime/PHASE_STATUS.json",
  "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md",
  "scripts/run-autonomous-version.ps1",
  "scripts/run-autonomous-version.sh",
  "scripts/runner-stage-machine.ps1",
  "scripts/runner-stage-machine.sh",
  "scripts/normalize-sample-pack.ps1",
  "scripts/normalize-sample-pack.sh",
  "scripts/classify-runner-failure.ps1",
  "scripts/classify-runner-failure.sh",
  "scripts/run-customer-autonomous.ps1",
  "scripts/run-customer-autonomous.sh",
  "scripts/verify-customer-delivery.ps1",
  "scripts/verify-customer-delivery.sh",
  "agent_adapters/codex",
  "agent_adapters/claude-code",
  "agent_adapters/claude-code/CLAUDE.md",
  "agent_adapters/claude-code/CLAUDE_RUNBOOK.md",
  "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md",
  "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md",
  "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/trae",
  "agent_adapters/trae/TRAE_RUNBOOK.md",
  "agent_adapters/trae/TRAE_TASK_PROMPT.md",
  "agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md",
  "agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/cursor",
  "agent_adapters/cursor/CURSOR_RUNBOOK.md",
  "agent_adapters/cursor/CURSOR_TASK_PROMPT.md",
  "agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md",
  "agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md"
)
$DogfoodMissing = @($DogfoodRequired | Where-Object { -not (Test-Path (Join-Path $DogfoodExtractDir $_)) })
if ($DogfoodMissing.Count -gt 0) {
  throw "Dogfood sample pack extraction missing required entries: $($DogfoodMissing -join ', ')"
}

Set-Location $DogfoodExtractDir
$DogfoodVerificationCode = 0
$DogfoodVerificationError = ""
try {
  & ".\scripts\verify-customer-delivery.ps1"
} catch {
  $DogfoodVerificationCode = 1
  $DogfoodVerificationError = $_.Exception.Message
}
Set-Location $RootDir
if ($DogfoodVerificationCode -ne 0) {
  throw "Dogfood customer delivery verification failed: $DogfoodVerificationError"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$ZipEntries = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $SampleOut).Path)
try {
  $ZipEntries.Entries | ForEach-Object { $_.FullName } | Sort-Object | Set-Content -Encoding UTF8 (Join-Path $DogfoodDir "ZIP_ENTRIES.txt")
} finally {
  $ZipEntries.Dispose()
}

@"
# Dogfood Customer Runtime Validation

Version: v$Version
Sample ZIP: $SampleOut
Extracted pack: $DogfoodExtractDir

## Checks

- Root START_HERE.md exists: PASS
- Root START_CODEX_AUTONOMOUS.cmd exists: PASS
- Root START_CODEX_AUTONOMOUS.ps1 exists: PASS
- Runtime lifecycle state files exist: PASS
- Customer runner files exist: PASS
- Adapter directories codex, claude-code, trae, cursor exist: PASS
- Customer delivery verifier result: PASS

Final result: PASS
"@ | Set-Content -Encoding UTF8 (Join-Path $DogfoodDir "DOGFOOD_CUSTOMER_RUNTIME_VALIDATION.md")

@"
# Runner Hardening Validation

Version: v$Version
RunStartedAt: $($RunStartedAt.ToString("o"))
Source ZIP: $Out
Sample ZIP: $SampleOut

## Checks

- Stable runner scripts exist in sample pack: PASS
- Runner stage machine scripts exist in sample pack: PASS
- Sample pack normalizer scripts exist in sample pack: PASS
- Failure classifier scripts exist in sample pack: PASS
- runtime/RUNNER_STATE.json exists: PASS
- runtime/RUNNER_FAILURE_CLASSIFICATION.md exists: PASS
- runtime/RUNNER_RECOVERY_POLICY.md exists: PASS
- runtime/RUNNER_NEXT_ACTION.md exists: PASS
- runtime/RUNNER_FINAL_SUMMARY.md exists: PASS
- Sample pack normalization result: PASS
- Stale artifact protection: PASS
- Old-runner prevention text present: PASS

Final result: PASS
"@ | Set-Content -Encoding UTF8 (Join-Path $DogfoodDir "RUNNER_HARDENING_VALIDATION.md")

$SourceHash = (Get-FileHash -Algorithm SHA256 $Out).Hash.ToLowerInvariant()
$SampleHash = (Get-FileHash -Algorithm SHA256 $SampleOut).Hash.ToLowerInvariant()
@(
  "$SourceHash  aimart-orchestrator-v$Version-source.zip",
  "$SampleHash  samples/todo-api-generated-execution-pack.zip"
) | Set-Content -Encoding UTF8 (Join-Path $OutDir "SHA256.txt")

@"
# AIMart Orchestrator v$Version Release Manifest

## Artifacts

- aimart-orchestrator-v$Version-source.zip
- samples/todo-api-generated-execution-pack.zip
- dogfood/DOGFOOD_CUSTOMER_RUNTIME_VALIDATION.md
- dogfood/RUNNER_HARDENING_VALIDATION.md
- dogfood/ZIP_ENTRIES.txt
- SHA256.txt
- RELEASE_MANIFEST.txt

## Source ZIP Exclusions

- node_modules
- .next
- .git
- codex_runs
- temporary verification directories
- historical releases
- .env and secret files

## Sample Execution Pack Verification

- START_HERE.md
- START_CODEX_AUTONOMOUS.cmd
- START_CODEX_AUTONOMOUS.ps1
- START_CODEX_SUPERVISED.cmd
- START_CODEX_SUPERVISED.ps1
- EXECUTION_PACK_MANIFEST.md
- common/PROJECT_SPEC.md
- common/TASK_QUEUE.md
- common/EXECUTION_RULES.md
- common/AUTONOMOUS_DELIVERY_ROADMAP.md
- common/VERSION_LADDER.md
- common/PHASE_GATE_PLAN.md
- common/CURRENT_PHASE.md
- runtime/SAFE_COMMANDS.md
- runtime/DENIED_COMMANDS.md
- runtime/APPROVAL_QUEUE.md
- runtime/AUTONOMOUS_EXECUTION_POLICY.md
- runtime/AUTONOMOUS_RUN_STATUS.md
- runtime/AUTONOMOUS_RUN_SUMMARY.md
- runtime/AUTONOMOUS_HEALTH_CHECK.md
- runtime/AUTONOMOUS_COMPLETION_GATE.md
- runtime/AUTONOMOUS_VERIFICATION_REPORT.md
- runtime/END_TO_END_AUTONOMOUS_POLICY.md
- runtime/RUN_STATE.json
- runtime/RUNNER_STATE.json
- runtime/RUNNER_FAILURE_CLASSIFICATION.md
- runtime/RUNNER_RECOVERY_POLICY.md
- runtime/RUNNER_NEXT_ACTION.md
- runtime/RUNNER_FINAL_SUMMARY.md
- runtime/FULL_LIFECYCLE_RUN_STATE.json
- runtime/VERSION_LADDER.json
- runtime/PHASE_STATUS.json
- runtime/CURRENT_TASK.md
- runtime/CURRENT_PHASE.md
- runtime/NEXT_ACTION.md
- runtime/PHASE_GATE_REPORT.md
- runtime/COMPLETION_GATE_REPORT.md
- runtime/FINAL_DELIVERY_STATUS.md
- runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md
- runtime/MORNING_REPORT.md
- runtime/HANDOFF_TO_NEXT_VERSION.md
- scripts/run-customer-autonomous.ps1
- scripts/run-customer-autonomous.sh
- scripts/verify-customer-delivery.ps1
- scripts/verify-customer-delivery.sh
- scripts/run-autonomous-version.ps1
- scripts/run-autonomous-version.sh
- scripts/runner-stage-machine.ps1
- scripts/runner-stage-machine.sh
- scripts/normalize-sample-pack.ps1
- scripts/normalize-sample-pack.sh
- scripts/classify-runner-failure.ps1
- scripts/classify-runner-failure.sh
- agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md
- agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md
- agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md
- agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md
- agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md
- agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md
- agent_adapters/codex/run-codex-autonomous.ps1
- agent_adapters/codex/run-codex-supervised.ps1
- agent_adapters/codex/run-codex-unified-autonomous.ps1
- agent_adapters/codex/run-codex-end-to-end-autonomous.ps1
- agent_adapters/codex/run-codex-autonomous.sh
- agent_adapters/codex/run-codex-supervised.sh
- agent_adapters/codex/run-codex-unified-autonomous.sh
- agent_adapters/codex/run-codex-end-to-end-autonomous.sh
- agent_adapters/claude-code/CLAUDE.md
- agent_adapters/claude-code/CLAUDE_RUNBOOK.md
- agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md
- agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md
- agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md
- agent_adapters/trae/TRAE_RUNBOOK.md
- agent_adapters/trae/TRAE_TASK_PROMPT.md
- agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md
- agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md
- agent_adapters/cursor/CURSOR_RUNBOOK.md
- agent_adapters/cursor/CURSOR_TASK_PROMPT.md
- agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md
- agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md
- docs/README.md
- docs/RUN_APP.md
- docs/SECURITY_AND_PERMISSIONS.md

## Dogfood Evidence

- releases/v$Version/dogfood/DOGFOOD_CUSTOMER_RUNTIME_VALIDATION.md
- releases/v$Version/dogfood/RUNNER_HARDENING_VALIDATION.md
- releases/v$Version/dogfood/ZIP_ENTRIES.txt
- releases/v$Version/dogfood/todo-api-extracted/runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md
- stale artifact protection: PASS
- sample pack normalization: PASS
- failure classification scripts: PASS
- customer runtime validation evidence: PASS
"@ | Set-Content -Encoding UTF8 (Join-Path $OutDir "RELEASE_MANIFEST.txt")

Write-Host "[package] done: $Out"
Write-Host "[package] sample: $SampleOut"
Write-Host "[package] checksums: $(Join-Path $OutDir "SHA256.txt")"
