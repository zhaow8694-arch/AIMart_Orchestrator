import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import yaml from "js-yaml";
import { afterEach, describe, expect, it } from "vitest";

import {
  CLAUDE_LAUNCHER_PATHS,
  CLAUDE_MANUAL_PATHS,
  bashPermissionRule,
  mapClaudeStream,
  mapClaudeStreamJson,
  renderClaudeEventMapperJs,
  reportClaudeStatus
} from "@/lib/adapters/claude-code";
import { mapCodexLogLine, mapCodexRunFinished } from "@/lib/adapters/codex-events";
import { CLAUDE_CODE_LAUNCHER_FLAG } from "@/lib/adapters/feature-flag";
import {
  AGENT_ADAPTER_REGISTRY,
  getAgentAdapterRegistryEntry
} from "@/lib/adapters/registry";
import { createProjectSpec } from "@/lib/core/project-spec";
import { generateRuntimePack } from "@/lib/generators/runtime-pack";
import { generateScriptPack } from "@/lib/generators/script-pack";
import { generateTaskQueue } from "@/lib/generators/task-queue";
import { createExecutionPack } from "@/lib/zip/packager";
import { generateAgentAdapters } from "./multi-target";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");
const originalFlag = process.env[CLAUDE_CODE_LAUNCHER_FLAG];

const CODEX_PATHS = [
  "agent_adapters/codex/AGENTS.md",
  "agent_adapters/codex/CODEX_RUNBOOK.md",
  "agent_adapters/codex/CODEX_TASK_PROMPT.md",
  "agent_adapters/codex/CODEX_AUTONOMOUS_LOOP.md",
  "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md",
  "agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md",
  "agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md",
  "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md",
  "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md",
  "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/codex/run-codex-autonomous.ps1",
  "agent_adapters/codex/run-codex-supervised.ps1",
  "agent_adapters/codex/run-codex-unified-autonomous.ps1",
  "agent_adapters/codex/run-codex-end-to-end-autonomous.ps1",
  "agent_adapters/codex/run-codex-autonomous.sh",
  "agent_adapters/codex/run-codex-supervised.sh",
  "agent_adapters/codex/run-codex-unified-autonomous.sh",
  "agent_adapters/codex/run-codex-end-to-end-autonomous.sh"
];

const STREAM_FIXTURE = [
  JSON.stringify({
    type: "system",
    subtype: "init",
    session_id: "sess-1",
    cwd: "/tmp/pack"
  }),
  JSON.stringify({
    type: "assistant",
    message: {
      content: [
        { type: "tool_use", name: "Bash", input: { command: "pnpm test" } }
      ]
    }
  }),
  JSON.stringify({
    type: "user",
    message: {
      content: [{ type: "tool_result", content: "Exit code: 0\nok" }]
    }
  }),
  JSON.stringify({
    type: "result",
    is_error: false,
    duration_ms: 12,
    num_turns: 2,
    total_cost_usd: 0.01,
    session_id: "sess-1"
  })
].join("\n");

function restoreFlag(): void {
  if (originalFlag === undefined) {
    delete process.env[CLAUDE_CODE_LAUNCHER_FLAG];
  } else {
    process.env[CLAUDE_CODE_LAUNCHER_FLAG] = originalFlag;
  }
}

function packInputs() {
  const projectSpec = createProjectSpec(
    {
      projectName: "Tiny Planner",
      rawDiscussion: "Build a local MVP for planning coding tasks.",
      selectedAdapterIds: ["claude-code"]
    },
    { now: fixedNow }
  );
  const taskQueue = generateTaskQueue(projectSpec, { now: fixedNow });
  const runtimePack = generateRuntimePack(projectSpec);
  return { projectSpec, taskQueue, runtimePack };
}

