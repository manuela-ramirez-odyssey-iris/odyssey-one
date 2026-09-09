// api/_lib/shipments.mjs — SQL for the OdysseyONE shipment error grids.
// Builders are pure (return { text, values }) so they test without a DB. User
// input reaches SQL ONLY through $N parameters; sort/filter columns come ONLY
// from the whitelist maps below — never from raw request keys.

import { buildRankedSubquery, resolveNeedles } from './search.mjs'
import { buildCandidateRows, MOVE_BLOCKED_STATUS, MOVE_BLOCKED_TENDER } from './candidateOrders.mjs'

// Sentinel `sortBy` meaning "order by search relevance, no column drives".
// Must equal RELEVANCE_SORT in src/api/services/gridService.ts — the client
// sends this string, and the route ALWAYS sends some sortBy (which is why the
// S104 first attempt, gated on sortBy being absent, shipped dead).
const RELEVANCE_SORT = 'relevance'

// Row projection: DB snake_case → ShipmentErrorRow camelCase (types/shipmentErrorList.ts).
// mode/grossWeight are COALESCEd against `overrides` (jsonb) because the
// Shipment Details modal writes shipment-stage edits there (PATCH .../overrides)
// — without this the grid would keep showing the pre-edit value right after
// the user saved a new one in the modal.
const ROW_COLUMNS = `
  buy_shipment AS "buyShipment", sell_shipment AS "sellShipment", orders, pro,
  pickup_numbers AS "pickupNumbers", po_numbers AS "poNumbers",
  shipment_type AS "shipmentType", planning_type AS "planningType",
  customer_id AS "customerId", customer_name AS "customerName", consignor, consignee,
  origin, destination, pickup_date AS "pickupDate", delivery_date AS "deliveryDate",
  COALESCE(overrides->>'mode', mode) AS mode, equipment_code AS "equipmentCode", scac, tender_status AS "tenderStatus",
  shipment_status AS "shipmentStatus", panel, category, validation_message AS "validationMessage",
  COALESCE(overrides->>'grossWeight', gross_weight) AS "grossWeight", load_count AS "loadCount", order_count AS "orderCount",
  ap_freight_cost AS "apFreightCost",
  -- 007_multileg_chains.sql — leg_type is a NEW column, distinct from
  -- shipment_type above (LINX-11597 Direct/Consolidation) despite the shared
  -- CSV label; see the migration's name-collision note. sequence_leg/
  -- next_shipment_id alias to the "shipmentSequenceLeg"/"nextShipmentId" keys
  -- the frontend (ColumnPanel.jsx ALL_COLUMNS) already carried.
  leg_type AS "legType", sequence_leg AS "shipmentSequenceLeg", next_shipment_id AS "nextShipmentId"`

// Sortable columns. Dates sort on the real timestamp cols, not the display strings.
const SORT_MAP = {
  pickupDate: 'pickup_ts', deliveryDate: 'delivery_ts', customerName: 'customer_name',
  sellShipment: 'sell_shipment', buyShipment: 'buy_shipment', scac: 'scac', mode: 'mode',
  tenderStatus: 'tender_status', shipmentStatus: 'shipment_status', category: 'category',
}

// Filterable columns (exact-equality and substring). Keys are ShipmentErrorRow field names.
const FIELD_MAP = {
  customerName: 'customer_name', consignor: 'consignor', consignee: 'consignee', origin: 'origin',
  destination: 'destination', mode: 'mode', equipmentCode: 'equipment_code', scac: 'scac',
  tenderStatus: 'tender_status', shipmentStatus: 'shipment_status', pro: 'pro',
  sellShipment: 'sell_shipment', buyShipment: 'buy_shipment',
}

// Columns the unscoped free-text search ORs across (mirrors FREE_TEXT_KEYS in
// search/shipments/criteria.js). Excludes only customerId (an internal scope
// key, not user-facing text) and orders (an array, not a substring-matchable
// text column) — every other free-text key maps to a column here.
const FREE_TEXT_COLUMNS = ['sell_shipment', 'buy_shipment', 'customer_name', 'origin', 'destination', 'scac']

function scope(where, values, customerIds) {
  if (customerIds === undefined) return
  if (customerIds.length === 0) { where.push('FALSE'); return }   // honest empty (S79c decision 10)
  values.push(customerIds)
  where.push(`customer_id = ANY($${values.length})`)
}

