# Decision Log — Shipments Domain

Every implemented decision with its previous state, source, and rationale. This is the traceability record for the prototype.

---

## Naming & Terminology

### DEC-01: "Routing Guide" → "Tender"
- **Previous:** Tab and internal references called "Routing Guide" / "Routing Options"
- **Decision:** Rename to "Tender" in all display text
- **Source:** Jana, Mar 25 ("Should we want to have routing guide or tender screen tender?") → confirmed Mar 30 ("Everywhere it is going to be tender.")
- **Implemented:** Session 4 — display text updated, internal keys (`routing`, `RoutingGuideTab.jsx`) preserved
- **Why:** "Routing Guide" is a backend/system concept. Users think in terms of tendering — offering freight to carriers. Jana wanted user-facing language.

### DEC-02: Stop labels "Stop 1/2/3" → "P1/P2/D1/D2"
- **Previous:** Generic "Stop 1", "Stop 2", "Stop 3" labels
- **Decision:** Use P (Pickup) and D (Delivery) prefixes with sequential numbers
- **Source:** David, Mar 25 ("Use P1/P2/D1/D2 convention")
- **Implemented:** Session 4 — labels, circle nodes, and side labels updated

### DEC-03: "Pending" tender status → "Sent"
- **Previous:** Generator used "Pending" as a tender status
- **Decision:** Replace with "Sent" — 5 statuses are Sent, Accepted, Declined, Rejected, Cancelled
- **Source:** Jana, Mar 25 (defined 5 statuses explicitly)
- **Implemented:** Session 4 — generator `ROUTING_STATUSES` updated, data regenerated

---

## Layout & Display

### DEC-04: AP/AR toggle tabs → Stacked layout
- **Previous:** AP and AR shown in separate toggle tabs (user switches between them)
- **Decision:** Stack AP table on top, AR table below — both visible simultaneously
- **Source:** Manuela proposed (Mar 30), Jana confirmed ("It will be better for them to see both at the same time" — Mar 23)
- **Implemented:** Session 3 — component rewritten, toggle tabs removed
- **Why:** With order count limited, vertical space is sufficient. Side-by-side comparison is more valuable than toggling.

### DEC-05: Products tab default collapsed → Default expanded
- **Previous:** Order groups in Products tab started collapsed
- **Decision:** All order groups start expanded; users can collapse with minus signs
- **Source:** David, Mar 25 ("When it's closed, it doesn't have any value") → Jana confirmed Mar 30 ("Start expanded, leave them with minus signs")
- **Implemented:** Session 3 — useEffect re-expands on shipment change

### DEC-06: Tab reorder
- **Previous:** Order, Stops, Product, Routing Guide, Cost Allocation, Instructions, Documents, Notes, History, Tender History
- **Decision:** Order → Product → **Stops** → Tender → Cost Allocation → Instructions → Documents → Notes → Tender History → History
- **Source:** David, Mar 25 ("Move [Stops] between Product and Routing Guide")
- **Implemented:** Session 3

### DEC-07: Cost distribution — Equal split → Weight-based proportional
- **Previous:** Cost components repeated identically per order (not distributed)
- **Decision:** Each order gets a proportional share of each cost component based on weight. Sum of order portions = shipment total.
- **Source:** David, Mar 25 ("If order one is 60% of the weight, then it'll represent $600 of the cost") → Jana + Manuela confirmed Mar 30
- **Implemented:** Session 3 — generator updated, random weight-based proportions

### DEC-08: Order dropdown — IDs only → IDs + route + weight
- **Previous:** Order dropdown showed only order ID badges
- **Decision:** Show badge + order ID + origin city → destination city + weight
- **Source:** David, Mar 25 ("Just looking at 4 order IDs doesn't tell me which order I want to look at")
- **Implemented:** Session 3 — data pulled from orderDetails

### DEC-09: Export modal — "all records/filtered records" → "all columns/visible columns"
- **Previous:** Export options framed as record selection
- **Decision:** Both options export same filtered records; choice is about which columns to include
- **Source:** Jana, Mar 30 (clarified: "choice is about columns, not records")
- **Implemented:** Session 3

---

## Data & Content

### DEC-10: Document types — Add POD/SL/Packing List, remove Invoice, keep Other
- **Previous:** BoL, MBoL, Invoice, Instructions, Other
- **Decision:** BoL, MBoL, POD, SL, Packing List, Other. Invoice removed, Other kept.
- **Source:** David, Mar 25 ("We would never have an invoice" + provided POD/SL/Packing List) → Jana, Mar 30 ("Other should NOT have been removed")
- **Implemented:** Session 3 (types updated), Session 4 confirmed Other kept
- **Why:** Billing is handled in a separate financial system, not in TMS. "Other" covers emails, images, misc attachments.

