import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/server/**", "src/contracts/**"],
      exclude: ["**/*.test.ts", "src/server/repositories/firestore.ts"],
      reporter: ["text", "html", "json-summary"],
    },
  },
});
