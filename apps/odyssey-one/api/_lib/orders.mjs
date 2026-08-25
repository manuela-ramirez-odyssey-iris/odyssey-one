// api/_lib/orders.mjs — SQL for the OdysseyONE order list + tab counts.
// Builders are pure (return { text, values }) so they test without a DB. User
// input reaches SQL ONLY through $N parameters; sort/filter columns come ONLY
// from the whitelist maps below — never from raw request keys.

// The "Validation Errors" main tab filters to these display-label statuses.
// Mirror of VALIDATION_ERROR_STATUSES in src/api/services/orderService.ts:50
// (ORD-03) — keep in lockstep with that source const.
const VALIDATION_ERROR_STATUSES = ['Planning Failed', 'Shipment Failed']

// Row projection: DB snake_case → OrderListRow camelCase (src/api/types/orderList.ts).
// consignor/consignee/grossWeight/volume are JSONB columns returned as-is.
const ROW_COLUMNS = `
  order_number AS "orderNumber", order_id AS "orderId", order_source AS "orderSource",
  customer, ship_direction AS "shipDirection", freight_terms AS "freightTerms", equipment,
  consignor, consignee, gross_weight AS "grossWeight", volume, commodity, order_status AS "orderStatus",
  hazardous, created_at AS "createdAt", created_by AS "createdBy",
  last_edit_at AS "lastEditAt", draft_order_status AS "draftOrderStatus", error_count AS "errorCount",
  last_edited_by AS "lastEditedBy", created_tz AS "createdTimeZoneCode", last_edit_tz AS "lastEditTimeZoneCode"`

// Sortable columns. Keys are OrderListRow/OrderRowVM field names — values are
// whitelisted SQL (column names or expressions), never user input, so they're
// safe to interpolate directly into ORDER BY (see buildOrderListQuery).
const SORT_MAP = {
  orderNumber: 'order_number', customer: 'customer', orderStatus: 'order_status',
  commodity: 'commodity', equipment: 'equipment',
  orderSource: 'order_source', shipDirection: 'ship_direction', freightTerms: 'freight_terms',
  hazardous: 'hazardous', latestPickup: 'latest_pickup_ts', latestDelivery: 'latest_delivery_ts',
  weight: `(gross_weight->>'value')::numeric`, volume: `(volume->>'value')::numeric`,
  created: 'created_at', createdBy: 'created_by', lastEdit: 'last_edit_at', lastEditedBy: 'last_edited_by',
  draftOrderStatus: 'draft_order_status', errorCount: 'error_count',
  shipperLocation: 'origin_city', destinationLocation: 'dest_city',
}

// Array-of-string filters (OrderListRequest.filters): key → column, matched with = ANY.
//
// These maps are WHITELISTS: a filter key that isn't listed is silently
// ignored, which is exactly how a panel filter can look wired and do nothing.
// Adding a field to OrderListRequest.filters means adding it HERE too, not
// only to the mock service — the app runs live whenever .env.local sets
// VITE_API_MODE=live, which is the default local setup.
const ARRAY_FILTERS = [
  ['customers', 'customer'], ['orderNumbers', 'order_number'], ['orderStatuses', 'order_status'],
  ['originCities', 'origin_city'], ['originStates', 'origin_state'], ['originCountries', 'origin_country'],
  ['destinationCities', 'dest_city'], ['destinationStates', 'dest_state'], ['destinationCountries', 'dest_country'],
  // Draft tab (LINX-11663) + Validation Errors tab (LINX-11659). `= ANY`
  // excludes NULLs, which is the AC's "filters can not be applied on blank
  // values" for free.
  ['createdBy', 'created_by'], ['lastEditedBy', 'last_edited_by'],
  ['draftOrderStatuses', 'draft_order_status'],
]
// Date-range bounds: key → column, comparison. To-bounds are date-inclusive (< next day).
const DATE_FILTERS = [
  ['earliestPickupDateFrom', 'earliest_pickup_ts', '>='], ['earliestPickupDateTo', 'earliest_pickup_ts', '<'],
  ['latestPickupDateFrom', 'latest_pickup_ts', '>='], ['latestPickupDateTo', 'latest_pickup_ts', '<'],
  ['earliestDeliveryDateFrom', 'earliest_delivery_ts', '>='], ['earliestDeliveryDateTo', 'earliest_delivery_ts', '<'],
  ['latestDeliveryDateFrom', 'latest_delivery_ts', '>='], ['latestDeliveryDateTo', 'latest_delivery_ts', '<'],
  // Draft tab (LINX-11663)
  ['createdDateFrom', 'created_at', '>='], ['createdDateTo', 'created_at', '<'],
  ['lastEditDateFrom', 'last_edit_at', '>='], ['lastEditDateTo', 'last_edit_at', '<'],
]

