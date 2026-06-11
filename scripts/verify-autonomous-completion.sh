#!/usr/bin/env bash
set +e

TARGET_VERSION="${1:-}"
if [ -z "$TARGET_VERSION" ]; then
  TARGET_VERSION="v$(node -e "const p=require('./package.json'); process.stdout.write(p.version)")"
fi
case "$TARGET_VERSION" in
  v*) ;;
  *) TARGET_VERSION="v$TARGET_VERSION" ;;
esac

REPORT_DIR="codex_runs"
mkdir -p "$REPORT_DIR"
REPORT_PATH="$REPORT_DIR/verify-autonomous-completion-$TARGET_VERSION.md"
KNOWN_ISSUES_PATH="V0.2.2_KNOWN_ISSUES.md"
RESULT_LINES=()
FAILURES=()

add_result() {
  local gate="$1" status="$2" details="$3"
  RESULT_LINES+=("| $gate | $status | ${details//|//} |")
  if [ "$status" = "FAIL" ]; then
    FAILURES+=("- $gate: $details")
  fi
}

run_command_gate() {
  local gate="$1"
  shift
  echo "[Autonomous Completion Gate] $gate"
  "$@"
  local code=$?
  if [ "$code" -eq 0 ]; then
    add_result "$gate" "PASS" "exit 0"
  else
    add_result "$gate" "FAIL" "exit $code"
  fi
}

run_script_gate() {
  local gate="$1" script="$2"
  echo "[Autonomous Completion Gate] $gate"
  bash "scripts/$script" "$TARGET_VERSION"
  local code=$?
  if [ "$code" -eq 0 ]; then
    add_result "$gate" "PASS" "ok"
  else
    add_result "$gate" "FAIL" "exit $code"
  fi
}

run_command_gate "pnpm test" pnpm test
run_command_gate "pnpm lint" pnpm lint
run_command_gate "pnpm build" pnpm build

run_script_gate "release artifacts and SHA256 values" "verify-release.sh"
run_script_gate "source ZIP exclusions" "verify-source-zip.sh"
run_script_gate "sample execution-pack contents" "verify-sample-pack.sh"
run_script_gate "historical release protection" "verify-history-releases.sh"

for path in \
  IMPLEMENTATION_REPORT.md \
  RELEASE_NOTES.md \
  FINAL_DELIVERY_CHECK.md \
  V0.2.2_IMPLEMENTATION_REPORT.md \
  V0.2.2_RELEASE_NOTES.md \
  V0.2.2_FINAL_DELIVERY_CHECK.md \
  V0.2.2_KNOWN_ISSUES.md; do
  if [ -f "$path" ]; then
    add_result "final delivery document $path" "PASS" "exists"
  else
    add_result "final delivery document $path" "FAIL" "missing"
  fi
done

GIT_STATUS="$(git status --short --branch 2>&1)"
add_result "git status" "PASS" "$(printf "%s" "$GIT_STATUS" | tr '\n' ';')"

HEAD_COMMIT="$(git rev-parse HEAD 2>/dev/null)"
TAG_COMMIT="$(git rev-parse "$TARGET_VERSION" 2>/dev/null)"
if [ -n "$HEAD_COMMIT" ] && [ "$HEAD_COMMIT" = "$TAG_COMMIT" ]; then
  add_result "target version tag" "PASS" "$TARGET_VERSION -> $HEAD_COMMIT"
else
  add_result "target version tag" "FAIL" "$TARGET_VERSION does not point to HEAD"
fi

if [ "${#FAILURES[@]}" -eq 0 ]; then
  FINAL_STATUS="PASS"
else
  FINAL_STATUS="FAIL"
fi

{
  echo "# Autonomous Completion Gate Report"
  echo
  echo "TargetVersion: $TARGET_VERSION"
  echo "GeneratedAt: $(date -Iseconds)"
  echo
  echo "## Gate Results"
  echo
  echo "| Gate | Status | Details |"
  echo "|---|---|---|"
  printf "%s\n" "${RESULT_LINES[@]}"
  echo
  echo "## Git Status"
  echo
  echo '```text'
  printf "%s\n" "$GIT_STATUS"
  echo '```'
  echo
  echo "Final result: $FINAL_STATUS"
} > "$REPORT_PATH"

if [ "$FINAL_STATUS" = "FAIL" ]; then
  {
    echo "# V0.2.2 Known Issues"
    echo
    echo "Autonomous Completion Gate result: FAIL"
    echo
    echo "Report: $REPORT_PATH"
    echo
    echo "## Failed Gates"
    echo
    printf "%s\n" "${FAILURES[@]}"
  } > "$KNOWN_ISSUES_PATH"
  echo "[Autonomous Completion Gate] FAIL report=$REPORT_PATH"
  printf "Failed gate(s):\n"
  printf "%s\n" "${FAILURES[@]}"
  exit 1
fi

echo "[Autonomous Completion Gate] PASS report=$REPORT_PATH"
exit 0
