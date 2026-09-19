# Manual Consolidation — Consolidate Mode + Review screen (design)

**Session:** S154 · **Date:** 2026-09-19 · **Status:** approved in conversation, pending user review of this file
**Stories:** LINX-15762 (flows), LINX-15786 (workbench), LINX-15787 (review & apply), LINX-15893 (workbench UI), LINX-15896 (selection summary) — all Ready for Grooming, Ramesh Raman.
**Rulings that outrank the stories:** Dave Schultz + Adam Shingle call, 2026-09-17 (`Planning and Consolidation.vtt`); Ramesh walkthrough 2026-09-15 (`Consolidation.vtt`). Canon: `vault/10-domains/consolidation/consolidation.md`, CNS-01…06, DEC-156…164.
**VD:** Review screen — Figma `x38TOJGsNryYl3LsKhCtSc` node `2249:46444` ("1-Shipments", Manual Consolidation). The consolidate mode itself has no Figma; it is directed by the user in this session, reusing the Shipments screen.

## 1. What we are building

Manual consolidation as a **feature of the Shipments screen**, not a separate Consolidation area (user, 2026-09-19: *"we are building this on top of shipments like a shipments extra feature"*; Dave 2026-09-17 at 01:04:18 rejecting the separate-module model: *"it's not"*). This supersedes CNS-02's sidebar-area reading of the deck for the Oct MVP surface.

Two pieces this session:

1. **Consolidate mode** — a stage of the existing Shipments route where the planner selects direct shipments from the table they already know.
2. **Review screen** — `/shipments/consolidate/review`, the VD above, showing the proposed consolidation.

**Not this session:** Apply (creating the `C…` shipment, moving loads, soft-deleting the emptied directs — CNS-01/DEC-156 describe the eventual mechanics), stop re-sequencing, Ramesh's advanced filter bank, customer-profile utilization targets, the consolidation audit trail (Dave 01:03:30: shipments have one trail — there is no separate one to build).

## 2. Domain rules encoded

| Rule | Source |
|---|---|
| From-scratch consolidation picks **direct** shipments only (`shipmentType === 'Direct'`, `O…` identifier) | Dave 00:37:46, 00:40:19, 00:42:08 |
| A direct shipment with an **active tender** (`tenderStatus` `Sent` or `Accepted`) cannot be taken — cancel the tender first | Dave 00:08:17, 00:10:51, 00:15:38 |
| Exceptions are **irrelevant** to eligibility; Hold is fine | Dave 00:09:06, 00:52:43 |
| All selected shipments must share **one customer** | Ramesh 00:05:00; LINX-15762/15786 BR; Dave 00:33:09 |
| Two or more shipments make a consolidation | LINX-15786 Scenario 4 / BR III |
| Consolidation ID **is** the Odyssey Shipment Identifier (`C…`) — closes CNS-04 | Manuela + Adam + Dave, 2026-09-17 at 00:51:01–00:51:07 |
| Stop sequence: the system proposes an order, the planner re-sequences (later) | Dave 00:33:20, 00:35:06 |

**Provisional (user, 2026-09-19):** the eligibility gate above is *"your suggestion… we need to discuss this in the future"*. Ramesh's pool gates (Allow Optimization, OCM 97–101, `Shipment Status = Consolidation`) are backend pool membership and are **not** applied to the checkbox. Record as a decision with that flag.

## 3. Consolidate mode

### 3.1 Entering

`PageHeader` on `/shipments` gains a primary `Button` with the lucide `Boxes` icon, label **Consolidate**. Pressing it sets `consolidateMode = true` in `ShipmentsRoute`.

### 3.2 Chrome while in mode

