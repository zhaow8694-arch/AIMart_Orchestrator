#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/.aimart/logs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
LOG_PATH="$LOG_DIR/codex-autonomous-$STAMP.log"
PROMPT_PATH="$ROOT_DIR/agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"

echo "[codex-autonomous] sandbox=workspace-write approval=auto (approve-for-me)"
echo "[codex-autonomous] log=$LOG_PATH"

cat "$PROMPT_PATH" | codex exec \
  --approve-for-me \
  --skip-git-repo-check \
  --cd "$ROOT_DIR" 2>&1 | tee "$LOG_PATH"