### DEC-11: Instruction type badges removed
- **Previous:** Each instruction had a type badge (BOL, MISC, TRA, ADC, ZD02, SPC)
- **Decision:** Remove type badges entirely — show sequence number + text only
- **Source:** David, Mar 25 ("Business pushed back — they don't use typed instructions today")
- **Implemented:** Session 5 — `TYPE_COLORS`, `TypeBadge` removed from component, `type` field removed from generator

### DEC-12: Sequential tender logic in generator
- **Previous:** All routing options had random statuses (including "Pending")
- **Decision:** Carriers tendered top-down by rank. ~85% completed (Declined/Rejected above accepted, null below), ~15% in progress (Sent as current).
- **Source:** Jana, Mar 25 (sequential tendering process described) → David, Mar 25 ("Fix demo: accepted carrier should be rank 3+")
- **Implemented:** Session 4 — generator logic rewritten

### DEC-13: Per-order unique data in generator
- **Previous:** All orders within a shipment shared the same detail data (ship from/to, dates, contacts, etc.)
- **Decision:** Each order gets unique faker-generated data
- **Source:** Identified during implementation — data was unrealistic with shared values
- **Implemented:** Session 2 — `orderDetail` (singular) → `orderDetails[]` (array)

### DEC-14: History tab — Jira-style audit timeline
- **Previous:** Placeholder text ("forget about history for now")
- **Decision:** Generate 5-12 history entries per shipment with user, timestamp, action, category, field changes
- **Source:** Jana + Manuela, Mar 30 ("Populate with Jira-style audit entries: username, date/time, change type")
- **Implemented:** Session 4 — generator produces history entries, vertical timeline with colored dots by category

### DEC-15: Compare AP/AR modal — Order tabs added
- **Previous:** Modal showed one order at a time with no switching
- **Decision:** Add order tabs inside modal (max 5). Overall margin stays visible.
- **Source:** Jana proposed dropdown, Manuela suggested tabs, Jana agreed (Mar 30)
- **Implemented:** Session 3

---

## Corrections to domain understanding

### DEC-16: Multi-customer shipments
- **Previous assumption:** Orders within a shipment share the same customer
- **Correction:** Orders from **different customers** CAN be on the same shipment
- **Source:** David, Mar 25 ("If those two orders are for two different customers, then we need to know how to charge each customer")
- **Status:** Documented. Generator update (SHP-11) halted — not active yet.

### DEC-17: Mode values
- **Previous:** FTL, LTL, INTERMODAL
- **Correction:** TL, LTL, RR, IMD, AIR
- **Source:** `Shipments-Monitoring.pptx` (PPT analysis, Mar 31)
- **Status:** Documented. Generator update pending (SHP-12).

---

## Architecture & Cross-Cutting

### DEC-18: Three panels are separate shipment pools, not views
- **Previous assumption:** All 200 shipments shown in every panel, tabs just filter
- **Decision:** Each shipment belongs to one panel (Exceptions, Monitoring, or PGI/PGR). Panels show only their shipments. Generator assigns `panel` and `category` fields.
- **Source:** Domain analysis — Jana, Mar 23 ("Exceptions = system stuck, user must act; Monitoring = system working, user watches") + Manuela, Apr 1 (confirmed during spec review)
- **Implemented:** Pending (SHP-15)

### DEC-19: Filtering vs. column visibility — three-tier rule
- **Previous:** Not addressed — filters and column arrangement designed independently
- **Decision:** Three rules:
  1. Panel/tab filtering always works, independent of column visibility (structural navigation)
  2. Filter panel defaults to visible columns only; "More filters" expands to all (user opts in)
  3. Hidden filter indicator when active filters reference non-visible columns
- **Source:** Jana, Mar 25 ("Filter panel shows filters corresponding to currently visible columns") + Manuela, Apr 1 (raised concern about filter/column interaction)
- **Implemented:** Pending (affects SHP-15, SHP-16, SHP-18, SHP-19)
- **Why:** Without this rule, users could silently filter by hidden columns, causing rows to appear/disappear with no visible explanation.

### ~~DEC-20: Three-dot menu is context-aware per panel~~ — SUPERSEDED
- **Previous decision:** Menu would differ by panel (Exceptions vs Monitoring). "Replan" for Monitoring.
- **Correction:** Jana retracted "Replan" (Mar 30: "No, you forget replan. You don't put replan. Replan is going to happen from this one."). Jana confirmed (Apr 1) actions exist in both panels.
- **Current:** Same 3 actions in all panels: "Buy Shipment", "Edit", "Tender by Preferred Carrier"
- **Implemented:** Session 6 (SHP-13)

