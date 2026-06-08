# Shipments List/Grid API Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the shipments list + tab-counts through a paginated, production-shaped data layer (mock simulates the server; live hits the real grid endpoints), with real pagination UI on the table — so the live cutover is a flag flip, not a rewrite.

**Architecture:** Mirror the detail pattern. A `gridService` (`getShipmentErrorList` + `getCategoryCounts`) sits behind the existing `config`/`client` mock-vs-live seam. Mock mode reads `shipments.json` (shape unchanged) and filters/sorts/paginates it in-memory to simulate the paginated server; live mode calls `POST /shipment-service/pgi-pgr/v1/error/list` + `GET /shipment-service/v1/shipment/error/category/count`. A thin mapper (`mapShipmentErrorRow`) converts the provisional row DTO → table view-model and sets `id = sellShipment` (the contract detail-link key). TanStack Query hooks feed `ShipmentsRoute`, which is rewired from client-side filtering to server params; `ShipmentTable` gains pagination controls + loading/error states.

**Tech Stack:** TypeScript, Vitest (service/mapper TDD), TanStack Query, React, `@faker-js/faker` (generator).

**Spec:** `docs/superpowers/specs/2026-06-06-shipments-list-grid-api-wiring-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/api/types/shipmentErrorList.ts` | DTOs: `ShipmentErrorRow`, `ShipmentErrorListResponse`, `CategoryCount`, `ShipmentErrorListParams` |
| Create | `src/api/types/shipmentRowVm.ts` | `ShipmentRowVM` — one table row view-model |
| Create | `src/api/mappers/mapShipmentErrorRow.ts` (+ test) | `ShipmentErrorRow` → `ShipmentRowVM` |
| Create | `src/api/services/gridService.ts` (+ test) | `getShipmentErrorList` + `getCategoryCounts`; mock (in-memory) + live (endpoints) |
| Create | `src/api/queries/useShipmentErrorList.ts` | TanStack Query hook (keepPreviousData) |
| Create | `src/api/queries/useCategoryCounts.ts` | TanStack Query hook |
| Modify | `tools/generate.mjs` | Unique `sellShipment`; key detail files by `sellShipment` |
| Modify | `src/routes/shipments/ShipmentsRoute.jsx` | Server params + hooks; counts from hook; row-click by `id` |
| Modify | `src/components/shipments/ShipmentTable.jsx` | Page rendering, pagination UI, loading/error, select by `id` |
| Modify | `src/data/index.js` | Retire panel/count accessors; keep `getAllShipments` + `SEARCH_ATTRIBUTES` |

All paths relative to `apps/odyssey-one/` unless noted. Run all commands from that directory.

---

## Task 1: Grid DTO + view-model types

**Files:**
- Create: `src/api/types/shipmentErrorList.ts`
- Create: `src/api/types/shipmentRowVm.ts`

- [ ] **Step 1: Create `shipmentErrorList.ts`**

```typescript
// Grid list contract for the shipments table. The list IS the exception/monitoring/
// PGI-PGR grids (POST /shipment-service/pgi-pgr/v1/error/list); there is no generic
// "all shipments" endpoint. The row shape is provisional — the LLD does not specify
// the error/list row fields, so we use the current shipments.json row shape as a
// best-effort DTO and isolate the unknown real names behind mapShipmentErrorRow.
export interface ShipmentErrorRow {
  buyShipment: string
  sellShipment: string          // contract detail-link id (sell-shipment-out/{id})
  orders: string[]
  pro: string
  customerId: string
  customerName: string
  consignor: string
  consignee: string
  origin: string
  destination: string
  pickupDate: string
  deliveryDate: string
  mode: string
  equipmentCode: string
  scac: string
  tenderStatus: string
  shipmentStatus: string
  panel: string
  category: string
  validationMessage: string | null
  grossWeight: string
  loadCount: string
  orderCount: string
  apFreightCost: string
}

// Paginated envelope (consistent across services). Real row-array name is TBD;
// the service normalizes it to `rows` at the boundary.
export interface ShipmentErrorListResponse {
  pageNumber: number
  pageSize: number
  totalCount: number
  rows: ShipmentErrorRow[]
}

export interface CategoryCount {
  category: string
  count: number
}

// Request params. `filter` carries committed filter state keyed by SEARCH_ATTRIBUTES
// dataKey; `searchTerm` is free-text; `dateFilters` are ISO yyyy-mm-dd bounds.
export interface ShipmentErrorListParams {
  panel: string
  category?: string             // omit or 'all' = whole panel
  pageNumber: number
  pageSize: number
  filter?: Record<string, string>
  searchTerm?: string
  searchAttributeKey?: string | null   // scopes searchTerm to one attribute when set
  dateFilters?: {
    pickupDateFrom?: string
    pickupDateTo?: string
    deliveryDateFrom?: string
    deliveryDateTo?: string
  }
  sortBy?: string
  orderBy?: 'asc' | 'desc'
}
```

- [ ] **Step 2: Create `shipmentRowVm.ts`**

