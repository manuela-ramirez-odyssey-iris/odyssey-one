# Orders tabs as populations — "Created" replaces "All"

**Date:** 2026-09-05 · **Session:** S139 · **Decision:** ORD-24 (to be written on completion)
**Author:** Fable (spec) · **Implementer:** Sonnet subagent · **Status:** approved by user 2026-09-05

## Why

The three Orders tabs are three disjoint populations with three backend endpoints, not three status filters over one list:

| Tab | Story | Population |
|---|---|---|
| All → **Created** | LINX-10777 "Fetching Successfully Created Orders (Integrated & Manual)" | orders that completed creation, any lifecycle status incl. Hold / Cancelled / Planning Failed / Shipment Failed |
| Draft | LINX-11663 | manual orders saved, not submitted (`orderStatus = Draft`) |
| Validation Errors | LINX-11180 `/order/validation-error/list` | integrated orders rejected at intake by OIF data validation; carry a Draft Order Status (Ready / Complete / Purge) and an error count; **have not entered the lifecycle** |

Evidence: LINX-11663 "Submit → moves to All tab"; LINX-11659 "Ready → Ready for Planning → removed from this tab, appears in All"; LINX-10285 "applying filters to show/hide specific orders **in each of the tabs**".

Today's code: All = unfiltered (contains Drafts and rejects — wrong), VE = lifecycle `Planning Failed` / `Shipment Failed` (those are created orders — wrong), tab encoded as `orderStatuses` on the request (collides with the panel's Order Status field, patched by an intersection + `skipFetch` guard in ORD-23).

Filters were merged into one field set on every tab yesterday (ORD-23). **This spec does not change the field set.** It changes only how filters meet tabs: plain AND onto the tab's population.

## Rulings (user, 2026-09-05)

1. Tab **All** is renamed **Created** (key `created`). Stays the default tab (QA LINX-13571 pins "default-selected"; only the label moves). Rationale: the story's own word; strip reads Draft → Validation Errors → Created as the creation lifecycle; neutral about state (holds Cancelled, Hold, failures). Rejected: Valid, Success, Active, Submitted, Orders.
2. Tabs are populations sent on the request, applied server-side (mock + SQL). Panel filters AND on top. No client-side status intersection.
3. A filter on a field a population lacks yields **zero rows on that tab** (badge reads 0). Pending Ramesh — see Open Questions; this is the default until he rules otherwise.
4. Order Status vocabulary aligns to canon (domain-analysis §4): `Ready for Planning`, `Planned Load`, `Planning Failed`, `Planned Shipment`, `Shipment Failed`, `Hold`, `Cancelled`, `Draft`.
5. Neon reseed is **gated** — code + local JSON land now; the deployed DB is reseeded only on a separate explicit go.

## Design

### D1. Population discriminator on the request

`OrderListRequest` (`src/api/types/orderList.ts`) gains `tab?: 'created' | 'draft' | 'validation-errors'`. Both matchers apply it **before** `filters`:

| tab | predicate |
|---|---|
| `created` | `orderStatus != 'Draft' AND draftOrderStatus IS NULL` |
| `draft` | `orderStatus = 'Draft'` |
| `validation-errors` | `draftOrderStatus IS NOT NULL` |
| absent | no population restriction (Home widgets / counts helpers may rely on this) |

`draftOrderStatus` is the VE marker — the column already exists in the seed and Neon (`draft_order_status`), it is only ever set on VE rows, and it is the field LINX-11137 defines as the OIF validation state. **No new flag.** `VALIDATION_ERROR_STATUSES` is deleted; every reader switches to the `draftOrderStatus != null` test (`ordersColumns.jsx` `erroring`, `primaryRowAction`, `OrdersRoute`, `orderService.ts`, `api/_lib/orders.mjs`, `tools/generate.mjs`).

Tab counts (`getOrderTabCounts` mock, `buildTabCountsQuery` SQL) compute the three counts with the same three predicates over `filters` (no tab). Response key `all` → `created`. `Home.jsx` reads `orderCounts.created`; the widget id `orders-all` may stay (it is a widget id, not a tab key) — rename only if trivially safe.

### D2. Client

`OrdersRoute.jsx`:
- `MAIN_TABS`: `{ key: 'created', label: 'Created', countKey: 'created' }`, `draft`, `validation-errors`. Drop the `statuses` field entirely.
- Request memo: `tab: activeTab`, `filters: panelFilters (+ searchText, searchChips)`. Delete `tabStatuses`, `statusFilter`, `skipFetch`, the `useOrderList` `enabled` option added in ORD-23 (revert `useOrderList.ts` to its previous signature), the forced `totalCount = 0`, and the `skipFetch` branch in the empty-state render.
- `countFilters` unchanged (panel filters + search, no tab).
- `DEFAULT_SORT`, `EXPORT_SHAPES`, `TAB_COLUMNS` (`ordersColumns.jsx`), `OrdersExportModal.TAB_LABELS`, `OrdersTable` fallback: key `all` → `created`, label `All` → `Created`.
- Deep links: every `navigate('/orders', { state: { tab: 'all' } })` (Home widgets, Submit/Resolve success paths, anywhere else `grep -rn "tab: 'all'"` finds) → `'created'`. Add a one-line legacy map `all → created` where `location.state?.tab` is read, so a stale link still lands.
- Export filename uses the tab key → `orders-created-<date>.xlsx`.

