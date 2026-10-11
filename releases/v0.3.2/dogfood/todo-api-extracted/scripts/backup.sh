#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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

if [ "${#ITEMS[@]}" -gt 0 ]; then
  if command -v zip >/dev/null 2>&1; then
    zip -qr "$ARCHIVE" "${ITEMS[@]}"
    echo "[backup] $ARCHIVE"
  else
    echo "[backup] zip command unavailable; skipping archive" >&2
  fi
else
  echo "[backup] no project-local files found to archive"
fi