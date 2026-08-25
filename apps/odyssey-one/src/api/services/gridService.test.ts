import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

function mk(sell: string, panel: string, category: string, extra: Partial<Record<string, unknown>> = {}) {
  return {
    buyShipment: 'BUY' + sell, sellShipment: sell, orders: ['O' + sell], pro: '',
    customerId: 'CID', customerName: '', consignor: '', consignee: '',
    origin: '', destination: '',
    pickupDate: '06/10/2026 08:00 CST', deliveryDate: '06/13/2026 09:00 CST',
    mode: 'TL', equipmentCode: 'VAN', scac: '', tenderStatus: '', shipmentStatus: '',
    panel, category, validationMessage: null,
    grossWeight: '0', loadCount: '0', orderCount: '1', apFreightCost: '0', ...extra,
  }
}

const STORE = [
  mk('A', 'exceptions', 'date-issues', { customerId: 'ERCO_SYS_01', customerName: 'ERCO Systems Inc', origin: 'Houston TX US 77001', scac: 'ABFS' }),
  mk('B', 'exceptions', 'date-issues', { customerId: 'BASF_CHM_01', customerName: 'BASF Chemical Corp', origin: 'Dallas TX US 75201', scac: 'ODFL' }),
  mk('C', 'exceptions', 'routing-review', { customerId: 'ERCO_SYS_01', customerName: 'ERCO Systems Inc', origin: 'Houston TX US 77001', scac: 'XPOL' }),
  mk('D', 'monitoring', 'hold', { customerId: 'DOW_IND_01', customerName: 'DOW Industrial', origin: 'Freeport TX US 77541', scac: 'SAIA' }),
  mk('E', 'monitoring', 'hold', { customerId: 'ERCO_SYS_01', customerName: 'ERCO Systems Inc', origin: 'Houston TX US 77001', scac: 'CTII' }),
  mk('F', 'pgipgr', 'rating-failure', { customerId: 'ERCO_SYS_01', customerName: 'ERCO Systems Inc', origin: 'Austin TX US 73301', scac: 'FXFE' }),
]

vi.mock('../../data', () => ({ getAllShipments: () => STORE }))

// Live-branch tests stub the HTTP layer; mock tests never reach it.
vi.mock('../client', () => ({ apiGet: vi.fn(), apiPost: vi.fn() }))

import { getApiMode } from '../config'
import { apiGet, apiPost } from '../client'
import { getCategoryCounts, getShipmentErrorList } from './gridService'
// The glimpse adapter shares the criteria matcher (and the mocked data module),
// so the S79c invariant — panel totals sum to the glimpse total — is testable
// end to end right here.
import { shipmentsSearchAdapter } from '../../search/shipments/adapter'

describe('gridService.getCategoryCounts (mock)', () => {
  it('returns counts per category for a panel', async () => {
    const counts = await getCategoryCounts({ panel: 'exceptions' })
    const byCat = Object.fromEntries(counts.map(c => [c.category, c.count]))
    expect(byCat['date-issues']).toBe(2)
    expect(byCat['routing-review']).toBe(1)
    expect(byCat['hold']).toBeUndefined()
  })

  it('returns empty array for a panel with no rows', async () => {
    expect(await getCategoryCounts({ panel: 'nonexistent' })).toEqual([])
  })
})

