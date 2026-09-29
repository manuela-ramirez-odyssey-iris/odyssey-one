// api/_lib/shipments.mjs — SQL for the OdysseyONE shipment error grids.
// Builders are pure (return { text, values }) so they test without a DB. User
// input reaches SQL ONLY through $N parameters; sort/filter columns come ONLY
// from the whitelist maps below — never from raw request keys.

import { buildRankedSubquery, resolveNeedles } from './search.mjs'
import { buildCandidateRows, MOVE_BLOCKED_CATEGORY, MOVE_BLOCKED_TENDER } from './candidateOrders.mjs'
import { shipmentStatusFor } from '../../src/lib/shipmentStatus.js'
import { idsFor, buildInsertShipmentQuery, buildLinkOrderQuery, buildSearchIndexQuery } from './planShipment.mjs'
import { tsFromDisplay } from './consolidateShipments.mjs'
import { totalMiles } from '../../src/utils/legMiles.js'
import { applyStopDates, rerouteTenderList, stopDateToDisplay, withApTotal } from '../../src/lib/orderChangeRouting.js'

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
export const ROW_COLUMNS = `
  -- odyssey_shipment_id is the grid's far-left column (S148) — there is no
  -- left-pin mechanism, so it must lead the SELECT list to lead the row.
  odyssey_shipment_id AS "odysseyShipmentIdentifier",
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
  // Sorts on the SEQUENCE, prefix-blind — deliberately not the raw text. Sorting the
  // string alphabetically would put every C… before every O…, which reads as grouping
  // by consolidation; real consolidation grouping is a feature being built, and the
  // default grid must not fake it with an alphabet artifact (user ruling, 2026-09-15).
  // Casting to bigint also keeps the order correct when the sequence outgrows 8 digits,
  // which Dave Schultz was explicit it will ("do NOT make assumptions on length").
  odysseyShipmentIdentifier: 'substr(odyssey_shipment_id, 2)::bigint',
  pickupDate: 'pickup_ts', deliveryDate: 'delivery_ts', customerName: 'customer_name',
  sellShipment: 'sell_shipment', buyShipment: 'buy_shipment', scac: 'scac', mode: 'mode',
  tenderStatus: 'tender_status', shipmentStatus: 'shipment_status', category: 'category',
}

// Filterable columns (exact-equality and substring). Keys are ShipmentErrorRow field names.
const FIELD_MAP = {
  odysseyShipmentIdentifier: 'odyssey_shipment_id',
  customerName: 'customer_name', consignor: 'consignor', consignee: 'consignee', origin: 'origin',
  destination: 'destination', mode: 'mode', equipmentCode: 'equipment_code', scac: 'scac',
  tenderStatus: 'tender_status', shipmentStatus: 'shipment_status', pro: 'pro',
  sellShipment: 'sell_shipment', buyShipment: 'buy_shipment',
}

// Columns the unscoped free-text search ORs across (mirrors FREE_TEXT_KEYS in
// search/shipments/criteria.js). Excludes only customerId (an internal scope
// key, not user-facing text) and orders (an array, not a substring-matchable
// text column) — every other free-text key maps to a column here.
// odyssey_shipment_id leads (S148): it's the first attribute of the Shipment
// Identifiers search group, so it should be the first column ORed across too.
const FREE_TEXT_COLUMNS = ['odyssey_shipment_id', 'sell_shipment', 'buy_shipment', 'customer_name', 'origin', 'destination', 'scac']

// C5 (DEC-202) — a shipment a save-stops emptied (every order moved out,
// order_count is text: 001_schema.sql:34) leaves the list, the tab counts and
// search; its detail stays readable by id (sellShipmentDetail). IS DISTINCT
// FROM so a NULL count is never hidden with it.
export const NOT_EMPTIED = `order_count IS DISTINCT FROM '0'`

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
  const where = ['panel = $1', NOT_EMPTIED]
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
  const where = [NOT_EMPTIED]
  const add = (clause, v) => { values.push(v); where.push(clause.replace('?', `$${values.length}`)) }

  if (filter.panel) add('panel = ?', filter.panel)
  if (filter.category && filter.category !== 'all') add('category = ?', filter.category)
  scope(where, values, filter.customerIds)

  // Consolidate mode (Part 3, S158, user 2026-09-23): selected rows float to the
  // top of page 1 as client-held snapshots (ShipmentsRoute), so the SERVER list
  // must exclude them — otherwise a selected row would also come back on its
  // normal sorted page, duplicating it and shifting every offset after it.
  if (filter.excludeIds?.length) {
    values.push(filter.excludeIds)
    where.push(`sell_shipment <> ALL($${values.length})`)
  }

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
  return { text: 'SELECT detail, overrides, tender_status FROM shipments WHERE sell_shipment = $1', values: [sellShipment] }
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
  // Only an ACCEPTED tender means a carrier has actually taken the freight, so
  // only that shipment has anything to track (user, 2026-09-16). Enforced on
  // READ, not merely seeded: `tender_status` moves after the blob is written —
  // resolveOrderChange sets it — so a shipment whose tender is later declined
  // or cancelled must lose its link without the blob being rewritten. The
  // generator applies the same rule at seed time (tools/generate.mjs) so the
  // stored data agrees rather than relying on this to hide an incoherence.
  if (rows[0].tender_status !== 'Accepted') delete detail.trackingUrl
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

// LINX-15671 Scenario B / DEC-200 (no active tender): the shipment STAYS in
// Review and nothing is tendered. It re-files to Exceptions › Tender Review,
// where the planner tenders the adopted list; the list is untendered, so the
// row's tender status is blank. Deliberately NOT an OC_OUTCOMES key (those are
// the accepted API actions). It used to reuse bypass, which filed the row under
// Monitoring › Sent (status Approved) and invented 'Sent' for a null prior (S162 audit).
const SCENARIO_B = () => ({
  tenderStatus: '', panel: 'exceptions', category: 'tender-review',
  validationMessage: 'User to review the current tender options and take appropriate action.',
})

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
  // is SCENARIO_B — nothing to re-solicit, the shipment stays in Review.
  'save-stops': (prior) => OC_ACTIVE_TENDER_STATUSES.includes(prior)
    ? { tenderStatus: prior, panel: 'exceptions', category: 'order-change', validationMessage: null }
    : SCENARIO_B(),
  // T3 (S160) — StopsTab's Approve Plan. Only ever called for Scenario B (no
  // active tender — the client-side useApproveOrderChange hook gates Scenario
  // A to no server call at all), so it's always save-stops' non-active
  // outcome: SCENARIO_B, nothing to re-solicit. No stops are written —
  // the plan is already what stands.
  'approve-plan': () => SCENARIO_B(),
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
      region: base.region ?? row.region,
      postal: base.postal ?? row.postal,
      address1: base.address1 ?? row.address1,
      // C9 (S163) — a created stop's coordinates + zone ride in from toDto;
      // dropping them left the map pin and the zone-aware date checks blind.
      lat: base.lat ?? row.lat,
      lng: base.lng ?? row.lng,
      timeZone: base.timeZone ?? row.timeZone,
      // DEC-199: the planner's edited date wins — it used to be dropped for
      // every existing stop (base first).
      scheduledDateTime: row.scheduledDateTime ?? base.scheduledDateTime,
      appointmentTime: base.appointmentTime ?? null,
      country: base.country ?? row.country ?? 'US',
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

// OC-open-22 — the grid's list columns are derived from the order roster,
// recomputed the SAME way tools/generate.mjs derives them for the row
// (~L850-858 pickup/po numbers, L2201 shipmentType, L2234-2236 grossWeight/
// loadCount) so a save-stops move can't leave the grid disagreeing with the
// detail it just wrote. One pure function, called for the target and every
// source in buildSaveStopsQuery below.
export function computeListAggregates(orderList) {
  const grossWeight = orderList.reduce((s, o) => s + (o.grossWeightValue ?? 0), 0)
  const loadCount = orderList.reduce((s, o) => s + (o.orderLines?.length ?? 0), 0)
  // Dedupe + order exactly as the generator's `[...new Set(orders.map(...))]`.
  const poNumbers = [...new Set(orderList.map((o) => o.poNumber).filter(Boolean))]
  const pickupNumbers = [...new Set(orderList.map((o) => o.pickupNumber).filter(Boolean))]
  return {
    grossWeight: String(grossWeight),
    loadCount: String(loadCount),
    poNumbers,
    pickupNumbers,
    // generate.mjs L2201 — Direct (1 mapped order) vs Consolidation (>1).
    shipmentType: orderList.length > 1 ? 'Consolidation' : 'Direct',
  }
}

// C6 (S163) — `activeTender` reads the LIVE tenders table: Tender-tab actions
// write only `tenders` (saveTender), so shipments.tender_status stays the
// seeded value and a source tendered after the seed would slip through.
export function buildSourceShipmentsQuery(sellShipments) {
  return {
    text: `SELECT sell_shipment AS "sellShipment", category,
             tender_status AS "tenderStatus", detail,
             EXISTS (SELECT 1 FROM tenders t WHERE t.shipment_sell_id = shipments.sell_shipment AND t.status = ANY($2)) AS "activeTender"
           FROM shipments WHERE sell_shipment = ANY($1)`,
    values: [sellShipments, MOVE_BLOCKED_TENDER],
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
  const picks = []   // survivors of the status check, still keyed to their source
  for (const { orderNumber, sourceSellShipment } of deduped) {
    const src = bySell.get(sourceSellShipment)
    const rec = src?.detail?.orderList?.find((o) => idOf(o) === orderNumber)
    // Seeded status OR a live tender row — either one blocks (C6).
    if (!src || !rec || MOVE_BLOCKED_CATEGORY.includes(src.category) || MOVE_BLOCKED_TENDER.includes(src.tenderStatus) || src.activeTender) {
      blocked.push(orderNumber)
      continue
    }
    picks.push({ orderNumber, sourceSellShipment, rec })
  }
  // OC-open-23 — moving a shipment's only order (or every order of a
  // multi-order source in one pick) is ALLOWED: reversed 2026-09-25 per
  // Jana (transcript @00:06:06, "it's definitely going to turn into
  // consolidation"). An emptied source is left as-is — OC-open-23 remains
  // open on what, if anything, should happen to that empty shell.
  if (blocked.length) {
    const e = new Error(`${MOVE_MESSAGE} Order impacted: ${blocked.join(', ')}`)
    e.status = 400
    throw e
  }
  return { records: picks.map((p) => p.rec), sources: rows }
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

// C19 (S163) — the list columns a shipment's stops decide, from the FIRST
// pickup and the LAST delivery, in the seeded row's shapes (origin
// 'City ST US 12345', short date, tsFromDisplay). null when the stops can't
// answer (no pickup or no delivery left) — the caller keeps its columns.
export function rowFromStops(stops) {
  const pu = stops.find((s) => s.stopType === 'pickup')
  const del = stops.findLast((s) => s.stopType === 'delivery')
  if (!pu || !del) return null
  const pickupDate = stopDateToDisplay(pu.scheduledDateTime)
  const deliveryDate = stopDateToDisplay(del.scheduledDateTime)
  return {
    origin: [pu.city, pu.region, pu.country, pu.postal].filter(Boolean).join(' '),
    destination: [del.city, del.region, del.country, del.postal].filter(Boolean).join(' '),
    consignor: pu.facilityName ?? '',     // seed: consignor = pickup stop's facility
    consignee: del.facilityName ?? '',
    pickupDate, deliveryDate,
    pickupTs: tsFromDisplay(pickupDate), deliveryTs: tsFromDisplay(deliveryDate),
  }
}

// C4/C12 — stored stops → the { type, date, lat, lng, timeZone } shape
// orderChangeRouting reads; and the miles the seeded new list was priced at.
const routingStopsOf = (stops) => (stops ?? []).map((s) => ({
  type: s.stopType, date: s.scheduledDateTime, lat: s.lat, lng: s.lng, timeZone: s.timeZone,
}))
const baselineMilesOf = (detail) => detail?.orderChange?.consolidation?.summaryChanges?.distance?.new ?? detail?.distanceMiles

// C3 / DEC-205 / ruling N3 (S163) — an order left in Orders Pending To Assign
// at a save-stops becomes its OWN Direct shipment, same shape as
// planShipment's buildDirectShipment (so the same INSERT / link / search-index
// builders write it). Sourced from the target's PRE-save state, not a
// ManualOrder: only ~65% of seeded orders carry manual_order, and the old
// stops already hold the full sites (address, lat/lng, timeZone, dates).
// Lives here, not in planShipment.mjs: it needs mergeStops/
// computeListAggregates, and planShipment is in the client bundle
// (consolidateShipments → consolidationService.ts) — importing this module
// there would be a cycle dragging the whole SQL layer client-side.
//   source        { row, detail } — row = customer/planning/equipment/mode columns
//   orderSerialId orders.id (drives idsFor, same band as a created order)
export function buildSplitShipment({ source, orderRec, orderSerialId, now = new Date() }) {
  const ids = idsFor(orderSerialId)
  const id = idOf(orderRec)
  const orderNumber = orderRec.orderNumber ?? String(orderRec.orderId)
  const stopOf = (type) => {
    const s = (source.detail.shipmentStopList ?? []).find((x) => x.stopType === type && (x.orderIds ?? []).includes(id))
    // Every order sits on one pickup + one delivery (generate.mjs I-rules);
    // a gap is corrupt data — refuse before any write rather than invent a site.
    if (!s) throw new Error(`Order ${id} has no ${type} stop on ${source.detail.shipmentId ?? 'its shipment'}`)
    return s
  }
  const rows = [stopOf('pickup'), stopOf('delivery')].map((s, i) => ({
    stopSequence: i + 1, stopType: s.stopType, orderIds: [id], sourceStopSequence: s.stopSequence,
  }))
  const stops = mergeStops({ ...source.detail, orderList: [orderRec] }, rows)
  const fromStops = rowFromStops(stops)
  const agg = computeListAggregates([orderRec])
  // R6 — a missing flag is Y (consolidatableOf's default).
  const consolidatable = orderRec.consolidatable !== false
  const category = consolidatable ? 'consolidation' : 'hold'
  const src = source.row

  const row = {
    odysseyShipmentIdentifier: ids.odysseyShipmentIdentifier,
    buyShipment: ids.buyShipment,
    sellShipment: ids.sellShipment,
    orders: [orderNumber],
    pickupNumbers: agg.pickupNumbers,
    poNumbers: agg.poNumbers,
    shipmentType: agg.shipmentType,       // 'Direct' — one order
    planningType: src.planningType ?? null,
    legType: null, shipmentSequenceLeg: null, nextShipmentId: null,
    pro: null,
    customerId: src.customerId,
    customerName: src.customerName,
    consignor: fromStops.consignor,
    consignee: fromStops.consignee,
    origin: fromStops.origin,
    destination: fromStops.destination,
    pickupDate: fromStops.pickupDate,
    deliveryDate: fromStops.deliveryDate,
    mode: src.mode,
    equipmentCode: src.equipmentCode ?? '',
    // Deliberately NOT the source's equipment NUMBER: the carrier assigns it
    // (planShipment buildDirectShipment), and this shipment has no carrier.
    equipment: '',
    seal: null,
    scac: null,
    tenderStatus: '',
    shipmentStatus: shipmentStatusFor({ panel: 'monitoring', category }), // DEC-204
    panel: 'monitoring',
    category,
    validationMessage: null,
    grossWeight: agg.grossWeight,
    load: ids.load,
    loadCount: agg.loadCount,
    orderCount: '1',
    apFreightCost: null,                  // not rated
  }

  const t0 = new Date(now)
  const t1 = new Date(t0.getTime() + 30_000)
  const author = { name: 'OdysseyONE', kind: 'system' }
  const detail = {
    shipmentId: ids.sellShipment,
    odysseyShipmentIdentifier: ids.odysseyShipmentIdentifier,
    shipmentType: 'Direct',
    customerId: row.customerId,
    customerName: row.customerName,
    shipDirection: orderRec.shipDirectionCode ?? source.detail.shipDirection ?? '',
    freightTerms: source.detail.freightTerms ?? '',
    incotermInfo: null,
    numberOfStops: 2,
    pgiFlag: false,
    ratingStatus: 'Not Rated',
    trackingUrl: null,
    distanceMiles: null,
    totalVolumeValue: orderRec.volumeValue ?? 0,
    totalVolumeUomCode: orderRec.volumeUomCode ?? 'cuft',
    acceptedCarrierLabel: null,
    seedEquipment: row.equipmentCode || null,
    utilizationPercent: null,
    costSummary: undefined,
    orderList: [orderRec],
    shipmentStopList: stops,
    shippingOptionList: [],               // N3: no carrier list until planned
    droppedCarrierList: [],
    documentList: [],
    noteList: [],
    historyList: [
      { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t0.toISOString(), action: 'Shipment Created', category: 'create', outcome: 'update', author,
        details: `Buy Shipment ${ids.buyShipment} and Sell Shipment ${ids.sellShipment} created successfully for Order ${orderNumber}, removed from shipment ${source.detail.odysseyShipmentIdentifier ?? source.detail.shipmentId} during order change review.` },
      { user: 'OdysseyONE', source: 'OdysseyONE', timestamp: t1.toISOString(), action: 'Optimization Evaluation', category: 'update', author,
        details: consolidatable
          ? 'Optimization evaluation completed. Shipment moved to Consolidation.'
          : 'Optimization evaluation completed. Shipment moved to Hold.',
        outcome: consolidatable ? 'update' : 'neutral' },
    ],
  }
  return { row, detail, pickupTs: fromStops.pickupTs, deliveryTs: fromStops.deliveryTs }
}

// Pre-transaction reads for the C3 split: the target's own list columns and
// each pending order's serial id. Any gap throws here, before BEGIN.
async function planSplits(db, sellShipment, detail, pending) {
  const { rows: [row] } = await db.query({
    text: `SELECT customer_id AS "customerId", customer_name AS "customerName", planning_type AS "planningType",
             equipment_code AS "equipmentCode", mode
           FROM shipments WHERE sell_shipment = $1`,
    values: [sellShipment],
  })
  const { rows: idRows } = await db.query({
    text: 'SELECT id, order_number AS "orderNumber" FROM orders WHERE order_number = ANY($1)',
    values: [pending.map(idOf)],
  })
  const serial = new Map(idRows.map((r) => [r.orderNumber, Number(r.id)]))
  const now = new Date()
  return pending.map((orderRec) => {
    const orderSerialId = serial.get(idOf(orderRec))
    if (orderSerialId == null) throw new Error(`No orders row for order ${idOf(orderRec)}`)
    return buildSplitShipment({ source: { row, detail }, orderRec, orderSerialId, now })
  })
}

// `listCarrier` (T4, S160) — optional {scac, apFreightCost}, the grid columns
// derived from the tender row this resolution left active (see
// listCarrierFor above). Omitted entirely for callers that don't adopt a
// tender list (none left, after T4 — kept optional so a query-text/values
// assertion written before T4 still passes unchanged).
export function buildOrderChangeResolveQuery(sellShipment, outcome, resolution, listCarrier) {
  const carrierSet = listCarrier ? ', scac = $7, ap_freight_cost = $8' : ''
  const values = listCarrier
    ? [
        outcome.tenderStatus, outcome.panel, outcome.category, outcome.validationMessage,
        JSON.stringify(resolution), sellShipment, listCarrier.scac, listCarrier.apFreightCost,
      ]
    : [
        outcome.tenderStatus, outcome.panel, outcome.category, outcome.validationMessage,
        JSON.stringify(resolution), sellShipment,
      ]
  // DEC-204: the status follows the re-filing (last param, so the earlier
  // placeholders keep their numbers).
  values.push(shipmentStatusFor(outcome))
  return {
    text: `UPDATE shipments
             SET tender_status = $1, panel = $2, category = $3, validation_message = $4,
                 detail = jsonb_set(detail, '{orderChange,resolution}', $5::jsonb)${carrierSet},
                 shipment_status = $${values.length}
           WHERE sell_shipment = $6 RETURNING sell_shipment`,
    values,
  }
}

export function buildDetailReadQuery(sellShipment) {
  return { text: 'SELECT detail FROM shipments WHERE sell_shipment = $1', values: [sellShipment] }
}

// C19 — the columns buildSearchIndexQuery projects that a save-stops doesn't
// recompute itself (roster/route come from the save).
export function buildSearchRowQuery(sellShipment) {
  return {
    text: `SELECT odyssey_shipment_id AS "odysseyShipmentIdentifier", buy_shipment AS "buyShipment", pro,
             customer_id AS "customerId", customer_name AS "customerName", equipment, seal, scac, load,
             planning_type AS "planningType"
           FROM shipments WHERE sell_shipment = $1`,
    values: [sellShipment],
  }
}

// C11 (S163) — Save recomputes the header, so every number the review shows
// agrees before and after Save (DEC-192). The header fields for ANY saved
// shipment (target or 15872 source); the review state — summaryChanges' `new`
// side and the costs — only for a target given its `rerouted` list. Priors
// stay: they're the customer's pre-change values. A pair the seed didn't
// write (the value never changed) is only created when this save changes it —
// LINX-15435 shows Prior/New only for a changed value.
const round2 = (n) => Math.round(n * 100) / 100
export function recomputeReviewTotals(detail, orderList, stops, rerouted) {
  const sum = (list, f) => round2(list.reduce((t, o) => t + (f(o) ?? 0), 0))
  const volume = sum(orderList, (o) => o.volumeValue)
  const miles = totalMiles(stops)
  const out = { totalVolumeValue: volume }
  if (miles != null) out.distanceMiles = miles
  const c = detail?.orderChange?.consolidation
  if (!c || !rerouted) return out
  const pair = (cur, oldValue, newValue) => (cur
    ? { ...cur, new: newValue }
    : (newValue !== oldValue ? { prior: oldValue, new: newValue } : undefined))
  const sc = c.summaryChanges ?? {}
  out.summaryChanges = {
    ...sc,
    grossWeight: pair(sc.grossWeight, sum(detail.orderList ?? [], (o) => o.grossWeightValue), sum(orderList, (o) => o.grossWeightValue)),
    volume: pair(sc.volume, detail.totalVolumeValue, volume),
    distance: miles != null ? pair(sc.distance, detail.distanceMiles, miles) : sc.distance,
  }
  out.costs = {
    ...c.costs,
    // Same rank-1 convention as the seed (generate.mjs selectedNew); an empty
    // list (Scenario B, dropped carriers only) genuinely has none.
    newConsolidated: rerouted.find((o) => o.rank === 1)?.totalCostAmount ?? null,
    newDirect: sum(orderList, (o) => o.cost?.directCostAmount),
  }
  return out
}

// Where each recomputeReviewTotals key (plus the rerouted newTenderList) lives
// in the detail blob. Code constants, never request input.
const PATCH_PATHS = {
  totalVolumeValue: '{totalVolumeValue}',
  distanceMiles: '{distanceMiles}',
  summaryChanges: '{orderChange,consolidation,summaryChanges}',
  costs: '{orderChange,consolidation,costs}',
  newTenderList: '{orderChange,newTenderList}',
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
// point, so both reset to their "nothing pending" values; the rest of
// consolidation (changedOrderIds/orderComparisons, summaryChanges' priors)
// is the customer-facing diff and stays untouched — `patch` (C11) rewrites
// only the recomputed values.
// `orderList`/`orders`/`order_count` land in the SAME write (LINX-15872 —
// an external order copied in, or a pending one dropped, has to change the
// shipment's order roster in lockstep with its stops). `resetChanges: false`
// skips the consolidation-badge reset for a SOURCE shipment in the 15872
// move — its own review state (if any) isn't this save's business.
export function buildSaveStopsQuery(sellShipment, stops, orderList, { resetChanges = true, patch = {} } = {}) {
  const ids = orderList.map((o) => o.orderNumber ?? String(o.orderId))
  // OC-open-22 — gross_weight/load_count/po_numbers/pickup_numbers/shipment_type
  // land in the SAME write as orders/order_count, recomputed from this call's
  // orderList (computeListAggregates above).
  const agg = computeListAggregates(orderList)
  const values = [
    JSON.stringify(stops), JSON.stringify(orderList), ids, String(ids.length), sellShipment,
    agg.grossWeight, agg.loadCount, agg.poNumbers, agg.pickupNumbers, agg.shipmentType,
  ]
  const bind = (v) => { values.push(v); return `$${values.length}` }
  // N2 (S163) — detail.shipmentType follows the row's shipment_type ($10),
  // so a save that leaves one order reads Direct in the modal too.
  const base = `jsonb_set(jsonb_set(jsonb_set(detail, '{shipmentStopList}', $1::jsonb), '{orderList}', $2::jsonb), '{shipmentType}', to_jsonb($10::text))`
  // The target's own consolidation badges are stale after a save (S143);
  // a SOURCE shipment keeps whatever review state it had.
  // C20 (S163, LINX-15435 BR1) — stopsSaved marks the consolidated review
  // done, so every doorway (Stops tab, Tender tab's Review button) agrees;
  // what's left after a Scenario A save is the Direct decision (LINX-15671).
  let detailSql = resetChanges
    ? `jsonb_set(jsonb_set(jsonb_set(${base}, '{orderChange,consolidation,stopChanges}', '{}'::jsonb), '{orderChange,consolidation,locationChange}', 'false'::jsonb), '{orderChange,consolidation,stopsSaved}', 'true'::jsonb)`
    : base
  for (const [key, path] of Object.entries(PATCH_PATHS)) {
    if (patch[key] !== undefined) detailSql = `jsonb_set(${detailSql}, '${path}', ${bind(JSON.stringify(patch[key]))}::jsonb)`
  }
  // C19 (S163) — the list columns the stops decide land in the same write
  // (target and every source). No pickup/delivery left = keep the columns.
  const r = rowFromStops(stops)
  const rowSql = r
    ? `, origin = ${bind(r.origin)}, destination = ${bind(r.destination)}, consignor = ${bind(r.consignor)}, consignee = ${bind(r.consignee)},
             pickup_date = ${bind(r.pickupDate)}, delivery_date = ${bind(r.deliveryDate)},
             pickup_ts = ${bind(r.pickupTs)}::timestamptz, delivery_ts = ${bind(r.deliveryTs)}::timestamptz`
    : ''
  return {
    text: `UPDATE shipments SET detail = ${detailSql}, orders = $3, order_count = $4,
             gross_weight = $6, load_count = $7, po_numbers = $8, pickup_numbers = $9, shipment_type = $10${rowSql}
           WHERE sell_shipment = $5 RETURNING sell_shipment`,
    values,
  }
}

// T4 (S160) — the new tender list actually becomes current on every
// resolution. Before this, no resolution ever wrote `orderChange.newTenderList`
// anywhere durable: the Tender tab kept reading the PRIOR list forever (via
// `tenders`, seeded from the original routingOptions), and only the prior
// carrier's rate_amount ever moved (the cost query this replaces). Pure/
// testable: given the action, the seeded orderChange payload, the planner's
// cost pick, and the already-computed OC_OUTCOMES outcome (so the bypass
// "prior status stands" rule is read off ONE place, not re-derived here),
// returns the final rank-ordered tender rows to write.
//
// retender/bypass: the prior carrier keeps its scac (LINX-14511's whole
// point — the planner is acting on THAT carrier), inserted at its seeded
// `newOption.rank` when the re-route dropped it, cost applied regardless of
// whether it was already in the new list (parity with the cost query this
// replaces, which matched by scac alone). cancel: the new list stands; the
// prior carrier is marked Cancelled only if routing actually returned it —
// never inserted, there's no carrier left to cancel. approve-plan / a
// save-stops Scenario-B save: the new list stands untendered (LINX-15671 —
// "No tender action shall be automatically initiated").
export function adoptNewTenderList(action, orderChange, cost, outcome) {
  const priorScac = orderChange?.prior?.scac ?? null
  const priorTenderList = orderChange?.priorTenderList ?? []
  let rows = (orderChange?.newTenderList ?? []).map((o) => ({ ...o }))

  const hasPrior = priorScac != null && rows.some((o) => o.scac === priorScac)
  if ((action === 'retender' || action === 'bypass') && priorScac && !hasPrior) {
    const priorRow = priorTenderList.find((o) => o.scac === priorScac)
    if (priorRow) {
      // newOption.rank is the seeded insertion rank (generate.mjs's
      // insertionRank — one past the last option sharing its equipment
      // group); rows.length + 1 (append) is the only defensive fallback,
      // unreachable against real seed data.
      const insertAt = orderChange?.newOption?.rank ?? (rows.length + 1)
      rows = rows.map((o) => (o.rank >= insertAt ? { ...o, rank: o.rank + 1 } : o))
      rows.push({ ...priorRow, rank: insertAt })
      rows.sort((a, b) => a.rank - b.rank)
    }
  }

  const applyCost = (action === 'retender' || action === 'bypass') && typeof cost?.amount === 'number'
  const priorStatus = () => {
    if (action === 'retender') return 'Sent'
    // bypass — outcome.tenderStatus IS the OC_OUTCOMES bypass rule already
    // evaluated against body.priorTenderStatus (Accepted stays Accepted,
    // else prior ?? Sent). Reusing it keeps one rule in one place.
    if (action === 'bypass') return outcome?.tenderStatus ?? 'Sent'
    if (action === 'cancel') return 'Cancelled'
    return '' // approve-plan / save-stops Scenario B
  }

  return rows.map((o) => {
    if (o.scac !== priorScac) return { ...o, status: '' }
    const row = { ...o, status: priorStatus() }
    return applyCost ? withApTotal(row, cost.amount) : row
  })
}

// ponytail: same 2-decimal locale format as tools/generate.mjs's `fmt` — the
// shipments.ap_freight_cost column is a formatted string, not a number, and
// the grid must keep printing what the seed would have printed.
const fmtCost = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// OC-open-22, same spirit for order-change resolutions: the grid's scac/
// ap_freight_cost columns are generate.mjs's mainRow.scac/apFreightCost — the
// carrier+cost routing arrived at, independent of whether a tender on it is
// active. retender/bypass are acting ON the prior carrier, so that carrier's
// (possibly re-costed) row stays the list's answer; cancel/approve-plan/
// save-stops-B have no carrier being acted on, so the list falls back to the
// new list's own rank-1 (the option routing now leads with).
function listCarrierFor(action, rows, orderChange) {
  const priorScac = orderChange?.prior?.scac ?? null
  let row = (action === 'retender' || action === 'bypass') && priorScac
    ? rows.find((o) => o.scac === priorScac)
    : null
  if (!row) row = rows.find((o) => o.rank === 1) ?? rows[0]
  // C22 (S163) — an adopted EMPTY list (dropped carriers only) clears the
  // grid's carrier + cost; returning null would skip the SET and leave the
  // old carrier showing on a shipment that no longer has one.
  if (!row) return { scac: null, apFreightCost: null }
  return {
    scac: row.scac ?? null,
    // The grid's AP Freight Cost is the AP total (generate.mjs mainRow.apFreightCost = fmt(apTotal)).
    apFreightCost: typeof row.totalCostAmount === 'number' ? fmtCost(row.totalCostAmount) : null,
  }
}

export function buildTenderDeleteQuery(sellShipment) {
  return { text: 'DELETE FROM tenders WHERE shipment_sell_id = $1', values: [sellShipment] }
}

// detail.shippingOptionList mirrors the tenders table (sellShipmentDetail
// reads tenders and overwrites shippingOptionList with it whenever any tender
// rows exist) — writing it here too means a live read that, for whatever
// reason, sees zero tender rows still agrees with the resolved list rather
// than falling back to the stale pre-change blob.
// C24 (S163) — `dropped` (adoptDroppedCarriers) lands in the same write, so
// the adopted list and its dropped carriers can't disagree; null keeps the
// shipment's own droppedCarrierList.
export function buildShippingOptionListQuery(sellShipment, rows, dropped = null) {
  const set = `jsonb_set(detail, '{shippingOptionList}', $1::jsonb)`
  return {
    text: `UPDATE shipments SET detail = ${dropped ? `jsonb_set(${set}, '{droppedCarrierList}', $3::jsonb)` : set}
           WHERE sell_shipment = $2`,
    values: dropped ? [JSON.stringify(rows), sellShipment, JSON.stringify(dropped)] : [JSON.stringify(rows), sellShipment],
  }
}

// C24 (S163) — an adopted tender list carries the dropped carriers of the
// SAME routing (orderChange.droppedCarriers.new, LINX-14510), in the
// shipment's droppedCarrierList shape (sellShipmentOut.ts
// SellShipmentDroppedCarrier). The preview rows don't carry the rate-contract
// fields: rpcId/startDate/stopDate/routeGroup come from the shipment's
// existing entry for the same scac, else null; the rest of the shape is
// null/false (the mapper renders both as `--`/unchecked). Null when the order
// change has no new dropped list — nothing to adopt.
export function adoptDroppedCarriers(orderChange, existing = []) {
  const rows = orderChange?.droppedCarriers?.new
  if (!Array.isArray(rows)) return null
  return rows.map((r) => {
    const e = (existing ?? []).find((d) => d.scac === r.scac)
    return {
      scac: r.scac, carrierName: r.carrierName, equipmentCode: r.equipment,
      dropCode: r.dropCode, reason: r.reason, reasonDescription: r.reasonDescription, routeRank: r.routeRank,
      rpcId: e?.rpcId ?? null, startDate: e?.startDate ?? null, stopDate: e?.stopDate ?? null, routeGroup: e?.routeGroup ?? null,
      pickupDateTime: null, deliveryDateTime: null, transitTime: null, transitSource: null, ttId: null,
      commitment: null, uom: null, accepted: null, open: null, comment: null, cvcId: null,
      orderEquipment: false, indirectPoint: false,
    }
  })
}

// T4 — replaces a shipment's tenders rows wholesale (delete then re-insert in
// rank order) on the SAME checked-out transaction client every other write in
// this function uses. ponytail: delete+insert, not a diff — the whole point
// of adopting a list is "this is the list now"; the row count here (a
// shipment's carrier count) is small enough that N+1 inserts cost nothing
// worth a bulk-VALUES query.
async function writeTenderAdoption(client, sellShipment, rows, dropped) {
  await client.query(buildTenderDeleteQuery(sellShipment))
  for (const row of rows) await client.query(buildTenderInsertQuery(sellShipment, row))
  await client.query(buildShippingOptionListQuery(sellShipment, rows, dropped))
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
    const onStops = new Set(body.stops.flatMap((s) => s.orderIds ?? []))
    // C8 (S163) — an external order that isn't on any stop can't be honoured
    // (it would leave its source for nowhere). The client already filters
    // (EditStopsView), so this only guards the server.
    const unplaced = (body.externalOrders ?? []).map((e) => e.orderNumber).filter((id) => !onStops.has(id))
    if (unplaced.length) {
      const e = new Error(`externalOrders must all be placed on stops: ${unplaced.join(', ')}`); e.status = 400; throw e
    }
    // Revalidated + read BEFORE the transaction opens — a blocked source
    // order 400s here with nothing written, no BEGIN ever issued.
    const { records: external, sources } = await pullExternalOrders(db, body.externalOrders)
    // D2 — the confirm dialog's promise: orders left pending leave the shipment.
    const orderList = [...(detail.orderList ?? []), ...external].filter((o) => onStops.has(idOf(o)))
    const merged = mergeStops({ ...detail, orderList }, body.stops)
    // C3 / DEC-205 — ...and each becomes a shipment of its own. Built (and
    // its reads done) before BEGIN; zero pending = zero extra queries.
    const pending = (detail.orderList ?? []).filter((o) => !onStops.has(idOf(o)))
    const splits = pending.length ? await planSplits(db, sellShipment, detail, pending) : []
    // C4/C12 (DEC-206, DEC-215) — the new list re-routed ONCE over the saved
    // stops: the target's review keeps it (Scenario A's Direct review shows
    // it) and Scenario B adopts it below. A Direct order change has no
    // consolidated plan to re-route — its list is left as seeded.
    const orderChange = detail?.orderChange ?? {}
    const rerouted = orderChange.consolidation
      ? rerouteTenderList(orderChange.newTenderList ?? [], routingStopsOf(merged), baselineMilesOf(detail))
      : null
    // C11 — the header recomputed in the same write (review state only with a re-route).
    const patch = recomputeReviewTotals(detail, orderList, merged, rerouted)
    if (rerouted) patch.newTenderList = rerouted
    // C19 — the target's search rows follow its new roster/route (read here, written in the tx).
    const { rows: [searchRow] } = await db.query(buildSearchRowQuery(sellShipment))

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
      await client.query(buildSaveStopsQuery(sellShipment, merged, orderList, { patch }))
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
        await client.query(buildSaveStopsQuery(src.sellShipment, next.stops, next.orderList, {
          resetChanges: false, patch: recomputeReviewTotals(src.detail, next.orderList, next.stops),
        }))
      }
      for (const split of splits) {
        const sell = split.row.sellShipment
        // idsFor is keyed by orders.id, so an order split twice mints the same
        // sell id. The earlier row can only be an emptied shell (its order has
        // since moved on) — clear it and its search rows (tenders cascade).
        // A NON-empty row holding the id makes the INSERT below violate the
        // PK and roll back the whole save — acceptable: nothing is half-written.
        // order_count is text (001_schema.sql:34), written as String(n).
        await client.query({ text: `DELETE FROM search_index WHERE domain = 'shipments' AND entity_id = $1`, values: [sell] })
        await client.query({ text: `DELETE FROM shipments WHERE sell_shipment = $1 AND order_count = '0'`, values: [sell] })
        await client.query(buildInsertShipmentQuery(split))
        // Also flips order_status to 'Planned Shipment'.
        await client.query(buildLinkOrderQuery(split.row.orders[0], sell))
        await client.query(buildSearchIndexQuery(split.row))
      }
      // Scenario A (active tender) writes nothing further: the row is already
      // exceptions/order-change at this tender status (that's what "active"
      // means), and orderChange.resolution stays untouched — the tender
      // decision is still pending on the Direct Actions card (LINX-15671).
      // A refile query here would just re-set the same values it already has.
      // The TARGET's scenario reads body.priorTenderStatus, not the live
      // tenders table (unlike a source's move block, C6): its tendering is
      // locked for the whole review (LINX-14509), so the prior can't drift.
      let listCarrier = null
      if (!OC_ACTIVE_TENDER_STATUSES.includes(body?.priorTenderStatus)) {
        // Scenario B — same "final decision" stamp as retender/bypass/cancel,
        // AND (T4) the same tender-list adoption: the new plan is final, so
        // its stops AND its tender list both become current in this one save.
        const resolution = { action, cost: null, resolvedAt: new Date().toISOString() }
        const adopted = rerouted ? { ...orderChange, newTenderList: rerouted } : orderChange
        const tenderRows = adoptNewTenderList(action, adopted, null, outcome)
        listCarrier = listCarrierFor(action, tenderRows, adopted)
        await client.query(buildOrderChangeResolveQuery(sellShipment, outcome, resolution, listCarrier))
        await writeTenderAdoption(client, sellShipment, tenderRows, adoptDroppedCarriers(adopted, detail.droppedCarrierList))
      }
      if (searchRow) {
        const { pickupNumbers, shipmentType } = computeListAggregates(orderList)
        const index = buildSearchIndexQuery({
          ...searchRow, ...rowFromStops(merged), sellShipment, scac: listCarrier?.scac ?? searchRow.scac,
          orders: orderList.map(idOf), pickupNumbers, shipmentType,
        })
        // ponytail: the target only — a 15872 source's rows keep the moved
        // order until its next reseed (an emptied one is hidden anyway, C5).
        await client.query({ text: `DELETE FROM search_index WHERE domain = 'shipments' AND entity_id = $1`, values: [sellShipment] })
        if (index.values.length) await client.query(index)
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

  // T4 — read BEFORE the transaction (same shape as save-stops above): a
  // missing shipment 404s here with nothing written, no BEGIN ever issued.
  const { rows: detailRows } = await db.query(buildDetailReadQuery(sellShipment))
  if (detailRows.length === 0) {
    const e = new Error(`No shipment: ${sellShipment}`); e.status = 404; throw e
  }
  const detail = detailRows[0].detail ?? {}
  let orderChange = detail.orderChange ?? {}
  const cost = body?.cost ?? null
  const resolution = { action, cost, resolvedAt: new Date().toISOString() }
  // C4/C12 — only a CONSOLIDATED order change re-routes over its stops;
  // Direct order changes are untouched.
  const stops = routingStopsOf(detail.shipmentStopList)
  if (orderChange.consolidation && action === 'approve-plan') {
    // The planner approved exactly what View Routing showed (same function).
    orderChange = { ...orderChange, newTenderList: rerouteTenderList(orderChange.newTenderList ?? [], stops, baselineMilesOf(detail)) }
  }
  let tenderRows = adoptNewTenderList(action, orderChange, cost, outcome)
  // The inserted prior carrier also carries the stop dates (Jana 09-25
  // @00:15:03–00:16:29); the rest already do (Save wrote the re-routed list).
  if (orderChange.consolidation && (action === 'retender' || action === 'bypass')) tenderRows = applyStopDates(tenderRows, stops)
  const listCarrier = listCarrierFor(action, tenderRows, orderChange)

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    await client.query(buildOrderChangeResolveQuery(sellShipment, outcome, resolution, listCarrier))
    await writeTenderAdoption(client, sellShipment, tenderRows, adoptDroppedCarriers(orderChange, detail.droppedCarrierList))
    await client.query('COMMIT')
  } catch (e) {
    try { await client.query('ROLLBACK') } catch {}
    throw e
  } finally {
    client.release()
  }
  return { success: true }
}

// PUT /shipment-service/v1/sell-shipment-out/:id/tender — add or update ONE
// quote (Add Quote / Edit Quote / a tender-status action). Addressed by rank,
// which is unique per shipment. ponytail: update-then-insert instead of an
// ON CONFLICT upsert — no unique index to migrate onto the live table.
// LINX-15796 BR-07/AC-06 (S156) — expectStatus, when passed, makes the UPDATE
// conditional on the row's CURRENT status: two tabs (or an emailed carrier
// response racing a planner action) cannot both record a write.
export function buildTenderUpdateQuery(sellShipment, option, expectStatus) {
  const text = `UPDATE tenders SET scac = $1, carrier_name = $2, status = $3, route_group = $4,
             rate_amount = $5, option = $6
           WHERE shipment_sell_id = $7 AND rank = $8${expectStatus ? ' AND status = $9' : ''} RETURNING id`
  const values = [
    option.scac ?? null, option.carrierName ?? null, option.status ?? null,
    option.routeGroup ?? null, option.rateAmount ?? option.rateDetails?.baseRate ?? null,
    JSON.stringify(option), sellShipment, option.rank,
  ]
  if (expectStatus) values.push(expectStatus)
  return { text, values }
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
  const expectStatus = body?.expectStatus
  const updated = await db.query(buildTenderUpdateQuery(sellShipment, option, expectStatus))
  if (updated.rows.length === 0) {
    if (expectStatus) {
      const e = new Error('already-processed'); e.status = 409; throw e
    }
    await db.query(buildTenderInsertQuery(sellShipment, option))
  }
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
