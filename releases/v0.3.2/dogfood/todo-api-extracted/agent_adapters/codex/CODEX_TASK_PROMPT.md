# Codex Task Prompt

You are working on Todo API. Follow the generated task queue exactly.

## Tasks

### TASK-001 Initialize target project

- Phase: setup
- Risk: L1
- Dependencies: none
- Done criteria: Project dependencies install successfully.; Lint, test, and build commands are available.
- Test command: `pnpm build`

### TASK-002 Implement v0.1 core MVP

- Phase: core
- Risk: L2
- Dependencies: TASK-001
- Done criteria: MVP behavior is implemented without expanding scope.; Explicit requirements from PROJECT_SPEC are traceable in code or docs.
- Test command: `pnpm test`

### TASK-003 Apply runtime and permission boundaries

- Phase: runtime
- Risk: L2
- Dependencies: TASK-001
- Done criteria: Runtime policy files are present.; High-risk operations are documented instead of executed automatically.
- Test command: `pnpm test`

### TASK-004 Add focused tests

- Phase: qa
- Risk: L1
- Dependencies: TASK-002, TASK-003
- Done criteria: Core behavior has automated tests.; Regression-prone script or adapter output is covered.
- Test command: `pnpm test`

### TASK-005 Write delivery documentation

- Phase: docs
- Risk: L1
- Dependencies: TASK-003
- Done criteria: README, RUN_APP, ENV_SETUP, and security docs are complete.; Known assumptions and open questions are documented honestly.
- Test command: `pnpm lint`

### TASK-006 Finalize local delivery artifact

- Phase: finalize
- Risk: L2
- Dependencies: TASK-004, TASK-005
- Done criteria: Finalize script completes locally.; Release notes and final delivery check are present.; Remote push or deployment is not performed.
- Test command: `pnpm build`


## Permission Actions

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

Use scripts/finalize.ps1 or scripts/finalize.sh for final delivery.