#!/usr/bin/env bash
set -euo pipefail
TARGET_VERSION="${1:-}"
echo "[Autonomous Completion Gate] verify-release TargetVersion=$TARGET_VERSION"
if [ -z "$TARGET_VERSION" ]; then
  TARGET_VERSION="v$(node -e "const p=require('./package.json'); process.stdout.write(p.version)")"
fi
case "$TARGET_VERSION" in v*) ;; *) TARGET_VERSION="v$TARGET_VERSION" ;; esac
RELEASE_DIR="releases/$TARGET_VERSION"
SOURCE_ZIP="$RELEASE_DIR/aimart-orchestrator-$TARGET_VERSION-source.zip"
SAMPLE_ZIP="$RELEASE_DIR/samples/todo-api-generated-execution-pack.zip"
SHA_FILE="$RELEASE_DIR/SHA256.txt"
MANIFEST="$RELEASE_DIR/RELEASE_MANIFEST.txt"
for path in "$RELEASE_DIR" "$SOURCE_ZIP" "$SAMPLE_ZIP" "$SHA_FILE" "$MANIFEST"; do
  [ -e "$path" ] || { echo "Missing required release artifact: $path" >&2; exit 1; }
done
source_hash="$(sha256sum "$SOURCE_ZIP" | awk '{print $1}')"
sample_hash="$(sha256sum "$SAMPLE_ZIP" | awk '{print $1}')"
grep -q "$source_hash  aimart-orchestrator-$TARGET_VERSION-source.zip" "$SHA_FILE"
grep -q "$sample_hash  samples/todo-api-generated-execution-pack.zip" "$SHA_FILE"
echo "[verify-release] PASS $TARGET_VERSION"