param(
  [switch]$Push
)
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

try {
  git rev-parse --is-inside-work-tree | Out-Null
} catch {
  Write-Host "[tag-release] not a git repo; skipping"
  exit 0
}

$Version = ""
if (Test-Path "package.json") {
  try {
    $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
    $Version = $Pkg.version
  } catch {}
}
if (-not $Version) {
  $Version = "0.1.0-$(Get-Date -Format 'yyyyMMddHHmm')"
}

$Tag = "v$Version"
$Exists = git tag --list $Tag
if ($Exists) {
  Write-Host "[tag-release] tag already exists: $Tag"
} else {
  git tag $Tag
  Write-Host "[tag-release] created local tag: $Tag"
}

if ($Push) {
  $QueueLine = "| $(Get-Date -Format s) | remote tag publish $Tag | L4 | Remote Git mutation requires explicit approval. | No | queued |"
  Add-Content -Encoding UTF8 -Path "APPROVAL_QUEUE.md" -Value $QueueLine
  Write-Host "[tag-release] remote publish queued in APPROVAL_QUEUE.md"
} else {
  Write-Host "[tag-release] remote push skipped. Use -Push only after approval."
}
