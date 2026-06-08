#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR=".aimart_backups/$STAMP"
mkdir -p "$BACKUP_DIR"

echo "[backup] creating backup at $BACKUP_DIR"

# Backup project files while excluding heavy or sensitive directories.
tar \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./dist' \
  --exclude='./coverage' \
  --exclude='./.git' \
  --exclude='./.aimart_backups' \
  --exclude='./.env' \
  --exclude='./.env.*' \
  -czf "$BACKUP_DIR/project.tar.gz" .

echo "[backup] done: $BACKUP_DIR/project.tar.gz"
