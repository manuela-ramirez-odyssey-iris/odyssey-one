import { describe, it, expect } from 'vitest'
import { buildOverflowRows, FLAG_LABELS } from './carrierList'

// Mirrors the real getLookupOptions('carrier') pool shape ({value, label,
// meta: {mode}}) — a mix of TL/LTL carriers plus one (DNU) entry, covering
// every SCAC these tests reference.
const carrierOptions = [
  { value: 'KNGT', label: 'KNGT - Knight-Swift Transportation', meta: { mode: 'TL' } },
  { value: 'SCNN', label: 'SCNN - Schneider National', meta: { mode: 'TL' } },
  { value: 'JBHT', label: 'JBHT - J.B. Hunt Transport', meta: { mode: 'TL' } },
  { value: 'WERN', label: 'WERN - Werner Enterprises', meta: { mode: 'TL' } },
  { value: 'CRST', label: 'CRST - CRST International', meta: { mode: 'TL' } },
  { value: 'SWFT', label: 'SWFT - Swift Transportation', meta: { mode: 'TL' } },
  { value: 'PRIJ', label: 'PRIJ - Prime Inc', meta: { mode: 'TL' } },
  { value: 'ODFL', label: 'ODFL - Old Dominion Freight Line', meta: { mode: 'LTL' } },
  { value: 'SAIA', label: 'SAIA - Saia LTL Freight', meta: { mode: 'LTL' } },
  { value: 'ABFS', label: 'ABFS - ABF Freight System', meta: { mode: 'LTL' } },
  { value: 'AACT', label: 'AACT - AAA Cooper Transportation', meta: { mode: 'LTL' } },
  { value: 'EXLA', label: 'EXLA - Estes Express Lines', meta: { mode: 'LTL' } },
  { value: 'FXFE', label: 'FXFE - FedEx Freight', meta: { mode: 'LTL' } },
  { value: 'SEFL', label: 'SEFL - Southeastern Freight Lines', meta: { mode: 'LTL' } },
  { value: 'TAPT', label: 'TAPT - (DNU) Glen Tay Trans', meta: { mode: 'TL' } },
]

function shipmentWith({ orderNumber = 'TEST-001', options = [], dropped = [] } = {}) {
  return {
    orderDetails: [{ orderNumber }],
    routingData: { options },
    droppedCarriers: dropped,
  }
}

