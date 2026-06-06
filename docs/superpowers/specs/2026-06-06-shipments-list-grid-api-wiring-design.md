# Shipments List/Grid API Wiring — Design Spec

**Date:** 2026-06-06
**Status:** Approved (design); pending spec review
**Author:** Manuela (with Claude)
**Related:** [[2026-06-05-shipments-detail-api-wiring-design]] (Plan 1), Plan 2b full-contract migration, `docs/production-readiness-roadmap.md`, `vault/20-cross-cutting/api-integration/`

> **AI-generated draft — validate before acting.** The grid-row DTO and the `error/list` filter shape are derived from the Confluence LLDs (WIP, image-heavy), NOT the live Swagger. Field names must be reconciled against `shipment-swagger/v3/api-docs` and confirmed with Jana before they are treated as final. **Confidence: high** on architecture/structure, **medium** on exact field names.

---

## 1. Problem

The shipment **detail** (bottom-bar tabs) is wired through a production-shaped data layer (Plan 1 + Plan 2b): a typed DTO, a mapper, a mock/live mode switch, and TanStack Query. Flipping it to real data is a one-flag swap.

The shipment **list** (the main table) is not. It reads `src/data/shipments.json` via a **synchronous static import** and filters all 1200 rows **client-side**. This is the opposite of the real backend, which:

- has **no generic "all shipments" endpoint** — the list IS the exception/monitoring/PGI-PGR grids;
- serves rows **paginated server-side** (`{pageNumber, pageSize, totalCount}`), with filter/sort as request params;
- returns **tab-badge counts** from a separate endpoint, not by grouping all rows.

Because the live endpoint physically cannot return all rows, the current "load-all-then-filter" model can never flip to live — it would require a rewrite. This spec wires the list the production way **now**, with fake data that mimics the grid backend, so the eventual live cutover is wiring, not rewrite.

## 2. Goal

Restructure the shipments list + tab counts to consume the real grid contract through the existing mock/live seam, including **real pagination UI on the table**. In mock mode the generated data is filtered/sorted/paginated in-memory to *simulate* the paginated server; in live mode the same service calls the real endpoints.

**Decided (this round): faithful server-side pagination.** The table consumes one page at a time; filter/sort/search become query params; category counts come from the count endpoint. (Chosen over a client-side-preserving async wrapper, which would not survive the live flip.)

## 3. Real contract (from the LLDs)

| Concern | Endpoint | Notes |
|---|---|---|
| Grid list (rows) | `POST /shipment-service/pgi-pgr/v1/error/list` | Body: `{ pageNumber, pageSize, filter{}, sortBy, orderBy }`. Response: `{ pageNumber, pageSize, totalCount, <rows[]> }`. Row array name + row fields **TBD (Swagger)**. Each row carries `sellShipmentId`. |
| Tab-badge counts | `GET /shipment-service/v1/shipment/error/category/count` | Response: `{ errorOverview: [{category, count}], total }`. Variants for manual-missed / rating exist (confirm shape). |
| Detail (already wired) | `GET /shipment-service/v1/sell-shipment-out/{id}` | `{id}` is the **sellShipmentId**. Grid row → detail link is via this id. |
| Filter typeahead | `POST /shipment-service/advanced-filter/{field}/lookup` | `field ∈ {sell-shipment-id, customers, mbol, bol}`. **Deferred** this round (see §8). |
| CSV export | `POST /shipment-service/pgi-pgr/v1/error/download` | Out of scope this round. |

Shared conventions (already implemented in the Plan 1 `client`/`auth`): `Authorization: Bearer <JWT>`, `x-correlation-id`, `Content-Type: application/json`, path-based gateway routing.

## 4. Architecture

Mirror the detail pattern exactly.

```
                 mock mode                          live mode
                 ─────────                          ─────────
generated grid store (shipments.json,    POST /pgi-pgr/v1/error/list
  reshaped to grid-row DTO)              GET  /shipment/error/category/count
        │                                        │
        ▼                                        ▼
   gridService.getShipmentErrorList(params)  ← single seam, config-switched
   gridService.getCategoryCounts(params)
        │  (returns the real envelope shape: { rows, pageNumber, pageSize, totalCount })
        ▼
   mapShipmentErrorRow  (DTO row → table view-model)
        │
        ▼
   useShipmentErrorList / useCategoryCounts  (TanStack Query hooks)
        │
        ▼
   ShipmentTable (one page) + pagination UI + loading/error states
        │
        ▼  row click → row.sellShipmentId
   useShipmentDetail(sellShipmentId) → existing detail tabs
```

