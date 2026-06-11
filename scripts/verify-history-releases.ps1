param(
  [string]$TargetVersion = ""
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

Write-Host "[Autonomous Completion Gate] verify-history-releases TargetVersion=$TargetVersion"

$FrozenReleasePaths = @("releases/v0.1.0", "releases/v0.1.1", "releases/v0.2.1")
foreach ($Path in $FrozenReleasePaths) {
  if (-not (Test-Path $Path)) {
    throw "Missing frozen historical release folder: $Path"
  }
}

$Dirty = @()
$Dirty += git diff --name-only -- $FrozenReleasePaths
$Dirty += git diff --cached --name-only -- $FrozenReleasePaths
$Dirty = @($Dirty | Where-Object { $_ })

if ($Dirty.Count -gt 0) {
  throw "Historical releases have uncommitted or staged modifications: $($Dirty -join ', ')"
}

if ((git tag --list v0.2.1).Trim()) {
  $ChangedSinceV021 = @(git diff --name-only v0.2.1 HEAD -- $FrozenReleasePaths | Where-Object { $_ })
  if ($ChangedSinceV021.Count -gt 0) {
    throw "Historical releases changed since v0.2.1: $($ChangedSinceV021 -join ', ')"
  }
} else {
  throw "Required historical tag v0.2.1 is missing"
}

Write-Host "[verify-history-releases] PASS"
