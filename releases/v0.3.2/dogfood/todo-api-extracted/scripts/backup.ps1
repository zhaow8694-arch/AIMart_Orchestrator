$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

$BackupDir = Join-Path $RootDir ".aimart/backups"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMddHHmmss"
$Archive = Join-Path $BackupDir "backup-$Stamp.zip"
$Items = @("common", "runtime", "scripts", "agent_adapters", "docs", "package.json", "pnpm-lock.yaml") | Where-Object { Test-Path $_ }

if ($Items.Count -gt 0) {
  Compress-Archive -Path $Items -DestinationPath $Archive -Force
  Write-Host "[backup] $Archive"
} else {
  Write-Host "[backup] no project-local files found to archive"
}