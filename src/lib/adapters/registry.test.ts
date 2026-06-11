import { describe, expect, it } from "vitest";

import {
  AGENT_ADAPTER_REGISTRY,
  getAgentAdapterRegistryEntry,
  supportedAgentAdapterIds
} from "./registry";

describe("agent adapter registry", () => {
  it("registers every v0.3.0 target agent adapter", () => {
    expect(supportedAgentAdapterIds).toEqual([
      "codex",
      "claude-code",
      "trae",
      "cursor"
    ]);

    for (const id of supportedAgentAdapterIds) {
      const entry = AGENT_ADAPTER_REGISTRY[id];

      expect(entry.id).toBe(id);
      expect(entry.displayName).toMatch(/\S/);
      expect(entry.generatedAdapterDirectory).toBe(`agent_adapters/${id}`);
      expect(entry.supportedRunModes).toEqual(
        expect.arrayContaining([
          "supervised",
          "autonomous",
          "end_to_end_autonomous"
        ])
      );
      expect(entry.requiredRunbookFiles.length).toBeGreaterThan(0);
      expect(entry.requiredPromptFiles.length).toBeGreaterThan(0);
      expect(entry.permissionModelSummary).toContain("workspace");
      expect(entry.bestUseNotes).toContain("independent");
      expect(entry.completionGateRequirements.length).toBeGreaterThan(0);
    }
  });

  it("keeps Codex as the strongest end-to-end adapter", () => {
    const codex = getAgentAdapterRegistryEntry("codex");

    expect(codex.displayName).toBe("Codex");
    expect(codex.requiredRunbookFiles).toEqual(
      expect.arrayContaining([
        "agent_adapters/codex/CODEX_RUNBOOK.md",
        "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md"
      ])
    );
    expect(codex.requiredPromptFiles).toEqual(
      expect.arrayContaining([
        "agent_adapters/codex/CODEX_TASK_PROMPT.md",
        "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md"
      ])
    );
    expect(codex.bestUseNotes).toContain("strongest");
  });
});
