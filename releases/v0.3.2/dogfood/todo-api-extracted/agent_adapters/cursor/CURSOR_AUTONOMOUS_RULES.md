# Cursor Adapter

Project: Todo API
Execution scope: end_to_end_delivery
Execution mode: end_to_end_autonomous

This is an independent execution option. Selecting multiple adapters means AIMart generated multiple independent execution options; it does not run multiple agents together.

Do not run multiple agents against the same workspace at the same time unless a human manually coordinates ownership.

## Task Count

0 generated tasks.

## Autonomous Rules

1. Work only inside this workspace.
2. Treat this adapter as the only selected agent during execution.
3. Read runtime/SAFE_COMMANDS.md and runtime/DENIED_COMMANDS.md before commands.
4. Record high-risk operations in runtime/APPROVAL_QUEUE.md.
5. Run the Completion Gate before reporting PASS.
6. If the gate reports FAIL, fix safe failures and rerun.