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

  it("includes v0.2.2 autonomous completion gate scripts", () => {
    const expectedScripts = [
      "scripts/verify-release.ps1",
      "scripts/verify-release.sh",
      "scripts/verify-sample-pack.ps1",
      "scripts/verify-sample-pack.sh",
      "scripts/verify-source-zip.ps1",
      "scripts/verify-source-zip.sh",
      "scripts/verify-history-releases.ps1",
      "scripts/verify-history-releases.sh",
      "scripts/verify-autonomous-completion.ps1",
      "scripts/verify-autonomous-completion.sh"
    ];

    for (const scriptPath of expectedScripts) {
      expect(readProjectFile(scriptPath)).toContain("Autonomous Completion Gate");
    }

    const gatePs1 = readProjectFile("scripts/verify-autonomous-completion.ps1");
    const gateSh = readProjectFile("scripts/verify-autonomous-completion.sh");

    for (const content of [gatePs1, gateSh]) {
      expect(content).toContain("pnpm test");
      expect(content).toContain("pnpm lint");
      expect(content).toContain("pnpm build");
      expect(content).toContain("verify-release");
      expect(content).toContain("verify-source-zip");
      expect(content).toContain("verify-sample-pack");
      expect(content).toContain("verify-history-releases");
      expect(content).toContain("V0.3.1_KNOWN_ISSUES.md");
      expect(content).toContain("git status");
      expect(content).toContain("git show --no-patch --oneline");
      expect(content).toContain("git log --oneline -5");
      expect(content).toContain("final git status is clean");
      expect(content).toContain("TargetVersion");
    }
  });

  it("extends completion gates for v0.3.0 adapter registry and end-to-end packs", () => {
    const samplePs1 = readProjectFile("scripts/verify-sample-pack.ps1");
    const gatePs1 = readProjectFile("scripts/verify-autonomous-completion.ps1");

    for (const content of [samplePs1, gatePs1]) {
      expect(content).toContain("EXECUTION_PACK_MANIFEST.md");
      expect(content).toContain("agent_adapters/claude-code");
      expect(content).toContain("agent_adapters/trae");
      expect(content).toContain("agent_adapters/cursor");
      expect(content).toContain("runtime/RUN_STATE.json");
      expect(content).toContain("runtime/CURRENT_TASK.md");
      expect(content).toContain("runtime/PHASE_GATE_REPORT.md");
      expect(content).toContain("runtime/COMPLETION_GATE_REPORT.md");
    }
    expect(gatePs1).toContain("V0.3.0_IMPLEMENTATION_REPORT.md");
    expect(gatePs1).toContain("V0.3.0_RELEASE_NOTES.md");
    expect(gatePs1).toContain("V0.3.0_FINAL_DELIVERY_CHECK.md");
    expect(gatePs1).toContain("V0.3.0_KNOWN_ISSUES.md");
  });

  it("includes v0.2.2 delivery documents for Autonomous Completion Gate", () => {
    const implementationReport = readProjectFile("V0.2.2_IMPLEMENTATION_REPORT.md");
    const releaseNotes = readProjectFile("V0.2.2_RELEASE_NOTES.md");
    const finalCheck = readProjectFile("V0.2.2_FINAL_DELIVERY_CHECK.md");
    const knownIssues = readProjectFile("V0.2.2_KNOWN_ISSUES.md");
    const finalizePs1 = readProjectFile("scripts/finalize.ps1");
    const finalizeSh = readProjectFile("scripts/finalize.sh");

    for (const content of [
      implementationReport,
      releaseNotes,
      finalCheck,
      knownIssues,
      finalizePs1,
      finalizeSh
    ]) {
      expect(content).toContain("v0.2.2");
      expect(content).toContain("Autonomous Completion Gate");
    }
    expect(finalCheck).toContain("verify-autonomous-completion.ps1");
    expect(finalCheck).toContain("runtime/AUTONOMOUS_COMPLETION_GATE.md");
    expect(finalCheck).toContain("CODEX_COMPLETION_GATE_RUNBOOK.md");
  });

  it("includes v0.3.0 delivery documents for End-to-End Autonomous Delivery", () => {
    const implementationReport = readProjectFile("V0.3.0_IMPLEMENTATION_REPORT.md");
    const releaseNotes = readProjectFile("V0.3.0_RELEASE_NOTES.md");
    const finalCheck = readProjectFile("V0.3.0_FINAL_DELIVERY_CHECK.md");
    const knownIssues = readProjectFile("V0.3.0_KNOWN_ISSUES.md");
    const finalizePs1 = readProjectFile("scripts/finalize.ps1");
    const finalizeSh = readProjectFile("scripts/finalize.sh");

    for (const content of [
      implementationReport,
      releaseNotes,
      finalCheck,
      knownIssues,
      finalizePs1,
      finalizeSh
    ]) {
      expect(content).toContain("v0.3.0");
      expect(content).toContain("End-to-End Autonomous Delivery");
    }
    expect(finalCheck).toContain("Agent Adapter Registry");
    expect(finalCheck).toContain("EXECUTION_PACK_MANIFEST.md");
    expect(finalCheck).toContain("todo-api-generated-execution-pack.zip");
  });

  it("includes v0.3.1 delivery documents and customer runtime validation release automation", () => {
    const implementationReport = readProjectFile("V0.3.1_IMPLEMENTATION_REPORT.md");
    const releaseNotes = readProjectFile("V0.3.1_RELEASE_NOTES.md");
    const finalCheck = readProjectFile("V0.3.1_FINAL_DELIVERY_CHECK.md");
    const knownIssues = readProjectFile("V0.3.1_KNOWN_ISSUES.md");
    const packagePs1 = readProjectFile("scripts/package.ps1");
    const packageSh = readProjectFile("scripts/package.sh");
    const verifySamplePs1 = readProjectFile("scripts/verify-sample-pack.ps1");
    const gatePs1 = readProjectFile("scripts/verify-autonomous-completion.ps1");

    for (const content of [
      implementationReport,
      releaseNotes,
      finalCheck,
      knownIssues
    ]) {
      expect(content).toContain("v0.3.1");
      expect(content).toContain("Auto-Verified Customer Pack Runtime Validation");
    }

    expect(packagePs1).toContain("releases/v$Version/dogfood");
    expect(packageSh).toContain("releases/v$VERSION/dogfood");
    for (const content of [packagePs1, packageSh]) {
      expect(content).toContain("DOGFOOD_CUSTOMER_RUNTIME_VALIDATION.md");
      expect(content).toContain("START_CODEX_AUTONOMOUS.ps1");
      expect(content).toContain("runtime/FULL_LIFECYCLE_RUN_STATE.json");
      expect(content).toContain("scripts/verify-customer-delivery.ps1");
      expect(content).toContain("customer runtime validation evidence");
      expect(content).toContain("agent_adapters/claude-code/CLAUDE_RUNBOOK.md");
      expect(content).toContain("agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md");
      expect(content).toContain(
        "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md"
      );
      expect(content).toContain("agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md");
      expect(content).toContain(
        "agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md"
      );
      expect(content).toContain("agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md");
      expect(content).toContain(
        "agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md"
      );
    }

    expect(verifySamplePs1).toContain("START_HERE.md");
    expect(verifySamplePs1).toContain("START_CODEX_AUTONOMOUS.cmd");
    expect(verifySamplePs1).toContain("scripts/run-customer-autonomous.ps1");
    expect(verifySamplePs1).toContain("runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md");
    expect(gatePs1).toContain("V0.3.1_IMPLEMENTATION_REPORT.md");
    expect(gatePs1).toContain("V0.3.1_RELEASE_NOTES.md");
    expect(gatePs1).toContain("V0.3.1_FINAL_DELIVERY_CHECK.md");
    expect(gatePs1).toContain("V0.3.1_KNOWN_ISSUES.md");
    expect(gatePs1).toContain("FINAL_DELIVERY_CHECK contains PASS/no FAIL state");
    expect(gatePs1).toContain("KNOWN_ISSUES has no P0/P1 blocker");
  });
});
