import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDataset } from './generate.mjs'
import { EXTRA_CUSTOMERS } from './data-pools.mjs'

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
  const a = buildDataset().orders
  const b = buildDataset().orders
  assert.deepEqual(a, b)
})

test('LINX-12102: order.hazardous matches whether ANY of its lines are hazmat-flagged', () => {
  const { orders, details, orderDetails } = buildDataset()
  let checkedShipped = 0
  for (const s of details.values()) {
    for (const ord of s.orderList) {
      const row = orders.find(o => o.orderNumber === ord.orderNumber)
      if (!row) continue // enrichment subset only touches some orders' rows indirectly; row still exists in ds.orders
      const expected = ord.orderLines.some(l => !!l.hazmatCode)
      assert.equal(row.hazardous, expected, `order ${ord.orderNumber} hazardous mismatch`)
      checkedShipped++
    }
  }
  assert.ok(checkedShipped > 0)
  // the enrichment's per-line hazardous must agree with its own row's flag
  for (const [orderNumber, mo] of Object.entries(orderDetails)) {
    const row = orders.find(o => o.orderNumber === orderNumber)
    if (!row) continue
    assert.equal(mo.orderLines.some(l => l.hazardous) || false, row.hazardous, `enrichment ${orderNumber} hazardous mismatch`)
  }
})

test('promoted extra orgs own a thin tail; original customers dominate', () => {
  const { orders } = buildDataset({ totalShipments: 200 })
  const extraIds = new Set(EXTRA_CUSTOMERS.map((c) => c.id))
  const extras = orders.filter((o) => extraIds.has(o.customer)).length
  assert.ok(extras > 0, 'extras own some orders')
  assert.ok(extras / orders.length < 0.2, `extras own ${extras}/${orders.length}`)
})

test('enrichment orderLines carry the create-form wire fields (ledger rows 4/5/6)', () => {
  const ds = buildDataset({ totalShipments: 50 })
  const enriched = Object.values(ds.orderDetails)
  assert.ok(enriched.length > 0)
  for (const mo of enriched) {
    for (const l of mo.orderLines) {
      assert.match(l.shipItemIdentifier, /^\d{13}$/)
      assert.ok(['H', 'C', 'P', 'N'].includes(l.shipClass), `shipClass ${l.shipClass}`)
      assert.ok(['PLT', 'BOX', 'DRM', 'BUL', 'CRT'].includes(l.handlingUnit))
      assert.equal(typeof l.handlingUnitCount, 'number')
      assert.equal(typeof l.declaredValue, 'number')
      assert.equal(l.declaredValueCurrency, 'USD')
      assert.equal(l.manufacturingCountryCode, 'United States')
      assert.match(l.stccCode, /^\d{7}$/)
      assert.equal(typeof l.lengthValue, 'number')
    }
  }
})

test('errorCount is weighted low: majority 1–4, hard cap 12 (ledger row 7)', () => {
  const counts = buildDataset().orders.filter((o) => o.errorCount != null).map((o) => o.errorCount)
  assert.ok(counts.length > 0)
  assert.ok(Math.max(...counts) <= 12)
  const low = counts.filter((c) => c <= 4).length
  assert.ok(low / counts.length > 0.7, `low share ${(low / counts.length).toFixed(2)}`)
})

// ── S104 Task 10b: the stops-tab hardcode ─────────────────────────────────────
// S103 made stop `scheduledDateTime` derive its abbreviation per city and per
// instant. `appointmentTime` on the very next line was missed and still emitted
// a literal ' CST', so a Denver stop showed MDT scheduled / CST appointment in
// the SAME field grid. This is the inconsistency the user reported — and it lives
// in the GENERATOR, which is why a component-level hardcode audit never found it.
test('stop appointmentTime uses the stop own zone, never a literal CST', () => {
  const ds = buildDataset()
  const abbrev = (s) => String(s).trim().split(' ').pop()
  let checked = 0
  for (const d of ds.details.values()) {
    for (const stop of d.shipmentStopList ?? []) {
      // The appointment abbreviation must match the SCHEDULED abbreviation of
      // the same stop — same city, same instant, so same zone.
      assert.equal(abbrev(stop.appointmentTime), abbrev(stop.scheduledDateTime),
        `stop in ${stop.city}: appointment ${stop.appointmentTime} vs scheduled ${stop.scheduledDateTime}`)
      checked++
    }
  }
  assert.ok(checked > 100, `only ${checked} stops checked`)
})

test('a western stop actually exercises a non-CST zone (else the test is vacuous)', () => {
  const ds = buildDataset()
  const zones = new Set()
  for (const d of ds.details.values())
    for (const stop of d.shipmentStopList ?? []) zones.add(String(stop.appointmentTime).trim().split(' ').pop())
  assert.ok(zones.size > 1, `all appointments share one abbreviation: ${[...zones]}`)
  assert.ok([...zones].some((z) => /^(M|P|E)[SD]T$/.test(z)), `no non-central zone: ${[...zones]}`)
})

test('each stop of a multi-stop shipment gets its OWN appointment hour', () => {
  const ds = buildDataset()
  const multi = [...ds.details.values()].find((d) => (d.shipmentStopList ?? []).length > 2)
  assert.ok(multi, 'no multi-stop shipment generated')
  const hours = multi.shipmentStopList.map((s) => String(s.appointmentTime).slice(0, 2))
  assert.ok(new Set(hours).size > 1, `every stop shares appointment hour ${hours[0]}`)
})

test('detail carries a Tracking Link built from the shipment Pro # (R2-1)', () => {
  const ds = buildDataset()
  const [sellId, d] = [...ds.details.entries()][0]
  const row = ds.shipments.find((s) => s.sellShipment === sellId)
  assert.ok(d.trackingUrl, 'no trackingUrl on the detail blob')
  assert.match(d.trackingUrl, /^https:\/\/tracking\.oneodyssey\.com\/t\//)
  assert.ok(d.trackingUrl.endsWith(row.pro), `${d.trackingUrl} does not hang off pro ${row.pro}`)
  // Every shipment, not just the sampled one — the strip dashes on any miss.
  for (const det of ds.details.values()) assert.ok(det.trackingUrl)
})
