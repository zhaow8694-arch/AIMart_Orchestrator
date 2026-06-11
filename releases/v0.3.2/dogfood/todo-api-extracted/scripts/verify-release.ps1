param([string]$TargetVersion = "")
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
Write-Host "[Autonomous Completion Gate] verify-release TargetVersion=$TargetVersion"
if (-not $TargetVersion) {
  $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $TargetVersion = "v$($Pkg.version)"
}
if (-not $TargetVersion.StartsWith("v")) { $TargetVersion = "v$TargetVersion" }
$Version = $TargetVersion.TrimStart("v")
$ReleaseDir = Join-Path $RootDir "releases/$TargetVersion"
$SourceZip = Join-Path $ReleaseDir "aimart-orchestrator-$TargetVersion-source.zip"
$SampleZip = Join-Path $ReleaseDir "samples/todo-api-generated-execution-pack.zip"
$ShaFile = Join-Path $ReleaseDir "SHA256.txt"
$Manifest = Join-Path $ReleaseDir "RELEASE_MANIFEST.txt"
foreach ($Path in @($ReleaseDir, $SourceZip, $SampleZip, $ShaFile, $Manifest)) {
  if (-not (Test-Path $Path)) { throw "Missing required release artifact: $Path" }
}
$ShaContent = Get-Content $ShaFile
foreach ($Item in @(@($SourceZip, "aimart-orchestrator-$TargetVersion-source.zip"), @($SampleZip, "samples/todo-api-generated-execution-pack.zip"))) {
  $Actual = (Get-FileHash -Algorithm SHA256 $Item[0]).Hash.ToLowerInvariant()
  $ExpectedLine = $ShaContent | Where-Object { $_ -match [regex]::Escape($Item[1]) } | Select-Object -First 1
  if (-not $ExpectedLine) { throw "Missing SHA256 entry for $($Item[1])" }
  if (-not $ExpectedLine.ToLowerInvariant().StartsWith($Actual)) { throw "SHA256 mismatch for $($Item[1])" }
}
Write-Host "[verify-release] PASS $TargetVersion"