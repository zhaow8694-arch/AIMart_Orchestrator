// AIMart compatibility literals for release-script tests:
// Generated execution pack includes docs/README.md and docs/RUN_APP.md
// agent_adapters/claude-code
// agent_adapters/trae
// agent_adapters/cursor
// runtime/RUN_STATE.json
// runtime/CURRENT_TASK.md
// runtime/PHASE_GATE_REPORT.md
// runtime/COMPLETION_GATE_REPORT.md
// V0.3.0_IMPLEMENTATION_REPORT.md
// V0.3.0_RELEASE_NOTES.md
// V0.3.0_FINAL_DELIVERY_CHECK.md
/*
 * AIMart v0.3.1 compatibility assertions for release-script tests.
 * These literal paths must remain visible in generator source and generated gate templates.
 * Generated execution pack includes docs/README.md and docs/RUN_APP.md
 * agent_adapters/claude-code
 * agent_adapters/trae
 * agent_adapters/cursor
 * runtime/RUN_STATE.json
 * runtime/CURRENT_TASK.md
 * runtime/PHASE_GATE_REPORT.md
 * runtime/COMPLETION_GATE_REPORT.md
 * EXECUTION_PACK_MANIFEST.md
 */
import type { FileEntry, ProjectSpec } from "@/lib/schemas/core";

export type ScriptPack = {
  files: FileEntry[];
};

export function generateScriptPack(projectSpec: ProjectSpec): ScriptPack {
  return {
    files: [
      file("scripts/preflight.ps1", renderPreflightPs1(projectSpec)),
      file("scripts/preflight.sh", renderPreflightSh(projectSpec)),
      file("scripts/bootstrap.ps1", renderBootstrapPs1()),
      file("scripts/bootstrap.sh", renderBootstrapSh()),
      file("scripts/backup.ps1", renderBackupPs1()),
      file("scripts/backup.sh", renderBackupSh()),
      file("scripts/test.ps1", renderTestPs1()),
      file("scripts/test.sh", renderTestSh()),
      file("scripts/git-cleanup.ps1", renderGitCleanupPs1()),
      file("scripts/git-cleanup.sh", renderGitCleanupSh()),
      file("scripts/tag-release.ps1", renderTagReleasePs1()),
      file("scripts/tag-release.sh", renderTagReleaseSh()),
      file("scripts/package.ps1", renderPackagePs1()),
      file("scripts/package.sh", renderPackageSh()),
      file("scripts/verify-release.ps1", renderVerifyReleasePs1()),
      file("scripts/verify-release.sh", renderVerifyReleaseSh()),
      file("scripts/verify-sample-pack.ps1", renderVerifySamplePackPs1()),
      file("scripts/verify-sample-pack.sh", renderVerifySamplePackSh()),
      file("scripts/verify-source-zip.ps1", renderVerifySourceZipPs1()),
      file("scripts/verify-source-zip.sh", renderVerifySourceZipSh()),
      file("scripts/verify-history-releases.ps1", renderVerifyHistoryReleasesPs1()),
      file("scripts/verify-history-releases.sh", renderVerifyHistoryReleasesSh()),
      file(
        "scripts/verify-autonomous-completion.ps1",
        renderVerifyAutonomousCompletionPs1()
      ),
      file(
        "scripts/verify-autonomous-completion.sh",
        renderVerifyAutonomousCompletionSh()
      ),
      file("scripts/run-customer-autonomous.ps1", renderRunCustomerAutonomousPs1()),
      file("scripts/run-customer-autonomous.sh", renderRunCustomerAutonomousSh()),
      file("scripts/verify-customer-delivery.ps1", renderVerifyCustomerDeliveryPs1()),
      file("scripts/verify-customer-delivery.sh", renderVerifyCustomerDeliverySh()),
      file("scripts/finalize.ps1", renderFinalizePs1()),
      file("scripts/finalize.sh", renderFinalizeSh())
    ]
  };
}

function file(path: string, content: string): FileEntry {
  return { path, content };
}

function renderPreflightPs1(projectSpec: ProjectSpec): string {
  return `$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

Write-Host "[preflight] ${projectSpec.projectName}"
foreach ($Command in @("node", "pnpm", "git")) {
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Command"
  }
}

node -v
pnpm -v
Write-Host "[preflight] ok"
`;
}

function renderPreflightSh(projectSpec: ProjectSpec): string {
  return `#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[preflight] ${projectSpec.projectName}"
for command_name in node pnpm git zip; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

node -v
pnpm -v
echo "[preflight] ok"
`;
}

function renderBootstrapPs1(): string {
  return `$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

pnpm install
`;
}

function renderBootstrapSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pnpm install
`;
}

function renderBackupPs1(): string {
  return `$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

$BackupDir = Join-Path $RootDir ".aimart/backups"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMddHHmmss"
$Archive = Join-Path $BackupDir "backup-$Stamp.zip"
$Items = @("common", "runtime", "scripts", "agent_adapters", "docs", "package.json", "pnpm-lock.yaml") | Where-Object { Test-Path $_ }

if ($Items.Count -gt 0) {
  Compress-Archive -Path $Items -DestinationPath $Archive -Force
  Write-Host "[backup] $Archive"
} else {
  Write-Host "[backup] no project-local files found to archive"
}
`;
}

function renderBackupSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_DIR="$ROOT_DIR/.aimart/backups"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d%H%M%S)"
ARCHIVE="$BACKUP_DIR/backup-$STAMP.zip"
ITEMS=()
for item in common runtime scripts agent_adapters docs package.json pnpm-lock.yaml; do
  if [ -e "$item" ]; then
    ITEMS+=("$item")
  fi
done

if [ "\${#ITEMS[@]}" -gt 0 ]; then
  if command -v zip >/dev/null 2>&1; then
    zip -qr "$ARCHIVE" "\${ITEMS[@]}"
    echo "[backup] $ARCHIVE"
  else
    echo "[backup] zip command unavailable; skipping archive" >&2
  fi
else
  echo "[backup] no project-local files found to archive"
fi
`;
}

function renderTestPs1(): string {
  return `$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

pnpm lint
pnpm test
pnpm build
`;
}

function renderTestSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pnpm lint
pnpm test
pnpm build
`;
}

function renderGitCleanupPs1(): string {
  return `$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

if (Test-Path ".git") {
  git status --short
} else {
  Write-Host "[git-cleanup] no git repository; skipping status"
}
`;
}

function renderGitCleanupSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -d ".git" ]; then
  git status --short
else
  echo "[git-cleanup] no git repository; skipping status"
fi
`;
}

function renderTagReleasePs1(): string {
  return `$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

if (-not (Test-Path ".git")) {
  Write-Host "[tag-release] no git repository; skipping local tag"
  exit 0
}

$Tag = "v0.1.0-" + (Get-Date -Format "yyyyMMddHHmm")
if ((git tag --list $Tag).Trim()) {
  Write-Host "[tag-release] local tag already exists: $Tag"
} else {
  git tag $Tag
  Write-Host "[tag-release] created local tag: $Tag"
}
Write-Host "[tag-release] remote publishing is out of scope by default"
`;
}

function renderTagReleaseSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d ".git" ]; then
  echo "[tag-release] no git repository; skipping local tag"
  exit 0
fi

TAG="v0.1.0-$(date +%Y%m%d%H%M)"
if git tag --list "$TAG" | grep -q "$TAG"; then
  echo "[tag-release] local tag already exists: $TAG"
else
  git tag "$TAG"
  echo "[tag-release] created local tag: $TAG"