// Error Count comparator (LINX-11659). The operator is looked up in this map,
// never interpolated from the request — same rule as SORT_MAP.
const ERROR_COUNT_OPS = { gt: '>', eq: '=', lt: '<' }


// ── Committed bar chips (S130) ─────────────────────────────────────────────
/**
 * Progression attribute key → how it restricts a row. The SERVER TWIN of
 * `src/search/orders/progression.js` + its `orderSearchRow` projection; the two
 * cannot import each other (this file is a Vercel function, that one pulls the
 * browser data layer), so the agreement is ASSERTED instead —
 * src/search/orders/chipParity.test.js fails on drift. Same arrangement
 * search-registry.mjs already has with the Shipments progression.
 *
 * Shapes:
 *   sql    — an expression compared as text (substring, or whole-value when the
 *            chip is `exact`). Projected the way the COLUMN reads, because that
 *            is what the chip carries: a jsonb measure unwraps to its value, a
 *            location concatenates the way orderSearchRow does.
 *   date   — a timestamp column; the chip's M/D/YYYY value becomes a one-day range.
 *   bool   — a boolean column; the chip carries the badge text the column shows.
 *   labels — DISPLAY label → stored code, for the three columns that store codes
 *            (ship_direction 'O', freight_terms 'A', order_source 'INTEGRATED').
 *            The bar only ever shows labels, so an unmapped label must match
 *            NOTHING rather than fall through to the raw text.
 */
const SHIP_DIRECTION_CODES = { Outbound: 'O', Inbound: 'I' }
const FREIGHT_TERM_CODES = {
  'Pre-Paid': 'P', Collect: 'C', 'Pre-Paid/Add': 'A', 'Third Party': 'T', 'No Charge': 'N',
}
const ORDER_SOURCE_CODES = { Integrated: 'INTEGRATED', Manual: 'MANUAL' }

export const CHIP_COLS = {
  'order-number': { sql: 'order_number' },
  customer: { sql: 'customer' },
  // Mirrors orderSearchRow's locationText: name, city, state, country.
  'shipper-location': { sql: "concat_ws(', ', consignor->>'name', consignor->>'city', consignor->>'state', consignor->>'country')" },
  'destination-location': { sql: "concat_ws(', ', consignee->>'name', consignee->>'city', consignee->>'state', consignee->>'country')" },
  'latest-pickup': { date: 'latest_pickup_ts' },
  'latest-delivery': { date: 'latest_delivery_ts' },
  equipment: { sql: 'equipment' },
  'ship-direction': { sql: 'ship_direction', labels: SHIP_DIRECTION_CODES },
  'freight-terms': { sql: 'freight_terms', labels: FREIGHT_TERM_CODES },
  'order-status': { sql: 'order_status' },
  'order-source': { sql: 'order_source', labels: ORDER_SOURCE_CODES },
  'draft-order-status': { sql: 'draft_order_status' },
  'error-count': { sql: 'error_count::text' },
  hazardous: { bool: 'hazardous', trueValue: 'Hazmat' },
  'gross-weight': { sql: "gross_weight->>'value'" },
  volume: { sql: "volume->>'value'" },
  'created-date': { date: 'created_at' },
  'created-by': { sql: 'created_by' },
  'last-edit-date': { date: 'last_edit_at' },
  'last-edited-by': { sql: 'last_edited_by' },
}

// A chip value is an IN-list on commas — the same split tokenizeChipValue makes
// client-side (commas only: a value can contain spaces).
function chipTokens(queryValue) {
  return String(queryValue ?? '').split(',').map(t => t.trim()).filter(Boolean)
}

// M/D/YYYY (what a bar chip carries) → ISO, or null when unparseable.
function chipDateIso(value) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(value ?? '').trim())
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null
}

/**
 * ONE chip as a WHERE fragment, or null when it restricts nothing (unknown key,
 * empty value). `add` binds a value and returns its `$N` placeholder.
 *
 * Reproduces criteria-core's matchesChip exactly — that is the contract, since
 * the mock runs that function over the projected row and the two surfaces must
 * return the same set. `exact` compares whole values case-insensitively;
 * everything else is a case-insensitive substring; multiple tokens OR.
 */
