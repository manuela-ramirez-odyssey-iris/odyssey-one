// api/_lib/shipments.mjs — SQL for the OdysseyONE shipment error grids.
// Builders are pure (return { text, values }) so they test without a DB. User
// input reaches SQL ONLY through $N parameters; sort/filter columns come ONLY
// from the whitelist maps below — never from raw request keys.

import { buildRankedSubquery, resolveNeedles } from './search.mjs'

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
const OC_OUTCOMES = {
  // retender re-solicits the carrier regardless of prior status — an
  // Accepted tender goes back to Sent, not back to Accepted (call w/ Jana).
  retender: () => ({ tenderStatus: 'Sent', panel: 'monitoring', category: 'sent' }),
  // bypass sends nothing, so whatever status the tender already had stands.
  bypass: (prior) => prior === 'Accepted'
    ? { tenderStatus: 'Accepted', panel: 'monitoring', category: 'approved' }
    : { tenderStatus: prior ?? 'Sent', panel: 'monitoring', category: 'sent' },
  cancel: () => ({ tenderStatus: 'Cancelled', panel: 'exceptions', category: 'tender-review' }),
}

export function buildOrderChangeResolveQuery(sellShipment, outcome, resolution) {
  return {
    text: `UPDATE shipments
             SET tender_status = $1, panel = $2, category = $3, validation_message = NULL,
                 detail = jsonb_set(detail, '{orderChange,resolution}', $4::jsonb)
           WHERE sell_shipment = $5 RETURNING sell_shipment`,
    values: [outcome.tenderStatus, outcome.panel, outcome.category, JSON.stringify(resolution), sellShipment],
  }
}

export async function resolveOrderChange({ params, body, db }) {
  const action = body?.action
  const outcomeFor = OC_OUTCOMES[action]
  if (!outcomeFor) {
    const e = new Error(`Unknown order-change action: ${action ?? '(none)'}`); e.status = 400; throw e
  }
  const outcome = outcomeFor(body?.priorTenderStatus)
  const resolution = { action, cost: body?.cost ?? null, resolvedAt: new Date().toISOString() }
  const { rowCount } = await db.query(buildOrderChangeResolveQuery(params[0], outcome, resolution))
  if (rowCount === 0) {
    const e = new Error(`No shipment: ${params[0]}`); e.status = 404; throw e
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
