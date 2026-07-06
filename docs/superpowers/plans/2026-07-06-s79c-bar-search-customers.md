# S79c — Bar behavior, unified search, customer scoping, sticky toolbar

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** Fix the ShipmentsBar interaction model (opening height, animation, tab-switch glitch, close semantics), make global search the real table-search engine (chips+text committed as one criteria set, search-aware counts, zero-count subtab hiding), introduce customer-list scoping as the first-order data filter, and clamp the table toolbar on scroll.

**Tiers:** Fable-high = plan/arbitration (main). Fable = W1-A bar, W1-B search, W2-C customers. Sonnet = W2-D sticky toolbar. Ponytail for all. User unavailable — decide + log.

**Recon:** embedded below per task (file:line from the 2026-07-06 recon).

---

## Locked decisions

1. **Max opening**: `--bottombar-top-clearance` 146px → **104px** (bar top reaches mid page-title row — "a bit more" than the tab row line).
2. **Animation**: bar height/expansion uses the existing non-linear token `--transition-drawer` (300ms cubic-bezier(0.16,1,0.3,1)); keep `interpolate-size: allow-keywords`; reduced-motion kill switch stays.
3. **Tab-switch glitch**: root cause = React.lazy + Suspense fallback collapsing the auto height (BottomBar.jsx:232-236). Fix = `useTransition` for tab changes (old pane stays mounted while the next lazy chunk loads; no fallback flash, no height collapse). Height difference between panes then changes in place (instant resize; animated only where interpolate-size applies). `// ponytail:` note the measured-height animation as the upgrade path.
4. **Close semantics**: the CollapseExpand PanelAction becomes CLOSE — collapses the bar AND deselects the row. BottomBar exposes `onClose`; ShipmentsRoute wires `setSelectedShipmentId(null)`. The collapsed-with-selection state disappears; the placeholder strip ("Select a Shipment") remains when nothing is selected. Icon: chevrons-down while open (closing gesture); strip shows chevrons-up (disabled when no selection, as today).
5. **Click outside closes**: document-level mousedown in BottomBar (active only while a shipment is selected). Excluded targets (do NOT close): the bar (`[data-bottombar]`), table rows (`tr` inside the shipments table — rows own selection toggling), right panels + their triggers, any body-portal popover/modal/tooltip (dropdowns, customers popover, search panel), the navbar. Everything else (page whitespace, panel tabs, paginator…) closes+deselects.
6. **SearchChipPanel row removed** from TableControls (TableControls.jsx:50-58) along with the route's `activeChipKey`/`searchAttributeKey` plumbing (ShipmentsRoute.jsx:104,113). gridService keeps `searchAttributeKey` support (harmless, tested).
7. **Unified search criteria** (the core): one shared matcher module used by BOTH the adapter and gridService.
   - Commit payload = `{ chips, text }` (chips-only commits work; empty text no longer clears criteria — explicit Clear all does).
   - `listParams.searchCriteria = { chips, text }`; gridService applies it with the shared matcher (same AND-chips + OR-fields semantics as the glimpse; adapter.js:123-207 is the reference implementation — extract, don't duplicate).
   - **Search-aware counts**: `getCategoryCounts(panel, criteria…)` filters before counting; `useCategoryCounts` keys on the criteria; panel-tab totals + category pills + the "N items" counter all reflect the committed criteria. The glimpse total (all panels) then visibly equals the sum across panel tabs.
   - FilterPanel filters/dates still AND on top. Existing gridService/adapter tests updated + new cases: chips-only commit, chips+text commit, cross-panel sum == glimpse total.
8. **Zero-count hiding while criteria active**: category pills/widgets with count 0 hide (All stays; 'All' count = panel total). Panel tabs with 0 hide too — **except PGI/PGR (always visible; demo)**. Hidden selected category → fall back to 'all'; hidden selected panel → first visible panel. No search → everything shows (today's behavior).
9. **Subtab always selected**: already impossible to deselect (ShipmentsPanelTabs.jsx:68,80 re-sets the same key); preserve the invariant through the new hiding fallbacks.
10. **Customer scoping** (first-order filter, before panels/search):
    - `CustomersContext` list = union: the 11 existing names (Kemira NA…IMCD — planner's book, no shipment data) + the 15 data-pool customers (data-pools.mjs:12-29), deduping USALCO (existing 'USALCO' entry becomes the data-backed `USALCO_SYS_01`). Data-backed entries carry `dataId` (customerId in shipment rows).
    - Assigned (favorited) = the existing 3 favorites + **ERCO Systems Inc** (explicit ask).
    - **Default selected = c1,c2,c3 (Kemira NA/EU, Geon — unchanged) + ERCO** (so the default view shows ERCO's shipments; selected customers with no data legitimately contribute 0 — that IS the feature).
    - gridService + adapter + counts all pre-filter rows to `customerId ∈ selected dataIds` (a selection with no data-backed customers → honest empty state). listParams gains `customerIds`; query keys include them. Home's existing consumption untouched.
    - CustomersModal: keep existing UX (search/favorite/delete); ensure selection toggling drives `selectedIds`; no redesign.
11. **Sticky toolbar**: TableControls root → `position: sticky; top: calc(-1*var(--spacing-8)); z-index: 4; background: var(--bg-secondary)` (scroller-content-edge compensation, same as DataTable's). With the chips row gone its height is fixed — DataTable's `stickyTop` moves down by exactly that height so header clamps beneath toolbar. Verify no seam/overlap at any scroll position.

## Waves

- **W1-A (Fable)** — decisions 1–5. Files: packages/ui/src/ShipmentsBar.jsx, apps/…/detail/BottomBar.jsx, `.shipments-bar` CSS block, packages/tokens/tokens.css (clearance), ShipmentsBar demo notes. DO NOT touch ShipmentsRoute (expose `onClose` prop; orchestrator wires it).
- **W1-B (Fable)** — decisions 6–9. Files: src/search/* (adapter, useGlobalSearch, shared matcher module NEW), components/global-search/ShipmentsGlobalSearch.jsx, api/services/gridService.ts (+test), api/queries/useCategoryCounts.ts, components/shipments/ShipmentsPanelTabs.jsx, components/shipments/TableControls.jsx, routes/shipments/ShipmentsRoute.jsx (B owns it), tests.
- **Orchestrator between waves**: wire BottomBar `onClose` in ShipmentsRoute; combined build/tests.
- **W2-C (Fable)** — decision 10. Files: contexts/CustomersContext.jsx, components/CustomersModal.jsx (+CustomerRow usage), gridService + adapter + useCategoryCounts (layered on W1-B), ShipmentsRoute listParams, tests.
- **W2-D (Sonnet)** — decision 11. Files: TableControls.jsx, ShipmentTable.jsx (stickyTop), minimal CSS.
- **W3 (orchestrator)**: full Playwright pass, decision-log DEC-56+, commit/push React.
