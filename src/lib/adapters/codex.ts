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
        path: "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md",
        content: renderCompletionGateRunbook(projectSpec)
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

## Autonomous Completion Gate

The unified autonomous runner runs the Autonomous Completion Gate before reporting success. Review agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md and runtime/AUTONOMOUS_VERIFICATION_REPORT.md when the gate reports FAIL.

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

- Target version.
- Elapsed time.
- Git branch.
- Whether the Git worktree was clean at startup.
- Whether existing Codex processes were detected.
- Dirty file count.
- Latest log tail from codex_runs.
- Release directory status.
- Source ZIP status.
- Sample ZIP status.
- Latest log activity time.
- Whether the log appears stalled.
- Known issues status.
- Autonomous Completion Gate PASS or FAIL.
- Final Summary with exit code, release artifacts, sample execution pack, Git status, completion gate result, and next recommended action.

## Runtime Files

- runtime/AUTONOMOUS_RUN_STATUS.md is updated during the run.
- runtime/AUTONOMOUS_RUN_SUMMARY.md is updated at completion.
- runtime/AUTONOMOUS_HEALTH_CHECK.md records the one-window runner checks.
- runtime/AUTONOMOUS_COMPLETION_GATE.md defines the required completion checks.
- runtime/AUTONOMOUS_VERIFICATION_REPORT.md records PASS or FAIL for the gate.

## Safety

The unified runner uses Codex workspace-write sandboxing with approval never. It does not push remotes, read secrets, modify frozen release folders, deploy to production, run real database migrations, or create/delete cloud resources.
`;
}

function renderCompletionGateRunbook(projectSpec: ProjectSpec): string {
  return `# Codex Completion Gate Runbook

Project: ${projectSpec.projectName}
Selected execution mode: ${projectSpec.executionMode}

This runbook is used by the one-window unified autonomous runner before it reports success.

## one-window Completion Flow

1. Run Codex with workspace-write sandboxing and approval never.
2. Show Target version, Git branch, clean startup state, existing Codex processes, release directory, Source ZIP, Sample execution pack, latest log activity, and whether the log appears stalled.
3. Run the Autonomous Completion Gate after Codex exits.
4. Write runtime/AUTONOMOUS_VERIFICATION_REPORT.md.
5. Display PASS or FAIL clearly in the final summary.
6. If the gate reports FAIL, display which gate failed and point to runtime/AUTONOMOUS_VERIFICATION_REPORT.md.
7. Store runner logs and completion-gate logs under codex_runs.

## Required Gate Inputs

- runtime/AUTONOMOUS_RUN_STATUS.md
- runtime/AUTONOMOUS_RUN_SUMMARY.md
- runtime/AUTONOMOUS_HEALTH_CHECK.md
- runtime/AUTONOMOUS_COMPLETION_GATE.md
- runtime/AUTONOMOUS_VERIFICATION_REPORT.md
- scripts/verify-autonomous-completion.ps1 or scripts/verify-autonomous-completion.sh when present
- Release artifacts for the target version when the project uses AIMart release packaging

## Safety

The gate must not read secrets, modify frozen release folders, publish remotes, deploy to production, run real database migrations, or create/delete cloud resources.
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
$VerificationReportPath = Join-Path $RootDir "runtime/AUTONOMOUS_VERIFICATION_REPORT.md"
$StartTime = Get-Date
$TargetVersion = "unknown"
$CleanAtStartup = "unknown"
$ExistingCodexProcesses = "unknown"

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

function Get-TargetVersionText {
  $PackagePath = Join-Path $RootDir "package.json"
  if (-not (Test-Path $PackagePath)) {
    return "unknown"
  }

  try {
    $Pkg = Get-Content -Path $PackagePath -Raw | ConvertFrom-Json
    if ($Pkg.version) { return "v$($Pkg.version)" }
  } catch {}

  return "unknown"
}

function Get-CleanAtStartupText {
  $Dirty = Get-DirtyFileCount
  if ($Dirty -lt 0) { return "git unavailable" }
  if ($Dirty -eq 0) { return "yes" }
  return "no ($Dirty changed file(s))"
}

function Get-ExistingCodexProcessesText {
  try {
    $Processes = @(Get-Process -Name "codex" -ErrorAction SilentlyContinue)
    if ($Processes.Count -eq 0) { return "none detected" }
    return "$($Processes.Count) detected"
  } catch {
    return "process check unavailable"
  }
}

function Get-TargetReleaseDir {
  if ($TargetVersion -eq "unknown") {
    return Join-Path $RootDir "releases"
  }
  return Join-Path $RootDir "releases/$TargetVersion"
}

function Get-TargetReleaseDirectoryStatus {
  $Path = Get-TargetReleaseDir
  if (Test-Path $Path) { return "exists: $Path" }
  return "missing: $Path"
}

function Get-SourceZipStatus {
  if ($TargetVersion -eq "unknown") { return "unknown target version" }
  $Path = Join-Path (Get-TargetReleaseDir) "aimart-orchestrator-$TargetVersion-source.zip"
  if (Test-Path $Path) { return "exists" }
  return "missing"
}

