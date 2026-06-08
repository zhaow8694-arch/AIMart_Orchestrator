$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$OutDir = ".aimart_artifacts"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Out = Join-Path $OutDir "aimart-orchestrator-v0.1-$Stamp.zip"
$TempDir = Join-Path $OutDir "package-temp-$Stamp"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

$Exclude = @("node_modules", ".next", "dist", "coverage", ".git", ".aimart", ".aimart_backups", ".aimart_artifacts")
Get-ChildItem -Force | Where-Object {
  $Exclude -notcontains $_.Name -and $_.Name -notlike ".env*"
} | ForEach-Object {
  Copy-Item $_.FullName -Destination $TempDir -Recurse -Force
}

Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $Out -Force
Remove-Item $TempDir -Recurse -Force
Write-Host "[package] done: $Out"
