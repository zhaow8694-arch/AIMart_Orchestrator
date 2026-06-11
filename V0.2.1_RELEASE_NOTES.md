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
