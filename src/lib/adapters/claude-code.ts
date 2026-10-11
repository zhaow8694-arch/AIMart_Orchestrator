// Checked against Claude Code 2.1.274 on 2026-10-11.
// `claude --help` confirms -p, --output-format stream-json, --input-format text,
// --verbose, --permission-mode (dontAsk | acceptEdits), --settings,
// --append-system-prompt, and --resume. `--max-turns <turns>` is accepted by
// the parser even though the summary help omits it.
// Project settings use permissions.allow and permissions.deny string rules.
// Bash rules look like Bash(<prefix> *). Do not invent a second permission model.

import type { RuntimePack } from "@/lib/generators/runtime-pack";
import type {
  FileEntry,
  PermissionPolicy,
  ProjectSpec,
  TaskQueue
} from "@/lib/schemas/core";
import { isClaudeCodeLauncherEnabled } from "@/lib/adapters/feature-flag";
import {
  SANDBOX_TIMEOUT_DEFAULTS,
  type SandboxTimeoutKey
} from "@/lib/adapters/sandbox-timeouts";
import type {
  AdapterRunMode,
  AgentRuntimeAdapter,
  LaunchSpec,
  RunnerEvent,
  RunSummary
} from "@/lib/adapters/types";

type CommandRule = PermissionPolicy["commandRules"][number];

export const CLAUDE_MAX_TURNS = 80;

export const CLAUDE_SYSTEM_PROMPT_LINE =
  "遵循 agent_adapters/claude-code/CLAUDE.md、common/TASK_QUEUE.md、runtime/SAFE_COMMANDS.md、runtime/DENIED_COMMANDS.md，并且本工作区只有这一个代理。";

export const CLAUDE_MANUAL_PATHS = [
  "agent_adapters/claude-code/CLAUDE.md",
  "agent_adapters/claude-code/CLAUDE_RUNBOOK.md",
  "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md",
  "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md",
  "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/claude-code/settings.example.json",
  "agent_adapters/claude-code/run-claude-supervised.md",
  "agent_adapters/claude-code/run-claude-autonomous.md"
] as const;

export const CLAUDE_LAUNCHER_PATHS = [
  "agent_adapters/claude-code/settings.json",
  "agent_adapters/claude-code/run-claude-autonomous.ps1",
  "agent_adapters/claude-code/run-claude-supervised.ps1",
  "agent_adapters/claude-code/run-claude-unified-autonomous.ps1",
  "agent_adapters/claude-code/run-claude-end-to-end-autonomous.ps1",
  "agent_adapters/claude-code/run-claude-autonomous.sh",
  "agent_adapters/claude-code/run-claude-supervised.sh",
  "agent_adapters/claude-code/run-claude-unified-autonomous.sh",
  "agent_adapters/claude-code/run-claude-end-to-end-autonomous.sh"
] as const;

const SETTINGS_PATH = "agent_adapters/claude-code/settings.json";
const INPUT_SUMMARY_LIMIT = 200;

export type ClaudeMapContext = {
  adapterId?: string;
  mode?: AdapterRunMode;
  cwd?: string;
  lastToolName?: string;
};

type LauncherKind =
  | "autonomous"
  | "supervised"
  | "unified"
  | "end_to_end";

export function bashPermissionRule(command: string): string {
  const prefix = command.trim().replace(/\s+\*$/, "");
  return `Bash(${prefix} *)`;
}

export function projectClaudePermissionSettings(commandRules: CommandRule[]): {
  permissions: { allow: string[]; deny: string[] };
} {
  const allow = ["Read", "Edit"];
  const deny = ["Read(~/.ssh/**)", "Read(~/.aws/**)"];

  for (const rule of commandRules) {
    const bash = bashPermissionRule(rule.command);
    if (rule.action === "allow") {
      allow.push(bash);
    } else {
      deny.push(bash);
    }

    const haystack = `${rule.command} ${rule.reason}`;
    if (/ssh/i.test(haystack)) {
      deny.push("Read(~/.ssh/**)");
    }
    if (/aws/i.test(haystack)) {
      deny.push("Read(~/.aws/**)");
    }
    if (/\.env|credential|printenv|secret/i.test(haystack)) {
      deny.push("Read(**/.env)");
      deny.push("Read(.env)");
    }
  }

  return {
    permissions: {
      allow: unique(allow),
      deny: unique(deny)
    }
  };
}

export function launchSpecForClaude(mode: AdapterRunMode): LaunchSpec {
  const timeoutSec =
    mode === "end_to_end_autonomous"
      ? SANDBOX_TIMEOUT_DEFAULTS.endToEndSec
      : SANDBOX_TIMEOUT_DEFAULTS.autonomousSec;
  const argv = [
    "-p",
    "--output-format",
    "stream-json",
    "--input-format",
    "text",
    "--verbose",
    "--permission-mode",
    mode === "supervised" ? "acceptEdits" : "dontAsk"
  ];

  if (mode !== "supervised") {
    argv.push("--max-turns", String(CLAUDE_MAX_TURNS));
  }

  argv.push(
    "--settings",
    SETTINGS_PATH,
    "--append-system-prompt",
    CLAUDE_SYSTEM_PROMPT_LINE
  );

  return {
    executable: "claude",
    argv,
    promptPath: promptPathForMode(mode),
    stdin: "prompt-file",
    outputFormat: "stream-json",
    timeoutSec,
    retry: {
      maxAttempts: 2,
      retryOn: ["spawn-failure", "rate-limit"]
    }
  };
}

