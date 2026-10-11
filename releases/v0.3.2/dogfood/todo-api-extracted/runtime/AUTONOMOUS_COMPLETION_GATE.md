# Autonomous Completion Gate

Project: Todo API
Selected execution mode: end_to_end_autonomous

The autonomous runner must not report success until this gate passes.

## Required Gates

- Run `pnpm test`.
- Run `pnpm lint`.
- Run `pnpm build`.
- Confirm the target release directory exists.
- Confirm the source ZIP exists.
- Confirm the sample execution-pack ZIP exists.
- Confirm SHA256.txt and RELEASE_MANIFEST.txt exist.
- Confirm SHA256 values match the actual source ZIP and sample execution-pack ZIP hashes.
- Confirm the source ZIP excludes node_modules, .next, .git, codex_runs, temporary verification directories, old releases, .env files, and secret files.
- Confirm the sample execution-pack ZIP contains required common, runtime, scripts, Codex adapter, and docs files.
- Confirm selected adapter directories exist.
- Confirm each selected adapter has a runbook and task prompt or rules prompt.
- Confirm EXECUTION_PACK_MANIFEST.md exists.
- Confirm runtime/RUN_STATE.json exists and is valid JSON.
- Confirm runtime/CURRENT_TASK.md exists.
- Confirm runtime/PHASE_GATE_REPORT.md and runtime/COMPLETION_GATE_REPORT.md exist or are initialized.
- Confirm historical release folders are not modified.
- Confirm final delivery documents exist.
- Report git status.
- Confirm the target version tag exists and points to the final commit.

## Result

Record PASS or FAIL in runtime/AUTONOMOUS_VERIFICATION_REPORT.md before final delivery.