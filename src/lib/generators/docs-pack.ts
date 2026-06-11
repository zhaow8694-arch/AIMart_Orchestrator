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

This generated execution-pack ZIP describes the local v0.2.2 delivery plan for ${projectSpec.projectName}. It is different from an AIMart source release ZIP: source release ZIPs contain the generator source, while generated execution-pack ZIPs contain common/runtime/scripts/agent_adapters/docs for a target project.

Selected execution mode: ${projectSpec.executionMode}

## MVP Scope

${asBullets(projectSpec.mvpScope)}

## Forbidden items

${asBullets(projectSpec.forbiddenItems)}

## Task Queue

${taskQueue.tasks.map((task) => `- ${task.id}: ${task.title}`).join("\n")}

## Autonomous Completion Gate

Unified autonomous runs must finish with the Autonomous Completion Gate before reporting success. Review runtime/AUTONOMOUS_COMPLETION_GATE.md and runtime/AUTONOMOUS_VERIFICATION_REPORT.md after every unattended run.

Start with docs/RUN_APP.md, then follow common/TASK_QUEUE.md in order.
`;
}

function renderRunApp(projectSpec: ProjectSpec): string {
  return `# Run App

Project: ${projectSpec.projectName}
Selected execution mode: ${projectSpec.executionMode}

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

## Start Codex Supervised Mode

Supervised Mode keeps the workspace sandboxed and asks for approval when Codex encounters commands outside the safe policy.

\`\`\`powershell
./agent_adapters/codex/run-codex-supervised.ps1
\`\`\`

\`\`\`bash
bash agent_adapters/codex/run-codex-supervised.sh
\`\`\`

## Start Codex Autonomous Mode

Autonomous Mode uses workspace-write plus approval never. It must follow runtime/SAFE_COMMANDS.md, runtime/DENIED_COMMANDS.md, and runtime/AUTONOMOUS_EXECUTION_POLICY.md.

\`\`\`powershell
./agent_adapters/codex/run-codex-autonomous.ps1
\`\`\`

\`\`\`bash
bash agent_adapters/codex/run-codex-autonomous.sh
\`\`\`

## Start Codex Unified Autonomous Mode

Unified Autonomous Mode provides the one-window status display. It starts Codex autonomously, shows target version, Git branch, clean startup state, existing Codex process detection, release artifact status, latest log activity, stalled-log status, and final summary. It runs the Autonomous Completion Gate before reporting PASS.

\`\`\`powershell
./agent_adapters/codex/run-codex-unified-autonomous.ps1
\`\`\`

\`\`\`bash
bash agent_adapters/codex/run-codex-unified-autonomous.sh
\`\`\`

## Logs And Approval Queue

Codex launcher logs are written under .aimart/logs for the legacy launchers and codex_runs for the unified autonomous runner. Commands outside the safe policy must be recorded in runtime/APPROVAL_QUEUE.md with the risk, reason, blocking status, and recommendation.

## Autonomous Completion Gate

The unified runner writes runtime/AUTONOMOUS_VERIFICATION_REPORT.md. If the gate reports FAIL, inspect that report before accepting the run.

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

## Autonomous Mode Policy

- Read runtime/SAFE_COMMANDS.md before running automated commands.
- Read runtime/DENIED_COMMANDS.md before queueing or denying high-risk work.
- Read runtime/AUTONOMOUS_EXECUTION_POLICY.md before unattended runs.
- Read runtime/AUTONOMOUS_COMPLETION_GATE.md before reporting delivery success.
- Review runtime/AUTONOMOUS_VERIFICATION_REPORT.md after the runner exits.
- View logs under .aimart/logs after supervised or autonomous Codex sessions.
- Use agent_adapters/codex/run-codex-unified-autonomous.* when you want the one-window autonomous runner with runtime/AUTONOMOUS_RUN_STATUS.md and runtime/AUTONOMOUS_RUN_SUMMARY.md updates.
- Use runtime/APPROVAL_QUEUE.md for blocked or high-risk actions; Autonomous Mode should continue with safe independent tasks when possible.
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
- Autonomous Completion Gate docs and verification report template

## Current Task Count

${taskQueue.tasks.length} tasks generated.

## Assumptions

${asBullets(projectSpec.inferredAssumptions)}

## Open Questions

${asBullets(projectSpec.openQuestions)}

## v0.2.2 Completion Gate

Generated packs include runtime/AUTONOMOUS_COMPLETION_GATE.md, runtime/AUTONOMOUS_VERIFICATION_REPORT.md, and the Codex completion-gate runbook. The unified autonomous runner must show PASS or FAIL before final delivery.
`;
}

function renderReleaseNotes(projectSpec: ProjectSpec): string {
  return `# Release Notes

## v0.2.2

Initial local v0.2.2 execution pack for ${projectSpec.projectName}.

### Included

- Structured ProjectSpec
- Generated TaskQueue
- Runtime and permission policy
- SAFE_COMMANDS, DENIED_COMMANDS, and autonomous execution policy
- Autonomous Completion Gate runtime docs
- Local finalize scripts
- Codex target adapter with supervised, autonomous, unified autonomous launch profiles, and completion-gate runbook
- ZIP-ready documentation
`;
}

function renderNextSteps(projectSpec: ProjectSpec): string {
  return `# Next Steps

## Immediate

1. Review PROJECT_SPEC.md for accuracy.
2. Execute TASK_QUEUE.md from the first pending task.
3. Run scripts/finalize.* before delivery.
4. Review runtime/AUTONOMOUS_VERIFICATION_REPORT.md and accept delivery only when the Autonomous Completion Gate reports PASS.

## Known Limitations

- v0.2.2 is local-only.
- v0.2.2 does not include a cloud runner.
- v0.2.2 does not perform production deployment.
- v0.2.2 does not read secrets or production credentials.

## Deferred Ideas

Future versions can expand adapter coverage after ${projectSpec.projectName} v0.1 is stable.
`;
}

function asBullets(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- Not specified";
}
