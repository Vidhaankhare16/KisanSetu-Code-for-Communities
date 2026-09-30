import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/server/**", "src/contracts/**", "src/i18n/**", "src/lib/format.ts"],
      exclude: ["**/*.test.ts", "src/server/repositories/firestore.ts"],
      reporter: ["text", "html", "json-summary"],
      // CI fails if coverage of the tested layers drops below these floors.
      thresholds: { statements: 80, lines: 80, functions: 75, branches: 65 },
    },
  },
});
