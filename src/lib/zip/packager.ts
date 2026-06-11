import { ZipArchive } from "archiver";

import { getSelectedAgentAdapterRegistryEntries } from "@/lib/adapters/registry";
import { generateAgentAdapters } from "@/lib/adapters/multi-target";
import {
  createProjectSpec,
  type ProjectSpecInput
} from "@/lib/core/project-spec";
import { generateDocsPack } from "@/lib/generators/docs-pack";
import { generateRuntimePack } from "@/lib/generators/runtime-pack";
import { generateScriptPack } from "@/lib/generators/script-pack";
import { generateTaskQueue } from "@/lib/generators/task-queue";
import {
  GeneratedPackSchema,
  type FileEntry,
  type GeneratedPack,
  type ProjectSpec,
  type TaskQueue
} from "@/lib/schemas/core";

type PackagerOptions = {
  now?: Date;
};

export function createExecutionPack(
  input: ProjectSpecInput,
  options: PackagerOptions = {}
): GeneratedPack {
  const projectSpec = createProjectSpec(input, options);
  const taskQueue = generateTaskQueue(projectSpec, options);
  const runtimePack = generateRuntimePack(projectSpec);
  const scriptPack = generateScriptPack(projectSpec);
  const agentAdapter = generateAgentAdapters(projectSpec, taskQueue, runtimePack);
  const docsPack = generateDocsPack(projectSpec, taskQueue, runtimePack);
  const files = [
    ...generateRootFiles(projectSpec, agentAdapter.files),
    ...generateCommonFiles(projectSpec, taskQueue),
    ...runtimePack.files,
    ...scriptPack.files,
    ...agentAdapter.files,
    ...docsPack.files
  ];

  return GeneratedPackSchema.parse({
    projectSpec,
    taskQueue,
    runtimePolicy: runtimePack.runtimePolicy,
    toolchainManifest: runtimePack.toolchainManifest,
    permissionPolicy: runtimePack.permissionPolicy,
    agentAdapter,
    files
  });
}

export async function createExecutionPackZip(
  input: ProjectSpecInput,
  options: PackagerOptions = {}
): Promise<{ pack: GeneratedPack; zipBuffer: Buffer }> {
  const pack = createExecutionPack(input, options);
  const zipBuffer = await createZipBuffer(pack.files);

  return { pack, zipBuffer };
}

export async function createZipBuffer(files: FileEntry[]): Promise<Buffer> {
  if (files.length === 0) {
    throw new Error("Cannot create a ZIP from an empty file list.");
  }

  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({
      zlib: { level: 9 }
    });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    });
    archive.on("error", reject);
    archive.on("warning", reject);
    archive.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    for (const entry of files) {
      archive.append(entry.content, { name: normalizeZipPath(entry.path) });
    }

    archive.finalize().catch(reject);
  });
}

function generateRootFiles(
  projectSpec: ProjectSpec,
  adapterFiles: FileEntry[]
): FileEntry[] {
  return [
    {
      path: "START_HERE.md",
      content: renderStartHere(projectSpec)
    },
    {
      path: "START_CODEX_AUTONOMOUS.cmd",
      content: renderStartCmd("START_CODEX_AUTONOMOUS.ps1")
    },
    {
      path: "START_CODEX_AUTONOMOUS.ps1",
      content: renderStartPowerShell("autonomous")
    },
    {
      path: "START_CODEX_SUPERVISED.cmd",
      content: renderStartCmd("START_CODEX_SUPERVISED.ps1")
    },
    {
      path: "START_CODEX_SUPERVISED.ps1",
      content: renderStartPowerShell("supervised")
    },
    {
      path: "EXECUTION_PACK_MANIFEST.md",
      content: renderExecutionPackManifest(projectSpec, adapterFiles)
    }
  ];
}

