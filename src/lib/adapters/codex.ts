import type { RuntimePack } from "@/lib/generators/runtime-pack";
import {
  AgentAdapterSchema,
  type AgentAdapter,
  type ProjectSpec,
  type TaskQueue
} from "@/lib/schemas/core";

export function generateCodexAdapter(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue,
  runtimePack: RuntimePack
): AgentAdapter {
  return AgentAdapterSchema.parse({
    adapterType: "codex",
    files: [
      {
        path: "agent_adapters/codex/AGENTS.md",
        content: renderAgents(projectSpec)
      },
      {
        path: "agent_adapters/codex/CODEX_RUNBOOK.md",
        content: renderRunbook(projectSpec, taskQueue)
      },
      {
        path: "agent_adapters/codex/CODEX_TASK_PROMPT.md",
        content: renderTaskPrompt(projectSpec, taskQueue, runtimePack)
      },
      {
        path: "agent_adapters/codex/CODEX_AUTONOMOUS_LOOP.md",
        content: renderAutonomousLoop()
      },
      {
        path: "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md",
        content: renderAutonomousPrompt(projectSpec, taskQueue)
      },
      {
        path: "agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md",
        content: renderAutonomousRunbook(projectSpec)
      },
      {
        path: "agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md",
        content: renderUnifiedAutonomousRunbook(projectSpec)
      },
      {
        path: "agent_adapters/codex/run-codex-autonomous.ps1",
        content: renderCodexPs1("autonomous")
      },
      {
        path: "agent_adapters/codex/run-codex-supervised.ps1",
        content: renderCodexPs1("supervised")
      },
      {
        path: "agent_adapters/codex/run-codex-unified-autonomous.ps1",
        content: renderUnifiedCodexPs1()
      },
      {
        path: "agent_adapters/codex/run-codex-autonomous.sh",
        content: renderCodexSh("autonomous")
      },
      {
        path: "agent_adapters/codex/run-codex-supervised.sh",
        content: renderCodexSh("supervised")
      },
      {
        path: "agent_adapters/codex/run-codex-unified-autonomous.sh",
        content: renderUnifiedCodexSh()
      }
    ]
  });
}

function renderAgents(projectSpec: ProjectSpec): string {
  return `# AGENTS.md - Codex Target Adapter

Codex is the target coding agent for this generated execution pack.

## Project Facts

- Project: ${projectSpec.projectName}
- Execution mode: ${projectSpec.executionMode}
- MVP scope: ${formatList(projectSpec.mvpScope)}
- Forbidden items: ${formatList(projectSpec.forbiddenItems)}
- Security boundaries: ${formatList(projectSpec.securityBoundaries)}

## Rules

1. Do not expand the MVP scope.
2. Execute tasks in TASK_QUEUE order.
3. Update PROGRESS_LOG after each completed task.
4. Put high-risk commands in runtime/APPROVAL_QUEUE.md before execution.
5. Do not read secrets, local credential files, or production resources.
6. Run scripts/finalize.ps1 or scripts/finalize.sh before final delivery.
7. Use runtime/SAFE_COMMANDS.md and runtime/DENIED_COMMANDS.md before running commands autonomously.
`;
}

function renderRunbook(projectSpec: ProjectSpec, taskQueue: TaskQueue): string {
  return `# Codex Runbook

## Start

1. Read common/PROJECT_SPEC.md.
2. Read common/TASK_QUEUE.md.
3. Read runtime/PERMISSION_POLICY.yaml.
4. Read runtime/SAFE_COMMANDS.md and runtime/DENIED_COMMANDS.md.
5. Start with the first pending task.

## Project

${projectSpec.projectName}

## Task Order

${taskQueue.tasks
  .map((task) => `- ${task.id}: ${task.title} (${task.phase}, ${task.riskLevel})`)
  .join("\n")}

## Finish

Run the local finalize script for the current platform:

\`\`\`powershell
./scripts/finalize.ps1
\`\`\`

\`\`\`bash
./scripts/finalize.sh
\`\`\`
`;
}

