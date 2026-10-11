import { z } from "zod";

export const AdapterRunModeSchema = z.enum([
  "supervised",
  "autonomous",
  "end_to_end_autonomous"
]);

export const RunnerEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run_started"),
    adapterId: z.string().trim().min(1),
    mode: AdapterRunModeSchema,
    cwd: z.string(),
    sessionId: z.string().min(1).optional()
  }),
  z.object({
    type: z.literal("assistant_text"),
    text: z.string()
  }),
  z.object({
    type: z.literal("tool_use"),
    name: z.string().trim().min(1),
    inputSummary: z.string()
  }),
  z.object({
    type: z.literal("tool_result"),
    name: z.string().trim().min(1),
    ok: z.boolean(),
    exitCode: z.number().int().optional()
  }),
  z.object({
    type: z.literal("approval_required"),
    command: z.string().trim().min(1),
    risk: z.string().trim().min(1)
  }),
  z.object({
    type: z.literal("log_line"),
    stream: z.enum(["stdout", "stderr"]),
    text: z.string()
  }),
  z.object({
    type: z.literal("run_finished"),
    exitCode: z.number().int(),
    durationMs: z.number().int().nonnegative().optional(),
    sessionId: z.string().min(1).optional(),
    isError: z.boolean().optional(),
    numTurns: z.number().int().nonnegative().optional(),
    costUsd: z.number().nonnegative().optional()
  })
]);

export type RunnerEventInput = z.infer<typeof RunnerEventSchema>;
