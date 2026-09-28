import yaml from "js-yaml";

import {
  PermissionPolicySchema,
  RuntimePolicySchema,
  ToolchainManifestSchema,
  type FileEntry,
  type PermissionPolicy,
  type ProjectSpec,
  type RuntimePolicy,
  type ToolchainManifest
} from "@/lib/schemas/core";

export type RuntimePack = {
  runtimePolicy: RuntimePolicy;
  toolchainManifest: ToolchainManifest;
  permissionPolicy: PermissionPolicy;
  files: FileEntry[];
};

export function generateRuntimePack(projectSpec: ProjectSpec): RuntimePack {
  const runtimePolicy = RuntimePolicySchema.parse({
    riskLevels: [
      {
        level: "L0",
        name: "read_only",
        description: "Read-only project inspection such as listing files or checking status.",
        defaultAction: "allow"
      },
      {
        level: "L1",
        name: "project_safe",
        description: "Project-local install, lint, test, and build commands.",
        defaultAction: "allow"
      },
      {
        level: "L2",
        name: "recoverable_project_change",
        description: "Project-local generated files, formatting, or lockfile updates.",
        defaultAction: "allow"
      },
      {
        level: "L3",
        name: "environment_change",
        description: "Docker, database migrations, or system-level dependency changes.",
        defaultAction: "queue_for_approval"
      },
      {
        level: "L4",
        name: "external_resource_change",
        description: "Remote Git, deployment, cloud, or PR merge operations.",
        defaultAction: "queue_for_approval"
      },
      {
        level: "L5",
        name: "destructive_or_secret_access",
        description: "Destructive commands or commands that read secrets.",
        defaultAction: "deny"
      }
    ],
    defaultAllowedCommands: [
      "git status",
      "git diff",
      "pnpm install",
      "pnpm lint",
      "pnpm test",
      "pnpm build",
      "scripts/finalize.ps1",
      "scripts/finalize.sh",
      "scripts/verify-customer-delivery.ps1",
      "scripts/verify-customer-delivery.sh",
      "read ZIP entries",
      "local port lookup",
      "write current-version release artifacts",
      "node -v",
      "pnpm -v"
    ],
    approvalRequiredCommands: [
      "git push",
      "git push --tags",
      "gh pr create",
      "vercel deploy",
      "terraform apply",
      "kubectl apply",
      "production deployment",
      "real database migration",
      "cloud resource creation",
      "cloud resource deletion",
      "delete historical release folders"
    ],
    forbiddenCommands: [
      "rm -rf /",
      "sudo rm -rf",
      "cat ~/.ssh/*",
      "cat ~/.aws/*",
      "cat .env",
      "type .env",
      "Get-Content .env",
      "printenv",
      "terraform destroy",
      "kubectl delete",
      "git push",
      "git push --tags",
      "Remove-Item releases/v0.1.0",
      "Remove-Item releases/v0.1.1",
      "Remove-Item releases/v0.2.1",
      "Remove-Item releases/v0.2.2",
      "Remove-Item releases/v0.3.0"
    ]
  });

  const toolchainManifest = ToolchainManifestSchema.parse({
    runtime: "Node.js 20+",
    packageManager: "pnpm",
    language: "TypeScript",
    frameworks:
      projectSpec.techStackPreferences.length > 0
        ? projectSpec.techStackPreferences
        : ["Next.js"],
    testRunner: "Vitest",
    requiredCommands: ["pnpm install", "pnpm lint", "pnpm test", "pnpm build"]
  });

  const permissionPolicy = PermissionPolicySchema.parse({
    levels: runtimePolicy.riskLevels,
    commandRules: [
      ...runtimePolicy.defaultAllowedCommands.map((command) => ({
        command,
        riskLevel: command.startsWith("git ") ? "L0" : "L1",
        action: "allow",
        reason: "Allowed project-local verification or read-only command."
      })),
      ...runtimePolicy.approvalRequiredCommands.map((command) => ({
        command,
        riskLevel: "L4",
        action: "queue_for_approval",
        reason: "External resource changes require explicit approval."
      })),
      ...runtimePolicy.forbiddenCommands.map((command) => ({
        command,
        riskLevel: "L5",
        action: "deny",
        reason: "Secret access or destructive operation is forbidden by default."
      }))
    ]
  });

  const files: FileEntry[] = [
    {
      path: "runtime/TOOLCHAIN_MANIFEST.yaml",
      content: yaml.dump(toolchainManifest, { lineWidth: 100 })
    },
    {
      path: "runtime/INSTALL_PLAN.md",
      content: renderInstallPlan(projectSpec, toolchainManifest)
    },
    {
      path: "runtime/PERMISSION_POLICY.yaml",
      content: yaml.dump(permissionPolicy, { lineWidth: 100 })
    },
    {
      path: "runtime/HIGH_RISK_COMMANDS.md",
      content: renderHighRiskCommands(runtimePolicy)
    },
    {
      path: "runtime/SAFE_COMMANDS.md",
      content: renderSafeCommands(runtimePolicy)
    },
    {
      path: "runtime/DENIED_COMMANDS.md",
      content: renderDeniedCommands(runtimePolicy)
    },
    {
      path: "runtime/APPROVAL_QUEUE.md",
      content: renderApprovalQueue()
    },
    {
      path: "runtime/AUTONOMOUS_EXECUTION_POLICY.md",
      content: renderAutonomousExecutionPolicy(projectSpec)
    },
    {
      path: "runtime/AUTONOMOUS_RUN_STATUS.md",
      content: renderAutonomousRunStatus(projectSpec)
    },
    {
      path: "runtime/AUTONOMOUS_RUN_SUMMARY.md",
      content: renderAutonomousRunSummary(projectSpec)
    },
    {
      path: "runtime/AUTONOMOUS_HEALTH_CHECK.md",
      content: renderAutonomousHealthCheck(projectSpec)
    },
    {
      path: "runtime/AUTONOMOUS_COMPLETION_GATE.md",
      content: renderAutonomousCompletionGate(projectSpec)
    },
    {
      path: "runtime/AUTONOMOUS_VERIFICATION_REPORT.md",
      content: renderAutonomousVerificationReport(projectSpec)
    },
    {
      path: "runtime/END_TO_END_AUTONOMOUS_POLICY.md",
      content: renderEndToEndAutonomousPolicy(projectSpec)
    },
    {
      path: "runtime/RUN_STATE.json",
      content: renderRunState(projectSpec)
    },
    {
      path: "runtime/RUNNER_STATE.json",
      content: renderRunnerState(projectSpec)
    },
    {
      path: "runtime/RUNNER_FAILURE_CLASSIFICATION.md",
      content: renderRunnerFailureClassification(projectSpec)
    },
    {
      path: "runtime/RUNNER_RECOVERY_POLICY.md",
      content: renderRunnerRecoveryPolicy(projectSpec)
    },
    {
      path: "runtime/RUNNER_NEXT_ACTION.md",
      content: renderRunnerNextAction(projectSpec)
    },
    {
      path: "runtime/RUNNER_FINAL_SUMMARY.md",
      content: renderRunnerFinalSummary(projectSpec)
    },
    {
      path: "runtime/FULL_LIFECYCLE_RUN_STATE.json",
      content: renderFullLifecycleRunState(projectSpec)
    },
    {
      path: "runtime/VERSION_LADDER.json",
      content: renderVersionLadderJson(projectSpec)
    },
    {
      path: "runtime/PHASE_STATUS.json",
      content: renderPhaseStatusJson(projectSpec)
    },
    {
      path: "runtime/CURRENT_TASK.md",
      content: renderCurrentTask(projectSpec)
    },
    {
      path: "runtime/CURRENT_PHASE.md",
      content: renderRuntimeCurrentPhase(projectSpec)
    },
    {
      path: "runtime/NEXT_ACTION.md",
      content: renderNextAction(projectSpec)
    },
    {
      path: "runtime/PHASE_GATE_REPORT.md",
      content: renderPhaseGateReport(projectSpec)
    },
    {
      path: "runtime/COMPLETION_GATE_REPORT.md",
      content: renderCompletionGateReport(projectSpec)
    },
    {
      path: "runtime/FINAL_DELIVERY_STATUS.md",
      content: renderFinalDeliveryStatus(projectSpec)
    },
    {
      path: "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md",
      content: renderCustomerRuntimeValidationReport(projectSpec)
    },
    {
      path: "runtime/MORNING_REPORT.md",
      content: renderMorningReport(projectSpec)
    },
    {
      path: "runtime/HANDOFF_TO_NEXT_VERSION.md",
      content: renderHandoffToNextVersion(projectSpec)
    },
    {
      path: "runtime/RUNTIME_STATUS.md",
      content: renderRuntimeStatus(projectSpec)
    },
    {
      path: "runtime/ROLLBACK_PLAN.md",
      content: renderRollbackPlan(projectSpec)
    }
  ];

  return {
    runtimePolicy,
    toolchainManifest,
    permissionPolicy,
    files
  };
}

