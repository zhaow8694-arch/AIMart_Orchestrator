import type { ProjectSpecInput } from "@/lib/core/project-spec";
import { createExecutionPackZip } from "@/lib/zip/packager";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = (await request.json()) as ProjectSpecInput;
    const { pack, zipBuffer } = await createExecutionPackZip(input);

    return Response.json({
      fileName: `${slugify(pack.projectSpec.projectName)}-execution-pack.zip`,
      zipBase64: zipBuffer.toString("base64"),
      projectSpec: {
        projectName: pack.projectSpec.projectName,
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
