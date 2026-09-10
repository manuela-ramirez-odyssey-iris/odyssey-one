import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))
// Live-branch tests stub the HTTP layer; mock tests never reach it.
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
      locationId: 'EW-TX-001', city: 'Houston', state: 'TX', country: 'US',
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
    orderStatus: 'Ready for Planning',
    ...extra,
  }
}

const STORE = [
  mk('CCC100005'),
  mk('AAA100001'),
  mk('AAA100002', { customer: 'BASF_CHM_01', orderStatus: 'Cancelled' }),
  mk('BBB100004', { customer: 'BASF_CHM_01' }),
  mk('BBB100003', {
    consignor: {
      locationId: 'EW-TX-001', city: 'Freeport', state: 'TX', country: 'US',
      earliestPickupDateTime: '2026-07-01T08:00:00.000Z',
      latestPickupDateTime: '2026-07-01T16:00:00.000Z',
    },
  }),
]

vi.mock('../../data/orders', () => ({ getAllOrders: () => STORE, getOrderEnrichment: () => null }))

import { getApiMode } from '../config'
import { apiGet, apiPatch, apiPost } from '../client'
import {
  getOrderList, getOrderTabCounts, getOrderView, saveDraft, submitDraftOrder, resolveOrder, purgeOrder,
  saveInterfaceFixes, cancelOrder, __resetOrderWriteState,
} from './orderService'
import { orderFormValuesSample } from '../fixtures/orderFormValues.sample'

const page = (pageNumber = 1, pageSize = 20) => ({ pagination: { pageNumber, pageSize } })