export function chipClause(chip, add) {
  const cfg = CHIP_COLS[chip?.key]
  if (!cfg) return null

  // Case 12 (S131) — an EXPANDED calendar chip carries `from`/`to` days, not a
  // queryValue, and would otherwise fall through the `tokens` guard below and
  // silently narrow nothing. Mirrors criteria-core's matchesChip: inclusive
  // between, a missing bound leaves that side open, an unparseable bound is
  // treated as absent, and no bounds at all restrict nothing.
  if (chip.kind === 'date-range') {
    if (!cfg.date) return null
    const from = chipDateIso(chip.from)
    const to = chipDateIso(chip.to)
    const parts = []
    if (from) parts.push(`${cfg.date} >= ${add(from)}::date`)
    if (to) parts.push(`${cfg.date} < (${add(to)}::date + 1)`)
    return parts.length ? `(${parts.join(' AND ')})` : null
  }

  const tokens = chipTokens(chip.queryValue)
  if (!tokens.length) return null

  if (cfg.date) {
    const isos = tokens.map(chipDateIso).filter(Boolean)
    if (!isos.length) return 'FALSE'   // a date chip with no parseable day matches nothing
    return `(${isos.map(iso => `(${cfg.date} >= ${add(iso)}::date AND ${cfg.date} < (${add(iso)}::date + 1))`).join(' OR ')})`
  }

  if (cfg.bool) {
    // The catalog has exactly one value ('Hazmat'), which the column renders for
    // TRUE. Anything else is not a value the user could have seen.
    const wantsTrue = tokens.some(t => t.toLowerCase() === cfg.trueValue.toLowerCase())
    return wantsTrue ? `${cfg.bool} IS TRUE` : 'FALSE'
  }

  const mapped = cfg.labels
    ? tokens.map(t => cfg.labels[t] ?? Object.entries(cfg.labels)
        .find(([label]) => label.toLowerCase() === t.toLowerCase())?.[1])
    : tokens
  // An unmapped label means "a value that does not exist" — honest empty, never
  // a fallthrough to matching the raw label against a column of codes.
  if (cfg.labels && mapped.some(v => v === undefined)) {
    if (mapped.every(v => v === undefined)) return 'FALSE'
  }
  const usable = mapped.filter(v => v !== undefined)
  if (!usable.length) return 'FALSE'

  const ors = usable.map(v => (chip.exact
    ? `upper(${cfg.sql}) = upper(${add(v)})`
    : `${cfg.sql} ILIKE '%' || ${add(v)} || '%'`))
  return `(${ors.join(' OR ')})`
}

// Columns GlobalSearch free text scans. MIRROR of ORDERS_FREE_TEXT_KEYS in
// src/search/orders/criteria.js — change both together, or the bar means one
// thing in mock and another in live. (`po_number` is deliberately absent from
// both: this table has no such column.)
const SEARCH_COLUMNS = ['order_number', 'customer']

// Relevance ranking for a free-text search, mirroring `scoreText` in
// src/search/criteria-core.js: exact 3 · starts-with 2 · contains 1 · none 0.
// Scored on the FIRST needle only — enough to float prefix hits to the top,
// which is the behaviour being reproduced, without a per-needle CASE explosion.
function relevanceSql(paramIndex) {
  const scored = SEARCH_COLUMNS.map(c =>
    `CASE WHEN lower(${c}) = lower($${paramIndex}) THEN 3
          WHEN lower(${c}) LIKE lower($${paramIndex}) || '%' THEN 2
          WHEN lower(${c}) LIKE '%' || lower($${paramIndex}) || '%' THEN 1
          ELSE 0 END`)
  return `GREATEST(${scored.join(', ')})`
}

// Origin/Destination location triples (LINX-10285): key → the three columns.
// Row-wise IN means a whole City-State-Country must match, so two selections
// can't cross-product into a third combination the user never picked.
const LOCATION_FILTERS = [
  ['originLocations', ['origin_city', 'origin_state', 'origin_country']],
  ['destinationLocations', ['dest_city', 'dest_state', 'dest_country']],
]

/**
 * Every criteria family as WHERE fragments, over a caller-owned `values` array.
 *
 * Extracted from buildOrderListQuery (S131) so the TAB COUNTS run the identical
 * predicate instead of a second implementation. The tab badges used to count
 * with nothing but the customer scope, so a filtered grid sat under badges
 * claiming the unfiltered totals — the Orders half of the Shipments
 * zero-counters report.
 */
