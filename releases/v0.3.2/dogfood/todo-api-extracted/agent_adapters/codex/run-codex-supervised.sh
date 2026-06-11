#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/.aimart/logs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
LOG_PATH="$LOG_DIR/codex-supervised-$STAMP.log"
PROMPT_PATH="$ROOT_DIR/agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"

echo "[codex-supervised] sandbox=workspace-write approval=on-request"
echo "[codex-supervised] log=$LOG_PATH"

codex exec \
  --sandbox workspace-write \
  --approval on-request \
  --cd "$ROOT_DIR" \
  --prompt-file "$PROMPT_PATH" 2>&1 | tee "$LOG_PATH"