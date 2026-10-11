param(
  [ValidateSet(
    "PREFLIGHT",
    "CODEX_EXECUTION",
    "VALIDATION_TEST_LINT_BUILD",
    "SOURCE_ZIP",
    "SAMPLE_PACK",
    "SAMPLE_PACK_NORMALIZATION",
    "ADAPTER_COMPLETENESS",
    "SHA256_MANIFEST",
    "DOGFOOD",
    "COMMIT_TAG",
    "COMPLETION_GATE",
    "FREEZE"
  )]
  [string]$Stage,
  [string]$TargetVersion = "v0.3.2",
  [string]$RunStartedAt = ""
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

$Stages = @(
  "PREFLIGHT",
  "CODEX_EXECUTION",
  "VALIDATION_TEST_LINT_BUILD",
  "SOURCE_ZIP",
  "SAMPLE_PACK",
  "SAMPLE_PACK_NORMALIZATION",
  "ADAPTER_COMPLETENESS",
  "SHA256_MANIFEST",
  "DOGFOOD",
  "COMMIT_TAG",
  "COMPLETION_GATE",
  "FREEZE"
)
$StatePath = Join-Path $RootDir "runtime/RUNNER_STATE.json"
$NextActionPath = Join-Path $RootDir "runtime/RUNNER_NEXT_ACTION.md"
$ApprovedCommand = "powershell -ExecutionPolicy Bypass -File .\scripts\run-autonomous-version.ps1 -TargetVersion $TargetVersion"

New-Item -ItemType Directory -Force -Path (Join-Path $RootDir "runtime") | Out-Null
$State = [ordered]@{
  runnerVersion = "v0.3.2"
  targetVersion = $TargetVersion
  currentStage = $Stage
  stages = $Stages
  runStartedAt = $RunStartedAt
  updatedAt = (Get-Date -Format s)
  approvedCommand = $ApprovedCommand
  activeAdapterId = "codex"
  oldRunnerPrevention = "Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners."
}
$State | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $StatePath

@"
# Runner Next Action

Current stage: $Stage
Target version: $TargetVersion

Approved command:
```powershell
$ApprovedCommand
```

Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners.
"@ | Set-Content -Encoding UTF8 $NextActionPath

Write-Host "[runner-stage-machine] $Stage"