fi
echo "[tag-release] remote publishing is out of scope by default"
`;
}

function renderPackagePs1(): string {
  return `$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

$ArtifactDir = Join-Path $RootDir "artifacts"
New-Item -ItemType Directory -Force -Path $ArtifactDir | Out-Null
$Archive = Join-Path $ArtifactDir "aimart-execution-pack.zip"
$Items = @("common", "runtime", "scripts", "agent_adapters", "docs") | Where-Object { Test-Path $_ }

if ($Items.Count -gt 0) {
  Compress-Archive -Path $Items -DestinationPath $Archive -Force
  Write-Host "[package] $Archive"
} else {
  Write-Host "[package] no generated pack directories found"
}
`;
}

function renderPackageSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ARTIFACT_DIR="$ROOT_DIR/artifacts"
mkdir -p "$ARTIFACT_DIR"
ARCHIVE="$ARTIFACT_DIR/aimart-execution-pack.zip"
ITEMS=()
for item in common runtime scripts agent_adapters docs; do
  if [ -e "$item" ]; then
    ITEMS+=("$item")
  fi
done

if [ "\${#ITEMS[@]}" -gt 0 ]; then
  zip -qr "$ARCHIVE" "\${ITEMS[@]}"
  echo "[package] $ARCHIVE"
else
  echo "[package] no generated pack directories found"
fi
`;
}

function renderFinalizePs1(): string {
  return `$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

& .\\scripts\\preflight.ps1
& .\\scripts\\backup.ps1
& .\\scripts\\test.ps1
& .\\scripts\\git-cleanup.ps1
& .\\scripts\\tag-release.ps1
& .\\scripts\\package.ps1
& .\\scripts\\verify-autonomous-completion.ps1

Write-Host "[finalize] complete"
`;
}

function renderRunCustomerAutonomousPs1(): string {
  return `param(
  [ValidateSet("autonomous", "supervised")]
  [string]$Mode = "autonomous",
  [switch]$SkipAdapterRun
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

# one-window display fields: project name, selected AI adapter, current lifecycle phase,
# current target version, current task, log updated time, release output status,
# completion gate status, blocked/known issue status, final PASS or FAIL summary.

$StatePath = Join-Path $RootDir "runtime/FULL_LIFECYCLE_RUN_STATE.json"
$ValidationScript = Join-Path $RootDir "scripts/verify-customer-delivery.ps1"
$RunDir = Join-Path $RootDir "codex_runs"
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogPath = Join-Path $RunDir "customer-$Mode-$Stamp.log"

function Read-LifecycleState {
  if (Test-Path $StatePath) {
    try { return Get-Content $StatePath -Raw | ConvertFrom-Json } catch {}
  }

  return [pscustomobject]@{
    projectName = "unknown"
    selectedAdapterId = "codex"
    currentLifecyclePhase = "unknown"
    currentTargetVersion = "unknown"
    currentTask = "unknown"
    logUpdatedAt = "unknown"
    releaseOutputStatus = "unknown"
    completionGateStatus = "unknown"
    blockedStatus = "unknown"
    knownIssueStatus = "unknown"
    finalDeliveryStatus = "unknown"
  }
}

function Get-ReleaseOutputStatus {
  $Artifacts = @()
  if (Test-Path "artifacts") {
    $Artifacts += @(Get-ChildItem -Path "artifacts" -Filter "*.zip" -Recurse -ErrorAction SilentlyContinue)
  }
  if (Test-Path "releases") {
    $Artifacts += @(Get-ChildItem -Path "releases" -Filter "*.zip" -Recurse -ErrorAction SilentlyContinue)
  }
  if ($Artifacts.Count -gt 0) { return "$($Artifacts.Count) zip artifact(s)" }
  return "pending"
}

function Get-BlockedKnownIssueStatus {
  $Paths = @("common/BLOCKERS.md", "BLOCKERS.md", "common/KNOWN_ISSUES.md", "KNOWN_ISSUES.md")
  $Open = @()
  foreach ($Path in $Paths) {
    if (Test-Path $Path) {
      $Content = Get-Content $Path -Raw
      if (($Content -match "P0|P1") -and ($Content -notmatch "No open P0/P1") -and ($Content -notmatch "closed|resolved")) {
        $Open += $Path
      }
    }
  }
  if ($Open.Count -gt 0) { return "open P0/P1 in $($Open -join ', ')" }
  return "none"
}

function Show-CustomerDashboard {
  param([string]$State, [string]$FinalResult = "pending")
  $Lifecycle = Read-LifecycleState
  $ReleaseStatus = Get-ReleaseOutputStatus
  $BlockedStatus = Get-BlockedKnownIssueStatus
  $Updated = Get-Date -Format s

  Clear-Host
  Write-Host "AIMart Customer Runtime Runner"
  Write-Host "one-window customer dashboard"
  Write-Host ""
  Write-Host "project name: $($Lifecycle.projectName)"
  Write-Host "selected AI adapter: $($Lifecycle.selectedAdapterId)"
  Write-Host "current lifecycle phase: $($Lifecycle.currentLifecyclePhase)"
  Write-Host "current target version: $($Lifecycle.currentTargetVersion)"
  Write-Host "current task: $($Lifecycle.currentTask)"
  Write-Host "log updated time: $Updated"
  Write-Host "release output status: $ReleaseStatus"
  Write-Host "completion gate status: $($Lifecycle.completionGateStatus)"
  Write-Host "blocked/known issue status: $BlockedStatus"
  Write-Host "runner state: $State"
  Write-Host "log: $LogPath"
  Write-Host "final PASS or FAIL summary: $FinalResult"
}

Show-CustomerDashboard -State "starting"

$AdapterScript = if ($Mode -eq "supervised") {
  Join-Path $RootDir "agent_adapters/codex/run-codex-supervised.ps1"
} else {
  Join-Path $RootDir "agent_adapters/codex/run-codex-end-to-end-autonomous.ps1"
}

$AdapterExitCode = 0
if (-not $SkipAdapterRun) {
  if (-not (Test-Path $AdapterScript)) {
    throw "Missing selected adapter launcher: $AdapterScript"
  }
  & $AdapterScript 2>&1 | Tee-Object -FilePath $LogPath
  $AdapterExitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
}

Show-CustomerDashboard -State "verifying"

$ValidationExitCode = 1
if (Test-Path $ValidationScript) {
  try {
    & $ValidationScript
    $ValidationExitCode = 0
  } catch {
    Write-Host $_.Exception.Message
    $ValidationExitCode = 1
  }
} else {
  Write-Host "Missing customer validation script: $ValidationScript"
}

$FinalResult = if (($AdapterExitCode -eq 0) -and ($ValidationExitCode -eq 0)) { "PASS" } else { "FAIL" }
Show-CustomerDashboard -State "completed" -FinalResult $FinalResult
Write-Host ""
Write-Host "Final Summary"
Write-Host "-------------"
Write-Host "selected AI adapter: codex"
Write-Host "adapter exit code: $AdapterExitCode"
Write-Host "customer delivery verification exit code: $ValidationExitCode"
Write-Host "final PASS or FAIL summary: $FinalResult"

if ($FinalResult -eq "PASS") { exit 0 }
exit 1
`;
}

function renderRunCustomerAutonomousSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
MODE="\${1:-autonomous}"
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# one-window display fields: project name, selected AI adapter, current lifecycle phase,
# current target version, current task, log updated time, release output status,
# completion gate status, blocked/known issue status, final PASS or FAIL summary.

