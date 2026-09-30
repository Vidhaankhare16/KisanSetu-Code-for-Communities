/** Resilient JSON fetching for open-data providers: timeouts, retries, schema validation. */
import "server-only";
import type { z } from "zod";
import { logger } from "@/server/logger";
import { UpstreamError } from "./errors";

export interface FetchJsonOptions<T> {
  source: string;
  schema: z.ZodType<T>;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * GETs `url` and validates the JSON body against `schema`.
 * Network failures and retryable HTTP statuses are retried with exponential backoff;
 * other HTTP errors and malformed bodies fail immediately.
 */
export async function fetchJson<T>(url: string, opts: FetchJsonOptions<T>): Promise<T> {
  const { source, schema, timeoutMs = 15_000, retries = 2, headers } = opts;
  let lastError: UpstreamError | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(300 * 2 ** (attempt - 1));
    const started = Date.now();

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Accept: "application/json", ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      lastError = new UpstreamError(source, err instanceof Error ? err.message : String(err));
      continue;
    }

    if (!res.ok) {
      lastError = new UpstreamError(source, `HTTP ${res.status}`);
      if (RETRYABLE_STATUS.has(res.status)) continue;
      throw lastError;
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new UpstreamError(source, "response was not valid JSON");
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError(source, "unexpected response shape", parsed.error.issues.slice(0, 3));
    }
    logger.debug("upstream ok", { source, ms: Date.now() - started, attempt });
    return parsed.data;
  }

  logger.warn("upstream failed", { source, error: lastError?.message });
  throw lastError ?? new UpstreamError(source, "request failed");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