function renderTaskPrompt(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue,
  runtimePack: RuntimePack
): string {
  return `# Codex Task Prompt

You are working on ${projectSpec.projectName}. Follow the generated task queue exactly.

## Tasks

${taskQueue.tasks
  .map(
    (task) => `### ${task.id} ${task.title}

- Phase: ${task.phase}
- Risk: ${task.riskLevel}
- Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(", ") : "none"}
- Done criteria: ${task.doneCriteria.join("; ")}
- Test command: \`${task.testCommand}\`
`
  )
  .join("\n")}

## Permission Actions

${runtimePack.permissionPolicy.commandRules
  .map(
    (rule) =>
      `- \`${rule.command}\`: ${rule.riskLevel}, ${rule.action} - ${rule.reason}`
  )
  .join("\n")}

Use scripts/finalize.ps1 or scripts/finalize.sh for final delivery.
`;
}

function renderAutonomousLoop(): string {
  return `# Codex Autonomous Loop

Repeat this loop until every task is complete:

1. Pick the first pending task whose dependencies are done.
2. Read the relevant spec, runtime, adapter, and docs files.
3. Write or update tests before changing behavior.
4. Implement only what the task requires.
5. Run the task test command.
6. Run broader verification when the task affects shared behavior.
7. Update common/PROGRESS_LOG.md.
8. Continue to the next task.

Stop only for a blocker that prevents meaningful progress. Record blockers in common/BLOCKERS.md.
`;
}

function renderAutonomousPrompt(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue
): string {
  return `# Codex Autonomous Prompt

You are the only coding agent for this generated execution pack.

Project: ${projectSpec.projectName}
Selected execution mode: ${projectSpec.executionMode}

## First Read

1. common/PROJECT_SPEC.md
2. common/TASK_QUEUE.md
3. common/EXECUTION_RULES.md
4. runtime/AUTONOMOUS_EXECUTION_POLICY.md
5. runtime/SAFE_COMMANDS.md
6. runtime/DENIED_COMMANDS.md
7. runtime/APPROVAL_QUEUE.md
8. agent_adapters/codex/AGENTS.md

## Autonomous Rules

1. Work through TASK_QUEUE in order.
2. Run only commands allowed by runtime/SAFE_COMMANDS.md without approval.
3. Never run commands or categories listed in runtime/DENIED_COMMANDS.md.
4. Queue high-risk or blocked actions in runtime/APPROVAL_QUEUE.md and continue safe independent work.
5. Write logs under .aimart/logs.
6. Do not expand the MVP scope.
7. Before final delivery, run scripts/finalize.ps1 or scripts/finalize.sh.

## Initial Task Count

${taskQueue.tasks.length} tasks are generated. Start with the first pending task whose dependencies are complete.
`;
}

function renderAutonomousRunbook(projectSpec: ProjectSpec): string {
  return `# Codex Autonomous Runbook

Project: ${projectSpec.projectName}
Selected execution mode: ${projectSpec.executionMode}

## Start Supervised Mode

Use supervised mode when a human wants to approve high-risk commands interactively.

\`\`\`powershell
./agent_adapters/codex/run-codex-supervised.ps1
\`\`\`

\`\`\`bash
bash agent_adapters/codex/run-codex-supervised.sh
\`\`\`

## Start Autonomous Mode

Use autonomous mode only inside a project-local workspace where the runtime policy is acceptable.

\`\`\`powershell
./agent_adapters/codex/run-codex-autonomous.ps1
\`\`\`

\`\`\`bash
bash agent_adapters/codex/run-codex-autonomous.sh
\`\`\`

## Start Unified Autonomous Mode

Use unified autonomous mode when you want the one-window status display, recent log tail, release checks, runtime status file updates, and final summary.

\`\`\`powershell
./agent_adapters/codex/run-codex-unified-autonomous.ps1
\`\`\`

\`\`\`bash
bash agent_adapters/codex/run-codex-unified-autonomous.sh
\`\`\`

## Logs

Launcher logs are written to .aimart/logs. Review the newest log after long autonomous runs or failed commands.

## Approval Queue

When a command is outside runtime/SAFE_COMMANDS.md, write it to runtime/APPROVAL_QUEUE.md with the risk level, reason, and blocking status. Autonomous Mode must continue with safe tasks when the queued item is not blocking.

## Safety

Do not use dangerous bypass, full-access, unrestricted sandbox, production deployment, real database migration, cloud resource mutation, or secret-reading commands.
`;
}

