# View Order (Order Detail) — Design Spec

**Date:** 2026-06-15 · **Domain:** Orders · **Build:** Section 6 (Order Detail / View Order) — vertical slice 2 (read-only, contract-rich)
**Status:** Draft, for GATE review
**Traced stories:** LINX-10233 (post-creation actions + order-viewing functionality; UI Complete, readiness Yet to Start — currently a stub menu item / no-op per requirements-tracker.md:126), LINX-10700 (BE API: fetch order details by `orderNumber` + `customerId`, `POST /order-service/v3/order/view`, Closed).
**Sources:** `vault-sources/10-domains/orders/jira-stories/LINX-7557-order-overview.md` (manualOrder view DTO + response wrapper, lines 106–363; LINX-10700 request/AC, lines 81–98 & 370–378; LINX-10233, lines 40–47; LINX-11163 Special-Services enrichment "Ready for Development", lines 680–703); `vault/10-domains/orders/requirements-tracker.md` (2026-06-15; sourced from Ramesh's "Functional Req. Status Tracker 1.xlsx" + Ramesh feedback email 2026-06-15 + prototype build-state audit — LINX-7557 = priority 9 of 9 sub-epics; View Order = Stub/no-op, lines 121–151); `vault/10-domains/orders/domain-analysis.md` (:32, :205, :210, :219–227, :250); `vault/10-domains/orders/section-map.md` (#1, #6, #12, #36–44 — **AI-generated draft, validate before Phase-1 spec**, :59); `vault/10-domains/orders/open-questions.md` (Q4, Q10, Q15, Q22, Q30, Q34, deferred items 4/5/9); existing create-order data seam (S52) + Create Order Flow design spec (`docs/superpowers/specs/2026-06-11-create-order-flow-design.md`); S55 build state (`progress.md` session 55). Reuses the same mock/live seam and mapper-as-reconciliation-point discipline as the Create flow.

## 0. Scope

The View Order read view (section 6): a full-route `/orders/:orderNumber` page that fetches the flat `manualOrder{}` DTO via `POST /order-service/v3/order/view` and renders it read-only through the four order accordions, inside a two-tab shell (Detail · Audit Trail). The Detail tab body reuses the read-only accordions already built for the Create flow's Confirmation page, extracted into a shared `OrderReadView`. Audit Trail ships as a frame-only "Coming soon" placeholder.

**Display fidelity (resolved — see §2.1):** the read view displays **exactly the create-form subset** of the DTO (the fields `OrderReadView` already renders). Rich DTO groups outside that subset — per-line hazmat/dimensions/line-references, financial charges, `orderInvolvedPartyList[]`, confirmed quantities, status provenance, per-line user fields — are **NOT displayed in v1** and are listed as an explicit DEFERRED display set. This corrects the earlier "every field renders" claim, which was false against a deliberately-lean render component.

**Component policy:** app-local build reusing `@odyssey/ui` primitives (`PageHeader`, `Tab`, `Badge`, `Button`, `EmptyState`) and the Create flow's read accordions; no `/normalize` cycles here — consistent with the Orders/GlobalSearch "skip-normalize-v1" posture (normalize after the API stabilizes). [Input 5 §6]

**Efrain-vs-Jira conflict audit:** section 6's UI surface (the Detail/Audit two-tab shell + read accordions) has **no active Efrain-vs-Jira conflict** — it is uncontested. The known Overview tab-set conflict (Q25 — stories say Data Validation / Technical Errors; Efrain's design says All / Saved / Canceled / Interface Failures) is **out of section-6 scope** and does not touch the detail page. (The "designs outrank Jira" precedence rule is therefore not exercised here, by design.)

**Out of scope (DEFERRED — see §8/§10):** all row/detail actions (Edit, Cancel, Restore, Copy, Delete); Audit Trail tab *content*; master-service description enrichment (Special Services + Mode/Equipment human-readable labels); and the DEFERRED display set above.

## 1. Goal / context — why section 6 now

LINX-10233 describes both the post-creation actions **and** the order-viewing functionality; LINX-10700 (Closed) is the settled BE contract to fetch order details by `orderNumber` + `customerId`. The View Order menu item is currently a **stub / no-op** (requirements-tracker.md:126, :151), and the Summary grid's two entry affordances (row View action, Order Number link) are inert for non-Draft rows — there is nowhere to navigate *to* until this page exists.

**Slice-2 sequencing vs PO priority (explicit reconciliation):** the section-map's suggested vertical-slice order places detail as slice 2, but section-map.md is **AI-generated and unvalidated** (:59), not stakeholder-blessed. The authoritative scope/priority artifact — Ramesh's master FR tracker (requirements-tracker.md) — places **LINX-7557 "Order Overview & Actions" (which contains View Order) at priority 9 of 9 sub-epics** (:121). Building detail now is therefore a **deliberate deviation from PO priority**, justified on leverage/reuse grounds for this prototype: (a) the Create flow (slice 1, shipped S55) already produced the read-only accordions and a contract-shaped data seam, so detail is mostly *wiring + extraction* (plus three net-new pieces of logic — reverse mapper, status map, and the `fromIsoTimestamp` helper, §3.3/§4) rather than net-new UI; (b) spec coverage for detail is **Strong** (LINX-10700/10233) while the action stories (Edit/Cancel/Delete) are still **Weak** (in Architecture/Tech Design, underspecced), so building the read view first lets us ship value without waiting on the action contracts; (c) the inert Summary-grid affordances need a destination. **GATE question for Ramesh:** confirm this priority-9 work being pulled forward is acceptable for the prototype. [Input 6 §1, §3 rows 4/18/19; requirements-tracker.md:121, :126, :151; Input 5 §0]

## 2. Contract

