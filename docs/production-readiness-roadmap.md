# OdysseyONE Front End — Production-Readiness Roadmap

> **Status:** DRAFT for the architecture reconvene (week of 2026-06-08). Author: Manuela Ramirez. Purpose: turn the open question *"can this React prototype become a production-grade app?"* into a concrete, bounded, sequenced plan — mapped against Odyssey's own documented backend APIs.
>
> ⚠️ AI-assisted draft synthesized from Odyssey Confluence LLDs + the live codebase. Field/endpoint names are from WIP LLDs — reconcile against live Swagger before committing to contracts. Validate with the service owners listed per domain.

---

## 0. TL;DR for the reviewers

1. **React is the sanctioned production UI.** Odyssey's own service registry (*OdysseyONE API Endpoints and Owners*, updated 2026-06-03) lists **Orders, Shipments, Carrier, and Home as React** in production; only Tracking and User Management are Angular. This app is aligned with the official architecture.
2. **The prototype was scoped as a prototype, and it succeeded on those terms** — it won the React decision via the Figma→MCP design-fidelity workflow. Production concerns (state, auth, types, tests, integration) were *deferred behind a data layer that was access-blocked*, not omitted by accident.
3. **The transition is bounded, not a rewrite.** All data access already funnels through a single seam (`src/data/index.js` + the search adapter contract). The production data layer is **swapping the internals of a handful of functions** behind that seam — the UI components do not change. Sections 2–3 map every seam to its real endpoint.
4. **The backend contracts already exist and largely match the prototype's data model.** The shipment read payload maps almost 1:1 onto the tabs already built. The work is wiring, plus the cross-cutting concerns in Section 4.

---

## 1. What already exists (the foundation)

| Capability | State today | Why it matters for production |
|---|---|---|
| **Monorepo** | Turborepo: `apps/odyssey-one` + `packages/{ui,tokens,db}` | Clean boundaries; shared design system; a `db` package already reserved for the data client. |
| **Design system** | `@odyssey/ui` + `@odyssey/tokens`, wired to Figma via **Code Connect** (14 mappings) | Single visual source of truth; survives the data-layer swap untouched. |
| **Data-access seam** | `src/data/index.js` accessors; `getShipmentById` is *already* a `fetch` | The one place that changes when the backend lands. Components are insulated. |
| **Domain-agnostic search** | `useGlobalSearch(adapter)` + `shipmentsSearchAdapter` contract | Maps directly onto the documented `*/lookup` typeahead endpoints (Section 3). |
| **Routing** | React Router, 6 routes under shared `AppShell` | Micro-frontend shell story starts here. |
| **Tests** | **Vitest** suite (search adapter), green | The "no tests" claim is already false; this is the seed to grow from. |

---

## 2. Seam-to-API mapping — Shipments (the deepest domain)

Service: `shipment-service` · Owners: PO **Jana**, Eng **Soni Sinha** · LLD: TMS/3525869576 · Live contract: `shipment-swagger/v3/api-docs`

| Prototype seam (exists) | Real endpoint | Change required | Effort |
|---|---|---|---|
| `getShipmentById(id)` / per-shipment detail `fetch('/details/{id}.json')` | `GET /shipment-service/v1/sell-shipment-out/{id}` (+ `buy-shipment-out/{id}`) | Already a fetch — swap URL, add `Authorization`+`x-correlation-id` headers, map `sellShipmentOut` → view model | **S** |
| Detail tabs (Order/Stops/Product/Routing/Cost/Instructions) | **Same single payload** — `orderList[]`, `shipmentStopList[]`, `orderLines[]`, `shippingOptionList[]`, cost charge lists, `instructionList[]` | Adjust field names; the **shapes already align** with the built tabs | **S–M** |
| Cost Allocation tab ("Available after PGI/PGR") | `apAllocated`/`arCalculated` + `*CompletedCost` in same payload | Gate completed-cost/margin on `pgiFlag`/`ratingStatus` — logic already mirrors this | **S** |
| `getAllShipments()` (main table) | ⚠️ **No generic list endpoint found** — list appears driven by `pgi-pgr/v1/error/list` grids + `advanced-filter/*/lookup` | **Open question — confirm list source with Jana/Swagger** | **? (blocker to resolve)** |
| `shipmentsSearchAdapter` suggestions / FilterSuggestions | `POST /shipment-service/advanced-filter/{sell-shipment-id\|customers\|mbol\|bol}/lookup` + master-data lookups | Replace local index with API calls behind the same adapter contract | **M** |
| Error/monitoring panels (Exceptions/Monitoring/PGI-PGR) | `…/error/category/count` (donut) + `pgi-pgr/v1/error/list` (grid, paginated) | New wiring; shapes documented | **M** |

**Not FE-called** (system-to-system): `/v2/load`, `/v1/shipment` POST/PATCH, `/forward/message`, `/pgipgr/field/*`.

---

## 3. Seam-to-API mapping — Orders, Carrier, and the common pattern

### Orders (`order-service` · PO Ramesh Raman · Eng Venkata Seerla · LLD TMS/3401056276)
| Route action | Endpoint | Effort |
|---|---|---|
| Orders grid | `POST /order-service/v3/order/list` (paged/filtered/sorted) | M |
| Order detail | `POST /order-service/v3/order/view` `{orderNumber, customerId}` | S |
| Create (manual / integrated) | `POST /v3/manual-order` · `POST /v3/order` | M |
| Inline order-# validation | `POST /v3/order/validation` (409 `DUPLICATE_ORDER_NUMBER`) | S |
| Cancel / restore / bulk status | `/v3/order/cancel` · `/order/restore` · `PATCH /order-status` | S |
| History/audit tab | `POST /v3/audit-report` (paged change log) | S |
| Form dropdowns | ~25 `/order-service/v1/*/lookup` (frequency-sorted) | M |

