import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("v0.3.2 delivery docs", () => {
  it("has versioned delivery documents for autonomous runner hardening", () => {
    const root = process.cwd();
    const docs = [
      "V0.3.2_IMPLEMENTATION_REPORT.md",
      "V0.3.2_RELEASE_NOTES.md",
      "V0.3.2_FINAL_DELIVERY_CHECK.md",
      "V0.3.2_KNOWN_ISSUES.md"
    ];

    for (const doc of docs) {
      const content = readFileSync(join(root, doc), "utf8");
      expect(content).toContain("v0.3.2");
      expect(content).toContain("Autonomous Runner Hardening");

      for (const topic of [
        "Runner Self-Test",
        "Failure Classifier",
        "stale sample cleanup",
        "ZIP magic / JSON zipBase64 handling",
        "normalized ZIP entry paths",
        "PowerShell 5.1 compatibility",
        "single current runner entry",
        "Completion Gate required before success"
      ]) {
        expect(content).toContain(topic);
      }
    }

    const finalDelivery = readFileSync(
      join(root, "V0.3.2_FINAL_DELIVERY_CHECK.md"),
      "utf8"
    );
    expect(finalDelivery).toContain("Final result: PASS");
  });
});
