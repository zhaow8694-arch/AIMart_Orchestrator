import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const outputPath = process.argv[2];
const requiredAdapterIds = ["codex", "claude-code", "trae", "cursor"];
const requiredSampleZipEntries = [
  "START_HERE.md",
  "START_CODEX_AUTONOMOUS.cmd",
  "START_CODEX_AUTONOMOUS.ps1",
  "scripts/run-customer-autonomous.ps1",
  "scripts/verify-customer-delivery.ps1",
  "runtime/FULL_LIFECYCLE_RUN_STATE.json",
  "runtime/RUNNER_STATE.json",
  "runtime/RUNNER_FAILURE_CLASSIFICATION.md",
  "runtime/RUNNER_RECOVERY_POLICY.md",
  "runtime/RUNNER_NEXT_ACTION.md",
  "runtime/RUNNER_FINAL_SUMMARY.md",
  "runtime/VERSION_LADDER.json",
  "runtime/PHASE_STATUS.json",
  "runtime/CUSTOMER_RUNTIME_VALIDATION_REPORT.md",
  "scripts/run-autonomous-version.ps1",
  "scripts/run-autonomous-version.sh",
  "scripts/runner-stage-machine.ps1",
  "scripts/runner-stage-machine.sh",
  "scripts/normalize-sample-pack.ps1",
  "scripts/normalize-sample-pack.sh",
  "scripts/classify-runner-failure.ps1",
  "scripts/classify-runner-failure.sh",
  "agent_adapters/codex/AGENTS.md",
  "agent_adapters/claude-code/CLAUDE.md",
  "agent_adapters/claude-code/CLAUDE_RUNBOOK.md",
  "agent_adapters/claude-code/CLAUDE_TASK_PROMPT.md",
  "agent_adapters/claude-code/CLAUDE_AUTONOMOUS_PROMPT.md",
  "agent_adapters/claude-code/CLAUDE_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/trae/TRAE_RUNBOOK.md",
  "agent_adapters/trae/TRAE_TASK_PROMPT.md",
  "agent_adapters/trae/TRAE_AUTONOMOUS_PROMPT.md",
  "agent_adapters/trae/TRAE_END_TO_END_DELIVERY_RUNBOOK.md",
  "agent_adapters/cursor/CURSOR_RUNBOOK.md",
  "agent_adapters/cursor/CURSOR_TASK_PROMPT.md",
  "agent_adapters/cursor/CURSOR_AUTONOMOUS_RULES.md",
  "agent_adapters/cursor/CURSOR_END_TO_END_DELIVERY_RUNBOOK.md"
];

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
  selectedAdapterIds: requiredAdapterIds,
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

const selectedAdapterIds = data.projectSpec?.selectedAdapterIds ?? [];
const missingAdapterIds = requiredAdapterIds.filter(
  (adapterId) => !selectedAdapterIds.includes(adapterId)
);
if (missingAdapterIds.length > 0) {
  throw new Error(
    `Sample pack generation did not select required adapter(s): ${missingAdapterIds.join(", ")}`
  );
}

const zipBuffer = Buffer.from(data.zipBase64, "base64");
const zipEntries = readCentralDirectoryNames(zipBuffer);
const missingEntries = requiredSampleZipEntries.filter(
  (entry) => !zipEntries.includes(entry)
);
if (missingEntries.length > 0) {
  throw new Error(`Missing sample ZIP entry: ${missingEntries[0]}`);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, zipBuffer);

function readCentralDirectoryNames(buffer) {
  const endOfCentralDirectory = 0x06054b50;
  let eocdOffset = -1;

  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === endOfCentralDirectory) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("Sample pack generation did not return a valid ZIP payload.");
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const names = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid sample ZIP central directory entry at ${offset}`);
    }

    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;

    names.push(buffer.subarray(nameStart, nameEnd).toString("utf8").replace(/\\/g, "/"));
    offset = nameEnd + extraLength + commentLength;
  }

  return names;
}