function renderUnifiedAutonomousRunbook(projectSpec: ProjectSpec): string {
  return `# Codex Unified Autonomous Runbook

Project: ${projectSpec.projectName}
Selected execution mode: ${projectSpec.executionMode}

Unified Autonomous Mode is the one-window autonomous runner for generated execution packs. It starts Codex, shows live status in the same terminal, tails recent logs, checks release output, updates runtime status files, and prints a final summary.

## Start

\`\`\`powershell
./agent_adapters/codex/run-codex-unified-autonomous.ps1
\`\`\`

\`\`\`bash
bash agent_adapters/codex/run-codex-unified-autonomous.sh
\`\`\`

## What The Runner Shows

- Elapsed time.
- Git branch.
- Dirty file count.
- Latest log tail from codex_runs.
- Release directory status.
- Known issues status.
- Final Summary with exit code, release artifacts, sample execution pack, Git status, and next recommended action.

## Runtime Files

- runtime/AUTONOMOUS_RUN_STATUS.md is updated during the run.
- runtime/AUTONOMOUS_RUN_SUMMARY.md is updated at completion.
- runtime/AUTONOMOUS_HEALTH_CHECK.md records the one-window runner checks.

## Safety

The unified runner uses Codex workspace-write sandboxing with approval never. It does not push remotes, read secrets, modify frozen release folders, deploy to production, run real database migrations, or create/delete cloud resources.
`;
}

