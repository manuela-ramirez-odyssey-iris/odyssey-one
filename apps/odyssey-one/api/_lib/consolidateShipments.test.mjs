// apps/odyssey-one/api/_lib/consolidateShipments.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildConsolidatedShipment, checkConsolidation, idsForConsolidation, tsFromDisplay } from './consolidateShipments.mjs'
import { buildInsertShipmentQuery, buildSearchIndexQuery } from './planShipment.mjs'

const order = (n, over = {}) => ({
  orderNumber: `ORD-${n}`, grossWeightValue: 4300, volumeValue: 730,
  orderLines: [{ packageCount: 1 }, { packageCount: 1 }], pickupNumber: `PU-${n}`, poNumber: `PO-${n}`, ...over,
})

const stop = (seq, type, name, n) => ({
  stopSequence: seq, stopType: type, facilityName: name, city: name, region: 'TX', postal: `7700${n}`, country: 'US',
  orderIds: [`ORD-${n}`], scheduledDateTime: type === 'pickup' ? `June 1${n}, 2026 08:00 CST` : `June 2${n}, 2026 12:00 CST`,
})

const src = (n, over = {}, detailOver = {}) => ({
  row: {
    odysseyShipmentIdentifier: `O6000000${n}`, sellShipment: `2600000${n}`, buyShipment: `90000000${n}`,
    orders: [`ORD-${n}`], shipmentType: 'Direct', planningType: 'SSD',
    customerId: 'ERCO_SYS_01', customerName: 'ERCO Systems Inc',
    mode: 'LTL', equipmentCode: 'VAN', load: String(n), category: 'consolidation',
    ...over,
  },
  detail: {
    shipDirection: 'O', freightTerms: 'P', totalVolumeUomCode: 'cuft',
    orderList: [order(n)],
    shipmentStopList: [stop(1, 'pickup', `P${n}`, n), stop(2, 'delivery', `D${n}`, n)],
    ...detailOver,
  },
})

// The editor's DTO for sources 1..n as toDto would emit it: pickups, then deliveries.
const dtoFor = (...ns) => [
  ...ns.map((n) => ({ stopType: 'pickup', orderIds: [`ORD-${n}`], sourceSellShipment: `2600000${n}`, sourceStopSequence: 1, scheduledDateTime: `June 1${n}, 2026 08:00 CST` })),
  ...ns.map((n) => ({ stopType: 'delivery', orderIds: [`ORD-${n}`], sourceSellShipment: `2600000${n}`, sourceStopSequence: 2, scheduledDateTime: `June 2${n}, 2026 12:00 CST` })),
].map((s, i) => ({ ...s, stopSequence: i + 1 }))

const build = (sources, extra = {}, seq = 1) =>
  buildConsolidatedShipment({ sources, stops: dtoFor(...sources.map((s) => Number(s.row.sellShipment.slice(-1)))), seq, now: new Date('2026-09-20T12:00:00Z'), ...extra })

test('consolidation ids sit in their own band (C7…, sell 27…, buy 910…)', () => {
  const { row } = build([src(1), src(2)], {}, 5)
  assert.equal(row.odysseyShipmentIdentifier, 'C70000005')
  assert.equal(row.sellShipment, '27000005')
  assert.equal(row.buyShipment, '910000005')
  assert.deepEqual(idsForConsolidation(0), {
    odysseyShipmentIdentifier: 'C70000000', sellShipment: '27000000', buyShipment: '910000000',
  })
})

test('exactly one Consolidation source keeps ITS ids — editing never renames the consolidation (CNS-09)', () => {
  const existing = src(9, {
    shipmentType: 'Consolidation', odysseyShipmentIdentifier: 'C70000003',
    sellShipment: '27000003', buyShipment: '910000003',
  })
  const { row } = build([existing, src(2)], { stops: dtoFor(2).map((s) => s) }, 77)
  assert.equal(row.odysseyShipmentIdentifier, 'C70000003')
  assert.equal(row.sellShipment, '27000003')
  assert.equal(row.buyShipment, '910000003')
})

test('two Consolidation sources is a merge — a fresh id, neither source wins', () => {
  const a = src(1, { shipmentType: 'Consolidation', odysseyShipmentIdentifier: 'C70000001', sellShipment: '27000001' })
  const b = src(2, { shipmentType: 'Consolidation', odysseyShipmentIdentifier: 'C70000002', sellShipment: '27000002' })
  const { row } = buildConsolidatedShipment({
    sources: [a, b], stops: dtoFor(1, 2).map((s) => ({ ...s, sourceSellShipment: `2700000${s.orderIds[0].slice(-1)}` })),
    seq: 8, now: new Date(),
  })
  assert.equal(row.odysseyShipmentIdentifier, 'C70000008')
})