export function orderWhereClauses(filters = {}, values = []) {
  const where = []
  const add = (clause, v) => { values.push(v); where.push(clause.replace('?', `$${values.length}`)) }

  // The panel sends location triples AND their three parallel arrays while the
  // LLD shape is unsettled. When the triples are present they are authoritative
  // and the arrays are skipped — a triple with a blank part (Birmingham, UK)
  // drops that part from the mirror array, so keeping both clauses would
  // exclude the very row the user picked.
  const supersededArrays = new Set(
    LOCATION_FILTERS.flatMap(([key, cols]) => (filters[key]?.length ? cols : [])),
  )

  for (const [key, col] of ARRAY_FILTERS) {
    const v = filters[key]
    if (v === undefined || supersededArrays.has(col)) continue
    if (v.length === 0) { where.push('FALSE'); continue }   // honest empty (S79c decision 10)
    add(`${col} = ANY(?)`, v)
  }
  for (const [key, col, op] of DATE_FILTERS) {
    if (!filters[key]) continue
    add(op === '<' ? `${col} < (?::date + 1)` : `${col} >= ?`, filters[key])
  }
  // Location triples — one row-wise IN per filter (the mirror arrays were
  // skipped above).
  for (const [key, cols] of LOCATION_FILTERS) {
    const list = filters[key]
    if (!list?.length) continue
    const tuples = list.map(t => {
      values.push(t.city ?? '', t.state ?? '', t.country ?? '')
      const n = values.length
      return `($${n - 2}, $${n - 1}, $${n})`
    })
    where.push(`(${cols.join(', ')}) IN (${tuples.join(', ')})`)
  }
  // Error Count comparator (LINX-11659) — both halves required, operator
  // whitelisted. A NULL error_count never satisfies a comparison, which is the
  // blank-value rule again.
  const ecOp = ERROR_COUNT_OPS[filters.errorCountOperator]
  if (ecOp && Number.isInteger(filters.errorCountValue)) {
    add(`error_count ${ecOp} ?`, filters.errorCountValue)
  }

  // Committed bar chips (S130) — each one ANDs onto everything above, the same
  // way a panel filter does. They are a SEPARATE path from `filters` on purpose:
  // see the `searchChips` doc comment in types/orderList.ts.
  for (const chip of filters.searchChips ?? []) {
    const clause = chipClause(chip, (v) => { values.push(v); return `$${values.length}` })
    if (clause) where.push(clause)
  }

  // GlobalSearch free text (S128). The client resolved the query into NEEDLES
  // already (phrase, or several codes) — this only has to reproduce the match:
  // each needle is a case-insensitive SUBSTRING ORed across the free-text
  // columns, and the needles are ORed with each other (multi-code union).
  //
  // The column list mirrors ORDERS_FREE_TEXT_KEYS in
  // src/search/orders/criteria.js — they must be changed together or live and
  // mock disagree about what "search" means. Values go through $N parameters;
  // ILIKE's wildcards are added in SQL, not by string-building the pattern.
  if (filters.searchTerms?.length) {
    const ors = filters.searchTerms.map(term => {
      values.push(term)
      const n = values.length
      return SEARCH_COLUMNS.map(c => `${c} ILIKE '%' || $${n} || '%'`).join(' OR ')
    })
    where.push(`(${ors.join(' OR ')})`)
  }

  return where
}

export function buildOrderListQuery({ pagination = {}, filters = {}, sort } = {}) {
  const values = []
  const where = orderWhereClauses(filters, values)

  const pageNumber = pagination.pageNumber ?? 1        // 1-based per LLD (Q29)
  const pageSize = pagination.pageSize ?? 50
  const sortCol = SORT_MAP[sort?.field] ?? 'order_number'
  const dir = sort?.direction === 'desc' ? 'DESC' : 'ASC'

  // A free-text search is RELEVANCE-ordered and the column sort is dropped for
  // the duration — the same override the mock service and the Shipments grid
  // apply. Ranking a result set and then re-sorting it by created-date would
  // throw the ranking away. The term parameter is pushed BEFORE limit/offset so
  // its $N is stable.
  let orderSql = `${sortCol} ${dir} NULLS LAST`
  if (filters.searchTerms?.length) {
    values.push(filters.searchTerms[0])
    orderSql = `${relevanceSql(values.length)} DESC, ${sortCol} ${dir} NULLS LAST`
  }

  values.push(pageSize); const limitP = values.length
  values.push((pageNumber - 1) * pageSize); const offsetP = values.length

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return {
    text: `SELECT ${ROW_COLUMNS}, count(*) OVER()::int AS "__total"
           FROM orders ${whereSql}
           ORDER BY ${orderSql}
           LIMIT $${limitP} OFFSET $${offsetP}`,
    values,
  }
}

