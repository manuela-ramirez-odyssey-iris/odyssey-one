# Spec — Wire Shipments Detail to the real API contract (step one)

**Date:** 2026-06-05 · **Branch:** `feat/shipments-api-wiring` · **Status:** design, pending user review

## Goal

Stand up the **real production data architecture** for the Shipments detail panel — a typed service layer, server-state management, and the documented `SellShipmentOut` contract — running today on regenerated mock data, **one env flip away from the live API**. This is the first solid, demoable step that converts the architect-review gaps (service layer, state management, TypeScript, tests) into shipped reality, and proves the prototype→production transition is wiring, not a rewrite.

## Context

- Today: the detail panel loads via `fetchShipmentDetails(id)` → `fetch('/details/{id}.json')` (old generated shape) → hand-rolled `detailsCache` Map → consumed by `ShipmentsRoute.jsx` (lines 75, 84) and the detail tabs.
- Real contract (Confluence LLD, WIP; live truth = `shipment-swagger/v3/api-docs`): `GET /shipment-service/v1/sell-shipment-out/{id}` returns a `SellShipmentOut` object whose nested arrays map ~1:1 to the existing tabs. See `vault/20-cross-cutting/api-integration/shipment-service-api.md`.
- Access (JWT + environment) is pending (David/Soni). The design must not block on it.

## Scope

**In:**
- New app-local `src/api/` layer (TypeScript): config, auth seam, client, DTO types, service, mapper, query hook.
- TanStack Query as the server-state layer; retire the hand-rolled `detailsCache` + `fetchShipmentDetails`.
- `tools/generate.mjs` extended to emit `/details/{id}.json` in the real `SellShipmentOut` shape (seed 42, reproducible, synthetic data only).
- Mock/live switch (env-driven); live code path written + unit-tested with a mocked `fetch`, executed only in mock mode for now.
- `ShipmentsRoute` switches the detail-loading path to a `useShipmentDetail(id)` hook; renders loading + error(+retry) states.
- Tests: pure mapper test + service mock/live test (Vitest).
- TypeScript config (`allowJs`, incremental — only new `src/api/**` is `.ts`).

**Out (named, future steps):**
- The Shipments **table/list** stays on the existing static `shipments.json` (the spine in mock mode). Live list source = the exception/monitoring grid endpoints (`pgi-pgr/v1/error/list` + `…/error/category/count`), each row carrying `sellShipmentId` → detail. Wired in a later step; exact tab→error-category mapping to be confirmed with Jana.
- Real MSAL/Entra auth (the `getAuthToken()` seam is stubbed now).
- Orders/Carrier wiring; Documents & Notes tabs (no API found).
- Refactoring tabs to consume the real shape directly (mapper insulates them for now).

## Architecture

New layer behind the existing data seam:

```
apps/odyssey-one/src/api/
  config.ts        VITE_API_MODE ('mock'|'live') + VITE_API_BASE_URL
  auth.ts          getAuthToken() — stub now (env/cookie); MSAL later
  client.ts        request(): baseURL + Bearer + x-correlation-id + JSON + normalized ApiError
  types/sellShipmentOut.ts        typed DTO (the real contract)
  services/shipmentService.ts     getSellShipmentDetail(id): mock→local file · live→GET sell-shipment-out/{id}
  mappers/mapSellShipmentOutToDetail.ts   DTO → existing detail view-model
  queries/useShipmentDetail.ts    useQuery wrapper (select = mapper)
  fixtures/ (only if a curated sample is needed beyond regenerated /details)
```

`QueryClientProvider` is mounted at the app root (`App.jsx`).

## Data flow

`ShipmentsRoute` → `useShipmentDetail(id)` → TanStack Query (`queryKey: ['shipment','detail',id]`) → `shipmentService.getSellShipmentDetail(id)`:
- **mock:** `fetch('/details/{id}.json')` (now `SellShipmentOut`-shaped)
- **live:** `client.get('/shipment-service/v1/sell-shipment-out/{id}')` with `Authorization: Bearer <token>` + `x-correlation-id`

Result cached as the raw DTO; the hook's `select` runs `mapSellShipmentOutToDetail` → returns the existing view-model → tabs render unchanged.

## Data regeneration

`tools/generate.mjs` updated so each detail file is a `SellShipmentOut`: header fields (incl. `pgiFlag`/`ratingStatus`), `origin`/`destination`, `shipmentStopList[]`, `shippingOptionList[]` (with `freightEstimate.chargeList[]` + `arMarkup`), `orderList[]` → `orderLines[]` (incl. hazmat), three-tier cost fields (`apAllocated`/`arCalculated`/`*CompletedCost`, completed-costs null until `pgiFlag`), `instructionList[]`. Synthetic data only — no real customer values. The list table's `shipments.json` is unchanged in this step.

## Mapper

`mapSellShipmentOutToDetail(dto)` → the current view-model the tabs consume (Order, Stops, Product, Routing Guide, Cost Allocation, Instructions). Pure function — the primary unit-test target. Documents/Notes: produce empty/placeholder sections (no source data yet).

## Error / loading

`client` throws `ApiError {status, message, correlationId}`. `useShipmentDetail` exposes `isLoading/isError/error/data`. `ShipmentsRoute` renders a loading state and an error state with retry. (Closes part of the error-handling gap.)

## TypeScript

Add `tsconfig.json` (`allowJs: true`, `strict: true`, bundler resolution) + `typescript` devDep. Vite compiles TS via esbuild already. Only new `src/api/**` files are `.ts`; existing JSX untouched.

## Testing (Vitest, extends current suite)

- `mapSellShipmentOutToDetail.test.ts` — DTO fixture → asserts every tab's required view-model fields; cost gating on `pgiFlag`.
- `shipmentService.test.ts` — mock mode returns local shape; live mode calls the correct URL with `Bearer` + `x-correlation-id` (mocked `fetch`).

## Success criteria

1. Opening a shipment renders all detail tabs from data that flowed through `useShipmentDetail` → `shipmentService` → mapper (the production path), in mock mode.
2. `detailsCache` + `fetchShipmentDetails` are removed; TanStack Query owns caching.
3. `VITE_API_MODE=live` + a token routes to the real endpoint with **zero component changes** (verified by the service unit test).
4. New Vitest tests green; existing 9 still green.
5. No real customer data in fixtures/generated files.

## Risks / open questions

- **WIP contract:** `SellShipmentOut` field names may shift — reconcile against live Swagger when access lands. Mapper localizes the blast radius.
- **List source (future):** confirm with Jana whether the exception grids are the complete list, and the tab→error-category mapping.
- **CORS/proxy (live, future):** browser→service may need a Vite dev proxy + correct headers; out of scope for mock step one.
- **Documents/Notes:** no API — confirm separate service or out of scope.
