/**
 * Fixed-window rate limiter per client key. In-process by design: Cloud Run instances each
 * enforce their own budget, which is enough to stop abuse of the free public API.
 */
export class RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  /** Returns seconds to wait when over the limit, otherwise 0. */
  hit(key: string): number {
    const t = this.now();
    const w = this.windows.get(key);
    if (!w || t - w.start >= this.windowMs) {
      this.windows.set(key, { start: t, count: 1 });
      this.prune(t);
      return 0;
    }
    w.count++;
    return w.count > this.limit ? Math.ceil((w.start + this.windowMs - t) / 1000) : 0;
  }

  private prune(t: number) {
    if (this.windows.size < 10_000) return;
    for (const [k, w] of this.windows) if (t - w.start >= this.windowMs) this.windows.delete(k);
  }
}
