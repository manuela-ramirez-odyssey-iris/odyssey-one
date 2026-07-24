// apps/odyssey-one/tools/verify-seed.mjs — post-seed sanity: counts + invariant spot-checks.
// Usage: node --env-file=.env.local tools/verify-seed.mjs
import pg from 'pg'

const CHECKS = [
  ['10k shipments', `SELECT count(*) >= 10000 AS ok FROM shipments`],
  ['I1 order identity: no shipment order missing from orders', `
    SELECT NOT EXISTS (
      SELECT 1 FROM shipments s, unnest(s.orders) AS o(num)
      WHERE NOT EXISTS (SELECT 1 FROM orders ord WHERE ord.order_number = o.num)
    ) AS ok`],
  ['I2 customer coherence: shipped orders match shipment customer', `
    SELECT NOT EXISTS (
      SELECT 1 FROM orders o JOIN shipments s ON s.sell_shipment = o.shipment_sell_id
      WHERE o.customer <> s.customer_id
    ) AS ok`],
  ['I4 date order: pickup <= delivery', `
    SELECT NOT EXISTS (SELECT 1 FROM shipments WHERE pickup_ts > delivery_ts) AS ok`],
  ['I9 pending: no order_number AND never on a shipment', `
    SELECT NOT EXISTS (
      SELECT 1 FROM orders WHERE order_number = '' AND (shipment_sell_id IS NOT NULL OR order_id IS NULL)
    ) AS ok`],
  ['every shipment has stops', `
    SELECT NOT EXISTS (
      SELECT 1 FROM shipments s WHERE NOT EXISTS (SELECT 1 FROM stops st WHERE st.shipment_sell_id = s.sell_shipment)
    ) AS ok`],
  ['every shipment has tenders', `
    SELECT NOT EXISTS (
      SELECT 1 FROM shipments s WHERE NOT EXISTS (SELECT 1 FROM tenders t WHERE t.shipment_sell_id = s.sell_shipment)
    ) AS ok`],
  ['9 users seeded (guest + 8)', `SELECT count(*) = 9 AS ok FROM users`],
  ['guest cannot log in', `SELECT password IS NULL AS ok FROM users WHERE id = 'guest'`],
]

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
let failed = 0
for (const [name, sql] of CHECKS) {
  const { rows: [{ ok }] } = await client.query(sql)
  console.log(`${ok ? '✓' : '✖'} ${name}`)
  if (!ok) failed++
}
const { rows: [{ size }] } = await client.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`)
console.log(`ℹ database size: ${size}`)
await client.end()
process.exit(failed ? 1 : 0)
