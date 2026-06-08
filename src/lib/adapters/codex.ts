import type { RuntimePack } from "@/lib/generators/runtime-pack";
import {
  AgentAdapterSchema,
  type AgentAdapter,
  type ProjectSpec,
  type TaskQueue
} from "@/lib/schemas/core";

export function generateCodexAdapter(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue,
  runtimePack: RuntimePack
): AgentAdapter {
  return AgentAdapterSchema.parse({
    adapterType: "codex",
    files: [
      {
        path: "agent_adapters/codex/AGENTS.md",
        content: renderAgents(projectSpec)
      },
      {
        path: "agent_adapters/codex/CODEX_RUNBOOK.md",
        content: renderRunbook(projectSpec, taskQueue)
      },
      {
        path: "agent_adapters/codex/CODEX_TASK_PROMPT.md",
        content: renderTaskPrompt(projectSpec, taskQueue, runtimePack)
      },
      {
        path: "agent_adapters/codex/CODEX_AUTONOMOUS_LOOP.md",
        content: renderAutonomousLoop()
      }
    ]
  });
}

function renderAgents(projectSpec: ProjectSpec): string {
  return `# AGENTS.md - Codex Target Adapter

Codex is the target coding agent for this generated execution pack.

## Project Facts

- Project: ${projectSpec.projectName}
- MVP scope: ${formatList(projectSpec.mvpScope)}
- Forbidden items: ${formatList(projectSpec.forbiddenItems)}
- Security boundaries: ${formatList(projectSpec.securityBoundaries)}

## Rules

1. Do not expand the MVP scope.
2. Execute tasks in TASK_QUEUE order.
3. Update PROGRESS_LOG after each completed task.
4. Put high-risk commands in runtime/APPROVAL_QUEUE.md before execution.
5. Do not read secrets, local credential files, or production resources.
6. Run scripts/finalize.ps1 or scripts/finalize.sh before final delivery.
`;
}

function renderRunbook(projectSpec: ProjectSpec, taskQueue: TaskQueue): string {
  return `# Codex Runbook

## Start

1. Read common/PROJECT_SPEC.md.
2. Read common/TASK_QUEUE.md.
3. Read runtime/PERMISSION_POLICY.yaml.
4. Start with the first pending task.

## Project

${projectSpec.projectName}

## Task Order

${taskQueue.tasks
  .map((task) => `- ${task.id}: ${task.title} (${task.phase}, ${task.riskLevel})`)
  .join("\n")}

## Finish

Run the local finalize script for the current platform:

\`\`\`powershell
./scripts/finalize.ps1
\`\`\`

\`\`\`bash
./scripts/finalize.sh
\`\`\`
`;
}

function renderTaskPrompt(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue,
  runtimePack: RuntimePack
): string {
  return `# Codex Task Prompt

You are working on ${projectSpec.projectName}. Follow the generated task queue exactly.

## Tasks

${taskQueue.tasks
  .map(
    (task) => `### ${task.id} ${task.title}

- Phase: ${task.phase}
- Risk: ${task.riskLevel}
- Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(", ") : "none"}
- Done criteria: ${task.doneCriteria.join("; ")}
- Test command: \`${task.testCommand}\`
`
  )
  .join("\n")}

## Permission Actions

${runtimePack.permissionPolicy.commandRules
  .slice(0, 12)
  .map(
    (rule) =>
      `- \`${rule.command}\`: ${rule.riskLevel}, ${rule.action} - ${rule.reason}`
  )
  .join("\n")}

Use scripts/finalize.ps1 or scripts/finalize.sh for final delivery.
`;
}

function renderAutonomousLoop(): string {
  return `# Codex Autonomous Loop

Repeat this loop until every task is complete:

1. Pick the first pending task whose dependencies are done.
2. Read the relevant spec, runtime, adapter, and docs files.
3. Write or update tests before changing behavior.
4. Implement only what the task requires.
5. Run the task test command.
6. Run broader verification when the task affects shared behavior.
7. Update common/PROGRESS_LOG.md.
8. Continue to the next task.

Stop only for a blocker that prevents meaningful progress. Record blockers in common/BLOCKERS.md.
`;
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.join(", ") : "Not specified";
}
