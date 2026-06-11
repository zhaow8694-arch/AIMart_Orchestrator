#!/usr/bin/env bash
set -euo pipefail

TARGET_VERSION="${1:-}"
echo "[Autonomous Completion Gate] verify-history-releases TargetVersion=$TARGET_VERSION"

frozen=("releases/v0.1.0" "releases/v0.1.1" "releases/v0.2.1" "releases/v0.2.2" "releases/v0.3.0" "releases/v0.3.1")
for path in "${frozen[@]}"; do
  if [ ! -d "$path" ]; then
    echo "Missing frozen historical release folder: $path" >&2
    exit 1
  fi
done

if [ -n "$(git diff --name-only -- "${frozen[@]}")" ]; then
  echo "Historical releases have working tree modifications" >&2
  exit 1
fi

if [ -n "$(git diff --cached --name-only -- "${frozen[@]}")" ]; then
  echo "Historical releases have staged modifications" >&2
  exit 1
fi

if ! git tag --list v0.3.1 | grep -q '^v0.3.1$'; then
  echo "Required historical tag v0.3.1 is missing" >&2
  exit 1
fi

if [ -n "$(git diff --name-only v0.3.1 HEAD -- "${frozen[@]}")" ]; then
  echo "Historical releases changed since v0.3.1" >&2
  exit 1
fi

echo "[verify-history-releases] PASS"