```typescript
// The view-model ShipmentTable renders. Field names match what the table's column
// accessors already read; `id` is the detail-fetch key (= sellShipment).
export interface ShipmentRowVM {
  id: string                    // = sellShipment
  buyShipment: string
  sellShipment: string
  orders: string[]
  pro: string
  customerId: string
  customerName: string
  consignor: string
  consignee: string
  origin: string
  destination: string
  pickupDate: string
  deliveryDate: string
  mode: string
  equipmentCode: string
  scac: string
  tenderStatus: string
  shipmentStatus: string
  validationMessage: string | null
  grossWeight: string
  loadCount: string
  orderCount: string
  apFreightCost: string
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean (types are additive, unused so far).

- [ ] **Step 4: Commit**

```bash
git add src/api/types/shipmentErrorList.ts src/api/types/shipmentRowVm.ts
git commit -m "feat(api): grid list DTO + row view-model types (list wiring)"
```

---

## Task 2: Row mapper (TDD)

**Files:**
- Create: `src/api/mappers/mapShipmentErrorRow.ts`
- Create: `src/api/mappers/mapShipmentErrorRow.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest'
import { mapShipmentErrorRow } from './mapShipmentErrorRow'
import type { ShipmentErrorRow } from '../types/shipmentErrorList'

const row: ShipmentErrorRow = {
  buyShipment: '43708610',
  sellShipment: '25690001',
  orders: ['JAN6ERCO6'],
  pro: '12345678',
  customerId: 'ERCO_SYS_01',
  customerName: 'ERCO Systems Inc',
  consignor: 'ERCO WORLDWIDE',
  consignee: 'EASTMAN CHEMICAL RECV',
  origin: 'Houston TX US 77001',
  destination: 'Kingsport TN US 37660',
  pickupDate: '01/20/2026 14:00 CST',
  deliveryDate: '01/23/2026 09:00 CST',
  mode: 'TL',
  equipmentCode: 'VAN',
  scac: 'ABFS',
  tenderStatus: 'Accepted',
  shipmentStatus: 'Done',
  panel: 'monitoring',
  category: 'approved',
  validationMessage: null,
  grossWeight: '18207',
  loadCount: '3',
  orderCount: '1',
  apFreightCost: '2,231.18',
}

