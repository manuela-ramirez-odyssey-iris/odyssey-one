// apps/odyssey-one/api/_lib/consolidateShipments.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildConsolidatedShipment, idsForConsolidation, tsFromDisplay } from './consolidateShipments.mjs'
import { buildInsertShipmentQuery, buildSearchIndexQuery } from './planShipment.mjs'

const stop = (seq, type, name) => ({
  stopSequence: seq, stopType: type, facilityName: name, city: name, region: 'TX',
  grossWeightValue: 100, grossWeightUomCode: 'LB',
})

const src = (n, over = {}) => ({
  row: {
    odysseyShipmentIdentifier: `O6000000${n}`, sellShipment: `2600000${n}`, buyShipment: `90000000${n}`,
    orders: [`ORD-${n}`], pickupNumbers: [`PU-${n}`], poNumbers: [`PO-${n}`],
    shipmentType: 'Direct', planningType: 'SSD',
    customerId: 'ERCO_SYS_01', customerName: 'ERCO Systems Inc',
    consignor: `CONSIGNOR-${n}`, consignee: `CONSIGNEE-${n}`,
    origin: `Houston TX US 7700${n}`, destination: `San Antonio TX US 7820${n}`,
    pickupDate: `06/1${n}/2026 08:00 CST`, deliveryDate: `06/2${n}/2026 12:00 CST`,
    mode: 'LTL', equipmentCode: 'VAN', grossWeight: '4300', load: String(n),
    loadCount: '2', orderCount: '1', apFreightCost: '',
    ...over,
  },
  detail: {
    shipDirection: 'O', freightTerms: 'P', totalVolumeValue: 730, totalVolumeUomCode: 'cuft',
    orderList: [{ orderNumber: `ORD-${n}` }],
    shipmentStopList: [stop(1, 'pickup', `P${n}`), stop(2, 'delivery', `D${n}`)],
  },
})

const build = (sources, seq = 1) =>
  buildConsolidatedShipment({ sources, seq, now: new Date('2026-09-20T12:00:00Z') })

test('consolidation ids sit in their own band (C7…, sell 27…, buy 910…)', () => {
  const { row } = build([src(1), src(2)], 5)
  assert.equal(row.odysseyShipmentIdentifier, 'C70000005')
  assert.equal(row.sellShipment, '27000005')
  assert.equal(row.buyShipment, '910000005')
  // disjoint from the seed (25xxxxxx / C5xxxxxxx) and planShipment (26xxxxxx / O6xxxxxxx / 9xxxxxxxx)
  assert.deepEqual(idsForConsolidation(0), {
    odysseyShipmentIdentifier: 'C70000000', sellShipment: '27000000', buyShipment: '910000000',
  })
})

test('exactly one Consolidation source keeps ITS ids — editing never renames the consolidation (CNS-09)', () => {
  const existing = src(9, {
    shipmentType: 'Consolidation', odysseyShipmentIdentifier: 'C70000003',
    sellShipment: '27000003', buyShipment: '910000003',
  })
  const { row } = build([existing, src(2)], 77)
  assert.equal(row.odysseyShipmentIdentifier, 'C70000003')
  assert.equal(row.sellShipment, '27000003')
  assert.equal(row.buyShipment, '910000003')
})

test('two Consolidation sources is a merge — a fresh id, neither source wins', () => {
  const a = src(1, { shipmentType: 'Consolidation', odysseyShipmentIdentifier: 'C70000001', sellShipment: '27000001' })
  const b = src(2, { shipmentType: 'Consolidation', odysseyShipmentIdentifier: 'C70000002', sellShipment: '27000002' })
  const { row } = build([a, b], 8)
  assert.equal(row.odysseyShipmentIdentifier, 'C70000008')
})

test('orders / pickup / po numbers are ordered unions, counts and weight are sums', () => {
  const { row } = build([src(1, { orders: ['ORD-1', 'ORD-X'] }), src(2, { orders: ['ORD-X', 'ORD-2'] })])
  assert.deepEqual(row.orders, ['ORD-1', 'ORD-X', 'ORD-2'])
  assert.equal(row.orderCount, '3')
  assert.equal(row.loadCount, '4')
  assert.equal(row.grossWeight, '8600')
  assert.equal(row.mode, 'LTL') // 8,600 < 10,000
  assert.equal(row.load, '1,2')
  assert.deepEqual(row.pickupNumbers, ['PU-1', 'PU-2'])
})

test('weight over the LTL ceiling flips the mode (planShipment modeFor, reused)', () => {
  const { row } = build([src(1, { grossWeight: '9000' }), src(2, { grossWeight: '2000' })])
  assert.equal(row.mode, 'TL')
})

