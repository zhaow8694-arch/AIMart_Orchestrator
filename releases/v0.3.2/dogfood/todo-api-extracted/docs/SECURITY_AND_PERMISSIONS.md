# Security And Permissions

## Risk Levels

- L0: read_only - Read-only project inspection such as listing files or checking status. (allow)
- L1: project_safe - Project-local install, lint, test, and build commands. (allow)
- L2: recoverable_project_change - Project-local generated files, formatting, or lockfile updates. (allow)
- L3: environment_change - Docker, database migrations, or system-level dependency changes. (queue_for_approval)
- L4: external_resource_change - Remote Git, deployment, cloud, or PR merge operations. (queue_for_approval)
- L5: destructive_or_secret_access - Destructive commands or commands that read secrets. (deny)

## Command Rules

- `git status`: L0, allow - Allowed project-local verification or read-only command.
- `git diff`: L0, allow - Allowed project-local verification or read-only command.
- `pnpm install`: L1, allow - Allowed project-local verification or read-only command.
- `pnpm lint`: L1, allow - Allowed project-local verification or read-only command.
- `pnpm test`: L1, allow - Allowed project-local verification or read-only command.
- `pnpm build`: L1, allow - Allowed project-local verification or read-only command.
- `scripts/finalize.ps1`: L1, allow - Allowed project-local verification or read-only command.
- `scripts/finalize.sh`: L1, allow - Allowed project-local verification or read-only command.
- `scripts/verify-customer-delivery.ps1`: L1, allow - Allowed project-local verification or read-only command.
- `scripts/verify-customer-delivery.sh`: L1, allow - Allowed project-local verification or read-only command.
- `read ZIP entries`: L1, allow - Allowed project-local verification or read-only command.
- `local port lookup`: L1, allow - Allowed project-local verification or read-only command.
- `write current-version release artifacts`: L1, allow - Allowed project-local verification or read-only command.
- `node -v`: L1, allow - Allowed project-local verification or read-only command.
- `pnpm -v`: L1, allow - Allowed project-local verification or read-only command.
- `git push`: L4, queue_for_approval - External resource changes require explicit approval.
- `git push --tags`: L4, queue_for_approval - External resource changes require explicit approval.
- `gh pr create`: L4, queue_for_approval - External resource changes require explicit approval.
- `vercel deploy`: L4, queue_for_approval - External resource changes require explicit approval.
- `terraform apply`: L4, queue_for_approval - External resource changes require explicit approval.
- `kubectl apply`: L4, queue_for_approval - External resource changes require explicit approval.
- `production deployment`: L4, queue_for_approval - External resource changes require explicit approval.
- `real database migration`: L4, queue_for_approval - External resource changes require explicit approval.
- `cloud resource creation`: L4, queue_for_approval - External resource changes require explicit approval.
- `cloud resource deletion`: L4, queue_for_approval - External resource changes require explicit approval.
- `delete historical release folders`: L4, queue_for_approval - External resource changes require explicit approval.
- `rm -rf /`: L5, deny - Secret access or destructive operation is forbidden by default.
- `sudo rm -rf`: L5, deny - Secret access or destructive operation is forbidden by default.
- `cat ~/.ssh/*`: L5, deny - Secret access or destructive operation is forbidden by default.
- `cat ~/.aws/*`: L5, deny - Secret access or destructive operation is forbidden by default.
- `cat .env`: L5, deny - Secret access or destructive operation is forbidden by default.
- `type .env`: L5, deny - Secret access or destructive operation is forbidden by default.
- `Get-Content .env`: L5, deny - Secret access or destructive operation is forbidden by default.
- `printenv`: L5, deny - Secret access or destructive operation is forbidden by default.
- `terraform destroy`: L5, deny - Secret access or destructive operation is forbidden by default.
- `kubectl delete`: L5, deny - Secret access or destructive operation is forbidden by default.
- `git push`: L5, deny - Secret access or destructive operation is forbidden by default.
- `git push --tags`: L5, deny - Secret access or destructive operation is forbidden by default.
- `Remove-Item releases/v0.1.0`: L5, deny - Secret access or destructive operation is forbidden by default.
- `Remove-Item releases/v0.1.1`: L5, deny - Secret access or destructive operation is forbidden by default.
- `Remove-Item releases/v0.2.1`: L5, deny - Secret access or destructive operation is forbidden by default.
- `Remove-Item releases/v0.2.2`: L5, deny - Secret access or destructive operation is forbidden by default.
- `Remove-Item releases/v0.3.0`: L5, deny - Secret access or destructive operation is forbidden by default.

Commands marked queue_for_approval must be written to runtime/APPROVAL_QUEUE.md before execution.
Commands marked deny must not be executed.

## Autonomous Mode Policy

- Read runtime/SAFE_COMMANDS.md before running automated commands.
- Read runtime/DENIED_COMMANDS.md before queueing or denying high-risk work.
- Read runtime/AUTONOMOUS_EXECUTION_POLICY.md before unattended runs.
- Read runtime/AUTONOMOUS_COMPLETION_GATE.md before reporting delivery success.
- Review runtime/AUTONOMOUS_VERIFICATION_REPORT.md after the runner exits.
- View logs under .aimart/logs after supervised or autonomous Codex sessions.
- Use scripts/run-autonomous-version.* when you want the stable v0.3.2 autonomous runner with runtime/RUNNER_STATE.json, runtime/RUNNER_NEXT_ACTION.md, and runtime/RUNNER_FINAL_SUMMARY.md updates.
- Use scripts/normalize-sample-pack.* before validating sample execution-pack artifacts.
- Use scripts/classify-runner-failure.* before writing blocker or known-issue entries for runner failures.
- Use runtime/APPROVAL_QUEUE.md for blocked or high-risk actions; Autonomous Mode should continue with safe independent tasks when possible.