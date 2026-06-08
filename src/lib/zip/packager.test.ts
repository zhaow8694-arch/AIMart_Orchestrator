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
        "common/PROJECT_SPEC.md",
        "common/TASK_QUEUE.md",
        "common/EXECUTION_RULES.md",
        "runtime/PERMISSION_POLICY.yaml",
        "runtime/TOOLCHAIN_MANIFEST.yaml",
        "scripts/finalize.ps1",
        "scripts/finalize.sh",
        "agent_adapters/codex/AGENTS.md",
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
      "common/PROJECT_SPEC.md",
      "common/TASK_QUEUE.md",
      "common/EXECUTION_RULES.md",
      "common/SELF_REVIEW.md",
      "common/FINAL_DELIVERY_CHECK.md",
      "common/ASSUMPTIONS.md",
      "common/BLOCKERS.md",
      "common/PROGRESS_LOG.md",
      "common/HANDOFF.md",
      "runtime/TOOLCHAIN_MANIFEST.yaml",
      "runtime/INSTALL_PLAN.md",
      "runtime/PERMISSION_POLICY.yaml",
      "runtime/HIGH_RISK_COMMANDS.md",
      "runtime/APPROVAL_QUEUE.md",
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
      "scripts/finalize.ps1",
      "scripts/finalize.sh",
      "agent_adapters/codex/AGENTS.md",
      "agent_adapters/codex/CODEX_RUNBOOK.md",
      "agent_adapters/codex/CODEX_TASK_PROMPT.md",
      "agent_adapters/codex/CODEX_AUTONOMOUS_LOOP.md",
      "docs/README.md",
      "docs/RUN_APP.md",
      "docs/ENV_SETUP.md",
      "docs/SECURITY_AND_PERMISSIONS.md",
      "docs/IMPLEMENTATION_REPORT.md",
      "docs/RELEASE_NOTES.md",
      "docs/NEXT_STEPS.md"
    ]);
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
