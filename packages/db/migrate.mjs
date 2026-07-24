// packages/db/migrate.mjs — tiny migration runner. Usage:
//   node --env-file=apps/odyssey-one/.env.local packages/db/migrate.mjs
//   ... migrate.mjs --reset   (DROP SCHEMA public CASCADE first — prototype ritual)
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const MIGRATIONS_DIR = join(HERE, 'migrations')

export function pendingMigrations(files, applied) {
  return files.filter((f) => f.endsWith('.sql') && !applied.has(f)).sort()
}

export async function migrate(client, dir = MIGRATIONS_DIR) {
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())'
  )
  const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name))
  for (const f of pendingMigrations(readdirSync(dir), applied)) {
    await client.query('BEGIN')
    try {
      await client.query(readFileSync(join(dir, f), 'utf8'))
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f])
      await client.query('COMMIT')
      console.log(`applied ${f}`)
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    }
  }
}

// CLI guard (same pattern as tools/token-check.mjs post-S88)
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const reset = process.argv.includes('--reset')
  if (reset && !process.argv.includes('--yes')) {
    console.error('--reset requires --yes (drops the ENTIRE public schema)')
    process.exit(1)
  }
  const { default: pg } = await import('pg')
  // ponytail: cert validation off — fine for Neon prototype, revisit for prod (proper CA bundle)
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  if (reset) {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
    console.log('schema reset')
  }
  await migrate(client)
  await client.end()
}
