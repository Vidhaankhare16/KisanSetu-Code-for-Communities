/**
 * Live integration tests: hit the real open-data providers and Gemini.
 * Run with `npm run test:live` (needs network; Gemini checks need GEMINI_API_KEY in .env.local).
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/live/**/*.live.ts"],
    setupFiles: ["tests/setup.ts", "tests/live/loadEnv.ts"],
    testTimeout: 180_000,
    fileParallelism: false,
  },
});
