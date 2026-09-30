import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rateLimit";

describe("RateLimiter", () => {
  it("allows up to the limit within a window, then asks the client to wait", () => {
    let now = 0;
    const limiter = new RateLimiter(3, 60_000, () => now);
    expect([limiter.hit("a"), limiter.hit("a"), limiter.hit("a")]).toEqual([0, 0, 0]);
    expect(limiter.hit("a")).toBe(60);
    now = 30_000;
    expect(limiter.hit("a")).toBe(30);
  });

  it("tracks clients independently and resets after the window", () => {
    let now = 0;
    const limiter = new RateLimiter(1, 1000, () => now);
    limiter.hit("a");
    expect(limiter.hit("b")).toBe(0);
    expect(limiter.hit("a")).toBeGreaterThan(0);
    now = 1000;
    expect(limiter.hit("a")).toBe(0);
  });
});
