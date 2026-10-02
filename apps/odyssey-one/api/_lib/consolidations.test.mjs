// apps/odyssey-one/api/_lib/consolidations.test.mjs — fake-db handler tests
// (same pattern as orders.test.mjs's createOrder suite). No Neon is touched.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyConsolidation, buildSourceRowsQuery } from './consolidations.mjs'
import { matchRoute } from './router.mjs'

const dbRow = (n, over = {}) => ({
  odysseyShipmentIdentifier: `O6000000${n}`, sellShipment: `2600000${n}`, buyShipment: `90000000${n}`,
  orders: [`ORD-${n}`], pickupNumbers: [], poNumbers: [], pro: null,
  shipmentType: 'Direct', planningType: 'SSD',
  customerId: 'ERCO_SYS_01', customerName: 'ERCO Systems Inc',
  consignor: `CONSIGNOR-${n}`, consignee: `CONSIGNEE-${n}`,
  origin: 'Houston TX US 77001', destination: 'San Antonio TX US 78201',
  pickupDate: `06/1${n}/2026 08:00 CST`, deliveryDate: `06/2${n}/2026 12:00 CST`,
  mode: 'LTL', equipmentCode: 'VAN', scac: null, tenderStatus: '', shipmentStatus: '',
  panel: 'monitoring', category: 'consolidation', validationMessage: null,
  grossWeight: '4300', loadCount: '1', orderCount: '1', apFreightCost: '',
  legType: null, shipmentSequenceLeg: null, nextShipmentId: null,
  load: String(n),
  detail: detailOf(n),
  ...over,
})

const detailOf = (n) => ({
  orderList: [{ orderNumber: `ORD-${n}`, grossWeightValue: 4300, orderLines: [{}], pickupNumber: `PU-${n}` }],
  shipmentStopList: [
    { stopSequence: 1, stopType: 'pickup', facilityName: `P${n}`, city: `P${n}`, region: 'TX', postal: '77001', orderIds: [`ORD-${n}`] },
    { stopSequence: 2, stopType: 'delivery', facilityName: `D${n}`, city: `D${n}`, region: 'TX', postal: '78201', orderIds: [`ORD-${n}`] },
  ],
})

// The editor's DTO for sources n…: pickups, then deliveries.
const stopsFor = (...ns) => [
  ...ns.map((n) => ({ stopType: 'pickup', orderIds: [`ORD-${n}`], sourceSellShipment: `2600000${n}`, sourceStopSequence: 1, scheduledDateTime: 'June 11, 2026 08:00 CST' })),
  ...ns.map((n) => ({ stopType: 'delivery', orderIds: [`ORD-${n}`], sourceSellShipment: `2600000${n}`, sourceStopSequence: 2, scheduledDateTime: 'June 22, 2026 12:00 CST' })),
].map((st, i) => ({ ...st, stopSequence: i + 1 }))
const body = (...ns) => ({ sellShipments: ns.map((n) => `2600000${n}`), stops: stopsFor(...ns), externalOrders: [], tenderList: [] })

// Records every statement, tagged with who issued it: the pool (`db`, reads) or
// the checked-out client (`client`, the transaction). Answers the SELECTs the
// handler makes. Anchored on SELECT so a DELETE/UPDATE ... = ANY never matches.
function fakeDb(sourceRows, { seq = 3, external = [], orderIds = [] } = {}) {
  const calls = []
  const answer = (q) => {
    if (/activeTender/.test(q.text)) return { rows: external }   // pullExternalOrders' source read
    if (/^\s*SELECT[\s\S]*FROM orders WHERE order_number = ANY/.test(q.text)) return { rows: orderIds }
    if (/^\s*SELECT[\s\S]*FROM shipments WHERE sell_shipment = ANY/.test(q.text)) return { rows: sourceRows }
    if (/count\(\*\)/.test(q.text)) return { rows: [{ n: seq }] }
    if (/^\s*SELECT[\s\S]*FROM shipments WHERE sell_shipment = \$1/.test(q.text)) {
      return { rows: [{ sellShipment: q.values[0], odysseyShipmentIdentifier: 'C70000004' }] }
    }
    return { rows: [] }
  }
  const via = (who) => async (q) => {
    const n = typeof q === 'string' ? { text: q, values: [] } : q
    calls.push({ ...n, via: who })
    return answer(n)
  }
  const db = {
    query: via('db'),
    // Writes run on a checked-out client (BEGIN/COMMIT), like save-stops.
    connect: async () => ({ query: via('client'), release() {} }),
  }
  return { calls, db }
}
// Every write must have gone through the transaction's client, none via the pool.
const assertWritesOnClient = (calls) =>
  assert.deepEqual(calls.filter((c) => /INSERT|DELETE|UPDATE/.test(c.text) && c.via !== 'client').map((c) => c.text), [])