### 4.1 New files

| File | Responsibility |
|---|---|
| `src/api/types/shipmentErrorList.ts` | DTOs: `ShipmentErrorRow`, `ShipmentErrorListResponse` (envelope), `CategoryCount`, `ShipmentErrorListParams` |
| `src/api/types/shipmentRowVm.ts` | `ShipmentRowVM` — the view-model the table renders (one row) |
| `src/api/mappers/mapShipmentErrorRow.ts` (+ test) | `ShipmentErrorRow` (DTO) → `ShipmentRowVM` |
| `src/api/services/gridService.ts` (+ test) | `getShipmentErrorList(params)` + `getCategoryCounts(params)`; mock = in-memory filter/sort/paginate, live = real endpoints |
| `src/api/queries/useShipmentErrorList.ts` | TanStack Query hook (keepPreviousData for smooth paging) |
| `src/api/queries/useCategoryCounts.ts` | TanStack Query hook |

### 4.2 Modified files

| File | Change |
|---|---|
| `tools/generate.mjs` | Two changes only — (a) make `sellShipment` **unique** across all rows (Set-based dedup; current 10000-value range collides at 1200 rows); (b) key the per-shipment detail files by `sellShipment` instead of `buyShipment`, so the grid→detail link is contract-faithful. **The `shipments.json` row shape is unchanged** (see §5 rationale). |
| `src/routes/shipments/ShipmentsRoute.jsx` | Consume the hooks; manage `pageNumber`/`pageSize`/`sort`/`filter` state; pass a page of `ShipmentRowVM` to the table; counts from `useCategoryCounts`; row click uses the VM `id` (= `sellShipment`); the big client-side `filteredShipments` memo is replaced by server `filter` params |
| `src/components/shipments/ShipmentTable.jsx` | Render a page of VM rows; add pagination controls + loading/error states; column accessors read `ShipmentRowVM` (same field names it reads today) |
| `src/data/index.js` | Retire the **table/count** accessors (`getShipmentsByPanel`, `getShipmentsByPanelAndCategory`, `getCategoryCount`) — replaced by the service/hooks. **Keep `getAllShipments`** + `SEARCH_ATTRIBUTES` (the deferred client-side search index still uses them, unchanged). |

**Search layer (`src/search/shipments/*`) is intentionally NOT touched** — because `shipments.json` keeps its shape, the suggestion index and composed-criteria adapter keep working as-is. Their lookup-endpoint rewire stays deferred (§8).

**`shipmentService.ts` is unchanged** — it already fetches `/details/{id}.json` for whatever id it's given. The re-key is achieved by (a) the generator naming files by `sellShipment` and (b) the caller passing the VM `id` (= `sellShipment`). The detail DTO's own `shipmentId` is already `sellShipment` (Plan 2b).

### 4.3 Detail-file re-keying

The mock detail files (`public/details/*.json`) are renamed from `{buyShipment}.json` → `{sellShipmentId}.json`, and the grid row carries `sellShipmentId`. The detail service fetches `/details/{sellShipmentId}.json`. This makes the list→detail link contract-faithful. The Buy Shipment column still displays for the user; it is no longer the fetch key.

## 5. DTOs (best-effort, Swagger-pending)

**Rationale for keeping the current row shape:** the LLD does **not** specify the `error/list` row fields ("TBD, confirm with Swagger"), so any "faithful" row DTO is a guess. Rather than invent contract field names and churn the (deferred) search layer that reads the current names, we treat the existing `shipments.json` row shape as the **provisional DTO** — it's an equally-valid guess and it's the shape the UI already needs. The unknown real field names are isolated behind `mapShipmentErrorRow`; when Swagger lands, that mapper is the single place to reconcile. So `ShipmentErrorRow` below mirrors the current row fields (not invented names).

