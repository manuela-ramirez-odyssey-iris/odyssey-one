# SHP-21: Tender Tab Design Spec

**Ticket:** SHP-21
**Date:** 2026-04-06
**Status:** Implemented — Session 7
**Component:** `src/components/detail/RoutingGuideTab.jsx` (~610 lines)
**Parent:** BottomBar detail panel (selected shipment view)

---

## 1. Overview

The Tender tab is the core decision point of the Odyssey Shipments workflow -- where users assign carriers to move freight. It lives inside the BottomBar detail panel and renders when a shipment is selected.

The initial implementation (Session 4) was rushed without a spec, resulting in visual inconsistencies (shrunk font sizes), unnecessary UI patterns (radio buttons, pre-selected rows), and fullscreen gating that hid critical functionality behind a layout toggle. This spec defines the intended design from scratch so the component can be rebuilt correctly.

The component renders identically in both the Exceptions and Monitoring panels. No code branching is needed -- the data naturally reflects different tender statuses per panel context.

---

## 2. User Stories

**US-1:** As a logistics planner, I want to see a compact summary of the shipment I'm tendering so I can confirm I'm acting on the correct shipment without leaving the tab.

**US-2:** As a logistics planner, I want to open a full-detail modal from the compact summary so I can review all shipment, order, and stop details when needed.

**US-3:** As a logistics planner, I want to tender, accept, decline, cancel, or re-tender carriers from a contextual 3-dot menu so that available actions always match the carrier's current status.

**US-4:** As a logistics planner, I want status badges to update in real-time when I take an action so I get immediate visual feedback.

**US-5:** As a logistics planner, I want the system to auto-tender the next carrier in rank order when I decline or cancel one so I can see sequential tendering behavior in the demo.

**US-6:** As a logistics planner, I want to switch between 5 sub-tabs to view different carrier data categories while locked columns remain visible across all tabs.

**US-7:** As a logistics planner, I want the full tender table and actions available in all bar states (collapsed, partial, fullscreen) so I'm never blocked by a layout toggle.

**US-8:** As a logistics planner, I want to add a spot quote when none of the routing guide carriers work, via a clearly placed "Add Quote" button at the table level.

---

## 3. Functional Requirements

### 3.1 Summary Header (`TenderSummary`)

