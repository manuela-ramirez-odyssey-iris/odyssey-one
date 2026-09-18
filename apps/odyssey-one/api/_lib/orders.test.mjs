import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHIP_COLS, buildOrderListQuery, buildTabCountsQuery, buildOrderViewQuery, orderView, buildUpdateOrderStatusQuery, updateOrderStatus, buildUpdateOrderQuery, updateOrder, buildCreateOrderQuery, createOrder, auditReport } from './orders.mjs'

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

// ORD-24 (D1, user ruling 2026-09-05) — tabs are populations, applied BEFORE
// filters as a plain AND. Each predicate exactly.
test('order list: tab population predicates', () => {
  const created = buildOrderListQuery({ tab: 'created' })
  assert.match(created.text, /order_status != 'Draft' AND draft_order_status IS NULL/)
  const draft = buildOrderListQuery({ tab: 'draft' })
  assert.match(draft.text, /WHERE.*order_status = 'Draft'/)
  const ve = buildOrderListQuery({ tab: 'validation-errors' })
  assert.match(ve.text, /draft_order_status IS NOT NULL/)
})

// D1/D3: a filter on a field the tab's population lacks is a plain AND, not a
// special case — Order Status = Planned Load on the Draft tab combines into a
// WHERE that can never be true, i.e. zero rows, no client-side guard needed.
test('order list: a filter outside the tab population ANDs to zero rows', () => {
  const q = buildOrderListQuery({ tab: 'draft', filters: { orderStatuses: ['Planned Load'] } })
  assert.match(q.text, /order_status = 'Draft'/)
  assert.match(q.text, /order_status = ANY/)
})

test('order list: absent/unknown tab restricts nothing', () => {
  const noTab = buildOrderListQuery({})
  assert.doesNotMatch(noTab.text, /draft_order_status IS/)
  const unknown = buildOrderListQuery({ tab: 'bogus' })
  assert.doesNotMatch(unknown.text, /draft_order_status IS/)
})