describe('buildOverflowRows', () => {
  it('flags a Declined route-guide carrier Routed + Declined, unselected by default', () => {
    const shipment = shipmentWith({
      options: [{ scac: 'PRIJ', carrierName: 'Prime Inc', equipment: 'Van', status: 'Declined' }],
    })
    const row = buildOverflowRows(shipment, carrierOptions).find((r) => r.scac === 'PRIJ')
    expect(row.flags).toEqual(['Routed', 'Declined'])
    expect(row.incl).toBe(false)
    expect(row.listId).toBe('TL')
    expect(row.equipment).toBe('Van')
  })

  it('flags a null/Cancelled-status route-guide carrier Routed + No Response', () => {
    for (const status of [null, 'Cancelled']) {
      const shipment = shipmentWith({
        options: [{ scac: 'ODFL', carrierName: 'Old Dominion', equipment: 'LTL', status }],
      })
      const row = buildOverflowRows(shipment, carrierOptions).find((r) => r.scac === 'ODFL')
      expect(row.flags).toEqual(['Routed', 'No Response'])
      expect(row.incl).toBe(false)
    }
  })

  it('flags a dropped carrier Routed + its drop reason, unselected by default', () => {
    const shipment = shipmentWith({
      dropped: [{ scac: 'SWFT', carrierName: 'Swift', equipment: 'Van', reason: 'No Rates' }],
    })
    const row = buildOverflowRows(shipment, carrierOptions).find((r) => r.scac === 'SWFT')
    expect(row.flags).toEqual(['Routed', 'No Rates'])
    expect(row.incl).toBe(false)
    expect(row.listId).toBe('TL')
  })

  it('a dropped carrier with no reason on the wire falls back to Routed + No Response', () => {
    const shipment = shipmentWith({
      dropped: [{ scac: 'SWFT', carrierName: 'Swift', equipment: 'Van', reason: '--' }],
    })
    const row = buildOverflowRows(shipment, carrierOptions).find((r) => r.scac === 'SWFT')
    expect(row.flags).toEqual(['Routed', 'No Response'])
  })

  it('a carrier in BOTH routingData.options and droppedCarriers is listed once — routing wins', () => {
    const shipment = shipmentWith({
      options: [{ scac: 'PRIJ', carrierName: 'Prime Inc', equipment: 'Van', status: 'Declined' }],
      dropped: [{ scac: 'PRIJ', carrierName: 'Prime Inc', equipment: 'Van', reason: 'No Rates' }],
    })
    const rows = buildOverflowRows(shipment, carrierOptions).filter((r) => r.scac === 'PRIJ')
    expect(rows).toHaveLength(1)
    expect(rows[0].flags).toEqual(['Routed', 'Declined'])
  })

  it('overflow additions (not in the route guide) arrive selected and unflagged', () => {
    const shipment = shipmentWith({
      options: [{ scac: 'PRIJ', carrierName: 'Prime Inc', equipment: 'Van', status: 'Declined' }],
    })
    const rows = buildOverflowRows(shipment, carrierOptions)
    const overflow = rows.filter((r) => r.scac !== 'PRIJ')
    expect(overflow.length).toBeGreaterThan(0)
    for (const r of overflow) {
      expect(r.incl).toBe(true)
      expect(r.flags).toEqual([])
    }
  })

  it('defaults a row\'s equipment off its mode when the routing/dropped record carries none', () => {
    const shipment = shipmentWith({
      options: [{ scac: 'PRIJ', carrierName: 'Prime Inc', status: 'Declined' }], // no equipment
    })
    const row = buildOverflowRows(shipment, carrierOptions).find((r) => r.scac === 'PRIJ')
    expect(row.equipment).toBe('Van') // TL mode default
  })

  it('resolves name and mode straight off the route record when the SCAC is absent from the master pool', () => {
    // Routing/dropped carriers are seeded from a smaller, separate pool
    // (tools/generate.mjs) than the master carrier pool (master-data.js) — a
    // route-guide participant can legitimately miss the pool.
    const shipment = shipmentWith({
      options: [{ scac: 'CTNS', carrierName: 'Continental Transportation', equipment: 'LTL', status: 'Declined' }],
    })
    const row = buildOverflowRows(shipment, [])[0]
    expect(row.name).toBe('Continental Transportation')
    expect(row.listId).toBe('LTL') // equipment code prefix fallback
    expect(row.flags).toEqual(['Routed', 'Declined'])
  })

  it('excludes (DNU) pool entries from the overflow list entirely', () => {
    const rows = buildOverflowRows(shipmentWith(), carrierOptions)
    expect(rows.some((r) => r.scac === 'TAPT')).toBe(false)
  })

  it('is deterministic — the same shipment produces byte-identical rows on every call', () => {
    const shipment = shipmentWith({
      options: [{ scac: 'PRIJ', carrierName: 'Prime Inc', equipment: 'Van', status: 'Declined' }],
    })
    const first = buildOverflowRows(shipment, carrierOptions)
    const second = buildOverflowRows(shipment, carrierOptions)
    expect(second).toEqual(first)
  })

  it('two different shipments produce different overflow membership', () => {
    const a = buildOverflowRows(shipmentWith({ orderNumber: 'SHIP-0001' }), carrierOptions)
    const b = buildOverflowRows(shipmentWith({ orderNumber: 'SHIP-0002' }), carrierOptions)
    expect(a.map((r) => r.scac).sort()).not.toEqual(b.map((r) => r.scac).sort())
  })

  it('synthesizes an ops@ email and empty dates, same convention as the old builder', () => {
    const rows = buildOverflowRows(shipmentWith(), carrierOptions)
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(r.email).toBe(`ops@${r.scac.toLowerCase()}.example.com`)
      expect(r.plannedPickup).toBe('')
      expect(r.plannedDelivery).toBe('')
    }
  })

  it('FLAG_LABELS stays an override point for display text, keyed by flag identity', () => {
    expect(typeof FLAG_LABELS).toBe('object')
  })
})
