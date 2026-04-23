# Odyssey Shipments Domain — Progress

## Project Overview
Odyssey is a US-based logistics company building a unified platform to consolidate multiple logistics services. This project focuses on the **Shipments domain** — the core operational view for managing shipments, exceptions, monitoring, and PGI/PGR workflows.

**Stakeholder:** Janardhana (Jana) — domain expert, source of truth
**Designers:** Manuela, Efrain
**Grooming sessions:** Feb 17, Mar 23 (transcripts in `Grooming-sessions/`)

---

## Phase 1: HTML/CSS/JS Prototype (Complete)

Fast prototyping and ideation to translate stakeholder requirements into a working demo. Served on `localhost:3005`.

### What Was Built

#### Core Layout
- **Navbar** with global search bar (dark theme), category dropdown, nav arrows, notification bell, profile section
- **Sidebar** — 64px icon navigation with 7 items, active states
- **Monitor Panels** — 3 selectable cards (Exceptions, Monitoring, PGI/PGR) with collapse/expand
- **Shipment Tabs** — All, Date Issues [4], Routing Review [4], Tender Issues, Tender Review, Bid Review

#### Shipment Table
- 24 rows with comprehensive `data-*` attributes
- Sticky header, checkbox selection (select-all with indeterminate state), row hover/selected states
- Columns: Checkbox, Buy Shipment, Customer ID, Order # (amber/blue badges), Order Count, Pickup, Delivery, Origin, Actions

#### Dual Search System
- **Navbar search bar** (dark, original) — fully functional with category dropdown, chips panel, saved searches
- **Table-level search bar** (white) — inline below table controls with search icon, bookmark button for saved profiles
- **Smart chip suggestions** based on input type (18 searchable attributes from CSV documentation)
- **Saved search profiles** — selectable from filters panel Saved tab, applied as removable chip in search bar
- **Real-time table filtering** with 150ms debounce
- **Bookmark icon** — filled when Saved tab is open, outlined when closed

#### Filters Panel
- 354px side drawer with two tabs: All (date filters) and Saved (search profiles)
- Live result counter, Clear all, copy-to-clipboard on saved queries

#### Selected Shipment Table (Bottom Bar)
- Three states: **collapsed** (48px), **partial** (50vh), **fullscreen** (calc(100vh - 64px))
- **Fullscreen toggle** + **close button** in header actions
- Auto-scroll to selected row on expand
- Min-height 10 rows for the main table, bottom padding to prevent row overlap

#### Bottom Bar Tabs — All Implemented:

**Order Tab** — 4-column grid, 3 rows of sections (General, Transportation, Ship From/To, Schedule, Products, Totals, References, Contacts)

**Stops Tab** — Summary bar (distance, weight, volume, carrier, equipment, utilization) + vertical tracking timeline with numbered circles (01, 02, 03) inside colored nodes, "Stop N" labels on the left, pickup (green) and delivery (blue) badges

**Product Tab** — Expandable order lines table with 23 columns. Parent rows show order ID + line count, all individual lines are children revealed on expand. Package types consistent within orders. Priority (green) columns first. Hazmat badges (red Yes / neutral No)

**Routing Guide Tab** — Selectable rows with radio buttons, carrier options (5 rows), SCAC codes, status badges (Accepted/green, Pending/yellow, Rejected/red, Declined/neutral), selected row highlighted

**Cost Allocation Tab** — Two sub-tabs: Planned Cost (active) and Completed Cost (shows lock icon + "Available after PGI/PGR" message). AP and AR cost columns side by side with margin. Summary bar with AP Total, AR Total, Margin (green). Per-order breakdown with expandable loads. Negative values in red, margins in green

**Instructions Tab** — Collapsible order groups (default expanded) with +/- toggle. Each instruction has sequence number + type badge (BOL, MISC, TRA, ADC, ZD02, SPC) + text. Instruction count shown per group

**Documents Tab** — Upload toolbar + document table (Type badge, Description, File link, Delete). Upload modal with Type dropdown (BoL/MBoL/Invoice/Instructions/Other), file picker, description field. Auto-fullscreen on upload. Type badges color-coded (blue BoL, yellow Invoice, green Instructions, purple Other)

**Notes Tab** — Full CRUD. Input area with avatar + textarea + Add Note button. Note list with author avatar, name, timestamp, body text. Edit (inline textarea with Save/Cancel) and Delete buttons on current user's notes only. Multiple author avatars with different colors

**History Tab** — Placeholder (Jana said "forget about history for now")

**Tender History Tab** — Placeholder (Jana: "tender history and history are same, forget about this")

### Design System Applied
- All CSS refactored to use design tokens (CSS custom properties)
- 29 primitive tokens, 22 semantic tokens, component tokens
- Consistent use of `var()` references throughout all styles

### Phase 1 Files
| File | Purpose |
|------|---------|
| `index.html` | Main shipments view (~1978 lines) |
| `styles.css` | All styling with design tokens (~2978 lines) |
| `script.js` | All interactivity (~1337 lines) |
| `design.md` | Design system documentation |
| `progress.md` | This file |

---

## Data Generation (Complete)

### Problem
All tab content was hardcoded in HTML — data inconsistent across tabs, impossible to scale.

### Solution
Created a faker-based data generator producing 200 shipments with correlated data for every tab.

### Files (`data/`)
| File | Purpose |
|------|---------|
| `generate.mjs` | Generator script using `@faker-js/faker` with seed 42 (reproducible) |
| `shipments.json` | 200 shipment rows for main table (153 KB) |
| `shipment-details.json` | Per-shipment detail data for all tabs (3.5 MB) |
| `package.json` | faker dependency |

### Data Model
Each shipment has correlated data for: Order tab, Stops tab, Product tab, Routing Guide tab, Cost Allocation tab, Instructions tab, Documents tab, Notes tab.

**Stats:** 200 shipments, 502 total orders, 15 customers, 30 locations, 20 chemical products, 15 carriers.

**Constraints enforced:**
- Orders within a shipment share the same customer
- Stops match shipment origin/destination
- Package types consistent within orders
- AP base + fuel always present; discount + accessorials conditional
- AR cost = AP x 1.25-1.35 (margin 20-35%)
- One routing option "Accepted", others Pending/Rejected/Declined
- Instruction types: BOL, MISC, TRA, ADC, ZD02, SPC

---

## Domain Analysis (Complete)

### Files (`Idea visualization/`)
| File | Purpose |
|------|---------|
| `index.html` | Interactive domain visualization (7 tabs) |
| `shipments-domain-analysis.md` | Written analysis with Jana's quotes |

### Visualization Tabs
1. **Lifecycle** — Full flow diagram (Order -> Load -> Shipment -> Planning -> Tender -> Monitoring -> PGI/PGR)
2. **Exceptions & Monitoring** — All categories with descriptions
3. **Tender Process** — Step-by-step flow + auto vs manual tender
4. **AP/AR Cost** — Side-by-side breakdown showing both have full structure
5. **Data Model** — How shipment data maps to each tab
6. **Generated Data** — Live stats from JSON (distributions, sample record)
7. **Open Questions** — 7 flagged questions for Jana validation

