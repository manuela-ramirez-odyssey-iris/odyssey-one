# S79b Shipments — Tab Panes Redesign + Fix Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the S79 Orders-tab batch feedback (centering, fake data, shadow direction, bar height model, search behavior, DataTable header gap + external paginator) and restyle ALL remaining ShipmentsBar tab panes to the redesign language (inbox images 4–10, layout guidance only).

**Architecture:** App-level restyle on top of existing pane data/logic. Library changes limited to: ShipmentsBar (height model + shadow clip + content padding — already NORMALIZING) and DataTable/Paginator (external footer + paginator restyle — triggers demotion in BOTH DSMs + Angular twin update). New visual patterns (KPI strip, timeline, avatar, copy-field…) are built as app-local styling and LISTED as normalization candidates — not added to `@odyssey/ui`.

**Tech Stack:** React 18 + Vite, TanStack table, `@odyssey/ui`, tokens, vitest, Playwright harness `/tmp/s79-visual-pass/`.

**Execution tiers (user-directed):** Fable-high = this plan + arbitration (main conversation). Fable = low-level design decisions (bar shell, DataTable diagnosis, search UX). Sonnet = spec execution (orders data, all tab panes, Angular twin). Ponytail ladder mandatory for every executor. User unavailable — decide, log, don't ask.

**Sources:** intake report (12 inbox images, pixel-measured), code recon, Orders-domain canon report — all embedded in task briefs. Design mocks: `vault/00-inbox/*.png` (archive to `vault-sources/10-domains/shipments/2026-07-06-tab-panes/` at wrap).

---

## Locked decisions (Fable-high — review later)

1. **Content column tiers** (pixel-measured, all centered): WIDE `max-width:1280px`, MEDIUM `1106px`, NARROW `760px`. Shared utilities `.pane-canvas`, `.pane-col`, `.pane-col--wide|--medium|--narrow`, `.pane-card` (white, radius-2xl, shadow-sm, 16/24/20 padding) — added ONCE by the orchestrator before parallel work. Tier per tab: Product/Tender/Documents=WIDE · Orders/Stops/Instructions=MEDIUM · Cost/Notes=NARROW.
2. **Bar height model**: `expanded` stays boolean; expanded height = `auto` (content-driven), capped by `max-height: calc(100dvh - var(--bottombar-top-clearance))` with new token `--bottombar-top-clearance: 146px` (bar top never rises above y146 — page title row stays visible per image 3). Content scrolls internally when capped. Partial/full concept retired. Height transition: `interpolate-size: allow-keywords` where supported; acceptable to fall back to non-animated height on other browsers (prototype).
3. **Shadow up-only**: token unchanged; `.shipments-bar--expanded` gets `clip-path: inset(-40px 0 0 0)` so blur never paints over the sidebar/side panels. Code-only; noted in DSM demo.
4. **Bar content slot**: `.shipments-bar__content` padding → 0 (panes own their canvas). Every pane renders `.pane-canvas > .pane-col--{tier}`; full-width KPI strips sit outside `.pane-col`.
5. **Search**: revert S79's live `searchTerm` feed. Typing (debounced) → results panel opens with top-12 `MatchRow` glimpse (query-based, chips optional). `Show all N results` (GlobalSearchPanel primary) → commits query to `listParams.searchTerm` + closes panel. Match-row click → `setSelectedShipmentId(buyShipmentId)` (bar opens with details regardless of table visibility) + best-effort page-jump/scroll when the row exists in current table data.
6. **DataTable/Paginator**: footer moves OUTSIDE the bordered card (sibling below, on canvas). Paginator restyle per image 1: left `Showing X to Y of Z results`; right `Rows per page [n ▾]` + bordered segmented pager `[‹][1][2][3][…][N][›]`. React + Angular; both components DEMOTED to NORMALIZING in both DSMs. Figma DataTable/Paginator master sync = flagged Efrain ask (mock is the design source).
7. **Bar strip inconsistency in mocks 4–10** (static id, no arrows/dropdown): mocks are simplified captures — the implemented strip (arrows + Order dropdown tab) stays.
8. **Tab panes**: restyle existing panes' layout to the mocks; existing data/logic/modal mechanics stay (mock content quirks explicitly ignored: "Harmat", cloned stop 2, Diff=AR, Fuel-in-weight cells, count mismatches). History + Tender History untouched (no mocks; Jana: deprioritized).
9. **New-component candidates**: LIST ONLY (build app-local): KpiStatStrip, StopTimeline/TimelineStopItem, CopyValueField (copy buttons NOT built this pass), Avatar (initials chip — build minimal app-local), NoteItem/NoteComposer, SummaryTotalsPanel, FieldGrid/DescriptionList, DataTable extensions (row grouping / frozen-left group + drag divider), Paginator-external variant (being built as the restyle).
10. **Cost Allocation restructure**: the mock's single expandable Compare AP/AR table (Order | AP | AR | Diff + TOTAL row) REPLACES the two stacked AP/AR tables; KPI strip carries BASE/DISCOUNT(red)/FUEL/ACCESSORIALS/AP TOTAL/AR TOTAL/MARGIN(green). CompareModal retires (its layout is now the pane).
11. **Orders fake data**: extend `generate.mjs` + `SellShipmentOut` order objects + mapper per the canon report's field table (§5): owningOrganization, consolidatable, equipmentCode, equipmentReferenceNumber, customerRequiredCarrier, pickupNumber, address2, destination contact trio, specialServices[{code,desc}] (pool: LFT/PALEXG/PJC + INSD/APPT), surface instructionList through the mapper. Regenerate JSONs (seed 42). Mapper tests updated.
12. **CSS parallelism**: each Wave-2 executor owns exactly `apps/odyssey-one/src/components/detail/<Pane>.jsx` + `apps/odyssey-one/src/styles/panes/<pane>.css` (pre-created empty, pre-imported). No one else touches components.css regions they don't own.