function renderInstallPlan(
  projectSpec: ProjectSpec,
  manifest: ToolchainManifest
): string {
  return `# Install Plan

Project: ${projectSpec.projectName}

## Required Toolchain

- Runtime: ${manifest.runtime}
- Package manager: ${manifest.packageManager}
- Language: ${manifest.language}
- Frameworks: ${formatList(manifest.frameworks)}
- Test runner: ${manifest.testRunner}

## Commands

Run these from the project root:

\`\`\`bash
pnpm install
pnpm lint
pnpm test
pnpm build
\`\`\`

Do not install system dependencies or global packages without approval.
`;
}

function renderHighRiskCommands(runtimePolicy: RuntimePolicy): string {
  return `# High Risk Commands

The following commands must not run automatically. Queue them in APPROVAL_QUEUE.md first.

## Requires Approval

${runtimePolicy.approvalRequiredCommands.map((command) => `- \`${command}\``).join("\n")}

## Forbidden By Default

${runtimePolicy.forbiddenCommands.map((command) => `- \`${command}\``).join("\n")}
`;
}

function renderSafeCommands(runtimePolicy: RuntimePolicy): string {
  return `# Safe Commands

These commands are allowed for automated execution inside the generated execution pack when they stay within the project workspace.

## Dependency And Verification