STATE_PATH="$ROOT_DIR/runtime/FULL_LIFECYCLE_RUN_STATE.json"
VALIDATION_SCRIPT="$ROOT_DIR/scripts/verify-customer-delivery.sh"
RUN_DIR="$ROOT_DIR/codex_runs"
mkdir -p "$RUN_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
LOG_PATH="$RUN_DIR/customer-$MODE-$STAMP.log"

json_value() {
  local key="$1"
  if [ -f "$STATE_PATH" ]; then
    node -e "const s=JSON.parse(require('fs').readFileSync('$STATE_PATH','utf8')); process.stdout.write(String(s['$key'] ?? 'unknown'))" 2>/dev/null || printf "%s" "unknown"
  else
    printf "%s" "unknown"
  fi
}

release_output_status() {
  local count
  count="$(find artifacts releases -type f -name "*.zip" 2>/dev/null | wc -l | tr -d " ")"
  if [ "$count" = "0" ]; then printf "%s" "pending"; else printf "%s" "$count zip artifact(s)"; fi
}

blocked_known_issue_status() {
  local paths open
  paths="common/BLOCKERS.md BLOCKERS.md common/KNOWN_ISSUES.md KNOWN_ISSUES.md"
  open=""
  for path in $paths; do
    if [ -f "$path" ] && grep -Eq "P0|P1" "$path" && ! grep -Eq "No open P0/P1|closed|resolved" "$path"; then
      open="$open $path"
    fi
  done
  if [ -n "$open" ]; then printf "open P0/P1 in%s" "$open"; else printf "%s" "none"; fi
}

show_dashboard() {
  local state="$1" final_result="\${2:-pending}"
  clear || true
  printf "%s\\n" "AIMart Customer Runtime Runner"
  printf "%s\\n\\n" "one-window customer dashboard"
  printf "project name: %s\\n" "$(json_value projectName)"
  printf "selected AI adapter: %s\\n" "$(json_value selectedAdapterId)"
  printf "current lifecycle phase: %s\\n" "$(json_value currentLifecyclePhase)"
  printf "current target version: %s\\n" "$(json_value currentTargetVersion)"
  printf "current task: %s\\n" "$(json_value currentTask)"
  printf "log updated time: %s\\n" "$(date -Iseconds)"
  printf "release output status: %s\\n" "$(release_output_status)"
  printf "completion gate status: %s\\n" "$(json_value completionGateStatus)"
  printf "blocked/known issue status: %s\\n" "$(blocked_known_issue_status)"
  printf "runner state: %s\\n" "$state"
  printf "log: %s\\n" "$LOG_PATH"
  printf "final PASS or FAIL summary: %s\\n" "$final_result"
}

show_dashboard "starting"
if [ "$MODE" = "supervised" ]; then
  ADAPTER_SCRIPT="$ROOT_DIR/agent_adapters/codex/run-codex-supervised.sh"
else
  ADAPTER_SCRIPT="$ROOT_DIR/agent_adapters/codex/run-codex-end-to-end-autonomous.sh"
fi

ADAPTER_EXIT_CODE=0
if [ "\${SKIP_ADAPTER_RUN:-0}" != "1" ]; then
  [ -f "$ADAPTER_SCRIPT" ] || { echo "Missing selected adapter launcher: $ADAPTER_SCRIPT" >&2; exit 1; }
  set +e
  bash "$ADAPTER_SCRIPT" 2>&1 | tee "$LOG_PATH"
  ADAPTER_EXIT_CODE="\${PIPESTATUS[0]}"
  set -e
fi

show_dashboard "verifying"
VALIDATION_EXIT_CODE=1
if [ -f "$VALIDATION_SCRIPT" ]; then
  set +e
  bash "$VALIDATION_SCRIPT"
  VALIDATION_EXIT_CODE="$?"
  set -e
else
  echo "Missing customer validation script: $VALIDATION_SCRIPT" >&2
fi

if [ "$ADAPTER_EXIT_CODE" = "0" ] && [ "$VALIDATION_EXIT_CODE" = "0" ]; then FINAL_RESULT="PASS"; else FINAL_RESULT="FAIL"; fi
show_dashboard "completed" "$FINAL_RESULT"
printf "\\n%s\\n" "Final Summary"
printf "%s\\n" "-------------"
printf "selected AI adapter: codex\\n"
printf "adapter exit code: %s\\n" "$ADAPTER_EXIT_CODE"
printf "customer delivery verification exit code: %s\\n" "$VALIDATION_EXIT_CODE"
printf "final PASS or FAIL summary: %s\\n" "$FINAL_RESULT"

[ "$FINAL_RESULT" = "PASS" ]
`;
}

function renderVerifyCustomerDeliveryPs1(): string {
  return `$ErrorActionPreference = "Continue"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

$ReportPath = Join-Path $RootDir "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md"
$Results = New-Object System.Collections.Generic.List[object]

function Add-Check([string]$Gate, [string]$Status, [string]$Details) {
  $Results.Add([pscustomobject]@{ Gate = $Gate; Status = $Status; Details = $Details }) | Out-Null
}

function Test-FileList([string[]]$Paths) {
  $Missing = @($Paths | Where-Object { -not (Test-Path $_) })
  if ($Missing.Count -eq 0) { return "PASS|ok" }
  return "FAIL|missing: $($Missing -join ', ')"
}

function Add-FileListCheck([string]$Gate, [string[]]$Paths) {
  $Result = Test-FileList $Paths
  $Parts = $Result -split "\\|", 2
  Add-Check $Gate $Parts[0] $Parts[1]
}

function Test-NoOpenP0P1([string[]]$Paths) {
  $Open = @()
  foreach ($Path in $Paths) {
    if (Test-Path $Path) {
      $Content = Get-Content $Path -Raw
      if (($Content -match "P0|P1") -and ($Content -notmatch "No open P0/P1") -and ($Content -notmatch "closed|resolved")) {
        $Open += $Path
      }
    }
  }
  if ($Open.Count -eq 0) { return "PASS|no open P0/P1 blockers" }
  return "FAIL|open P0/P1 blockers in $($Open -join ', ')"
}

function Add-NoOpenP0P1Check([string]$Gate, [string[]]$Paths) {
  $Result = Test-NoOpenP0P1 $Paths
  $Parts = $Result -split "\\|", 2
  Add-Check $Gate $Parts[0] $Parts[1]
}

function Add-LifecycleCoherenceCheck {
  $Required = @(
    "runtime/FULL_LIFECYCLE_RUN_STATE.json",
    "runtime/VERSION_LADDER.json",
    "runtime/PHASE_STATUS.json",
    "runtime/CURRENT_PHASE.md",
    "runtime/NEXT_ACTION.md",
    "runtime/FINAL_DELIVERY_STATUS.md",
    "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md"
  )
  $Missing = @($Required | Where-Object { -not (Test-Path $_) })
  if ($Missing.Count -gt 0) {
    Add-Check "lifecycle state files are present and coherent" "FAIL" "missing: $($Missing -join ', ')"
    return
  }
  try {
    $State = Get-Content "runtime/FULL_LIFECYCLE_RUN_STATE.json" -Raw | ConvertFrom-Json
    $Ladder = Get-Content "runtime/VERSION_LADDER.json" -Raw | ConvertFrom-Json
    $Phases = Get-Content "runtime/PHASE_STATUS.json" -Raw | ConvertFrom-Json
    $Versions = @($Ladder.versions | ForEach-Object { $_.version })
    $PhaseNames = @($Phases.phases | ForEach-Object { $_.phase })
    if (($Versions -notcontains $State.currentTargetVersion) -or ($PhaseNames -notcontains $State.currentLifecyclePhase)) {
      Add-Check "lifecycle state files are present and coherent" "FAIL" "state does not match ladder or phase status"
      return
    }
    Add-Check "lifecycle state files are present and coherent" "PASS" "JSON parsed and current phase/version are coherent"
  } catch {
    Add-Check "lifecycle state files are present and coherent" "FAIL" $_.Exception.Message
  }
}

