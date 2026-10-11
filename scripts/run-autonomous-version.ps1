param(
  [string]$TargetVersion = "v0.3.2",
  [switch]$SkipValidation,
  [string]$AdapterId = "codex"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

$RunStartedAt = Get-Date
$RunId = $RunStartedAt.ToUniversalTime().ToString("yyyyMMdd_HHmmss")
$RunDeadline = $RunStartedAt.AddHours(8)
$SandboxScript = Join-Path $RootDir "scripts\invoke-sandboxed.ps1"
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
  & (Join-Path $RootDir "scripts/runner-stage-machine.ps1") -Stage $Stage -TargetVersion $TargetVersion -RunStartedAt $RunStartedAt.ToString("o") -AdapterId $AdapterId
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

function Get-SandboxTimeout {
  param([int]$RequestedSec)
  $remaining = [int][Math]::Floor(($RunDeadline - (Get-Date)).TotalSeconds)
  if ($remaining -lt 1) {
    throw "SANDBOX_TIMEOUT: run-autonomous-version.ps1 exceeded 8 hours"
  }
  if ($RequestedSec -lt $remaining) { return $RequestedSec }
  return $remaining
}

function Invoke-Sandbox {
  param(
    [string]$File = "",
    [string[]]$ArgumentList = @(),
    [int]$TimeoutSec = 1200,
    [string]$Stage = "",
    [ValidateSet("supervised", "autonomous", "end_to_end_autonomous", "stage")]
    [string]$SandboxMode = "stage",
    [switch]$StageMark
  )
  if (-not (Test-Path -LiteralPath $SandboxScript)) {
    throw "Missing scripts/invoke-sandboxed.ps1"
  }
  $timeout = Get-SandboxTimeout -RequestedSec $TimeoutSec
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $invokeArgs = @{
    Cwd = $RootDir
    TimeoutSec = $timeout
    RunId = $RunId
    AdapterId = "runner"
    Mode = $SandboxMode
    Stage = $Stage
    TargetVersion = $TargetVersion
  }
  if ($File) { $invokeArgs.File = $File }
  if ($StageMark) { $invokeArgs.StageMark = $true }
  if ($ArgumentList -and $ArgumentList.Count -gt 0) { $invokeArgs.ArgumentList = $ArgumentList }
  $captured = @(& $SandboxScript @invokeArgs 2>&1)
  $code = $LASTEXITCODE
  $ErrorActionPreference = $previous
  if ($null -eq $code) { $code = 0 }
  $text = ($captured | Out-String)
  if ($code -eq 1460 -or $text -match "SANDBOX_TIMEOUT") {
    throw ("SANDBOX_TIMEOUT: {0} {1}" -f $File, $text)
  }
  if ($code -eq 1462 -or $text -match "SANDBOX_ELEVATED_PARENT") {
    throw ("SANDBOX_ELEVATED_PARENT: {0} {1}" -f $File, $text)
  }
  if ($text -match "CODEX_SANDBOX_HELPER_MISSING" -or $text -match "spawn setup refresh") {
    throw ("CODEX_SANDBOX_HELPER_MISSING: {0} {1}" -f $File, $text)
  }
  if ($text -match "HISTORICAL_RELEASE_MODIFIED") {
    throw ("HISTORICAL_RELEASE_MODIFIED: {0} {1}" -f $File, $text)
  }
  if ($code -ne 0) {
    throw ("{0} exited {1}. {2}" -f $File, $code, $text)
  }
}

function Test-ClaudeLauncherEnabled {
  $raw = [Environment]::GetEnvironmentVariable("AIMART_ENABLE_CLAUDE_CODE_LAUNCHER")
  if (-not $raw) { return $false }
  $value = $raw.Trim().ToLower()
  if ($value -eq "" -or $value -eq "0" -or $value -eq "false" -or $value -eq "no" -or $value -eq "off") { return $false }
  return $true
}

if ($AdapterId -eq "claude-code" -and -not (Test-ClaudeLauncherEnabled)) {
  Stop-WithClassification "CLAUDE_LAUNCHER_DISABLED"
}

try {
  foreach ($Stage in $Stages) {
    Invoke-RunnerStage $Stage
    Invoke-Sandbox -StageMark -Stage $Stage -TimeoutSec 60
    if ($Stage -eq "PREFLIGHT") {
      if (-not (Test-Path "scripts/normalize-sample-pack.ps1")) { throw "Missing sample normalizer" }
      if (-not (Test-Path "scripts/classify-runner-failure.ps1")) { throw "Missing failure classifier" }
      if (-not (Test-Path "scripts/invoke-sandboxed.ps1")) { throw "Missing scripts/invoke-sandboxed.ps1" }
    }
    if ($Stage -eq "VALIDATION_TEST_LINT_BUILD" -and -not $SkipValidation) {
      Invoke-Sandbox -File "pnpm" -ArgumentList @("test") -TimeoutSec 1200 -Stage $Stage
      Invoke-Sandbox -File "pnpm" -ArgumentList @("lint") -TimeoutSec 1200 -Stage $Stage
      Invoke-Sandbox -File "pnpm" -ArgumentList @("build") -TimeoutSec 1200 -Stage $Stage
    }
    if ($Stage -eq "SOURCE_ZIP" -or $Stage -eq "SAMPLE_PACK") {
      $PackageScript = Join-Path $RootDir "scripts\package.ps1"
      if (Test-Path -LiteralPath $PackageScript) {
        Invoke-Sandbox -File $PackageScript -TimeoutSec 1200 -Stage $Stage
      }
    }
    if ($Stage -eq "SAMPLE_PACK_NORMALIZATION") {
      Invoke-Sandbox -File (Join-Path $RootDir "scripts\normalize-sample-pack.ps1") -ArgumentList @("-TargetVersion", $TargetVersion, "-RunStartedAt", $RunStartedAt.ToString("o")) -TimeoutSec 1200 -Stage $Stage
    }
    if ($Stage -eq "COMPLETION_GATE" -and -not $SkipValidation) {
      # The gate re-runs test, lint, and build, so it is longer than one validation command.
      Invoke-Sandbox -File (Join-Path $RootDir "scripts\verify-autonomous-completion.ps1") -ArgumentList @("-TargetVersion", $TargetVersion, "-SandboxRunId", $RunId) -TimeoutSec 3600 -Stage $Stage
    }
  }

  @"
# Runner Final Summary

TargetVersion: $TargetVersion
RunStartedAt: $($RunStartedAt.ToString("o"))
Final result: PASS
Stages: $($Stages -join ", ")
Sandbox account: not installed
Filesystem isolation: degraded-same-user
Network isolation: none
"@ | Set-Content -Encoding UTF8 $SummaryPath
  Write-Host "Runner final result: PASS"
} catch {
  Stop-WithClassification $_.Exception.Message
}
