#!/usr/bin/env bash
set -euo pipefail

STAGE="${1:-PREFLIGHT}"
TARGET_VERSION="${2:-v0.3.2}"
RUN_STARTED_AT="${3:-}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STAGES=(PREFLIGHT CODEX_EXECUTION VALIDATION_TEST_LINT_BUILD SOURCE_ZIP SAMPLE_PACK SAMPLE_PACK_NORMALIZATION ADAPTER_COMPLETENESS SHA256_MANIFEST DOGFOOD COMMIT_TAG COMPLETION_GATE FREEZE)
case " ${STAGES[*]} " in
  *" $STAGE "*) ;;
  *) echo "Unknown runner stage: $STAGE" >&2; exit 1 ;;
esac

mkdir -p runtime
APPROVED_COMMAND="bash scripts/run-autonomous-version.sh $TARGET_VERSION"
STAGES_TEXT="${STAGES[*]}"

node -e "const fs=require('fs'); const state={runnerVersion:'v0.3.2',targetVersion:process.argv[1],currentStage:process.argv[2],stages:process.argv[3].split(' '),runStartedAt:process.argv[4],updatedAt:new Date().toISOString(),approvedCommand:process.argv[5],activeAdapterId:'codex',oldRunnerPrevention:'Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners.'}; fs.writeFileSync('runtime/RUNNER_STATE.json', JSON.stringify(state,null,2)+'\n');" "$TARGET_VERSION" "$STAGE" "$STAGES_TEXT" "$RUN_STARTED_AT" "$APPROVED_COMMAND"

{
  echo "# Runner Next Action"
  echo
  echo "Current stage: $STAGE"
  echo "Target version: $TARGET_VERSION"
  echo
  echo "Approved command:"
  echo '```bash'
  echo "$APPROVED_COMMAND"
  echo '```'
  echo
  echo "Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners."
} > runtime/RUNNER_NEXT_ACTION.md

echo "[runner-stage-machine] $STAGE"
