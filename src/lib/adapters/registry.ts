import type { AgentAdapterId } from "@/lib/schemas/core";

export type AdapterRunMode =
  | "supervised"
  | "autonomous"
  | "end_to_end_autonomous";

export type AgentAdapterRegistryEntry = {
  id: AgentAdapterId;
  displayName: string;
  generatedAdapterDirectory: `agent_adapters/${AgentAdapterId}`;
  supportedRunModes: AdapterRunMode[];
  requiredRunbookFiles: string[];
  requiredPromptFiles: string[];
  permissionModelSummary: string;
  bestUseNotes: string;
  completionGateRequirements: string[];
};

export const supportedAgentAdapterIds: AgentAdapterId[] = [
  "codex",
  "claude-code",
  "trae",
  "cursor"
];

export const AGENT_ADAPTER_REGISTRY: Record<
  AgentAdapterId,
  AgentAdapterRegistryEntry
> = {
  codex: {
    id: "codex",
    displayName: "Codex",
    generatedAdapterDirectory: "agent_adapters/codex",
    supportedRunModes: ["supervised", "autonomous", "end_to_end_autonomous"],
    requiredRunbookFiles: [
      "agent_adapters/codex/CODEX_RUNBOOK.md",
      "agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md",
      "agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md",
      "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md",
      "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md"
    ],
    requiredPromptFiles: [
      "agent_adapters/codex/CODEX_TASK_PROMPT.md",
      "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md",
      "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md"
    ],
    permissionModelSummary:
      "Runs in a project workspace with workspace-write sandboxing, supervised approval on request, or autonomous approval never.",
    bestUseNotes:
      "Codex is the strongest adapter for independent end-to-end execution packages and completion-gate automation.",
    completionGateRequirements: [
      "Codex runbooks and prompts exist.",
      "End-to-end autonomous prompt and delivery runbook exist.",
      "PowerShell and Bash launchers exist for supervised, autonomous, unified, and end-to-end autonomous modes."
    ]
  },
  "claude-code": {
    id: "claude-code",
    displayName: "Claude Code",
    generatedAdapterDirectory: "agent_adapters/claude-code",
    supportedRunModes: ["supervised", "autonomous", "end_to_end_autonomous"],
    requiredRunbookFiles: [
      "agent_adapters/claude-code/CLAUDE.md",
      "agent_adapters/claude-code/CLAUDE_RUNBOOK.md",
      "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md"
    ],
    requiredPromptFiles: [
      "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md",
      "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md"
    ],
    permissionModelSummary:
      "Runs as an independent workspace option using the customer's Claude Code permission controls and project-local safety files.",
    bestUseNotes:
      "Use as an independent execution option when the customer chooses Claude Code for a workspace.",
    completionGateRequirements: [
      "CLAUDE.md, runbook, task prompt, autonomous prompt, and end-to-end runbook exist.",
      "settings.example.json exists with project-local safety defaults.",
      "Run instructions warn not to run multiple agents against the same workspace."
    ]
  },
  trae: {
    id: "trae",
    displayName: "Trae",
    generatedAdapterDirectory: "agent_adapters/trae",
    supportedRunModes: ["supervised", "autonomous", "end_to_end_autonomous"],
    requiredRunbookFiles: [
      "agent_adapters/trae/TRAE_RUNBOOK.md",
      "agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md"
    ],
    requiredPromptFiles: [
      "agent_adapters/trae/TRAE_TASK_PROMPT.md",
      "agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md"
    ],
    permissionModelSummary:
      "Runs as an independent workspace option using Trae workspace permissions plus AIMart runtime policy files.",
    bestUseNotes:
      "Use as an independent execution option when the customer wants Trae to own a workspace from start to finish.",
    completionGateRequirements: [
      "Trae runbook, task prompt, autonomous prompt, end-to-end runbook, and config YAML exist.",
      "Run instructions keep Trae isolated from other generated adapter options."
    ]
  },
  cursor: {
    id: "cursor",
    displayName: "Cursor",
    generatedAdapterDirectory: "agent_adapters/cursor",
    supportedRunModes: ["supervised", "autonomous", "end_to_end_autonomous"],
    requiredRunbookFiles: [
      "agent_adapters/cursor/CURSOR_RUNBOOK.md",
      "agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md",
      "agent_adapters/cursor/rules/project-rules.md"
    ],
    requiredPromptFiles: [
      "agent_adapters/cursor/CURSOR_TASK_PROMPT.md",
      "agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md"
    ],
    permissionModelSummary:
      "Runs as an independent workspace option using Cursor rules and project-local AIMart policy files.",
    bestUseNotes:
      "Use as an independent execution option when the customer wants Cursor to follow generated rules in one workspace.",
    completionGateRequirements: [
      "Cursor runbook, task prompt, autonomous rules, end-to-end runbook, and project rules exist.",
      "Rules explain adapter selection is independent and not multi-agent collaboration."
    ]
  }
};

export function getAgentAdapterRegistryEntry(
  id: AgentAdapterId
): AgentAdapterRegistryEntry {
  return AGENT_ADAPTER_REGISTRY[id];
}

export function getSelectedAgentAdapterRegistryEntries(
  ids: AgentAdapterId[]
): AgentAdapterRegistryEntry[] {
  return ids.map((id) => getAgentAdapterRegistryEntry(id));
}
