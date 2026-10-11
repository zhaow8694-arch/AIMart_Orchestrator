param(
  [string]$TargetVersion = "v1.0",
  [ValidateSet("autonomous", "supervised")]
  [string]$Mode = "autonomous",
  [switch]$SkipAdapterRun
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

$RunStartedAt = Get-Date
# -ExecutionPolicy Bypass applies to this PowerShell process only; it does not change the machine's execution policy.
$ApprovedCommand = "powershell -ExecutionPolicy Bypass -File .\scripts\run-autonomous-version.ps1 -TargetVersion $TargetVersion"
$Stages = @("PREFLIGHT", "CODEX_EXECUTION", "VALIDATION_TEST_LINT_BUILD", "SOURCE_ZIP", "SAMPLE_PACK", "SAMPLE_PACK_NORMALIZATION", "ADAPTER_COMPLETENESS", "SHA256_MANIFEST", "DOGFOOD", "COMMIT_TAG", "COMPLETION_GATE", "FREEZE")
$SummaryPath = Join-Path $RootDir "runtime/RUNNER_FINAL_SUMMARY.md"
$FailurePath = Join-Path $RootDir "runtime/RUNNER_FAILURE_CLASSIFICATION.md"

Write-Host "Approved command: $ApprovedCommand"
Write-Host "Approved runner script path: scripts/run-autonomous-version.ps1"
Write-Host "Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners."
Write-Host "Next action file: runtime/RUNNER_NEXT_ACTION.md"

function Invoke-RunnerStage([string]$Stage) {
  & (Join-Path $RootDir "scripts/runner-stage-machine.ps1") -Stage $Stage -TargetVersion $TargetVersion -RunStartedAt $RunStartedAt.ToString("o")
}

function Write-RunnerFailure([string]$Message) {
  $Category = & (Join-Path $RootDir "scripts/classify-runner-failure.ps1") -Message $Message
  @"
# Runner Failure Classification

Category: $Category
Message: $Message
RunStartedAt: $($RunStartedAt.ToString("o"))

Next command:
``````powershell
$ApprovedCommand
``````
"@ | Set-Content -Encoding UTF8 $FailurePath
  throw ("Runner failed with {0}: {1}" -f $Category, $Message)
}

try {
  foreach ($Stage in $Stages) {
    Invoke-RunnerStage $Stage

    if ($Stage -eq "PREFLIGHT") {
      if (-not (Test-Path "runtime/RUNNER_STATE.json")) { throw "Missing runtime/RUNNER_STATE.json" }
      if (-not (Test-Path "runtime/RUNNER_NEXT_ACTION.md")) { throw "Missing runtime/RUNNER_NEXT_ACTION.md" }
      if (-not (Test-Path "scripts/classify-runner-failure.ps1")) { throw "Missing classifier script" }
      if (-not (Test-Path "scripts/normalize-sample-pack.ps1")) { throw "Missing sample normalizer script" }
    }

    if ($Stage -eq "CODEX_EXECUTION" -and -not $SkipAdapterRun) {
      $CustomerRunner = Join-Path $RootDir "scripts/run-customer-autonomous.ps1"
      if (Test-Path $CustomerRunner) {
        & $CustomerRunner -Mode $Mode -SkipAdapterRun:$SkipAdapterRun
      }
    }

    if ($Stage -eq "VALIDATION_TEST_LINT_BUILD" -and (Test-Path "package.json")) {
      pnpm test
      pnpm lint
      pnpm build
    }

    if ($Stage -eq "SAMPLE_PACK_NORMALIZATION") {
      & (Join-Path $RootDir "scripts/normalize-sample-pack.ps1") -TargetVersion $TargetVersion -RunStartedAt $RunStartedAt.ToString("o")
    }
  }

  @"
# Runner Final Summary

TargetVersion: $TargetVersion
RunStartedAt: $($RunStartedAt.ToString("o"))
Final result: PASS

Stages:
$($Stages -join ", ")
"@ | Set-Content -Encoding UTF8 $SummaryPath
  Write-Host "Runner final result: PASS"
} catch {
  Write-RunnerFailure $_.Exception.Message
}