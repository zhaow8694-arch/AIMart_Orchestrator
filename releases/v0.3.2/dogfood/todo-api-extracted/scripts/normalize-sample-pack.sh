#!/usr/bin/env bash
set -euo pipefail
TARGET_VERSION="${1:-}"
RUN_STARTED_AT="${2:-}"
SAMPLE_PATH="${SAMPLE_PATH:-}"
if [ -z "$TARGET_VERSION" ]; then
  TARGET_VERSION="v$(node -e "try{const p=require('./package.json'); process.stdout.write(p.version || '1.0')}catch(e){process.stdout.write('1.0')}")"
fi
case "$TARGET_VERSION" in v*) ;; *) TARGET_VERSION="v$TARGET_VERSION" ;; esac
if [ -z "$SAMPLE_PATH" ]; then SAMPLE_PATH="releases/$TARGET_VERSION/samples/todo-api-generated-execution-pack.zip"; fi
ERROR_PATH="$SAMPLE_PATH.ERROR.txt"
ENTRIES_PATH="$SAMPLE_PATH.entries.txt"

fail_normalization() {
  local category="$1" details="$2"
  printf "%s\n%s\n" "$category" "$details" > "$ERROR_PATH"
  echo "$category: $details" >&2
  exit 1
}

[ -f "$SAMPLE_PATH" ] || fail_normalization "SAMPLE_PACK_INVALID_ZIP" "Missing sample file: $SAMPLE_PATH"
if [ -n "$RUN_STARTED_AT" ]; then
  node -e "const fs=require('fs'); const started=Date.parse(process.argv[1]); const mtime=fs.statSync(process.argv[2]).mtimeMs; if (mtime < started) process.exit(2);" "$RUN_STARTED_AT" "$SAMPLE_PATH" || fail_normalization "SAMPLE_PACK_STALE_FILE" "Sample pack timestamp is before current run start."
fi

node - "$SAMPLE_PATH" "$ERROR_PATH" "$ENTRIES_PATH" <<'NODE'
const fs = require('fs');
const path = process.argv[2];
const errorPath = process.argv[3];
const entriesPath = process.argv[4];
function fail(category, details) {
  fs.writeFileSync(errorPath, category + "\n" + details + "\n");
  console.error(category + ": " + details);
  process.exit(1);
}
let bytes = fs.readFileSync(path);
if (!(bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b)) {
  const text = bytes.toString('utf8').trim();
  try {
    const parsed = JSON.parse(text);
    if (!parsed.zipBase64) fail('SAMPLE_PACK_INVALID_ZIP', 'JSON response did not contain zipBase64.');
    bytes = Buffer.from(parsed.zipBase64, 'base64');
    fs.writeFileSync(path, bytes);
    console.log('SAMPLE_PACK_JSON_BASE64_RESPONSE');
  } catch {
    fail('SAMPLE_PACK_INVALID_ZIP', 'Sample file is HTML/text/error JSON, not a ZIP.');
  }
}
const eocd = 0x06054b50;
let eocdOffset = -1;
for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
  if (bytes.readUInt32LE(offset) === eocd) { eocdOffset = offset; break; }
}
if (eocdOffset < 0) fail('SAMPLE_PACK_INVALID_ZIP', 'Missing ZIP end of central directory.');
const count = bytes.readUInt16LE(eocdOffset + 10);
let offset = bytes.readUInt32LE(eocdOffset + 16);
const entries = [];
for (let index = 0; index < count; index += 1) {
  if (bytes.readUInt32LE(offset) !== 0x02014b50) fail('SAMPLE_PACK_INVALID_ZIP', 'Invalid ZIP central directory.');
  const nameLength = bytes.readUInt16LE(offset + 28);
  const extraLength = bytes.readUInt16LE(offset + 30);
  const commentLength = bytes.readUInt16LE(offset + 32);
  const start = offset + 46;
  const end = start + nameLength;
  // Replace backslash with slash before comparison.
  entries.push(bytes.subarray(start, end).toString('utf8').replace(/\\/g, '/'));
  offset = end + extraLength + commentLength;
}
fs.writeFileSync(entriesPath, entries.sort().join('\n') + '\n');
NODE

echo "[normalize-sample-pack] PASS $SAMPLE_PATH"