// PG array literal for the validation-error statuses. Constant module data (no
// user input), so it's interpolated, not parameterized — this keeps values ===
// [customerIds] for the scope-only contract. Elements are double-quoted because
// they contain spaces ('{"Planning Failed","Shipment Failed"}').
const VALIDATION_ERROR_ARRAY_LITERAL = `{${VALIDATION_ERROR_STATUSES.map((s) => `"${s}"`).join(',')}}`

/**
 * The three tab badges. Criteria-aware since S131: the SAME `orderWhereClauses`
 * the list runs, so a badge can never claim rows the grid beneath it isn't
 * showing. The caller sends the criteria WITHOUT the active tab's own status
 * restriction — each count applies its own (that's what makes them three
 * different numbers).
 */
export function buildTabCountsQuery({ customerIds, filters } = {}) {
  const values = []
  const where = orderWhereClauses(filters ?? {}, values)
  if (customerIds !== undefined) {
    if (customerIds.length === 0) where.push('FALSE')   // honest empty (S79c decision 10)
    else { values.push(customerIds); where.push(`customer = ANY($${values.length})`) }
  }
  const scopeSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return {
    // "all" is a SQL reserved word — quote the alias.
    text: `SELECT count(*)::int AS "all",
                  count(*) FILTER (WHERE order_status = 'Draft')::int AS draft,
                  count(*) FILTER (WHERE order_status = ANY('${VALIDATION_ERROR_ARRAY_LITERAL}'))::int AS "validationErrors"
           FROM orders ${scopeSql}`,
    values,
  }
}

export async function orderList({ body, db }) {
  const request = body ?? {}
  const { rows } = await db.query(buildOrderListQuery(request))
  const totalCount = rows[0]?.__total ?? 0
  return {
    success: true,
    orders: rows.map(({ __total, ...r }) => r),
    pagination: {
      pageNumber: request.pagination?.pageNumber ?? 1,
      pageSize: request.pagination?.pageSize ?? 50,
      totalCount,
    },
    error: null,
  }
}

/**
 * Stays a GET, and the criteria ride as ONE JSON param (S131).
 *
 * Two constraints shaped this. (a) The badges must narrow with the grid, which
 * needs the whole filter object — a POST would have been the natural home for
 * it, but changing the method makes every already-deployed client 404 and the
 * badges vanish. An unknown query param, by contrast, is simply ignored by an
 * older server: the badges keep rendering scope-only counts until the deploy
 * catches up. (b) `filters` is sent WHOLE, never field-by-field — cherry-picking
 * chip fields into a URL is exactly what truncated the Shipments chips and made
 * every badge count 0.
 *
 * Parsed defensively, like the Shipments counts endpoint: malformed JSON
 * degrades to no criteria rather than 500ing the badges.
 */
export async function orderTabCounts({ query, db }) {
  const customerIds = query.has('customers') ? query.get('customers').split(',').filter(Boolean) : undefined
  let filters
  const raw = query.get('filters')
  if (raw) {
    try { filters = JSON.parse(raw) } catch { filters = undefined }
    if (filters && typeof filters !== 'object') filters = undefined
  }
  const { rows: [counts] } = await db.query(buildTabCountsQuery({ customerIds, filters }))
  return counts   // { all, draft, validationErrors }
}

// Order view (slice 3b): the list-row projection + the manual_order enrichment
// JSONB. The client composes them with its existing listRowToManualOrder+merge
// (same ladder as mock mode). Pending rows (no order_number yet) are addressed
// as 'pending-<orderId>' — resolved by internal order_id.
export function buildOrderViewQuery(key) {
  const pendingId = key.startsWith('pending-') ? key.slice('pending-'.length) : null
  if (pendingId) {
    return {
      text: `SELECT ${ROW_COLUMNS}, manual_order AS "manualOrder" FROM orders WHERE order_number = '' AND order_id = $1`,
      values: [Number(pendingId)],
    }
  }
  return {
    text: `SELECT ${ROW_COLUMNS}, manual_order AS "manualOrder" FROM orders WHERE order_number = $1`,
    values: [key],
  }
}