### DEC-21: Monitoring view = same screen as Exceptions (MAJOR CORRECTION)
- **Previous assumption:** Monitoring had column-group tabs (Routing Options, Notify & Response, etc.) that swapped visible columns. Tender tab was "read-only" and "observation-oriented" in Monitoring.
- **Correction:** Monitoring is EXACTLY the same screen as Exceptions. Same layout, same tender tab, same action buttons. Only differences: different high-level row-filter tabs and different tender status values appearing.
- **Source:** Jana, Apr 1 — "Both the screens are same, it's just the small details inside it is different." / "just replicate the same screen between monitoring as well as for exceptions."
- **Impact:** SHP-16 completely redefined (row filters, not column tabs). SHP-20 eliminated as separate story. DEC-19 partially invalidated (Monitoring column-group concept was wrong).

### DEC-22: Monitoring PPT slides = one table split across slides (CORRECTION)
- **Previous assumption:** PPT Slides 4-8 represented 5 separate sub-view tabs within the Monitoring tender screen
- **Correction:** The slides show the full routing options table split across multiple slides because it has too many columns to fit on one. One table, not 5 tabs.
- **Source:** Jana, Apr 1 — "It is the same thing as that. It's just the view is like halfway."

### DEC-23: Tender status values simplified to 4
- **Previous:** Sent, Accepted, Declined, Rejected, Cancelled (5 values)
- **Decision:** Sent, Accepted, Declined, Cancelled (4 values). "Rejected" removed — "Declined" covers that case.
- **Source:** Jana, Apr 1

### DEC-24: Shipment status values corrected
- **Previous:** Tender, In Transit, Delivered, Booked
- **Decision:** Review, Done (for design phase). Full state machine later.
- **Source:** Jana, Apr 1 — "when it is canceled, it should be review" / Accepted → Done

### DEC-25: Tender status drives shipment status (NEW)
- **Decision:** Accepted→Done, Cancelled→Review, Declined→Review, Sent→blank
- **Source:** Jana, Apr 1 — "The tender status drives the shipment status."

### DEC-26: Actions available in BOTH Exceptions and Monitoring
- **Previous assumption:** Monitoring was observation-only, no actions
- **Correction:** Actions (Tender, Re-Tender, Accept, Decline, Cancel) are available in both. What the user acts on differs by context.
- **Source:** Jana, Apr 1 — "Actions are still required, but what they are going to act will be different."

### DEC-27: Shipment status column added to main grid
- **Previous:** Main grid did not show shipment status
- **Decision:** Add shipment status as a visible column in the main table
- **Source:** Jana, Apr 1 — "we should add status of the shipment here... in the table"

---

## David's Feedback Review (Apr 9 Grooming)

### DEC-28: Hazmat display — yellow badge when true, "--" when false
- **Previous:** "Yes" (red badge) / "No" (neutral badge) text in Product tab; "Y/N" column in shipments table
- **Decision:** Yellow badge with warning triangle icon + "Hazmat" text when true; "--" when false. Shipments table column renamed "Hazardous(Y/N)" → "Hazardous"
- **Source:** David, Apr 9 ("would an image work better than Yes value?") → Jana: "a triangle, warning triangle" → Manuela confirmed, Apr 13

### DEC-29: Column headers wrap vertically, content truncates with "..."
- **Previous:** Fixed column widths with `whiteSpace: nowrap` on headers and cells
- **Decision:** Headers wrap words vertically (stacked) to stay compact. Content cells truncate with "..." when clipped. Auto-fit default width = header width + ~20-30% buffer.
- **Source:** David, Apr 9 ("Is there a way for a user to change column width?") → Jana: auto-adjust → Manuela designed full behavior, Apr 13

### DEC-30: Truncation tooltip only if 2+ words hidden
- **Previous:** No truncation tooltips existed
- **Decision:** Show "..." always when content is clipped, but hover tooltip only appears if more than 2 words are truncated. Avoids tooltip spam for minor clipping.
- **Source:** Manuela, Apr 13 brainstorm

### DEC-31: AP cost in routing table → hover tooltip with summary
- **Previous:** AP cost cell in routing table was plain text, not interactive
- **Decision:** Hover shows compact tooltip (AP Total, AR Total, Margin amount + %). "View Details" link opens existing Show Rate Details modal (SHP-29).
- **Source:** Manuela proposed, Jana agreed, Apr 9

### DEC-32: Cost data available from "Sent" status onward
- **Previous assumption:** Cost Allocation only populated after carrier acceptance
- **Correction:** AP and AR costs populate during tendering evaluation (rating service called at send). Available from "Sent" onward.
- **Source:** Jana, Apr 9 — "after you send, that is when you call the rating service"

