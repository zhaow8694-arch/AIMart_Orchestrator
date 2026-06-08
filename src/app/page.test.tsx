import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import Page from "./page";

describe("home page shell", () => {
  it("renders the AIMart Orchestrator heading", () => {
    const html = renderToStaticMarkup(Page());

    expect(html).toContain("AIMart Orchestrator");
    expect(html).toContain("Project name");
    expect(html).toContain("Generate ZIP");
  });
});