- \`pnpm install\`
- \`pnpm lint\`
- \`pnpm test\`
- \`pnpm build\`

## Finalize And Packaging

- \`scripts/finalize.ps1\`
- \`scripts/finalize.sh\`
- \`powershell -ExecutionPolicy Bypass -File .\\scripts\\finalize.ps1\`
- Writing current-version release artifacts under the current release folder only.

> \`-ExecutionPolicy Bypass\` applies to that one PowerShell process only and does not change your machine's execution policy. It lets the pack launch straight from a downloaded ZIP without a manual unblock step.

## Read-Only Inspection

- \`git status\`
- \`git diff\`
- Read generated ZIP entries for structure verification; this includes reading zip entries during automated checks.
- Read local port and PID information for local development servers.

## Policy Source

${runtimePolicy.defaultAllowedCommands.map((command) => `- \`${command}\``).join("\n")}
`;
}

function renderDeniedCommands(runtimePolicy: RuntimePolicy): string {
  return `# Denied Commands

The following commands and action categories are forbidden for automated execution. Queue L4 items in runtime/APPROVAL_QUEUE.md when they are truly needed; never run L5 secret access or destructive commands.

## Forbidden Automation Categories

- \`git push\` and remote tag publishing.
- Deleting or modifying historical release folders.
- Reading secrets such as \`.env\`, SSH keys, cloud credentials, or system credentials.
- Production deployment.
- Real database migration.
- Cloud resource creation or deletion.

## Denied Or Approval-Controlled Commands

${[...runtimePolicy.approvalRequiredCommands, ...runtimePolicy.forbiddenCommands]
  .map((command) => `- \`${command}\``)
  .join("\n")}
`;
}

function renderApprovalQueue(): string {
  return `# Approval Queue

High-risk or external-resource actions are recorded here before execution.

Autonomous mode must continue with other safe tasks after writing a queued item here. Do not wait indefinitely when unrelated work can proceed.

| Time | Requested Action | Risk Level | Reason | Blocking? | Status |
|---|---|---|---|---|---|
`;
}

function renderAutonomousExecutionPolicy(projectSpec: ProjectSpec): string {
  return `# Autonomous Execution Policy

Project: ${projectSpec.projectName}
Selected execution mode: ${projectSpec.executionMode}

## Codex Sandbox