describe('gridService.getShipmentErrorList (mock)', () => {
  it('filters by panel and returns the paginated envelope', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25 })
    expect(res.totalCount).toBe(3)
    expect(res.rows).toHaveLength(3)
    expect(res.pageNumber).toBe(0)
  })

  it('filters by category within a panel', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', category: 'date-issues', pageNumber: 0, pageSize: 25 })
    expect(res.totalCount).toBe(2)
  })

  it("treats category 'all' as the whole panel", async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', category: 'all', pageNumber: 0, pageSize: 25 })
    expect(res.totalCount).toBe(3)
  })

  it('slices the requested page and reports true totalCount', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 1, pageSize: 2 })
    expect(res.totalCount).toBe(3)
    expect(res.rows).toHaveLength(1) // page 1 (0-based) of size 2 → 1 leftover
  })

  it('applies a field-equality filter', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25, filter: { scac: 'ABFS' } })
    expect(res.totalCount).toBe(1)
    expect(res.rows[0].scac).toBe('ABFS')
  })

  it('applies searchFilters as per-field substring matches (saved-query semantics)', async () => {
    // customerName 'ERCO Systems Inc' must match the substring 'ERCO'
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25, searchFilters: { customerName: 'ERCO' } })
    expect(res.totalCount).toBe(2) // A + C
    // an exact-equality filter would NOT match the substring
    const exact = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25, filter: { customerName: 'ERCO' } })
    expect(exact.totalCount).toBe(0)
  })

  it('applies a free-text searchTerm across the default field set', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25, searchTerm: 'erco' })
    expect(res.totalCount).toBe(2) // A + C both have ERCO in customerName
  })

  it('scopes searchTerm to a single attribute when searchAttributeKey is set', async () => {
    const res = await getShipmentErrorList({
      panel: 'exceptions', pageNumber: 0, pageSize: 25,
      searchTerm: 'houston', searchAttributeKey: 'origin',
    })
    expect(res.totalCount).toBe(2) // A + C have Houston in origin
  })

  it('sorts ascending by a field when sortBy is given', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25, sortBy: 'scac', orderBy: 'asc' })
    expect(res.rows.map(r => r.scac)).toEqual(['ABFS', 'ODFL', 'XPOL'])
  })
})

// ── S79c decision 7: committed GlobalSearch criteria ({ chips, text }) ──
const PANELS = ['exceptions', 'monitoring', 'pgipgr']
const ercoChip = { key: 'customer-name', dataKey: 'customerName', queryValue: 'ERCO' }
const list = (panel: string, searchCriteria: { chips: { dataKey: string; queryValue?: string }[]; text?: string }) =>
  getShipmentErrorList({ panel, pageNumber: 0, pageSize: 100, searchCriteria })

describe('gridService — searchCriteria (shared matcher with the glimpse)', () => {
  it('chips-only criteria filter the list (AND across chips, substring per dataKey)', async () => {
    const res = await list('exceptions', { chips: [ercoChip], text: '' })
    expect(res.totalCount).toBe(2) // A + C
    expect(res.rows.every(r => r.customerName.includes('ERCO'))).toBe(true)

    // AND semantics: a second chip that cannot co-occur → no results
    const impossible = await list('exceptions', { chips: [ercoChip, { dataKey: 'scac', queryValue: 'SAIA' }], text: '' })
    expect(impossible.totalCount).toBe(0)
  })

  it('chips + text criteria AND together (text ORs across the shared field list)', async () => {
    const exc = await list('exceptions', { chips: [ercoChip], text: 'houston' })
    expect(exc.totalCount).toBe(2) // A + C are Houston
    const pgi = await list('pgipgr', { chips: [ercoChip], text: 'houston' })
    expect(pgi.totalCount).toBe(0) // F is Austin
  })

  it('criteria apply AFTER panel/category scoping (criteria AND panel AND category)', async () => {
    const res = await getShipmentErrorList({
      panel: 'exceptions', category: 'date-issues', pageNumber: 0, pageSize: 100,
      searchCriteria: { chips: [ercoChip], text: '' },
    })
    expect(res.totalCount).toBe(1) // A only (C is routing-review)
  })

  it('empty criteria ({ chips: [], text: "  " }) filter nothing', async () => {
    const res = await list('exceptions', { chips: [], text: '  ' })
    expect(res.totalCount).toBe(3)
  })

  it('getCategoryCounts is criteria-aware (filters before counting)', async () => {
    const counts = await getCategoryCounts({ panel: 'exceptions', searchCriteria: { chips: [ercoChip], text: '' } })
    const byCat = Object.fromEntries(counts.map(c => [c.category, c.count]))
    expect(byCat['date-issues']).toBe(1)    // A (B is BASF)
    expect(byCat['routing-review']).toBe(1) // C

    // text-only criteria narrow counts too (Austin only matches F, in pgipgr)
    expect(await getCategoryCounts({ panel: 'exceptions', searchCriteria: { chips: [], text: 'austin' } })).toEqual([])
    const pgi = await getCategoryCounts({ panel: 'pgipgr', searchCriteria: { chips: [], text: 'austin' } })
    expect(pgi).toEqual([{ category: 'rating-failure', count: 1 }])
  })

  it('INVARIANT: sum of the 3 panels’ criteria-filtered totals == the glimpse total', async () => {
    const cases = [
      { chips: [ercoChip], text: '' },        // chips-only: A,C,E,F → 4
      { chips: [ercoChip], text: 'houston' }, // chips+text: A,C,E → 3
      { chips: [], text: 'erco' },            // text-only
    ]
    for (const criteria of cases) {
      const totals = await Promise.all(PANELS.map(p => list(p, criteria).then(r => r.totalCount)))
      const panelSum = totals.reduce((a, b) => a + b, 0)
      const glimpse = await shipmentsSearchAdapter.searchShipments(criteria.chips, criteria.text)
      expect(panelSum).toBe(glimpse.total)
      expect(panelSum).toBeGreaterThan(0)

      // …and the category counts agree with the list totals, panel by panel
      const countTotals = await Promise.all(PANELS.map(p =>
        getCategoryCounts({ panel: p, searchCriteria: criteria })
          .then(cs => cs.reduce((s, c) => s + c.count, 0))))
      expect(countTotals).toEqual(totals)
    }
  })
})

