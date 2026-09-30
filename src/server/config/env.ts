/**
 * Server configuration, validated once at start-up. Everything has a safe default so the
 * app runs locally with zero configuration (in-memory storage, no AI) and lights up
 * Vertex AI and Firestore automatically on Cloud Run.
 */
import "server-only";
import { z } from "zod";

const booleanFlag = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Gemini Developer API key (Google AI Studio). Used when Vertex AI is not enabled. */
  GEMINI_API_KEY: z.string().min(1).optional(),
  /** Use Vertex AI with Application Default Credentials (recommended on Cloud Run). */
  GOOGLE_GENAI_USE_VERTEXAI: booleanFlag,
  GOOGLE_CLOUD_PROJECT: z.string().min(1).optional(),
  GOOGLE_CLOUD_LOCATION: z.string().default("global"),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  /** Speech synthesis model for spoken answers in Indian languages. */
  GEMINI_TTS_MODEL: z.string().default("gemini-3.8-flash-tts"),
  /** `firestore` persists shared network data; `memory` keeps it in-process. */
  DATA_BACKEND: z.enum(["memory", "firestore"]).default("memory"),
  /** Number of historical years in the weather ensemble. */
  ENSEMBLE_YEARS: z.coerce.number().int().min(3).max(20).default(10),
  /** How long a request waits for SoilGrids before using the regional soil default. */
  SOIL_DEADLINE_MS: z.coerce.number().int().min(500).default(6000),
  /** Requests per minute per client IP on the public API. */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(60),
  /** Contact string sent to open-data providers that ask for one (OSM Nominatim). */
  DATA_CONTACT: z.string().default("kisansetu-dpg (https://github.com/Vidhaankhare16)"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    // A variable set to "" (e.g. `GEMINI_API_KEY=` copied from .env.example) means "not set".
    const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v.trim() !== ""));
    const parsed = EnvSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid environment configuration: ${z.prettifyError(parsed.error)}`);
    }
    cached = parsed.data;
  }
  return cached;
}

/** True when some Gemini backend (Vertex AI or API key) is configured. */
export function isAiConfigured(): boolean {
  const e = env();
  return Boolean((e.GOOGLE_GENAI_USE_VERTEXAI && e.GOOGLE_CLOUD_PROJECT) || e.GEMINI_API_KEY);
}

/** Test hook: forget the parsed environment so the next call re-reads `process.env`. */
export function resetEnvForTests(): void {
  cached = undefined;
}
