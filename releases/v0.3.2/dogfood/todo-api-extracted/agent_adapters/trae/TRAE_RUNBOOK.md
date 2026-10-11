# Trae Adapter

Project: Todo API
Execution scope: end_to_end_delivery
Execution mode: end_to_end_autonomous

This is an independent execution option. Selecting multiple adapters means AIMart generated multiple independent execution options; it does not run multiple agents together.

Do not run multiple agents against the same workspace at the same time unless a human manually coordinates ownership.

## Task Count

0 generated tasks.

## Required Read Order

1. EXECUTION_PACK_MANIFEST.md
2. common/PROJECT_SPEC.md
3. common/TASK_QUEUE.md
4. common/AUTONOMOUS_DELIVERY_ROADMAP.md
5. runtime/END_TO_END_AUTONOMOUS_POLICY.md
6. runtime/RUN_STATE.json
7. runtime/APPROVAL_QUEUE.md

## Permission Model

Use the adapter's workspace permission model. High-risk commands go to runtime/APPROVAL_QUEUE.md. Continue safe independent work when queued work is not blocking.