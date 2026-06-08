$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = Join-Path ".aimart_backups" $Stamp
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Write-Host "[backup] creating backup at $BackupDir"

$ZipPath = Join-Path $BackupDir "project.zip"
$TempDir = Join-Path $BackupDir "temp"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

$Exclude = @("node_modules", ".next", "dist", "coverage", ".git", ".aimart_backups")
Get-ChildItem -Force | Where-Object {
  $Exclude -notcontains $_.Name -and $_.Name -notlike ".env*"
} | ForEach-Object {
  Copy-Item $_.FullName -Destination $TempDir -Recurse -Force
}

Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $ZipPath -Force
Remove-Item $TempDir -Recurse -Force
Write-Host "[backup] done: $ZipPath"
