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
  last_edit_at AS "lastEditAt", draft_order_status AS "draftOrderStatus", error_count AS "errorCount"`

// Sortable columns. Keys are OrderListRow/OrderRowVM field names — values are
// whitelisted SQL (column names or expressions), never user input, so they're
// safe to interpolate directly into ORDER BY (see buildOrderListQuery).
const SORT_MAP = {
  orderNumber: 'order_number', customer: 'customer', orderStatus: 'order_status',
  commodity: 'commodity', equipment: 'equipment',
  orderSource: 'order_source', shipDirection: 'ship_direction', freightTerms: 'freight_terms',
  hazardous: 'hazardous', latestPickup: 'latest_pickup_ts', latestDelivery: 'latest_delivery_ts',
  weight: `(gross_weight->>'value')::numeric`, volume: `(volume->>'value')::numeric`,
  created: 'created_at', createdBy: 'created_by', lastEdit: 'last_edit_at',
  draftOrderStatus: 'draft_order_status', errorCount: 'error_count',
  shipperLocation: 'origin_city', destinationLocation: 'dest_city',
}

// Array-of-string filters (OrderListRequest.filters): key → column, matched with = ANY.
const ARRAY_FILTERS = [
  ['customers', 'customer'], ['orderNumbers', 'order_number'], ['orderStatuses', 'order_status'],
  ['originCities', 'origin_city'], ['originStates', 'origin_state'], ['originCountries', 'origin_country'],
  ['destinationCities', 'dest_city'], ['destinationStates', 'dest_state'], ['destinationCountries', 'dest_country'],
]
// Date-range bounds: key → column, comparison. To-bounds are date-inclusive (< next day).
const DATE_FILTERS = [
  ['earliestPickupDateFrom', 'earliest_pickup_ts', '>='], ['earliestPickupDateTo', 'earliest_pickup_ts', '<'],
  ['latestPickupDateFrom', 'latest_pickup_ts', '>='], ['latestPickupDateTo', 'latest_pickup_ts', '<'],
  ['earliestDeliveryDateFrom', 'earliest_delivery_ts', '>='], ['earliestDeliveryDateTo', 'earliest_delivery_ts', '<'],
  ['latestDeliveryDateFrom', 'latest_delivery_ts', '>='], ['latestDeliveryDateTo', 'latest_delivery_ts', '<'],
]

export function buildOrderListQuery({ pagination = {}, filters = {}, sort } = {}) {
  const values = []
  const where = []
  const add = (clause, v) => { values.push(v); where.push(clause.replace('?', `$${values.length}`)) }

  for (const [key, col] of ARRAY_FILTERS) {
    const v = filters[key]
    if (v === undefined) continue
    if (v.length === 0) { where.push('FALSE'); continue }   // honest empty (S79c decision 10)
    add(`${col} = ANY(?)`, v)
  }
  for (const [key, col, op] of DATE_FILTERS) {
    if (!filters[key]) continue
    add(op === '<' ? `${col} < (?::date + 1)` : `${col} >= ?`, filters[key])
  }

  const pageNumber = pagination.pageNumber ?? 1        // 1-based per LLD (Q29)
  const pageSize = pagination.pageSize ?? 50
  const sortCol = SORT_MAP[sort?.field] ?? 'order_number'
  const dir = sort?.direction === 'desc' ? 'DESC' : 'ASC'
  values.push(pageSize); const limitP = values.length
  values.push((pageNumber - 1) * pageSize); const offsetP = values.length

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return {
    text: `SELECT ${ROW_COLUMNS}, count(*) OVER()::int AS "__total"
           FROM orders ${whereSql}
           ORDER BY ${sortCol} ${dir} NULLS LAST
           LIMIT $${limitP} OFFSET $${offsetP}`,
    values,
  }
}

// PG array literal for the validation-error statuses. Constant module data (no
// user input), so it's interpolated, not parameterized — this keeps values ===
// [customerIds] for the scope-only contract. Elements are double-quoted because
// they contain spaces ('{"Planning Failed","Shipment Failed"}').
const VALIDATION_ERROR_ARRAY_LITERAL = `{${VALIDATION_ERROR_STATUSES.map((s) => `"${s}"`).join(',')}}`

export function buildTabCountsQuery({ customerIds } = {}) {
  const values = []
  let scopeSql = ''
  if (customerIds !== undefined) {
    if (customerIds.length === 0) scopeSql = 'WHERE FALSE'   // honest empty (S79c decision 10)
    else { values.push(customerIds); scopeSql = `WHERE customer = ANY($${values.length})` }
  }
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

export async function orderTabCounts({ query, db }) {
  const customerIds = query.has('customers') ? query.get('customers').split(',').filter(Boolean) : undefined
  const { rows: [counts] } = await db.query(buildTabCountsQuery({ customerIds }))
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
