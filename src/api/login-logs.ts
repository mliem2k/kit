import { and, count, desc, eq, gte, like, lte } from 'drizzle-orm'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import { t } from 'elysia'
import { parseUserAgent } from './user-agent'

export interface LoginLog {
  id: string
  userId: string | null
  username: string
  action: string
  ipAddress: string | null
  userAgent: string | null
  deviceType: string | null
  browserName: string | null
  browserVersion: string | null
  osName: string | null
  osVersion: string | null
  success: boolean
  failReason: string | null
  createdDt: Date
}

export interface LoginLogListResult {
  logs: LoginLog[]
  total: number
  count: number
}

export const loginLogModels = {
  'loginLog.listQuery': t.Object({
    userId: t.Optional(t.String()),
    username: t.Optional(t.String()),
    action: t.Optional(
      t.Union([t.Literal('LOGIN'), t.Literal('LOGOUT'), t.Literal('LOGIN_FAILED')]),
    ),
    startDate: t.Optional(t.String()),
    endDate: t.Optional(t.String()),
    page: t.Optional(t.String()),
    pageSize: t.Optional(t.String()),
  }),
}

/**
 * The insert shape and the columns the filters touch. A project's own
 * `login_log` table satisfies this structurally, so the schema stays in its
 * own migrations and the service still gets drizzle's typing.
 */
export type LoginLogTable = SQLiteTable & {
  $inferInsert: {
    id: string
    userId?: string | null
    username: string
    action: string
    ipAddress?: string | null
    userAgent?: string | null
    deviceType?: string | null
    browserName?: string | null
    browserVersion?: string | null
    osName?: string | null
    osVersion?: string | null
    success?: boolean
    failReason?: string | null
  }
  userId: SQLiteColumn
  username: SQLiteColumn
  action: SQLiteColumn
  createdDt: SQLiteColumn
}

export type LoginLogServiceOptions<TTable extends LoginLogTable> = {
  // biome-ignore lint/suspicious/noExplicitAny: LibSQLDatabase is generic over the app's schema, which the kit cannot name
  db: LibSQLDatabase<any>
  loginLog: TTable
  /** Override the id source; defaults to `crypto.randomUUID()`. */
  uuid?: () => string
}

/**
 * Login audit trail, identical in bms and rms. Every login, logout and failed
 * attempt is recorded with the parsed user agent so the admin screen can show
 * the device without re-parsing the raw string.
 */
export function createLoginLogService<TTable extends LoginLogTable>({
  db,
  loginLog,
  uuid = () => crypto.randomUUID(),
}: LoginLogServiceOptions<TTable>) {
  return {
    async createLoginLog(input: {
      userId?: string
      username: string
      action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED'
      ipAddress?: string
      userAgent?: string
      success?: boolean
      failReason?: string
    }): Promise<LoginLog> {
      const id = uuid()
      const parsed = parseUserAgent(input.userAgent)

      // The table is generic here, so drizzle cannot resolve its insert type
      // from the constraint; the app's real table supplies the columns.
      const values = {
        id,
        userId: input.userId || null,
        username: input.username,
        action: input.action,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        deviceType: parsed.deviceType,
        browserName: parsed.browserName,
        browserVersion: parsed.browserVersion,
        osName: parsed.osName,
        osVersion: parsed.osVersion,
        success: input.success !== false,
        failReason: input.failReason || null,
      } as unknown as TTable['$inferInsert']

      const rows = await db.insert(loginLog).values(values).returning()

      return rows[0] as unknown as LoginLog
    },

    async listLoginLogs(filters?: {
      userId?: string
      username?: string
      action?: string
      startDate?: Date
      endDate?: Date
      page?: number
      pageSize?: number
    }): Promise<LoginLogListResult> {
      const page = filters?.page || 1
      const pageSize = filters?.pageSize || 50
      const skip = (page - 1) * pageSize

      const conditions = []

      if (filters?.userId) {
        conditions.push(eq(loginLog.userId, filters.userId))
      }

      if (filters?.username) {
        conditions.push(like(loginLog.username, `%${filters.username}%`))
      }

      if (filters?.action) {
        conditions.push(eq(loginLog.action, filters.action))
      }

      if (filters?.startDate) {
        conditions.push(gte(loginLog.createdDt, filters.startDate.toISOString()))
      }

      if (filters?.endDate) {
        conditions.push(lte(loginLog.createdDt, filters.endDate.toISOString()))
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined

      const [logs, totals] = await Promise.all([
        db
          .select()
          .from(loginLog)
          .where(where)
          .orderBy(desc(loginLog.createdDt))
          .limit(pageSize)
          .offset(skip),
        db.select({ total: count() }).from(loginLog).where(where),
      ])

      return {
        logs: logs as unknown as LoginLog[],
        total: totals[0].total,
        count: logs.length,
      }
    },
  }
}