export function mapClaudeStreamJson(
  line: string,
  context: ClaudeMapContext = {}
): RunnerEvent[] {
  const trimmed = line.trim();
  if (!trimmed) {
    return [];
  }

  const adapterId = context.adapterId ?? "claude-code";
  const mode = context.mode ?? "autonomous";
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [{ type: "log_line", stream: "stdout", text: line }];
  }

  const record = asRecord(parsed);
  if (!record) {
    return [{ type: "log_line", stream: "stdout", text: line }];
  }

  const kind = typeof record.type === "string" ? record.type : "";
  if (kind === "system" && record.subtype === "init") {
    const event: RunnerEvent = {
      type: "run_started",
      adapterId,
      mode,
      cwd: typeof record.cwd === "string" ? record.cwd : (context.cwd ?? "")
    };
    if (typeof record.session_id === "string" && record.session_id) {
      event.sessionId = record.session_id;
    }
    return [event];
  }

  if (kind === "assistant") {
    const events = mapAssistantBlocks(record);
    return events.length > 0
      ? events
      : [{ type: "log_line", stream: "stdout", text: line }];
  }

  if (kind === "user") {
    const events = mapUserBlocks(record, context.lastToolName ?? "Bash");
    return events.length > 0
      ? events
      : [{ type: "log_line", stream: "stdout", text: line }];
  }

  if (kind === "result") {
    return [mapResult(record)];
  }

  return [{ type: "log_line", stream: "stdout", text: line }];
}

export function mapClaudeStream(
  text: string,
  context: ClaudeMapContext = {}
): RunnerEvent[] {
  const events: RunnerEvent[] = [];
  let lastToolName = context.lastToolName;
  for (const line of text.split(/\r?\n/)) {
    const mapped = mapClaudeStreamJson(line, { ...context, lastToolName });
    for (const event of mapped) {
      if (event.type === "tool_use") {
        lastToolName = event.name;
      }
      events.push(event);
    }
  }
  return events;
}

export function reportClaudeStatus(input: {
  exitCode: number;
  logPath: string;
  events: RunnerEvent[];
}): RunSummary {
  const finished = [...input.events]
    .reverse()
    .find((event) => event.type === "run_finished");
  const started = input.events.find((event) => event.type === "run_started");
  const sessionId =
    (finished?.type === "run_finished" && finished.sessionId) ||
    (started?.type === "run_started" && started.sessionId) ||
    "none";
  const isError = finished?.type === "run_finished" && finished.isError === true;
  const numTurns = finished?.type === "run_finished" ? finished.numTurns : undefined;
  const costUsd = finished?.type === "run_finished" ? finished.costUsd : undefined;
  const mode = started?.type === "run_started" ? started.mode : "autonomous";
  const maxTurns = mode === "supervised" ? Number.POSITIVE_INFINITY : CLAUDE_MAX_TURNS;
  let classification = "none";
  let finalExitCode = input.exitCode;

  if (input.exitCode === 1460) {
    classification = "SANDBOX_TIMEOUT";
    finalExitCode = 1460;
  } else if (!finished) {
    classification = "CLAUDE_STREAM_TRUNCATED";
    if (finalExitCode === 0) {
      finalExitCode = 1;
    }
  } else if (typeof numTurns === "number" && numTurns >= maxTurns) {
    classification = "CLAUDE_MAX_TURNS";
    if (finalExitCode === 0) {
      finalExitCode = 1;
    }
  } else if (isError || input.exitCode !== 0) {
    if (finalExitCode === 0) {
      finalExitCode = 1;
    }
    if (input.events.some((event) => event.type === "approval_required")) {
      classification = "CLAUDE_PERMISSION_DENIED";
    }
  }

  return {
    adapterId: "claude-code",
    exitCode: input.exitCode,
    finalExitCode,
    classification,
    sessionId,
    isError: Boolean(isError),
    numTurns,
    costUsd,
    markdown: renderRunSummaryMarkdown({
      exitCode: input.exitCode,
      finalExitCode,
      logPath: input.logPath,
      sessionId,
      numTurns,
      costUsd,
      classification
    })
  };
}

