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

## v0.3.0 Features

- Added typed Agent Adapter Registry entries for Codex, Claude Code, Trae, and Cursor.
- Added independent multi-target adapter generation with Codex as the strongest adapter.
- Added Codex End-to-End Autonomous prompt, delivery runbook, and launch scripts.
- Added End-to-End delivery roadmap, version ladder, phase gate plan, run state, current task, phase gate report, completion gate report, morning report, and next-version handoff files.
- Added EXECUTION_PACK_MANIFEST.md.
- Added Web UI controls for target AI adapters, execution scope, and execution mode.
- Extended completion gates to verify adapter directories, runbooks, prompts, manifest, RUN_STATE.json, current task, phase reports, and completion reports.

## Notes

The source release ZIP remains documented separately from the generated execution-pack ZIP.

Selecting multiple adapters generates multiple independent execution options. It does not run multiple agents together. Remote tag push, production deployment, real database migration, cloud resource mutation, frozen release modification, and secret reads are not performed by default.
