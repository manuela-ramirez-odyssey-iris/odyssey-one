import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOrderListQuery, buildTabCountsQuery, buildOrderViewQuery, orderView, buildUpdateOrderStatusQuery, updateOrderStatus, buildUpdateOrderQuery, updateOrder, buildCreateOrderQuery, createOrder } from './orders.mjs'

test('order list: 1-based pagination (page 1 = offset 0)', () => {
  const q = buildOrderListQuery({ pagination: { pageNumber: 1, pageSize: 20 } })
  assert.ok(q.values.includes(0))
  const q3 = buildOrderListQuery({ pagination: { pageNumber: 3, pageSize: 20 } })
  assert.ok(q3.values.includes(40))
})

test('order list: status + customer + origin filters', () => {
  const q = buildOrderListQuery({
    pagination: { pageNumber: 1, pageSize: 10 },
    filters: { customers: ['VALTRIS_01'], orderStatuses: ['Draft'], originCities: ['Phoenix'] },
  })
  assert.match(q.text, /customer = ANY/)
  assert.match(q.text, /order_status = ANY/)
  assert.match(q.text, /origin_city = ANY/)
})

test('tab counts: single grouped query, scoped', () => {
  const q = buildTabCountsQuery({ customerIds: ['VALTRIS_01'] })
  assert.match(q.text, /count\(\*\)/i)
  assert.deepEqual(q.values, [['VALTRIS_01']])
})

test('order list: date range filters (inclusive upper bound)', () => {
  const q = buildOrderListQuery({
    filters: { earliestPickupDateFrom: '2026-04-01', earliestPickupDateTo: '2026-04-30' },
  })
  assert.match(q.text, /earliest_pickup_ts >= \$\d+/)
  assert.match(q.text, /earliest_pickup_ts < \(\$\d+::date \+ 1\)/)
})

test('order list: unknown sort field falls back to order_number', () => {
  const q = buildOrderListQuery({ sort: { field: 'DROP TABLE', direction: 'asc' } })
  assert.match(q.text, /ORDER BY order_number/)
})

test('honest-empty: empty scope/filter yields FALSE, no values', () => {
  const counts = buildTabCountsQuery({ customerIds: [] })
  assert.match(counts.text, /WHERE FALSE/)
  assert.deepEqual(counts.values, [])
  const list = buildOrderListQuery({ filters: { customers: [] } })
  assert.match(list.text, /FALSE/)
})

test('order list sorts by new whitelisted fields', () => {
  const { text } = buildOrderListQuery({ sort: { field: 'lastEdit', direction: 'desc' } })
  assert.match(text, /ORDER BY last_edit_at DESC/)
})

test('unknown sort field falls back to order_number', () => {
  const { text } = buildOrderListQuery({ sort: { field: 'evil; DROP TABLE', direction: 'asc' } })
  assert.match(text, /ORDER BY order_number ASC/)
})

test('row projection includes per-tab fields', () => {
  const { text } = buildOrderListQuery({})
  assert.match(text, /"draftOrderStatus"/)
  assert.match(text, /"errorCount"/)
})

test('order view: by number, by pending id, missing key', async () => {
  const byNum = buildOrderViewQuery('ORD-123')
  assert.match(byNum.text, /order_number = \$1/)
  assert.deepEqual(byNum.values, ['ORD-123'])
  const byPending = buildOrderViewQuery('pending-42')
  assert.match(byPending.text, /order_number = '' AND order_id = \$1/)
  assert.deepEqual(byPending.values, [42])
  await assert.rejects(() => orderView({ body: {}, db: null }), (e) => e.status === 400)
  const dbMiss = { query: async () => ({ rows: [] }) }
  await assert.rejects(() => orderView({ body: { orderNumber: 'x' }, db: dbMiss }), (e) => e.status === 404)
  const dbHit = { query: async () => ({ rows: [{ orderNumber: 'x', manualOrder: null }] }) }
  assert.deepEqual(await orderView({ body: { orderNumber: 'x' }, db: dbHit }), { row: { orderNumber: 'x' }, manualOrder: null })
})

test('update status: builder by number and by pending id', () => {
  const q = buildUpdateOrderStatusQuery('ORD-123', 'Ready For Plan')
  assert.match(q.text, /UPDATE orders SET order_status = \$1 WHERE order_number = \$2/)
  assert.deepEqual(q.values, ['Ready For Plan', 'ORD-123'])
  const p = buildUpdateOrderStatusQuery('pending-42', 'Cancelled')
  assert.match(p.text, /order_number = '' AND order_id = \$2/)
  assert.deepEqual(p.values, ['Cancelled', 42])
})