export function generateClaudeCodeAdapter(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue,
  runtimePack: RuntimePack
): FileEntry[] {
  const files: FileEntry[] = [
    file("agent_adapters/claude-code/CLAUDE.md", renderClaudeMd(projectSpec)),
    file(
      "agent_adapters/claude-code/CLAUDE_RUNBOOK.md",
      renderRunbook(projectSpec)
    ),
    file(
      "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md",
      renderTaskPrompt(projectSpec, taskQueue, runtimePack)
    ),
    file(
      "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md",
      renderAutonomousPrompt(projectSpec, taskQueue)
    ),
    file(
      "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md",
      renderEndToEndRunbook(projectSpec, taskQueue)
    ),
    file(
      "agent_adapters/claude-code/settings.example.json",
      renderSettingsExample()
    ),
    file(
      "agent_adapters/claude-code/run-claude-supervised.md",
      renderManualStart("supervised")
    ),
    file(
      "agent_adapters/claude-code/run-claude-autonomous.md",
      renderManualStart("autonomous")
    )
  ];

  if (!isClaudeCodeLauncherEnabled()) {
    return files;
  }

  const settings = projectClaudePermissionSettings(
    runtimePack.permissionPolicy.commandRules
  );
  files.push(
    file(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`),
    file(
      "agent_adapters/claude-code/run-claude-autonomous.ps1",
      renderClaudePs1("autonomous")
    ),
    file(
      "agent_adapters/claude-code/run-claude-supervised.ps1",
      renderClaudePs1("supervised")
    ),
    file(
      "agent_adapters/claude-code/run-claude-unified-autonomous.ps1",
      renderClaudePs1("unified")
    ),
    file(
      "agent_adapters/claude-code/run-claude-end-to-end-autonomous.ps1",
      renderClaudePs1("end_to_end")
    ),
    file(
      "agent_adapters/claude-code/run-claude-autonomous.sh",
      renderClaudeSh("autonomous")
    ),
    file(
      "agent_adapters/claude-code/run-claude-supervised.sh",
      renderClaudeSh("supervised")
    ),
    file(
      "agent_adapters/claude-code/run-claude-unified-autonomous.sh",
      renderClaudeSh("unified")
    ),
    file(
      "agent_adapters/claude-code/run-claude-end-to-end-autonomous.sh",
      renderClaudeSh("end_to_end")
    )
  );
  return files;
}

export function createClaudeCodeRuntimeAdapter(): AgentRuntimeAdapter {
  return {
    id: "claude-code",
    generateFiles: generateClaudeCodeAdapter,
    launchSpec: launchSpecForClaude,
    mapEvent(line: string): RunnerEvent | null {
      return mapClaudeStreamJson(line)[0] ?? null;
    },
    reportStatus: reportClaudeStatus
  };
}

export function renderClaudeEventMapperJs(): string {
  return `import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const LIMIT = 200;

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function truncate(value) {
  return value.length > LIMIT ? value.slice(0, LIMIT) : value;
}

function summarize(name, input) {
  let raw = "";
  if (typeof input === "string") raw = input;
  else {
    try { raw = JSON.stringify(input ?? {}); } catch { raw = ""; }
  }
  return name + ": " + truncate(raw);
}

function permissionDenied(text) {
  return /permission denied|not permitted|requires approval|denied by permission|EACCES/i.test(text);
}

function exitCodeOf(text) {
  const match = text.match(/exit code[:\\s]+(\\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function blockText(block) {
  if (typeof block.content === "string") return block.content;
  if (typeof block.text === "string") return block.text;
  try { return JSON.stringify(block.content ?? ""); } catch { return ""; }
}

function extractCommand(text, fallback) {
  const match = text.match(/command[:\\s]+([^\\n]+)/i);
  const value = match ? match[1].trim() : fallback;
  return (value || fallback).slice(0, LIMIT);
}

export function mapLine(line, context) {
  const trimmed = line.trim();
  if (!trimmed) return [];
  const mode = context.mode || "autonomous";
  const cwd = context.cwd || "";
  let record;
  try { record = JSON.parse(trimmed); } catch {
    return [{ type: "log_line", stream: "stdout", text: line }];
  }
  record = asRecord(record);
  if (!record) return [{ type: "log_line", stream: "stdout", text: line }];
  const kind = typeof record.type === "string" ? record.type : "";
  if (kind === "system" && record.subtype === "init") {
    const event = {
      type: "run_started",
      adapterId: "claude-code",
      mode,
      cwd: typeof record.cwd === "string" ? record.cwd : cwd
    };
    if (typeof record.session_id === "string" && record.session_id) event.sessionId = record.session_id;
    return [event];
  }
  if (kind === "assistant") {
    const message = asRecord(record.message);
    const blocks = message && Array.isArray(message.content) ? message.content : [];
    const events = [];
    for (const block of blocks) {
      if (typeof block === "string" && block) {
        events.push({ type: "assistant_text", text: block });
        continue;
      }
      const item = asRecord(block);
      if (!item) continue;
      if (item.type === "text" && typeof item.text === "string") {
        events.push({ type: "assistant_text", text: item.text });
      } else if (item.type === "tool_use") {
        const name = typeof item.name === "string" ? item.name : "tool";
        events.push({ type: "tool_use", name, inputSummary: summarize(name, item.input) });
      }
    }
    return events.length ? events : [{ type: "log_line", stream: "stdout", text: line }];
  }
  if (kind === "user") {
    const message = asRecord(record.message);
    const blocks = message && Array.isArray(message.content) ? message.content : [];
    const events = [];
    const toolName = context.lastToolName || "Bash";
    for (const block of blocks) {
      const item = asRecord(block);
      if (!item || item.type !== "tool_result") continue;
      const body = blockText(item);
      if (permissionDenied(body)) {
        events.push({
          type: "approval_required",
          command: extractCommand(body, toolName),
          risk: "denied by claude permission mode"
        });
        continue;
      }
      const event = { type: "tool_result", name: toolName, ok: item.is_error !== true };
      const code = exitCodeOf(body);
      if (code !== undefined) event.exitCode = code;
      events.push(event);
    }
    return events.length ? events : [{ type: "log_line", stream: "stdout", text: line }];
  }
  if (kind === "result") {
    const isError = record.is_error === true;
    const event = { type: "run_finished", exitCode: isError ? 1 : 0, isError };
    if (typeof record.duration_ms === "number") event.durationMs = record.duration_ms;
    if (typeof record.num_turns === "number") event.numTurns = record.num_turns;
    if (typeof record.total_cost_usd === "number") event.costUsd = record.total_cost_usd;
    if (typeof record.session_id === "string" && record.session_id) event.sessionId = record.session_id;
    return [event];
  }
  return [{ type: "log_line", stream: "stdout", text: line }];
}

export function mapStream(text, context) {
  const events = [];
  let lastToolName = context.lastToolName;
  for (const line of text.split(/\\r?\\n/)) {
    const mapped = mapLine(line, Object.assign({}, context, { lastToolName }));
    for (const event of mapped) {
      if (event.type === "tool_use") lastToolName = event.name;
      events.push(event);
    }
  }
  return events;
}

if (process.argv[2] === "--line") {
  process.stdout.write(JSON.stringify(mapLine(process.argv[3] || "", {
    mode: process.argv[4] || "autonomous",
    cwd: process.argv[5] || ""
  })));
}

if (process.argv[2] === "--map-file") {
  const logPath = process.argv[3];
  const eventsPath = process.argv[4];
  const runEventsPath = process.argv[5];
  const mode = process.argv[6] || "autonomous";
  const cwd = process.argv[7] || "";
  const text = readFileSync(logPath, "utf8");
  const events = mapStream(text, { mode, cwd });
  const body = events.map((event) => JSON.stringify(event)).join("\\n") + (events.length ? "\\n" : "");
  for (const target of [eventsPath, runEventsPath]) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body, "utf8");
  }
}
`;
}

function promptPathForMode(mode: AdapterRunMode): string {
  if (mode === "end_to_end_autonomous") {
    return "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md";
  }
  if (mode === "supervised") {
    return "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md";
  }
  return "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md";
}

function launcherProfile(kind: LauncherKind): {
  mode: AdapterRunMode;
  label: string;
  logDir: "aimart" | "runs";
  timeoutKey: SandboxTimeoutKey;
  combineGate: boolean;
} {
  if (kind === "supervised") {
    return {
      mode: "supervised",
      label: "supervised",
      logDir: "aimart",
      timeoutKey: "autonomousSec",
      combineGate: false
    };
  }
  if (kind === "end_to_end") {
    return {
      mode: "end_to_end_autonomous",
      label: "end-to-end-autonomous",
      logDir: "runs",
      timeoutKey: "endToEndSec",
      combineGate: false
    };
  }
  if (kind === "unified") {
    return {
      mode: "autonomous",
      label: "unified-autonomous",
      logDir: "runs",
      timeoutKey: "autonomousSec",
      combineGate: true
    };
  }
  return {
    mode: "autonomous",
    label: "autonomous",
    logDir: "aimart",
    timeoutKey: "autonomousSec",
    combineGate: false
  };
}

function renderClaudePs1(kind: LauncherKind): string {
  const profile = launcherProfile(kind);
  const spec = launchSpecForClaude(profile.mode);
  const argLiteral = spec.argv.map((arg) => psQuote(arg)).join(", ");
  const fallback =
    profile.timeoutKey === "endToEndSec"
      ? SANDBOX_TIMEOUT_DEFAULTS.endToEndSec
      : SANDBOX_TIMEOUT_DEFAULTS.autonomousSec;
  const logParent =
    profile.logDir === "runs"
      ? 'Join-Path $RootDir "codex_runs"'
      : 'Join-Path $RootDir ".aimart/logs"';
  const combineGate = profile.combineGate ? "$true" : "$false";
  const mapper = renderClaudeEventMapperJs();

  return `$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $RootDir

$LogDir = ${logParent}
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$RunId = $Stamp
$LogPath = Join-Path $LogDir "claude-${profile.label}-$Stamp.log"
$EventsPath = Join-Path $RootDir "runtime/events.jsonl"
$RunEventsPath = Join-Path $RootDir ("runtime/sandbox/{0}/events.jsonl" -f $RunId)
$SessionPath = Join-Path $RootDir ("runtime/sandbox/{0}/claude-session.txt" -f $RunId)
$PromptPath = Join-Path $RootDir "${spec.promptPath}"
$SettingsPath = Join-Path $RootDir "${SETTINGS_PATH}"
$SandboxScript = Join-Path $RootDir "scripts/invoke-sandboxed.ps1"
$InterruptFlag = Join-Path $RootDir "runtime/sandbox/claude-external-interrupt.txt"
$ApprovalPath = Join-Path $RootDir "runtime/APPROVAL_QUEUE.md"
$SummaryPath = Join-Path $RootDir "runtime/AUTONOMOUS_RUN_SUMMARY.md"
$StatusPath = Join-Path $RootDir "runtime/AUTONOMOUS_RUN_STATUS.md"
$HealthPath = Join-Path $RootDir "runtime/AUTONOMOUS_HEALTH_CHECK.md"
$ModeName = "${profile.mode}"
$TimeoutKey = "${profile.timeoutKey}"
$TimeoutFallback = ${fallback}
$CombineGate = ${combineGate}
$MaxAttempts = 2
$StaticArgs = @(${argLiteral})

function Get-ProfileTimeout {
  param([string]$Key, [int]$Fallback)
  $ProfilePath = Join-Path $RootDir "runtime/SANDBOX_PROFILE.json"
  if (-not (Test-Path -LiteralPath $ProfilePath)) { return $Fallback }
  try {
    $sandboxProfile = Get-Content -LiteralPath $ProfilePath -Raw | ConvertFrom-Json
    if ($sandboxProfile.timeouts -and $null -ne $sandboxProfile.timeouts.$Key) {
      return [int]$sandboxProfile.timeouts.$Key
    }
  } catch {
    Write-Host ("[claude] sandbox profile timeout ignored: {0}" -f $_.Exception.Message)
  }
  return $Fallback
}

$TimeoutSec = Get-ProfileTimeout -Key $TimeoutKey -Fallback $TimeoutFallback
Write-Host "[claude-${profile.label}] permission-mode from launcher args; log=$LogPath"
Write-Host "[claude-${profile.label}] timeoutSec=$TimeoutSec from runtime/SANDBOX_PROFILE.json key $TimeoutKey"

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "[claude] spawn-failure: claude is not on PATH"
} else {
  $ProbePath = Join-Path $LogDir "claude-auth-probe-$Stamp.log"
  $PrevProbe = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & claude -p "ping" --max-turns 1 2>&1 | Out-File -Encoding utf8 -FilePath $ProbePath
  $ProbeCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
  $ErrorActionPreference = $PrevProbe
  $ProbeText = ""
  if (Test-Path -LiteralPath $ProbePath) { $ProbeText = Get-Content -LiteralPath $ProbePath -Raw }
  if ($ProbeCode -ne 0 -and $ProbeText -match "auth|API key|not authenticated|401|login") {
    Write-Host "CLAUDE_NOT_AUTHENTICATED"
    Set-Content -Encoding UTF8 -Path $LogPath -Value "CLAUDE_NOT_AUTHENTICATED"
    exit 1
  }
}

$ExtraArgs = @()
if (Test-Path -LiteralPath $InterruptFlag) {
  $raw = (Get-Content -LiteralPath $InterruptFlag -Raw).Trim()
  Remove-Item -LiteralPath $InterruptFlag -Force
  $parts = $raw.Split("|")
  if ($parts.Length -ge 2) {
    $prevCode = 0
    [void][int]::TryParse($parts[0], [ref]$prevCode)
    $prevSession = $parts[1].Trim()
    if ($prevCode -ne 0 -and $prevCode -ne 1460 -and $prevSession -and $prevSession -ne "none") {
      $ExtraArgs = @("--resume", $prevSession)
    }
  }
}

function Test-Retryable {
  param([int]$Code, [string]$LogFile)
  if ($Code -eq 0 -or $Code -eq 1460) { return $false }
  $text = ""
  if (Test-Path -LiteralPath $LogFile) { $text = Get-Content -LiteralPath $LogFile -Raw }
  if ($text -match "CLAUDE_NOT_AUTHENTICATED") { return $false }
  if ($text -match "CLAUDE_MAX_TURNS") { return $false }
  if ($text -match "429" -or $text -match "529") { return $true }
  if ($text -match "not recognized|command not found|sandbox executable not found|sandbox launch failed|spawn-failure") { return $true }
  if (-not (Test-Path -LiteralPath $LogFile)) { return $true }
  return $false
}

function Invoke-ClaudeAttempt {
  param([string]$AttemptLog, [string[]]$ResumeArgs)
  $LauncherPath = "$AttemptLog.launch.ps1"
  $RootEscaped = $RootDir.Replace("'", "''")
  $PromptEscaped = $PromptPath.Replace("'", "''")
  $Quoted = @($StaticArgs + $ResumeArgs | ForEach-Object { "'" + $_.Replace("'", "''") + "'" })
  @(
    '$ErrorActionPreference = "Continue"'
    "Set-Location -LiteralPath '$RootEscaped'"
    ('$ClaudeArgs = @(' + ($Quoted -join ",") + ')')
    "Get-Content -LiteralPath '$PromptEscaped' -Raw | & claude @ClaudeArgs"
    'if ($null -eq $LASTEXITCODE) { exit 0 } else { exit $LASTEXITCODE }'
  ) | Set-Content -Encoding UTF8 -Path $LauncherPath
  $Prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $SandboxScript -File $LauncherPath -Cwd $RootDir -TimeoutSec $TimeoutSec -Mode $ModeName -AdapterId "claude-code" -Stage "CODEX_EXECUTION" -StdoutPath $AttemptLog -StderrPath $AttemptLog
  } finally {
    $ErrorActionPreference = $Prev
  }
  if ($null -eq $LASTEXITCODE) { return 0 }
  return [int]$LASTEXITCODE
}

$Attempt = 1
$ExitCode = 1
$ActiveLog = $LogPath
while ($Attempt -le $MaxAttempts) {
  if ($Attempt -eq 1) { $ActiveLog = $LogPath } else { $ActiveLog = "$LogPath.retry$Attempt" }
  $ExitCode = Invoke-ClaudeAttempt -AttemptLog $ActiveLog -ResumeArgs $ExtraArgs
  if ($Attempt -ge $MaxAttempts) { break }
  if (-not (Test-Retryable -Code $ExitCode -LogFile $ActiveLog)) { break }
  Write-Host "[claude] retryable failure, waiting 30 seconds before attempt 2"
  Start-Sleep -Seconds 30
  $Attempt = $Attempt + 1
}

$MapperPath = Join-Path $LogDir ("map-claude-stream-" + $Stamp + ".mjs")
@'
${mapper}
'@ | Set-Content -Encoding UTF8 -Path $MapperPath
if (Test-Path -LiteralPath $ActiveLog) {
  $PrevMap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & node $MapperPath --map-file $ActiveLog $EventsPath $RunEventsPath $ModeName $RootDir
  $ErrorActionPreference = $PrevMap
}

$SessionId = "none"
$HasResult = $false
$IsError = $false
$NumTurns = ""
$CostUsd = ""
if (Test-Path -LiteralPath $EventsPath) {
  foreach ($EventLine in @(Get-Content -LiteralPath $EventsPath)) {
    if (-not $EventLine.Trim()) { continue }
    try { $Event = $EventLine | ConvertFrom-Json } catch { continue }
    if ($Event.sessionId) { $SessionId = [string]$Event.sessionId }
    if ($Event.type -eq "run_finished") {
      $HasResult = $true
      if ($Event.isError -eq $true) { $IsError = $true }
      if ($null -ne $Event.numTurns) { $NumTurns = [string]$Event.numTurns }
      if ($null -ne $Event.costUsd) { $CostUsd = [string]$Event.costUsd }
    }
    if ($Event.type -eq "approval_required") {
      $QueueLine = "| $(Get-Date -Format s) | $($Event.command) | $($Event.risk) | claude permission denied | no | queued |"
      Add-Content -Encoding UTF8 -Path $ApprovalPath -Value $QueueLine
    }
  }
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $SessionPath) | Out-Null
Set-Content -Encoding UTF8 -Path $SessionPath -Value $SessionId

$Classification = "none"
$FinalExit = $ExitCode
if ($ExitCode -eq 1460) {
  $Classification = "SANDBOX_TIMEOUT"
} elseif (-not $HasResult) {
  $Classification = "CLAUDE_STREAM_TRUNCATED"
  if ($FinalExit -eq 0) { $FinalExit = 1 }
  if ($ExitCode -ne 0 -and $SessionId -ne "none") {
    Set-Content -Encoding UTF8 -Path $InterruptFlag -Value ("{0}|{1}" -f $ExitCode, $SessionId)
  }
} elseif ($NumTurns -ne "" -and [int]$NumTurns -ge ${CLAUDE_MAX_TURNS} -and $ModeName -ne "supervised") {
  $Classification = "CLAUDE_MAX_TURNS"
  if ($FinalExit -eq 0) { $FinalExit = 1 }
} elseif ($IsError -and $FinalExit -eq 0) {
  $FinalExit = 1
}

if ($CombineGate) {
  $GateStatus = "FAIL"
  $GateReport = Join-Path $RootDir "runtime/COMPLETION_GATE_REPORT.md"
  if (Test-Path -LiteralPath $GateReport) {
    $GateText = Get-Content -LiteralPath $GateReport -Raw
    if ($GateText -match "PASS") { $GateStatus = "PASS" }
  }
  if (-not ($FinalExit -eq 0 -and $GateStatus -eq "PASS")) { $FinalExit = 1 }
  @"
# Autonomous Run Status

| Field | Value |
|---|---|
| Adapter | claude-code |
| Runner state | completed |
| Exit code | $ExitCode |
| Log | $ActiveLog |
"@ | Set-Content -Encoding UTF8 -Path $StatusPath
  @"
# Autonomous Health Check

| Field | Value |
|---|---|
| Adapter | claude-code |
| Log | $ActiveLog |
| Events | $EventsPath |
| Session | $SessionId |
| Classification | $Classification |
"@ | Set-Content -Encoding UTF8 -Path $HealthPath
}

@"
# Autonomous Run Summary

| Field | Value |
|---|---|
| Adapter | claude-code |
| Codex exit code | $ExitCode |
| Final exit code | $FinalExit |
| Sandbox account | not installed |
| Filesystem isolation | degraded-same-user |
| Network isolation | none |
| Release artifacts | unknown |
| Sample execution pack | unknown |
| Autonomous Completion Gate | pending |
| Failed gate | none |
| Verification report | runtime/AUTONOMOUS_VERIFICATION_REPORT.md |
| Git status | unknown |
| Latest log | $ActiveLog |
| Session | $SessionId |
| Num turns | $NumTurns |
| Cost USD | $CostUsd |
| Classification | $Classification |
| Next recommended action | Review this summary. Cost and turn count are informational and are not PASS/FAIL conditions. |
"@ | Set-Content -Encoding UTF8 -Path $SummaryPath

exit $FinalExit
`;
}

function renderClaudeSh(kind: LauncherKind): string {
  const profile = launcherProfile(kind);
  const spec = launchSpecForClaude(profile.mode);
  const fallback =
    profile.timeoutKey === "endToEndSec"
      ? SANDBOX_TIMEOUT_DEFAULTS.endToEndSec
      : SANDBOX_TIMEOUT_DEFAULTS.autonomousSec;
  const logDir =
    profile.logDir === "runs" ? "codex_runs" : ".aimart/logs";
  const args = spec.argv
    .map((arg) => `  ${bashQuote(arg)} \\`)
    .join("\n");

  return `#!/usr/bin/env bash
set -u
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/${logDir}"
mkdir -p "$LOG_DIR" runtime runtime/sandbox
STAMP="$(date +%Y%m%d_%H%M%S)"
LOG_PATH="$LOG_DIR/claude-${profile.label}-$STAMP.log"
EVENTS_PATH="$ROOT_DIR/runtime/events.jsonl"
PROMPT_PATH="$ROOT_DIR/${spec.promptPath}"
TIMEOUT_KEY="${profile.timeoutKey}"
TIMEOUT_SEC=${fallback}
if [ -f "$ROOT_DIR/runtime/SANDBOX_PROFILE.json" ]; then
  parsed="$(node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const key=process.argv[2]; const value=p.timeouts&&p.timeouts[key]; if(value) process.stdout.write(String(value));" "$ROOT_DIR/runtime/SANDBOX_PROFILE.json" "$TIMEOUT_KEY" 2>/dev/null || true)"
  if [ -n "$parsed" ]; then TIMEOUT_SEC="$parsed"; fi
fi
echo "[claude-${profile.label}] timeoutSec=$TIMEOUT_SEC from runtime/SANDBOX_PROFILE.json key $TIMEOUT_KEY"

if command -v claude >/dev/null 2>&1; then
  PROBE_LOG="$LOG_DIR/claude-auth-probe-$STAMP.log"
  set +e
  claude -p "ping" --max-turns 1 > "$PROBE_LOG" 2>&1
  PROBE_CODE=$?
  set -e
  PROBE_TEXT=""
  if [ -f "$PROBE_LOG" ]; then PROBE_TEXT="$(cat "$PROBE_LOG")"; fi
  if [ "$PROBE_CODE" -ne 0 ]; then
    case "$PROBE_TEXT" in
      *auth*|*API key*|*not authenticated*|*401*|*login*)
        echo "CLAUDE_NOT_AUTHENTICATED"
        printf '%s\\n' "CLAUDE_NOT_AUTHENTICATED" > "$LOG_PATH"
        exit 1
        ;;
    esac
  fi