test('orders / counts / weight derive from the orders ON the stops, not the source rows', () => {
  const { row } = build([src(1), src(2)])
  assert.deepEqual(row.orders, ['ORD-1', 'ORD-2'])
  assert.equal(row.orderCount, '2')
  assert.equal(row.loadCount, '4')
  assert.equal(row.grossWeight, '8600')
  assert.equal(row.mode, 'LTL') // 8,600 < 10,000
  assert.equal(row.load, '1,2')
  assert.deepEqual(row.pickupNumbers, ['PU-1', 'PU-2'])
  assert.equal(row.shipmentType, 'Consolidation')
})

test('weight over the LTL ceiling flips the mode (planShipment modeFor, reused)', () => {
  const heavy = src(1, {}, { orderList: [order(1, { grossWeightValue: 9000 })] })
  assert.equal(build([heavy, src(2)]).row.mode, 'TL')
})

test('lane = first pickup and LAST delivery of the DTO stops', () => {
  const { row, pickupTs, deliveryTs } = build([src(1), src(2)])
  assert.equal(row.pickupDate, '06/11/2026 08:00 CST')
  assert.equal(row.consignor, 'P1')
  assert.equal(row.origin, 'P1 TX US 77001')
  assert.equal(row.deliveryDate, '06/22/2026 12:00 CST')
  assert.equal(row.consignee, 'D2')
  assert.equal(pickupTs, '2026-06-11T08:00:00-06:00')
  assert.equal(deliveryTs, '2026-06-22T12:00:00-06:00')
})

test('tsFromDisplay honours the zone abbreviation, and is null on junk', () => {
  assert.equal(tsFromDisplay('06/15/2026 08:00 EST'), '2026-06-15T08:00:00-05:00')
  assert.equal(tsFromDisplay(''), null)
  assert.equal(tsFromDisplay('--'), null)
})

test('filed like a new O (S7.6): the pool when every order is consolidatable, untendered, status derived', () => {
  const { row, detail } = build([src(1), src(2)])
  assert.equal(row.panel, 'monitoring')
  assert.equal(row.category, 'consolidation')
  assert.equal(row.shipmentStatus, 'Consolidation') // DEC-204
  assert.equal(row.tenderStatus, '')
  assert.equal(row.scac, null)
  assert.equal(detail.ratingStatus, 'Not Rated')
  assert.deepEqual(detail.droppedCarrierList, [])
})

test('one order that is not consolidatable files the C in Hold', () => {
  const held = src(2, {}, { orderList: [order(2, { consolidatable: false })] })
  const { row } = build([src(1), held])
  assert.equal(row.category, 'hold')
  assert.equal(row.shipmentStatus, 'Hold')
  assert.equal(row.panel, 'monitoring')
})

test('stops come from the DTO; each copies its source stop, with the DTO sequence + date (S7.3)', () => {
  const s1 = src(1)
  s1.detail.shipmentStopList[0].address1 = '1 Main St'
  s1.detail.shipmentStopList[0].lat = 29.7
  const { detail } = build([s1, src(2)])
  assert.deepEqual(
    detail.shipmentStopList.map((s) => [s.stopSequence, s.stopType, s.facilityName]),
    [[1, 'pickup', 'P1'], [2, 'pickup', 'P2'], [3, 'delivery', 'D1'], [4, 'delivery', 'D2']],
  )
  assert.equal(detail.shipmentStopList[0].address1, '1 Main St')   // full fields off the source stop
  assert.equal(detail.shipmentStopList[0].lat, 29.7)
  assert.equal(detail.shipmentStopList[1].facilityName, 'P2')       // from source 2, not source 1's stop 1
  assert.equal(detail.shipmentStopList[0].scheduledDateTime, 'June 11, 2026 08:00 CST') // the DTO's date wins
  assert.equal(detail.numberOfStops, 4)
  assert.equal(detail.totalVolumeValue, 1460)
  assert.deepEqual(detail.orderList.map((o) => o.orderNumber), ['ORD-1', 'ORD-2'])
})

test('a merged pickup (both orders on ONE stop) takes the first source stop and sums its orders', () => {
  const stops = [
    { stopSequence: 1, stopType: 'pickup', orderIds: ['ORD-1', 'ORD-2'], sourceSellShipment: '26000001', sourceStopSequence: 1 },
    { stopSequence: 2, stopType: 'delivery', orderIds: ['ORD-1'], sourceSellShipment: '26000001', sourceStopSequence: 2 },
    { stopSequence: 3, stopType: 'delivery', orderIds: ['ORD-2'], sourceSellShipment: '26000002', sourceStopSequence: 2 },
  ]
  const { detail } = build([src(1), src(2)], { stops })
  const [pickup] = detail.shipmentStopList
  assert.equal(pickup.facilityName, 'P1')
  assert.deepEqual(pickup.orderIds, ['ORD-1', 'ORD-2'])
  assert.equal(pickup.grossWeightValue, 8600)
  assert.equal(pickup.pickupNumber, 'PU-1')
  assert.equal(detail.numberOfStops, 3)
})

