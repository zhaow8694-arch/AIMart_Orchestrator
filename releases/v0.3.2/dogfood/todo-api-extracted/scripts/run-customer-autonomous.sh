#!/usr/bin/env bash
set -euo pipefail
MODE="${1:-autonomous}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# one-window display fields: project name, selected AI adapter, current lifecycle phase,
# current target version, current task, log updated time, release output status,
# completion gate status, blocked/known issue status, final PASS or FAIL summary.

STATE_PATH="$ROOT_DIR/runtime/FULL_LIFECYCLE_RUN_STATE.json"
VALIDATION_SCRIPT="$ROOT_DIR/scripts/verify-customer-delivery.sh"
RUN_DIR="$ROOT_DIR/codex_runs"
mkdir -p "$RUN_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
LOG_PATH="$RUN_DIR/customer-$MODE-$STAMP.log"

json_value() {
  local key="$1"
  if [ -f "$STATE_PATH" ]; then
    node -e "const s=JSON.parse(require('fs').readFileSync('$STATE_PATH','utf8')); process.stdout.write(String(s['$key'] ?? 'unknown'))" 2>/dev/null || printf "%s" "unknown"
  else
    printf "%s" "unknown"
  fi
}

release_output_status() {
  local count
  count="$(find artifacts releases -type f -name "*.zip" 2>/dev/null | wc -l | tr -d " ")"
  if [ "$count" = "0" ]; then printf "%s" "pending"; else printf "%s" "$count zip artifact(s)"; fi
}

blocked_known_issue_status() {
  local paths open
  paths="common/BLOCKERS.md BLOCKERS.md common/KNOWN_ISSUES.md KNOWN_ISSUES.md"
  open=""
  for path in $paths; do
    if [ -f "$path" ] && grep -Eq "P0|P1" "$path" && ! grep -Eq "No open P0/P1|closed|resolved" "$path"; then
      open="$open $path"
    fi
  done
  if [ -n "$open" ]; then printf "open P0/P1 in%s" "$open"; else printf "%s" "none"; fi
}

show_dashboard() {
  local state="$1" final_result="${2:-pending}"
  clear || true
  printf "%s\n" "AIMart Customer Runtime Runner"
  printf "%s\n\n" "one-window customer dashboard"
  printf "project name: %s\n" "$(json_value projectName)"
  printf "selected AI adapter: %s\n" "$(json_value selectedAdapterId)"
  printf "current lifecycle phase: %s\n" "$(json_value currentLifecyclePhase)"
  printf "current target version: %s\n" "$(json_value currentTargetVersion)"
  printf "current task: %s\n" "$(json_value currentTask)"
  printf "log updated time: %s\n" "$(date -Iseconds)"
  printf "release output status: %s\n" "$(release_output_status)"
  printf "completion gate status: %s\n" "$(json_value completionGateStatus)"
  printf "blocked/known issue status: %s\n" "$(blocked_known_issue_status)"
  printf "runner state: %s\n" "$state"
  printf "log: %s\n" "$LOG_PATH"
  printf "final PASS or FAIL summary: %s\n" "$final_result"
}

show_dashboard "starting"
if [ "$MODE" = "supervised" ]; then
  ADAPTER_SCRIPT="$ROOT_DIR/agent_adapters/codex/run-codex-supervised.sh"
else
  ADAPTER_SCRIPT="$ROOT_DIR/agent_adapters/codex/run-codex-end-to-end-autonomous.sh"
fi

ADAPTER_EXIT_CODE=0
if [ "${SKIP_ADAPTER_RUN:-0}" != "1" ]; then
  [ -f "$ADAPTER_SCRIPT" ] || { echo "Missing selected adapter launcher: $ADAPTER_SCRIPT" >&2; exit 1; }
  set +e
  bash "$ADAPTER_SCRIPT" 2>&1 | tee "$LOG_PATH"
  ADAPTER_EXIT_CODE="${PIPESTATUS[0]}"
  set -e
fi

show_dashboard "verifying"
VALIDATION_EXIT_CODE=1
if [ -f "$VALIDATION_SCRIPT" ]; then
  set +e
  bash "$VALIDATION_SCRIPT"
  VALIDATION_EXIT_CODE="$?"
  set -e
else
  echo "Missing customer validation script: $VALIDATION_SCRIPT" >&2
fi

if [ "$ADAPTER_EXIT_CODE" = "0" ] && [ "$VALIDATION_EXIT_CODE" = "0" ]; then FINAL_RESULT="PASS"; else FINAL_RESULT="FAIL"; fi
show_dashboard "completed" "$FINAL_RESULT"
printf "\n%s\n" "Final Summary"
printf "%s\n" "-------------"
printf "selected AI adapter: codex\n"
printf "adapter exit code: %s\n" "$ADAPTER_EXIT_CODE"
printf "customer delivery verification exit code: %s\n" "$VALIDATION_EXIT_CODE"
printf "final PASS or FAIL summary: %s\n" "$FINAL_RESULT"

[ "$FINAL_RESULT" = "PASS" ]