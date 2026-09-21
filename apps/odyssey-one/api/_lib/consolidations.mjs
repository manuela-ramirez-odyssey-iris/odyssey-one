// apps/odyssey-one/api/_lib/consolidations.mjs — POST /shipment-service/v1/consolidation.
// Live half of Apply (S155 §3.3). The mock half is
// src/api/services/consolidationService.ts; both drive the SAME pure builder
// (consolidateShipments.mjs) and the SAME writers (planShipment.mjs's
// buildInsertShipmentQuery / buildSearchIndexQuery), so a consolidation is
// byte-identical in the two runtimes.
import { ROW_COLUMNS } from './shipments.mjs'
import { buildInsertShipmentQuery, buildSearchIndexQuery } from './planShipment.mjs'
import { buildConsolidatedShipment } from './consolidateShipments.mjs'

// `load` is NOT in ROW_COLUMNS (the grid has no Load column), but the builder
// joins the sources' loads — so it is selected explicitly here.
export function buildSourceRowsQuery(sellShipments) {
  return {
    text: `SELECT ${ROW_COLUMNS}, load, detail FROM shipments WHERE sell_shipment = ANY($1)`,
    values: [sellShipments],
  }
}

// ponytail: count-based seq — it races under two concurrent planners (both read
// N, both mint C7…N+1, the second INSERT 23505s). A real sequence needs a
// migration; the PK collision is a loud 500, never a silent overwrite.
export const SEQ_QUERY = {
  text: `SELECT count(*)::int AS n FROM shipments WHERE sell_shipment BETWEEN '27000000' AND '27999999'`,
  values: [],
}

const bad = (message) => Object.assign(new Error(message), { status: 400 })

export async function applyConsolidation({ body, db }) {
  const sellShipments = body?.sellShipments
  if (!Array.isArray(sellShipments) || sellShipments.length < 2) {
    throw bad('sellShipments must name at least two shipments')
  }
  const ids = sellShipments.map(String)
  if (new Set(ids).size !== ids.length) throw bad('sellShipments contains duplicates')

  const { rows } = await db.query(buildSourceRowsQuery(ids))
  const byId = new Map(rows.map((r) => [r.sellShipment, r]))
  const missing = ids.filter((id) => !byId.has(id))
  if (missing.length) throw bad(`Unknown shipment(s): ${missing.join(', ')}`)
  // One customer per consolidation — the rule the grid's locked chip enforces
  // (CNS-10). Re-checked here because the client is not a trust boundary.
  const customers = new Set(rows.map((r) => r.customerId))
  if (customers.size > 1) throw bad(`A consolidation cannot span customers: ${[...customers].join(', ')}`)

  // Request order IS the planner's selection order, which drives the stop
  // sequence and the anchor — the SELECT's row order is not meaningful.
  const sources = ids.map((id) => {
    const { detail, ...row } = byId.get(id)
    return { row, detail }
  })

  const { rows: seqRows } = await db.query(SEQ_QUERY)
  const built = buildConsolidatedShipment({ sources, seq: (seqRows[0]?.n ?? 0) + 1 })
  const newId = built.row.sellShipment
  const gone = built.removedSellShipments.filter((id) => id !== newId)

  // Sequenced so a failure leaves the SOURCES intact and readable: nothing is
  // deleted until the new shipment exists, except the search rows (rebuilt
  // below) and the reused C… shell (whose PK the INSERT needs).
  await db.query({
    text: `DELETE FROM search_index WHERE domain = 'shipments' AND entity_id = ANY($1)`,
    values: [built.removedSellShipments],
  })
  if (built.removedSellShipments.includes(newId)) {
    // Re-applying onto an existing consolidation (CNS-09 id reuse): the old row
    // owns the PK the INSERT wants. Its orders must let go first —
    // orders.shipment_sell_id has no ON DELETE (001_schema.sql:52), unlike
    // stops/tenders/events, which cascade.
    await db.query({ text: `UPDATE orders SET shipment_sell_id = NULL WHERE shipment_sell_id = $1`, values: [newId] })
    await db.query({ text: `DELETE FROM shipments WHERE sell_shipment = $1`, values: [newId] })
  }
  await db.query(buildInsertShipmentQuery(built))
  // Keyed on the ORDERS (the union the builder computed), not on the old
  // shipment ids — the reuse branch above already dropped one of those links.
  await db.query({
    text: `UPDATE orders SET shipment_sell_id = $1 WHERE order_number = ANY($2)`,
    values: [newId, built.row.orders],
  })
  if (gone.length) {
    await db.query({ text: `DELETE FROM shipments WHERE sell_shipment = ANY($1)`, values: [gone] })
  }
  await db.query(buildSearchIndexQuery(built.row))

  // Read the row back through the LIST's own projection so the client gets a
  // shape identical to a grid row — never the builder's object, which carries
  // fields (load, seal, equipment) the list does not select.
  const { rows: fresh } = await db.query({
    text: `SELECT ${ROW_COLUMNS} FROM shipments WHERE sell_shipment = $1`,
    values: [newId],
  })
  return { success: true, data: { row: fresh[0], detail: built.detail } }
}
