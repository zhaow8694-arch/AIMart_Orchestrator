param(
  [string]$TargetVersion = "v0.3.2",
  [switch]$SkipValidation
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

$RunStartedAt = Get-Date
$ApprovedCommand = "powershell -ExecutionPolicy Bypass -File .\scripts\run-autonomous-version.ps1 -TargetVersion $TargetVersion"
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
$FailurePath = Join-Path $RootDir "runtime/RUNNER_FAILURE_CLASSIFICATION.md"
$SummaryPath = Join-Path $RootDir "runtime/RUNNER_FINAL_SUMMARY.md"

Write-Host "Approved command: $ApprovedCommand"
Write-Host "Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners."

function Invoke-RunnerStage {
  param([string]$Stage)
  & (Join-Path $RootDir "scripts/runner-stage-machine.ps1") -Stage $Stage -TargetVersion $TargetVersion -RunStartedAt $RunStartedAt.ToString("o")
}

function Stop-WithClassification {
  param([string]$Message)
  $Category = & (Join-Path $RootDir "scripts/classify-runner-failure.ps1") -Message $Message
  @"
# Runner Failure Classification

Category: $Category
Message: $Message
RunStartedAt: $($RunStartedAt.ToString("o"))

Next single command:
```powershell
$ApprovedCommand
```
"@ | Set-Content -Encoding UTF8 $FailurePath
  throw ("Runner failed with {0}: {1}" -f $Category, $Message)
}

try {
  foreach ($Stage in $Stages) {
    Invoke-RunnerStage $Stage
    if ($Stage -eq "PREFLIGHT") {
      if (-not (Test-Path "scripts/normalize-sample-pack.ps1")) { throw "Missing sample normalizer" }
      if (-not (Test-Path "scripts/classify-runner-failure.ps1")) { throw "Missing failure classifier" }
    }
    if ($Stage -eq "VALIDATION_TEST_LINT_BUILD" -and -not $SkipValidation) {
      pnpm test
      pnpm lint
      pnpm build
    }
    if ($Stage -eq "SOURCE_ZIP" -or $Stage -eq "SAMPLE_PACK") {
      if (Test-Path ".\scripts\package.ps1") {
        & ".\scripts\package.ps1"
      }
    }
    if ($Stage -eq "SAMPLE_PACK_NORMALIZATION") {
      & ".\scripts\normalize-sample-pack.ps1" -TargetVersion $TargetVersion -RunStartedAt $RunStartedAt.ToString("o")
    }
    if ($Stage -eq "COMPLETION_GATE" -and -not $SkipValidation) {
      & ".\scripts\verify-autonomous-completion.ps1" -TargetVersion $TargetVersion
    }
  }

  @"
# Runner Final Summary

TargetVersion: $TargetVersion
RunStartedAt: $($RunStartedAt.ToString("o"))
Final result: PASS
Stages: $($Stages -join ", ")
"@ | Set-Content -Encoding UTF8 $SummaryPath
  Write-Host "Runner final result: PASS"
} catch {
  Stop-WithClassification $_.Exception.Message
}
