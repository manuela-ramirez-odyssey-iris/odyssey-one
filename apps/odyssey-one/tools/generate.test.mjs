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

// 2026-08-12 correction: EVERY entry now carries `author` — system entries
// used to have none at all (see HistoryTab.jsx header comment). Renamed and
// rewritten accordingly; still asserts the same ~15% human minority.
test('history entries: every entry carries an author with a kind; human authors carry name+email matching kind, system authors carry no email', () => {
  const { details } = buildDataset({ totalShipments: 100 })
  let humanCount = 0
  let totalCount = 0
  for (const d of details.values()) {
    for (const entry of d.historyList) {
      totalCount++
      assert.ok(entry.author, 'every entry has an author')
      assert.ok(['internal', 'external', 'system'].includes(entry.author.kind), `unexpected kind ${entry.author.kind}`)
      assert.ok(entry.author.name, 'author has a name')
      if (entry.author.kind === 'system') {
        assert.equal(entry.author.email, undefined, 'system author has no email')
        assert.equal(entry.author.name, entry.source, 'system author name reuses source verbatim')
      } else {
        humanCount++
        assert.ok(entry.author.email, 'human author has an email')
        if (entry.author.kind === 'internal') {
          assert.ok(entry.author.email.endsWith('@odysseylogistics.com'), `internal email ${entry.author.email}`)
        } else {
          assert.ok(!entry.author.email.endsWith('@odysseylogistics.com'), `external email ${entry.author.email}`)
        }
      }
    }
  }
  assert.ok(totalCount > 0)
  assert.ok(humanCount > 0, 'some entries are human-authored')
  assert.ok(humanCount / totalCount < 0.5, 'human authorship stays a minority (DEC-80)')
})

// 2026-08-12 gate (S117 carry-forward): human authorship was drawn UNIFORMLY,
// so `Auto Tender Validation` — an event whose own name says a machine did it —
// could be attributed to a named person. Every event in Pappu's catalog is
// machine-emitted (DEC-80 ruling 2) except `Shipment Updated`, which is what a
// user editing the Shipment Details modal causes. Mutation check: adding any
// other action to HUMAN_AUTHORED_ACTIONS turns this red.
test('history authors: only `Shipment Updated` may be human-authored; every machine event is system', () => {
  const { details } = buildDataset({ totalShipments: 300 })
  let humanCount = 0
  for (const d of details.values()) {
    for (const entry of d.historyList) {
      if (entry.author.kind === 'system') continue
      humanCount++
      assert.equal(entry.action, 'Shipment Updated', `machine event "${entry.action}" drew a human author`)
    }
  }
  assert.ok(humanCount > 0, 'human authorship is still reachable after the gate')
})

// DEC-87 (2026-08-12 user ruling): green ('success') was overused — 11 of 15
// catalog events defaulted to it, so a normal shipment's trail was a wall of
// green. Green is now RESERVED for exactly three milestones. Mutation check:
// re-greening any other pipeline event (e.g. reverting its explicit outcome
// argument back to the pushHistory default) turns this red.
test('history outcome: green (success) is reserved for the three DEC-87 milestones; all five outcome values are reachable', () => {
  const MILESTONE_ACTIONS = new Set([
    'Tender Response Received',
    'PGI Response Received',
    'Shipment Planning Completed',
  ])
  const { details } = buildDataset({ totalShipments: 300 })
  const seenOutcomes = new Set()
  for (const d of details.values()) {
    for (const entry of d.historyList) {
      seenOutcomes.add(entry.outcome)
      if (entry.outcome === 'success') {
        assert.ok(MILESTONE_ACTIONS.has(entry.action), `non-milestone action "${entry.action}" emitted outcome 'success'`)
      }
    }
  }
  for (const outcome of ['success', 'failure', 'update', 'neutral', 'info']) {
    assert.ok(seenOutcomes.has(outcome), `outcome '${outcome}' is never reachable in the dataset`)
  }
})

