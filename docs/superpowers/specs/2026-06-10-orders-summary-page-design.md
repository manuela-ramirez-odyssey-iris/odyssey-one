# Orders — Order Summary Page (screen 0) — Design Spec

**Date:** 2026-06-10 · **Phase:** Orders Phase 1, build #1 · **Status:** Awaiting GATE A approval
**Design source:** Efrain's Figma export `0 Summary Page` (`vault/10-domains/orders/screenshots/`)
**Data source of truth:** `vault/10-domains/orders/domain-analysis.md` §5, `section-map.md` rows 1–2

## 1. Context & goal

Build the **Order Summary Page** — the Orders route's main screen: a paginated grid of orders with a toolbar — as Efrain's design shows it, on top of a data layer shaped like the real backend (`POST /order-service/v3/order/list`, LINX-10777) so flipping to the live API later is an environment-variable change, not a rewrite.

**Provenance note (corrects Session 50):** the 18 screenshots are **Efrain's Figma design exports**, not Angular UI captures. They are design intent. The built Angular app exists separately and may be cloned later as a *business-logic* reference only — its frontend is explicitly not a reference.

**Deliberate choice:** the grid is built **app-local** (`apps/odyssey-one/src/components/orders/`), not normalized. Table normalization is scheduled (Efrain, ~2026-06-11); the headless-table approach below is chosen so that normalization re-skins the rendering without touching logic.

## 2. Scope

### In

