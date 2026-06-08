import { describe, expect, it } from "vitest";

import { createProjectSpec } from "@/lib/core/project-spec";
import { generateScriptPack } from "./script-pack";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("generateScriptPack", () => {
  it("generates PowerShell and Bash variants for every required script", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Stock Desk",
        rawDiscussion: "必须支持库存录入。"
      },
      { now: fixedNow }
    );

    const scriptPack = generateScriptPack(projectSpec);

    expect(scriptPack.files.map((file) => file.path)).toEqual(
      expect.arrayContaining([
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
        "scripts/finalize.sh"
      ])
    );
  });

  it("makes finalize scripts call the full local delivery flow", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks."
      },
      { now: fixedNow }
    );

    const scriptPack = generateScriptPack(projectSpec);
    const finalizePs1 = findFile(scriptPack.files, "scripts/finalize.ps1");
    const finalizeSh = findFile(scriptPack.files, "scripts/finalize.sh");

    for (const step of [
      "preflight",
      "backup",
      "test",
      "git-cleanup",
      "tag-release",
      "package"
    ]) {
      expect(finalizePs1).toContain(step);
      expect(finalizeSh).toContain(step);
    }
  });

  it("creates local tags only and does not push remote tags", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks."
      },
      { now: fixedNow }
    );

    const scriptPack = generateScriptPack(projectSpec);
    const tagPs1 = findFile(scriptPack.files, "scripts/tag-release.ps1");
    const tagSh = findFile(scriptPack.files, "scripts/tag-release.sh");

    expect(tagPs1).toContain("git tag");
    expect(tagSh).toContain("git tag");
    expect(tagPs1).not.toContain("git push");
    expect(tagSh).not.toContain("git push");
  });
});

function findFile(files: { path: string; content: string }[], path: string): string {
  const file = files.find((entry) => entry.path === path);
  if (!file) {
    throw new Error(`Missing file: ${path}`);
  }
  return file.content;
}
