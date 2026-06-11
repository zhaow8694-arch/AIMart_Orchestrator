param(
  [string]$TargetVersion = ""
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

Write-Host "[Autonomous Completion Gate] verify-release TargetVersion=$TargetVersion"

if (-not $TargetVersion) {
  $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $TargetVersion = "v$($Pkg.version)"
}
if (-not $TargetVersion.StartsWith("v")) {
  $TargetVersion = "v$TargetVersion"
}

$ReleaseDir = Join-Path $RootDir "releases/$TargetVersion"
$SourceZip = Join-Path $ReleaseDir "aimart-orchestrator-$TargetVersion-source.zip"
$SampleZip = Join-Path $ReleaseDir "samples/todo-api-generated-execution-pack.zip"
$ShaFile = Join-Path $ReleaseDir "SHA256.txt"
$Manifest = Join-Path $ReleaseDir "RELEASE_MANIFEST.txt"
$RunnerHardeningDogfood = Join-Path $ReleaseDir "dogfood/RUNNER_HARDENING_VALIDATION.md"

foreach ($Path in @($ReleaseDir, $SourceZip, $SampleZip, $ShaFile, $Manifest, $RunnerHardeningDogfood)) {
  if (-not (Test-Path $Path)) {
    throw "Missing required release artifact: $Path"
  }
}

$ShaLines = Get-Content $ShaFile
$Expected = @(
  @{ Path = $SourceZip; Name = "aimart-orchestrator-$TargetVersion-source.zip" },
  @{ Path = $SampleZip; Name = "samples/todo-api-generated-execution-pack.zip" }
)

foreach ($Item in $Expected) {
  $ActualHash = (Get-FileHash -Algorithm SHA256 $Item.Path).Hash.ToLowerInvariant()
  $Line = $ShaLines | Where-Object { $_ -match [regex]::Escape($Item.Name) } | Select-Object -First 1
  if (-not $Line) {
    throw "Missing SHA256 entry for $($Item.Name)"
  }
  if (-not $Line.ToLowerInvariant().StartsWith($ActualHash)) {
    throw "SHA256 mismatch for $($Item.Name): expected line '$Line', actual $ActualHash"
  }
}

Write-Host "[verify-release] PASS $TargetVersion"
