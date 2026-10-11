import type { RunnerEvent } from "@/lib/adapters/types";

export function mapCodexLogLine(
  line: string,
  stream: "stdout" | "stderr" = "stdout"
): RunnerEvent | null {
  if (line.trim().length === 0) {
    return null;
  }

  return {
    type: "log_line",
    stream,
    text: line
  };
}

export function mapCodexRunFinished(
  exitCode: number,
  durationMs?: number
): RunnerEvent {
  return {
    type: "run_finished",
    exitCode,
    durationMs
  };
}