// searchTerm: scoped to one attribute → single ILIKE; else OR across the shared cols.
function addFreeText(where, values, term, attributeKey) {
  if (!term) return
  const needle = `%${term}%`
  const col = FIELD_MAP[attributeKey]
  if (col) {
    values.push(needle)
    where.push(`${col} ILIKE $${values.length}`)
    return
  }
  const ors = FREE_TEXT_COLUMNS.map((c) => {
    values.push(needle)
    return `${c} ILIKE $${values.length}`
  })
  where.push(`(${ors.join(' OR ')})`)
}

/**
 * The committed-search JOIN (S104). Returns '' when there is nothing to search.
 *
 * `needles` is resolved by the async handler (phrase-first, code-list fallback —
 * GS-20 needs a DB probe, and these builders stay pure). Absent, the text is
 * treated as one phrase, which is the single-token case anyway.
 *
 * Chips (GS-12 follow-up) ride alongside: a chips-only searchCriteria (no text)
 * still joins — `list` stays empty but `chips` isn't, and buildRankedSubquery's
 * buildHits falls into the chips-only ranking branch. This is what fixes tab
 * badges/list rows going blank on a committed chip with no text (the same bug
 * as the search-panel glimpse, just hit through the grid path instead).
 */
function relevanceJoin(searchCriteria, needles, bind) {
  const text = String(searchCriteria?.text ?? '').trim()
  const chips = searchCriteria?.chips ?? []
  const list = needles?.length ? needles : (text ? [text] : [])
  if (!list.length && !chips.length) return ''
  return `JOIN ${buildRankedSubquery({ needles: list, chips, bind })} r ON r.entity_id = shipments.sell_shipment`
}

export function buildCountsQuery({ panel, customerIds, searchCriteria } = {}, needles) {
  const values = [panel]
  const where = ['panel = $1']
  scope(where, values, customerIds)
  // Tab badges must narrow with the search, or they contradict the grid below them.
  const join = relevanceJoin(searchCriteria, needles, (v) => { values.push(v); return `$${values.length}` })
  return {
    text: `SELECT category, count(*)::int AS count FROM shipments ${join} WHERE ${where.join(' AND ')} GROUP BY category`,
    values,
  }
}

export function buildListQuery({ pageNumber = 0, pageSize = 50, filter = {}, sortBy, orderBy } = {}, needles) {
  const values = []
  const where = []
  const add = (clause, v) => { values.push(v); where.push(clause.replace('?', `$${values.length}`)) }

  if (filter.panel) add('panel = ?', filter.panel)
  if (filter.category && filter.category !== 'all') add('category = ?', filter.category)
  scope(where, values, filter.customerIds)

  // Exact-equality + substring filters. The live payload (gridService.ts) SPREADS
  // these flat into `filter`; the test/legacy shape nests them under filter.filter /
  // filter.searchFilters. Read the nested objects when present, else the flat keys.
  const exact = filter.filter ?? filter
  for (const [k, v] of Object.entries(exact)) if (FIELD_MAP[k] && v) add(`${FIELD_MAP[k]} = ?`, v)
  for (const [k, v] of Object.entries(filter.searchFilters ?? {})) if (FIELD_MAP[k] && v) add(`${FIELD_MAP[k]} ILIKE ?`, `%${v}%`)

  addFreeText(where, values, filter.searchTerm, filter.searchAttributeKey)

  // Date bounds. Same flat-or-nested rule as above.
  const df = filter.dateFilters ?? filter
  if (df.pickupDateFrom) add('pickup_ts >= ?', df.pickupDateFrom)
  if (df.pickupDateTo) add('pickup_ts < (?::date + 1)', df.pickupDateTo)
  if (df.deliveryDateFrom) add('delivery_ts >= ?', df.deliveryDateFrom)
  if (df.deliveryDateTo) add('delivery_ts < (?::date + 1)', df.deliveryDateTo)

  // Committed search criteria (S104). Rows are RESTRICTED to the ranked hit set
  // whatever the sort, and — unless a real column is driving — ORDERED by it, so
  // "Show all results" lands on exactly the list the preview showed (GS-16).
  const join = relevanceJoin(filter.searchCriteria, needles, (v) => { values.push(v); return `$${values.length}` })

  const dir = orderBy === 'desc' ? 'DESC' : 'ASC'
  // The tiebreak chain mirrors buildSearchQuery's TOTAL order exactly. Anything
  // less and the preview's 15 rows are not provably the table's first 15.
  const orderSql = (sortBy === RELEVANCE_SORT && join)
    ? `r.tier, r.priority, r.display, sell_shipment`
    : `${SORT_MAP[sortBy] ?? 'pickup_ts'} ${dir} NULLS LAST`

  values.push(pageSize); const limitP = values.length
  values.push(pageNumber * pageSize); const offsetP = values.length

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return {
    text: `SELECT ${ROW_COLUMNS}, count(*) OVER()::int AS "__total"
           FROM shipments ${join} ${whereSql}
           ORDER BY ${orderSql}
           LIMIT $${limitP} OFFSET $${offsetP}`,
    values,
  }
}

