/**
 * Accountability ledger — integrity verification.
 *
 * Recomputes the hash chain from scratch: every record's stored hash must
 * match a recomputation from its body, and every record's prevHash must match
 * the previous record's hash. Deleting or editing any middle line breaks the
 * chain and is reported with the seq where it broke.
 */
import { existsSync, readFileSync } from "node:fs";

import {
  GENESIS_PREV_HASH,
  recordHash,
  type LedgerRecord,
  type LedgerVerifyResult,
} from "./types";

export function verifyLedger(ledgerPath: string): LedgerVerifyResult {
  if (!existsSync(ledgerPath)) {
    return { ok: true, recordCount: 0 };
  }

  let expectedPrevHash = GENESIS_PREV_HASH;
  let recordCount = 0;
  const lines = readFileSync(ledgerPath, "utf8").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().length === 0) {
      continue;
    }

    let record: LedgerRecord;
    try {
      record = JSON.parse(line) as LedgerRecord;
    } catch {
      return { ok: false, recordCount, brokenAt: index, reason: "unparseable-line" };
    }

    const { hash, ...body } = record;
    if (typeof hash !== "string" || recordHash(body) !== hash) {
      return {
        ok: false,
        recordCount,
        brokenAt: typeof record.seq === "number" ? record.seq : index,
        reason: "hash-mismatch",
      };
    }
    if (record.prevHash !== expectedPrevHash) {
      return {
        ok: false,
        recordCount,
        brokenAt: typeof record.seq === "number" ? record.seq : index,
        reason: "prev-hash-mismatch",
      };
    }

    expectedPrevHash = hash;
    recordCount += 1;
  }

  return { ok: true, recordCount };
}