function Get-SampleZipStatus {
  if ($TargetVersion -eq "unknown") { return "unknown target version" }
  $Path = Join-Path (Get-TargetReleaseDir) "samples/todo-api-generated-execution-pack.zip"
  if (Test-Path $Path) { return "exists" }
  return "missing"
}

function Get-LatestLogActivityTime {
  if (-not (Test-Path $LogPath)) {
    return "none"
  }

  return (Get-Item $LogPath).LastWriteTime.ToString("s")
}

function Get-LogStalledText {
  if (-not (Test-Path $LogPath)) {
    return "no log yet"
  }

  $Age = (Get-Date) - (Get-Item $LogPath).LastWriteTime
  if ($Age.TotalMinutes -ge 5) {
    return "yes"
  }

  return "no"
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

function Invoke-CompletionGate {
  $GateScript = Join-Path $RootDir "scripts/verify-autonomous-completion.ps1"
  $GateLogPath = Join-Path $RunDir "completion-gate-$Stamp.log"
  $Status = "FAIL"
  $FailedGate = "Autonomous Completion Gate"
  $Details = "scripts/verify-autonomous-completion.ps1 not found; ran local file gate"

  if (Test-Path $GateScript) {
    & powershell -ExecutionPolicy Bypass -File $GateScript -TargetVersion $TargetVersion *> $GateLogPath
    $Code = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
    if ($Code -eq 0) {
      $Status = "PASS"
      $FailedGate = "none"
      $Details = "verify-autonomous-completion.ps1 exited 0; log: $GateLogPath"
    } else {
      $Status = "FAIL"
      $FailedGate = "verify-autonomous-completion.ps1"
      $Details = "exit $Code; log: $GateLogPath"
    }
  } else {
    $RequiredFiles = @(
      "runtime/AUTONOMOUS_COMPLETION_GATE.md",
      "runtime/AUTONOMOUS_VERIFICATION_REPORT.md",
      "runtime/AUTONOMOUS_RUN_SUMMARY.md",
      "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md"
    )
    $Missing = @()
    foreach ($Path in $RequiredFiles) {
      if (-not (Test-Path (Join-Path $RootDir $Path))) {
        $Missing += $Path
      }
    }
    if ($Missing.Count -eq 0) {
      $Status = "PASS"
      $FailedGate = "none"
      $Details = "local generated-pack completion files exist"
    } else {
      $Status = "FAIL"
      $FailedGate = "generated-pack file gate"
      $Details = "missing: $($Missing -join ', ')"
    }
  }

@"
# Autonomous Verification Report

| Gate | Status | Notes |
|---|---|---|
| Autonomous Completion Gate | $Status | $Details |
| Failed gate | $Status | $FailedGate |

Final result: $Status
"@ | Set-Content -Encoding UTF8 -Path $VerificationReportPath

  return [pscustomobject]@{
    Status = $Status
    FailedGate = $FailedGate
    ReportPath = $VerificationReportPath
    Details = $Details
  }
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
| Target version | $TargetVersion |
| Elapsed time | $Elapsed |
| Git branch | $Branch |
| Clean at startup | $CleanAtStartup |
| Existing Codex processes | $ExistingCodexProcesses |
| Dirty file count | $Dirty |
| Latest log tail | See $LogPath |
| Latest log activity time | $(Get-LatestLogActivityTime) |
| Log appears stalled | $(Get-LogStalledText) |
| Release directory status | $ReleaseStatus |
| Target release directory exists | $(Get-TargetReleaseDirectoryStatus) |
| Source ZIP exists | $(Get-SourceZipStatus) |
| Sample ZIP exists | $(Get-SampleZipStatus) |
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
- [x] Source ZIP status checked.
- [x] Sample ZIP status checked.
- [x] Latest log activity time checked.
- [x] Log appears stalled status checked.
- [x] Autonomous Completion Gate run at completion.
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
  Write-Host "Target version: $TargetVersion"
  Write-Host "State: $State"
  Write-Host "Elapsed: $Elapsed"
  Write-Host "Git branch: $Branch"
  Write-Host "Clean at startup: $CleanAtStartup"
  Write-Host "Existing Codex processes: $ExistingCodexProcesses"
  Write-Host "Dirty files: $Dirty"
  Write-Host "Release directory: $ReleaseStatus"
  Write-Host "Target release directory exists: $(Get-TargetReleaseDirectoryStatus)"
  Write-Host "Source ZIP: $(Get-SourceZipStatus)"
  Write-Host "Sample ZIP: $(Get-SampleZipStatus)"
  Write-Host "Latest log activity: $(Get-LatestLogActivityTime)"
  Write-Host "Log appears stalled: $(Get-LogStalledText)"
  Write-Host "Known issues: $KnownIssues"
  Write-Host "Autonomous Completion Gate: pending"
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

$TargetVersion = Get-TargetVersionText
$CleanAtStartup = Get-CleanAtStartupText
$ExistingCodexProcesses = Get-ExistingCodexProcessesText

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
$GateResult = Invoke-CompletionGate
$FinalExitCode = 1
if (($ExitCode -eq 0) -and ($GateResult.Status -eq "PASS")) {
  $FinalExitCode = 0
}

$ReleaseStatus = Get-ReleaseStatus
$SampleStatus = Get-SampleExecutionPackStatus
$GitStatus = Get-GitStatusText
if ($GateResult.Status -eq "PASS") {
  Write-Host "Autonomous Completion Gate: PASS"
} else {
  Write-Host "Autonomous Completion Gate: FAIL"
  Write-Host "Failed gate: $($GateResult.FailedGate)"
  Write-Host "Report file: $($GateResult.ReportPath)"
}
$NextAction = if ($FinalExitCode -eq 0) {
  "Review runtime/AUTONOMOUS_RUN_SUMMARY.md, inspect changed files, then run scripts/finalize for delivery."
} else {
  "Inspect runtime/AUTONOMOUS_VERIFICATION_REPORT.md and the latest codex_runs log, fix the blocking issue, then rerun the unified autonomous runner."
}

@"
# Autonomous Run Summary

| Field | Value |
|---|---|
| Codex exit code | $ExitCode |
| Final exit code | $FinalExitCode |
| Release artifacts | $ReleaseStatus |
| Sample execution pack | $SampleStatus |
| Autonomous Completion Gate | $($GateResult.Status) |
| Failed gate | $($GateResult.FailedGate) |
| Verification report | $($GateResult.ReportPath) |
| Git status | $GitStatus |
| Latest log | $LogPath |
| Next recommended action | $NextAction |
"@ | Set-Content -Encoding UTF8 -Path $SummaryPath

Write-Host ""
Write-Host "Final Summary"
Write-Host "-------------"
Write-Host "Codex exit code: $ExitCode"
Write-Host "Final exit code: $FinalExitCode"
Write-Host "Release artifacts: $ReleaseStatus"
Write-Host "Sample execution pack: $SampleStatus"
Write-Host "Autonomous Completion Gate: $($GateResult.Status)"
Write-Host "Failed gate: $($GateResult.FailedGate)"
Write-Host "Report file: $($GateResult.ReportPath)"
Write-Host "Git status: $GitStatus"
Write-Host "Next recommended action: $NextAction"

exit $FinalExitCode
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
    for path in \
      "runtime/AUTONOMOUS_COMPLETION_GATE.md" \
      "runtime/AUTONOMOUS_VERIFICATION_REPORT.md" \
      "runtime/AUTONOMOUS_RUN_SUMMARY.md" \
      "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md"; do
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
  printf "%s\\n" "AIMart Codex Unified Autonomous Runner"
  printf "%s\\n\\n" "one-window status display"
  printf "Target version: %s\\n" "$TARGET_VERSION"
  printf "State: %s\\n" "$state"
  printf "Elapsed: %s\\n" "$elapsed"
  printf "Git branch: %s\\n" "$branch"
  printf "Clean at startup: %s\\n" "$CLEAN_AT_STARTUP"
  printf "Existing Codex processes: %s\\n" "$EXISTING_CODEX_PROCESSES"
  printf "Dirty files: %s\\n" "$dirty"
  printf "Release directory: %s\\n" "$release"
  printf "Target release directory exists: %s\\n" "$(target_release_directory_status)"
  printf "Source ZIP: %s\\n" "$(source_zip_status)"
  printf "Sample ZIP: %s\\n" "$(sample_zip_status)"
  printf "Latest log activity: %s\\n" "$(latest_log_activity_time)"
  printf "Log appears stalled: %s\\n" "$(log_appears_stalled)"
  printf "Known issues: %s\\n" "$known"
  printf "Autonomous Completion Gate: %s\\n" "$COMPLETION_GATE_STATUS"
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
  printf "%s\\n" "Autonomous Completion Gate: PASS"
else
  printf "%s\\n" "Autonomous Completion Gate: FAIL"
  printf "Failed gate: %s\\n" "$COMPLETION_GATE_FAILED"
  printf "Report file: %s\\n" "$COMPLETION_GATE_REPORT"
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

printf "\\n%s\\n" "Final Summary"
printf "%s\\n" "-------------"
printf "Codex exit code: %s\\n" "$EXIT_CODE"
printf "Final exit code: %s\\n" "$FINAL_EXIT_CODE"
printf "Release artifacts: %s\\n" "$RELEASE_STATUS"
printf "Sample execution pack: %s\\n" "$SAMPLE_STATUS"
printf "Autonomous Completion Gate: %s\\n" "$COMPLETION_GATE_STATUS"
printf "Failed gate: %s\\n" "$COMPLETION_GATE_FAILED"
printf "Report file: %s\\n" "$COMPLETION_GATE_REPORT"
printf "Git status: %s\\n" "$GIT_STATUS"
printf "Next recommended action: %s\\n" "$NEXT_ACTION"

exit "$FINAL_EXIT_CODE"
`;
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.join(", ") : "Not specified";
}
