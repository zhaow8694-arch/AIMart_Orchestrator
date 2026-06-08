$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

Write-Host "[bootstrap] installing dependencies"
pnpm install
Write-Host "[bootstrap] done"
