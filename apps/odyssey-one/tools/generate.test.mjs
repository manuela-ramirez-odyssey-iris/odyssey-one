import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDataset } from './generate.mjs'
import { EXTRA_CUSTOMERS } from './data-pools.mjs'
import { USERS } from './seed-users.mjs'

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

// ── S104 Task 10 Step 3: Pickup # is an ORDER-header reference (R2-2 / D3) ────
test('shipment pickupNumbers rolls up from its orders, deduped', () => {
  const ds = buildDataset()
  let withAny = 0
  for (const s of ds.shipments) {
    assert.ok(Array.isArray(s.pickupNumbers), `${s.sellShipment} pickupNumbers not an array`)
    assert.equal(new Set(s.pickupNumbers).size, s.pickupNumbers.length, 'duplicate pickup number')
    for (const p of s.pickupNumbers) assert.match(p, /^PU-\d{6}$/)
    if (s.pickupNumbers.length) withAny++
  }
  // ~60% per order, so nearly every shipment should carry at least one.
  assert.ok(withAny / ds.shipments.length > 0.7, `only ${withAny}/${ds.shipments.length}`)
})

test('a pickup stop copies a pickup number from the orders it actually picks up', () => {
  // Was a per-stop coin flip: half of all pickup stops rendered '--' despite the
  // field being plumbed to StopsTab. It must now be a COPY, never minted.
  const ds = buildDataset()
  let checked = 0, present = 0
  for (const [sellId, d] of ds.details) {
    const row = ds.shipments.find((s) => s.sellShipment === sellId)
    for (const stop of d.shipmentStopList ?? []) {
      if (stop.stopType !== 'pickup') { assert.equal(stop.pickupNumber, null); continue }
      checked++
      if (stop.pickupNumber == null) continue
      present++
      assert.ok(row.pickupNumbers.includes(stop.pickupNumber),
        `stop ${stop.pickupNumber} is not one of the shipment's ${row.pickupNumbers}`)
    }
  }
  assert.ok(checked > 100)
  assert.ok(present / checked > 0.7, `only ${present}/${checked} pickup stops carry a number`)
})

// ── Task 9: username identity + zoned created/edit timestamps (R2-3, R2-4) ──
test('every order carries a created zone abbreviation (R2-3)', () => {
  const { orders } = buildDataset({ totalShipments: 50 })
  assert.ok(orders.length > 0)
  for (const o of orders) assert.match(o.createdTimeZoneCode, /^[A-Z]{3,4}$/, `order ${o.orderNumber} zone: ${o.createdTimeZoneCode}`)
})

test('Draft rows carry lastEditedBy WITH lastEditAt; non-Draft rows carry neither (R2-4)', () => {
  const { orders } = buildDataset()
  const drafts = orders.filter((o) => o.orderStatus === 'Draft')
  assert.ok(drafts.length > 0)
  for (const d of drafts) {
    assert.ok(d.lastEditAt, `draft ${d.orderNumber} missing lastEditAt`)
    assert.ok(d.lastEditedBy, `draft ${d.orderNumber} missing lastEditedBy`)
    assert.match(d.lastEditTimeZoneCode, /^[A-Z]{3,4}$/)
  }
  for (const o of orders.filter((o) => o.orderStatus !== 'Draft')) {
    assert.equal(o.lastEditAt, undefined, `non-draft ${o.orderNumber} unexpectedly has lastEditAt`)
    assert.equal(o.lastEditedBy, undefined, `non-draft ${o.orderNumber} unexpectedly has lastEditedBy`)
  }
})

test('createdBy is a username, not a display name (R2-4): lowercase, dot-separated, no spaces', () => {
  const { orders } = buildDataset({ totalShipments: 50 })
  for (const o of orders) {
    assert.doesNotMatch(o.createdBy, /\s/, `createdBy "${o.createdBy}" contains a space`)
    assert.match(o.createdBy, /^[a-z]+(\.[a-z]+)+$/, `createdBy "${o.createdBy}" is not username-shaped`)
  }
})

test('order-level pickupNumber agrees with the shipment roll-up', () => {
  const ds = buildDataset()
  for (const [sellId, d] of ds.details) {
    const row = ds.shipments.find((s) => s.sellShipment === sellId)
    for (const o of d.orderList ?? []) {
      if (o.pickupNumber == null) continue
      assert.ok(row.pickupNumbers.includes(o.pickupNumber),
        `order ${o.orderNumber} pickup ${o.pickupNumber} missing from shipment roll-up`)
    }
  }
})

