import { describe, expect, it } from "vitest";

import { ProjectSpecSchema } from "@/lib/schemas/core";
import { createProjectSpec } from "./project-spec";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("createProjectSpec", () => {
  it("creates a valid ProjectSpec from structured form fields and discussion text", () => {
    const spec = createProjectSpec(
      {
        projectName: "Stock Desk",
        background: "A local tool for a small shop.",
        rawDiscussion: "必须支持库存录入。\nIt must export monthly reports.",
        mvpScope: "库存录入\n月度报表导出",
        forbiddenItems: "不做云端部署",
        techStackPreferences: "Next.js, TypeScript, Vitest",
        testingRequirements: "核心模块必须有单元测试",
        deliveryRequirements: "交付 ZIP 包",
        securityBoundaries: "不能读取 .env 或 SSH key"
      },
      { now: fixedNow }
    );

    expect(ProjectSpecSchema.parse(spec)).toEqual(spec);
    expect(spec.projectName).toBe("Stock Desk");
    expect(spec.mvpScope).toEqual(["库存录入", "月度报表导出"]);
    expect(spec.techStackPreferences).toEqual(["Next.js", "TypeScript", "Vitest"]);
    expect(spec.explicitRequirements).toEqual(
      expect.arrayContaining([
        "库存录入",
        "月度报表导出",
        "必须支持库存录入。",
        "It must export monthly reports."
      ])
    );
    expect(spec.inferredAssumptions).toContain(
      "Use Codex as the v0.1 target adapter."
    );
    expect(spec.openQuestions).toEqual([]);
  });

  it("keeps incomplete information honest with assumptions and open questions", () => {
    const spec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks."
      },
      { now: fixedNow }
    );

    expect(ProjectSpecSchema.parse(spec)).toEqual(spec);
    expect(spec.projectName).toBe("Tiny Planner");
    expect(spec.rawDiscussion).toContain("local MVP");
    expect(spec.inferredAssumptions).toEqual(
      expect.arrayContaining([
        "Use the recommended local v0.1 stack: Next.js, TypeScript, Zod, Vitest, pnpm.",
        "Use Codex as the v0.1 target adapter.",
        "Use codex_only execution mode for v0.1."
      ])
    );
    expect(spec.openQuestions).toEqual(
      expect.arrayContaining([
        "Confirm the MVP scope.",
        "Confirm forbidden items.",
        "Confirm testing requirements.",
        "Confirm delivery requirements.",
        "Confirm security boundaries."
      ])
    );
  });
});
