# Codex End-to-End Delivery Runbook

Project: Todo API

This runbook lets a customer start Codex once and let the selected AI continue through phase planning, implementation, tests, fixes, verification, release freeze, version advancement, and final delivery.

## Start

```powershell
./agent_adapters/codex/run-codex-end-to-end-autonomous.ps1
```

```bash
bash agent_adapters/codex/run-codex-end-to-end-autonomous.sh
```

## Required State Files

- common/AUTONOMOUS_DELIVERY_ROADMAP.md
- common/VERSION_LADDER.md
- common/PHASE_GATE_PLAN.md
- common/CURRENT_PHASE.md
- runtime/END_TO_END_AUTONOMOUS_POLICY.md
- runtime/RUN_STATE.json
- runtime/CURRENT_TASK.md
- runtime/PHASE_GATE_REPORT.md
- runtime/COMPLETION_GATE_REPORT.md
- runtime/MORNING_REPORT.md
- runtime/HANDOFF_TO_NEXT_VERSION.md

## Phase Gates

Every phase must end with a Completion Gate. The gate result must be written as PASS or FAIL in runtime/COMPLETION_GATE_REPORT.md and mirrored in runtime/PHASE_GATE_REPORT.md.

## Safety

High-risk operations are recorded in runtime/APPROVAL_QUEUE.md. Codex must continue safe independent work when a queued item is not blocking. Do not read secrets, deploy production, run real database migrations, change cloud resources, or modify frozen release folders.