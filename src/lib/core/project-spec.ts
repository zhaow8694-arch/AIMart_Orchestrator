import {
  AgentAdapterIdSchema,
  ProjectSpecSchema,
  type AgentAdapterId,
  type ExecutionScope,
  type ProjectSpec
} from "@/lib/schemas/core";

export type ProjectSpecInput = {
  projectName?: string;
  background?: string;
  rawDiscussion?: string;
  mvpScope?: string | string[];
  forbiddenItems?: string | string[];
  techStackPreferences?: string | string[];
  targetAdapterType?: string;
  selectedAdapterIds?: string | string[];
  executionScope?: string;
  executionMode?: string;
  testingRequirements?: string | string[];
  deliveryRequirements?: string | string[];
  securityBoundaries?: string | string[];
};

type CreateProjectSpecOptions = {
  now?: Date;
};

const DEFAULT_STACK = ["Next.js", "TypeScript", "Zod", "Vitest", "pnpm"];
const DEFAULT_ADAPTERS: AgentAdapterId[] = ["codex"];
const DEFAULT_EXECUTION_SCOPE: ExecutionScope = "single_phase";
const DEFAULT_EXECUTION_MODE = "supervised";
type ExecutionMode = "supervised" | "autonomous" | "end_to_end_autonomous";

const REQUIREMENT_MARKERS = [
  "must",
  "should",
  "required",
  "require",
  "need",
  "needs",
  "支持",
  "必须",
  "需要",
  "要求",
  "生成",
  "交付"
];

export function createProjectSpec(
  input: ProjectSpecInput,
  options: CreateProjectSpecOptions = {}
): ProjectSpec {
  const now = options.now ?? new Date();
  const projectName = textOrDefault(input.projectName, "Untitled AIMart Project");
  const rawDiscussion = textOrDefault(
    input.rawDiscussion,
    "No raw discussion provided."
  );
  const mvpScope = normalizeList(input.mvpScope);
  const forbiddenItems = normalizeList(input.forbiddenItems);
  const techStackPreferences = normalizeList(input.techStackPreferences);
  const selectedAdapterIds = normalizeSelectedAdapters(
    input.selectedAdapterIds,
    input.targetAdapterType
  );
  const executionScope = normalizeExecutionScope(input.executionScope);
  const executionMode = normalizeExecutionMode(input.executionMode);
  const testingRequirements = normalizeList(input.testingRequirements);
  const deliveryRequirements = normalizeList(input.deliveryRequirements);
  const securityBoundaries = normalizeList(input.securityBoundaries);

  const inferredAssumptions = buildAssumptions({
    techStackPreferences,
    targetAdapterType: input.targetAdapterType,
    selectedAdapterIds,
    rawSelectedAdapterIds: input.selectedAdapterIds,
    executionScope: input.executionScope,
    executionMode: input.executionMode
  });
  const openQuestions = buildOpenQuestions({
    input,
    mvpScope,
    forbiddenItems,
    testingRequirements,
    deliveryRequirements,
    securityBoundaries
  });

  return ProjectSpecSchema.parse({
    projectName,
    background: input.background?.trim() ?? "",
    rawDiscussion,
    mvpScope,
    forbiddenItems,
    techStackPreferences:
      techStackPreferences.length > 0 ? techStackPreferences : DEFAULT_STACK,
    targetAdapterType: selectedAdapterIds[0] ?? "codex",
    selectedAdapterIds,
    executionScope,
    executionMode,
    testingRequirements,
    deliveryRequirements,
    securityBoundaries,
    explicitRequirements: unique([
      ...mvpScope,
      ...testingRequirements,
      ...deliveryRequirements,
      ...extractExplicitRequirements(rawDiscussion)
    ]),
    inferredAssumptions,
    openQuestions,
    createdAt: now.toISOString()
  });
}

