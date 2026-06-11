#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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

if [ "${#ITEMS[@]}" -gt 0 ]; then
  zip -qr "$ARCHIVE" "${ITEMS[@]}"
  echo "[package] $ARCHIVE"
else
  echo "[package] no generated pack directories found"
fi