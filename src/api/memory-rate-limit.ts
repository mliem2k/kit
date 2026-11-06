// An in-process fixed-window limiter for public, mostly stateless APIs.
//
// The database-backed `createRateLimiter` is the right choice when several
// instances share a table. This one is deliberately local: it costs no round
// trip, resets on deploy/restart and is not shared across instances, which is
// an acceptable trade for a public read-only API or a contact form.

export interface MemoryRateLimitResult {
  allowed: boolean
  retryAfter: number
}

type Bucket = { count: number; resetAt: number }

/**
 * Creates a fixed-window limiter backed by a Map. The sweep keeps the map from
 * growing without bound; `unref` lets a CLI or short-lived process exit.
 */
export function createMemoryRateLimiter(options: { sweepMs?: number } = {}) {
  const buckets = new Map<string, Bucket>()
  const sweepMs = options.sweepMs ?? 5 * 60 * 1000

  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  }, sweepMs)
  timer.unref?.()

  return function rateLimit(key: string, limit: number, windowMs: number): MemoryRateLimitResult {
    const now = Date.now()
    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true, retryAfter: 0 }
    }

    bucket.count += 1
    if (bucket.count <= limit) return { allowed: true, retryAfter: 0 }
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
}
