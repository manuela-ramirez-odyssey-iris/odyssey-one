# Orders Filters — implementation plan

**Date:** 2026-08-20
**Sources:** LINX-10285 (All tab, Blocked) · LINX-11663 (Draft tab, Blocked) · LINX-11659 (Validation Errors tab, On Hold) — AC read from `customfield_10032`, verbatim.
**Precedent:** Shipments filter architecture (`src/search/shipments/`, `ShipmentsFiltersView.jsx`, S107/S108/S110).

## Decisions (user, 2026-08-20)

1. **Placement — the GlobalSearch panel place.** ~~Toolbar now, GlobalSearch later.~~ **Corrected by the user during implementation:** the panel opens from the navbar bar's own FilterButton and drops beneath the bar — the same slot (`AppShell searchSlot`) and placement rule Shipments uses. The toolbar's secondary `Filters` button **stays**, as a second TRIGGER for that same panel (user: *"don't remove our secondary button top of the table"*) — two triggers, one panel, one place. Its open state is lifted to `OrdersRoute` because the two triggers sit in different subtrees. Only the *search* half (bar text, chips, criteria matcher, results) remains phase 2; it will reuse this registry.
2. **Scope — lean.** Fields + `Apply All Filters` / `Clear All Filters` only. No Saved tab, no shared filters, no edit-profile mode. `savedFilters.js` is NOT generalized in this phase.
3. **Basic/Advanced — no split.** Render the AC's field list flat. The "Advanced" list is struck through in 11663 and 11659 and was never enumerated for the All tab; there is nothing concrete to put behind the button. `Show Advanced Filters` is deferred, not designed away.

## Filter sets per tab (AC-verbatim)

Per-tab sets are **ruled, not inferred** — LINX-10285's note reads "Basic filters are applicable for ~~all 3~~ **'All' tab only**" (strikethrough in the ticket).

### All — LINX-10285

| Field | Control | Request field |
|---|---|---|
| Order Number | search + multi-select | `orderNumbers[]` ✅ exists |
| Order Status | multi-select | `orderStatuses[]` ✅ exists |
| Customer | search + multi-select | `customers[]` ✅ exists |
| Origin City, State, Country | search + multi-select, suggestion matches City **OR** State **OR** Country | `originCities/States/Countries[]` ✅ exists ⚠️ see defect below |
| Destination City, State, Country | same | `destinationCities/States/Countries[]` ✅ exists |
| Latest Pickup Date | From / To calendars, MM/DD/YYYY, either or both | `latestPickupDateFrom/To` ✅ exists |
| Latest Delivery Date | From / To calendars | `latestDeliveryDateFrom/To` ✅ exists |

Date semantics: From only = on-or-after · To only = on-or-before · both = inclusive between. `dateInRange()` in `orderService.ts` already implements exactly this.

**Not in Ramesh's summary but in the AC:** both date ranges.

### Draft — LINX-11663

| Field | Control | Request field |
|---|---|---|
| Order Number | search + multi-select | `orderNumbers[]` ✅ |
| Customer | search + multi-select | `customers[]` ✅ |
| Created Date | From / To | `createdDateFrom/To` ❌ **new** |
| Last Edit Date | From / To | `lastEditDateFrom/To` ❌ **new** |
| Created By | search + multi-select | `createdBy[]` ❌ **new** |
| Last Edit By | search + multi-select | `lastEditedBy[]` ❌ **new** |

