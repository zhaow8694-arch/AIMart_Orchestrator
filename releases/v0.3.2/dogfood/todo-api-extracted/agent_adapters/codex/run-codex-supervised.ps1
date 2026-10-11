$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $RootDir

$LogDir = Join-Path $RootDir ".aimart/logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogPath = Join-Path $LogDir "codex-supervised-$Stamp.log"
$PromptPath = Join-Path $RootDir "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"

Write-Host "[codex-supervised] sandbox=workspace-write approval=prompt (default)"
Write-Host "[codex-supervised] log=$LogPath"

# Effective Codex flags: exec --sandbox workspace-write (prompt via stdin)
$CodexArgs = @(
  "exec",
  "--sandbox", "workspace-write", "--skip-git-repo-check",
  "--cd", $RootDir
)

# NOTE: codex prints informational lines (e.g. "Reading prompt from stdin...")
# to stderr; under $ErrorActionPreference="Stop" PowerShell promotes those to
# terminating errors and kills the pipeline before codex runs. Relax it here.
$PrevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  Get-Content $PromptPath -Raw | & codex @CodexArgs 2>&1 | Tee-Object -FilePath $LogPath
} finally {
  $ErrorActionPreference = $PrevEAP
}