describe('orderService.getOrderList (mock)', () => {
  it('returns the LLD envelope with default orderNumber asc sort', async () => {
    const res = await getOrderList(page())
    expect(res.success).toBe(true)
    expect(res.error).toBeNull()
    expect(res.pagination).toEqual({ pageNumber: 1, pageSize: 20, totalCount: 5 })
    expect(res.orders.map(o => o.orderNumber)).toEqual(
      ['AAA100001', 'AAA100002', 'BBB100003', 'BBB100004', 'CCC100005'])
  })

  it('sorts descending when asked (the newest-first proxy)', async () => {
    const res = await getOrderList({ ...page(), sort: { field: 'orderNumber', direction: 'desc' } })
    expect(res.orders[0].orderNumber).toBe('CCC100005')
    expect(res.orders[4].orderNumber).toBe('AAA100001')
  })

  it('paginates 1-based and reports unsliced totalCount', async () => {
    const p1 = await getOrderList(page(1, 2))
    const p2 = await getOrderList(page(2, 2))
    const p3 = await getOrderList(page(3, 2))
    expect(p1.orders.map(o => o.orderNumber)).toEqual(['AAA100001', 'AAA100002'])
    expect(p2.orders.map(o => o.orderNumber)).toEqual(['BBB100003', 'BBB100004'])
    expect(p3.orders.map(o => o.orderNumber)).toEqual(['CCC100005'])
    expect(p1.pagination.totalCount).toBe(5)
    expect(p3.pagination.totalCount).toBe(5)
  })

  it('ANDs across filter fields, ORs within an array', async () => {
    // single-value array narrows…
    const basf = await getOrderList({ ...page(), filters: { customers: ['BASF_CHM_01'] } })
    expect(basf.pagination.totalCount).toBe(2)
    // …two values widen back to all 5 (OR within the array)
    const or = await getOrderList({ ...page(), filters: { customers: ['ERCO_SYS_01', 'BASF_CHM_01'] } })
    expect(or.pagination.totalCount).toBe(5)
    // AND across: BASF + Cancelled narrows to one
    const and = await getOrderList({ ...page(), filters: { customers: ['BASF_CHM_01'], orderStatuses: ['Cancelled'] } })
    expect(and.orders.map(o => o.orderNumber)).toEqual(['AAA100002'])
  })

  it('filters origin city and earliest-pickup date range', async () => {
    const city = await getOrderList({ ...page(), filters: { originCities: ['Freeport'] } })
    expect(city.orders.map(o => o.orderNumber)).toEqual(['BBB100003'])
    const range = await getOrderList({
      ...page(),
      filters: { earliestPickupDateFrom: '2026-06-30', earliestPickupDateTo: '2026-07-02' },
    })
    expect(range.orders.map(o => o.orderNumber)).toEqual(['BBB100003'])
  })

  // Navbar customer scope — gridService semantics (S79c decision 10)
  it('scopes to the selected customers before everything else', async () => {
    const scoped = await getOrderList(page(), ['BASF_CHM_01'])
    expect(scoped.pagination.totalCount).toBe(2)
    expect(scoped.orders.every(o => o.customer === 'BASF_CHM_01')).toBe(true)
  })

  it('yields an honestly empty page for an empty customer scope, everything when unscoped', async () => {
    const none = await getOrderList(page(), [])
    expect(none.pagination.totalCount).toBe(0)
    expect(none.orders).toEqual([])
    const all = await getOrderList(page(), undefined)
    expect(all.pagination.totalCount).toBe(5)
  })

  it('sorts number-less pending rows as the NEWEST under the desc newest-first proxy', async () => {
    STORE.push(mk('', { orderId: 91001 }))
    try {
      const desc = await getOrderList({ ...page(), sort: { field: 'orderNumber', direction: 'desc' } })
      expect(desc.orders[0].orderNumber).toBe('') // pending first — newest
      const asc = await getOrderList({ ...page(), sort: { field: 'orderNumber', direction: 'asc' } })
      expect(asc.orders[asc.orders.length - 1].orderNumber).toBe('') // pending last
    } finally {
      STORE.pop()
    }
  })

  // Overlay rows SHADOW base rows sharing an orderNumber — a session draft
  // saved over a generated row must replace it in the grid, never duplicate it
  // (duplicate ids would collide as TanStack row keys).
  it('overlay rows shadow same-numbered base rows — no duplicates', async () => {
    __resetOrderWriteState()
    try {
      const v = structuredClone(orderFormValuesSample)
      v.general.orderNumber = 'AAA100001' // same number as a base STORE row
      await saveDraft(v)

      const list = await getOrderList(page())
      const matches = list.orders.filter(o => o.orderNumber === 'AAA100001')
      expect(matches).toHaveLength(1)
      expect(matches[0].orderStatus).toBe('Draft') // the overlay version won
      expect(list.pagination.totalCount).toBe(5) // replaced, not appended
    } finally {
      __resetOrderWriteState()
    }
  })

  // LINX-11663: Submit copies a base Draft row into the overlay under 'Ready
  // for Planning' — it must vanish from the Draft-tab filter and reappear in
  // Created with the new status, exactly how the route's tab filters read it.
  it('submitDraftOrder moves a Draft row out of the draft tab into Created as Ready for Planning', async () => {
    __resetOrderWriteState()
    STORE.push(mk('GGG100009', { orderStatus: 'Draft' }))
    try {
      await submitDraftOrder('GGG100009')

      const draftTab = await getOrderList({ ...page(), filters: { orderStatuses: ['Draft'] } })
      expect(draftTab.orders.map(o => o.orderNumber)).not.toContain('GGG100009')

      const allTab = await getOrderList(page())
      const row = allTab.orders.find(o => o.orderNumber === 'GGG100009')
      expect(row?.orderStatus).toBe('Ready for Planning')
    } finally {
      STORE.pop()
      __resetOrderWriteState()
    }
  })

  // LINX-10258: Cancel is a soft delete — status flips to 'Cancelled', row stays.
  it('cancelOrder flips a row to Cancelled without removing it', async () => {
    __resetOrderWriteState()
    try {
      await cancelOrder('CCC100005')
      const list = await getOrderList(page())
      expect(list.pagination.totalCount).toBe(5) // still present, not deleted
      expect(list.orders.find(o => o.orderNumber === 'CCC100005')?.orderStatus).toBe('Cancelled')
    } finally {
      __resetOrderWriteState()
    }
  })
})

