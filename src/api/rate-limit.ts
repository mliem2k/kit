import { sql } from 'drizzle-orm'
import type { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core'

export interface RateLimitResult {
  allowed: boolean
  retryAfter: number
}

/**
 * A table with the three columns the limiter needs: `key` (unique), `count`
 * and `resetAt` (an ISO string). Each project declares its own `rate_limits`
 * table with this shape and hands it in, so the schema stays in its own
 * migrations while the logic lives here once.
 */
// biome-ignore lint/suspicious/noExplicitAny: drizzle's table generics cannot be named structurally
export type RateLimitTable = SQLiteTableWithColumns<any>

/** Anything with drizzle's insert builder; a libsql database or a transaction. */
// biome-ignore lint/suspicious/noExplicitAny: the concrete database type differs per project
export type RateLimitDb = { insert: (table: any) => any }

/**
 * Builds a fixed window limiter backed by one upsert, so concurrent requests
 * cannot read a stale count: the row is created or incremented in a single
 * statement, and an expired window restarts at 1.
 */
export function createRateLimiter(options: { db: RateLimitDb; rateLimits: RateLimitTable }) {
  const { db } = options
  // biome-ignore lint/suspicious/noExplicitAny: columns are addressed by name, see RateLimitTable
  const rateLimits = options.rateLimits as any

  return async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const windowSecs = Math.ceil(windowMs / 1000)
    const now = new Date()
    const nowIso = now.toISOString()
    const newResetAt = new Date(now.getTime() + windowSecs * 1000).toISOString()

    const [row] = await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt: newResetAt })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`CASE WHEN ${rateLimits.resetAt} <= ${nowIso} THEN 1 ELSE ${rateLimits.count} + 1 END`,
          resetAt: sql`CASE WHEN ${rateLimits.resetAt} <= ${nowIso} THEN ${newResetAt} ELSE ${rateLimits.resetAt} END`,
        },
      })
      .returning()

    const resetAt = new Date(row.resetAt)
    const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))

    return row.count > limit ? { allowed: false, retryAfter } : { allowed: true, retryAfter: 0 }
  }
}
