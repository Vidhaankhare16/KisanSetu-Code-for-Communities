/**
 * In-process TTL cache with request coalescing: concurrent callers asking for the same key
 * share one in-flight promise, so a burst of users on the same district triggers a single
 * upstream call. Bounded in size (oldest entries evicted first).
 */
export class TtlCache<V> {
  private readonly store = new Map<string, { value: V; expires: number }>();
  private readonly inflight = new Map<string, Promise<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
  ) {}

  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: V): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }

  async getOrLoad(key: string, load: () => Promise<V>): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const pending = this.inflight.get(key);
    if (pending) return pending;
    const promise = load()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }
}

/** Rounds coordinates so nearby requests share cache entries (~1 km at 0.01°). */
export const coordKey = (lat: number, lon: number, digits = 2) => `${lat.toFixed(digits)},${lon.toFixed(digits)}`;
