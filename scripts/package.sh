#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
VERSION="$(node -e "try{const p=require('./package.json'); process.stdout.write(p.version || '0.1.1')}catch(e){process.stdout.write('0.1.1')}")"
OUT_DIR="releases/v$VERSION"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/aimart-orchestrator-v$VERSION-source.zip"
SAMPLE_DIR="$OUT_DIR/samples"
SAMPLE_OUT="$SAMPLE_DIR/todo-api-generated-execution-pack.zip"

echo "[package] creating $OUT"

zip -r "$OUT" . \
  -x "node_modules/*" ".next/*" "dist/*" "coverage/*" ".vite-cache/*" ".git/*" \
  -x ".aimart" ".aimart/*" ".aimart_backups" ".aimart_backups/*" \
  -x ".aimart_artifacts" ".aimart_artifacts/*" "codex_runs" "codex_runs/*" \
  -x "releases" "releases/*" ".env*" \
  -x "verify-temp" "verify-temp/*" "verification-temp" "verification-temp/*" \
  -x ".verification" ".verification/*"

mkdir -p "$SAMPLE_DIR"
node scripts/create-sample-pack.mjs "$SAMPLE_OUT"

SOURCE_HASH="$(sha256sum "$OUT" | awk '{print $1}')"
SAMPLE_HASH="$(sha256sum "$SAMPLE_OUT" | awk '{print $1}')"
cat > "$OUT_DIR/SHA256.txt" <<EOF
$SOURCE_HASH  aimart-orchestrator-v$VERSION-source.zip
$SAMPLE_HASH  samples/todo-api-generated-execution-pack.zip
EOF

cat > "$OUT_DIR/RELEASE_MANIFEST.txt" <<EOF
# AIMart Orchestrator v$VERSION Release Manifest

## Artifacts

- aimart-orchestrator-v$VERSION-source.zip
- samples/todo-api-generated-execution-pack.zip
- SHA256.txt
- RELEASE_MANIFEST.txt

## Source ZIP Exclusions

- node_modules
- .next
- .git
- codex_runs
- temporary verification directories
- historical releases
- .env and secret files

## Sample Execution Pack Verification

- EXECUTION_PACK_MANIFEST.md
- common/PROJECT_SPEC.md
- common/TASK_QUEUE.md
- common/EXECUTION_RULES.md
- common/AUTONOMOUS_DELIVERY_ROADMAP.md
- common/VERSION_LADDER.md
- common/PHASE_GATE_PLAN.md
- common/CURRENT_PHASE.md
- runtime/SAFE_COMMANDS.md
- runtime/DENIED_COMMANDS.md
- runtime/APPROVAL_QUEUE.md
- runtime/AUTONOMOUS_EXECUTION_POLICY.md
- runtime/AUTONOMOUS_RUN_STATUS.md
- runtime/AUTONOMOUS_RUN_SUMMARY.md
- runtime/AUTONOMOUS_HEALTH_CHECK.md
- runtime/AUTONOMOUS_COMPLETION_GATE.md
- runtime/AUTONOMOUS_VERIFICATION_REPORT.md
- runtime/END_TO_END_AUTONOMOUS_POLICY.md
- runtime/RUN_STATE.json
- runtime/CURRENT_TASK.md
- runtime/PHASE_GATE_REPORT.md
- runtime/COMPLETION_GATE_REPORT.md
- runtime/MORNING_REPORT.md
- runtime/HANDOFF_TO_NEXT_VERSION.md
- agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md
- agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md
- agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md
- agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md
- agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md
- agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md
- agent_adapters/codex/run-codex-autonomous.ps1
- agent_adapters/codex/run-codex-supervised.ps1
- agent_adapters/codex/run-codex-unified-autonomous.ps1
- agent_adapters/codex/run-codex-end-to-end-autonomous.ps1
- agent_adapters/codex/run-codex-autonomous.sh
- agent_adapters/codex/run-codex-supervised.sh
- agent_adapters/codex/run-codex-unified-autonomous.sh
- agent_adapters/codex/run-codex-end-to-end-autonomous.sh
- agent_adapters/claude-code/CLAUDE.md
- agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md
- agent_adapters/trae/TRAE_RUNBOOK.md
- agent_adapters/trae/TRAE_TASK_PROMPT.md
- agent_adapters/cursor/CURSOR_RUNBOOK.md
- agent_adapters/cursor/CURSOR_TASK_PROMPT.md
- docs/README.md
- docs/RUN_APP.md
- docs/SECURITY_AND_PERMISSIONS.md
EOF

echo "[package] done"
