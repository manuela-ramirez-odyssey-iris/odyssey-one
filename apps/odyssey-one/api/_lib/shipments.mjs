// api/_lib/shipments.mjs — SQL for the OdysseyONE shipment error grids.
// Builders are pure (return { text, values }) so they test without a DB. User
// input reaches SQL ONLY through $N parameters; sort/filter columns come ONLY
// from the whitelist maps below — never from raw request keys.

// Row projection: DB snake_case → ShipmentErrorRow camelCase (types/shipmentErrorList.ts).
const ROW_COLUMNS = `
  buy_shipment AS "buyShipment", sell_shipment AS "sellShipment", orders, pro,
  customer_id AS "customerId", customer_name AS "customerName", consignor, consignee,
  origin, destination, pickup_date AS "pickupDate", delivery_date AS "deliveryDate",
  mode, equipment_code AS "equipmentCode", scac, tender_status AS "tenderStatus",
  shipment_status AS "shipmentStatus", panel, category, validation_message AS "validationMessage",
  gross_weight AS "grossWeight", load_count AS "loadCount", order_count AS "orderCount",
  ap_freight_cost AS "apFreightCost"`

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

export function buildCountsQuery({ panel, customerIds }) {
  const values = [panel]
  const where = ['panel = $1']
  scope(where, values, customerIds)
  return {
    text: `SELECT category, count(*)::int AS count FROM shipments WHERE ${where.join(' AND ')} GROUP BY category`,
    values,
  }
}

export function buildListQuery({ pageNumber = 0, pageSize = 50, filter = {}, sortBy, orderBy } = {}) {
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

  const sortCol = SORT_MAP[sortBy] ?? 'pickup_ts'
  const dir = orderBy === 'desc' ? 'DESC' : 'ASC'
  values.push(pageSize); const limitP = values.length
  values.push(pageNumber * pageSize); const offsetP = values.length

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return {
    text: `SELECT ${ROW_COLUMNS}, count(*) OVER()::int AS "__total"
           FROM shipments ${whereSql}
           ORDER BY ${sortCol} ${dir} NULLS LAST
           LIMIT $${limitP} OFFSET $${offsetP}`,
    values,
  }
}

export async function categoryCounts({ query, db }) {
  const panel = query.get('panel') ?? ''
  const customerIds = query.has('customerIds') ? query.get('customerIds').split(',').filter(Boolean) : undefined
  const { rows } = await db.query(buildCountsQuery({ panel, customerIds }))
  return { errorOverview: rows }   // [{ category, count }]
}

export async function shipmentErrorList({ body, db }) {
  const { pageNumber = 0, pageSize = 50 } = body ?? {}
  const { rows } = await db.query(buildListQuery(body ?? {}))
  const totalCount = rows[0]?.__total ?? 0
  return { pageNumber, pageSize, totalCount, rows: rows.map(({ __total, ...r }) => r) }
}

// Slice 3: full SellShipmentOut detail — stored verbatim as shipments.detail JSONB.
export function buildDetailQuery(sellShipment) {
  return { text: 'SELECT detail FROM shipments WHERE sell_shipment = $1', values: [sellShipment] }
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
  return detail
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