### Key Domain Insights (from Jana)
- **Tender** = offering shipment to carriers sequentially until one accepts
- **Exceptions** = system stuck, user must act; **Monitoring** = system working, user watches
- **AP** (carrier cost) and **AR** (customer cost) both have full breakdowns (base, fuel, discount, accessorials)
- **Buy + Sell shipments** now created simultaneously (recent requirement change)
- **Completed Cost** only available after PGI/PGR receipt
- **Tender History + History tabs** are the same and not in scope ("forget about this for now")

---

## Phase 2: React Migration (Complete)

### Stack
| Tool | Version | Why |
|---|---|---|
| **React** | 19 | Component architecture |
| **Bun** | 1.3.10 | Fast runtime, bundler, package manager |
| **Vite** | 8.x | Dev server + HMR |
| **Tailwind CSS** | v4 | Utility-first, CSS-first config |
| **lucide-react** | Latest | Icon library (from design.md) |
| **CSS Custom Properties** | Modern | Design tokens from design.md |

**No router needed** (single-page app). **useState/useContext** for state (no Redux/Zustand yet).

### Project Location
`/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-shipments/`
Served on `localhost:3010`.

### Component Architecture
```
src/
  components/
    layout/     AppShell, Navbar, Sidebar
    shipments/  ShipmentTable, MonitorPanels, ShipmentTabs, TableControls, SearchChipPanel, FilterPanel
    detail/     BottomBar, OrderTab, StopsTab, ProductTab, RoutingGuideTab, CostAllocationTab, InstructionsTab, DocumentsTab, NotesTab, HistoryTab, TenderHistoryTab, ColumnPanel
    ui/         Badge, DarkTooltip
  data/         shipments.json, shipment-details.json, index.js (accessors)
  styles/       tokens.css (design system)
```

---

## Session 2 — March 24, 2026

### Shipments Table — Last Column
- Sticky last column (`position: sticky; right: 0`) with subtle left shadow
- `Columns3Cog` icon in header — opens ColumnPanel side panel
- `MoreVertical` (3-dot) icon per row
- Column arrangement button wired to same ColumnPanel as BottomBar

### Order # Column & Badge Overhaul
- Badge colors by position: 1st=amber, 2nd=blue, 3rd=green, 4th=red, 5th=purple
- Badges are single-line, `nowrap`, `flexShrink: 0` — clip at column edge
- Column max-width 192px, horizontal layout with 6px gap

### Per-Order Data Generation
- `orderDetail` (singular) → `orderDetails[]` (array) in `shipment-details.json`
- Each order gets unique faker data: ship from/to, dates, references, contacts, incoterms, ports, etc.
- Generator updated (`tools/generate.mjs`) and data regenerated with seed 42

### Order Dropdown in BottomBar
- Header: "Order" label (small) + bold selected order number + chevron
- Dropdown opens downward into content area, aligned with tab, same width
- Colored badges per order matching table colors
- Order selection updates OrderTab data; resets on shipment change

### Selected Row UX
- MonitorPanels collapse when shipment selected, expand when deselected
- Auto-scroll: selected row scrolls into view above bottom bar (targets `<main>`, 350ms delay)

### Search Bar Styling (Prototype Parity)
- Focus border: `var(--border-strong)` (dark navy)
- All transitions: `0.15s ease` on icon, clear, bookmark, chip remove
- Hover states on all interactive elements
- Bookmark: filled when saved searches panel open or query applied
- Input: no focus ring (`border: none`, `outline: none`, `boxShadow: none`)

### Bottom Bar Trailing Buttons
- Shrunk to 26×26 (column btn 28×28), transparent bg
- Hover: color → `var(--text-secondary)`, bg → `var(--bg-tertiary)`

### Dark Tooltips (Portal-based)
- `OrdersTooltip` on Order # and Order Count cells — dark themed, shows all order badges
- `DarkTooltip` reusable component (`src/components/ui/DarkTooltip.jsx`)
- Export button tooltip: "Only the first 10,000 records will be exported to Excel"
- Both use `createPortal` to `document.body` — no overflow clipping

### Export Modal
- Centered modal with blurred overlay (`backdrop-filter: blur(4px)`)
- Two options: "Export all records" and "Export filtered records" with counts
- Actual CSV download with proper escaping

### Layout Fix
- Main container padding left changed from `var(--sidebar-width)` to `var(--spacing-6)` to match right

### Web Interface Guidelines Audit
- Full review completed, findings saved to memory for future implementation
- Key gaps: aria-labels, focus states, virtualization, tabular-nums, prefers-reduced-motion

---

## Design System Epic: Colors (Complete)

Figma source: `https://www.figma.com/design/1kXenKxAqgxNmB36HERhvk/Test-MCP`

- **29 primitive tokens** across 8 color groups
- **22 semantic tokens** (text, background, border)
- **53 component tokens** (Figma only)
- 3-tier naming: Display, Figma, SCSS/CSS
- Typography normalized to Inter (from 4 fonts)
- Border radius scale: sm (4px), md (6px), lg (8px), xl (16px), pill (10px), full (9999px)
- Shadow: sm only

### Remaining Design System Work
1. Spacing & sizing tokens
2. Create Figma variables from token definitions
3. Z-index scale, transitions, breakpoints

---

## Session 3 — March 30, 2026

### New Grooming Sessions Analyzed
- **Mar 25 — David Johns**: Spot bidding flow, PGI data flow, freight accruals, cost allocation by weight, multi-customer shipments (corrected assumption), routing guide sequential tendering, UI feedback on products/stops/instructions/documents
- **Mar 25 — Jana**: Order→Load→Shipment hierarchy, loads hidden from users, 5 tender statuses (Sent/Accepted/Declined/Rejected/Cancelled), tender history vs shipment history distinction, 16 exception conditions, spot bid overflow, user personas
- **Mar 30 — Jana + Manuela review**: Corrections to implemented features, new requirements

### Domain Analysis Updated
- `shipments-documentation/Documentation/shipments-domain-analysis.md` fully rewritten — now covers all 5 grooming sessions (Feb 17, Mar 23, Mar 25 x2, Mar 30)
- Key correction: orders from **different customers** can be on the same shipment (was wrong before)
- Key correction: cost components must be **distributed by weight** across orders, not repeated
- Entity hierarchy documented: Customer Order → Load (1:1) → Shipment (1:many loads)
- 5 tender statuses defined, sequential tendering constraints documented
- Spot bidding / overflow process documented
- PGI flow and freight accruals documented
- 13 open questions tracked, 1 resolved (document types)

### Completed Changes

#### AP/AR Cost Tab Overhaul
- **Stacked layout**: AP breakdown table on top, AR breakdown table below (Manuela proposed, Jana confirmed — replaced AP/AR toggle tabs since vertical space is now available)
- **Full AR breakdown in generator**: Each AR component (arBase, arFuel, arDiscount, arHzc, arSoc) generated individually by applying markup per component
- **Weight-based cost distribution**: Each order gets a proportional share of each cost component based on weight — sum of order portions = shipment total
- **Flat table**: Removed loads expand/collapse (1 order = 1 load, always)
- **Compare AP/AR modal**: Portal-rendered, shows AP vs AR side-by-side with Diff column (green positive, red negative). Order tabs inside modal to switch between orders (max 5). Overall margin always visible.
- `selectedOrderIdx` threaded from BottomBar to CostAllocationTab

#### Tab Reorder
- New order: Order → Product → **Stops** → Tender → Cost Allocation → Instructions → Documents → Notes → Tender History → History
- Stops moved from last to 3rd (David feedback)
- Tender History and History pushed to end (deprioritized by Jana)