fi

MAX_ATTEMPTS=2
ATTEMPT=1
CODE=1
ACTIVE_LOG="$LOG_PATH"
while [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]; do
  if [ "$ATTEMPT" -eq 1 ]; then ACTIVE_LOG="$LOG_PATH"; else ACTIVE_LOG="$LOG_PATH.retry$ATTEMPT"; fi
  set +e
  cat "$PROMPT_PATH" | claude \\
${args}
    > "$ACTIVE_LOG" 2>&1
  CODE="\${PIPESTATUS[1]}"
  set -e
  if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then break; fi
  if [ "$CODE" -eq 0 ] || [ "$CODE" -eq 1460 ]; then break; fi
  TEXT=""
  if [ -f "$ACTIVE_LOG" ]; then TEXT="$(cat "$ACTIVE_LOG")"; fi
  case "$TEXT" in
    *CLAUDE_NOT_AUTHENTICATED*|*CLAUDE_MAX_TURNS*) break ;;
    *429*|*529*|*not recognized*|*command not found*|*spawn-failure*|*sandbox executable not found*|*sandbox launch failed*)
      echo "[claude] retryable failure, waiting 30 seconds before attempt 2"
      sleep 30
      ATTEMPT=$((ATTEMPT + 1))
      ;;
    *) break ;;
  esac
