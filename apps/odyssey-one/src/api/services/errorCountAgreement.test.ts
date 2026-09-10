/**
 * THE ERRORS COUNT AGREEMENT — display and query must mean the same number.
 *
 * Ramesh, 2026-09-10: "Error = Order has structural and/or master data error",
 * so the Validation Errors grid's "Errors Count" is `errorCount` (Level 2 /
 * master data, LINX-11137) PLUS `interfaceErrorCount` (Level 1 / structural,
 * LINX-16049). An order with 3 structural + 2 master-data faults used to show
 * "2" and then make the planner fix 5.
 *
 * That total is read by four separate consumers, and this repo has shipped the
 * "UI shows one thing, the query filters another" bug FIVE times. This file is
 * the sixth's tripwire: it pins one row through every consumer at once —
 *
 *   1. the grid cell            → mapOrderListRow's VM (ordersColumns reads it)
 *   2. the panel's comparator   → toRequest → errorCounts → mock predicate
 *   3. the bar chip matcher     → orderSearchRow + matchesChip
 *   4. the XLSX export          → the same VM field as (1), by construction
 *
 * Break any one of them — e.g. compare `r.errorCount` instead of
 * `totalErrorCount(r)` in orderService — and this fails.
 *
 * The LIVE (SQL) fifth path is equivalent by construction rather than by test:
 * Neon has no `interface_error_count` column (Q-OIF-4), so live rows carry
 * interfaceErrorCount === null and the total reduces to `error_count`. See the
 * matching note in api/_lib/orders.mjs.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))
vi.mock('../client', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPatch: vi.fn() }))

// 3 structural + 2 master data = 5 pieces of work. Both halves non-zero and
// DIFFERENT, so a consumer reading either one alone is visible in the result.
const SPLIT = {
  orderNumber: 'V-SPLIT',
  orderSource: 'INTEGRATED',
  customer: 'ERCO_SYS_01',
  orderStatus: null,
  draftOrderStatus: 'Error',
  errorCount: 2,
  interfaceErrorCount: 3,
  interfaceErrorClass: 'structural',
}
// A decoy whose MASTER-DATA count is the split row's TOTAL. If any consumer
// compares the raw field, the two rows swap places and the assertions below
// name the wrong order — a silent divergence would otherwise still "pass".
const DECOY = { ...SPLIT, orderNumber: 'V-DECOY', errorCount: 5, interfaceErrorCount: 0 }

const STORE = [SPLIT, DECOY]
vi.mock('../../data/orders', () => ({ getAllOrders: () => STORE, getOrderEnrichment: () => null }))

import { getOrderList } from './orderService'
import { mapOrderListRow } from '../mappers/mapOrderListRow'
import { orderSearchRow } from '../../search/orders/progression'
import { toRequestFilters } from '../../search/orders/toRequest'
import type { OrderListRow } from '../types/orderList'

// Sorted — this asserts WHICH rows matched, never the grid's default ordering.
const numbers = async (filters: Record<string, unknown>) =>
  (await getOrderList({ pagination: { pageNumber: 1, pageSize: 50 }, filters } as never))
    .orders.map(o => o.orderNumber).sort()

describe('Errors Count: what the row SHOWS is what the query MATCHES', () => {
  it('the grid cell shows the two-level total', () => {
    expect(mapOrderListRow(SPLIT as unknown as OrderListRow).errorCount).toBe(5)
    // …and the master-data half stays available for the Step 2 resolution seed.
    expect(mapOrderListRow(SPLIT as unknown as OrderListRow).masterDataErrorCount).toBe(2)
  })

  it('the panel comparator selects exactly the rows displaying that number', async () => {
    // The panel's own state → request mapping, not a hand-written param object:
    // a rename in toRequest has to break this too.
    const filters = toRequestFilters('validation-errors', { errorCount: { op: 'eq', value: '5' } }) as Record<string, unknown>
    expect(filters).toEqual({ errorCountOperator: 'eq', errorCountValue: 5 })
    expect(await numbers(filters)).toEqual(['V-DECOY', 'V-SPLIT'])
    // 2 is the split row's master-data half — nothing DISPLAYS 2, so nothing matches.
    expect(await numbers({ errorCountOperator: 'eq', errorCountValue: 2 })).toEqual([])
  })

  it('the bar chip matches on the displayed total, not the master-data half', async () => {
    expect(orderSearchRow(SPLIT).errorCount).toBe('5')
    const chip = (queryValue: string) => numbers({
      searchChips: [{ key: 'error-count', dataKey: 'errorCount', queryValue, exact: true }],
    })
    expect(await chip('5')).toEqual(['V-DECOY', 'V-SPLIT'])
    expect(await chip('2')).toEqual([])
  })

})
