# Autonomous Execution Policy

Project: Todo API
Selected execution mode: end_to_end_autonomous

## Codex Sandbox

- Autonomous Mode uses Codex with `workspace-write` sandboxing and `approval never`.
- Supervised Mode uses Codex with `workspace-write` sandboxing and `approval on-request`.
- Dangerous bypass, full-access, or unrestricted sandbox modes are forbidden.

## Automation Rules

1. Run only commands listed in runtime/SAFE_COMMANDS.md without approval.
2. Record denied or approval-controlled actions in runtime/APPROVAL_QUEUE.md.
3. Continue safe independent work after queueing a high-risk command.
4. Write logs under .aimart/logs or another project-local logs directory.
5. Do not read secrets, run production deployment, perform real database migrations, or create/delete cloud resources.

## Required Finalization

Before delivery, run the platform-specific finalize script and record the outcome in common/PROGRESS_LOG.md.