- Autonomous Mode uses Codex with \`workspace-write\` sandboxing and \`approval never\`.
- Supervised Mode uses Codex with \`workspace-write\` sandboxing and \`approval on-request\`.
- Dangerous bypass, full-access, or unrestricted sandbox modes are forbidden.

## Automation Rules

1. Run only commands listed in runtime/SAFE_COMMANDS.md without approval.
2. Record denied or approval-controlled actions in runtime/APPROVAL_QUEUE.md.
3. Continue safe independent work after queueing a high-risk command.
4. Write logs under .aimart/logs or another project-local logs directory.
5. Do not read secrets, run production deployment, perform real database migrations, or create/delete cloud resources.

## Required Finalization

Before delivery, run the platform-specific finalize script and record the outcome in common/PROGRESS_LOG.md.
`;
}

function renderAutonomousRunStatus(projectSpec: ProjectSpec): string {
  return `# Autonomous Run Status

Project: ${projectSpec.projectName}
Selected execution mode: ${projectSpec.executionMode}

This file is updated by the one-window unified autonomous runner while Codex is running.

| Field | Value |
|---|---|
| Runner state | pending |
| Elapsed time | pending |
| Git branch | pending |
| Dirty file count | pending |
| Latest log tail | pending |
| Release directory status | pending |
| Known issues status | pending |
| Last updated | pending |
`;
}

function renderAutonomousRunSummary(projectSpec: ProjectSpec): string {
  return `# Autonomous Run Summary

Project: ${projectSpec.projectName}
Selected execution mode: ${projectSpec.executionMode}

This file is updated when the one-window unified autonomous runner exits.

| Field | Value |
|---|---|
| Exit code | pending |
| Release artifacts | pending |
| Sample execution pack | pending |
| Git status | pending |
| Next recommended action | Start agent_adapters/codex/run-codex-unified-autonomous for the unified run. |
`;
}

function renderAutonomousHealthCheck(projectSpec: ProjectSpec): string {
  return `# Autonomous Health Check

Project: ${projectSpec.projectName}

The unified autonomous runner provides a single-window status display and writes logs under codex_runs.

## Checks

- [ ] Codex process started.
- [ ] codex_runs log file was created.
- [ ] runtime/AUTONOMOUS_RUN_STATUS.md was updated during execution.
- [ ] runtime/AUTONOMOUS_RUN_SUMMARY.md was updated at completion.
- [ ] Release directory status was checked.
- [ ] Known issues status was checked.
- [ ] No secret files or cloud credentials were read.
`;
}

function renderAutonomousCompletionGate(projectSpec: ProjectSpec): string {
  return `# Autonomous Completion Gate

Project: ${projectSpec.projectName}
Selected execution mode: ${projectSpec.executionMode}

The autonomous runner must not report success until this gate passes.

## Required Gates

- Run \`pnpm test\`.
- Run \`pnpm lint\`.
- Run \`pnpm build\`.
- Confirm the target release directory exists.
- Confirm the source ZIP exists.
- Confirm the sample execution-pack ZIP exists.
- Confirm SHA256.txt and RELEASE_MANIFEST.txt exist.
- Confirm SHA256 values match the actual source ZIP and sample execution-pack ZIP hashes.
- Confirm the source ZIP excludes node_modules, .next, .git, codex_runs, temporary verification directories, old releases, .env files, and secret files.
- Confirm the sample execution-pack ZIP contains required common, runtime, scripts, Codex adapter, and docs files.
- Confirm selected adapter directories exist.
- Confirm each selected adapter has a runbook and task prompt or rules prompt.
- Confirm EXECUTION_PACK_MANIFEST.md exists.
- Confirm runtime/RUN_STATE.json exists and is valid JSON.
- Confirm runtime/CURRENT_TASK.md exists.
- Confirm runtime/PHASE_GATE_REPORT.md and runtime/COMPLETION_GATE_REPORT.md exist or are initialized.
- Confirm historical release folders are not modified.
- Confirm final delivery documents exist.
- Report git status.
- Confirm the target version tag exists and points to the final commit.

## Result

Record PASS or FAIL in runtime/AUTONOMOUS_VERIFICATION_REPORT.md before final delivery.
`;
}

function renderAutonomousVerificationReport(projectSpec: ProjectSpec): string {
  return `# Autonomous Verification Report

Project: ${projectSpec.projectName}

| Gate | Status | Notes |
|---|---|---|
| pnpm test | pending | PASS or FAIL is written by the runner. |
| pnpm lint | pending | PASS or FAIL is written by the runner. |
| pnpm build | pending | PASS or FAIL is written by the runner. |
| release artifacts | pending | Source ZIP, sample execution-pack ZIP, SHA256.txt, and RELEASE_MANIFEST.txt. |
| source ZIP verification | pending | Exclusions and SHA256 must match. |
| sample execution-pack verification | pending | Required files must be present. |
| historical release protection | pending | Frozen release folders must be unchanged. |
| final delivery documents | pending | Required delivery evidence must exist. |
| local tag | pending | Target version tag must point to final commit. |

Final result: pending
`;
}