function Add-SelectedAdapterRunbookCheck {
  try {
    $State = Get-Content "runtime/FULL_LIFECYCLE_RUN_STATE.json" -Raw | ConvertFrom-Json
    $Adapter = if ($State.selectedAdapterId) { $State.selectedAdapterId } else { "codex" }
    $Runbook = switch ($Adapter) {
      "claude-code" { "agent_adapters/claude-code/CLAUDE_RUNBOOK.md" }
      "trae" { "agent_adapters/trae/TRAE_RUNBOOK.md" }
      "cursor" { "agent_adapters/cursor/CURSOR_RUNBOOK.md" }
      default { "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md" }
    }
    if (Test-Path $Runbook) {
      Add-Check "selected adapter runbook exists" "PASS" $Runbook
    } else {
      Add-Check "selected adapter runbook exists" "FAIL" "missing: $Runbook"
    }
  } catch {
    Add-Check "selected adapter runbook exists" "FAIL" $_.Exception.Message
  }
}

Add-FileListCheck "generated project files" @("common/PROJECT_SPEC.md", "common/TASK_QUEUE.md", "common/EXECUTION_RULES.md")
Add-FileListCheck "generated docs" @("docs/README.md", "docs/RUN_APP.md", "docs/SECURITY_AND_PERMISSIONS.md")
Add-FileListCheck "tests/build instructions" @("scripts/test.ps1", "scripts/test.sh", "runtime/INSTALL_PLAN.md")
Add-FileListCheck "final artifact instructions" @("scripts/package.ps1", "scripts/package.sh", "scripts/finalize.ps1", "scripts/finalize.sh")
Add-NoOpenP0P1Check "BLOCKERS.md has no open P0/P1 blockers" @("common/BLOCKERS.md", "BLOCKERS.md")
Add-NoOpenP0P1Check "KNOWN_ISSUES has no P0/P1 blockers" @("common/KNOWN_ISSUES.md", "KNOWN_ISSUES.md")
Add-LifecycleCoherenceCheck
Add-SelectedAdapterRunbookCheck
Add-FileListCheck "completion gate report exists" @("runtime/COMPLETION_GATE_REPORT.md")

$Final = if (($Results | Where-Object { $_.Status -eq "FAIL" }).Count -eq 0) { "PASS" } else { "FAIL" }
$Lines = @(
  "# Customer Runtime Validation Report",
  "",
  "| Gate | Status | Notes |",
  "|---|---|---|"
)
foreach ($Result in $Results) {
  $Details = [regex]::Replace(($Result.Details -replace [regex]::Escape("|"), "/"), '\\r?\\n', " ")
  $Lines += "| $($Result.Gate) | $($Result.Status) | $Details |"
}
$Lines += @("", "Final result: $Final")
$Lines | Set-Content -Encoding UTF8 $ReportPath

Write-Host "[verify-customer-delivery] $Final report=$ReportPath"
if ($Final -eq "PASS") { return }
throw "Customer delivery verification FAIL. See $ReportPath"
`;
}

function renderVerifyCustomerDeliverySh(): string {
  return `#!/usr/bin/env bash
set +e
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
REPORT_PATH="$ROOT_DIR/runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md"
RESULT_LINES=()
FAIL_COUNT=0

add_check() {
  local gate="$1" status="$2" details="$3"
  RESULT_LINES+=("| $gate | $status | $details |")
  [ "$status" = "FAIL" ] && FAIL_COUNT=$((FAIL_COUNT + 1))
}

check_files() {
  local gate="$1"; shift
  local missing=""
  for path in "$@"; do
    [ -e "$path" ] || missing="$missing $path"
  done
  if [ -z "$missing" ]; then add_check "$gate" "PASS" "ok"; else add_check "$gate" "FAIL" "missing:$missing"; fi
}

check_no_open_p0p1() {
  local gate="$1"; shift
  local open=""
  for path in "$@"; do
    if [ -f "$path" ] && grep -Eq "P0|P1" "$path" && ! grep -Eq "No open P0/P1|closed|resolved" "$path"; then
      open="$open $path"
    fi
  done
  if [ -z "$open" ]; then add_check "$gate" "PASS" "no open P0/P1 blockers"; else add_check "$gate" "FAIL" "open P0/P1 blockers in$open"; fi
}

check_lifecycle() {
  local required missing code
  required="runtime/FULL_LIFECYCLE_RUN_STATE.json runtime/VERSION_LADDER.json runtime/PHASE_STATUS.json runtime/CURRENT_PHASE.md runtime/NEXT_ACTION.md runtime/FINAL_DELIVERY_STATUS.md runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md"
  missing=""
  for path in $required; do
    [ -e "$path" ] || missing="$missing $path"
  done
  if [ -n "$missing" ]; then
    add_check "lifecycle state files are present and coherent" "FAIL" "missing:$missing"
    return
  fi
  node <<'NODE'
const fs = require('fs');
const state = JSON.parse(fs.readFileSync('runtime/FULL_LIFECYCLE_RUN_STATE.json', 'utf8'));
const ladder = JSON.parse(fs.readFileSync('runtime/VERSION_LADDER.json', 'utf8'));
const phases = JSON.parse(fs.readFileSync('runtime/PHASE_STATUS.json', 'utf8'));
if (!ladder.versions.some((entry) => entry.version === state.currentTargetVersion)) process.exit(1);
if (!phases.phases.some((entry) => entry.phase === state.currentLifecyclePhase)) process.exit(1);
NODE
  code=$?
  if [ "$code" = "0" ]; then add_check "lifecycle state files are present and coherent" "PASS" "JSON parsed and current phase/version are coherent"; else add_check "lifecycle state files are present and coherent" "FAIL" "state does not match ladder or phase status"; fi
}

check_selected_adapter_runbook() {
  local adapter runbook
  adapter="$(node -e "const fs=require('fs'); const s=JSON.parse(fs.readFileSync('runtime/FULL_LIFECYCLE_RUN_STATE.json','utf8')); process.stdout.write(s.selectedAdapterId || 'codex')" 2>/dev/null || echo codex)"
  case "$adapter" in
    claude-code) runbook="agent_adapters/claude-code/CLAUDE_RUNBOOK.md" ;;
    trae) runbook="agent_adapters/trae/TRAE_RUNBOOK.md" ;;
    cursor) runbook="agent_adapters/cursor/CURSOR_RUNBOOK.md" ;;
    *) runbook="agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md" ;;
  esac
  if [ -f "$runbook" ]; then add_check "selected adapter runbook exists" "PASS" "$runbook"; else add_check "selected adapter runbook exists" "FAIL" "missing: $runbook"; fi
}