test('update status: whitelist, missing key, missing row', async () => {
  await assert.rejects(() => updateOrderStatus({ body: { status: 'Ready For Plan' }, db: null }), (e) => e.status === 400)
  await assert.rejects(() => updateOrderStatus({ body: { orderNumber: 'x', status: 'Shipped; DROP TABLE' }, db: null }), (e) => e.status === 400)
  const dbMiss = { query: async () => ({ rows: [] }) }
  await assert.rejects(() => updateOrderStatus({ body: { orderNumber: 'x', status: 'Cancelled' }, db: dbMiss }), (e) => e.status === 404)
  const dbHit = { query: async () => ({ rows: [{ order_number: 'x' }] }) }
  assert.deepEqual(await updateOrderStatus({ body: { orderNumber: 'x', status: 'Ready For Plan' }, db: dbHit }), { success: true })
})

test('update order: manual_order stored whole, grid projection re-derived', () => {
  const mo = {
    orderNumber: 'ORD-123', customerId: 'ACME_LOG_01',
    shipDirectionCode: 'O', freightTermCode: 'P',
    orderCarrierEquipDetailList: [{ equipmentCode: 'VAN' }],
    originCity: 'Houston', originRegion: 'TX', originCountry: 'US',
    destinationCity: 'Bastrop', destinationRegion: 'LA', destinationCountry: 'US',
    requestedPickupDate: '2026-06-10T08:00:00', pickupAppointment: '',
    grossWeightValue: 4300, grossWeightUomCode: 'lbs',
    orderLines: [{ productDescription: 'Plastic', hazardous: true }],
  }
  const q = buildUpdateOrderQuery('ORD-123', mo)
  assert.match(q.text, /UPDATE orders SET/)
  assert.match(q.text, /last_edit_at = now\(\)/)
  // identity columns are never written (order_number appears only in WHERE)
  const setClause = q.text.split('WHERE')[0]
  assert.doesNotMatch(setClause, /order_number =/)
  assert.doesNotMatch(setClause, /\bcustomer =/)
  assert.equal(JSON.parse(q.values[0]).customerId, 'ACME_LOG_01') // manual_order whole
  assert.equal(q.values[3], 'VAN')                                 // equipment
  assert.equal(JSON.parse(q.values[4]).city, 'Houston')            // consignor jsonb
  assert.equal(q.values[8], 'Plastic')                             // commodity
  assert.equal(q.values[9], true)                                  // hazardous derived from lines
  assert.equal(q.values[q.values.length - 2], 'ORD-123')           // WHERE key
  assert.equal(q.values[q.values.length - 1], null)                // no userId passed → NULL param
  // blank timestamps must land as NULL, not an invalid cast
  assert.match(q.text, /NULLIF\(\$18,''\)::timestamptz/)
})

test('update order: userId stamps last_edited_by via the users subquery when present (R2-4)', () => {
  const mo = { orderNumber: 'ORD-123', orderLines: [] }
  const withUser = buildUpdateOrderQuery('ORD-123', mo, 'u1')
  assert.match(withUser.text, /last_edited_by = \(SELECT username FROM users WHERE id = \$22\)/)
  assert.match(withUser.text, /last_edit_tz = created_tz/)
  assert.equal(withUser.values.length, 22) // guards $22 against a mid-list param renumbering
  assert.equal(withUser.values[withUser.values.length - 1], 'u1')

  const noUser = buildUpdateOrderQuery('ORD-123', mo)
  assert.equal(noUser.values[noUser.values.length - 1], null) // absent/unresolvable userId → honest NULL, not a stale name
})

test('update order: missing key / missing body / missing row', async () => {
  await assert.rejects(() => updateOrder({ body: { manualOrder: {} }, db: null }), (e) => e.status === 400)
  await assert.rejects(() => updateOrder({ body: { orderNumber: 'x' }, db: null }), (e) => e.status === 400)
  const dbMiss = { query: async () => ({ rows: [] }) }
  await assert.rejects(() => updateOrder({ body: { orderNumber: 'x', manualOrder: {} }, db: dbMiss }), (e) => e.status === 404)
  const dbHit = { query: async () => ({ rows: [{ order_number: 'x' }] }) }
  assert.deepEqual(await updateOrder({ body: { orderNumber: 'x', manualOrder: {} }, db: dbHit }), { success: true, orderNumber: 'x' })
})

// ── Order creation (R2-5) ───────────────────────────────────────────────────
// POST /order-service/v3/manual-order — the SAME path saveDraft posts to with
// orderStatusCode 'DRAFT' (orderService.ts createOrder ~:271, saveDraft ~:331;
// mapFormToOrderInterface.ts:132-134). ConfirmationView.jsx:47 early-returns
// without data.orderNumber, so the server must assign + return the number
// synchronously — never deferred to a later async fill-in.

test('create order: mints the new row id via the serial sequence, pads a blank number to 13 digits', () => {
  const q = buildCreateOrderQuery({ orderLines: [] })
  assert.match(q.text, /nextval\(pg_get_serial_sequence\('orders','id'\)\)/)
  assert.match(q.text, /COALESCE\(NULLIF\(\$1,''\), lpad\(id::text, 13, '0'\)\)/)
  assert.equal(q.values[0], '') // blank orderNumber → SQL-side COALESCE/lpad fills it in, never JS-side
})

