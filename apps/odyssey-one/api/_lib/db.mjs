// api/_lib/db.mjs — one pool per function instance (Fluid Compute reuses instances)
import pg from 'pg'

let pool
export function getPool() {
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
  })
  return pool
}
