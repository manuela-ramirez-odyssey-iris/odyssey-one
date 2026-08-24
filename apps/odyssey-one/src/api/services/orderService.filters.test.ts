/**
 * Mock-service coverage for the Draft + Validation-Errors filter extensions
 * (LINX-11663 / LINX-11659) and the location-triple matcher (LINX-10285).
 *
 * Its own STORE rather than orderService.test.ts's: that file's fixtures carry
 * no audit/VE fields, and its assertions pin totalCount to 5.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))
vi.mock('../client', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPatch: vi.fn() }))

function mk(orderNumber: string, extra: Record<string, unknown> = {}) {
  return {
    orderNumber,
    orderSource: 'INTEGRATED',
    customer: 'ERCO_SYS_01',
    shipDirection: 'O',
    freightTerms: 'P',
    equipment: 'VAN',
    consignor: {
      locationId: 'EW-TX-001', city: 'Miami', state: 'Florida', country: 'US',
      earliestPickupDateTime: '2026-06-10T08:00:00.000Z',
      latestPickupDateTime: '2026-06-10T16:00:00.000Z',
    },
    consignee: {
      locationId: 'GT-LA-002', city: 'Bastrop', state: 'LA', country: 'US',
      earliestDeliveryDateTime: '2026-06-12T08:00:00.000Z',
      latestDeliveryDateTime: '2026-06-12T16:00:00.000Z',
    },
    grossWeight: { value: 4300, uom: 'lbs' },
    volume: { value: 730, uom: 'cbf' },
    commodity: 'Plastic',
    orderStatus: 'Ready For Plan',
    ...extra,
  }
}

const MILAN = {
  locationId: 'IT-LM-001', city: 'Milan', state: 'Lombardy', country: 'Italy',
  earliestPickupDateTime: '2026-06-10T08:00:00.000Z',
  latestPickupDateTime: '2026-06-10T16:00:00.000Z',
}
// The cross-product trap: shares Miami's city with row 1 and Milan's state with
// row 2, so three ANDed arrays would wrongly admit it.
const MIAMI_LOMBARDY = { ...MILAN, city: 'Miami', state: 'Lombardy', country: 'Italy' }

const STORE = [
  // Draft rows (audit fields populated)
  mk('D0001', {
    orderStatus: 'Draft',
    createdAt: '2026-01-10T09:00:00.000Z', createdBy: 'amy.cook',
    lastEditAt: '2026-02-01T09:00:00.000Z', lastEditedBy: 'ben.planner',
  }),
  mk('D0002', {
    orderStatus: 'Draft',
    createdAt: '2026-03-15T09:00:00.000Z', createdBy: 'zoe.admin',
    // First-time creation — LINX-11663 says Last Edit shows "--", i.e. blank.
  }),
  // Validation-Errors rows
  mk('V0001', { orderStatus: 'Shipment Failed', draftOrderStatus: 'Ready', errorCount: 3 }),
  mk('V0002', { orderStatus: 'Shipment Failed', draftOrderStatus: 'Purge', errorCount: 12 }),
  mk('V0003', { orderStatus: 'Planning Failed', draftOrderStatus: 'Complete', errorCount: 1 }),
  // Location rows
  mk('L0001', { consignor: MILAN }),
  mk('L0002', { consignor: MIAMI_LOMBARDY }),
]

vi.mock('../../data/orders', () => ({ getAllOrders: () => STORE, getOrderEnrichment: () => null }))

import { getOrderList } from './orderService'

const page = () => ({ pagination: { pageNumber: 1, pageSize: 50 } })
const numbers = async (filters: Record<string, unknown>) =>
  (await getOrderList({ ...page(), filters } as never)).orders.map(o => o.orderNumber)

describe('Draft-tab filters (LINX-11663)', () => {
  it('filters by createdBy and lastEditedBy', async () => {
    expect(await numbers({ createdBy: ['amy.cook'] })).toEqual(['D0001'])
    expect(await numbers({ lastEditedBy: ['ben.planner'] })).toEqual(['D0001'])
  })

  it('applies Created Date From/To with the AC semantics', async () => {
    // From only → on or after
    expect(await numbers({ createdDateFrom: '2026-02-01' })).toEqual(['D0002'])
    // To only → on or before
    expect(await numbers({ createdDateTo: '2026-02-01' })).toEqual(['D0001'])
    // Both → inclusive between
    expect(await numbers({ createdDateFrom: '2026-01-10', createdDateTo: '2026-01-10' }))
      .toEqual(['D0001'])
  })

  it('applies Last Edit Date From/To', async () => {
    expect(await numbers({ lastEditDateFrom: '2026-01-01', lastEditDateTo: '2026-12-31' }))
      .toEqual(['D0001'])
  })

  it('never matches a blank value (AC: "Filters can not be applied on blank values")', async () => {
    // D0002 has no lastEditAt / lastEditedBy — it must drop out, not pass through.
    expect(await numbers({ lastEditDateFrom: '2020-01-01' })).not.toContain('D0002')
    expect(await numbers({ lastEditedBy: ['zoe.admin'] })).toEqual([])
  })
})

describe('Validation-Errors filters (LINX-11659)', () => {
  it('filters by draftOrderStatus, independent of the lifecycle orderStatus', async () => {
    expect(await numbers({ draftOrderStatuses: ['Ready'] })).toEqual(['V0001'])
    expect(await numbers({ draftOrderStatuses: ['Ready', 'Purge'] })).toEqual(['V0001', 'V0002'])
    // The lifecycle vocabulary must not leak into it: 'Ready' is not an orderStatus.
    expect(await numbers({ orderStatuses: ['Ready'] })).toEqual([])
  })

  it('applies the error-count comparator', async () => {
    // The ticket's own example: Less Than 10 → orders having 1-9 errors.
    expect(await numbers({ errorCountOperator: 'lt', errorCountValue: 10 })).toEqual(['V0001', 'V0003'])
    expect(await numbers({ errorCountOperator: 'gt', errorCountValue: 3 })).toEqual(['V0002'])
    expect(await numbers({ errorCountOperator: 'eq', errorCountValue: 3 })).toEqual(['V0001'])
  })

  it('excludes rows with no error count at all', async () => {
    const res = await numbers({ errorCountOperator: 'gt', errorCountValue: 0 })
    expect(res).toEqual(['V0001', 'V0002', 'V0003'])
  })
})

describe('location triples (LINX-10285)', () => {
  it('matches whole triples instead of cross-producting the parts', async () => {
    const res = await numbers({
      originLocations: [
        { city: 'Miami', state: 'Florida', country: 'US' },
        { city: 'Milan', state: 'Lombardy', country: 'Italy' },
      ],
    })
    // L0002 is Miami/Lombardy/Italy — a mix of the two selections. Three ANDed
    // arrays would admit it; whole-triple matching must not.
    expect(res).not.toContain('L0002')
    expect(res).toContain('L0001')
  })

  it('falls back to the LLD arrays when no triples are sent', async () => {
    expect(await numbers({ originCities: ['Milan'] })).toEqual(['L0001'])
  })

  it('the fallback arrays alone DO cross-product — the defect being flagged', async () => {
    // Documents current LLD-shaped behaviour so a future contract fix has a
    // failing test to flip, rather than an undocumented silent change.
    const res = await numbers({
      originCities: ['Miami', 'Milan'],
      originStates: ['Florida', 'Lombardy'],
      originCountries: ['US', 'Italy'],
    })
    expect(res).toContain('L0002')
  })
})

// ── Live branch: navbar scope vs a panel Customer filter ────────────────────
// Regression for the flat `customers: customerIds` overwrite — mock ANDs the
// two (scope first, then oneOf), live used to REPLACE, so only live was wrong.
describe('live: customer scope intersects the panel filter', () => {
  it('sends the intersection, not the whole scope', async () => {
    const { getApiMode } = await import('../config')
    const { apiPost } = await import('../client')
    vi.mocked(getApiMode).mockReturnValue('live')
    vi.mocked(apiPost).mockResolvedValue({ success: true, orders: [], pagination: {}, error: null } as never)

    await getOrderList(
      { pagination: { pageNumber: 1, pageSize: 25 }, filters: { customers: ['VALTRIS_01', 'OUTSIDE_01'] } } as never,
      ['VALTRIS_01', 'GEON_01'],
    )
    expect((vi.mocked(apiPost).mock.calls[0][1] as never as { filters: { customers: string[] } }).filters.customers).toEqual(['VALTRIS_01'])

    // No panel selection → the scope alone, unchanged behaviour.
    vi.mocked(apiPost).mockClear()
    await getOrderList({ pagination: { pageNumber: 1, pageSize: 25 } } as never, ['VALTRIS_01', 'GEON_01'])
    expect((vi.mocked(apiPost).mock.calls[0][1] as never as { filters: { customers: string[] } }).filters.customers).toEqual(['VALTRIS_01', 'GEON_01'])

    vi.mocked(getApiMode).mockReturnValue('mock')
  })
})

// ── Committed bar chips (S130) ─────────────────────────────────────────────
// The flat criteria path. Its whole point is reaching attributes the tab-scoped
// panel has no field for, so the assertions below deliberately favour those.
describe('searchChips — the flat criteria path', () => {
  const byChips = (searchChips: unknown[]) => numbers({ searchChips } as never)

  it('filters on an attribute with NO panel field (equipment)', async () => {
    expect(await byChips([{ key: 'equipment', dataKey: 'equipment', queryValue: 'VAN', exact: true }]))
      .toHaveLength(STORE.length)
    expect(await byChips([{ key: 'equipment', dataKey: 'equipment', queryValue: 'REEFER', exact: true }]))
      .toEqual([])
  })

  it('matches an enum by the DISPLAY label the column shows, not the stored code', async () => {
    // Rows store shipDirection 'O'; the bar only ever offers 'Outbound'.
    expect(await byChips([{ key: 'ship-direction', dataKey: 'shipDirection', queryValue: 'Outbound', exact: true }]))
      .toHaveLength(STORE.length)
    expect(await byChips([{ key: 'ship-direction', dataKey: 'shipDirection', queryValue: 'O', exact: true }]))
      .toEqual([])
  })

  it('matches hazardous by the badge text, and a non-hazmat row by neither', async () => {
    expect(await byChips([{ key: 'hazardous', dataKey: 'hazardous', queryValue: 'Hazmat', exact: true }]))
      .toEqual([])
  })

  it('an exact chip does not substring-match a sibling value', async () => {
    // 'Ready For Plan' must not be reached by a chip for 'Ready'.
    expect(await byChips([{ key: 'order-status', dataKey: 'orderStatus', queryValue: 'Ready', exact: true }]))
      .toEqual([])
  })

  it('a non-exact chip is a substring, matching the preview', async () => {
    expect((await byChips([{ key: 'customer', dataKey: 'customer', queryValue: 'ERCO' }])).length)
      .toBe(STORE.length)
  })

  it('chips AND with each other', async () => {
    const both = await byChips([
      { key: 'draft-order-status', dataKey: 'draftOrderStatus', queryValue: 'Purge', exact: true },
      { key: 'error-count', dataKey: 'errorCount', queryValue: '12', exact: true },
    ])
    expect(both).toEqual(['V0002'])
    const contradiction = await byChips([
      { key: 'draft-order-status', dataKey: 'draftOrderStatus', queryValue: 'Purge', exact: true },
      { key: 'error-count', dataKey: 'errorCount', queryValue: '3', exact: true },
    ])
    expect(contradiction).toEqual([])
  })

  it('chips AND with the panel filters, not replace them', async () => {
    const narrowed = await numbers({
      draftOrderStatuses: ['Purge'],
      searchChips: [{ key: 'error-count', dataKey: 'errorCount', queryValue: '12', exact: true }],
    } as never)
    expect(narrowed).toEqual(['V0002'])
  })

  it('a location chip matches the flattened string the bar shows', async () => {
    expect(await byChips([{ key: 'shipper-location', dataKey: 'shipperLocation', queryValue: 'Milan' }]))
      .toEqual(['L0001'])
  })

  it('a date chip matches the day, in the M/D/YYYY form the bar carries', async () => {
    const hits = await byChips([{ key: 'latest-pickup', dataKey: 'latestPickup', queryValue: '6/10/2026' }])
    expect(hits.length).toBe(STORE.length)
    expect(await byChips([{ key: 'latest-pickup', dataKey: 'latestPickup', queryValue: '6/11/2026' }])).toEqual([])
  })

  it('no chips changes nothing', async () => {
    expect(await byChips([])).toHaveLength(STORE.length)
  })
})