export async function categoryCounts({ query, db }) {
  const panel = query.get('panel') ?? ''
  const customerIds = query.has('customerIds') ? query.get('customerIds').split(',').filter(Boolean) : undefined
  const text = query.get('searchText') ?? ''
  // GET can't carry a body, so committed chips ride a JSON-encoded query param
  // (gridService.ts live branch: `searchChips=` + JSON.stringify(chips.map(
  // ({key,queryValue}) => ({key,queryValue})))). Parsed defensively — malformed
  // JSON is ignored (falls back to no chip restriction) rather than 500ing the
  // counts endpoint on a bad/stale query string.
  let chips = []
  const rawChips = query.get('searchChips')
  if (rawChips) {
    try { chips = JSON.parse(rawChips) } catch { chips = [] }
    // Valid JSON that isn't an array (e.g. `{"a":1}`) would otherwise reach
    // validChips and blow up on `.filter is not a function` — same defensive
    // stance as the malformed-JSON case, just past JSON.parse succeeding.
    if (!Array.isArray(chips)) chips = []
  }
  const searchCriteria = (text || chips.length) ? { chips, text } : undefined
  // Resolved ONCE, against the full index, exactly as the list and the preview
  // resolve it — so the badge and the grid can never read the query differently.
  const needles = await resolveNeedles(db, 'shipments', text, customerIds)
  const { rows } = await db.query(buildCountsQuery({ panel, customerIds, searchCriteria }, needles))
  return { errorOverview: rows }   // [{ category, count }]
}

export async function shipmentErrorList({ body, db }) {
  const { pageNumber = 0, pageSize = 50 } = body ?? {}
  const needles = await resolveNeedles(
    db, 'shipments', body?.filter?.searchCriteria?.text, body?.filter?.customerIds,
  )
  const { rows } = await db.query(buildListQuery(body ?? {}, needles))
  const totalCount = rows[0]?.__total ?? 0
  return { pageNumber, pageSize, totalCount, rows: rows.map(({ __total, ...r }) => r) }
}

// Slice 3: full SellShipmentOut detail — stored verbatim as shipments.detail JSONB.
export function buildDetailQuery(sellShipment) {
  return { text: 'SELECT detail, overrides FROM shipments WHERE sell_shipment = $1', values: [sellShipment] }
}

// Quotes/tenders live in their own table (seeded 1:1 from the detail's
// shippingOptionList) so they can be written independently of the frozen detail
// blob. The table is the source of truth on read — a saved quote shows up on the
// next fetch instead of vanishing with the component's local state (S102).
export function buildTendersQuery(sellShipment) {
  return {
    text: 'SELECT option FROM tenders WHERE shipment_sell_id = $1 ORDER BY rank',
    values: [sellShipment],
  }
}

export async function sellShipmentDetail({ params, db }) {
  const { rows } = await db.query(buildDetailQuery(params[0]))
  if (rows.length === 0) {
    const e = new Error(`No shipment: ${params[0]}`)
    e.status = 404
    throw e
  }
  const detail = rows[0].detail
  const { rows: tenders } = await db.query(buildTendersQuery(params[0]))
  // No tender rows = pre-seed shipment; fall back to the blob rather than
  // blanking the Tender tab. Rows without an option payload are ignored.
  const options = tenders.map(t => t.option).filter(Boolean)
  if (options.length > 0) detail.shippingOptionList = options
  // Shipment-stage field edits (2026-08-11). Attached rather than merged into
  // the blob: the mapper decides field by field which wins, and a consumer
  // that never asks for overrides keeps reading the untouched seeded values.
  // Absent column stays ABSENT — an `overrides: null` key would make every
  // `?? ` fallback in the mapper read as "explicitly cleared".
  if (rows[0].overrides) detail.overrides = rows[0].overrides
  return detail
}

