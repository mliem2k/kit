// Timestamp convention for this database.
//
// The `bill.*` (and friends) timestamp columns are Postgres `timestamp`
// (without time zone) / SQLite text, i.e. naive wall-clock digits with no
// offset tag. The ~12k rows written by the original Cloud Run backend store
// those digits in **UTC**, and that backend returned them to the browser as
// real UTC instants, letting the client render them in Asia/Jakarta. This
// module keeps the new backend on that exact same contract:
//
//   storage  -> naive UTC wall-clock digits   ("2026-08-01T18:33:02.701")
//   internal -> parsed back as UTC            (fromDbTimestamp)
//   API      -> emitted as a tagged instant   ("2026-08-01T18:33:02.701Z")
//
// The hazard this replaces: the process runs with TZ=Asia/Jakarta, and a
// naive string parsed with a bare `new Date(...)` is interpreted as *local*
// time. Reading a UTC-digit string that way silently shifts the instant by
// 7 hours, which previously inflated elapsed-duration math and therefore the
// amounts charged. Always use fromDbTimestamp to read a stored timestamp,
// never a bare `new Date(storedValue)`.

/**
 * Serialize an instant for storage: naive UTC wall-clock digits, no offset.
 *
 * The separator MUST be a space, matching every existing row. On Postgres the
 * column is a real `timestamp` so the value is cast and compared numerically,
 * and the separator is irrelevant. On SQLite/Turso the column is TEXT, so
 * `gte`/`lte` range filters are raw *string* comparisons: ' ' (0x20) sorts
 * before 'T' (0x54), so writing "…T02:00:00" would silently fail to match any
 * legacy "… 19:00:24" row and date-filtered history/revenue would come back
 * empty.
 */
export function toDbTimestamp(date: Date): string {
  // "2026-08-01T22:38:05.998Z" -> "2026-08-01 22:38:05.998"
  return date.toISOString().slice(0, 23).replace('T', ' ')
}

/**
 * Parse a stored timestamp back into the instant it represents.
 * Accepts both "YYYY-MM-DD HH:mm:ss.SSS" (written by the legacy backend and
 * by the Neon sync) and "YYYY-MM-DDTHH:mm:ss.SSS", with or without an
 * explicit offset. Naive values are read as UTC, matching toDbTimestamp.
 */
export function fromDbTimestamp(value: string | Date): Date {
  if (value instanceof Date) return value
  const raw = value.trim()

  // Better Auth writes the session table through its own adapter, which stores
  // epoch milliseconds as text ("1785644022571.0") instead of the ISO text the
  // rest of this database uses. Those rows are self-consistent for Better
  // Auth's own cookie flow, but any other reader gets an Invalid Date, and
  // because "1..." sorts before "2..." they also silently drop out of text
  // range filters. Detect and convert rather than trusting the format.
  if (/^\d{12,}(?:\.\d+)?$/.test(raw)) return new Date(Number(raw))

  const normalized = raw.replace(' ', 'T')
  // Already carries a zone ("...Z", "+07:00", "-05:00")? Trust it as-is.
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized)
  return new Date(hasZone ? normalized : `${normalized}Z`)
}

/**
 * Serialize a stored timestamp for an API response as an unambiguous UTC
 * instant, so clients parse it correctly regardless of their own timezone
 * and can render it in Asia/Jakarta.
 */
export function toApiTimestamp(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = fromDbTimestamp(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}