// spotboard/board.js anchors its demo fixtures to REAL seeded sellShipment ids
// and asks by name for a test that they resolve — every row action 404s the
// moment they stop existing. This is that test, and it caught a live staleness
// on 2026-08-12: the 2026-08-11 authorship pass added two faker draws per
// history entry, which re-numbered every shipment allocated after them, so the
// eight ids picked from the S114-era seed were already dead against HEAD.
//
// It MUST build with the seeder's own parameters (seed.mjs:89-92 — 10,000
// shipments, unshippedOrders = 25% + 1000). buildDataset()'s bare default is
// 2,200, and against that dataset the ids are legitimately absent for a reason
// that has nothing to do with drift — a false alarm that is worse than no test.
// board.js is import-clean (no DOM at module scope), so node:test can read the
// ids straight from the source of truth rather than duplicating them here.
const SEED_PARAMS = { totalShipments: 10000, unshippedOrders: 3500 }
test('spotboard demo fixtures still resolve to seeded shipments (id-allocation tripwire)', async () => {
  const { demoFixtureShipmentIds } = await import('../src/spotboard/board.js')
  const seeded = new Set(buildDataset(SEED_PARAMS).shipments.map((s) => s.sellShipment))
  assert.ok(demoFixtureShipmentIds.length > 0)
  for (const id of demoFixtureShipmentIds) {
    assert.ok(seeded.has(id), `demo fixture ${id} is no longer a seeded shipment — re-anchor DEMO_FIXTURES`)
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

// ── LINX-12068 (2026-08-10): Common Structure Rule — delivery stops must sum
// packageCount from their own orders, same as pickup (was hardcoded null).
test('a delivery stop sums package counts from the orders it delivers (LINX-12068)', () => {
  const ds = buildDataset()
  let checked = 0
  for (const [, d] of ds.details) {
    for (const stop of d.shipmentStopList ?? []) {
      if (stop.stopType !== 'delivery') continue
      checked++
      assert.equal(typeof stop.packageCount, 'number', `delivery stop packageCount was ${stop.packageCount}`)
      const expected = d.orderList
        .filter((o) => stop.orderIds.includes(o.orderNumber))
        .reduce((t, o) => t + o.orderLines.reduce((s, l) => s + l.packageCount, 0), 0)
      assert.equal(stop.packageCount, expected)
    }
  }
  assert.ok(checked > 100)
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

// ── S113: rate/rateDetails.baseRate invariant (RoutingGuideTab.jsx:814 derives
// the Rate column from rateDetails.baseRate, so the generator must agree) ──
test('routing option rateAmount equals its own rateDetails.baseRate', () => {
  const ds = buildDataset()
  let checked = 0
  for (const d of ds.details.values()) {
    for (const opt of d.shippingOptionList ?? []) {
      assert.equal(opt.rateAmount, opt.rateDetails.baseRate, `option ${opt.scac} rateAmount vs baseRate`)
      checked++
    }
  }
  assert.ok(checked > 0, 'no routing options checked')
})

// ── DEC-80 Shipment Trail rebuild (S114) ────────────────────────────────────
// Supersedes the pre-DEC-80 test 'history actors are real seeded users (guest
// excluded) or a system source': that test asserted ~75% of entries carry a
// REAL USER name (checkedUser > 0 on the non-source branch). DEC-80 ruling 2
// inverts that ratio to 100% system/integrated-application — under the new
// generator every entry has `source` set, so the old assertion's `continue`
// would skip every entry and `checkedUser` would stay 0, failing on its own
// final `assert.ok(checkedUser > 0, ...)`. Replaced outright rather than
// patched, per the "report every broken assertion, then update it" rule.

// Mirrors HISTORY_SYSTEM_SOURCES in generate.mjs (not exported — this is the
// generator's private literal, duplicated here deliberately so a future
// unreviewed addition to that array shows up as a test diff, not a silent
// pass).
const HISTORY_SYSTEM_SOURCES = ['ERP', 'UI', 'Legacy TMS', 'Linx', 'Net Native']

// The MVP catalog's 15 event names (vault/10-domains/shipments/data/
// history-event-catalog.md), in the pipeline order this generator emits them
// — a subsequence per shipment, gated on real state, but never out of order.
const PIPELINE_ORDER = [
  'Shipment Created', 'Routing Completed', 'Optimization Evaluation',
  'Consolidation Completed', 'Routing & Rating Completed', 'Ready for Tender',
  'Auto Tender Validation', 'Tender Sent', 'Tender Response Received',
  'Shipment Planning Completed', 'Planned Shipment Sent', 'PGI Response Received',
  'Post PGI Rating Completed', 'Shipment Updated', 'Shipment Update Notification',
]

test('history events are limited to the MVP catalog vocabulary — no user-centric leftovers, no Quote Entered', () => {
  const ds = buildDataset({ totalShipments: 300 })
  const allowed = new Set(PIPELINE_ORDER)
  let checked = 0
  for (const d of ds.details.values()) {
    for (const h of d.historyList) {
      assert.ok(allowed.has(h.action), `"${h.action}" is not in the MVP catalog (or is a dropped legacy action)`)
      assert.notEqual(h.action, 'Quote Entered', 'Quote Entered must be dropped per DEC-80 ruling 3')
      checked++
    }
  }
  assert.ok(checked > 0, 'no history entries checked')
})

test('history entries are strictly time-ordered and follow the catalog pipeline order', () => {
  const ds = buildDataset({ totalShipments: 300 })
  let checked = 0
  for (const d of ds.details.values()) {
    let prevTs = -Infinity
    let prevRank = -1
    for (const h of d.historyList) {
      const ts = new Date(h.timestamp).getTime()
      assert.ok(ts > prevTs, `entry "${h.action}" timestamp did not strictly increase`)
      const rank = PIPELINE_ORDER.indexOf(h.action)
      assert.ok(rank >= prevRank, `"${h.action}" (rank ${rank}) appears out of pipeline order after rank ${prevRank}`)
      prevTs = ts
      prevRank = rank
      checked++
    }
  }
  assert.ok(checked > 0, 'no history entries checked')
})

test('history actors are always system or an integrated application — never user-attributed', () => {
  const ds = buildDataset({ totalShipments: 300 })
  let checked = 0
  for (const d of ds.details.values()) {
    for (const h of d.historyList) {
      assert.ok(h.source, `entry "${h.action}" has no source — DEC-80 ruling 2 requires system/integrated-app actor for every entry`)
      assert.ok(HISTORY_SYSTEM_SOURCES.includes(h.source), `"${h.source}" is not a recognized system/integrated-application source`)
      assert.equal(h.user, h.source, 'user field must mirror the system/integrated-app source, never a human name')
      checked++
    }
  }
  assert.ok(checked > 0, 'no history entries checked')
})

test('no Tender Response Received while a tender is still in-progress (Sent, not yet Accepted)', () => {
  const ds = buildDataset({ totalShipments: 300 })
  let checkedInProgress = 0
  for (const s of ds.shipments) {
    if (s.tenderStatus !== 'Sent') continue // Accepted or a failed/declined outcome — different branch
    const d = ds.details.get(s.sellShipment)
    const hasResponse = d.historyList.some((h) => h.action === 'Tender Response Received')
    assert.equal(hasResponse, false, `shipment ${s.buyShipment} is still Sent (no response yet) but has a Tender Response Received entry`)
    const hasSent = d.historyList.some((h) => h.action === 'Tender Sent')
    assert.ok(hasSent, `shipment ${s.buyShipment} is Sent but has no Tender Sent entry`)
    checkedInProgress++
  }
  assert.ok(checkedInProgress > 0, 'no in-progress (Sent) shipments found to check — widen totalShipments if this flakes')
})

// The highest-value coherence check: every identifier a history `details`
// string names (buy/sell shipment #, order #, carrier name) is parsed back
// out of OUR OWN templates and checked against THAT shipment's real data —
// not the global pool. This is what would have caught the pre-rebuild bug
// class (`pick(CARRIERS)` naming a carrier the shipment never tendered).
test('history coherence: every identifier named in details belongs to that shipment', () => {
  const ds = buildDataset({ totalShipments: 300 })
  let checkedShipmentCreated = 0
  let checkedConsolidation = 0
  let checkedTenderSent = 0
  let checkedTenderResponse = 0
  let checkedCarrierConsistency = 0

  function parseOxfordList(str) {
    if (str.includes(', and ')) {
      const parts = str.split(', ')
      const last = parts.pop().replace(/^and /, '')
      return [...parts, last]
    }
    if (str.includes(' and ')) return str.split(' and ')
    return [str]
  }

  for (const s of ds.shipments) {
    const d = ds.details.get(s.sellShipment)
    const orderIds = new Set(d.orderList.map((o) => o.orderNumber))
    const carrierNames = new Set(d.shippingOptionList.map((o) => o.carrierName))
    const byAction = Object.fromEntries(d.historyList.map((h) => [h.action, h]))

    const created = byAction['Shipment Created']
    if (created) {
      const m = created.details.match(/^Buy Shipment (\S+) and Sell Shipment (\S+) created successfully for Order (\S+)\.$/)
      assert.ok(m, `Shipment Created details didn't match the catalog template: "${created.details}"`)
      assert.equal(m[1], s.buyShipment, `Shipment Created named the wrong buy shipment`)
      assert.equal(m[2], s.sellShipment, `Shipment Created named the wrong sell shipment`)
      assert.ok(orderIds.has(m[3]), `Shipment Created named order "${m[3]}" which isn't one of this shipment's own orders`)
      checkedShipmentCreated++
    }

    const consolidation = byAction['Consolidation Completed']
    if (consolidation) {
      const m = consolidation.details.match(/^Consolidation completed\. Final Shipment (\S+) contains Orders (.+)\.$/)
      assert.ok(m, `Consolidation Completed details didn't match the catalog template: "${consolidation.details}"`)
      assert.equal(m[1], s.buyShipment, 'Consolidation Completed named the wrong final shipment')
      const namedOrders = parseOxfordList(m[2])
      assert.deepEqual([...namedOrders].sort(), [...orderIds].sort(), 'Consolidation Completed order list does not exactly match this shipment\'s real orders')
      checkedConsolidation++
    }

    const tenderSent = byAction['Tender Sent']
    if (tenderSent) {
      const m = tenderSent.details.match(/^Tender status updated to Sent\. Tender sent to carrier (.+) via (.+)\.$/)
      assert.ok(m, `Tender Sent details didn't match the catalog template: "${tenderSent.details}"`)
      assert.ok(carrierNames.has(m[1]), `Tender Sent named carrier "${m[1]}" which this shipment never tendered to`)
      checkedTenderSent++
    }

    const tenderResponse = byAction['Tender Response Received']
    if (tenderResponse && tenderResponse.details.startsWith('Tender response received')) {
      const m = tenderResponse.details.match(/^Tender response received from carrier (.+) via (.+)\. Tender status updated to (Accepted|Declined)\.$/)
      assert.ok(m, `Tender Response Received details didn't match the catalog template: "${tenderResponse.details}"`)
      assert.ok(carrierNames.has(m[1]), `Tender Response Received named carrier "${m[1]}" which this shipment never tendered to`)
      checkedTenderResponse++
      if (tenderSent) {
        const sentCarrier = tenderSent.details.match(/carrier (.+) via/)[1]
        assert.equal(m[1], sentCarrier, 'Tender Sent and Tender Response Received named different carriers on the same shipment')
        checkedCarrierConsistency++
      }
    }
  }

  assert.ok(checkedShipmentCreated > 0, 'no Shipment Created entries checked')
  assert.ok(checkedConsolidation > 0, 'no Consolidation Completed entries checked — widen totalShipments if this flakes')
  assert.ok(checkedTenderSent > 0, 'no Tender Sent entries checked')
  assert.ok(checkedTenderResponse > 0, 'no Tender Response Received (named-carrier) entries checked')
  assert.ok(checkedCarrierConsistency > 0, 'no same-carrier Tender Sent/Response Received pairs checked')
})

// ── Failure-scenario pass (2026-08-10, same-day follow-up to DEC-80) ───────
// Mirrors VALIDATION_ERROR_STATUSES in generate.mjs (not exported — see the
// same duplication rationale already used above for I10, line 28).
const VALIDATION_ERROR_STATUSES = ['Planning Failed', 'Shipment Failed']

test('every history entry carries a valid outcome (success | failure | update | neutral | info)', () => {
  const ds = buildDataset({ totalShipments: 300 })
  const allowed = new Set(['success', 'failure', 'update', 'neutral', 'info']) // DEC-87 adds 'info'
  let checked = 0
  for (const d of ds.details.values()) {
    for (const h of d.historyList) {
      assert.ok(allowed.has(h.outcome), `"${h.action}" has invalid outcome "${h.outcome}"`)
      checked++
    }
  }
  assert.ok(checked > 0, 'no history entries checked')
})

// DEC-81 follow-up (2026-08-10 user ruling): a real carrier Decline is a
// completed-but-unfavourable business outcome — the response arrived and was
// recorded (not a failure), but it's negative (not a plain success), and
// these are exactly the ~2,824/8,541 shipments that land in Review. Was
// outcome: 'success' (bare green) until this ruling; now 'neutral' (amber).
// The Accepted variant (still 'success') and the no-response timeout variant
// (still 'failure' — nothing arrived at all) are UNCHANGED and asserted
// alongside so this can't pass by accident if all three collapsed to one
// value.
test('Tender Response Received: Declined is neutral, timeout stays failure, Accepted stays success', () => {
  const ds = buildDataset({ totalShipments: 1500 })
  let sawDeclined = false
  let sawTimeout = false
  let sawAccepted = false
  for (const d of ds.details.values()) {
    for (const h of d.historyList) {
      if (h.action !== 'Tender Response Received') continue
      if (h.details.endsWith('Tender status updated to Declined.')) {
        sawDeclined = true
        assert.strictEqual(h.outcome, 'neutral', `Declined "Tender Response Received" entry has outcome "${h.outcome}", expected "neutral"`)
      } else if (h.details === 'No carrier response received. Tender timed out and was automatically declined.') {
        sawTimeout = true
        assert.strictEqual(h.outcome, 'failure', `timeout "Tender Response Received" entry has outcome "${h.outcome}", expected "failure"`)
      } else if (h.details.endsWith('Tender status updated to Accepted.')) {
        sawAccepted = true
        assert.strictEqual(h.outcome, 'success', `Accepted "Tender Response Received" entry has outcome "${h.outcome}", expected "success"`)
      }
    }
  }
  assert.ok(sawDeclined, 'no Declined "Tender Response Received" entry found — widen totalShipments if this flakes')
  assert.ok(sawTimeout, 'no timeout "Tender Response Received" entry found — widen totalShipments if this flakes')
  assert.ok(sawAccepted, 'no Accepted "Tender Response Received" entry found — widen totalShipments if this flakes')
})

test('failure and update variants actually occur across the dataset', () => {
  // Widened beyond 300 — several failure variants are gated on a ~15-20%
  // slice of the ~30% Review population, so a small sample can legitimately
  // draw zero. 1500 keeps the suite fast while making that implausible.
  const ds = buildDataset({ totalShipments: 1500 })
  const failureDetailsSeen = new Set()
  const updateDetailsSeen = new Set()
  for (const d of ds.details.values()) {
    for (const h of d.historyList) {
      if (h.outcome === 'failure') failureDetailsSeen.add(h.action)
      if (h.outcome === 'update') updateDetailsSeen.add(h.action)
    }
  }
  // Every failure-carrying action from the catalog pass must show up at least once.
  for (const action of ['Shipment Created', 'Routing Completed', 'Optimization Evaluation', 'Auto Tender Validation', 'Tender Response Received', 'PGI Response Received', 'Shipment Update Notification']) {
    assert.ok(failureDetailsSeen.has(action), `no failure-outcome "${action}" entry found anywhere in the dataset`)
  }
  assert.ok(updateDetailsSeen.has('Shipment Updated'), 'no update-outcome "Shipment Updated" entry found anywhere in the dataset')
  // Both Shipment Updated variants (Transportation / Non-Transportation Relevant) must appear.
  let sawTransportRelevant = false
  let sawNonTransportRelevant = false
  for (const d of ds.details.values()) {
    for (const h of d.historyList) {
      if (h.action !== 'Shipment Updated') continue
      if (h.details.includes('(Transportation Relevant)')) sawTransportRelevant = true
      if (h.details.includes('(Non-Transportation Relevant)')) sawNonTransportRelevant = true
    }
  }
  assert.ok(sawTransportRelevant, 'Transportation Relevant Shipment Updated variant never seen')
  assert.ok(sawNonTransportRelevant, 'Non-Transportation Relevant Shipment Updated variant never seen')
})

// Cross-tab coherence check (2026-08-10, coordinator-flagged bug): routing
// options (tender rows the Tender tab renders) are generated UNCONDITIONALLY
// for every shipment — routingCount is always 3-6, never 0, and this is
// confirmed against real data (Neon: every Review-terminal shipment has 3+
// tender rows, minimum 3). That means Routing Completed / Optimization
// Evaluation / Auto Tender Validation can NEVER be a shipment's real terminal
// failure — every shipment demonstrably reached tendering. If one of these
// three ever shows outcome:'failure' with no matching non-failure retry for
// the same action, the trail would say "moved to Review" at a stage this
// shipment's own tender data proves it passed — exactly the cross-tab
// contradiction this rebuild exists to remove. This is the highest-value
// check in the file for that reason: it fails loudly the moment any of these
// three is (re)modeled as a terminal event instead of TRANSIENT.
//
// DEC-87 update (2026-08-12): the successful retry's outcome is no longer
// always 'success' — Routing Completed and Auto Tender Validation's success
// variants are now 'update' (DEC-87 reserves 'success' for the three
// milestones), and Optimization Evaluation's success variant is 'update'
// (Consolidation branch) or 'neutral' (Hold branch). The assertion below
// checks "the retry resolved to something other than another failure" —
// the transient-retry claim this test exists to prove — rather than
// hardcoding the specific non-failure outcome, which now varies by action.
test('Routing/Optimization/Auto-Tender failures are TRANSIENT only — every shipment reaches tendering, so none of the three can be terminal', () => {
  const ds = buildDataset({ totalShipments: 1500 })
  const TRANSIENT_ONLY_ACTIONS = ['Routing Completed', 'Optimization Evaluation', 'Auto Tender Validation']
  let checkedFailures = 0
  for (const s of ds.shipments) {
    const d = ds.details.get(s.sellShipment)
    assert.ok(d.shippingOptionList.length >= 3, `shipment ${s.buyShipment} has fewer than 3 tender rows — contradicts the real tender-data floor`)
    assert.ok(d.historyList.some((h) => h.action === 'Tender Sent'), `shipment ${s.buyShipment} has tender rows but no "Tender Sent" history entry`)
    for (const action of TRANSIENT_ONLY_ACTIONS) {
      const entries = d.historyList.filter((h) => h.action === action)
      if (!entries.some((h) => h.outcome === 'failure')) continue
      checkedFailures++
      assert.ok(entries.some((h) => h.outcome !== 'failure'), `shipment ${s.buyShipment} has a "${action}" failure with no matching successful retry — reads as terminal, contradicting its own tender data`)
    }
  }
  assert.ok(checkedFailures > 0, 'no transient routing/optimization/auto-tender failures found — widen totalShipments if this flakes')
})

test('PGI validation-errors variant only appears on shipments that actually carry a validation-error order', () => {
  const ds = buildDataset({ totalShipments: 1500 })
  let checked = 0
  for (const s of ds.shipments) {
    const d = ds.details.get(s.sellShipment)
    const pgiError = d.historyList.find((h) => h.action === 'PGI Response Received' && h.outcome === 'failure')
    if (!pgiError) continue
    const orderIds = d.orderList.map((o) => o.orderNumber)
    const ownOrders = ds.orders.filter((o) => orderIds.includes(o.orderNumber))
    assert.ok(ownOrders.length > 0, `shipment ${s.buyShipment} has a PGI-errors entry but no matching order rows found`)
    assert.ok(ownOrders.every((o) => VALIDATION_ERROR_STATUSES.includes(o.orderStatus)), `shipment ${s.buyShipment} has a PGI-errors entry but its orders aren't in a validation-error status`)
    checked++
  }
  assert.ok(checked > 0, 'no PGI-errors entries found — widen totalShipments if this flakes')
})

test('tender-timeout variant never coexists with a real carrier response (Accepted or Declined) on the same shipment', () => {
  const ds = buildDataset({ totalShipments: 1500 })
  let checked = 0
  for (const s of ds.shipments) {
    const d = ds.details.get(s.sellShipment)
    const timeout = d.historyList.find((h) => h.action === 'Tender Response Received' && h.outcome === 'failure')
    if (!timeout) continue
    const statuses = d.shippingOptionList.map((o) => o.status)
    assert.ok(!statuses.includes('Accepted'), `shipment ${s.buyShipment} has a tender-timeout entry but also an Accepted routing option`)
    assert.ok(!statuses.includes('Declined'), `shipment ${s.buyShipment} has a tender-timeout entry but also a Declined routing option`)
    checked++
  }
  assert.ok(checked > 0, 'no tender-timeout entries found — widen totalShipments if this flakes')
})

// ── LINX-13953: Dropped Carrier list ────────────────────────────────────────
test('LINX-13953: droppedCarrierList matches the real routing payload shape', () => {
  const ds = buildDataset({ totalShipments: 200 })
  let seenWithDrops = 0
  const codesSeen = new Set()

  for (const [, d] of ds.details) {
    const dropped = d.droppedCarrierList ?? []
    if (dropped.length === 0) continue
    seenWithDrops++

    const tenderScacs = new Set((d.shippingOptionList ?? []).map((o) => o.scac))
    for (const dc of dropped) {
      // disjoint from the tender list — otherwise 13954's duplicate rule fires on every row
      assert.ok(!tenderScacs.has(dc.scac), `${dc.scac} is in BOTH lists`)

      // the five routing actually returns, plus the two we look up
      assert.ok(dc.scac && dc.equipmentCode && dc.reason)
      assert.equal(typeof dc.dropCode, 'number')
      assert.ok(dc.carrierName, 'carrier name is looked up by SCAC (13397 §2)')
      assert.ok(dc.reasonDescription, 'description is looked up by dropCode (TMS)')
      codesSeen.add(dc.dropCode)

      // These WERE all asserted null — routing sends none of them for a dropped
      // carrier, so the seed mirrored that exactly. Superseded 2026-08-18 by an
      // explicit user ruling: the detail table rendered as fourteen dashes and
      // the feature could not be reviewed on screen, so the values are invented
      // for now. The old note asked for a deliberate update rather than a silent
      // loosening — this is it.
      //
      // What survives is the SHAPE. Whether each field is present is a
      // dependency-chain question, asserted in its own test below; here we only
      // insist that a present value is the right kind of thing.
      for (const [field, kind] of [['routeRank', 'number'], ['rpcId', 'number'], ['ttId', 'number'],
                                   ['commitment', 'number'], ['accepted', 'number'], ['open', 'number'],
                                   ['startDate', 'string'], ['stopDate', 'string'],
                                   ['transitTime', 'string'], ['transitSource', 'string'],
                                   ['routeGroup', 'string'], ['uom', 'string'],
                                   ['comment', 'string'], ['cvcId', 'string'],
                                   ['pickupDateTime', 'string'], ['deliveryDateTime', 'string']]) {
        if (dc[field] != null) assert.equal(typeof dc[field], kind, `${field} has the wrong type`)
      }

      // the two flag fields have no '--' state — always a real boolean
      assert.equal(typeof dc.orderEquipment, 'boolean')
      assert.equal(typeof dc.indirectPoint, 'boolean')
    }
  }

  assert.ok(seenWithDrops > 20, `only ${seenWithDrops}/200 shipments had dropped carriers`)
  // all three real drop codes should show up across 200 shipments
  assert.deepEqual([...codesSeen].sort((a, b) => a - b), [1, 2, 23])
})

test('LINX-13953: the dropped list can outnumber the tender list, as in the real payload', () => {
  // The sample had 11 dropped vs 7 qualified. A generator that always produces
  // a short dropped list would hide the layout problem that creates.
  const ds = buildDataset({ totalShipments: 200 })
  let sawBigger = 0
  for (const [, d] of ds.details) {
    const dropped = (d.droppedCarrierList ?? []).length
    const usable = (d.shippingOptionList ?? []).length
    if (dropped > usable) sawBigger++
  }
  assert.ok(sawBigger > 0, 'no shipment ever had more dropped carriers than tender options')
})

test('LINX-13953: dropped carriers are deterministic across builds', () => {
  const a = buildDataset({ totalShipments: 50 })
  const b = buildDataset({ totalShipments: 50 })
  const first = a.shipments[0].sellShipment
  assert.deepEqual(
    a.details.get(first).droppedCarrierList,
    b.details.get(first).droppedCarrierList,
  )
})

// The seeded values are invented (user ruling, 2026-08-18 — the detail table
// rendered as fourteen dashes and could not be reviewed), but they are NOT
// independent draws. Each chain below encodes a rule from 13953/13397, and
// breaking one seeds a state routing cannot produce. This is the check that
// goes red if a future edit widens the seeding without honouring them.
test('LINX-13953: seeded dropped-carrier values keep their dependency chains', () => {
  const ds = buildDataset({ totalShipments: 120 })
  const rows = [...ds.details.values()].flatMap((d) => d.droppedCarrierList ?? [])
  assert.ok(rows.length > 100, `too few dropped rows to be meaningful: ${rows.length}`)

  for (const r of rows) {
    // Chain 1 — drop-code 23 IS the absent transit data, so the fields that
    // derive from transit must be absent for exactly that code, and present
    // otherwise. 13954's manual-dates dialog branches on the same code.
    if (r.dropCode === 23) {
      for (const k of ['transitTime', 'transitSource', 'ttId', 'pickupDateTime', 'deliveryDateTime'])
        assert.equal(r[k], null, `${r.scac}: code 23 must not carry ${k}`)
    } else {
      assert.ok(r.transitTime, `${r.scac}: routable carrier is missing transitTime`)
      assert.ok(r.pickupDateTime && r.deliveryDateTime, `${r.scac}: routable carrier is missing dates`)
    }

    // Chain 2 — RPC-ID is the lookup key for Start Date, Stop Date and Route
    // Group (13397 §7/§8), and Route Rank rides with it. All four present or
    // all four absent; never a lookup result without its key.
    //
    // Route Rank being nullable is Jana's own ruling (2026-08-18): "Route Rank
    // can be empty but Rank will not be empty." Do not re-tighten this to
    // always-present without a ruling that reverses his.
    const hasRpc = r.rpcId != null
    for (const k of ['routeRank', 'startDate', 'stopDate', 'routeGroup'])
      assert.equal(r[k] != null, hasRpc, `${r.scac}: ${k} disagrees with rpcId`)

    // Chain 3 — commitment hangs off the CVC ID, and Accepted + Open are two
    // halves of Commitment ("utilization" / "remaining capacity"), so they
    // cannot drift apart. A CVC ID alone must NOT produce them (AC, verbatim).
    if (r.commitment != null) {
      assert.ok(r.cvcId, `${r.scac}: commitment without a cvcId`)
      assert.equal(r.accepted + r.open, r.commitment, `${r.scac}: accepted+open != commitment`)
    } else {
      for (const k of ['accepted', 'open', 'uom'])
        assert.equal(r[k], null, `${r.scac}: ${k} orphaned without a commitment`)
    }
  }

  // Both states of every optional chain must actually OCCUR, or the '--' path
  // (and the affirmative flag state) is unreachable on screen — which is the
  // bug this seeding pass existed to fix, in reverse.
  const some = (f) => rows.some(f)
  assert.ok(some((r) => r.rpcId != null) && some((r) => r.rpcId == null), 'rpcId is not exercised both ways')
  assert.ok(some((r) => r.routeRank == null), 'routeRank is never empty — Jana ruled it CAN be')
  assert.ok(some((r) => r.commitment != null) && some((r) => r.commitment == null), 'commitment is not exercised both ways')
  assert.ok(some((r) => r.cvcId != null && r.commitment == null), 'the CVC-ID-without-commitment gate is unreachable')
  assert.ok(some((r) => r.orderEquipment) && some((r) => !r.orderEquipment), 'orderEquipment is not exercised both ways')
  assert.ok(some((r) => r.indirectPoint) && some((r) => !r.indirectPoint), 'indirectPoint is not exercised both ways')
})

// I4 (revised 2026-08-19, user): the shipment instant is the order window's
// LATE EDGE, not its middle. The order guarantees exactly one late date via the
// Planning Date Type anchor (LINX-7586/7587/7822; PRD 2365915159) while
// EARLIEST is optional on both sides, so a plain shipment date must default off
// LATEST — and SpotBoardTab seeds its carrier rows from exactly these fields
// (`orderDetails[].latestPickup/latestDelivery`, which mapSellShipmentOutToDetail
// resolves from requestedShipDate/requestedDeliveryDate).
test('I4: shipment pickup/delivery === the order LATEST (requested) dates, and earliest never exceeds it', () => {
  const ds = buildDataset({ totalShipments: 120 })
  let checked = 0
  for (const s of ds.shipments) {
    const detail = ds.details.get(s.sellShipment)
    for (const o of detail.orderList ?? []) {
      if (!o.requestedShipDate) continue
      checked++
      // late edge, exactly
      assert.equal(o.requestedShipDate, s.pickupDate,
        `requestedShipDate must equal the shipment pickup for ${s.sellShipment}`)
      assert.equal(o.requestedDeliveryDate, s.deliveryDate,
        `requestedDeliveryDate must equal the shipment delivery for ${s.sellShipment}`)
      // and the scheduled (earliest) edge never runs past it
      assert.ok(Date.parse(o.scheduledShipDate) <= Date.parse(o.requestedShipDate),
        `scheduledShipDate must not exceed requestedShipDate for ${s.sellShipment}`)
      assert.ok(Date.parse(o.scheduledDeliveryDate) <= Date.parse(o.requestedDeliveryDate),
        `scheduledDeliveryDate must not exceed requestedDeliveryDate for ${s.sellShipment}`)
    }
  }
  assert.ok(checked > 0, 'expected at least one order with dates')
})
