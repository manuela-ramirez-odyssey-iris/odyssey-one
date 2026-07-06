# S79 Shipments Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the ShipmentsBar Orders tab to mirror Order Creation visuals (SubAccordion sections per Figma 1210:36974), plus 8 Shipments-page fixes: up-lg shadow, tab arrangement panel, sidebar-shift glitch, radio removal, GlobalSearch as table search, Tooltip migration, sort icon button, header-icon polish.

**Architecture:** All app-level consumer work (no new library components; new app-local components allowed per normalization policy). `@odyssey/ui` is consumed, not extended — except one new token (`--shadow-up-lg`) and the ShipmentsBar CSS shadow swap, which triggers the DSM demotion rule for ShipmentsBar in BOTH DSMs. Figma-first: the `shadow/up-lg` effect style is created in Figma in the same wave the code token lands.

**Tech Stack:** React 18 + Vite, TanStack table, `@odyssey/ui`, tokens in `packages/tokens/tokens.css`, vitest (225 tests), Playwright visual harness at `/tmp/s79-visual-pass/`.

**Execution style (user-directed):** Ponytail ladder active for every implementer (reuse > stdlib > native > installed dep > one line > minimum). Never cut: a11y, error handling, trust-boundary validation. Subagents: Sonnet for mechanical scoped work, Fable for design-critical/integration work. User unavailable — decisions logged, not asked.

**Source docs:**
- Figma wireframe: file `x38TOJGsNryYl3LsKhCtSc` frame `1210:36974` ("3 Shipments - Orders Tab"); ShipmentsBar instance `1210:38232`.
- Mock: `vault/00-inbox/OrdersTab.png` (export of the same frame — no conflicts).
- Design intake + code recon reports: embedded in the task briefs below.

