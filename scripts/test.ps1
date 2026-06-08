$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
Write-Host "[test] running checks"

if (Test-Path "package.json") {
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw "pnpm not found"
  }
  pnpm lint
  pnpm test
  pnpm build
} else {
  Write-Host "[test] package.json not found; skipping Node checks"
}

Write-Host "[test] done"