export async function orderView({ body, db }) {
  const key = body?.orderNumber
  if (!key) { const e = new Error('orderNumber required'); e.status = 400; throw e }
  const { rows } = await db.query(buildOrderViewQuery(String(key)))
  if (rows.length === 0) { const e = new Error(`No order: ${key}`); e.status = 404; throw e }
  const { manualOrder, ...row } = rows[0]
  return { row, manualOrder: manualOrder ?? null }
}

// ── Order update / Edit Order (LINX-10248) ──────────────────────────────────
// PUT /order-service/v3/order — "Confirm & Save Changes" on the edit form.
// The client sends the SAME manualOrder wire object create posts; we store it
// whole in manual_order (so a reopen hydrates at full fidelity) and re-derive
// the grid's projection columns from it — the server-side twin of the client's
// manualOrderToListRow. order_number / customer are identity: locked in the UI
// and never written here. No audit trail yet (LINX-13853–13866).
// userId (optional — R2-4): resolved to a username via the users table so
// last_edited_by stores the same identity kind as created_by, never the raw
// caller-supplied id. Absent/unresolvable userId writes NULL, not a COALESCE
// fallback to the previous value — keeping the old name would misattribute
// THIS edit to whoever made the last one, which defeats R2-4's whole point
// (trustworthy identity). The mapper's dash() already renders NULL as '--'.
// last_edit_tz is NOT re-derived here: no city→zone map is reachable from
// this file (deriveTimezone lives in tools/data-pools.mjs, a generator-only
// module), so it inherits the order's own created_tz. Known ceiling: if an
// edit moves the origin to a different zone, last_edit_tz goes stale until
// a server-side zone lookup exists.
// Shared wire → typed-column projection (S102 "mirror"): create and update
// both receive the SAME manualOrder wire object and must derive consignor/
// consignee/weights/commodity/hazardous identically, or the two paths drift
// on what the grid displays depending on which one last touched a row. ONE
// function, used by both buildCreateOrderQuery and buildUpdateOrderQuery.
function deriveOrderProjection(mo) {
  const line = mo.orderLines?.[0] ?? {}
  const consignor = {
    locationId: mo.originPartnerId ?? '', name: mo.originFullName ?? '', city: mo.originCity ?? '',
    state: mo.originRegion ?? '', country: mo.originCountry ?? 'US',
    earliestPickupDateTime: mo.requestedPickupDate ?? '', latestPickupDateTime: mo.pickupAppointment ?? '',
  }
  const consignee = {
    locationId: mo.destinationPartnerId ?? '', name: mo.destinationFullName ?? '', city: mo.destinationCity ?? '',
    state: mo.destinationRegion ?? '', country: mo.destinationCountry ?? 'US',
    earliestDeliveryDateTime: mo.requestedDeliveryDate ?? '', latestDeliveryDateTime: mo.deliveryAppointment ?? '',
  }
  return {
    consignor, consignee,
    shipDirection: mo.shipDirectionCode ?? '',
    freightTerms: mo.freightTermCode ?? '',
    equipment: mo.orderCarrierEquipDetailList?.[0]?.equipmentCode ?? '',
    grossWeight: { value: mo.grossWeightValue ?? 0, uom: mo.grossWeightUomCode ?? 'lbs' },
    volume: { value: mo.volumeValue ?? 0, uom: mo.volumeUomCode ?? 'cbf' },
    commodity: line.productDescription ?? '',
    hazardous: (mo.orderLines ?? []).some((l) => l.hazardous === true),
  }
}

