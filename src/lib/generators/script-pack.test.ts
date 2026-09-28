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
      "package",
      "verify-autonomous-completion"
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

  it("requires zip before generated Unix packaging runs", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks."
      },
      { now: fixedNow }
    );

    const scriptPack = generateScriptPack(projectSpec);
    const preflightSh = findFile(scriptPack.files, "scripts/preflight.sh");
    const packageSh = findFile(scriptPack.files, "scripts/package.sh");

    expect(preflightSh).toContain("node pnpm git zip");
    expect(packageSh).toContain('zip -qr "$ARCHIVE"');
    expect(packageSh).not.toContain("zip unavailable");
  });

  it("generates autonomous completion verification scripts with release gates", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks."
      },
      { now: fixedNow }
    );

    const scriptPack = generateScriptPack(projectSpec);
    const gatePs1 = findFile(
      scriptPack.files,
      "scripts/verify-autonomous-completion.ps1"
    );
    const gateSh = findFile(
      scriptPack.files,
      "scripts/verify-autonomous-completion.sh"
    );
    const samplePs1 = findFile(scriptPack.files, "scripts/verify-sample-pack.ps1");
    const sourcePs1 = findFile(scriptPack.files, "scripts/verify-source-zip.ps1");
    const historyPs1 = findFile(
      scriptPack.files,
      "scripts/verify-history-releases.ps1"
    );

    for (const content of [gatePs1, gateSh]) {
      expect(content).toContain("pnpm test");
      expect(content).toContain("pnpm lint");
      expect(content).toContain("pnpm build");
      expect(content).toContain("verify-release");
      expect(content).toContain("verify-source-zip");
      expect(content).toContain("verify-sample-pack");
      expect(content).toContain("verify-history-releases");
      expect(content).toContain("git status");
      expect(content).toContain("TargetVersion");
    }

    expect(samplePs1).toContain("CODEX_COMPLETION_GATE_RUNBOOK.md");
    expect(samplePs1).toContain("EXECUTION_PACK_MANIFEST.md");
    expect(samplePs1).toContain("START_HERE.md");
    expect(samplePs1).toContain("START_CODEX_AUTONOMOUS.ps1");
    expect(samplePs1).toContain("START_CODEX_AUTONOMOUS.cmd");
    expect(samplePs1).toContain("runtime/FULL_LIFECYCLE_RUN_STATE.json");
    expect(samplePs1).toContain("runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md");
    expect(samplePs1).toContain("scripts/run-customer-autonomous.ps1");
    expect(samplePs1).toContain("scripts/verify-customer-delivery.ps1");
    expect(samplePs1).toContain("CLAUDE_TASK_PROMPT.md");
    expect(samplePs1).toContain("TRAE_TASK_PROMPT.md");
    expect(samplePs1).toContain("CURSOR_TASK_PROMPT.md");
    expect(samplePs1).toContain("RUN_STATE.json");
    expect(samplePs1).toContain("COMPLETION_GATE_REPORT.md");
    expect(sourcePs1).toContain("node_modules");
    expect(sourcePs1).toContain("SHA256");
    expect(historyPs1).toContain("v0.1.0");
    expect(historyPs1).toContain("v0.2.1");
  });

  it("generates the v0.3.2 runner hardening stage machine and approved runner", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Stable Runner",
        rawDiscussion: "Build a local MVP with a stable autonomous runner.",
        executionScope: "end_to_end_delivery",
        executionMode: "end_to_end_autonomous"
      },
      { now: fixedNow }
    );

    const scriptPack = generateScriptPack(projectSpec);
    const runnerPs1 = findFile(scriptPack.files, "scripts/run-autonomous-version.ps1");
    const runnerSh = findFile(scriptPack.files, "scripts/run-autonomous-version.sh");
    const stagePs1 = findFile(scriptPack.files, "scripts/runner-stage-machine.ps1");
    const stageSh = findFile(scriptPack.files, "scripts/runner-stage-machine.sh");
    const stages = [
      "PREFLIGHT",
      "CODEX_EXECUTION",
      "VALIDATION_TEST_LINT_BUILD",
      "SOURCE_ZIP",
      "SAMPLE_PACK",
      "SAMPLE_PACK_NORMALIZATION",
      "ADAPTER_COMPLETENESS",
      "SHA256_MANIFEST",
      "DOGFOOD",
      "COMMIT_TAG",
      "COMPLETION_GATE",
      "FREEZE"
    ];

    for (const content of [runnerPs1, runnerSh, stagePs1, stageSh]) {
      for (const stage of stages) {
        expect(content).toContain(stage);
      }
      expect(content).toContain("RUNNER_STATE.json");
      expect(content).toContain("RUNNER_NEXT_ACTION.md");
      expect(content).toContain("old V1/V2/V3/V4/V5/V6/V7/V8/V9 hotfix runners");
    }
    expect(runnerPs1).toContain("powershell -ExecutionPolicy Bypass -File .\\scripts\\run-autonomous-version.ps1 -TargetVersion");
    expect(runnerPs1).toContain(
      "# -ExecutionPolicy Bypass applies to this PowerShell process only"
    );
    expect(stagePs1).toContain(
      "# -ExecutionPolicy Bypass applies to this PowerShell process only"
    );
    expect(runnerPs1).toContain(
      'throw ("Runner failed with {0}: {1}" -f $Category, $Message)'
    );
    expect(runnerPs1).not.toContain("$Category`:");
  });

  it("generates failure classifier and sample-pack normalization scripts", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Classifier Pack",
        rawDiscussion: "Build a local MVP with classified runner recovery."
      },
      { now: fixedNow }
    );

    const scriptPack = generateScriptPack(projectSpec);
    const classifierPs1 = findFile(
      scriptPack.files,
      "scripts/classify-runner-failure.ps1"
    );
    const classifierSh = findFile(scriptPack.files, "scripts/classify-runner-failure.sh");
    const normalizePs1 = findFile(
      scriptPack.files,
      "scripts/normalize-sample-pack.ps1"
    );
    const normalizeSh = findFile(scriptPack.files, "scripts/normalize-sample-pack.sh");
    const categories = [
      "PNPM_ARGUMENT_LOSS",
      "POWERSHELL_51_SYNTAX",
      "CODEX_ARGUMENT_ORDER",
      "CODEX_PROMPT_ARGUMENT_SPLIT",
      "NEXT_START_ARGUMENT_ORDER",
      "SOURCE_ZIP_PATH_SEPARATOR",
      "SOURCE_ZIP_FORBIDDEN_ENTRY",
      "SAMPLE_PACK_JSON_BASE64_RESPONSE",
      "SAMPLE_PACK_STALE_FILE",
      "SAMPLE_PACK_INVALID_ZIP",
      "SAMPLE_PACK_MISSING_ADAPTER",
      "COMPLETION_GATE_FAILURE",
      "TAG_NULL_TRIM",
      "DIRTY_WORKTREE",
      "HISTORICAL_RELEASE_MODIFIED"
    ];

    for (const content of [classifierPs1, classifierSh]) {
      for (const category of categories) {
        expect(content).toContain(category);
      }
    }

    for (const content of [normalizePs1, normalizeSh]) {
      expect(content).toContain("zipBase64");
      expect(content).toContain(".ERROR.txt");
      expect(content).toContain("SAMPLE_PACK_JSON_BASE64_RESPONSE");
      expect(content).toContain("SAMPLE_PACK_INVALID_ZIP");
      expect(content).toContain("Replace");
      expect(content).toContain("\\");
      expect(content).toContain("/");
    }

    expect(normalizePs1).toContain(
      'throw ("{0}: {1}" -f $Category, $Details)'
    );
    expect(normalizePs1).not.toContain("$Category`:");
  });

  it("generates customer one-window runtime runner and delivery verifier scripts", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Tiny Planner",
        rawDiscussion: "Build a local MVP for planning coding tasks.",
        selectedAdapterIds: ["codex"],
        executionScope: "end_to_end_delivery",
        executionMode: "end_to_end_autonomous"
      },
      { now: fixedNow }
    );

    const scriptPack = generateScriptPack(projectSpec);
    const runnerPs1 = findFile(scriptPack.files, "scripts/run-customer-autonomous.ps1");
    const runnerSh = findFile(scriptPack.files, "scripts/run-customer-autonomous.sh");
    const verifyPs1 = findFile(
      scriptPack.files,
      "scripts/verify-customer-delivery.ps1"
    );
    const verifySh = findFile(
      scriptPack.files,
      "scripts/verify-customer-delivery.sh"
    );

    for (const content of [runnerPs1, runnerSh]) {
      expect(content).toContain("project name");
      expect(content).toContain("selected AI adapter");
      expect(content).toContain("current lifecycle phase");
      expect(content).toContain("current target version");
      expect(content).toContain("current task");
      expect(content).toContain("log updated time");
      expect(content).toContain("release output status");
      expect(content).toContain("completion gate status");
      expect(content).toContain("blocked/known issue status");
      expect(content).toContain("final PASS or FAIL summary");
      expect(content).toContain("FULL_LIFECYCLE_RUN_STATE.json");
      expect(content).toContain("verify-customer-delivery");
    }

    for (const content of [verifyPs1, verifySh]) {
      expect(content).toContain("generated project files");
      expect(content).toContain("generated docs");
      expect(content).toContain("tests/build instructions");
      expect(content).toContain("final artifact instructions");
      expect(content).toContain("BLOCKERS.md has no open P0/P1 blockers");
      expect(content).toContain("KNOWN_ISSUES has no P0/P1 blockers");
      expect(content).toContain("lifecycle state files are present and coherent");
      expect(content).toContain("selected adapter runbook exists");
      expect(content).toContain("completion gate report exists");
      expect(content).toContain("CUSTOMER_RUNTIME_VALIDATION_REPORT.md");
    }
  });

  it("keeps generated PowerShell scripts PSScriptAnalyzer-clean", () => {
    const projectSpec = createProjectSpec(
      {
        projectName: "Stock Desk",
        rawDiscussion: "必须支持库存录入。"
      },
      { now: fixedNow }
    );

    const scriptPack = generateScriptPack(projectSpec);
    const ps1Files = scriptPack.files.filter((file) =>
      file.path.endsWith(".ps1")
    );
    expect(ps1Files.length).toBeGreaterThan(0);

    for (const file of ps1Files) {
      // PSScriptAnalyzer PSAvoidUsingEmptyCatchBlock: every catch must do something.
      expect(`${file.path}: ${file.content}`).not.toContain("} catch {}");
    }

    // PSScriptAnalyzer PSUseApprovedVerbs: "Fail" is not an approved verb.
    const normalizer = findFile(
      scriptPack.files,
      "scripts/normalize-sample-pack.ps1"
    );
    expect(normalizer).toContain("function Write-NormalizationError(");
    expect(normalizer).not.toContain("Fail-Normalization");

    // PSScriptAnalyzer PSUseDeclaredVarsMoreThanAssignments: no dead variables.
    const runner = findFile(
      scriptPack.files,
      "scripts/run-autonomous-version.ps1"
    );
    expect(runner).not.toContain('$StatePath = Join-Path $RootDir');
    expect(runner).not.toContain('$NextActionPath = Join-Path $RootDir');

    const verifyRelease = findFile(
      scriptPack.files,
      "scripts/verify-release.ps1"
    );
    expect(verifyRelease).not.toContain('$Version = $TargetVersion.TrimStart');
  });

  it("never leaves an odd trailing backtick run inside an expandable PowerShell heredoc", () => {
    // Regression test: a line ending with an odd number of backticks inside an
    // @"..."@ heredoc escapes the newline, so the "@ terminator no longer sits
    // at the start of a line and the heredoc swallows the rest of the script.
    // (Dogfood 2026-09-28: this silently turned `try {` into a command call and
    // left `catch` orphaned in scripts/run-autonomous-version.ps1.)
    const projectSpec = createProjectSpec(
      {
        projectName: "Heredoc Probe",
        rawDiscussion: "probe"
      },
      { now: fixedNow }
    );

    const scriptPack = generateScriptPack(projectSpec);
    const hazards: string[] = [];

    for (const file of scriptPack.files) {
      if (!file.path.endsWith(".ps1")) continue;
      let inHeredoc = false;
      file.content.split("\n").forEach((line, index) => {
        const trimmed = line.trim();
        if (!inHeredoc) {
          if (trimmed === '@"' || trimmed.endsWith('@"')) inHeredoc = true;
          return;
        }
        if (trimmed.startsWith('"@')) {
          inHeredoc = false;
          return;
        }
        const run = line.match(/(`+)\s*$/);
        if (run && run[1].length % 2 === 1) {
          hazards.push(`${file.path}:${index + 1}: ${line}`);
        }
      });
    }

    expect(hazards).toEqual([]);
  });
});

function findFile(files: { path: string; content: string }[], path: string): string {
  const file = files.find((entry) => entry.path === path);
  if (!file) {
    throw new Error(`Missing file: ${path}`);
  }
  return file.content;
}
