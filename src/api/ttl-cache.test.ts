import { describe, expect, it } from 'bun:test'
import { createTtlCache } from './ttl-cache'

describe('createTtlCache', () => {
  it('returns a value until the ttl elapses, then drops it', () => {
    let clock = 1000
    const cache = createTtlCache<string>(15_000, 10, () => clock)
    cache.set('a', 'one')
    clock += 14_999
    expect(cache.get('a')).toBe('one')
    clock += 1
    expect(cache.get('a')).toBeUndefined()
  })

  it('clear removes every entry', () => {
    const cache = createTtlCache<string>(15_000)
    cache.set('a', 'one')
    cache.set('b', 'two')
    cache.clear()
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
  })

  it('evicts the oldest entry once full and keeps the newest', () => {
    const cache = createTtlCache<number>(15_000, 2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  it('refreshing a key does not evict another entry', () => {
    const cache = createTtlCache<number>(15_000, 2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('a', 10)
    expect(cache.get('a')).toBe(10)
    expect(cache.get('b')).toBe(2)
  })
})
