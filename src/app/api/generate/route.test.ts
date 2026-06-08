import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/generate", () => {
  it("returns a downloadable ZIP payload and ProjectSpec summary", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          projectName: "Tiny Planner",
          rawDiscussion: "Build a local MVP for planning coding tasks."
        })
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      fileName: string;
      zipBase64: string;
      projectSpec: { projectName: string; openQuestions: string[] };
    };

    expect(body.fileName).toBe("tiny-planner-execution-pack.zip");
    expect(body.zipBase64.startsWith("UEs")).toBe(true);
    expect(body.projectSpec.projectName).toBe("Tiny Planner");
    expect(body.projectSpec.openQuestions.length).toBeGreaterThan(0);
  });
});