export function buildUpdateOrderQuery(key, mo, userId) {
  const p = deriveOrderProjection(mo)
  return {
    text: `UPDATE orders SET
             manual_order = $1,
             ship_direction = $2, freight_terms = $3, equipment = $4,
             consignor = $5, consignee = $6,
             gross_weight = $7, volume = $8, commodity = $9, hazardous = $10,
             origin_city = $11, origin_state = $12, origin_country = $13,
             dest_city = $14, dest_state = $15, dest_country = $16,
             earliest_pickup_ts = NULLIF($17,'')::timestamptz, latest_pickup_ts = NULLIF($18,'')::timestamptz,
             earliest_delivery_ts = NULLIF($19,'')::timestamptz, latest_delivery_ts = NULLIF($20,'')::timestamptz,
             last_edit_at = now(),
             last_edited_by = (SELECT username FROM users WHERE id = $22),
             last_edit_tz = created_tz
           WHERE order_number = $21 RETURNING order_number`,
    values: [
      JSON.stringify(mo),
      p.shipDirection, p.freightTerms, p.equipment,
      JSON.stringify(p.consignor), JSON.stringify(p.consignee),
      JSON.stringify(p.grossWeight), JSON.stringify(p.volume),
      p.commodity, p.hazardous,
      p.consignor.city, p.consignor.state, p.consignor.country,
      p.consignee.city, p.consignee.state, p.consignee.country,
      p.consignor.earliestPickupDateTime, p.consignor.latestPickupDateTime,
      p.consignee.earliestDeliveryDateTime, p.consignee.latestDeliveryDateTime,
      key,
      userId ?? null,
    ],
  }
}

export async function updateOrder({ body, db }) {
  const key = body?.orderNumber
  const mo = body?.manualOrder
  if (!key) { const e = new Error('orderNumber required'); e.status = 400; throw e }
  if (!mo || typeof mo !== 'object') { const e = new Error('manualOrder required'); e.status = 400; throw e }
  const { rows } = await db.query(buildUpdateOrderQuery(String(key), mo, body?.userId))
  if (rows.length === 0) { const e = new Error(`No order: ${key}`); e.status = 404; throw e }
  return { success: true, orderNumber: rows[0].order_number }
}

// ── Status update (DB ledger row 9) ─────────────────────────────────────────
// PATCH /order-service/v3/order/status — the write path behind the three UI
// flows (Draft submit → Ready For Plan, OIF resolve/purge → Ready For Plan,
// cancel → Cancelled). Status values come ONLY from this whitelist.
const ALLOWED_STATUS_UPDATES = ['Ready For Plan', 'Cancelled']

export function buildUpdateOrderStatusQuery(key, status) {
  const pendingId = key.startsWith('pending-') ? key.slice('pending-'.length) : null
  if (pendingId) {
    return {
      text: `UPDATE orders SET order_status = $1 WHERE order_number = '' AND order_id = $2 RETURNING order_id`,
      values: [status, Number(pendingId)],
    }
  }
  return {
    text: `UPDATE orders SET order_status = $1 WHERE order_number = $2 RETURNING order_number`,
    values: [status, key],
  }
}

export async function updateOrderStatus({ body, db }) {
  const key = body?.orderNumber
  const status = body?.status
  if (!key) { const e = new Error('orderNumber required'); e.status = 400; throw e }
  if (!ALLOWED_STATUS_UPDATES.includes(status)) {
    const e = new Error(`status must be one of: ${ALLOWED_STATUS_UPDATES.join(', ')}`); e.status = 400; throw e
  }
  const { rows } = await db.query(buildUpdateOrderStatusQuery(String(key), status))
  if (rows.length === 0) { const e = new Error(`No order: ${key}`); e.status = 404; throw e }
  return { success: true }
}