*Note: `/order/list` returns a compact grid row; `/order/view` returns a flat detail — needs two DTOs.*

### Carrier (`carrier-service` · PO Kathleen O'Donnell · Eng Utkarsh Tripathi · LLD TMS/2643066896)
| Route action | Endpoint | Effort |
|---|---|---|
| Carrier grid + status tabs | `POST /carriers/list` (`statusCount` → ALL/NC/IN badges) | M |
| Filter chips (cascading) | `POST /{carrierName,scac,complianceStatus,…}/lookup` | M |
| Global omnibox | `POST /search/lookup` → `[{label,value,type}]` (**grouped by entity type — direct GlobalSearch fit**) | M |
| Saved views + column customization | `/available/columns`, `/user/{id}/dropdown`, `/add`, `/update` | M |
| Saved advance filters (CRUD) | `/save/filter`, `/list/filters/{userId}`, `PATCH /update/filter`, `DELETE /delete/filter/{id}` | M |
| Carrier detail (lazy per section) | `GET /carrierdetail/{carrierId}/section/{general\|dot\|contacts}` | M |
| Contacts | `POST /save/contact` · `/contact/details/upload` (multipart) | S–M |
| User context | `POST /user/details` → `userId` (required by view/filter calls) | S |

### The common pattern (one abstraction covers all domains)
Every service shares: **`Authorization: Bearer <JWT>` + `x-correlation-id`** headers · **paginated `{pageNumber, pageSize, totalCount}`** envelopes · **`*/lookup` typeaheads** for filters. → A **single service-layer module** (base client + interceptor + pagination/lookup helpers) serves Shipments, Orders, and Carrier. This is the `@odyssey/db` (rename: `@odyssey/api`) package, sitting behind the existing accessor seam.

---

## 4. Production-readiness roadmap (phased)

Each item: the gap, the work, and where it plugs into the seams above.

### Phase 1 — Data layer + auth (unblocks everything)
1. **Service-layer package** (`@odyssey/api`) — base fetch/Axios client, JWT + `x-correlation-id` interceptor, typed pagination/lookup helpers. Behind the existing `src/data/index.js` seam.
2. **Auth: cookie-paste → MSAL/Entra OIDC** — `@azure/msal-browser` + `@azure/msal-react`; `MsalProvider` at root; route guards; interceptor attaches `acquireTokenSilent` bearer token. Needs `msalConfig` (tenantId/clientId/authority/scopes) + redirect-URI registration from FE team/IT. *(See `vault/.../auth-sso.md` — real flow is currently only in diagrams.)*
3. **Wire Shipments detail** first (highest-ROI demo): swap `getShipmentById` to `sell-shipment-out/{id}`. Proves the seam end-to-end.
4. **Resolve the shipment-list source** (open blocker) with Jana/Swagger.

### Phase 2 — State + types + integration breadth
5. **Server-state management** — TanStack Query (caching, invalidation, loading/error/optimistic). *This is the real "state management" answer — not Redux. Client/UI state stays in hooks/Context.*
6. **TypeScript adoption** — incremental (`allowJs`), starting with the service-layer DTOs (`OrderListRow`/`OrderDetail`, `sellShipmentOut`, `CarrierParty`) where type safety pays most.
7. **Wire Orders + Carrier** routes (currently stubs) against their services.
8. **GlobalSearch → real lookups** behind the adapter contract.

### Phase 3 — Hardening
9. **Error handling** — error boundaries, retry, network-failure + empty states.
10. **Test growth** — component (Testing Library) + integration; CI gate.
11. **Performance** — table virtualization (1200+ rows), code splitting, bundle budgets.
12. **Accessibility** — execute the standing web-guidelines audit.
13. **Observability** — error tracking (Sentry), logging.
14. **CI/CD** — automated pipeline with test + preview gates (today: manual Vercel CLI).
15. **Micro-frontend shell** — formalize the React host + the Angular (Tracking/User Mgmt) integration boundary.

---

## 5. Honest open questions / blockers

1. **Shipment list endpoint** — no generic `GET /shipments` in the LLD. What drives the main table? (Jana / Swagger)
2. **Documents & Notes tabs** — no API in the shipment LLD. Separate service or out of scope?
3. **SSO spec** — exists only as diagrams; need endpoints/tokens/`msalConfig` from FE team (Balaji Azhagesan) or the prod repo.
4. **WIP contracts** — shipment/order LLDs are under review; reconcile against live Swagger before locking DTOs.
5. **Access** — the remaining dependency is environment access (API + Entra registration), tied to the pending infra request (Soni). *This, not architecture, has been the critical-path constraint.*

---

## 6. Sources
- Confluence TMS: *API Endpoints and Owners* (3737550853); Shipment Service (3525869576), Rating/Cost (2778202116); Order Service Phase-2 (3401056276), Order Domain (2361917446), Order LINX (2630090754); Carrier Service (2643066896); SSO (2538373145, 2660139009).
- Synthesized understanding: `vault/20-cross-cutting/api-integration/`.
- Codebase seams: `apps/odyssey-one/src/data/index.js`, `apps/odyssey-one/src/search/`.
- Meeting context: `vault/20-cross-cutting/production-strategy/backend-strategy-meeting-2026-06-05.md`.

---
*AI-assisted draft. Validate endpoint contracts against live Swagger and confirm open questions with the named service owners before presenting as committed scope.*