test('create order: a user-supplied order number is stored as-is (no lpad substitution)', () => {
  const q = buildCreateOrderQuery({ orderNumber: 'ORD-777', orderLines: [] })
  assert.equal(q.values[0], 'ORD-777')
})

test('create order: DRAFT orderStatusCode -> Draft, anything else -> Ready For Plan', () => {
  const draft = buildCreateOrderQuery({ orderStatus: { orderStatusCode: 'DRAFT' }, orderLines: [] })
  assert.ok(draft.values.includes('Draft'))
  const ready = buildCreateOrderQuery({ orderStatus: { orderStatusCode: 'RD_4_PLNNG' }, orderLines: [] })
  assert.ok(ready.values.includes('Ready For Plan'))
  const absent = buildCreateOrderQuery({ orderLines: [] })
  assert.ok(absent.values.includes('Ready For Plan')) // no orderStatus at all → not a draft
})

test('create order: identity columns written once — created_at/created_by/created_tz, honest NULL', () => {
  const withUser = buildCreateOrderQuery({ orderLines: [] }, 'u1')
  assert.match(withUser.text, /created_at, created_by, created_tz/)
  assert.match(withUser.text, /now\(\), \(SELECT username FROM users WHERE id = \$24\), \$25/)
  assert.equal(withUser.values.length, 25) // guards $24/$25 against a mid-list param renumbering
  assert.equal(withUser.values[23], 'u1')   // created_by resolves via users subquery
  assert.equal(withUser.values[24], null)   // created_tz: no top-level order tz field on the wire (honest NULL)

  const noUser = buildCreateOrderQuery({ orderLines: [] })
  assert.equal(noUser.values[23], null) // absent userId -> honest NULL, no fallback identity
})

test('create order: manual_order stores the wire payload whole, grid projection re-derived (mirrors update)', () => {
  const mo = {
    customerId: 'ACME_LOG_01',
    shipDirectionCode: 'O', freightTermCode: 'P',
    orderCarrierEquipDetailList: [{ equipmentCode: 'VAN' }],
    originCity: 'Houston', originRegion: 'TX', originCountry: 'US',
    destinationCity: 'Bastrop', destinationRegion: 'LA', destinationCountry: 'US',
    grossWeightValue: 4300, grossWeightUomCode: 'lbs',
    orderLines: [{ productDescription: 'Plastic', hazardous: true }],
  }
  const q = buildCreateOrderQuery(mo)
  assert.equal(JSON.parse(q.values[12]).customerId, 'ACME_LOG_01') // manual_order whole ($13, 0-based 12)
  assert.equal(q.values[4], 'VAN')                                  // equipment
  assert.equal(JSON.parse(q.values[5]).city, 'Houston')             // consignor jsonb
  assert.equal(q.values[9], 'Plastic')                              // commodity
  assert.equal(q.values[10], true)                                  // hazardous derived from lines
})

test('create order: NOT NULL columns satisfied — consignor/consignee/order_status always present', () => {
  const q = buildCreateOrderQuery({})
  const idx = { consignor: 5, consignee: 6, status: 11 }
  assert.equal(JSON.parse(q.values[idx.consignor]).country, 'US') // default fallback, not just truthy
  assert.equal(JSON.parse(q.values[idx.consignee]).country, 'US')
  assert.equal(q.values[idx.status], 'Ready For Plan')
})

test('create order: handler assembles the exact mock response shape', async () => {
  const created = new Date('2026-08-02T12:00:00.000Z')
  const db = {
    query: async () => ({ rows: [{ order_number: '0000000001234', order_id: 1234, created_at: created, created_tz: null }] }),
  }
  const result = await createOrder({ body: { manualOrder: { orderLines: [] } }, db })
  assert.deepEqual(result, {
    orderId: 1234,
    success: true,
    message: 'Order 0000000001234 created successfully',
    data: {
      orderNumber: '0000000001234',
      orderDate: created.toISOString(),
      orderDateTimeZoneCode: 'EST',
      shipmentMode: 'Ground',
    },
  })
})

test('create order: missing manualOrder -> 400', async () => {
  await assert.rejects(() => createOrder({ body: {}, db: null }), (e) => e.status === 400)
})

test('create order: duplicate user-supplied order number -> honest 409, not a 500', async () => {
  const db = { query: async () => { const e = new Error('dup'); e.code = '23505'; throw e } }
  await assert.rejects(
    () => createOrder({ body: { manualOrder: { orderNumber: 'ORD-777', orderLines: [] } }, db }),
    (e) => e.status === 409,
  )
})

test('create order: unknown/absent customerId (FK violation) -> honest 400, not a 500', async () => {
  const db = { query: async () => { const e = new Error('fk'); e.code = '23503'; throw e } }
  await assert.rejects(
    () => createOrder({ body: { manualOrder: { customerId: 'NOT_A_CUSTOMER', orderLines: [] } }, db }),
    (e) => e.status === 400,
  )
})
