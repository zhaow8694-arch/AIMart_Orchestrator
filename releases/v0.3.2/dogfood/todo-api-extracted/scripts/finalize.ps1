$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

& .\scripts\preflight.ps1
& .\scripts\backup.ps1
& .\scripts\test.ps1
& .\scripts\git-cleanup.ps1
& .\scripts\tag-release.ps1
& .\scripts\package.ps1
& .\scripts\verify-autonomous-completion.ps1

Write-Host "[finalize] complete"