function renderUnifiedCodexPs1(): string {
  return `$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $RootDir

$RunDir = Join-Path $RootDir "codex_runs"
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogPath = Join-Path $RunDir "codex-unified-autonomous-$Stamp.log"
$ExitPath = Join-Path $RunDir "codex-unified-autonomous-$Stamp.exit"
$PromptPath = Join-Path $RootDir "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"
$StatusPath = Join-Path $RootDir "runtime/AUTONOMOUS_RUN_STATUS.md"
$SummaryPath = Join-Path $RootDir "runtime/AUTONOMOUS_RUN_SUMMARY.md"
$HealthPath = Join-Path $RootDir "runtime/AUTONOMOUS_HEALTH_CHECK.md"
$StartTime = Get-Date

Write-Host "[codex-unified] one-window dashboard: sandbox workspace-write, approval never"
Write-Host "[codex-unified] log=$LogPath"

function Get-ElapsedText {
  param([datetime]$StartedAt)
  return ((Get-Date) - $StartedAt).ToString("hh\\:mm\\:ss")
}

function Get-GitBranchText {
  try {
    $Branch = (git branch --show-current 2>$null).Trim()
    if ($Branch) { return $Branch }
    return "detached-or-unknown"
  } catch {
    return "git unavailable"
  }
}

function Get-DirtyFileCount {
  try {
    return @((git status --short 2>$null)).Count
  } catch {
    return -1
  }
}

function Get-GitStatusText {
  try {
    $Lines = @(git status --short 2>$null)
    if ($Lines.Count -eq 0) { return "clean" }
    return "$($Lines.Count) changed file(s)"
  } catch {
    return "git unavailable"
  }
}

function Get-ReleaseStatus {
  $ReleaseRoot = Join-Path $RootDir "releases"
  if (-not (Test-Path $ReleaseRoot)) {
    return "releases/ not found"
  }

  $ReleaseDirs = @(Get-ChildItem -Path $ReleaseRoot -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
  if ($ReleaseDirs.Count -eq 0) {
    return "no release directories"
  }

  $Latest = $ReleaseDirs[0]
  $ZipCount = @(Get-ChildItem -Path $Latest.FullName -Filter "*.zip" -File -Recurse -ErrorAction SilentlyContinue).Count
  return "$($Latest.Name): $ZipCount zip artifact(s)"
}

function Get-SampleExecutionPackStatus {
  $ReleaseRoot = Join-Path $RootDir "releases"
  if (-not (Test-Path $ReleaseRoot)) {
    return "missing"
  }

  $Samples = @(Get-ChildItem -Path $ReleaseRoot -Filter "*generated-execution-pack.zip" -File -Recurse -ErrorAction SilentlyContinue)
  if ($Samples.Count -eq 0) {
    return "missing"
  }

  return "$($Samples.Count) sample pack(s)"
}

function Get-KnownIssuesStatus {
  $IssueFiles = @()
  foreach ($Name in @("KNOWN_ISSUES.md", "V0.2.1_KNOWN_ISSUES.md", "V0.2.0_KNOWN_ISSUES.md")) {
    $Path = Join-Path $RootDir $Name
    if (Test-Path $Path) {
      $IssueFiles += $Path
    }
  }

  $ApprovalQueue = Join-Path $RootDir "runtime/APPROVAL_QUEUE.md"
  if (Test-Path $ApprovalQueue) {
    $IssueFiles += $ApprovalQueue
  }

  if ($IssueFiles.Count -eq 0) {
    return "no known issue files"
  }

  return "$($IssueFiles.Count) issue/status file(s)"
}

function Get-LogTailText {
  if (-not (Test-Path $LogPath)) {
    return "log not created yet"
  }

  $Tail = @(Get-Content -Path $LogPath -Tail 12 -ErrorAction SilentlyContinue)
  if ($Tail.Count -eq 0) {
    return "log is empty"
  }

  return ($Tail -join [Environment]::NewLine)
}

function Write-RunStatus {
  param([string]$State, [string]$ExitCode = "running")

  $Elapsed = Get-ElapsedText $StartTime
  $Branch = Get-GitBranchText
  $Dirty = Get-DirtyFileCount
  $ReleaseStatus = Get-ReleaseStatus
  $KnownIssues = Get-KnownIssuesStatus
  $Updated = Get-Date -Format s

@"
# Autonomous Run Status

| Field | Value |
|---|---|
| Runner state | $State |
| Elapsed time | $Elapsed |
| Git branch | $Branch |
| Dirty file count | $Dirty |
| Latest log tail | See $LogPath |
| Release directory status | $ReleaseStatus |
| Known issues status | $KnownIssues |
| Codex exit code | $ExitCode |
| Last updated | $Updated |
"@ | Set-Content -Encoding UTF8 -Path $StatusPath
}

function Write-HealthCheck {
@"
# Autonomous Health Check

- [x] one-window runner started.
- [x] codex_runs log path prepared.
- [x] runtime/AUTONOMOUS_RUN_STATUS.md update attempted.
- [x] runtime/AUTONOMOUS_RUN_SUMMARY.md update attempted at completion.
- [x] Release directory status checked.
- [x] Known issues status checked.
- [x] No secret reads or remote pushes are performed by this runner.
"@ | Set-Content -Encoding UTF8 -Path $HealthPath
}

function Show-Dashboard {
  param([string]$State)

  $Elapsed = Get-ElapsedText $StartTime
  $Branch = Get-GitBranchText
  $Dirty = Get-DirtyFileCount
  $ReleaseStatus = Get-ReleaseStatus
  $KnownIssues = Get-KnownIssuesStatus
  $Tail = Get-LogTailText

  Clear-Host
  Write-Host "AIMart Codex Unified Autonomous Runner"
  Write-Host "one-window status display"
  Write-Host ""
  Write-Host "State: $State"
  Write-Host "Elapsed: $Elapsed"
  Write-Host "Git branch: $Branch"
  Write-Host "Dirty files: $Dirty"
  Write-Host "Release directory: $ReleaseStatus"
  Write-Host "Known issues: $KnownIssues"
  Write-Host "Log: $LogPath"
  Write-Host ""
  Write-Host "Latest log tail"
  Write-Host "---------------"
  Write-Host $Tail

  Write-RunStatus -State $State
}

if (-not (Test-Path $PromptPath)) {
  throw "Missing prompt file: $PromptPath"
}

Write-HealthCheck
Write-RunStatus -State "starting"

# Effective Codex flags: codex exec --sandbox workspace-write --approval never
$CodexJob = Start-Job -ScriptBlock {
  param($JobRootDir, $JobPromptPath, $JobLogPath, $JobExitPath)

  Set-Location $JobRootDir
  try {
    & codex exec --sandbox workspace-write --approval never --cd $JobRootDir --prompt-file $JobPromptPath *> $JobLogPath
    $Code = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
  } catch {
    $_ | Out-String | Add-Content -Encoding UTF8 -Path $JobLogPath
    $Code = 1
  }

  Set-Content -Encoding UTF8 -Path $JobExitPath -Value $Code
} -ArgumentList $RootDir, $PromptPath, $LogPath, $ExitPath

while ($CodexJob.State -eq "Running") {
  Show-Dashboard -State "running"
  Start-Sleep -Seconds 3
}

Receive-Job -Job $CodexJob -ErrorAction SilentlyContinue | Out-Null
Remove-Job -Job $CodexJob -Force

$ExitCode = 1
if (Test-Path $ExitPath) {
  $Parsed = 0
  if ([int]::TryParse(((Get-Content -Path $ExitPath -Raw).Trim()), [ref]$Parsed)) {
    $ExitCode = $Parsed
  }
}

Show-Dashboard -State "completed"
Write-RunStatus -State "completed" -ExitCode "$ExitCode"

$ReleaseStatus = Get-ReleaseStatus
$SampleStatus = Get-SampleExecutionPackStatus
$GitStatus = Get-GitStatusText
$NextAction = if ($ExitCode -eq 0) {
  "Review runtime/AUTONOMOUS_RUN_SUMMARY.md, inspect changed files, then run scripts/finalize for delivery."
} else {
  "Inspect the latest codex_runs log, fix the blocking issue, then rerun the unified autonomous runner."
}

@"
# Autonomous Run Summary

| Field | Value |
|---|---|
| Exit code | $ExitCode |
| Release artifacts | $ReleaseStatus |
| Sample execution pack | $SampleStatus |
| Git status | $GitStatus |
| Latest log | $LogPath |
| Next recommended action | $NextAction |
"@ | Set-Content -Encoding UTF8 -Path $SummaryPath

Write-Host ""
Write-Host "Final Summary"
Write-Host "-------------"
Write-Host "Exit code: $ExitCode"
Write-Host "Release artifacts: $ReleaseStatus"
Write-Host "Sample execution pack: $SampleStatus"
Write-Host "Git status: $GitStatus"
Write-Host "Next recommended action: $NextAction"

exit $ExitCode
`;
}

