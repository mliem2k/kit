import { describe, expect, test } from 'bun:test'
import { createMemoryRateLimiter } from './memory-rate-limit'

describe('createMemoryRateLimiter', () => {
  test('allows up to the limit and then blocks with a retry window', () => {
    const rateLimit = createMemoryRateLimiter({ sweepMs: 60_000 })
    for (let i = 0; i < 3; i++) {
      expect(rateLimit('key', 3, 60_000).allowed).toBe(true)
    }
    const blocked = rateLimit('key', 3, 60_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  test('keeps keys independent', () => {
    const rateLimit = createMemoryRateLimiter({ sweepMs: 60_000 })
    expect(rateLimit('a', 1, 60_000).allowed).toBe(true)
    expect(rateLimit('a', 1, 60_000).allowed).toBe(false)
    expect(rateLimit('b', 1, 60_000).allowed).toBe(true)
  })

  test('resets after the window', async () => {
    const rateLimit = createMemoryRateLimiter({ sweepMs: 60_000 })
    expect(rateLimit('key', 1, 20).allowed).toBe(true)
    expect(rateLimit('key', 1, 20).allowed).toBe(false)
    await Bun.sleep(30)
    expect(rateLimit('key', 1, 20).allowed).toBe(true)
  })
})
