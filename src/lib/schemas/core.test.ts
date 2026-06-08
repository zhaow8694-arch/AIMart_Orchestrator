import { describe, expect, it } from "vitest";

import {
  AgentAdapterSchema,
  GeneratedPackSchema,
  PermissionPolicySchema,
  ProjectSpecSchema,
  RuntimePolicySchema,
  TaskQueueSchema,
  ToolchainManifestSchema,
  describeZodIssues
} from "./core";

const validProjectSpec = {
  projectName: "Inventory Copilot",
  background: "A local inventory assistant for a small shop.",
  rawDiscussion: "We need a local MVP that tracks stock and exports reports.",
  mvpScope: ["Track stock", "Export CSV reports"],
  forbiddenItems: ["No production deployment"],
  techStackPreferences: ["Next.js", "TypeScript"],
  targetAdapterType: "codex",
  executionMode: "codex_only",
  testingRequirements: ["Unit tests required"],
  deliveryRequirements: ["ZIP delivery"],
  securityBoundaries: ["Do not read secrets"],
  explicitRequirements: ["Track stock"],
  inferredAssumptions: ["Local JSON storage is acceptable for v0.1"],
  openQuestions: ["Which CSV columns are required?"],
  createdAt: "2026-06-09T00:00:00.000Z"
};

const validTaskQueue = {
  sourceProjectName: "Inventory Copilot",
  generatedAt: "2026-06-09T00:00:00.000Z",
  tasks: [
    {
      id: "TASK-001",
      title: "Initialize project",
      description: "Create the project skeleton.",
      phase: "setup",
      dependencies: [],
      riskLevel: "L1",
      allowedCommands: ["pnpm install"],
      doneCriteria: ["Project builds"],
      testCommand: "pnpm test",
      rollbackNote: "Remove generated skeleton files.",
      status: "pending"
    }
  ]
};

const validRuntimePolicy = {
  riskLevels: [
    {
      level: "L0",
      name: "read_only",
      description: "Read-only project inspection.",
      defaultAction: "allow"
    },
    {
      level: "L4",
      name: "external_resource",
      description: "External resource mutation.",
      defaultAction: "queue_for_approval"
    }
  ],
  defaultAllowedCommands: ["git status", "pnpm test"],
  approvalRequiredCommands: ["git push"],
  forbiddenCommands: ["cat .env"]
};

const validToolchainManifest = {
  runtime: "Node.js 20+",
  packageManager: "pnpm",
  language: "TypeScript",
  frameworks: ["Next.js"],
  testRunner: "Vitest",
  requiredCommands: ["pnpm install", "pnpm test", "pnpm build"]
};

const validPermissionPolicy = {
  levels: validRuntimePolicy.riskLevels,
  commandRules: [
    {
      command: "git push",
      riskLevel: "L4",
      action: "queue_for_approval",
      reason: "Remote mutation requires approval."
    }
  ]
};

const validAgentAdapter = {
  adapterType: "codex",
  files: [
    {
      path: "agent_adapters/codex/AGENTS.md",
      content: "# AGENTS\nCodex-only target adapter."
    }
  ]
};

describe("core schemas", () => {
  it("accepts a complete generated pack", () => {
    const result = GeneratedPackSchema.parse({
      projectSpec: validProjectSpec,
      taskQueue: validTaskQueue,
      runtimePolicy: validRuntimePolicy,
      toolchainManifest: validToolchainManifest,
      permissionPolicy: validPermissionPolicy,
      agentAdapter: validAgentAdapter,
      files: [
        {
          path: "common/PROJECT_SPEC.md",
          content: "# Project Spec\nInventory Copilot"
        }
      ]
    });

    expect(result.projectSpec.projectName).toBe("Inventory Copilot");
    expect(result.taskQueue.tasks[0]?.riskLevel).toBe("L1");
  });

  it("reports clear field-level issues for an invalid project spec", () => {
    const result = ProjectSpecSchema.safeParse({
      ...validProjectSpec,
      projectName: "",
      rawDiscussion: "",
      targetAdapterType: "claude"
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const message = describeZodIssues(result.error);

      expect(message).toContain("projectName");
      expect(message).toContain("rawDiscussion");
      expect(message).toContain("targetAdapterType");
    }
  });

  it("requires task risk levels and done criteria", () => {
    const result = TaskQueueSchema.safeParse({
      ...validTaskQueue,
      tasks: [
        {
          ...validTaskQueue.tasks[0],
          riskLevel: "L9",
          doneCriteria: []
        }
      ]
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const message = describeZodIssues(result.error);

      expect(message).toContain("tasks.0.riskLevel");
      expect(message).toContain("tasks.0.doneCriteria");
    }
  });

  it("exports each required v0.1 schema", () => {
    expect(ProjectSpecSchema).toBeDefined();
    expect(TaskQueueSchema).toBeDefined();
    expect(RuntimePolicySchema).toBeDefined();
    expect(ToolchainManifestSchema).toBeDefined();
    expect(PermissionPolicySchema).toBeDefined();
    expect(AgentAdapterSchema).toBeDefined();
    expect(GeneratedPackSchema).toBeDefined();
  });
});