// PATCH /shipment-service/v1/sell-shipment-out/:id/overrides — shipment-STAGE
// field edits from the Shipment Details modal. Whole-object replace, not a
// deep merge: the modal always sends the complete override set it is holding,
// so a merge would make it impossible to CLEAR a field.
export function buildOverridesQuery(sellShipment, overrides) {
  return {
    text: 'UPDATE shipments SET overrides = $1 WHERE sell_shipment = $2 RETURNING sell_shipment',
    values: [JSON.stringify(overrides), sellShipment],
  }
}

export async function saveShipmentOverrides({ params, body, db }) {
  const overrides = body?.overrides
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    const e = new Error('overrides object required'); e.status = 400; throw e
  }
  const { rowCount } = await db.query(buildOverridesQuery(params[0], overrides))
  if (rowCount === 0) {
    const e = new Error(`No shipment: ${params[0]}`); e.status = 404; throw e
  }
  return { success: true }
}

// PATCH /shipment-service/v1/sell-shipment-out/:id/order-change — LINX-14514
// Tender Resolution Actions off the Review Order Change screen. Records the
// planner's decision into detail.orderChange.resolution and re-files the
// shipment: retender/bypass leave the review for monitoring, cancel stays in
// exceptions so the planner is dropped back on Tender Review to choose again.
// Tender statuses a shipment can be resolved OUT of by retender/bypass/save-stops.
const OC_ACTIVE_TENDER_STATUSES = ['To Be Tendered', 'Sent', 'Accepted']

const OC_OUTCOMES = {
  // retender re-solicits the carrier regardless of prior status — an
  // Accepted tender goes back to Sent, not back to Accepted (call w/ Jana).
  retender: () => ({ tenderStatus: 'Sent', panel: 'monitoring', category: 'sent', validationMessage: null }),
  // bypass sends nothing, so whatever status the tender already had stands.
  bypass: (prior) => prior === 'Accepted'
    ? { tenderStatus: 'Accepted', panel: 'monitoring', category: 'approved', validationMessage: null }
    : { tenderStatus: prior ?? 'Sent', panel: 'monitoring', category: 'sent', validationMessage: null },
  // cancel alone re-parks on exceptions/tender-review, where every
  // naturally-seeded row carries a real validation_message — leaving this
  // NULL blanks that grid column. Text is verbatim from LINX-14514's Cancel
  // Tender AC; don't "simplify" it back to null.
  cancel: () => ({
    tenderStatus: 'Cancelled', panel: 'exceptions', category: 'tender-review',
    validationMessage: 'User to review the current tender options and take appropriate action.',
  }),
  // save-stops (LINX-15671 Scenario A/B) — Approve Changes on Edit Shipment
  // Stops. Scenario A (a tender is already active) leaves the shipment right
  // where it was: the planner still owes the Direct Actions card a tender
  // decision on the new stops plan, so the row stays in Order Change
  // exceptions with no outcome change at all. Scenario B (no active tender)
  // behaves exactly like bypass — nothing to re-solicit, the plan is just final.
  'save-stops': (prior) => OC_ACTIVE_TENDER_STATUSES.includes(prior)
    ? { tenderStatus: prior, panel: 'exceptions', category: 'order-change', validationMessage: null }
    : OC_OUTCOMES.bypass(prior),
}

// S143 Task 3 — Edit Shipment Stops "Approve Changes" (LINX-15667…15671).
// The client sandbox (stopsSandbox.js toDto) can only emit what it holds —
// sequence/type/orderIds/location/date — never region/postal/timezone/totals.
// The API does the merge because it, not the client, has the full prior
// stop (detail.shipmentStopList) and the orders (detail.orderList) to pull
// those from and recompute totals against. Pure/testable: no DB access.
// Order identity varies by source (seed orderId vs. live orderNumber) — one
// helper, used everywhere an order record needs to be matched by id.
const idOf = (o) => o.orderId ?? o.orderNumber

