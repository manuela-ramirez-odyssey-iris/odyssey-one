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

All TypeScript, mirroring the Shipments file pattern. **All field names provisional until live Swagger** — the mapper is the single reconciliation point.

### `types/orderList.ts`

```ts
interface OrderListRow {            // raw API row — names from LINX stories
  orderId: string
  orderNumber: string | null        // ID column displays this when present (LINX-11013)
  owningOrganizationId: string      // customer owner — composite key with orderNumber (LINX-9279)
  customerName: string
  orderSource: string
  shipDirection: string
  freightTerms: string
  equipment: string
  consignorLocationId: string
  originCity: string; originState: string; originCountry: string
  earliestPickupDateTime: string    // ISO
  latestPickupDateTime: string
  consigneeLocationId: string
  destinationCity: string; destinationState: string; destinationCountry: string
  earliestDeliveryDateTime: string
  latestDeliveryDateTime: string
  grossWeight: { value: number; uom: string }
  volume: { value: number; uom: string }
  commodity: string
  orderStatus: OrderStatus
}

type OrderStatus =                  // DA §4 (LINX-7555); "New" intentionally absent.
                                    // Only DRAFT/RD_4_PLNNG codes are confirmed; the rest are
                                    // provisional names pending Swagger (see A5)
  | 'DRAFT' | 'RD_4_PLNNG' | 'PLANNED_LOAD' | 'PLANNING_FAILED'
  | 'PLANNED_SHIPMENT' | 'SHIPMENT_FAILED' | 'HOLD' | 'CANCELLED'

interface OrderListParams {
  pageNumber: number                // 0-based (assumption A1)
  pageSize: number                  // 25 | 50 | 100 (assumption A2)
  sortBy?: string                   // OrderListRow key
  sortOrder?: 'asc' | 'desc'
  statusScope?: OrderStatus[]       // future tab strip binds here (Q25)
  filter?: {                        // Basic tier (LINX-10798/10809); supported by the service for tests +
                                    // the future panel — the page sends no filter in THIS build
    orderNumber?: string
    orderStatus?: OrderStatus[]     // OR within field
    customerId?: string[]           // OR within field; EntityChip scope binds here later
  }                                 // AND across fields
}

interface OrderListResponse {
  rows: OrderListRow[]
  totalCount: number                // toolbar item count
  pageNumber: number
  pageSize: number
}
```

Caveat: section-map row 1 describes the live response as "compact **role-nested** grid rows" — actual nesting (e.g. consignor/consignee objects) unknown until Swagger. If nested, only `types/` + `mapper/` change.

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
- `tools/generate-orders.mjs` (new, separate from the shipments generator) — faker, **seed 42**, **4,509 rows** → `src/data/orders.json`; realistic distributions across the 8 statuses, ~15 customers, US city pairs, the 5 equipment types, chemical-leaning commodities. `src/data/orders.js` exports `getAllOrders()`.

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

## 8. Assumptions (flagged — canon is silent; confirm with team)

| # | Assumption | Basis |
| --- | --- | --- |
| A1 | `pageNumber` 0-based | Shipments seam precedent |
| A2 | Page sizes 25/50/100, default 25 | Shipments precedent |
| A3 | Default sort: Earliest Pickup ascending | Operational guess — confirm |
| A4 | Sorting = toolbar direction toggle on the default sort column only; no per-column header sorting this build | Design shows a lone direction icon, no header sort affordances |
| A5 | Response envelope field names (`rows`/`totalCount`/…) | Provisional until Swagger |
| A6 | Loading/empty/error visuals | No design; our patterns |
| A7 | Fake-data status distribution | Invented, reproducible |

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
