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

export async function sellShipmentDetail({ params, db }) {
  const { rows } = await db.query(buildDetailQuery(params[0]))
  if (rows.length === 0) {
    const e = new Error(`No shipment: ${params[0]}`)
    e.status = 404
    throw e
  }
  return rows[0].detail
}
