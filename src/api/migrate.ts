import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'

/**
 * Applies the committed drizzle SQL migrations in `migrationsFolder` to the
 * database named by `DATABASE_URL` (and `DATABASE_AUTH_TOKEN`), and exits the
 * process with an error when the URL is missing. Each project's own
 * `db/migrate.ts` is a one line call that supplies its folder.
 */
export async function runMigrationsFromEnv(migrationsFolder: string): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }

  const db = drizzle({
    connection: { url: databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN },
  })
  console.log(`Running migrations from ${migrationsFolder}...`)
  await migrate(db, { migrationsFolder })
  console.log('Migrations complete.')
}
