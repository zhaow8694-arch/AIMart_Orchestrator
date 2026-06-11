# AGENTS.md - Codex Target Adapter

Codex is the target coding agent for this generated execution pack.

## Project Facts

- Project: Todo API
- Execution mode: end_to_end_autonomous
- MVP scope: Todo CRUD endpoints, local tests, generated run docs
- Forbidden items: No SaaS accounts, no cloud runner, no payment, no production deploy, no external API integration
- Security boundaries: Do not read .env, SSH keys, cloud credentials, or system secrets

## Rules

1. Do not expand the MVP scope.
2. Execute tasks in TASK_QUEUE order.
3. Update PROGRESS_LOG after each completed task.
4. Put high-risk commands in runtime/APPROVAL_QUEUE.md before execution.
5. Do not read secrets, local credential files, or production resources.
6. Run scripts/finalize.ps1 or scripts/finalize.sh before final delivery.
7. Use runtime/SAFE_COMMANDS.md and runtime/DENIED_COMMANDS.md before running commands autonomously.