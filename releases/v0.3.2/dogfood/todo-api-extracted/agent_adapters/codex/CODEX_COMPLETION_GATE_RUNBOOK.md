# Codex Completion Gate Runbook

Project: Todo API
Selected execution mode: end_to_end_autonomous

This runbook is used by the one-window unified autonomous runner before it reports success.

## one-window Completion Flow

1. Run Codex with workspace-write sandboxing and approval never.
2. Show Target version, Git branch, clean startup state, existing Codex processes, release directory, Source ZIP, Sample execution pack, latest log activity, and whether the log appears stalled.
3. Run the Autonomous Completion Gate after Codex exits.
4. Write runtime/AUTONOMOUS_VERIFICATION_REPORT.md.
5. Display PASS or FAIL clearly in the final summary.
6. If the gate reports FAIL, display which gate failed and point to runtime/AUTONOMOUS_VERIFICATION_REPORT.md.
7. Store runner logs and completion-gate logs under codex_runs.

## Required Gate Inputs

- runtime/AUTONOMOUS_RUN_STATUS.md
- runtime/AUTONOMOUS_RUN_SUMMARY.md
- runtime/AUTONOMOUS_HEALTH_CHECK.md
- runtime/AUTONOMOUS_COMPLETION_GATE.md
- runtime/AUTONOMOUS_VERIFICATION_REPORT.md
- scripts/verify-autonomous-completion.ps1 or scripts/verify-autonomous-completion.sh when present
- Release artifacts for the target version when the project uses AIMart release packaging

## Safety

The gate must not read secrets, modify frozen release folders, publish remotes, deploy to production, run real database migrations, or create/delete cloud resources.