import { describe, expect, it } from "vitest";

import { createProjectSpec } from "@/lib/core/project-spec";
import { generateRuntimePack } from "@/lib/generators/runtime-pack";
import { generateTaskQueue } from "@/lib/generators/task-queue";
import { AgentAdapterSchema } from "@/lib/schemas/core";
import { generateCodexAdapter } from "./codex";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("generateCodexAdapter", () => {
  it("generates the required Codex adapter files", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Stock Desk",
        rawDiscussion: "必须支持库存录入。",
        mvpScope: "库存录入",
        forbiddenItems: "不做云端部署",
        testingRequirements: "核心模块必须有单元测试",
        deliveryRequirements: "交付 ZIP 包",
        securityBoundaries: "不能读取 .env"
      },
      { now: fixedNow }
    );
    const taskQueue = generateTaskQueue(projectSpec, { now: fixedNow });
    const runtimePack = generateRuntimePack(projectSpec);

    const adapter = generateCodexAdapter(projectSpec, taskQueue, runtimePack);

    expect(AgentAdapterSchema.parse(adapter)).toEqual(adapter);
    expect(adapter.files.map((file) => file.path)).toEqual(
      expect.arrayContaining([
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
      ])
    );
  });

  it("includes project facts, task queue, permission policy, and scope boundaries", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks.",
        mvpScope: "Task planning",
        forbiddenItems: "No cloud runner",
        testingRequirements: "Unit tests",
        deliveryRequirements: "ZIP delivery",
        securityBoundaries: "Do not read secrets"
      },
      { now: fixedNow }
    );
    const taskQueue = generateTaskQueue(projectSpec, { now: fixedNow });
    const runtimePack = generateRuntimePack(projectSpec);

    const adapter = generateCodexAdapter(projectSpec, taskQueue, runtimePack);
    const agents = findFile(adapter.files, "agent_adapters/codex/AGENTS.md");
    const prompt = findFile(adapter.files, "agent_adapters/codex/CODEX_TASK_PROMPT.md");

    expect(agents).toContain("Tiny Planner");
    expect(agents).toContain("- Forbidden items:");
    expect(agents).not.toContain("Forbidden Items");
    expect(agents).toContain("Do not expand the MVP scope");
    expect(agents).toContain("Do not read secrets");
    expect(prompt).toContain("TASK-001");
    expect(prompt).toContain("queue_for_approval");
    expect(prompt).toContain("scripts/finalize");
  });

  it("generates sandboxed Codex launch profiles without dangerous bypass flags", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks.",
        executionMode: "autonomous"
      },
      { now: fixedNow }
    );
    const taskQueue = generateTaskQueue(projectSpec, { now: fixedNow });
    const runtimePack = generateRuntimePack(projectSpec);

    const adapter = generateCodexAdapter(projectSpec, taskQueue, runtimePack);
    const prompt = findFile(
      adapter.files,
      "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"
    );
    const runbook = findFile(
      adapter.files,
      "agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md"
    );
    const autonomousPs1 = findFile(
      adapter.files,
      "agent_adapters/codex/run-codex-autonomous.ps1"
    );
    const supervisedPs1 = findFile(
      adapter.files,
      "agent_adapters/codex/run-codex-supervised.ps1"
    );
    const autonomousSh = findFile(
      adapter.files,
      "agent_adapters/codex/run-codex-autonomous.sh"
    );
    const supervisedSh = findFile(
      adapter.files,
      "agent_adapters/codex/run-codex-supervised.sh"
    );
    const scriptContent = [
      autonomousPs1,
      supervisedPs1,
      autonomousSh,
      supervisedSh
    ].join("\n");

    expect(prompt).toContain("Selected execution mode: autonomous");
    expect(prompt).toContain("runtime/SAFE_COMMANDS.md");
    expect(runbook).toContain("logs");
    expect(autonomousPs1).toContain("sandbox=workspace-write");
    expect(autonomousPs1).toContain("--approve-for-me");
    expect(autonomousPs1).not.toContain("--sandbox workspace-write");
    expect(autonomousSh).toContain("sandbox=workspace-write");
    expect(autonomousSh).toContain("--approve-for-me");
    expect(autonomousSh).not.toContain("--sandbox workspace-write");
    expect(supervisedPs1).toContain("--sandbox workspace-write");
    expect(supervisedSh).toContain("--sandbox workspace-write");
    expect(supervisedPs1).not.toContain("--approve-for-me");
    expect(supervisedSh).not.toContain("--approve-for-me");
    expect(scriptContent).not.toContain("--prompt-file");
    expect(scriptContent).not.toContain("--approval never");
    expect(scriptContent).not.toContain("--approval on-request");
    // Execution packs are not git repos; the adapter must skip the repo check.
    expect(scriptContent).toContain("--skip-git-repo-check");
    // codex writes informational lines to stderr; the PS adapters must relax
    // $ErrorActionPreference around the codex call so those lines don't become
    // terminating errors (dogfood round 4 finding).
    expect(autonomousPs1).toContain('$ErrorActionPreference = "Continue"');
    expect(supervisedPs1).toContain('$ErrorActionPreference = "Continue"');
    // PSScriptAnalyzer PSAvoidAssignmentToAutomaticVariable: never assign to $Args.
    expect(autonomousPs1).toContain("$CodexArgs = @(");
    expect(autonomousPs1).not.toContain("$Args = @(");
    expect(supervisedPs1).toContain("$CodexArgs = @(");
    expect(supervisedPs1).not.toContain("$Args = @(");
    expect(autonomousPs1).toContain("scripts/invoke-sandboxed.ps1");
    expect(supervisedPs1).toContain("scripts/invoke-sandboxed.ps1");
    expect(autonomousPs1).toContain("-TimeoutSec 5400");
    expect(supervisedPs1).toContain("-TimeoutSec 5400");
    expect(scriptContent).not.toContain("dangerously-bypass-approvals-and-sandbox");
    expect(scriptContent).not.toContain("full-access");
  });

  it("generates unified autonomous single-window runners with dashboard and summary output", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks.",
        executionMode: "unified_autonomous"
      },
      { now: fixedNow }
    );
    const taskQueue = generateTaskQueue(projectSpec, { now: fixedNow });
    const runtimePack = generateRuntimePack(projectSpec);

    const adapter = generateCodexAdapter(projectSpec, taskQueue, runtimePack);
    const runbook = findFile(
      adapter.files,
      "agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md"
    );
    const ps1 = findFile(
      adapter.files,
      "agent_adapters/codex/run-codex-unified-autonomous.ps1"
    );
    const sh = findFile(
      adapter.files,
      "agent_adapters/codex/run-codex-unified-autonomous.sh"
    );
    const completionRunbook = findFile(
      adapter.files,
      "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md"
    );

    for (const content of [runbook, ps1, sh, completionRunbook]) {
      expect(content).toContain("one-window");
      expect(content).toContain("codex_runs");
      expect(content).toContain("AUTONOMOUS_RUN_STATUS.md");
      expect(content).toContain("AUTONOMOUS_RUN_SUMMARY.md");
      expect(content).toContain("AUTONOMOUS_HEALTH_CHECK.md");
    }

    for (const content of [ps1, sh]) {
      expect(content).toContain("codex exec");
      expect(content).toContain("workspace-write");
      expect(content).toContain("approval never");
      expect(content).toContain("Elapsed");
      expect(content).toContain("Git branch");
      expect(content).toContain("Dirty files");
      expect(content).toContain("Latest log tail");
      expect(content).toContain("Release directory");
      expect(content).toContain("Known issues");
      expect(content).toContain("Final Summary");
      expect(content).toContain("Sample execution pack");
      expect(content).toContain("Target version");
      expect(content).toContain("Clean at startup");
      expect(content).toContain("Existing Codex processes");
      expect(content).toContain("Source ZIP");
      expect(content).toContain("Latest log activity");
      expect(content).toContain("Log appears stalled");
      expect(content).toContain("Autonomous Completion Gate");
      expect(content).toContain("PASS");
      expect(content).toContain("FAIL");
      expect(content).toContain("AUTONOMOUS_VERIFICATION_REPORT.md");
      expect(content).not.toContain("git push");
      expect(content).not.toContain("full-access");
    }

    expect(ps1).toContain(
      "# -ExecutionPolicy Bypass applies to this PowerShell process only"
    );
    // PSScriptAnalyzer PSAvoidUsingEmptyCatchBlock: every catch must do something.
    expect(ps1).not.toContain("} catch {}");
  });

  it("generates Codex end-to-end autonomous delivery instructions and launchers", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks.",
        executionMode: "end_to_end_autonomous",
        executionScope: "end_to_end_delivery"
      },
      { now: fixedNow }
    );
    const taskQueue = generateTaskQueue(projectSpec, { now: fixedNow });
    const runtimePack = generateRuntimePack(projectSpec);

    const adapter = generateCodexAdapter(projectSpec, taskQueue, runtimePack);
    const prompt = findFile(
      adapter.files,
      "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md"
    );
    const runbook = findFile(
      adapter.files,
      "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md"
    );
    const ps1 = findFile(
      adapter.files,
      "agent_adapters/codex/run-codex-end-to-end-autonomous.ps1"
    );
    const sh = findFile(
      adapter.files,
      "agent_adapters/codex/run-codex-end-to-end-autonomous.sh"
    );

    for (const content of [prompt, runbook, ps1, sh]) {
      expect(content).toContain("End-to-End");
      expect(content).toContain("PHASE_GATE_PLAN.md");
      expect(content).toContain("COMPLETION_GATE_REPORT.md");
      expect(content).toContain("RUN_STATE.json");
      expect(content).toContain("PASS");
      expect(content).toContain("FAIL");
    }
    expect(prompt).toContain("one selected AI agent");
    expect(prompt).toContain("v0.0.1");
    expect(prompt).toContain("v1.0");
    expect(ps1).toContain("workspace-write");
    expect(ps1).toContain("approve-for-me");
    expect(sh).toContain("workspace-write");
    expect(sh).toContain("approve-for-me");
  });
});

function findFile(files: { path: string; content: string }[], path: string): string {
  const file = files.find((entry) => entry.path === path);
  if (!file) {
    throw new Error(`Missing file: ${path}`);
  }
  return file.content;
}
