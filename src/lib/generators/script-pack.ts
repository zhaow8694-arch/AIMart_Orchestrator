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
for command_name in node pnpm git; do
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

if [ "\${#ITEMS[@]}" -gt 0 ] && command -v zip >/dev/null 2>&1; then
  zip -qr "$ARCHIVE" "\${ITEMS[@]}"
  echo "[package] $ARCHIVE"
else
  echo "[package] no generated pack directories found or zip unavailable"
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

echo "[finalize] complete"
`;
}
