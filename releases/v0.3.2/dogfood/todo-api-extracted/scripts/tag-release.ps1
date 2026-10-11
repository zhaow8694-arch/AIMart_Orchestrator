$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

if (-not (Test-Path ".git")) {
  Write-Host "[tag-release] no git repository; skipping local tag"
  exit 0
}

$Tag = "v0.1.0-" + (Get-Date -Format "yyyyMMddHHmm")
if ((git tag --list $Tag).Trim()) {
  Write-Host "[tag-release] local tag already exists: $Tag"
} else {
  git tag $Tag
  Write-Host "[tag-release] created local tag: $Tag"
}
Write-Host "[tag-release] remote publishing is out of scope by default"