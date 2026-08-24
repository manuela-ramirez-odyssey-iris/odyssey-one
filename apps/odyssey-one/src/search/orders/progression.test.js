// The progression is built FROM the grid columns (S130 user ruling), so the
// binding test is column-coverage: a column added to any tab without a matching
// attribute here is a field the search bar silently cannot find an order by.
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../api/config', () => ({ getApiMode: () => 'mock' }))
vi.mock('../../data/orders', () => ({ getAllOrders: () => [] }))

import { ORDERS_PROGRESSION, ORDERS_ATTRIBUTES, orderSearchRow } from './progression'
import { TAB_COLUMNS } from '../../components/orders/ordersColumns'

// Column header → progression attribute label. The two vocabularies differ on
// purpose in exactly three places; everything else must match verbatim, and a
// new column with no entry here fails the coverage test below.
const COLUMN_TO_ATTR = {
  'Latest Pickup Date and Time': 'Latest Pickup Date', // the criterion is a day, not a timestamp
  'Latest Delivery Date and Time': 'Latest Delivery Date',
  'Order Status': 'Order Status', // the VE tab's "Draft Order Status" is its own attribute
}

describe('column coverage', () => {
  const columnHeaders = [...new Set(
    Object.values(TAB_COLUMNS).flat().map((c) => c.header),
  )]

  it('every grid column on every tab has a progression attribute', () => {
    const labels = new Set(ORDERS_ATTRIBUTES.map((a) => a.label))
    const missing = columnHeaders.filter((h) => !labels.has(COLUMN_TO_ATTR[h] ?? h))
    expect(missing).toEqual([])
  })

  it('carries nothing that is NOT a column (columns-only ruling)', () => {
    const wanted = new Set(columnHeaders.map((h) => COLUMN_TO_ATTR[h] ?? h))
    const extra = ORDERS_ATTRIBUTES.map((a) => a.label).filter((l) => !wanted.has(l))
    expect(extra).toEqual([])
  })

  it('is 20 attributes across 9 groups, keys unique', () => {
    expect(ORDERS_PROGRESSION).toHaveLength(9)
    expect(ORDERS_ATTRIBUTES).toHaveLength(20)
    expect(new Set(ORDERS_ATTRIBUTES.map((a) => a.key)).size).toBe(20)
  })

  it('every attribute carries its group and a known match type', () => {
    for (const attr of ORDERS_ATTRIBUTES) {
      expect(attr.group, attr.key).toBeTruthy()
      expect(['digits', 'letters', 'both', 'date', 'enum']).toContain(attr.match)
      if (attr.match === 'enum') expect(attr.values?.length, attr.key).toBeGreaterThan(0)
    }
  })
})

// Every dataKey must resolve on a projected row — the criteria core reads
// `row[dataKey]` with no path support, and an order row is not flat.
describe('orderSearchRow', () => {
  const raw = {
    orderNumber: '0000000091000',
    customer: 'WEYERH_01',
    orderSource: 'INTEGRATED',
    shipDirection: 'O',
    freightTerms: 'A',
    equipment: 'LTR',
    orderStatus: 'Load Planned',
    draftOrderStatus: 'Ready',
    errorCount: 3,
    hazardous: false,
    grossWeight: { value: 42000, uom: 'LBS' },
    volume: { value: 900, uom: 'CUFT' },
    consignor: { name: 'Longview Plant', city: 'Longview', state: 'WA', country: 'US', latestPickupDateTime: '2026-05-29T04:45:00' },
    consignee: { name: 'Freeport Terminal', city: 'Freeport', state: 'TX', country: 'US', latestDeliveryDateTime: '2026-06-02T11:00:00' },
    createdAt: '2026-05-20T08:00:00',
    createdBy: 'ben.planner',
    lastEditAt: '2026-05-21T09:30:00',
    lastEditedBy: 'amy.cook',
  }

  it('resolves every progression dataKey to a non-empty string', () => {
    // `hazardous` is the one honest blank: a non-hazmat order has nothing to
    // match, exactly as its column renders '-'.
    const projected = orderSearchRow({ ...raw, hazardous: true })
    const unresolved = ORDERS_ATTRIBUTES
      .filter((a) => !projected[a.dataKey])
      .map((a) => a.key)
    expect(unresolved).toEqual([])
  })

  it('projects DISPLAY labels for the code-stored enums, matching the grid', () => {
    const p = orderSearchRow(raw)
    expect(p.shipDirection).toBe('Outbound') // stored 'O'
    expect(p.freightTerms).toBe('Pre-Paid/Add') // stored 'A'
    expect(p.orderSource).toBe('Integrated') // stored 'INTEGRATED'
    expect(p.hazardous).toBe('')             // stored false; the column renders '-'
  })

  it('projects dates as M/D/YYYY — what parseSearchDate reads', () => {
    const p = orderSearchRow(raw)
    expect(p.latestPickup).toBe('5/29/2026')
    expect(p.latestDelivery).toBe('6/2/2026')
    expect(p.createdDate).toBe('5/20/2026')
    expect(p.lastEditDate).toBe('5/21/2026')
  })

  it('flattens locations and measures', () => {
    const p = orderSearchRow(raw)
    expect(p.shipperLocation).toBe('Longview Plant, Longview, WA, US')
    expect(p.grossWeight).toBe('42000')
    expect(p.volume).toBe('900')
  })

  it('a hazardous order projects the badge text the COLUMN shows', () => {
    expect(orderSearchRow({ ...raw, hazardous: true }).hazardous).toBe('Hazmat')
  })
})

// The enum catalogs have to be the values the ROW actually carries, or a chip
// built from the catalog matches nothing.
describe('enum values match projected row values', () => {
  it('ship direction and freight terms use labels, not codes', () => {
    const dir = ORDERS_ATTRIBUTES.find((a) => a.key === 'ship-direction')
    expect(dir.values).toEqual(['Outbound', 'Inbound'])
    const terms = ORDERS_ATTRIBUTES.find((a) => a.key === 'freight-terms')
    expect(terms.values).toContain('Pre-Paid')
    expect(terms.values).not.toContain('P')
  })

  it('every enum is exact — a fixed catalog never substring-matches', () => {
    for (const attr of ORDERS_ATTRIBUTES.filter((a) => a.match === 'enum')) {
      expect(attr.exact, attr.key).toBe(true)
    }
  })
})