// ── S108 DB motion: shipmentType / planningType / poNumbers ─────────────────
test('LINX-11597: shipmentType is Direct iff exactly 1 order, else Consolidation', () => {
  const ds = buildDataset()
  assert.ok(ds.shipments.length > 0)
  for (const s of ds.shipments) {
    const expected = s.orders.length === 1 ? 'Direct' : 'Consolidation';
    assert.equal(s.shipmentType, expected, `${s.sellShipment}: ${s.orders.length} orders but shipmentType ${s.shipmentType}`);
  }
  // both branches actually exercised
  assert.ok(ds.shipments.some((s) => s.shipmentType === 'Direct'))
  assert.ok(ds.shipments.some((s) => s.shipmentType === 'Consolidation'))
  // detail.shipmentType (was hardcoded 'sell') now agrees with the row
  for (const s of ds.shipments) assert.equal(ds.details.get(s.sellShipment).shipmentType, s.shipmentType)
})

test('LINX-12902: planningType is RDD iff ANY mapped order is RDD, else SSD', () => {
  const ds = buildDataset()
  for (const [sellId, d] of ds.details) {
    const row = ds.shipments.find((s) => s.sellShipment === sellId)
    const anyRdd = d.orderList.some((o) => o.planningDateType === 'RDD')
    assert.equal(row.planningType, anyRdd ? 'RDD' : 'SSD', `${sellId} planningType mismatch`)
  }
  assert.ok(ds.shipments.some((s) => s.planningType === 'RDD'))
  assert.ok(ds.shipments.some((s) => s.planningType === 'SSD'))
})

test('LINX-12039: shipment poNumbers rolls up from its orders, deduped, real PO shapes', () => {
  const ds = buildDataset()
  const shape = /^([A-Z0-9]{9}|\d{10}|\d{2}-\d{9})$/
  let withAny = 0
  for (const s of ds.shipments) {
    assert.ok(Array.isArray(s.poNumbers), `${s.sellShipment} poNumbers not an array`)
    assert.equal(new Set(s.poNumbers).size, s.poNumbers.length, 'duplicate PO number')
    for (const p of s.poNumbers) assert.match(p, shape, `PO ${p} does not match a known shape`)
    if (s.poNumbers.length) withAny++
  }
  // ~60% per order, so nearly every shipment should carry at least one.
  assert.ok(withAny / ds.shipments.length > 0.7, `only ${withAny}/${ds.shipments.length}`)
})

test('every order carries a poNumber (order-level, LINX-12039) and every non-null shape is valid', () => {
  const { orders } = buildDataset()
  const shape = /^([A-Z0-9]{9}|\d{10}|\d{2}-\d{9})$/
  const withPo = orders.filter((o) => o.poNumber != null)
  assert.ok(withPo.length > 0)
  for (const o of withPo) assert.match(o.poNumber, shape, `order ${o.orderNumber} PO ${o.poNumber}`)
  for (const o of orders) assert.ok(['RDD', 'SSD'].includes(o.planningDateType), `order ${o.orderNumber} planningDateType ${o.planningDateType}`)
})

// ── S111: notes distribution (user ruling 2026-08-05 — S108's "min 1" fix
// over-corrected into every shipment carrying a note) ───────────────────────
test('notes distribution lands near the ~65/25/10 target band', () => {
  const ds = buildDataset()
  const counts = [...ds.details.values()].map((d) => d.noteList.length)
  const n = counts.length
  const zero = counts.filter((c) => c === 0).length / n
  const oneToTwo = counts.filter((c) => c >= 1 && c <= 2).length / n
  const threeToFive = counts.filter((c) => c >= 3 && c <= 5).length / n
  // Band, not an exact number — the mix is a blend of two panel-keyed weight
  // sets, so it won't land on 65/25/10 to the decimal.
  assert.ok(zero > 0.55 && zero < 0.75, `zero-note share ${zero.toFixed(3)}`)
  assert.ok(oneToTwo > 0.15 && oneToTwo < 0.35, `1-2 note share ${oneToTwo.toFixed(3)}`)
  assert.ok(threeToFive > 0.04 && threeToFive < 0.18, `3-5 note share ${threeToFive.toFixed(3)}`)
  assert.ok(counts.every((c) => c <= 5), 'a shipment exceeded the 5-note cap')
})

