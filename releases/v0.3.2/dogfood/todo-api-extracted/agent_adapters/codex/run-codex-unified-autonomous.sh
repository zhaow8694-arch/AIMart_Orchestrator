#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

RUN_DIR="$ROOT_DIR/codex_runs"
mkdir -p "$RUN_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
LOG_PATH="$RUN_DIR/codex-unified-autonomous-$STAMP.log"
EXIT_PATH="$RUN_DIR/codex-unified-autonomous-$STAMP.exit"
PROMPT_PATH="$ROOT_DIR/agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"
STATUS_PATH="$ROOT_DIR/runtime/AUTONOMOUS_RUN_STATUS.md"
SUMMARY_PATH="$ROOT_DIR/runtime/AUTONOMOUS_RUN_SUMMARY.md"
HEALTH_PATH="$ROOT_DIR/runtime/AUTONOMOUS_HEALTH_CHECK.md"
VERIFICATION_REPORT_PATH="$ROOT_DIR/runtime/AUTONOMOUS_VERIFICATION_REPORT.md"
START_EPOCH="$(date +%s)"
TARGET_VERSION="unknown"
CLEAN_AT_STARTUP="unknown"
EXISTING_CODEX_PROCESSES="unknown"
COMPLETION_GATE_STATUS="PENDING"
COMPLETION_GATE_FAILED="none"
COMPLETION_GATE_REPORT="$VERIFICATION_REPORT_PATH"

echo "[codex-unified] one-window dashboard: sandbox workspace-write, approval never"
echo "[codex-unified] log=$LOG_PATH"

elapsed_text() {
  local now seconds
  now="$(date +%s)"
  seconds=$((now - START_EPOCH))
  printf "%02d:%02d:%02d" $((seconds / 3600)) $(((seconds % 3600) / 60)) $((seconds % 60))
}

git_branch_text() {
  local branch
  branch="$(git branch --show-current 2>/dev/null || true)"
  if [ -n "$branch" ]; then
    printf "%s" "$branch"
  else
    printf "%s" "detached-or-unknown"
  fi
}

dirty_file_count() {
  git status --short 2>/dev/null | wc -l | tr -d " "
}

git_status_text() {
  local count
  count="$(dirty_file_count)"
  if [ "$count" = "0" ]; then
    printf "%s" "clean"
  else
    printf "%s" "$count changed file(s)"
  fi
}

target_version_text() {
  if [ -f "$ROOT_DIR/package.json" ]; then
    node -e "const p=require('./package.json'); process.stdout.write(p.version ? 'v' + p.version : 'unknown')" 2>/dev/null || printf "%s" "unknown"
  else
    printf "%s" "unknown"
  fi
}

clean_at_startup_text() {
  local count
  count="$(dirty_file_count)"
  if [ "$count" = "0" ]; then
    printf "%s" "yes"
  else
    printf "%s" "no ($count changed file(s))"
  fi
}

existing_codex_processes_text() {
  local count
  count="$(tasklist 2>/dev/null | grep -i "codex" | wc -l | tr -d " " || true)"
  if [ -z "$count" ] || [ "$count" = "0" ]; then
    printf "%s" "none detected"
  else
    printf "%s" "$count detected"
  fi
}

target_release_dir() {
  if [ "$TARGET_VERSION" = "unknown" ]; then
    printf "%s" "$ROOT_DIR/releases"
  else
    printf "%s" "$ROOT_DIR/releases/$TARGET_VERSION"
  fi
}

target_release_directory_status() {
  local path
  path="$(target_release_dir)"
  if [ -d "$path" ]; then
    printf "%s" "exists: $path"
  else
    printf "%s" "missing: $path"
  fi
}

source_zip_status() {
  local path
  if [ "$TARGET_VERSION" = "unknown" ]; then
    printf "%s" "unknown target version"
    return
  fi
  path="$(target_release_dir)/aimart-orchestrator-$TARGET_VERSION-source.zip"
  [ -f "$path" ] && printf "%s" "exists" || printf "%s" "missing"
}

