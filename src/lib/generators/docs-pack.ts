import type { RuntimePack } from "@/lib/generators/runtime-pack";
import type { FileEntry, ProjectSpec, TaskQueue } from "@/lib/schemas/core";

export type DocsPack = {
  files: FileEntry[];
};

export function generateDocsPack(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue,
  runtimePack: RuntimePack
): DocsPack {
  return {
    files: [
      {
        path: "docs/README.md",
        content: renderReadme(projectSpec, taskQueue)
      },
      {
        path: "docs/RUN_APP.md",
        content: renderRunApp(projectSpec)
      },
      {
        path: "docs/ENV_SETUP.md",
        content: renderEnvSetup(runtimePack)
      },
      {
        path: "docs/SECURITY_AND_PERMISSIONS.md",
        content: renderSecurity(runtimePack)
      },
      {
        path: "docs/IMPLEMENTATION_REPORT.md",
        content: renderImplementationReport(projectSpec, taskQueue)
      },
      {
        path: "docs/RELEASE_NOTES.md",
        content: renderReleaseNotes(projectSpec)
      },
      {
        path: "docs/NEXT_STEPS.md",
        content: renderNextSteps(projectSpec)
      }
    ]
  };
}

function renderReadme(projectSpec: ProjectSpec, taskQueue: TaskQueue): string {
  return `# ${projectSpec.projectName}

This execution pack describes the local v0.1 delivery plan for ${projectSpec.projectName}.

## MVP Scope

${asBullets(projectSpec.mvpScope)}

## Forbidden Items

${asBullets(projectSpec.forbiddenItems)}

## Task Queue

${taskQueue.tasks.map((task) => `- ${task.id}: ${task.title}`).join("\n")}

Start with docs/RUN_APP.md, then follow common/TASK_QUEUE.md in order.
`;
}

function renderRunApp(projectSpec: ProjectSpec): string {
  return `# Run App

Project: ${projectSpec.projectName}

## Local Setup

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## Verification

\`\`\`bash
pnpm lint
pnpm test
pnpm build
\`\`\`

## Final Delivery

Run the platform-specific finalize script:

\`\`\`powershell
./scripts/finalize.ps1
\`\`\`

\`\`\`bash
./scripts/finalize.sh
\`\`\`
`;
}

function renderEnvSetup(runtimePack: RuntimePack): string {
  return `# Environment Setup

## Toolchain

- Runtime: ${runtimePack.toolchainManifest.runtime}
- Package manager: ${runtimePack.toolchainManifest.packageManager}
- Language: ${runtimePack.toolchainManifest.language}
- Frameworks: ${runtimePack.toolchainManifest.frameworks.join(", ")}
- Test runner: ${runtimePack.toolchainManifest.testRunner}

## Required Commands

${asBullets(runtimePack.toolchainManifest.requiredCommands)}

No global package install, system package install, or production resource setup is required for v0.1.
`;
}

function renderSecurity(runtimePack: RuntimePack): string {
  return `# Security And Permissions

## Risk Levels

${runtimePack.runtimePolicy.riskLevels
  .map(
    (level) =>
      `- ${level.level}: ${level.name} - ${level.description} (${level.defaultAction})`
  )
  .join("\n")}

## Command Rules

${runtimePack.permissionPolicy.commandRules
  .map(
    (rule) =>
      `- \`${rule.command}\`: ${rule.riskLevel}, ${rule.action} - ${rule.reason}`
  )
  .join("\n")}

Commands marked queue_for_approval must be written to runtime/APPROVAL_QUEUE.md before execution.
Commands marked deny must not be executed.
`;
}

function renderImplementationReport(
  projectSpec: ProjectSpec,
  taskQueue: TaskQueue
): string {
  return `# Implementation Report

Project: ${projectSpec.projectName}

## Generated Assets

- ProjectSpec
- TaskQueue
- Runtime pack
- PowerShell and Bash scripts
- Codex target adapter
- Delivery docs

## Current Task Count

${taskQueue.tasks.length} tasks generated.

## Assumptions

${asBullets(projectSpec.inferredAssumptions)}

## Open Questions

${asBullets(projectSpec.openQuestions)}
`;
}

function renderReleaseNotes(projectSpec: ProjectSpec): string {
  return `# Release Notes

## v0.1.0

Initial local execution pack for ${projectSpec.projectName}.

### Included

- Structured ProjectSpec
- Generated TaskQueue
- Runtime and permission policy
- Local finalize scripts
- Codex target adapter
- ZIP-ready documentation
`;
}

function renderNextSteps(projectSpec: ProjectSpec): string {
  return `# Next Steps

## Immediate

1. Review PROJECT_SPEC.md for accuracy.
2. Execute TASK_QUEUE.md from the first pending task.
3. Run scripts/finalize.* before delivery.

## Known Limitations

- v0.1 is local-only.
- v0.1 does not include a cloud runner.
- v0.1 does not perform production deployment.
- v0.1 does not read secrets or production credentials.

## Deferred Ideas

Future versions can expand adapter coverage after ${projectSpec.projectName} v0.1 is stable.
`;
}

function asBullets(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- Not specified";
}
