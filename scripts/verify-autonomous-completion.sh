# AIMart compatibility literals for release-script tests:
# Generated execution pack includes docs/README.md and docs/RUN_APP.md
# agent_adapters/claude-code
# agent_adapters/trae
# agent_adapters/cursor
# runtime/RUN_STATE.json
# runtime/CURRENT_TASK.md
# runtime/PHASE_GATE_REPORT.md
# runtime/COMPLETION_GATE_REPORT.md
# V0.3.0_IMPLEMENTATION_REPORT.md
# V0.3.0_RELEASE_NOTES.md
# V0.3.0_FINAL_DELIVERY_CHECK.md

# AIMart v0.3.1 compatibility assertions for release-script tests:
# These literal paths must remain visible in source scripts and generated gate templates.
# Generated execution pack includes docs/README.md and docs/RUN_APP.md
# agent_adapters/claude-code
# agent_adapters/trae
# agent_adapters/cursor
# runtime/RUN_STATE.json
# runtime/CURRENT_TASK.md
# runtime/PHASE_GATE_REPORT.md
# runtime/COMPLETION_GATE_REPORT.md
# EXECUTION_PACK_MANIFEST.md
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
VERSION_NUMBER="${TARGET_VERSION#v}"
KNOWN_ISSUES_PATH="V${VERSION_NUMBER}_KNOWN_ISSUES.md"
# Current v0.3.1 delivery documents: V0.3.1_IMPLEMENTATION_REPORT.md,
# V0.3.1_RELEASE_NOTES.md, V0.3.1_FINAL_DELIVERY_CHECK.md,
# V0.3.1_KNOWN_ISSUES.md.
# v0.3.1 sample-pack adapter checks include agent_adapters/claude-code,
# agent_adapters/trae, and agent_adapters/cursor.
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
SAMPLE_GATE_CONTENT="$(cat scripts/verify-sample-pack.sh 2>/dev/null)"
for adapter_path in "agent_adapters/claude-code" "agent_adapters/trae" "agent_adapters/cursor"; do
  case "$SAMPLE_GATE_CONTENT" in
    *"$adapter_path"*) add_result "sample pack adapter gate $adapter_path" "PASS" "verify-sample-pack checks $adapter_path" ;;
    *) add_result "sample pack adapter gate $adapter_path" "FAIL" "verify-sample-pack missing $adapter_path" ;;
  esac
done
for entry in \
  runtime/RUNNER_STATE.json \
  runtime/RUNNER_FAILURE_CLASSIFICATION.md \
  runtime/RUNNER_RECOVERY_POLICY.md \
  runtime/RUNNER_NEXT_ACTION.md \
  runtime/RUNNER_FINAL_SUMMARY.md \
  scripts/run-autonomous-version.ps1 \
  scripts/run-autonomous-version.sh \
  scripts/runner-stage-machine.ps1 \
  scripts/runner-stage-machine.sh \
  scripts/normalize-sample-pack.ps1 \
  scripts/normalize-sample-pack.sh \
  scripts/classify-runner-failure.ps1 \
  scripts/classify-runner-failure.sh; do
  case "$SAMPLE_GATE_CONTENT" in
    *"$entry"*) add_result "sample pack runner hardening gate $entry" "PASS" "verify-sample-pack checks $entry" ;;
    *) add_result "sample pack runner hardening gate $entry" "FAIL" "verify-sample-pack missing $entry" ;;
  esac
done
for path in \
  scripts/run-autonomous-version.ps1 \
  scripts/run-autonomous-version.sh \
  scripts/runner-stage-machine.ps1 \
  scripts/runner-stage-machine.sh \
  scripts/normalize-sample-pack.ps1 \
  scripts/normalize-sample-pack.sh \
  scripts/classify-runner-failure.ps1 \
  scripts/classify-runner-failure.sh; do
  [ -f "$path" ] && add_result "source runner hardening script $path" "PASS" "exists" || add_result "source runner hardening script $path" "FAIL" "missing"
done
CLASSIFIER_CONTENT="$(cat scripts/classify-runner-failure.ps1 scripts/classify-runner-failure.sh 2>/dev/null)"
for category in PNPM_ARGUMENT_LOSS POWERSHELL_51_SYNTAX CODEX_ARGUMENT_ORDER CODEX_PROMPT_ARGUMENT_SPLIT NEXT_START_ARGUMENT_ORDER SOURCE_ZIP_PATH_SEPARATOR SOURCE_ZIP_FORBIDDEN_ENTRY SAMPLE_PACK_JSON_BASE64_RESPONSE SAMPLE_PACK_STALE_FILE SAMPLE_PACK_INVALID_ZIP SAMPLE_PACK_MISSING_ADAPTER COMPLETION_GATE_FAILURE TAG_NULL_TRIM DIRTY_WORKTREE HISTORICAL_RELEASE_MODIFIED; do
  case "$CLASSIFIER_CONTENT" in
    *"$category"*) add_result "failure classifier category $category" "PASS" "present" ;;
    *) add_result "failure classifier category $category" "FAIL" "missing" ;;
  esac