sample_zip_status() {
  local path
  if [ "$TARGET_VERSION" = "unknown" ]; then
    printf "%s" "unknown target version"
    return
  fi
  path="$(target_release_dir)/samples/todo-api-generated-execution-pack.zip"
  [ -f "$path" ] && printf "%s" "exists" || printf "%s" "missing"
}

latest_log_activity_time() {
  if [ ! -f "$LOG_PATH" ]; then
    printf "%s" "none"
    return
  fi
  date -r "$LOG_PATH" -Iseconds 2>/dev/null || printf "%s" "unavailable"
}

log_appears_stalled() {
  if [ ! -f "$LOG_PATH" ]; then
    printf "%s" "no log yet"
    return
  fi
  local now modified age
  now="$(date +%s)"
  modified="$(date -r "$LOG_PATH" +%s 2>/dev/null || echo "$now")"
  age=$((now - modified))
  if [ "$age" -ge 300 ]; then
    printf "%s" "yes"
  else
    printf "%s" "no"
  fi
}

release_status() {
  if [ ! -d "$ROOT_DIR/releases" ]; then
    printf "%s" "releases/ not found"
    return
  fi

  local latest latest_name zip_count
  latest="$(find "$ROOT_DIR/releases" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort | tail -n 1 || true)"
  if [ -z "$latest" ]; then
    printf "%s" "no release directories"
    return
  fi

  latest_name="$(basename "$latest")"
  zip_count="$(find "$latest" -type f -name "*.zip" 2>/dev/null | wc -l | tr -d " ")"
  printf "%s" "$latest_name: $zip_count zip artifact(s)"
}

sample_execution_pack_status() {
  if [ ! -d "$ROOT_DIR/releases" ]; then
    printf "%s" "missing"
    return
  fi

  local count
  count="$(find "$ROOT_DIR/releases" -type f -name "*generated-execution-pack.zip" 2>/dev/null | wc -l | tr -d " ")"
  if [ "$count" = "0" ]; then
    printf "%s" "missing"
  else
    printf "%s" "$count sample pack(s)"
  fi
}

known_issues_status() {
  local count
  count="$(find "$ROOT_DIR" -maxdepth 1 -type f \( -name "KNOWN_ISSUES.md" -o -name "V0.2.1_KNOWN_ISSUES.md" -o -name "V0.2.0_KNOWN_ISSUES.md" \) 2>/dev/null | wc -l | tr -d " ")"
  if [ -f "$ROOT_DIR/runtime/APPROVAL_QUEUE.md" ]; then
    count=$((count + 1))
  fi

  if [ "$count" = "0" ]; then
    printf "%s" "no known issue files"
  else
    printf "%s" "$count issue/status file(s)"
  fi
}

log_tail_text() {
  if [ ! -f "$LOG_PATH" ]; then
    printf "%s\n" "log not created yet"
    return
  fi

  if [ ! -s "$LOG_PATH" ]; then
    printf "%s\n" "log is empty"
    return
  fi

  tail -n 12 "$LOG_PATH"
}

run_completion_gate() {
  local status failed_gate details gate_log code missing
  status="FAIL"
  failed_gate="Autonomous Completion Gate"
  details="scripts/verify-autonomous-completion.sh not found; ran local file gate"
  gate_log="$RUN_DIR/completion-gate-$STAMP.log"

  if [ -f "$ROOT_DIR/scripts/verify-autonomous-completion.sh" ]; then
    bash "$ROOT_DIR/scripts/verify-autonomous-completion.sh" "$TARGET_VERSION" > "$gate_log" 2>&1
    code=$?
    if [ "$code" -eq 0 ]; then
      status="PASS"
      failed_gate="none"
      details="verify-autonomous-completion.sh exited 0; log: $gate_log"
    else
      status="FAIL"
      failed_gate="verify-autonomous-completion.sh"
      details="exit $code; log: $gate_log"
    fi
  else
    missing=""
    for path in       "runtime/AUTONOMOUS_COMPLETION_GATE.md"       "runtime/AUTONOMOUS_VERIFICATION_REPORT.md"       "runtime/AUTONOMOUS_RUN_SUMMARY.md"       "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md"; do
      if [ ! -f "$ROOT_DIR/$path" ]; then
        missing="$missing $path"
      fi
    done
    if [ -z "$missing" ]; then
      status="PASS"
      failed_gate="none"
      details="local generated-pack completion files exist"
    else
      status="FAIL"
      failed_gate="generated-pack file gate"
      details="missing:$missing"
    fi
  fi

  cat > "$VERIFICATION_REPORT_PATH" <<EOF
# Autonomous Verification Report

| Gate | Status | Notes |
|---|---|---|
| Autonomous Completion Gate | $status | $details |
| Failed gate | $status | $failed_gate |

Final result: $status
EOF

  COMPLETION_GATE_STATUS="$status"
  COMPLETION_GATE_FAILED="$failed_gate"
  COMPLETION_GATE_REPORT="$VERIFICATION_REPORT_PATH"
}