// ORD-24 (D1, user ruling 2026-09-05) — tabs are populations, applied via
// `request.tab` BEFORE `filters`. Mock twin of the SQL predicate tests in
// api/_lib/orders.test.mjs.
describe('orderService.getOrderList — tab populations (mock)', () => {
  it('a Planning Failed row is in Created, not Validation Errors', async () => {
    STORE.push(mk('PPP100010', { orderStatus: 'Planning Failed' }))
    try {
      const created = await getOrderList({ ...page(), tab: 'created' } as never)
      expect(created.orders.map(o => o.orderNumber)).toContain('PPP100010')
      const ve = await getOrderList({ ...page(), tab: 'validation-errors' } as never)
      expect(ve.orders.map(o => o.orderNumber)).not.toContain('PPP100010')
    } finally {
      STORE.pop()
    }
  })

  it('a VE row is in neither Created nor Draft', async () => {
    STORE.push(mk('QQQ100011', { orderStatus: null, draftOrderStatus: 'Error', errorCount: 2 }))
    try {
      const created = await getOrderList({ ...page(), tab: 'created' } as never)
      expect(created.orders.map(o => o.orderNumber)).not.toContain('QQQ100011')
      const draft = await getOrderList({ ...page(), tab: 'draft' } as never)
      expect(draft.orders.map(o => o.orderNumber)).not.toContain('QQQ100011')
      const ve = await getOrderList({ ...page(), tab: 'validation-errors' } as never)
      expect(ve.orders.map(o => o.orderNumber)).toContain('QQQ100011')
    } finally {
      STORE.pop()
    }
  })

  it('an absent tab restricts nothing', async () => {
    STORE.push(
      mk('QQQ100011', { orderStatus: null, draftOrderStatus: 'Error', errorCount: 2 }),
      mk('DDD100006', { orderStatus: 'Draft' }),
    )
    try {
      const noTab = await getOrderList(page() as never)
      expect(noTab.pagination.totalCount).toBe(STORE.length)
    } finally {
      STORE.splice(-2)
    }
  })
})

describe('orderService.getOrderTabCounts (mock)', () => {
  // ORD-24 (user ruling 2026-09-05): VE is `draftOrderStatus != null` with
  // `orderStatus: null` — not a lifecycle status. Created excludes Draft AND
  // any VE row; the lifecycle failure statuses (Planning Failed/Shipment
  // Failed) are ordinary Created rows now, unlike the old model.
  it('buckets Created / Draft / Validation Errors, honors customer scope', async () => {
    STORE.push(
      mk('DDD100006', { orderStatus: 'Draft' }),
      mk('EEE100007', { orderStatus: null, draftOrderStatus: 'Error', errorCount: 3 }),
      mk('FFF100008', { customer: 'BASF_CHM_01', orderStatus: null, draftOrderStatus: 'Complete', errorCount: 1 }),
    )
    try {
      // 5 base rows (none Draft, none VE) + 3 pushed.
      expect(await getOrderTabCounts()).toEqual({ created: 5, draft: 1, validationErrors: 2 })
      // Scoped to ERCO_SYS_01: 3 base + DDD100006 (draft) + EEE100007 (VE).
      expect(await getOrderTabCounts(['ERCO_SYS_01'])).toEqual({ created: 3, draft: 1, validationErrors: 1 })
      expect(await getOrderTabCounts([])).toEqual({ created: 0, draft: 0, validationErrors: 0 })
    } finally {
      STORE.splice(-3)
    }
  })

  // S131 — the badges follow the criteria, so they can never claim rows the
  // grid isn't showing. Before this they took the customer scope only.
  it('applies panel filters, bar chips and free text', async () => {
    STORE.push(
      mk('DDD100006', { orderStatus: 'Draft', customer: 'BASF_CHM_01' }),
      mk('EEE100007', { orderStatus: null, draftOrderStatus: 'Error', errorCount: 3, customer: 'BASF_CHM_01' }),
    )
    try {
      const unfiltered = await getOrderTabCounts()
      // A panel param.
      const basf = await getOrderTabCounts(undefined, { customers: ['BASF_CHM_01'] } as never)
      expect(basf.created).toBeLessThan(unfiltered.created)
      expect(basf.draft).toBe(1)
      expect(basf.validationErrors).toBe(1)
      // A bar chip — the OTHER criteria path, same badges. Narrows to the
      // single Draft row, which is excluded from Created by its own predicate.
      const chipped = await getOrderTabCounts(undefined, {
        searchChips: [{ key: 'order-status', dataKey: 'orderStatus', queryValue: 'Draft', exact: true }],
      } as never)
      expect(chipped.created).toBe(0)
      expect(chipped.draft).toBe(1)
      expect(chipped.validationErrors).toBe(0)
      // Free text — narrows to the same single Draft row.
      const texted = await getOrderTabCounts(undefined, { searchText: 'DDD100006' } as never)
      expect(texted.created).toBe(0)
      expect(texted.draft).toBe(1)
    } finally {
      STORE.splice(-2)
    }
  })
})