function renderStartHere(projectSpec: ProjectSpec): string {
  return `# Start Here

Project: ${projectSpec.projectName}

This execution pack is meant to be run from the customer point of view after unzipping it into a project workspace.

## Start Codex

Use exactly one root launcher for one workspace.

\`\`\`powershell
./START_CODEX_AUTONOMOUS.ps1
\`\`\`

\`\`\`cmd
START_CODEX_AUTONOMOUS.cmd
\`\`\`

Use START_CODEX_SUPERVISED.ps1 or START_CODEX_SUPERVISED.cmd when a human wants interactive approval prompts.

## What The Launcher Shows

- project name
- selected AI adapter
- current lifecycle phase
- current target version
- current task
- log updated time
- release output status
- completion gate status
- blocked/known issue status
- final PASS or FAIL summary

## Customer Validation

\`\`\`powershell
./scripts/verify-customer-delivery.ps1
\`\`\`

\`\`\`bash
bash scripts/verify-customer-delivery.sh
\`\`\`

The verifier updates runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md.

## Safety

Use one selected AI adapter at a time. Generated Claude Code, Trae, and Cursor directories are independent export options, not collaborators. Do not run multiple agents against the same workspace unless a human manually coordinates ownership.
`;
}

function renderStartCmd(scriptName: string): string {
  return `@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0${scriptName}"
exit /b %ERRORLEVEL%
`;
}

function renderStartPowerShell(mode: "autonomous" | "supervised"): string {
  return `$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot
Set-Location $RootDir

& (Join-Path $RootDir "scripts/run-customer-autonomous.ps1") -Mode ${mode}
`;
}

function generateCommonFiles(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue
): FileEntry[] {
  return [
    {
      path: "common/PROJECT_SPEC.md",
      content: `# Project Spec

\`\`\`json
${JSON.stringify(projectSpec, null, 2)}
\`\`\`
`
    },
    {
      path: "common/TASK_QUEUE.md",
      content: renderTaskQueue(taskQueue)
    },
    {
      path: "common/EXECUTION_RULES.md",
      content: `# Execution Rules

1. Follow TASK_QUEUE.md in order.
2. Do not expand the MVP scope.
3. Write assumptions to ASSUMPTIONS.md when details are unknown.
4. Write blockers to BLOCKERS.md only when work cannot continue.
5. Queue high-risk commands in runtime/APPROVAL_QUEUE.md.
6. Run only commands allowed by runtime/SAFE_COMMANDS.md during autonomous execution.
7. Do not run commands listed in runtime/DENIED_COMMANDS.md.
8. Run scripts/finalize.* before final delivery.
9. Run the Autonomous Completion Gate and review runtime/AUTONOMOUS_VERIFICATION_REPORT.md before reporting success.
10. Selecting multiple adapters means generating multiple independent execution options; choose one adapter for a workspace.
11. Run scripts/verify-customer-delivery.* before accepting final customer delivery.
`
    },
    {
      path: "common/AUTONOMOUS_DELIVERY_ROADMAP.md",
      content: renderAutonomousDeliveryRoadmap(projectSpec)
    },
    {
      path: "common/VERSION_LADDER.md",
      content: renderVersionLadder(projectSpec)
    },
    {
      path: "common/PHASE_GATE_PLAN.md",
      content: renderPhaseGatePlan(projectSpec)
    },
    {
      path: "common/CURRENT_PHASE.md",
      content: renderCurrentPhase(projectSpec)
    },
    {
      path: "common/SELF_REVIEW.md",
      content: `# Self Review

- [ ] Scope matches PROJECT_SPEC.md.
- [ ] Tests cover core behavior.
- [ ] Generated docs are complete.
- [ ] High-risk commands were not executed without approval.
- [ ] Finalize script was run before delivery.
`
    },
    {
      path: "common/FINAL_DELIVERY_CHECK.md",
      content: `# Final Delivery Check

- [ ] Project runs locally.
- [ ] Tests pass.
- [ ] Build passes.
- [ ] Runtime policy reviewed.
- [ ] scripts/finalize.* completed.
- [ ] ZIP artifact generated.
- [ ] Unified autonomous runner summary reviewed.
- [ ] Autonomous Completion Gate reports PASS.
`
    },
    {
      path: "common/ASSUMPTIONS.md",
      content: `# Assumptions

${asBullets(projectSpec.inferredAssumptions)}
`
    },
    {
      path: "common/BLOCKERS.md",
      content: `# Blockers

| Time | Severity | Status | Blocker | Impact | Needed Input |
|---|---|---|---|---|---|
`
    },
    {
      path: "common/KNOWN_ISSUES.md",
      content: `# Known Issues

No open P0/P1 blockers are recorded at pack generation time.

| Severity | Status | Issue | Recommendation |
|---|---|---|---|
| None | closed | No known issue recorded yet. | Continue customer runtime validation. |
`
    },
    {
      path: "common/PROGRESS_LOG.md",
      content: `# Progress Log

| Time | Task | Status | Notes |
|---|---|---|---|
| generated | execution pack | pending | Start with TASK-001. |
`
    },
    {
      path: "common/HANDOFF.md",
      content: `# Handoff

This pack is generated for ${formatSelectedAdapters(projectSpec)} target execution of ${projectSpec.projectName}.

Execution scope: ${projectSpec.executionScope}
Selected execution mode: ${projectSpec.executionMode}

Use EXECUTION_PACK_MANIFEST.md, common/TASK_QUEUE.md, common/PHASE_GATE_PLAN.md, runtime/PERMISSION_POLICY.yaml, runtime/SAFE_COMMANDS.md, runtime/DENIED_COMMANDS.md, runtime/AUTONOMOUS_COMPLETION_GATE.md, runtime/RUN_STATE.json, and the selected adapter directory as the source of truth.
`
    }
  ];
}