function renderCodexPs1(mode: "autonomous" | "supervised"): string {
  const approval = mode === "autonomous" ? "never" : "on-request";

  return `$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $RootDir

$LogDir = Join-Path $RootDir ".aimart/logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogPath = Join-Path $LogDir "codex-${mode}-$Stamp.log"
$PromptPath = Join-Path $RootDir "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"

Write-Host "[codex-${mode}] sandbox=workspace-write approval=${approval}"
Write-Host "[codex-${mode}] log=$LogPath"

# Effective Codex flags: --sandbox workspace-write --approval ${approval}
$Args = @(
  "exec",
  "--sandbox", "workspace-write",
  "--approval", "${approval}",
  "--cd", $RootDir,
  "--prompt-file", $PromptPath
)

& codex @Args 2>&1 | Tee-Object -FilePath $LogPath
`;
}

function renderCodexSh(mode: "autonomous" | "supervised"): string {
  const approval = mode === "autonomous" ? "never" : "on-request";

  return `#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/.aimart/logs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
LOG_PATH="$LOG_DIR/codex-${mode}-$STAMP.log"
PROMPT_PATH="$ROOT_DIR/agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"

echo "[codex-${mode}] sandbox=workspace-write approval=${approval}"
echo "[codex-${mode}] log=$LOG_PATH"

codex exec \\
  --sandbox workspace-write \\
  --approval ${approval} \\
  --cd "$ROOT_DIR" \\
  --prompt-file "$PROMPT_PATH" 2>&1 | tee "$LOG_PATH"
`;
}

