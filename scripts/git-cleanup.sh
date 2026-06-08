#!/usr/bin/env bash
set -euo pipefail

DELETE_MERGED=false
if [[ "${1:-}" == "--delete-merged" ]]; then
  DELETE_MERGED=true
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[git-cleanup] checking git repository"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[git-cleanup] not a git repo; skipping"
  exit 0
fi

git status --short

if $DELETE_MERGED; then
  printf '| %s | delete merged local branches | L2 | Branch deletion requested during cleanup. | No | queued |\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> APPROVAL_QUEUE.md
  echo "[git-cleanup] branch deletion queued in APPROVAL_QUEUE.md"
else
  echo "[git-cleanup] merged branch deletion skipped. Use --delete-merged only after approval."
fi

echo "[git-cleanup] done"
