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
      "Remove-Item releases/v0.2.1"
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
