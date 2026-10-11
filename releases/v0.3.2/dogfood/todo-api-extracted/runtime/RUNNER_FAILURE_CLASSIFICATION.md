# Runner Failure Classification

Project: Todo API

The stable v0.3.2 runner classifies failures before choosing recovery. Do not create old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners; use scripts/classify-runner-failure.* and scripts/run-autonomous-version.*.

## Categories

- PNPM_ARGUMENT_LOSS
- POWERSHELL_51_SYNTAX
- CODEX_ARGUMENT_ORDER
- CODEX_PROMPT_ARGUMENT_SPLIT
- NEXT_START_ARGUMENT_ORDER
- SOURCE_ZIP_PATH_SEPARATOR
- SOURCE_ZIP_FORBIDDEN_ENTRY
- SAMPLE_PACK_JSON_BASE64_RESPONSE
- SAMPLE_PACK_STALE_FILE
- SAMPLE_PACK_INVALID_ZIP
- SAMPLE_PACK_MISSING_ADAPTER
- COMPLETION_GATE_FAILURE
- TAG_NULL_TRIM
- DIRTY_WORKTREE
- HISTORICAL_RELEASE_MODIFIED

## Output Contract

The classifier writes one category plus a short diagnostic. Unknown failures are treated as COMPLETION_GATE_FAILURE until a narrower category is added in a future version.