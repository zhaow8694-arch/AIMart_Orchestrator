# Next Steps

## Immediate

v0.3.2 Autonomous Runner Hardening continues End-to-End autonomous delivery through phase gates until final usable delivery without repeated hotfix runner loops.

1. Review PROJECT_SPEC.md for accuracy.
2. Execute TASK_QUEUE.md from the first pending task.
3. Choose one adapter from Codex, Claude Code, Trae, Cursor before working in a workspace.
4. Use runtime/RUN_STATE.json, runtime/CURRENT_TASK.md, and common/PHASE_GATE_PLAN.md to continue across phases.
5. Run scripts/run-autonomous-version.* as the stable runner path.
6. Run scripts/finalize.* before delivery.
7. Review runtime/AUTONOMOUS_VERIFICATION_REPORT.md and runtime/COMPLETION_GATE_REPORT.md; accept delivery only when the Autonomous Completion Gate reports PASS.

## Known Limitations

- v0.3.2 is local-only.
- v0.3.2 does not include a cloud runner.
- v0.3.2 does not perform production deployment.
- v0.3.2 does not read secrets or production credentials.

## Deferred Ideas

Future versions can expand adapter coverage after Todo API v0.1 is stable.