### DEC-33: Panel-aware column presets (Exceptions vs Monitoring)
- **Previous:** Same column preset regardless of panel
- **Decision:** Switching panels auto-applies a default column profile. Exceptions shows Message/Validation Message columns; Monitoring hides them. User manual customization takes priority.
- **Source:** David, Apr 9 ("Message is meaningless if I go to monitoring tabs") → Manuela proposed two profiles → Jana + David confirmed

### DEC-34: Dates show date-only in table, time on hover
- **Previous:** Dates displayed as raw "MM/DD/YYYY HH:MM TZ" format
- **Decision:** Show date only in table cells. Hover tooltip shows full date + time.
- **Source:** David, Apr 9 ("the date is important, the time is not" / "time is just a made-up time by the system") → Jana + Manuela confirmed
- **Why:** Saves column width. Time is system-generated and only meaningful for appointments.

### DEC-35: "Sent" → "Tender Sent" in Monitoring panel tab
- **Previous:** Monitoring panel tab labeled "Sent"
- **Decision:** Rename to "Tender Sent" for clarity. Tender status badge values stay as "Sent" (already in tender context).
- **Source:** David, Apr 9 ("what sent? We send data, we send to the customer, we send to the carrier") → Jana confirmed

### DEC-36: Order tab section reorder + dates merged into locations
- **Previous:** Row 1: General | Req. Transportation | Ship From | Ship To. Row 2: Schedule | Products Info | Totals | Incoterms
- **Decision:** General → Totals (promoted) → Ship From + pickup dates → Ship To + delivery dates → Req. Transportation (demoted). Add appointment checkbox (display-only) under pickup/delivery dates.
- **Source:** David, Apr 9 — "by the time we have a shipment, we're not concerned about requested mode" / "the pickup dates associated with the ship from, delivery dates with the ship to" / appointment checkbox clarified as display-only
- **Why:** Totals help users assess borderline LTL/TL. Dates logically belong with their location. Requested Transportation is less relevant at shipment stage.

### DEC-37: TenderSummary card removed, "View Shipment Details" button kept
- **Previous:** 4-column TenderSummary card showing shipment context above routing table
- **Decision:** Remove TenderSummary card entirely. Rename button "View Full Details" → "View Shipment Details". Relocate to left side of "Add Quote" in tender sub-tab action row. TenderDetailModal still accessible.
- **Source:** David, Apr 9 ("redundant, all displayed elsewhere" / "We're replacing TMS for a reason") → Jana: "we can remove it, keep the button" → Manuela: button placement and naming, Apr 13

### DEC-38: Order # column moved to far right in default preset
- **Previous:** Order # at position 4 in default column preset
- **Decision:** Move to position ~12-13 (after operational columns)
- **Source:** David, Apr 9 — "I would move order number to the far right. I don't think people care about that. That's just a number."

### DEC-39: Merge Hazmat Class + Hazmat Group into Hazardous column (PENDING STAKEHOLDER APPROVAL)
- **Previous:** Product tab has 3 separate columns: Hazardous, Hazmat Class, Hazmat Group
- **Decision:** Merge Hazmat Class and Hazmat Group into the Hazardous column. Info shows on hover tooltip over the hazmat badge. Removes 2 columns from the product table.
- **Source:** Manuela, Apr 13 — "we can actually merge these"
- **Status:** PENDING — roll back if stakeholders don't approve. Original columns: `hazmatClass` (label: "Hazmat Class"), `hazmatGroup` (label: "Hazmat Group") in COLUMNS array of ProductTab.jsx

### DEC-40: Orders tab rebuilt to mirror Order Creation (SubAccordion sections)
- **Previous:** OrderTab = 4-column grid of sections (General, Transportation, Ship From/To, Schedule, Products, Totals, References, Contacts)
- **Decision:** Replace entirely with the Order-Creation visual language: order-number underline Tabs + Expand/Collapse All + 4 SubAccordion cards (General Information / Pickup and Delivery / Product Information 🚧 dimmed per wireframe / Special Services) on the bar's DSN/100 canvas. Fields without a data equivalent render `--`.
- **Source:** Manuela, Jul 5 (S79) — business ask "same visuals as order creation"; Figma `x38TOJGsNryYl3LsKhCtSc` frame `1210:36974` + `vault-sources` mock OrdersTab.png