// Tab counts key rename (D1): all → created, plus the same three predicates
// as FILTER clauses — criteria-aware, no tab restriction of its own.
test('tab counts: three keys, criteria-aware, same predicates as the list', () => {
  const q = buildTabCountsQuery({})
  assert.match(q.text, /count\(\*\) FILTER \(WHERE \(order_status != 'Draft' AND draft_order_status IS NULL\)\)::int AS created/)
  assert.match(q.text, /count\(\*\) FILTER \(WHERE order_status = 'Draft'\)::int AS draft/)
  assert.match(q.text, /count\(\*\) FILTER \(WHERE draft_order_status IS NOT NULL\)::int AS "validationErrors"/)
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

// S113 Task 3 (Fix A): All tab's new default sort — "created" must map to the
// real created_at column, not fall through to the order_number fallback.
test('order list: created field maps to created_at column (All-tab default sort)', () => {
  const { text } = buildOrderListQuery({ sort: { field: 'created', direction: 'desc' } })
  assert.match(text, /ORDER BY created_at DESC/)
})

test('order list: orderNumber remains a valid selectable sort field', () => {
  const { text } = buildOrderListQuery({ sort: { field: 'orderNumber', direction: 'asc' } })
  assert.match(text, /ORDER BY order_number ASC/)
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

// Audit Trail (LINX-8091/9128, ORD-27, S147) — Neon row through the same pure
// derive (src/data/auditTrail.js) the mock path uses. Fake row copied from a
// real seeded 'Planned Shipment' order (src/data/orders.json #91001), flipped
// to MANUAL/created_at-as-Date so both USER and SYSTEM rows show up (header
// edits + lifecycle hops) without relying on the mock's own RNG luck.
const AUDIT_ROW = {
  orderNumber: '0000000091001',
  orderSource: 'MANUAL',
  createdAt: new Date('2026-05-29T04:45:00Z'),
  createdBy: 'ava.planner',
  createdTimeZoneCode: 'MDT',
  grossWeight: { value: 23210, uom: 'lbs' },
  equipment: 'TT',
  freightTerms: 'T',
  consignor: { latestPickupDateTime: '2026-06-08T12:30:00' },
  orderStatus: 'Planned Shipment',
  manualOrder: {
    orderLines: [
      { lineIdentifier: 1, grossWeightValue: 3000, grossWeightUomCode: 'lb' },
      { lineIdentifier: 2, grossWeightValue: 3129, grossWeightUomCode: 'lb' },
    ],
  },
}

test('audit report: route table has the POST audit-report route', async () => {
  const { matchRoute } = await import('./router.mjs')
  const m = matchRoute('POST', '/order-service/v3/audit-report')
  assert.equal(m?.name, 'auditReport')
})

test('audit report: seeded row -> ordered, paged, wire-shaped rows', async () => {
  const db = { query: async () => ({ rows: [AUDIT_ROW] }) }
  const desc = await auditReport({ body: { orderNumber: '0000000091001', pagination: { pageNumber: 1, pageSize: 25 }, sort: { field: 'changeTimestamp', direction: 'desc' } }, db })
  assert.equal(desc.order.orderNumber, '0000000091001')
  assert.equal(desc.pagination.totalCount, desc.data.length)
  assert.equal(desc.data[desc.data.length - 1].changeCategory, 'Order Creation')
  for (const row of desc.data) assert.match(row.changeTimestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
  const userRow = desc.data.find((r) => r.changeMadeBy === 'USER')
  assert.ok(userRow.userEmail && userRow.userName)
  const systemRow = desc.data.find((r) => r.changeMadeBy === 'SYSTEM')
  assert.ok(systemRow.source)

  const asc = await auditReport({ body: { orderNumber: '0000000091001', pagination: { pageNumber: 1, pageSize: 25 }, sort: { field: 'changeTimestamp', direction: 'asc' } }, db })
  assert.equal(asc.data[0].changeCategory, 'Order Creation')
})

test('audit report: no row -> order null, empty page', async () => {
  const db = { query: async () => ({ rows: [] }) }
  const res = await auditReport({ body: { orderNumber: 'nope', pagination: { pageNumber: 1, pageSize: 25 }, sort: { field: 'changeTimestamp', direction: 'asc' } }, db })
  assert.deepEqual(res, { order: null, pagination: { pageNumber: 1, pageSize: 25, totalCount: 0 }, data: [] })
})

test('audit report: 5-row trail pages at pageSize 2 (3 pages) — page 2 returns rows 3-4 of the asc order', async () => {
  const db = { query: async () => ({ rows: [AUDIT_ROW] }) }
  const full = await auditReport({ body: { orderNumber: '0000000091001', pagination: { pageNumber: 1, pageSize: 25 }, sort: { field: 'changeTimestamp', direction: 'asc' } }, db })
  const page2 = await auditReport({ body: { orderNumber: '0000000091001', pagination: { pageNumber: 2, pageSize: 2 }, sort: { field: 'changeTimestamp', direction: 'asc' } }, db })
  assert.deepEqual(page2.data.map((r) => r.auditId), full.data.slice(2, 4).map((r) => r.auditId))
  assert.equal(page2.pagination.totalCount, full.pagination.totalCount)
})

test('update status: builder by number and by pending id', () => {
  const q = buildUpdateOrderStatusQuery('ORD-123', 'Ready for Planning')
  assert.match(q.text, /UPDATE orders SET order_status = \$1 WHERE order_number = \$2/)
  assert.deepEqual(q.values, ['Ready for Planning', 'ORD-123'])
  const p = buildUpdateOrderStatusQuery('pending-42', 'Cancelled')
  assert.match(p.text, /order_number = '' AND order_id = \$2/)
  assert.deepEqual(p.values, ['Cancelled', 42])
})

test('update status: whitelist, missing key, missing row', async () => {
  await assert.rejects(() => updateOrderStatus({ body: { status: 'Ready for Planning' }, db: null }), (e) => e.status === 400)
  await assert.rejects(() => updateOrderStatus({ body: { orderNumber: 'x', status: 'Shipped; DROP TABLE' }, db: null }), (e) => e.status === 400)
  const dbMiss = { query: async () => ({ rows: [] }) }
  await assert.rejects(() => updateOrderStatus({ body: { orderNumber: 'x', status: 'Cancelled' }, db: dbMiss }), (e) => e.status === 404)
  const dbHit = { query: async () => ({ rows: [{ order_number: 'x' }] }) }
  assert.deepEqual(await updateOrderStatus({ body: { orderNumber: 'x', status: 'Ready for Planning' }, db: dbHit }), { success: true })
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

test('create order: DRAFT orderStatusCode -> Draft, anything else -> Ready for Planning', () => {
  const draft = buildCreateOrderQuery({ orderStatus: { orderStatusCode: 'DRAFT' }, orderLines: [] })
  assert.ok(draft.values.includes('Draft'))
  const ready = buildCreateOrderQuery({ orderStatus: { orderStatusCode: 'RD_4_PLNNG' }, orderLines: [] })
  assert.ok(ready.values.includes('Ready for Planning'))
  const absent = buildCreateOrderQuery({ orderLines: [] })
  assert.ok(absent.values.includes('Ready for Planning')) // no orderStatus at all → not a draft
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
  assert.equal(q.values[idx.status], 'Ready for Planning')
})

test('create order: a non-draft order also creates its direct shipment and links it', async () => {
  const created = new Date('2026-09-17T14:00:00Z')
  const calls = []
  const db = {
    query: async (q) => {
      calls.push(q)
      if (/INSERT INTO orders/.test(q.text)) return { rows: [{ order_number: '0000000001234', order_id: 1234, created_at: created, created_tz: null }] }
      if (/FROM customers/.test(q.text)) return { rows: [{ name: 'ERCO Systems Inc' }] }
      return { rows: [] }
    },
  }
  const result = await createOrder({ body: { manualOrder: { customerId: 'ERCO_SYS_01', orderLines: [] } }, db })
  assert.equal(result.success, true)
  assert.equal(result.data.orderNumber, '0000000001234')
  assert.equal(result.data.shipmentMode, 'Ground')
  // additive — the confirmation page ignores these today
  assert.equal(result.data.odysseyShipmentIdentifier, 'O60001234')
  assert.equal(result.data.sellShipment, '26001234')
  const texts = calls.map((c) => c.text)
  assert.match(texts[0], /INSERT INTO orders/)
  assert.match(texts[1], /SELECT name FROM customers WHERE id = \$1/)
  assert.match(texts[2], /INSERT INTO shipments/)
  assert.match(texts[3], /UPDATE orders SET shipment_sell_id/)
  assert.match(texts[4], /INSERT INTO search_index/)
  assert.equal(calls.length, 5)
  assert.equal(calls[2].values[5], 'ERCO Systems Inc') // customer_name on the shipment row
  assert.deepEqual(calls[3].values, ['26001234', '0000000001234'])
})

test('create order: a DRAFT save creates no shipment', async () => {
  const calls = []
  const db = { query: async (q) => { calls.push(q); return { rows: [{ order_number: '0000000001235', order_id: 1235, created_at: new Date(), created_tz: null }] } } }
  const result = await createOrder({ body: { manualOrder: { orderStatus: { orderStatusCode: 'DRAFT' }, orderLines: [] } }, db })
  assert.equal(result.success, true)
  assert.equal(calls.length, 1)
  assert.equal(result.data.odysseyShipmentIdentifier, undefined)
})

test('create order: an unknown customer name falls back to the id, never blocks the create', async () => {
  const calls = []
  const db = {
    query: async (q) => {
      calls.push(q)
      if (/INSERT INTO orders/.test(q.text)) return { rows: [{ order_number: 'ORD-9', order_id: 9, created_at: new Date(), created_tz: null }] }
      return { rows: [] }
    },
  }
  await createOrder({ body: { manualOrder: { customerId: 'ZZZ_01', orderLines: [] } }, db })
  assert.equal(calls[2].values[5], 'ZZZ_01')
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

// Failure paths for statements 2-4 (shipment domain, S150 review). The design's
// safety claim is: a failure anywhere in the shipment sequence leaves the order
// truthful and never partially links it. These pin that claim per statement.
test('create order: a failing shipment INSERT never links the order', async () => {
  const calls = []
  const db = {
    query: async (q) => {
      calls.push(q.text)
      if (/INSERT INTO orders/.test(q.text)) return { rows: [{ order_number: 'ORD-5', order_id: 5, created_at: new Date(), created_tz: null }] }
      if (/FROM customers/.test(q.text)) return { rows: [{ name: 'ERCO Systems Inc' }] }
      if (/INSERT INTO shipments/.test(q.text)) throw Object.assign(new Error('boom'), { code: '08006' })
      return { rows: [] }
    },
  }
  await assert.rejects(() => createOrder({ body: { manualOrder: { customerId: 'ERCO_SYS_01', orderLines: [] } }, db }))
  // the order was created, but nothing claims it belongs to a shipment
  assert.ok(!calls.some((t) => /UPDATE orders SET shipment_sell_id/.test(t)))
  assert.ok(!calls.some((t) => /INSERT INTO search_index/.test(t)))
})

test('create order: a failing link UPDATE leaves the KNOWN orphan — pinned, not fixed', async () => {
  const calls = []
  const db = {
    query: async (q) => {
      calls.push(q.text)
      if (/INSERT INTO orders/.test(q.text)) return { rows: [{ order_number: 'ORD-6', order_id: 6, created_at: new Date(), created_tz: null }] }
      if (/FROM customers/.test(q.text)) return { rows: [{ name: 'ERCO Systems Inc' }] }
      if (/UPDATE orders SET shipment_sell_id/.test(q.text)) throw Object.assign(new Error('boom'), { code: '08006' })
      return { rows: [] }
    },
  }
  await assert.rejects(() => createOrder({ body: { manualOrder: { customerId: 'ERCO_SYS_01', orderLines: [] } }, db }))
  // documents the accepted gap: the shipment row IS committed, unlinked.
  assert.ok(calls.some((t) => /INSERT INTO shipments/.test(t)))
  assert.ok(!calls.some((t) => /INSERT INTO search_index/.test(t)))
})

test('create order: a failing customer lookup never reaches the shipment', async () => {
  const calls = []
  const db = {
    query: async (q) => {
      calls.push(q.text)
      if (/INSERT INTO orders/.test(q.text)) return { rows: [{ order_number: 'ORD-7', order_id: 7, created_at: new Date(), created_tz: null }] }
      if (/FROM customers/.test(q.text)) throw Object.assign(new Error('boom'), { code: '08006' })
      return { rows: [] }
    },
  }
  await assert.rejects(() => createOrder({ body: { manualOrder: { customerId: 'ERCO_SYS_01', orderLines: [] } }, db }))
  assert.ok(!calls.some((t) => /INSERT INTO shipments/.test(t)))
})

// ── Panel filters: Draft + Validation Errors + location triples ─────────────
// (LINX-11663 / LINX-11659 / LINX-10285). These keys are whitelisted in
// ARRAY_FILTERS / DATE_FILTERS / LOCATION_FILTERS — an unlisted key is silently
// ignored, so each one needs a test that proves it reaches the SQL.

test('order list: Draft-tab filters reach the SQL', () => {
  const q = buildOrderListQuery({
    filters: {
      createdBy: ['amy.cook'], lastEditedBy: ['ben.planner'],
      createdDateFrom: '2026-01-01', createdDateTo: '2026-01-31',
      lastEditDateFrom: '2026-02-01', lastEditDateTo: '2026-02-28',
    },
  })
  assert.match(q.text, /created_by = ANY/)
  assert.match(q.text, /last_edited_by = ANY/)
  assert.match(q.text, /created_at >= \$\d+/)
  assert.match(q.text, /created_at < \(\$\d+::date \+ 1\)/)
  assert.match(q.text, /last_edit_at >= \$\d+/)
  assert.match(q.text, /last_edit_at < \(\$\d+::date \+ 1\)/)
})

test('order list: VE-tab draftOrderStatuses is its own column, not order_status', () => {
  const q = buildOrderListQuery({ filters: { draftOrderStatuses: ['Error', 'Purge'] } })
  assert.match(q.text, /draft_order_status = ANY/)
  assert.ok(!/[^_]order_status = ANY/.test(q.text))
})

// The DISPLAYED Errors Count is Level 2 (master data) + Level 1 (structural),
// Ramesh 2026-09-10 — see ERROR_COUNT_TOTAL in orders.mjs and totalErrorCount in
// src/api/mappers/mapOrderListRow.ts. Every place that compares the count must
// compare THIS, not error_count alone: a filter, chip or sort on the raw
// master-data half selects rows displaying a different number (Q-OIF-4, closed
// by migration 010). One regex, so a drift in any of the three shows up here.
const TOTAL = /\(error_count \+ coalesce\(interface_error_count, 0\)\)/

test('order list: error-count comparator, operator whitelisted', () => {
  for (const [op, sym] of [['lt', '<'], ['gt', '>'], ['eq', '=']]) {
    const { text } = buildOrderListQuery({ filters: { errorCountOperator: op, errorCountValue: 3 } })
    assert.match(text, new RegExp(`${TOTAL.source} \\${sym} \\$\\d+`))
    // …and never the master-data half on its own.
    assert.ok(!new RegExp(`[^)] error_count \\${sym}`).test(text))
  }
  // An injected operator, a missing half, and a non-integer are all no-ops.
  for (const filters of [
    { errorCountOperator: '> 0 OR 1=1 --', errorCountValue: 1 },
    { errorCountOperator: 'lt' },
    { errorCountValue: 10 },
    { errorCountOperator: 'lt', errorCountValue: 1.5 },
    // `error_count` also appears in the row projection — assert on the
    // COMPARISON, which only a WHERE clause produces.
  ]) assert.ok(!/error_count [<>=]/.test(buildOrderListQuery({ filters }).text))
})

test('order list: Level 1 (structural) columns are projected — migration 010', () => {
  const { text } = buildOrderListQuery({})
  assert.match(text, /interface_error_count AS "interfaceErrorCount"/)
  assert.match(text, /interface_error_class AS "interfaceErrorClass"/)
})

test('errors-count chip and sort use the same total as the comparator', () => {
  // Chip: "Errors Count: 5" must match the rows whose CELL reads 5.
  assert.match(CHIP_COLS['error-count'].sql, TOTAL)
  const { text } = buildOrderListQuery({
    filters: { searchChips: [{ key: 'error-count', queryValue: '5', exact: true }] },
  })
  assert.match(text, TOTAL)
  // Sort: same expression in ORDER BY.
  assert.match(buildOrderListQuery({ sort: { field: 'errorCount', direction: 'desc' } }).text,
    new RegExp(`ORDER BY ${TOTAL.source} DESC`))
})

test('order list: location triples match row-wise, superseding the mirror arrays', () => {
  const q = buildOrderListQuery({
    filters: {
      originLocations: [
        { city: 'Miami', state: 'Florida', country: 'US' },
        { city: 'Milan', state: 'Lombardy', country: 'Italy' },
      ],
      // The panel sends these too; they must NOT also constrain, or a triple
      // with a blank part would exclude its own row.
      originCities: ['Miami', 'Milan'], originStates: ['Florida', 'Lombardy'], originCountries: ['US', 'Italy'],
    },
  })
  assert.match(q.text, /\(origin_city, origin_state, origin_country\) IN \(\(\$\d+, \$\d+, \$\d+\), \(\$\d+, \$\d+, \$\d+\)\)/)
  assert.ok(!/origin_city = ANY/.test(q.text))
  assert.deepEqual(q.values.slice(0, 6), ['Miami', 'Florida', 'US', 'Milan', 'Lombardy', 'Italy'])
})

test('order list: mirror arrays still apply when no triples are sent', () => {
  const q = buildOrderListQuery({ filters: { originCities: ['Milan'] } })
  assert.match(q.text, /origin_city = ANY/)
})

// ── GlobalSearch free text (S128) ──────────────────────────────────────────
// Mirrors src/search/orders/criteria.js: substring per needle, ORed across the
// free-text columns and ORed across needles (multi-code union), relevance-first
// ordering. The two implementations must agree or the bar means different
// things in mock and live.

test('order list: free text ORs across columns and across needles', () => {
  const q = buildOrderListQuery({ filters: { searchTerms: ['abc', 'def'] } })
  assert.match(q.text, /order_number ILIKE '%' \|\| \$\d+ \|\| '%' OR customer ILIKE '%' \|\| \$\d+ \|\| '%'/)
  // Two needles → two OR-groups, both inside ONE parenthesised clause so the
  // union can't leak across the ANDed filters around it.
  const clause = q.text.match(/\((order_number ILIKE[^)]*)\)/)[1]
  assert.equal((clause.match(/order_number ILIKE/g) || []).length, 2)
  assert.ok(q.values.includes('abc'))
  assert.ok(q.values.includes('def'))
})

test('order list: free text never string-builds the pattern', () => {
  // The % wildcards are SQL literals; the user's text only ever arrives as $N.
  const q = buildOrderListQuery({ filters: { searchTerms: ["%' OR 1=1 --"] } })
  assert.ok(q.values.includes("%' OR 1=1 --"))
  assert.ok(!q.text.includes('OR 1=1'))
})

test('order list: a search is relevance-ordered and overrides the column sort', () => {
  const q = buildOrderListQuery({
    filters: { searchTerms: ['usa'] },
    sort: { field: 'created', direction: 'desc' },
  })
  // exact 3 / starts-with 2 / contains 1, mirroring scoreText.
  assert.match(q.text, /ORDER BY GREATEST\(/)
  assert.match(q.text, /THEN 3/)
  assert.match(q.text, /THEN 2/)
  assert.match(q.text, /THEN 1/)
  // The column sort survives as the tiebreak, not as the primary key.
  assert.match(q.text, /GREATEST\([\s\S]*?\) DESC, created_at DESC NULLS LAST/)
})

test('order list: no search text leaves the column sort untouched', () => {
  const q = buildOrderListQuery({ sort: { field: 'created', direction: 'desc' } })
  assert.match(q.text, /ORDER BY created_at DESC NULLS LAST/)
  assert.ok(!/GREATEST/.test(q.text))
})

test('order list: LIMIT/OFFSET params stay correct with a search term present', () => {
  const q = buildOrderListQuery({
    filters: { searchTerms: ['usa'] },
    pagination: { pageNumber: 3, pageSize: 20 },
  })
  // The relevance param is pushed before limit/offset — the last two values
  // must still be pageSize then offset, or paging silently breaks.
  assert.deepEqual(q.values.slice(-2), [20, 40])
})

// ── Committed bar chips (S130) ─────────────────────────────────────────────
// The flat criteria path: every progression attribute filters the grid, whether
// or not the tab-scoped panel has a field for it.

const chipQuery = (searchChips) =>
  buildOrderListQuery({ pagination: { pageNumber: 1, pageSize: 20 }, filters: { searchChips } })

test('a chip on an attribute with NO panel filter still restricts the query', () => {
  const { text, values } = chipQuery([{ key: 'equipment', queryValue: 'LTR', exact: true }])
  assert.ok(text.includes('upper(equipment) = upper('), 'equipment has no ARRAY_FILTERS entry')
  assert.ok(values.includes('LTR'))
})

test('chips AND with each other and with the panel filters', () => {
  const { text } = buildOrderListQuery({
    pagination: { pageNumber: 1, pageSize: 20 },
    filters: {
      customers: ['WEYERH_01'],
      searchChips: [
        { key: 'hazardous', queryValue: 'Hazmat', exact: true },
        { key: 'order-source', queryValue: 'Manual', exact: true },
      ],
    },
  })
  assert.ok(text.includes('customer = ANY('), 'the panel filter survives')
  assert.ok(text.includes('hazardous IS TRUE'))
  assert.ok(text.includes('upper(order_source) = upper('))
  assert.ok(!text.includes(' OR hazardous'), 'chips AND, never OR')
})

test('a label chip binds the stored CODE, so the label never reaches the column', () => {
  const { text, values } = chipQuery([{ key: 'freight-terms', queryValue: 'Pre-Paid/Add', exact: true }])
  assert.ok(values.includes('A'))
  assert.ok(!values.includes('Pre-Paid/Add'))
  assert.ok(text.includes('upper(freight_terms) = upper('))
})

test('an unknown chip key restricts nothing rather than erroring', () => {
  const { text } = chipQuery([{ key: 'not-an-attr; DROP TABLE orders--', queryValue: 'x' }])
  assert.ok(!text.includes('DROP TABLE'))
  assert.ok(!text.includes('not-an-attr'))
})

test('a date chip becomes a one-day range, not a text compare', () => {
  const { text, values } = chipQuery([{ key: 'latest-pickup', queryValue: '5/29/2026' }])
  assert.ok(text.includes('latest_pickup_ts >='))
  assert.ok(text.includes('latest_pickup_ts <'))
  assert.ok(values.includes('2026-05-29'))
})

test('every chip value is a bound parameter', () => {
  const { text, values } = chipQuery([{ key: 'customer', queryValue: "x'; DROP TABLE orders--" }])
  assert.ok(!text.includes('DROP TABLE'))
  assert.ok(values.some((v) => String(v).includes('DROP TABLE')))
})

test('no chips leaves the query exactly as it was', () => {
  const withEmpty = buildOrderListQuery({ pagination: { pageNumber: 1, pageSize: 20 }, filters: { searchChips: [] } })
  const without = buildOrderListQuery({ pagination: { pageNumber: 1, pageSize: 20 } })
  assert.equal(withEmpty.text, without.text)
})

// S131 (Case 12) — an EXPANDED calendar chip carries from/to days, not a
// queryValue. Before this it fell through the token guard and narrowed nothing:
// the bar showed a date criterion the live grid was not applying.
test('order list: date-range chip filters on its bounds', () => {
  const q = buildOrderListQuery({
    pagination: { pageNumber: 1, pageSize: 10 },
    filters: { searchChips: [{ key: 'latest-pickup', kind: 'date-range', from: '5/29/2026', to: '6/2/2026' }] },
  })
  assert.match(q.text, /latest_pickup_ts >= \$\d+::date AND latest_pickup_ts < \(\$\d+::date \+ 1\)/)
  assert.ok(q.values.includes('2026-05-29') && q.values.includes('2026-06-02'))
})

test('order list: a half-open date-range chip leaves the other side open', () => {
  const q = buildOrderListQuery({
    pagination: { pageNumber: 1, pageSize: 10 },
    filters: { searchChips: [{ key: 'created-date', kind: 'date-range', from: '5/29/2026', to: null }] },
  })
  assert.match(q.text, /created_at >= \$\d+::date/)
  assert.doesNotMatch(q.text, /created_at </)
})

test('order list: a date-range chip with no bounds yet narrows nothing', () => {
  const q = buildOrderListQuery({
    pagination: { pageNumber: 1, pageSize: 10 },
    filters: { searchChips: [{ key: 'latest-pickup', kind: 'date-range', from: null, to: null }] },
  })
  assert.doesNotMatch(q.text, /WHERE/)
})

// S131 — the tab badges run the LIST's own predicate. They used to count the
// customer scope alone, so a filtered grid sat under badges showing the
// unfiltered totals ("tabs badge counters are not updating in orders").
test('tab counts: criteria narrow every badge, via the list predicate', () => {
  const q = buildTabCountsQuery({
    customerIds: ['VALTRIS_01'],
    filters: {
      customers: ['VALTRIS_01'],
      searchChips: [{ key: 'customer', queryValue: 'VALTRIS' }],
      latestPickupDateFrom: '2026-06-20',
    },
  })
  assert.match(q.text, /customer = ANY/)          // panel param
  assert.match(q.text, /customer ILIKE/)          // bar chip
  assert.match(q.text, /latest_pickup_ts >=/)     // date range
  assert.match(q.text, /count\(\*\) FILTER \(WHERE order_status = 'Draft'\)/)
})

test('tab counts: scope-only still counts everything in scope', () => {
  const q = buildTabCountsQuery({ customerIds: ['VALTRIS_01'] })
  assert.match(q.text, /WHERE customer = ANY\(\$1\)/)
  assert.deepEqual(q.values, [['VALTRIS_01']])
})

test('tab counts: an empty scope is honestly zero', () => {
  const q = buildTabCountsQuery({ customerIds: [] })
  assert.match(q.text, /WHERE FALSE/)
})