// ── live branch: real HTTP seam (getApiMode → 'live', client stubbed) ──
describe('gridService (live)', () => {
  const mode = vi.mocked(getApiMode)
  const get = vi.mocked(apiGet)
  const post = vi.mocked(apiPost)
  afterEach(() => { mode.mockReturnValue('mock'); get.mockReset(); post.mockReset() })

  it('counts pass customerIds as a csv query param', async () => {
    mode.mockReturnValue('live')
    get.mockResolvedValue({ errorOverview: [] })
    await getCategoryCounts({ panel: 'exceptions', customerIds: ['A_01', 'B_02'] })
    expect(get).toHaveBeenCalledWith(
      '/shipment-service/v1/shipment/error/category/count?panel=exceptions&customerIds=A_01%2CB_02',
    )
  })

  it('counts omit customerIds from the URL when undefined', async () => {
    mode.mockReturnValue('live')
    get.mockResolvedValue({ errorOverview: [] })
    await getCategoryCounts({ panel: 'exceptions' })
    expect(get).toHaveBeenCalledWith(
      '/shipment-service/v1/shipment/error/category/count?panel=exceptions',
    )
  })

  // S131 — the counts endpoint used to send `{key, queryValue}` only. A date or
  // enum chip carries its restriction in `kind`/`dataKey`/`from`/`to`, so
  // stripped it matched no registry attr AND no column, and the server's
  // honest-empty branch made EVERY tab count 0 while the grid (a POST, whole
  // chip) filtered correctly. Verified live: 122 rows, 0 counted.
  it('counts send every field the SERVER reads off a chip', async () => {
    mode.mockReturnValue('live')
    get.mockResolvedValue({ errorOverview: [] })
    await getCategoryCounts({
      panel: 'monitoring',
      searchCriteria: {
        text: '',
        chips: [{
          key: 'pickup-date', dataKey: 'pickupDate', kind: 'date-range',
          from: '06/23/2026', to: '06/25/2026',
          // UI-only fields the server has no use for.
          label: 'Pickup Date Range: 06/23/2026-06/25/2026', attrLabel: 'Pickup Date',
          group: 'Schedule & Appointments', open: true, single: false, monthHint: { y: 2026, m: 6 },
        }],
      },
    } as never)
    const url = get.mock.calls[0][0] as string
    const sent = JSON.parse(new URL(url, 'http://x').searchParams.get('searchChips') as string)
    expect(sent).toEqual([{
      key: 'pickup-date', dataKey: 'pickupDate', kind: 'date-range',
      from: '06/23/2026', to: '06/25/2026',
    }])
  })

  it('counts still drop the presentation half of an ordinary chip', async () => {
    mode.mockReturnValue('live')
    get.mockResolvedValue({ errorOverview: [] })
    await getCategoryCounts({
      panel: 'monitoring',
      searchCriteria: {
        text: '',
        chips: [{ key: 'mode', dataKey: 'mode', queryValue: 'TL', exact: true, label: 'Mode: TL', group: 'Transport' }],
      },
    } as never)
    const url = get.mock.calls[0][0] as string
    const sent = JSON.parse(new URL(url, 'http://x').searchParams.get('searchChips') as string)
    expect(sent).toEqual([{ key: 'mode', dataKey: 'mode', queryValue: 'TL', exact: true }])
  })

  it('list nests searchFilters (not spread flat) so the server can ILIKE them', async () => {
    mode.mockReturnValue('live')
    post.mockResolvedValue({ pageNumber: 0, pageSize: 25, totalCount: 0, rows: [] })
    await getShipmentErrorList({
      panel: 'exceptions', pageNumber: 0, pageSize: 25,
      searchFilters: { origin: 'Dallas' },
    })
    const body = post.mock.calls[0][1] as { filter: Record<string, unknown> }
    expect(body.filter.searchFilters).toEqual({ origin: 'Dallas' })
    // the substring keys must NOT be spread flat onto filter
    expect(body.filter.origin).toBeUndefined()
  })

  it('list omits searchFilters entirely when undefined', async () => {
    mode.mockReturnValue('live')
    post.mockResolvedValue({ pageNumber: 0, pageSize: 25, totalCount: 0, rows: [] })
    await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25 })
    const body = post.mock.calls[0][1] as { filter: Record<string, unknown> }
    expect('searchFilters' in body.filter).toBe(false)
  })
})