const texts = (calls) => calls.map((c) => c.text)

test('the route is registered where the client posts', () => {
  const r = matchRoute('POST', '/shipment-service/v1/consolidation')
  assert.equal(r?.name, 'applyConsolidation')
})

test('the source SELECT asks for load on top of the grid projection', () => {
  const q = buildSourceRowsQuery(['1', '2'])
  assert.match(q.text, /odyssey_shipment_id AS "odysseyShipmentIdentifier"/)
  assert.match(q.text, /, load, detail FROM shipments/)
  assert.deepEqual(q.values, [['1', '2']])
})

test('no ids, duplicates, or no stops are 400s that never touch the db', async () => {
  const { db, calls } = fakeDb([])
  await assert.rejects(() => applyConsolidation({ body: { sellShipments: [] }, db }), { status: 400 })
  await assert.rejects(() => applyConsolidation({ body: {}, db }), { status: 400 })
  await assert.rejects(
    () => applyConsolidation({ body: { ...body(1), sellShipments: ['26000001', '26000001'] }, db }), { status: 400 })
  await assert.rejects(() => applyConsolidation({ body: { sellShipments: ['26000001', '26000002'] }, db }), /stops array required/)
  assert.equal(calls.length, 0)
})

test('a missing shipment is a 400 naming it, and nothing is written', async () => {
  const { db, calls } = fakeDb([dbRow(1)])
  await assert.rejects(
    () => applyConsolidation({ body: body(1, 2), db }),
    (e) => e.status === 400 && /26000002/.test(e.message),
  )
  assert.ok(!texts(calls).some((t) => /INSERT|DELETE|UPDATE/.test(t)))
})

test('two customers is a 400 — the lock is re-checked server-side (CNS-10)', async () => {
  const rows = [dbRow(1), dbRow(2, { customerId: 'VALTRIS_01' })]
  const { db, calls } = fakeDb(rows)
  await assert.rejects(
    () => applyConsolidation({ body: body(1, 2), db }),
    (e) => e.status === 400 && /cannot span customers/.test(e.message),
  )
  assert.ok(!texts(calls).some((t) => /INSERT INTO shipments/.test(t)))
})