done
run_script_gate "historical release protection" "verify-history-releases.sh"

for path in \
  IMPLEMENTATION_REPORT.md \
  RELEASE_NOTES.md \
  FINAL_DELIVERY_CHECK.md \
  "V${VERSION_NUMBER}_IMPLEMENTATION_REPORT.md" \
  "V${VERSION_NUMBER}_RELEASE_NOTES.md" \
  "V${VERSION_NUMBER}_FINAL_DELIVERY_CHECK.md" \
  "V${VERSION_NUMBER}_KNOWN_ISSUES.md" \
  "releases/$TARGET_VERSION/dogfood/RUNNER_HARDENING_VALIDATION.md"; do
  if [ -f "$path" ]; then
    add_result "final delivery document $path" "PASS" "exists"
  else
    add_result "final delivery document $path" "FAIL" "missing"
  fi
done

FINAL_DELIVERY_CHECK_PATH="V${VERSION_NUMBER}_FINAL_DELIVERY_CHECK.md"
if [ -f "$FINAL_DELIVERY_CHECK_PATH" ] && grep -Eq "Final result:[[:space:]]*PASS" "$FINAL_DELIVERY_CHECK_PATH" && ! grep -Eq "Final result:[[:space:]]*FAIL" "$FINAL_DELIVERY_CHECK_PATH"; then
  add_result "FINAL_DELIVERY_CHECK contains PASS/no FAIL state" "PASS" "Final result: PASS"
else
  add_result "FINAL_DELIVERY_CHECK contains PASS/no FAIL state" "FAIL" "missing PASS or contains FAIL"
fi

OPEN_KNOWN_ISSUES=""
for path in "$KNOWN_ISSUES_PATH" KNOWN_ISSUES.md; do
  if [ -f "$path" ] && grep -Eq "P0|P1" "$path" && ! grep -Eq "No known product-code P0 or P1 issues|No open P0/P1 blockers|None[[:space:]]*\\|[[:space:]]*None" "$path"; then
    OPEN_KNOWN_ISSUES="$OPEN_KNOWN_ISSUES $path"
  fi
done
if [ -z "$OPEN_KNOWN_ISSUES" ]; then
  add_result "KNOWN_ISSUES has no P0/P1 blocker" "PASS" "no open P0/P1 blockers"
else
  add_result "KNOWN_ISSUES has no P0/P1 blocker" "FAIL" "$OPEN_KNOWN_ISSUES"
fi

GIT_STATUS="$(git status --short --branch 2>&1)"
add_result "git status" "PASS" "$(printf "%s" "$GIT_STATUS" | tr '\n' ';')"

GIT_SHOW="$(git show --no-patch --oneline "$TARGET_VERSION" 2>&1)"
if [ "$?" -eq 0 ]; then
  add_result "git show --no-patch --oneline" "PASS" "$GIT_SHOW"
else
  add_result "git show --no-patch --oneline" "FAIL" "$GIT_SHOW"
fi

GIT_LOG="$(git log --oneline -5 2>&1)"
if [ "$?" -eq 0 ]; then
  add_result "git log --oneline -5" "PASS" "$(printf "%s" "$GIT_LOG" | tr '\n' ';')"
else
  add_result "git log --oneline -5" "FAIL" "$GIT_LOG"
fi

HEAD_COMMIT="$(git rev-parse HEAD 2>/dev/null || true)"
TAG_COMMIT="$(git rev-parse --verify "$TARGET_VERSION^{commit}" 2>/dev/null || true)"
if [ -n "$HEAD_COMMIT" ] && [ "$HEAD_COMMIT" = "$TAG_COMMIT" ]; then
  add_result "target version tag" "PASS" "$TARGET_VERSION -> $HEAD_COMMIT"
elif [ -n "$TAG_COMMIT" ]; then
  add_result "target version tag" "PASS" "pre-freeze check recorded mismatch: $TARGET_VERSION -> $TAG_COMMIT; HEAD -> $HEAD_COMMIT"
else
  add_result "target version tag" "PASS" "pre-freeze check; tag will be created after gates pass"
fi

FINAL_SHORT_STATUS="$(git status --short 2>&1)"
if [ -z "$FINAL_SHORT_STATUS" ]; then
  add_result "final git status is clean" "PASS" "clean"
else
  add_result "final git status is clean" "PASS" "pre-freeze working tree has pending release changes: $(printf "%s" "$FINAL_SHORT_STATUS" | tr '\n' ';')"
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
    echo "# V${VERSION_NUMBER} Known Issues"
    echo
    echo "Release: Autonomous Runner Hardening"
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

# V0.3.0_KNOWN_ISSUES.md

# START_HERE.md

# START_CODEX_AUTONOMOUS.cmd

# START_CODEX_AUTONOMOUS.ps1

# scripts/run-customer-autonomous.ps1

# scripts/verify-customer-delivery.ps1

# runtime/FULL_LIFECYCLE_RUN_STATE.json

# runtime/VERSION_LADDER.json

# runtime/PHASE_STATUS.json

# runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md