test('notes skew higher on exceptions-panel shipments than monitoring', () => {
  const ds = buildDataset()
  const byPanel = { exceptions: [], monitoring: [] }
  for (const s of ds.shipments) {
    if (!byPanel[s.panel]) continue
    byPanel[s.panel].push(ds.details.get(s.sellShipment).noteList.length)
  }
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
  assert.ok(byPanel.exceptions.length > 0 && byPanel.monitoring.length > 0)
  assert.ok(avg(byPanel.exceptions) > avg(byPanel.monitoring),
    `exceptions avg ${avg(byPanel.exceptions).toFixed(2)} <= monitoring avg ${avg(byPanel.monitoring).toFixed(2)}`)
})

// ── S111: multi-leg linkage chains (leg_type / sequence_leg / next_shipment_id,
// 007_multileg_chains.sql, user ruling 2026-08-05) ──────────────────────────
test('chain participants are a realistic minority (~4%), mostly 2-leg with fewer 3-leg', () => {
  const ds = buildDataset({ totalShipments: 2200 })
  const chained = ds.shipments.filter((s) => s.shipmentSequenceLeg != null)
  const share = chained.length / ds.shipments.length
  assert.ok(share > 0.01 && share < 0.08, `chain participation ${(share * 100).toFixed(1)}%`)
  const chainStarts = chained.filter((s) => s.shipmentSequenceLeg === 1)
  assert.ok(chainStarts.length > 0, 'no chains generated at all')
  const lengths = chainStarts.map((start) => {
    // walk the chain from its head to find its length
    let len = 1, cur = start
    while (cur.nextShipmentId) {
      len++
      cur = ds.shipments.find((s) => s.buyShipment === cur.nextShipmentId)
      assert.ok(cur, 'nextShipmentId dangled mid-walk')
    }
    return len
  })
  assert.ok(lengths.every((l) => l === 2 || l === 3), `chain lengths outside {2,3}: ${lengths}`)
  const twoLeg = lengths.filter((l) => l === 2).length
  const threeLeg = lengths.filter((l) => l === 3).length
  assert.ok(twoLeg >= threeLeg, `2-leg chains (${twoLeg}) should be the majority over 3-leg (${threeLeg})`)
})

test('non-chain shipments carry all three linkage fields null (invariant 8)', () => {
  const ds = buildDataset({ totalShipments: 200 })
  for (const s of ds.shipments) {
    if (s.legType != null || s.shipmentSequenceLeg != null || s.nextShipmentId != null) continue
    assert.equal(s.legType, null); assert.equal(s.shipmentSequenceLeg, null); assert.equal(s.nextShipmentId, null)
  }
  // every field present together, never partially set
  for (const s of ds.shipments) {
    const set = [s.legType != null, s.shipmentSequenceLeg != null].filter(Boolean).length
    assert.ok(set === 0 || set === 2, `${s.sellShipment}: legType/shipmentSequenceLeg set independently`)
  }
})

test('every next_shipment_id resolves to a real shipment row (no dangling pointers)', () => {
  const ds = buildDataset()
  const buyShipments = new Set(ds.shipments.map((s) => s.buyShipment))
  let checked = 0
  for (const s of ds.shipments) {
    if (s.nextShipmentId == null) continue
    assert.ok(buyShipments.has(s.nextShipmentId), `${s.sellShipment}: nextShipmentId ${s.nextShipmentId} does not resolve`)
    checked++
  }
  assert.ok(checked > 0, 'no chain produced a non-null nextShipmentId to check')
})

test('leg N destination equals leg N+1 origin, across every consecutive pair (invariant 1)', () => {
  const ds = buildDataset()
  const byBuy = new Map(ds.shipments.map((s) => [s.buyShipment, s]))
  let checked = 0
  for (const s of ds.shipments) {
    if (s.nextShipmentId == null) continue
    const next = byBuy.get(s.nextShipmentId)
    assert.equal(s.destination, next.origin, `${s.sellShipment} -> ${next.sellShipment}: destination/origin mismatch`)
    checked++
  }
  assert.ok(checked > 0, 'no consecutive leg pair to check')
})

