import type { ProjectSpecInput } from "@/lib/core/project-spec";
import { createExecutionPackZip } from "@/lib/zip/packager";

export const runtime = "nodejs";

// Generation input is plain text; anything above 1MB is abuse, not a project.
// The content-length header is a fast path only — it can be missing (chunked
// uploads, some runtimes), so the body stream itself is capped while reading.
const MAX_BODY_BYTES = 1_000_000;

class BodyTooLargeError extends Error {}

async function readBoundedBodyText(request: Request): Promise<string> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > MAX_BODY_BYTES) {
    throw new BodyTooLargeError();
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request: Request): Promise<Response> {
  let input: ProjectSpecInput;
  try {
    input = JSON.parse(await readBoundedBodyText(request)) as ProjectSpecInput;
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return Response.json(
        { error: "Request body too large." },
        { status: 413 }
      );
    }
    return Response.json({ error: "Invalid request payload." }, { status: 400 });
  }

  try {
    const { pack, zipBuffer } = await createExecutionPackZip(input);

    return Response.json({
      fileName: `${slugify(pack.projectSpec.projectName)}-execution-pack.zip`,
      zipBase64: zipBuffer.toString("base64"),
      projectSpec: {
        projectName: pack.projectSpec.projectName,
        executionMode: pack.projectSpec.executionMode,
        executionScope: pack.projectSpec.executionScope,
        selectedAdapterIds: pack.projectSpec.selectedAdapterIds,
        mvpScope: pack.projectSpec.mvpScope,
        explicitRequirements: pack.projectSpec.explicitRequirements,
        inferredAssumptions: pack.projectSpec.inferredAssumptions,
        openQuestions: pack.projectSpec.openQuestions
      }
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate pack."
      },
      { status: 400 }
    );
  }
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "aimart";
}
