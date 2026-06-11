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

DOGFOOD_DIR="$OUT_DIR/dogfood"
DOGFOOD_EXTRACT_DIR="$DOGFOOD_DIR/todo-api-extracted"
rm -rf "$DOGFOOD_DIR"
mkdir -p "$DOGFOOD_EXTRACT_DIR"
unzip -q "$SAMPLE_OUT" -d "$DOGFOOD_EXTRACT_DIR"

dogfood_required=(
  "START_HERE.md"
  "START_CODEX_AUTONOMOUS.cmd"
  "START_CODEX_AUTONOMOUS.ps1"
  "runtime/FULL_LIFECYCLE_RUN_STATE.json"
  "runtime/VERSION_LADDER.json"
  "runtime/PHASE_STATUS.json"
  "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md"
  "scripts/run-customer-autonomous.ps1"
  "scripts/run-customer-autonomous.sh"
  "scripts/verify-customer-delivery.ps1"
  "scripts/verify-customer-delivery.sh"
  "agent_adapters/codex"
  "agent_adapters/claude-code"
  "agent_adapters/claude-code/CLAUDE.md"
  "agent_adapters/claude-code/CLAUDE_RUNBOOK.md"
  "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md"
  "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md"
  "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md"
  "agent_adapters/trae"
  "agent_adapters/trae/TRAE_RUNBOOK.md"
  "agent_adapters/trae/TRAE_TASK_PROMPT.md"
  "agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md"
  "agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md"
  "agent_adapters/cursor"
  "agent_adapters/cursor/CURSOR_RUNBOOK.md"
  "agent_adapters/cursor/CURSOR_TASK_PROMPT.md"
  "agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md"
  "agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md"
)

for entry in "${dogfood_required[@]}"; do
  [ -e "$DOGFOOD_EXTRACT_DIR/$entry" ] || { echo "Dogfood sample pack extraction missing required entry: $entry" >&2; exit 1; }
done

(
  cd "$DOGFOOD_EXTRACT_DIR"
  bash scripts/verify-customer-delivery.sh
)

unzip -Z1 "$SAMPLE_OUT" | sort > "$DOGFOOD_DIR/ZIP_ENTRIES.txt"
cat > "$DOGFOOD_DIR/DOGFOOD_CUSTOMER_RUNTIME_VALIDATION.md" <<EOF
# Dogfood Customer Runtime Validation

Version: v$VERSION
Sample ZIP: $SAMPLE_OUT
Extracted pack: $DOGFOOD_EXTRACT_DIR

## Checks

- Root START_HERE.md exists: PASS
- Root START_CODEX_AUTONOMOUS.cmd exists: PASS
- Root START_CODEX_AUTONOMOUS.ps1 exists: PASS
- Runtime lifecycle state files exist: PASS
- Customer runner files exist: PASS
- Adapter directories codex, claude-code, trae, cursor exist: PASS
- Customer delivery verifier result: PASS

Final result: PASS
EOF

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
- dogfood/DOGFOOD_CUSTOMER_RUNTIME_VALIDATION.md
- dogfood/ZIP_ENTRIES.txt
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

- START_HERE.md
- START_CODEX_AUTONOMOUS.cmd
- START_CODEX_AUTONOMOUS.ps1
- START_CODEX_SUPERVISED.cmd
- START_CODEX_SUPERVISED.ps1
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
- runtime/FULL_LIFECYCLE_RUN_STATE.json
- runtime/VERSION_LADDER.json
- runtime/PHASE_STATUS.json
- runtime/CURRENT_TASK.md
- runtime/CURRENT_PHASE.md
- runtime/NEXT_ACTION.md
- runtime/PHASE_GATE_REPORT.md
- runtime/COMPLETION_GATE_REPORT.md
- runtime/FINAL_DELIVERY_STATUS.md
- runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md
- runtime/MORNING_REPORT.md
- runtime/HANDOFF_TO_NEXT_VERSION.md
- scripts/run-customer-autonomous.ps1
- scripts/run-customer-autonomous.sh
- scripts/verify-customer-delivery.ps1
- scripts/verify-customer-delivery.sh
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
- agent_adapters/claude-code/CLAUDE_RUNBOOK.md
- agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md
- agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md
- agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md
- agent_adapters/trae/TRAE_RUNBOOK.md
- agent_adapters/trae/TRAE_TASK_PROMPT.md
- agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md
- agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md
- agent_adapters/cursor/CURSOR_RUNBOOK.md
- agent_adapters/cursor/CURSOR_TASK_PROMPT.md
- agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md
- agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md
- docs/README.md
- docs/RUN_APP.md
- docs/SECURITY_AND_PERMISSIONS.md

## Dogfood Evidence

- releases/v$VERSION/dogfood/DOGFOOD_CUSTOMER_RUNTIME_VALIDATION.md
- releases/v$VERSION/dogfood/ZIP_ENTRIES.txt
- releases/v$VERSION/dogfood/todo-api-extracted/runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md
- customer runtime validation evidence: PASS
EOF

echo "[package] done"
