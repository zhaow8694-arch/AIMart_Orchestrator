#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
VERSION="$(node -e "try{const p=require('./package.json'); process.stdout.write(p.version || '0.1.1')}catch(e){process.stdout.write('0.1.1')}")"
OUT_DIR=".aimart_artifacts"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/aimart-orchestrator-v$VERSION-$STAMP.zip"

echo "[package] creating $OUT"

zip -r "$OUT" . \
  -x "node_modules/*" ".next/*" "dist/*" "coverage/*" ".git/*" \
  -x ".aimart" ".aimart/*" ".aimart_backups" ".aimart_backups/*" \
  -x ".aimart_artifacts" ".aimart_artifacts/*" "releases" "releases/*" ".env*"

echo "[package] done"