function renderUnifiedCodexSh(): string {
  return `#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/../.." && pwd)"
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
START_EPOCH="$(date +%s)"

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
  count="$(find "$ROOT_DIR" -maxdepth 1 -type f \\( -name "KNOWN_ISSUES.md" -o -name "V0.2.1_KNOWN_ISSUES.md" -o -name "V0.2.0_KNOWN_ISSUES.md" \\) 2>/dev/null | wc -l | tr -d " ")"
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
    printf "%s\\n" "log not created yet"
    return
  fi

  if [ ! -s "$LOG_PATH" ]; then
    printf "%s\\n" "log is empty"
    return
  fi

  tail -n 12 "$LOG_PATH"
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
| Elapsed time | $elapsed |
| Git branch | $branch |
| Dirty file count | $dirty |
| Latest log tail | See $LOG_PATH |
| Release directory status | $release |
| Known issues status | $known |
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
  printf "%s\\n" "AIMart Codex Unified Autonomous Runner"
  printf "%s\\n\\n" "one-window status display"
  printf "State: %s\\n" "$state"
  printf "Elapsed: %s\\n" "$elapsed"
  printf "Git branch: %s\\n" "$branch"
  printf "Dirty files: %s\\n" "$dirty"
  printf "Release directory: %s\\n" "$release"
  printf "Known issues: %s\\n" "$known"
  printf "Log: %s\\n\\n" "$LOG_PATH"
  printf "%s\\n" "Latest log tail"
  printf "%s\\n" "---------------"
  log_tail_text

  write_run_status "$state" "running"
}

if [ ! -f "$PROMPT_PATH" ]; then
  echo "Missing prompt file: $PROMPT_PATH" >&2
  exit 1
fi

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

RELEASE_STATUS="$(release_status)"
SAMPLE_STATUS="$(sample_execution_pack_status)"
GIT_STATUS="$(git_status_text)"
if [ "$EXIT_CODE" = "0" ]; then
  NEXT_ACTION="Review runtime/AUTONOMOUS_RUN_SUMMARY.md, inspect changed files, then run scripts/finalize for delivery."
else
  NEXT_ACTION="Inspect the latest codex_runs log, fix the blocking issue, then rerun the unified autonomous runner."
fi

cat > "$SUMMARY_PATH" <<EOF
# Autonomous Run Summary

| Field | Value |
|---|---|
| Exit code | $EXIT_CODE |
| Release artifacts | $RELEASE_STATUS |
| Sample execution pack | $SAMPLE_STATUS |
| Git status | $GIT_STATUS |
| Latest log | $LOG_PATH |
| Next recommended action | $NEXT_ACTION |
EOF

printf "\\n%s\\n" "Final Summary"
printf "%s\\n" "-------------"
printf "Exit code: %s\\n" "$EXIT_CODE"
printf "Release artifacts: %s\\n" "$RELEASE_STATUS"
printf "Sample execution pack: %s\\n" "$SAMPLE_STATUS"
printf "Git status: %s\\n" "$GIT_STATUS"
printf "Next recommended action: %s\\n" "$NEXT_ACTION"

exit "$EXIT_CODE"
`;
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.join(", ") : "Not specified";
}
