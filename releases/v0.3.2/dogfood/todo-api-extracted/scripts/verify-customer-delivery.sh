#!/usr/bin/env bash
set +e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
REPORT_PATH="$ROOT_DIR/runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md"
RESULT_LINES=()
FAIL_COUNT=0

add_check() {
  local gate="$1" status="$2" details="$3"
  RESULT_LINES+=("| $gate | $status | $details |")
  [ "$status" = "FAIL" ] && FAIL_COUNT=$((FAIL_COUNT + 1))
}

check_files() {
  local gate="$1"; shift
  local missing=""
  for path in "$@"; do
    [ -e "$path" ] || missing="$missing $path"
  done
  if [ -z "$missing" ]; then add_check "$gate" "PASS" "ok"; else add_check "$gate" "FAIL" "missing:$missing"; fi
}

check_no_open_p0p1() {
  local gate="$1"; shift
  local open=""
  for path in "$@"; do
    if [ -f "$path" ] && grep -Eq "P0|P1" "$path" && ! grep -Eq "No open P0/P1|closed|resolved" "$path"; then
      open="$open $path"
    fi
  done
  if [ -z "$open" ]; then add_check "$gate" "PASS" "no open P0/P1 blockers"; else add_check "$gate" "FAIL" "open P0/P1 blockers in$open"; fi
}

check_lifecycle() {
  local required missing code
  required="runtime/FULL_LIFECYCLE_RUN_STATE.json runtime/VERSION_LADDER.json runtime/PHASE_STATUS.json runtime/CURRENT_PHASE.md runtime/NEXT_ACTION.md runtime/FINAL_DELIVERY_STATUS.md runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md"
  missing=""
  for path in $required; do
    [ -e "$path" ] || missing="$missing $path"
  done
  if [ -n "$missing" ]; then
    add_check "lifecycle state files are present and coherent" "FAIL" "missing:$missing"
    return
  fi
  node <<'NODE'
const fs = require('fs');
const state = JSON.parse(fs.readFileSync('runtime/FULL_LIFECYCLE_RUN_STATE.json', 'utf8'));
const ladder = JSON.parse(fs.readFileSync('runtime/VERSION_LADDER.json', 'utf8'));
const phases = JSON.parse(fs.readFileSync('runtime/PHASE_STATUS.json', 'utf8'));
if (!ladder.versions.some((entry) => entry.version === state.currentTargetVersion)) process.exit(1);
if (!phases.phases.some((entry) => entry.phase === state.currentLifecyclePhase)) process.exit(1);
NODE
  code=$?
  if [ "$code" = "0" ]; then add_check "lifecycle state files are present and coherent" "PASS" "JSON parsed and current phase/version are coherent"; else add_check "lifecycle state files are present and coherent" "FAIL" "state does not match ladder or phase status"; fi
}

check_selected_adapter_runbook() {
  local adapter runbook
  adapter="$(node -e "const fs=require('fs'); const s=JSON.parse(fs.readFileSync('runtime/FULL_LIFECYCLE_RUN_STATE.json','utf8')); process.stdout.write(s.selectedAdapterId || 'codex')" 2>/dev/null || echo codex)"
  case "$adapter" in
    claude-code) runbook="agent_adapters/claude-code/CLAUDE_RUNBOOK.md" ;;
    trae) runbook="agent_adapters/trae/TRAE_RUNBOOK.md" ;;
    cursor) runbook="agent_adapters/cursor/CURSOR_RUNBOOK.md" ;;
    *) runbook="agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md" ;;
  esac
  if [ -f "$runbook" ]; then add_check "selected adapter runbook exists" "PASS" "$runbook"; else add_check "selected adapter runbook exists" "FAIL" "missing: $runbook"; fi
}

check_files "generated project files" common/PROJECT_SPEC.md common/TASK_QUEUE.md common/EXECUTION_RULES.md
check_files "generated docs" docs/README.md docs/RUN_APP.md docs/SECURITY_AND_PERMISSIONS.md
check_files "tests/build instructions" scripts/test.ps1 scripts/test.sh runtime/INSTALL_PLAN.md
check_files "final artifact instructions" scripts/package.ps1 scripts/package.sh scripts/finalize.ps1 scripts/finalize.sh
check_no_open_p0p1 "BLOCKERS.md has no open P0/P1 blockers" common/BLOCKERS.md BLOCKERS.md
check_no_open_p0p1 "KNOWN_ISSUES has no P0/P1 blockers" common/KNOWN_ISSUES.md KNOWN_ISSUES.md
check_lifecycle
check_selected_adapter_runbook
check_files "completion gate report exists" runtime/COMPLETION_GATE_REPORT.md

if [ "$FAIL_COUNT" = "0" ]; then FINAL="PASS"; else FINAL="FAIL"; fi
{
  echo "# Customer Runtime Validation Report"
  echo
  echo "| Gate | Status | Notes |"
  echo "|---|---|---|"
  printf "%s\n" "${RESULT_LINES[@]}"
  echo
  echo "Final result: $FINAL"
} > "$REPORT_PATH"
echo "[verify-customer-delivery] $FINAL report=$REPORT_PATH"
[ "$FINAL" = "PASS" ]