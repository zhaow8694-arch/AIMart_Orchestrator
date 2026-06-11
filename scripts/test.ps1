$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
Write-Host "[test] running checks"

if (Test-Path "package.json") {
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw "pnpm not found"
  }
  pnpm lint
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm lint failed with exit code $LASTEXITCODE"
  }
  pnpm test
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm test failed with exit code $LASTEXITCODE"
  }
  pnpm build
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm build failed with exit code $LASTEXITCODE"
  }
} else {
  Write-Host "[test] package.json not found; skipping Node checks"
}

Write-Host "[test] done"