function renderEndToEndAutonomousPolicy(projectSpec: ProjectSpec): string {
  return `# End-to-End Autonomous Policy

Project: ${projectSpec.projectName}
Execution scope: ${projectSpec.executionScope}
Execution mode: ${projectSpec.executionMode}

## Purpose

End-to-End Autonomous Delivery lets one selected AI agent continue from v0.0.1 discovery/spec to v1.0 final usable delivery without repeated human prompting for ordinary safe work.

## Rules

1. Choose one adapter for one workspace.
2. Do not run multiple agents against the same workspace unless a human manually coordinates ownership.
3. Follow common/AUTONOMOUS_DELIVERY_ROADMAP.md and common/PHASE_GATE_PLAN.md.
4. Update runtime/RUN_STATE.json and runtime/CURRENT_TASK.md before and after each task.
5. Run a Completion Gate at every phase boundary.
6. Record PASS or FAIL in runtime/COMPLETION_GATE_REPORT.md.
7. Queue high-risk commands in runtime/APPROVAL_QUEUE.md and continue safe independent work.
8. Do not read secrets, deploy production, run real database migrations, or create/delete cloud resources.

## Version Ladder

- v0.0.1 discovery/spec
- v0.1.0 MVP implementation
- v0.2.x autonomous runtime and completion gates
- v0.3.x multi-agent independent adapters
- v0.4.x runner hardening
- v0.5.x delivery automation
- v1.0 final usable delivery
`;
}

function renderRunState(projectSpec: ProjectSpec): string {
  return `${JSON.stringify(
    {
      projectName: projectSpec.projectName,
      executionScope: projectSpec.executionScope,
      executionMode: projectSpec.executionMode,
      selectedAdapterIds: projectSpec.selectedAdapterIds,
      currentPhase: "v0.0.1",
      currentTaskId: "TASK-001",
      phaseGateStatus: "pending",
      completionGateStatus: "pending",
      finalResult: "pending",
      updatedAt: projectSpec.createdAt
    },
    null,
    2
  )}
`;
}

function renderRunnerState(projectSpec: ProjectSpec): string {
  return `${JSON.stringify(
    {
      projectName: projectSpec.projectName,
      runnerVersion: "v0.3.2",
      approvedCommand:
        "powershell -ExecutionPolicy Bypass -File .\\scripts\\run-autonomous-version.ps1 -TargetVersion v1.0",
      currentStage: "PREFLIGHT",
      stages: runnerStages(),
      runStartedAt: projectSpec.createdAt,
      artifactHashes: {},
      staleArtifactProtection: "regenerate artifacts or verify artifact timestamp after run start with newly recorded hash",
      oldRunnerPrevention:
        "Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners.",
      lastFailureClassification: "none",
      completionGateStatus: "pending",
      finalResult: "pending",
      updatedAt: projectSpec.createdAt
    },
    null,
    2
  )}
`;
}

function renderRunnerFailureClassification(projectSpec: ProjectSpec): string {
  return `# Runner Failure Classification

Project: ${projectSpec.projectName}

The stable v0.3.2 runner classifies failures before choosing recovery. Do not create old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners; use scripts/classify-runner-failure.* and scripts/run-autonomous-version.*.

## Categories

${runnerFailureCategories().map((category) => `- ${category}`).join("\n")}

## Output Contract

The classifier writes one category plus a short diagnostic. Unknown failures are treated as COMPLETION_GATE_FAILURE until a narrower category is added in a future version.
`;
}

function renderRunnerRecoveryPolicy(projectSpec: ProjectSpec): string {
  return `# Runner Recovery Policy

Project: ${projectSpec.projectName}

## Policy

1. Use the single approved runner command.
2. Update runtime/RUNNER_STATE.json before each stage.
3. Classify any failure with scripts/classify-runner-failure.*.
4. Write the classified failure to runtime/RUNNER_FAILURE_CLASSIFICATION.md.
5. Continue safe independent checks after non-blocking failures.
6. Do not validate stale source or sample ZIPs; regenerate artifacts or verify timestamps are after the run start and hashes are newly recorded.
7. Do not modify historical release folders.
8. Do not create old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners.

## Stage Order

${runnerStages().map((stage, index) => `${index + 1}. ${stage}`).join("\n")}
`;
}