#### Products Tab — Default Expanded
- All order groups start expanded on load
- useEffect re-expands when user switches shipments
- Collapse toggle still works (confirmed by Jana: "start expanded, leave them with minus signs")

#### Export Modal
- Labels updated: "Export all columns" / "Export visible columns" (Jana clarified: choice is about columns, not records)
- Description updated: "Choose which columns to include..."
- CSV export functional for both modes with proper escaping + BOM for Excel
- Both buttons show same filtered record count

#### Order Dropdown Enhancement
- Now shows: **badge + order ID + origin city → destination city + weight**
- Data pulled from `orderDetails[i].shipFrom.location`, `shipTo.location`, `grossWeight`
- Dropdown rendered as portal (`createPortal` to `document.body`) — fixed position relative to Order tab, doesn't scroll with content
- Min width 320px for the extra content

#### Document Types
- Final list: **BoL, MBoL, POD, SL, Packing List, Other**
- Invoice removed (David: "we would never have an invoice")
- POD (Proof of Delivery), SL (Shipping List), Packing List added (David provided list)
- Other kept for emails, images, misc attachments (Jana, Mar 30)
- Badge colors: BoL/MBoL=blue, POD=yellow, SL=green, Packing List=purple, Other=gray

#### Tender Status Names + Colors
- 5 statuses from Jana: Sent, Accepted, Declined, Rejected, Cancelled
- "Pending" removed — replaced by "Sent"
- Colors: Accepted=green, Sent=blue, Declined=yellow, Rejected=red, Cancelled=gray

#### Tab Rename
- "Routing Guide" → "Tender" in all display text (Jana: "Everywhere it is going to be tender")
- Internal keys (`routing`, `RoutingGuideTab.jsx` filename) preserved

#### Data Generator Improvements
- All order-level fields now unique per order (grossWeight, totalWeight, tareWeight, totalVolume, numProducts, schedule fields, contacts, references)
- No hardcoded values in any detail components — confirmed by grep audit
- Weight-based random proportions for cost distribution (not equal splits)
- Reproducible via faker seed 42

---

## Session 4 — March 30, 2026

### Grooming Session Analyzed
- **Mar 30 — Jana + Manuela review** (3003-Shipment-grooming-Jana.vtt): Full walkthrough of implemented features with corrections and new requirements

### Completed Changes

#### Tender Status Data Fix
- Replaced "Pending" with "Sent" in `ROUTING_STATUSES` (generator)
- Added "Cancelled" status to the pool
- Component `STATUS_STYLES` map already had all 5 correct statuses (Accepted, Sent, Declined, Rejected, Cancelled) — generator was the only source of "Pending"
- Data regenerated (200 shipments, seed 42)

#### N1: Product Tab — Order Number Separators
- Added full-width separator row before each order group showing the order ID in bold
- Removed redundant "Order #" column from table header
- Removed repeated order IDs from individual product rows (single-line, parent, and child rows)
- Parent rows now show "X lines" count instead of order ID
- thead font color changed from `--text-placeholder` to `--text-tertiary` for better readability

#### N5: Three-Dot Menu — Shipment Actions
- Clicking `MoreVertical` icon opens a dropdown with two actions: "Edit by Shipment" and "Tender to Preferred Carrier"
- Menu rendered via `createPortal` to avoid overflow clipping
- Entire sticky cell is the click target (not just the icon)
- Cell click does not trigger row selection (`e.stopPropagation`)
- Closes on click outside and toggles on cell re-click

#### N6: Tender History Tab — Blank Placeholder
- Updated text from "coming soon" to "No tender history available — Tender history records will appear here once tenders are processed"

#### N2: Document Preview Modal
- Clicking a document file link opens a preview modal instead of downloading
- Modal shows: type badge, file name, description, and a mock document preview
- **PDF/Word files**: realistic Bill of Lading mockup with Odyssey letterhead, shipper/carrier info, items table, signature lines. POD shows "PROOF OF DELIVERY", SL shows "SHIPPING LIST"
- **Spreadsheet files**: mock grid with order numbers, descriptions, quantities, weights
- Download button + Close button in footer
- Click outside to close