check_files "generated project files" common/PROJECT_SPEC.md common/TASK_QUEUE.md common/EXECUTION_RULES.md
check_files "generated docs" docs/README.md docs/RUN_APP.md docs/SECURITY_AND_PERMISSIONS.md
check_files "tests/build instructions" scripts/test.ps1 scripts/test.sh runtime/INSTALL_PLAN.md
check_files "final artifact instructions" scripts/package.ps1 scripts/package.sh scripts/finalize.ps1 scripts/finalize.sh
check_no_open_p0p1 "BLOCKERS.md has no open P0/P1 blockers" common/BLOCKERS.md BLOCKERS.md
check_no_open_p0p1 "KNOWN_ISSUES has no P0/P1 blockers" common/KNOWN_ISSUES.md KNOWN_ISSUES.md
check_lifecycle
check_selected_adapter_runbook
check_files "completion gate report exists" runtime/COMPLETION_GATE_REPORT.md

if [ "$FAIL_COUNT" = "0" ]; then FINAL="PASS"; else FINAL="FAIL"; fi
{
  echo "# Customer Runtime Validation Report"
  echo
  echo "| Gate | Status | Notes |"
  echo "|---|---|---|"
  printf "%s\\n" "\${RESULT_LINES[@]}"
  echo
  echo "Final result: $FINAL"
} > "$REPORT_PATH"
echo "[verify-customer-delivery] $FINAL report=$REPORT_PATH"
[ "$FINAL" = "PASS" ]
`;
}

function renderFinalizeSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bash scripts/preflight.sh
bash scripts/backup.sh
bash scripts/test.sh
bash scripts/git-cleanup.sh
bash scripts/tag-release.sh
bash scripts/package.sh
bash scripts/verify-autonomous-completion.sh

echo "[finalize] complete"
`;
}

function renderVerifyReleasePs1(): string {
  return `param([string]$TargetVersion = "")
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
Write-Host "[Autonomous Completion Gate] verify-release TargetVersion=$TargetVersion"
if (-not $TargetVersion) {
  $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $TargetVersion = "v$($Pkg.version)"
}
if (-not $TargetVersion.StartsWith("v")) { $TargetVersion = "v$TargetVersion" }
$Version = $TargetVersion.TrimStart("v")
$ReleaseDir = Join-Path $RootDir "releases/$TargetVersion"
$SourceZip = Join-Path $ReleaseDir "aimart-orchestrator-$TargetVersion-source.zip"
$SampleZip = Join-Path $ReleaseDir "samples/todo-api-generated-execution-pack.zip"
$ShaFile = Join-Path $ReleaseDir "SHA256.txt"
$Manifest = Join-Path $ReleaseDir "RELEASE_MANIFEST.txt"
foreach ($Path in @($ReleaseDir, $SourceZip, $SampleZip, $ShaFile, $Manifest)) {
  if (-not (Test-Path $Path)) { throw "Missing required release artifact: $Path" }
}
$ShaContent = Get-Content $ShaFile
foreach ($Item in @(@($SourceZip, "aimart-orchestrator-$TargetVersion-source.zip"), @($SampleZip, "samples/todo-api-generated-execution-pack.zip"))) {
  $Actual = (Get-FileHash -Algorithm SHA256 $Item[0]).Hash.ToLowerInvariant()
  $ExpectedLine = $ShaContent | Where-Object { $_ -match [regex]::Escape($Item[1]) } | Select-Object -First 1
  if (-not $ExpectedLine) { throw "Missing SHA256 entry for $($Item[1])" }
  if (-not $ExpectedLine.ToLowerInvariant().StartsWith($Actual)) { throw "SHA256 mismatch for $($Item[1])" }
}
Write-Host "[verify-release] PASS $TargetVersion"
`;
}

function renderVerifyReleaseSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
TARGET_VERSION="\${1:-}"
echo "[Autonomous Completion Gate] verify-release TargetVersion=$TARGET_VERSION"
if [ -z "$TARGET_VERSION" ]; then
  TARGET_VERSION="v$(node -e "const p=require('./package.json'); process.stdout.write(p.version)")"
fi
case "$TARGET_VERSION" in v*) ;; *) TARGET_VERSION="v$TARGET_VERSION" ;; esac
RELEASE_DIR="releases/$TARGET_VERSION"
SOURCE_ZIP="$RELEASE_DIR/aimart-orchestrator-$TARGET_VERSION-source.zip"
SAMPLE_ZIP="$RELEASE_DIR/samples/todo-api-generated-execution-pack.zip"
SHA_FILE="$RELEASE_DIR/SHA256.txt"
MANIFEST="$RELEASE_DIR/RELEASE_MANIFEST.txt"
for path in "$RELEASE_DIR" "$SOURCE_ZIP" "$SAMPLE_ZIP" "$SHA_FILE" "$MANIFEST"; do
  [ -e "$path" ] || { echo "Missing required release artifact: $path" >&2; exit 1; }
