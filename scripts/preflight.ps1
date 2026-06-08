$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
Write-Host "[preflight] root: $RootDir"

function Test-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "[preflight] missing command: $Name"
  }
  Write-Host "[preflight] found command: $Name"
}

Test-Command git
Test-Command node
Test-Command pnpm

if (Test-Path "package.json") {
  Write-Host "[preflight] package.json found"
} else {
  throw "[preflight] package.json not found"
}

Write-Host "[preflight] done"
