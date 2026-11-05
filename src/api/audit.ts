import { Elysia } from 'elysia'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const PII_FIELDS = new Set(['password', 'pin', 'token'])

function redactPii(value: unknown): unknown {
  if (!value || typeof value !== 'object' || ArrayBuffer.isView(value)) return value
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    result[k] = PII_FIELDS.has(k) ? '[REDACTED]' : v
  }
  return result
}

function parseTarget(pathname: string): { tableName: string; recordId: string } {
  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] === 'api') segments.shift()
  return {
    tableName: segments[0] ?? 'unknown',
    recordId: segments[1] ?? 'none',
  }
}

function safeBody(body: unknown): object | null {
  if (body && typeof body === 'object' && !ArrayBuffer.isView(body)) {
    return redactPii(body) as object
  }
  return null
}

function clientIp(request: Request): string | null {
  return request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ?? request.headers.get('x-real-ip') ?? null
}

/** The signed in user of a request, or nothing for an anonymous one. Each project supplies its own. */
export type AuditUserLookup = (request: Request) => Promise<{ id: string } | undefined>

/** Inserts one audit row. Receives the drizzle values so each project keeps its own table. */
export type AuditWriter = (row: {
  userId: string
  action: string
  tableName: string
  recordId: string
  beforeJson: object | null
  afterJson: object | null
  ip: string | null
}) => Promise<unknown>

/**
 * An Elysia plugin that writes an audit row for every mutating request by a
 * signed in user, and another for a failed one. Auth routes are skipped, and
 * `password`, `pin` and `token` fields are redacted from what is stored. A
 * failure to write the row never fails the request.
 */
export function createAuditPlugin(options: { extractUser: AuditUserLookup; write: AuditWriter }) {
  const { extractUser, write } = options

  return new Elysia({ name: 'plugin.audit' })
    .onAfterHandle({ as: 'global' }, async ({ request, response, body }) => {
      if (!MUTATION_METHODS.has(request.method)) return
      const url = new URL(request.url)
      if (url.pathname.startsWith('/api/auth/')) return

      const user = await extractUser(request as Request)
      if (!user) return

      const { tableName, recordId } = parseTarget(url.pathname)
      await write({
        userId: user.id,
        action: request.method,
        tableName,
        recordId,
        beforeJson: safeBody(body),
        afterJson: typeof response === 'object' ? (redactPii(response) as object) : null,
        ip: clientIp(request as Request),
      }).catch(() => {})
    })
    .onError({ as: 'global' }, async ({ request, error, body }) => {
      if (!MUTATION_METHODS.has(request.method)) return
      const url = new URL(request.url)
      if (url.pathname.startsWith('/api/auth/')) return

      const user = await extractUser(request as Request)
      if (!user) return

      const { tableName, recordId } = parseTarget(url.pathname)
      const message = error instanceof Error ? error.message : String(error)
      await write({
        userId: user.id,
        action: `${request.method}:ERROR`,
        tableName,
        recordId,
        beforeJson: safeBody(body),
        afterJson: { error: message },
        ip: clientIp(request as Request),
      }).catch(() => {})
    })
}
