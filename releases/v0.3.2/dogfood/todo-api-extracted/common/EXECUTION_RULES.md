# Execution Rules

1. Follow TASK_QUEUE.md in order.
2. Do not expand the MVP scope.
3. Write assumptions to ASSUMPTIONS.md when details are unknown.
4. Write blockers to BLOCKERS.md only when work cannot continue.
5. Queue high-risk commands in runtime/APPROVAL_QUEUE.md.
6. Run only commands allowed by runtime/SAFE_COMMANDS.md during autonomous execution.
7. Do not run commands listed in runtime/DENIED_COMMANDS.md.
8. Run scripts/finalize.* before final delivery.
9. Run the Autonomous Completion Gate and review runtime/AUTONOMOUS_VERIFICATION_REPORT.md before reporting success.
10. Selecting multiple adapters means generating multiple independent execution options; choose one adapter for a workspace.
11. Run scripts/verify-customer-delivery.* before accepting final customer delivery.