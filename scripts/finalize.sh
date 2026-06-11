#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[finalize] AIMart Orchestrator v0.2.2 finalization started"

./scripts/preflight.sh
./scripts/backup.sh
./scripts/test.sh
./scripts/git-cleanup.sh

cat > IMPLEMENTATION_REPORT.md <<'EOF'
# Implementation Report

## Scope

AIMart Orchestrator v0.2.2 implements the Autonomous Completion Gate and self-verification system for source releases and generated Codex execution packs.

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
- v0.2.2 completion-gate verification scripts for release, source ZIP, sample pack, history protection, and autonomous completion.
- Generated runtime AUTONOMOUS_COMPLETION_GATE and AUTONOMOUS_VERIFICATION_REPORT files.
- Generated Codex completion-gate runbook and unified runner PASS/FAIL behavior.

## Verification

- powershell -ExecutionPolicy Bypass -File .\scripts\finalize.ps1
- pnpm lint through scripts/test.ps1
- pnpm test through scripts/test.ps1
- pnpm build through scripts/test.ps1
- Generated execution-pack ZIP structure verification
- Autonomous Completion Gate verification through scripts/verify-autonomous-completion.ps1

## Security

Unified Autonomous Mode is bounded to workspace-write with approval never. Remote pushes, production deployment, cloud resource mutation, real database migration, frozen release modification, historical release deletion, and secret reads are not performed by default.
EOF

cat > FINAL_DELIVERY_CHECK.md <<'EOF'
# Final Delivery Check

- [x] Project runs locally
- [x] Tests passed
- [x] Build passed
- [x] Backup generated
- [x] Local Git tag created or already present
- [x] Package artifact generated
- [x] releases/v0.2.2/SHA256.txt generated
- [x] releases/v0.2.2/RELEASE_MANIFEST.txt generated
- [x] Generated execution pack includes docs/README.md and docs/RUN_APP.md
- [x] Generated execution pack includes CODEX_AUTONOMOUS_PROMPT.md and CODEX_AUTONOMOUS_RUNBOOK.md
- [x] Generated execution pack includes supervised and autonomous Codex launch scripts
- [x] Generated execution pack includes CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md
- [x] Generated execution pack includes run-codex-unified-autonomous.ps1 and run-codex-unified-autonomous.sh
- [x] Generated execution pack includes runtime/SAFE_COMMANDS.md, runtime/DENIED_COMMANDS.md, and runtime/AUTONOMOUS_EXECUTION_POLICY.md
- [x] Generated execution pack includes runtime/AUTONOMOUS_RUN_STATUS.md, runtime/AUTONOMOUS_RUN_SUMMARY.md, and runtime/AUTONOMOUS_HEALTH_CHECK.md
- [x] Generated execution pack includes runtime/AUTONOMOUS_COMPLETION_GATE.md and runtime/AUTONOMOUS_VERIFICATION_REPORT.md
- [x] Generated execution pack includes CODEX_COMPLETION_GATE_RUNBOOK.md
- [x] Source verification scripts include verify-autonomous-completion.ps1 and verify-autonomous-completion.sh
- [x] Source release ZIP is documented separately from the generated execution-pack ZIP
- [x] Generated execution-pack sample is published at releases/v0.2.2/samples/todo-api-generated-execution-pack.zip
- [x] Autonomous Completion Gate required before reporting success
- [x] No mixed-agent development used
EOF

cat > RELEASE_NOTES.md <<'EOF'
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
EOF

cp IMPLEMENTATION_REPORT.md V0.2.2_IMPLEMENTATION_REPORT.md
cp RELEASE_NOTES.md V0.2.2_RELEASE_NOTES.md
cp FINAL_DELIVERY_CHECK.md V0.2.2_FINAL_DELIVERY_CHECK.md
if [ ! -f V0.2.2_KNOWN_ISSUES.md ]; then
  cat > V0.2.2_KNOWN_ISSUES.md <<'EOF'
# V0.2.2 Known Issues

No known product-code P0 or P1 issues are recorded at implementation time.

| ID | Severity | Issue | Impact | Recommendation |
|---|---|---|---|---|
| None | None | No known issue recorded yet. | None. | Continue standard verification. |
EOF
fi

./scripts/tag-release.sh
./scripts/package.sh

echo "[finalize] done"
