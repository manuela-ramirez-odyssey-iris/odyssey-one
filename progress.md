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

## Current State

### Data Generator
- 200 shipments, seed 42, fully reproducible
- 5 modes (TL, LTL, RR, IMD, AIR) with weighted distribution
- 4 tender statuses (Sent, Accepted, Declined, Cancelled)
- 2 shipment statuses (Review, Done) driven by tender status mapping
- Panel/category assignment (exceptions ~40%, monitoring ~40%, pgipgr ~20%)
- Full product fields including ~10 hazmat-specific fields with real UN numbers
- Sequential tender logic, weight-based cost distribution, per-order unique data

### UI
- Three-panel navigation (Exceptions, Monitoring, PGI/PGR) with panel-based filtering
- Tab-based row filtering in Exceptions and Monitoring
- PGI/PGR "Coming soon" placeholder
- Shipment status column in main table
- Tender tab works correctly in both panels (same component, data-driven statuses)
- Three-dot menu: Buy Shipment, Edit, Tender by Preferred Carrier

### Documentation
- Domain analysis fully updated with Apr 1 corrections and conceptual explanations
- Decision log with 27 traced decisions
- Visual backlog HTML for stakeholder sharing
- Cross-cutting filtering vs. column visibility rules documented

---

## What's Next

### Prioritized Backlog (all need spec before implementation)

| Priority | ID | Task | Size |
|----------|----|------|------|
| **3 — Column Arrangement** | SHP-18 | Column Arrangement panel redesign — presets → draggable column list, locked columns, saveable profiles | L |
| **4 — Tender Summary** | SHP-21 | Tender summary header — shipment context on selection (Buy/Sell IDs, mode, weight, addresses). Shared in both panels. From PPT Slide 4. | M |
| **5 — Search & Filtering** | SHP-19 | Search & filtering expansion — 15→45 attributes, filter panel syncs with visible columns, "More filters", full filter layering. Dependent on data + column arrangement. | L |
| **6 — Halted** | SHP-9.3 | Stops tab compact layout | M |
| | SHP-11 | Multi-customer shipments in generator | M |

### Pending Input
- Search bar grooming transcript still to be provided
- Jana confirmation needed on: which actions appear in three-dot menu per panel edge cases, equipment codes for RR/IMD/AIR modes

### Next Session Plan
1. Spec SHP-18 (Column Arrangement) — largest remaining item
2. Spec SHP-21 (Tender Summary Header)
3. Begin implementation