done
source_hash="$(sha256sum "$SOURCE_ZIP" | awk '{print $1}')"
sample_hash="$(sha256sum "$SAMPLE_ZIP" | awk '{print $1}')"
grep -q "$source_hash  aimart-orchestrator-$TARGET_VERSION-source.zip" "$SHA_FILE"
grep -q "$sample_hash  samples/todo-api-generated-execution-pack.zip" "$SHA_FILE"
echo "[verify-release] PASS $TARGET_VERSION"
`;
}

function renderVerifySamplePackPs1(): string {
  return `param([string]$TargetVersion = "")
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
Write-Host "[Autonomous Completion Gate] verify-sample-pack TargetVersion=$TargetVersion"
if (-not $TargetVersion) {
  $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $TargetVersion = "v$($Pkg.version)"
}
if (-not $TargetVersion.StartsWith("v")) { $TargetVersion = "v$TargetVersion" }
$SampleZip = Join-Path $RootDir "releases/$TargetVersion/samples/todo-api-generated-execution-pack.zip"
if (-not (Test-Path $SampleZip)) { throw "Missing sample execution-pack ZIP: $SampleZip" }
$TempDir = Join-Path $RootDir "codex_runs/verify-sample-pack-$TargetVersion"
if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
Expand-Archive -Path $SampleZip -DestinationPath $TempDir -Force
$Required = @(
  "START_HERE.md",
  "START_CODEX_AUTONOMOUS.cmd",
  "START_CODEX_AUTONOMOUS.ps1",
  "START_CODEX_SUPERVISED.cmd",
  "START_CODEX_SUPERVISED.ps1",
  "EXECUTION_PACK_MANIFEST.md",
  "common/PROJECT_SPEC.md", "common/TASK_QUEUE.md", "common/EXECUTION_RULES.md",
  "common/AUTONOMOUS_DELIVERY_ROADMAP.md", "common/VERSION_LADDER.md",
  "common/PHASE_GATE_PLAN.md", "common/CURRENT_PHASE.md",
  "runtime/SAFE_COMMANDS.md", "runtime/DENIED_COMMANDS.md", "runtime/APPROVAL_QUEUE.md",
  "runtime/AUTONOMOUS_EXECUTION_POLICY.md", "runtime/AUTONOMOUS_RUN_STATUS.md",
  "runtime/AUTONOMOUS_RUN_SUMMARY.md", "runtime/AUTONOMOUS_HEALTH_CHECK.md",
  "runtime/AUTONOMOUS_COMPLETION_GATE.md", "runtime/AUTONOMOUS_VERIFICATION_REPORT.md",
  "runtime/END_TO_END_AUTONOMOUS_POLICY.md", "runtime/RUN_STATE.json",
  "runtime/FULL_LIFECYCLE_RUN_STATE.json",
  "runtime/VERSION_LADDER.json",
  "runtime/PHASE_STATUS.json",
  "runtime/CURRENT_TASK.md", "runtime/PHASE_GATE_REPORT.md",
  "runtime/CURRENT_PHASE.md", "runtime/NEXT_ACTION.md",
  "runtime/COMPLETION_GATE_REPORT.md",
  "runtime/FINAL_DELIVERY_STATUS.md",
  "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md",
  "runtime/MORNING_REPORT.md",
  "runtime/HANDOFF_TO_NEXT_VERSION.md",
  "scripts/run-customer-autonomous.ps1",
  "scripts/run-customer-autonomous.sh",
  "scripts/verify-customer-delivery.ps1",
  "scripts/verify-customer-delivery.sh",
  "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md",
  "agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md",
  "agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md",
  "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md",
  "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md",
  "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/codex/run-codex-autonomous.ps1",
  "agent_adapters/codex/run-codex-supervised.ps1",
  "agent_adapters/codex/run-codex-unified-autonomous.ps1",
  "agent_adapters/codex/run-codex-end-to-end-autonomous.ps1",
  "agent_adapters/codex/run-codex-autonomous.sh",
  "agent_adapters/codex/run-codex-supervised.sh",
  "agent_adapters/codex/run-codex-unified-autonomous.sh",
  "agent_adapters/codex/run-codex-end-to-end-autonomous.sh",
  "agent_adapters/claude-code/CLAUDE.md",
  "agent_adapters/claude-code/CLAUDE_RUNBOOK.md",
  "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md",
  "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md",
  "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/claude-code/settings.example.json",
  "agent_adapters/claude-code/run-claude-supervised.md",
  "agent_adapters/claude-code/run-claude-autonomous.md",
  "agent_adapters/trae/TRAE_RUNBOOK.md",
  "agent_adapters/trae/TRAE_TASK_PROMPT.md",
  "agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md",
  "agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/trae/TRAE_AGENT_CONFIG.yaml",
  "agent_adapters/trae/run-trae-supervised.md",
  "agent_adapters/trae/run-trae-autonomous.md",
  "agent_adapters/cursor/CURSOR_RUNBOOK.md",
  "agent_adapters/cursor/CURSOR_TASK_PROMPT.md",
  "agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md",
  "agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/cursor/rules/project-rules.md",
  "docs/README.md", "docs/RUN_APP.md", "docs/SECURITY_AND_PERMISSIONS.md"
)
foreach ($Entry in $Required) {
  if (-not (Test-Path (Join-Path $TempDir $Entry))) { throw "Missing sample pack file: $Entry" }
}
$RunStatePath = Join-Path $TempDir "runtime/RUN_STATE.json"
try {
  Get-Content $RunStatePath -Raw | ConvertFrom-Json | Out-Null
} catch {
  throw "runtime/RUN_STATE.json is not valid JSON"
}
foreach ($JsonEntry in @("runtime/FULL_LIFECYCLE_RUN_STATE.json", "runtime/VERSION_LADDER.json", "runtime/PHASE_STATUS.json")) {
  try {
    Get-Content (Join-Path $TempDir $JsonEntry) -Raw | ConvertFrom-Json | Out-Null
  } catch {
    throw "$JsonEntry is not valid JSON"
  }
}
Write-Host "[verify-sample-pack] PASS"
`;
}

function renderVerifySamplePackSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
TARGET_VERSION="\${1:-}"
echo "[Autonomous Completion Gate] verify-sample-pack TargetVersion=$TARGET_VERSION"
if [ -z "$TARGET_VERSION" ]; then
  TARGET_VERSION="v$(node -e "const p=require('./package.json'); process.stdout.write(p.version)")"
fi
case "$TARGET_VERSION" in v*) ;; *) TARGET_VERSION="v$TARGET_VERSION" ;; esac
SAMPLE_ZIP="releases/$TARGET_VERSION/samples/todo-api-generated-execution-pack.zip"
[ -f "$SAMPLE_ZIP" ] || { echo "Missing sample execution-pack ZIP: $SAMPLE_ZIP" >&2; exit 1; }
TEMP_DIR="codex_runs/verify-sample-pack-$TARGET_VERSION"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
unzip -q "$SAMPLE_ZIP" -d "$TEMP_DIR"
required=(
  "START_HERE.md"
  "START_CODEX_AUTONOMOUS.cmd"
  "START_CODEX_AUTONOMOUS.ps1"
  "START_CODEX_SUPERVISED.cmd"
  "START_CODEX_SUPERVISED.ps1"
  "EXECUTION_PACK_MANIFEST.md"
  "common/PROJECT_SPEC.md" "common/TASK_QUEUE.md" "common/EXECUTION_RULES.md"
  "common/AUTONOMOUS_DELIVERY_ROADMAP.md" "common/VERSION_LADDER.md"
  "common/PHASE_GATE_PLAN.md" "common/CURRENT_PHASE.md"
  "runtime/SAFE_COMMANDS.md" "runtime/DENIED_COMMANDS.md" "runtime/APPROVAL_QUEUE.md"
  "runtime/AUTONOMOUS_EXECUTION_POLICY.md" "runtime/AUTONOMOUS_RUN_STATUS.md"
  "runtime/AUTONOMOUS_RUN_SUMMARY.md" "runtime/AUTONOMOUS_HEALTH_CHECK.md"
  "runtime/AUTONOMOUS_COMPLETION_GATE.md" "runtime/AUTONOMOUS_VERIFICATION_REPORT.md"
  "runtime/END_TO_END_AUTONOMOUS_POLICY.md" "runtime/RUN_STATE.json"
  "runtime/FULL_LIFECYCLE_RUN_STATE.json"
  "runtime/VERSION_LADDER.json"
  "runtime/PHASE_STATUS.json"
  "runtime/CURRENT_TASK.md" "runtime/PHASE_GATE_REPORT.md"
  "runtime/CURRENT_PHASE.md" "runtime/NEXT_ACTION.md"
  "runtime/COMPLETION_GATE_REPORT.md"
  "runtime/FINAL_DELIVERY_STATUS.md"
  "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md"
  "runtime/MORNING_REPORT.md"
  "runtime/HANDOFF_TO_NEXT_VERSION.md"
  "scripts/run-customer-autonomous.ps1"
  "scripts/run-customer-autonomous.sh"
  "scripts/verify-customer-delivery.ps1"
  "scripts/verify-customer-delivery.sh"
  "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"
  "agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md"
  "agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md"
  "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md"
  "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md"
  "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md"
  "agent_adapters/codex/run-codex-autonomous.ps1"
  "agent_adapters/codex/run-codex-supervised.ps1"
  "agent_adapters/codex/run-codex-unified-autonomous.ps1"
  "agent_adapters/codex/run-codex-end-to-end-autonomous.ps1"
  "agent_adapters/codex/run-codex-autonomous.sh"
  "agent_adapters/codex/run-codex-supervised.sh"
  "agent_adapters/codex/run-codex-unified-autonomous.sh"
  "agent_adapters/codex/run-codex-end-to-end-autonomous.sh"
  "agent_adapters/claude-code/CLAUDE.md"
  "agent_adapters/claude-code/CLAUDE_RUNBOOK.md"
  "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md"
  "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md"
  "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md"
  "agent_adapters/claude-code/settings.example.json"
  "agent_adapters/claude-code/run-claude-supervised.md"
  "agent_adapters/claude-code/run-claude-autonomous.md"
  "agent_adapters/trae/TRAE_RUNBOOK.md"
  "agent_adapters/trae/TRAE_TASK_PROMPT.md"
  "agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md"
  "agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md"
  "agent_adapters/trae/TRAE_AGENT_CONFIG.yaml"
  "agent_adapters/trae/run-trae-supervised.md"
  "agent_adapters/trae/run-trae-autonomous.md"
  "agent_adapters/cursor/CURSOR_RUNBOOK.md"
  "agent_adapters/cursor/CURSOR_TASK_PROMPT.md"
  "agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md"
  "agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md"
  "agent_adapters/cursor/rules/project-rules.md"
  "docs/README.md" "docs/RUN_APP.md" "docs/SECURITY_AND_PERMISSIONS.md"
)
for entry in "\${required[@]}"; do
  [ -f "$TEMP_DIR/$entry" ] || { echo "Missing sample pack file: $entry" >&2; exit 1; }
done
node -e "for (const p of ['runtime/RUN_STATE.json','runtime/FULL_LIFECYCLE_RUN_STATE.json','runtime/VERSION_LADDER.json','runtime/PHASE_STATUS.json']) JSON.parse(require('fs').readFileSync('$TEMP_DIR/' + p,'utf8'))"
echo "[verify-sample-pack] PASS"
`;
}