test('happy path: statements in the order that keeps the sources readable until the new row exists', async () => {
  const { db, calls } = fakeDb([dbRow(1), dbRow(2)], { seq: 3 })
  const res = await applyConsolidation({ body: body(1, 2), db })
  assertWritesOnClient(calls)
  const t = texts(calls)
  const at = (re) => t.findIndex((x) => re.test(x))
  assert.ok(at(/DELETE FROM search_index/) < at(/INSERT INTO shipments/))
  assert.ok(at(/INSERT INTO shipments/) < at(/UPDATE orders SET shipment_sell_id/))
  assert.ok(at(/UPDATE orders SET shipment_sell_id/) < at(/UPDATE shipments SET orders = '\{\}'/))
  assert.ok(at(/UPDATE shipments SET orders = '\{\}'/) < at(/INSERT INTO search_index/))
  // seq 3 + 1 → C70000004 / sell 27000004
  const insert = calls.find((c) => /INSERT INTO shipments/.test(c.text))
  assert.equal(insert.values[0], '27000004')
  // S164 §2 / CNS-21: the sources are soft-deleted (emptied + dormancy event), never DELETEd
  assert.ok(!calls.some((c) => /DELETE FROM shipments/.test(c.text)))
  const shells = calls.filter((c) => /UPDATE shipments SET orders = '\{\}'/.test(c.text))
  assert.deepEqual(shells.map((c) => c.values[0]), ['26000001', '26000002'])
  assert.match(shells[0].text, /order_count = '0'/)
  assert.match(shells[0].text, /jsonb_set\(detail, '\{historyList\}'/)
  const ev = JSON.parse(shells[0].values[1])[0]
  assert.equal(ev.action, 'Consolidation Completed')
  assert.equal(ev.details, 'Orders ORD-1 moved to consolidated shipment C70000004. This shipment is no longer active.')
  // the C links to each hidden source (detail.lineage)
  const lineage = inserted(calls).lineage
  assert.deepEqual(lineage.sources.map((n) => [n.sellShipment, n.hidden, n.orders]), [['26000001', true, ['ORD-1']], ['26000002', true, ['ORD-2']]])
  // orders repoint by ORDER NUMBER (the union), not by the old shipment ids
  const upd = calls.find((c) => /UPDATE orders SET shipment_sell_id/.test(c.text))
  assert.deepEqual(upd.values, ['27000004', ['ORD-1', 'ORD-2']])
  // the response row comes from the list projection, not the builder
  assert.deepEqual(res, {
    success: true,
    data: { row: { sellShipment: '27000004', odysseyShipmentIdentifier: 'C70000004' }, detail: res.data.detail },
  })
  assert.equal(res.data.detail.odysseyShipmentIdentifier, 'C70000004')
})

test('request order, not row order, drives the anchor and the stop sequence', async () => {
  // the db answers in the reverse of the requested order
  const { db, calls } = fakeDb([dbRow(2, { customerName: 'B' }), dbRow(1, { customerName: 'A' })])
  await applyConsolidation({ body: body(1, 2), db })
  const insert = calls.find((c) => /INSERT INTO shipments/.test(c.text))
  assert.ok(insert.values.includes('A')) // anchor = the FIRST requested id's customer
})

test('re-applying onto an existing consolidation frees and drops the old C row before the INSERT', async () => {
  const existing = dbRow(9, {
    shipmentType: 'Consolidation', odysseyShipmentIdentifier: 'C70000004',
    sellShipment: '27000004', buyShipment: '910000004', detail: detailOf(1),
  })
  const { db, calls } = fakeDb([existing, dbRow(2)], { seq: 99 })
  await applyConsolidation({ body: { ...body(1, 2), sellShipments: ['27000004', '26000002'], stops: stopsFor(1, 2).map((st) => ({ ...st, sourceSellShipment: st.orderIds[0] === 'ORD-1' ? '27000004' : '26000002' })) }, db })
  const t = texts(calls)
  const at = (re) => t.findIndex((x) => re.test(x))
  assert.ok(at(/UPDATE orders SET shipment_sell_id = NULL/) < at(/DELETE FROM shipments WHERE sell_shipment = \$1/))
  assert.ok(at(/DELETE FROM shipments WHERE sell_shipment = \$1/) < at(/INSERT INTO shipments/))
  // the id is REUSED, so only the OTHER source is emptied at the end
  const insert = calls.find((c) => /INSERT INTO shipments/.test(c.text))
  assert.equal(insert.values[0], '27000004')
  const shells = calls.filter((c) => /UPDATE shipments SET orders = '\{\}'/.test(c.text))
  assert.deepEqual(shells.map((c) => c.values[0]), ['26000002'])
  // the reused C is the result, not a node: only the other source is linked
  assert.deepEqual(inserted(calls).lineage.sources.map((n) => n.sellShipment), ['26000002'])
})

test('a failing shipment INSERT never repoints the orders', async () => {
  const calls = []
  const db = {
    connect: async () => ({ query: (q) => db.query(q), release() {} }),
    query: async (q) => {
      calls.push(q.text)
      if (/^\s*SELECT[\s\S]*FROM shipments WHERE sell_shipment = ANY/.test(q.text)) return { rows: [dbRow(1), dbRow(2)] }
      if (/count\(\*\)/.test(q.text)) return { rows: [{ n: 0 }] }
      if (/INSERT INTO shipments/.test(q.text)) throw Object.assign(new Error('boom'), { code: '08006' })
      return { rows: [] }
    },
  }
  await assert.rejects(() => applyConsolidation({ body: body(1, 2), db }))
  assert.ok(!calls.some((t) => /UPDATE orders SET shipment_sell_id = \$1/.test(t)))
  assert.ok(!calls.some((t) => /DELETE FROM shipments WHERE sell_shipment = ANY/.test(t)))
})

// ── S7.2 guards: all 400, nothing written ──────────────────────────────────
const noWrites = (calls) => assert.ok(!texts(calls).some((t) => /INSERT|DELETE|UPDATE/.test(t)))

test('guard: a source outside the Consolidation pool → 400 with the exact message', async () => {
  const { db, calls } = fakeDb([dbRow(1), dbRow(2, { category: 'hold' })])
  await assert.rejects(() => applyConsolidation({ body: body(1, 2), db }),
    (e) => e.status === 400 && e.message === 'Only shipments in Consolidation can be consolidated: 26000002')
  noWrites(calls)
})

test('guard: fewer than two orders on the DTO stops → 400 (CNS-14)', async () => {
  const { db, calls } = fakeDb([dbRow(1), dbRow(2)])
  await assert.rejects(() => applyConsolidation({ body: { ...body(1, 2), stops: stopsFor(1) }, db }),
    (e) => e.status === 400 && e.message === 'A consolidation needs at least two orders.')
  noWrites(calls)
})

test('guard: a delivery above its pickup → 400', async () => {
  const { db, calls } = fakeDb([dbRow(1), dbRow(2)])
  const reversed = stopsFor(1, 2).map((st, i, a) => ({ ...st, stopSequence: a.length - i }))
  await assert.rejects(() => applyConsolidation({ body: { ...body(1, 2), stops: reversed }, db }),
    (e) => e.status === 400 && e.message === 'Stops are out of order.')
  noWrites(calls)
})

// ── S7.3–S7.7 ──────────────────────────────────────────────────────────────
const inserted = (calls) => JSON.parse(calls.find((c) => /INSERT INTO shipments/.test(c.text)).values[30])

test('stops are built from a 2-source DTO with a merged pickup', async () => {
  const { db, calls } = fakeDb([dbRow(1), dbRow(2)])
  const stops = [
    { stopSequence: 1, stopType: 'pickup', orderIds: ['ORD-1', 'ORD-2'], sourceSellShipment: '26000001', sourceStopSequence: 1 },
    { stopSequence: 2, stopType: 'delivery', orderIds: ['ORD-2'], sourceSellShipment: '26000002', sourceStopSequence: 2 },
    { stopSequence: 3, stopType: 'delivery', orderIds: ['ORD-1'], sourceSellShipment: '26000001', sourceStopSequence: 2 },
  ]
  await applyConsolidation({ body: { ...body(1, 2), stops }, db })
  const d = inserted(calls)
  assert.deepEqual(d.shipmentStopList.map((st) => [st.stopSequence, st.stopType, st.facilityName]),
    [[1, 'pickup', 'P1'], [2, 'delivery', 'D2'], [3, 'delivery', 'D1']])
  assert.deepEqual(d.shipmentStopList[0].orderIds, ['ORD-1', 'ORD-2'])
  assert.equal(d.shipmentStopList[0].grossWeightValue, 8600)
})

test('an external order is pulled through pullExternalOrders and its source is updated', async () => {
  const ext = { sellShipment: '26000009', category: 'consolidation', tenderStatus: '', activeTender: false, detail: detailOf(9) }
  const { db, calls } = fakeDb([dbRow(1), dbRow(2)], { external: [ext] })
  const stops = [...stopsFor(1, 2),
    { stopSequence: 5, stopType: 'pickup', orderIds: ['ORD-9'], sourceSellShipment: null, sourceStopSequence: null, facilityName: 'X' },
    { stopSequence: 6, stopType: 'delivery', orderIds: ['ORD-9'], sourceSellShipment: null, sourceStopSequence: null, facilityName: 'Y' }]
  await applyConsolidation({ body: { ...body(1, 2), stops, externalOrders: [{ orderNumber: 'ORD-9', sourceSellShipment: '26000009' }] }, db })
  assert.deepEqual(inserted(calls).orderList.map((o) => o.orderNumber), ['ORD-1', 'ORD-2', 'ORD-9'])
  const upd = calls.find((c) => /UPDATE orders SET shipment_sell_id = \$1 WHERE order_number = ANY/.test(c.text))
  assert.deepEqual(upd.values[1], ['ORD-1', 'ORD-2', 'ORD-9'])
  // the source was rewritten (save-stops' own source update) — its roster now empty
  const srcSave = calls.find((c) => /UPDATE shipments SET/.test(c.text) && c.values.includes('26000009'))
  assert.ok(srcSave, 'external source rewritten')
  assert.deepEqual(JSON.parse(srcSave.values[1]), [])   // its roster is now empty
  assertWritesOnClient(calls)
})

test('an external order from a blocked source (Sent/Accepted) → 400 and nothing written (LINX-15872)', async () => {
  const ext = { sellShipment: '26000009', category: 'sent', tenderStatus: 'Sent', activeTender: false, detail: detailOf(9) }
  const { db, calls } = fakeDb([dbRow(1), dbRow(2)], { external: [ext] })
  const stops = [...stopsFor(1, 2), { stopSequence: 5, stopType: 'pickup', orderIds: ['ORD-9'] }, { stopSequence: 6, stopType: 'delivery', orderIds: ['ORD-9'] }]
  await assert.rejects(() => applyConsolidation({ body: { ...body(1, 2), stops, externalOrders: [{ orderNumber: 'ORD-9', sourceSellShipment: '26000009' }] }, db }),
    (e) => e.status === 400 && /ORD-9/.test(e.message))
  noWrites(calls)
})

test('an order that is not consolidatable files the C in Hold (S7.6)', async () => {
  const held = dbRow(2, { detail: { ...detailOf(2), orderList: [{ ...detailOf(2).orderList[0], consolidatable: false }] } })
  const { db, calls } = fakeDb([dbRow(1), held])
  await applyConsolidation({ body: body(1, 2), db })
  const insert = calls.find((c) => /INSERT INTO shipments/.test(c.text))
  assert.ok(insert.values.includes('hold'))
  assert.ok(!insert.values.includes('consolidation'))
})

test('a Direct source whose order was left pending stays in the pool (not emptied)', async () => {
  const { db, calls } = fakeDb([dbRow(1), dbRow(2), dbRow(3)])
  await applyConsolidation({ body: { ...body(1, 2, 3), stops: stopsFor(1, 2) }, db })
  const shells = calls.filter((c) => /UPDATE shipments SET orders = '\{\}'/.test(c.text))
  assert.deepEqual(shells.map((c) => c.values[0]), ['26000001', '26000002'])
  assert.ok(!calls.some((c) => /DELETE FROM shipments WHERE sell_shipment = ANY/.test(c.text)))
})

test('a C edit reuses its ids and splits an order left pending into its own Direct', async () => {
  const c = dbRow(5, {
    shipmentType: 'Consolidation', odysseyShipmentIdentifier: 'C70000004', sellShipment: '27000004', buyShipment: '910000004',
    detail: {
      orderList: [1, 2, 3].flatMap((n) => detailOf(n).orderList),
      shipmentStopList: [1, 2, 3].flatMap((n) => detailOf(n).shipmentStopList).map((st, i) => ({ ...st, stopSequence: i + 1 })),
    },
  })
  const { db, calls } = fakeDb([c], { orderIds: [{ id: 3, orderNumber: 'ORD-3' }] })
  const stops = [
    { stopSequence: 1, stopType: 'pickup', orderIds: ['ORD-1', 'ORD-2'], sourceSellShipment: '27000004', sourceStopSequence: 1 },
    { stopSequence: 2, stopType: 'delivery', orderIds: ['ORD-1', 'ORD-2'], sourceSellShipment: '27000004', sourceStopSequence: 2 },
  ]
  await applyConsolidation({ body: { sellShipments: ['27000004'], stops, externalOrders: [], tenderList: [] }, db })
  const inserts = calls.filter((c2) => /INSERT INTO shipments/.test(c2.text))
  assert.deepEqual(inserts.map((q) => q.values[0]), ['27000004', '26000003'])   // C reused; split = 26000000 + orders.id
  const link = calls.find((c2) => /order_status = 'Planned Shipment'/.test(c2.text))
  assert.deepEqual(link.values, ['26000003', 'ORD-3'])
  // the C reuse deletes only itself, so no ANY-delete of the id it just wrote
  assert.ok(!calls.some((c2) => /DELETE FROM shipments WHERE sell_shipment = ANY/.test(c2.text)))
})

test('shippingOptionList = the posted list, untendered, and mirrored into the tenders table (CNS-16)', async () => {
  const { db, calls } = fakeDb([dbRow(1), dbRow(2)])
  const tenderList = [{ rank: 1, scac: 'ABCD', status: 'Sent', notifyDateTime: 'x' }, { rank: 2, scac: 'EFGH', status: '' }]
  await applyConsolidation({ body: { ...body(1, 2), tenderList }, db })
  assert.deepEqual(inserted(calls).shippingOptionList, [{ rank: 1, scac: 'ABCD', status: '' }, { rank: 2, scac: 'EFGH', status: '' }])
  assert.equal(calls.filter((c) => /INSERT INTO tenders/.test(c.text)).length, 2)
})

test('the writes run in one transaction; a failing write ROLLBACKs and never COMMITs', async () => {
  const pool = [], client = []
  let released = false
  const text = (q) => (typeof q === 'string' ? q : q.text)
  const db = {
    connect: async () => ({
      query: async (q) => {
        client.push(text(q))
        if (/UPDATE orders SET shipment_sell_id = \$1 WHERE order_number/.test(text(q))) throw new Error('boom')
        return { rows: [] }
      },
      release() { released = true },
    }),
    query: async (q) => {
      pool.push(text(q))
      if (/^\s*SELECT[\s\S]*FROM shipments WHERE sell_shipment = ANY/.test(text(q))) return { rows: [dbRow(1), dbRow(2)] }
      if (/count\(\*\)/.test(text(q))) return { rows: [{ n: 0 }] }
      return { rows: [] }
    },
  }
  await assert.rejects(() => applyConsolidation({ body: body(1, 2), db }), /boom/)
  assert.equal(client[0], 'BEGIN')
  assert.ok(client.includes('ROLLBACK'))
  assert.ok(!client.includes('COMMIT'))
  assert.ok(!pool.some((t) => /INSERT|DELETE|UPDATE/.test(t)), 'no write bypassed the client')
  assert.ok(released)
})

// ── LINX-15873 (CNS-23): Edit Shipment Stops on any C ───────────────────────
const cRow = (over = {}) => dbRow(5, {
  shipmentType: 'Consolidation', odysseyShipmentIdentifier: 'C70000004', sellShipment: '27000004', buyShipment: '910000004',
  category: 'approved', tenderStatus: 'Accepted',
  detail: {
    orderList: [1, 2].flatMap((n) => detailOf(n).orderList),
    shipmentStopList: [1, 2].flatMap((n) => detailOf(n).shipmentStopList).map((st, i) => ({ ...st, stopSequence: i + 1 })),
  },
  ...over,
})
const cBody = (extra = {}) => ({
  sellShipments: ['27000004'], externalOrders: [], tenderList: [{ rank: 1, scac: 'KEEP', status: '' }],
  stops: [
    { stopSequence: 1, stopType: 'pickup', orderIds: ['ORD-1', 'ORD-2'], sourceSellShipment: '27000004', sourceStopSequence: 1 },
    { stopSequence: 2, stopType: 'delivery', orderIds: ['ORD-1', 'ORD-2'], sourceSellShipment: '27000004', sourceStopSequence: 2 },
  ],
  ...extra,
})
// The C's tenders table answers with an Accepted row (the blob has none).
const withTenders = (fake, options) => {
  const q = fake.db.query
  fake.db.query = async (x) => (/FROM tenders WHERE shipment_sell_id/.test(x.text) ? { rows: options.map((option) => ({ option })) } : q(x))
  return fake
}

test('LINX-15873 D2: a C outside the pool is accepted; an Accepted tender read from the tenders table needs a decision', async () => {
  const { db, calls } = withTenders(fakeDb([cRow()]), [{ rank: 1, scac: 'KEEP', status: 'Accepted' }])
  await assert.rejects(() => applyConsolidation({ body: cBody(), db }),
    (e) => e.status === 400 && e.message === 'Choose whether to keep the active tender.')
  assert.ok(!texts(calls).some((t) => /INSERT|DELETE|UPDATE/.test(t)))
})

test('LINX-15873 D2: a C with an open order change → 400', async () => {
  const c = cRow({ detail: { ...cRow().detail, orderChange: { resolution: null } } })
  await assert.rejects(() => applyConsolidation({ body: cBody(), db: fakeDb([c]).db }),
    (e) => e.status === 400 && e.message === 'Resolve the open order change before editing stops.')
})

test('LINX-15873 D1: an unknown tenderDecision → 400 before any read', async () => {
  const { db, calls } = fakeDb([cRow()])
  await assert.rejects(() => applyConsolidation({ body: cBody({ tenderDecision: 'maybe' }), db }), { status: 400 })
  assert.equal(calls.length, 0)
})

test('LINX-15873 D3 keep: the C files Sent and the kept SCAC lands in the tenders table as Sent', async () => {
  const { db, calls } = withTenders(fakeDb([cRow()]), [{ rank: 1, scac: 'KEEP', status: 'Accepted' }])
  await applyConsolidation({ body: cBody({ tenderDecision: 'keep' }), db })
  const built = inserted(calls)
  assert.deepEqual(built.shippingOptionList.map((o) => [o.scac, o.status]), [['KEEP', 'Sent']])
  assert.deepEqual(calls.filter((c) => /INSERT INTO tenders/.test(c.text)).map((c) => c.values[3]), ['Sent'])
  assert.deepEqual(built.historyList.map((h) => h.action), ['Shipment Stops Edited'])
})

test('LINX-15873 D3 cancel: every tender row blank, the cancel recorded in History', async () => {
  const { db, calls } = withTenders(fakeDb([cRow()]), [{ rank: 1, scac: 'KEEP', status: 'Accepted' }])
  await applyConsolidation({ body: cBody({ tenderDecision: 'cancel' }), db })
  assert.deepEqual(calls.filter((c) => /INSERT INTO tenders/.test(c.text)).map((c) => c.values[3]), [''])
  assert.deepEqual(inserted(calls).historyList.map((h) => h.action), ['Shipment Stops Edited', 'Cancel'])
})

test('DEC-234: out-of-sequence stop dates → 400, nothing written', async () => {
  const { db, calls } = fakeDb([cRow({ category: 'consolidation', tenderStatus: '' })])
  const b = cBody()
  b.stops[0].scheduledDateTime = 'June 12, 2026 08:00 CST'
  b.stops[1].scheduledDateTime = 'June 11, 2026 08:00 CST'
  await assert.rejects(() => applyConsolidation({ body: b, db }), (e) => e.status === 400 && e.message === 'Stop dates are out of sequence.')
  assert.ok(!texts(calls).some((t) => /INSERT|DELETE|UPDATE/.test(t)))
})
