import { describe, expect, it } from "vitest";

import { RunnerEventSchema } from "@/lib/adapters/events";

describe("RunnerEventSchema", () => {
  it("parses the public runner event shapes", () => {
    const samples = [
      {
        type: "run_started",
        adapterId: "claude-code",
        mode: "autonomous",
        cwd: "/tmp/pack",
        sessionId: "sess-1"
      },
      { type: "assistant_text", text: "working" },
      { type: "tool_use", name: "Bash", inputSummary: "Bash: pnpm test" },
      { type: "tool_result", name: "Bash", ok: true, exitCode: 0 },
      {
        type: "approval_required",
        command: "git push",
        risk: "denied by claude permission mode"
      },
      { type: "log_line", stream: "stdout", text: "plain line" },
      {
        type: "run_finished",
        exitCode: 0,
        durationMs: 12,
        sessionId: "sess-1",
        isError: false,
        numTurns: 2,
        costUsd: 0.01
      }
    ];

    for (const sample of samples) {
      expect(RunnerEventSchema.parse(sample)).toEqual(sample);
    }
  });
});
