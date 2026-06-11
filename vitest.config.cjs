const path = require("node:path");
const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  cacheDir: ".vite-cache",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
  }
});