| Element | Normal | Consolidate mode |
|---|---|---|
| Page title | "Shipments" | **"Shipments Consolidation"** |
| Header primary button | `Boxes` "Consolidate" | `Combine` **"{n} Shipments Selected"**, disabled while n < 2 |
| Header secondary button | — | **"Cancel"** slides in beside the primary (width+opacity transition, `--transition-panel` timing) |
| Sidebar | rail | slides left to zero width (`AppShell` prop `sidebarHidden`; width transition on the rail wrapper, `--transition-sidebar`) |
| Export (TableControls) | shown | hidden |
| Pills/widgets `ButtonToggle` (ShipmentsPanelTabs) | shown | hidden; pill mode forced |
| Table actions column (⋮ + column gear) | shown | hidden |
| Table checkbox column | — | shown, first column |
| Row click → ShipmentsBar | opens detail | **inert**; `selectedShipmentId` cleared on entry; BottomBar not rendered |
| Panel tabs, category pills, paging, sorting, column presets, Customers panel | as today | **unchanged** |
| Navbar GlobalSearch | full attribute set, placeholder "Search in Shipments" | consolidation attribute set (§3.5); placeholder "Search for {customer}" once a customer is locked (§3.4) |

Panel tabs stay because the mode overlays the list *as it is* (user). Selection persists across tab, page and search changes, so a direct in Routing Review and one in Monitoring can be combined in one pass (Dave 00:54:26).

### 3.3 Selection

- `ShipmentTable` gets `selectable` (boolean) and `selection` / `onSelectionChange` props. In selectable mode it renders a display column `select` (library `Checkbox`) pinned first, `enableMultiRowSelection: true`, and hides `action`.
- Selection state lives in `ShipmentsRoute` as a `Map<sellShipment, rowVM>` — the row snapshot rides with the id so the review renders without refetching and a row paged/filtered away stays selected.
- Header checkbox: selects/deselects every **eligible** row on the current page; indeterminate when some are selected.
- `consolidationEligibility(row, anchorCustomerId) → null | reason` — one pure function in `src/consolidation/eligibility.js`:
  1. `shipmentType !== 'Direct'` → "Consolidated shipments can't be combined from scratch"
  2. `tenderStatus ∈ {Sent, Accepted}` → "Tendered — cancel the tender first"
  3. `anchorCustomerId && row.customerId !== anchorCustomerId` → never reached in the UI once §3.4 scopes the list, kept for defence.
- Ineligible rows render a **disabled** checkbox; the reason is the checkbox's tooltip (`TooltipTrigger`, existing). Rows are never hidden by eligibility.

### 3.4 Customer lock

The first checked row's `customerId` becomes the **anchor customer** (user, 2026-09-19). While an anchor exists:

- The list is **scoped to that customer**: `listParams.customerIds = [anchorCustomerId]` and the three `useCategoryCounts` calls take the same scope, so the table and the pill counts agree. `dataId` on the Customers panel *is* the `customerId` stamped on rows (`CustomersContext.jsx:33`), so no mapping is needed. The Customers panel itself is not modified.
- A row appears directly under the `PageHeader`: label **"Selected Customer:"** + a blue `Badge` with the customer name (`customerName` from the anchor row).
- GlobalSearch placeholder becomes **"Search for {customerName}"**.

Clearing the last selected row releases the anchor: scope returns to the panel's `selectedDataIds`, the row disappears, the placeholder restores. The anchor is *derived* from the selection map (first inserted entry), not stored separately.

### 3.5 Search attribute set in mode

`ShipmentsGlobalSearch` gets an `attributeKeys` prop. When set, the adapter's suggestion groups are filtered to those keys before scoring (`search/shipments/adapter.js` reads `SHIPMENTS_PROGRESSION` / `SHIPMENTS_ATTRIBUTES`; the filter is applied at the adapter factory, not by editing `progression.js`, so the Cognizant progression sheets are untouched).

`CONSOLIDATION_ATTRIBUTE_KEYS` = `customer-id`, `customer-name`, `origin`, `destination`, `pickup-date`, `delivery-date`, `equipment-code`, `mode`, `shipment-type`, `gross-weight`, `odyssey-shipment`, `order`.

