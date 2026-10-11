#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bash scripts/preflight.sh
bash scripts/backup.sh
bash scripts/test.sh
bash scripts/git-cleanup.sh
bash scripts/tag-release.sh
bash scripts/package.sh
bash scripts/verify-autonomous-completion.sh

echo "[finalize] complete"