done
echo "[claude-${profile.label}] exit $CODE log=$ACTIVE_LOG"
exit "$CODE"
`;
}

function renderRunSummaryMarkdown(input: {
  exitCode: number;
  finalExitCode: number;
  logPath: string;
  sessionId: string;
  numTurns?: number;
  costUsd?: number;
  classification: string;
}): string {
  const turns = input.numTurns === undefined ? "" : String(input.numTurns);
  const cost = input.costUsd === undefined ? "" : String(input.costUsd);
  return `# Autonomous Run Summary

| Field | Value |
|---|---|
| Adapter | claude-code |
| Codex exit code | ${input.exitCode} |
| Final exit code | ${input.finalExitCode} |
| Sandbox account | not installed |
| Filesystem isolation | degraded-same-user |
| Network isolation | none |
| Release artifacts | unknown |
| Sample execution pack | unknown |
| Autonomous Completion Gate | pending |
| Failed gate | none |
| Verification report | runtime/AUTONOMOUS_VERIFICATION_REPORT.md |
| Git status | unknown |
| Latest log | ${input.logPath} |
| Session | ${input.sessionId} |
| Num turns | ${turns} |
| Cost USD | ${cost} |
| Classification | ${input.classification} |
| Next recommended action | Review this summary. Cost and turn count are informational and are not PASS/FAIL conditions. |
`;
}

function renderClaudeMd(projectSpec: ProjectSpec): string {
  return `# CLAUDE.md - Claude Code Adapter