---

## Wave 0 (orchestrator setup — before dispatch)

- [x] Plan written.
- [ ] Create empty `apps/odyssey-one/src/styles/panes/{stops,product,tender,cost,instructions,documents,notes}.css`; add `@import` lines to `apps/odyssey-one/src/index.css`.
- [ ] Add shared utilities to components.css (single writer): `.pane-canvas` (DSN-100, full width, min-height 100%), `.pane-col` (+ tier modifiers, `margin-inline:auto`, padding-block spacing-4/8, block gap spacing-3), `.pane-card` (white card: radius-2xl, shadow-sm, padding 16/24/20, `.pane-card__header` title row with heading-lg-semibold + right action slot).
- [ ] Add token `--bottombar-top-clearance: 146px` to tokens.css.

## Wave 1 (parallel)

### W1-A: ShipmentsBar shell — height model + shadow clip + content padding (Fable)
Files: `packages/ui/src/ShipmentsBar.jsx` (~line 113 inline height), `components.css` `.shipments-bar*` block only (~4440–4610), `apps/.../demos/ShipmentsBar.demo.jsx` (notes/tokens rows).
Spec: decisions 2–4. Collapsed = 48px strip unchanged. Expanded: height auto, max-height cap via the new token, content scrolls. Shadow clip-path. `.shipments-bar__content` padding 0. Verify with Playwright: Orders tab opens to content height capped at y146; a short-content tab (e.g. Notes) opens shorter; shadow does not paint left of the bar (screenshot vs sidebar).

### W1-B: Orders tab — centering + real fake data (Sonnet)
Files: `apps/odyssey-one/tools/generate.mjs`, `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.*` (+ its test), `apps/odyssey-one/src/components/detail/OrderTab.jsx`, `components.css` `.order-pane*` block only.
Spec: decision 11 field table (canon report §5 verbatim — pools included there); OrderTab swaps its hardcoded `value=""` fields to the new VM fields; References gains pickupNumber row; Special Services renders the real `[{code,desc}]` pairs as Badge+text (populated-only convention stays). Centering: root becomes `.pane-canvas > .pane-col.pane-col--medium` (drop the old left-aligned max-width), Expand All right-aligned to the column. Regenerate the 1200 JSONs (`node tools/generate.mjs`, seed 42). Tests: mapper suite updated for new fields, all green.

### W1-C: DataTable header gap + external paginator, React (Fable)
Files: `packages/ui/src/DataTable.jsx` (footer render ~line 237), `packages/ui/src/Paginator.jsx`, `components.css` DataTable/Paginator regions only (~176–235, ~799), `apps/.../ShipmentTable.jsx` (footer prop + bottom clearance ~line 377), React DSM demo metas for DataTable + Paginator (demote: `normalizing: true`, add note), `playground/normalization-tracker.md` rows.
Spec: decision 6. FIRST reproduce the header gap with Playwright (scroll the table; screenshot the transparent strip above the sticky head; identify root cause in the sticky chain — head outer bg `--bg-secondary` vs inner `--bg-primary` radius strip, stickyTop offset) and fix at the cause. Then: `footer` renders as a sibling BELOW the bordered card (`.odyssey-data-table__footer` leaves the card; wrapper stays one component — card + footer inside the component root, canvas-transparent footer). Paginator restyle per image 1 (summary text left; Rows-per-page select + bordered segmented pager right; current page filled dark). Keep the TanStack API surface (`table` prop) unchanged. Verify: Playwright screenshots — no gap while scrolled; paginator outside the border matching the mock's geometry.

### W1-D: GlobalSearch behavior rework (Fable)
Files: `apps/odyssey-one/src/components/global-search/ShipmentsGlobalSearch.jsx` (+ its hook/adapter as needed), `apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx`.
Spec: decision 5. Remove the `onQueryChange` live feed. Results panel opens on non-empty debounced query with top-12 matches (`GlobalSearchResults` maxRows 12; adapter already returns 15+total — query-based search, chips still supported). Panel primary `Show all N results` → commit to `searchTerm` pipeline + close. `onMatchClick` → select shipment (id mapping per adapter: match id = buyShipment; selection needs the row id used by `setSelectedShipmentId`) + best-effort page-jump/scroll when present in current table data. Escape/blur behavior unchanged. Verify with Playwright: type → panel with ≤12 rows, table NOT filtered; click Show results → table filters; click a match → bar opens with that shipment.