### D3. Status vocabulary

Rename labels everywhere the old strings appear (`grep -rl "'Ready For Plan'\|'Load Planned'\|'Shipment Planned'" src api tools`):

| old | new |
|---|---|
| `Ready For Plan` | `Ready for Planning` |
| `Load Planned` | `Planned Load` |
| `Shipment Planned` | `Planned Shipment` |
| — | `Hold` (added; seed a small share of Created rows, 2–3%) |

Files known: `search/orders/registry.js` (`ORDER_STATUS_VALUES`, `ORDER_STATUS_VARIANT` — add `Hold: 'gray'`), `orderService.ts` (submit/resolve → `Ready for Planning`), `api/_lib/orders.mjs` (`ALLOWED_STATUS_UPDATES`, create default), `useSubmitDraftOrder.ts`, `CreateOrderForm.jsx`, `fixtures/orderListRow.sample.ts`, `MatchRow.demo.jsx`, `tools/generate.mjs`. The Created tab's Order Status filter offers the seven non-Draft labels; `Draft` stays in the catalog for chips but is not a Created-tab option (it is the Draft tab).

Live path: `CHIP_COLS` / any label→code map in `orders.mjs` must accept the new labels. Old labels stored in Neon are stale until the gated reseed — do not add fallback aliases; the reseed is the fix.

### D4. Seed (`tools/generate.mjs`, seed 42)

- VE rows: pick from **integrated** orders only; set `draftOrderStatus` (Ready / Complete / Purge) + `errorCount`; set `orderStatus: null`. Keep the current VE share roughly (today ~378 of 5,077 → keep within 5–8%).
- Rows that today are `Planning Failed` / `Shipment Failed` keep those statuses and become Created-tab rows (no `draftOrderStatus`).
- Add `Hold` per D3.
- Every reader of `orderStatus` must tolerate `null` for VE rows: status Badge (`ordersColumns.jsx`), search adapter row (`search/orders/adapter.js` — `data-*` status attrs), `orderSearchRow` (`progression.js` — `orderStatus: row.orderStatus ?? ''`), export shapes, Home widgets. The VE tab does not show a Status column, so the null is invisible there by design.
- `tools/seed.mjs` / `verify-seed.mjs` need no schema change (`draft_order_status` exists). Regenerate `src/data/orders.json`; **do not run the Neon seed.**
- `generate.test.mjs`: the VE assertion switches from status list to `draftOrderStatus != null && orderSource === 'INTEGRATED' && orderStatus === null`.

### D5. Search layer

- `progression.js` catalog: `order-status` values = the eight canon labels (`ORDER_STATUS_VALUES` incl. Draft). `progression.test.js` re-pins.
- `orderSearchRow.orderStatus` null-safe (D4).
- `chipParity.test.js`: enum label→code mapping for the renamed labels.
- Search preview rows for VE orders show no status badge (null) — acceptable; `MatchRow` must not crash on a missing status.

### D6. Docs (Fable writes these after the code lands)

- Decision log **ORD-24**: populations + Created rename; corrects ORD-18's premise (VE ≠ lifecycle failures) and supersedes ORD-23's intersection rule.
- `orders-search-progression.md` §2: "each tab applies its own population; filters AND on top".
- `domain-analysis.md` tab section; `research/jira-orders-table-columns` label-drift note.
- Story pack `docs/story-packs/orders-search-progression-2026-09-04.xlsx` Open Questions sheet: add the three items below + the rename notice.

## Tests to pin

- Mock + SQL: each `tab` predicate; a `Planning Failed` row is in Created, not VE; a VE row is in neither Created nor Draft; absent `tab` = no restriction.
- Counts: three keys `created / draft / validationErrors`, criteria-aware, same predicates.
- Filters × tab: Order Status = `Planned Load` on Draft tab → 0 rows and badge 0 (no client guard involved); Customer filter narrows all three badges.
- Route: default tab `created`; legacy `state.tab = 'all'` lands on Created; filters survive tab switch (kept from ORD-23).
- Vocabulary: no test or fixture contains the three old labels (grep assertion in `registry.test.js` is fine).
- Seed: VE rows integrated + null status; Hold present; totals within the stated shares.

## Out of scope

- Technical Errors tab (LINX-11181) — pending Ramesh.
- Neon reseed — gated, separate go.
- Panel field set — done in ORD-23.
- Live value-lookup endpoints.

## Open questions for Ramesh (carry to story pack)

1. Confirm Created = LINX-10777 population and Validation Errors = LINX-11180 population, so a Planning Failed order sits in Created.
2. A filter on a field a tab does not display: zero rows on that tab (implemented default) or ignored on that tab?
3. Is the Technical Errors tab in scope for the prototype strip?
4. **Notice, not question:** "All" is renamed "Created"; QA cases LINX-13571–13590 reference "All" by name.

## Subagent instructions

Sonnet. Do not commit, do not `git add`, do not run any Neon/seed script against a database. Regenerate local JSON only (`node tools/generate.mjs`). Run: `cd apps/odyssey-one && npx vitest run` (whole app), `node --test tools/generate.test.mjs api/_lib/orders.test.mjs`. Report files changed, test output verbatim, and every decision the spec left open. Where a header comment records the old model (All = unfiltered, VE = failure statuses, "two triggers", intersection), rewrite it to record ORD-24 with source "user ruling 2026-09-05".
