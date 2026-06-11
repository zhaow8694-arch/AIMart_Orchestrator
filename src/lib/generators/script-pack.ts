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
  "EXECUTION_PACK_MANIFEST.md",
  "common/PROJECT_SPEC.md", "common/TASK_QUEUE.md", "common/EXECUTION_RULES.md",
  "common/AUTONOMOUS_DELIVERY_ROADMAP.md", "common/VERSION_LADDER.md",
  "common/PHASE_GATE_PLAN.md", "common/CURRENT_PHASE.md",
  "runtime/SAFE_COMMANDS.md", "runtime/DENIED_COMMANDS.md", "runtime/APPROVAL_QUEUE.md",
  "runtime/AUTONOMOUS_EXECUTION_POLICY.md", "runtime/AUTONOMOUS_RUN_STATUS.md",
  "runtime/AUTONOMOUS_RUN_SUMMARY.md", "runtime/AUTONOMOUS_HEALTH_CHECK.md",
  "runtime/AUTONOMOUS_COMPLETION_GATE.md", "runtime/AUTONOMOUS_VERIFICATION_REPORT.md",
  "runtime/END_TO_END_AUTONOMOUS_POLICY.md", "runtime/RUN_STATE.json",
  "runtime/CURRENT_TASK.md", "runtime/PHASE_GATE_REPORT.md",
  "runtime/COMPLETION_GATE_REPORT.md", "runtime/MORNING_REPORT.md",
  "runtime/HANDOFF_TO_NEXT_VERSION.md",
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
  "EXECUTION_PACK_MANIFEST.md"
  "common/PROJECT_SPEC.md" "common/TASK_QUEUE.md" "common/EXECUTION_RULES.md"
  "common/AUTONOMOUS_DELIVERY_ROADMAP.md" "common/VERSION_LADDER.md"
  "common/PHASE_GATE_PLAN.md" "common/CURRENT_PHASE.md"
  "runtime/SAFE_COMMANDS.md" "runtime/DENIED_COMMANDS.md" "runtime/APPROVAL_QUEUE.md"
  "runtime/AUTONOMOUS_EXECUTION_POLICY.md" "runtime/AUTONOMOUS_RUN_STATUS.md"
  "runtime/AUTONOMOUS_RUN_SUMMARY.md" "runtime/AUTONOMOUS_HEALTH_CHECK.md"
  "runtime/AUTONOMOUS_COMPLETION_GATE.md" "runtime/AUTONOMOUS_VERIFICATION_REPORT.md"
  "runtime/END_TO_END_AUTONOMOUS_POLICY.md" "runtime/RUN_STATE.json"
  "runtime/CURRENT_TASK.md" "runtime/PHASE_GATE_REPORT.md"
  "runtime/COMPLETION_GATE_REPORT.md" "runtime/MORNING_REPORT.md"
  "runtime/HANDOFF_TO_NEXT_VERSION.md"
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
node -e "JSON.parse(require('fs').readFileSync('$TEMP_DIR/runtime/RUN_STATE.json','utf8'))"
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
$Frozen = @("releases/v0.1.0", "releases/v0.1.1", "releases/v0.2.1", "releases/v0.2.2")
foreach ($Path in $Frozen) {
  if (-not (Test-Path $Path)) { throw "Missing frozen historical release folder: $Path" }
}
$Dirty = @()
$Dirty += git diff --name-only -- $Frozen
$Dirty += git diff --cached --name-only -- $Frozen
if ($Dirty.Count -gt 0) { throw "Historical releases modified: $($Dirty -join ', ')" }
if ((git tag --list v0.2.2).Trim()) {
  $ChangedSince = @(git diff --name-only v0.2.2 HEAD -- $Frozen)
  if ($ChangedSince.Count -gt 0) { throw "Historical release changes since v0.2.2: $($ChangedSince -join ', ')" }
}
Write-Host "[verify-history-releases] PASS"
`;
}

function renderVerifyHistoryReleasesSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
TARGET_VERSION="\${1:-}"
echo "[Autonomous Completion Gate] verify-history-releases TargetVersion=$TARGET_VERSION"
frozen=("releases/v0.1.0" "releases/v0.1.1" "releases/v0.2.1" "releases/v0.2.2")
for path in "\${frozen[@]}"; do
  [ -d "$path" ] || { echo "Missing frozen historical release folder: $path" >&2; exit 1; }
done
if [ -n "$(git diff --name-only -- "\${frozen[@]}")" ] || [ -n "$(git diff --cached --name-only -- "\${frozen[@]}")" ]; then
  echo "Historical releases modified" >&2
  exit 1
fi
if git tag --list v0.2.2 | grep -q '^v0.2.2$'; then
  if [ -n "$(git diff --name-only v0.2.2 HEAD -- "\${frozen[@]}")" ]; then
    echo "Historical release changes since v0.2.2" >&2
    exit 1
  fi
fi
echo "[verify-history-releases] PASS"
`;
}

function renderVerifyAutonomousCompletionPs1(): string {
  return `param([string]$TargetVersion = "")
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
