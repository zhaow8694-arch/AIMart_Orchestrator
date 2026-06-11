#!/usr/bin/env bash
set -euo pipefail
TARGET_VERSION="${1:-v1.0}"
MODE="${MODE:-autonomous}"
SKIP_ADAPTER_RUN="${SKIP_ADAPTER_RUN:-0}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
RUN_STARTED_AT="$(date -Iseconds)"
APPROVED_COMMAND="bash scripts/run-autonomous-version.sh $TARGET_VERSION"
STAGES=("PREFLIGHT" "CODEX_EXECUTION" "VALIDATION_TEST_LINT_BUILD" "SOURCE_ZIP" "SAMPLE_PACK" "SAMPLE_PACK_NORMALIZATION" "ADAPTER_COMPLETENESS" "SHA256_MANIFEST" "DOGFOOD" "COMMIT_TAG" "COMPLETION_GATE" "FREEZE")
SUMMARY_PATH="runtime/RUNNER_FINAL_SUMMARY.md"
FAILURE_PATH="runtime/RUNNER_FAILURE_CLASSIFICATION.md"
NEXT_ACTION_PATH="runtime/RUNNER_NEXT_ACTION.md"

echo "Approved command: $APPROVED_COMMAND"
echo "Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners."
echo "Next action file: runtime/RUNNER_NEXT_ACTION.md"

runner_failure() {
  local message="$1"
  local category
  category="$(bash scripts/classify-runner-failure.sh "$message")"
  {
    echo "# Runner Failure Classification"
    echo
    echo "Category: $category"
    echo "Message: $message"
    echo "RunStartedAt: $RUN_STARTED_AT"
    echo
    echo "Next command:"
    echo '```bash'
    echo "$APPROVED_COMMAND"
    echo '```'
  } > "$FAILURE_PATH"
  echo "Runner failed with $category: $message" >&2
  exit 1
}

for stage in "${STAGES[@]}"; do
  bash scripts/runner-stage-machine.sh "$stage" "$TARGET_VERSION" "$RUN_STARTED_AT"
  case "$stage" in
    PREFLIGHT)
      [ -f runtime/RUNNER_STATE.json ] || runner_failure "Missing runtime/RUNNER_STATE.json"
      [ -f runtime/RUNNER_NEXT_ACTION.md ] || runner_failure "Missing runtime/RUNNER_NEXT_ACTION.md"
      [ -f scripts/classify-runner-failure.sh ] || runner_failure "Missing classifier script"
      [ -f scripts/normalize-sample-pack.sh ] || runner_failure "Missing sample normalizer script"
      ;;
    CODEX_EXECUTION)
      if [ "$SKIP_ADAPTER_RUN" != "1" ] && [ -f scripts/run-customer-autonomous.sh ]; then
        SKIP_ADAPTER_RUN=1 bash scripts/run-customer-autonomous.sh "$MODE"
      fi
      ;;
    VALIDATION_TEST_LINT_BUILD)
      if [ -f package.json ]; then
        pnpm test
        pnpm lint
        pnpm build
      fi
      ;;
    SAMPLE_PACK_NORMALIZATION)
      bash scripts/normalize-sample-pack.sh "$TARGET_VERSION" "$RUN_STARTED_AT"
      ;;
  esac
done

{
  echo "# Runner Final Summary"
  echo
  echo "TargetVersion: $TARGET_VERSION"
  echo "RunStartedAt: $RUN_STARTED_AT"
  echo "Final result: PASS"
  echo
  echo "Stages: ${STAGES[*]}"
} > "$SUMMARY_PATH"
echo "Runner final result: PASS"