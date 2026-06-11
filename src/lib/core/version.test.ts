import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { APP_NAME, APP_VERSION } from "./version";

describe("application version metadata", () => {
  it("exposes the v0.3.1 application identity", () => {
    expect(APP_NAME).toBe("AIMart Orchestrator");
    expect(APP_VERSION).toBe("0.3.1");
  });

  it("matches package.json version", () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    ) as { version: string };

    expect(packageJson.version).toBe("0.3.1");
    expect(APP_VERSION).toBe(packageJson.version);
  });
});
