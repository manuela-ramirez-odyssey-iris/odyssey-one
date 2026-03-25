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

## What's Next (March 25)

### Tier 1 — Ready to build
- **Table tabs**: Review and implement tab functionality for shipment table views
- **AP/AR Costs columns**: Not just two columns — need to expand cost-related columns in the shipments table
- ColumnPanel functionality (checkbox list to toggle table column visibility)

### Tier 2 — Polish
- Responsive design (Tailwind breakpoints for panels, search bar, bottom bar)
- Keyboard shortcuts (Escape to close panels/bottom bar)
- Web Interface Guidelines fixes (accessibility, focus states, virtualization)

### Tier 3 — Future
- Saved search CRUD (create/edit/delete profiles, localStorage persistence)
- Error boundaries
- Testing (unit + integration)
- Deployment setup