describe('orderService.getOrderTabCounts (live)', () => {
  const mode = vi.mocked(getApiMode)
  const get = vi.mocked(apiGet)
  const post = vi.mocked(apiPost)
  afterEach(() => { mode.mockReturnValue('mock'); get.mockReset(); post.mockReset() })

  const sentFilters = () => {
    const url = get.mock.calls.at(-1)![0] as string
    const raw = new URL(url, 'http://x').searchParams.get('filters')
    return raw ? JSON.parse(raw) : null
  }

  it('sends the scope and the criteria, passing the response through', async () => {
    mode.mockReturnValue('live')
    const counts = { created: 3, draft: 1, validationErrors: 0 }
    get.mockResolvedValue(counts)
    const filters = { customers: ['A_01'], searchChips: [{ key: 'customer', queryValue: 'BASF' }] }
    expect(await getOrderTabCounts(['A_01'], filters as never)).toEqual(counts)
    const url = get.mock.calls[0][0] as string
    expect(url.startsWith('/order-service/v3/order/tab-counts?')).toBe(true)
    expect(new URL(url, 'http://x').searchParams.get('customers')).toBe('A_01')
    // Whole object, not cherry-picked fields — the truncation that zeroed the
    // Shipments badges came from hand-picking chip fields into a URL.
    expect(sentFilters()).toEqual(filters)
  })

  // It stays a GET on the SAME path on purpose: a method (or path) change 404s
  // against an already-deployed server, and the badges render `count ?? null`,
  // so they would silently disappear until the next deploy.
  it('keeps the deployed contract — GET, same path, criteria only additive', async () => {
    mode.mockReturnValue('live')
    get.mockResolvedValue({ created: 5, draft: 0, validationErrors: 0 })
    await getOrderTabCounts(['A_01'], { customers: ['A_01'] } as never)
    expect(post).not.toHaveBeenCalled()
    const [path] = (get.mock.calls[0][0] as string).split('?')
    expect(path).toBe('/order-service/v3/order/tab-counts')
  })

  it('short-circuits an empty scope to zeros without an HTTP call', async () => {
    mode.mockReturnValue('live')
    expect(await getOrderTabCounts([])).toEqual({ created: 0, draft: 0, validationErrors: 0 })
    expect(get).not.toHaveBeenCalled()
  })

  it('sends no params at all when there is neither scope nor criteria', async () => {
    mode.mockReturnValue('live')
    get.mockResolvedValue({ created: 5, draft: 0, validationErrors: 0 })
    await getOrderTabCounts()
    expect(get).toHaveBeenCalledWith('/order-service/v3/order/tab-counts')
  })

  // The badges must read the query the way the LIST does, or they describe a
  // different search than the rows below them.
  it('runs the phrase-then-code-list two-step for free text', async () => {
    mode.mockReturnValue('live')
    get.mockResolvedValueOnce({ created: 0, draft: 0, validationErrors: 0 })   // phrase misses
    get.mockResolvedValueOnce({ created: 7, draft: 2, validationErrors: 1 })   // code list hits
    const counts = await getOrderTabCounts(undefined, { searchText: 'AAA1 BBB2' } as never)
    expect(counts.created).toBe(7)
    const terms = (call: number) =>
      JSON.parse(new URL(get.mock.calls[call][0] as string, 'http://x').searchParams.get('filters')!).searchTerms
    expect(terms(0)).toEqual(['aaa1 bbb2'])
    expect(terms(1)).toEqual(['aaa1', 'bbb2'])
  })
})

