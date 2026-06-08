import { describe, expect, it } from "vitest";

import { createProjectSpec } from "@/lib/core/project-spec";
import { TaskQueueSchema } from "@/lib/schemas/core";
import { generateTaskQueue } from "./task-queue";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("generateTaskQueue", () => {
  it("creates a structured task queue from a ProjectSpec", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Stock Desk",
        rawDiscussion: "必须支持库存录入和月度报表导出。",
        mvpScope: "库存录入\n月度报表导出",
        forbiddenItems: "不做云端部署",
        testingRequirements: "核心模块必须有单元测试",
        deliveryRequirements: "交付 ZIP 包",
        securityBoundaries: "不能读取 .env"
      },
      { now: fixedNow }
    );

    const taskQueue = generateTaskQueue(projectSpec, { now: fixedNow });

    expect(TaskQueueSchema.parse(taskQueue)).toEqual(taskQueue);
    expect(taskQueue.sourceProjectName).toBe("Stock Desk");
    expect(taskQueue.tasks.map((task) => task.phase)).toEqual(
      expect.arrayContaining(["setup", "core", "runtime", "qa", "docs", "finalize"])
    );
    expect(taskQueue.tasks[0]).toMatchObject({
      id: "TASK-001",
      dependencies: [],
      riskLevel: "L1",
      status: "pending"
    });
  });

  it("adds dependencies, done criteria, test commands, and rollback notes to every task", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks."
      },
      { now: fixedNow }
    );

    const taskQueue = generateTaskQueue(projectSpec, { now: fixedNow });

    for (const task of taskQueue.tasks) {
      expect(task.dependencies).toBeDefined();
      expect(task.doneCriteria.length).toBeGreaterThan(0);
      expect(task.testCommand).toMatch(/^pnpm /);
      expect(task.rollbackNote.length).toBeGreaterThan(0);
    }
  });
});