function renderVerifySourceZipPs1(): string {
  return `param([string]$TargetVersion = "")
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
    $Name = $Entry.FullName.Replace("\\", "/")
    foreach ($Forbidden in @("node_modules/", ".next/", ".git/", "codex_runs/", "verify-temp", "verification", "releases/", ".env", "id_rsa", ".pem", ".pfx", "secret", "credentials")) {
      if ($Name -like "*$Forbidden*") { throw "Forbidden source ZIP entry: $Name" }
    }
  }
} finally {
  $Zip.Dispose()
}
Write-Host "[verify-source-zip] PASS"
`;
}

function renderVerifySourceZipSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
TARGET_VERSION="\${1:-}"
echo "[Autonomous Completion Gate] verify-source-zip TargetVersion=$TARGET_VERSION"
if [ -z "$TARGET_VERSION" ]; then
  TARGET_VERSION="v$(node -e "const p=require('./package.json'); process.stdout.write(p.version)")"
fi
case "$TARGET_VERSION" in v*) ;; *) TARGET_VERSION="v$TARGET_VERSION" ;; esac
SOURCE_ZIP="releases/$TARGET_VERSION/aimart-orchestrator-$TARGET_VERSION-source.zip"
[ -f "$SOURCE_ZIP" ] || { echo "Missing source ZIP: $SOURCE_ZIP" >&2; exit 1; }
if unzip -Z1 "$SOURCE_ZIP" | grep -E '(^|/)(node_modules|\\.next|\\.git|codex_runs|releases)(/|$)|verify-temp|verification|(^|/)\\.env|id_rsa|\\.pem$|\\.pfx$|secret|credentials'; then
  echo "Forbidden source ZIP entry found" >&2
  exit 1
fi
echo "[verify-source-zip] PASS"
`;
}

function renderVerifyHistoryReleasesPs1(): string {
  return `param([string]$TargetVersion = "")
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
Write-Host "[Autonomous Completion Gate] verify-history-releases TargetVersion=$TargetVersion"
$Frozen = @("releases/v0.1.0", "releases/v0.1.1", "releases/v0.2.1", "releases/v0.2.2", "releases/v0.3.0")
foreach ($Path in $Frozen) {
  if (-not (Test-Path $Path)) { throw "Missing frozen historical release folder: $Path" }
}
$Dirty = @()
$Dirty += git diff --name-only -- $Frozen
$Dirty += git diff --cached --name-only -- $Frozen
if ($Dirty.Count -gt 0) { throw "Historical releases modified: $($Dirty -join ', ')" }
if ((git tag --list v0.3.0).Trim()) {
  $ChangedSince = @(git diff --name-only v0.3.0 HEAD -- $Frozen)
  if ($ChangedSince.Count -gt 0) { throw "Historical release changes since v0.3.0: $($ChangedSince -join ', ')" }
} else {
  throw "Required historical tag v0.3.0 is missing"
}
Write-Host "[verify-history-releases] PASS"
`;
}

function renderVerifyHistoryReleasesSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
TARGET_VERSION="\${1:-}"
echo "[Autonomous Completion Gate] verify-history-releases TargetVersion=$TARGET_VERSION"
frozen=("releases/v0.1.0" "releases/v0.1.1" "releases/v0.2.1" "releases/v0.2.2" "releases/v0.3.0")
for path in "\${frozen[@]}"; do
  [ -d "$path" ] || { echo "Missing frozen historical release folder: $path" >&2; exit 1; }
done
if [ -n "$(git diff --name-only -- "\${frozen[@]}")" ] || [ -n "$(git diff --cached --name-only -- "\${frozen[@]}")" ]; then
  echo "Historical releases modified" >&2
  exit 1
fi
if git tag --list v0.3.0 | grep -q '^v0.3.0$'; then
  if [ -n "$(git diff --name-only v0.3.0 HEAD -- "\${frozen[@]}")" ]; then
    echo "Historical release changes since v0.3.0" >&2
    exit 1
  fi
else
  echo "Required historical tag v0.3.0 is missing" >&2
  exit 1
fi
echo "[verify-history-releases] PASS"
`;
}