function renderExecutionPackManifest(
  projectSpec: ProjectSpec,
  adapterFiles: FileEntry[]
): string {
  const entries = getSelectedAgentAdapterRegistryEntries(projectSpec.selectedAdapterIds);
  const generatedFileSummary = [
    "START_HERE.md and START_CODEX_* root launchers for customer entry",
    "common/ project specifications, task queue, autonomous roadmap, and phase gates",
    "runtime/ permission policy, lifecycle run state, current task, phase reports, and completion reports",
    "scripts/ platform scripts, customer runner, delivery verifier, and completion-gate verification",
    "agent_adapters/ independent adapter directories for selected targets",
    "docs/ customer-facing run and delivery documentation"
  ];

  return `# Execution Pack Manifest

Project: ${projectSpec.projectName}

## Selected adapters

${entries.map((entry) => `- ${entry.displayName} (${entry.id}) -> ${entry.generatedAdapterDirectory}`).join("\n")}

Selecting multiple adapters means generating multiple independent execution options. It does not mean running multiple agents together.

Choose one adapter when executing against a workspace. Do not run multiple agents against the same workspace at the same time unless a human manually coordinates ownership.

## Execution Configuration

- Execution scope: ${projectSpec.executionScope}
- Execution mode: ${projectSpec.executionMode}

## Generated Files Summary

${generatedFileSummary.map((item) => `- ${item}`).join("\n")}

Adapter file count: ${adapterFiles.length}

## How To Start One Selected Agent

1. Pick exactly one adapter directory under agent_adapters/.
2. Read START_HERE.md.
3. Run one root-level launcher such as START_CODEX_AUTONOMOUS.ps1.
4. Let the selected adapter follow common/AUTONOMOUS_DELIVERY_ROADMAP.md, common/PHASE_GATE_PLAN.md, runtime/FULL_LIFECYCLE_RUN_STATE.json, and runtime/COMPLETION_GATE_REPORT.md.
5. Continue until scripts/verify-customer-delivery.* and runtime/COMPLETION_GATE_REPORT.md report PASS.

## Completion Gate Requirements

${entries
  .flatMap((entry) => entry.completionGateRequirements.map((item) => `- ${entry.displayName}: ${item}`))
  .join("\n")}
- runtime/RUN_STATE.json must be valid JSON.
- runtime/FULL_LIFECYCLE_RUN_STATE.json, runtime/VERSION_LADDER.json, and runtime/PHASE_STATUS.json must be coherent JSON.
- runtime/CURRENT_TASK.md must exist.
- runtime/PHASE_GATE_REPORT.md and runtime/COMPLETION_GATE_REPORT.md must be initialized or updated.
- runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md must record PASS before customer delivery is accepted.

## High-Risk Command Policy

High-risk commands are not executed automatically. Record them in runtime/APPROVAL_QUEUE.md with risk, reason, blocking status, and recommendation, then continue safe independent work when possible.
`;
}