function normalizeList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return unique(value.map((item) => item.trim()).filter(Boolean));
  }

  if (!value) {
    return [];
  }

  return unique(
    value
      .split(/[\n,，;；]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function extractExplicitRequirements(rawDiscussion: string): string[] {
  return unique(
    rawDiscussion
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => {
        const lower = line.toLowerCase();
        return REQUIREMENT_MARKERS.some((marker) => lower.includes(marker));
      })
  );
}

function buildAssumptions({
  techStackPreferences,
  targetAdapterType,
  selectedAdapterIds,
  rawSelectedAdapterIds,
  executionScope,
  executionMode
}: {
  techStackPreferences: string[];
  targetAdapterType?: string;
  selectedAdapterIds: AgentAdapterId[];
  rawSelectedAdapterIds?: string | string[];
  executionScope?: string;
  executionMode?: string;
}): string[] {
  const assumptions: string[] = [];

  if (techStackPreferences.length === 0) {
    assumptions.push(
      "Use the recommended local v0.3.0 stack: Next.js, TypeScript, Zod, Vitest, pnpm."
    );
  }

  if (!rawSelectedAdapterIds && !targetAdapterType) {
    assumptions.push("Use Codex as the default v0.3.0 target adapter.");
  } else if (selectedAdapterIds.length === 1 && selectedAdapterIds[0] === "codex") {
    const requested = [
      ...normalizeList(rawSelectedAdapterIds),
      ...(targetAdapterType ? [targetAdapterType] : [])
    ];
    if (requested.some((id) => !AgentAdapterIdSchema.safeParse(id).success)) {
      assumptions.push("Use Codex because one or more requested target adapters are unsupported.");
    }
  }

  if (!executionScope) {
    assumptions.push("Use single phase execution scope by default for v0.3.0.");
  } else if (!["single_phase", "multi_phase", "end_to_end_delivery"].includes(executionScope)) {
    assumptions.push("Use single phase execution scope because the requested scope is unsupported.");
  }

  if (!executionMode) {
    assumptions.push("Use supervised execution mode by default for v0.3.0.");
  } else if (
    ![
      "supervised",
      "autonomous",
      "end_to_end_autonomous",
      "unified_autonomous",
      "codex_only",
      "manual"
    ].includes(executionMode)
  ) {
    assumptions.push("Use supervised execution mode because the requested mode is unsupported.");
  }

  return assumptions;
}

function normalizeSelectedAdapters(
  selectedAdapterIds: string | string[] | undefined,
  targetAdapterType: string | undefined
): AgentAdapterId[] {
  const requested = normalizeList(selectedAdapterIds);

  if (requested.length === 0 && targetAdapterType) {
    requested.push(targetAdapterType);
  }

  const supported = unique(
    requested.filter((id): id is AgentAdapterId => AgentAdapterIdSchema.safeParse(id).success)
  ) as AgentAdapterId[];

  return supported.length > 0 ? supported : DEFAULT_ADAPTERS;
}

function normalizeExecutionScope(value: string | undefined): ExecutionScope {
  if (
    value === "single_phase" ||
    value === "multi_phase" ||
    value === "end_to_end_delivery"
  ) {
    return value;
  }

  return DEFAULT_EXECUTION_SCOPE;
}

function normalizeExecutionMode(value: string | undefined): ExecutionMode {
  if (value === "autonomous" || value === "end_to_end_autonomous") {
    return value;
  }

  if (value === "unified_autonomous") {
    return "end_to_end_autonomous";
  }

  if (value === "supervised" || value === "codex_only" || value === "manual") {
    return DEFAULT_EXECUTION_MODE;
  }

  return DEFAULT_EXECUTION_MODE;
}

function buildOpenQuestions({
  input,
  mvpScope,
  forbiddenItems,
  testingRequirements,
  deliveryRequirements,
  securityBoundaries
}: {
  input: ProjectSpecInput;
  mvpScope: string[];
  forbiddenItems: string[];
  testingRequirements: string[];
  deliveryRequirements: string[];
  securityBoundaries: string[];
}): string[] {
  const questions: string[] = [];

  if (!input.projectName?.trim()) {
    questions.push("Confirm the project name.");
  }

  if (mvpScope.length === 0) {
    questions.push("Confirm the MVP scope.");
  }

  if (forbiddenItems.length === 0) {
    questions.push("Confirm forbidden items.");
  }

  if (testingRequirements.length === 0) {
    questions.push("Confirm testing requirements.");
  }

  if (deliveryRequirements.length === 0) {
    questions.push("Confirm delivery requirements.");
  }

  if (securityBoundaries.length === 0) {
    questions.push("Confirm security boundaries.");
  }

  return questions;
}

function textOrDefault(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}
