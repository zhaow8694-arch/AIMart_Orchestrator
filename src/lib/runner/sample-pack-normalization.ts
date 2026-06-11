export type SamplePackNormalizationReason =
  | "SAMPLE_PACK_ALREADY_ZIP"
  | "SAMPLE_PACK_JSON_BASE64_RESPONSE";

export type NormalizedSamplePack = {
  reason: SamplePackNormalizationReason;
  zipBuffer: Buffer;
  normalizedEntries: string[];
};

export function normalizeSamplePackBytes(input: Buffer): NormalizedSamplePack {
  if (hasPkMagic(input)) {
    const normalizedEntries = normalizeZipEntryNames(readCentralDirectoryNames(input));

    return {
      reason: "SAMPLE_PACK_ALREADY_ZIP",
      zipBuffer: input,
      normalizedEntries
    };
  }

  const text = input.toString("utf8").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw invalidZipError("sample pack payload is not ZIP or JSON");
  }

  if (!isZipBase64Response(parsed)) {
    throw invalidZipError("JSON payload does not contain zipBase64");
  }

  const zipBuffer = Buffer.from(parsed.zipBase64, "base64");
  if (!hasPkMagic(zipBuffer)) {
    throw invalidZipError("zipBase64 does not decode to a ZIP payload");
  }

  return {
    reason: "SAMPLE_PACK_JSON_BASE64_RESPONSE",
    zipBuffer,
    normalizedEntries: normalizeZipEntryNames(readCentralDirectoryNames(zipBuffer))
  };
}

export function normalizeZipEntryName(entryName: string): string {
  return entryName.replace(/\\/g, "/");
}

export function normalizeZipEntryNames(entryNames: string[]): string[] {
  return entryNames.map(normalizeZipEntryName);
}

function hasPkMagic(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function isZipBase64Response(value: unknown): value is { zipBase64: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "zipBase64" in value &&
    typeof (value as { zipBase64: unknown }).zipBase64 === "string"
  );
}

function invalidZipError(reason: string): Error {
  return new Error(`SAMPLE_PACK_INVALID_ZIP: ${reason}`);
}

function readCentralDirectoryNames(buffer: Buffer): string[] {
  const endOfCentralDirectory = 0x06054b50;
  let eocdOffset = -1;

  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === endOfCentralDirectory) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw invalidZipError("missing ZIP end of central directory");
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const names: string[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw invalidZipError(`invalid central directory entry at ${offset}`);
    }

    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;

    names.push(buffer.subarray(nameStart, nameEnd).toString("utf8"));
    offset = nameEnd + extraLength + commentLength;
  }

  return names;
}
