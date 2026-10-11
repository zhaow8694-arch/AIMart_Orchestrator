import { generateClaudeCodeAdapter } from "@/lib/adapters/claude-code";
import { generateCodexAdapter } from "@/lib/adapters/codex";
import type { RuntimePack } from "@/lib/generators/runtime-pack";
import {
  AgentAdapterSchema,
  type AgentAdapter,
  type AgentAdapterId,
  type FileEntry,
  type ProjectSpec,
  type TaskQueue
} from "@/lib/schemas/core";
import { getAgentAdapterRegistryEntry } from "./registry";

export function generateAgentAdapters(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue,
  runtimePack: RuntimePack
): AgentAdapter {
  const files = projectSpec.selectedAdapterIds.flatMap((id) =>
    generateFilesForAdapter(id, projectSpec, taskQueue, runtimePack)
  );

  return AgentAdapterSchema.parse({
    adapterType: "multi_target",
    selectedAdapterIds: projectSpec.selectedAdapterIds,
    files
  });
}

function generateFilesForAdapter(
  id: AgentAdapterId,
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue,
  runtimePack: RuntimePack
): FileEntry[] {
  if (id === "codex") {
    return generateCodexAdapter(projectSpec, taskQueue, runtimePack).files;
  }

  if (id === "claude-code") {
    return generateClaudeCodeAdapter(projectSpec, taskQueue, runtimePack);
  }

  if (id === "trae") {
    return generateTraeAdapter(projectSpec, taskQueue);
  }

  return generateCursorAdapter(projectSpec, taskQueue);
}

function generateTraeAdapter(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue
): FileEntry[] {
  const entry = getAgentAdapterRegistryEntry("trae");

  return [
    file("agent_adapters/trae/TRAE_RUNBOOK.md", renderRunbook(entry.displayName, projectSpec)),
    file("agent_adapters/trae/TRAE_TASK_PROMPT.md", renderTaskPrompt(entry.displayName, projectSpec, taskQueue)),
    file("agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md", renderAutonomousPrompt(entry.displayName, projectSpec)),
    file("agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md", renderEndToEndRunbook(entry.displayName, projectSpec)),
    file("agent_adapters/trae/TRAE_AGENT_CONFIG.yaml", renderTraeConfig(projectSpec)),
    file("agent_adapters/trae/run-trae-supervised.md", renderManualStart("Trae", "supervised")),
    file("agent_adapters/trae/run-trae-autonomous.md", renderManualStart("Trae", "autonomous"))
  ];
}

function generateCursorAdapter(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue
): FileEntry[] {
  const entry = getAgentAdapterRegistryEntry("cursor");

  return [
    file("agent_adapters/cursor/CURSOR_RUNBOOK.md", renderRunbook(entry.displayName, projectSpec)),
    file("agent_adapters/cursor/CURSOR_TASK_PROMPT.md", renderTaskPrompt(entry.displayName, projectSpec, taskQueue)),
    file("agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md", renderAutonomousPrompt(entry.displayName, projectSpec)),
    file("agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md", renderEndToEndRunbook(entry.displayName, projectSpec)),
    file("agent_adapters/cursor/rules/project-rules.md", renderCursorRules(projectSpec))
  ];
}

function file(path: string, content: string): FileEntry {
  return { path, content };
}

function renderAdapterBase(
  adapterName: string,
  projectSpec: ProjectSpec,
  taskCount: number
): string {
  return `# ${adapterName} Adapter

Project: ${projectSpec.projectName}
Execution scope: ${projectSpec.executionScope}
Execution mode: ${projectSpec.executionMode}

This is an independent execution option. Selecting multiple adapters means AIMart generated multiple independent execution options; it does not run multiple agents together.

Do not run multiple agents against the same workspace at the same time unless a human manually coordinates ownership.

## Task Count

${taskCount} generated tasks.
`;
}

