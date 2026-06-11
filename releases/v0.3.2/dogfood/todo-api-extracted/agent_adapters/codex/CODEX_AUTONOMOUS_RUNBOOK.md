# Codex Autonomous Runbook

Project: Todo API
Selected execution mode: end_to_end_autonomous

## Start Supervised Mode

Use supervised mode when a human wants to approve high-risk commands interactively.

```powershell
./agent_adapters/codex/run-codex-supervised.ps1
```

```bash
bash agent_adapters/codex/run-codex-supervised.sh
```

## Start Autonomous Mode

Use autonomous mode only inside a project-local workspace where the runtime policy is acceptable.

```powershell
./agent_adapters/codex/run-codex-autonomous.ps1
```

```bash
bash agent_adapters/codex/run-codex-autonomous.sh
```

## Start Unified Autonomous Mode

Use unified autonomous mode when you want the one-window status display, recent log tail, release checks, runtime status file updates, and final summary.

```powershell
./agent_adapters/codex/run-codex-unified-autonomous.ps1
```

```bash
bash agent_adapters/codex/run-codex-unified-autonomous.sh
```

## Logs

Launcher logs are written to .aimart/logs. Review the newest log after long autonomous runs or failed commands.

## Autonomous Completion Gate

The unified autonomous runner runs the Autonomous Completion Gate before reporting success. Review agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md and runtime/AUTONOMOUS_VERIFICATION_REPORT.md when the gate reports FAIL.

## Approval Queue

When a command is outside runtime/SAFE_COMMANDS.md, write it to runtime/APPROVAL_QUEUE.md with the risk level, reason, and blocking status. Autonomous Mode must continue with safe tasks when the queued item is not blocking.

## Safety

Do not use dangerous bypass, full-access, unrestricted sandbox, production deployment, real database migration, cloud resource mutation, or secret-reading commands.