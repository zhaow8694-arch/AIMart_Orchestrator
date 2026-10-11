# Project Spec

```json
{
  "projectName": "Todo API",
  "background": "A local sample API used to verify AIMart generated execution packs.",
  "rawDiscussion": "Build a local Todo API MVP with CRUD endpoints, unit tests, generated docs, and autonomous completion-gate verification before delivery.",
  "mvpScope": [
    "Todo CRUD endpoints",
    "local tests",
    "generated run docs"
  ],
  "forbiddenItems": [
    "No SaaS accounts",
    "no cloud runner",
    "no payment",
    "no production deploy",
    "no external API integration"
  ],
  "techStackPreferences": [
    "Next.js",
    "TypeScript",
    "Zod",
    "Vitest",
    "pnpm"
  ],
  "targetAdapterType": "codex",
  "selectedAdapterIds": [
    "codex",
    "claude-code",
    "trae",
    "cursor"
  ],
  "executionScope": "end_to_end_delivery",
  "executionMode": "end_to_end_autonomous",
  "testingRequirements": [
    "Core modules must have tests",
    "completion gate must run before success"
  ],
  "deliveryRequirements": [
    "Generated execution-pack ZIP with completion gate docs",
    "manifest",
    "roadmap",
    "and independent adapter options"
  ],
  "securityBoundaries": [
    "Do not read .env",
    "SSH keys",
    "cloud credentials",
    "or system secrets"
  ],
  "explicitRequirements": [
    "Todo CRUD endpoints",
    "local tests",
    "generated run docs",
    "Core modules must have tests",
    "completion gate must run before success",
    "Generated execution-pack ZIP with completion gate docs",
    "manifest",
    "roadmap",
    "and independent adapter options"
  ],
  "inferredAssumptions": [],
  "openQuestions": [],
  "createdAt": "2026-09-28T17:17:20.067Z"
}
```