describe('mapShipmentErrorRow', () => {
  it('sets id to sellShipment (the detail-link key)', () => {
    expect(mapShipmentErrorRow(row).id).toBe('25690001')
  })

  it('passes through the display fields the table reads', () => {
    const vm = mapShipmentErrorRow(row)
    expect(vm.buyShipment).toBe('43708610')
    expect(vm.orders).toEqual(['JAN6ERCO6'])
    expect(vm.customerName).toBe('ERCO Systems Inc')
    expect(vm.origin).toBe('Houston TX US 77001')
    expect(vm.tenderStatus).toBe('Accepted')
    expect(vm.apFreightCost).toBe('2,231.18')
  })

  it('preserves null validationMessage', () => {
    expect(mapShipmentErrorRow(row).validationMessage).toBeNull()
  })

  it('degrades missing optional string fields to empty/safe defaults', () => {
    const sparse = { buyShipment: 'B', sellShipment: 'S' } as ShipmentErrorRow
    const vm = mapShipmentErrorRow(sparse)
    expect(vm.id).toBe('S')
    expect(vm.orders).toEqual([])
    expect(vm.customerName).toBe('')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/api/mappers/mapShipmentErrorRow.test.ts`
Expected: FAIL — `mapShipmentErrorRow` not defined.

- [ ] **Step 3: Implement the mapper**

```typescript
import type { ShipmentErrorRow } from '../types/shipmentErrorList'
import type { ShipmentRowVM } from '../types/shipmentRowVm'

// Provisional row DTO → table view-model. This is the single place to reconcile
// real field names when the live Swagger lands. `id` = sellShipment (the contract
// key used by GET /sell-shipment-out/{id}).
export function mapShipmentErrorRow(row: ShipmentErrorRow): ShipmentRowVM {
  const s = (v: string | undefined) => v ?? ''
  return {
    id: row.sellShipment,
    buyShipment: s(row.buyShipment),
    sellShipment: s(row.sellShipment),
    orders: row.orders ?? [],
    pro: s(row.pro),
    customerId: s(row.customerId),
    customerName: s(row.customerName),
    consignor: s(row.consignor),
    consignee: s(row.consignee),
    origin: s(row.origin),
    destination: s(row.destination),
    pickupDate: s(row.pickupDate),
    deliveryDate: s(row.deliveryDate),
    mode: s(row.mode),
    equipmentCode: s(row.equipmentCode),
    scac: s(row.scac),
    tenderStatus: s(row.tenderStatus),
    shipmentStatus: s(row.shipmentStatus),
    validationMessage: row.validationMessage ?? null,
    grossWeight: s(row.grossWeight),
    loadCount: s(row.loadCount),
    orderCount: s(row.orderCount),
    apFreightCost: s(row.apFreightCost),
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/api/mappers/mapShipmentErrorRow.test.ts`
Expected: 4 pass.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/api/mappers/mapShipmentErrorRow.ts src/api/mappers/mapShipmentErrorRow.test.ts
git commit -m "feat(api): map grid row DTO -> table view-model (list wiring)"
```

---

## Task 3: gridService — category counts (TDD)

**Files:**
- Create: `src/api/services/gridService.ts`
- Create: `src/api/services/gridService.test.ts`

**Context:** `getApiMode()` from `../config` returns `'mock' | 'live'`. `apiGet` from `../client` is the live GET helper. The mock store is `getAllShipments()` from `../../data` (returns the full `shipments.json` array, row shape = `ShipmentErrorRow`). Counts group the panel's rows by `category`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))
vi.mock('../../data', () => ({
  getAllShipments: () => [
    { panel: 'exceptions', category: 'date-issues' },
    { panel: 'exceptions', category: 'date-issues' },
    { panel: 'exceptions', category: 'routing-review' },
    { panel: 'monitoring', category: 'hold' },
  ],
}))

import { getCategoryCounts } from './gridService'

describe('gridService.getCategoryCounts (mock)', () => {
  it('returns counts per category for a panel', async () => {
    const counts = await getCategoryCounts({ panel: 'exceptions' })
    const byCat = Object.fromEntries(counts.map(c => [c.category, c.count]))
    expect(byCat['date-issues']).toBe(2)
    expect(byCat['routing-review']).toBe(1)
    expect(byCat['hold']).toBeUndefined() // wrong panel excluded
  })

  it('returns empty array for a panel with no rows', async () => {
    expect(await getCategoryCounts({ panel: 'nonexistent' })).toEqual([])
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/api/services/gridService.test.ts`
Expected: FAIL — `getCategoryCounts` not defined.

- [ ] **Step 3: Implement `getCategoryCounts` (mock + live)**

```typescript
import { getApiMode } from '../config'
import { apiGet, apiPost } from '../client'
import { getAllShipments } from '../../data'
import type {
  ShipmentErrorRow,
  ShipmentErrorListResponse,
  ShipmentErrorListParams,
  CategoryCount,
} from '../types/shipmentErrorList'

interface CategoryCountParams {
  panel: string
}

export async function getCategoryCounts(params: CategoryCountParams): Promise<CategoryCount[]> {
  if (getApiMode() === 'live') {
    // Real: GET /shipment-service/v1/shipment/error/category/count → { errorOverview, total }
    const res = await apiGet<{ errorOverview: CategoryCount[] }>(
      `/shipment-service/v1/shipment/error/category/count?panel=${encodeURIComponent(params.panel)}`,
    )
    return res.errorOverview ?? []
  }
  // mock: group the panel's rows by category
  const rows = (getAllShipments() as ShipmentErrorRow[]).filter(r => r.panel === params.panel)
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  return [...counts].map(([category, count]) => ({ category, count }))
}
```

**Note:** `apiPost` is imported now for use in Task 4. If `apiPost` does not exist in `../client`, add it in Task 4 Step 3; for this task, importing an existing `apiGet` is enough — only import `apiPost` once it exists. If `../client` has no `apiPost` yet, omit it from this import and add the full import in Task 4.

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/api/services/gridService.test.ts`
Expected: 2 pass.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/api/services/gridService.ts src/api/services/gridService.test.ts
git commit -m "feat(api): gridService.getCategoryCounts (mock + live) (list wiring)"
```

---

## Task 4: gridService — paginated error list (TDD)

**Files:**
- Modify: `src/api/services/gridService.ts`
- Modify: `src/api/services/gridService.test.ts`
- Possibly modify: `src/api/client.ts` (add `apiPost` if absent)

**Context:** The mock applies, in order: panel + category filter → field-equality `filter` → `dateFilters` → free-text `searchTerm` (scoped to `searchAttributeKey` if set, else across a fixed field set) → optional sort → count → slice page. Date parsing mirrors `ShipmentsRoute.parseShipmentDate` ("MM/DD/YYYY ..." → "yyyy-mm-dd"). The field set for unscoped search: `buyShipment, sellShipment, customerId, customerName, origin, destination, scac, orders[]`.

- [ ] **Step 1: Confirm/add `apiPost` in `client.ts`**

Run: `grep -n "apiPost\|export" src/api/client.ts`
If `apiPost` is absent, add it next to `apiGet`, following the same `apiGet` pattern (base URL, `Bearer` + `x-correlation-id` headers, `ApiError` on non-OK), but with `method: 'POST'` and a JSON body:

```typescript
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}
```

(Adapt to the actual internal helper name in `client.ts` — if `apiGet` is self-contained rather than calling a shared `request`, mirror its full implementation with method/body added.)

- [ ] **Step 2: Write the failing tests**

Add to `gridService.test.ts` (the existing `vi.mock('../../data', ...)` returns only 4 minimal rows — add a second describe with its own richer dataset via `vi.mocked`). Replace the top mock with a richer shared dataset:

```typescript
import { describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({ getApiMode: vi.fn(() => 'mock') }))

const STORE = [
  mk('A', 'exceptions', 'date-issues', { customerName: 'ERCO Systems Inc', origin: 'Houston TX US 77001', scac: 'ABFS' }),
  mk('B', 'exceptions', 'date-issues', { customerName: 'BASF Chemical Corp', origin: 'Dallas TX US 75201', scac: 'ODFL' }),
  mk('C', 'exceptions', 'routing-review', { customerName: 'ERCO Systems Inc', origin: 'Houston TX US 77001', scac: 'XPOL' }),
  mk('D', 'monitoring', 'hold', { customerName: 'DOW Industrial', origin: 'Freeport TX US 77541', scac: 'SAIA' }),
]
function mk(sell, panel, category, extra) {
  return {
    buyShipment: 'BUY' + sell, sellShipment: sell, orders: ['O' + sell], pro: '', customerId: 'CID',
    customerName: '', consignor: '', consignee: '', origin: '', destination: '', pickupDate: '06/10/2026 08:00 CST',
    deliveryDate: '06/13/2026 09:00 CST', mode: 'TL', equipmentCode: 'VAN', scac: '', tenderStatus: '', shipmentStatus: '',
    panel, category, validationMessage: null, grossWeight: '0', loadCount: '0', orderCount: '1', apFreightCost: '0', ...extra,
  }
}
vi.mock('../../data', () => ({ getAllShipments: () => STORE }))

import { getShipmentErrorList } from './gridService'

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

  it('applies a free-text searchTerm across the default field set', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25, searchTerm: 'erco' })
    expect(res.totalCount).toBe(2) // A + C
  })

  it('scopes searchTerm to a single attribute when searchAttributeKey is set', async () => {
    const res = await getShipmentErrorList({
      panel: 'exceptions', pageNumber: 0, pageSize: 25, searchTerm: 'houston', searchAttributeKey: 'origin',
    })
    expect(res.totalCount).toBe(2) // A + C have Houston origin
  })

  it('sorts ascending by a field when sortBy is given', async () => {
    const res = await getShipmentErrorList({ panel: 'exceptions', pageNumber: 0, pageSize: 25, sortBy: 'scac', orderBy: 'asc' })
    expect(res.rows.map(r => r.scac)).toEqual(['ABFS', 'ODFL', 'XPOL'])
  })
})
```

(Remove the old minimal `vi.mock('../../data', ...)` block from Task 3's test if it conflicts — keep one shared `STORE` mock that satisfies both `getCategoryCounts` and `getShipmentErrorList` tests. The category-count assertions still hold: exceptions has date-issues×2, routing-review×1.)

- [ ] **Step 3: Run tests — expect FAIL**

Run: `npx vitest run src/api/services/gridService.test.ts`
Expected: list tests FAIL — `getShipmentErrorList` not defined.

- [ ] **Step 4: Implement `getShipmentErrorList`**

Add to `gridService.ts` (and ensure the import line includes `apiPost`, `ShipmentErrorListResponse`, `ShipmentErrorListParams`):

```typescript
const SEARCH_FIELDS: (keyof ShipmentErrorRow)[] = [
  'buyShipment', 'sellShipment', 'customerId', 'customerName', 'origin', 'destination', 'scac', 'orders',
]

function toISO(dateStr: string): string | null {
  if (!dateStr) return null
  const datePart = dateStr.split(' ')[0]
  const [mm, dd, yyyy] = datePart.split('/')
  if (!mm || !dd || !yyyy) return null
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

function fieldContains(row: ShipmentErrorRow, key: keyof ShipmentErrorRow, needle: string): boolean {
  const raw = row[key]
  const vals = Array.isArray(raw) ? raw : [raw]
  return vals.some(v => String(v ?? '').toLowerCase().includes(needle))
}

export async function getShipmentErrorList(
  params: ShipmentErrorListParams,
): Promise<ShipmentErrorListResponse> {
  if (getApiMode() === 'live') {
    // Real: POST /shipment-service/pgi-pgr/v1/error/list → { pageNumber, pageSize, totalCount, <rows> }
    const res = await apiPost<ShipmentErrorListResponse & Record<string, unknown>>(
      `/shipment-service/pgi-pgr/v1/error/list`,
      {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        filter: { panel: params.panel, category: params.category, ...params.filter, ...params.dateFilters, searchTerm: params.searchTerm },
        sortBy: params.sortBy,
        orderBy: params.orderBy,
      },
    )
    // normalize the (TBD) row-array name to `rows`
    const rows = (res.rows ?? (res as Record<string, unknown>).errors ?? (res as Record<string, unknown>).data ?? []) as ShipmentErrorRow[]
    return { pageNumber: res.pageNumber, pageSize: res.pageSize, totalCount: res.totalCount, rows }
  }

  // ── mock: simulate the paginated server over shipments.json ──
  let rows = (getAllShipments() as ShipmentErrorRow[]).filter(r => r.panel === params.panel)
  if (params.category && params.category !== 'all') rows = rows.filter(r => r.category === params.category)

  // field-equality filters (FilterPanel + parsed saved query)
  if (params.filter) {
    for (const [key, value] of Object.entries(params.filter)) {
      if (!value) continue
      rows = rows.filter(r => String((r as Record<string, unknown>)[key] ?? '') === value)
    }
  }

  // date-range filters
  const df = params.dateFilters
  if (df) {
    if (df.pickupDateFrom) rows = rows.filter(r => { const d = toISO(r.pickupDate); return d != null && d >= df.pickupDateFrom! })
    if (df.pickupDateTo)   rows = rows.filter(r => { const d = toISO(r.pickupDate); return d != null && d <= df.pickupDateTo! })
    if (df.deliveryDateFrom) rows = rows.filter(r => { const d = toISO(r.deliveryDate); return d != null && d >= df.deliveryDateFrom! })
    if (df.deliveryDateTo)   rows = rows.filter(r => { const d = toISO(r.deliveryDate); return d != null && d <= df.deliveryDateTo! })
  }

  // free-text search
  const term = params.searchTerm?.trim().toLowerCase()
  if (term) {
    if (params.searchAttributeKey) {
      const key = params.searchAttributeKey as keyof ShipmentErrorRow
      rows = rows.filter(r => fieldContains(r, key, term))
    } else {
      rows = rows.filter(r => SEARCH_FIELDS.some(k => fieldContains(r, k, term)))
    }
  }

  // optional sort
  if (params.sortBy) {
    const key = params.sortBy as keyof ShipmentErrorRow
    const dir = params.orderBy === 'desc' ? -1 : 1
    rows = [...rows].sort((a, b) =>
      String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * dir)
  }

  const totalCount = rows.length
  const start = params.pageNumber * params.pageSize
  return {
    pageNumber: params.pageNumber,
    pageSize: params.pageSize,
    totalCount,
    rows: rows.slice(start, start + params.pageSize),
  }
}
```

Note: `params.filter` uses `dataKey` as the key and matches by exact equality (FilterPanel sets `origin`/`destination`/`shipmentStatus`/`scac` to exact values; the saved-query parser produces field/value pairs — Task 7 converts those to `filter`/`searchTerm` appropriately).

- [ ] **Step 5: Run tests — expect PASS**

Run: `npx vitest run src/api/services/gridService.test.ts`
Expected: all pass (counts + list).

- [ ] **Step 6: Typecheck + commit**

```bash
npm run typecheck
git add src/api/services/gridService.ts src/api/services/gridService.test.ts src/api/client.ts
git commit -m "feat(api): gridService.getShipmentErrorList — mock pagination/filter/sort + live POST (list wiring)"
```

---

## Task 5: Query hooks

**Files:**
- Create: `src/api/queries/useShipmentErrorList.ts`
- Create: `src/api/queries/useCategoryCounts.ts`

**Context:** Follow `src/api/queries/useShipmentDetail.ts` for conventions (TanStack Query `useQuery`, key shape, enabled guard). Read it first: `cat src/api/queries/useShipmentDetail.ts`.

- [ ] **Step 1: Create `useShipmentErrorList.ts`**

```typescript
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getShipmentErrorList } from '../services/gridService'
import type { ShipmentErrorListParams } from '../types/shipmentErrorList'
import { mapShipmentErrorRow } from '../mappers/mapShipmentErrorRow'

export function useShipmentErrorList(params: ShipmentErrorListParams) {
  return useQuery({
    queryKey: ['shipment-error-list', params],
    queryFn: async () => {
      const res = await getShipmentErrorList(params)
      return { ...res, rows: res.rows.map(mapShipmentErrorRow) }
    },
    placeholderData: keepPreviousData, // smooth paging — keep previous page visible while fetching
  })
}
```

- [ ] **Step 2: Create `useCategoryCounts.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { getCategoryCounts } from '../services/gridService'

export function useCategoryCounts(panel: string) {
  return useQuery({
    queryKey: ['shipment-category-counts', panel],
    queryFn: () => getCategoryCounts({ panel }),
  })
}
```

- [ ] **Step 3: Typecheck + build + commit**

```bash
npm run typecheck && npm run build
git add src/api/queries/useShipmentErrorList.ts src/api/queries/useCategoryCounts.ts
git commit -m "feat(api): useShipmentErrorList + useCategoryCounts hooks (list wiring)"
```

---

## Task 6: Generator — unique sellShipment + re-key detail files

**Files:**
- Modify: `tools/generate.mjs`

**Context:** `sellShipment` is currently `String(faker.number.int({ min: 25690000, max: 25699999 }))` (10000-value range — collides at 1200 rows). Detail files are written `shipmentDetails[mainRow.buyShipment] = detail`. We make `sellShipment` unique and key detail files by it, so the grid→detail link (`/details/{sellShipment}.json`) is contract-faithful.

- [ ] **Step 1: Make `sellShipment` unique**

Find (near the top of `generateShipment`):
```javascript
  const sellShipment = String(faker.number.int({ min: 25690000, max: 25699999 }));
```
Replace with a module-level uniqueness guarantee. Add near the top of the file (after `faker.seed(42)`):
```javascript
const usedSellShipments = new Set();
function genUniqueSellShipment() {
  let v;
  do { v = String(faker.number.int({ min: 25000000, max: 25999999 })); } while (usedSellShipments.has(v));
  usedSellShipments.add(v);
  return v;
}
```
And change the line in `generateShipment` to:
```javascript
  const sellShipment = genUniqueSellShipment();
```

- [ ] **Step 2: Key detail files by sellShipment**

Find the write loop (near the end):
```javascript
  shipmentDetails[mainRow.buyShipment] = detail;
```
Replace with:
```javascript
  shipmentDetails[mainRow.sellShipment] = detail;
```

- [ ] **Step 3: Regenerate**

Run: `node tools/generate.mjs`
Expected:
```
Done! Generated 1200 shipments.
  shipments.json: 1200 rows
  public/details/: 1200 detail files
```
**Verify the count is exactly 1200 detail files** (proves no sellShipment collisions overwrote files):

Run: `ls public/details/*.json | wc -l`
Expected: `1200`

- [ ] **Step 4: Verify a row's sellShipment has a matching detail file**

```bash
node -e "const s=require('./src/data/shipments.json')[0]; const fs=require('fs'); console.log('sellShipment', s.sellShipment, 'detail exists:', fs.existsSync('public/details/'+s.sellShipment+'.json'))"
```
Expected: `detail exists: true`

- [ ] **Step 5: Run the existing test suite (detail tests still green)**

Run: `npx vitest run`
Expected: all pass (detail mapper/service tests unaffected — they use the fixture, not files).

- [ ] **Step 6: Commit**

```bash
git add tools/generate.mjs src/data/shipments.json
git commit -m "feat(generator): unique sellShipment + key detail files by sellShipment (contract-faithful link)"
```

---

## Task 7: Rewire ShipmentsRoute to server params + hooks

**Files:**
- Modify: `src/routes/shipments/ShipmentsRoute.jsx`

**Context:** Replace the client-side `filteredShipments`/`metrics` memos and `allShipments` with the hooks. The route builds a `ShipmentErrorListParams` object from its existing state and passes the resulting page of VM rows to `ShipmentTable`. Read the full file first: `cat src/routes/shipments/ShipmentsRoute.jsx`. Preserve all unrelated behavior (BottomBar, FilterPanel, ColumnPanel, search slot, metrics-collapse effect).

- [ ] **Step 1: Add pagination state + imports**

Replace the data import:
```javascript
import { getAllShipments, getShipmentsByPanel, getShipmentsByPanelAndCategory, getCategoryCount, SEARCH_ATTRIBUTES } from '../../data'
```
with:
```javascript
import { SEARCH_ATTRIBUTES } from '../../data'
import { useShipmentErrorList } from '../../api/queries/useShipmentErrorList'
import { useCategoryCounts } from '../../api/queries/useCategoryCounts'
```
Add pagination state near the other `useState` calls:
```javascript
const [pageNumber, setPageNumber] = useState(0)
const [pageSize, setPageSize] = useState(25)
```

- [ ] **Step 2: Build the request params (replaces the filteredShipments memo)**

Delete the entire `const filteredShipments = useMemo(...)` block and the `const allShipments = useMemo(() => getAllShipments(), [])` line and the `const selectedShipment = useMemo(...)` that searches `allShipments`. Replace with:

```javascript
// Convert FilterPanel state + applied saved query into server filter params.
const listParams = useMemo(() => {
  const filter = {}
  if (filters.origin) filter.origin = filters.origin
  if (filters.destination) filter.destination = filters.destination
  if (filters.shipmentStatus) filter.shipmentStatus = filters.shipmentStatus
  if (filters.scac) filter.scac = filters.scac
  // applied saved query → field-equality filters
  if (appliedSavedQuery) {
    for (const { key, value } of parseSavedQuery(appliedSavedQuery.query)) {
      const attr = SEARCH_ATTRIBUTES.find(a => a.key === key)
      if (attr) filter[attr.dataKey] = value
    }
  }
  const searchAttr = activeChipKey ? SEARCH_ATTRIBUTES.find(a => a.key === activeChipKey) : null
  return {
    panel: activePanel,
    category: activeTab,
    pageNumber,
    pageSize,
    filter,
    searchTerm: debouncedQuery.trim() || undefined,
    searchAttributeKey: searchAttr ? searchAttr.dataKey : null,
    dateFilters: {
      pickupDateFrom: filters.pickupDateFrom,
      pickupDateTo: filters.pickupDateTo,
      deliveryDateFrom: filters.deliveryDateFrom,
      deliveryDateTo: filters.deliveryDateTo,
    },
  }
}, [activePanel, activeTab, pageNumber, pageSize, filters, appliedSavedQuery, activeChipKey, debouncedQuery])

const {
  data: listData,
  isLoading: listLoading,
  isError: listError,
  refetch: refetchList,
} = useShipmentErrorList(listParams)

const pageRows = listData?.rows ?? []
const totalCount = listData?.totalCount ?? 0

// selected shipment comes from the current page (selection id = VM id = sellShipment)
const selectedShipment = useMemo(
  () => pageRows.find(r => r.id === selectedShipmentId) || null,
  [pageRows, selectedShipmentId],
)
```

- [ ] **Step 3: Reset to page 0 when the query changes**

Add an effect so changing panel/tab/filter/search returns to the first page:
```javascript
useEffect(() => { setPageNumber(0) }, [activePanel, activeTab, filters, appliedSavedQuery, activeChipKey, debouncedQuery])
```

- [ ] **Step 4: Replace the metrics memo with the counts hook**

Delete the `const metrics = useMemo(() => { ... getCategoryCount ... }, [allShipments])` block. Replace with hook-driven counts for all three panels (the metrics strip shows counts across panels, so fetch each):

```javascript
const { data: exceptionCounts = [] } = useCategoryCounts('exceptions')
const { data: monitoringCounts = [] } = useCategoryCounts('monitoring')
const { data: pgipgrCounts = [] } = useCategoryCounts('pgipgr')

const metrics = useMemo(() => {
  const c = (arr, cat) => arr.find(x => x.category === cat)?.count ?? 0
  return {
    dateIssues: c(exceptionCounts, 'date-issues'),
    routingReview: c(exceptionCounts, 'routing-review'),
    tenderIssues: c(exceptionCounts, 'tender-issues'),
    tenderReview: c(exceptionCounts, 'tender-review'),
    bidReview: c(exceptionCounts, 'bid-review'),
    hold: c(monitoringCounts, 'hold'),
    consolidation: c(monitoringCounts, 'consolidation'),
    sent: c(monitoringCounts, 'sent'),
    spotBid: c(monitoringCounts, 'spotbid'),
    approved: c(monitoringCounts, 'approved'),
    pgipgrErrors: c(pgipgrCounts, 'pgipgr-errors'),
    ratingFailure: c(pgipgrCounts, 'rating-failure'),
    manualPgipgr: c(pgipgrCounts, 'manual-pgipgr'),
  }
}, [exceptionCounts, monitoringCounts, pgipgrCounts])
```

- [ ] **Step 5: Pass page + pagination + states to ShipmentTable**

Find where `<ShipmentTable ... shipments={filteredShipments} ... />` is rendered. Change the `shipments` prop to `pageRows` and add pagination + state props:
```jsx
<ShipmentTable
  shipments={pageRows}
  onRowSelect={handleRowSelect}
  selectedId={selectedShipmentId}
  /* ...existing props (onToggleColumnPanel, visibleColumns, onScrollStart, activeChipKey)... */
  pageNumber={pageNumber}
  pageSize={pageSize}
  totalCount={totalCount}
  onPageChange={setPageNumber}
  onPageSizeChange={(n) => { setPageSize(n); setPageNumber(0) }}
  isLoading={listLoading}
  isError={listError}
  onRetry={refetchList}
/>
```

- [ ] **Step 6: Typecheck + build**

```bash
npm run typecheck && npm run build
```
Expected: clean. (`handleRowSelect` already toggles `selectedShipmentId`; it now receives the VM `id`. The detail hook `useShipmentDetail(selectedShipmentId)` now fetches `/details/{sellShipment}.json`, which Task 6 created.)

- [ ] **Step 7: Commit**

```bash
git add src/routes/shipments/ShipmentsRoute.jsx
git commit -m "feat(shipments): route consumes paginated grid hooks + server filter params (list wiring)"
```

---

## Task 8: ShipmentTable — page rendering, pagination UI, loading/error, select by id

**Files:**
- Modify: `src/components/shipments/ShipmentTable.jsx`

**Context:** The table virtualizes over `shipments` and selects by `s.buyShipment` in ~6 spots. Now it receives one page of `ShipmentRowVM` and must (a) select by `s.id`, (b) render pagination controls, (c) show loading/error states. Read the file first.

- [ ] **Step 1: Change the selection key from `buyShipment` to `id`**

Update the component signature to accept the new props:
```javascript
export default function ShipmentTable({ shipments, onRowSelect, selectedId, onToggleColumnPanel, visibleColumns, onScrollStart, activeChipKey, pageNumber, pageSize, totalCount, onPageChange, onPageSizeChange, isLoading, isError, onRetry }) {
```
Replace every `s.buyShipment`/`shipment.buyShipment` used as the **selection/identity key** with `.id`:
- `handleSelect`: `onRowSelect(shipment.id)` (was `.buyShipment`)
- `VirtualRow`/`VirtualActionRow`: `isSelected={selectedId === s.id}`, `isMenuOpen={menuOpenId === s.id}`, `menuOpen={menuOpenId === s.id}`
- `ShipmentRow` menu toggle: `onMenuToggle(menuOpen ? null : shipment.id)`, `<ActionMenu shipmentId={shipment.id} ...>`
- auto-scroll effect: `shipments.findIndex(s => s.id === selectedId)`

(Leave the **display** column `buyShipment` alone — it still shows the Buy Shipment value; only the identity key changes.)

- [ ] **Step 2: Add loading + error states**

At the top of the table body render (before the `<List>`), short-circuit:
```jsx
{isError ? (
  <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
    <p>Couldn't load shipments.</p>
    <button type="button" onClick={onRetry} style={{ marginTop: 8 }}>Retry</button>
  </div>
) : isLoading && shipments.length === 0 ? (
  <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--text-placeholder)' }}>
    Loading shipments…
  </div>
) : (
  /* existing <List> virtualized table */
)}
```
(With `keepPreviousData`, `isLoading` is only true on the very first load; page changes keep the previous page visible — so guard the spinner on `shipments.length === 0`.)

- [ ] **Step 3: Add pagination controls below the table**

After the table region, render controls:
```jsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-2) var(--spacing-4)', borderTop: '1px solid var(--border-default)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
    {totalCount === 0 ? '0 results' : `${pageNumber * pageSize + 1}–${Math.min((pageNumber + 1) * pageSize, totalCount)} of ${totalCount.toLocaleString('en-US')}`}
  </span>
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      Rows
      <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
        {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
    <button type="button" disabled={pageNumber === 0} onClick={() => onPageChange(pageNumber - 1)}>Prev</button>
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      Page {pageNumber + 1} of {Math.max(1, Math.ceil(totalCount / pageSize))}
    </span>
    <button type="button" disabled={(pageNumber + 1) * pageSize >= totalCount} onClick={() => onPageChange(pageNumber + 1)}>Next</button>
  </div>
</div>
```

- [ ] **Step 4: Typecheck + build**

```bash
npm run typecheck && npm run build
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/shipments/ShipmentTable.jsx
git commit -m "feat(shipments): table renders a page + pagination UI + loading/error; select by id (list wiring)"
```

---

## Task 9: Retire dead data accessors

**Files:**
- Modify: `src/data/index.js`

**Context:** `getShipmentsByPanel`, `getShipmentsByPanelAndCategory`, `getCategoryCount` (and the prebuilt `byPanel`/`byPanelAndCategory` indexes) are no longer referenced (ShipmentsRoute now uses the hooks). `getAllShipments` + `SEARCH_ATTRIBUTES` stay (search index uses them). Confirm before deleting.

- [ ] **Step 1: Confirm no remaining consumers**

Run:
```bash
grep -rn "getShipmentsByPanel\|getShipmentsByPanelAndCategory\|getCategoryCount\b\|getShipmentById" src/ | grep -v "src/data/index.js"
```
Expected: no matches (if `getShipmentById` still has a consumer, leave it; otherwise it can go too). If any panel/category accessor still has a consumer, stop and report — Task 7 missed a spot.

- [ ] **Step 2: Remove the dead accessors + indexes**

Delete from `src/data/index.js`: the `byPanel` / `byPanelAndCategory` index-building block and the `getShipmentsByPanel`, `getShipmentsByPanelAndCategory`, `getCategoryCount` functions. Keep `getAllShipments`, `getShipmentById` (if still used), and `SEARCH_ATTRIBUTES`. The file should reduce to the static import + `getAllShipments` (+ `getShipmentById` if used) + `SEARCH_ATTRIBUTES`.

- [ ] **Step 3: Typecheck + build + full test suite**

```bash
npm run typecheck && npm run build && npx vitest run
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/data/index.js
git commit -m "refactor(data): retire client-side panel/category accessors (replaced by gridService)"
```

---

## Task 10: Integration smoke + final gate

**Files:** none (verification only).

- [ ] **Step 1: Full gate**

```bash
npx vitest run && npm run typecheck && npm run build
```
Expected: all green.

- [ ] **Step 2: Throwaway full-corpus service smoke**

Create `src/api/services/__gridsmoke.tmp.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { getShipmentErrorList, getCategoryCounts } from './gridService'
import { mapShipmentErrorRow } from '../mappers/mapShipmentErrorRow'

// Uses real shipments.json via getAllShipments (no mocks here).
describe('grid service full-corpus smoke (mock mode)', () => {
  for (const panel of ['exceptions', 'monitoring', 'pgipgr']) {
    it(`paginates ${panel} end-to-end and every row maps + links`, async () => {
      const counts = await getCategoryCounts({ panel })
      const first = await getShipmentErrorList({ panel, pageNumber: 0, pageSize: 25 })
      expect(first.totalCount).toBeGreaterThan(0)
      // walk all pages, ensure slicing is exhaustive and rows map without throwing
      let seen = 0
      const pages = Math.ceil(first.totalCount / 25)
      for (let p = 0; p < pages; p++) {
        const res = await getShipmentErrorList({ panel, pageNumber: p, pageSize: 25 })
        for (const row of res.rows) {
          const vm = mapShipmentErrorRow(row)
          expect(vm.id).toBeTruthy()        // = sellShipment, the detail link
          expect(vm.id).toBe(row.sellShipment)
        }
        seen += res.rows.length
      }
      expect(seen).toBe(first.totalCount)   // pagination covers the whole set exactly once
      expect(counts.reduce((s, c) => s + c.count, 0)).toBe(first.totalCount) // counts sum to panel total
    })
  }
})
```
Run: `npx vitest run src/api/services/__gridsmoke.tmp.test.ts`
Expected: 3 pass.

- [ ] **Step 2b: Verify the grid→detail link resolves against generated files**

```bash
node -e "const fs=require('fs'); const rows=require('./src/data/shipments.json'); const miss=rows.filter(r=>!fs.existsSync('public/details/'+r.sellShipment+'.json')); console.log('rows', rows.length, 'missing detail files', miss.length)"
```
Expected: `missing detail files 0`.

- [ ] **Step 3: Remove the throwaway test**

```bash
rm src/api/services/__gridsmoke.tmp.test.ts
```

- [ ] **Step 4: Dev-server boot + visual note**

```bash
npm run dev:odyssey-one
```
Manually confirm in the browser: table shows a page; pagination prev/next changes pages; tab badges show counts; switching tabs/panels resets to page 1; clicking a row opens the detail (now fetched by sellShipment); filters/search narrow the list. (No headless browser in CI — this step is manual.)

- [ ] **Step 5: Final test run + commit any progress note**

```bash
npx vitest run
git add -A && git commit -m "test: shipments list/grid wiring verified (mock pagination end-to-end)" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- §3 contract endpoints → Task 3 (count GET), Task 4 (list POST). ✅
- §4 architecture (gridService + mapper + hooks + mock/live seam) → Tasks 2–5. ✅
- §4.2 generator (unique sellShipment + re-key) → Task 6. ✅ Search layer untouched (no task touches `src/search/`). ✅ `shipmentService.ts` unchanged (no task touches it — re-key is via generator + caller). ✅
- §4.3 detail link via sellShipment → Task 6 (files) + Task 7 Step 5/Task 8 Step 1 (selection id). ✅
- §5 DTOs (provisional row shape) → Task 1. ✅
- §6 mock semantics (filter/sort/paginate order) → Task 4 Step 4. ✅
- §7 UX (pagination UI, loading/error, reset-to-page-1) → Task 7 Step 3, Task 8 Steps 2–3. ✅
- §8 deferred (search rewire, writes, docs/notes/history, CSV, auth) → no tasks (correctly out of scope). ✅
- §9 testing → Tasks 2/3/4 unit + Task 10 smoke. ✅

**Placeholder scan:** No TBD/TODO in steps. The one "adapt to actual helper name in client.ts" (Task 4 Step 1) is a concrete instruction with a fallback, not a placeholder — the engineer greps and mirrors `apiGet`.

**Type consistency:** `ShipmentErrorRow`/`ShipmentRowVM`/`ShipmentErrorListParams`/`ShipmentErrorListResponse`/`CategoryCount` names consistent across Tasks 1–5. `getShipmentErrorList`/`getCategoryCounts` signatures consistent between service (Task 3/4), hooks (Task 5), route (Task 7), and smoke (Task 10). Selection key `id` (= `sellShipment`) consistent between route (Task 7) and table (Task 8). Generator emits `sellShipment` (Task 6) = the row's `sellShipment` field = VM `id`. ✅