#### N4: History Tab — Jira-Style Audit Timeline
- Generator produces 5-12 history entries per shipment with: user (6-person pool), timestamp, action (14 types), category, details, and optional field/oldValue/newValue for change tracking
- Vertical timeline with small 7px colored dots (distinct from Stops tab's numbered circles)
- Dots colored by category: green (create), blue (tender), amber (update), purple (completion)
- Each entry: bold user name + colored action badge + relative timestamp, details line, optional field change with strikethrough old value → new value
- Timestamps are relative to the shipment's most recent entry (not real clock), so newest shows "just now" and others spread naturally

#### #8: Sequential Tender Logic
- Generator now follows realistic sequential tendering: carriers tendered top-down by rank
- **~85% of shipments**: tender completed — Declined/Rejected above the accepted carrier, null (never tendered) below
- **~15% of shipments**: tender in progress — Declined/Rejected above, "Sent" as current, null below
- RoutingGuideTab: null-status carriers render empty cells (no badge); no pre-selection when no Accepted exists

#### #9: Stops Tab Redesign (Partial)
- Replaced "Stop 1, Stop 2" labels with **P1, P2** (pickups) and **D1, D2** (deliveries) — both in side label and circle node
- Promoted **Location** and **Date** to first positions in field grid, rendered larger/bolder (14px/600 weight)
- Removed redundant leading "P1/D1" spans (label already inside circle node)
- Compact layout (step 3) deferred — pending review of current state

#### Order Dropdown — Click Outside to Close
- Extracted `OrderDropdown` as a separate component in BottomBar.jsx
- Added click-outside listener (excludes the Order tab button so toggle still works)

#### Modal Style Unification
- Documents tab upload + preview modals updated to match Export/Cost Allocation pattern: `position: fixed`, `zIndex: 9999`, `backdropFilter: blur(4px)`, `boxShadow: '0 8px 30px rgba(0,0,0,0.2)'`, `padding: 24` card with margin-based spacing (no inner border separators)

#### Compare AP/AR Modal Cleanup
- Removed redundant "Order: ORD-XXXX" subheader span (order tabs already show selection)
- Margin display remains right-aligned

---

## Session 5 — March 31, 2026

### PPT Analysis & Domain Reanalysis
Extracted and cross-referenced both PowerPoint decks (`Shipments-Monitoring.pptx`, `Shipments-Exceptions.pptx`) against all 5 grooming transcripts. Major domain gaps identified and documented.

### Domain Analysis Updates (shipments-domain-analysis.md)
- **Section 3 (Tendering)** — Added tender summary header (shipment context for carrier decisions), 5 routing sub-views (Routing Options, Notify & Response Method, Pro & Equipment Info, Additional Info, Others), expanded tender action buttons (Add Quote, Show Rate Details/QCA, Routing Query/QCP, View Stops, View Volume Commitment)
- **Section 7 (PGI/PGR)** — Added 3 sub-categories: PGI Errors, Manual PGI/PGR, Rating Failure
- **Section 8 (Exceptions & Monitoring)** — Added three-panel navigation architecture, table-level tabs per panel (Exceptions tabs filter table, Monitoring tabs change visible column groups), tender summary appears on shipment selection in both panels
- **Section 10 (UI Feedback)** — Added "Replan" to three-dot menu actions
- **Section 11 (NEW: Search, Filtering & Column Arrangement)** — Full requirements for search progression, smart chip search, filter panel (synced to visible columns, "More filters" expansion), filter layering, Column Arrangement/Change View (presets, draggable columns, saveable/shareable profiles, locked columns from PPT green markers)
- **Section 13 (Data Model)** — ~10 missing product fields added, Mode values corrected (TL, LTL, RR, IMD, AIR), Planning Date Type documented (RDD/SSD/RSD — not in scope for UI)
- **Section 14 (Open Questions)** — Q3 resolved (routing sub-tabs answered from PPT)

### Completed Changes

#### #6: Instruction Type Badges Removed
- Removed `TYPE_COLORS` map, `TypeBadge` component, and `<TypeBadge>` usage from `InstructionsTab.jsx`
- Removed `INSTRUCTION_TYPES` constant and `type` field from generator (`tools/generate.mjs`)
- Data regenerated (200 shipments, seed 42)
- Instructions now show sequence number + text only

### Key Clarifications from Brainstorming

#### Tender Summary Header
- Appears when user selects a shipment row in Exceptions or Monitoring views
- Shows shipment context (IDs, mode, weight, pickup/delivery addresses) needed for carrier decisions
- Same shared screen across both panels — Jana: "Both the same screen tender screen"
- Is a **separate screen** as a deliverable, but lives within the panel views

#### Table Tabs per Panel
- **Planning Exceptions** tabs: All, Date Issues, Routing Review, Tender Issues, Tender Review, Bid Review — act as first-order filters
- **Planning Monitoring** tabs: Routing Options, Notify & Response Method, Pro & Equipment Info, Additional Info, Others — change visible column groups
- **PGI/PGR**: "Coming soon" placeholder for entire view
- Exception tabs currently exist but do nothing — need wiring

#### Column Arrangement (Change View)
- Same panel pattern for main table and bottom bar detail table
- Flow: presets list → chevron-right → draggable/checkbox column list
- Locked columns (green in PPT) are unselectable/undraggable
- Profiles saveable and shareable with other users

#### Filter-Column Sync
- Filter panel shows only filters matching currently visible columns
- "More filters" expands to full view for advanced attributes (cargo, financial, load, edge cases)
- Filters grouped by progression subtitle

#### Planning Date Type
- RDD (Requested Delivery Date), RSD (Requested Ship Date), SSD (Standard Shipping Date)
- Jana said don't worry about it for now — documented only

#### Mode Values
- Changed from FTL/LTL/INTERMODAL to TL/LTL/RR/IMD/AIR (per PPT)
- Not yet updated in codebase — pending implementation

### New Files
- `change-notes.md` — change notes for grooming/demo context (per-change remarks)

---

## Session 6 — April 1, 2026

### Grooming Session Analyzed
- **Apr 1 — Jana**: MAJOR CORRECTION — Monitoring view is the same screen as Exceptions (not column-group tabs). Tender tab identical in both views. PPT slides were one table split across slides. Tender statuses simplified to 4. Shipment status mapping. Actions available in both panels.

### Accomplished This Session

#### Backlog & Prioritization
- Created formal backlog with Jira-style IDs (SHP-11 through SHP-22)
- Established **spec-before-implementation workflow** — PRD → Spec (user stories, edge cases, functional requirements) → Implementation
- Prioritized all items across 6 priority levels
- Created `shipments-documentation/Documentation/backlog.html` — visual backlog for stakeholder sharing
- Created `shipments-documentation/Documentation/decision-log.md` — 27 decisions traced to source (DEC-01 through DEC-27)

#### Domain Analysis Enhancements
- Added **conceptual "why" explanations** to all major sections (Tendering, Spot Bidding, AP/AR, Cost Allocation, PGI, Exceptions & Monitoring, History, Search & Filtering)
- Documented **Filtering vs. Column Visibility cross-cutting rule** (DEC-19): panel/tab filtering always works independent of column visibility; filter panel defaults to visible columns; "More filters" expands to all
- Documented **three separate shipment pools** (DEC-18): Exceptions, Monitoring, PGI/PGR are not views of the same data

#### Major Correction from Apr 1 Grooming (DEC-21 through DEC-27)
- **Monitoring = same screen as Exceptions** — only high-level tabs and tender status values differ
- **PPT slides = one table split across slides** — not 5 separate sub-view tabs
- **Tender tab identical in both views** — same actions, same layout, status values differ (Exceptions: Cancelled/Declined; Monitoring: Sent/Accepted)
- **Actions available in both panels** — not read-only in Monitoring
- **Tender statuses simplified**: Sent, Accepted, Declined, Cancelled (removed Rejected)
- **Shipment statuses corrected**: Review, Done (removed Tender/In Transit/Delivered/Booked)
- **Tender status drives shipment status**: Accepted→Done, Cancelled/Declined→Review, Sent→blank
- **"Replan" removed from three-dot menu** — Jana retracted it (Mar 30: "forget replan, it happens from the tender screen")

#### Implemented Stories

| ID | Task | What was done |
|---|---|---|
| **SHP-12** | Mode values correction | MODES: TL, LTL, RR, IMD, AIR. Weighted distribution (TL/LTL majority, RR=2 customers only, AIR rare). shipmentMode labels updated. Stops constraint: non-TL = 2 stops only. |
| **SHP-14** | Missing product fields | Added 10 fields: hazmatDescription, hazmatUnNumber, boilingPoint, marinePollutant, wgkClass, tunnelCode, dimensions, loadConstraints, toPartnerRef, thirdPartRefDate. Real UN numbers for hazmat products. |
| **SHP-15** | Exception tabs wired | Added `panel` and `category` fields to generator. filteredShipments now filters by activePanel first, then activeTab. Badges show real counts. |
| **SHP-16** | Monitoring row-filter tabs | Same mechanism as SHP-15 — tabs (Hold, Consolidation, Sent, Spot Bid) filter rows. CORRECTED from column-group tabs. |
| **SHP-17** | PGI/PGR placeholder | "Coming soon" centered message when PGI/PGR panel selected. |
| **SHP-20** | Tender tab status-aware | No code change needed — data naturally shows correct statuses per panel. Removed stale "Rejected" from STATUS_STYLES. |
| **SHP-22** | Shipment status column + mapping | Shipment status derived from tender status (not random). Added as visible column in main table with Done (green) / Review (amber) badges. Tender statuses reduced to 4. |
| **SHP-13** | Three-dot menu | Updated to: "Buy Shipment", "Edit", "Tender by Preferred Carrier". Same in both panels. Removed Replan. |

#### New Documentation Files
- `shipments-documentation/Documentation/decision-log.md` — All implemented decisions with previous state, source, rationale
- `shipments-documentation/Documentation/backlog.html` — Visual backlog with completed work history

#### Key Domain Insights Captured
- **TL vs LTL** (David, Apr 1): LTL = max 2 stops (1P + 1D), carrier can mix other freight. TL = exclusive truck, multi-stop allowed.
- **Mode definitions**: RR = only 2 customers use it. AIR = not supported today but kept for demo.

---

## Current State (as of April 13, 2026 — End of Session 9)

### Performance Architecture
- **1200 shipments**, seed 42, fully reproducible
- **Virtualized table** — `react-window` `List`, only ~20 rows in DOM regardless of data size
- **Per-shipment detail files** — 1200 individual JSON files in `public/details/` (~30KB each), fetched on demand via `fetch()` with LRU cache (50 entries)
- **Pre-built filter indexes** — `Map.groupBy` for O(1) panel/category lookups
- **React.memo** on 13 components to prevent cascade re-renders
- **Two-panel table layout** — scrollable data columns (left) + fixed actions column (right) with synced vertical scroll
- `shipments.json` (1.0MB) statically imported; old 21MB monolith eliminated

### Data Generator
- 5 modes: TL (40%), LTL (40%), AIR (10%), IMD (5%), RR (5% — restricted to BASF customer)
- 4 tender statuses (Sent, Accepted, Declined, Cancelled)
- 2 shipment statuses: Done (green badge, monitoring), Review (red badge, exceptions)
- **Panel assignment derived from tender outcome** — Accepted/Sent → Monitoring (~70%), Declined/Cancelled → Exceptions (~30%)
- Monitoring categories: approved, sent, consolidation, hold, spotbid (weighted)
- Exception categories: date-issues, routing-review, tender-issues, tender-review, bid-review (weighted)
- Validation messages per exception shipment, rate details per carrier option
- 55 fields per carrier option, VC sums validated, sequential tender logic, weight-based cost distribution
- **Appointment fields** added per order: `pickupAppointment`, `deliveryAppointment` (boolean)

### UI — Shipments Table
- **Panel-aware column presets** (SHP-47): Exceptions and Monitoring have independent column configs. "Default Exceptions" includes Validation Message; "Default Monitoring" includes Tender Status, Stops, hides messages.
- **Header wrapping** (SHP-44): column headers wrap words vertically, content truncates with "...", smart tooltip (2+ words hidden). Drag-to-resize with min 80px. Resize handles appear on header row hover.
- **Horizontal scrollbar at top** — always visible below header row, bidirectional sync with data list
- **Date-only display** (SHP-48): date columns show date only, full date+time on hover tooltip
- **Hazmat badge** (SHP-43): yellow badge with TriangleAlert icon + "Hazmat" when true, "--" when false. Column renamed "Hazardous"
- **Order # deprioritized** (SHP-52): moved to far right in default preset, width 150px
- **Order Count** width: 80px (minimum)
- **Shipment status badge**: Done (green) / Review (red) with Info icon inside badge + tender status tooltip on hover
- **Zap icon** for actions — fills with `--text-primary` when dropdown open, entire row highlights
- **Auto-scroll** — selected row scrolls above bottom bar, works in all panel states
- **Metrics auto-collapse** on table scroll
- **Column Arrangement Panel** (SHP-18): two-level panel with named presets (Default Exceptions, Default Monitoring, Logistics View, Financial View, Carrier View). Radio button highlights active preset based on current columns.

### UI — Search & Filtering
- **Search bar**: no spellcheck/autocorrect, 2px focus border (`--deep-sea-neutral-600`), blurs on X clear
- **Smart chip search**: chips appear on search, selected chip background `--deep-sea-neutral-300` with `--deep-sea-neutral-800` text
- **SHP-33 column promotion**: selecting a chip temporarily moves that column to position 2 (after Buy Shipment) with `--deep-sea-neutral-700` header, auto-width based on label length. Reverts on clear.
- **Relevance sort**: starts-with first → word boundary → contains anywhere
- **Funnel filter icon**: inline after last chip with left divider, filled with `--text-primary` when panel open, only clickable when chip selected
- **Bookmark icon**: always clickable, filled when Saved tab open, independent from funnel state
- **Item counter**: darkens to `--text-primary` + bold when search active or filter panel open
- **Chips hidden** when search returns 0 results
- **Filter panel**: redesigned header (18px bold title, pill tabs with counts), stays open on "Show results", closes on X or click outside main area
- **Saved query chip**: appears after input text in search bar

### UI — Button Design System
- **`PrimaryButton`** component (`src/components/ui/Button.jsx`): dark bg (`--btn-primary-bg`), hover to `--btn-primary-hover` (#384253), scale(0.98) + inset shadow on click
- **`SecondaryButton`** component: white bg, outlined, hover to `--bg-secondary`, click to `--deep-sea-neutral-200`
- Both: 14px font, 1.1 line-height, 8px 18px padding, `--radius-lg`, `--shadow-sm`, disabled state (0.5 opacity)
- **21 buttons** across 6 files replaced with these components
- **`--btn-primary-hover`** token added to design tokens
- **Filter panel footer**: equal-width buttons via flex:1

### UI — Tender Tab
- **TenderSummary removed** (SHP-51): "View Shipment Details" button relocated left of "Add Quote" in sub-tab row
- **TenderDetailModal**: 4-column grid, sticky header on scroll
- **3-part routing table**: fixed left | collapse toggle | scrollable right (proportional algorithm)
- **Default collapsed** (SHP-53): all sub-tabs start collapsed, CSS transition on expand/collapse (200ms)
- **5 sub-tabs**: Routing Options, Notify & Response, Volume Commitment, Additional Info, Others
- **Contextual menu** per carrier: tender actions based on status + Edit Quote + Show Rate Details
- **Quote Modal** (SHP-29): Add/Edit/View modes, SCAC dropdown, live AP/AR totals, sticky header on scroll
- **AP cost tooltip** (SHP-45): hover shows AP/AR/Margin summary, click opens Rate Details modal. Value turns carolina-blue-400 on hover.
- **Cascade tendering**: Decline/Cancel auto-tenders next null carrier
- **"Tender Sent"** (SHP-49): Monitoring panel tab renamed from "Sent"

### UI — Product Tab (SHP-46 overhaul)
- **Table styling**: matches Cost Allocation — header color `--text-tertiary`, height 48px, outer border with `--radius-md`
- **Order groups**: order name + line count inline (e.g., "ORD-X (3)"), single-line shows "ORD-X - 001"
- **Expand/collapse**: ChevronDown/ChevronRight icons in bordered 22x22 buttons (matching Instructions tab)
- **Child rows**: inset 3px left border (`boxShadow`), indented line numbers (paddingLeft 30px)
- **Sticky columns**: expand button (left:0) + Line # (left:34) stay fixed on horizontal scroll, thead z-index 3
- **Hazmat merged** (SHP-54, pending approval): Hazmat Class/Group columns removed, info shown in hover tooltip on hazmat badge

### UI — Order Tab (SHP-50 overhaul)
- **Section reorder**: General → Totals (promoted) → Ship From + pickup dates → Ship To + delivery dates → Req. Transportation (demoted) → Products Info → References → Incoterms → Contacts → Custom Fields
- **Appointment badge**: blue "Appointment" badge (display-only) when order has pickup/delivery appointment
- **Redundancy removed**: Order Number, Shipment Mode, Equipment removed from General (shown in other sections/tabs)
- **Reduced white space**: tighter grid, fewer sections

### UI — Layout
- **Navbar**: embedded SVG Odyssey ONE logo, ⌘K shortcut badge, Figma-matched colors
- **Sidebar**: truck icon active for shipments, 100vh - navbar height
- **Monitor panels**: collapse toggle dividers match tab border color (`--border-subtle`), spacing on panels container margin-bottom (0 when collapsed)
- **Export tooltip**: right-aligned to prevent clipping, right-justified text
- **Loading spinner** for lazy-loaded tab content
- **Click outside** closes filter/column panels
- **Sticky modal headers**: title + close button stay pinned on scroll (QuoteModal, TenderDetailModal)

### Documentation
- Domain analysis fully updated through Session 7
- Decision log with **39 traced decisions** (DEC-01 through DEC-39)
- DEC-39 (Hazmat merge) pending stakeholder approval
- Performance optimization spec + plan: `docs/superpowers/specs/2026-04-07-performance-optimization-design.md`
- David's feedback spec + plan: `docs/superpowers/specs/2026-04-13-david-feedback-stories-design.md`
- **Backlog HTML** updated with all stories through SHP-54, "Validate" status for implemented items
- **13 specs** written: SHP-21 through SHP-33, SHP-43 through SHP-54

---

## Session 10 — April 15, 2026

### Bug Fixes
- **PGI/PGR panel crash fixed** — React error #300 ("Rendered fewer hooks than expected"). Root cause: `useCallback` hook inside conditional JSX branch in App.jsx. Moved to top-level `handleScrollStart` callback.
- **"Sent" → "Tender Sent"** — renamed in ShipmentTabs monitoring tab to match MonitorPanels card label

### Architecture
- **`src/data/panelConfig.js`** — single source of truth for panel names and categories. MonitorPanels and ShipmentTabs both derive from it. Changing a label in one place updates both.

### Backlog Updates
- **New status system**: Not Started (ungroomed), Needs Spec (groomed), In Progress (specced/dev), Completed, Done - To Validate
- **3 new epics** (SHP-55 through SHP-65):
  - **Supabase Database** (SHP-55–58): schema design, seed from generator, data layer migration, real-time CRUD
  - **Migration & Deployment** (SHP-59–60): Vercel deployment, auth & environment config
  - **Design System Sync** (SHP-61–65): Figma component library, token sync workflow, Code Connect, UI normalization, cross-domain token sharing
- Backlog HTML updated: new epics, green "Done - To Validate" badge, "Completed" replaces "Done"

### Design System Sync (Epic Started)

#### Playground & Visualization
- Created `playground/` directory for design system planning and visualization
- Built `playground/DesignSystemMap.html` — 5 tabs:
  - **Badges** — audit of every badge-like element, ad-hoc vs component, with exact rendered styles
  - **Colors** — all tokens (primitives, semantic, component) + hardcoded color audit
  - **Typography** — type scale from design.md + inline/hardcoded font audit across all components
  - **Components** — normalized component library (Badge with all variants/props)
  - **Normalize** — right-aligned process tab, activates with pulsing animation during `/normalize` routine, deactivates after completion

#### Figma Integration
- Pushed to Figma (`UT9nTpl6FNpqmyNcX9AsuK`):
  - **104 color variables** in 3 collections (Primitives: 28, Semantic: 22, Component: 54)
  - **10 text styles** grouped by size (text-xs/, text-sm/, text-base/, text-lg/)
  - **6 radius variables** (sm: 4px, md: 6px, lg: 8px, xl: 16px, pill: 10px, full: 9999px)
- Shadows and transitions not pushed (shadows will come from Figma later, transitions are code-only)

#### Token Updates
- Added `--badge-gray-bg` / `--badge-gray-text` tokens (design.md, tokens.css, Badge.jsx, Figma)
- Added `--btn-primary-hover` to design.md (already existed in tokens.css)
- Added `@keyframes pulse` animation to tokens.css

#### Badge Component Normalization (First `/normalize` Run)
- **Badge.jsx rewritten**:
  - `icon` prop — always renders right side; gray variant icon uses `--text-tertiary`, all others inherit text color
  - `statusDot` prop — animated 6x6 circle on left side, 2px extra margin-right (6px total gap to text)
  - Padding logic: no icon/dot → `2px 10px`; icon only → `2px 8px 2px 10px`; dot only → `2px 10px`; dot+icon → `2px 8px`
  - `display: inline-flex` with `align-items: center`, `gap: 4px`
- **ShipmentTable.jsx** — status badge updated: `icon={<Info size={16} />}` prop instead of ad-hoc child with inline styling
- **`.text-badge`** composite CSS utility created in components.css (12px / 16px / 500) — Badge.jsx uses `className="text-badge"` instead of inline font styles
- Badge component rules documented in design.md

### Workflow Tooling
- **`/normalize` skill** — 8-step Figma component intake routine:
  1. Pull from Figma (icons → Lucide mapping)
  2. Token validation (BLOCKING — flags unknown values)
  3. Component classification & PascalCase naming enforcement
  4. Compare Figma vs Code (side-by-side diff)
  5. Playground preview (Normalize tab with animation)
  6. User approval
  7. Implement (component + composite text utilities + color convention)
  8. Sync back (design.md, Figma, tracker, pending sync list)
- **`/wrap` skill** — end-of-session routine (summarize, update progress.md, git commit + push)
- **`playground/figma-component-routine.md`** — full routine spec with all edge cases
- **`playground/normalization-tracker.md`** — tracks normalized components, composite text utilities, ad-hoc implementations, pending Figma sync items

### New Files
| File | Purpose |
|------|---------|
| `src/data/panelConfig.js` | Single source of truth for panel/category config |
| `playground/DesignSystemMap.html` | Design system visualization (5 tabs) |
| `playground/figma-component-routine.md` | `/normalize` routine spec |
| `playground/normalization-tracker.md` | Normalization tracking + purge safety |
| `.claude/skills/normalize/SKILL.md` | `/normalize` slash command |
| `.claude/skills/wrap/SKILL.md` | `/wrap` slash command |

---

## Current State (as of April 20, 2026 — End of Session 11)

### Performance Architecture
- **1200 shipments**, seed 42, fully reproducible
- **Virtualized table** — `react-window` `List`, only ~20 rows in DOM regardless of data size
- **Per-shipment detail files** — 1200 individual JSON files in `public/details/` (~30KB each), fetched on demand via `fetch()` with LRU cache (50 entries)
- **Pre-built filter indexes** — `Map.groupBy` for O(1) panel/category lookups
- **React.memo** on 13 components to prevent cascade re-renders
- **Two-panel table layout** — scrollable data columns (left) + fixed actions column (right) with synced vertical scroll
- `shipments.json` (1.0MB) statically imported; old 21MB monolith eliminated

### Design System
- **Figma file**: `UT9nTpl6FNpqmyNcX9AsuK` (Components Buffer) — 104 color vars, 10 text styles, 6 radius vars
- **Token tiers**: Primitives (28 colors) → Semantic (22) → Component (54 + badge gray)
- **Normalized components**: Badge (icon, statusDot, padding rules, `.text-badge` utility)
- **Ad-hoc components pending normalization**: StatusBadge, TypeBadge, HazmatTag, Appointment badge, History badges, Cost tabs, Tab counts, Notification circle
- **Pending Figma sync**: Badge statusDot, icon prop, padding rules (deferred)
- **Playground**: `DesignSystemMap.html` with Badges/Colors/Typography/Components/Normalize tabs

### Deployment
- **Vercel production**: `odyssey-shipments.vercel.app`
- Manual deploy via `npx vercel --prod` (GitHub auto-deploy not connected)

### Workflow
- `/normalize` routine established for Figma → Code component alignment
- `/wrap` routine established for end-of-session
- Normalization tracker in place for purge safety

---

## Session 11 — April 20, 2026

### Gateway Knowledge Integration
- Analyzed `Gateway_Project_Overview.md` — cross-referenced 4 integration flows, 47 customer gateways, and 8+ wire formats against our domain analysis
- Created `shipments-documentation/Documentation/Other-Insights/Gateway_Insights_for_Shipments.md` — separated analysis file covering:
  - 4 integration flows mapped to our shipment lifecycle (Order in, Shipment out, PGI in, Accrual out)
  - PGI complexity context (~100+ format variants — explains why PGI Errors are structurally common)
  - Customer format diversity (SAP IDoc, EDIFACT, CIDX, X12, flat files — all normalized by Gateway before reaching TMS)
  - Confirmed facts already in domain analysis (5 modes, accrual no-UI, billing separate, buy+sell simultaneous, 3 panels)
  - Parked backend-only details (DOCTYPE codes, JMS routing, XSLT chains, SCAC logic, VSBED mappings)
- Kept `shipments-domain-analysis.md` clean as single source of truth — Gateway knowledge lives in `Other-Insights/`, promotable when confirmed via grooming

### Vercel Deployment
- Deployed to Vercel production: `odyssey-shipments.vercel.app`
- Direct upload deploy (GitHub auto-deploy not connected — requires org OAuth that could trigger IT)
- Manual redeploy workflow: `npx vercel --prod` from project directory (~1 min)

### Context for Future Sessions
- Home dashboard coming soon — landing page leading users to different domains (Shipments, etc.)
- Gateway project is a parallel engineering effort (AI-assisted migration of 47 customer gateways from Sterling to Boomi) — `Gateway_Project_Overview.md` will evolve as more insights are gathered

### New Files
| File | Purpose |
|------|---------|
| `shipments-documentation/Documentation/Other-Insights/Gateway_Insights_for_Shipments.md` | Gateway analysis filtered for Shipments relevance |

---

## Session 12 — April 23, 2026

Admin + scoping session after a pause on the design system epic. No feature code shipped — focus was reconciling the backlog with current reality and mapping the boundaries of Figma push-back before committing to a normalization scope.

### Backlog Housekeeping (`backlog.html`)
- **David's feedback stories approved** — SHP-43 through SHP-53 moved from "Done - To Validate" to **Completed**. Added as a new Session 9 block in the completed work table.
- **SHP-54 (Hazmat merge)** stays **Done - To Validate** pending stakeholder decision.
- **SHP-59 Vercel deployment** → **Completed** (odyssey-shipments.vercel.app, manual `npx vercel --prod`). `done-group` class applied for green row.
- **SHP-60 Auth & env config** → **Halted** — requires Odyssey infrastructure team (SSO/CloudFront/S3). Not worth pursuing right now. Revisit when real deployment pipeline becomes a priority.
- **SHP-66 Windows VM setup** — new entry. **Done - To Validate**. Auxiliary deployment path used when org network/firewall blocks Vercel for internal stakeholders.
- **SHP-55 Supabase schema** → **In Progress**.
- **SHP-61 Figma component library, SHP-62 Token sync workflow, SHP-64 UI normalization pass** → **In Progress** (backed by `/normalize` skill + playground + tracker).
- Subtitle date refreshed.

### Normalization State Review
Confirmed where we left off after the long pause:
- **Normalized (1):** `Badge` — `icon`, `statusDot` props, asymmetric padding, `text-badge` utility.
- **Pending normalization (8 components):** `StatusBadge`, `TypeBadge`, `HazmatTag`, inline Hazmat in `ShipmentTable`, Appointment badge, History action badges, Cost order tabs, Tab count pills, Notification circle.
- **Pending Figma sync:** Badge `statusDot`, `icon` prop, padding rules (deferred 2026-04-15).

### `/normalize` Gap Identified
Badge uses `borderRadius: 'var(--radius-sm)'` (4px) in React but the Figma Badge has no border-radius applied. This surfaces in Step 4's diff but Step 8 ("Sync Back") only prescribes code→Figma for *new variants/props* via the Pending Figma Sync list — **not for base style properties**. Border-radius should be treated as a pending Figma sync item.

### Push-Back to Figma — Scoping
Mapped boundaries of `mcp__claude_ai_Figma__use_figma` (runs JS via Plugin API, 50,000-char payload, one fileKey per call, no undo):

- **✅ Easy in one push:** token binding (fills, strokes, radius, padding, gap), boolean component properties, variant matrices (State × Type), descriptions.
- **⚠️ Gotchas:** instance-swap for icons needs the icon to exist as a component first (Lucide needs importing separately); fonts need `loadFontAsync`; auto-layout adds boilerplate.
- **❌ Avoid:** real interactive prototype reactions (use variants instead), bulk icon imports, cross-file operations.

**Recommended scope split for `/normalize`:** Light sync (rebind tokens + new boolean props) vs Heavy sync (full variant matrix + instance swaps + auto-layout).

**Pilot plan:** Badge — rebind `cornerRadius` to `--radius-sm`, add `hasStatusDot`/`hasIcon` boolean props, add placeholder instance-swap `icon` slot. Validates single-push workflow before scaling to Button (badges + state variants).

---

## What's Next

### Session 13 Priorities
1. **Patch `/normalize` skill** — Step 4 diff gets a "Direction to resolve" column (Figma→Code, Code→Figma, Intentional); Step 8's Pending Figma Sync list explicitly admits base properties, not just new variants.
2. **Run the Badge pilot push-back** — rebinds radius, adds boolean props, adds placeholder icon slot. Validates workflow before scaling.
3. **Resume normalization** — `HazmatTag` + inline `ShipmentTable` Hazmat are the lowest-friction next pickups (map cleanly to existing `Badge variant="amber" icon={...}`).
4. **Supabase schema (SHP-55)** — continue schema design.
5. **Home dashboard** — still on the horizon as new scope.

### Stories Ready for Spec (SHP-19 decomposed)

| ID | Task | Size | Notes |
|---|---|---|---|
| SHP-39 | Filter attributes expansion | L | Add ~40 attributes from CSV, split into normal + extended panel. |
| SHP-40 | Saved search profiles (CRUD) | M | Create, save, manage, apply — similar pattern to column arrangement presets |
| SHP-41 | Filter panel UI styling | M | Update dropdowns, calendars, inputs to match login.html design system |
| SHP-42 | Saved query behavior fix | S | Filters layer on top of search text, not replace it |

### Pending Stakeholder Approval
- **SHP-54** — Hazmat Class/Group merged into Hazardous badge tooltip (DEC-39). Roll back if not approved.

### Open Questions
- **Ask Jana:** When is "Sent" tender status shown to users? (Blocks SHP-39 filter options)

### Session 9 Stories — David's Feedback (April 13, 2026)

| ID | Task | Status |
|---|---|---|
| SHP-43 | Hazmat badge visual | **Validate** |
| SHP-44 | Column auto-fit, header wrapping, manual resize | **Validate** |
| SHP-45 | Cost visibility from tender tab | **Validate** |
| SHP-46 | Product tab table styling overhaul | **Validate** |
| SHP-47 | Panel-aware column presets | **Validate** |
| SHP-48 | Date-only display with time-on-hover | **Validate** |
| SHP-49 | Rename "Sent" → "Tender Sent" | **Validate** |
| SHP-50 | Order tab layout overhaul | **Validate** |
| SHP-51 | Tender tab — remove TenderSummary | **Validate** |
| SHP-52 | Order # column deprioritized | **Validate** |
| SHP-53 | Tender collapse animated + default collapsed | **Validate** |
| SHP-54 | Merge Hazmat Class/Group into badge tooltip | **Validate** (pending approval) |

### Session 7 Stories — All Complete

| ID | Task | Status |
|---|---|---|
| SHP-21 | Tender tab rebuild | **Done** |
| SHP-23 | Equipment column fix | **Done** |
| SHP-24 | Three-dot menu + highlight + clipping | **Done** |
| SHP-25 | Panel assignment from tender outcome | **Done** |
| SHP-26 | Shipment status tooltip | **Done** |
| SHP-27 | Validation message column | **Done** |
| SHP-28 | Restore 15-column preset | **Done** |
| SHP-29 | Quote modal (add/edit/view) | **Done** |
| SHP-30 | Collapsible columns (proportional) | **Done** |
| SHP-31 | View Full Details modal cleanup | **Done** |
| SHP-32 | TL/LTL modes (then restored all 5) | **Done** |
| SHP-18 | Column arrangement panel | **Done** |

### Session 8 Stories — April 7, 2026 (73 commits)

| ID | Task | Status |
|---|---|---|
| SHP-34 | Performance optimization (virtualization, split details, memoization, indexes) | **Done** |
| SHP-33 | Temporary search column promotion | **Done** |
| SHP-35 | Button components (PrimaryButton, SecondaryButton) | **Done** |
| SHP-36 | Filter panel redesign (header, pill tabs, click-outside close, stay open on apply) | **Done** |
| SHP-37 | Search bar UX (no spellcheck, blur on clear, relevance sort, chip-driven column) | **Done** |
| SHP-38 | Shipments table UX (Zap icon, row highlight on menu, auto-scroll, metrics auto-collapse) | **Done** |

### Remaining Backlog

| ID | Task | Size | Status |
|---|---|---|---|
| SHP-9.3 | Stops tab compact layout | M | Halted |
| SHP-11 | Multi-customer shipments | M | Halted |
| — | PGI/PGR implementation | L | Placeholder only |
| — | Edit screen (by-shipment editing) | L | Deferred, not designed |
| — | Column arrangement for tender routing table | S | Cog placed, not wired |
| — | Web interface guidelines audit items | M | Focus states, aria-labels, prefers-reduced-motion |

---

## Session 7 — April 6, 2026

### SHP-21: Tender Tab Rebuild (Proper Spec Workflow)

Went back to the proper brainstorm → spec → plan → implement workflow after Session 6 rushed this feature.

#### Brainstorming Decisions
- **Summary Header**: Merged CompactSummary + FullSummary into single TenderSummary component. Compact always visible, full detail in modal via "View Full Details" button
- **Tender Actions**: Moved from standalone action bars to contextual 3-dot menu per carrier row (same UX pattern as shipments table). Actions contextual to tender status:
  - null → Tender | Sent → Accept, Decline, Cancel | Accepted → Cancel | Declined/Cancelled → Re-Tender
- **CTAs not colored**: Neutral/outlined style only — color language reserved for status badges
- **Badge updates**: Real-time status badge update on action + cascade simulation (Decline/Cancel auto-tenders next null carrier)
- **Row interaction**: Removed radio buttons, row highlights on 3-dot click, deselectable
- **Add Quote**: Table-level button next to sub-tabs (trailing right)
- **No fullscreen gating**: All content available in collapsed/partial/fullscreen states

#### Implemented Changes

| Component | What Changed |
|---|---|
| **Generator** | Added 25 new fields per carrier option (55 total): routing options (3), notify/response (3), volume commitment (6), additional info (8), others (8). VC fields sum to commitment. |
| **RoutingGuideTab.jsx** | Full rewrite (~790 lines). TenderSummary, TenderDetailModal, ActionDropdown, RoutingTable, RoutingSubTabs. Cascade tendering. No radio buttons. |
| **BottomBar.jsx** | Removed isFullscreen prop from RoutingGuideTab render |

#### Font Sizes Restored
- th: 12px (was 11px), td: 14px (was 12px), padding: 10px 14px (was 6px 10px)

#### New Documentation
- `docs/superpowers/specs/2026-04-06-shp21-tender-tab-design.md` — Full spec with 45 functional requirements, 9 edge cases, interaction state machines
- `docs/superpowers/plans/2026-04-06-shp21-tender-tab.md` — 8-task implementation plan

### Apr 6 Grooming with Jana — 10 New Stories

Analyzed full grooming transcript (`0406-Shipment-grooming-Jana.vtt`). Key decisions:

#### Corrections
- **Equipment column** was showing rate data (`dataKey: 'rate'` bug) — fixed
- **Three-dot menu**: removed "Buy Shipment", renamed to just "Edit" + "Tender by Preferred Carrier"
- **Panel assignment** must derive from tender outcome, not random: Accepted/Sent → Monitoring, all failed → Exceptions
- **No "Done" in Exceptions**, no "Accepted/Sent" in Exceptions routing table
- **Declined badge** changed from yellow to red

#### New Requirements from Jana
- **Validation Message column** for Exceptions (category-specific messages like "Pickup date missing")
- **Tender status tooltip** on shipment status badge hover (no new column needed)
- **Add Quote / Edit Quote / Show Rate Details** — one modal, three modes, with SCAC dropdown, rate breakdown, live AP/AR totals
- **Rate details per carrier** in generator for cost consistency
- **More columns** in main table: restored to 15-column default preset
- **Only TL/LTL for demo** (later restored all 5 modes at 40/40/10/5/5 distribution)

### Session 7 Continued — UI Polish & Features

#### SHP-18: Column Arrangement Panel
- Two-level panel: presets list → drag-to-reorder column arrangement
- 4 presets: Default, Logistics View, Financial View, Carrier View
- Checkbox toggle + HTML5 drag-and-drop, real-time table updates
- 44 attributes from CSV available

#### SHP-29: Quote Modal
- Add Quote (empty form), Edit Quote (pre-filled), Show Rate Details (read-only)
- SCAC dropdown with auto-populated carrier name
- Base rate, markup, additional charges table with add/delete rows
- Live AP/AR total calculation
- On save: updates routing table data

#### SHP-30: Proportional Column Collapse
- 3-part table layout: fixed left | collapse toggle | scrollable right
- Proportional algorithm: measures actual widths, scales collapsible columns to exact fit
- No per-tab rules — one algorithm adapts to any column count
- Collapse button with hover effect, shows only when right table overflows >40%

#### UI Polish
- Navbar: embedded SVG logo, ⌘K badge, Figma-matched colors
- Sidebar: truck icon active, removed O logo, proper height
- Filter panel: grouped dropdowns (Location, Status, Carrier, Date Range)
- Monitor panels: instant 50% opacity on unselected, softer borders
- Review badge: darker gray
- Export tooltip: text-wrap pretty, narrower width
- Loading spinner for lazy-loaded tabs
- Table header heights fixed at 48px
- Actions column: 50px fixed width, no stretch

#### Data
- Increased to 700 shipments for demo
- Full audit: 26/26 checks pass
- Monitoring categories assigned for real badge counts
