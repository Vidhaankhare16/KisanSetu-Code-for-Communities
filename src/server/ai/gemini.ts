/**
 * Thin, typed wrapper over the Google Gen AI SDK.
 *
 * - Uses Vertex AI with Application Default Credentials when GOOGLE_GENAI_USE_VERTEXAI is
 *   set (Cloud Run), otherwise the Gemini Developer API key.
 * - `generateStructured` asks Gemini for JSON matching a Zod schema, validates the reply,
 *   and retries once with the validation errors so malformed output never reaches users.
 * - Every call retries transient errors (rate limits, temporary outages) with backoff.
 */
import "server-only";
import { GoogleGenAI, ThinkingLevel as SdkThinkingLevel, type Content, type Part } from "@google/genai";
import { z } from "zod";
import { env, isAiConfigured } from "@/server/config/env";
import { AppError } from "@/server/http/errors";
import { logger } from "@/server/logger";

let client: GoogleGenAI | undefined;

export function getGenAI(): GoogleGenAI {
  if (!isAiConfigured()) {
    throw new AppError("ai_unavailable", "Gemini is not configured. Set GEMINI_API_KEY or enable Vertex AI.");
  }
  if (!client) {
    const e = env();
    client =
      e.GOOGLE_GENAI_USE_VERTEXAI && e.GOOGLE_CLOUD_PROJECT
        ? new GoogleGenAI({ vertexai: true, project: e.GOOGLE_CLOUD_PROJECT, location: e.GOOGLE_CLOUD_LOCATION })
        : new GoogleGenAI({ apiKey: e.GEMINI_API_KEY });
  }
  return client;
}

/** Rate limits and temporary server errors: worth another try after a short wait. */
const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export function isTransientAiError(err: unknown): boolean {
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === "number") return TRANSIENT_STATUS.has(status);
  return /RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed|ECONNRESET/i.test(String((err as Error | null)?.message ?? err));
}

/**
 * Retries a Gemini call on transient errors with exponential backoff and jitter
 * (about 0.8 s, 1.6 s, 3.2 s). Shared model capacity can briefly refuse requests under load;
 * a farmer should not see an error for that.
 */
export async function withRetry<T>(
  task: string,
  call: () => Promise<T>,
  { attempts = 4, baseMs = 800, sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call();
    } catch (err) {
      if (attempt >= attempts || !isTransientAiError(err)) throw err;
      const delayMs = Math.round(baseMs * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5));
      logger.warn("gemini retry", { task, attempt, delayMs, error: String(err).slice(0, 200) });
      await sleep(delayMs);
    }
  }
}

/** Reasoning depth. ("minimal" is omitted: not all current Flash models accept it.) */
export type ThinkingLevel = "low" | "medium" | "high";

const THINKING: Record<ThinkingLevel, SdkThinkingLevel> = {
  low: SdkThinkingLevel.LOW,
  medium: SdkThinkingLevel.MEDIUM,
  high: SdkThinkingLevel.HIGH,
};

export interface StructuredRequest<T> {
  /** Stable name for logs and metrics, e.g. "advisor.recommendation". */
  task: string;
  schema: z.ZodType<T>;
  system: string;
  /** Text prompt, or multimodal parts (images, audio) followed by text. */
  input: string | Part[];
  thinking?: ThinkingLevel;
  temperature?: number;
}

/** JSON Schema for Gemini's `responseJsonSchema` (the `$schema` URI is not accepted). */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, { target: "draft-2020-12" }) as Record<string, unknown>;
  return rest;
}

export async function generateStructured<T>(req: StructuredRequest<T>): Promise<T> {
  const ai = getGenAI();
  const model = env().GEMINI_MODEL;
  const userParts: Part[] = typeof req.input === "string" ? [{ text: req.input }] : req.input;
  const contents: Content[] = [{ role: "user", parts: userParts }];

  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    const res = await withRetry(req.task, () =>
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: req.system,
          responseMimeType: "application/json",
          responseJsonSchema: toGeminiSchema(req.schema),
          temperature: req.temperature ?? 0.4,
          thinkingConfig: { thinkingLevel: THINKING[req.thinking ?? "low"] },
        },
      }),
    );
    const text = res.text ?? "";
    const parsed = safeJson(text);
    const result = req.schema.safeParse(parsed);
    logger.info("gemini call", { task: req.task, model, ms: Date.now() - started, attempt, ok: result.success });
    if (result.success) return result.data;

    // Show the model its own output and the validation errors, then ask again.
    contents.push(
      { role: "model", parts: [{ text }] },
      {
        role: "user",
        parts: [{ text: `Your JSON did not match the schema: ${z.prettifyError(result.error)}. Reply again with corrected JSON only.` }],
      },
    );
  }
  throw new AppError("ai_unavailable", `Gemini returned invalid output for ${req.task}`);
}

export async function generateText(task: string, system: string, input: string | Part[], thinking: ThinkingLevel = "low"): Promise<string> {
  const ai = getGenAI();
  const started = Date.now();
  const res = await withRetry(task, () =>
    ai.models.generateContent({
      model: env().GEMINI_MODEL,
      contents: [{ role: "user", parts: typeof input === "string" ? [{ text: input }] : input }],
      config: { systemInstruction: system, thinkingConfig: { thinkingLevel: THINKING[thinking] } },
    }),
  );
  logger.info("gemini call", { task, ms: Date.now() - started });
  return res.text?.trim() ?? "";
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Some responses wrap JSON in a markdown fence; strip it and try once more.
    const fenced = text.replace(/^```(?:json)?\s*|\s*```$/g, "");
    try {
      return JSON.parse(fenced);
    } catch {
      return undefined;
    }
  }
}