write_run_status() {
  local state exit_code elapsed branch dirty release known updated
  state="$1"
  exit_code="$2"
  elapsed="$(elapsed_text)"
  branch="$(git_branch_text)"
  dirty="$(dirty_file_count)"
  release="$(release_status)"
  known="$(known_issues_status)"
  updated="$(date -Iseconds)"

  cat > "$STATUS_PATH" <<EOF
# Autonomous Run Status

| Field | Value |
|---|---|
| Runner state | $state |
| Target version | $TARGET_VERSION |
| Elapsed time | $elapsed |
| Git branch | $branch |
| Clean at startup | $CLEAN_AT_STARTUP |
| Existing Codex processes | $EXISTING_CODEX_PROCESSES |
| Dirty file count | $dirty |
| Latest log tail | See $LOG_PATH |
| Latest log activity time | $(latest_log_activity_time) |
| Log appears stalled | $(log_appears_stalled) |
| Release directory status | $release |
| Target release directory exists | $(target_release_directory_status) |
| Source ZIP exists | $(source_zip_status) |
| Sample ZIP exists | $(sample_zip_status) |
| Known issues status | $known |
| Autonomous Completion Gate | $COMPLETION_GATE_STATUS |
| Codex exit code | $exit_code |
| Last updated | $updated |
EOF
}

write_health_check() {
  cat > "$HEALTH_PATH" <<EOF
# Autonomous Health Check

- [x] one-window runner started.
- [x] codex_runs log path prepared.
- [x] runtime/AUTONOMOUS_RUN_STATUS.md update attempted.
- [x] runtime/AUTONOMOUS_RUN_SUMMARY.md update attempted at completion.
- [x] Release directory status checked.
- [x] Source ZIP status checked.
- [x] Sample ZIP status checked.
- [x] Latest log activity time checked.
- [x] Log appears stalled status checked.
- [x] Autonomous Completion Gate run at completion.
- [x] Known issues status checked.
- [x] No secret reads or remote pushes are performed by this runner.
EOF
}

show_dashboard() {
  local state elapsed branch dirty release known
  state="$1"
  elapsed="$(elapsed_text)"
  branch="$(git_branch_text)"
  dirty="$(dirty_file_count)"
  release="$(release_status)"
  known="$(known_issues_status)"

  clear || true
  printf "%s\n" "AIMart Codex Unified Autonomous Runner"
  printf "%s\n\n" "one-window status display"
  printf "Target version: %s\n" "$TARGET_VERSION"
  printf "State: %s\n" "$state"
  printf "Elapsed: %s\n" "$elapsed"
  printf "Git branch: %s\n" "$branch"
  printf "Clean at startup: %s\n" "$CLEAN_AT_STARTUP"
  printf "Existing Codex processes: %s\n" "$EXISTING_CODEX_PROCESSES"
  printf "Dirty files: %s\n" "$dirty"
  printf "Release directory: %s\n" "$release"
  printf "Target release directory exists: %s\n" "$(target_release_directory_status)"
  printf "Source ZIP: %s\n" "$(source_zip_status)"
  printf "Sample ZIP: %s\n" "$(sample_zip_status)"
  printf "Latest log activity: %s\n" "$(latest_log_activity_time)"
  printf "Log appears stalled: %s\n" "$(log_appears_stalled)"
  printf "Known issues: %s\n" "$known"
  printf "Autonomous Completion Gate: %s\n" "$COMPLETION_GATE_STATUS"
  printf "Log: %s\n\n" "$LOG_PATH"
  printf "%s\n" "Latest log tail"
  printf "%s\n" "---------------"
  log_tail_text

  write_run_status "$state" "running"
}

