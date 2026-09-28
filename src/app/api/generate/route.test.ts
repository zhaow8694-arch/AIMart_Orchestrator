import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/generate", () => {
  it("returns a downloadable ZIP payload and ProjectSpec summary", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          projectName: "Tiny Planner",
          rawDiscussion: "Build a local MVP for planning coding tasks."
        })
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      fileName: string;
      zipBase64: string;
      projectSpec: {
        projectName: string;
        executionMode: string;
        executionScope: string;
        selectedAdapterIds: string[];
        openQuestions: string[];
      };
    };

    expect(body.fileName).toBe("tiny-planner-execution-pack.zip");
    expect(body.zipBase64.startsWith("UEs")).toBe(true);
    expect(body.projectSpec.projectName).toBe("Tiny Planner");
    expect(body.projectSpec.executionMode).toBe("supervised");
    expect(body.projectSpec.executionScope).toBe("single_phase");
    expect(body.projectSpec.selectedAdapterIds).toEqual(["codex"]);
    expect(body.projectSpec.openQuestions.length).toBeGreaterThan(0);
  });

  it("threads autonomous execution mode into the generated execution-pack ZIP", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          projectName: "Tiny Planner",
          rawDiscussion: "Build a local MVP for planning coding tasks.",
          executionMode: "autonomous"
        })
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      zipBase64: string;
      projectSpec: { executionMode: string };
    };
    const names = readCentralDirectoryNames(Buffer.from(body.zipBase64, "base64"));

    expect(body.projectSpec.executionMode).toBe("autonomous");
    expect(names).toContain("agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md");
    expect(names).toContain("agent_adapters/codex/run-codex-autonomous.ps1");
    expect(names).toContain("runtime/SAFE_COMMANDS.md");
    expect(names).toContain("runtime/DENIED_COMMANDS.md");
    expect(names).toContain("runtime/AUTONOMOUS_EXECUTION_POLICY.md");
  });

  it("threads unified autonomous execution mode into the generated execution-pack ZIP", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          projectName: "Tiny Planner",
          rawDiscussion: "Build a local MVP for planning coding tasks.",
          executionMode: "unified_autonomous"
        })
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      zipBase64: string;
      projectSpec: { executionMode: string };
    };
    const names = readCentralDirectoryNames(Buffer.from(body.zipBase64, "base64"));

    expect(body.projectSpec.executionMode).toBe("end_to_end_autonomous");
    expect(names).toContain(
      "agent_adapters/codex/run-codex-unified-autonomous.ps1"
    );
    expect(names).toContain(
      "agent_adapters/codex/run-codex-unified-autonomous.sh"
    );
    expect(names).toContain("runtime/AUTONOMOUS_RUN_STATUS.md");
    expect(names).toContain("runtime/AUTONOMOUS_RUN_SUMMARY.md");
    expect(names).toContain("runtime/AUTONOMOUS_HEALTH_CHECK.md");
  });

  it("threads selected target adapters into the generated execution-pack ZIP", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          projectName: "Tiny Planner",
          rawDiscussion: "Build a local MVP for planning coding tasks.",
          selectedAdapterIds: ["codex", "claude-code", "trae", "cursor"],
          executionScope: "end_to_end_delivery",
          executionMode: "end_to_end_autonomous"
        })
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      zipBase64: string;
      projectSpec: {
        executionMode: string;
        executionScope: string;
        selectedAdapterIds: string[];
      };
    };
    const names = readCentralDirectoryNames(Buffer.from(body.zipBase64, "base64"));

    expect(body.projectSpec.selectedAdapterIds).toEqual([
      "codex",
      "claude-code",
      "trae",
      "cursor"
    ]);
    expect(body.projectSpec.executionScope).toBe("end_to_end_delivery");
    expect(body.projectSpec.executionMode).toBe("end_to_end_autonomous");
    expect(names).toEqual(
      expect.arrayContaining([
        "EXECUTION_PACK_MANIFEST.md",
        "common/AUTONOMOUS_DELIVERY_ROADMAP.md",
        "runtime/RUN_STATE.json",
        "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md",
        "agent_adapters/claude-code/CLAUDE.md",
        "agent_adapters/claude-code/CLAUDE_RUNBOOK.md",
        "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md",
        "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md",
        "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md",
        "agent_adapters/trae/TRAE_RUNBOOK.md",
        "agent_adapters/trae/TRAE_TASK_PROMPT.md",
        "agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md",
        "agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md",
        "agent_adapters/cursor/CURSOR_RUNBOOK.md",
        "agent_adapters/cursor/CURSOR_TASK_PROMPT.md",
        "agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md",
        "agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md"
      ])
    );
  });

  it("defaults end-to-end delivery sample requests to all target adapters", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          projectName: "Todo API",
          rawDiscussion:
            "Build a local Todo API MVP with CRUD endpoints, tests, generated docs, and completion-gate verification.",
          executionScope: "end_to_end_delivery",
          executionMode: "end_to_end_autonomous"
        })
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      zipBase64: string;
      projectSpec: { selectedAdapterIds: string[] };
    };
    const names = readCentralDirectoryNames(Buffer.from(body.zipBase64, "base64"));

    expect(body.projectSpec.selectedAdapterIds).toEqual([
      "codex",
      "claude-code",
      "trae",
      "cursor"
    ]);
    expect(names).toEqual(
      expect.arrayContaining([
        "agent_adapters/codex/AGENTS.md",
        "agent_adapters/claude-code/CLAUDE.md",
        "agent_adapters/claude-code/CLAUDE_RUNBOOK.md",
        "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md",
        "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md",
        "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md",
        "agent_adapters/trae/TRAE_RUNBOOK.md",
        "agent_adapters/trae/TRAE_TASK_PROMPT.md",
        "agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md",
        "agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md",
        "agent_adapters/cursor/CURSOR_RUNBOOK.md",
        "agent_adapters/cursor/CURSOR_TASK_PROMPT.md",
        "agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md",
        "agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md"
      ])
    );
  });
  it("rejects request bodies larger than 1MB with 413", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          projectName: "Tiny Planner",
          rawDiscussion: "x".repeat(1_100_000)
        })
      })
    );

    expect(response.status).toBe(413);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Request body too large.");
  });
});

function readCentralDirectoryNames(buffer: Buffer): string[] {
  const endOfCentralDirectory = 0x06054b50;
  let eocdOffset = -1;

  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === endOfCentralDirectory) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("Missing ZIP end of central directory");
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const names: string[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid central directory entry at ${offset}`);
    }

    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;

    names.push(buffer.subarray(nameStart, nameEnd).toString("utf8"));
    offset = nameEnd + extraLength + commentLength;
  }

  return names;
}