**Autonomous decisions (review later):**
1. Product Information section ships AS DESIGNED: title "Product Information - 🚧 Under Construction", body at opacity .25, non-interactive (incl. static US/Metric toggle visual). Efrain flag: confirm ship-state.
2. Wireframe's raw values are normalized to nearest tokens in code (values 14px → `--font-size-sm`; Cell paddings stay Cell defaults). Figma mis-bindings (gap←Radius/2xl etc.) are NOT replicated: gap 16 → `--spacing-4`, pb 180 → a plain scroll-headroom padding.
3. Wireframe SubAccordion card shadow `0 1px 1px rgba(0,0,0,.05)` ≈ `--shadow-sm` — use `--shadow-sm` (flag drift to Efrain).
4. Consignor/Consignee "details" sub-collapsibles = app-local light collapsible (button + SubAccordion's reveal pattern), NOT a new library component.
5. In-content order-number Tabs COEXIST with the strip's Order dropdown tab (both are in the wireframe).
6. Strip Orders-tab dropdown menu content unchanged (badge/route/weight rows).
7. Tab arrangement persists in route state only (same lifespan as column arrangement).
8. "Hide" the table searchbar = stop rendering (component file kept).
9. Radio column deleted outright (decorative spans; row click already selects).
10. ShipmentsBar demoted to NORMALIZING in both DSMs (shadow modification). Angular repo (`../odyssey-one-library-ui`): meta edit committed locally, **never pushed** (PR #10 in flight).

---

## Wave 1 (parallel)

### Task 1: Orders tab rebuild + up-lg shadow (Fable)

**Files:**
- Rewrite: `apps/odyssey-one/src/components/detail/OrderTab.jsx`
- Modify: `apps/odyssey-one/src/styles/components.css` (new `.order-pane*` block; `.shipments-bar--expanded` shadow → `var(--shadow-up-lg)`)
- Modify: `packages/tokens/tokens.css` (after line 269): `--shadow-up-lg: 0 -5px 15px rgba(0, 0, 0, 0.2);`
- Modify: `apps/odyssey-one/src/components/detail/BottomBar.jsx` (pass whatever extra detail slices OrderTab needs: instructions, products, references)
- Modify: `packages/ui/src/ShipmentsBar.demo.jsx` meta → demotion (`normalizing: true`, clear `approved`/`ported`; `version` stays for history, add note)
- Modify: `playground/normalization-tracker.md` ShipmentsBar row → NORMALIZING (shadow up-lg modification, S79)

**Spec (from Figma intake):**
- Pane canvas = the bar's `--deep-sea-neutral-100`; content column max-width 1106 centered-left, top padding `--spacing-4`, gap `--spacing-3`, generous bottom scroll headroom.
- Row 1: order-number underline `Tab`s (from `@odyssey/ui`), one per order on the shipment, active = selected order; wire to the SAME `selectedOrderIndex` state the strip dropdown drives (single source of truth in BottomBar).
- Row 2: `ButtonLink` "Expand All" (chevrons-up-down 16) → toggles all four SubAccordions expanded/collapsed (flips label to "Collapse All" when all open).
- Rows 3–6: four `SubAccordion`s (controlled `expanded`), white cards `--radius-2xl`, `--shadow-sm`, paddings are SubAccordion defaults (16/24/20):
  1. **General Information**: sub-blocks General (4 field columns w-220: Owning Organization, Freight Term, Ship Direction, Consolidatable) · Requested Transportation (Equipment, Equipment Reference Number, Customer Required Carrier) · References (Cell-style 2-col table: Reference Type / Reference Value, link-blue values) · Instructions (#, Instruction Description rows).
  2. **Pickup and Delivery**: two 50% columns Consignor/Consignee, each with a light collapsible "…details" sub-header then paired label/value fields (ID, Org Name/Long Name, Address 1/2, City, State/Postal Code, Country, Contact Name, Phone/Email); then **Planning Date/Time** block (Late Pickup Date and Time).
  3. **Product Information - 🚧 Under Construction**: body opacity .25 non-interactive — Product Details field rows (Number of Products, Total Product Weight, Total Volume, Hazmat, Earliest/Last Pickup) + Product List (US/Metric static segmented visual, "N products added", 6-col table: Product ID (link), Description, Gross Weight, Volume, Ship Class, Shipping Class ID).
  4. **Special Services (Optional)**: two Cell columns Service Category | Description, values as gray `Badge`s.
- Field atom: label `--font-size-xs` medium `--text-tertiary` over value `--font-size-sm` medium `--text-primary`, 4px gap. Reuse/adapt the existing `Field` in OrderTab.
- Typography: section sub-headings 16/24 semibold `--text-primary`.
- **Data mapping:** map from existing shipment detail data (`data` prop + BottomBar's detail slices — instructions tab data, products tab data, routing/references). Any wireframe field with no data equivalent renders `--` (existing convention). Do NOT touch the data generator.
- **Shadow:** add the token; `.shipments-bar--expanded { box-shadow: var(--shadow-up-lg); }` (components.css:4454).
- Old 4-column grid layout is fully REPLACED.

**Verify:** `npm run build:odyssey-one` green; app tests green; screenshot the pane via the Playwright harness.

### Task 2: Table cleanup batch (Sonnet)

**Files:**
- Modify: `apps/odyssey-one/src/components/shipments/ShipmentTable.jsx`
- Modify: `apps/odyssey-one/src/components/shipments/TableControls.jsx`

**Spec:**
1. **Remove radio column**: delete `RadioDot` (lines ~129–139) and its column (~309–319). Row click keeps selecting. Remove leftover select-column meta/width CSS if any.
2. **Sort → icon button**: replace the hand-rolled 32px button (TableControls ~174–187) with `<Button variant="icon" size="sm" icon={<ArrowUpDown …/>} aria-label="Sort" />` (import from `@odyssey/ui`). Keep `title` off — tooltip comes in Task 5.
3. **Column-arrangement header icon**: replace the bare styled `Columns3Cog` header button (ShipmentTable ~324–337) with `Button variant="icon" size="sm"` so it gets proper color + hover/focus states.
4. **Row actions icon**: `Zap` → `EllipsisVertical` (lucide) in the ActionMenu (~340–345); drop the Zap import.
5. **Hide table searchbar**: stop rendering the search box + saved-search bookmark in TableControls (keep the file/exports; keep item counter + sort + export button row). Remove now-dead search props from the TableControls call site only if trivially safe — Task 6 rewires search.

**Verify:** build green; row select still works by clicking a row; header/actions icons show hover states.

### Task 3: Sidebar-shift glitch — root cause + fix (Fable)

**Files:** TBD by diagnosis — candidates: `apps/odyssey-one/src/components/layout/AppShell.jsx`, `apps/odyssey-one/src/styles/components.css`, `apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx`.

**Symptom:** selecting a shipment row makes the sidebar disappear and shifts all content left.

**Spec:** systematic-debugging discipline — REPRODUCE first with the Playwright harness (`/tmp/s79-visual-pass/`, dev server port noted at runtime), screenshot before/after row select, inspect the DOM (is `<Sidebar>` unmounted — check AppShell's `!isEditMode &&` conditional — or is it a scrollbar-gutter layout shift from the fixed-position bar/scroll lock?). Fix the ROOT CAUSE (one guard/CSS rule where all paths route through), not the symptom. `scrollbar-gutter: stable` on the main scroller is the candidate if it's scrollbar vanish; a state leak if it's `isEditMode`.

**Verify:** Playwright: select row → sidebar still present, zero horizontal shift of the content container (compare boundingBox x before/after).

### Task 4: Figma sync — shadow/up-lg (Sonnet, use_figma; MUST invoke figma:figma-use skill first)

**Targets (Figma):**
- Design System file: ShipmentsBar component set `4120:4623` (Expanded variant `4106:1765`).
- Wireframe file `x38TOJGsNryYl3LsKhCtSc`: bar instance `1210:38232` currently carries raw `0 -5px 15px rgba(0,0,0,0.2)`.

**Spec:** create effect style `shadow/up-lg` = 0 / −5 / 15 / 0 rgba(0,0,0,0.2) in the Design System file (next to `shadow/sm`); apply to the ShipmentsBar master's Expanded variant. In the wireframe file, note (don't restyle the whole mock): rebind the bar instance's effect to the style if trivially possible; otherwise leave and flag. Do NOT publish the library. Report every node touched.

**Verify:** get_metadata on the Expanded variant shows the bound effect style.

## Wave 2 (parallel, after Wave 1 lands)

### Task 5: Tooltip migration (Sonnet)

**Files:**
- Modify: `apps/odyssey-one/src/components/shipments/ShipmentTable.jsx` (OrdersTooltip ~39–88, TruncatedText ~90–125, DarkTooltip sites ~200+)
- Modify: `apps/odyssey-one/src/components/shipments/TableControls.jsx` (Export button tooltip)
- Delete: `apps/odyssey-one/src/components/ui/DarkTooltip.jsx` (after all sites migrated)
- Maybe create: one thin app-local hover-trigger wrapper (reuse `useAnchoredPortal` from @odyssey/ui if exported, else the app-local copy)

**Spec:** the normalized `Tooltip` (packages/ui) is the CARD (badgeVariant/label/status/groups). Build ONE small hover/focus trigger wrapper (ponytail: reuse `useAnchoredPortal`; no new library component) and migrate every site: tender-status, pickup-date (time badge + timestamp), delivery-date, orders-hover (order badges → groups content), truncated-text (plain content group), Export button (plain content). Keyboard-accessible (focus shows, Escape hides) — a11y never cut. Retire DarkTooltip fully.

**Verify:** build green; hover screenshots of date + status + export tooltips via harness.

### Task 6: Tab arrangement panel + GlobalSearch wiring (Fable — single owner of ShipmentsRoute)

**Files:**
- Create: `apps/odyssey-one/src/components/detail/TabArrangementPanel.jsx`
- Modify: `apps/odyssey-one/src/routes/shipments/ShipmentsRoute.jsx`
- Modify: `apps/odyssey-one/src/components/detail/BottomBar.jsx`
- Modify: app-local ShipmentsGlobalSearch component (navbar searchSlot)

**Spec A — tab arrangement:** mirror the ColumnPanel UX (`apps/odyssey-one/src/components/detail/ColumnPanel.jsx` is the pattern: RightPanel shell, Selected/Available sections, drag-reorder, Cancel/Save draft) but items = ShipmentsBar tabs `{key,label}` from BottomBar's TABS. Reuse ColumnPanel's internals where extraction is cheap (ponytail rung 2) — do not fork 485 lines blindly; extract the shared arrangement view if it drops total code. No presets requirement for tabs — presets only if they come free from reuse. Route state `tabOrder` (array of keys; hidden = absent) → BottomBar orders/filters TABS (Orders tab must remain visible — keep it pinned in Selected, non-removable). Wire `onTabArrangement` → open THIS panel (replacing the column-panel hack); only one right panel open at a time.

**Spec B — GlobalSearch as table search:** the navbar ShipmentsGlobalSearch drives the table: its committed query feeds the same debounced `searchTerm` that TableControls' box fed (ShipmentsRoute ~217–228 → `listParams.searchTerm`). Keep chips/saved-search behavior working as-is if already wired; minimum change that makes typing in the navbar search filter the table. Remove the now-dead table-search state/props left from Task 2.

**Verify:** build + tests green; Playwright: reorder tabs → strip order changes; hide a tab → gone from strip; type in navbar search → table filters.

## Wave 3 (main conversation)

### Task 7: Verification + docs + commit

- [ ] Full visual pass via Playwright harness (all 9 items), screenshots.
- [ ] `npm run build:odyssey-one` + full test suites.
- [ ] Angular DSM demotion: `../odyssey-one-library-ui` shipments-bar demo meta → NORMALIZING (local commit only, NO push).
- [ ] Tracker + decision-log entries (traceability: cite Figma node ids + this plan).
- [ ] Efrain-asks list append (Product Info ship-state, card-shadow drift, wireframe mis-bindings, raw hexes in the US/Metric toggle).
- [ ] Commit React repo (logical commits per wave), push main.