export function mergeStops(detail, rows) {
  const orderList = detail.orderList ?? []
  const stopList = detail.shipmentStopList ?? []
  return rows.map((row) => {
    const base = row.sourceStopSequence != null
      ? (stopList.find((s) => s.stopSequence === row.sourceStopSequence) ?? {})
      : {}
    const orderIds = row.orderIds ?? []
    const stopOrders = orderList.filter((o) => orderIds.includes(idOf(o)))
    // I5 (generate.mjs) — a stop's totals are always the sum of its orders;
    // recomputed here rather than trusted from the client for the same
    // coherence reason the seed data sums them instead of hardcoding.
    const grossWeightValue = stopOrders.reduce((t, o) => t + (o.grossWeightValue ?? 0), 0)
    const volumeValue = stopOrders.reduce((t, o) => t + (o.volumeValue ?? 0), 0)
    const packageCount = stopOrders.reduce(
      (t, o) => t + (o.orderLines ?? []).reduce((s, l) => s + (l.packageCount ?? 0), 0), 0,
    )
    return {
      ...base,
      stopSequence: row.stopSequence,
      stopType: row.stopType,
      orderIds,
      facilityName: base.facilityName ?? row.facilityName,
      city: base.city ?? row.city,
      address1: base.address1 ?? row.address1,
      scheduledDateTime: base.scheduledDateTime ?? row.scheduledDateTime,
      appointmentTime: base.appointmentTime ?? null,
      country: base.country ?? 'US',
      grossWeightValue, grossWeightUomCode: base.grossWeightUomCode ?? 'LB',
      volumeValue, volumeUomCode: base.volumeUomCode ?? 'cuft',
      packageCount,
      // Copied from the orders on THIS stop (generate.mjs:885's R2-2 rule) —
      // taking only stopOrders[0] blanked pickupNumber whenever the first
      // order on a merged/reordered stop happened to carry none (66 seeded
      // stops hit this before R2-2; the same coin-flip bug reappears here
      // if this pulls from just one order instead of scanning all of them).
      pickupNumber: row.stopType === 'pickup' ? (stopOrders.map((o) => o.pickupNumber).find(Boolean) ?? null) : null,
    }
  })
}

// LINX-15872 — moving an external order in at Save. Same blocked vocabulary
// Search & Add greys out client-side (candidateOrders.mjs), re-checked here
// against the source shipment's LATEST status (it can change between search
// and Save).
const MOVE_MESSAGE = 'The selected order cannot be moved because its current shipment is approved, completed, or involved in an active tender or bid process. Edit the source shipment or cancel the applicable tender or bid action before moving the order.'

export function buildSourceShipmentsQuery(sellShipments) {
  return {
    text: `SELECT sell_shipment AS "sellShipment", shipment_status AS "shipmentStatus",
             tender_status AS "tenderStatus", detail
           FROM shipments WHERE sell_shipment = ANY($1)`,
    values: [sellShipments],
  }
}

// Revalidates every external order against its source shipment's current
// status; any single failure blocks the WHOLE save (nothing written) — runs
// BEFORE the transaction so a validation failure never opens one.
async function pullExternalOrders(db, externalOrders) {
  if (!externalOrders?.length) return { records: [], sources: [] }
  // ponytail: dedupe by orderNumber — a repeated Add New Order pick (or a
  // retried client) shouldn't double-count the same order into orderList.
  const deduped = [...new Map(externalOrders.map((e) => [e.orderNumber, e])).values()]
  const { rows } = await db.query(buildSourceShipmentsQuery([...new Set(deduped.map((e) => e.sourceSellShipment))]))
  const bySell = new Map(rows.map((r) => [r.sellShipment, r]))
  const blocked = []
  const records = []
  for (const { orderNumber, sourceSellShipment } of deduped) {
    const src = bySell.get(sourceSellShipment)
    const rec = src?.detail?.orderList?.find((o) => idOf(o) === orderNumber)
    if (!src || !rec || MOVE_BLOCKED_STATUS.includes(src.shipmentStatus) || MOVE_BLOCKED_TENDER.includes(src.tenderStatus)) {
      blocked.push(orderNumber)
      continue
    }
    records.push(rec)
  }
  if (blocked.length) {
    const e = new Error(`${MOVE_MESSAGE} Order impacted: ${blocked.join(', ')}`)
    e.status = 400
    throw e
  }
  return { records, sources: rows }
}

