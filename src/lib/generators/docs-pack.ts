import type { RuntimePack } from "@/lib/generators/runtime-pack";
import type { FileEntry, ProjectSpec, TaskQueue } from "@/lib/schemas/core";
import { getSelectedAgentAdapterRegistryEntries } from "@/lib/adapters/registry";

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

This generated execution-pack ZIP describes the local v0.3.2 Autonomous Runner Hardening plan for ${projectSpec.projectName}. It keeps End-to-End delivery state visible from the customer pack root and uses one stable runner path instead of old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners. It is different from an AIMart source release ZIP: source release ZIPs contain the generator source, while generated execution-pack ZIPs contain root launchers plus common/runtime/scripts/agent_adapters/docs for a target project.

Selected adapters: ${formatSelectedAdapters(projectSpec)}
Execution scope: ${projectSpec.executionScope}
Selected execution mode: ${projectSpec.executionMode}

Selecting multiple adapters creates multiple independent execution options. It does not run multiple agents together; choose one adapter for one workspace.

## MVP Scope

${asBullets(projectSpec.mvpScope)}

## Forbidden items

${asBullets(projectSpec.forbiddenItems)}

## Task Queue

${taskQueue.tasks.map((task) => `- ${task.id}: ${task.title}`).join("\n")}

## Autonomous Completion Gate

Unified autonomous runs must finish with the Autonomous Completion Gate before reporting success. Review runtime/AUTONOMOUS_COMPLETION_GATE.md and runtime/AUTONOMOUS_VERIFICATION_REPORT.md after every unattended run.

Start with START_HERE.md, run the approved stable runner command, then follow common/TASK_QUEUE.md in order. Before accepting delivery, run scripts/verify-customer-delivery.* and review runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md.
`;
}

function renderRunApp(projectSpec: ProjectSpec): string {
  return `# Run App

Project: ${projectSpec.projectName}
Selected adapters: ${formatSelectedAdapters(projectSpec)}
Execution scope: ${projectSpec.executionScope}
Selected execution mode: ${projectSpec.executionMode}

## Customer Root Start

After unzipping the execution pack, start from the pack root:

\`\`\`powershell
powershell -ExecutionPolicy Bypass -File .\\scripts\\run-autonomous-version.ps1 -TargetVersion v1.0
\`\`\`

Use START_CODEX_AUTONOMOUS.ps1 or START_CODEX_SUPERVISED.ps1 only as compatibility launchers. Do not use old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners. The stable runner shows project name, selected AI adapter, current lifecycle phase, current target version, current task, log updated time, release output status, completion gate status, blocked/known issue status, failure classification, and final PASS or FAIL summary.

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

## Start Codex End-to-End Autonomous Mode

Use End-to-End Autonomous Mode when Codex is the selected agent and should continue through phase gates until final usable delivery.

\`\`\`powershell
./agent_adapters/codex/run-codex-end-to-end-autonomous.ps1
\`\`\`

\`\`\`bash
bash agent_adapters/codex/run-codex-end-to-end-autonomous.sh
\`\`\`

## Other Adapter Options

Claude Code, Trae, and Cursor adapters are independent execution options when selected. Read their adapter directory and choose only one active adapter for a workspace.

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

Then run the customer delivery verifier:

\`\`\`powershell
./scripts/verify-customer-delivery.ps1
\`\`\`

\`\`\`bash
bash scripts/verify-customer-delivery.sh
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
- Use scripts/run-autonomous-version.* when you want the stable v0.3.2 autonomous runner with runtime/RUNNER_STATE.json, runtime/RUNNER_NEXT_ACTION.md, and runtime/RUNNER_FINAL_SUMMARY.md updates.
- Use scripts/normalize-sample-pack.* before validating sample execution-pack artifacts.
- Use scripts/classify-runner-failure.* before writing blocker or known-issue entries for runner failures.
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
- Agent Adapter Registry output
- Independent adapters: ${formatSelectedAdapters(projectSpec)}
- Delivery docs
- Autonomous Completion Gate docs and verification report template
- End-to-End runtime state files and phase gate reports
- v0.3.2 runner hardening files, stage machine, sample pack normalizer, and failure classifier

## Current Task Count

${taskQueue.tasks.length} tasks generated.

## Assumptions

${asBullets(projectSpec.inferredAssumptions)}

## Open Questions

${asBullets(projectSpec.openQuestions)}

## v0.3.2 Autonomous Runner Hardening

Generated packs include START_HERE.md, START_CODEX_AUTONOMOUS.*, scripts/run-autonomous-version.*, scripts/runner-stage-machine.*, scripts/normalize-sample-pack.*, scripts/classify-runner-failure.*, scripts/run-customer-autonomous.*, scripts/verify-customer-delivery.*, runtime/RUNNER_STATE.json, runtime/RUNNER_FAILURE_CLASSIFICATION.md, runtime/RUNNER_RECOVERY_POLICY.md, runtime/RUNNER_NEXT_ACTION.md, runtime/RUNNER_FINAL_SUMMARY.md, runtime/FULL_LIFECYCLE_RUN_STATE.json, runtime/VERSION_LADDER.json, runtime/PHASE_STATUS.json, runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md, Autonomous Completion Gate files, and independent adapter options for ${formatSelectedAdapters(projectSpec)}. The selected adapter and customer verifier must show PASS or FAIL before final delivery.
`;
}