- `/orders` route page: PageHeader + toolbar + grid + pagination, in existing AppShell chrome.
- Full data layer on the `src/api/` seam: types, mapper, service (mock + live branches), react-query hook, fixture, tests.
- Seeded fake-data generator (~4,509 orders) → `src/data/orders.json`.
- Loading / error / empty states (our patterns; Efrain hasn't designed these).

### Out (rendered-but-inert or absent)

| Item | State in this build | Unblocks later |
| --- | --- | --- |
| Filter panel | "Filters" button rendered, inert | Next build; request Efrain's open-panel export first |
| Tab strip (All/Saved/…) | Absent; `OrderListParams` carries a status-scope field | Q25 answer |
| Create Order button | Rendered, inert | Create-form build |
| Row actions (three-dot) | Menu opens with canonical items (View, Edit, Copy, Cancel, Restore, Delete), all inert | Detail page + action builds |
| ID link navigation | Link-styled, navigates nowhere | Order detail build |
| Column management, bulk actions, CSV export, EntityChip↔scope wiring | Absent / inert; params already accommodate them | Later builds |

## 3. Page composition

Chrome: our existing `AppShell` (Navbar/Sidebar in the design exports are **ignored** — already defined platform-wide). Route follows the `ShipmentsRoute` contract (`AppShell` + children; no `filterPanel` yet).

- **PageHeader** `@odyssey/ui` — title "Orders", primary `Button` "Create Order" (plus icon), inert.
- **Toolbar row** (app-local): item count ("4,509 items", from response `totalCount`), sort-direction `IconButton` toggle, `FilterButton` "Filters" (inert).
- **Grid** — Efrain's lean default column set, in order:
  1. Select checkbox (`Checkbox`; header = select-all with indeterminate)
  2. **ID** — link-styled; displays `orderNumber` when present, else `orderId` (LINX-11013)
  3. **Customer**
  4. **Origin** — `CODE: City, ST` (consignor location ID folded in, per design)
  5. **Destination** — same format (consignee)
  6. **Weight** — `4300 lbs`
  7. **Volume** — `730 cbf`
  8. **Commodity**
  9. **Equipment**
  10. **Early Pickup** — formatted date/time
  11. **Action** — three-dot `MenuDropdown` in-cell, sticky right
- **Pagination footer** (app-local): Prev/Next + page-size select (25/50/100).

Note: the grid default column set ≠ the 18-column CSV-export set (LINX-11165). The row type carries all 18 fields; the grid *shows* the lean set. Order Status column is not in Efrain's visible set — status surfaces via the future tab strip.

## 4. Table foundation — TanStack Table v8 (headless)

New dependency: `@tanstack/react-table` in `apps/odyssey-one`.

- Headless: logic only (column defs, row selection, sort state, pagination state); we own 100% of markup/styles → tokens now, normalized Table skin later, logic unchanged.
- `manualPagination: true` + `manualSorting: true` — the table never holds more than one page; the service (mock or live) does filtering/sorting/paging, exactly like the real API.
- Row selection via built-in `rowSelection` state.
- `@tanstack/react-virtual` is the sanctioned escape hatch if page sizes ever grow; **not** included day one (≤100 rows renders fine).

Rejected: AG Grid / MUI DataGrid (ship their own design systems, fight ours); hand-rolled à la ShipmentTable (the rushed pattern we're moving away from).

## 5. Data layer (`apps/odyssey-one/src/api/`)

All TypeScript, mirroring the Shipments file pattern. Field names are **verbatim from the Order Service Phase-2 LLD** (fetched 2026-06-11); final confirmation against live Swagger remains, with the mapper as the single reconciliation point.

### `types/orderList.ts`

Field names taken **verbatim from the "Order Service Phase-2" LLD** (Confluence 3401056276, fetched 2026-06-11; raw dump at `vault-sources/10-domains/orders/lld/order-service-phase-2.md`). The row is **role-nested** (consignor/consignee objects), exactly as section-map row 1 predicted.

```ts
interface OrderListRow {            // verbatim from LLD /order/list response example
  orderNumber: string               // "SUT355123" — the ID column value
  orderSource: string               // "INTEGRATED"
  customer: string                  // "SABIC_CLT" — display key; no separate customerId on the row
  shipDirection: string             // "Inbound"
  freightTerms: string              // "Pre-Paid"
  equipment: string                 // "TL"
  consignor: {
    locationId: string              // "RGC-STL-001" — Origin cell prefix code
    city: string; state: string; country: string
    earliestPickupDateTime: string  // ISO
    latestPickupDateTime: string
  }
  consignee: {
    locationId: string
    city: string; state: string; country: string
    earliestDeliveryDateTime: string
    latestDeliveryDateTime: string
  }
  grossWeight: { value: number; uom: string }   // { 4300, "lbs" }
  volume: { value: number; uom: string }        // { 730, "cbf" }
  commodity: string                 // "Plastic"
  orderStatus: string               // DISPLAY LABEL on the row ("Ready For Plan"), not a code
}

type OrderStatusCode =              // /order-status/lookup enum (LLD) + DRAFT (create-order remark).
                                    // NOTE: HOLD is NOT a status — it's a boolean orderHoldStatus
                                    // flag on the order (LLD; resolves the old Hold-status question)
  | 'DRAFT' | 'RD_4_PLNNG' | 'PLN_LD' | 'PLNED_SHIP'
  | 'PLNNG_FAIL' | 'SHIP_FAIL' | 'CAN'

interface OrderListRequest {        // verbatim request shape from LLD
  pagination: {
    pageNumber: number              // LLD list example is 1-BASED ("pageNumber": 1) but the sibling
                                    // lookup example is 0-based — discrepancy tracked in Q29
    pageSize: number                // LLD examples use 20; max not stated (Q29)
  }
  filters?: {                       // all-array filter object; the page sends none in THIS build.
    customers?: string[]            // EntityChip scope binds here later
    orderStatuses?: string[]        // future tab strip binds here (Q25)
    orderNumbers?: string[]
    originCities?: string[]; originStates?: string[]; originCountries?: string[]
    destinationCities?: string[]; destinationStates?: string[]; destinationCountries?: string[]
    earliestPickupDateFrom?: string; earliestPickupDateTo?: string
    latestPickupDateFrom?: string; latestPickupDateTo?: string
    earliestDeliveryDateFrom?: string; earliestDeliveryDateTo?: string
    latestDeliveryDateFrom?: string; latestDeliveryDateTo?: string
  }
  sort?: { field: string; direction: 'asc' | 'desc' }  // LLD example default: orderNumber asc;
                                                        // valid field list not stated (Q31)
}

interface OrderListResponse {       // verbatim envelope from LLD
  success: boolean
  orders: OrderListRow[]
  pagination: { pageNumber: number; pageSize: number; totalCount: number }
  error: string | null
}
```

**Default request:** `{ pagination: { pageNumber: 1, pageSize: 20 }, sort: { field: 'orderNumber', direction: 'desc' } }`. The list row has **no `orderDate`**, so Manuela's newest-first default can't bind to a creation timestamp yet — `orderNumber desc` is the interim proxy; Q31 asks whether a date sort field is supported. Equipment/commodity/weight filters (advanced tier, LINX-10803/10810) are absent from the LLD filter object — flagged in Q30's residual.

### `mappers/mapOrderListRow.ts`

Pure `mapOrderListRow(row: OrderListRow): OrderRowVM`. VM = flat display strings: `id`, `idLabel` (orderNumber ?? orderId), `customer`, `origin` ("RGC: St Louis, MO"), `destination`, `weight` ("4300 lbs"), `volume` ("730 cbf"), `commodity`, `equipment`, `earlyPickup` (formatted), `status`. Null-safe coercions like `mapShipmentErrorRow`.

### `services/orderService.ts`

`getOrderList(params: OrderListParams): Promise<OrderListResponse>`

- `live` → `apiPost<OrderListResponse>('/order-service/v3/order/list', params)`
- `mock` → in-memory filter (AND across fields, OR within) → sort → paginate over `getAllOrders()` (`src/data/orders.json`), same structure as `gridService.ts`'s mock branch.

### `queries/useOrderList.ts`

`useQuery` key `['order-list', params]`, `keepPreviousData`, rows mapped through `mapOrderListRow` in the hook (Shipments precedent).

### Fixture & generator

- `fixtures/orderListRow.sample.ts` — small typed sample for mapper/service tests.
- `tools/generate-orders.mjs` (new, separate from the shipments generator) — faker, **seed 42**, **4,509 rows** → `src/data/orders.json`; realistic distribution across the 8 statuses. **Master-data pools (customers, locations, equipment, commodities) mirror the Shipments generator's pools** — master data is shared cross-domain in the real system (A7), so the fake data should be too. `src/data/orders.js` exports `getAllOrders()`.

## 6. UI structure (app-local)

```
src/routes/orders/OrdersRoute.jsx      — AppShell + page state (page, pageSize, sort) → useOrderList
src/components/orders/
  OrdersToolbar.jsx                    — count · sort toggle · Filters button (inert)
  OrdersTable.jsx                      — TanStack Table: column defs, header, rows, selection
  OrdersTablePagination.jsx            — Prev/Next + page-size select
  OrderRowActionMenu.jsx               — three-dot MenuDropdown, inert items
```

`pageNumber` resets to 0 when sort changes (Shipments-proven pattern). Normalized components used throughout where they fit; raw values only where no token/component exists yet (recorded for Phase 2).

## 7. States

- **Loading (first load):** lightweight inline loading row — no design yet, keep minimal.
- **Loading (page change):** previous page stays visible (`keepPreviousData`), controls disabled.
- **Error:** message + Retry (`refetch`), Shipments pattern.
- **Empty:** `EmptyState` component ("No orders found").

## 8. Assumptions — status after review (Manuela 2026-06-10) + LLD fetch (2026-06-11)

| # | Status | Resolution / what remains |
| --- | --- | --- |
| A1 | 🔶 Reopened, narrow | LLD `/order/list` example is **1-based** (`"pageNumber": 1`); sibling lookup example is 0-based. Build uses 1-based per the list example; confirm in Q29. One-line fix either way |
| A2 | 🔶 Interim **20** | LLD examples use `pageSize: 20` → adopted as default (supersedes interim 25). Max + page-size options still open (Q29) |
| A3 | 🔶 Blocked on Q31 | Manuela wants **newest first**, but the LLD list row has **no `orderDate`** and the example sort is `orderNumber asc`. Interim: `orderNumber desc` as newest-first proxy; Q31 asks for a date sort field |
| A4 | ⏳ Open → Efrain | Single toolbar toggle feels limiting (Manuela) — header-click sorting intended? Build ships toggle-only meanwhile (Q33) |
| A5 | ✅ Resolved | Full request/response payloads verbatim from the LLD (page 3401056276); types in §5 are no longer provisional. Status enum resolved incl. **HOLD = boolean flag, not a status** (Q32 ✓) |
| A6 | ⏳ Open → Efrain | Loading/empty/error designs pending; provisional patterns (`EmptyState`, retry) meanwhile (Q34) |
| A7 | ✅ Resolved in principle | Master data is **shared cross-domain** — order-service lookups proxy `/master-data/v1/*` (≈12 stories, e.g. LINX-6010/6011/6099/11163). Generator mirrors the Shipments pools (same customers/locations/equipment) for cross-domain consistency |

LLD bonus finding for the deferred tab strip: **no count/badge endpoint exists** in the LLD — tab badge counts have no documented data source yet (folded into Q25's eventual answer).

## 9. Testing

Co-located vitest, existing `api/` patterns:

- `mapOrderListRow.test.ts` — field mapping, formatting, null-safety (fixture-driven).
- `orderService.test.ts` — mock-mode: filtering (AND/OR semantics), sorting, pagination math, totalCount; `vi.mock('../config')` + injected small store (the `gridService.test.ts` import-after-mock pattern).
- Generator smoke: row count + seed reproducibility (script-level check, not vitest).
- No component tests this build (consistent with current repo practice).

## 10. Open questions touching this page (do not block)

- **Q25** — tab set (stories vs Efrain's design) → tab strip deferred; `statusScope` param ready.
- **Q1** — custom-views persistence endpoint → column management deferred.
- **Q5** — bulk status change UI → checkboxes render, no bulk bar.
- **Request to Efrain:** export of the *open* filter panel before the filter build.

## 11. Phase 2 normalization hooks

Built app-local on purpose; these graduate via `/normalize` with Efrain (table normalization expected ~2026-06-11): data grid (header/row/cell skin), grid toolbar (count + sort), in-cell three-dot menu trigger, pagination control. The headless split means normalization replaces markup/styles only.