| # | Requirement |
|---|-------------|
| FR-1 | Replace `CompactSummary` and `FullSummary` with a single `TenderSummary` component. |
| FR-2 | The compact view is always visible in all bar states (collapsed, partial, fullscreen). |
| FR-3 | Compact view displays: Buy Shipment ID, Sell Shipment ID, Mode, Weight, Pickup (company + location + date), Delivery (company + location + date). |
| FR-4 | Compact view contains a button that opens the full-detail modal. |
| FR-5 | Full-detail modal displays a 4-column layout: **Shipment** (IDs, mode, equipment, weight, volume, distance, package count, Instructions checkbox, Hazardous checkbox), **Order** (planning date type, pickup/delivery dates, order #, direct cost, pickup #), **Initial Pickup** (company, address, location, date/time), **Final Delivery** (company, address, location, date/time). |
| FR-6 | Full-detail modal contains a "Routing Query (QCP)" button and a "View Stops" button. These are informational/context actions, not tender actions. |

### 3.2 Routing Table

| # | Requirement |
|---|-------------|
| FR-7 | Table header cells: `font-size: 12px`, `padding: 10px 14px`. |
| FR-8 | Table body cells: `font-size: 14px`, `padding: 10px 14px`. |
| FR-9 | No radio buttons anywhere in the table. Remove entirely. |
| FR-10 | No default row selection on load. Remove pre-selection of Accepted carrier. |
| FR-11 | Table and all functionality are available in all bar states. Remove fullscreen gating. |

### 3.3 Row Highlighting

| # | Requirement |
|---|-------------|
| FR-12 | A row highlights when the user clicks its 3-dot menu icon. |
| FR-13 | Highlight persists after a tender action is taken on that row. |
| FR-14 | Highlight clears when clicking a different row's 3-dot menu. |
| FR-15 | Highlight clears when clicking outside all rows / 3-dot menus. |
| FR-16 | Clicking a highlighted row's area (outside the 3-dot) does NOT toggle the highlight. Only 3-dot interaction and click-away control it. |

### 3.4 Trailing Column (3-dot Menu)

| # | Requirement |
|---|-------------|
| FR-17 | The trailing column follows the same UX pattern as the main shipments table. |
| FR-18 | Header cell contains a column arrangement button (cog/settings icon). |
| FR-19 | Body cells contain a `MoreVertical` icon (lucide-react). |
| FR-20 | Clicking the 3-dot icon opens a dropdown anchored to that cell. |
| FR-21 | Dropdown contains two labeled groups with small-text group titles. |
| FR-22 | **"Tender Actions" group** -- options are contextual to the row's tender status (see FR-23 through FR-27). |
| FR-23 | Status `null` (never tendered): show "Tender". |
| FR-24 | Status `Sent`: show "Accept", "Decline", "Cancel". |
| FR-25 | Status `Accepted`: show "Cancel". |
| FR-26 | Status `Declined`: show "Re-Tender". |
| FR-27 | Status `Cancelled`: show "Re-Tender". |
| FR-28 | **"Rate Details" group** -- always present: "Show Rate Details" (QCA). |
| FR-29 | All action buttons in the dropdown use neutral/outlined style. No colored CTAs. Color language is reserved for status badges only. |

### 3.5 Tender Action Behavior

| # | Requirement |
|---|-------------|
| FR-30 | Clicking "Tender" sets the row's status badge to `Sent`. |
| FR-31 | Clicking "Accept" sets the row's status badge to `Accepted`. |
| FR-32 | Clicking "Decline" sets the row's status badge to `Declined`. |
| FR-33 | Clicking "Cancel" sets the row's status badge to `Cancelled`. |
| FR-34 | Clicking "Re-Tender" sets the row's status badge to `Sent`. |
| FR-35 | **Cascade simulation:** when declining or cancelling a carrier, the system auto-tenders the next un-tendered (`null` status) carrier in rank order by changing its badge to `Sent`. |
| FR-36 | If the highlighted row's status changes, the 3-dot dropdown (if re-opened) reflects the new status's available actions. |

### 3.6 Status Badges

| # | Requirement |
|---|-------------|
| FR-37 | Four badge states: `Sent` (blue), `Accepted` (green), `Declined` (yellow), `Cancelled` (grey/tertiary). |
| FR-38 | Null/never-tendered rows show no badge (empty cell or "--"). |
| FR-39 | Badge styles use CSS custom properties: `--badge-{color}-bg` and `--badge-{color}-text`. |

### 3.7 Sub-tabs

| # | Requirement |
|---|-------------|
| FR-40 | Five sub-tabs: "Routing Options", "Notify & Response Method", "View Volume Commitment", "Additional Info", "Others". |
| FR-41 | Switching tabs changes the non-locked columns displayed. |
| FR-42 | **Locked columns** (visible in all sub-tabs): Route Rank, Rank, SCAC, Carrier Name, Equipment, AP Cost, Tender Status, Pickup Date/Time, Delivery Date/Time. |

**Routing Options columns:** Transit Time, Distance, Notify Method, Notify Date, Response Method, Response Date, Response User, Carrier Quoted, Network Leverage.

**Notify & Response Method columns:** Pro #, Transporting Carrier, Equip #, Route Group.

**View Volume Commitment columns:** Commitment, UOM, Equip #, Open, Accept, Decline.

**Additional Info columns:** Carrier Pickup #, Carrier API Tender ID, Break Point, Rate Source, Distance Source, Description, Transit Time Source, Transit Time ID, Loadboard Expiry, RCP ID, LCE PK_ID.

**Others columns:** Modify User, Modify Date, Indirect Point, Round Trip, Customer Preferred, Order Equip, Contact Exped, Note.

### 3.8 Add Quote Button

| # | Requirement |
|---|-------------|
| FR-43 | "Add Quote" button is positioned at the top-right of the table section, trailing the sub-tab row. |
| FR-44 | It is a table-level action for spot bidding, not a row-level action. |
| FR-45 | It is NOT inside the 3-dot menu. |

---

## 4. Component Architecture

### Component Tree

```
BottomBar
  └── RoutingGuideTab (receives: data, shipmentDetails, shipment, isFullscreen)
        ├── TenderSummary (compact, always visible)
        │     └── TenderDetailModal (full detail, opens on button click)
        ├── SubTabBar (5 tabs + Add Quote button trailing)
        └── RoutingTable
              ├── TableHeader (locked cols + tab cols + trailing cog col)
              └── TableBody
                    └── TableRow (per carrier option)
                          ├── Locked cells
                          ├── Tab-specific cells
                          ├── StatusBadge
                          └── ThreeDotMenu
                                └── ActionDropdown
                                      ├── TenderActionsGroup (contextual)
                                      └── RateDetailsGroup (static)
```

### Props

| Component | Props | Source |
|-----------|-------|--------|
| `RoutingGuideTab` | `data` (routingData), `shipmentDetails`, `shipment`, `isFullscreen` | BottomBar |
| `TenderSummary` | `shipmentDetails`, `shipment` | RoutingGuideTab |
| `TenderDetailModal` | `isOpen`, `onClose`, `shipmentDetails`, `shipment` | TenderSummary |
| `RoutingTable` | `options` (carrier array), `activeTab`, `highlightedRowId`, `onRowAction`, `onHighlight` | RoutingGuideTab |
| `ActionDropdown` | `status`, `onAction`, `onClose` | ThreeDotMenu |
| `StatusBadge` | `status` | TableRow |

### State (lives in `RoutingGuideTab`)

| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `activeTab` | string | `'routing-options'` | Currently selected sub-tab |
| `highlightedRowId` | string or null | `null` | ID of the row whose 3-dot was clicked |
| `openMenuRowId` | string or null | `null` | ID of the row whose dropdown is open |
| `options` | array | from `data.options` | Mutable copy of carrier options (for badge updates) |
| `isDetailModalOpen` | boolean | `false` | Whether the full-detail modal is showing |

---

## 5. Data Generation Requirements

**Generator:** `tools/generate.mjs`
**Library:** `@faker-js/faker` with seed `42` for deterministic output
**Target:** Each object in the `routingData.options` array

All new fields are added to each carrier option object. Existing 27 fields remain unchanged.

### Routing Options tab (3 new fields)

| Field | Key | Type | Generation Rule |
|-------|-----|------|-----------------|
| Response User | `responseUser` | string or `null` | `faker.person.fullName()` if `wasTendered === true`, otherwise `null` |
| Carrier Quoted | `carrierQuoted` | string | Random pick: `"Yes"` or `"No"` |
| Network Leverage | `networkLeverage` | string | `faker.number.int({ min: 0, max: 35 }) + "%"` |

### Notify & Response tab (3 new fields)

| Field | Key | Type | Generation Rule |
|-------|-----|------|-----------------|
| Pro Number | `proNumber` | string or `null` | `"PRO-" + faker.string.numeric(8)` if carrier is Accepted, otherwise `null` |
| Transporting Carrier | `transportingCarrier` | string | 70% chance same as `carrierName`, 30% chance `faker.company.name()` |
| Equip Number | `equipNumber` | string | `"EQ-" + faker.string.alphanumeric(6).toUpperCase()` |

### Volume Commitment tab (6 new fields)

| Field | Key | Type | Generation Rule |
|-------|-----|------|-----------------|
| Commitment | `commitment` | number | `faker.number.int({ min: 1, max: 20 })` |
| UOM | `uom` | string | Random pick: `"Loads/Week"` or `"Loads/Month"` |
| VC Equip Number | `vcEquipNumber` | string | `"EQ-" + faker.string.alphanumeric(6).toUpperCase()` (separate from notify tab's `equipNumber`) |
| Open | `vcOpen` | number | `faker.number.int({ min: 0, max: commitment })` |
| Accept | `vcAccept` | number | `faker.number.int({ min: 0, max: commitment - vcOpen })` |
| Decline | `vcDecline` | number | `commitment - vcOpen - vcAccept` (ensures they sum to commitment) |

Note: Volume Commitment fields use `vc` prefix for Open/Accept/Decline to avoid collision with tender status concepts. The `equipNumber` in this tab is contextually different from the Notify tab's `equipNumber`, so it uses `vcEquipNumber`. The column mapping in `TAB_COLUMNS['volume-commitment']` should reference these prefixed keys.

### Additional Info tab (8 new fields)

| Field | Key | Type | Generation Rule |
|-------|-----|------|-----------------|
| Carrier API Tender ID | `carrierApiTenderId` | string | `faker.string.uuid()` |
| Break Point | `breakPoint` | string | 80% chance `faker.location.city()`, 20% chance `"Direct"` |
| Rate Source | `rateSource` | string | Random pick from `["Contract", "Spot", "Benchmark", "Historical"]` |
| Distance Source | `distanceSource` | string | Random pick from `["PC Miler", "Google Maps", "ALK", "Manual"]` |
| Transit Time ID | `transitTimeId` | string | `"TT-" + faker.string.alphanumeric(8).toUpperCase()` |
| Loadboard Expiry | `loadboardExpiry` | string | 70% chance `faker.date.future().toISOString()`, 30% chance `"--"` |
| RCP ID | `rcpId` | string | `"RCP-" + faker.string.alphanumeric(6).toUpperCase()` |
| LCE PK_ID | `lcePkId` | number | `faker.number.int({ min: 100000, max: 999999 })` |

### Others tab (8 new fields)

| Field | Key | Type | Generation Rule |
|-------|-----|------|-----------------|
| Modify User | `modifyUser` | string | `faker.person.fullName()` |
| Modify Date | `modifyDate` | string | `faker.date.recent({ days: 30 }).toISOString()` |
| Indirect Point | `indirectPoint` | string | 60% chance `faker.location.city()`, 40% chance `"N/A"` |
| Round Trip | `roundTrip` | string | Random pick: `"Yes"` or `"No"` |
| Customer Preferred | `customerPreferred` | string | Random pick: `"Yes"` or `"No"` |
| Order Equip | `orderEquip` | string | Random pick from existing `EQUIPMENT_CODES` array in generator |
| Contact Exped | `contactExped` | string | `faker.person.fullName() + " " + faker.phone.number()` |
| Note | `note` | string | 50% chance `faker.lorem.sentence()`, 50% chance `"--"` |

### Total: ~25 new fields per carrier option

---

## 6. Edge Cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| EC-1 | All carriers are `Accepted` or `Cancelled` (no `null` left for cascade) | Decline/Cancel action updates only the acted-upon row. No cascade occurs. No error. |
| EC-2 | Only one carrier in the routing guide | All actions work normally. Cascade has no target -- silently skips. |
| EC-3 | User rapidly clicks multiple 3-dot menus | Only the most recently clicked row highlights. Previous dropdown closes immediately. |
| EC-4 | Shipment has no routing data (`options` is empty array) | Show an empty state message: "No routing options available." |
| EC-5 | User declines the last `Sent` carrier and no `null` carriers remain | Status updates to Declined. No cascade. The routing guide is effectively exhausted -- this is expected in Exceptions scenarios. |
| EC-6 | User opens detail modal then switches shipment in parent | Modal should close when `shipment` prop changes (or become stale). Close on prop change. |
| EC-7 | Dropdown opens near bottom of viewport | Dropdown should position above the trigger if insufficient space below (standard dropdown positioning). |
| EC-8 | Very long carrier name overflows cell | Truncate with ellipsis. Full name visible via tooltip on hover. |
| EC-9 | Cascade targets a carrier that was previously Declined then Re-Tendered | Cascade only targets `null` status carriers. Previously-interacted carriers are skipped. |

---

## 7. Interaction States

### Row Highlight State Machine

```
[No Selection] ──(click 3-dot on Row A)──> [Row A Highlighted + Dropdown Open]
[Row A Highlighted + Dropdown Open] ──(click action)──> [Row A Highlighted + Dropdown Closed + Badge Updated]
[Row A Highlighted + Dropdown Open] ──(click 3-dot on Row B)──> [Row B Highlighted + Dropdown Open]
[Row A Highlighted] ──(click outside)──> [No Selection]
[Row A Highlighted + Dropdown Open] ──(click outside)──> [No Selection]
[Row A Highlighted + Dropdown Open] ──(press Escape)──> [Row A Highlighted + Dropdown Closed]
```

### Tender Action State Transitions

```
null ──(Tender)──────> Sent
Sent ──(Accept)──────> Accepted
Sent ──(Decline)─────> Declined  [+ cascade: next null → Sent]
Sent ──(Cancel)──────> Cancelled [+ cascade: next null → Sent]
Accepted ──(Cancel)──> Cancelled [+ cascade: next null → Sent]
Declined ──(Re-Tender)──> Sent
Cancelled ──(Re-Tender)──> Sent
```

### Cascade Logic (pseudocode)

```
function handleAction(rowId, action):
  newStatus = STATUS_MAP[action]
  updateRow(rowId, newStatus)

  if action in ["Decline", "Cancel"]:
    nextNullCarrier = options
      .filter(o => o.id !== rowId && o.status === null)
      .sort(by rank ascending)
      .first()
    if nextNullCarrier:
      updateRow(nextNullCarrier.id, "Sent")
```

### 3-dot Menu Options by Status

| Current Status | Available Actions |
|----------------|-------------------|
| `null` | Tender |
| `Sent` | Accept, Decline, Cancel |
| `Accepted` | Cancel |
| `Declined` | Re-Tender |
| `Cancelled` | Re-Tender |

---

## 8. Out of Scope

- **Backend integration** -- all state is local/in-memory for the prototype.
- **Persistence** -- refreshing the page resets all tender actions to their generated defaults.
- **Column arrangement/reordering** -- the cog icon is placed for future use but does not open a configuration UI in this ticket.
- **Add Quote modal/form** -- the button is placed; the form it opens is a separate ticket.
- **Show Rate Details (QCA)** -- the menu item is placed; the detail view it opens is a separate ticket.
- **Routing Query (QCP) and View Stops** -- buttons are placed in the modal; their destination views are separate tickets.
- **Keyboard navigation** within the table or dropdown (future accessibility pass).
- **Print/export** of the tender table.
- **Code branching** between Exceptions and Monitoring panels -- confirmed unnecessary.

---

## 9. Open Questions

| # | Question | Status |
|---|----------|--------|
| OQ-1 | Should "Add Quote" button be disabled or hidden when all carriers have been tendered? | **Unresolved** -- likely always visible since spot quotes are independent of routing guide state, but confirm with Jana. |
| OQ-2 | Should the detail modal's "View Stops" button navigate to a Stops tab or open its own modal? | **Unresolved** -- parked until the Stops tab ticket is specced. |
| OQ-3 | What is the exact visual treatment of the column arrangement (cog) button? | **Deferred** -- out of scope for SHP-21, but the icon placeholder should match the main table's cog style. |
