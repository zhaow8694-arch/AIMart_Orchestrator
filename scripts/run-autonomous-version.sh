#!/usr/bin/env bash
set -euo pipefail

TARGET_VERSION="${1:-v0.3.2}"
SKIP_VALIDATION="${SKIP_VALIDATION:-0}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUN_STARTED_AT="$(date -Iseconds)"
APPROVED_COMMAND="bash scripts/run-autonomous-version.sh $TARGET_VERSION"
STAGES=(PREFLIGHT CODEX_EXECUTION VALIDATION_TEST_LINT_BUILD SOURCE_ZIP SAMPLE_PACK SAMPLE_PACK_NORMALIZATION ADAPTER_COMPLETENESS SHA256_MANIFEST DOGFOOD COMMIT_TAG COMPLETION_GATE FREEZE)
FAILURE_PATH="runtime/RUNNER_FAILURE_CLASSIFICATION.md"
SUMMARY_PATH="runtime/RUNNER_FINAL_SUMMARY.md"

echo "Approved command: $APPROVED_COMMAND"
echo "Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners."

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
    echo "Next single command:"
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
      [ -f scripts/normalize-sample-pack.sh ] || runner_failure "Missing sample normalizer"
      [ -f scripts/classify-runner-failure.sh ] || runner_failure "Missing failure classifier"
      ;;
    VALIDATION_TEST_LINT_BUILD)
      if [ "$SKIP_VALIDATION" != "1" ]; then
        pnpm test
        pnpm lint
        pnpm build
      fi
      ;;
    SOURCE_ZIP|SAMPLE_PACK)
      bash scripts/package.sh
      ;;
    SAMPLE_PACK_NORMALIZATION)
      bash scripts/normalize-sample-pack.sh "$TARGET_VERSION" "$RUN_STARTED_AT"
      ;;
    COMPLETION_GATE)
      if [ "$SKIP_VALIDATION" != "1" ]; then
        bash scripts/verify-autonomous-completion.sh "$TARGET_VERSION"
      fi
      ;;
  esac
done

{
  echo "# Runner Final Summary"
  echo
  echo "TargetVersion: $TARGET_VERSION"
  echo "RunStartedAt: $RUN_STARTED_AT"
  echo "Final result: PASS"
  echo "Stages: ${STAGES[*]}"
} > "$SUMMARY_PATH"

echo "Runner final result: PASS"
