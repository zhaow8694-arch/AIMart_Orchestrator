import { ProjectSpecSchema, type ProjectSpec } from "@/lib/schemas/core";

export type ProjectSpecInput = {
  projectName?: string;
  background?: string;
  rawDiscussion?: string;
  mvpScope?: string | string[];
  forbiddenItems?: string | string[];
  techStackPreferences?: string | string[];
  targetAdapterType?: string;
  executionMode?: string;
  testingRequirements?: string | string[];
  deliveryRequirements?: string | string[];
  securityBoundaries?: string | string[];
};

type CreateProjectSpecOptions = {
  now?: Date;
};

const DEFAULT_STACK = ["Next.js", "TypeScript", "Zod", "Vitest", "pnpm"];

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
  const testingRequirements = normalizeList(input.testingRequirements);
  const deliveryRequirements = normalizeList(input.deliveryRequirements);
  const securityBoundaries = normalizeList(input.securityBoundaries);

  const inferredAssumptions = buildAssumptions({
    techStackPreferences,
    targetAdapterType: input.targetAdapterType,
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
    targetAdapterType: "codex",
    executionMode: "codex_only",
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
  executionMode
}: {
  techStackPreferences: string[];
  targetAdapterType?: string;
  executionMode?: string;
}): string[] {
  const assumptions: string[] = [];

  if (techStackPreferences.length === 0) {
    assumptions.push(
      "Use the recommended local v0.1 stack: Next.js, TypeScript, Zod, Vitest, pnpm."
    );
  }

  if (!targetAdapterType || targetAdapterType !== "codex") {
    assumptions.push("Use Codex as the v0.1 target adapter.");
  }

  if (!executionMode || executionMode !== "codex_only") {
    assumptions.push("Use codex_only execution mode for v0.1.");
  }

  return assumptions;
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