// LINX-15872 "Source Shipment Update": the moved orders leave the source's
// orderList and every stop; emptied stops drop, the rest renumber, totals
// recompute — through the same mergeStops the target uses, so a source stop
// can never disagree with its remaining orders either.
export function removeOrdersFromSource(detail, movedIds) {
  const gone = new Set(movedIds)
  const orderList = (detail.orderList ?? []).filter((o) => !gone.has(idOf(o)))
  const rows = (detail.shipmentStopList ?? [])
    .map((s) => ({ ...s, orderIds: (s.orderIds ?? []).filter((id) => !gone.has(id)) }))
    .filter((s) => s.orderIds.length > 0)
    .map((s, i) => ({ stopSequence: i + 1, stopType: s.stopType, orderIds: s.orderIds, sourceStopSequence: s.stopSequence }))
  return { orderList, stops: mergeStops({ ...detail, orderList }, rows) }
}

export function buildOrderChangeResolveQuery(sellShipment, outcome, resolution) {
  return {
    text: `UPDATE shipments
             SET tender_status = $1, panel = $2, category = $3, validation_message = $4,
                 detail = jsonb_set(detail, '{orderChange,resolution}', $5::jsonb)
           WHERE sell_shipment = $6 RETURNING sell_shipment`,
    values: [
      outcome.tenderStatus, outcome.panel, outcome.category, outcome.validationMessage,
      JSON.stringify(resolution), sellShipment,
    ],
  }
}

export function buildDetailReadQuery(sellShipment) {
  return { text: 'SELECT detail FROM shipments WHERE sell_shipment = $1', values: [sellShipment] }
}

// Whole-array replace of shipmentStopList, same "send the finalized whole" as
// buildOverridesQuery — the merged rows already carry everything the sandbox
// changed plus everything it couldn't (mergeStops above).
//
// Also resets orderChange.consolidation.stopChanges/locationChange in the
// SAME write: those fields are keyed to the OLD stop sequences, and this
// write renumbers shipmentStopList — left alone, the Stops tab's review
// badges land on the wrong stops and locationChange keeps reporting a
// change that's now baked into the plan. The plan is finalized at this
// point, so both reset to their "nothing pending" values; everything else
// on consolidation (summaryChanges/changedOrderIds/orderComparisons/costs)
// is the customer-facing diff and stays untouched.
// `orderList`/`orders`/`order_count` land in the SAME write (LINX-15872 —
// an external order copied in, or a pending one dropped, has to change the
// shipment's order roster in lockstep with its stops). `resetChanges: false`
// skips the consolidation-badge reset for a SOURCE shipment in the 15872
// move — its own review state (if any) isn't this save's business.
export function buildSaveStopsQuery(sellShipment, stops, orderList, { resetChanges = true } = {}) {
  const ids = orderList.map((o) => o.orderNumber ?? String(o.orderId))
  const base = `jsonb_set(jsonb_set(detail, '{shipmentStopList}', $1::jsonb), '{orderList}', $2::jsonb)`
  // The target's own consolidation badges are stale after a save (S143);
  // a SOURCE shipment keeps whatever review state it had.
  const detailSql = resetChanges
    ? `jsonb_set(jsonb_set(${base}, '{orderChange,consolidation,stopChanges}', '{}'::jsonb), '{orderChange,consolidation,locationChange}', 'false'::jsonb)`
    : base
  return {
    text: `UPDATE shipments SET detail = ${detailSql}, orders = $3, order_count = $4
           WHERE sell_shipment = $5 RETURNING sell_shipment`,
    values: [JSON.stringify(stops), JSON.stringify(orderList), ids, String(ids.length), sellShipment],
  }
}

// S137/Jana ruling (2026-09-02): on Review Order Change, the planner's cost
// pick ("the new cost selected will update the base cost") has to land on
// the carrier's actual tender row, not just the resolution record below — or
// the Tender tab keeps showing the pre-change rate after the review closes.
// rate_amount is the column; option.rateAmount is the SAME figure inside the
// JSONB blob sellShipmentDetail actually reads back into shippingOptionList
// on the next fetch (buildTendersQuery above reads `tenders.option`, not the
// column) — mapRoutingOption's `rate` field
// (mapSellShipmentOutToDetail.ts ~line 344) is driven by option.rateAmount,
// so jsonb_set keeps that one field in sync instead of rewriting the blob.
//
// Addressed by (shipment_sell_id, scac), not rank: rank is the carrier's
// slot in THIS routing pass and is unstable across a re-route (buildTender
// UpdateQuery's own comment above), but scac is who the whole review is
// about. ponytail: a shipment could in principle carry more than one tender
// row for the same scac (re-tender edge case) — no WHERE clause narrows
// further than scac, so all of that carrier's rows get the new cost rather
// than picking one arbitrarily.
export function buildOrderChangeCostQuery(sellShipment, scac, amount) {
  return {
    text: `UPDATE tenders SET rate_amount = $1, option = jsonb_set(option, '{rateAmount}', $2::jsonb)
           WHERE shipment_sell_id = $3 AND scac = $4`,
    values: [amount, JSON.stringify(amount), sellShipment, scac],
  }
}

