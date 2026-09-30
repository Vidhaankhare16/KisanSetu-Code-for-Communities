import { env, isAiConfigured } from "@/server/config/env";
import { apiHandler } from "@/server/http/apiHandler";

export const GET = apiHandler({}, async () => {
  const e = env();
  return {
    status: "ok",
    version: process.env.npm_package_version ?? "2.0.0",
    ai: isAiConfigured() ? (e.GOOGLE_GENAI_USE_VERTEXAI ? "vertex-ai" : "gemini-api") : "disabled",
    model: e.GEMINI_MODEL,
    storage: e.DATA_BACKEND,
    time: new Date().toISOString(),
  };
});
