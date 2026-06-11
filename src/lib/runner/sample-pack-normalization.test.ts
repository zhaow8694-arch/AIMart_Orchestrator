import { describe, expect, it } from "vitest";

import {
  normalizeSamplePackBytes,
  normalizeZipEntryName,
  normalizeZipEntryNames
} from "./sample-pack-normalization";

describe("sample pack normalization", () => {
  it("keeps real ZIP bytes when PK magic and central directory are valid", () => {
    const zipBuffer = createStoredZip("runtime\\RUNNER_STATE.json", "{}");

    const normalized = normalizeSamplePackBytes(zipBuffer);

    expect(normalized.reason).toBe("SAMPLE_PACK_ALREADY_ZIP");
    expect(normalized.zipBuffer.subarray(0, 2).toString("utf8")).toBe("PK");
    expect(normalized.normalizedEntries).toEqual(["runtime/RUNNER_STATE.json"]);
  });

  it("decodes JSON zipBase64 responses into real ZIP bytes", () => {
    const zipBuffer = createStoredZip("scripts\\run-autonomous-version.ps1", "ok");
    const jsonResponse = Buffer.from(
      JSON.stringify({ zipBase64: zipBuffer.toString("base64") }),
      "utf8"
    );

    const normalized = normalizeSamplePackBytes(jsonResponse);

    expect(normalized.reason).toBe("SAMPLE_PACK_JSON_BASE64_RESPONSE");
    expect(normalized.zipBuffer.subarray(0, 2).toString("utf8")).toBe("PK");
    expect(normalized.normalizedEntries).toEqual([
      "scripts/run-autonomous-version.ps1"
    ]);
  });

  it("classifies text or error JSON responses as invalid sample ZIP payloads", () => {
    expect(() => normalizeSamplePackBytes(Buffer.from("<html>error</html>"))).toThrow(
      /SAMPLE_PACK_INVALID_ZIP/
    );
    expect(() =>
      normalizeSamplePackBytes(Buffer.from(JSON.stringify({ error: "failed" })))
    ).toThrow(/SAMPLE_PACK_INVALID_ZIP/);
  });

  it("normalizes ZIP entry names before comparison", () => {
    expect(normalizeZipEntryName("agent_adapters\\codex\\AGENTS.md")).toBe(
      "agent_adapters/codex/AGENTS.md"
    );
    expect(
      normalizeZipEntryNames([
        "runtime\\RUNNER_STATE.json",
        "scripts/run-autonomous-version.ps1"
      ])
    ).toEqual(["runtime/RUNNER_STATE.json", "scripts/run-autonomous-version.ps1"]);
  });
});

function createStoredZip(entryName: string, content: string): Buffer {
  const name = Buffer.from(entryName, "utf8");
  const data = Buffer.from(content, "utf8");
  const crc = crc32(data);
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt16LE(0, 10);
  localHeader.writeUInt16LE(0, 12);
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(data.length, 18);
  localHeader.writeUInt32LE(data.length, 22);
  localHeader.writeUInt16LE(name.length, 26);
  localHeader.writeUInt16LE(0, 28);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0, 8);
  centralHeader.writeUInt16LE(0, 10);
  centralHeader.writeUInt16LE(0, 12);
  centralHeader.writeUInt16LE(0, 14);
  centralHeader.writeUInt32LE(crc, 16);
  centralHeader.writeUInt32LE(data.length, 20);
  centralHeader.writeUInt32LE(data.length, 24);
  centralHeader.writeUInt16LE(name.length, 28);
  centralHeader.writeUInt16LE(0, 30);
  centralHeader.writeUInt16LE(0, 32);
  centralHeader.writeUInt16LE(0, 34);
  centralHeader.writeUInt16LE(0, 36);
  centralHeader.writeUInt32LE(0, 38);
  centralHeader.writeUInt32LE(0, 42);

  const centralDirectoryOffset = localHeader.length + name.length + data.length;
  const centralDirectorySize = centralHeader.length + name.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralDirectorySize, 12);
  end.writeUInt32LE(centralDirectoryOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localHeader, name, data, centralHeader, name, end]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const value of buffer) {
    crc ^= value;
    for (let index = 0; index < 8; index += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
