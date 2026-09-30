import { vi } from "vitest";

type Responder = (url: URL) => { status?: number; body: unknown } | undefined;

/**
 * Replaces global fetch with a router: the first responder that returns a value answers the
 * request. Returns the mock so tests can assert on the URLs that were requested.
 */
export function mockFetch(...responders: Responder[]) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    for (const respond of responders) {
      const hit = respond(url);
      if (hit) return new Response(JSON.stringify(hit.body), { status: hit.status ?? 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response("not mocked", { status: 404 });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

export const whenHost = (host: string, body: unknown, status = 200): Responder => (url) =>
  url.hostname === host ? { body, status } : undefined;
