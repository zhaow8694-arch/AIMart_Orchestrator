import { z, type ZodError } from "zod";

const NonEmptyStringSchema = z.string().trim().min(1);

export const RiskLevelSchema = z.enum(["L0", "L1", "L2", "L3", "L4", "L5"]);

export const TaskStatusSchema = z.enum([
  "pending",
  "doing",
  "done",
  "blocked",
  "waiting_approval"
]);

export const ProjectSpecSchema = z.object({
  projectName: NonEmptyStringSchema,
  background: z.string().trim().default(""),
  rawDiscussion: NonEmptyStringSchema,
  mvpScope: z.array(NonEmptyStringSchema).default([]),
  forbiddenItems: z.array(NonEmptyStringSchema).default([]),
  techStackPreferences: z.array(NonEmptyStringSchema).default([]),
  targetAdapterType: z.literal("codex"),
  executionMode: z.enum(["codex_only", "manual"]).default("codex_only"),
  testingRequirements: z.array(NonEmptyStringSchema).default([]),
  deliveryRequirements: z.array(NonEmptyStringSchema).default([]),
  securityBoundaries: z.array(NonEmptyStringSchema).default([]),
  explicitRequirements: z.array(NonEmptyStringSchema).default([]),
  inferredAssumptions: z.array(NonEmptyStringSchema).default([]),
  openQuestions: z.array(NonEmptyStringSchema).default([]),
  createdAt: z.string().datetime()
});

export const TaskItemSchema = z.object({
  id: NonEmptyStringSchema,
  title: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
  phase: NonEmptyStringSchema,
  dependencies: z.array(NonEmptyStringSchema).default([]),
  riskLevel: RiskLevelSchema,
  allowedCommands: z.array(NonEmptyStringSchema).default([]),
  doneCriteria: z.array(NonEmptyStringSchema).min(1),
  testCommand: NonEmptyStringSchema,
  rollbackNote: NonEmptyStringSchema,
  status: TaskStatusSchema.default("pending")
});

export const TaskQueueSchema = z.object({
  sourceProjectName: NonEmptyStringSchema,
  generatedAt: z.string().datetime(),
  tasks: z.array(TaskItemSchema).min(1)
});

export const RuntimePolicyActionSchema = z.enum([
  "allow",
  "queue_for_approval",
  "deny"
]);

export const RuntimeRiskLevelSchema = z.object({
  level: RiskLevelSchema,
  name: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
  defaultAction: RuntimePolicyActionSchema
});

export const RuntimePolicySchema = z.object({
  riskLevels: z.array(RuntimeRiskLevelSchema).min(1),
  defaultAllowedCommands: z.array(NonEmptyStringSchema).default([]),
  approvalRequiredCommands: z.array(NonEmptyStringSchema).default([]),
  forbiddenCommands: z.array(NonEmptyStringSchema).default([])
});

export const ToolchainManifestSchema = z.object({
  runtime: NonEmptyStringSchema,
  packageManager: NonEmptyStringSchema,
  language: NonEmptyStringSchema,
  frameworks: z.array(NonEmptyStringSchema).default([]),
  testRunner: NonEmptyStringSchema,
  requiredCommands: z.array(NonEmptyStringSchema).min(1)
});

export const PermissionCommandRuleSchema = z.object({
  command: NonEmptyStringSchema,
  riskLevel: RiskLevelSchema,
  action: RuntimePolicyActionSchema,
  reason: NonEmptyStringSchema
});

export const PermissionPolicySchema = z.object({
  levels: z.array(RuntimeRiskLevelSchema).min(1),
  commandRules: z.array(PermissionCommandRuleSchema).default([])
});

export const FileEntrySchema = z.object({
  path: NonEmptyStringSchema,
  content: NonEmptyStringSchema
});

export const AgentAdapterSchema = z.object({
  adapterType: z.literal("codex"),
  files: z.array(FileEntrySchema).min(1)
});

export const GeneratedPackSchema = z.object({
  projectSpec: ProjectSpecSchema,
  taskQueue: TaskQueueSchema,
  runtimePolicy: RuntimePolicySchema,
  toolchainManifest: ToolchainManifestSchema,
  permissionPolicy: PermissionPolicySchema,
  agentAdapter: AgentAdapterSchema,
  files: z.array(FileEntrySchema).min(1)
});

export type ProjectSpec = z.infer<typeof ProjectSpecSchema>;
export type TaskItem = z.infer<typeof TaskItemSchema>;
export type TaskQueue = z.infer<typeof TaskQueueSchema>;
export type RuntimePolicy = z.infer<typeof RuntimePolicySchema>;
export type ToolchainManifest = z.infer<typeof ToolchainManifestSchema>;
export type PermissionPolicy = z.infer<typeof PermissionPolicySchema>;
export type FileEntry = z.infer<typeof FileEntrySchema>;
export type AgentAdapter = z.infer<typeof AgentAdapterSchema>;
export type GeneratedPack = z.infer<typeof GeneratedPackSchema>;

export function describeZodIssues(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "root";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}
