import { t } from 'elysia'
import { and, eq } from 'drizzle-orm'

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

export type RoleServiceOptions = {
  /** Each app's Drizzle client; the kit does not own the schema. */
  // biome-ignore lint/suspicious/noExplicitAny: boundary to each app's typed db
  db: any
  /** Each app's `role` table. */
  // biome-ignore lint/suspicious/noExplicitAny: boundary to each app's typed table
  role: any
  /** Builds the app's own not-found error so its error plugin maps the status. */
  notFound: (message: string) => Error
}

/**
 * The role lookup, identical in bms and rms: a soft-deleted row is invisible
 * and deleting is a flag flip.
 */
export function createRoleService({ db, role, notFound }: RoleServiceOptions) {
  return {
    async listRoles(): Promise<Role[]> {
      const roles = await db
        .select({ id: role.id, nm: role.nm, isDelete: role.isDelete })
        .from(role)
        .where(eq(role.isDelete, 'N'))
        .orderBy(role.id)

      return roles.map((r: { id: string; nm: string; isDelete: string }) => ({
        id: r.id,
        nm: r.nm,
        is_delete: r.isDelete,
      }))
    },

    async getRoleById(id: string): Promise<Role> {
      const rows = await db
        .select({ id: role.id, nm: role.nm, isDelete: role.isDelete })
        .from(role)
        .where(and(eq(role.id, id), eq(role.isDelete, 'N')))
        .limit(1)

      if (!rows[0]) throw notFound('Role not found')
      return { id: rows[0].id, nm: rows[0].nm, is_delete: rows[0].isDelete }
    },

    async deleteRole(id: string): Promise<void> {
      await db.update(role).set({ isDelete: 'Y' }).where(eq(role.id, id))
    },
  }
}