AC note: *"Filters can not be applied on blank values"* — a row with a blank field never matches a filter on that field. `dateInRange` already returns `false` for `undefined`; `oneOf` must not treat `undefined` as a match when the filter is non-empty (it already doesn't — `values.includes(v ?? '')`).

### Validation Errors — LINX-11659

| Field | Control | Request field |
|---|---|---|
| Order Number | search + multi-select | `orderNumbers[]` ✅ |
| Customer | search + multi-select | `customers[]` ✅ |
| Order Status (Ready / Complete / Purge) | multi-select | `draftOrderStatuses[]` ❌ **new** |
| Error Count | operator single-select (`Greater Than` / `Equals` / `Less Than`) **+** integer text box (whole number, ≥1, no decimals) | `errorCountOperator` + `errorCountValue` ❌ **new** |

**Two traps here.** (a) VE "Order Status" is `draftOrderStatus` (the OIF validation state, LINX-11137) — a *different vocabulary* from the All tab's 7 `orderStatus` labels; binding it to `orderStatuses` would silently return nothing. (b) Error Count needs a **comparator control** that no existing `attr.match` type covers.

## Contract extensions

`OrderListRequest.filters` gains 8 fields, marked as OUR extension in the type comment — same footing as the `/order-service/v3/order/tab-counts` endpoint we already invented (the LLD has no counts endpoint either):

```
createdDateFrom?, createdDateTo?, lastEditDateFrom?, lastEditDateTo?,
createdBy?: string[], lastEditedBy?: string[],
draftOrderStatuses?: string[],
errorCountOperator?: 'gt' | 'eq' | 'lt', errorCountValue?: number
```

## Seed state — verified, nothing to reseed

`data/orders.json`, 5077 rows: `createdBy` 5077/5077 · `createdAt` 5077/5077 · `lastEditedBy` + `lastEditAt` 102/102 (exactly the Draft rows) · `draftOrderStatus` + `errorCount` 1548 rows (Ready 766 / Complete 533 / Purge 249). Every new filter has a reachable value set.

## Open contract defect → raise with Ramesh / Cognizant

The LLD models origin as **three parallel arrays** (`originCities`, `originStates`, `originCountries`) ANDed together. Two selected triples (Miami/Florida/US + Milan/Lombardy/Italy) become a cross-product that also matches "Miami, Lombardy, Italy". Multi-select origin needs an **array of triples**, not three arrays. Single-select is correct today. Flag, don't unilaterally change the LLD shape.

## Steps — ALL SHIPPED 2026-08-20 (see decision-log ORD-18)

1. **`src/search/orders/registry.js`** — ONE attribute catalog. Each entry: `key`, `label`, `control`, `paramKey`, `tabs: ['all' | 'draft' | 'validationErrors']`, `values` for enums. Tab-filtered at render — not three registries.
2. **`api/types/orderList.ts` + `orderService.ts`** — add the 8 fields; implement in the mock filter chain (`dateInRange` reused for the two new ranges, `oneOf` for the three new arrays, a small 3-op numeric compare for error count).
3. **`src/search/orders/toRequest.js`** — panel filter-state → `filters` object + `hasFilters()`. Single mapping point, unit-tested. (Mirrors `chipsToFilters` in the Shipments layer.)
4. ~~**Extract shared controls** from `ShipmentsFiltersView.jsx`.~~ **NOT DONE — deliberately.** Only `EnumChips` is genuinely identical; Orders needs *multi-select* value fields where Shipments has single-value ones, and one date-range field where Shipments renders a single+range pair. Refactoring the guts of a 62KB view with a 49KB test suite to share ~25 lines is churn with real regression risk. Orders got its own controls; the CSS is shared by **comma-extending** the existing `.shipments-filters__*` selectors, so there is no duplicated styling and no Shipments change. Revisit if a third domain needs a filter panel.
5. **`components/orders/OrdersFiltersView.jsx`** — `GlobalSearchPanel` shell + the active tab's fields + Apply/Clear footer. Lean per decision 2.
6. **Wire it** — new `components/global-search/OrdersGlobalSearch.jsx` is passed as `AppShell searchSlot`; its FilterButton toggles the panel (Escape / outside-click / X / Apply dismiss it, and it self-closes on a tab change). `OrdersRoute` holds `filters` state, folds into the existing `listRequest` `useMemo`, resets pagination on apply, and keeps **per-tab** filter state separate (each tab's set is disjoint — carrying values over would apply invisible filters). `OrdersToolbar`'s Filters button is a trigger only (`data-filters-trigger` exempts it from the panel's outside-click dismissal, so it can close what it opened).
7. **Orders adapter `getAttributeValues(dataKey, q)`** — distinct-value suggestions over `orders.json` for the search+multi-select fields; `null` in live mode so the ComboBox degrades to a plain typable field (S107 addendum precedent).

**Tests shipped:** `toRequest.test.js` (24) · `orderService.filters.test.ts` (10, incl. blank-value non-match, the 3 comparator ops, and the triple-vs-cross-product pair) · `OrdersFiltersView.test.jsx` (8, per-tab field sets + draft/apply/clear + inline validation) · `api/_lib/orders.test.mjs` (+5, live SQL builder incl. an operator-injection guard). Repo suite 117 files / 1481 tests green; node API tests 127 green; build green.

**Step 8 (added during implementation, not in the original plan): the live SQL builder.**
`api/_lib/orders.mjs` builds its WHERE clause from `ARRAY_FILTERS` / `DATE_FILTERS` **whitelist maps** — an unlisted filter key is silently dropped. Because `.env.local` sets `VITE_API_MODE=live`, the local app runs against the deployed Vercel function, so the mock service never executes and the new filters did nothing despite passing every mock test. The builder now carries the 7 new keys, a whitelisted `ERROR_COUNT_OPS` map, and row-wise `(city, state, country) IN (...)` for the triples. **This does not take effect locally** — `/api` proxies to the deployed function, so it ships on the next production deploy (not run; requires explicit permission).

## Deferred (named, not forgotten)

- `Show Advanced Filters` section (decision 3).
- Orders in the navbar GlobalSearch: criteria matcher, chip layer, free-text keys, progression vocabulary (decision 1, phase 2 — reuses step 1's registry).
- Saved / shared Orders filters (decision 2).
- Origin-triple contract fix, pending Ramesh.
