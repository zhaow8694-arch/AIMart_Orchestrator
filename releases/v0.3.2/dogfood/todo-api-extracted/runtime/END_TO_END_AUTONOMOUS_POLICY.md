# End-to-End Autonomous Policy

Project: Todo API
Execution scope: end_to_end_delivery
Execution mode: end_to_end_autonomous

## Purpose

End-to-End Autonomous Delivery lets one selected AI agent continue from v0.0.1 discovery/spec to v1.0 final usable delivery without repeated human prompting for ordinary safe work.

## Rules

1. Choose one adapter for one workspace.
2. Do not run multiple agents against the same workspace unless a human manually coordinates ownership.
3. Follow common/AUTONOMOUS_DELIVERY_ROADMAP.md and common/PHASE_GATE_PLAN.md.
4. Update runtime/RUN_STATE.json and runtime/CURRENT_TASK.md before and after each task.
5. Run a Completion Gate at every phase boundary.
6. Record PASS or FAIL in runtime/COMPLETION_GATE_REPORT.md.
7. Queue high-risk commands in runtime/APPROVAL_QUEUE.md and continue safe independent work.
8. Do not read secrets, deploy production, run real database migrations, or create/delete cloud resources.

## Version Ladder

- v0.0.1 discovery/spec
- v0.1.0 MVP implementation
- v0.2.x autonomous runtime and completion gates
- v0.3.x multi-agent independent adapters
- v0.4.x runner hardening
- v0.5.x delivery automation
- v1.0 final usable delivery