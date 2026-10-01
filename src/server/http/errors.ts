/** Typed application errors, mapped to HTTP responses by `apiHandler`. */

export type ErrorCode = "bad_request" | "not_found" | "rate_limited" | "upstream_unavailable" | "ai_unavailable" | "internal";

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  not_found: 404,
  rate_limited: 429,
  upstream_unavailable: 502,
  ai_unavailable: 503,
  internal: 500,
};

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

/** A third-party data source failed or returned something unexpected. */
export class UpstreamError extends AppError {
  constructor(
    readonly source: string,
    message: string,
    details?: unknown,
  ) {
    super("upstream_unavailable", `${source}: ${message}`, details);
    this.name = "UpstreamError";
  }
}
