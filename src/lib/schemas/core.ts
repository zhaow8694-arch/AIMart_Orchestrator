import { z, type ZodError } from "zod";

const NonEmptyStringSchema = z.string().trim().min(1);

// Inbound size limits: pack input arrives over HTTP, and unbounded strings let
// a single request exhaust server memory while the pack is being generated.
export const MAX_PROJECT_NAME_LENGTH = 200;
export const MAX_TEXT_FIELD_LENGTH = 20_000;
export const MAX_RAW_DISCUSSION_LENGTH = 200_000;
export const MAX_LIST_ITEM_LENGTH = 5_000;
export const MAX_LIST_ITEMS = 200;

const BoundedNonEmptyString = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength);
const BoundedText = (maxLength: number) => z.string().trim().max(maxLength);
const BoundedTextList = (itemMaxLength: number, listMaxLength: number) =>
  z
    .array(z.string().trim().min(1).max(itemMaxLength))
    .max(listMaxLength)
    .default([]);

export const RiskLevelSchema = z.enum(["L0", "L1", "L2", "L3", "L4", "L5"]);

export const TaskStatusSchema = z.enum([
  "pending",
  "doing",
  "done",
  "blocked",
  "waiting_approval"
]);

export const AgentAdapterIdSchema = z.enum([
  "codex",
  "claude-code",
  "trae",
  "cursor"
]);

export const ExecutionScopeSchema = z.enum([
  "single_phase",
  "multi_phase",
  "end_to_end_delivery"
]).default("single_phase");

export const ExecutionModeSchema = z.preprocess((value) => {
  if (value === "codex_only" || value === "manual") {
    return "supervised";
  }

  if (value === "unified_autonomous") {
    return "end_to_end_autonomous";
  }

  return value;
}, z.enum(["supervised", "autonomous", "end_to_end_autonomous"]).default("supervised"));

export const ProjectSpecSchema = z.object({
  projectName: BoundedNonEmptyString(MAX_PROJECT_NAME_LENGTH),
  background: BoundedText(MAX_TEXT_FIELD_LENGTH).default(""),
  rawDiscussion: BoundedNonEmptyString(MAX_RAW_DISCUSSION_LENGTH),
  mvpScope: BoundedTextList(MAX_LIST_ITEM_LENGTH, MAX_LIST_ITEMS),
  forbiddenItems: BoundedTextList(MAX_LIST_ITEM_LENGTH, MAX_LIST_ITEMS),
  techStackPreferences: BoundedTextList(MAX_LIST_ITEM_LENGTH, MAX_LIST_ITEMS),
  targetAdapterType: AgentAdapterIdSchema.default("codex"),
  selectedAdapterIds: z.array(AgentAdapterIdSchema).min(1).default(["codex"]),
  executionScope: ExecutionScopeSchema,
  executionMode: ExecutionModeSchema,
  testingRequirements: BoundedTextList(MAX_LIST_ITEM_LENGTH, MAX_LIST_ITEMS),
  deliveryRequirements: BoundedTextList(MAX_LIST_ITEM_LENGTH, MAX_LIST_ITEMS),
  securityBoundaries: BoundedTextList(MAX_LIST_ITEM_LENGTH, MAX_LIST_ITEMS),
  explicitRequirements: BoundedTextList(MAX_LIST_ITEM_LENGTH, MAX_LIST_ITEMS),
  inferredAssumptions: BoundedTextList(MAX_LIST_ITEM_LENGTH, MAX_LIST_ITEMS),
  openQuestions: BoundedTextList(MAX_LIST_ITEM_LENGTH, MAX_LIST_ITEMS),
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
  adapterType: z.enum(["codex", "multi_target"]),
  selectedAdapterIds: z.array(AgentAdapterIdSchema).min(1).default(["codex"]),
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
export type AgentAdapterId = z.infer<typeof AgentAdapterIdSchema>;
export type ExecutionScope = z.infer<typeof ExecutionScopeSchema>;
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