Claude Code is an independent execution option for this generated execution pack.

## Project Facts

- Project: ${projectSpec.projectName}
- Execution mode: ${projectSpec.executionMode}
- MVP scope: ${formatList(projectSpec.mvpScope)}
- Forbidden items: ${formatList(projectSpec.forbiddenItems)}
- Security boundaries: ${formatList(projectSpec.securityBoundaries)}

## Rules

1. Do not expand the MVP scope.
2. Execute tasks in common/TASK_QUEUE.md order.
3. Update common/PROGRESS_LOG.md after each completed task.
4. Read common/OPEN_QUESTIONS.md before treating an unknown as a decision.
5. Put high-risk commands in runtime/APPROVAL_QUEUE.md before execution.
6. Do not read secrets, local credential files, or production resources.
7. Run scripts/finalize.ps1 or scripts/finalize.sh before final delivery.
8. Use runtime/SAFE_COMMANDS.md and runtime/DENIED_COMMANDS.md before running commands autonomously.
9. This workspace has only this one agent. Do not run multiple agents against the same workspace unless a human manually coordinates ownership.

## Claude Permission

- Autonomous runs use permission mode dontAsk. Denied shell commands are appended to runtime/APPROVAL_QUEUE.md and the rest of the queue continues.
- Supervised runs use permission mode acceptEdits. File edits proceed; shell still follows settings allow and deny rules.
- Live settings are agent_adapters/claude-code/settings.json, projected from runtime/PERMISSION_POLICY.yaml. settings.example.json is only a sample.
- Do not skip permission checks and do not use a bare session that ignores project settings.
`;
}

function renderRunbook(projectSpec: ProjectSpec): string {
  return `# Claude Code Runbook

