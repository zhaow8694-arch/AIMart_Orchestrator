#!/usr/bin/env bash
set -euo pipefail

MESSAGE="${1:-}"
if [ "${2:-}" != "" ] && [ -f "${2:-}" ]; then
  MESSAGE="$MESSAGE
$(cat "${2:-}")"
fi

case "$MESSAGE" in
  *SANDBOX_TIMEOUT*) echo "SANDBOX_TIMEOUT" ;;
  *SANDBOX_ELEVATED_PARENT*) echo "SANDBOX_ELEVATED_PARENT" ;;
  *CODEX_SANDBOX_HELPER_MISSING*|*spawn\ setup\ refresh*) echo "CODEX_SANDBOX_HELPER_MISSING" ;;
  *ERR_PNPM*|*Unknown\ option*|*pnpm*argument*) echo "PNPM_ARGUMENT_LOSS" ;;
  *ParserError*|*Unexpected\ token*|*ForEach-Object\ -Parallel*|*"??"*) echo "POWERSHELL_51_SYNTAX" ;;
  *codex*argument*order*|*--sandbox*after*) echo "CODEX_ARGUMENT_ORDER" ;;
  *prompt*split*|*CODEX_TASK_PROMPT*|*unterminated\ prompt*) echo "CODEX_PROMPT_ARGUMENT_SPLIT" ;;
  *next\ start*argument*|*Invalid\ project\ directory*) echo "NEXT_START_ARGUMENT_ORDER" ;;
  *backslash*|*path\ separator*|*SOURCE_ZIP_PATH_SEPARATOR*) echo "SOURCE_ZIP_PATH_SEPARATOR" ;;
  *Forbidden\ source\ ZIP\ entry*|*node_modules*|*.env*|*credentials*) echo "SOURCE_ZIP_FORBIDDEN_ENTRY" ;;
  *zipBase64*|*SAMPLE_PACK_JSON_BASE64_RESPONSE*) echo "SAMPLE_PACK_JSON_BASE64_RESPONSE" ;;
  *stale*|*timestamp*run\ start*|*SAMPLE_PACK_STALE_FILE*) echo "SAMPLE_PACK_STALE_FILE" ;;
  *invalid\ zip*|*Missing\ ZIP*|*End\ of\ Central\ Directory*|*SAMPLE_PACK_INVALID_ZIP*) echo "SAMPLE_PACK_INVALID_ZIP" ;;
  *missing*adapter*|*agent_adapters/claude-code*|*agent_adapters/trae*|*agent_adapters/cursor*) echo "SAMPLE_PACK_MISSING_ADAPTER" ;;
  *Autonomous\ Completion\ Gate\ FAIL*|*completion\ gate*) echo "COMPLETION_GATE_FAILURE" ;;
  *TAG_NULL_TRIM*|*Trim\(\)*null*|*Cannot\ bind\ argument*Trim*) echo "TAG_NULL_TRIM" ;;
  *working\ tree*|*worktree*|*git\ status*modified*|*DIRTY_WORKTREE*) echo "DIRTY_WORKTREE" ;;
  *Historical\ release*modified*|*Historical\ releases*changed*|*HISTORICAL_RELEASE_MODIFIED*) echo "HISTORICAL_RELEASE_MODIFIED" ;;
  *) echo "COMPLETION_GATE_FAILURE" ;;
esac
