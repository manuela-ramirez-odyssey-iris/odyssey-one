import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDataset } from './generate.mjs'

test('buildDataset returns a coherent scaled dataset', () => {
  const ds = buildDataset({ totalShipments: 50 })
  assert.equal(ds.shipments.length, 50)
  assert.equal(ds.details.size, 50)
  // I1: every orderNumber in a shipment's orders[] exists exactly once in orders rows
  const orderNumbers = ds.orders.filter((o) => o.orderNumber !== '').map((o) => o.orderNumber)
  assert.equal(new Set(orderNumbers).size, orderNumbers.length)
  for (const s of ds.shipments) for (const id of s.orders) assert.ok(orderNumbers.includes(id))
  // I2: single customer per shipment, mirrored in detail
  for (const s of ds.shipments) assert.equal(ds.details.get(s.sellShipment).customerId, s.customerId)
  // determinism: same seed → same first shipment id
  const ds2 = buildDataset({ totalShipments: 50 })
  assert.equal(ds2.shipments[0].sellShipment, ds.shipments[0].sellShipment)
})

test('I10: draft orders carry created/createdBy/lastEdit; VE orders carry draftOrderStatus+errorCount', () => {
  const { orders } = buildDataset()
  const drafts = orders.filter(o => o.orderStatus === 'Draft')
  assert.ok(drafts.length > 0)
  for (const d of drafts) {
    assert.ok(d.createdAt && d.createdBy && d.lastEditAt)
  }
  const ve = orders.filter(o => ['Planning Failed', 'Shipment Failed'].includes(o.orderStatus))
  assert.ok(ve.length > 0)
  for (const o of ve) {
    assert.ok(['Ready', 'Complete', 'Purge'].includes(o.draftOrderStatus))
    assert.ok(Number.isInteger(o.errorCount) && o.errorCount >= 1 && o.errorCount <= 12)
  }
  for (const o of orders) {
    assert.equal(typeof o.hazardous, 'boolean')
    assert.ok(o.consignor.name !== undefined && o.consignor.address !== undefined)
  }
})

test('I11: generator is deterministic for the new fields', () => {
  const a = buildDataset().orders.slice(0, 50)
  const b = buildDataset().orders.slice(0, 50)
  assert.deepEqual(a, b)
})
