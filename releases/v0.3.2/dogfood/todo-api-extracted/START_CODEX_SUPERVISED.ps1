$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot
Set-Location $RootDir

# Legacy customer runner path retained for v0.3.1 compatibility: scripts/run-customer-autonomous.ps1
& (Join-Path $RootDir "scripts/run-autonomous-version.ps1") -Mode supervised -TargetVersion v1.0