```ts
// src/api/types/shipmentErrorList.ts
// Provisional row shape = current shipments.json row (mainRow). Field names are
// placeholders pending Swagger; sellShipment is the contract link id.
export interface ShipmentErrorRow {
  buyShipment: string
  sellShipment: string            // links to sell-shipment-out/{id}; the detail fetch key
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
  panel: string                   // 'exceptions' | 'monitoring' | 'pgipgr'
  category: string                // panel-scoped category key
  validationMessage: string | null
  grossWeight: string
  loadCount: string
  orderCount: string
  apFreightCost: string
}

export interface ShipmentErrorListResponse {
  pageNumber: number
  pageSize: number
  totalCount: number
  rows: ShipmentErrorRow[]        // real array-name TBD; normalized to `rows` at the service boundary
}

export interface CategoryCount {
  category: string
  count: number
}

export interface ShipmentErrorListParams {
  panel: string
  category?: string               // omitted/`all` = whole panel
  pageNumber: number
  pageSize: number
  filter?: Record<string, string> // applied search/saved-query conditions, keyed by dataKey
  sortBy?: string
  orderBy?: 'asc' | 'desc'
}
```

```ts
// src/api/types/shipmentRowVm.ts — what the table renders
export interface ShipmentRowVM {
  id: string                 // = sellShipmentId (fetch key for detail)
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
  scac: string
  tenderStatus: string
  shipmentStatus: string
  equipmentCode: string
  validationMessage: string | null
  orderCount: string
  apFreightCost: string
  // ...any other columns the table currently reads
}
```

The mapper degrades missing fields to `'--'`/`''` consistently with the detail mapper. `ShipmentRowVM` is shaped to match what `ShipmentTable`'s column accessors already read, minimizing table churn.

## 6. Mock service semantics

`gridService` in mock mode treats `shipments.json` (now grid-row DTOs) as the server's table:

1. Filter by `panel` (+ `category` unless `all`).
2. Apply `filter` conditions (the same `dataKey`/value contains-match the saved-query logic uses today, moved server-side).
3. Apply `sortBy`/`orderBy` if present.
4. Compute `totalCount` over the filtered set.
5. Slice `[pageNumber*pageSize, +pageSize]` and return the envelope.

`getCategoryCounts(panel)` groups the (panel-filtered) store by category and returns `{category, count}[]` — the same numbers the badges show today, now via the faithful path.

Pagination is **1 page in memory at a time** from the component's perspective, even though mock holds the full set — so the component code is identical to live.

## 7. UX changes (accepted)

- Table shows **one page** (default `pageSize` e.g. 25); **pagination controls** (page X of Y, prev/next, page-size selector).
- **Loading state** per page fetch (TanStack `keepPreviousData` so paging doesn't flash empty); **error state + retry** mirroring the detail.
- Changing tab/panel/filter/sort resets to page 1.
- Tab badges update from the count hook.

## 8. Scope boundaries (explicit)

**In scope:** grid list (rows, paginated) · category counts · table pagination UI + loading/error · grid→detail link via `sellShipmentId` · generator reshape · retire the synchronous list accessors.

**Deferred / out of scope (noted, not done here):**
- Repointing the GlobalSearch **suggestion** index to `advanced-filter/{field}/lookup` — separate in-flight surface (Sessions 38–40). The grid `filter` param is plumbed so applied filters/saved queries drive the server query; the typeahead suggestions stay client-side for now.
- Write-back actions (cost edits, routing selection, notes, doc upload) — read-only round.
- Documents/Notes/History tabs — no API.
- CSV export endpoint.
- Real auth (MSAL/Entra) — still the Plan 1 token stub.

## 9. Testing

- **Mapper unit tests** (TDD): field mapping + `'--'` degradation, against a fixture grid row.
- **Service tests:** filter/category selection, sort, pagination math (totalCount, slicing, last-page remainder), envelope shape.
- **Count test:** category grouping correctness.
- **Full-corpus smoke (throwaway):** every panel/category, paged end-to-end, maps without crashing; counts sum correctly.
- **Build + strict tsc** green; dev server boots; row-click → detail still resolves (now via `sellShipmentId`).

## 10. Validation reminder

The grid-row DTO field names and the `error/list` filter object are **doc-derived and unconfirmed**. Before treating them as final: pull the live Swagger (`shipment-swagger/v3/api-docs`) and confirm the list-row fields, the response array name, pagination indexing (0- vs 1-based), and the filter object with Jana. Validate important assumptions with the SME before acting on them.
