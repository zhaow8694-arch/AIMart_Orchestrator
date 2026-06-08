#!/usr/bin/env bash
set -euo pipefail

PUSH=false
if [[ "${1:-}" == "--push" ]]; then
  PUSH=true
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[tag-release] not a git repo; skipping"
  exit 0
fi

VERSION=""
if [ -f package.json ] && command -v node >/dev/null 2>&1; then
  VERSION="$(node -e "try{const p=require('./package.json'); process.stdout.write(p.version||'')}catch(e){}")"
fi

if [ -z "$VERSION" ]; then
  VERSION="0.1.0-$(date +%Y%m%d%H%M)"
fi

TAG="v$VERSION"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "[tag-release] tag already exists: $TAG"
else
  git tag "$TAG"
  echo "[tag-release] created local tag: $TAG"
fi

if $PUSH; then
  printf '| %s | remote tag publish %s | L4 | Remote Git mutation requires explicit approval. | No | queued |\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TAG" >> APPROVAL_QUEUE.md
  echo "[tag-release] remote publish queued in APPROVAL_QUEUE.md"
else
  echo "[tag-release] remote push skipped. Use --push only after approval."
fi
