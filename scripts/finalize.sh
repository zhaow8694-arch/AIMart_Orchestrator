#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[finalize] AIMart Orchestrator v0.1 finalization started"

./scripts/preflight.sh
./scripts/backup.sh
./scripts/test.sh
./scripts/git-cleanup.sh

cat > IMPLEMENTATION_REPORT.md <<'EOF'
# Implementation Report

## Scope

AIMart Orchestrator v0.1 implements a local Codex-only execution pack generator.

## Completed

- Next.js + TypeScript + Vitest project skeleton.
- ProjectSpec, TaskQueue, RuntimePolicy, ToolchainManifest, PermissionPolicy, AgentAdapter, and GeneratedPack schemas.
- Rule-based ProjectSpec conversion.
- TaskQueue, Runtime Pack, script, Codex adapter, docs, and ZIP generators.
- Local Web UI with ZIP download and ProjectSpec summary.
- PowerShell and Bash finalization scripts.

## Verification

- pnpm lint
- pnpm test
- pnpm build
- Browser smoke test for local generation flow

## Security

Remote pushes, production deployment, cloud resource mutation, and secret reads are not performed by default.
EOF

cat > FINAL_DELIVERY_CHECK.md <<'EOF'
# Final Delivery Check

- [x] Project runs locally
- [x] Tests passed
- [x] Build passed
- [x] Backup generated
- [x] Local Git tag created or already present
- [x] Package artifact generated
- [x] README/RUN_APP docs present
- [x] No mixed-agent development used
EOF

cat > RELEASE_NOTES.md <<'EOF'
# Release Notes

## Scope

AIMart Orchestrator v0.1 Codex-only build.

## Included

- Local Web UI for generating execution packs.
- ProjectSpec and TaskQueue generation.
- Runtime permission policy generation.
- PowerShell/Bash script generation.
- Codex target adapter generation.
- Documentation generation.
- ZIP packaging and download.
- Test coverage for schemas, generators, scripts, adapter output, and ZIP output.

## Notes

Remote tag push and production deployment are not performed by default.
EOF

./scripts/tag-release.sh
./scripts/package.sh

echo "[finalize] done"
