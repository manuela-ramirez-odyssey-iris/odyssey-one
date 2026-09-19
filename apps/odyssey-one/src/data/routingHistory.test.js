import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { deriveRoutingHistory } from './routingHistory.js'
import { formatDateTimeMDYHM } from '../lib/dates.js'

// public/details/*.json — the 2,200 generated shipment details (gitignored,
// present only in a dev checkout). Not committed, so this guard degrades to
// `it.skip` rather than fail when the corpus isn't there.
const DETAILS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public/details')
const DETAIL_FILES = existsSync(DETAILS_DIR)
  ? readdirSync(DETAILS_DIR).filter((f) => f.endsWith('.json'))
  : []

// A shipment that HAS been tendered — one accepted carrier, one that declined.
const detail = (overrides = {}) => ({
  odysseyShipmentIdentifier: 'SHP-B28826319',
  orderDetails: [
    { orderNumber: 'ORD-S2600074M' },
    { orderNumber: 'ORD-JAN7ERCO7' },
    { orderNumber: 'ORD-9KK21LLB2' },
  ],
  droppedCarriers: [
    { scac: 'ODFL', carrierName: 'OLD DOMINION', reason: 'No Rates' },
    { scac: 'RLCA', carrierName: 'R+L CARRIERS', reason: 'Prohibited Carrier' },
  ],
  routingData: {
    options: [
      { rank: 1, routeRank: 1, scac: 'CNWY', carrierName: 'CONWAY FREIGHT', cost: '$804.94', status: 'Accepted', modifyUser: 'George Schultz', carrierPickup: 'ABC12345', proNumber: 'PRO-1', deliveryNum: 'DEL-1' },
      { rank: 2, routeRank: 2, scac: 'JBHT', carrierName: 'J.B. HUNT', cost: '$912.10', status: 'Declined', modifyUser: 'Amy Cook' },
    ],
  },
  // No order change by default — DEC-175 R1 only fires when this is set.
  orderChange: null,
  ...overrides,
})

// DEC-175 R1 — an order-change shipment: the seed's real prior routing
// version, Accepted row (with its acceptance artifacts) included.
const withOrderChange = detail({
  orderChange: {
    priorTenderList: [
      {
        rank: 1, routeRank: 1, scac: 'CNWY', carrierName: 'CONWAY FREIGHT', cost: '$804.94',
        status: 'Accepted', carrierPickup: 'ABC12345', proNumber: 'PRO-1', deliveryNum: 'DEL-1',
        responseDateTime: '09/01/2026 10:00 CDT', responseMethod: 'Manual Update',
        quoteFlag: 'Y', quoteAudit: { by: 'George Schultz' },
      },
      {
        rank: 2, routeRank: 2, scac: 'JBHT', carrierName: 'J.B. HUNT', cost: '$912.10', status: 'Declined',
      },
    ],
    newTenderList: [
      { rank: 1, routeRank: 1, scac: 'CNWY', carrierName: 'CONWAY FREIGHT', cost: '$850.00', status: 'Sent' },
    ],
    droppedCarriers: {
      prior: [{ scac: 'ODFL', carrierName: 'OLD DOMINION', reason: 'No Rates' }],
      new: [],
    },
  },
})

const NEVER_TENDERED = detail({
  routingData: {
    options: [
      { rank: 1, routeRank: 1, scac: 'CNWY', carrierName: 'CONWAY FREIGHT', cost: '$804.94', status: null },
      { rank: 2, routeRank: 2, scac: 'JBHT', carrierName: 'J.B. HUNT', cost: '$912.10', status: '' },
    ],
  },
})

const NOW = new Date('2026-09-14T15:20:00Z')
const derive = (d = detail(), key = 'SHP-B28826319') => deriveRoutingHistory(d, key, NOW)