test('a created stop (both source keys null) keeps its DTO fields (C9)', () => {
  const stops = [
    ...dtoFor(1, 2).slice(0, 3),
    { stopSequence: 4, stopType: 'delivery', orderIds: ['ORD-2'], sourceSellShipment: null, sourceStopSequence: null,
      facilityName: 'New Dock', city: 'Austin', region: 'TX', postal: '73301', lat: 30.2, lng: -97.7, timeZone: 'America/Chicago' },
  ]
  const { detail } = build([src(1), src(2)], { stops })
  const created = detail.shipmentStopList[3]
  assert.deepEqual([created.facilityName, created.lat, created.timeZone], ['New Dock', 30.2, 'America/Chicago'])
})

test('an external order joins the roster and the stops it is on', () => {
  const ext = order(7)
  const stops = [
    ...dtoFor(1, 2).slice(0, 2), { stopSequence: 3, stopType: 'pickup', orderIds: ['ORD-7'], facilityName: 'X', sourceSellShipment: null, sourceStopSequence: null },
    ...dtoFor(1, 2).slice(2).map((s, i) => ({ ...s, stopSequence: 4 + i })),
    { stopSequence: 6, stopType: 'delivery', orderIds: ['ORD-7'], facilityName: 'Y', sourceSellShipment: null, sourceStopSequence: null },
  ]
  const { row, detail } = build([src(1), src(2)], { stops, externals: [ext] })
  assert.deepEqual(row.orders, ['ORD-1', 'ORD-2', 'ORD-7'])
  assert.equal(detail.orderList.length, 3)
})

test('a Direct source whose order was left pending is untouched — not removed, not split (S7.4)', () => {
  const b = build([src(1), src(2), src(3)], { stops: dtoFor(1, 2) })
  assert.deepEqual(b.removedSellShipments, ['26000001', '26000002'])
  assert.deepEqual(b.splitOrders, [])
  assert.deepEqual(b.row.orders, ['ORD-1', 'ORD-2'])
})

test('a C source that lost an order is removed and the lost order is returned to be split (C3)', () => {
  const c = src(5, { shipmentType: 'Consolidation', sellShipment: '27000005', odysseyShipmentIdentifier: 'C70000005' }, {
    orderList: [order(1), order(2), order(3)],
    shipmentStopList: [stop(1, 'pickup', 'P1', 1), stop(2, 'pickup', 'P2', 2), stop(3, 'delivery', 'D1', 1), stop(4, 'delivery', 'D2', 2)],
  })
  const stops = [
    { stopSequence: 1, stopType: 'pickup', orderIds: ['ORD-1', 'ORD-2'], sourceSellShipment: '27000005', sourceStopSequence: 1 },
    { stopSequence: 2, stopType: 'delivery', orderIds: ['ORD-1', 'ORD-2'], sourceSellShipment: '27000005', sourceStopSequence: 3 },
  ]
  const b = buildConsolidatedShipment({ sources: [c], stops, seq: 1, now: new Date() })
  assert.equal(b.row.sellShipment, '27000005')               // single-C edit reuses ids (S7.5)
  assert.deepEqual(b.removedSellShipments, ['27000005'])
  assert.deepEqual(b.splitOrders.map((p) => p.orderRec.orderNumber), ['ORD-3'])
  assert.deepEqual(b.row.orders, ['ORD-1', 'ORD-2'])
})

test('shippingOptionList is the posted list with every status blank and no notify/response fields (S7.7)', () => {
  const tenderList = [
    { rank: 1, scac: 'ABCD', status: 'Sent', notifyDateTime: 'x', responseMethod: 'API', responseDateTime: 'y', responseUser: 'z', responseComments: 'c', declineReason: 'd', tenderToken: 't' },
    { rank: 2, scac: 'EFGH', status: '' },
  ]
  const { detail } = build([src(1), src(2)], { tenderList })
  assert.deepEqual(detail.shippingOptionList, [{ rank: 1, scac: 'ABCD', status: '' }, { rank: 2, scac: 'EFGH', status: '' }])
})

test('history names the sources it was consolidated from (DEC-87 outcome contract)', () => {
  const { detail } = build([src(1), src(2)])
  assert.deepEqual(detail.historyList.map((h) => h.action), ['Shipment Created', 'Manual Consolidation'])
  assert.equal(detail.historyList[1].details, 'Consolidated from O60000001, O60000002.')
  assert.equal(detail.historyList[1].outcome, 'update')
  assert.equal(detail.historyList[0].author.kind, 'system')
})

