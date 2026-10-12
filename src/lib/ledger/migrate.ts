/**
 * Accountability ledger — migration from legacy sandbox audit logs.
 *
 * Reads a legacy `runtime/sandbox/<runId>/audit.jsonl` (written by
 * scripts/invoke-sandboxed.ps1) and appends one ledger record per line.
 * No line is dropped: missing fields become "unknown", and lines that are not
 * valid JSON are still recorded (with their raw text in detail) so the row
 * count is preserved.
 *
 * Usage: node src/lib/ledger/migrate.ts <audit.jsonl> <ledger.jsonl>
 */
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { appendLedgerRecord } from "./writer.ts";
import type { LedgerChangeType, LedgerRecordInput } from "./types.ts";

const UNKNOWN = "unknown";

/** The sandbox audit record shape written by invoke-sandboxed.ps1. */
interface SandboxAuditRecord {
  runId?: unknown;
  commandId?: unknown;
  startedAt?: unknown;
  adapterId?: unknown;
  mode?: unknown;
  file?: unknown;
  exitCode?: unknown;
  [key: string]: unknown;
}

function asText(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : UNKNOWN;
}

/** Convert one parsed audit object into a ledger input. */
export function auditRecordToLedgerInput(record: SandboxAuditRecord): LedgerRecordInput {
  return {
    timestamp: asText(record.startedAt),
    actor: asText(record.adapterId),
    changeType: "command",
    beforeHash: UNKNOWN,
    afterHash: UNKNOWN,
    authSource: asText(record.mode),
    taskId: asText(record.runId),
    detail: {
      source: "invoke-sandboxed",
      commandId: asText(record.commandId),
      file: asText(record.file),
      exitCode: typeof record.exitCode === "number" ? record.exitCode : UNKNOWN,
      raw: record,
    },
  };
}

/** Convert a line that is not valid JSON into a ledger input (row preserved). */
export function unparseableLineToLedgerInput(line: string): LedgerRecordInput {
  const changeType: LedgerChangeType = UNKNOWN;
  return {
    timestamp: UNKNOWN,
    actor: UNKNOWN,
    changeType,
    beforeHash: UNKNOWN,
    afterHash: UNKNOWN,
    authSource: UNKNOWN,
    taskId: UNKNOWN,
    detail: {
      source: "invoke-sandboxed",
      parseError: true,
      raw: line,
    },
  };
}

/**
 * Migrate a legacy sandbox audit.jsonl into ledger format.
 * Returns the number of ledger records written (equals the number of
 * non-blank lines in the source — nothing is dropped).
 */
export function migrateAuditJsonl(auditPath: string, ledgerPath: string): { migrated: number } {
  if (!existsSync(auditPath)) {
    return { migrated: 0 };
  }
  const lines = readFileSync(auditPath, "utf8").split("\n");
  let migrated = 0;
  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }
    let input: LedgerRecordInput;
    try {
      input = auditRecordToLedgerInput(JSON.parse(line) as SandboxAuditRecord);
    } catch {
      input = unparseableLineToLedgerInput(line);
    }
    appendLedgerRecord(ledgerPath, input);
    migrated += 1;
  }
  return { migrated };
}

function main(): void {
  const [auditPath, ledgerPath] = process.argv.slice(2);
  if (!auditPath || !ledgerPath) {
    console.error("usage: node src/lib/ledger/migrate.ts <audit.jsonl> <ledger.jsonl>");
    process.exit(2);
  }
  const { migrated } = migrateAuditJsonl(auditPath, ledgerPath);
  console.log(`migrated ${migrated} audit line(s) into ${ledgerPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