describe('deriveRoutingHistory (LINX-15895)', () => {
  it('returns nothing for a shipment that has never been tendered', () => {
    // D6 — one routing execution, and it is the current one, which the Tender
    // tab owns. S151 made this state reachable; before it, every shipment
    // looked tendered.
    expect(derive(NEVER_TENDERED)).toEqual([])
  })

  it('returns nothing when routing produced no options at all', () => {
    expect(derive(detail({ routingData: { options: [] } }))).toEqual([])
    expect(derive(detail({ routingData: undefined }))).toEqual([])
    expect(deriveRoutingHistory(undefined, 'k', NOW)).toEqual([])
  })

  it('orders versions newest-first, numbered down to V1', () => {
    const versions = derive()
    expect(versions.length).toBeGreaterThan(0)
    expect(versions.map((v) => v.version)).toEqual(
      versions.map((_, i) => versions.length - i),
    )
    expect(versions.at(-1).version).toBe(1)
  })

  it('anchors the timeline to the shipment\'s own clock, not the wall clock', () => {
    // A wall-clock anchor moves on every refetch — the same version would carry a
    // different timestamp each time the pane remounted.
    const withStamp = detail({
      routingData: {
        options: [
          { rank: 1, routeRank: 1, scac: 'CNWY', cost: '$1.00', status: 'Declined', notifyDateTime: '05/12/2026 09:30 CDT' },
        ],
      },
    })
    const a = deriveRoutingHistory(withStamp, 'K', new Date('2020-01-01T00:00:00Z'))
    const b = deriveRoutingHistory(withStamp, 'K', new Date('2030-01-01T00:00:00Z'))
    expect(a).toEqual(b)
    for (const v of a) expect(new Date(v.routedAt).getTime()).toBeLessThan(Date.UTC(2026, 4, 12, 9, 30))
  })

  it('makes every older version strictly older in time', () => {
    const times = derive().map((v) => new Date(v.routedAt).getTime())
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeLessThan(times[i - 1])
    expect(times[0]).toBeLessThan(NOW.getTime())
  })

  it('accumulates orders with the version number (the AC\'s own example)', () => {
    // V1 -Orders: O1, O2 · V2 -Orders: O1, O2, O3 — so an older version's list
    // is a PREFIX of a newer one's, and never empty.
    const versions = derive()
    for (let i = 0; i < versions.length; i++) {
      const orders = versions[i].orders
      expect(orders.length).toBeGreaterThan(0)
      if (i > 0) {
        const newer = versions[i - 1].orders
        expect(orders.length).toBeLessThanOrEqual(newer.length)
        expect(newer.slice(0, orders.length)).toEqual(orders)
      }
    }
  })

  it('never puts an Accepted tender in a historical version, unless the seed carries the real prior version (D7/DEC-175)', () => {
    // The PERTURBATION path never invents an Accepted row — the only
    // documented route into one is a real prior version, which this fixture
    // (no orderChange) doesn't have. Checked across many keys, not just one
    // lucky draw.
    for (let i = 0; i < 200; i++) {
      for (const v of deriveRoutingHistory(detail(), `SHP-${i}`, NOW)) {
        for (const o of v.options) expect(o.status).not.toBe('Accepted')
      }
    }
  })

  describe('DEC-175 — order-change shipments carry their real prior version', () => {
    it('R1: returns the real prior version verbatim, Accepted row and artifacts included', () => {
      const versions = derive(withOrderChange)
      expect(versions).toHaveLength(1)
      expect(versions[0].version).toBe(1)

      const expectedOptions = withOrderChange.orderChange.priorTenderList.map((o) => ({
        ...o, quoteFlag: undefined, quoteAudit: undefined,
      }))
      expect(versions[0].options).toEqual(expectedOptions)
      expect(versions[0].droppedCarriers).toEqual(withOrderChange.orderChange.droppedCarriers.prior)

      const accepted = versions[0].options.find((o) => o.status === 'Accepted')
      expect(accepted).toBeTruthy()
      expect(accepted.carrierPickup).toBe('ABC12345')
      expect(accepted.proNumber).toBe('PRO-1')
      expect(accepted.deliveryNum).toBe('DEL-1')
    })

    it('R1: no invented versions under the real prior — always exactly one', () => {
      for (let i = 0; i < 50; i++) {
        const versions = deriveRoutingHistory(withOrderChange, `SHP-${i}`, NOW)
        expect(versions).toHaveLength(1)
        expect(versions[0].version).toBe(1)
      }
    })

    it('passes the real prior rows through untouched, seeded response fields included', () => {
      const versions = derive(withOrderChange)
      const accepted = versions[0].options.find((o) => o.status === 'Accepted')
      expect(accepted.responseDateTime).toBe('09/01/2026 10:00 CDT')
      expect(accepted.responseMethod).toBe('Manual Update')
      expect(accepted.quoteFlag).toBeUndefined()
      expect(accepted.quoteAudit).toBeUndefined()
    })

    it('an EMPTY prior list is not a real prior version — falls through to the normal perturbation', () => {
      // orderChange present, but priorTenderList: [] has nothing to show —
      // rendering an empty-table version card is undecided territory
      // (Q-RH-2), so this is NOT R1's path. Must behave identically to the
      // non-order-change fixture for the same key.
      const emptyPrior = detail({
        orderChange: { priorTenderList: [], droppedCarriers: { prior: [], new: [] } },
      })
      expect(derive(emptyPrior)).toEqual(derive(detail()))
    })
  })

  it('R3: no acceptance artifact survives a rewritten (perturbed) status', () => {
    // Prove it fails first (spec item 4): the current code spreads `...option`
    // through unchanged, so the fixture's Accepted-row carrierPickup/proNumber/
    // deliveryNum ride along onto whatever status the perturbation rewrites it
    // to — a Carrier Pickup # for a tender nobody accepted.
    for (let i = 0; i < 100; i++) {
      for (const v of deriveRoutingHistory(detail(), `SHP-${i}`, NOW)) {
        for (const o of v.options) {
          expect(o.carrierPickup).toBeNull()
          expect(o.proNumber).toBeNull()
          expect(o.deliveryNum).toBeNull()
        }
      }
    }
  })

  it('pairs the response fields to the outcome rather than drawing them apart', () => {
    let manual = 0
    for (let i = 0; i < 100; i++) {
      for (const v of deriveRoutingHistory(detail(), `SHP-${i}`, NOW)) {
        for (const o of v.options) {
          const answered = o.status === 'Declined' || o.status === 'Cancelled'
          if (!answered) {
            // Nothing has answered, so nothing about an answer is recorded —
            // null, the same absence the seed writes (not '').
            expect(o.responseUser ?? null).toBeNull()
            expect(o.responseMethod).toBeNull()
            expect(o.responseDateTime).toBeNull()
            expect(o.responseComments).toBeNull()
          } else {
            expect(o.responseComments).toBeTruthy()
            expect(o.responseMethod).toBeTruthy()
            // The response belongs to THIS run, not to the current one the
            // option was read from.
            expect(o.responseDateTime).toBe(
              formatDateTimeMDYHM(new Date(v.routedAt), { utc: true }),
            )
            // `responseUser` is OURS and only a 'Manual Update' has a person
            // behind it — an API/EDI/Automatic update names nobody.
            if (o.responseUser) {
              manual++
              expect(o.responseMethod).toBe('Manual Update')
            }
            // Cancel is our action (LINX-5921), never the carrier's own feed.
            if (o.status === 'Cancelled') {
              expect(['Manual Update', 'Automatic Update']).toContain(o.responseMethod)
            }
          }
          // A quote is a live-screen affordance, never re-offered on history.
          expect(o.quoteFlag).toBeUndefined()
        }
      }
    }
    // The Manual branch is reachable — otherwise the user assertion above is
    // vacuous and a regression that nulled every user would still pass.
    expect(manual).toBeGreaterThan(20)

    // The order-change fixture's real prior rows are NOT perturbed — they
    // pass through untouched, seeded response fields and all (DEC-175 R4).
    const [ocVersion] = derive(withOrderChange)
    const acceptedReal = ocVersion.options.find((o) => o.status === 'Accepted')
    expect(acceptedReal.responseDateTime).toBe('09/01/2026 10:00 CDT')
  })

  it('keeps dropped carriers a non-empty subset when the shipment has any', () => {
    for (const v of derive()) {
      expect(v.droppedCarriers.length).toBeGreaterThan(0)
      expect(v.droppedCarriers.length).toBeLessThanOrEqual(2)
    }
    const none = derive(detail({ droppedCarriers: [] }))
    for (const v of none) expect(v.droppedCarriers).toEqual([])
  })

  it('is deterministic per key and differs across keys', () => {
    expect(derive(detail(), 'A')).toEqual(derive(detail(), 'A'))
    // Not a guarantee for any given pair, but across 20 keys the shapes must
    // not all collapse to one — that would mean the key is not reaching the PRNG.
    const shapes = new Set(
      Array.from({ length: 20 }, (_, i) =>
        JSON.stringify(deriveRoutingHistory(detail(), `K${i}`, NOW).map((v) => [v.version, v.options.map((o) => o.status)])),
      ),
    )
    expect(shapes.size).toBeGreaterThan(1)
  })

  it('never mutates the detail it was handed', () => {
    // The options are the LIVE Tender tab's rows — a derive that wrote through
    // them would rewrite the current routing version's costs and statuses.
    const d = detail()
    const before = JSON.stringify(d)
    const versions = derive(d)
    versions[0].options[0].cost = 'MUTATED'
    versions[0].orders.push('ORD-INJECTED')
    expect(JSON.stringify(d)).toBe(before)
  })

  // Spec item 5 — the one that catches the defect CLASS, not just the fixture:
  // every seeded detail run through the real derive. Builds the VM the way the
  // spec's own snippet does — raw field names, no mapper — so a non-accepted
  // seeded row's `carrierPickup`/`proNumber`/`deliveryNum` stay the seed's real
  // `null` rather than a mapper's '--' placeholder, which would make this guard
  // fire on rows that never claimed an artifact at all.
  ;(DETAIL_FILES.length > 0 ? it : it.skip)(
    'corpus guard — 0 historical rows carry an acceptance artifact under a non-Accepted status, and Accepted is reachable (public/details not present locally: skipped)',
    () => {
      let violations = 0
      let acceptedCount = 0
      for (const file of DETAIL_FILES) {
        const raw = JSON.parse(readFileSync(path.join(DETAILS_DIR, file), 'utf8'))
        const vm = {
          odysseyShipmentIdentifier: raw.odysseyShipmentIdentifier,
          orderDetails: (raw.orderList ?? []).map((o) => ({ orderNumber: o.orderNumber })),
          droppedCarriers: raw.droppedCarrierList ?? [],
          routingData: { options: raw.shippingOptionList ?? [] },
          orderChange: raw.orderChange ?? null,
        }
        const versions = deriveRoutingHistory(vm, vm.odysseyShipmentIdentifier || file)
        for (const v of versions) {
          for (const o of v.options) {
            if (o.status === 'Accepted') {
              acceptedCount++
            } else if (o.carrierPickup != null || o.proNumber != null || o.deliveryNum != null) {
              violations++
            }
          }
        }
      }
      expect(violations).toBe(0)
      expect(acceptedCount).toBeGreaterThan(0)
    },
  )
})
