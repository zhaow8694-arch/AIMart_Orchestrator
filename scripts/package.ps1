$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
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
& node ".\scripts\create-sample-pack.mjs" $SampleOut
if ($LASTEXITCODE -ne 0) {
  throw "sample execution-pack ZIP generation failed"
}

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

- common/PROJECT_SPEC.md
- common/TASK_QUEUE.md
- common/EXECUTION_RULES.md
- runtime/SAFE_COMMANDS.md
- runtime/DENIED_COMMANDS.md
- runtime/APPROVAL_QUEUE.md
- runtime/AUTONOMOUS_EXECUTION_POLICY.md
- runtime/AUTONOMOUS_RUN_STATUS.md
- runtime/AUTONOMOUS_RUN_SUMMARY.md
- runtime/AUTONOMOUS_HEALTH_CHECK.md
- runtime/AUTONOMOUS_COMPLETION_GATE.md
- runtime/AUTONOMOUS_VERIFICATION_REPORT.md
- agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md
- agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md
- agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md
- agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md
- agent_adapters/codex/run-codex-autonomous.ps1
- agent_adapters/codex/run-codex-supervised.ps1
- agent_adapters/codex/run-codex-unified-autonomous.ps1
- agent_adapters/codex/run-codex-autonomous.sh
- agent_adapters/codex/run-codex-supervised.sh
- agent_adapters/codex/run-codex-unified-autonomous.sh
- docs/README.md
- docs/RUN_APP.md
- docs/SECURITY_AND_PERMISSIONS.md
"@ | Set-Content -Encoding UTF8 (Join-Path $OutDir "RELEASE_MANIFEST.txt")

Write-Host "[package] done: $Out"
Write-Host "[package] sample: $SampleOut"
Write-Host "[package] checksums: $(Join-Path $OutDir "SHA256.txt")"
