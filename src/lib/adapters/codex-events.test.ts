import { describe, expect, it } from "vitest";

import { mapCodexLogLine, mapCodexRunFinished } from "@/lib/adapters/codex-events";

describe("mapCodexLogLine", () => {
  it("turns a text log into log_line events plus one run_finished", () => {
    const lines = ["codex exec started", "   ", "workspace-write ready"];
    const events = lines.flatMap((line) => {
      const mapped = mapCodexLogLine(line);
      return mapped ? [mapped] : [];
    });
    events.push(mapCodexRunFinished(0, 15));

    expect(events.map((event) => event.type)).toEqual([
      "log_line",
      "log_line",
      "run_finished"
    ]);
    expect(events.some((event) => event.type === "tool_use")).toBe(false);
    expect(events[0]).toEqual({
      type: "log_line",
      stream: "stdout",
      text: "codex exec started"
    });
    expect(events[2]).toEqual({
      type: "run_finished",
      exitCode: 0,
      durationMs: 15
    });
  });
});