function renderReleaseNotes(projectSpec: ProjectSpec): string {
  return `# Release Notes

## v0.3.2

Initial local v0.3.2 Autonomous Runner Hardening execution pack for ${projectSpec.projectName}.

### Included

- Customer root START_HERE.md and START_CODEX_* launchers
- Structured ProjectSpec
- Generated TaskQueue
- Runtime and permission policy
- Full lifecycle customer state files
- SAFE_COMMANDS, DENIED_COMMANDS, and autonomous execution policy
- Autonomous Completion Gate runtime docs
- End-to-End runtime state, phase gate, current task, morning report, and next-version handoff files
- Customer one-window runner and delivery verifier scripts
- Stable autonomous version runner and stage machine
- Sample pack normalizer for PK ZIP and JSON zipBase64 responses
- Failure classifier with known runner failure categories
- Old-runner prevention guidance for V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix paths
- Agent Adapter Registry output
- Independent adapter options for ${formatSelectedAdapters(projectSpec)}
- Local finalize scripts
- Codex target adapter with supervised, autonomous, unified autonomous, end-to-end autonomous launch profiles, and completion-gate runbook
- ZIP-ready documentation
`;
}

function renderNextSteps(projectSpec: ProjectSpec): string {
  return `# Next Steps

## Immediate

v0.3.2 Autonomous Runner Hardening continues End-to-End autonomous delivery through phase gates until final usable delivery without repeated hotfix runner loops.

1. Review PROJECT_SPEC.md for accuracy.
2. Execute TASK_QUEUE.md from the first pending task.
3. Choose one adapter from ${formatSelectedAdapters(projectSpec)} before working in a workspace.
4. Use runtime/RUN_STATE.json, runtime/CURRENT_TASK.md, and common/PHASE_GATE_PLAN.md to continue across phases.
5. Run scripts/run-autonomous-version.* as the stable runner path.
6. Run scripts/finalize.* before delivery.
7. Review runtime/AUTONOMOUS_VERIFICATION_REPORT.md and runtime/COMPLETION_GATE_REPORT.md; accept delivery only when the Autonomous Completion Gate reports PASS.

## Known Limitations

- v0.3.2 is local-only.
- v0.3.2 does not include a cloud runner.
- v0.3.2 does not perform production deployment.
- v0.3.2 does not read secrets or production credentials.

## Deferred Ideas

Future versions can expand adapter coverage after ${projectSpec.projectName} v0.1 is stable.
`;
}

function asBullets(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- Not specified";
}

function formatSelectedAdapters(projectSpec: ProjectSpec): string {
  return getSelectedAgentAdapterRegistryEntries(projectSpec.selectedAdapterIds)
    .map((entry) => entry.displayName)
    .join(", ");
}
