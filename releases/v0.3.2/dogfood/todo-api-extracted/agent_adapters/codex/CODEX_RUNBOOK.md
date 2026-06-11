# Codex Runbook

## Start

1. Read common/PROJECT_SPEC.md.
2. Read common/TASK_QUEUE.md.
3. Read runtime/PERMISSION_POLICY.yaml.
4. Read runtime/SAFE_COMMANDS.md and runtime/DENIED_COMMANDS.md.
5. Start with the first pending task.

## Project

Todo API

## Task Order

- TASK-001: Initialize target project (setup, L1)
- TASK-002: Implement v0.1 core MVP (core, L2)
- TASK-003: Apply runtime and permission boundaries (runtime, L2)
- TASK-004: Add focused tests (qa, L1)
- TASK-005: Write delivery documentation (docs, L1)
- TASK-006: Finalize local delivery artifact (finalize, L2)

## Finish

Run the local finalize script for the current platform:

```powershell
./scripts/finalize.ps1
```

```bash
./scripts/finalize.sh
```