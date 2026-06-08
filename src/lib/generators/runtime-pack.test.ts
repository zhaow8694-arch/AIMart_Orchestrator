import { describe, expect, it } from "vitest";
import yaml from "js-yaml";

import { createProjectSpec } from "@/lib/core/project-spec";
import {
  PermissionPolicySchema,
  RuntimePolicySchema,
  ToolchainManifestSchema
} from "@/lib/schemas/core";
import { generateRuntimePack } from "./runtime-pack";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("generateRuntimePack", () => {
  it("generates all required runtime files with non-empty content", () => {
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

    const runtimePack = generateRuntimePack(projectSpec);

    expect(runtimePack.files.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        "runtime/TOOLCHAIN_MANIFEST.yaml",
        "runtime/INSTALL_PLAN.md",
        "runtime/PERMISSION_POLICY.yaml",
        "runtime/HIGH_RISK_COMMANDS.md",
        "runtime/APPROVAL_QUEUE.md",
        "runtime/RUNTIME_STATUS.md",
        "runtime/ROLLBACK_PLAN.md"
      ])
    );
    expect(runtimePack.files.every((file) => file.content.trim().length > 0)).toBe(
      true
    );
  });

  it("emits schema-valid toolchain, runtime, and permission policies", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks."
      },
      { now: fixedNow }
    );

    const runtimePack = generateRuntimePack(projectSpec);
    const manifestYaml = findFile(runtimePack.files, "runtime/TOOLCHAIN_MANIFEST.yaml");
    const permissionYaml = findFile(runtimePack.files, "runtime/PERMISSION_POLICY.yaml");

    expect(ToolchainManifestSchema.parse(yaml.load(manifestYaml))).toEqual(
      runtimePack.toolchainManifest
    );
    expect(PermissionPolicySchema.parse(yaml.load(permissionYaml))).toEqual(
      runtimePack.permissionPolicy
    );
    expect(RuntimePolicySchema.parse(runtimePack.runtimePolicy)).toEqual(
      runtimePack.runtimePolicy
    );
  });

  it("queues external resource commands and denies secret-reading commands by default", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks."
      },
      { now: fixedNow }
    );

    const runtimePack = generateRuntimePack(projectSpec);
    const gitPushRule = runtimePack.permissionPolicy.commandRules.find(
      (rule) => rule.command === "git push"
    );
    const envRule = runtimePack.permissionPolicy.commandRules.find(
      (rule) => rule.command === "cat .env"
    );

    expect(gitPushRule).toMatchObject({
      riskLevel: "L4",
      action: "queue_for_approval"
    });
    expect(envRule).toMatchObject({
      riskLevel: "L5",
      action: "deny"
    });
    expect(findFile(runtimePack.files, "runtime/HIGH_RISK_COMMANDS.md")).toContain(
      "git push"
    );
  });
});

function findFile(files: { path: string; content: string }[], path: string): string {
  const file = files.find((entry) => entry.path === path);
  if (!file) {
    throw new Error(`Missing file: ${path}`);
  }
  return file.content;
}
