/**
 * Accountability ledger — append-only writer and query.
 *
 * Every append writes one JSON line and fsyncs before returning, so a crash or
 * power loss cannot silently lose an acknowledged record.
 */
import {
  closeSync,
  existsSync,
  fdatasyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeSync,
} from "node:fs";
import { dirname } from "node:path";

import {
  GENESIS_PREV_HASH,
  recordHash,
  type LedgerChangeType,
  type LedgerRecord,
  type LedgerRecordInput,
} from "./types";

export class LedgerParseError extends Error {
  readonly lineIndex: number;

  constructor(lineIndex: number, message: string) {
    super(message);
    this.name = "LedgerParseError";
    this.lineIndex = lineIndex;
  }
}

/**
 * Read every record from a ledger file. Blank lines are skipped. Throws
 * LedgerParseError on the first line that is not valid JSON.
 */
export function readLedgerRecords(ledgerPath: string): LedgerRecord[] {
  if (!existsSync(ledgerPath)) {
    return [];
  }
  const records: LedgerRecord[] = [];
  const lines = readFileSync(ledgerPath, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (line.trim().length === 0) {
      return;
    }
    try {
      records.push(JSON.parse(line) as LedgerRecord);
    } catch {
      throw new LedgerParseError(index, `ledger line ${index} is not valid JSON`);
    }
  });
  return records;
}

export interface LedgerQuery {
  taskId?: string;
  actor?: string;
  changeType?: LedgerChangeType;
}

/** Filter records by taskId / actor / changeType (all filters are ANDed). */
export function queryLedger(ledgerPath: string, filter: LedgerQuery = {}): LedgerRecord[] {
  return readLedgerRecords(ledgerPath).filter((record) => {
    if (filter.taskId !== undefined && record.taskId !== filter.taskId) {
      return false;
    }
    if (filter.actor !== undefined && record.actor !== filter.actor) {
      return false;
    }
    if (filter.changeType !== undefined && record.changeType !== filter.changeType) {
      return false;
    }
    return true;
  });
}

/**
 * Append one record to the ledger. Assigns seq/prevHash/hash from the current
 * tail, writes a single JSON line, and fsyncs the file before returning.
 */
export function appendLedgerRecord(ledgerPath: string, input: LedgerRecordInput): LedgerRecord {
  const parentDir = dirname(ledgerPath);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  const existing = readLedgerRecords(ledgerPath);
  const tail = existing.length > 0 ? existing[existing.length - 1] : null;
  const body = {
    seq: tail ? tail.seq + 1 : 0,
    timestamp: input.timestamp,
    actor: input.actor,
    changeType: input.changeType,
    beforeHash: input.beforeHash,
    afterHash: input.afterHash,
    authSource: input.authSource,
    taskId: input.taskId,
    detail: input.detail ?? {},
    prevHash: tail ? tail.hash : GENESIS_PREV_HASH,
  };
  const record: LedgerRecord = { ...body, hash: recordHash(body) };

  const fd = openSync(ledgerPath, "a");
  try {
    writeSync(fd, `${JSON.stringify(record)}\n`, null, "utf8");
    fdatasyncSync(fd);
  } finally {
    closeSync(fd);
  }
  return record;
}
