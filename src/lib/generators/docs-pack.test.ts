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
});

function findFile(files: { path: string; content: string }[], path: string): string {
  const file = files.find((entry) => entry.path === path);
  if (!file) {
    throw new Error(`Missing file: ${path}`);
  }
  return file.content;
}