Project: ${projectSpec.projectName}
Execution mode: ${projectSpec.executionMode}

This is an independent execution option. Selecting multiple adapters means AIMart generated multiple independent execution options; it does not run multiple agents together.

Do not run multiple agents against the same workspace at the same time unless a human manually coordinates ownership.

## Required Read Order

1. EXECUTION_PACK_MANIFEST.md
2. common/PROJECT_SPEC.md
3. common/TASK_QUEUE.md
4. common/OPEN_QUESTIONS.md
5. common/AUTONOMOUS_DELIVERY_ROADMAP.md
6. runtime/END_TO_END_AUTONOMOUS_POLICY.md
7. runtime/RUN_STATE.json
8. runtime/APPROVAL_QUEUE.md
9. runtime/SAFE_COMMANDS.md
10. runtime/DENIED_COMMANDS.md

## Permission Model

Use Claude Code workspace permission controls. High-risk commands go to runtime/APPROVAL_QUEUE.md. Continue safe independent work when queued work is not blocking.
`;
}

function renderTaskPrompt(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue,
  runtimePack: RuntimePack
): string {
  return `# Claude Code Task Prompt

You are working on ${projectSpec.projectName}. Follow common/TASK_QUEUE.md exactly. Read common/OPEN_QUESTIONS.md before inventing answers.

This is an independent execution option. Do not run multiple agents against the same workspace.

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

function renderAutonomousPrompt(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue
): string {
  return `# Claude Code Autonomous Prompt

You are the only coding agent for this generated execution pack.

Project: ${projectSpec.projectName}
Selected execution mode: ${projectSpec.executionMode}

This is an independent execution option. Do not run multiple agents against the same workspace.

## First Read

1. common/PROJECT_SPEC.md
2. common/TASK_QUEUE.md
3. common/OPEN_QUESTIONS.md
4. common/EXECUTION_RULES.md
5. runtime/AUTONOMOUS_EXECUTION_POLICY.md
6. runtime/SAFE_COMMANDS.md
7. runtime/DENIED_COMMANDS.md
8. runtime/APPROVAL_QUEUE.md
9. agent_adapters/claude-code/CLAUDE.md

## Autonomous Rules

1. Work through TASK_QUEUE in order.
2. Run only commands allowed by runtime/SAFE_COMMANDS.md without approval.
3. Never run commands or categories listed in runtime/DENIED_COMMANDS.md.
4. Queue high-risk or blocked actions in runtime/APPROVAL_QUEUE.md and continue safe independent work.
5. Write logs under .aimart/logs.
6. Do not expand the MVP scope.
7. Before final delivery, run scripts/finalize.ps1 or scripts/finalize.sh.
8. Run the Completion Gate before reporting PASS.

## Initial Task Count

${taskQueue.tasks.length} tasks are generated. Start with the first pending task whose dependencies are complete.
`;
}

