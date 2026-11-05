import { describe, expect, it } from 'bun:test'
import { fromDbTimestamp, toApiTimestamp, toDbTimestamp } from './date.js'

// These lock in the storage contract shared with the ~12k rows written by the
// original Cloud Run backend: naive UTC wall-clock digits in the column, read
// back as UTC, emitted to clients as a zone-tagged instant. A regression here
// silently shifts every timestamp by 7 hours (the process runs TZ=Asia/Jakarta)
// and inflates elapsed-duration math, which feeds the amounts charged.
describe('db timestamp contract', () => {
  const instant = new Date('2026-08-01T18:33:02.701Z')

  it('stores UTC wall-clock digits with no zone tag', () => {
    expect(toDbTimestamp(instant)).toBe('2026-08-01 18:33:02.701')
  })

  // On SQLite these columns are TEXT, so range filters are string comparisons.
  // A 'T' separator sorts after ' ', so mixing formats makes date-filtered
  // history silently return nothing. Written values must sort against the
  // legacy rows they sit beside.
  it('sorts correctly against legacy rows in a string range filter', () => {
    const lowerBound = toDbTimestamp(new Date('2026-08-01T02:00:00.000Z'))
    const upperBound = toDbTimestamp(new Date('2026-08-01T22:00:00.000Z'))
    const legacyRow = '2026-08-01 19:00:24.476'
    expect(legacyRow >= lowerBound).toBe(true)
    expect(legacyRow <= upperBound).toBe(true)
  })

  it('round-trips an instant exactly', () => {
    expect(fromDbTimestamp(toDbTimestamp(instant)).getTime()).toBe(instant.getTime())
  })

  it('reads legacy space-separated values as UTC, not local time', () => {
    // This is the shape the Neon sync and the old backend produce.
    expect(fromDbTimestamp('2026-08-01 18:33:02.701').toISOString()).toBe(
      '2026-08-01T18:33:02.701Z',
    )
  })

  it('does not double-apply an offset when one is already present', () => {
    expect(fromDbTimestamp('2026-08-01T18:33:02.701Z').getTime()).toBe(instant.getTime())
    expect(fromDbTimestamp('2026-08-02T01:33:02.701+07:00').getTime()).toBe(instant.getTime())
  })

  // Better Auth stores session timestamps as epoch-millisecond text. Reading
  // one with the ISO path yields Invalid Date, which silently rejects the
  // session on the bearer-token route.
  it('reads Better Auth epoch-millisecond timestamps', () => {
    expect(fromDbTimestamp('1785644022571.0').toISOString()).toBe('2026-08-02T04:13:42.571Z')
    expect(fromDbTimestamp('1785644022571').getTime()).toBe(1785644022571)
  })

  it('does not mistake an ISO date for an epoch number', () => {
    expect(fromDbTimestamp('2026-08-01 18:33:02.701').toISOString()).toBe(
      '2026-08-01T18:33:02.701Z',
    )
  })

  it('emits a zone-tagged instant for API responses', () => {
    expect(toApiTimestamp('2026-08-01 18:33:02.701')).toBe('2026-08-01T18:33:02.701Z')
  })

  it('passes through empty values as null instead of Invalid Date', () => {
    expect(toApiTimestamp(null)).toBeNull()
    expect(toApiTimestamp(undefined)).toBeNull()
    expect(toApiTimestamp('')).toBeNull()
    expect(toApiTimestamp('not-a-date')).toBeNull()
  })

  it('keeps a stored value and a fresh Date on the same footing', () => {
    // The bug this replaces: comparing a stored value against `new Date()`
    // was off by the TZ offset, inflating durations.
    const stored = toDbTimestamp(instant)
    const elapsedMs =
      new Date('2026-08-01T19:33:02.701Z').getTime() - fromDbTimestamp(stored).getTime()
    expect(Math.round(elapsedMs / 60000)).toBe(60)
  })
})
