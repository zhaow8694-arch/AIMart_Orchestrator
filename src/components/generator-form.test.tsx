import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { GeneratorForm, getGenerationDisplayState } from "./generator-form";

describe("GeneratorForm", () => {
  it("renders the required v0.1 input fields", () => {
    const html = renderToStaticMarkup(<GeneratorForm />);

    for (const label of [
      "Project name",
      "Project background",
      "Deep discussion",
      "MVP scope",
      "Forbidden items",
      "Tech stack preferences",
      "Testing requirements",
      "Delivery requirements",
      "Security boundaries"
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('aria-busy="false"');
  });

  it("hides stale output while a new execution pack is generating", () => {
    const displayState = getGenerationDisplayState({
      isGenerating: true,
      summary: {
        projectName: "Old Project",
        mvpScope: ["Old MVP"],
        explicitRequirements: ["Old requirement"],
        inferredAssumptions: [],
        openQuestions: []
      },
      download: {
        url: "blob:old-pack",
        fileName: "old-project-execution-pack.zip"
      }
    });

    expect(displayState.buttonLabel).toBe("Generating ZIP...");
    expect(displayState.buttonAriaBusy).toBe(true);
    expect(displayState.summary).toBeNull();
    expect(displayState.download).toBeNull();
  });
});
