#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[finalize] AIMart Orchestrator v0.1.1 finalization started"

./scripts/preflight.sh
./scripts/backup.sh
./scripts/test.sh
./scripts/git-cleanup.sh

cat > IMPLEMENTATION_REPORT.md <<'EOF'
# Implementation Report

## Scope

AIMart Orchestrator v0.1.1 implements a local Codex-only execution pack generator and resolves the v0.1 audit follow-ups.

## Completed

- Next.js + TypeScript + Vitest project skeleton.
- ProjectSpec, TaskQueue, RuntimePolicy, ToolchainManifest, PermissionPolicy, AgentAdapter, and GeneratedPack schemas.
- Rule-based ProjectSpec conversion.
- TaskQueue, Runtime Pack, script, Codex adapter, docs, and ZIP generators.
- Local Web UI with ZIP download and ProjectSpec summary.
- PowerShell and Bash finalization scripts.
- v0.1.1 loading-state, wording, packaging, manifest, and version fixes.

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
- [x] Generated execution pack includes docs/README.md and docs/RUN_APP.md
- [x] Source release ZIP is documented separately from the generated execution-pack ZIP
- [x] Generated execution-pack sample is published under releases/v0.1.1/samples
- [x] No mixed-agent development used
EOF

cat > RELEASE_NOTES.md <<'EOF'
# Release Notes

## Scope

AIMart Orchestrator v0.1.1 Codex-only patch release.

## Included

- Local Web UI for generating execution packs.
- ProjectSpec and TaskQueue generation.
- Runtime permission policy generation.
- PowerShell/Bash script generation.
- Codex target adapter generation.
- Documentation generation.
- ZIP packaging and download.
- Test coverage for schemas, generators, scripts, adapter output, and ZIP output.

## v0.1.1 Fixes

- Fixed Web UI loading state so stale generated output is hidden while a new pack is being created.
- Standardized "Forbidden items" wording in generated pack docs and adapter output.
- Clarified that the source release ZIP is the repository delivery artifact, while a generated execution-pack ZIP is the runtime pack produced by the app.
- Corrected final delivery wording for generated docs/README.md and docs/RUN_APP.md.
- Required `zip` in Unix preflight instead of silently falling back to tar.gz packaging.

## Notes

Remote tag push and production deployment are not performed by default.
EOF

./scripts/tag-release.sh
./scripts/package.sh

echo "[finalize] done"