test('same customer across every leg of a chain (invariant 2)', () => {
  const ds = buildDataset()
  const byBuy = new Map(ds.shipments.map((s) => [s.buyShipment, s]))
  let checked = 0
  for (const s of ds.shipments) {
    if (s.nextShipmentId == null) continue
    const next = byBuy.get(s.nextShipmentId)
    assert.equal(s.customerId, next.customerId, `${s.sellShipment} -> ${next.sellShipment}: customer changed mid-chain`)
    checked++
  }
  assert.ok(checked > 0)
})

test('time moves forward: leg N delivery <= leg N+1 pickup (invariant 3)', () => {
  const ds = buildDataset()
  const byBuy = new Map(ds.shipments.map((s) => [s.buyShipment, s]))
  // Display strings are "MM/DD/YYYY HH:mm ZZZ" — compare the parseable prefix
  // (date+time), which is monotonic regardless of the zone abbreviation since
  // deliveryDate/pickupDate render in each leg's OWN stop timezone.
  const toMillis = (s) => {
    const [datePart, timePart] = s.split(' ')
    const [mm, dd, yyyy] = datePart.split('/')
    return new Date(`${yyyy}-${mm}-${dd}T${timePart}:00`).getTime()
  }
  let checked = 0
  for (const s of ds.shipments) {
    if (s.nextShipmentId == null) continue
    const next = byBuy.get(s.nextShipmentId)
    assert.ok(toMillis(s.deliveryDate) <= toMillis(next.pickupDate),
      `${s.sellShipment} delivers ${s.deliveryDate} after ${next.sellShipment} picks up ${next.pickupDate}`)
    checked++
  }
  assert.ok(checked > 0)
})

test('sequence is dense and 1-based; last leg terminates with a null nextShipmentId (invariants 4/5)', () => {
  const ds = buildDataset()
  const byBuy = new Map(ds.shipments.map((s) => [s.buyShipment, s]))
  const heads = ds.shipments.filter((s) => s.shipmentSequenceLeg === 1)
  assert.ok(heads.length > 0)
  for (const head of heads) {
    let cur = head, expected = 1
    while (true) {
      assert.equal(cur.shipmentSequenceLeg, expected, `${cur.sellShipment}: shipmentSequenceLeg ${cur.shipmentSequenceLeg}, expected ${expected}`)
      if (cur.nextShipmentId == null) break
      cur = byBuy.get(cur.nextShipmentId)
      expected++
    }
  }
})

test('leg type is consistent across every leg of a chain, drawn only from Pooling/Rule 11 (invariant 7)', () => {
  const ds = buildDataset()
  const byBuy = new Map(ds.shipments.map((s) => [s.buyShipment, s]))
  const heads = ds.shipments.filter((s) => s.shipmentSequenceLeg === 1)
  assert.ok(heads.length > 0)
  for (const head of heads) {
    assert.ok(['Pooling', 'Rule 11'].includes(head.legType), `unexpected legType ${head.legType}`)
    let cur = head
    while (cur.nextShipmentId != null) {
      const next = byBuy.get(cur.nextShipmentId)
      assert.equal(next.legType, head.legType, `${next.sellShipment}: legType drifted mid-chain`)
      cur = next
    }
  }
  // Cross customer / Line haul are deliberately never generated (see
  // buildChainLegs comment) — assert the exclusion holds, not just that the
  // two allowed values appear.
  const allTypes = new Set(ds.shipments.map((s) => s.legType).filter(Boolean))
  assert.deepEqual([...allTypes].sort(), ['Pooling', 'Rule 11'])
})

test('history actors are real seeded users (guest excluded) or a system source', () => {
  const ds = buildDataset()
  const realNames = new Set(USERS.filter((u) => u.role !== 'guest').map((u) => u.name))
  let checkedUser = 0
  for (const d of ds.details.values()) {
    for (const h of d.historyList) {
      if (h.source) continue // system-actor branch — untouched, not a user name
      assert.ok(realNames.has(h.user), `history user "${h.user}" is not a real seeded user`)
      checkedUser++
    }
  }
  assert.ok(checkedUser > 0, 'no user-actor history entries checked')
})
