import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildProjection } from './project-search.mjs'

const ROW = {
  sellShipment: '25950714', buyShipment: '43708610', orders: ['0000000091000'],
  pro: '442376', customerId: 'WEYERH_01', customerName: 'Weyerhaeuser Company',
  consignor: 'WESTLAKE CHEMICAL PL', consignee: 'BAYOU CHEMICAL PLANT',
  origin: 'Lake Charles LA US 70601', destination: 'Baton Rouge LA US 70801',
  equipment: '4359', seal: 'S442272', scac: 'FXFE', load: '16587',
  pickupNumbers: ['PU-820622'],
  shipmentType: 'Direct', planningType: 'RDD',
}

const byAttr = (rows) => Object.fromEntries(rows.map((r) => [r.attr, r]))

test('projects one row per searchable value, keyed by sellShipment', () => {
  const rows = buildProjection([ROW])
  assert.ok(rows.every((r) => r.entity_id === '25950714'))
  assert.ok(rows.every((r) => r.domain === 'shipments'))
  const a = byAttr(rows)
  assert.equal(a['order'].value, '0000000091000')
  assert.equal(a['pro'].display, '442376')
  assert.equal(a['customer-name'].value, 'WEYERHAEUSER COMPANY') // normalized
  assert.equal(a['customer-name'].display, 'Weyerhaeuser Company') // original
})

test('array fields expand to one row per element', () => {
  const rows = buildProjection([{ ...ROW, orders: ['A1', 'A2'] }])
  assert.deepEqual(rows.filter((r) => r.attr === 'order').map((r) => r.value), ['A1', 'A2'])
})

test('null and empty values are skipped, never projected as empty strings', () => {
  const rows = buildProjection([{ ...ROW, pro: null, seal: '  ' }])
  assert.ok(!rows.some((r) => r.attr === 'pro'))
  assert.ok(!rows.some((r) => r.attr === 'seal'))
  assert.ok(rows.every((r) => r.value !== ''))
})

test('separator-bearing identifiers normalize but keep their display form', () => {
  const rows = buildProjection([{ ...ROW, pro: 'PRO-442 376' }])
  const pro = byAttr(buildProjection([{ ...ROW, pro: 'PRO-442 376' }]))['pro']
  assert.equal(pro.value, 'PRO442376')     // searchable
  assert.equal(pro.display, 'PRO-442 376') // shown
  assert.ok(rows.length > 0)
})

// The projection is the ONLY thing live search reads. A field silently dropped
// here is a field that returns zero results — the exact S104 symptom, one layer
// down. So assert the whole registry is covered, not just the fields above.
test('every registry attribute is reachable from the generated row shape', () => {
  const attrs = new Set(buildProjection([ROW]).map((r) => r.attr))
  for (const key of ['buy-shipment', 'sell-shipment', 'order', 'pro', 'customer-id',
    'customer-name', 'consignor', 'consignee', 'origin', 'destination',
    'equipment', 'seal', 'scac', 'load', 'pickup-number',
    'shipment-type', 'planning-type']) {
    assert.ok(attrs.has(key), `attribute "${key}" was not projected — SRC_KEY gap`)
  }
})

test('the primary key (domain, attr, entity_id, value) is unique per shipment', () => {
  // A duplicate would abort the whole seed insert, 19 minutes in.
  const rows = buildProjection([{ ...ROW, orders: ['A1', 'A1'] }])
  const keys = rows.map((r) => `${r.domain}|${r.attr}|${r.entity_id}|${r.value}`)
  assert.equal(new Set(keys).size, keys.length, 'duplicate projection key')
})

test('pickup numbers are projected as an array attribute (R2-2)', () => {
  const rows = buildProjection([{ ...ROW, pickupNumbers: ['PU-100001', 'PU-100002'] }])
  const pn = rows.filter((r) => r.attr === 'pickup-number')
  assert.deepEqual(pn.map((r) => r.value), ['PU100001', 'PU100002']) // separators stripped
  assert.deepEqual(pn.map((r) => r.display), ['PU-100001', 'PU-100002']) // shown as typed
})

test('a shipment with no pickup numbers projects none, not an empty row', () => {
  const rows = buildProjection([{ ...ROW, pickupNumbers: [] }])
  assert.ok(!rows.some((r) => r.attr === 'pickup-number'))
})
