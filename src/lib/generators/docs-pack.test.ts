import { describe, expect, it } from "vitest";

import { createProjectSpec } from "@/lib/core/project-spec";
import { generateRuntimePack } from "@/lib/generators/runtime-pack";
import { generateTaskQueue } from "@/lib/generators/task-queue";
import { generateDocsPack } from "./docs-pack";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("generateDocsPack", () => {
  it("generates every required delivery document", () => {
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

    const docsPack = generateDocsPack(projectSpec, taskQueue, runtimePack);

    expect(docsPack.files.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        "docs/README.md",
        "docs/RUN_APP.md",
        "docs/ENV_SETUP.md",
        "docs/SECURITY_AND_PERMISSIONS.md",
        "docs/IMPLEMENTATION_REPORT.md",
        "docs/RELEASE_NOTES.md",
        "docs/NEXT_STEPS.md"
      ])
    );
    expect(docsPack.files.every((file) => file.content.trim().length > 40)).toBe(
      true
    );
  });

  it("documents run commands, permission boundaries, and known limitations", () => {
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

    const docsPack = generateDocsPack(projectSpec, taskQueue, runtimePack);
    const runApp = findFile(docsPack.files, "docs/RUN_APP.md");
    const security = findFile(docsPack.files, "docs/SECURITY_AND_PERMISSIONS.md");
    const nextSteps = findFile(docsPack.files, "docs/NEXT_STEPS.md");

    expect(runApp).toContain("pnpm install");
    expect(runApp).toContain("pnpm dev");
    expect(security).toContain("L0");
    expect(security).toContain("queue_for_approval");
    expect(nextSteps).toContain("Known Limitations");
  });

  it("documents Codex supervised and autonomous operation for generated execution packs", () => {
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

    const docsPack = generateDocsPack(projectSpec, taskQueue, runtimePack);
    const readme = findFile(docsPack.files, "docs/README.md");
    const runApp = findFile(docsPack.files, "docs/RUN_APP.md");
    const security = findFile(docsPack.files, "docs/SECURITY_AND_PERMISSIONS.md");

    expect(readme).toContain("generated execution-pack ZIP");
    expect(readme).toContain("source release ZIP");
    expect(readme).toContain("Selected execution mode: autonomous");
    expect(runApp).toContain("run-codex-supervised");
    expect(runApp).toContain("run-codex-autonomous");
    expect(runApp).toContain("run-codex-unified-autonomous");
    expect(runApp).toContain("one-window status display");
    expect(runApp).toContain("Autonomous Completion Gate");
    expect(runApp).toContain("logs");
    expect(security).toContain("runtime/SAFE_COMMANDS.md");
    expect(security).toContain("runtime/DENIED_COMMANDS.md");
    expect(security).toContain("runtime/APPROVAL_QUEUE.md");
    expect(security).toContain("runtime/AUTONOMOUS_COMPLETION_GATE.md");
    expect(security).toContain("runtime/AUTONOMOUS_VERIFICATION_REPORT.md");
    expect(security).toContain("Autonomous Mode");
  });

  it("documents v0.2.2 completion gate delivery behavior", () => {
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

    const docsPack = generateDocsPack(projectSpec, taskQueue, runtimePack);
    const readme = findFile(docsPack.files, "docs/README.md");
    const implementationReport = findFile(
      docsPack.files,
      "docs/IMPLEMENTATION_REPORT.md"
    );
    const releaseNotes = findFile(docsPack.files, "docs/RELEASE_NOTES.md");
    const nextSteps = findFile(docsPack.files, "docs/NEXT_STEPS.md");

    for (const content of [readme, implementationReport, releaseNotes, nextSteps]) {
      expect(content).toContain("v0.2.2");
      expect(content).toContain("Autonomous Completion Gate");
    }
    expect(releaseNotes).toContain("completion-gate runbook");
    expect(nextSteps).toContain("AUTONOMOUS_VERIFICATION_REPORT.md");
  });

  it("uses the standardized forbidden items wording", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks.",
        forbiddenItems: "No cloud runner"
      },
      { now: fixedNow }
    );
    const taskQueue = generateTaskQueue(projectSpec, { now: fixedNow });
    const runtimePack = generateRuntimePack(projectSpec);

    const docsPack = generateDocsPack(projectSpec, taskQueue, runtimePack);
    const readme = findFile(docsPack.files, "docs/README.md");

    expect(readme).toContain("## Forbidden items");
    expect(readme).not.toContain("Forbidden Items");
  });
});

function findFile(files: { path: string; content: string }[], path: string): string {
  const file = files.find((entry) => entry.path === path);
  if (!file) {
    throw new Error(`Missing file: ${path}`);
  }
  return file.content;
}
