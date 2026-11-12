import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // The real package throws outside a React Server Component; tests run in plain Node.
      "server-only": path.resolve(__dirname, "src/test/server-only.ts"),
    },
  },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