function renderRunnerNextAction(projectSpec: ProjectSpec): string {
  return `# Runner Next Action

Project: ${projectSpec.projectName}

Use exactly this approved command for autonomous version execution:

Approved runner script path: scripts/run-autonomous-version.ps1

\`\`\`powershell
powershell -ExecutionPolicy Bypass -File .\\scripts\\run-autonomous-version.ps1 -TargetVersion v1.0
\`\`\`

> \`-ExecutionPolicy Bypass\` applies to that one PowerShell process only and does not change your machine's execution policy. It lets the pack launch straight from a downloaded ZIP without a manual unblock step.

Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners.

Next stage: PREFLIGHT
`;
}

function renderRunnerFinalSummary(projectSpec: ProjectSpec): string {
  return `# Runner Final Summary

Project: ${projectSpec.projectName}

| Field | Value |
|---|---|
| Runner version | v0.3.2 |
| Final result | pending |
| Last completed stage | pending |
| Last failure classification | none |
| Source ZIP hash | pending |
| Sample pack hash | pending |
| Completion Gate | pending |

The final summary is valid only after FREEZE completes and the Completion Gate reports PASS.
`;
}

function renderFullLifecycleRunState(projectSpec: ProjectSpec): string {
  const selectedAdapterId = projectSpec.selectedAdapterIds[0] ?? "codex";

  return `${JSON.stringify(
    {
      projectName: projectSpec.projectName,
      selectedAdapterId,
      selectedAdapterIds: projectSpec.selectedAdapterIds,
      executionScope: projectSpec.executionScope,
      executionMode: projectSpec.executionMode,
      currentLifecyclePhase: "v0.0.1 discovery/spec",
      currentTargetVersion: "v0.0.1",
      currentTaskId: "TASK-001",
      currentTask: "Read START_HERE.md, confirm ProjectSpec, and initialize the first phase plan.",
      logUpdatedAt: projectSpec.createdAt,
      releaseOutputStatus: "pending",
      completionGateStatus: "pending",
      blockedStatus: "none",
      knownIssueStatus: "none",
      finalDeliveryStatus: "pending",
      customerRuntimeValidationStatus: "pending",
      updatedAt: projectSpec.createdAt
    },
    null,
    2
  )}
`;
}

function renderVersionLadderJson(projectSpec: ProjectSpec): string {
  return `${JSON.stringify(
    {
      projectName: projectSpec.projectName,
      versions: [
        {
          version: "v0.0.1",
          phase: "discovery/spec",
          gate: "ProjectSpec, assumptions, and task queue are coherent."
        },
        {
          version: "v0.1.0",
          phase: "MVP implementation",
          gate: "Core workflow runs locally with tests."
        },
        {
          version: "v0.2.x",
          phase: "autonomous runtime and completion gates",
          gate: "Safe commands, reports, and completion gates pass."
        },
        {
          version: "v0.3.x",
          phase: "independent adapter options",
          gate: "Selected adapter directories, runbooks, prompts, and manifest pass."
        },
        {
          version: "v0.4.x",
          phase: "runner hardening",
          gate: "Resume, logs, blocked command handling, and recovery pass."
        },
        {
          version: "v0.5.x",
          phase: "delivery automation",
          gate: "Release freeze, source/sample ZIPs, checksums, and handoff pass."
        },
        {
          version: "v1.0",
          phase: "final usable delivery",
          gate: "Full acceptance criteria and final delivery gate PASS."
        }
      ]
    },
    null,
    2
  )}
`;
}

