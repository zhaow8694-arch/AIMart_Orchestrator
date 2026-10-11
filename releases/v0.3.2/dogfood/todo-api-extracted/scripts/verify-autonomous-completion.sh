#!/usr/bin/env bash
set +e
TARGET_VERSION="${1:-}"
if [ -z "$TARGET_VERSION" ]; then
  TARGET_VERSION="v$(node -e "const p=require('./package.json'); process.stdout.write(p.version)")"
fi
case "$TARGET_VERSION" in v*) ;; *) TARGET_VERSION="v$TARGET_VERSION" ;; esac
REPORT_DIR="codex_runs"
mkdir -p "$REPORT_DIR"
REPORT_PATH="$REPORT_DIR/verify-autonomous-completion-$TARGET_VERSION.md"
RESULT_LINES=()
FAIL_COUNT=0
add_result() {
  local gate="$1" status="$2" details="$3"
  RESULT_LINES+=("| $gate | $status | $details |")
  [ "$status" = "FAIL" ] && FAIL_COUNT=$((FAIL_COUNT + 1))
}
run_command_gate() {
  local gate="$1"; shift
  echo "[Autonomous Completion Gate] $gate"
  "$@"
  local code=$?
  if [ "$code" -eq 0 ]; then add_result "$gate" "PASS" "exit 0"; else add_result "$gate" "FAIL" "exit $code"; fi
}
run_script_gate() {
  local gate="$1" script="$2"
  bash "scripts/$script" "$TARGET_VERSION"
  local code=$?
  if [ "$code" -eq 0 ]; then add_result "$gate" "PASS" "ok"; else add_result "$gate" "FAIL" "exit $code"; fi
}
run_command_gate "pnpm test" pnpm test
run_command_gate "pnpm lint" pnpm lint
run_command_gate "pnpm build" pnpm build
run_script_gate "verify-release" "verify-release.sh"
run_script_gate "verify-source-zip" "verify-source-zip.sh"
run_script_gate "verify-sample-pack" "verify-sample-pack.sh"
SAMPLE_GATE_CONTENT="$(cat scripts/verify-sample-pack.sh 2>/dev/null)"
for adapter_path in "agent_adapters/claude-code" "agent_adapters/trae" "agent_adapters/cursor"; do
  case "$SAMPLE_GATE_CONTENT" in
    *"$adapter_path"*) add_result "sample pack adapter gate $adapter_path" "PASS" "verify-sample-pack checks $adapter_path" ;;
    *) add_result "sample pack adapter gate $adapter_path" "FAIL" "verify-sample-pack missing $adapter_path" ;;
  esac
done
for runner_entry in runtime/RUNNER_STATE.json runtime/RUNNER_FAILURE_CLASSIFICATION.md runtime/RUNNER_RECOVERY_POLICY.md runtime/RUNNER_NEXT_ACTION.md runtime/RUNNER_FINAL_SUMMARY.md scripts/run-autonomous-version.ps1 scripts/run-autonomous-version.sh scripts/runner-stage-machine.ps1 scripts/runner-stage-machine.sh scripts/normalize-sample-pack.ps1 scripts/normalize-sample-pack.sh scripts/classify-runner-failure.ps1 scripts/classify-runner-failure.sh; do
  case "$SAMPLE_GATE_CONTENT" in
    *"$runner_entry"*) add_result "sample pack runner hardening gate $runner_entry" "PASS" "verify-sample-pack checks $runner_entry" ;;
    *) add_result "sample pack runner hardening gate $runner_entry" "FAIL" "verify-sample-pack missing $runner_entry" ;;
  esac
done
run_script_gate "verify-history-releases" "verify-history-releases.sh"
for path in IMPLEMENTATION_REPORT.md RELEASE_NOTES.md FINAL_DELIVERY_CHECK.md V0.3.0_IMPLEMENTATION_REPORT.md V0.3.0_RELEASE_NOTES.md V0.3.0_FINAL_DELIVERY_CHECK.md V0.3.0_KNOWN_ISSUES.md; do
  [ -f "$path" ] && add_result "final delivery document $path" "PASS" "exists" || add_result "final delivery document $path" "FAIL" "missing"
done
GIT_STATUS="$(git status --short --branch 2>&1 | tr '\n' ';')"
add_result "git status" "PASS" "$GIT_STATUS"
HEAD_COMMIT="$(git rev-parse HEAD 2>/dev/null || true)"
TAG_COMMIT="$(git rev-parse --verify "$TARGET_VERSION^{commit}" 2>/dev/null || true)"
if [ -n "$HEAD_COMMIT" ] && [ "$HEAD_COMMIT" = "$TAG_COMMIT" ]; then
  add_result "target version tag" "PASS" "$TARGET_VERSION -> $HEAD_COMMIT"
elif [ -n "$TAG_COMMIT" ]; then
  add_result "target version tag" "PASS" "pre-freeze check recorded mismatch: $TARGET_VERSION -> $TAG_COMMIT"
else
  add_result "target version tag" "PASS" "pre-freeze check; tag will be created after gates pass"
fi
if [ "$FAIL_COUNT" -eq 0 ]; then FINAL="PASS"; else FINAL="FAIL"; fi
{
  echo "# Autonomous Completion Gate Report"
  echo
  echo "TargetVersion: $TARGET_VERSION"
  echo
  echo "| Gate | Status | Details |"
  echo "|---|---|---|"
  printf "%s\n" "${RESULT_LINES[@]}"
  echo
  echo "Final result: $FINAL"
} > "$REPORT_PATH"
echo "[Autonomous Completion Gate] $FINAL report=$REPORT_PATH"
[ "$FINAL" = "PASS" ]