import {
  TaskQueueSchema,
  type ProjectSpec,
  type TaskItem,
  type TaskQueue
} from "@/lib/schemas/core";

type GenerateTaskQueueOptions = {
  now?: Date;
};

export function generateTaskQueue(
  projectSpec: ProjectSpec,
  options: GenerateTaskQueueOptions = {}
): TaskQueue {
  const now = options.now ?? new Date();
  const mvpSummary =
    projectSpec.mvpScope.length > 0
      ? projectSpec.mvpScope.join(", ")
      : "the confirmed v0.1 MVP scope";
  const forbiddenSummary =
    projectSpec.forbiddenItems.length > 0
      ? projectSpec.forbiddenItems.join(", ")
      : "scope expansion beyond v0.1";
  const securitySummary =
    projectSpec.securityBoundaries.length > 0
      ? projectSpec.securityBoundaries.join(", ")
      : "do not read secrets or touch production resources";

  const tasks: TaskItem[] = [
    {
      id: "TASK-001",
      title: "Initialize target project",
      description: `Create the local project skeleton for ${projectSpec.projectName}.`,
      phase: "setup",
      dependencies: [],
      riskLevel: "L1",
      allowedCommands: ["pnpm install", "pnpm lint", "pnpm test", "pnpm build"],
      doneCriteria: [
        "Project dependencies install successfully.",
        "Lint, test, and build commands are available."
      ],
      testCommand: "pnpm build",
      rollbackNote: "Remove generated skeleton files and restore the previous package files.",
      status: "pending"
    },
    {
      id: "TASK-002",
      title: "Implement v0.1 core MVP",
      description: `Implement only the MVP scope: ${mvpSummary}. Avoid: ${forbiddenSummary}.`,
      phase: "core",
      dependencies: ["TASK-001"],
      riskLevel: "L2",
      allowedCommands: ["pnpm test", "pnpm build"],
      doneCriteria: [
        "MVP behavior is implemented without expanding scope.",
        "Explicit requirements from PROJECT_SPEC are traceable in code or docs."
      ],
      testCommand: "pnpm test",
      rollbackNote: "Revert the feature files touched for the MVP implementation.",
      status: "pending"
    },
    {
      id: "TASK-003",
      title: "Apply runtime and permission boundaries",
      description: `Apply security boundaries: ${securitySummary}. High-risk commands must enter APPROVAL_QUEUE.`,
      phase: "runtime",
      dependencies: ["TASK-001"],
      riskLevel: "L2",
      allowedCommands: ["pnpm test"],
      doneCriteria: [
        "Runtime policy files are present.",
        "High-risk operations are documented instead of executed automatically."
      ],
      testCommand: "pnpm test",
      rollbackNote: "Restore previous runtime policy files from backup.",
      status: "pending"
    },
    {
      id: "TASK-004",
      title: "Add focused tests",
      description: "Add unit and integration coverage for the MVP and generated scripts.",
      phase: "qa",
      dependencies: ["TASK-002", "TASK-003"],
      riskLevel: "L1",
      allowedCommands: ["pnpm test", "pnpm lint"],
      doneCriteria: [
        "Core behavior has automated tests.",
        "Regression-prone script or adapter output is covered."
      ],
      testCommand: "pnpm test",
      rollbackNote: "Remove only the failing or obsolete test files introduced in this task.",
      status: "pending"
    },
    {
      id: "TASK-005",
      title: "Write delivery documentation",
      description: "Document how to run, test, secure, and deliver the target project.",
      phase: "docs",
      dependencies: ["TASK-003"],
      riskLevel: "L1",
      allowedCommands: ["pnpm lint"],
      doneCriteria: [
        "README, RUN_APP, ENV_SETUP, and security docs are complete.",
        "Known assumptions and open questions are documented honestly."
      ],
      testCommand: "pnpm lint",
      rollbackNote: "Restore previous docs from backup or remove generated doc files.",
      status: "pending"
    },
    {
      id: "TASK-006",
      title: "Finalize local delivery artifact",
      description: "Run the local finalize flow, create a local tag, and package the artifact.",
      phase: "finalize",
      dependencies: ["TASK-004", "TASK-005"],
      riskLevel: "L2",
      allowedCommands: ["pnpm test", "pnpm build", "git status", "git tag"],
      doneCriteria: [
        "Finalize script completes locally.",
        "Release notes and final delivery check are present.",
        "Remote push or deployment is not performed."
      ],
      testCommand: "pnpm build",
      rollbackNote: "Delete only project-local generated artifacts or local tag if needed.",
      status: "pending"
    }
  ];

  return TaskQueueSchema.parse({
    sourceProjectName: projectSpec.projectName,
    generatedAt: now.toISOString(),
    tasks
  });
}
