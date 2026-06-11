$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

$ArtifactDir = Join-Path $RootDir "artifacts"
New-Item -ItemType Directory -Force -Path $ArtifactDir | Out-Null
$Archive = Join-Path $ArtifactDir "aimart-execution-pack.zip"
$Items = @("common", "runtime", "scripts", "agent_adapters", "docs") | Where-Object { Test-Path $_ }

if ($Items.Count -gt 0) {
  Compress-Archive -Path $Items -DestinationPath $Archive -Force
  Write-Host "[package] $Archive"
} else {
  Write-Host "[package] no generated pack directories found"
}