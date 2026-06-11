import { describe, expect, it } from "vitest";

import { GeneratedPackSchema } from "@/lib/schemas/core";
import { createExecutionPack, createExecutionPackZip } from "./packager";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("execution pack packager", () => {
  it("assembles all required execution pack directories", () => {
    const pack = createExecutionPack(
      {
        projectName: "Stock Desk",
        rawDiscussion: "必须支持库存录入。",
        mvpScope: "库存录入",
        forbiddenItems: "不做云端部署",
        testingRequirements: "核心模块必须有单元测试",
        deliveryRequirements: "交付 ZIP 包",
        securityBoundaries: "不能读取 .env"
      },
      { now: fixedNow }
    );

    expect(GeneratedPackSchema.parse(pack)).toEqual(pack);
    expect(pack.files.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        "START_HERE.md",
        "START_CODEX_AUTONOMOUS.cmd",
        "START_CODEX_AUTONOMOUS.ps1",
        "START_CODEX_SUPERVISED.cmd",
        "START_CODEX_SUPERVISED.ps1",
        "common/PROJECT_SPEC.md",
        "common/TASK_QUEUE.md",
        "common/EXECUTION_RULES.md",
        "common/AUTONOMOUS_DELIVERY_ROADMAP.md",
        "common/VERSION_LADDER.md",
        "common/PHASE_GATE_PLAN.md",
        "common/CURRENT_PHASE.md",
        "runtime/PERMISSION_POLICY.yaml",
        "runtime/TOOLCHAIN_MANIFEST.yaml",
        "runtime/SAFE_COMMANDS.md",
        "runtime/DENIED_COMMANDS.md",
        "runtime/AUTONOMOUS_EXECUTION_POLICY.md",
        "runtime/AUTONOMOUS_RUN_STATUS.md",
        "runtime/AUTONOMOUS_RUN_SUMMARY.md",
        "runtime/AUTONOMOUS_HEALTH_CHECK.md",
        "runtime/AUTONOMOUS_COMPLETION_GATE.md",
        "runtime/AUTONOMOUS_VERIFICATION_REPORT.md",
        "runtime/END_TO_END_AUTONOMOUS_POLICY.md",
        "runtime/RUN_STATE.json",
        "runtime/RUNNER_STATE.json",
        "runtime/RUNNER_FAILURE_CLASSIFICATION.md",
        "runtime/RUNNER_RECOVERY_POLICY.md",
        "runtime/RUNNER_NEXT_ACTION.md",
        "runtime/RUNNER_FINAL_SUMMARY.md",
        "runtime/FULL_LIFECYCLE_RUN_STATE.json",
        "runtime/VERSION_LADDER.json",
        "runtime/PHASE_STATUS.json",
        "runtime/CURRENT_TASK.md",
        "runtime/CURRENT_PHASE.md",
        "runtime/NEXT_ACTION.md",
        "runtime/PHASE_GATE_REPORT.md",
        "runtime/COMPLETION_GATE_REPORT.md",
        "runtime/FINAL_DELIVERY_STATUS.md",
        "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md",
        "runtime/MORNING_REPORT.md",
        "runtime/HANDOFF_TO_NEXT_VERSION.md",
        "scripts/run-customer-autonomous.ps1",
        "scripts/run-customer-autonomous.sh",
        "scripts/verify-customer-delivery.ps1",
        "scripts/verify-customer-delivery.sh",
        "scripts/finalize.ps1",
        "scripts/finalize.sh",
        "scripts/verify-autonomous-completion.ps1",
        "scripts/verify-autonomous-completion.sh",
        "scripts/run-autonomous-version.ps1",
        "scripts/run-autonomous-version.sh",
        "scripts/runner-stage-machine.ps1",
        "scripts/runner-stage-machine.sh",
        "scripts/normalize-sample-pack.ps1",
        "scripts/normalize-sample-pack.sh",
        "scripts/classify-runner-failure.ps1",
        "scripts/classify-runner-failure.sh",
        "agent_adapters/codex/AGENTS.md",
        "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md",
        "agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md",
        "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md",
        "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md",
        "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md",
        "agent_adapters/codex/run-codex-end-to-end-autonomous.ps1",
        "agent_adapters/codex/run-codex-autonomous.ps1",
        "agent_adapters/codex/run-codex-unified-autonomous.ps1",
        "EXECUTION_PACK_MANIFEST.md",
        "docs/RUN_APP.md",
        "docs/README.md"
      ])
    );
    expect(pack.files.every((file) => file.content.trim().length > 0)).toBe(true);
  });

  it("creates a usable ZIP containing the generated pack files", async () => {
    const { pack, zipBuffer } = await createExecutionPackZip(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks."
      },
      { now: fixedNow }
    );

    expect(zipBuffer.subarray(0, 2).toString("utf8")).toBe("PK");

    const names = readCentralDirectoryNames(zipBuffer);
    expect(names).toEqual(expect.arrayContaining(pack.files.map((file) => file.path)));
    expect(names).toContain("common/PROJECT_SPEC.md");
    expect(names).toContain("scripts/finalize.ps1");
  });

  it("matches the v0.1 ZIP directory snapshot", async () => {
    const { zipBuffer } = await createExecutionPackZip(
      {
        projectName: "Snapshot Pack",
        rawDiscussion: "Build the v0.1 local execution pack."
      },
      { now: fixedNow }
    );

    expect(readCentralDirectoryNames(zipBuffer)).toEqual([
      "START_HERE.md",
      "START_CODEX_AUTONOMOUS.cmd",
      "START_CODEX_AUTONOMOUS.ps1",
      "START_CODEX_SUPERVISED.cmd",
      "START_CODEX_SUPERVISED.ps1",
      "EXECUTION_PACK_MANIFEST.md",
      "common/PROJECT_SPEC.md",
      "common/TASK_QUEUE.md",
      "common/EXECUTION_RULES.md",
      "common/AUTONOMOUS_DELIVERY_ROADMAP.md",
      "common/VERSION_LADDER.md",
      "common/PHASE_GATE_PLAN.md",
      "common/CURRENT_PHASE.md",
      "common/SELF_REVIEW.md",
      "common/FINAL_DELIVERY_CHECK.md",
      "common/ASSUMPTIONS.md",
      "common/BLOCKERS.md",
      "common/KNOWN_ISSUES.md",
      "common/PROGRESS_LOG.md",
      "common/HANDOFF.md",
      "runtime/TOOLCHAIN_MANIFEST.yaml",
      "runtime/INSTALL_PLAN.md",
      "runtime/PERMISSION_POLICY.yaml",
      "runtime/HIGH_RISK_COMMANDS.md",
      "runtime/SAFE_COMMANDS.md",
      "runtime/DENIED_COMMANDS.md",
      "runtime/APPROVAL_QUEUE.md",
      "runtime/AUTONOMOUS_EXECUTION_POLICY.md",
      "runtime/AUTONOMOUS_RUN_STATUS.md",
      "runtime/AUTONOMOUS_RUN_SUMMARY.md",
      "runtime/AUTONOMOUS_HEALTH_CHECK.md",
      "runtime/AUTONOMOUS_COMPLETION_GATE.md",
      "runtime/AUTONOMOUS_VERIFICATION_REPORT.md",
      "runtime/END_TO_END_AUTONOMOUS_POLICY.md",
      "runtime/RUN_STATE.json",
      "runtime/RUNNER_STATE.json",
      "runtime/RUNNER_FAILURE_CLASSIFICATION.md",
      "runtime/RUNNER_RECOVERY_POLICY.md",
      "runtime/RUNNER_NEXT_ACTION.md",
      "runtime/RUNNER_FINAL_SUMMARY.md",
      "runtime/FULL_LIFECYCLE_RUN_STATE.json",
      "runtime/VERSION_LADDER.json",
      "runtime/PHASE_STATUS.json",
      "runtime/CURRENT_TASK.md",
      "runtime/CURRENT_PHASE.md",
      "runtime/NEXT_ACTION.md",
      "runtime/PHASE_GATE_REPORT.md",
      "runtime/COMPLETION_GATE_REPORT.md",
      "runtime/FINAL_DELIVERY_STATUS.md",
      "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md",
      "runtime/MORNING_REPORT.md",
      "runtime/HANDOFF_TO_NEXT_VERSION.md",
      "runtime/RUNTIME_STATUS.md",
      "runtime/ROLLBACK_PLAN.md",
      "scripts/preflight.ps1",
      "scripts/preflight.sh",
      "scripts/bootstrap.ps1",
      "scripts/bootstrap.sh",
      "scripts/backup.ps1",
      "scripts/backup.sh",
      "scripts/test.ps1",
      "scripts/test.sh",
      "scripts/git-cleanup.ps1",
      "scripts/git-cleanup.sh",
      "scripts/tag-release.ps1",
      "scripts/tag-release.sh",
      "scripts/package.ps1",
      "scripts/package.sh",
      "scripts/verify-release.ps1",
      "scripts/verify-release.sh",
      "scripts/verify-sample-pack.ps1",
      "scripts/verify-sample-pack.sh",
      "scripts/verify-source-zip.ps1",
      "scripts/verify-source-zip.sh",
      "scripts/verify-history-releases.ps1",
      "scripts/verify-history-releases.sh",
      "scripts/verify-autonomous-completion.ps1",
      "scripts/verify-autonomous-completion.sh",
      "scripts/run-autonomous-version.ps1",
      "scripts/run-autonomous-version.sh",
      "scripts/runner-stage-machine.ps1",
      "scripts/runner-stage-machine.sh",
      "scripts/normalize-sample-pack.ps1",
      "scripts/normalize-sample-pack.sh",
      "scripts/classify-runner-failure.ps1",
      "scripts/classify-runner-failure.sh",
      "scripts/run-customer-autonomous.ps1",
      "scripts/run-customer-autonomous.sh",
      "scripts/verify-customer-delivery.ps1",
      "scripts/verify-customer-delivery.sh",
      "scripts/finalize.ps1",
      "scripts/finalize.sh",
      "agent_adapters/codex/AGENTS.md",
      "agent_adapters/codex/CODEX_RUNBOOK.md",
      "agent_adapters/codex/CODEX_TASK_PROMPT.md",
      "agent_adapters/codex/CODEX_AUTONOMOUS_LOOP.md",
      "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md",
      "agent_adapters/codex/CODEX_AUTONOMOUS_RUNBOOK.md",
      "agent_adapters/codex/CODEX_UNIFIED_AUTONOMOUS_RUNBOOK.md",
      "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md",
      "agent_adapters/codex/CODEX_END_TO_END_AUTONOMOUS_PROMPT.md",
      "agent_adapters/codex/CODEX_END_TO_END_DELIVERY_RUNBOOK.md",
      "agent_adapters/codex/run-codex-autonomous.ps1",
      "agent_adapters/codex/run-codex-supervised.ps1",
      "agent_adapters/codex/run-codex-unified-autonomous.ps1",
      "agent_adapters/codex/run-codex-end-to-end-autonomous.ps1",
      "agent_adapters/codex/run-codex-autonomous.sh",
      "agent_adapters/codex/run-codex-supervised.sh",
      "agent_adapters/codex/run-codex-unified-autonomous.sh",
      "agent_adapters/codex/run-codex-end-to-end-autonomous.sh",
      "docs/README.md",
      "docs/RUN_APP.md",
      "docs/ENV_SETUP.md",
      "docs/SECURITY_AND_PERMISSIONS.md",
      "docs/IMPLEMENTATION_REPORT.md",
      "docs/RELEASE_NOTES.md",
      "docs/NEXT_STEPS.md"
    ]);
  });

  it("uses the selected execution mode inside generated files", () => {
    const pack = createExecutionPack(
      {
        projectName: "Autonomous Pack",
        rawDiscussion: "Build the v0.2 autonomous execution pack.",
        executionMode: "autonomous"
      },
      { now: fixedNow }
    );

    const projectSpec = findFile(pack.files, "common/PROJECT_SPEC.md");
    const prompt = findFile(
      pack.files,
      "agent_adapters/codex/CODEX_AUTONOMOUS_PROMPT.md"
    );
    const readme = findFile(pack.files, "docs/README.md");

    expect(pack.projectSpec.executionMode).toBe("autonomous");
    expect(projectSpec).toContain('"executionMode": "autonomous"');
    expect(prompt).toContain("Selected execution mode: autonomous");
    expect(readme).toContain("Selected execution mode: autonomous");
  });

  it("uses unified autonomous mode inside generated files and ZIP entries", async () => {
    const { pack, zipBuffer } = await createExecutionPackZip(
      {
        projectName: "Unified Pack",
        rawDiscussion: "Build the v0.2.1 unified autonomous execution pack.",
        executionMode: "unified_autonomous"
      },
      { now: fixedNow }
    );

    const projectSpec = findFile(pack.files, "common/PROJECT_SPEC.md");
    const unifiedRunner = findFile(
      pack.files,
      "agent_adapters/codex/run-codex-unified-autonomous.ps1"
    );
    const names = readCentralDirectoryNames(zipBuffer);

    expect(pack.projectSpec.executionMode).toBe("end_to_end_autonomous");
    expect(projectSpec).toContain('"executionMode": "end_to_end_autonomous"');
    expect(unifiedRunner).toContain("Final Summary");
    expect(names).toContain(
      "agent_adapters/codex/run-codex-unified-autonomous.ps1"
    );
    expect(names).toContain(
      "agent_adapters/codex/run-codex-unified-autonomous.sh"
    );
    expect(names).toContain("runtime/AUTONOMOUS_RUN_STATUS.md");
    expect(names).toContain("runtime/AUTONOMOUS_RUN_SUMMARY.md");
    expect(names).toContain("runtime/AUTONOMOUS_HEALTH_CHECK.md");
    expect(names).toContain("runtime/AUTONOMOUS_COMPLETION_GATE.md");
    expect(names).toContain("runtime/AUTONOMOUS_VERIFICATION_REPORT.md");
    expect(names).toContain(
      "agent_adapters/codex/CODEX_COMPLETION_GATE_RUNBOOK.md"
    );
  });

  it("uses selected adapters to generate independent adapter options and manifest entries", async () => {
    const { pack, zipBuffer } = await createExecutionPackZip(
      {
        projectName: "Multi Adapter Pack",
        rawDiscussion: "Build a local MVP for planning coding tasks.",
        selectedAdapterIds: ["codex", "cursor"],
        executionScope: "multi_phase",
        executionMode: "autonomous"
      },
      { now: fixedNow }
    );

    const names = readCentralDirectoryNames(zipBuffer);
    const manifest = findFile(pack.files, "EXECUTION_PACK_MANIFEST.md");
    const roadmap = findFile(
      pack.files,
      "common/AUTONOMOUS_DELIVERY_ROADMAP.md"
    );

    expect(pack.projectSpec.selectedAdapterIds).toEqual(["codex", "cursor"]);
    expect(pack.projectSpec.executionScope).toBe("multi_phase");
    expect(names).toContain("agent_adapters/codex/AGENTS.md");
    expect(names).toContain("agent_adapters/cursor/CURSOR_RUNBOOK.md");
    expect(names).not.toContain("agent_adapters/claude-code/CLAUDE.md");
    expect(names).not.toContain("agent_adapters/trae/TRAE_RUNBOOK.md");
    expect(manifest).toContain("Selected adapters");
    expect(manifest).toContain("Codex");
    expect(manifest).toContain("Cursor");
    expect(manifest).toContain("does not mean running multiple agents together");
    expect(manifest).toContain("Do not run multiple agents against the same workspace");
    expect(roadmap).toContain("Multi Adapter Pack");
    expect(roadmap).toContain("v0.0.1");
    expect(roadmap).toContain("v1.0");
    expect(roadmap).toContain("Assumptions");
  });

  it("generates customer root entry files wired to customer-side runners", () => {
    const pack = createExecutionPack(
      {
        projectName: "Customer Runtime Pack",
        rawDiscussion: "Build a local MVP and validate it from the customer pack root.",
        selectedAdapterIds: ["codex"],
        executionScope: "end_to_end_delivery",
        executionMode: "end_to_end_autonomous"
      },
      { now: fixedNow }
    );

    const startHere = findFile(pack.files, "START_HERE.md");
    const autonomousPs1 = findFile(pack.files, "START_CODEX_AUTONOMOUS.ps1");
    const autonomousCmd = findFile(pack.files, "START_CODEX_AUTONOMOUS.cmd");
    const supervisedPs1 = findFile(pack.files, "START_CODEX_SUPERVISED.ps1");

    expect(startHere).toContain("Customer Runtime Pack");
    expect(startHere).toContain("START_CODEX_AUTONOMOUS.ps1");
    expect(startHere).toContain("scripts/verify-customer-delivery.ps1");
    expect(autonomousPs1).toContain("scripts/run-customer-autonomous.ps1");
    expect(autonomousPs1).toContain("-Mode autonomous");
    expect(autonomousCmd).toContain("START_CODEX_AUTONOMOUS.ps1");
    expect(supervisedPs1).toContain("-Mode supervised");
  });

  it("generates old-runner prevention docs with the approved autonomous command", () => {
    const pack = createExecutionPack(
      {
        projectName: "Stable Runner Pack",
        rawDiscussion: "Build a local MVP using the stable v0.3.2 autonomous runner.",
        selectedAdapterIds: ["codex"],
        executionScope: "end_to_end_delivery",
        executionMode: "end_to_end_autonomous"
      },
      { now: fixedNow }
    );

    const startHere = findFile(pack.files, "START_HERE.md");
    const manifest = findFile(pack.files, "EXECUTION_PACK_MANIFEST.md");
    const runnerNextAction = findFile(pack.files, "runtime/RUNNER_NEXT_ACTION.md");
    const runnerPs1 = findFile(pack.files, "scripts/run-autonomous-version.ps1");

    for (const content of [startHere, manifest, runnerNextAction, runnerPs1]) {
      expect(content).toContain("scripts/run-autonomous-version.ps1");
      expect(content).toContain("old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners");
    }
    expect(startHere).toContain(
      "powershell -ExecutionPolicy Bypass -File .\\scripts\\run-autonomous-version.ps1 -TargetVersion v1.0"
    );
  });
});

function readCentralDirectoryNames(buffer: Buffer): string[] {
  const endOfCentralDirectory = 0x06054b50;
  let eocdOffset = -1;

  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === endOfCentralDirectory) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("Missing ZIP end of central directory");
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const names: string[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid central directory entry at ${offset}`);
    }

    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;

    names.push(buffer.subarray(nameStart, nameEnd).toString("utf8"));
    offset = nameEnd + extraLength + commentLength;
  }

  return names;
}

function findFile(files: { path: string; content: string }[], path: string): string {
  const file = files.find((entry) => entry.path === path);
  if (!file) {
    throw new Error(`Missing file: ${path}`);
  }
  return file.content;
}