export async function resolveOrderChange({ params, body, db }) {
  const action = body?.action
  const outcomeFor = OC_OUTCOMES[action]
  if (!outcomeFor) {
    const e = new Error(`Unknown order-change action: ${action ?? '(none)'}`); e.status = 400; throw e
  }
  const sellShipment = params[0]
  const outcome = outcomeFor(body?.priorTenderStatus)

  if (action === 'save-stops') {
    if (!Array.isArray(body?.stops) || body.stops.length === 0) {
      const e = new Error('stops array required'); e.status = 400; throw e
    }
    const { rows } = await db.query(buildDetailReadQuery(sellShipment))
    if (rows.length === 0) { const e = new Error(`No shipment: ${sellShipment}`); e.status = 404; throw e }
    const detail = rows[0].detail
    // Revalidated + read BEFORE the transaction opens — a blocked source
    // order 400s here with nothing written, no BEGIN ever issued.
    const { records: external, sources } = await pullExternalOrders(db, body.externalOrders)
    const onStops = new Set(body.stops.flatMap((s) => s.orderIds ?? []))
    // D2 — the confirm dialog's promise: orders left pending leave the shipment.
    const orderList = [...(detail.orderList ?? []), ...external].filter((o) => onStops.has(idOf(o)))
    const merged = mergeStops({ ...detail, orderList }, body.stops)

    // ponytail: first BEGIN/COMMIT in this file — the AC (LINX-15872) demands
    // one Save transaction now that a save-stops can touch more than one
    // shipment (this target + every source an order moved from). `db` is a
    // pg.Pool: pool.query('BEGIN') would check out a client, run it, and
    // release it — the following writes would then land on ARBITRARY
    // connections (no atomicity) and leave that first client idle-in-
    // transaction in the pool. One client, checked out for the whole block.
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query(buildSaveStopsQuery(sellShipment, merged, orderList))
      // LINX-15872 "Remove the order from its source shipment" / OC-open-22:
      // the `orders` table row itself still points at the OLD shipment until
      // this repoints it — the two JSONB detail blobs (this save + the
      // source save below) are the app's own denormalized view, not the
      // system of record for which shipment owns the order.
      const movedOrderNumbers = external.map(idOf).filter((id) => onStops.has(id))
      if (movedOrderNumbers.length) {
        await client.query({
          text: 'UPDATE orders SET shipment_sell_id = $1 WHERE order_number = ANY($2)',
          values: [sellShipment, movedOrderNumbers],
        })
      }
      for (const src of sources) {
        const movedIds = (body.externalOrders ?? [])
          .filter((e) => e.sourceSellShipment === src.sellShipment)
          .map((e) => e.orderNumber)
        const next = removeOrdersFromSource(src.detail, movedIds)
        await client.query(buildSaveStopsQuery(src.sellShipment, next.stops, next.orderList, { resetChanges: false }))
      }
      // Scenario A (active tender) writes nothing further: the row is already
      // exceptions/order-change at this tender status (that's what "active"
      // means), and orderChange.resolution stays untouched — the tender
      // decision is still pending on the Direct Actions card (LINX-15671).
      // A refile query here would just re-set the same values it already has.
      if (!OC_ACTIVE_TENDER_STATUSES.includes(body?.priorTenderStatus)) {
        // Scenario B — same "final decision" stamp as retender/bypass/cancel.
        const resolution = { action, cost: null, resolvedAt: new Date().toISOString() }
        await client.query(buildOrderChangeResolveQuery(sellShipment, outcome, resolution))
      }
      await client.query('COMMIT')
    } catch (e) {
      try { await client.query('ROLLBACK') } catch {}
      throw e
    } finally {
      client.release()
    }
    return { success: true }
  }

  const cost = body?.cost ?? null
  const resolution = { action, cost, resolvedAt: new Date().toISOString() }
  const { rowCount } = await db.query(buildOrderChangeResolveQuery(sellShipment, outcome, resolution))
  if (rowCount === 0) {
    const e = new Error(`No shipment: ${sellShipment}`); e.status = 404; throw e
  }
  // Cancel drops the tender — there's no carrier left to apply a cost to, so
  // only retender/bypass (which keep a carrier) write the tender-row update.
  // ponytail: two sequential queries, no transaction — the surrounding code
  // has no transaction helper (db.query is used bare everywhere in this
  // file) and a tender update matching zero rows is expected, not an error,
  // so there's nothing here that needs atomicity with the resolution write.
  if ((action === 'retender' || action === 'bypass') && typeof cost?.amount === 'number' && body?.priorScac) {
    await db.query(buildOrderChangeCostQuery(params[0], body.priorScac, cost.amount))
  }
  return { success: true }
}

