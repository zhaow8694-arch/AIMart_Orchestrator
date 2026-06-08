#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[preflight] root: $ROOT_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[preflight] missing command: $1" >&2
    exit 1
  fi
  echo "[preflight] found command: $1"
}

require_cmd git
require_cmd node
require_cmd pnpm

if [ -f package.json ]; then
  echo "[preflight] package.json found"
else
  echo "[preflight] package.json not found" >&2
  exit 1
fi

echo "[preflight] done"
