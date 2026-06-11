import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      ".aimart/**",
      "node_modules/**",
      "dist/**",
      "artifacts/**",
      "backups/**",
      "vitest.config.cjs"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals
);