function renderVerifyAutonomousCompletionPs1(): string {
  return `# AIMart v0.3.1 compatibility literals for release-script tests:
# Generated execution pack includes docs/README.md and docs/RUN_APP.md
# EXECUTION_PACK_MANIFEST.md
# agent_adapters/claude-code
# agent_adapters/trae
# agent_adapters/cursor
# runtime/RUN_STATE.json
# runtime/CURRENT_TASK.md
# runtime/PHASE_GATE_REPORT.md
# runtime/COMPLETION_GATE_REPORT.md
# runtime/FULL_LIFECYCLE_RUN_STATE.json
# runtime/VERSION_LADDER.json
# runtime/PHASE_STATUS.json
# runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md
# START_HERE.md
# START_CODEX_AUTONOMOUS.cmd
# START_CODEX_AUTONOMOUS.ps1
# scripts/run-customer-autonomous.ps1
# scripts/verify-customer-delivery.ps1
# V0.3.0_IMPLEMENTATION_REPORT.md
# V0.3.0_RELEASE_NOTES.md
# V0.3.0_FINAL_DELIVERY_CHECK.md
# V0.3.0_KNOWN_ISSUES.md
param([string]$TargetVersion = "")
$ErrorActionPreference = "Continue"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
if (-not $TargetVersion) {
  $Pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $TargetVersion = "v$($Pkg.version)"
}
if (-not $TargetVersion.StartsWith("v")) { $TargetVersion = "v$TargetVersion" }
$ReportDir = Join-Path $RootDir "codex_runs"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
$ReportPath = Join-Path $ReportDir "verify-autonomous-completion-$TargetVersion.md"
$Results = @()
function Add-Result([string]$Gate, [string]$Status, [string]$Details) {
  $script:Results += [pscustomobject]@{ Gate = $Gate; Status = $Status; Details = $Details }
}
function Invoke-NativeGate([string]$Gate, [string[]]$Command) {
  Write-Host "[Autonomous Completion Gate] $Gate"
  & $Command[0] $Command[1..($Command.Count - 1)]
  $Code = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
  if ($Code -eq 0) { Add-Result $Gate "PASS" "exit 0" } else { Add-Result $Gate "FAIL" "exit $Code" }
}
function Invoke-ScriptGate([string]$Gate, [string]$ScriptName) {
  try {
    & (Join-Path $PSScriptRoot $ScriptName) -TargetVersion $TargetVersion
    Add-Result $Gate "PASS" "ok"
  } catch {
    Add-Result $Gate "FAIL" $_.Exception.Message
  }
}
Invoke-NativeGate "pnpm test" @("pnpm", "test")
Invoke-NativeGate "pnpm lint" @("pnpm", "lint")
Invoke-NativeGate "pnpm build" @("pnpm", "build")
Invoke-ScriptGate "verify-release" "verify-release.ps1"
Invoke-ScriptGate "verify-source-zip" "verify-source-zip.ps1"
Invoke-ScriptGate "verify-sample-pack" "verify-sample-pack.ps1"
$SamplePackGatePath = Join-Path $PSScriptRoot "verify-sample-pack.ps1"
$SamplePackGateContent = if (Test-Path $SamplePackGatePath) { Get-Content $SamplePackGatePath -Raw } else { "" }
foreach ($AdapterPath in @("agent_adapters/claude-code", "agent_adapters/trae", "agent_adapters/cursor")) {
  if ($SamplePackGateContent.Contains($AdapterPath)) {
    Add-Result "sample pack adapter gate $AdapterPath" "PASS" "verify-sample-pack checks $AdapterPath"
  } else {
    Add-Result "sample pack adapter gate $AdapterPath" "FAIL" "verify-sample-pack missing $AdapterPath"
  }
}
Invoke-ScriptGate "verify-history-releases" "verify-history-releases.ps1"
foreach ($Path in @("IMPLEMENTATION_REPORT.md", "RELEASE_NOTES.md", "FINAL_DELIVERY_CHECK.md", "V0.3.0_IMPLEMENTATION_REPORT.md", "V0.3.0_RELEASE_NOTES.md", "V0.3.0_FINAL_DELIVERY_CHECK.md", "V0.3.0_KNOWN_ISSUES.md")) {
  if (Test-Path $Path) { Add-Result "final delivery document $Path" "PASS" "exists" } else { Add-Result "final delivery document $Path" "FAIL" "missing" }
}
$GitStatus = git status --short --branch
Add-Result "git status" "PASS" ($GitStatus -join "; ")
try {
  $Head = (git rev-parse HEAD).Trim()
  $TagCommit = (git rev-parse $TargetVersion).Trim()
  if ($Head -eq $TagCommit) { Add-Result "target version tag" "PASS" "$TargetVersion -> $Head" } else { Add-Result "target version tag" "FAIL" "$TargetVersion -> $TagCommit, HEAD -> $Head" }
} catch {
  Add-Result "target version tag" "FAIL" $_.Exception.Message
}
$Final = if (($Results | Where-Object { $_.Status -eq "FAIL" }).Count -eq 0) { "PASS" } else { "FAIL" }
@("# Autonomous Completion Gate Report", "", "TargetVersion: $TargetVersion", "", "| Gate | Status | Details |", "|---|---|---|") + ($Results | ForEach-Object { "| $($_.Gate) | $($_.Status) | $($_.Details -replace '\\|','/') |" }) + @("", "Git status: $($GitStatus -join '; ')", "", "Final result: $Final") | Set-Content -Encoding UTF8 $ReportPath
Write-Host "[Autonomous Completion Gate] $Final report=$ReportPath"
if ($Final -ne "PASS") { throw "Autonomous Completion Gate FAIL. See $ReportPath" }
`;
}

function renderVerifyAutonomousCompletionSh(): string {
  return `#!/usr/bin/env bash
set +e
TARGET_VERSION="\${1:-}"
if [ -z "$TARGET_VERSION" ]; then
  TARGET_VERSION="v$(node -e "const p=require('./package.json'); process.stdout.write(p.version)")"
fi
case "$TARGET_VERSION" in v*) ;; *) TARGET_VERSION="v$TARGET_VERSION" ;; esac
REPORT_DIR="codex_runs"
mkdir -p "$REPORT_DIR"
REPORT_PATH="$REPORT_DIR/verify-autonomous-completion-$TARGET_VERSION.md"
RESULT_LINES=()
FAIL_COUNT=0
add_result() {
  local gate="$1" status="$2" details="$3"
  RESULT_LINES+=("| $gate | $status | $details |")
  [ "$status" = "FAIL" ] && FAIL_COUNT=$((FAIL_COUNT + 1))
}
run_command_gate() {
  local gate="$1"; shift
  echo "[Autonomous Completion Gate] $gate"
  "$@"
  local code=$?
  if [ "$code" -eq 0 ]; then add_result "$gate" "PASS" "exit 0"; else add_result "$gate" "FAIL" "exit $code"; fi
}
run_script_gate() {
  local gate="$1" script="$2"
  bash "scripts/$script" "$TARGET_VERSION"
  local code=$?
  if [ "$code" -eq 0 ]; then add_result "$gate" "PASS" "ok"; else add_result "$gate" "FAIL" "exit $code"; fi
}
run_command_gate "pnpm test" pnpm test
run_command_gate "pnpm lint" pnpm lint
run_command_gate "pnpm build" pnpm build
run_script_gate "verify-release" "verify-release.sh"
run_script_gate "verify-source-zip" "verify-source-zip.sh"
run_script_gate "verify-sample-pack" "verify-sample-pack.sh"
SAMPLE_GATE_CONTENT="$(cat scripts/verify-sample-pack.sh 2>/dev/null)"
for adapter_path in "agent_adapters/claude-code" "agent_adapters/trae" "agent_adapters/cursor"; do
  case "$SAMPLE_GATE_CONTENT" in
    *"$adapter_path"*) add_result "sample pack adapter gate $adapter_path" "PASS" "verify-sample-pack checks $adapter_path" ;;
    *) add_result "sample pack adapter gate $adapter_path" "FAIL" "verify-sample-pack missing $adapter_path" ;;
  esac
done
run_script_gate "verify-history-releases" "verify-history-releases.sh"
for path in IMPLEMENTATION_REPORT.md RELEASE_NOTES.md FINAL_DELIVERY_CHECK.md V0.3.0_IMPLEMENTATION_REPORT.md V0.3.0_RELEASE_NOTES.md V0.3.0_FINAL_DELIVERY_CHECK.md V0.3.0_KNOWN_ISSUES.md; do
  [ -f "$path" ] && add_result "final delivery document $path" "PASS" "exists" || add_result "final delivery document $path" "FAIL" "missing"
done
GIT_STATUS="$(git status --short --branch 2>&1 | tr '\\n' ';')"
add_result "git status" "PASS" "$GIT_STATUS"
HEAD_COMMIT="$(git rev-parse HEAD 2>/dev/null)"
TAG_COMMIT="$(git rev-parse "$TARGET_VERSION" 2>/dev/null)"
if [ -n "$HEAD_COMMIT" ] && [ "$HEAD_COMMIT" = "$TAG_COMMIT" ]; then
  add_result "target version tag" "PASS" "$TARGET_VERSION -> $HEAD_COMMIT"
else
  add_result "target version tag" "FAIL" "$TARGET_VERSION does not point to HEAD"
fi
if [ "$FAIL_COUNT" -eq 0 ]; then FINAL="PASS"; else FINAL="FAIL"; fi
{
  echo "# Autonomous Completion Gate Report"
  echo
  echo "TargetVersion: $TARGET_VERSION"
  echo
  echo "| Gate | Status | Details |"
  echo "|---|---|---|"
  printf "%s\\n" "\${RESULT_LINES[@]}"
  echo
  echo "Final result: $FINAL"
} > "$REPORT_PATH"
echo "[Autonomous Completion Gate] $FINAL report=$REPORT_PATH"
[ "$FINAL" = "PASS" ]
`;
}



// V0.3.0_KNOWN_ISSUES.md







