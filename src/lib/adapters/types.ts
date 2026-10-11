import type {
  AgentAdapterId,
  FileEntry,
  ProjectSpec,
  TaskQueue
} from "@/lib/schemas/core";
import type { RuntimePack } from "@/lib/generators/runtime-pack";

export type AdapterRunMode =
  | "supervised"
  | "autonomous"
  | "end_to_end_autonomous";

export type RunnerEvent =
  | {
      type: "run_started";
      adapterId: string;
      mode: AdapterRunMode;
      cwd: string;
      sessionId?: string;
    }
  | { type: "assistant_text"; text: string }
  | { type: "tool_use"; name: string; inputSummary: string }
  | { type: "tool_result"; name: string; ok: boolean; exitCode?: number }
  | { type: "approval_required"; command: string; risk: string }
  | { type: "log_line"; stream: "stdout" | "stderr"; text: string }
  | {
      type: "run_finished";
      exitCode: number;
      durationMs?: number;
      sessionId?: string;
      isError?: boolean;
      numTurns?: number;
      costUsd?: number;
    };

export type LaunchSpec = {
  executable: "codex" | "claude";
  argv: string[];
  promptPath: string;
  stdin: "prompt-file";
  outputFormat: "text-log" | "stream-json";
  timeoutSec: number;
  retry: { maxAttempts: 1 | 2; retryOn: Array<"spawn-failure" | "rate-limit"> };
};

export type RunSummary = {
  adapterId: string;
  exitCode: number;
  finalExitCode: number;
  classification: string;
  sessionId: string;
  isError: boolean;
  numTurns?: number;
  costUsd?: number;
  markdown: string;
};

export type AgentRuntimeAdapter = {
  id: AgentAdapterId;
  generateFiles(
    projectSpec: ProjectSpec,
    taskQueue: TaskQueue,
    runtimePack: RuntimePack
  ): FileEntry[];
  launchSpec(mode: AdapterRunMode): LaunchSpec;
  mapEvent(line: string): RunnerEvent | null;
  reportStatus(input: {
    exitCode: number;
    logPath: string;
    events: RunnerEvent[];
  }): RunSummary;
};