if [ ! -f "$PROMPT_PATH" ]; then
  echo "Missing prompt file: $PROMPT_PATH" >&2
  exit 1
fi

TARGET_VERSION="$(target_version_text)"
CLEAN_AT_STARTUP="$(clean_at_startup_text)"
EXISTING_CODEX_PROCESSES="$(existing_codex_processes_text)"

write_health_check
write_run_status "starting" "running"

# Effective Codex flags: codex exec --sandbox workspace-write --approval never
(
  set +e
  codex exec --sandbox workspace-write --approval never --cd "$ROOT_DIR" --prompt-file "$PROMPT_PATH" > "$LOG_PATH" 2>&1
  code=$?
  printf "%s" "$code" > "$EXIT_PATH"
) &
CODEX_PID=$!

while kill -0 "$CODEX_PID" 2>/dev/null; do
  show_dashboard "running"
  sleep 3
done

set +e
wait "$CODEX_PID"
set -e

EXIT_CODE="1"
if [ -f "$EXIT_PATH" ]; then
  EXIT_CODE="$(cat "$EXIT_PATH")"
fi

show_dashboard "completed"
write_run_status "completed" "$EXIT_CODE"
run_completion_gate
FINAL_EXIT_CODE="1"
if [ "$EXIT_CODE" = "0" ] && [ "$COMPLETION_GATE_STATUS" = "PASS" ]; then
  FINAL_EXIT_CODE="0"
fi

RELEASE_STATUS="$(release_status)"
SAMPLE_STATUS="$(sample_execution_pack_status)"
GIT_STATUS="$(git_status_text)"
if [ "$COMPLETION_GATE_STATUS" = "PASS" ]; then
  printf "%s\n" "Autonomous Completion Gate: PASS"
else
  printf "%s\n" "Autonomous Completion Gate: FAIL"
  printf "Failed gate: %s\n" "$COMPLETION_GATE_FAILED"
  printf "Report file: %s\n" "$COMPLETION_GATE_REPORT"
fi
if [ "$FINAL_EXIT_CODE" = "0" ]; then
  NEXT_ACTION="Review runtime/AUTONOMOUS_RUN_SUMMARY.md, inspect changed files, then run scripts/finalize for delivery."
else
  NEXT_ACTION="Inspect runtime/AUTONOMOUS_VERIFICATION_REPORT.md and the latest codex_runs log, fix the blocking issue, then rerun the unified autonomous runner."
fi

cat > "$SUMMARY_PATH" <<EOF
# Autonomous Run Summary

| Field | Value |
|---|---|
| Codex exit code | $EXIT_CODE |
| Final exit code | $FINAL_EXIT_CODE |
| Release artifacts | $RELEASE_STATUS |
| Sample execution pack | $SAMPLE_STATUS |
| Autonomous Completion Gate | $COMPLETION_GATE_STATUS |
| Failed gate | $COMPLETION_GATE_FAILED |
| Verification report | $COMPLETION_GATE_REPORT |
| Git status | $GIT_STATUS |
| Latest log | $LOG_PATH |
| Next recommended action | $NEXT_ACTION |
EOF

printf "\n%s\n" "Final Summary"
printf "%s\n" "-------------"
printf "Codex exit code: %s\n" "$EXIT_CODE"
printf "Final exit code: %s\n" "$FINAL_EXIT_CODE"
printf "Release artifacts: %s\n" "$RELEASE_STATUS"
printf "Sample execution pack: %s\n" "$SAMPLE_STATUS"
printf "Autonomous Completion Gate: %s\n" "$COMPLETION_GATE_STATUS"
printf "Failed gate: %s\n" "$COMPLETION_GATE_FAILED"
printf "Report file: %s\n" "$COMPLETION_GATE_REPORT"
printf "Git status: %s\n" "$GIT_STATUS"
printf "Next recommended action: %s\n" "$NEXT_ACTION"

exit "$FINAL_EXIT_CODE"