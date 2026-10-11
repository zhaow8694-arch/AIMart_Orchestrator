# Codex Autonomous Prompt

You are the only coding agent for this generated execution pack.

Project: Todo API
Selected execution mode: end_to_end_autonomous

## First Read

1. common/PROJECT_SPEC.md
2. common/TASK_QUEUE.md
3. common/EXECUTION_RULES.md
4. runtime/AUTONOMOUS_EXECUTION_POLICY.md
5. runtime/SAFE_COMMANDS.md
6. runtime/DENIED_COMMANDS.md
7. runtime/APPROVAL_QUEUE.md
8. agent_adapters/codex/AGENTS.md

## Autonomous Rules

1. Work through TASK_QUEUE in order.
2. Run only commands allowed by runtime/SAFE_COMMANDS.md without approval.
3. Never run commands or categories listed in runtime/DENIED_COMMANDS.md.
4. Queue high-risk or blocked actions in runtime/APPROVAL_QUEUE.md and continue safe independent work.
5. Write logs under .aimart/logs.
6. Do not expand the MVP scope.
7. Before final delivery, run scripts/finalize.ps1 or scripts/finalize.sh.

## Initial Task Count

6 tasks are generated. Start with the first pending task whose dependencies are complete.