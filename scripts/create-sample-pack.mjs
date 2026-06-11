import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const outputPath = process.argv[2];

if (!outputPath) {
  throw new Error("Usage: node scripts/create-sample-pack.mjs <output-zip-path>");
}

const routePath = resolve(".next/server/app/api/generate/route.js");
const require = createRequire(import.meta.url);
const routeModule = require(routePath);
const postHandler = routeModule.POST ?? routeModule.routeModule?.userland?.POST;

if (typeof postHandler !== "function") {
  throw new Error(
    `Built route did not expose a POST handler. Exports: ${Object.keys(routeModule).join(", ")}`
  );
}

const sampleInput = {
  projectName: "Todo API",
  background: "A local sample API used to verify AIMart generated execution packs.",
  rawDiscussion:
    "Build a local Todo API MVP with CRUD endpoints, unit tests, generated docs, and autonomous completion-gate verification before delivery.",
  mvpScope: "Todo CRUD endpoints, local tests, generated run docs",
  forbiddenItems:
    "No SaaS accounts, no cloud runner, no payment, no production deploy, no external API integration",
  techStackPreferences: "Next.js, TypeScript, Zod, Vitest, pnpm",
  testingRequirements:
    "Core modules must have tests; completion gate must run before success",
  deliveryRequirements:
    "Generated execution-pack ZIP with completion gate docs, manifest, roadmap, and independent adapter options",
  securityBoundaries:
    "Do not read .env, SSH keys, cloud credentials, or system secrets",
  selectedAdapterIds: ["codex", "claude-code", "trae", "cursor"],
  executionScope: "end_to_end_delivery",
  executionMode: "end_to_end_autonomous"
};

const request = new Request("http://127.0.0.1/api/generate", {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify(sampleInput)
});

const response = await postHandler(request);
if (!response.ok) {
  throw new Error(`Sample pack generation failed with status ${response.status}`);
}

const data = await response.json();
if (!data.zipBase64) {
  throw new Error("Sample pack generation returned no zipBase64 payload.");
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(data.zipBase64, "base64"));
