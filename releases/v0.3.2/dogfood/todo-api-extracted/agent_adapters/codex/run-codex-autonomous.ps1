$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $RootDir

$LogDir = Join-Path $RootDir ".aimart/logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogPath = Join-Path $LogDir "codex-autonomous-$Stamp.log"
$PromptPath = Join-Path $RootDir "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"

Write-Host "[codex-autonomous] sandbox=workspace-write approval=never"
Write-Host "[codex-autonomous] log=$LogPath"

# Effective Codex flags: --sandbox workspace-write --approval never
$Args = @(
  "exec",
  "--sandbox", "workspace-write",
  "--approval", "never",
  "--cd", $RootDir,
  "--prompt-file", $PromptPath
)

& codex @Args 2>&1 | Tee-Object -FilePath $LogPath