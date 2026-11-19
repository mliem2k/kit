// Short lived in memory cache. Used to skip a Turso round trip per request for the session lookup,
// which runs on every 5 second poll of every open terminal.
export interface TtlCache<V> {
  get(key: string): V | undefined
  set(key: string, value: V): void
  clear(): void
}

export function createTtlCache<V>(
  ttlMs: number,
  maxEntries = 500,
  now: () => number = Date.now,
): TtlCache<V> {
  const entries = new Map<string, { value: V; storedAt: number }>()
  return {
    get(key) {
      const entry = entries.get(key)
      if (!entry) return undefined
      if (now() - entry.storedAt >= ttlMs) {
        entries.delete(key)
        return undefined
      }
      return entry.value
    },
    set(key, value) {
      if (entries.size >= maxEntries) {
        // Drop the oldest entry (Map keeps insertion order) so memory stays bounded.
        const oldest = entries.keys().next().value
        if (oldest !== undefined) entries.delete(oldest)
      }
      entries.delete(key)
      entries.set(key, { value, storedAt: now() })
    },
    clear() {
      entries.clear()
    },
  }
}
