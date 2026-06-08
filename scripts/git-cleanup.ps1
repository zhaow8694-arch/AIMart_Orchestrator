param(
  [switch]$DeleteMerged
)
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
Write-Host "[git-cleanup] checking git repository"

try {
  git rev-parse --is-inside-work-tree | Out-Null
} catch {
  Write-Host "[git-cleanup] not a git repo; skipping"
  exit 0
}

git status --short

if ($DeleteMerged) {
  $QueueLine = "| $(Get-Date -Format s) | delete merged local branches | L2 | Branch deletion requested during cleanup. | No | queued |"
  Add-Content -Encoding UTF8 -Path "APPROVAL_QUEUE.md" -Value $QueueLine
  Write-Host "[git-cleanup] branch deletion queued in APPROVAL_QUEUE.md"
} else {
  Write-Host "[git-cleanup] merged branch deletion skipped. Use -DeleteMerged only after approval."
}

Write-Host "[git-cleanup] done"
