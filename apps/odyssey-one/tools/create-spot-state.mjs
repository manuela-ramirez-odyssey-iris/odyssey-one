// apps/odyssey-one/tools/create-spot-state.mjs — one-shot table creation for
// SpotBid's DB-backed quote/drafts persistence (spot_state table).
// Usage: node --env-file=.env.local tools/create-spot-state.mjs
//
// Idempotent (CREATE TABLE IF NOT EXISTS) and touches ONLY spot_state — no
// other table, no reseed. Running this against a fresh/empty table IS the
// "reset all bids" the user authorized: DB-authoritative hydration (see
// spotStore.js/draftStore.js) wipes any stale localStorage quote on load
// once a null DB response comes back for it.
//
// ponytail: a standalone script rather than a packages/db/migrations/*.sql
// entry — spot_state is SpotBid-app-local (not part of the shared shipments
// schema those migrations own), so a small self-contained tool matches the
// existing tools/verify-seed.mjs idiom instead of growing the shared
// migration runner for one table.
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()

await client.query(`
  CREATE TABLE IF NOT EXISTS spot_state (
    shipment_id text NOT NULL,
    kind text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (shipment_id, kind)
  )
`)
console.log('✓ spot_state table ready')

const { rows: [{ count }] } = await client.query('SELECT count(*) FROM spot_state')
console.log(`ℹ spot_state row count: ${count}`)

await client.end()
