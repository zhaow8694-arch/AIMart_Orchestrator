#!/usr/bin/env bash
set -euo pipefail

TARGET_VERSION="${1:-}"
echo "[Autonomous Completion Gate] verify-sample-pack TargetVersion=$TARGET_VERSION"

if [ -z "$TARGET_VERSION" ]; then
  TARGET_VERSION="v$(node -e "const p=require('./package.json'); process.stdout.write(p.version)")"
fi
case "$TARGET_VERSION" in
  v*) ;;
  *) TARGET_VERSION="v$TARGET_VERSION" ;;
esac

SAMPLE_ZIP="releases/$TARGET_VERSION/samples/todo-api-generated-execution-pack.zip"
if [ ! -f "$SAMPLE_ZIP" ]; then
  echo "Missing sample execution-pack ZIP: $SAMPLE_ZIP" >&2
  exit 1
fi

TEMP_DIR="codex_runs/verify-sample-pack-$TARGET_VERSION"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
unzip -q "$SAMPLE_ZIP" -d "$TEMP_DIR"

required=(
  "EXECUTION_PACK_MANIFEST.md"
  "common/PROJECT_SPEC.md"
  "common/TASK_QUEUE.md"
  "common/EXECUTION_RULES.md"
  "common/AUTONOMOUS_DELIVERY_ROADMAP.md"
  "common/VERSION_LADDER.md"
  "common/PHASE_GATE_PLAN.md"
  "common/CURRENT_PHASE.md"
  "runtime/SAFE_COMMANDS.md"
  "runtime/DENIED_COMMANDS.md"
  "runtime/APPROVAL_QUEUE.md"
  "runtime/AUTONOMOUS_EXECUTION_POLICY.md"
  "runtime/AUTONOMOUS_RUN_STATUS.md"
  "runtime/AUTONOMOUS_RUN_SUMMARY.md"
  "runtime/AUTONOMOUS_HEALTH_CHECK.md"
  "runtime/AUTONOMOUS_COMPLETION_GATE.md"
  "runtime/AUTONOMOUS_VERIFICATION_REPORT.md"
  "runtime/END_TO_END_AUTONOMOUS_POLICY.md"
  "runtime/RUN_STATE.json"
  "runtime/CURRENT_TASK.md"
  "runtime/PHASE_GATE_REPORT.md"
  "runtime/COMPLETION_GATE_REPORT.md"
  "runtime/MORNING_REPORT.md"
  "runtime/HANDOFF_TO_NEXT_VERSION.md"
  "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"
  "agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md"
  "agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md"
  "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md"
  "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md"
  "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md"
  "agent_adapters/codex/run-codex-autonomous.ps1"
  "agent_adapters/codex/run-codex-supervised.ps1"
  "agent_adapters/codex/run-codex-unified-autonomous.ps1"
  "agent_adapters/codex/run-codex-end-to-end-autonomous.ps1"
  "agent_adapters/codex/run-codex-autonomous.sh"
  "agent_adapters/codex/run-codex-supervised.sh"
  "agent_adapters/codex/run-codex-unified-autonomous.sh"
  "agent_adapters/codex/run-codex-end-to-end-autonomous.sh"
  "agent_adapters/claude-code/CLAUDE.md"
  "agent_adapters/claude-code/CLAUDE_RUNBOOK.md"
  "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md"
  "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md"
  "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md"
  "agent_adapters/claude-code/settings.example.json"
  "agent_adapters/claude-code/run-claude-supervised.md"
  "agent_adapters/claude-code/run-claude-autonomous.md"
  "agent_adapters/trae/TRAE_RUNBOOK.md"
  "agent_adapters/trae/TRAE_TASK_PROMPT.md"
  "agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md"
  "agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md"
  "agent_adapters/trae/TRAE_AGENT_CONFIG.yaml"
  "agent_adapters/trae/run-trae-supervised.md"
  "agent_adapters/trae/run-trae-autonomous.md"
  "agent_adapters/cursor/CURSOR_RUNBOOK.md"
  "agent_adapters/cursor/CURSOR_TASK_PROMPT.md"
  "agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md"
  "agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md"
  "agent_adapters/cursor/rules/project-rules.md"
  "docs/README.md"
  "docs/RUN_APP.md"
  "docs/SECURITY_AND_PERMISSIONS.md"
)

missing=()
for entry in "${required[@]}"; do
  if [ ! -f "$TEMP_DIR/$entry" ]; then
    missing+=("$entry")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  printf "Sample execution-pack ZIP is missing required files:\n" >&2
  printf " - %s\n" "${missing[@]}" >&2
  exit 1
fi

node -e "JSON.parse(require('fs').readFileSync('$TEMP_DIR/runtime/RUN_STATE.json','utf8'))"

echo "[verify-sample-pack] PASS $TARGET_VERSION"
