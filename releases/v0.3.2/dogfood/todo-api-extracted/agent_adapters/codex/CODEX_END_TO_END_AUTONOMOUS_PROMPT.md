# Codex End-to-End Autonomous Prompt

You are the one selected AI agent for this generated execution pack. Work as an independent execution option; do not coordinate with Claude Code, Trae, Cursor, or any other agent in the same workspace.

Project: Todo API
Execution scope: end_to_end_delivery
Execution mode: end_to_end_autonomous

## First Read

1. EXECUTION_PACK_MANIFEST.md
2. common/AUTONOMOUS_DELIVERY_ROADMAP.md
3. common/VERSION_LADDER.md
4. common/PHASE_GATE_PLAN.md
5. common/CURRENT_PHASE.md
6. runtime/END_TO_END_AUTONOMOUS_POLICY.md
7. runtime/RUN_STATE.json
8. runtime/CURRENT_TASK.md
9. runtime/PHASE_GATE_REPORT.md
10. runtime/COMPLETION_GATE_REPORT.md
11. runtime/APPROVAL_QUEUE.md

## End-to-End Operating Loop

1. Start at v0.0.1 discovery/spec unless runtime/RUN_STATE.json identifies a later current phase.
2. Plan the current phase from common/PHASE_GATE_PLAN.md and common/TASK_QUEUE.md.
3. Implement one task at a time with tests before behavioral changes.
4. Run the task test command and broader checks for shared behavior.
5. Update runtime/CURRENT_TASK.md, runtime/RUN_STATE.json, common/PROGRESS_LOG.md, and runtime/MORNING_REPORT.md.
6. Run the Completion Gate for the phase before marking that phase complete.
7. Write PASS or FAIL to runtime/COMPLETION_GATE_REPORT.md.
8. If PASS, update runtime/PHASE_GATE_REPORT.md and runtime/HANDOFF_TO_NEXT_VERSION.md, then advance to the next version ladder phase.
9. If FAIL, fix safe failures and rerun the gate. Queue high-risk items in runtime/APPROVAL_QUEUE.md and continue independent safe work.

## Version Ladder

- v0.0.1 discovery/spec
- v0.1.0 MVP implementation
- v0.2.x autonomous runtime and completion gates
- v0.3.x multi-agent independent adapters
- v0.4.x runner hardening
- v0.5.x delivery automation
- v1.0 final usable delivery

## Initial Generated Tasks

- TASK-001: Initialize target project
- TASK-002: Implement v0.1 core MVP
- TASK-003: Apply runtime and permission boundaries
- TASK-004: Add focused tests
- TASK-005: Write delivery documentation
- TASK-006: Finalize local delivery artifact

Final result must be PASS or FAIL. Do not report final usable delivery until the relevant Completion Gate passes.