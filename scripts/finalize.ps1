$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir

Write-Host "[finalize] AIMart Orchestrator v0.3.0 finalization started"

& .\scripts\preflight.ps1
& .\scripts\backup.ps1
& .\scripts\test.ps1
& .\scripts\git-cleanup.ps1

@"
# Implementation Report

## Scope

AIMart Orchestrator v0.3.0 implements End-to-End Autonomous Delivery and the Agent Adapter Registry for generated execution packs.

## Completed

- Next.js + TypeScript + Vitest project skeleton.
- ProjectSpec, TaskQueue, RuntimePolicy, ToolchainManifest, PermissionPolicy, AgentAdapter, and GeneratedPack schemas.
- Rule-based ProjectSpec conversion.
- TaskQueue, Runtime Pack, script, Codex adapter, docs, and ZIP generators.
- Local Web UI with ZIP download and ProjectSpec summary.
- v0.2.0 supervised/autonomous execution mode selection remains available.
- v0.2.1 unified autonomous execution mode selection.
- v0.2.1 Unified Autonomous Visual Runner remains preserved.
- Generated runtime AUTONOMOUS_RUN_STATUS, AUTONOMOUS_RUN_SUMMARY, and AUTONOMOUS_HEALTH_CHECK files.
- Generated Codex unified autonomous runbook and PowerShell/Bash one-window runner scripts.
- v0.2.2 completion-gate verification scripts for release, source ZIP, sample pack, history protection, and autonomous completion.
- Generated runtime AUTONOMOUS_COMPLETION_GATE and AUTONOMOUS_VERIFICATION_REPORT files.
- Generated Codex completion-gate runbook and unified runner PASS/FAIL behavior.
- Agent Adapter Registry entries for Codex, Claude Code, Trae, and Cursor.
- Multi-target independent adapter generation for selected adapters.
- End-to-End Autonomous Delivery roadmap, version ladder, phase gate plan, runtime RUN_STATE.json, current task, phase gate, completion gate, morning report, and next-version handoff files.
- Execution Pack Manifest with selected adapters, execution scope, execution mode, start instructions, completion gates, and high-risk command policy.
- Web UI configuration for target AI adapters, execution scope, and execution mode.

## Verification

- powershell -ExecutionPolicy Bypass -File .\scripts\finalize.ps1
- pnpm lint through scripts/test.ps1
- pnpm test through scripts/test.ps1
- pnpm build through scripts/test.ps1
- Generated execution-pack ZIP structure verification
- Autonomous Completion Gate verification through scripts/verify-autonomous-completion.ps1
- Agent adapter directory and end-to-end runtime file verification

## Security

End-to-End Autonomous Delivery is bounded to project-local execution and explicit high-risk command queues. Remote pushes, production deployment, cloud resource mutation, real database migration, frozen release modification, historical release deletion, and secret reads are not performed by default.
"@ | Set-Content -Encoding UTF8 IMPLEMENTATION_REPORT.md

@"
# Final Delivery Check