describe("Claude Code adapter", () => {
  afterEach(() => {
    restoreFlag();
  });

  it("keeps the default pack on the Codex path when the flag is unset", () => {
    delete process.env[CLAUDE_CODE_LAUNCHER_FLAG];
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks."
      },
      { now: fixedNow }
    );
    const taskQueue = generateTaskQueue(projectSpec, { now: fixedNow });
    const runtimePack = generateRuntimePack(projectSpec);
    const adapterPack = generateAgentAdapters(projectSpec, taskQueue, runtimePack);

    expect(projectSpec.selectedAdapterIds).toEqual(["codex"]);
    expect(adapterPack.files.map((file) => file.path)).toEqual(CODEX_PATHS);
  });

  it("keeps the eight Claude manual paths when the launcher flag is off", () => {
    delete process.env[CLAUDE_CODE_LAUNCHER_FLAG];
    const { projectSpec, taskQueue, runtimePack } = packInputs();
    const adapterPack = generateAgentAdapters(projectSpec, taskQueue, runtimePack);
    const paths = adapterPack.files.map((file) => file.path);

    expect(paths).toEqual(expect.arrayContaining([...CLAUDE_MANUAL_PATHS]));
    expect(paths).not.toContain("agent_adapters/claude-code/run-claude-autonomous.ps1");
    expect(getAgentAdapterRegistryEntry("claude-code").completionGateRequirements).toHaveLength(
      3
    );
  });

  it("emits paired launchers that follow the Claude CLI contract when the flag is on", () => {
    process.env[CLAUDE_CODE_LAUNCHER_FLAG] = "1";
    const { projectSpec, taskQueue, runtimePack } = packInputs();
    const adapterPack = generateAgentAdapters(projectSpec, taskQueue, runtimePack);
    const byPath = new Map(adapterPack.files.map((file) => [file.path, file.content]));

    expect([...byPath.keys()]).toEqual(
      expect.arrayContaining([...CLAUDE_MANUAL_PATHS, ...CLAUDE_LAUNCHER_PATHS])
    );

    const autonomous = byPath.get("agent_adapters/claude-code/run-claude-autonomous.ps1") ?? "";
    const supervised = byPath.get("agent_adapters/claude-code/run-claude-supervised.ps1") ?? "";
    expect(autonomous).toContain("claude");
    expect(autonomous).toContain("-p");
    expect(autonomous).toContain("'--permission-mode', 'dontAsk'");
    expect(autonomous).toContain("'--output-format', 'stream-json'");
    expect(autonomous).toContain("'--max-turns', '80'");
    expect(autonomous).toContain("--settings");
    expect(autonomous).toContain("Get-Content");
    expect(autonomous).toContain("export function mapLine");
    expect(supervised).toContain("'--permission-mode', 'acceptEdits'");
    expect(supervised).not.toContain("'--max-turns'");

    for (const path of CLAUDE_LAUNCHER_PATHS) {
      const content = byPath.get(path) ?? "";
      expect(content).not.toContain("dangerously-skip-permissions");
      expect(content).not.toContain("bypassPermissions");
      expect(content).not.toContain("--bare");
      if (path.endsWith(".ps1")) {
        const shPath = path.replace(/\.ps1$/, ".sh");
        expect(byPath.has(shPath)).toBe(true);
        expect(byPath.get(shPath)).toContain("cat ");
        expect(byPath.get(shPath)).toContain("claude");
      }
    }

    const enabled = getAgentAdapterRegistryEntry("claude-code");
    expect(enabled.completionGateRequirements.length).toBeGreaterThan(3);
    expect(AGENT_ADAPTER_REGISTRY["claude-code"].completionGateRequirements).toHaveLength(3);
  });

  it("projects allow and deny rules from the runtime permission policy", () => {
    process.env[CLAUDE_CODE_LAUNCHER_FLAG] = "1";
    const { projectSpec, taskQueue, runtimePack } = packInputs();
    const adapterPack = generateAgentAdapters(projectSpec, taskQueue, runtimePack);
    const policyText =
      runtimePack.files.find((file) => file.path === "runtime/PERMISSION_POLICY.yaml")
        ?.content ?? "";
    const policy = yaml.load(policyText) as {
      commandRules: Array<{ command: string; action: string }>;
    };
    const settings = JSON.parse(
      adapterPack.files.find(
        (file) => file.path === "agent_adapters/claude-code/settings.json"
      )?.content ?? "{}"
    ) as { permissions: { allow: string[]; deny: string[] } };

    expect(policy.commandRules.some((rule) => rule.command === "pnpm test" && rule.action === "allow")).toBe(true);
    expect(policy.commandRules.some((rule) => rule.command === "git push" && rule.action === "deny")).toBe(true);

    for (const rule of policy.commandRules) {
      const bash = bashPermissionRule(rule.command);
      if (rule.action === "allow") {
        expect(settings.permissions.allow).toContain(bash);
      } else {
        expect(settings.permissions.deny).toContain(bash);
      }
    }
    expect(settings.permissions.allow).toContain("Bash(pnpm test *)");
    expect(settings.permissions.deny).toContain("Bash(git push *)");
  });

  it("maps a stream-json fixture and keeps Codex logs as log lines", () => {
    const events = mapClaudeStream(STREAM_FIXTURE, { cwd: "/tmp/pack" });
    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining(["run_started", "tool_use", "tool_result", "run_finished"])
    );

    const finished = events.find((event) => event.type === "run_finished");
    expect(finished).toMatchObject({
      type: "run_finished",
      sessionId: "sess-1",
      isError: false,
      numTurns: 2,
      costUsd: 0.01
    });

    const okSummary = reportClaudeStatus({
      exitCode: 0,
      logPath: ".aimart/logs/claude-autonomous.log",
      events
    });
    expect(okSummary.finalExitCode).toBe(0);
    expect(okSummary.costUsd).toBe(0.01);
    expect(okSummary.classification).toBe("none");
    expect(okSummary.markdown).toContain("| Adapter | claude-code |");

    const errorEvents = mapClaudeStreamJson(
      JSON.stringify({
        type: "result",
        is_error: true,
        num_turns: 3,
        total_cost_usd: 4.2,
        session_id: "sess-err"
      })
    );
    const errorSummary = reportClaudeStatus({
      exitCode: 0,
      logPath: ".aimart/logs/claude-autonomous.log",
      events: errorEvents
    });
    expect(errorSummary.finalExitCode).not.toBe(0);
    expect(errorSummary.costUsd).toBe(4.2);

    const codexEvents = ["codex argument order", "still text"].flatMap((line) => {
      const mapped = mapCodexLogLine(line);
      return mapped ? [mapped] : [];
    });
    codexEvents.push(mapCodexRunFinished(0));
    expect(new Set(codexEvents.map((event) => event.type))).toEqual(
      new Set(["log_line", "run_finished"])
    );
  });

  it("keeps the embedded mapper aligned with mapClaudeStreamJson", () => {
    const directory = mkdtempSync(join(tmpdir(), "aimart-claude-map-"));
    const mapperPath = join(directory, "map-claude-stream.mjs");
    writeFileSync(mapperPath, renderClaudeEventMapperJs(), "utf8");

    for (const line of STREAM_FIXTURE.split("\n")) {
      const output = execFileSync(
        process.execPath,
        [mapperPath, "--line", line, "autonomous", "/tmp/pack"],
        { encoding: "utf8" }
      );
      expect(JSON.parse(output)).toEqual(
        mapClaudeStreamJson(line, { mode: "autonomous", cwd: "/tmp/pack" })
      );
    }
  });

  it("classifies CLAUDE_MAX_TURNS without stealing CODEX_ARGUMENT_ORDER", () => {
    const script = join(process.cwd(), "scripts", "classify-runner-failure.ps1");
    const claude = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-File", script, "-Message", "CLAUDE_MAX_TURNS"],
      { encoding: "utf8" }
    ).trim();
    const codex = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-File", script, "-Message", "CODEX_ARGUMENT_ORDER"],
      { encoding: "utf8" }
    ).trim();

    expect(claude).toBe("CLAUDE_MAX_TURNS");
    expect(codex).toBe("CODEX_ARGUMENT_ORDER");
  });

  it("keeps one shared task queue and open-questions file for both adapters", () => {
    delete process.env[CLAUDE_CODE_LAUNCHER_FLAG];
    const pack = createExecutionPack(
      {
        projectName: "Dual Adapter",
        rawDiscussion: "Build a local MVP for planning coding tasks.",
        selectedAdapterIds: ["codex", "claude-code"]
      },
      { now: fixedNow }
    );
    const paths = pack.files.map((file) => file.path);

    expect(paths.filter((path) => path === "common/TASK_QUEUE.md")).toHaveLength(1);
    expect(paths.filter((path) => path === "common/OPEN_QUESTIONS.md")).toHaveLength(1);
    expect(paths.some((path) => path.startsWith("agent_adapters/codex/"))).toBe(true);
    expect(paths.some((path) => path.startsWith("agent_adapters/claude-code/"))).toBe(true);
    expect(paths).not.toContain("CLAUDE.md");
    expect(paths).not.toContain(".claude/settings.json");
    expect(paths).not.toContain("START_CLAUDE_AUTONOMOUS.ps1");
  });

  it("emits START_CLAUDE only when the flag is on and claude-code is selected", () => {
    process.env[CLAUDE_CODE_LAUNCHER_FLAG] = "1";
    const projectSpec = createProjectSpec(
      {
        projectName: "Dual Adapter",
        rawDiscussion: "Build a local MVP for planning coding tasks.",
        selectedAdapterIds: ["codex", "claude-code"]
      },
      { now: fixedNow }
    );
    const scriptPack = generateScriptPack(projectSpec);
    const starter = scriptPack.files.find(
      (file) => file.path === "START_CLAUDE_AUTONOMOUS.ps1"
    );

    expect(starter?.content).toContain("-AdapterId");
    expect(starter?.content).toContain("claude-code");
    expect(starter?.content).toContain("-TimeoutSec 28800");
    expect(starter?.content).toContain("CODEX_EXECUTION");
    expect(starter?.content).toContain("CLAUDE_LAUNCHER_DISABLED");
    expect(scriptPack.files.some((file) => file.path === "START_CLAUDE_AUTONOMOUS.cmd")).toBe(
      true
    );
  });
});
