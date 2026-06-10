import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("source release scripts and delivery docs", () => {
  it("requires zip in Unix preflight and does not fall back to tar.gz packaging", () => {
    const preflightSh = readProjectFile("scripts/preflight.sh");
    const packageSh = readProjectFile("scripts/package.sh");

    expect(preflightSh).toContain("require_cmd zip");
    expect(packageSh).toContain('zip -r "$OUT" .');
    expect(packageSh).not.toContain("tar \\");
    expect(packageSh).not.toContain(".tar.gz");
  });

  it("keeps internal artifact directories out of source release packages", () => {
    const packagePs1 = readProjectFile("scripts/package.ps1");
    const packageSh = readProjectFile("scripts/package.sh");

    for (const excluded of [
      ".aimart",
      ".aimart_backups",
      ".aimart_artifacts",
      "releases"
    ]) {
      expect(packagePs1).toContain(excluded);
      expect(packageSh).toContain(excluded);
    }
  });

  it("uses generated execution-pack wording in final delivery checks", () => {
    const finalCheck = readProjectFile("FINAL_DELIVERY_CHECK.md");
    const finalizePs1 = readProjectFile("scripts/finalize.ps1");
    const finalizeSh = readProjectFile("scripts/finalize.sh");

    for (const content of [finalCheck, finalizePs1, finalizeSh]) {
      expect(content).toContain(
        "Generated execution pack includes docs/README.md and docs/RUN_APP.md"
      );
      expect(content).not.toContain("README/RUN_APP docs present");
    }
  });

  it("distinguishes source release ZIPs from generated execution-pack ZIPs", () => {
    const releaseNotes = readProjectFile("RELEASE_NOTES.md");
    const finalizePs1 = readProjectFile("scripts/finalize.ps1");
    const finalizeSh = readProjectFile("scripts/finalize.sh");

    for (const content of [releaseNotes, finalizePs1, finalizeSh]) {
      expect(content).toContain("source release ZIP");
      expect(content).toContain("generated execution-pack ZIP");
    }
  });
});