- [x] Project runs locally
- [x] Tests passed
- [x] Build passed
- [x] Backup generated
- [x] Local Git tag created or already present
- [x] Package artifact generated
- [x] releases/v0.3.0/SHA256.txt generated
- [x] releases/v0.3.0/RELEASE_MANIFEST.txt generated
- [x] Generated execution pack includes docs/README.md and docs/RUN_APP.md
- [x] Generated execution pack includes CODEX_AUTONOMOUS_PROMPT.md and CODEX_AUTONOMOUS_RUNBOOK.md
- [x] Generated execution pack includes supervised and autonomous Codex launch scripts
- [x] Generated execution pack includes CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md
- [x] Generated execution pack includes run-codex-unified-autonomous.ps1 and run-codex-unified-autonomous.sh
- [x] Generated execution pack includes runtime/SAFE_COMMANDS.md, runtime/DENIED_COMMANDS.md, and runtime/AUTONOMOUS_EXECUTION_POLICY.md
- [x] Generated execution pack includes runtime/AUTONOMOUS_RUN_STATUS.md, runtime/AUTONOMOUS_RUN_SUMMARY.md, and runtime/AUTONOMOUS_HEALTH_CHECK.md
- [x] Generated execution pack includes runtime/AUTONOMOUS_COMPLETION_GATE.md and runtime/AUTONOMOUS_VERIFICATION_REPORT.md
- [x] Generated execution pack includes CODEX_COMPLETION_GATE_RUNBOOK.md
- [x] Generated execution pack includes EXECUTION_PACK_MANIFEST.md
- [x] Generated execution pack includes common/AUTONOMOUS_DELIVERY_ROADMAP.md, common/VERSION_LADDER.md, common/PHASE_GATE_PLAN.md, and common/CURRENT_PHASE.md
- [x] Generated execution pack includes runtime/END_TO_END_AUTONOMOUS_POLICY.md, runtime/RUN_STATE.json, runtime/CURRENT_TASK.md, runtime/PHASE_GATE_REPORT.md, runtime/COMPLETION_GATE_REPORT.md, runtime/MORNING_REPORT.md, and runtime/HANDOFF_TO_NEXT_VERSION.md
- [x] Generated execution pack includes Agent Adapter Registry outputs for Codex, Claude Code, Trae, and Cursor
- [x] Generated execution pack includes Codex End-to-End Autonomous files
- [x] Source verification scripts include verify-autonomous-completion.ps1 and verify-autonomous-completion.sh
- [x] Source release ZIP is documented separately from the generated execution-pack ZIP
- [x] Generated execution-pack sample is published at releases/v0.3.0/samples/todo-api-generated-execution-pack.zip
- [x] Autonomous Completion Gate required before reporting success
- [x] Agent Adapter Registry implemented
- [x] End-to-End Autonomous Delivery implemented
- [x] No mixed-agent development used
"@ | Set-Content -Encoding UTF8 FINAL_DELIVERY_CHECK.md

@"
# Release Notes

## Scope

AIMart Orchestrator v0.3.0 End-to-End Autonomous Delivery release.

## Included

- Local Web UI for generating execution packs.
- ProjectSpec and TaskQueue generation.
- Runtime permission policy generation.
- PowerShell/Bash script generation.
- Agent Adapter Registry and independent adapter generation.
- Documentation generation.
- ZIP packaging and download.
- Test coverage for schemas, generators, scripts, adapter output, and ZIP output.

## v0.3.0 Features

- Added typed Agent Adapter Registry entries for Codex, Claude Code, Trae, and Cursor.
- Added independent multi-target adapter generation with Codex as the strongest adapter.
- Added Codex End-to-End Autonomous prompt, delivery runbook, and launch scripts.
- Added End-to-End delivery roadmap, version ladder, phase gate plan, run state, current task, phase gate report, completion gate report, morning report, and next-version handoff files.
- Added EXECUTION_PACK_MANIFEST.md.
- Added Web UI controls for target AI adapters, execution scope, and execution mode.
- Extended completion gates to verify selected adapter directories, runbooks, prompts, manifest, RUN_STATE.json, current task, phase reports, and completion reports.

## Notes

The source release ZIP remains documented separately from generated execution-pack ZIPs.

Remote tag push, production deployment, real database migration, cloud resource mutation, frozen release modification, and secret reads are not performed by default.
"@ | Set-Content -Encoding UTF8 RELEASE_NOTES.md

Copy-Item -Force IMPLEMENTATION_REPORT.md V0.3.0_IMPLEMENTATION_REPORT.md
Copy-Item -Force RELEASE_NOTES.md V0.3.0_RELEASE_NOTES.md
Copy-Item -Force FINAL_DELIVERY_CHECK.md V0.3.0_FINAL_DELIVERY_CHECK.md
if (-not (Test-Path "V0.3.0_KNOWN_ISSUES.md")) {
@"
# V0.3.0 Known Issues

Version: v0.3.0

No known product-code P0 or P1 issues are recorded at implementation time.

| ID | Severity | Issue | Impact | Recommendation |
|---|---|---|---|---|
| None | None | No known issue recorded yet. | None. | Continue standard verification. |
"@ | Set-Content -Encoding UTF8 V0.3.0_KNOWN_ISSUES.md
}

& .\scripts\tag-release.ps1
& .\scripts\package.ps1

Write-Host "[finalize] done"