## Wave 2 (parallel, after Wave 1 lands — all Sonnet, one pane each)

Common brief for every pane executor: own ONLY your pane JSX + your `styles/panes/<pane>.css`. Use `.pane-canvas`/`.pane-col--{tier}`/`.pane-card` utilities + `@odyssey/ui` components. Existing data props/logic/modals stay; mock = LAYOUT ONLY (ignore mock content quirks). All values through tokens. A11y never cut. New-visual-pattern needs → app-local markup + report as normalization candidate. Verify: build + tests + Playwright screenshot of your pane (own dev server).

- **W2-1 Stops** (`StopsTab.jsx` + `panes/stops.css`): full-width KPI strip (DISTANCE/GROSS WEIGHT/VOLUME/ACCEPTED CARRIER/SEED EQUIPMENT/UTILIZATION — label-over-value, vertical dividers, hairline bottom) above a MEDIUM `.pane-card` "All Stops"; vertical timeline: dark-green node badge (P1/D2 + check), connector, "stop N" + Pickup/Delivery Badge, 3-col label/value grid per stop, hairlines between stops. NO copy buttons (candidate listed). Mock clipped below stop 2 — extrapolate the established rhythm for stops ≥3.
- **W2-2 Product** (`ProductTab.jsx` + `panes/product.css`): WIDE `.pane-card` "Product" + Expand All ButtonLink (header right); keep the existing grouped 19-col table (collapsible order groups, sticky-left) inside the card, horizontal scroll within.
- **W2-3 Tender** (`RoutingGuideTab.jsx` + `panes/tender.css` — SURGICAL, 1592 LOC): sub-tab row becomes underline `Tab`s on canvas + right-aligned primary "+ Add Quote" (opens the existing QuoteModal in add mode); table sits in a WIDE bordered container directly on canvas (no titled card). Split-table mechanics, ActionDropdown, modals untouched. Layout only.
- **W2-4 Cost Allocation** (`CostAllocationTab.jsx` + `panes/cost.css`): decision 10 — Planned/Completed as underline `Tab`s on canvas; full-width KPI strip (7 stats, DISCOUNT red, MARGIN green+pct); NARROW `.pane-card` "Compare AP/AR" + Expand All; single expandable table Order|AP (Carrier)|AR (Customer)|Diff (Diff = AR−AP, NOT the mock's cloned values), child charge rows striped, bold TOTAL row. CompareModal retired. Completed tab keeps the locked state.
- **W2-5 Instructions** (`InstructionsTab.jsx` + `panes/instructions.css`): MEDIUM `.pane-card` "Instructions"; per-order collapsible groups (chevron + orderId header) each a `#`|Instruction Description mini-table with hairline rows.
- **W2-6 Documents** (`DocumentsTab.jsx` + `panes/documents.css`): WIDE `.pane-card` "All Documents" + primary "+ Add Document" (existing upload modal); table → Checkbox col | File (link, opens existing preview) | Creation Time | File Size (KB) | Action (kebab ActionMenu with Download/Delete); centered empty state "No documents uploaded."
- **W2-7 Notes** (`NotesTab.jsx` + `panes/notes.css`): NARROW `.pane-card` "All Notes"; note items: initials Avatar chip (app-local) + author + timestamp + body, hover/focus reveals edit+delete icon Buttons on own notes; hairlines between; composer at bottom: Avatar + TextArea (`maxLength 200`, showCount) + primary "Add Note" + remaining-limit helper text; inline edit swaps the item for prefilled TextArea + Save/Cancel (mock 10.1).
- **W2-8 Angular DataTable/Paginator twin** (Sonnet, repo `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one-library-ui`, branch `port/s76-search-batch`): mirror W1-C exactly (external footer + paginator restyle + header-gap fix if the twin shares it); demote DataTable + Paginator metas to NORMALIZING in the Angular DSM; specs green (`data-table`/`paginator` spec files exist); demo parity with the React demo. LOCAL COMMIT ONLY — NEVER push.

## Wave 3 (orchestrator)

- [ ] Combined build + full test suites (React; Angular via W2-8 report).
- [ ] Full Playwright pass: all 8 panes, bar heights per tab, shadow clip, search flow, paginator/header.
- [ ] Decision-log entries (DEC-48+), tracker updates, new-component candidates list recorded, Efrain asks (Figma master sync for Paginator/DataTable; bar strip mock inconsistency; Stops mock clipped).
- [ ] Archive inbox images → `vault-sources/10-domains/shipments/2026-07-06-tab-panes/`.
- [ ] Commit React + push main. Angular stays local-only.
