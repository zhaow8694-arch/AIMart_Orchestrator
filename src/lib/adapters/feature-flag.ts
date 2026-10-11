export const CLAUDE_CODE_LAUNCHER_FLAG = "AIMART_ENABLE_CLAUDE_CODE_LAUNCHER";

const DISABLED = new Set(["", "0", "false", "no", "off"]);

export function isClaudeCodeLauncherEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const raw = env[CLAUDE_CODE_LAUNCHER_FLAG];
  if (raw === undefined) {
    return false;
  }

  return !DISABLED.has(raw.trim().toLowerCase());
}
