param([string]$TargetVersion = "")
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
Write-Host "[Autonomous Completion Gate] verify-source-zip TargetVersion=$TargetVersion"
# SHA256 values are verified by verify-release.ps1 before this source ZIP content gate.
if (-not $TargetVersion) {
  $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $TargetVersion = "v$($Pkg.version)"
}
if (-not $TargetVersion.StartsWith("v")) { $TargetVersion = "v$TargetVersion" }
$SourceZip = Join-Path $RootDir "releases/$TargetVersion/aimart-orchestrator-$TargetVersion-source.zip"
if (-not (Test-Path $SourceZip)) { throw "Missing source ZIP: $SourceZip" }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$Zip = [System.IO.Compression.ZipFile]::OpenRead($SourceZip)
try {
  foreach ($Entry in $Zip.Entries) {
    $Name = $Entry.FullName.Replace("\", "/")
    foreach ($Forbidden in @("node_modules/", ".next/", ".git/", "codex_runs/", "verify-temp", "verification", "releases/", ".env", "id_rsa", ".pem", ".pfx", "secret", "credentials")) {
      if ($Name -like "*$Forbidden*") { throw "Forbidden source ZIP entry: $Name" }
    }
  }
} finally {
  $Zip.Dispose()
}
Write-Host "[verify-source-zip] PASS"