import { describe, expect, it } from "vitest";
import { z } from "zod";
import { apiHandler } from "./apiHandler";
import { AppError } from "./errors";

const post = (body: unknown) =>
  new Request("http://localhost/api/v1/test", { method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": `10.0.0.${Math.random()}` } });

describe("apiHandler", () => {
  const handler = apiHandler({ body: z.object({ n: z.number() }) }, async ({ body }) => ({ doubled: body.n * 2 }));

  it("validates the body and returns JSON with CORS and request-id headers", async () => {
    const res = await handler(post({ n: 21 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ doubled: 42 });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("returns 400 with field-level details for invalid input", async () => {
    const res = await handler(post({ n: "x" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("bad_request");
    expect(json.error.details).toBeDefined();
  });

  it("maps typed errors to their status and hides unexpected ones", async () => {
    const notFound = apiHandler({}, async () => {
      throw new AppError("not_found", "No such crop");
    });
    expect((await notFound(post({}))).status).toBe(404);

    const crash = apiHandler({}, async () => {
      throw new Error("database password is hunter2");
    });
    const res = await crash(post({}));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("hunter2");
  });
});