// PUT /shipment-service/v1/sell-shipment-out/:id/tender — add or update ONE
// quote (Add Quote / Edit Quote / a tender-status action). Addressed by rank,
// which is unique per shipment. ponytail: update-then-insert instead of an
// ON CONFLICT upsert — no unique index to migrate onto the live table.
export function buildTenderUpdateQuery(sellShipment, option) {
  return {
    text: `UPDATE tenders SET scac = $1, carrier_name = $2, status = $3, route_group = $4,
             rate_amount = $5, option = $6
           WHERE shipment_sell_id = $7 AND rank = $8 RETURNING id`,
    values: [
      option.scac ?? null, option.carrierName ?? null, option.status ?? null,
      option.routeGroup ?? null, option.rateAmount ?? option.rateDetails?.baseRate ?? null,
      JSON.stringify(option), sellShipment, option.rank,
    ],
  }
}

export function buildTenderInsertQuery(sellShipment, option) {
  return {
    text: `INSERT INTO tenders (shipment_sell_id, scac, carrier_name, status, route_group, rank, rate_amount, option)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    values: [
      sellShipment, option.scac ?? null, option.carrierName ?? null, option.status ?? null,
      option.routeGroup ?? null, option.rank,
      option.rateAmount ?? option.rateDetails?.baseRate ?? null, JSON.stringify(option),
    ],
  }
}

export async function saveTender({ params, body, db }) {
  const sellShipment = params[0]
  const option = body?.option
  if (!option || typeof option !== 'object') {
    const e = new Error('option required'); e.status = 400; throw e
  }
  if (option.rank == null) { const e = new Error('option.rank required'); e.status = 400; throw e }
  const updated = await db.query(buildTenderUpdateQuery(sellShipment, option))
  if (updated.rows.length === 0) await db.query(buildTenderInsertQuery(sellShipment, option))
  return { success: true, rank: option.rank }
}

// LINX-15870 — GET /shipment-service/v1/sell-shipment-out/:id/candidate-orders?exclude=a,b
// One query: every order of another shipment of the SAME customer. The rows
// come back in the orders.json / shipments.json shapes (jsonb parsed by pg), so
// the SAME builder the mock uses runs here — one place for the row shape.
export function buildCandidateOrdersQuery(sellShipment) {
  return {
    text: `SELECT o.order_number AS "orderNumber", o.consignor, o.consignee,
                  o.gross_weight AS "grossWeight", o.volume,
                  s.sell_shipment AS "sellShipment", s.buy_shipment AS "buyShipment", s.customer_id AS "customerId",
                  s.customer_name AS "customerName", s.orders, s.shipment_status AS "shipmentStatus",
                  s.tender_status AS "tenderStatus", s.shipment_type AS "shipmentType"
           FROM orders o JOIN shipments s ON s.sell_shipment = o.shipment_sell_id
           WHERE s.customer_id = (SELECT customer_id FROM shipments WHERE sell_shipment = $1)
             AND s.sell_shipment <> $1`,
    values: [sellShipment],
  }
}

export async function candidateOrders({ params, query, db }) {
  const sellShipment = params[0]
  const { rows } = await db.query(buildCandidateOrdersQuery(sellShipment))
  const exclude = (query.get('exclude') ?? '').split(',').filter(Boolean)
  // Split the joined row back into its two shapes — the builder joins them by
  // shipment.orders, exactly as the mock does over the two JSON files.
  const shipments = [...new Map(rows.map((r) => [r.sellShipment, r])).values()]
  const customerId = shipments[0]?.customerId
  return buildCandidateRows({ shipments, orders: rows, customerId, sellShipment, excludeOrderIds: exclude })
}
