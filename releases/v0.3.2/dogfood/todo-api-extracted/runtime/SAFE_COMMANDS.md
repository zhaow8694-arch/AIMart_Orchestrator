# Safe Commands

These commands are allowed for automated execution inside the generated execution pack when they stay within the project workspace.

## Dependency And Verification

- `pnpm install`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Finalize And Packaging

- `scripts/finalize.ps1`
- `scripts/finalize.sh`
- `powershell -ExecutionPolicy Bypass -File .\scripts\finalize.ps1`
- Writing current-version release artifacts under the current release folder only.

> `-ExecutionPolicy Bypass` applies to that one PowerShell process only and does not change your machine's execution policy. It lets the pack launch straight from a downloaded ZIP without a manual unblock step.

## Read-Only Inspection

- `git status`
- `git diff`
- Read generated ZIP entries for structure verification; this includes reading zip entries during automated checks.
- Read local port and PID information for local development servers.

## Policy Source

- `git status`
- `git diff`
- `pnpm install`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `scripts/finalize.ps1`
- `scripts/finalize.sh`
- `scripts/verify-customer-delivery.ps1`
- `scripts/verify-customer-delivery.sh`
- `read ZIP entries`
- `local port lookup`
- `write current-version release artifacts`
- `node -v`
- `pnpm -v`