function renderEndToEndRunbook(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue
): string {
  return `# Claude Code End-to-End Delivery Runbook

Project: ${projectSpec.projectName}
Execution scope: ${projectSpec.executionScope}
Execution mode: ${projectSpec.executionMode}

This is an independent execution option. Do not run multiple agents against the same workspace.

Read common/OPEN_QUESTIONS.md, common/TASK_QUEUE.md, and common/PHASE_GATE_PLAN.md.

## End-to-End Delivery

Start once, then continue through:

- v0.0.1 discovery/spec
- v0.1.0 MVP implementation
- v0.2.x autonomous runtime and completion gates
- v0.3.x multi-agent independent adapters
- v0.4.x runner hardening
- v0.5.x delivery automation
- v1.0 final usable delivery

Use common/PHASE_GATE_PLAN.md, runtime/RUN_STATE.json, runtime/CURRENT_TASK.md, runtime/PHASE_GATE_REPORT.md, and runtime/COMPLETION_GATE_REPORT.md. Every phase ends with a Completion Gate result of PASS or FAIL.

## Initial Generated Tasks

${taskQueue.tasks.map((task) => `- ${task.id}: ${task.title}`).join("\n")}

Final result must be PASS or FAIL.
`;
}

function renderSettingsExample(): string {
  return `${JSON.stringify(
    {
      permissions: {
        allow: ["Read", "Edit"],
        deny: ["Read(~/.ssh/**)", "Read(~/.aws/**)"]
      },
      aimart: {
        note: "Example only. The launcher points --settings at settings.json, which is projected from runtime/PERMISSION_POLICY.yaml when AIMART_ENABLE_CLAUDE_CODE_LAUNCHER is enabled.",
        highRiskPolicy: "record in runtime/APPROVAL_QUEUE.md",
        requiredFiles: [
          "EXECUTION_PACK_MANIFEST.md",
          "runtime/RUN_STATE.json",
          "runtime/COMPLETION_GATE_REPORT.md"
        ]
      }
    },
    null,
    2
  )}\n`;
}

function renderManualStart(mode: string): string {
  return `# Start Claude Code ${mode}

Open this workspace in Claude Code, paste the matching task or autonomous prompt, and choose this adapter as the single active execution agent for the workspace.

When AIMART_ENABLE_CLAUDE_CODE_LAUNCHER is enabled, prefer agent_adapters/claude-code/run-claude-${mode}.ps1 so the prompt is piped on stdin.

This is an independent execution option. Do not run multiple agents against the same workspace at the same time unless a human manually coordinates ownership.
`;
}

function mapAssistantBlocks(record: Record<string, unknown>): RunnerEvent[] {
  const message = asRecord(record.message);
  const content = message?.content;
  const blocks = Array.isArray(content) ? content : [];
  const events: RunnerEvent[] = [];
  for (const block of blocks) {
    if (typeof block === "string" && block) {
      events.push({ type: "assistant_text", text: block });
      continue;
    }
    const item = asRecord(block);
    if (!item) {
      continue;
    }
    if (item.type === "text" && typeof item.text === "string") {
      events.push({ type: "assistant_text", text: item.text });
    } else if (item.type === "tool_use") {
      const name = typeof item.name === "string" ? item.name : "tool";
      events.push({
        type: "tool_use",
        name,
        inputSummary: summarizeInput(name, item.input)
      });
    }
  }
  return events;
}

function mapUserBlocks(
  record: Record<string, unknown>,
  toolName: string
): RunnerEvent[] {
  const message = asRecord(record.message);
  const content = message?.content;
  const blocks = Array.isArray(content) ? content : [];
  const events: RunnerEvent[] = [];
  for (const block of blocks) {
    const item = asRecord(block);
    if (!item || item.type !== "tool_result") {
      continue;
    }
    const body = blockText(item);
    if (permissionDenied(body)) {
      events.push({
        type: "approval_required",
        command: extractCommand(body, toolName),
        risk: "denied by claude permission mode"
      });
      continue;
    }
    const event: RunnerEvent = {
      type: "tool_result",
      name: toolName,
      ok: item.is_error !== true
    };
    const exitCode = shellExitCode(body);
    if (exitCode !== undefined) {
      event.exitCode = exitCode;
    }
    events.push(event);
  }
  return events;
}

function mapResult(record: Record<string, unknown>): RunnerEvent {
  const isError = record.is_error === true;
  const event: RunnerEvent = {
    type: "run_finished",
    exitCode: isError ? 1 : 0,
    isError
  };
  if (typeof record.duration_ms === "number") {
    event.durationMs = record.duration_ms;
  }
  if (typeof record.num_turns === "number") {
    event.numTurns = record.num_turns;
  }
  if (typeof record.total_cost_usd === "number") {
    event.costUsd = record.total_cost_usd;
  }
  if (typeof record.session_id === "string" && record.session_id) {
    event.sessionId = record.session_id;
  }
  return event;
}

function summarizeInput(name: string, input: unknown): string {
  let raw = "";
  if (typeof input === "string") {
    raw = input;
  } else {
    try {
      raw = JSON.stringify(input ?? {});
    } catch {
      raw = "";
    }
  }
  if (raw.length > INPUT_SUMMARY_LIMIT) {
    raw = raw.slice(0, INPUT_SUMMARY_LIMIT);
  }
  return `${name}: ${raw}`;
}

function permissionDenied(text: string): boolean {
  return /permission denied|not permitted|requires approval|denied by permission|EACCES/i.test(
    text
  );
}

function shellExitCode(text: string): number | undefined {
  const match = text.match(/exit code[:\s]+(\d+)/i);
  if (!match) {
    return undefined;
  }
  return Number(match[1]);
}

function blockText(block: Record<string, unknown>): string {
  if (typeof block.content === "string") {
    return block.content;
  }
  if (typeof block.text === "string") {
    return block.text;
  }
  try {
    return JSON.stringify(block.content ?? "");
  } catch {
    return "";
  }
}

function extractCommand(text: string, fallback: string): string {
  const match = text.match(/command[:\s]+([^\n]+)/i);
  const value = (match ? match[1].trim() : fallback).slice(0, INPUT_SUMMARY_LIMIT);
  return value || fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.join(", ") : "Not specified";
}

function file(path: string, content: string): FileEntry {
  return { path, content };
}

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function bashQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
