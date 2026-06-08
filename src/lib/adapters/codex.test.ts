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
        "agent_adapters/codex/CODEX_AUTONOMOUS_LOOP.md"
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
    expect(agents).toContain("Do not expand the MVP scope");
    expect(agents).toContain("Do not read secrets");
    expect(prompt).toContain("TASK-001");
    expect(prompt).toContain("queue_for_approval");
    expect(prompt).toContain("scripts/finalize");
  });
});

function findFile(files: { path: string; content: string }[], path: string): string {
  const file = files.find((entry) => entry.path === path);
  if (!file) {
    throw new Error(`Missing file: ${path}`);
  }
  return file.content;
}