// ── Order creation (R2-5) ───────────────────────────────────────────────────
// POST /order-service/v3/manual-order. The client already posts creates here
// (orderService.ts createOrder ~:271); saveDraft (~:331) posts the SAME path
// with orderStatus.orderStatusCode 'DRAFT' stamped by mapFormToOrderInterface
// (~:132-134) — one status field is the only difference, so one handler covers
// both, mirroring the mock's createOrder/saveDraft pair that both write into
// the same overlay. ConfirmationView.jsx:47 early-returns without
// data.orderNumber, so the number MUST be assigned and returned synchronously
// — there is no async/deferred-assignment path server-side.
export function buildCreateOrderQuery(mo, userId) {
  const p = deriveOrderProjection(mo)
  const orderNumber = (mo.orderNumber ?? '').trim()
  // 'DRAFT' is the only code the mapper ever stamps for a draft save
  // (mapFormToOrderInterface.ts:132-134); anything else (including absent,
  // e.g. a hand-built test payload) is a real create → 'Ready For Plan',
  // matching the mock's createOrder status label (orderService.ts:281).
  const status = mo.orderStatus?.orderStatusCode === 'DRAFT' ? 'Draft' : 'Ready For Plan'
  return {
    // id: orders.id (serial PK) is otherwise unused by app logic (ROW_COLUMNS
    // never selects it) — resolving it from Postgres's own sequence up front
    // (the CTE) gives atomic, race-free uniqueness for free, and lets a blank
    // orderNumber be zero-padded from it in the SAME statement: no
    // SELECT-MAX-then-INSERT race, no second round trip. 13-digit padding
    // matches tools/generate.mjs genOrderNumber's auto-generated branch and
    // the mock's `String(orderId).padStart(13, '0')` (orderService.ts:279) —
    // row-10 convention: orderNumber = orderId, padded.
    // pg_get_serial_sequence resolves 'orders' via search_path — schema-qualify
    // it if the table ever moves out of public.
    text: `WITH new_row AS (SELECT nextval(pg_get_serial_sequence('orders','id')) AS id)
           INSERT INTO orders (
             id, order_number, order_id, order_source, customer,
             ship_direction, freight_terms, equipment, consignor, consignee,
             gross_weight, volume, commodity, hazardous, order_status,
             manual_order,
             origin_city, origin_state, origin_country,
             dest_city, dest_state, dest_country,
             earliest_pickup_ts, latest_pickup_ts, earliest_delivery_ts, latest_delivery_ts,
             created_at, created_by, created_tz
           )
           SELECT
             id, COALESCE(NULLIF($1,''), lpad(id::text, 13, '0')), id, 'MANUAL', $2,
             $3, $4, $5, $6::jsonb, $7::jsonb,
             $8::jsonb, $9::jsonb, $10, $11, $12,
             $13::jsonb,
             $14, $15, $16,
             $17, $18, $19,
             NULLIF($20,'')::timestamptz, NULLIF($21,'')::timestamptz, NULLIF($22,'')::timestamptz, NULLIF($23,'')::timestamptz,
             now(), (SELECT username FROM users WHERE id = $24), $25
           FROM new_row
           RETURNING order_number, order_id, created_at, created_tz`,
    values: [
      orderNumber,
      mo.customerId ?? '',
      p.shipDirection, p.freightTerms, p.equipment,
      JSON.stringify(p.consignor), JSON.stringify(p.consignee),
      JSON.stringify(p.grossWeight), JSON.stringify(p.volume),
      p.commodity, p.hazardous, status,
      JSON.stringify(mo),
      p.consignor.city, p.consignor.state, p.consignor.country,
      p.consignee.city, p.consignee.state, p.consignee.country,
      p.consignor.earliestPickupDateTime, p.consignor.latestPickupDateTime,
      p.consignee.earliestDeliveryDateTime, p.consignee.latestDeliveryDateTime,
      userId ?? null,
      // created_tz: unlike a pickup/delivery leg, the order itself has no
      // top-level *TimeZoneCode field on the ManualOrder wire (createOrder.ts
      // only has per-leg requestedPickup/pickupAppointment/... zones) — same
      // ceiling Task 9 hit for last_edit_tz: no city→zone map is reachable
      // from this file. Honest NULL, not a borrowed leg zone.
      null,
    ],
  }
}

export async function createOrder({ body, db }) {
  const mo = body?.manualOrder
  if (!mo || typeof mo !== 'object') { const e = new Error('manualOrder required'); e.status = 400; throw e }
  try {
    const { rows } = await db.query(buildCreateOrderQuery(mo, body?.userId))
    const row = rows[0]
    return {
      orderId: row.order_id,
      success: true,
      message: `Order ${row.order_number} created successfully`,
      data: {
        orderNumber: row.order_number,
        orderDate: row.created_at.toISOString(),
        // Q28 open (mock constant, orderService.ts:291-292) — no shipmentMode/
        // zone derivation exists server-side either; matched verbatim so the
        // confirmation page renders identically in both modes.
        orderDateTimeZoneCode: 'EST',
        shipmentMode: 'Ground',
      },
    }
  } catch (err) {
    // 23505 = any unique violation; orders_number_unique is the only one a
    // sequence-minted id can realistically hit — honest 409, not a 500
    // (mirrors preferences.mjs's 23503→400 pattern for the FK case).
    if (err?.code === '23505') {
      const e = new Error(`Order number already exists: ${mo.orderNumber?.trim() || '(auto-generated)'}`); e.status = 409; throw e
    }
    // 23503 = FK violation — an unknown/absent customerId (orders.customer_id
    // references customers). Honest 400, same pattern preferences.mjs uses for
    // its FK case, instead of the raw pg error surfacing as a 500.
    if (err?.code === '23503') {
      const e = new Error(`Unknown customer: ${mo.customerId ?? '(none)'}`); e.status = 400; throw e
    }
    throw err
  }
}
