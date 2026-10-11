#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/codex_runs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
LOG_PATH="$LOG_DIR/codex-end-to-end-autonomous-$STAMP.log"
PROMPT_PATH="$ROOT_DIR/agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md"

echo "[codex-end-to-end] End-to-End Autonomous Delivery"
echo "[codex-end-to-end] sandbox=workspace-write approval=auto (approve-for-me)"
echo "[codex-end-to-end] log=$LOG_PATH"
echo "[codex-end-to-end] phase plan=common/PHASE_GATE_PLAN.md"
echo "[codex-end-to-end] final result must be PASS or FAIL in runtime/COMPLETION_GATE_REPORT.md"

cat "$PROMPT_PATH" | codex exec \
  --approve-for-me \
  --skip-git-repo-check \
  --cd "$ROOT_DIR" 2>&1 | tee "$LOG_PATH"
code="${PIPESTATUS[0]}"
echo "[codex-end-to-end] Codex exit code: $code"
echo "[codex-end-to-end] Check runtime/RUN_STATE.json, runtime/PHASE_GATE_REPORT.md, and runtime/COMPLETION_GATE_REPORT.md"
exit "$code"