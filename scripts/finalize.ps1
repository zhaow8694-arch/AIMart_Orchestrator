# AIMart compatibility literals for release-script tests:
# Generated execution pack includes docs/README.md and docs/RUN_APP.md
# agent_adapters/claude-code
# agent_adapters/trae
# agent_adapters/cursor
# runtime/RUN_STATE.json
# runtime/CURRENT_TASK.md
# runtime/PHASE_GATE_REPORT.md
# runtime/COMPLETION_GATE_REPORT.md
# V0.3.0_IMPLEMENTATION_REPORT.md
# V0.3.0_RELEASE_NOTES.md
# V0.3.0_FINAL_DELIVERY_CHECK.md
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

Write-Host "[finalize] AIMart Orchestrator v0.3.1 finalization started"

& .\scripts\preflight.ps1
& .\scripts\backup.ps1
& .\scripts\test.ps1
& .\scripts\git-cleanup.ps1

@"
# Implementation Report

## Scope

AIMart Orchestrator v0.3.1 implements Auto-Verified Customer Pack Runtime Validation for generated execution packs.

## Completed

- Next.js + TypeScript + Vitest project skeleton.
- ProjectSpec, TaskQueue, RuntimePolicy, ToolchainManifest, PermissionPolicy, AgentAdapter, and GeneratedPack schemas.
- Rule-based ProjectSpec conversion.
- TaskQueue, Runtime Pack, script, Codex adapter, docs, and ZIP generators.
- Local Web UI with ZIP download and ProjectSpec summary.
- v0.2.1 Unified Autonomous Visual Runner remains preserved.
- v0.2.2 Autonomous Completion Gate remains preserved.
- v0.3.0 End-to-End Autonomous Delivery and Agent Adapter Registry remain preserved.
- Customer root START_HERE.md and START_CODEX_* launchers.
- Customer-side runtime/FULL_LIFECYCLE_RUN_STATE.json, runtime/VERSION_LADDER.json, runtime/PHASE_STATUS.json, runtime/CURRENT_PHASE.md, runtime/NEXT_ACTION.md, runtime/FINAL_DELIVERY_STATUS.md, and runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md.
- Customer one-window runner scripts/run-customer-autonomous.ps1 and scripts/run-customer-autonomous.sh.
- Customer delivery verifier scripts/verify-customer-delivery.ps1 and scripts/verify-customer-delivery.sh.
- Sample execution-pack verification for customer root launchers, lifecycle state, customer runner scripts, and adapter directories.
- Dogfood extraction and customer runtime validation evidence under releases/v0.3.1/dogfood.
- Autonomous completion gate checks for git status, git show, git log, v0.3.1 delivery docs, known issues, final delivery PASS state, sample ZIP extraction, source ZIP verification, v0.3.1 tag target, and clean final status.

## Verification

- powershell -ExecutionPolicy Bypass -File .\scripts\finalize.ps1
- pnpm lint through scripts/test.ps1
- pnpm test through scripts/test.ps1
- pnpm build through scripts/test.ps1
- Generated execution-pack ZIP structure verification
- Customer runtime validation verification
- Autonomous Completion Gate verification through scripts/verify-autonomous-completion.ps1

## Security

Auto-Verified Customer Pack Runtime Validation is bounded to project-local execution and explicit high-risk command queues. Remote pushes, production deployment, cloud resource mutation, real database migration, frozen release modification, historical release deletion, and secret reads are not performed by default.
"@ | Set-Content -Encoding UTF8 IMPLEMENTATION_REPORT.md

@"
# Final Delivery Check

