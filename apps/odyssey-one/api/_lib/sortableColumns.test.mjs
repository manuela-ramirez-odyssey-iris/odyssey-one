// LINX-15893 BR I — the grid's sortable headers and buildListQuery's SORT_MAP
// must not drift: a sortable key without a SORT_MAP entry silently sorts by
// pickup_ts. Own file so the S165 hunks stay out of shipments.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildListQuery } from './shipments.mjs'
import { SORTABLE_KEYS } from '../../src/components/shipments/sortableColumns.js'

const orderBy = (sortBy, dir = 'asc') => buildListQuery({ sortBy, orderBy: dir }).text.match(/ORDER BY ([\s\S]*?)\s+LIMIT/)[1]
const FALLBACK = orderBy('__not_a_column__')

test('every sortable grid key has its own SORT_MAP entry (no pickup_ts fallback)', () => {
  for (const key of SORTABLE_KEYS) {
    if (key === 'pickupDate') continue   // pickup_ts IS its real column
    assert.notEqual(orderBy(key), FALLBACK, `"${key}" is sortable in the grid but falls back to pickup_ts`)
  }
})

test('the new SORT_MAP entries build a valid ORDER BY', () => {
  const expected = {
    customerId: 'customer_id', origin: 'origin', destination: 'destination', equipmentCode: 'equipment_code',
    shipmentType: 'shipment_type', planningType: 'planning_type', legType: 'leg_type',
    consignor: 'consignor', consignee: 'consignee', pro: 'pro',
  }
  for (const [key, col] of Object.entries(expected)) {
    assert.equal(orderBy(key, 'desc'), `${col} DESC NULLS LAST`)
  }
  // Numeric-text columns cast so '10' sorts after '9' and "1,234.56" after "987.00".
  for (const [key, col] of [['orderCount', 'order_count'], ['loadCount', 'load_count'], ['apFreightCost', 'ap_freight_cost']]) {
    assert.equal(orderBy(key), `NULLIF(regexp_replace(${col}, '[^0-9.]', '', 'g'), '')::numeric ASC NULLS LAST`)
  }
})

test('grossWeight is deliberately unsortable (unit-bearing override strings)', () => {
  assert.equal(SORTABLE_KEYS.includes('grossWeight'), false)
  assert.equal(orderBy('grossWeight'), FALLBACK)
})
