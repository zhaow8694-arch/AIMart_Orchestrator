$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

if (Test-Path ".git") {
  git status --short
} else {
  Write-Host "[git-cleanup] no git repository; skipping status"
}