test('the result feeds buildInsertShipmentQuery unchanged (same shape as buildDirectShipment)', () => {
  const built = build([src(1), src(2)])
  const q = buildInsertShipmentQuery(built)
  assert.match(q.text, /INSERT INTO shipments/)
  assert.equal(q.values[0], built.row.sellShipment)
  assert.equal(q.values[q.values.length - 1], built.row.odysseyShipmentIdentifier)
  assert.equal(q.values.filter((v) => v === undefined).length, 0)
})

// planShipment's own comment: "a multi-order consolidation would hit this".
test('search index dedupes repeated tuples across a multi-order consolidation', () => {
  const built = build([src(1), src(2)])
  const q = buildSearchIndexQuery({ ...built.row, orders: ['ORD-DUP', 'ORD-DUP'], pickupNumbers: ['PU-DUP', 'PU-DUP'] })
  const pks = []
  for (let i = 0; i < q.values.length; i += 5) pks.push(`${q.values[i + 2]}|${q.values[i + 3]}`)
  assert.equal(new Set(pks).size, pks.length, `duplicate tuples: ${pks.join(' ')}`)
  assert.equal(q.text.match(/\(\$/g).length, pks.length)
})

test('search index still carries every distinct order of a real consolidation', () => {
  const q = buildSearchIndexQuery(build([src(1), src(2)]).row)
  const values = []
  for (let i = 0; i < q.values.length; i += 5) values.push(q.values[i + 3])
  assert.ok(values.includes('ORD1') && values.includes('ORD2'), `orders missing from the index: ${values.join(' ')}`)
})

// ── S7.2 guards ────────────────────────────────────────────────────────────
const check = (over = {}) => {
  const sources = over.sources ?? [src(1), src(2)]
  return checkConsolidation({ sources, stops: dtoFor(1, 2), ...over })
}

test('guard: a source outside the Consolidation pool is refused, naming it', () => {
  assert.throws(() => check({ sources: [src(1, { category: 'hold' }), src(2)] }),
    (e) => e.status === 400 && e.message === 'Only shipments in Consolidation can be consolidated: 26000001')
})

test('guard: one customer only (CNS-10)', () => {
  assert.throws(() => check({ sources: [src(1), src(2, { customerId: 'VALTRIS_01' })] }),
    (e) => e.status === 400 && /cannot span customers/.test(e.message))
})

test('guard: fewer than two orders on the stops (CNS-14) — a single source is otherwise fine', () => {
  assert.throws(() => check({ sources: [src(1)], stops: dtoFor(1) }),
    (e) => e.status === 400 && e.message === 'A consolidation needs at least two orders.')
  const c = src(5, { shipmentType: 'Consolidation' }, { orderList: [order(1), order(2)] })
  assert.doesNotThrow(() => checkConsolidation({ sources: [c], stops: dtoFor(1, 2) }))
})

test('guard: a delivery above its pickup is refused', () => {
  const stops = dtoFor(1, 2).map((s, i, a) => ({ ...s, stopSequence: a.length - i })) // fully reversed
  assert.throws(() => check({ stops }), (e) => e.status === 400 && e.message === 'Stops are out of order.')
})

test('guard: an external order that is not on any stop, or an order nobody owns, is refused', () => {
  assert.throws(() => check({ externalOrders: [{ orderNumber: 'ORD-9', sourceSellShipment: '26000009' }] }), /must all be placed/)
  const stops = [...dtoFor(1, 2), { stopSequence: 5, stopType: 'pickup', orderIds: ['GHOST'] }]
  assert.throws(() => check({ stops }), /Unknown order\(s\) on stops: GHOST/)
})

test('guard: a delivery whose order has no pickup on any stop is out of order', () => {
  const stops = [{ stopSequence: 1, stopType: 'pickup', orderIds: ['ORD-1'] }, { stopSequence: 2, stopType: 'delivery', orderIds: ['ORD-1', 'ORD-2'] }]
  assert.throws(() => check({ stops }), (e) => e.status === 400 && e.message === 'Stops are out of order.')
})

test('guard: an order with a pickup but no delivery is out of order', () => {
  const stops = [{ stopSequence: 1, stopType: 'pickup', orderIds: ['ORD-1', 'ORD-2'] }, { stopSequence: 2, stopType: 'delivery', orderIds: ['ORD-1'] }]
  assert.throws(() => check({ stops }), (e) => e.status === 400 && e.message === 'Stops are out of order.')
})

test('an emptied source shell is not "consumed" (nothing to move, nothing to remove)', () => {
  const shell = src(3, {}, { orderList: [] })
  assert.deepEqual(build([src(1), src(2), shell], { stops: dtoFor(1, 2) }).removedSellShipments, ['26000001', '26000002'])
})
