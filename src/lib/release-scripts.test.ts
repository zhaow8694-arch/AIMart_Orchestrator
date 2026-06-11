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

  it("stops the PowerShell test script when pnpm commands fail", () => {
    const testPs1 = readProjectFile("scripts/test.ps1");

    expect(testPs1).toContain("$LASTEXITCODE");
    expect(testPs1).toContain("pnpm test failed");
    expect(testPs1).toContain("pnpm build failed");
  });

  it("keeps internal artifact directories out of source release packages", () => {
    const packagePs1 = readProjectFile("scripts/package.ps1");
    const packageSh = readProjectFile("scripts/package.sh");

    expect(packagePs1).toContain('Join-Path "releases" "v$Version"');
    expect(packagePs1).toContain("aimart-orchestrator-v$Version-source.zip");
    expect(packageSh).toContain('OUT_DIR="releases/v$VERSION"');
    expect(packageSh).toContain("aimart-orchestrator-v$VERSION-source.zip");

    for (const excluded of [
      ".aimart",
      ".aimart_backups",
      ".aimart_artifacts",
      ".vite-cache",
      "codex_runs",
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

  it("includes v0.2.0 delivery documents for Sandbox Autonomous Mode", () => {
    const implementationReport = readProjectFile("V0.2.0_IMPLEMENTATION_REPORT.md");
    const releaseNotes = readProjectFile("V0.2.0_RELEASE_NOTES.md");
    const finalCheck = readProjectFile("V0.2.0_FINAL_DELIVERY_CHECK.md");
    const knownIssues = readProjectFile("V0.2.0_KNOWN_ISSUES.md");

    expect(implementationReport).toContain("Sandbox Autonomous Mode");
    expect(releaseNotes).toContain("v0.2.0");
    expect(finalCheck).toContain("todo-api-generated-execution-pack.zip");
    expect(finalCheck).toContain("CODEX_AUTONOMOUS_PROMPT.md");
    expect(knownIssues).toContain("No known P0 or P1 blockers");
  });

  it("includes v0.2.1 delivery documents for Unified Autonomous Visual Runner", () => {
    const implementationReport = readProjectFile("V0.2.1_IMPLEMENTATION_REPORT.md");
    const releaseNotes = readProjectFile("V0.2.1_RELEASE_NOTES.md");
    const finalCheck = readProjectFile("V0.2.1_FINAL_DELIVERY_CHECK.md");
    const knownIssues = readProjectFile("V0.2.1_KNOWN_ISSUES.md");
    const finalizePs1 = readProjectFile("scripts/finalize.ps1");
    const finalizeSh = readProjectFile("scripts/finalize.sh");

    for (const content of [implementationReport, releaseNotes, finalizePs1, finalizeSh]) {
      expect(content).toContain("v0.2.1");
      expect(content).toContain("Unified Autonomous");
    }
    expect(finalCheck).toContain("run-codex-unified-autonomous.ps1");
    expect(finalCheck).toContain("runtime/AUTONOMOUS_RUN_STATUS.md");
    expect(knownIssues).toContain("V0.2.1 Known Issues");
  });
});
