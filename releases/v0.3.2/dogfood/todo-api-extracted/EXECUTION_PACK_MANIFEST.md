# Execution Pack Manifest

Project: Todo API

## Selected adapters

- Codex (codex) -> agent_adapters/codex
- Claude Code (claude-code) -> agent_adapters/claude-code
- Trae (trae) -> agent_adapters/trae
- Cursor (cursor) -> agent_adapters/cursor

Selecting multiple adapters means generating multiple independent execution options. It does not mean running multiple agents together.

Choose one adapter when executing against a workspace. Do not run multiple agents against the same workspace at the same time unless a human manually coordinates ownership.

## Execution Configuration

- Execution scope: end_to_end_delivery
- Execution mode: end_to_end_autonomous

## Generated Files Summary

- START_HERE.md and START_CODEX_* root launchers for customer entry
- common/ project specifications, task queue, autonomous roadmap, and phase gates
- runtime/ permission policy, lifecycle run state, current task, phase reports, and completion reports
- scripts/ stable autonomous version runner, stage machine, sample normalizer, failure classifier, customer runner, delivery verifier, and completion-gate verification
- agent_adapters/ independent adapter directories for selected targets
- docs/ customer-facing run and delivery documentation

Adapter file count: 38

## How To Start One Selected Agent

1. Pick exactly one adapter directory under agent_adapters/.
2. Read START_HERE.md.
3. Run one root-level launcher such as START_CODEX_AUTONOMOUS.ps1.
4. Use the approved command only: `powershell -ExecutionPolicy Bypass -File .\scripts\run-autonomous-version.ps1 -TargetVersion v1.0`.
5. Approved runner script path: scripts/run-autonomous-version.ps1.
6. Let the selected adapter follow common/AUTONOMOUS_DELIVERY_ROADMAP.md, common/PHASE_GATE_PLAN.md, runtime/RUNNER_STATE.json, runtime/FULL_LIFECYCLE_RUN_STATE.json, and runtime/COMPLETION_GATE_REPORT.md.
7. Continue until scripts/verify-customer-delivery.* and runtime/COMPLETION_GATE_REPORT.md report PASS.

> `-ExecutionPolicy Bypass` applies to that one PowerShell process only and does not change your machine's execution policy. It lets the pack launch straight from a downloaded ZIP without a manual unblock step.

Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners.

## Completion Gate Requirements

- Codex: Codex runbooks and prompts exist.
- Codex: End-to-end autonomous prompt and delivery runbook exist.
- Codex: PowerShell and Bash launchers exist for supervised, autonomous, unified, and end-to-end autonomous modes.
- Claude Code: CLAUDE.md, runbook, task prompt, autonomous prompt, and end-to-end runbook exist.
- Claude Code: settings.example.json exists with project-local safety defaults.
- Claude Code: Run instructions warn not to run multiple agents against the same workspace.
- Trae: Trae runbook, task prompt, autonomous prompt, end-to-end runbook, and config YAML exist.
- Trae: Run instructions keep Trae isolated from other generated adapter options.
- Cursor: Cursor runbook, task prompt, autonomous rules, end-to-end runbook, and project rules exist.
- Cursor: Rules explain adapter selection is independent and not multi-agent collaboration.
- runtime/RUN_STATE.json must be valid JSON.
- runtime/RUNNER_STATE.json must be valid JSON and list all v0.3.2 runner stages.
- scripts/normalize-sample-pack.* and scripts/classify-runner-failure.* must exist.
- runtime/FULL_LIFECYCLE_RUN_STATE.json, runtime/VERSION_LADDER.json, and runtime/PHASE_STATUS.json must be coherent JSON.
- runtime/CURRENT_TASK.md must exist.
- runtime/PHASE_GATE_REPORT.md and runtime/COMPLETION_GATE_REPORT.md must be initialized or updated.
- runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md must record PASS before customer delivery is accepted.

## High-Risk Command Policy

High-risk commands are not executed automatically. Record them in runtime/APPROVAL_QUEUE.md with risk, reason, blocking status, and recommendation, then continue safe independent work when possible.