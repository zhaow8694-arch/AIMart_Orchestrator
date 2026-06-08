import { describe, expect, it } from "vitest";

import { APP_NAME, APP_VERSION } from "./version";

describe("application version metadata", () => {
  it("exposes the v0.1 application identity", () => {
    expect(APP_NAME).toBe("AIMart Orchestrator");
    expect(APP_VERSION).toBe("0.1.0");
  });
});
