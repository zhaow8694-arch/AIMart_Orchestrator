import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { appendLedgerRecord, queryLedger, readLedgerRecords } from "./writer";
import { verifyLedger } from "./verify";
import { migrateAuditJsonl } from "./migrate";
import { GENESIS_PREV_HASH } from "./types";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "ledger-test-"));
}

function sampleInput(overrides: Record<string, unknown> = {}) {
  return {
    timestamp: "2026-10-13T04:00:00.000Z",
    actor: "codex",
    changeType: "command" as const,
    beforeHash: "before-1",
    afterHash: "after-1",
    authSource: "sandbox-policy",
    taskId: "task-001",
    detail: { file: "config.yaml" },
    ...overrides,
  };
}

describe("accountability ledger writer", () => {
  it("appends records in order with a chained hash", () => {
    const dir = makeTempDir();
    const ledgerPath = join(dir, "ledger.jsonl");

    const first = appendLedgerRecord(ledgerPath, sampleInput());
    const second = appendLedgerRecord(ledgerPath, sampleInput({ actor: "claude-code" }));
    const third = appendLedgerRecord(ledgerPath, sampleInput({ taskId: "task-002" }));

    expect(first.seq).toBe(0);
    expect(first.prevHash).toBe(GENESIS_PREV_HASH);
    expect(second.seq).toBe(1);
    expect(second.prevHash).toBe(first.hash);
    expect(third.seq).toBe(2);
    expect(third.prevHash).toBe(second.hash);

    const records = readLedgerRecords(ledgerPath);
    expect(records).toHaveLength(3);
    expect(records[2].taskId).toBe("task-002");
  });

  it("queries records by taskId and actor", () => {
    const dir = makeTempDir();
    const ledgerPath = join(dir, "ledger.jsonl");

    appendLedgerRecord(ledgerPath, sampleInput({ taskId: "task-A", actor: "codex" }));
    appendLedgerRecord(ledgerPath, sampleInput({ taskId: "task-A", actor: "claude-code" }));
    appendLedgerRecord(ledgerPath, sampleInput({ taskId: "task-B", actor: "codex" }));

    expect(queryLedger(ledgerPath, { taskId: "task-A" })).toHaveLength(2);
    expect(queryLedger(ledgerPath, { actor: "claude-code" })).toHaveLength(1);
    expect(
      queryLedger(ledgerPath, { taskId: "task-A", actor: "codex" })
    ).toHaveLength(1);
    expect(queryLedger(ledgerPath, { taskId: "nope" })).toHaveLength(0);
  });

  it("verifies an intact ledger", () => {
    const dir = makeTempDir();
    const ledgerPath = join(dir, "ledger.jsonl");

    appendLedgerRecord(ledgerPath, sampleInput());
    appendLedgerRecord(ledgerPath, sampleInput({ changeType: "file" as const }));

    expect(verifyLedger(ledgerPath)).toEqual({ ok: true, recordCount: 2 });
  });

  it("verifies an empty (missing) ledger as ok", () => {
    const dir = makeTempDir();
    expect(verifyLedger(join(dir, "missing.jsonl"))).toEqual({ ok: true, recordCount: 0 });
  });

  it("alarms when a middle line is tampered with", () => {
    const dir = makeTempDir();
    const ledgerPath = join(dir, "ledger.jsonl");

    appendLedgerRecord(ledgerPath, sampleInput({ taskId: "task-A" }));
    appendLedgerRecord(ledgerPath, sampleInput({ taskId: "task-B" }));
    appendLedgerRecord(ledgerPath, sampleInput({ taskId: "task-C" }));

    // Tamper: rewrite the afterHash of the middle record without fixing hashes.
    const lines = readFileSync(ledgerPath, "utf8").split("\n");
    const middle = JSON.parse(lines[1]) as Record<string, unknown>;
    middle.afterHash = "evil-tampered";
    lines[1] = JSON.stringify(middle);
    writeFileSync(ledgerPath, lines.join("\n"), "utf8");

    const result = verifyLedger(ledgerPath);
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(1);
    expect(result.reason).toBe("hash-mismatch");
  });

  it("alarms when a middle line is deleted", () => {
    const dir = makeTempDir();
    const ledgerPath = join(dir, "ledger.jsonl");

    appendLedgerRecord(ledgerPath, sampleInput({ taskId: "task-A" }));
    appendLedgerRecord(ledgerPath, sampleInput({ taskId: "task-B" }));
    appendLedgerRecord(ledgerPath, sampleInput({ taskId: "task-C" }));

    const lines = readFileSync(ledgerPath, "utf8")
      .split("\n")
      .filter((line, index) => line.trim().length > 0 && index !== 1);
    writeFileSync(ledgerPath, `${lines.join("\n")}\n`, "utf8");

    const result = verifyLedger(ledgerPath);
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(2);
    expect(result.reason).toBe("prev-hash-mismatch");
  });
});

describe("sandbox audit migration", () => {
  it("converts audit.jsonl without dropping rows", () => {
    const dir = makeTempDir();
    const auditPath = join(dir, "audit.jsonl");
    const ledgerPath = join(dir, "ledger.jsonl");

    const auditLines = [
      JSON.stringify({
        runId: "20261013_040000",
        commandId: "abc123",
        startedAt: "2026-10-13T04:00:01.000Z",
        adapterId: "codex",
        mode: "stage",
        file: "run.ps1",
        exitCode: 0,
      }),
      // A sparse record: missing fields must become "unknown".
      JSON.stringify({ runId: "20261013_040000" }),
      // Not JSON at all: the row must still survive migration.
      "this line is not json {{{",
    ];
    writeFileSync(auditPath, `${auditLines.join("\n")}\n`, "utf8");

    const { migrated } = migrateAuditJsonl(auditPath, ledgerPath);
    expect(migrated).toBe(3);

    const records = readLedgerRecords(ledgerPath);
    expect(records).toHaveLength(3);

    expect(records[0].taskId).toBe("20261013_040000");
    expect(records[0].actor).toBe("codex");
    expect(records[0].changeType).toBe("command");
    expect(records[0].timestamp).toBe("2026-10-13T04:00:01.000Z");
    expect(records[0].authSource).toBe("stage");

    expect(records[1].actor).toBe("unknown");
    expect(records[1].beforeHash).toBe("unknown");
    expect(records[1].taskId).toBe("20261013_040000");

    expect(records[2].changeType).toBe("unknown");
    expect((records[2].detail as Record<string, unknown>).raw).toBe(
      "this line is not json {{{"
    );

    // Migrated ledger must verify cleanly.
    expect(verifyLedger(ledgerPath)).toEqual({ ok: true, recordCount: 3 });
  });

  it("migrates zero lines for a missing audit file", () => {
    const dir = makeTempDir();
    const { migrated } = migrateAuditJsonl(
      join(dir, "nope.jsonl"),
      join(dir, "ledger.jsonl")
    );
    expect(migrated).toBe(0);
  });
});
