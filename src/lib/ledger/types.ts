/**
 * Accountability ledger — record types and hash-chain helpers.
 *
 * Phase 1 of the accountability-layer refactor: every AI-driven change
 * (file edit, command run, API call) is recorded as one LedgerRecord in an
 * append-only JSONL file. Records are hash-chained so any later deletion or
 * modification is detectable by `verifyLedger`.
 */
import { createHash } from "node:crypto";

/** What kind of change a ledger record describes. */
export type LedgerChangeType = "file" | "command" | "api" | "gate" | "unknown";

/** Fields supplied by the caller when appending a record. */
export interface LedgerRecordInput {
  /** ISO-8601 timestamp of the change. */
  timestamp: string;
  /** Identity of the acting AI (e.g. "codex", "claude-code", "runner"). */
  actor: string;
  /** Kind of change that was made. */
  changeType: LedgerChangeType;
  /** sha256 of the target before the change ("unknown" when not measurable). */
  beforeHash: string;
  /** sha256 of the target after the change ("unknown" when not measurable). */
  afterHash: string;
  /** Where the authorization for this change came from (policy id, human, ...). */
  authSource: string;
  /** Task/run this change belongs to. */
  taskId: string;
  /** Extra structured detail (command line, file path, exit code, ...). */
  detail?: Record<string, unknown>;
}

/** A ledger record as stored: input plus chain metadata. */
export interface LedgerRecord extends Required<LedgerRecordInput> {
  /** Zero-based sequence number within the ledger file. */
  seq: number;
  /** sha256 of the previous record (GENESIS_PREV_HASH for seq 0). */
  prevHash: string;
  /** sha256 of this record's canonical body. */
  hash: string;
}

/** Expected prevHash of the first record in a ledger. */
export const GENESIS_PREV_HASH = "0".repeat(64);

type RecordBody = Omit<LedgerRecord, "hash">;

/**
 * Canonical serialization of a record body. Field order is fixed so the hash
 * is stable regardless of how the record object was constructed.
 */
export function canonicalRecordBody(record: RecordBody): string {
  return JSON.stringify({
    seq: record.seq,
    timestamp: record.timestamp,
    actor: record.actor,
    changeType: record.changeType,
    beforeHash: record.beforeHash,
    afterHash: record.afterHash,
    authSource: record.authSource,
    taskId: record.taskId,
    detail: record.detail ?? {},
    prevHash: record.prevHash,
  });
}

/** sha256 hex digest of a record's canonical body. */
export function recordHash(record: RecordBody): string {
  return createHash("sha256").update(canonicalRecordBody(record), "utf8").digest("hex");
}

/** sha256 hex digest of an arbitrary string (e.g. file content). */
export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Result of a ledger integrity check. */
export interface LedgerVerifyResult {
  ok: boolean;
  recordCount: number;
  /** seq of the first record that breaks the chain (present only when !ok). */
  brokenAt?: number;
  /** Machine-readable reason when !ok. */
  reason?: "hash-mismatch" | "prev-hash-mismatch" | "unparseable-line";
}
