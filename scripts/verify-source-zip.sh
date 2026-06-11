#!/usr/bin/env bash
set -euo pipefail

TARGET_VERSION="${1:-}"
echo "[Autonomous Completion Gate] verify-source-zip TargetVersion=$TARGET_VERSION"

if [ -z "$TARGET_VERSION" ]; then
  TARGET_VERSION="v$(node -e "const p=require('./package.json'); process.stdout.write(p.version)")"
fi
case "$TARGET_VERSION" in
  v*) ;;
  *) TARGET_VERSION="v$TARGET_VERSION" ;;
esac

SOURCE_ZIP="releases/$TARGET_VERSION/aimart-orchestrator-$TARGET_VERSION-source.zip"
if [ ! -f "$SOURCE_ZIP" ]; then
  echo "Missing source ZIP: $SOURCE_ZIP" >&2
  exit 1
fi

if unzip -Z1 "$SOURCE_ZIP" | grep -Ei '(^|/)(node_modules|\.next|\.git|codex_runs|releases)(/|$)|verify-temp|verification-temp|(^|/)\.verification(/|$)|(^|/)\.env|(^|/)id_rsa($|/)|\.pem$|\.pfx$|\.key$|secret|credentials'; then
  echo "Forbidden source ZIP entry found" >&2
  exit 1
fi

echo "[verify-source-zip] PASS $TARGET_VERSION"
