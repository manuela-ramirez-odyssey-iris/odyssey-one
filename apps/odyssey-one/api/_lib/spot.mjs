// api/_lib/spot.mjs — SpotBid quote/drafts persistence (spot_state table:
// PK (shipment_id, kind), value jsonb). Builders are pure ({ text, values })
// so they test without a DB; all user input reaches SQL only through $N
// parameters — same discipline as preferences.mjs.
//
// Two kinds share the one table: 'quote' (spotStore.js's single live quote
// blob) and 'drafts' (draftStore.js's snapshot list). The DB is
// authoritative — a client GET with nothing stored comes back `{ value: null
// }`, and the client write-through cache treats that null as "clear my local
// copy" (see spotStore.js/draftStore.js headers).

const KINDS = new Set(['quote', 'drafts'])

function assertKind(kind) {
  if (!KINDS.has(kind)) { const e = new Error(`Invalid kind: ${kind}`); e.status = 400; throw e }
}

export function buildGetSpotStateQuery(shipmentId, kind) {
  return {
    text: `SELECT value FROM spot_state WHERE shipment_id = $1 AND kind = $2`,
    values: [shipmentId, kind],
  }
}

export function buildPutSpotStateQuery(shipmentId, kind, value) {
  return {
    text: `INSERT INTO spot_state (shipment_id, kind, value, updated_at)
           VALUES ($1, $2, $3::jsonb, now())
           ON CONFLICT (shipment_id, kind) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    values: [shipmentId, kind, JSON.stringify(value)],
  }
}

export function buildDeleteSpotStateQuery(shipmentId, kind) {
  return {
    text: `DELETE FROM spot_state WHERE shipment_id = $1 AND kind = $2`,
    values: [shipmentId, kind],
  }
}

// GET /spot-service/v1/spot/:shipmentId?kind=quote|drafts
export async function getSpotState({ params, query, db }) {
  const shipmentId = params[0]
  const kind = query.get('kind')
  assertKind(kind)
  const { rows } = await db.query(buildGetSpotStateQuery(shipmentId, kind))
  return { value: rows[0]?.value ?? null }
}

// PUT /spot-service/v1/spot/:shipmentId — body { kind, value }
export async function putSpotState({ params, body, db }) {
  const shipmentId = params[0]
  const kind = body?.kind
  assertKind(kind)
  if (body?.value === undefined) { const e = new Error('value required'); e.status = 400; throw e }
  await db.query(buildPutSpotStateQuery(shipmentId, kind, body.value))
  return { success: true }
}

// DELETE /spot-service/v1/spot/:shipmentId?kind=quote|drafts
export async function deleteSpotState({ params, query, db }) {
  const shipmentId = params[0]
  const kind = query.get('kind')
  assertKind(kind)
  await db.query(buildDeleteSpotStateQuery(shipmentId, kind))
  return { success: true }
}
