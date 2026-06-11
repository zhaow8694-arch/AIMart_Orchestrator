# Release Notes

## Scope

AIMart Orchestrator v0.2.2 Autonomous Completion Gate release.

## Included

- Local Web UI for generating execution packs.
- ProjectSpec and TaskQueue generation.
- Runtime permission policy generation.
- PowerShell/Bash script generation.
- Codex target adapter generation.
- Documentation generation.
- ZIP packaging and download.
- Test coverage for schemas, generators, scripts, adapter output, and ZIP output.

## v0.2.2 Features

- Added Autonomous Completion Gate verification scripts for source releases.
- Added source ZIP verification for forbidden folders, old releases, .env files, and secret-like files.
- Added sample execution-pack ZIP extraction and required-file verification.
- Added SHA256 verification for source and sample ZIP artifacts.
- Added historical release protection for v0.1.0, v0.1.1, and v0.2.1.
- Added generated runtime AUTONOMOUS_COMPLETION_GATE and AUTONOMOUS_VERIFICATION_REPORT docs.
- Added CODEX_COMPLETION_GATE_RUNBOOK.md.
- Updated unified autonomous runners to display target version, branch, startup cleanliness, existing Codex process detection, release artifact status, log activity, stalled-log status, and Autonomous Completion Gate PASS/FAIL.

## Notes

The source release ZIP remains documented separately from generated execution-pack ZIPs.

Remote tag push, production deployment, real database migration, cloud resource mutation, frozen release modification, and secret reads are not performed by default.