Committed chips, saved filters and the results glimpse behave exactly as today.

### 3.6 Leaving

- **Cancel** (header): mode off, selection cleared, chrome restored, sidebar slides back.
- **Primary** ("{n} Shipments Selected", n ≥ 2): `navigate('/shipments/consolidate/review', { state: { rows: [...selection.values()] } })`.
- Navigating away by any other means (sidebar is hidden, but browser back / navbar) drops the mode with the route — no persistence beyond `location.state`.

## 4. Review screen — `/shipments/consolidate/review`

Built on the `OrderChangeReviewRoute` shell. Input: `location.state.rows` (row VMs). Arriving with no rows (refresh, pasted URL) renders an `EmptyState` "No consolidation to review" with a button back to Shipments.

### 4.1 Layout (VD 2249:46444)

- `AppShell` `titleMode={{ title: 'Manual Consolidation', onClose }}` — close returns to Shipments **in mode with the selection retained** (same as Modify Selection).
- Breadcrumb: **Shipments Consolidation** (→ Shipments in mode, selection retained) › **Review & Apply** (current).
- `PageHeader` title **"Review & Apply Manual Consolidation"**, secondary `Button` with `Pencil` icon, label **"Modify Selection"**.
- Two-column body: left card 307px, right column fills.

**Left card — "Proposed Stop Count & Sequence"**
- Two count badges: `{p} Pickup Stops` (blue), `{d} Delivery Stops` (green), each with the `MapPin` icon.
- **Planned Stops** — library `Timeline` with `StopBadge` labels `P1…Pn` then `D1…Dn`. Sequence: every selected row's pickup stop in selection order, then every delivery stop in selection order (Dave: system proposes, planner re-sequences later; V1 read-only). Each item: location (`origin` / `destination` string), a `Pickup`/`Delivery` `Badge`, and `Scheduled: {pickupDate | deliveryDate}`.

**Right column — "Consolidation Summary"**
- Info row: **Customer Name** (anchor row's `customerName`) · **Selected Shipments ({n})** as purple `Badge` chips of `odysseyShipmentIdentifier`.
- Strip (same cell style as `SummaryStrip`): **Total Weight** · **Weight Utilization** · **Total Volume** · **Volume Utilization** · **Hazmat**.
  - Total Weight = Σ `grossWeight` (row VM, LB).
  - Total Volume, Hazmat come from each shipment's detail (`useQueries` over `useShipmentDetail`'s query fn; n is small). Volume = Σ `totalVolume`; missing volume → `--` and Volume Utilization `--` (LINX-15787 BR 3–4). Hazmat = `Yes` if any detail `hazmat` is truthy, else `No` (`Badge` green/red).
  - Utilization = total / capacity of the anchor row's `equipmentCode`, from `src/consolidation/equipmentCapacity.js` — a constant table `{ code: { weightLb, volumeCuft } }` with a default, marked `// ponytail: placeholder capacities, replace with the equipment master when Dave gives the capacity rule`. No target gate (no Customer Profile).
- **Selected shipments to consolidate** — `SubAccordion` (open) with `{n} items` and a `DataTable` of the rows: Buy Shipment, Customer ID, Shipment Status, Order Count, Order #, Pickup Date. Cell renderers reused from `COLUMN_CONFIG` (`ShipmentTable`). Not selectable, no actions.

**Footer** — `StepperButtonsFooter`: cancel **"Cancel and Modify Selection"**, primary **"Apply Consolidation"**, `showSave=false`.

### 4.2 Actions

| Action | Behaviour |
|---|---|
| Modify Selection / breadcrumb / navbar close | `navigate('/shipments', { state: { consolidate: { rows } } })` → `ShipmentsRoute` re-enters mode with the selection (and therefore the customer lock) restored. LINX-15786 Scenario 5. |
| Cancel and Modify Selection | Confirm dialog (LINX-15787 copy): *"Are you sure you want to cancel the proposed consolidation? All the selected shipments will be removed from the proposed consolidation."* **Yes, Cancel** / **No**. Yes → `navigate('/shipments')`, mode off, nothing retained. |
| Apply Consolidation | Confirm dialog: *"Are you sure you want to apply this consolidation?"* **Yes** / **No**. **Yes is a stub this session** — closes the dialog and stays on the page. No shipment is created. |