// ── S79c decision 10: customer scoping — the FIRST-order filter ──
describe('gridService — customerIds (first-order customer scope)', () => {
  const ERCO = 'ERCO_SYS_01'
  const BASF = 'BASF_CHM_01'

  it('scopes the list to the selected customerIds, before panel/category', async () => {
    const exc = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 100, customerIds: [ERCO] })
    expect(exc.totalCount).toBe(2) // A + C (B is BASF)
    expect(exc.rows.every(r => r.customerId === ERCO)).toBe(true)

    const mon = await getShipmentErrorList({ panel: 'monitoring', pageNumber: 0, pageSize: 100, customerIds: [ERCO] })
    expect(mon.totalCount).toBe(1) // E (D is DOW)

    const both = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 100, customerIds: [ERCO, BASF] })
    expect(both.totalCount).toBe(3)
  })

  it('undefined customerIds = unscoped (legacy callers untouched)', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 100 })
    expect(res.totalCount).toBe(3)
  })

  it('empty customerIds → honest empty list AND zero counts (no data-backed selection)', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 100, customerIds: [] })
    expect(res.totalCount).toBe(0)
    expect(res.rows).toEqual([])
    for (const p of PANELS) {
      expect(await getCategoryCounts({ panel: p, customerIds: [] })).toEqual([])
    }
  })

  it('getCategoryCounts is customer-scoped', async () => {
    const counts = await getCategoryCounts({ panel: 'exceptions', customerIds: [ERCO] })
    const byCat = Object.fromEntries(counts.map(c => [c.category, c.count]))
    expect(byCat['date-issues']).toBe(1)    // A (B is BASF → scoped out)
    expect(byCat['routing-review']).toBe(1) // C
  })

  it('scope composes with searchCriteria (scope first, criteria after)', async () => {
    // ERCO chip inside a BASF-only scope → nothing (the scope wins)
    const out = await getShipmentErrorList({
      panel: 'exceptions', pageNumber: 0, pageSize: 100,
      customerIds: [BASF], searchCriteria: { chips: [ercoChip], text: '' },
    })
    expect(out.totalCount).toBe(0)
    // ERCO chip inside an ERCO+BASF scope → the 2 ERCO rows
    const some = await getShipmentErrorList({
      panel: 'exceptions', pageNumber: 0, pageSize: 100,
      customerIds: [ERCO, BASF], searchCriteria: { chips: [ercoChip], text: '' },
    })
    expect(some.totalCount).toBe(2)
  })

  it('adapter.searchShipments respects the same scope (glimpse === scoped panel sum)', async () => {
    // Scoped glimpse only sees ERCO rows: A,C,E,F match the ERCO chip → 4
    const scoped = await shipmentsSearchAdapter.searchShipments([ercoChip], '', [ERCO])
    expect(scoped.total).toBe(4)
    // Empty scope → honest empty glimpse
    const empty = await shipmentsSearchAdapter.searchShipments([ercoChip], '', [])
    expect(empty.total).toBe(0)
    expect(empty.results).toEqual([])
    // INVARIANT under scoping: sum of scoped panel totals == scoped glimpse total
    const totals = await Promise.all(PANELS.map(p =>
      getShipmentErrorList({ panel: p, pageNumber: 0, pageSize: 100, customerIds: [ERCO], searchCriteria: { chips: [ercoChip], text: '' } })
        .then(r => r.totalCount)))
    expect(totals.reduce((a, b) => a + b, 0)).toBe(scoped.total)
  })
})
