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
  detail: { orderList: [{ orderNumber: `ORD-${n}` }], shipmentStopList: [] },
  ...over,
})

// Records every statement; answers the three SELECTs the handler makes.
function fakeDb(sourceRows, { seq = 3 } = {}) {
  const calls = []
  return {
    calls,
    db: {
      query: async (q) => {
        calls.push(q)
        if (/FROM shipments WHERE sell_shipment = ANY/.test(q.text)) return { rows: sourceRows }
        if (/count\(\*\)/.test(q.text)) return { rows: [{ n: seq }] }
        if (/SELECT[\s\S]*FROM shipments WHERE sell_shipment = \$1/.test(q.text)) {
          return { rows: [{ sellShipment: q.values[0], odysseyShipmentIdentifier: 'C70000004' }] }
        }
        return { rows: [] }
      },
    },
  }
}
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

test('fewer than two ids, or duplicates, are 400s that never touch the db', async () => {
  const { db, calls } = fakeDb([])
  await assert.rejects(() => applyConsolidation({ body: { sellShipments: ['26000001'] }, db }), { status: 400 })
  await assert.rejects(() => applyConsolidation({ body: {}, db }), { status: 400 })
  await assert.rejects(
    () => applyConsolidation({ body: { sellShipments: ['26000001', '26000001'] }, db }), { status: 400 })
  assert.equal(calls.length, 0)
})

test('a missing shipment is a 400 naming it, and nothing is written', async () => {
  const { db, calls } = fakeDb([dbRow(1)])
  await assert.rejects(
    () => applyConsolidation({ body: { sellShipments: ['26000001', '26000002'] }, db }),
    (e) => e.status === 400 && /26000002/.test(e.message),
  )
  assert.ok(!texts(calls).some((t) => /INSERT|DELETE|UPDATE/.test(t)))
})

test('two customers is a 400 — the lock is re-checked server-side (CNS-10)', async () => {
  const rows = [dbRow(1), dbRow(2, { customerId: 'VALTRIS_01' })]
  const { db, calls } = fakeDb(rows)
  await assert.rejects(
    () => applyConsolidation({ body: { sellShipments: ['26000001', '26000002'] }, db }),
    (e) => e.status === 400 && /cannot span customers/.test(e.message),
  )
  assert.ok(!texts(calls).some((t) => /INSERT INTO shipments/.test(t)))
})

test('happy path: statements in the order that keeps the sources readable until the new row exists', async () => {
  const { db, calls } = fakeDb([dbRow(1), dbRow(2)], { seq: 3 })
  const res = await applyConsolidation({ body: { sellShipments: ['26000001', '26000002'] }, db })
  const t = texts(calls)
  const at = (re) => t.findIndex((x) => re.test(x))
  assert.ok(at(/DELETE FROM search_index/) < at(/INSERT INTO shipments/))
  assert.ok(at(/INSERT INTO shipments/) < at(/UPDATE orders SET shipment_sell_id/))
  assert.ok(at(/UPDATE orders SET shipment_sell_id/) < at(/DELETE FROM shipments WHERE sell_shipment = ANY/))
  assert.ok(at(/DELETE FROM shipments WHERE sell_shipment = ANY/) < at(/INSERT INTO search_index/))
  // seq 3 + 1 → C70000004 / sell 27000004
  const insert = calls.find((c) => /INSERT INTO shipments/.test(c.text))
  assert.equal(insert.values[0], '27000004')
  // the emptied shells are deleted, the new row is not
  const del = calls.find((c) => /DELETE FROM shipments WHERE sell_shipment = ANY/.test(c.text))
  assert.deepEqual(del.values, [['26000001', '26000002']])
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
  await applyConsolidation({ body: { sellShipments: ['26000001', '26000002'] }, db })
  const insert = calls.find((c) => /INSERT INTO shipments/.test(c.text))
  assert.ok(insert.values.includes('A')) // anchor = the FIRST requested id's customer
})

test('re-applying onto an existing consolidation frees and drops the old C row before the INSERT', async () => {
  const existing = dbRow(9, {
    shipmentType: 'Consolidation', odysseyShipmentIdentifier: 'C70000004',
    sellShipment: '27000004', buyShipment: '910000004',
  })
  const { db, calls } = fakeDb([existing, dbRow(2)], { seq: 99 })
  await applyConsolidation({ body: { sellShipments: ['27000004', '26000002'] }, db })
  const t = texts(calls)
  const at = (re) => t.findIndex((x) => re.test(x))
  assert.ok(at(/UPDATE orders SET shipment_sell_id = NULL/) < at(/DELETE FROM shipments WHERE sell_shipment = \$1/))
  assert.ok(at(/DELETE FROM shipments WHERE sell_shipment = \$1/) < at(/INSERT INTO shipments/))
  // the id is REUSED, so only the OTHER source is deleted at the end
  const insert = calls.find((c) => /INSERT INTO shipments/.test(c.text))
  assert.equal(insert.values[0], '27000004')
  const del = calls.find((c) => /DELETE FROM shipments WHERE sell_shipment = ANY/.test(c.text))
  assert.deepEqual(del.values, [['26000002']])
})

test('a failing shipment INSERT never repoints the orders', async () => {
  const calls = []
  const db = {
    query: async (q) => {
      calls.push(q.text)
      if (/FROM shipments WHERE sell_shipment = ANY/.test(q.text)) return { rows: [dbRow(1), dbRow(2)] }
      if (/count\(\*\)/.test(q.text)) return { rows: [{ n: 0 }] }
      if (/INSERT INTO shipments/.test(q.text)) throw Object.assign(new Error('boom'), { code: '08006' })
      return { rows: [] }
    },
  }
  await assert.rejects(() => applyConsolidation({ body: { sellShipments: ['26000001', '26000002'] }, db }))
  assert.ok(!calls.some((t) => /UPDATE orders SET shipment_sell_id = \$1/.test(t)))
  assert.ok(!calls.some((t) => /DELETE FROM shipments WHERE sell_shipment = ANY/.test(t)))
})
