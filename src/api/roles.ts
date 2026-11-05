import { and, eq } from 'drizzle-orm'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import { t } from 'elysia'

export interface Role {
  id: string
  nm: string
  is_delete: string
}

export const roleModels = {
  'role.listResponse': t.Array(
    t.Object({
      id: t.String(),
      nm: t.String(),
      is_delete: t.String(),
    }),
  ),
  'role.itemResponse': t.Object({
    id: t.String(),
    nm: t.String(),
    is_delete: t.String(),
  }),
}

/**
 * The columns the service reads and the insert shape it flips on delete. A
 * project's own `role` table satisfies this structurally, so the schema stays
 * in its own migrations and the service still gets drizzle's typing.
 */
export type RoleTable = SQLiteTable & {
  $inferInsert: { id?: string; nm?: string; isDelete?: string }
  id: SQLiteColumn
  nm: SQLiteColumn
  isDelete: SQLiteColumn
}

export type RoleServiceOptions<TRole extends RoleTable> = {
  // biome-ignore lint/suspicious/noExplicitAny: LibSQLDatabase is generic over the app's schema, which the kit cannot name
  db: LibSQLDatabase<any>
  role: TRole
  /** Builds the app's own not-found error so its error plugin maps the status. */
  notFound: (message: string) => Error
}

/**
 * The role lookup, identical in bms and rms: a soft-deleted row is invisible
 * and deleting is a flag flip.
 */
export function createRoleService<TRole extends RoleTable>({
  db,
  role,
  notFound,
}: RoleServiceOptions<TRole>) {
  return {
    async listRoles(): Promise<Role[]> {
      const roles = (await db
        .select({ id: role.id, nm: role.nm, isDelete: role.isDelete })
        .from(role)
        .where(eq(role.isDelete, 'N'))
        .orderBy(role.id)) as { id: string; nm: string; isDelete: string }[]

      return roles.map((r) => ({ id: r.id, nm: r.nm, is_delete: r.isDelete }))
    },

    async getRoleById(id: string): Promise<Role> {
      const rows = (await db
        .select({ id: role.id, nm: role.nm, isDelete: role.isDelete })
        .from(role)
        .where(and(eq(role.id, id), eq(role.isDelete, 'N')))
        .limit(1)) as { id: string; nm: string; isDelete: string }[]

      if (!rows[0]) throw notFound('Role not found')
      return { id: rows[0].id, nm: rows[0].nm, is_delete: rows[0].isDelete }
    },

    async deleteRole(id: string): Promise<void> {
      await db.update(role).set({ isDelete: 'Y' }).where(eq(role.id, id))
    },
  }
}
