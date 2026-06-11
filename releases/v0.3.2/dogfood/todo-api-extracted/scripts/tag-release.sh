#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d ".git" ]; then
  echo "[tag-release] no git repository; skipping local tag"
  exit 0
fi

TAG="v0.1.0-$(date +%Y%m%d%H%M)"
if git tag --list "$TAG" | grep -q "$TAG"; then
  echo "[tag-release] local tag already exists: $TAG"
else
  git tag "$TAG"
  echo "[tag-release] created local tag: $TAG"
fi
echo "[tag-release] remote publishing is out of scope by default"