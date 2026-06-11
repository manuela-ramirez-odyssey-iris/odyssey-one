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

Field names aligned to the **evidenced `/order/view` payload** (LINX-10700) — the list-row payload itself lives in the Confluence "Order Service Phase-2" LLD (not yet fetched; see Q30). The view payload establishes the service's naming conventions: flat `*Value`/`*UomCode` pairs, `origin*`/`destination*` prefixes, `customerId` as the owning-org key, status as a code/name object.

```ts
interface OrderListRow {            // raw API row — names per LINX-10700 conventions; list-row
                                    // payload pending LLD (Q30)
  orderId: number
  orderNumber: string | null        // ID column displays this when present (LINX-11013)
  customerId: string                // owning organization in payload terms (LINX-10700);
                                    // composite key with orderNumber (LINX-9279)
  orderDate: string                 // ISO creation timestamp (LINX-10700) — default sort anchor
  orderSource: string               // provisional flattening of sourceApplication.sourceApplicationCode
  shipDirectionCode: string
  freightTermCode: string
  equipmentNumber: string
  originPartnerId: string           // = "Consignor Location ID" column (provisional mapping)
  originCity: string; originRegion: string; originCountry: string
  earliestPickupDateTime: string    // ISO — not evidenced in payloads yet (provisional)
  latestPickupDateTime: string
  destinationPartnerId: string      // = "Consignee Location ID" column (provisional mapping)
  destinationCity: string; destinationRegion: string; destinationCountry: string
  earliestDeliveryDateTime: string
  latestDeliveryDateTime: string
  grossWeightValue: number          // flat value+UomCode pairs per LINX-10700 (not nested objects)
  grossWeightUomCode: string
  volumeValue: number
  volumeUomCode: string
  commodity: string                 // provisional — no payload evidence
  orderStatus: {                    // nested object per LINX-10700
    orderStatusCode: OrderStatusCode
    orderStatusName: string
  }
}

type OrderStatusCode =              // DA §4 (LINX-7555); "New" intentionally absent.
                                    // Evidenced literals: 'HOLD' (LINX-9730 audit diff),
                                    // 'DRAFT' (LINX-9282), 'RD_4_PLNNG' (LINX-8049).
                                    // The other four are provisional names (Q32).
  | 'DRAFT' | 'RD_4_PLNNG' | 'PLANNED_LOAD' | 'PLANNING_FAILED'
  | 'PLANNED_SHIPMENT' | 'SHIPMENT_FAILED' | 'HOLD' | 'CANCELLED'

interface OrderListParams {
  pageNumber: number                // 0-based — confirmed (Manuela; LINX-6109 example "pageNumber": 0)
  pageSize: number                  // 25 | 50 | 100, default 25 — interim (Q29: real max/default)
  sortBy?: string                   // literal param names confirmed by LINX-11165
  sortOrder?: 'asc' | 'desc'
  statusScope?: OrderStatusCode[]   // future tab strip binds here (Q25)
  filter?: {                        // Basic tier (LINX-10798/10809); supported by the service for tests +
                                    // the future panel — the page sends no filter in THIS build
    orderNumber?: string
    orderStatus?: OrderStatusCode[] // OR within field
    customerId?: string[]           // OR within field; EntityChip scope binds here later
  }                                 // AND across fields
}

interface OrderListResponse {
  rows: OrderListRow[]              // envelope field names provisional (Q29) —
  totalCount: number                // no story names the list envelope
  pageNumber: number
  pageSize: number
}
```

Caveat: section-map row 1 describes the live response as "compact **role-nested** grid rows" — if rows nest consignor/consignee objects, only `types/` + `mapper/` change. **Default request:** `{ pageNumber: 0, pageSize: 25, sortBy: 'orderDate', sortOrder: 'desc' }` (newest first — A3 resolved).

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

## 8. Assumptions — status after review (Manuela 2026-06-10 + raw-dump evidence pass)

| # | Status | Resolution / what remains |
| --- | --- | --- |
| A1 | ✅ Resolved | `pageNumber` 0-based — confirmed by Manuela; corroborated by LINX-6109 sibling-API example (`"pageNumber": 0`) |
| A2 | ⏳ Interim 25 | Pagination-only API confirmed (no full-list endpoint in stories). OPEN → Q29: real max/default page size + response envelope names; lives in the Confluence "Order Service Phase-2" LLD |
| A3 | ✅ Resolved | **Newest first** (`orderDate` desc) per Manuela; `orderDate` evidenced on the view payload. OPEN → Q31: confirm it's on list rows + a valid `sortBy` |
| A4 | ⏳ Open → Efrain | Single toolbar toggle feels limiting (Manuela) — header-click sorting intended? Build ships toggle-only meanwhile |
| A5 | 🔶 Partially resolved | Row field names now aligned to the evidenced `/order/view` payload (LINX-10700). OPEN → Q30/Q32: list-row payload + full status-code value set |
| A6 | ⏳ Open → Efrain | Loading/empty/error designs pending; provisional patterns (`EmptyState`, retry) meanwhile |
| A7 | ✅ Resolved in principle | Master data is **shared cross-domain** — order-service lookups proxy `/master-data/v1/*` (≈12 stories, e.g. LINX-6010/6011/6099/11163). Generator mirrors the Shipments pools (same customers/locations/equipment) for cross-domain consistency |

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
