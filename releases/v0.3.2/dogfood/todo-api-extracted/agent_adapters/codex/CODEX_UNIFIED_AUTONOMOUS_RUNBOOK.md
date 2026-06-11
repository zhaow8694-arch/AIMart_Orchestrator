# Codex Unified Autonomous Runbook

Project: Todo API
Selected execution mode: end_to_end_autonomous

Unified Autonomous Mode is the one-window autonomous runner for generated execution packs. It starts Codex, shows live status in the same terminal, tails recent logs, checks release output, updates runtime status files, and prints a final summary.

## Start

```powershell
./agent_adapters/codex/run-codex-unified-autonomous.ps1
```

```bash
bash agent_adapters/codex/run-codex-unified-autonomous.sh
```

## What The Runner Shows

- Target version.
- Elapsed time.
- Git branch.
- Whether the Git worktree was clean at startup.
- Whether existing Codex processes were detected.
- Dirty file count.
- Latest log tail from codex_runs.
- Release directory status.
- Source ZIP status.
- Sample ZIP status.
- Latest log activity time.
- Whether the log appears stalled.
- Known issues status.
- Autonomous Completion Gate PASS or FAIL.
- Final Summary with exit code, release artifacts, sample execution pack, Git status, completion gate result, and next recommended action.

## Runtime Files

- runtime/AUTONOMOUS_RUN_STATUS.md is updated during the run.
- runtime/AUTONOMOUS_RUN_SUMMARY.md is updated at completion.
- runtime/AUTONOMOUS_HEALTH_CHECK.md records the one-window runner checks.
- runtime/AUTONOMOUS_COMPLETION_GATE.md defines the required completion checks.
- runtime/AUTONOMOUS_VERIFICATION_REPORT.md records PASS or FAIL for the gate.

## Safety

The unified runner uses Codex workspace-write sandboxing with approval never. It does not push remotes, read secrets, modify frozen release folders, deploy to production, run real database migrations, or create/delete cloud resources.