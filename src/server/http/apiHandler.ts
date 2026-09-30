/**
 * Route-handler wrapper shared by every API endpoint: request ids, CORS for the public API,
 * per-IP rate limiting, Zod validation of query/body, and uniform JSON errors.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "@/server/config/env";
import { logger } from "@/server/logger";
import { AppError } from "./errors";
import { RateLimiter } from "./rateLimit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

let limiter: RateLimiter | undefined;
const rateLimiter = () => (limiter ??= new RateLimiter(env().RATE_LIMIT_PER_MINUTE));

/** Expensive endpoints (simulation, AI) count as this many requests. */
export type Cost = 1 | 3 | 5;

interface HandlerOptions<Q extends z.ZodType, B extends z.ZodType> {
  query?: Q;
  body?: B;
  cost?: Cost;
}

interface HandlerInput<Q, B> {
  query: Q;
  body: B;
  request: Request;
  requestId: string;
}

type Result = Response | object;

export function apiHandler<Q extends z.ZodType = z.ZodUndefined, B extends z.ZodType = z.ZodUndefined>(
  opts: HandlerOptions<Q, B>,
  handler: (input: HandlerInput<z.infer<Q>, z.infer<B>>) => Promise<Result>,
) {
  return async (request: Request): Promise<Response> => {
    const requestId = request.headers.get("x-cloud-trace-context")?.split("/")[0] ?? randomUUID();
    const started = Date.now();
    const url = new URL(request.url);
    try {
      const retryAfter = rateLimit(request, opts.cost ?? 1);
      if (retryAfter > 0) {
        throw Object.assign(new AppError("rate_limited", "Too many requests, please slow down."), { retryAfter });
      }

      const query = opts.query ? parse(opts.query, Object.fromEntries(url.searchParams)) : undefined;
      const body = opts.body ? parse(opts.body, await readJson(request)) : undefined;
      const result = await handler({ query, body, request, requestId } as HandlerInput<z.infer<Q>, z.infer<B>>);
      const response = result instanceof Response ? result : Response.json(result);
      decorate(response, requestId);
      logger.info("api", { method: request.method, path: url.pathname, status: response.status, ms: Date.now() - started, requestId });
      return response;
    } catch (err) {
      const response = toErrorResponse(err, requestId);
      logger[response.status >= 500 ? "error" : "warn"]("api error", {
        method: request.method,
        path: url.pathname,
        status: response.status,
        ms: Date.now() - started,
        requestId,
        error: err instanceof Error ? err.message : String(err),
      });
      return response;
    }
  };
}

/** Answers CORS pre-flight requests for the public API. */
export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError("bad_request", "Request validation failed", z.treeifyError(result.error));
  }
  return result.data;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("bad_request", "Body must be valid JSON");
  }
}

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

function rateLimit(request: Request, cost: Cost): number {
  let wait = 0;
  for (let i = 0; i < cost; i++) wait = Math.max(wait, rateLimiter().hit(clientKey(request)));
  return wait;
}

function decorate(response: Response, requestId: string) {
  response.headers.set("X-Request-Id", requestId);
  for (const [k, v] of Object.entries(CORS_HEADERS)) response.headers.set(k, v);
}

export function toErrorResponse(err: unknown, requestId: string): Response {
  const appError =
    err instanceof AppError ? err : new AppError("internal", "Something went wrong. Please try again.");
  const body = { error: { code: appError.code, message: appError.message, details: appError.details, requestId } };
  const response = Response.json(body, { status: appError.status });
  decorate(response, requestId);
  const retryAfter = (err as { retryAfter?: number }).retryAfter;
  if (retryAfter) response.headers.set("Retry-After", String(retryAfter));
  return response;
}
