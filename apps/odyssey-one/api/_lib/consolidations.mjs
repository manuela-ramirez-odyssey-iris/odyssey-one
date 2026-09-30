// apps/odyssey-one/api/_lib/consolidations.mjs — POST /shipment-service/v1/consolidation.
// Live half of Apply (S155 §3.3). The mock half is
// src/api/services/consolidationService.ts; both drive the SAME pure builder
// (consolidateShipments.mjs) and the SAME writers (planShipment.mjs's
// buildInsertShipmentQuery / buildSearchIndexQuery), so a consolidation is
// byte-identical in the two runtimes.
import {
  ROW_COLUMNS, buildSplitShipment, buildTenderInsertQuery, idOf, pullExternalOrders, serialIdsFor,
  writeSourceUpdates, writeSplits,
} from './shipments.mjs'
import { buildInsertShipmentQuery, buildSearchIndexQuery } from './planShipment.mjs'
import { buildConsolidatedShipment, checkConsolidation } from './consolidateShipments.mjs'

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
  if (!Array.isArray(sellShipments) || sellShipments.length < 1) {
    throw bad('sellShipments must name at least one shipment')
  }
  const ids = sellShipments.map(String)
  if (new Set(ids).size !== ids.length) throw bad('sellShipments contains duplicates')
  if (!Array.isArray(body?.stops) || body.stops.length === 0) throw bad('stops array required')

  const { rows } = await db.query(buildSourceRowsQuery(ids))
  const byId = new Map(rows.map((r) => [r.sellShipment, r]))
  const missing = ids.filter((id) => !byId.has(id))
  if (missing.length) throw bad(`Unknown shipment(s): ${missing.join(', ')}`)

  // Request order IS the planner's selection order, which drives the anchor —
  // the SELECT's row order is not meaningful.
  const sources = ids.map((id) => {
    const { detail, ...row } = byId.get(id)
    return { row, detail }
  })
  // An "external" order that lives on a SELECTED source is already in its
  // roster (Remove → pending → Add Orders can offer it back); only the rest
  // are pulled from other shipments.
  const externalOrders = (Array.isArray(body.externalOrders) ? body.externalOrders : [])
    .filter((e) => !ids.includes(String(e.sourceSellShipment)))
  checkConsolidation({ sources, stops: body.stops, externalOrders })

  // Revalidated BEFORE any write — a source that went Accepted/Sent since the
  // search 400s here (LINX-15872), exactly as save-stops does.
  const { records: external, sources: externalSources } = await pullExternalOrders(db, externalOrders)
  const now = new Date()
  const { rows: seqRows } = await db.query(SEQ_QUERY)
  const built = buildConsolidatedShipment({
    sources, stops: body.stops, externals: external, tenderList: body.tenderList ?? [],
    seq: (seqRows[0]?.n ?? 0) + 1, now,
  })
  // C3 / DEC-205 — an order a C source lost becomes a Direct of its own. The
  // serial ids are read here, before any write (a gap throws with nothing done).
  const serial = await serialIdsFor(db, built.splitOrders.map((p) => p.orderRec))
  const splits = built.splitOrders.map(({ source, orderRec }) =>
    buildSplitShipment({ source, orderRec, orderSerialId: serial.get(idOf(orderRec)), now }))
  const newId = built.row.sellShipment
  const gone = built.removedSellShipments.filter((id) => id !== newId)

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    // One transaction (same client/BEGIN/COMMIT shape as save-stops): a failure
    // half-way must not move an order out of its source with no C written.
    // Reads all happened above, before it opens.
    await client.query({
      text: `DELETE FROM search_index WHERE domain = 'shipments' AND entity_id = ANY($1)`,
      values: [built.removedSellShipments],
    })
    if (built.removedSellShipments.includes(newId)) {
      // Re-applying onto an existing consolidation (CNS-09 id reuse): the old row
      // owns the PK the INSERT wants. Its orders must let go first —
      // orders.shipment_sell_id has no ON DELETE (001_schema.sql:52), unlike
      // stops/tenders/events, which cascade.
      await client.query({ text: `UPDATE orders SET shipment_sell_id = NULL WHERE shipment_sell_id = $1`, values: [newId] })
      await client.query({ text: `DELETE FROM shipments WHERE sell_shipment = $1`, values: [newId] })
    }
    await client.query(buildInsertShipmentQuery(built))
    // The tenders table is the Tender tab's source of truth once it has rows
    // (sellShipmentDetail); seeded 1:1 from the blob, so the C matches (CNS-16).
    for (const option of built.detail.shippingOptionList) await client.query(buildTenderInsertQuery(newId, option))
    // Keyed on the ORDERS (the union the builder computed), not on the old
    // shipment ids — the reuse branch above already dropped one of those links.
    await client.query({
      text: `UPDATE orders SET shipment_sell_id = $1 WHERE order_number = ANY($2)`,
      values: [newId, built.row.orders],
    })
    await writeSourceUpdates(client, externalSources, externalOrders)
    await writeSplits(client, splits)
    if (gone.length) {
      await client.query({ text: `DELETE FROM shipments WHERE sell_shipment = ANY($1)`, values: [gone] })
    }
    await client.query(buildSearchIndexQuery(built.row))
    await client.query('COMMIT')
  } catch (e) {
    try { await client.query('ROLLBACK') } catch {}
    throw e
  } finally {
    client.release()
  }

  // Read the row back through the LIST's own projection so the client gets a
  // shape identical to a grid row — never the builder's object, which carries
  // fields (load, seal, equipment) the list does not select.
  const { rows: fresh } = await db.query({
    text: `SELECT ${ROW_COLUMNS} FROM shipments WHERE sell_shipment = $1`,
    values: [newId],
  })
  return { success: true, data: { row: fresh[0], detail: built.detail } }
}