## 5. Code shape

| File | Change |
|---|---|
| `src/routes/shipments/ShipmentsRoute.jsx` | `consolidateMode`, `selection` Map, anchor derivation, chrome toggles, `location.state.consolidate` re-entry, header buttons, Selected Customer row |
| `src/components/shipments/ShipmentTable.jsx` | `selectable`, `selection`, `onSelectionChange`, `eligibility` props; `select` column; hide `action` |
| `src/components/shipments/TableControls.jsx` | `hideExport` prop |
| `src/components/shipments/ShipmentsPanelTabs.jsx` | `hideViewToggle` prop |
| `src/components/layout/AppShell.jsx` | `sidebarHidden` prop; rail wrapper with width transition |
| `src/components/global-search/ShipmentsGlobalSearch.jsx` | `attributeKeys`, `placeholder` props |
| `src/search/shipments/adapter.js` (or `index.js` factory) | attribute-key filter on suggestion groups |
| `src/consolidation/eligibility.js` (new) | `consolidationEligibility`, `CONSOLIDATION_ATTRIBUTE_KEYS` |
| `src/consolidation/equipmentCapacity.js` (new) | capacity table + `utilization()` |
| `src/consolidation/proposal.js` (new) | pure: rows + details → `{ customer, stops, totals, hazmat }` |
| `src/routes/shipments/ConsolidationReviewRoute.jsx` (new) + css | the review screen |
| `src/App.jsx` | route `/shipments/consolidate/review` before `/shipments/*` |
| `vault/10-domains/consolidation/decisions/decision-log.md` | CNS-07 (feature of Shipments, supersedes CNS-02 for MVP), CNS-08 (eligibility, provisional), CNS-09 (Consolidation ID = Odyssey Shipment Identifier, closes CNS-04), CNS-10 (customer lock scopes the list) |

Model tier: spec/plan/review in the main thread; implementation by Sonnet subagents per task (`feedback_model_tier_policy`).

## 6. Tests

- `eligibility.test.js` — the three reasons and the null case.
- `proposal.test.js` — stop sequence (pickups then deliveries, selection order), totals, `--` on missing volume, hazmat any-of, utilization against the table and default.
- `ShipmentsRoute` mode tests — entering hides Export/toggle/actions/BottomBar and shows checkbox column + title; primary disabled at n<2; selection survives a tab change; first check scopes `customerIds`, shows the Selected Customer row and changes the placeholder; unchecking releases all three; Cancel clears; `location.state.consolidate` re-enters with selection.
- `ShipmentTable` — disabled checkbox + tooltip on ineligible rows; header checkbox selects eligible rows only.
- `ConsolidationReviewRoute` — renders from state; empty state without it; Modify Selection navigates with rows; both confirm dialogs and their copy; Apply Yes is a no-op.
- `adapter` — suggestions restricted to `attributeKeys` when given, unchanged otherwise.
- Browser check on both runtimes before wrap (S150's lesson: the frozen-`useMemo`/state-handoff paths are not test-reachable).

## 7. Open questions carried forward

1. Eligibility gate — confirm with Dave (`Direct` + untendered; does a Declined tender really return a direct to eligibility?).
2. Equipment capacities — where does the real capacity per equipment code live?
3. Customer Profile utilization targets (Ramesh 00:02:21, LINX-15896) — not modelled; needed before any "good enough" signal.
4. Where the soft-deleted empty shells are viewed after Apply (Dave 00:06:32 — undecided on their side).
5. Whether the review's stop sequence gets re-sequencing on this screen or via Edit Stops after creation.
