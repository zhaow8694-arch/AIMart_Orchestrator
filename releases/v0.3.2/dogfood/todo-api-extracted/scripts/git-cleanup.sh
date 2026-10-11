#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -d ".git" ]; then
  git status --short
else
  echo "[git-cleanup] no git repository; skipping status"
fi