# Runner Recovery Policy

Project: Todo API

## Policy

1. Use the single approved runner command.
2. Update runtime/RUNNER_STATE.json before each stage.
3. Classify any failure with scripts/classify-runner-failure.*.
4. Write the classified failure to runtime/RUNNER_FAILURE_CLASSIFICATION.md.
5. Continue safe independent checks after non-blocking failures.
6. Do not validate stale source or sample ZIPs; regenerate artifacts or verify timestamps are after the run start and hashes are newly recorded.
7. Do not modify historical release folders.
8. Do not create old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners.

## Stage Order

1. PREFLIGHT
2. CODEX_EXECUTION
3. VALIDATION_TEST_LINT_BUILD
4. SOURCE_ZIP
5. SAMPLE_PACK
6. SAMPLE_PACK_NORMALIZATION
7. ADAPTER_COMPLETENESS
8. SHA256_MANIFEST
9. DOGFOOD
10. COMMIT_TAG
11. COMPLETION_GATE
12. FREEZE