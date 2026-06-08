#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[test] running checks"

if [ -f package.json ]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm lint
    pnpm test
    pnpm build
  else
    echo "[test] pnpm not found"
    exit 1
  fi
else
  echo "[test] package.json not found; skipping Node checks"
fi

echo "[test] done"