function renderPhaseStatusJson(projectSpec: ProjectSpec): string {
  return `${JSON.stringify(
    {
      projectName: projectSpec.projectName,
      phases: [
        {
          phase: "v0.0.1 discovery/spec",
          targetVersion: "v0.0.1",
          status: "current",
          completionGateStatus: "pending"
        },
        {
          phase: "v0.1.0 MVP implementation",
          targetVersion: "v0.1.0",
          status: "pending",
          completionGateStatus: "pending"
        },
        {
          phase: "v0.2.x autonomous runtime and completion gates",
          targetVersion: "v0.2.x",
          status: "pending",
          completionGateStatus: "pending"
        },
        {
          phase: "v0.3.x independent adapter options",
          targetVersion: "v0.3.x",
          status: "pending",
          completionGateStatus: "pending"
        },
        {
          phase: "v0.4.x runner hardening",
          targetVersion: "v0.4.x",
          status: "pending",
          completionGateStatus: "pending"
        },
        {
          phase: "v0.5.x delivery automation",
          targetVersion: "v0.5.x",
          status: "pending",
          completionGateStatus: "pending"
        },
        {
          phase: "v1.0 final usable delivery",
          targetVersion: "v1.0",
          status: "pending",
          completionGateStatus: "pending"
        }
      ]
    },
    null,
    2
  )}
`;
}

function renderCurrentTask(projectSpec: ProjectSpec): string {
  return `# Current Task

Project: ${projectSpec.projectName}

End-to-End current phase: v0.0.1 discovery/spec

Current task: TASK-001

Version ladder target: v1.0 final usable delivery.

## Completion Gate

Before advancing, update runtime/COMPLETION_GATE_REPORT.md with PASS or FAIL.
`;
}

function renderRuntimeCurrentPhase(projectSpec: ProjectSpec): string {
  return `# Current Phase

Project: ${projectSpec.projectName}

End-to-End current phase: v0.0.1 discovery/spec
Current target version: v0.0.1
Selected adapter: ${projectSpec.selectedAdapterIds[0] ?? "codex"}

The selected AI advances through the version ladder only after the phase Completion Gate records PASS.

Version ladder target: v1.0 final usable delivery.
`;
}

function renderNextAction(projectSpec: ProjectSpec): string {
  return `# Next Action

Project: ${projectSpec.projectName}

End-to-End next action: read START_HERE.md, run one root-level launcher, then let the selected AI initialize v0.0.1 discovery/spec.

Current task: TASK-001
Current target version: v0.0.1
Completion Gate: pending

When the phase gate passes, update runtime/FULL_LIFECYCLE_RUN_STATE.json and advance toward v1.0 final usable delivery.
`;
}

function renderPhaseGateReport(projectSpec: ProjectSpec): string {
  return `# Phase Gate Report

Project: ${projectSpec.projectName}

End-to-End phase: v0.0.1 discovery/spec

| Phase | Status | Completion Gate | Notes |
|---|---|---|---|
| v0.0.1 | pending | pending | Initialize ProjectSpec and task queue. |
| v0.1.0 | pending | pending | MVP implementation. |
| v0.2.x | pending | pending | Autonomous runtime and completion gates. |
| v0.3.x | pending | pending | Multi-agent independent adapters. |
| v0.4.x | pending | pending | Runner hardening. |
| v0.5.x | pending | pending | Delivery automation. |
| v1.0 | pending | pending | Final usable delivery. |
`;
}

function renderCompletionGateReport(projectSpec: ProjectSpec): string {
  return `# Completion Gate Report

Project: ${projectSpec.projectName}

End-to-End current phase: v0.0.1 discovery/spec

Version ladder target: v1.0 final usable delivery.

| Gate | Status | Notes |
|---|---|---|
| Project scope | pending | Confirm ProjectSpec scope. |
| Tests | pending | Run required checks for the phase. |
| Adapter files | pending | Verify selected adapters. |
| Runtime state | pending | Validate RUN_STATE.json. |
| Final result | pending | PASS or FAIL only. |

Final result: pending
`;
}

function renderFinalDeliveryStatus(projectSpec: ProjectSpec): string {
  return `# Final Delivery Status

Project: ${projectSpec.projectName}

End-to-End final delivery status: pending

| Field | Status |
|---|---|
| Current target version | v0.0.1 |
| Completion Gate | pending |
| Customer runtime validation | pending |
| Final result | pending |

Final usable delivery is not complete until the Completion Gate records PASS and the customer runtime validation report records PASS.

Version ladder target: v1.0 final usable delivery.
`;
}