### DEC-41: ShipmentsBar expanded shadow → new `--shadow-up-lg` token
- **Previous:** `--shadow-up-md` (0 -4 16 8%)
- **Decision:** New token `--shadow-up-lg: 0 -5px 30px rgba(0,0,0,.2)` (blur 30 per the wireframe's raw effect — an earlier intake read of 15 was corrected against the Plugin-API effects). Figma effect style `shadow/up-lg` created + bound on the ShipmentsBar master Expanded variant. ShipmentsBar demoted to NORMALIZING in both DSMs (modification rule).
- **Source:** Manuela, Jul 5 (S79) — "new drop-shadow up lg for the ShipmentsBar"; raw effect on wireframe node `1210:38232`

### DEC-42: TabArrangement button opens a real tab-order panel
- **Previous:** ShipmentsBar's TabArrangement button opened the table's Column Arrangement panel (cross-concern hack, S77)
- **Decision:** New `TabArrangementPanel` (RightPanel shell, ColumnPanel's arrangement UX: reorder + show/hide + draft Save/Cancel). Orders tab pinned first/non-removable. Route state only; filters/columns/tabs panels mutually exclusive.
- **Source:** Manuela, Jul 5 (S79) — "works exactly the same as in the main table but by arranging the tab order"

### DEC-43: Row-selection radio dots removed
- **Previous:** Decorative radio-dot column (non-interactive spans; row click did the selecting since S-earlier)
- **Decision:** Column deleted; row click remains the selection affordance.
- **Source:** Manuela, Jul 5 (S79) — "having them for selecting rows is not a good ux pattern"

### DEC-44: GlobalSearch replaces the table search bar
- **Previous:** Two parallel searches — navbar GlobalSearch (results preview) + table-level search box feeding `listParams.searchTerm`
- **Decision:** Table search box hidden (TableControls keeps counter/sort/export); the navbar GlobalSearch query now feeds the same debounced `searchTerm` pipeline. Chips keep their existing preview behavior (not mapped to table filters yet).
- **Source:** Manuela, Jul 5 (S79) — "hide the old table searchbar and lets use global search component functionality"

### DEC-45: Hand-rolled tooltips → normalized Tooltip (+ app-local TooltipTrigger)
- **Previous:** DarkTooltip + OrdersTooltip + TruncatedText hand-rolled hover cards; Tooltip (normalized S70) had zero consumers
- **Decision:** One app-local `TooltipTrigger` hover/focus wrapper portals the `@odyssey/ui` Tooltip card (dates use badgeVariant="time"). DarkTooltip deleted. Sites: tender status, pickup/delivery dates, orders hover, truncated text, Export button.
- **Source:** Manuela, Jul 5 (S79) — "use our new Tooltip component to replace the old tooltips"

### DEC-46: Table control icons standardized on Button variant="icon"
- **Previous:** Sort + column-arrangement header buttons hand-rolled (no hover/proper color); row actions used lucide `zap`
- **Decision:** Sort and column-arrangement become `Button variant="icon" size="sm"` (proper color/hover/focus); row-actions icon → `ellipsis-vertical`.
- **Source:** Manuela, Jul 5 (S79) — "sort button is supposed to be icon button" / "use vertical 3 dots instead of lucide-zap"

### DEC-47: Sidebar-shift glitch root cause — AppShell wrapper overflow-clip
- **Previous:** Selecting a second row could horizontally scroll AppShell's `overflow-hidden` wrapper (the selected row's `scrollIntoView` walks scrollable ancestors; `overflow:hidden` boxes are programmatically scrollable) → sidebar pushed off-screen 96px
- **Decision:** Wrapper → `overflow-clip` (not a scroll container; renders identically). Row auto-scroll on `<main>` preserved.
- **Source:** Manuela's bug report, Jul 5 (S79); DOM-evidence diagnosis (wrapperScrollLeft 96 → 0)

### DEC-48: Pane layout system — three centered column tiers
- **Previous:** Each bar tab pane managed its own width/padding (mostly full-bleed with negative-margin hacks); Orders column left-aligned
- **Decision:** Shared utilities (`.pane-canvas`, `.pane-col--wide|medium|narrow` = 1280/1106/760 centered, `.pane-card`, `.pane-kpis`) drive every pane. Tier per tab: Product/Tender/Documents wide · Orders/Stops/Instructions medium · Cost/Notes narrow.
- **Source:** Manuela, Jul 5 (S79b) — "orders tab content is horizontally centered"; pixel-measured from the 12 tab mocks (vault-sources 2026-07-06-tab-panes)

### DEC-49: ShipmentsBar partial/full states retired — content-proportional height
- **Previous:** Expanded = fixed 50vh
- **Decision:** Expanded height is auto (content-driven), capped at `100dvh − --bottombar-top-clearance` (146px — the page title row stays visible; Orders hits the cap, short tabs open shorter). `interpolate-size: allow-keywords` animates where supported.
- **Source:** Manuela, Jul 5 (S79b) — "no more partial and full open, it opens proportional to each tab contents… max opening covers half the Shipments header"; mock 3 measured (bar top y146)

### DEC-50: Bar shadow clipped up-only
- **Previous:** `--shadow-up-lg` blur bled sideways over the sidebar (bar looked "above" it)
- **Decision:** `clip-path: inset(-40px 0 0 0)` on the expanded bar — shadow casts upward only. Token unchanged; code-only.
- **Source:** Manuela, Jul 5 (S79b)

### DEC-51: Global search = glimpse → commit → open
- **Previous:** Typing filtered the table live (S79 wiring); results panel chips-only; match rows unclickable; "Show all N results" logged to console
- **Decision:** Typing shows a top-12 match glimpse panel only. "Show all N results" / Enter commits the query to the table filter. Clicking a match selects that shipment (bar opens with details even if the row is filtered/paginated out). Match ids display buyShipment but SELECT by sellShipment (row/detail key — plan originally said buyShipment; corrected against ground truth).
- **Source:** Manuela, Jul 5 (S79b) — "results not showing on typing but on clicking show results… top 12 matches… each row clickable opens the corresponding shipment row"

### DEC-52: DataTable footer externalized + Paginator restyle (both libraries)
- **Previous:** Paginator rendered inside the bordered table card
- **Decision:** DataTable root = transparent wrapper: bordered card (table only) + footer sibling below on canvas. Paginator: summary text left; "Rows per page" select + segmented pager right, current page filled DSN/900. Mirrored in Angular (`4bb2159`, local, PR #10 branch). DataTable + Paginator demoted to NORMALIZING in both DSMs. Figma master sync = Efrain ask.
- **Source:** Manuela, Jul 5 (S79b) + mock 1-Shipments.png

### DEC-53: Table sticky-header gap root cause
- **Previous:** Transparent strip above the sticky header when scrolled — header parked 32px too low
- **Decision:** Sticky insets resolve against the scroller's content edge; `<main>`'s 32px padding-top offset the header. `stickyTop` now accepts CSS lengths; ShipmentTable passes `calc(-1 * var(--spacing-8))`.
- **Source:** Manuela's bug report, Jul 5 (S79b); Playwright DOM-evidence diagnosis

### DEC-54: Orders tab fake data per Orders-domain canon + orphaned pane data wired
- **Previous:** Owning Organization/Equipment/Consolidatable/Special Services etc. rendered '--'; generator built documents/notes/history but never emitted them (mapper stubbed all three empty — Documents/Notes/History panes always started blank)
- **Decision:** Generator emits the canon-backed order fields (owningOrganization, consolidatable ~70%, equipmentCode, equipmentReferenceNumber ~25%, customerRequiredCarrier ~20%, pickupNumber ~60%, specialServices from the LFT/PALEXG/PJC(+INSD/APPT) pool, address2, destination contacts) + `documentList`/`noteList`/`historyList` DTO passthroughs; mapper surfaces all. Documents gain createdAt/fileSize.
- **Source:** Manuela, Jul 5 (S79b) — "wire fake data… check our orders domain, you have the jiras there"; canon citations in the intake report (LINX-8118/8126/8127/8124…, Q15/Q20/Q21 resolutions)

### DEC-55: All tab panes restyled to the redesign language (mocks 4–10, layout-only)
- **Previous:** Panes carried the pre-redesign chrome (pill sub-tabs, stacked AP/AR tables + CompareModal, toolbar-style Documents, inline-styled Notes)
- **Decision:** Stops (KPI band + timeline card) · Product (wide card + Expand All) · Tender (underline sub-tabs + primary "+ Add Quote", table on canvas; mechanics untouched) · Cost Allocation (underline tabs + KPI band + single expandable Compare AP/AR table, Diff = AR−AP computed, CompareModal deleted) · Instructions (medium card, per-order groups) · Documents (wide card, "+ Add Document", checkbox/File/Creation Time/File Size/kebab columns) · Notes (narrow card, avatar items, hover edit/delete, 200-char composer with 10-note limit). History/Tender History untouched (no mocks; Jana deprioritized). Normalization candidates listed, not built: KpiStatStrip, StopTimeline, CopyValueField, Avatar, NoteItem/NoteComposer, SummaryTotalsPanel, FieldGrid/DescriptionList, DataTable grouping/frozen-columns extensions.
- **Source:** Manuela, Jul 5 (S79b) — "do the rest of the tabs… layout guidance only… use our components; list new components"

### DEC-56: ShipmentsBar interaction model v2
- **Previous:** cap 146px; linear-ish height ease; lazy tab switch collapsed the bar to the Suspense loader and re-grew (glitch); chevrons toggled collapse (keeping selection); no outside-click close
- **Decision:** cap → 104px (`--bottombar-top-clearance`, bar top mid page-title); height animates with `--transition-drawer` (cubic-bezier 0.16,1,0.3,1); tab changes wrapped in `useTransition` (previous pane holds while the next lazy chunk loads — no collapse); the CollapseExpand action is now CLOSE (collapses + deselects the row — 'collapsed with selection' no longer exists); clicking outside the bar (or Escape) also closes+deselects, with exclusions for the bar, table rows, right panels, modals and body-portal popovers.
- **Source:** Manuela, Jul 6 (S79c) — items 1–5 of the fix list

### DEC-57: Global search is THE table search — one shared matcher, committed criteria
- **Previous:** commit sent text only (chips never left the search component; chips-only commit sent '' and CLEARED criteria → all rows); glimpse counted all panels while the table filtered the active panel; panel/category counts search-blind; SearchChipPanel row lingered above the table
- **Decision:** shared matcher module (`src/search/shipments/criteria.js`) used by both the adapter (glimpse) and gridService (table + counts). Commit payload = `{ chips, text }`; `listParams.searchCriteria`; counts are criteria-aware (invariant tested: Σ panel totals == glimpse total). SearchChipPanel row + activeChipKey plumbing removed. Bar X / panel Clear all clear committed criteria. FilterPanel drawer is now trigger-less (its opener was the removed chips row) — successor = search panel Filters view, flagged.
- **Source:** Manuela, Jul 6 (S79c) — "chips is part of the query… global search needs to be an integral part of the table search"

### DEC-58: Zero-count tabs hide under active search; a subtab is always selected
- **Decision:** while committed criteria exist, category pills/widgets with 0 hide ('All' stays); panel tabs with 0 hide EXCEPT PGI/PGR (always visible — demo). Hidden selected category → 'all'; hidden selected panel → first visible. Pills remain non-deselectable (already true; preserved through the fallbacks).
- **Source:** Manuela, Jul 6 (S79c)

### DEC-59: Customer list = first-order data scope
- **Previous:** CustomersContext (navbar popover) held 11 placeholder names (Kemira…IMCD) matching zero shipment data; selection scoped only Home widgets
- **Decision:** list = union of the 11 legacy names + the 15 data-pool customers (dedup: USALCO → USALCO_SYS_01); data-backed entries carry `dataId`. Assigned/favorites = original 3 + ERCO Systems Inc; default selected = Kemira NA/EU + Geon (legacy, 0 rows — legitimately) + ERCO (the default view shows ERCO's shipments). Selection pre-scopes gridService list + counts AND the search glimpse (`customerIds` first-order param); empty data-backed selection = honest empty table. Home consumption unchanged.
- **Source:** Manuela, Jul 6 (S79c) — "customer list is the first thing that filters data… add Erco to the assigned list"

### DEC-60: Table toolbar clamps with the header
- **Decision:** TableControls root is sticky (top −32px content-edge compensation, z 4, bg-secondary, paddingBottom instead of margin so the surface paints); DataTable stickyTop pushed down 48px (toolbar height) — toolbar + header clamp as one unit, zero seam.
- **Source:** Manuela, Jul 6 (S79c)

### DEC-61: ShipmentsBar height animation v3 — JS-measured, ratcheted, hold-on-switch
- **Previous:** `interpolate-size: allow-keywords` + `height:auto` under a `max-height` cap — broken by design: the transition's `auto` endpoint resolves to the UNCAPPED content height, so the eased value crossed the visible clamp in 1–2 frames (open slammed, close hung); data landing mid-open retargeted the running transition ("two steps"); closing unmounted content instantly (no transition)
- **Decision:** all bar motion is JS-measured length→length (pin → measure used height under the cap → animate → release to auto), next-frame start, drawer easing — works cross-browser (interpolate-size retired). Height RATCHET while open (never shrinks on tab switch; resets on close). Close keeps the last pane mounted (`inert`) while easing to 48px. Loader is a real 320px pane held ≥380ms so the content swap can't retarget mid-flight. Selected→selected shipment switches (arrows or row clicks) keep the bar open, preserve the active tab, and hold stale details until the new ones land; only null→id resets to Orders.
- **Source:** Manuela, Jul 6 (S79d) — "two steps glitched… no closing transition… maintain the bigger expansion… maintain the tab when switching shipments"

### DEC-62: Every selectable customer has data
- **Previous:** 10 legacy customers (Kemira NA/EU, Geon, Valtris, Dubois, Solenis, Etex, Monument, Grace, IMCD) existed only as popover entries — zero shipment rows
- **Decision:** pool grown 15 → 25 (KEMIRA_NA_01 'Kemira North America' etc.); 1200 shipments redistribute ~36–61/customer; all legacy context entries are data-backed via LEGacy→data id mapping (labels stay short); default selection (Kemira NA/EU, Geon, ERCO) now shows ~200 rows across panels. Synthetic c1–c3 ids retired.
- **Source:** Manuela, Jul 6 (S79d) — "make sure our database includes all customers we have available to select"

### DEC-63: Toolbar clamp matches the Orders route
- **Decision:** sticky TableControls gains 24px paddingTop (the tabs' bottom spacing absorbed, mirroring .orders-toolbar `24/0/12`); DataTable stickyTop +72px total. Both routes clamp identically at the navbar edge. Also: Compare AP/AR "Expand All" gains the ChevronsUpDown icon (parity with Orders/Product panes).
- **Source:** Manuela, Jul 6 (S79d) — "export row too tight… needs to look like orders does"; "Compare AP/AR expand collapse button missing the icon"

### DEC-64: GroupTable + SummaryStrip enter the library (staging); grouped-table boundary vs DataTable
- **Previous:** Product tab kept the old 19-col sticky-left expand-button table; Compare AP/AR + Stops/Cost KPI bands were ad-hoc app CSS (.pane-kpis)
- **Decision (owner call, Manuela):** two NEW staging components. **GroupTable** (molecule) = read-only presentational grouped table (chevron group-header rows + striped child rows + optional TOTAL footer), boundary documented both DSMs: DataTable = interactive TanStack grid, GroupTable = detail-pane presentation, no TanStack. Consumers: ProductTab (per the Product mock — square expand buttons retired) + Compare AP/AR. Figma master created (4183:773, GroupHeaderRow set 4182:787, token-bound). **SummaryStrip** (molecule) = the tab-summary band per DS master 4178:8365 — intake corrected 6 visual deltas vs our ad-hoc band (fixed 152px centered cells, 0/48 band padding, trailing divider on every cell, untracked labels, 16/24 values); .pane-kpis utilities deleted. Consumers: Stops + Cost Allocation. Both NORMALIZING; Angular twins + CC at batch close. Figma flags: the Overview master is a FRAME not COMPONENT; raw #1B2537 value fills; gradient artifact; tone axis is code-only.
- **Source:** Manuela, Jul 6 (S79e) — "it would be a new table component with collapsible rows"; Figma 4178:8365; mock Product.png (archived 2026-07-06-tab-panes/Product-grouptable.png)

### DEC-65: Bar fresh-open goes straight to the cap
- **Previous:** fresh open animated to a 320px loader pane, then grew when data landed (a partial opening)
- **Decision:** a fresh open animates ONCE 48→cap with the loader centered in the fully-expanded canvas; data swaps in place with zero height movement (ratchet holds). Loader hold timer removed (dead).
- **Source:** Manuela, Jul 6 (S79e) — "no more partial opening, expand and load data while expanded"

---

## Changelog

| Date | Decisions added |
|---|---|
| Apr 1, 2026 | Initial decision log created — DEC-01 through DEC-17 from Sessions 2-5 |
| Apr 1, 2026 | DEC-18 (panel pools), DEC-19 (filter vs column visibility), DEC-20 (context-aware menu) from Session 6 speccing |
| Apr 1, 2026 | DEC-21 through DEC-27 — Major corrections from grooming with Jana: Monitoring = same screen as Exceptions, PPT slides were one split table, tender statuses reduced to 4, shipment status mapping, actions in both panels, shipment status column |
| Apr 13, 2026 | DEC-28 through DEC-38 — David's written feedback review + Apr 9 grooming with Jana/David/Manuela: hazmat badges, column auto-fit/wrapping, cost visibility from tender tab, panel-aware presets, date-only display, "Tender Sent" rename, order tab overhaul, TenderSummary removal, Order # deprioritized |
| Apr 13, 2026 | DEC-39 — Merge Hazmat Class/Group into Hazardous column with hover tooltip (PENDING stakeholder approval) |
| Jul 5, 2026 | DEC-40 through DEC-47 — S79 Shipments update: Orders tab SubAccordion rebuild, shadow-up-lg token, tab arrangement panel, radio removal, GlobalSearch as table search, Tooltip migration, icon-button standardization, sidebar-shift fix |
| Jul 6, 2026 | DEC-48 through DEC-55 — S79b: pane column tiers, content-proportional bar height, up-only shadow clip, search glimpse/commit/open flow, DataTable external footer + Paginator restyle (React+Angular, demoted), sticky-header gap root cause, Orders canon fake data + orphaned documents/notes/history wired, all 7 tab panes restyled |
| Jul 6, 2026 | DEC-61 through DEC-65 — S79d/e: bar animation v3 + open-to-cap, customers data-backed, toolbar parity, GroupTable + SummaryStrip staging components |
| Jul 6, 2026 | DEC-56 through DEC-60 — S79c: bar interaction model v2 (104px cap, drawer easing, useTransition tab switch, close=deselect, outside-click close), unified search criteria + search-aware counts, zero-count tab hiding (PGI/PGR exempt), customer-list first-order scoping (+ERCO assigned), sticky toolbar clamp |
