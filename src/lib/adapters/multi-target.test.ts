import { describe, expect, it } from "vitest";

import { createProjectSpec } from "@/lib/core/project-spec";
import { generateRuntimePack } from "@/lib/generators/runtime-pack";
import { generateTaskQueue } from "@/lib/generators/task-queue";
import { AgentAdapterSchema } from "@/lib/schemas/core";
import { generateAgentAdapters } from "./multi-target";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("generateAgentAdapters", () => {
  it("generates independent adapter directories for every selected v0.3.0 target", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks.",
        selectedAdapterIds: ["codex", "claude-code", "trae", "cursor"],
        executionScope: "end_to_end_delivery",
        executionMode: "end_to_end_autonomous"
      },
      { now: fixedNow }
    );
    const taskQueue = generateTaskQueue(projectSpec, { now: fixedNow });
    const runtimePack = generateRuntimePack(projectSpec);

    const adapterPack = generateAgentAdapters(projectSpec, taskQueue, runtimePack);
    const paths = adapterPack.files.map((file) => file.path);

    expect(AgentAdapterSchema.parse(adapterPack)).toEqual(adapterPack);
    expect(adapterPack.selectedAdapterIds).toEqual([
      "codex",
      "claude-code",
      "trae",
      "cursor"
    ]);
    expect(paths).toEqual(
      expect.arrayContaining([
        "agent_adapters/codex/AGENTS.md",
        "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md",
        "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md",
        "agent_adapters/codex/run-codex-end-to-end-autonomous.ps1",
        "agent_adapters/codex/run-codex-end-to-end-autonomous.sh",
        "agent_adapters/claude-code/CLAUDE.md",
        "agent_adapters/claude-code/CLAUDE_RUNBOOK.md",
        "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md",
        "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md",
        "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md",
        "agent_adapters/claude-code/settings.example.json",
        "agent_adapters/claude-code/run-claude-supervised.md",
        "agent_adapters/claude-code/run-claude-autonomous.md",
        "agent_adapters/trae/TRAE_RUNBOOK.md",
        "agent_adapters/trae/TRAE_TASK_PROMPT.md",
        "agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md",
        "agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md",
        "agent_adapters/trae/TRAE_AGENT_CONFIG.yaml",
        "agent_adapters/trae/run-trae-supervised.md",
        "agent_adapters/trae/run-trae-autonomous.md",
        "agent_adapters/cursor/CURSOR_RUNBOOK.md",
        "agent_adapters/cursor/CURSOR_TASK_PROMPT.md",
        "agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md",
        "agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md",
        "agent_adapters/cursor/rules/project-rules.md"
      ])
    );
  });

  it("makes non-Codex adapters independent options, not collaborators", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks.",
        selectedAdapterIds: ["claude-code", "trae", "cursor"]
      },
      { now: fixedNow }
    );
    const taskQueue = generateTaskQueue(projectSpec, { now: fixedNow });
    const runtimePack = generateRuntimePack(projectSpec);

    const adapterPack = generateAgentAdapters(projectSpec, taskQueue, runtimePack);
    const content = adapterPack.files.map((file) => file.content).join("\n");

    expect(content).toContain("independent execution option");
    expect(content).toContain("Do not run multiple agents against the same workspace");
    expect(content).not.toContain("coordinate Claude Code, Trae, Cursor, and Codex together");
  });
});
