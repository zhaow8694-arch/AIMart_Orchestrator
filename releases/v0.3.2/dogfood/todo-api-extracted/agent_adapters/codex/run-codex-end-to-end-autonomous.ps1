$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $RootDir

$LogDir = Join-Path $RootDir "codex_runs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogPath = Join-Path $LogDir "codex-end-to-end-autonomous-$Stamp.log"
$PromptPath = Join-Path $RootDir "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md"

Write-Host "[codex-end-to-end] End-to-End Autonomous Delivery"
Write-Host "[codex-end-to-end] sandbox=workspace-write approval=auto (approve-for-me)"
Write-Host "[codex-end-to-end] log=$LogPath"
Write-Host "[codex-end-to-end] phase plan=common/PHASE_GATE_PLAN.md"
Write-Host "[codex-end-to-end] final result must be PASS or FAIL in runtime/COMPLETION_GATE_REPORT.md"

# NOTE: codex prints informational lines (e.g. "Reading prompt from stdin...")
# to stderr; under $ErrorActionPreference="Stop" PowerShell promotes those to
# terminating errors and kills the pipeline before codex runs. Relax it here.
$PrevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  Get-Content $PromptPath -Raw | codex exec --approve-for-me --skip-git-repo-check --cd $RootDir 2>&1 | Tee-Object -FilePath $LogPath
} finally {
  $ErrorActionPreference = $PrevEAP
}
$Code = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
Write-Host "[codex-end-to-end] Codex exit code: $Code"
Write-Host "[codex-end-to-end] Check runtime/RUN_STATE.json, runtime/PHASE_GATE_REPORT.md, and runtime/COMPLETION_GATE_REPORT.md"
exit $Code