describe('live status writes (ledger row 9)', () => {
  const mode = vi.mocked(getApiMode)
  const patch = vi.mocked(apiPatch)
  afterEach(() => { mode.mockReturnValue('mock'); patch.mockReset() })

  it('submit/resolve/cancel PATCH the status endpoint in live mode', async () => {
    mode.mockReturnValue('live')
    patch.mockResolvedValue({ success: true })

    await submitDraftOrder('ORD-1')
    expect(patch).toHaveBeenLastCalledWith('/order-service/v3/order/status', { orderNumber: 'ORD-1', status: 'Ready for Planning' })
    await resolveOrder('ORD-2')
    expect(patch).toHaveBeenLastCalledWith('/order-service/v3/order/status', { orderNumber: 'ORD-2', status: 'Ready for Planning' })
    await cancelOrder('ORD-3')
    expect(patch).toHaveBeenLastCalledWith('/order-service/v3/order/status', { orderNumber: 'ORD-3', status: 'Cancelled' })
  })
})

/**
 * OIF write layer (LINX-16049 Step 1 / LINX-11137 Step 2, vocabulary per
 * LINX-16391: Error / Complete / Purge). The module fixture STORE has no
 * Validation-Errors rows, so this block pushes two and pops them again — the
 * other describes assert exact row counts over the 5 base rows.
 */
describe('OIF writes (LINX-16391 vocabulary)', () => {
  const ve = (n: string, extra: Record<string, unknown> = {}) =>
    mk(n, { orderStatus: '', draftOrderStatus: 'Error', errorCount: 5, ...extra })

  beforeEach(() => {
    __resetOrderWriteState()
    STORE.push(
      ve('VE100010', { interfaceErrorCount: 3, interfaceErrorClass: 'conflict' }),
      ve('VE100011', { interfaceErrorCount: 0, interfaceErrorClass: null }),
    )
  })
  afterEach(() => { STORE.length = 5; __resetOrderWriteState() })

  const listTab = (tab: string, filters: Record<string, unknown> = {}) =>
    getOrderList({ pagination: { pageNumber: 1, pageSize: 500 }, tab, filters } as never)

  const veRow = async (orderNumber: string) =>
    (await listTab('validation-errors')).orders.find(r => r.orderNumber === orderNumber)

  it('saveInterfaceFixes zeroes interfaceErrorCount, keeps Error + the Level 2 count, and persists the values', async () => {
    const values = await getOrderView('VE100010')
    values!.general.freightTerm = 'C'
    await saveInterfaceFixes('VE100010', values!)

    const after = await veRow('VE100010')
    expect(after?.interfaceErrorCount).toBe(0)
    expect(after?.interfaceErrorClass).toBeNull()
    // Step 2 is still unresolved — the row stays in the Validation Errors tab
    // and keeps its master-data error count, or re-entry has nothing to show.
    expect(after?.draftOrderStatus).toBe('Error')
    expect(after?.errorCount).toBe(5)
    expect((await getOrderView('VE100010'))!.general.freightTerm).toBe('C')
  })

  it('resolveOrder → Ready for Planning, row leaves the VE tab and lands on Created', async () => {
    await resolveOrder('VE100010')
    expect(await veRow('VE100010')).toBeUndefined()
    const created = await listTab('created', { orderNumbers: ['VE100010'] })
    expect(created.orders[0]?.orderStatus).toBe('Ready for Planning')
  })

  it('purgeOrder → row leaves the VE tab and does NOT enter the lifecycle', async () => {
    await purgeOrder('VE100011')
    expect(await veRow('VE100011')).toBeUndefined()
    expect((await listTab('created', { orderNumbers: ['VE100011'] })).orders.length).toBe(0)
    expect((await listTab('draft', { orderNumbers: ['VE100011'] })).orders.length).toBe(0)
    // …and it is gone from the unrestricted population too (tab badge counts
    // read the same rows), not merely hidden from the three tabs.
    const counts = await getOrderTabCounts()
    expect(counts.created + counts.draft + counts.validationErrors).toBe(6)
  })

  it('purgeOrder throws in live mode rather than writing a different status', async () => {
    const mode = vi.mocked(getApiMode)
    mode.mockReturnValue('live')
    await expect(purgeOrder('VE100011')).rejects.toThrow(/not supported/i)
    expect(vi.mocked(apiPatch)).not.toHaveBeenCalled()
    mode.mockReturnValue('mock')
  })
})