`POST /order-service/v3/order/view` — body `{ orderNumber, customerId }` (both **mandatory** per LINX-10700 AC#1/#2, :370–375) — returns a response **wrapped under the key `manualOrder`**: `{ "manualOrder": { … } }` (LINX-7557:107). There is **no** `{ success, order, error }` envelope on the wire; not-found and bad-input are signalled by **HTTP status** (404 / 400 per AC#4/#5, :377–378), which `apiPost` surfaces by **throwing**. The in-app shape is normalized in the service (§3.2) so mock and live converge.

This DTO is distinct from the compact role-nested row from `/order/list`: `/order/view` is the **canonical flat shape** of the `OrderHeader` / `manualOrder{}` model — one parent record with several nested collections (order lines, references, special services, instructions, pickup/delivery, charges) flattened into the single response. [Input 6 §1; Input 1; domain-analysis.md:32, :205, :219]

### 2.1 Field inventory by VM target — and what the read view actually displays

The VM-target column governs the **editable round-trip** (reverse mapper, §3.3). The **DISPLAY** column governs what `OrderReadView` shows in v1. They differ deliberately: `OrderReadView` is locked to the form-VM subset (verified: `OrderFormValues` models only `general / pickupDelivery / products[6 fields] / specialServices[code+desc]` — `apps/odyssey-one/src/api/types/orderFormVm.ts`), so any DTO field outside that subset is **not displayed in v1** even when present on the wire.

- **(a) Identifiers & status** — `orderNumber`, `sourceOrderNumber`, `customerId`, `contactName`, `poNumber` → `general`; `pickupNumber` → `pickupDelivery`. `orderId`, `orderRelease*`, `interface*`, `orderStatus.*`, `sourceApplication.*` → **NO VM HOME** (system PK / status / provenance; preserve on save). DISPLAY: `orderNumber` + `orderStatus` in the header (§3.5); the rest **not displayed**.
- **(b) Dates + timezone codes** — `requested{Pickup,Delivery}Date`, `pickupAppointment`, `deliveryAppointment` (each with a paired `*TimeZoneCode`), `requestedDateType` → `pickupDelivery` (4 editable triads). `poDate` → `general`. **`requestedShipDate` / `requestedShipTimeZoneCode` → NO VM HOME** — the form VM has **no ship-date triad** (only earlyPickup/latePickup/earlyDelivery/lateDelivery), and the forward mapper never writes `requestedShipDate` (verified mapFormToOrderInterface.ts:93–100). It is the resolved value of the SHIP planning anchor when `requestedDateType === 'SHIP'` (Q22); for v1 it is **display-or-drop, no reverse**. Resolved `*Timestamp` companions (`requestedTimestamp`, `shipTimestamp`, `deliveryTimestamp`, `availableTimestamp`, `orderDate`, `messageTimeStamp`) → **NO VM HOME** (computed/system). [Input 1 (b); LINX-7557:113]
- **(c) General / freight / direction / equipment** — `freightTermCode`, `incotermInfo`, `shipDirectionCode`, **`equipmentNumber` → `general.equipmentReferenceNumber`** (verified round-tripped: forward writes it at mapFormToOrderInterface.ts:101 — distinct from `orderCarrierEquipDetailList[].equipmentCode` which is `general.equipment`; the reverse mapper must NOT conflate the two equipment concepts), order-level `grossWeight*`/`volume*`/`netWeight*` roll-ups → `general` (roll-ups display/derived, see soft spot §7.7). [Input 1 (c)]
- **(d) Origin party** — flat `origin*` → `pickupDelivery`. **9 of the 13 party fields round-trip** (PartnerId, FullName, Address1, Address2, City, Region, Country, Postal, ContactName, Phone, Email = 11 written by `mapParty`); **`originAddress3` and `originContactTitle` have NO form-VM home** (`PartyValues` has only address1/address2 and contactName — verified orderFormVm.ts:28–43; `mapParty` never emits Address3/ContactTitle — mapFormToOrderInterface.ts:35–49). They are **display-or-drop**, not "mapped". `originSourceSystem` / `originExternalIdentifier` → NO VM HOME. [Input 1 (d); LINX-7557:149, :155]
- **(e) Destination party** — flat `destination*`, identical to origin: same 11 round-trip; `destinationAddress3` / `destinationContactTitle` → NO VM HOME.
- **(f) `orderInvolvedPartyList[]`** — N additional parties (bill-to/notify/etc.) with a *different field naming scheme* (`cityName`/`regionName`/`countryName`/`postalCode` + `vatNumber`) → conceptually `pickupDelivery`, but **structural mismatch** with the flat origin/destination model (see §7.3 — most likely VM gap). DISPLAY: **not displayed in v1** (deferred display set). [Input 1 (f)]
- **(g) `orderLines[]`** — the product/line collection (~60 fields/line incl. dimensions, an ~18-field hazmat block, line references, quantities). Only the **6 fields `ProductRowValues` models** round-trip into `products` (productId, description, grossWeight, volume, shipClass + regenerated id). The **hazmat block, line dimensions, line references, `confirmedQuantity*`, financial `orderLineChargeList[]`, `*SourceSystem`/`sourceTblPrimaryKey`, and nested `userFieldListOrderLine[]` are NOT representable in `ProductRowValues`** → **deferred display, no reverse** (the `rollups.hazmat` cell in the current accordion is computed from product fields that don't exist on the lean row — it will read "—"/absent for detail orders until the display set is built out). [Input 1 (g)]
- **(h) Special services & instructions** — `orderAccessorialDetails[]` (accessorials) → `specialServices`; **`orderInstructionList[]` → `general.instructions`** (reverse: `instructionDetail → description`, regenerate `id`, drop `instructionType`/`instructionNumber` — §7.5b); `orderCarrierEquipDetailList[]` (scac/mode/equipment) → `general.carrierScac` + `general.equipment` (first entry only). [Input 1 (h)]
- **(i) `userFieldList[]`** — order-level schema-less key/value collection. Split on `userfieldType`: `REFERENCE` → free-form `general.references[]`; `FLAG`/`CONSOLIDATABLE` → `general.consolidatable` (§7.4). Any other `userfieldType` → **NO VM HOME** (display-or-drop). [Input 1 (i)]
- **(j) Costs / financial** — order-header AP/AR allocated/calculated/completed values + `orderChargeList[]` (and the per-line `orderLineChargeList[]`) → **NO VM HOME**; all are downstream rated/billed values, read-only, preserve untouched on any save. DISPLAY: **not displayed in v1** (deferred display set). [Input 1 (j)]

**DEFERRED display set (explicit):** per-line hazmat block, per-line dimensions, per-line references, `confirmedQuantity*`, `userFieldListOrderLine[]`, `orderInvolvedPartyList[]`, all financial/charge fields, status provenance (`sourceApplication`, `*SourceSystem`, `*ExternalIdentifier`), `requestedShipDate`, party `Address3`/`ContactTitle`. These exist on the DTO but have no rendering surface in `OrderReadView` v1. If the design requires any of them, that group needs (a) a display-only block in `OrderReadView` and (b) a corresponding slot on `OrderDetailVM` (the §3.2 detail VM — **not** the form VM). Flagged as a GATE display-scope decision (§9 risk 1b).

## 3. Architecture

### 3.1 Route & chrome

- **Route `/orders/:orderNumber`** inside the existing `AppShell` (sidebar + navbar stay), added to `App.jsx` **after** `/orders/create` so the more-specific static route is never captured as a `:orderNumber`:
  ```jsx
  <Route path="/orders" element={<OrdersRoute />} />
  <Route path="/orders/create" element={<CreateOrderRoute />} />
  <Route path="/orders/:orderNumber" element={<OrderDetailRoute />} />
  ```
- **Param read:** `const { orderNumber } = useParams()`; `decodeURIComponent(orderNumber)` in the route. `orderNumber` is the canonical key — the row VM's `id` IS `orderNumber` (`mapOrderListRow: id: row.orderNumber`; LINX-11013 fallback, no separate `orderId`). [Input 5 §1]
- **Navigation IN — corrected (the affordance is NOT fully inert today):** `onRowIdClick` already exists and is **not inert** — `OrdersRoute.jsx:73–78` currently routes **Draft** rows to `/orders/create?draft=<id>` (reopen-in-create). Only **non-Draft** rows are inert. This build adds the non-Draft branch. **Explicit Draft-vs-non-Draft rule** (provisional, confirm with Jana/Efrain — §9 risk 9b):
  ```jsx
  onRowIdClick={(row) => {
    // Draft → keep reopening the create form (edit-in-create, existing UX intent)
    // non-Draft → read-only detail page
    if (row.status === 'Draft') navigate(`/orders/create?draft=${encodeURIComponent(row.id)}`)
    else navigate(`/orders/${encodeURIComponent(row.id)}`)
  }}
  ```
  The row **View action** (last "Order Actions" column, LINX-10233/10811) always routes to read-only detail regardless of status; the **Order Number link** follows the status branch above (Draft → create, else → detail). Both conceptually carry `{ orderNumber, customerId }` into the `/order/view` call. [Input 6 §1; Input 5 §1; OrdersRoute.jsx:73–78]
- **Navigation OUT:** **Back to Orders** → `navigate('/orders')`, returning to the Overview grid. This affordance has **no Jira backing** — it is UX-owned and inferred from the grid↔detail pairing; flagged as a gap needing Efrain. [Input 6 §3 row 20]
- **`customerId` sourcing — corrected for the mandatory-field contract:** the list row has **no `customerId`** (`OrderListRow.customer` is a display key like `"SABIC_CLT"`). LINX-10700 makes `customerId` a **mandatory** request field (AC#1/#2, :370–375). Therefore:
  - **Mock (this build):** detail is keyed by `orderNumber` alone; `customerId` is unused for resolution. `customer` is surfaced from the detail VM in the header.
  - **Live (deferred):** do **not** type `customerId` as optional and POST `undefined` (that ships an invalid body the API rejects with 400). Instead, **gate the live path** exactly as `getDraft` already does for its unimplemented live mapping (orderService.ts:190–194 throws) — see §3.2. `customerId` must be resolved from the customer-scope/EntityChip param (Q30, deferred item 9) **before** the call, never as a second URL param. Recorded as an open question. [Input 5 §1, §5; Input 6 §3 row 9; LINX-7557:370–375; orderService.ts:190–194]

### 3.2 Data layer (net-new — there is no order-detail fetch today)

Mirrors the `useShipmentDetail` / `getSellShipmentDetail` structural model and the S52 mock/live seam: **the service is the single reconciliation point and returns the mapped VM for both modes; the query just calls the service.** New files:

```
src/api/
  types/orderView.ts          — OrderViewDto (LLD order/view manualOrder shape, names VERBATIM)
                                + OrderViewResponse = { manualOrder: OrderViewDto }  (wire envelope)
  types/orderViewVm.ts        — OrderDetailVM (the detail screen's read VM; superset of form VM,
                                with slots for any future display-only groups)
  services/orderService.ts    — extend: getOrderView(orderNumber, customerId?) → OrderDetailVM | null
  mappers/mapOrderView.ts     — OrderViewDto → OrderDetailVM (single reconciliation point)
  mappers/mapOrderViewToFormVm.ts — manualOrder → form-VM shape (reverse of mapFormToOrderInterface;
                                feeds OrderReadView). Imports fromIsoTimestamp (net-new, §3.3).
  queries/useOrderView.ts     — useQuery(['order-view', orderNumber, customerId], …)
```

- **Wire envelope (corrected):** the response is `{ manualOrder: OrderViewDto }` (LINX-7557:107) — typed verbatim, mirroring `createOrder.ts`'s verbatim-naming discipline. There is **no** `{ success, order, error }` on the wire.
- **`getOrderView(orderNumber, customerId?)`** — same branch idiom as every `orderService` method (`if (getApiMode()==='live') …` first, mock fallthrough), with the mapper running **once, inside the service, after the branch**, for both modes:
  ```ts
  if (getApiMode() === 'live') {
    if (!customerId) {
      // customerId is mandatory (LINX-10700 AC) but unsourceable from the row today (Q30).
      // Gate the live path exactly like getDraft's unimplemented live branch.
      throw new Error('getOrderView: live customerId sourcing pending (Q30); mock-mode only')
    }
    try {
      const { manualOrder } = await apiPost<OrderViewResponse>(
        '/order-service/v3/order/view', { orderNumber, customerId })
      return mapOrderView(manualOrder)        // map once, here
    } catch (e) {
      if (isNotFound(e)) return null          // 404 → in-app null (converges with mock)
      throw e                                 // other errors → React Query isError
    }
  }
  // MOCK resolution precedence (each tier converts UP to OrderViewDto, then mapOrderView runs once):
  //   1) draft form values (full OrderFormValues)  — getDraft-backed; mapFormToOrderInterface(draft).manualOrder → DTO  [richest]
  //   2) created order (retained manualOrder)        — createdOrders.get(orderNumber)   [§5 retention; ONLY IF §5 approved]
  //   3) overlay row (lean OrderListRow)             — overlayRows.find(...) → listRowToViewDto(row)  [lean]
  //   4) seeded orders.json (lean OrderListRow)      — getAllOrders().find(...) → listRowToViewDto(row)  [lean unless §5 enrich]
  //   not found in any tier → return null
  ```
  **Mock source→DTO conversion (explicit, per tier):**
  - **Draft (`OrderFormValues`)** → run the existing `mapFormToOrderInterface(values).manualOrder` to get a DTO, then `mapOrderView`. (Highest fidelity — but note the forward∘reverse double-loss caveat in §7.13.)
  - **Created order** → the retained `manualOrder` IS already a DTO; `mapOrderView` directly. (Forward-mapped artifact — see §5/§7.13 fidelity caveat.)
  - **Overlay / seeded (`OrderListRow`)** → a small `listRowToViewDto(row)` adapter promotes the lean row to the DTO subset it can fill (orderNumber, customer→customerId, freightTerms, shipDirection, consignor/consignee city/state/country, grossWeight/volume, commodity→single line, orderStatus); products/services are empty unless §5 enrichment lands.
  - **not found** → `null`.
- **Fallback if §5 enrichment is REJECTED:** precedence rank 2 (`createdOrders`) **does not exist** — created orders resolve via the overlay row (rank 3), which is lean (empty products/services). §3.2 therefore does not presuppose the §5 GATE outcome: "if §5 approved, `createdOrders` is rank 2; else created orders resolve via overlay row at rank 3, lean."
- **`useOrderView(orderNumber, customerId?)`** — `useQuery` mirroring `useOrderList`, with three differences: (1) `enabled: !!orderNumber && (getApiMode()==='mock' || !!customerId)` — in live mode the query also gates on `customerId` presence so it never fires an invalid body (ties to §9 risk 6); (2) **no** `keepPreviousData` (not paginated); (3) `queryKey` includes `customerId` so org switches refetch. The `queryFn` simply calls `getOrderView` (which already returns the mapped `OrderDetailVM | null`) — **no mapping in the query layer.** [Input 4 §3]
- **Not-found detection (provisional, live unconfirmed):** mock returns `null` when no tier resolves; live catches a 404 from `apiPost` → `null`. Any other thrown error → React Query `isError`. The real live envelope/error shape is **unconfirmed pending Swagger** (§9 risk 5) — `isNotFound(e)` is a provisional 404 predicate.

### 3.3 Reverse mapper — `mapOrderViewToFormVm` (+ net-new `fromIsoTimestamp`)

`OrderReadView` (§3.4) is locked to the **form-VM shape** (`general` / `pickupDelivery` / `products[]` / `specialServices[]`, where **`references[]` and `instructions[]` are nested UNDER `general`** as `general.references` / `general.instructions` — verified orderFormVm.ts:55–56). The detail page's `manualOrder{}` DTO is mapped into that shape by `mapOrderViewToFormVm`, the inverse of `mapFormToOrderInterface` (Input 2 §2), plus regeneration of dropped UI scaffolding: row `id`s, booleans, the 2 guided reference rows, and ISO→triad date splits. Its lossy/ambiguous round-trips are catalogued in §7.

**`fromIsoTimestamp(iso, tz)` — net-new helper (does NOT exist today; only `toIsoTimestamp` exists at mapFormToOrderInterface.ts:24). Spec:**
- **Inputs accepted:** wall-time `YYYY-MM-DDTHH:MM:00` (what `toIsoTimestamp` emits — no `Z`, no offset) **and** full ISO with millis and `Z` (what seeded `orders.json` / `mapOrderListRow.formatDateTime` carry, e.g. `2026-06-15T08:00:00.000Z`).
- **Implementation:** **pure string-slice, never a `Date` object** — mirroring `mapOrderListRow.formatDateTime` — so no timezone shifting occurs. Split on `T`; from the date half take `YYYY-MM-DD` → reorder to `MM/DD/YYYY`; from the time half take the first 5 chars `HH:MM` (drop seconds/millis/`Z`).
- **Output:** the `DateTimeTriad` `{ date: 'MM/DD/YYYY', time: 'HH:MM', timezone }`, where **`timezone` is taken from the paired `*TimeZoneCode` sibling** passed as the `tz` arg (not derived from the date).
- **Empty input:** `iso` falsy → `makeEmptyTriad()`.
This is the **third** genuinely-new piece of logic alongside the reverse mapper and the status map (§4). [Input 2 §3; Input 3 §8.2; mapFormToOrderInterface.ts:24; mapOrderListRow.formatDateTime]

### 3.4 OrderReadView extraction (from ConfirmationView)

The four read-only accordions (General Information, Pickup & Delivery, Product Information, Special Services) plus the `KV` and `PartyBlock` helpers are **extracted** from `ConfirmationView` into a shared `OrderReadView`. `ConfirmationView` becomes a thin wrapper (page chrome + Alert + confirm-strip) that renders `<OrderReadView>` for its body; the detail page renders the same `<OrderReadView>` against the reverse-mapped VM. [Input 3 §1]

- **Signature:** `OrderReadView({ general, pickupDelivery, products, specialServices, units = 'us' })` — pure presentation, no page chrome, no alert; renders only what is present (Long-only blocks, optional general fields, present date triads render conditionally — already correct for detail orders missing those). [Input 3 §3, §8.4]
- **`references`/`instructions` placement:** these are read as `general.references` and `general.instructions` (nested under `general`, NOT top-level). The reverse mapper must re-seed the **2 guided rows** (`ref-pickup` from `pickupNumber`, `ref-po` from `poNumber`, `guided:true`, value `''` if absent — matching `makeDefaultOrderFormValues` at orderFormVm.ts:121–122) plus free-form rows from `userFieldList` REFERENCE entries (§7.5). [Input 3 §3; orderFormVm.ts:55–56, :121–122]
- **`KV` sharing:** `KV` is consumed by both the extracted accordions and `ConfirmationView`'s confirm-strip → define `KV` in `OrderReadView.jsx` and `export { KV }` (named, alongside the default); `ConfirmationView` imports `import OrderReadView, { KV } from '../detail/OrderReadView.jsx'` (path per §3.6 — relocated up to `components/orders/detail/`). [Input 3 §6 option A]
- **`units` prop is the key divergence:** Confirmation hardcodes `'us'`; the detail page passes the user/customer-preferred unit system so `computeProductRollups` / `convertMeasureDisplay` render in the viewer's units. Default `units='us'` preserves current confirmation behavior with no call-site change. [Input 3 §8.1]
- **No `data`/`variant`/`Alert`/confirm-strip on detail** — those are create-flow-only and stay in `ConfirmationView`; the detail page supplies its own chrome (header + tab shell) around a bare `<OrderReadView>`. (Order Date / Shipment Mode handling: see §3.5.) [Input 3 §8.3]

### 3.5 Detail header + Tab shell

- **`OrderDetailHeader`** (`components/orders/detail/`) — a thin local wrapper: `<h1>{orderNumber}</h1>` + status `Badge` on the **left**, Back-to-Orders action on the **right**. Built local rather than overloading `PageHeader.title` (a plain string slot typed into an `<h1>`); `PageHeader` is used only for the actions cluster if needed. Title prefers `data.orderNumber` once loaded (canonical), falling back to the decoded param. [Input 5 §3]
- **Order Date / Shipment Mode decision (resolved):** the confirmation confirm-strip shows Order Number · **Order Date** (+TZ) · **Shipment Mode** · Payment terms, sourced from the create response `data` (`orderDate`, `orderDateTimeZoneCode`, `shipmentMode`) — **not** the form VM (verified ConfirmationView.jsx:81–86). For the detail page:
  - **Order Date:** the DTO carries `orderDate` (resolved/computed timestamp, NO-VM-HOME group (b)). Render it as a **header subline** (`{orderDate, formatted} · {customer}`) — display-only, never reverse-mapped.
  - **Shipment Mode:** `shipmentMode` is **not on `manualOrder`** (it lives only on the create `CreatedOrderData` response; §7.12). The detail page **omits** Shipment Mode (no source). Cross-referenced from §7.12.
  - The confirm-strip itself stays **create-only** (it depends on create-response `data`); detail does not reproduce it.
- **Status → variant map (net-new) — keyed by CODE:** introduce `ORDER_STATUS_BADGE` in `components/orders/orderStatus.js`, keyed by the canonical **`OrderStatusCode`** union (orderList.ts:39–41: `DRAFT / RD_4_PLNNG / PLN_LD / PLNED_SHIP / PLNNG_FAIL / SHIP_FAIL / CAN`). The detail page reads the DTO, which carries `orderStatus.orderStatusCode` (a code like `RD_4_PLNNG`), **not** the display label — so keying on the label (as the earlier draft's examples did) would miss. One table maps `code → { variant, label }`: e.g. `DRAFT→{gray,'Draft'}`, `RD_4_PLNNG→{blue,'Ready For Plan'}`, `PLN_LD/PLNED_SHIP→{purple,'Planned…'}`, `PLNNG_FAIL/SHIP_FAIL→{red,'…Failed'}`, `CAN→{gray,'Canceled'}`, success/shipped→green. **Default for an unknown code: `gray` + the raw code as label.** This is the **first Orders status-color decision** (the lean grid never rendered status) — trace it in the orders decision log; sign off with Efrain/Jana.
- **`orderHoldStatus` — NOT in the /order/view contract:** `orderHoldStatus` does **not** appear anywhere in the LINX-10700 response payload (grep: zero hits in the view DTO; the only reference is a **comment on the LIST-row shape**, orderList.ts:37). The detail page reads `/order/view`, so an "On Hold" badge has **no field to bind to** in this contract. **v1 omits the On Hold badge.** Whether the hold flag is exposed on the view response (or only derivable elsewhere) is an open contract gap for Ramesh (§9 risk 10). Do not cite the list-row comment as a detail-page source. [orderList.ts:37; LINX-7557 view DTO — no `orderHoldStatus`]
- **Tab shell** (shared `Tab` atom, local state, in-page strip — not `BottomBar`):
  ```jsx
  const TABS = [{ key: 'detail', label: 'Detail' }, { key: 'audit', label: 'Audit Trail' }]
  const [activeTab, setActiveTab] = useState('detail')
  ```
  Render a `.tab-group` row of `<Tab label current onClick>` (no `count` badges). Body: `activeTab === 'detail' ? <OrderReadView …/> : <AuditTrailTab/>`. [Input 5 §4]
- **`AuditTrailTab`** — frame-only "Coming soon" placeholder this slice. The `ShipmentsRoute` placeholder pattern (centered icon + "Coming soon" + sub-line) is a **provisional visual stand-in pending Efrain**, **not** a section-6 design decision: all audit content/structure — including final placeholder copy and iconography — is **section-12-owned** (§8/§10). [Input 5 §4; Input 6 §2]

### 3.6 Proposed file / route layout

```
apps/odyssey-one/src/
├── App.jsx                                   (+1 route: /orders/:orderNumber)
├── routes/orders/
│   ├── OrdersRoute.jsx                       (extend onRowIdClick: non-Draft → /orders/:orderNumber; Draft unchanged)
│   └── OrderDetailRoute.jsx                  NEW — useParams, useOrderView, AppShell, header + Tab shell + status ladder
├── components/orders/
│   ├── orderStatus.js                        NEW — ORDER_STATUS_BADGE map (OrderStatusCode → { variant, label })
│   └── detail/
│       ├── OrderDetailHeader.jsx             NEW — orderNumber + status Badge (left) + Back action (right) + date/customer subline
│       ├── AuditTrailTab.jsx                 NEW — provisional "Coming soon" placeholder (section-12-owned content)
│       └── OrderReadView.jsx                 NEW — RELOCATED from create/ (domain-shared now); default export + named KV
└── api/
    ├── queries/useOrderView.ts               NEW
    ├── services/orderService.ts              (+ getOrderView; + createdOrders map [if §5 approved] + __resetOrderWriteState update)
    ├── types/orderView.ts                    NEW — OrderViewDto + OrderViewResponse = { manualOrder: OrderViewDto }
    ├── types/orderViewVm.ts                  NEW — OrderDetailVM
    ├── mappers/mapOrderView.ts               NEW — OrderViewDto → OrderDetailVM
    └── mappers/mapOrderViewToFormVm.ts       NEW — manualOrder → form VM (reverse mapper) + fromIsoTimestamp helper
```

**Resolved location decisions (no longer hedged):**
- `OrderReadView.jsx` **relocates up** to `components/orders/detail/` (it is now domain-shared, not create-specific). `ConfirmationView` updates its import to `import OrderReadView, { KV } from '../detail/OrderReadView.jsx'`.
- **CSS split: IN for v1.** Split the read-only rules out of `create-order.css` into a co-located `components/orders/detail/order-read.css`, imported by `OrderReadView`, so the detail page is not coupled to the create-flow stylesheet. (Confirmation continues to work because `OrderReadView` carries its own CSS import.)

## 4. UI reuse vs new

**Reuse `@odyssey/ui` as-is (no new shared components, no normalize):** `PageHeader`, `Tab` (`{ label, count, current, onClick }`; `current` is the only state prop, hover is CSS), `Badge` (`{ children, variant, leftIcon, rightIcon, statusDot }`), `Button` (`variant="secondary"/"link"`, `size="sm"`), `EmptyState` (`{ icon, message }`), `Accordion` (inside `OrderReadView`). [Input 5 §0, §6]

**Reuse from the Create flow:** `OrderReadView` (extracted from `ConfirmationView`) + its `KV` / `PartyBlock` helpers + `productMath.ts` (`computeProductRollups`, `convertMeasureDisplay`); the read accordions, party grid, services table, and all CSS classes already exist (relocated to `order-read.css` per §3.6). [Input 3]

**New app-local — three genuinely new pieces of LOGIC** (the rest is moved code or wiring): (1) `mapOrderViewToFormVm` (reverse mapper); (2) `fromIsoTimestamp` (net-new inverse of `toIsoTimestamp`, §3.3 — it does NOT exist today); (3) `ORDER_STATUS_BADGE` (status→variant map). Plus the data-layer files (`getOrderView`, `useOrderView`, `orderView.ts`, `orderViewVm.ts`, `mapOrderView.ts`), `OrderDetailRoute`, `OrderDetailHeader`, `AuditTrailTab`, and the `listRowToViewDto` mock adapter. [Input 5 §6; Input 2 §3; Input 4 §2–§3]

## 5. Data & mock fidelity — GATE decision

Mock-mode resolution must yield a **complete** read view for any clicked row, not just in-session drafts. Three mock sources differ in completeness:

| Source | products (`orderLines`) | special services (`orderAccessorialDetails`) | View completeness |
|---|---|---|---|
| Draft (`draftValues`, full `OrderFormValues`) | ✅ all lines | ✅ all | **Full** (forward∘reverse caveat §7.13) |
| Created order (overlay row only, today) | ❌ collapsed to `commodity` string | ❌ dropped by `manualOrderToListRow` | Lean |
| Seeded `orders.json` (~4509 rows) | ❌ none (generator emits a flat `commodity` string) | ❌ none (generator never references `SPECIAL_SERVICES`) | **Lean** |

Consequence: clicking any of the ~4509 seeded rows into View would show commodity/weight/volume but an **empty products table and no special services** — looks broken. Only freshly-created drafts render complete. [Input 4 §4]

**RECOMMENDATION (GATE decision — needs sign-off):** **Enrich the mock so every order renders a complete View.** Two paired, additive changes:

1. **Enrich `tools/generate-orders.mjs`** so every seeded row carries 1–3 products + occasional special services. Add an `orderLines[]` array (pick 1–3 from `CHEMICAL_PRODUCTS`, faker seed 42 reproducible; split the existing `grossWeight`/`volume` totals across lines so header == sum-of-lines, matching `manualOrderToListRow`'s contract) and `orderAccessorialDetails` on ~25–30% of orders (sample `SPECIAL_SERVICES`; move that pool into shared `data-pools.mjs` to honor the file's "shared pools" rule). Carry hazmat/hClass/unNumber from `CHEMICAL_PRODUCTS` onto lines for a richer View (display only when the deferred hazmat block is later built). Keep `commodity` (first line's desc) so the list grid and `mapOrderListRow` are untouched — the new fields are additive; the list snapshot stays green.
2. **Retain the submitted order for created orders.** Add a new `createdOrders` map in `orderService.ts` (parallels `draftValues`; add to `__resetOrderWriteState`). **Fidelity note (corrected):** to make a just-created order's View match **what the user typed**, retain the original **`OrderFormValues`** (like drafts), not the forward-mapped `manualOrder`. Feeding a forward-mapped `manualOrder` back through `mapOrderViewToFormVm` yields a **double-lossy** (forward∘reverse) reconstruction (drops reference id/guided, collapses `locationId??idOrgName`, drops `manualMode`/contactTitle/address3, re-derives roll-ups) — which is **not** what the user typed (§7.13). If retaining `OrderFormValues` is undesirable, downgrade the claim to "matches the persisted wire shape, subject to forward-mapper losses." Recommended: retain `OrderFormValues` (`createdOrders: Map<string, OrderFormValues>`), resolved at precedence rank 1-equivalent.

**Tradeoff:** *Accept partial detail* = zero generator work but a visibly empty View for ~4509 of ~4514 rows (demo looks broken; defeats the purpose of a detail screen). *Enrich* = ~30 min generator work + one deterministic `orders.json` regen (already wired into prebuild), roughly doubling `orders.json` (~4 MB → ~8 MB, gitignored-pattern data — acceptable), and the rich pool data already exists. Enrichment is clearly the right call. **GATE:** confirm enrichment is approved (and whether to enrich now or accept partial detail as a deliberate v1 cut). If rejected, §3.2 fallback applies (created orders resolve lean via overlay row). [Input 4 §4 RECOMMENDATION]

## 6. States (loading / error / not-found / empty)

Orders detail loading/error/empty states are **not designed** (Q34 confirms grid loading/empty/error are absent from the design exports) — apply the same **provisional patterns** the grid uses, pending Efrain. Follow `OrdersRoute`'s inline status ladder at the **route level**; the header chrome + tab strip stay mounted across all states (so the user can always navigate back) and only the **body** swaps. [Input 5 §5; Input 6 §1, §3 row 16]

- **Loading** (`isPending`): a plain **"Loading order…" text block** (`orders-page__status text-label-sm-regular`) — matching `OrdersRoute`'s "Loading orders…" treatment exactly. (No `TabLoader` — that component is not confirmed to exist; dropped to keep the loading treatment consistent with the grid.)
- **Error** (`isError`): message + `<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>` — identical to `OrdersRoute`'s retry affordance. Live not-found may also arrive here if the 404 predicate misfires (see below).
- **Not-found** (loaded, `getOrderView` returned `null`): **distinct from error.** Render `EmptyState` (`icon={<Inbox size={32}/>} message={`Order ${orderNumber} not found`}`) + a Back-to-Orders action. **No Retry** (retrying won't help). **Live trigger is provisional:** mock returns `null` directly; live converts a caught 404 → `null` (§3.2). There is no confirmed live not-found envelope (§9 risk 5) — until Swagger lands, live not-found behavior is **unverified**; if a 404 is surfaced as a thrown error instead, it falls to the Error state. The closest documented precedent is Cancel/Restore on a non-existent order returning a (to-be-reworded) error (LINX-10683). [Input 5 §5; Input 6 §1, §3 row 17]
- **Empty (within a loaded order):** an order with no references/instructions/optional general fields/date triads needs no extra flags — `OrderReadView`'s conditional Long-only blocks already render nothing when absent. [Input 3 §8.4]

## 7. Reverse-mapper soft spots (lossy / ambiguous round-trips)

`mapOrderViewToFormVm` is mostly mechanical, but the following round-trips are lossy or ambiguous. Those that matter for this slice, with chosen handling:

1. **Early/Late dates** (4 triads ↔ `requested*Date` / `*Appointment`) — the forward pairing is **PROVISIONAL** (plan decision 8, Ramesh residual): Early→`requested*Date`, Late→`*Appointment`. If the backend repurposes `*Appointment` as a real appointment (not the form's "Late" semantic), the reverse re-hydrates Late from a field that may not mean Late. **Handling:** mirror the forward pairing exactly and gate the whole reverse behind the same "PROVISIONAL" caveat; flag for Ramesh sign-off before relying on round-trip. The empty-time→`'00:00'` ambiguity round-trips to the same wire value — accept it; document that blank-time is unrecoverable. TZ rides the sibling `*TimeZoneCode` and is dropped if the date is empty. [Input 2 §4 #1; Input 1 (b)]
2. **`requestedShipDate` / `requestedShipTimeZoneCode` — NO VM HOME (new entry):** the form VM has no ship-date triad and the forward mapper never writes `requestedShipDate` (mapFormToOrderInterface.ts:93–100). An order with `requestedShipDate` set would silently drop it on round-trip. **Handling:** **display-or-drop, no reverse.** It is the resolved value of the SHIP planning anchor when `requestedDateType === 'SHIP'` (Q22); confirm with Ramesh whether it should ever be editable before treating it as purely display. [LINX-7557:113; Input 1 (b)]
3. **`orderInvolvedPartyList[]` (N parties, different schema)** — flat origin/destination ≠ the list parties (`cityName` vs `originCity`, adds `vatNumber`, drops phone/email/contactTitle/contactName). The form VM models a fixed origin + destination only and **cannot represent N additional parties** — the **most likely VM gap**. **Handling:** **not displayed and not reversed in v1** (deferred display set, §2.1); flag for the editable-VM decision (does it ever need a repeatable party collection?). [Input 1 (f)]
4. **Consolidatable** (`general.consolidatable` ↔ userFieldList FLAG `CONSOLIDATABLE` Y/N) — header flag whose only home is the userFieldList FLAG (forward writes it as the FIRST userFieldList entry, mapFormToOrderInterface.ts:62–63). **Handling (corrected — do NOT default to `true`):** Q15 is resolved (open-questions.md:40) — consolidatable is a real user-controlled header field, and Q15's default-checked applies to **new order creation**, not to re-hydrating an existing order's actual value. Any Odyssey-One-created order **always** carries the FLAG; the only orders missing it are externally-sourced. Defaulting a missing FLAG to `true` would **fabricate** a value the order never had. **Reverse:** read FLAG `CONSOLIDATABLE` → `Y/N`; if **absent**, treat as **unknown/indeterminate** in the read view (not `true`). Document that any future edit path must **preserve the absence** and only write the FLAG if the user touches the checkbox. (Defaulting-to-true is safe ONLY because the read view never writes — and must NOT carry into edit.) [Input 2 §4 #2; open-questions.md:40; mapFormToOrderInterface.ts:62–63]
5. **Free-form references** (`general.references[]` non-guided ↔ userFieldList REFERENCE) — forward drops `id`/`guided`; the split is reconstructed, not stored. **Handling:** reverse iterates `userFieldList` **filtering on `userfieldType === 'REFERENCE'`** for the references reconstruction (so the `FLAG`/`CONSOLIDATABLE` entry and any future non-REFERENCE entries never leak in as bogus reference rows), maps each → `{ guided:false, type:name, value }`, regenerates `id`s, and **always re-emits the 2 guided rows** seeded from `pickupNumber`/`poNumber` (value `''` if absent, `guided:true`) — matching `makeDefaultOrderFormValues`. [Input 2 §4 #3; mapFormToOrderInterface.ts:63–66; orderFormVm.ts:121–122]
   - **5b. Instructions** (`orderInstructionList[]` → `general.instructions[]` — new entry): forward maps `general.instructions` (non-empty) → `orderInstructionList` with `instructionType '0012'` (Q19 backend default) + sequential `instructionNumber` (mapFormToOrderInterface.ts:112–118). **Reverse:** `instructionDetail → description`, **regenerate `id`**, **drop `instructionType` and `instructionNumber`** (UI scaffolding / backend-default). [mapFormToOrderInterface.ts:112–118]
6. **PartnerId ↔ locationId/idOrgName** — forward collapses `locationId ?? idOrgName` into one `{prefix}PartnerId`; reverse can't tell which it was, nor recover `manualMode`. **Handling:** populate **both** `locationId` and `idOrgName` from `PartnerId`; set `manualMode` via heuristic (location-lookup hit → false, else true), default `false`; document the loss. [Input 2 §4 #4]
7. **Header weight/volume roll-ups** — sum + first-line-UoM; mixed-UoM totals are a known reconciliation item. **Handling:** ignore on reverse; re-derive from `orderLines` on the next forward map; do not seed the form header from these. [Input 2 §4 #9; Input 1 (c)]
8. **`specialServices[].description`** — only `accessorialCode` + sequence stored; description dropped. **Handling:** re-lookup description from the accessorial-code reference table — but for **v1 this is stubbed with the raw code** (description enrichment via LINX-11163 deferred; §8/§10). [Input 2 §4 #8; Input 6 §2]
9. **Party `Address3` / `ContactTitle` — NO VM HOME (new entry):** `PartyValues` has no address3 / contactTitle slots and `mapParty` never emits them. **Handling:** **display-or-drop, no reverse.** Confirm with Efrain whether the detail UI must render address line 3 / contact title; if so, extend `PartyValues` (and the display block) — out of v1. [LINX-7557:149, :155; orderFormVm.ts:28–43; mapFormToOrderInterface.ts:35–49]
10. **`equipmentNumber` (round-trips — clarification):** `equipmentNumber` ↔ `general.equipmentReferenceNumber` round-trips cleanly (forward at mapFormToOrderInterface.ts:101). Reverse must NOT conflate it with `orderCarrierEquipDetailList[].equipmentCode` (↔ `general.equipment`) — two distinct equipment concepts. [Input 1 (c); mapFormToOrderInterface.ts:101]
11. **`owningOrganizationName`** — display-only, never written to wire. **Handling:** resolve via org-id lookup or response context if available, else `''`. [Input 2 §4 #7]
12. **`poDate`** — no `poDate` in the form VM or the mapped `ManualOrder` subset. **Handling:** no-op in reverse; if a `poDate` form field is later added it needs a new wire field — out of contract, flagged not-in-scope. [Input 2 §4 #5]
13. **Forward∘reverse double-loss for created orders** — if a created order's View is sourced from a forward-mapped `manualOrder` (the rejected §5 approach), the reverse reconstruction is double-lossy and NOT what the user typed. **Handling:** retain original `OrderFormValues` for created orders (§5), bypassing the reverse mapper for that tier. [contract critique; §5]
14. **Phone normalization** — `normalizePhone`→E.164 isn't losslessly invertible to original display. **Handling:** round-trips fine wire-to-wire; accept stored E.164 as display or apply a `displayPhone` formatter. Minor. [Input 2 §4 #10]
15. **`shipmentMode` (Q28)** — exists only on the create `CreatedOrderData` response `data`, not on `manualOrder`; the detail page therefore **omits** it (§3.5). Not reversed into the form VM (no form field). [Input 2 §4 #6]

**Preserve-on-save (read view doesn't touch these, but any future edit path must):** all financial/cost fields (header + line + `orderChargeList` + `orderLineChargeList`), `confirmedQuantity*`, `orderStatus.*` / `sourceApplication.*` / all `*SourceSystem`/`*ExternalIdentifier`/`sourceTblPrimaryKey`, `orderCarrierEquipDetailList`, `requestedShipDate`, party `Address3`/`ContactTitle`, `orderInvolvedPartyList`, and all system keys (`orderId`, `orderLineId`, `orderRelease*`, `instructionId`) must carry through hidden for update correlation — never written from the VM. [Input 1 cross-cutting #4–#10]

## 8. Scope IN vs DEFERRED

**IN-SCOPE (v1 View Order build):**
- Read-only render of the **form-VM subset** of `manualOrder{}` from `POST /v3/order/view` `{ orderNumber, customerId }` (wire envelope `{ manualOrder }`), via `getOrderView` + `useOrderView` + `mapOrderView` + `mapOrderViewToFormVm` → `OrderReadView`.
- `OrderReadView` extraction + relocation from `ConfirmationView` (shared by Create confirmation + detail); `order-read.css` split.
- `fromIsoTimestamp` net-new helper.
- Route `/orders/:orderNumber` + `OrderDetailRoute` + `OrderDetailHeader` (orderNumber + status badge + Back + date/customer subline).
- Navigation IN: row View action (always → detail) + Order Number link (Draft → create, else → detail); navigation OUT via Back to Orders.
- Two-tab shell (Detail + Audit Trail **frame** only).
- Provisional loading / error / not-found states.
- `ORDER_STATUS_BADGE` status→variant map keyed by code (first Orders status-color decision).
- Mock enrichment per §5 (pending GATE approval); `createdOrders` retains `OrderFormValues`.

**DEFERRED:**
- **DEFERRED display set (§2.1)** — per-line hazmat/dimensions/line-refs, financial charges, `orderInvolvedPartyList[]`, confirmed quantities, status provenance, `requestedShipDate`, party Address3/ContactTitle. Not rendered in v1.
- **Section 10 actions** — Edit, Cancel, Restore, Copy, Delete. All Edit/Cancel/Delete UI stories are in **Architecture/Tech Design** with lean specs (underspecced): Edit has an open status-restriction confirm (LINX-11185, PRD 2365915159); the Delete UI story is **missing** from the dump (LINX-10300 collision = Manage Columns, Q4). Build the read view without these wired. [Input 6 §2, §3 rows 13–15]
- **Section 12 Audit Trail content** — the paged change-log via `POST /v3/audit-report` (field, oldValue, newValue, changeMadeBy; LINX-10812/10815/8457). Slice 4 in the build order; ship the tab frame only this slice. All audit content/structure (incl. final placeholder copy/iconography) is section-12-owned. [Input 6 §2, §3 row 12]
- **Description enrichment via master-service** — **two distinct sources, different maturity:** LINX-11163 (Special Services description) is **fully contracted and "Ready for Development"** (request/response example present, LINX-7557:680–703) — deferring it is a **scope/time choice, not a contract gap**; the GATE reviewer may pull this cheap, ready lookup into v1. LINX-9741 (Mode/Equipment) status not stated in the dump — confirm. For v1 both are **stubbed with raw codes**. (Related: Q10 — the Special Services lookup over-fetches all charge codes; intended filter unresolved.) [Input 6 §2, §3 rows 10–11; LINX-7557:680–703]

## 9. Risks / open decisions for GATE

1. **Mock-fidelity decision (§5)** — enrich the generator + retain created-order `OrderFormValues`, or accept partial detail? **Recommend enrich.** Needs explicit GATE sign-off (regen + ~doubled `orders.json`). [Input 4 §4]
   - **1b. Display-scope decision (§2.1)** — confirm the read view shows ONLY the form-VM subset in v1, and that the DEFERRED display set (hazmat, charges, involved parties, etc.) is an accepted v1 cut (not a regression vs the design).
2. **Reverse-mapper PROVISIONAL Early/Late pairing (§7.1)** — gated on Ramesh sign-off before any round-trip (edit) path relies on it; safe for the read-only view this slice.
3. **`orderInvolvedPartyList` VM gap (§7.3)** — the form VM can't hold N additional parties; decide read-view display treatment (deferred in v1) and whether the editable VM ever needs a repeatable party collection. Likely the biggest structural gap.
4. **Status→badge-variant map (§3.5)** — first Orders status-color decision; keyed by `OrderStatusCode`; sign off with Efrain/Jana; trace in the orders decision log.
5. **Real `/order/view` response envelope + not-found shape** — confirm against live Swagger: the spec assumes `{ manualOrder }` (LINX-7557:107) and 404-as-thrown-error; the live not-found→`null` path and `isNotFound` predicate are **unverified** until then.
6. **`customerId` sourcing + live gate (§3.1/§3.2)** — `customerId` is mandatory (AC) but unsourceable from the row today (Q30 / deferred item 9). Live path **throws** until resolved; live query is gated on `customerId` presence so it never ships an invalid body. Decide the source (customer-scope/EntityChip, **not** a 2nd URL param).
7. **Not-found contract** — undocumented; provisional `EmptyState` + back, no Retry, pending Ramesh (contract) + Efrain (design).
8. **Detail loading/error/empty design** — Q34: not designed; provisional patterns (grid-matching) until Efrain.
9. **"Back to Orders" affordance (§3.1)** — no Jira backing (UX-owned, inferred); confirm with Efrain.
   - **9b. Draft-row navigation rule (§3.1)** — confirm with Jana/Efrain: Draft Order Number link continues to reopen the create form; the View action always goes to read-only detail. Provisional.
10. **`orderHoldStatus` on /order/view (§3.5)** — not in the view contract; v1 omits the On Hold badge. Confirm with Ramesh whether the hold flag is exposed on the view response.
11. **LINX-11163 pull-forward (§8)** — Special-Services description lookup is Ready-for-Development; GATE reviewer decides whether to include it in v1 rather than stub raw codes.
12. **Slice-2 vs PO priority 9 (§1)** — confirm with Ramesh that pulling priority-9 LINX-7557 forward (on reuse grounds) is acceptable for the prototype.

## 10. Traceability

| # | Spec claim | Source |
|---|---|---|
| 1 | View Order = read view via `POST /v3/order/view` `{orderNumber, customerId}`; menu item currently a stub/no-op | LINX-10233, LINX-10700, LINX-10811; requirements-tracker.md:126, :151; domain-analysis.md:219 |
| 2 | Response is wrapped under `manualOrder`: `{ "manualOrder": {…} }`; no `{success,order,error}` envelope on the wire | LINX-7557-order-overview.md:107 |
| 3 | `customerId` + `orderNumber` are mandatory; not-found/bad-input via HTTP 404/400 (apiPost throws) | LINX-7557-order-overview.md:370-378 |
| 4 | LINX-10700 = BE API to fetch order details by orderNumber + customerId, POST, Closed | LINX-7557-order-overview.md:81-98 |
| 5 | LINX-10233 describes post-creation actions **and** order-viewing functionality | LINX-7557-order-overview.md:40-47 |
| 6 | Detail data is the **flat** `manualOrder{}`, distinct from compact role-nested `/order/list` row | section-map #6 & #1; domain-analysis.md:205 |
| 7 | manualOrder view DTO full field inventory (sections a–j) + VM targets + display set | LINX-7557-order-overview.md:106-363 (Input 1) |
| 8 | `requestedShipDate`/`requestedShipTimeZoneCode` present on DTO; no form-VM home → display-or-drop | LINX-7557-order-overview.md:113; mapFormToOrderInterface.ts:93-100 |
| 9 | `originAddress3`/`originContactTitle` present on DTO; no form-VM home → display-or-drop | LINX-7557-order-overview.md:149, :155; orderFormVm.ts:28-43; mapFormToOrderInterface.ts:35-49 |
| 10 | `equipmentNumber` round-trips to `general.equipmentReferenceNumber`; distinct from carrier equipmentCode | mapFormToOrderInterface.ts:101; Input 1 (c) |
| 11 | Navigation IN — row View action (Order Actions column) always → detail; Order Number link Draft→create else→detail | LINX-10233, LINX-10811; OrdersRoute.jsx:73-78; domain-analysis.md:210 |
| 12 | `onRowIdClick` is NOT fully inert — Draft rows already route to /orders/create?draft=<id> | OrdersRoute.jsx:73-78 |
| 13 | `customerId` not on the list row; mandatory for live; live path gated/throws (Q30) | open-questions.md:66 (Q30), :87 (item 9); orderList.ts:9; LINX-7557:370-375; orderService.ts:190-194 |
| 14 | `orderNumber` is the canonical route key (row id IS orderNumber) | mapOrderListRow `id: row.orderNumber`; LINX-11013 (Input 5 §1) |
| 15 | Route after `/orders/create`; `useParams`; `decodeURIComponent` | OrdersRoute/CreateOrderRoute precedent; App.jsx (Input 5 §1) |
| 16 | Data layer mirrors useShipmentDetail/getSellShipmentDetail; service is the single map point (maps once, both modes) | useShipmentDetail.ts; getSellShipmentDetail; orderService.ts idiom (Input 4 §1) |
| 17 | `getOrderView` mock precedence + per-tier source→DTO conversion + null on not-found; §5-gated rank 2 | orderService.ts overlay/draft state; getDraft throw idiom orderService.ts:190-194 (Input 4 §2) |
| 18 | `useOrderView`: enabled gates on orderNumber + (mock OR customerId); no keepPreviousData; keyed on customerId; no query-layer mapping | useOrderList.ts pattern (Input 4 §3) |
| 19 | `fromIsoTimestamp` net-new (only toIsoTimestamp exists); string-slice, no Date, tz from sibling code | mapFormToOrderInterface.ts:24 (no fromIsoTimestamp); mapOrderListRow.formatDateTime |
| 20 | `OrderReadView` extracted+relocated from `ConfirmationView`; `KV` exported named; `units` prop divergence; refs/instructions nested under general | ConfirmationView.jsx:14/16-23/57/81-86; orderFormVm.ts:55-56 (Input 3) |
| 21 | Reverse mapper `mapOrderViewToFormVm` = inverse of `mapFormToOrderInterface` + scaffolding regen | mapFormToOrderInterface.ts; orderFormVm.ts (Input 2 §3) |
| 22 | Lossy/ambiguous round-trips (Early/Late provisional, ship date, involved parties, consolidatable, refs, instructions, partnerId, roll-ups, Address3/Title, owningOrgName, poDate, double-loss, phone, shipmentMode) | Input 2 §4; LINX-7557:113/149/155; mapFormToOrderInterface.ts:62-66/101/112-118 |
| 23 | Consolidatable: read FLAG; absent → indeterminate NOT true (Q15 default is for create, not re-hydration); never write on read | open-questions.md:40 (Q15); mapFormToOrderInterface.ts:62-63 |
| 24 | References reverse filters userfieldType==='REFERENCE'; instructions reverse drops type/number, regen id | mapFormToOrderInterface.ts:63-66, :112-118; orderFormVm.ts:121-122 |
| 25 | Mock fidelity: seeded + lean created rows show empty products/services; enrich generator + retain created OrderFormValues (avoid forward∘reverse double-loss) | generate-orders.mjs; manualOrderToListRow (Input 4 §4) |
| 26 | Detail header: orderNumber + status `Badge` (left) + Back (right) + date/customer subline; Shipment Mode omitted (not on manualOrder) | ConfirmationView.jsx:81-86; PageHeader/Badge/Button APIs (Input 5 §3) |
| 27 | `ORDER_STATUS_BADGE` keyed by `OrderStatusCode` (DTO carries code not label); default gray+raw code; first Orders status-color decision | orderList.ts:39-41; createOrder.ts:12-15 (Input 5 §3) |
| 28 | `orderHoldStatus` is NOT in the /order/view DTO (only a list-row comment); v1 omits On Hold badge | orderList.ts:37; LINX-7557 view DTO (no orderHoldStatus) |
| 29 | Two-tab shell via shared `Tab` atom, local `useState`; Audit Trail frame-only; placeholder is provisional, section-12-owned | Tab.jsx API; ShipmentsRoute:300-308 (Input 5 §4) |
| 30 | Audit Trail content (paged change-log, `POST /v3/audit-report`) deferred to slice 4 | LINX-10812/10815/8457; domain-analysis.md:250; section-map #12 |
| 31 | Loading/error/not-found = provisional grid-matching patterns (not designed); not-found ≠ error, no Retry; live not-found unverified | open-questions.md:73 (Q34); OrdersRoute status ladder (Input 5 §5) |
| 32 | Not-found precedent: cancel on non-existent order returns to-be-reworded error | LINX-10683; domain-analysis.md:221 |
| 33 | Edit/Cancel/Restore/Copy/Delete deferred — actions weak/underspecced (Architecture/Tech Design) | LINX-10248/10258/7556/11185; domain-analysis.md:220-227; section-map #6/#10 |
| 34 | Delete UI story missing (LINX-10300 collision = Manage Columns) | domain-analysis.md:222; open-questions.md:19 (Q4); LINX-7557-order-overview.md:71-77 |
| 35 | Description enrichment: LINX-11163 (Special Services) is fully contracted "Ready for Development" — deferral is scope choice not contract gap; stub raw codes v1 | LINX-7557-order-overview.md:680-703 (LINX-11163); LINX-9741 |
| 36 | Special Services lookup over-fetches all charge codes; filter unresolved | open-questions.md:28 (Q10) |
| 37 | Build-order: detail = slice 2 per section-map, BUT section-map is AI-generated/unvalidated; deliberate deviation from PO priority | section-map.md:59 (AI-generated); section-map #36-44 |
| 38 | Authoritative PO priority: LINX-7557 (Order Overview & Actions, contains View Order) = priority 9 of 9 | requirements-tracker.md:121, :126 |
| 39 | requirements-tracker.md is the 2026-06-15 PO FR tracker (Ramesh xlsx + feedback email + build audit); confirms inert/stub state | requirements-tracker.md (header + :126, :151) |
| 40 | Reuse `@odyssey/ui` as-is; app-local, skip-normalize-v1 | Tab/PageHeader/Badge APIs; Orders/GlobalSearch posture (Input 5 §6) |
| 41 | "Back to Orders" affordance has no Jira backing (UX-owned, inferred) | No source — flagged inferred (Input 6 §3 row 20) |
| 42 | Section-6 UI surface has no active Efrain-vs-Jira conflict; Overview tab-set conflict (Q25) is out of scope | project_orders_source_precedence; open-questions.md (Q25) |

> AI-generated design spec. Validate with Efrain (design: detail states, status colors, Back affordance, Draft-row nav rule, Address3/ContactTitle display) and Ramesh/Jana (contract: `/order/view` response envelope + not-found, customerId scoping, Early/Late pairing, requestedShipDate editability, orderHoldStatus exposure, LINX-11163 pull-forward, priority-9 sequencing) before treating as canon.
