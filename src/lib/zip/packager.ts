import { ZipArchive } from "archiver";

import { generateCodexAdapter } from "@/lib/adapters/codex";
import {
  createProjectSpec,
  type ProjectSpecInput
} from "@/lib/core/project-spec";
import { generateDocsPack } from "@/lib/generators/docs-pack";
import { generateRuntimePack } from "@/lib/generators/runtime-pack";
import { generateScriptPack } from "@/lib/generators/script-pack";
import { generateTaskQueue } from "@/lib/generators/task-queue";
import {
  GeneratedPackSchema,
  type FileEntry,
  type GeneratedPack,
  type ProjectSpec,
  type TaskQueue
} from "@/lib/schemas/core";

type PackagerOptions = {
  now?: Date;
};

export function createExecutionPack(
  input: ProjectSpecInput,
  options: PackagerOptions = {}
): GeneratedPack {
  const projectSpec = createProjectSpec(input, options);
  const taskQueue = generateTaskQueue(projectSpec, options);
  const runtimePack = generateRuntimePack(projectSpec);
  const scriptPack = generateScriptPack(projectSpec);
  const agentAdapter = generateCodexAdapter(projectSpec, taskQueue, runtimePack);
  const docsPack = generateDocsPack(projectSpec, taskQueue, runtimePack);
  const files = [
    ...generateCommonFiles(projectSpec, taskQueue),
    ...runtimePack.files,
    ...scriptPack.files,
    ...agentAdapter.files,
    ...docsPack.files
  ];

  return GeneratedPackSchema.parse({
    projectSpec,
    taskQueue,
    runtimePolicy: runtimePack.runtimePolicy,
    toolchainManifest: runtimePack.toolchainManifest,
    permissionPolicy: runtimePack.permissionPolicy,
    agentAdapter,
    files
  });
}

export async function createExecutionPackZip(
  input: ProjectSpecInput,
  options: PackagerOptions = {}
): Promise<{ pack: GeneratedPack; zipBuffer: Buffer }> {
  const pack = createExecutionPack(input, options);
  const zipBuffer = await createZipBuffer(pack.files);

  return { pack, zipBuffer };
}

export async function createZipBuffer(files: FileEntry[]): Promise<Buffer> {
  if (files.length === 0) {
    throw new Error("Cannot create a ZIP from an empty file list.");
  }

  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({
      zlib: { level: 9 }
    });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    });
    archive.on("error", reject);
    archive.on("warning", reject);
    archive.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    for (const entry of files) {
      archive.append(entry.content, { name: normalizeZipPath(entry.path) });
    }

    archive.finalize().catch(reject);
  });
}

function generateCommonFiles(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue
): FileEntry[] {
  return [
    {
      path: "common/PROJECT_SPEC.md",
      content: `# Project Spec

\`\`\`json
${JSON.stringify(projectSpec, null, 2)}
\`\`\`
`
    },
    {
      path: "common/TASK_QUEUE.md",
      content: renderTaskQueue(taskQueue)
    },
    {
      path: "common/EXECUTION_RULES.md",
      content: `# Execution Rules

1. Follow TASK_QUEUE.md in order.
2. Do not expand the v0.1 MVP scope.
3. Write assumptions to ASSUMPTIONS.md when details are unknown.
4. Write blockers to BLOCKERS.md only when work cannot continue.
5. Queue high-risk commands in runtime/APPROVAL_QUEUE.md.
6. Run scripts/finalize.* before final delivery.
`
    },
    {
      path: "common/SELF_REVIEW.md",
      content: `# Self Review

- [ ] Scope matches PROJECT_SPEC.md.
- [ ] Tests cover core behavior.
- [ ] Generated docs are complete.
- [ ] High-risk commands were not executed without approval.
- [ ] Finalize script was run before delivery.
`
    },
    {
      path: "common/FINAL_DELIVERY_CHECK.md",
      content: `# Final Delivery Check

- [ ] Project runs locally.
- [ ] Tests pass.
- [ ] Build passes.
- [ ] Runtime policy reviewed.
- [ ] scripts/finalize.* completed.
- [ ] ZIP artifact generated.
`
    },
    {
      path: "common/ASSUMPTIONS.md",
      content: `# Assumptions

${asBullets(projectSpec.inferredAssumptions)}
`
    },
    {
      path: "common/BLOCKERS.md",
      content: `# Blockers

| Time | Blocker | Impact | Needed Input |
|---|---|---|---|
`
    },
    {
      path: "common/PROGRESS_LOG.md",
      content: `# Progress Log

| Time | Task | Status | Notes |
|---|---|---|---|
| generated | execution pack | pending | Start with TASK-001. |
`
    },
    {
      path: "common/HANDOFF.md",
      content: `# Handoff

This pack is generated for Codex target execution of ${projectSpec.projectName}.

Use common/TASK_QUEUE.md, runtime/PERMISSION_POLICY.yaml, and agent_adapters/codex/AGENTS.md as the source of truth.
`
    }
  ];
}

function renderTaskQueue(taskQueue: TaskQueue): string {
  return `# Task Queue

Generated for: ${taskQueue.sourceProjectName}

${taskQueue.tasks
  .map(
    (task) => `## ${task.id} ${task.title}

- Status: ${task.status}
- Phase: ${task.phase}
- Risk: ${task.riskLevel}
- Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(", ") : "none"}
- Test command: \`${task.testCommand}\`
- Rollback: ${task.rollbackNote}

### Done Criteria

${asBullets(task.doneCriteria)}
`
  )
  .join("\n")}
`;
}

function normalizeZipPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");

  if (
    normalized === "" ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Unsafe ZIP path: ${path}`);
  }

  return normalized;
}

function asBullets(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}
