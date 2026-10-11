// Wall-clock limits from docs/SANDBOX_ISOLATION_PLAN.md.
// Generated Claude launchers read timeouts.autonomousSec and timeouts.endToEndSec
// from runtime/SANDBOX_PROFILE.json and fall back to these defaults.
// Codex launchers keep their existing literals.

export const SANDBOX_TIMEOUT_DEFAULTS = {
  autonomousSec: 90 * 60,
  supervisedSec: 90 * 60,
  endToEndSec: 6 * 60 * 60
} as const;

export type SandboxTimeoutKey = "autonomousSec" | "endToEndSec";
