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
      "node -v",
      "pnpm -v"
    ],
    approvalRequiredCommands: [
      "git push",
      "git push --tags",
      "gh pr create",
      "vercel deploy",
      "terraform apply",
      "kubectl apply"
    ],
    forbiddenCommands: [
      "rm -rf /",
      "sudo rm -rf",
      "cat ~/.ssh/*",
      "cat ~/.aws/*",
      "cat .env",
      "printenv",
      "terraform destroy",
      "kubectl delete"
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
      path: "runtime/APPROVAL_QUEUE.md",
      content: renderApprovalQueue()
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

function renderApprovalQueue(): string {
  return `# Approval Queue

High-risk or external-resource actions are recorded here before execution.

| Time | Requested Action | Risk Level | Reason | Blocking? | Status |
|---|---|---|---|---|---|
`;
}

function renderRuntimeStatus(projectSpec: ProjectSpec): string {
  return `# Runtime Status

Project: ${projectSpec.projectName}

| Area | Status | Notes |
|---|---|---|
| Toolchain | pending | Run preflight before implementation. |
| Permissions | configured | L4 commands require approval; L5 commands are denied. |
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
