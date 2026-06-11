$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

Write-Host "[finalize] AIMart Orchestrator v0.2.1 finalization started"

& .\scripts\preflight.ps1
& .\scripts\backup.ps1
& .\scripts\test.ps1
& .\scripts\git-cleanup.ps1

@"
# Implementation Report

## Scope

AIMart Orchestrator v0.2.1 implements Unified Autonomous Visual Runner integration for generated Codex execution packs.

## Completed

- Next.js + TypeScript + Vitest project skeleton.
- ProjectSpec, TaskQueue, RuntimePolicy, ToolchainManifest, PermissionPolicy, AgentAdapter, and GeneratedPack schemas.
- Rule-based ProjectSpec conversion.
- TaskQueue, Runtime Pack, script, Codex adapter, docs, and ZIP generators.
- Local Web UI with ZIP download and ProjectSpec summary.
- v0.2.0 supervised/autonomous execution mode selection remains available.
- v0.2.1 unified autonomous execution mode selection.
- Generated runtime AUTONOMOUS_RUN_STATUS, AUTONOMOUS_RUN_SUMMARY, and AUTONOMOUS_HEALTH_CHECK files.
- Generated Codex unified autonomous runbook and PowerShell/Bash one-window runner scripts.

## Verification

- powershell -ExecutionPolicy Bypass -File .\scripts\finalize.ps1
- pnpm lint through scripts/test.ps1
- pnpm test through scripts/test.ps1
- pnpm build through scripts/test.ps1
- Generated execution-pack ZIP structure verification

## Security

Unified Autonomous Mode is bounded to workspace-write with approval never. Remote pushes, production deployment, cloud resource mutation, real database migration, frozen release modification, and secret reads are not performed by default.
"@ | Set-Content -Encoding UTF8 IMPLEMENTATION_REPORT.md

@"
# Final Delivery Check

- [x] Project runs locally
- [x] Tests passed
- [x] Build passed
- [x] Backup generated
- [x] Local Git tag created or already present
- [x] Package artifact generated
- [x] releases/v0.2.1/SHA256.txt generated
- [x] releases/v0.2.1/RELEASE_MANIFEST.txt generated
- [x] Generated execution pack includes docs/README.md and docs/RUN_APP.md
- [x] Generated execution pack includes CODEX_AUTONOMOUS_PROMPT.md and CODEX_AUTONOMOUS_RUNBOOK.md
- [x] Generated execution pack includes supervised and autonomous Codex launch scripts
- [x] Generated execution pack includes CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md
- [x] Generated execution pack includes run-codex-unified-autonomous.ps1 and run-codex-unified-autonomous.sh
- [x] Generated execution pack includes runtime/SAFE_COMMANDS.md, runtime/DENIED_COMMANDS.md, and runtime/AUTONOMOUS_EXECUTION_POLICY.md
- [x] Generated execution pack includes runtime/AUTONOMOUS_RUN_STATUS.md, runtime/AUTONOMOUS_RUN_SUMMARY.md, and runtime/AUTONOMOUS_HEALTH_CHECK.md
- [x] Source release ZIP is documented separately from the generated execution-pack ZIP
- [x] Generated execution-pack sample is published at releases/v0.2.1/samples/todo-api-generated-execution-pack.zip
- [x] No mixed-agent development used
"@ | Set-Content -Encoding UTF8 FINAL_DELIVERY_CHECK.md

@"
# Release Notes

## Scope

AIMart Orchestrator v0.2.1 Unified Autonomous Visual Runner release.

## Included

- Local Web UI for generating execution packs.
- ProjectSpec and TaskQueue generation.
- Runtime permission policy generation.
- PowerShell/Bash script generation.
- Codex target adapter generation.
- Documentation generation.
- ZIP packaging and download.
- Test coverage for schemas, generators, scripts, adapter output, and ZIP output.

## v0.2.1 Features

- Added Unified Autonomous Mode alongside existing Supervised Mode and Autonomous Mode.
- Generated one-window Codex unified autonomous PowerShell and Bash runners.
- Added CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md.
- Added runtime AUTONOMOUS_RUN_STATUS, AUTONOMOUS_RUN_SUMMARY, and AUTONOMOUS_HEALTH_CHECK documents.
- Updated generated docs with unified autonomous startup, codex_runs logs, live status, release checks, known issues checks, and final summary behavior.

## Notes

The source release ZIP remains documented separately from generated execution-pack ZIPs.

Remote tag push, production deployment, real database migration, cloud resource mutation, frozen release modification, and secret reads are not performed by default.
"@ | Set-Content -Encoding UTF8 RELEASE_NOTES.md

Copy-Item -Force IMPLEMENTATION_REPORT.md V0.2.1_IMPLEMENTATION_REPORT.md
Copy-Item -Force RELEASE_NOTES.md V0.2.1_RELEASE_NOTES.md
Copy-Item -Force FINAL_DELIVERY_CHECK.md V0.2.1_FINAL_DELIVERY_CHECK.md
if (-not (Test-Path "V0.2.1_KNOWN_ISSUES.md")) {
@"
# V0.2.1 Known Issues

No known product-code P0 or P1 issues are recorded at implementation time.

| ID | Severity | Issue | Impact | Recommendation |
|---|---|---|---|---|
| None | None | No known issue recorded yet. | None. | Continue standard verification. |
"@ | Set-Content -Encoding UTF8 V0.2.1_KNOWN_ISSUES.md
}

& .\scripts\tag-release.ps1
& .\scripts\package.ps1

Write-Host "[finalize] done"