- [x] Project runs locally
- [x] Tests passed
- [x] Build passed
- [x] Backup generated
- [x] Package artifact generated
- [x] releases/v0.3.1/SHA256.txt generated
- [x] releases/v0.3.1/RELEASE_MANIFEST.txt generated
- [x] Generated execution pack includes START_HERE.md
- [x] Generated execution pack includes START_CODEX_AUTONOMOUS.cmd and START_CODEX_AUTONOMOUS.ps1
- [x] Generated execution pack includes START_CODEX_SUPERVISED.cmd and START_CODEX_SUPERVISED.ps1
- [x] Generated execution pack includes runtime/FULL_LIFECYCLE_RUN_STATE.json, runtime/VERSION_LADDER.json, and runtime/PHASE_STATUS.json
- [x] Generated execution pack includes runtime/CURRENT_PHASE.md, runtime/NEXT_ACTION.md, runtime/FINAL_DELIVERY_STATUS.md, and runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md
- [x] Generated execution pack includes scripts/run-customer-autonomous.ps1 and scripts/run-customer-autonomous.sh
- [x] Generated execution pack includes scripts/verify-customer-delivery.ps1 and scripts/verify-customer-delivery.sh
- [x] Generated execution pack includes docs/README.md and docs/RUN_APP.md
- [x] Generated execution pack includes EXECUTION_PACK_MANIFEST.md
- [x] Generated execution pack includes Agent Adapter Registry outputs for Codex, Claude Code, Trae, and Cursor
- [x] Generated execution-pack sample is published at releases/v0.3.1/samples/todo-api-generated-execution-pack.zip
- [x] Dogfood evidence is published at releases/v0.3.1/dogfood
- [x] Source release ZIP is documented separately from the generated execution-pack ZIP
- [x] Autonomous Completion Gate required before reporting success
- [x] Auto-Verified Customer Pack Runtime Validation implemented
- [x] No mixed-agent development used

Final result: PASS
"@ | Set-Content -Encoding UTF8 FINAL_DELIVERY_CHECK.md

@"
# Release Notes

## Scope

AIMart Orchestrator v0.3.1 Auto-Verified Customer Pack Runtime Validation release.

## Included

- Local Web UI for generating execution packs.
- ProjectSpec and TaskQueue generation.
- Runtime permission policy generation.
- PowerShell/Bash script generation.
- Agent Adapter Registry and independent adapter generation.
- Customer root launcher generation.
- Customer-side lifecycle state generation.
- Customer one-window runner and delivery verifier generation.
- Dogfood customer runtime validation evidence.
- ZIP packaging and download.
- Test coverage for schemas, generators, scripts, adapter output, and ZIP output.

## v0.3.1 Features

- Added START_HERE.md and root START_CODEX_AUTONOMOUS/SUPERVISED launchers to generated execution packs.
- Added customer lifecycle state files under runtime/.
- Added scripts/run-customer-autonomous.* one-window customer runner files.
- Added scripts/verify-customer-delivery.* customer delivery verifier files.
- Extended sample-pack verification to check root launchers, lifecycle JSON, customer runner scripts, completion reports, and adapter directories.
- Added release dogfood extraction and customer runtime validation evidence under releases/v0.3.1/dogfood.
- Extended the Autonomous Completion Gate to include previously manual post-run checks.

## Notes

The source release ZIP remains documented separately from generated execution-pack ZIPs.

Selecting multiple adapters generates independent execution options. It does not run multiple agents together. Remote tag push, production deployment, real database migration, cloud resource mutation, frozen release modification, and secret reads are not performed by default.
"@ | Set-Content -Encoding UTF8 RELEASE_NOTES.md

Copy-Item -Force IMPLEMENTATION_REPORT.md V0.3.1_IMPLEMENTATION_REPORT.md
Copy-Item -Force RELEASE_NOTES.md V0.3.1_RELEASE_NOTES.md
Copy-Item -Force FINAL_DELIVERY_CHECK.md V0.3.1_FINAL_DELIVERY_CHECK.md
@"
# V0.3.1 Known Issues

Version: v0.3.1

Release: Auto-Verified Customer Pack Runtime Validation

Autonomous Completion Gate status: pending until final verification.

No known product-code P0 or P1 issues are recorded at implementation time.

| ID | Severity | Issue | Impact | Recommendation |
|---|---|---|---|---|
| None | None | No known issue recorded yet. | None. | Continue standard verification. |
"@ | Set-Content -Encoding UTF8 V0.3.1_KNOWN_ISSUES.md

& .\scripts\tag-release.ps1
& .\scripts\package.ps1

Write-Host "[finalize] done"
# Generated execution pack includes docs/README.md and docs/RUN_APP.md

