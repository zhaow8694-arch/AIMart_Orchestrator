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
  "common/PROJECT_SPEC.md"
  "common/TASK_QUEUE.md"
  "common/EXECUTION_RULES.md"
  "runtime/SAFE_COMMANDS.md"
  "runtime/DENIED_COMMANDS.md"
  "runtime/APPROVAL_QUEUE.md"
  "runtime/AUTONOMOUS_EXECUTION_POLICY.md"
  "runtime/AUTONOMOUS_RUN_STATUS.md"
  "runtime/AUTONOMOUS_RUN_SUMMARY.md"
  "runtime/AUTONOMOUS_HEALTH_CHECK.md"
  "runtime/AUTONOMOUS_COMPLETION_GATE.md"
  "runtime/AUTONOMOUS_VERIFICATION_REPORT.md"
  "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"
  "agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md"
  "agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md"
  "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md"
  "agent_adapters/codex/run-codex-autonomous.ps1"
  "agent_adapters/codex/run-codex-supervised.ps1"
  "agent_adapters/codex/run-codex-unified-autonomous.ps1"
  "agent_adapters/codex/run-codex-autonomous.sh"
  "agent_adapters/codex/run-codex-supervised.sh"
  "agent_adapters/codex/run-codex-unified-autonomous.sh"
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

echo "[verify-sample-pack] PASS $TARGET_VERSION"
