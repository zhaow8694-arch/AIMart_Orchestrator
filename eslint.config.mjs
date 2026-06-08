import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "artifacts/**", "backups/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals
);