function renderAutonomousDeliveryRoadmap(projectSpec: ProjectSpec): string {
  return `# Autonomous Delivery Roadmap

Project: ${projectSpec.projectName}

This roadmap adapts the generic AIMart delivery ladder to the supplied ProjectSpec. Assumptions stay explicit so the selected AI can continue without repeated human prompting for ordinary work.

## Project Context

- Background: ${projectSpec.background || "Not specified"}
- MVP scope: ${asBullets(projectSpec.mvpScope)}
- Forbidden items: ${asBullets(projectSpec.forbiddenItems)}
- Testing requirements: ${asBullets(projectSpec.testingRequirements)}
- Delivery requirements: ${asBullets(projectSpec.deliveryRequirements)}
- Security boundaries: ${asBullets(projectSpec.securityBoundaries)}

## Assumptions

${asBullets(projectSpec.inferredAssumptions)}

## Version Path

- v0.0.1 discovery/spec: confirm scope, constraints, assumptions, and task queue.
- v0.1.0 MVP implementation: build the smallest usable local product matching the ProjectSpec.
- v0.2.x autonomous runtime and completion gates: add safe autonomous execution, reports, and verification gates.
- v0.3.x multi-agent independent adapters: generate independent adapter options for Codex, Claude Code, Trae, and Cursor.
- v0.4.x runner hardening: improve resilience, resumability, logs, and blocked-command handling.
- v0.5.x delivery automation: freeze releases, generate checksums, sample packs, and handoff reports.
- v1.0 final usable delivery: complete acceptance criteria, final verification, docs, and release handoff.

The selected AI advances only after the phase Completion Gate reports PASS.
`;
}

function renderVersionLadder(projectSpec: ProjectSpec): string {
  return `# Version Ladder

Project: ${projectSpec.projectName}

| Version | Purpose | Gate |
|---|---|---|
| v0.0.1 | Discovery/spec | ProjectSpec, assumptions, and task queue reviewed. |
| v0.1.0 | MVP implementation | Core workflow works locally with tests. |
| v0.2.x | Autonomous runtime and completion gates | Runtime policy, safe commands, reports, and gates pass. |
| v0.3.x | Multi-agent independent adapters | Selected adapter directories, runbooks, prompts, and manifest pass. |
| v0.4.x | Runner hardening | Resume, logs, blocked-command handling, and recovery pass. |
| v0.5.x | Delivery automation | Release freeze, source/sample ZIPs, checksums, and handoff pass. |
| v1.0 | Final usable delivery | Full acceptance criteria and final delivery gate PASS. |
`;
}

function renderPhaseGatePlan(projectSpec: ProjectSpec): string {
  return `# Phase Gate Plan

Project: ${projectSpec.projectName}

Each phase must define current tasks, run relevant tests, update runtime/RUN_STATE.json, and write PASS or FAIL to runtime/COMPLETION_GATE_REPORT.md.

## Required Phase Files

- common/CURRENT_PHASE.md
- runtime/CURRENT_TASK.md
- runtime/PHASE_GATE_REPORT.md
- runtime/COMPLETION_GATE_REPORT.md
- runtime/MORNING_REPORT.md
- runtime/HANDOFF_TO_NEXT_VERSION.md

## Gate Checklist

- Scope remains inside the ProjectSpec.
- Forbidden items remain excluded.
- Required tests pass.
- Completion Gate report is current.
- High-risk commands are queued, not executed automatically.
- Next-version handoff is updated before advancing.
`;
}

function renderCurrentPhase(projectSpec: ProjectSpec): string {
  return `# Current Phase

Project: ${projectSpec.projectName}

Current phase: v0.0.1 discovery/spec

Selected adapters: ${formatSelectedAdapters(projectSpec)}
Execution scope: ${projectSpec.executionScope}
Execution mode: ${projectSpec.executionMode}

Advance only after runtime/COMPLETION_GATE_REPORT.md records PASS.
`;
}

function renderTaskQueue(taskQueue: TaskQueue): string {
  return `# Task Queue

Generated for: ${taskQueue.sourceProjectName}

${taskQueue.tasks
  .map(
    (task) => `## ${task.id} ${task.title}

- Status: ${task.status}
- Phase: ${task.phase}
- Risk: ${task.riskLevel}
- Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(", ") : "none"}
- Test command: \`${task.testCommand}\`
- Rollback: ${task.rollbackNote}

### Done Criteria

${asBullets(task.doneCriteria)}
`
  )
  .join("\n")}
`;
}

function normalizeZipPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");

  if (
    normalized === "" ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Unsafe ZIP path: ${path}`);
  }

  return normalized;
}

function asBullets(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function formatSelectedAdapters(projectSpec: ProjectSpec): string {
  return getSelectedAgentAdapterRegistryEntries(projectSpec.selectedAdapterIds)
    .map((entry) => entry.displayName)
    .join(", ");
}
