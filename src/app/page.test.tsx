import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import Page from "./page";

describe("home page shell", () => {
  it("renders the AIMart Orchestrator heading", () => {
    const html = renderToStaticMarkup(Page());

    expect(html).toContain("AIMart Orchestrator");
    expect(html).toContain("v0.3.1");
    expect(html).toContain("Project name");
    expect(html).toContain("Generate ZIP");
    expect(html).toContain("Target AI adapters");
    expect(html).toContain("Codex");
    expect(html).toContain("Claude Code");
    expect(html).toContain("Trae");
    expect(html).toContain("Cursor");
    expect(html).toContain("Execution scope");
    expect(html).toContain("Single Phase");
    expect(html).toContain("Multi Phase");
    expect(html).toContain("End-to-End Delivery");
    expect(html).toContain("End-to-End Autonomous");
    expect(html).toContain("multiple independent execution options");
    expect(html).toContain("does not run multiple agents together");
  });
});