function renderRunbook(adapterName: string, projectSpec: ProjectSpec): string {
  return `${renderAdapterBase(adapterName, projectSpec, 0)}
## Required Read Order

1. EXECUTION_PACK_MANIFEST.md
2. common/PROJECT_SPEC.md
3. common/TASK_QUEUE.md
4. common/AUTONOMOUS_DELIVERY_ROADMAP.md
5. runtime/END_TO_END_AUTONOMOUS_POLICY.md
6. runtime/RUN_STATE.json
7. runtime/APPROVAL_QUEUE.md

## Permission Model

Use the adapter's workspace permission model. High-risk commands go to runtime/APPROVAL_QUEUE.md. Continue safe independent work when queued work is not blocking.
`;
}

function renderTaskPrompt(
  adapterName: string,
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue
): string {
  return `${renderAdapterBase(adapterName, projectSpec, taskQueue.tasks.length)}
## Tasks

${taskQueue.tasks.map((task) => `- ${task.id}: ${task.title} (${task.phase})`).join("\n")}

Follow common/TASK_QUEUE.md in order and update common/PROGRESS_LOG.md after each completed task.
`;
}

function renderAutonomousPrompt(
  adapterName: string,
  projectSpec: ProjectSpec
): string {
  return `${renderAdapterBase(adapterName, projectSpec, 0)}
## Autonomous Rules

1. Work only inside this workspace.
2. Treat this adapter as the only selected agent during execution.
3. Read runtime/SAFE_COMMANDS.md and runtime/DENIED_COMMANDS.md before commands.
4. Record high-risk operations in runtime/APPROVAL_QUEUE.md.
5. Run the Completion Gate before reporting PASS.
6. If the gate reports FAIL, fix safe failures and rerun.
`;
}

function renderEndToEndRunbook(
  adapterName: string,
  projectSpec: ProjectSpec
): string {
  return `${renderAdapterBase(adapterName, projectSpec, 0)}
## End-to-End Delivery

Start once, then continue through:

- v0.0.1 discovery/spec
- v0.1.0 MVP implementation
- v0.2.x autonomous runtime and completion gates
- v0.3.x multi-agent independent adapters
- v0.4.x runner hardening
- v0.5.x delivery automation
- v1.0 final usable delivery

Use common/PHASE_GATE_PLAN.md, runtime/RUN_STATE.json, runtime/CURRENT_TASK.md, runtime/PHASE_GATE_REPORT.md, and runtime/COMPLETION_GATE_REPORT.md. Every phase ends with a Completion Gate result of PASS or FAIL.
`;
}

function renderManualStart(adapterName: string, mode: string): string {
  return `# Start ${adapterName} ${mode}

Open this workspace in ${adapterName}, paste the matching task or autonomous prompt, and choose this adapter as the single active execution agent for the workspace.

Do not run multiple agents against the same workspace at the same time unless a human manually coordinates ownership.
`;
}

function renderTraeConfig(projectSpec: ProjectSpec): string {
  return `project: ${projectSpec.projectName}
adapter: trae
mode: ${projectSpec.executionMode}
scope: ${projectSpec.executionScope}
policy:
  workspace: project-local
  highRiskCommands: runtime/APPROVAL_QUEUE.md
  completionGate: runtime/COMPLETION_GATE_REPORT.md
`;
}

function renderCursorRules(projectSpec: ProjectSpec): string {
  return `# Cursor Project Rules

Project: ${projectSpec.projectName}

- This Cursor adapter is an independent execution option.
- Do not run multiple agents against the same workspace at the same time unless manually coordinated.
- Read EXECUTION_PACK_MANIFEST.md and common/PHASE_GATE_PLAN.md before implementation.
- Use runtime/RUN_STATE.json and runtime/CURRENT_TASK.md to continue across phases.
- Record Completion Gate PASS or FAIL in runtime/COMPLETION_GATE_REPORT.md.
`;
}
