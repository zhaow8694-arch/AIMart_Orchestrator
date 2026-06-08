#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR=".aimart_artifacts"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/aimart-orchestrator-v0.1-$STAMP.zip"

echo "[package] creating $OUT"

if command -v zip >/dev/null 2>&1; then
  zip -r "$OUT" . \
    -x "node_modules/*" ".next/*" "dist/*" "coverage/*" ".git/*" ".aimart/*" ".aimart_backups/*" ".aimart_artifacts/*" ".env*"
else
  tar \
    --exclude='./node_modules' \
    --exclude='./.next' \
    --exclude='./dist' \
    --exclude='./coverage' \
    --exclude='./.git' \
    --exclude='./.aimart' \
    --exclude='./.aimart_backups' \
    --exclude='./.aimart_artifacts' \
    --exclude='./.env*' \
    -czf "${OUT%.zip}.tar.gz" .
fi

echo "[package] done"
