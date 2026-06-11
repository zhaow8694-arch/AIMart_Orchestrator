param(
  [string]$TargetVersion = "",
  [string]$SamplePath = "",
  [string]$RunStartedAt = ""
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
if (-not $TargetVersion) {
  if (Test-Path "package.json") {
    $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
    $TargetVersion = "v$($Pkg.version)"
  } else {
    $TargetVersion = "v1.0"
  }
}
if (-not $TargetVersion.StartsWith("v")) { $TargetVersion = "v$TargetVersion" }
if (-not $SamplePath) { $SamplePath = Join-Path $RootDir "releases/$TargetVersion/samples/todo-api-generated-execution-pack.zip" }
$ErrorPath = "$SamplePath.ERROR.txt"
$EntriesPath = "$SamplePath.entries.txt"

function Fail-Normalization([string]$Category, [string]$Details) {
  "$Category`n$Details" | Set-Content -Encoding UTF8 $ErrorPath
  throw ("{0}: {1}" -f $Category, $Details)
}

if (-not (Test-Path $SamplePath)) { Fail-Normalization "SAMPLE_PACK_INVALID_ZIP" "Missing sample file: $SamplePath" }
if ($RunStartedAt) {
  $StartedAt = [DateTime]::Parse($RunStartedAt)
  $Item = Get-Item $SamplePath
  if ($Item.LastWriteTime -lt $StartedAt) {
    Fail-Normalization "SAMPLE_PACK_STALE_FILE" "Sample pack timestamp is before current run start."
  }
}

$Bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $SamplePath).Path)
$IsZip = $Bytes.Length -ge 2 -and $Bytes[0] -eq 0x50 -and $Bytes[1] -eq 0x4b
if (-not $IsZip) {
  $Text = [System.Text.Encoding]::UTF8.GetString($Bytes)
  try {
    $Json = $Text | ConvertFrom-Json
    if ($Json.zipBase64) {
      $Bytes = [Convert]::FromBase64String([string]$Json.zipBase64)
      [System.IO.File]::WriteAllBytes((Resolve-Path $SamplePath).Path, $Bytes)
      Write-Host "SAMPLE_PACK_JSON_BASE64_RESPONSE"
    } else {
      Fail-Normalization "SAMPLE_PACK_INVALID_ZIP" "JSON response did not contain zipBase64."
    }
  } catch {
    Fail-Normalization "SAMPLE_PACK_INVALID_ZIP" "Sample file is HTML/text/error JSON, not a ZIP."
  }
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$Zip = $null
try {
  $Zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $SamplePath).Path)
  $Entries = @($Zip.Entries | ForEach-Object { $_.FullName.Replace("\", "/") } | Sort-Object)
  $Entries | Set-Content -Encoding UTF8 $EntriesPath
} catch {
  Fail-Normalization "SAMPLE_PACK_INVALID_ZIP" $_.Exception.Message
} finally {
  if ($Zip) { $Zip.Dispose() }
}

Write-Host "[normalize-sample-pack] PASS $SamplePath"