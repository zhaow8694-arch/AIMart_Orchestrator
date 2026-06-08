import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { GeneratorForm } from "./generator-form";

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
  });
});
