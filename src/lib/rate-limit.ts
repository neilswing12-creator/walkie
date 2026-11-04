/**
 * Fixed-window in-memory rate limiter. Suitable for a single instance.
 * For multi-instance deploys swap the store for Redis/Upstash (same interface).
 */
type Bucket = { count: number; reset: number };
const store = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.reset < now) {
    store.set(key, { count: 1, reset: now + windowMs });
    if (store.size > 50000) for (const [k, v] of store) if (v.reset < now) store.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return { ok: b.count <= limit, retryAfter: Math.ceil((b.reset - now) / 1000) };
}