function renderCustomerRuntimeValidationReport(projectSpec: ProjectSpec): string {
  return `# Customer Runtime Validation Report

Project: ${projectSpec.projectName}

End-to-End customer runtime validation starts as pending. Run scripts/verify-customer-delivery.ps1 or scripts/verify-customer-delivery.sh from the unpacked execution-pack root to update this report.

| Gate | Status | Notes |
|---|---|---|
| generated project files | pending | common/PROJECT_SPEC.md and common/TASK_QUEUE.md exist. |
| generated docs | pending | docs/README.md, docs/RUN_APP.md, and docs/SECURITY_AND_PERMISSIONS.md exist. |
| tests/build instructions | pending | docs or scripts explain test and build commands. |
| final artifact instructions | pending | package/finalize instructions exist. |
| BLOCKERS.md has no open P0/P1 blockers | pending | Checked by customer verifier. |
| KNOWN_ISSUES has no P0/P1 blockers | pending | Checked by customer verifier. |
| lifecycle state files are present and coherent | pending | FULL_LIFECYCLE_RUN_STATE.json, VERSION_LADDER.json, and PHASE_STATUS.json parse and agree. |
| selected adapter runbook exists | pending | Checked from selectedAdapterId. |
| completion gate report exists | pending | runtime/COMPLETION_GATE_REPORT.md exists. |

Final result: pending

Completion Gate: pending
Current target version: v0.0.1
Version ladder target: v1.0 final usable delivery.
`;
}

function renderMorningReport(projectSpec: ProjectSpec): string {
  return `# Morning Report

Project: ${projectSpec.projectName}

End-to-End autonomous status is pending.

## Today

- Current phase: v0.0.1 discovery/spec
- Current task: TASK-001
- Completion Gate: pending
- Final result: pending
`;
}

function renderHandoffToNextVersion(projectSpec: ProjectSpec): string {
  return `# Handoff To Next Version

Project: ${projectSpec.projectName}

End-to-End handoff starts at v0.0.1 and advances only after a Completion Gate PASS.

Version ladder target: v1.0 final usable delivery.

## Next Version

- Current phase: v0.0.1 discovery/spec
- Next phase after PASS: v0.1.0 MVP implementation
- Required report: runtime/COMPLETION_GATE_REPORT.md
- Required status: PASS or FAIL
`;
}

function renderRuntimeStatus(projectSpec: ProjectSpec): string {
  return `# Runtime Status

Project: ${projectSpec.projectName}

| Area | Status | Notes |
|---|---|---|
| Toolchain | pending | Run preflight before implementation. |
| Permissions | configured | Autonomous mode uses SAFE_COMMANDS, DENIED_COMMANDS, and APPROVAL_QUEUE. |
| Secrets | protected | Scripts must not read .env, SSH keys, or cloud credentials. |
`;
}

function renderRollbackPlan(projectSpec: ProjectSpec): string {
  return `# Rollback Plan

Project: ${projectSpec.projectName}

1. Stop running local dev servers.
2. Restore project-local files from the latest backup.
3. Remove generated artifacts only inside the project directory.
4. If a local release tag must be removed, document the reason before deleting it.
5. Never push rollback changes or tags to a remote without explicit approval.
`;
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.join(", ") : "Not specified";
}

function runnerStages(): string[] {
  return [
    "PREFLIGHT",
    "CODEX_EXECUTION",
    "VALIDATION_TEST_LINT_BUILD",
    "SOURCE_ZIP",
    "SAMPLE_PACK",
    "SAMPLE_PACK_NORMALIZATION",
    "ADAPTER_COMPLETENESS",
    "SHA256_MANIFEST",
    "DOGFOOD",
    "COMMIT_TAG",
    "COMPLETION_GATE",
    "FREEZE"
  ];
}

function runnerFailureCategories(): string[] {
  return [
    "PNPM_ARGUMENT_LOSS",
    "POWERSHELL_51_SYNTAX",
    "CODEX_ARGUMENT_ORDER",
    "CODEX_PROMPT_ARGUMENT_SPLIT",
    "NEXT_START_ARGUMENT_ORDER",
    "SOURCE_ZIP_PATH_SEPARATOR",
    "SOURCE_ZIP_FORBIDDEN_ENTRY",
    "SAMPLE_PACK_JSON_BASE64_RESPONSE",
    "SAMPLE_PACK_STALE_FILE",
    "SAMPLE_PACK_INVALID_ZIP",
    "SAMPLE_PACK_MISSING_ADAPTER",
    "COMPLETION_GATE_FAILURE",
    "TAG_NULL_TRIM",
    "DIRTY_WORKTREE",
    "HISTORICAL_RELEASE_MODIFIED"
  ];
}