test('lane = earliest pickup and LATEST delivery, whatever the selection order', () => {
  const early = src(1, { pickupDate: '06/11/2026 08:00 CST', deliveryDate: '06/21/2026 12:00 CST' })
  const late = src(2, { pickupDate: '06/09/2026 06:00 CST', deliveryDate: '06/28/2026 09:00 CST' })
  const { row, pickupTs, deliveryTs } = build([early, late])
  assert.equal(row.pickupDate, '06/09/2026 06:00 CST')
  assert.equal(row.consignor, 'CONSIGNOR-2')
  assert.equal(row.origin, 'Houston TX US 77002')
  assert.equal(row.deliveryDate, '06/28/2026 09:00 CST')
  assert.equal(row.consignee, 'CONSIGNEE-2')
  assert.equal(pickupTs, '2026-06-09T06:00:00-06:00')
  assert.equal(deliveryTs, '2026-06-28T09:00:00-06:00')
})

test('tsFromDisplay honours the zone abbreviation, and is null on junk', () => {
  assert.equal(tsFromDisplay('06/15/2026 08:00 EST'), '2026-06-15T08:00:00-05:00')
  assert.equal(tsFromDisplay(''), null)
  assert.equal(tsFromDisplay('--'), null)
})

test('the new shipment is born in the pool, untendered, unrated (DEC-156/157)', () => {
  const { row, detail } = build([src(1), src(2)])
  assert.equal(row.shipmentType, 'Consolidation')
  assert.equal(row.panel, 'monitoring')
  assert.equal(row.category, 'consolidation')
  assert.equal(row.tenderStatus, '')
  assert.equal(row.shipmentStatus, '')
  assert.equal(row.scac, null)
  assert.equal(row.pro, null)
  assert.equal(row.legType, null)
  assert.equal(detail.ratingStatus, 'Not Rated')
  assert.deepEqual(detail.shippingOptionList, [])
})

test('stops: every pickup in selection order, then every delivery, re-sequenced 1..n', () => {
  const { detail } = build([src(1), src(2)])
  assert.deepEqual(
    detail.shipmentStopList.map((s) => [s.stopSequence, s.stopType, s.facilityName]),
    [[1, 'pickup', 'P1'], [2, 'pickup', 'P2'], [3, 'delivery', 'D1'], [4, 'delivery', 'D2']],
  )
  assert.equal(detail.numberOfStops, 4)
  assert.equal(detail.totalVolumeValue, 1460)
  assert.deepEqual(detail.orderList.map((o) => o.orderNumber), ['ORD-1', 'ORD-2'])
})

test('history names the sources it was consolidated from (DEC-87 outcome contract)', () => {
  const { detail } = build([src(1), src(2)])
  assert.deepEqual(detail.historyList.map((h) => h.action), ['Shipment Created', 'Manual Consolidation'])
  assert.equal(detail.historyList[1].details, 'Consolidated from O60000001, O60000002.')
  assert.equal(detail.historyList[1].outcome, 'update')
  assert.equal(detail.historyList[0].author.kind, 'system')
})

test('removedSellShipments names every source — including a reused C id', () => {
  const existing = src(9, { shipmentType: 'Consolidation', sellShipment: '27000003' })
  const { removedSellShipments } = build([existing, src(2)])
  assert.deepEqual(removedSellShipments, ['27000003', '26000002'])
})

test('fewer than two sources is refused', () => {
  assert.throws(() => build([src(1)]), /at least two/)
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
// It does now — this is the case that would 21000 postgres without the dedupe.
test('search index dedupes repeated tuples across a multi-order consolidation', () => {
  // Both sources carry the SAME pickup number and the SAME order — one attr/value
  // tuple each, projected twice, which postgres rejects inside one INSERT.
  const built = build([
    src(1, { orders: ['ORD-DUP'], pickupNumbers: ['PU-DUP'] }),
    src(2, { orders: ['ORD-DUP'], pickupNumbers: ['PU-DUP'] }),
  ])
  const q = buildSearchIndexQuery(built.row)
  const pks = []
  for (let i = 0; i < q.values.length; i += 5) pks.push(`${q.values[i + 2]}|${q.values[i + 3]}`)
  assert.equal(new Set(pks).size, pks.length, `duplicate tuples: ${pks.join(' ')}`)
  assert.equal(q.text.match(/\(\$/g).length, pks.length)
})

test('search index still carries every distinct order of a real consolidation', () => {
  const built = build([src(1), src(2)])
  const q = buildSearchIndexQuery(built.row)
  const values = []
  for (let i = 0; i < q.values.length; i += 5) values.push(q.values[i + 3])
  // the registry normalizes (uppercases, strips punctuation) — both orders land
  assert.ok(values.includes('ORD1') && values.includes('ORD2'), `orders missing from the index: ${values.join(' ')}`)
})
