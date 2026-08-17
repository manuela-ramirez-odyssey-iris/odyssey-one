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

### DEC-66: buyShipment is THE user-facing shipment ID; leads all default columns
- **Previous:** Sell Shipment # led the default column arrangements (DEC-51-adjacent S43 ordering: sell surfaced first as the contract-identity reminder); generator drew buyShipment as a non-unique random 8-digit (~50% collision odds at 10k rows)
- **Decision:** Team decision confirmed via Jira: **Buy Shipment # leads** every default column arrangement (Exceptions + Monitoring presets and DEFAULT_COLUMNS), Sell second. buyShipment is now generated unique (`genUniqueBuyShipment`) and constrained `UNIQUE` in `shipments.buy_shipment` (schema 001, DB reseeded, 9/9 invariants). **sellShipment stays the internal wire key** — DB PK, row key, detail-link token (`sell-shipment-out/{id}`), unchanged. Supersedes DEC-51's display prominence only, not its selection semantics.
- **Source:** LINX-11591 (approved grid field list — Buy Shipment first; Steve O'Hara approval 6/15), LINX-12490 (`GET /action/get-orders/{buyShipmentId}` — buy-keyed lookup), LINX-13023 (Monitoring grid buy-first columns). Verbal: team decision reported by user (S92), Jira-confirmed S93. Note: inference from approved column order + buy-keyed APIs; no ticket states the literal sentence "buy is the shipment id".

### DEC-67: An order is picked up at ONE stop and delivered at ONE stop; a shipment's own destination is not every order's destination
- **Previous:** `deliveryStopCount` was always 1 — a shipment could split its PICKUPS across stops but never its deliveries, so `orderIds` on the delivery stop was always the shipment's entire order list. Separately, `shipToLoc` was hardcoded to the shipment's `destLoc`, so an order's stated destination could not track a delivery stop even in principle.
- **Decision:** deliveries mirror pickups. TL draws 1–2 delivery stops (every other mode stays at 1, per David's "LTL = 2 stops only"); each order is assigned to exactly one pickup stop AND exactly one delivery stop; stop weight/volume is the Σ of the orders at that stop (invariant I5, previously pickup-only); and an order's ship-to is **its own delivery stop**, not the shipment's destination. `StopVM` gained `orderIds: string[]` beside the joined `order` string so consumers can render one link per order.
- **NOT decided — a rejected over-correction, recorded so it is not re-attempted:** order count was briefly gated by mode (TL 1–5, all other modes exactly 1) on the theory that a 2-stop shipment must never list all its orders at both stops. **That theory is wrong.** A 2-stop shipment carrying 5 orders is a legitimate consolidation: all 5 are collected at one shipper and dropped at one consignee, so both stops correctly list all 5. The gate was reverted the same day — it cost 30% of seeded orders (4433 → 3123) to fix a non-problem. Order count stays independent of mode.
- **The real invariant** is narrower: an order appears **twice** across a stop list — once under a pickup, once under a delivery — and that is correct. What must never happen is the same order appearing at two stops on the **same side**.
- **Verified after regen (2200 shipments / 4433 shipped orders):** 0 orders twice on the same side · 0 orders missing a pickup or delivery · 0 orders whose origin/destination disagrees with its own stops. Stop distribution 2 (1839) / 3 (223) / 4 (138); order counts 1–5 across every mode, unchanged.
- **Source:** user, Jul 30 (S103), reporting all orders repeated on every stop; then the same day, on reading the stop list again: *"you are totally right… every order has to appear at two stops — one per side. That part is correct."* The original report was a misreading of the pickup/delivery split; the two genuine defects it surfaced (no delivery splitting, hardcoded ship-to) are what this decision fixes.
- **Canon backing (found 2026-07-30, after the fact):** multi-delivery was never speculative — it is stated twice by Jana in the Feb 17 grooming (`grooming/0217-jana.vtt`): *"if a shipment has multiple pickups, it will show pickup one, pickup two, **but if it has multiple deliveries, it will show delivery one, delivery two**"*, and *"the delivery date will be the last delivery. **If there are two deliveries, we will take the last one.** Just how the pickup, we took the first one."* David's `P1/P2/D1/D2` convention (DEC-02) assumes the same. The single-delivery hardcode was an undocumented implementation shortcut that contradicted its own code comment ("TL can have multi-stop").
- **Follow-on defect, same canon:** every stop on a multi-stop shipment carried the SAME clock time. Stops are now sequenced 3h apart, with pickup stop 1 exactly on the shipment's pickup instant and the LAST delivery exactly on its delivery instant — Jana's first-pickup / last-delivery rule. Verified: 0 non-increasing pickup or delivery sequences, 0 shipments where a delivery precedes the last pickup, 0 rows whose pickupDate ≠ first pickup or deliveryDate ≠ last delivery (2200 shipments).
- **Evidence:** `vault-sources/10-domains/shipments/stops-orders-repeated-modal-2026-07-30.png` (details modal) and `…-stopstab-2026-07-30.png` (Stops pane) — shipment **10012049**, orders `0000000106957`–`0000000106961`, pickup OLIN CORP MCINTOSH AL / delivery USALCO MOUNTAIN DIV Denver CO. Both surfaces read the same `shipments.detail` blob. Those orderIds sit outside the local mock range (91000–94692), which is how the screenshots were identified as **live (Neon)** data.

### DEC-68: Consolidation is the UMBRELLA term — Aggregation and Multistop are its two subtypes
- **Status:** vocabulary, **settled**. Still not enforced as a data constraint, and no constraint is needed: every shape our generator produces is valid under it.
- **The model (LINX/Odyssey TMS, confirmed via Rovo 2026-07-30):**
  > **Consolidation** — grouping of orders on a shipment. Types of consolidation include Aggregation and Multistop.

  | Subtype | Definition | Example |
  |---|---|---|
  | **Aggregation** | orders grouped by the **same O/D pair** | 2 orders Location A → Location B on one truck |
  | **Multistop** | multiple pickup **and/or** delivery points on one shipment | 2 pickups (A, B) → 1 consignee (C) on a single route |

  Note **and/or**: 2 pickups → 1 consignee is Multistop, and so is 1 pickup → 3 deliveries. The consolidation XML's `SubShipmentList` carries a `PickupSequence` and `DropoffSequence` per sub-shipment to define stop order.
- **Two earlier readings were wrong, both recorded so the confusion is not repeated:**
  1. *Relayed to us as* "Aggregation = 1 pickup + 1 destination; Consolidation = multiple pickups AND multiple deliveries" — this made Consolidation a **sibling** of Aggregation and required BOTH sides to split. Under it the real load `0200994650` (1P/3D) was unclassifiable.
  2. *Our own hypothesis* — that the dividing line is shared-lane rather than stop counts. **Half right:** Aggregation genuinely is same-O/D-pair. Wrong on structure — Consolidation is the parent, not the contrast; the contrast is Multistop.
- **Consequences — none require code:**
  - The 223 "mixed" shapes (2P/1D and 1P/2D) are ordinary **Multistop**, not defects. The reverted constraint stays reverted, permanently.
  - Multi-order 1P/1D shipments are **Aggregation** — the shape we briefly tried to eliminate this morning.
  - `0200994650` (1P/3D, `TT/ISO`) is **Multistop**. Consistent with [[tracking-payload]] TR-03/TR-07 and with DEC-69.
  - Every multi-order shipment we seed is now classifiable. Nothing is unnamed.
- **Direct cost is an ORDER fact** (unchanged from the earlier entry): *"direct cost is about the cost of an order going from point A to point B."* A shipment has none of its own; `shipmentDirectCost = Σ orderDirectCost`. Already how the mapper worked; locked with two tests in `mapSellShipmentOutToDetail.test.ts`.
- **Source:** Jana via the user, Jul 30 (S103) for the initial vocabulary and the direct-cost rule; corrected the same day by the user querying **Rovo** against LINX/Odyssey domain documentation. Real-data confirmation: `vault-sources/10-domains/tracking/data/tracking-payload-page43-2026-07-30.json`.
- **Open:** `SubShipmentList` / `PickupSequence` / `DropoffSequence` are a consolidation XML structure we have never seen. Worth obtaining — it is the authoritative order↔stop binding and would supersede our inferred model.

### DEC-70: History tab rebuilt — entry-timeline anatomy kept, absolute timestamps, User|System actor split, two LINX-13065 events added
- **Previous:** Prototype `HistoryTab.jsx` was a fully inline-styled timeline with relative times (`timeAgo()` — "3 hours ago", "2 days ago") and no concept of a system-generated entry; all actors were assumed human.
- **Decision:**
  1. **Anatomy kept, not converted to a table.** The order-domain audit-log AC (LINX-8091) is tabular (Field/Old/New columns); Shipments keeps the timeline-with-dots shape instead — **our call**, flagged as a deviation because the order taxonomy doesn't map 1:1 onto Shipments' 4-category badge model (create/tender/update/completion), which is also **kept** rather than replaced with LINX-8091's Action/Event+Category split.
  2. **Timestamps** switched to `MM/DD/YYYY HH:MM` (24-hour), verbatim from LINX-8091's AC, via a new `formatDateTimeMDYHM()` in `apps/odyssey-one/src/lib/dates.js`. `timeAgo()` deleted.
  3. **Actor split (User | System)** added verbatim from LINX-8091: entries carry an optional `source` (`ERP` | `UI` | `Legacy TMS` | `Linx`); system-sourced entries render the system name with a muted treatment + a `Badge variant="gray"` "System" tag instead of the semibold user-name style.
  4. **Two events added verbatim from LINX-13065** ("Shipment View - Audit Log"): "PGI Error Corrected" (category `completion`) and "Quote Entered" (category `tender`) — LINX-13065 explicitly requires audit entries for PGI-error corrections and quote entry on Buy & Sell shipments.
  5. All inline styles moved to tokenized classes in a new `apps/odyssey-one/src/styles/panes/history.css` (mirrors the `documents.css` per-tab-file convention), and the tab is now wrapped in a single `SubAccordion` ("Shipment History", default open) matching the DocumentsTab chrome idiom.
- **Source:** vault/10-domains/shipments/domain-analysis.md §9 (Jana, Mar 25 — "Populate with Jira-style audit entries: username, date/time, change type"); LINX-13065 (Story, Todo — PGI-error-corrected / quote-entered AC); LINX-8091 (order-level audit AC, used as precedent for timestamp format and User|System split only, not for the tabular layout or category taxonomy).
- **Implemented:** Session 107 continuation — `HistoryTab.jsx` rebuilt, `tools/generate.mjs` HISTORY_ACTIONS extended + ~25% of entries assigned a system `source`, mock data regenerated (seed 42), `HistoryTab.test.jsx` added.
- **⚠️ CORRECTION (2026-08-10, Session 114) — this entry overstated its own source.** The Source line above cites *"LINX-13065 (Story, Todo — PGI-error-corrected / quote-entered **AC**)"*, and point 4 claims two events were added **"verbatim from LINX-13065"**. On fetching the ticket directly: **LINX-13065 has `customfield_10032` = null — no acceptance criteria whatsoever**, zero labels (no `Approved`/`Functional`/`Refinement_done`), status still `Todo`, reporter Sameer, last touched 2026-07-10. Its entire body is one run-on sentence: *"As a user I need access to all Buy and Sell shipments to see the audit Logs   The audit logs should include log entries when pgi errors have been corrected, and quotes have been entered in addition to other logged activities"*. There was **no verbatim text to take and no AC to cite** — `PGI Error Corrected` and `Quote Entered` were event names **inferred** from that sentence and then recorded as though specified. Both events are **removed** under [[#DEC-80]] + the 2026-08-10 follow-up ruling. Recorded here rather than by editing the original text, so the overstatement stays visible: the lesson is that "verbatim from LINX-NNNNN" must mean an actual quoted AC, and a ticket's existence is not the same as a ticket's specification.

### DEC-71: Tender CostTooltip AR Total sourced from `rateDetails.arTotal` — the previous read was to a field that does not exist
- **Previous:** `CostTooltip` (`RoutingGuideTab.jsx:334-335`) read `carrier.arCost || carrier.arFreightCost` for AR Total and `carrier.cost || carrier.apFreightCost` for AP. **None of `arCost`, `arFreightCost`, `apFreightCost` exist on `RoutingOptionVM`** — `arCost` was copy-pasted from `CostOrderVM` (`shipmentDetail.ts:231`), the Cost **Allocation** tab's shape. Consequence: AR Total rendered `--` on every hover since the tooltip shipped, and because `margin` is gated on both values parsing, the **Margin row never rendered at all**. The real figure sat unread at `carrier.rateDetails.arTotal`.
- **Decision:** AR is derived from `carrier.rateDetails?.arTotal` (a **number**, not a formatted string) and formatted with `fmtDollar`. The three dead fallbacks are deleted. AP stays as `carrier.cost` — already correct, and it is the same text the cell itself shows.
  - **Zero is treated as absent, deliberately.** `mapSellShipmentOutToDetail.ts:271` substitutes a **zeroed** `rateDetails` when the DTO omits it, so a falsy `arTotal` means "no rate details", not "$0.00 AR". It degrades to `--` with the Margin row hidden, rather than showing `$0.00` and a large negative margin. Commented in place so it is not later "fixed" into showing `$0.00` — note this deviates from `fmtCostAmt`'s own "zero is a valid cost" rule elsewhere in the same mapper, because there the zero comes from data and here it comes from a synthesized default.
  - Currency suffix appended from `rateDetails.currency` (fallback `USD`) so AP and AR read in the same shape. **AP's `" USD"` remains hardcoded by the mapper** (`:270` never reads the DTO's `totalCostCurrency`) — a separately-tracked item from the Aug 10 tender audit, not fixed here.
- **Source:** Aug 10, 2026 tender audit (S113 carry-forward inventory: *"the CostTooltip's AR Total / Margin always show `--` — it reads `carrier.arCost`, a field name copy-pasted from the Cost Allocation tab's shape"*), re-verified against `shipmentDetail.ts:146-211` and `tools/generate.mjs:737` this session.
- **Implemented:** Session 114 — `RoutingGuideTab.jsx` `CostTooltip`, with tests covering the populated case, the CAD-currency case (proving the suffix is sourced, not echoed), and the zero/missing case asserting `--` + no Margin row.

### DEC-72: A quote has ONE currency — `markupCurrency` deleted rather than persisted
- **Previous:** `QuoteModal.jsx:179` held `const [markupCurrency, setMarkupCurrency] = useState(() => 'USD')` — hardcoded, never seeded from `carrierData`, and **absent from `handleSave`'s payload**. There is no field in `RoutingOptionVM.rateDetails` to hold it. A user who selected CAD on the Markup field, saved, and reopened got USD back silently. Worse, view mode (`:332`) rendered `money(markup, markupCurrency)`, so it **asserted "USD"** even when the base rate's own `currency` was CAD.
- **Decision:** the markup shares the quote's single `currency` — `markupCurrency` state deleted, both UoM selectors edit the one shared value.
  - **Rationale is arithmetic, not just plumbing:** `arTotal = numBase + numMarkup + chargeTotal` already sums base and markup as one currency. An independently-selectable markup currency is therefore **incoherent**, not merely un-persisted — persisting it (the alternative considered) would have preserved a field that makes the AR total wrong. Chosen over adding `markupCurrency` to `rateDetails` + the DTO + the mapper.
- **Rejected/deferred:** `additionalCharges[].currency` is **left untouched**. It has the same cross-currency summing problem (`chargeTotal` adds rows regardless of currency) but it **does** persist, so it is not data loss — it is a multi-currency product question for Ramesh, not a silent bug.
- **Source:** Aug 10, 2026 tender audit (S113: *"`markupCurrency` is entirely dead — editable in the modal, absent from `onSave`, and there is no field in `rateDetails` to hold it"*); resolution ruled by the user this session after being shown the three options.
- **Implemented:** Session 114 — `QuoteModal.jsx`, pinned by a test seeding `rateDetails.currency = 'CAD'` and asserting view mode renders the Markup in CAD (it rendered USD before the fix).

### DEC-73: Tender status actions write the audit trail — and NOTIFY is distinguished from RESPONSE
- **Previous:** `handleAction` persisted **only** `status`. Every audit and response field stayed stale or null forever: `responseDateTime`, `responseUser`, `responseMethod`, `notifyDateTime`, `modifyUser`, `modifyDate`. Separately, the Add Quote path hardcoded `modifyUser: 'Current User'` (a literal) while a working `useCurrentUser()` hook existed, and wrote `modifyDate` via `new Date().toLocaleString()`.
- **Decision:** five actions, three distinct field sets, matching the semantics `tools/generate.mjs` already establishes.
  1. **`modifyUser` / `modifyDate` on every action.** It is an audit trail; no action should be invisible to it.
  2. **Response fields on `Accept` / `Decline` / `Cancel` only** — `responseDateTime`, `responseUser`, and `responseMethod: 'Manual Update'`. That literal is one of `RESPONSE_METHODS` (`generate.mjs:143`) and a UI click **genuinely is** a manual update, so it is accurate rather than fabricated. A **Decline is a response**, not a non-event; `generate.mjs:774` only seeds `responseDateTime` on Accepted rows, which is a *generator gap* (no seeded Declined-with-response carrier), not a rule for live actions to copy.
  3. **`notifyDateTime` on `Tender` / `Re-Tender` and on the auto-cascade** — being tendered is a **notify**, not a response. A manual `Tender` click and the Decline/Cancel cascade are the *same event* and must record the same thing; previously only the cascade did, and `Tender`/`Re-Tender` recorded **nothing at all**.
  4. **`Re-Tender` clears the previous cycle's response.** It fires on a Declined/Cancelled row that still carries `responseDateTime`/`responseUser`/`responseMethod`; left in place, the row read *"Declined by Amy Cook at 08/10/2026 14:23"* while its status said `Sent` — and all three are **rendered columns** (`TAB_COLUMNS`: Response Method / Date / User). Cleared to the shape `mapRoutingOption` itself produces for an empty value, so a save-then-reload round-trips identically: `responseDateTime`/`responseMethod` → `'--'` (they read through `orDash`), `responseUser` → `null` (it reads through `?? null`). Getting this wrong would reintroduce the VM/DTO shape-mismatch class that corrupted tender writes on Aug 10.
  5. **`proNumber` and `carrierPickup` are never written.** They are **carrier-supplied** identifiers that only arrive from the carrier's actual response; inventing them is the same class as the ~40 hardcoded constants flagged below. Not cleared on `Re-Tender` either — whether a re-tender voids a prior cycle's Pro # is a **product question**, not ours. Commented at both sites so the omission reads as a decision, not an oversight.
- **Source:** Aug 10, 2026 tender audit (S113: *"Accept/Decline persist `status` but never populate Pro # / Response Date / Response User / Carrier Pickup #"*). The `Tender`/`Re-Tender` gap and the `Re-Tender` staleness were **found this session** — S113's inventory named only the three `Sent`-row actions, missing that `TENDER_ACTIONS` has five.
- **Implemented:** Session 114 — `RoutingGuideTab.jsx` `handleAction`. Timestamps use `formatDateTimeMDYHM` (see DEC-74). The notify-vs-response asymmetry is pinned by tests asserting the cascaded row gets `notifyDateTime` but **not** `responseUser`, and that negative was **mutation-checked** (forcing the cascade to set `responseUser` turned it red) — three tests in this repo have previously shipped unable to fail.

### DEC-74: Live-written tender timestamps use the platform date canon, with the timezone honestly omitted
- **Previous:** `RoutingGuideTab.jsx:850` wrote `modifyDate: new Date().toLocaleString()` → `"8/10/2026, 11:21:52 AM"`: unpadded, comma-separated, seconds, **12-hour**. It was the only `toLocaleString()` on a date in the detail components.
- **Decision:** all timestamps written by tender actions go through `formatDateTimeMDYHM` (`src/lib/dates.js`) → `"MM/DD/YYYY HH:MM"`, 24-hour. This is the same seam DEC-70 established for the History tab, and it satisfies both the S107 `MM/DD/YYYY` ruling and the 24-hour data-format contract (LINX-8120 / LINX-7629), which the `toLocaleString()` output violated on both counts.
  - **Known delta, accepted:** seeded rows carry a trailing timezone abbreviation (`generate.mjs:351-358` appends one); `formatDateTimeMDYHM` does not. We **do not fabricate a `'CST'` suffix to match** — we do not know the acting user's zone, and a hardcoded `'CST'` is precisely the bug class this session is clearing out. Commented in place so the next person does not "fix" it by hardcoding a zone. The read path is `orDash(...)` passthrough with no parsing, so the shorter string carries no corruption risk.
- **Source:** found this session while implementing DEC-73; canon from `src/lib/dates.js` (S107 user ruling, Aug 3) and DEC-70.
- **Implemented:** Session 114 — `RoutingGuideTab.jsx`, both `handleAction` and `handleQuoteSave`. `'Current User'` replaced with `useCurrentUser().name` in the same pass. Pinned by an assertion that the persisted `modifyDate` matches `/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/`.

### DEC-75: `rate` === `rateDetails.baseRate` is an invariant — Edit Quote broke it, and the generator never held it
- **Previous:** two independent violations of the same invariant.
  1. **Edit Quote dropped it.** `handleQuoteSave`'s edit branch recomputed `cost` from `apTotal` but **never touched `rate`**, while its add branch (`:814`) sets `rate` from `formData.rateDetails.baseRate`. Editing a quote's Base Rate left `rate` stale permanently, and `persistTender` → `routingOptionVmToDto` reads `rate` back into `rateAmount`, which `api/_lib/shipments.mjs:239` writes to the **`tenders.rate_amount` column**. So the stale value round-tripped into a queryable DB column indefinitely. **Note:** `rate` is *not* a rendered column — `key: 'rate'` appears nowhere in `LOCKED_COLUMNS`/`TAB_COLUMNS`, so this was invisible in the UI, which is why it survived. An earlier framing of this bug as "the Rate column shows a stale number" was **wrong** and is corrected here.
  2. **The generator drew the base rate twice.** `tools/generate.mjs:716` `baseRate` → `rateAmount`, and `:726` `_baseRate` → `rateDetails.baseRate`: two independent `faker` draws. So **every seeded routing option's `rateAmount` disagreed with its own `rateDetails.baseRate`.** (`totalCostAmount` was already correctly derived from `_baseRate`, so `cost` and `rateDetails.apTotal` did agree.)
- **Decision:** the invariant is `rate === rateDetails.baseRate`, sourced from the app's own add-quote path (`RoutingGuideTab.jsx:814` derives the former from the latter). Edit mode now sets `rate`; the generator's orphaned `:716` draw is deleted and `rateAmount` uses the single `_baseRate`.
  - **`fmtDollar` deliberately NOT adopted** at either call site despite both hand-rolling its exact `toLocaleString` options: `fmtDollar(-100)` yields `"-$100.00"` while the hand-rolled string yields `"$-100.00"`. Currently unreachable (rates are not negative), but a real divergence, so the duplication stands rather than a silent format change on a field that feeds a DB column.
  - **Reseed consequence, not yet applied:** removing a `faker` call **shifts the seeded RNG sequence** for every draw after it, so a future reseed produces different — but now internally coherent — values throughout. Reseeding is separately user-gated and was **not** performed; only the code is corrected. This is a genuine instance of the "seeded data must be coherent" rule.
- **Source:** both found this session while auditing the Tender write path; neither was in S113's carry-forward inventory. Consumer-establishes-invariant reasoning cites `RoutingGuideTab.jsx:814`; the DB column path cites `api/_lib/shipments.mjs:239` and `packages/db/migrations/001_schema.sql:77`.
- **Implemented:** Session 114 — `RoutingGuideTab.jsx` edit branch (test asserts `saveTenderOption` receives the new `rateAmount`; it received `undefined` before) and `tools/generate.mjs` (a `node:test` case asserts `rateAmount === rateDetails.baseRate` across generated options).

### DEC-76: `routingOptionVmToDto`'s 6-pair rename list — independently verified, and the Routing Guide column gear removed
- **Previous:** two unrelated items, both closing S113 carry-forwards.
  1. The Aug 10 shape-corruption fix introduced `routingOptionVmToDto`, which now sits on **every live tender write**, and S113 explicitly recorded that *"a human pass over that pair list"* was owed before it could be trusted.
  2. The Routing Guide's column-arrangement gear (`Columns3Cog`) called `onToggleColumnPanel`, which `BottomBar.jsx:253` passed down as the **same** `handleToggleColumnPanel` from `ShipmentsRoute.jsx` that `ShipmentTable` uses — so it opened the shipments-**LIST** column panel. Not a mis-binding: the routing table has no panel of its own to open.
- **Decision / finding:**
  1. **The pair list is CORRECT — verified field-by-field, not asserted.** `RoutingOptionVM` has **57** fields; **6** are destructured and renamed (`equipment→equipmentCode`, `rate→rateAmount`, `cost→totalCostAmount`, `transit→transitDays`, `distance→distanceMiles`, `api→apiSource`); the remaining **51/51** passthrough fields each have a same-named field on `SellShipmentRoutingOption`, including the easy-to-miss `sl` (`sellShipmentOut.ts:218`) and `linehaul` (`:217`). Numeric round-trips confirmed idempotent in both directions (`'3 Days' → 3 → '3 Days'`; `'--' → undefined → '--'`). **This closes the S113 debt.**
     - **`serviceLevel` is a benign one-way key migration, now recorded:** a DTO row carrying `serviceLevel` with no `sl` maps to VM `sl` (`o.sl ?? o.serviceLevel`), then writes back `sl` only and drops `serviceLevel`. The **value** survives; the key migrates once and stays migrated.
     - `rateCurrency` / `totalCostCurrency` are **written but never read** (the read path hardcodes `"USD"` on `cost` and consults no currency for `rate`) — schema completeness only.
  2. **The gear is removed**, per user decision: a control that opens a different table's panel is worse than no control. Collapse/expand (`FoldHorizontal`/`UnfoldHorizontal`) and per-tab `TAB_COLUMNS` remain. The prop was traced out of `RoutingTable`, `RoutingGuideTab`, `BottomBar` and the `BottomBar`-feeding call in `ShipmentsRoute.jsx` — the `ShipmentTable`-feeding call is **untouched**, it is a legitimate separate consumer. **Reversible** once a real routing-column panel is specced (which likely wants Figma first); a comment marks the spot.
- **Source:** S113 carry-forward inventory (both items); pair-list verification performed this session against `shipmentDetail.ts:146-211` vs `sellShipmentOut.ts:149-219`; gear resolution ruled by the user.
- **Implemented:** Session 114 — verification is documentation-only (no code change needed, which is the finding); gear removal touched `RoutingGuideTab.jsx`, `BottomBar.jsx`, `ShipmentsRoute.jsx`.
- **Still open (NOT fixed, deliberately):** the ~40 hardcoded constants on a manually-added quote remain a **product conversation**, not a bug fix. A sharper example than the general complaint was found this session: `handleQuoteSave` writes **`lcePkId: '--'`** where *both* type definitions declare `number | null` and the generator produces an integer (`generate.mjs:806`) — it round-trips harmlessly as a string, so it is a type lie rather than a corruption, but it is a rendered column (`LCE PK_ID`). Also still open: `CHARGE_CODES`/`CURRENCY_OPTIONS` as component literals, and the carrier lookup serving mock data even in live mode.

### DEC-77: "Shipment Trail" is the History screen — terminology, not a new concept
- **Previous:** Pappu's email (2026-08-10) introduced "Shipment Trail" as a named feature, flagged at intake as an open question — whether it was a rename, a sub-section, or a distinct concept relative to our History tab (DEC-70).
- **Decision:** "Shipment Trail" ≡ the History screen. Same information, same container. Not a new screen, tab, or component. `HistoryTab.jsx` is the implementation target for anything scoped under this name going forward.
- **Source:** User ruling, 2026-08-10 — *"shipment trail is the same as history screen since the same information is shown and the concept of history is the shipment trail."*
- **Implemented:** N/A — terminology clarification only. No code change implied by this decision alone.

### DEC-78: History event catalog (Pappu MVP spec) ingested as canon — not yet implemented
- **Previous:** `HISTORY_ACTIONS` (`tools/generate.mjs` ~line 979) is a 16-item, user-centric, free-text-details event list authored during DEC-14/DEC-70, with no formal external spec behind it.
- **Decision:** [[../data/history-event-catalog|history-event-catalog.md]] now holds Pappu's 15-event / 25-variant lifecycle-centric catalog, with parameterized detail-message templates (`<Placeholder>` tokens preserved verbatim) and per-outcome variants (success/failure/branch). This is intake-and-transcription only — it establishes a target contract to compare against; it does not change `HISTORY_ACTIONS`, `HISTORY_SYSTEM_SOURCES`, or `HistoryTab.jsx`.
- **Source:** `vault/00-inbox/MVP - History Screen.md` (MarkItDown conversion of `MVP - History Screen.xlsx`, Pappu, dated 2026-08-06) + `vault/00-inbox/pappu-shipment-trail-email-2026-08-10.md`.
- **Implemented:** Not implemented — canon only. Implementing the spec's model would require: (a) an `event + outcome + params` schema replacing the free-text `switch` in `generate.mjs`, (b) resolving whether the actor model gains a third "integrated application" category or represents it as a `source` value, (c) collapsing `Tender Accepted`/`Tender Declined` into one `Tender Response Received` event with outcome variants.
- **Open:** see [[../shipment-trail#Open / TBD]].

### DEC-79: Gap analysis — our History event vocabulary is user-centric; the MVP spec is lifecycle-centric (structural divergence, not naming)
- **Previous:** No formal comparison existed between `HISTORY_ACTIONS` and any external event spec.
- **Decision (finding, recorded so it isn't re-derived):** Verified by exact-name comparison — only **2 of our 16 events** (`Shipment Created`, `Tender Sent`) appear in the spec's 15-event list. Our non-overlapping events describe user-performed actions (`Carrier Updated`, `Schedule Updated`, `Route Changed`, `Cost Updated`, `Document Uploaded`, `Status Changed`); the spec's non-overlapping events describe system pipeline stages (routing → optimization evaluation → consolidation → routing & rating → ready-for-tender → auto tender validation → PGI → shipment update notification). Our `Tender Accepted`/`Tender Declined` are two separate top-level events; the spec models one event (`Tender Response Received`) with three outcome variants — a structural difference, not a rename. Sheet3 defers `User Action` and `Manual tendering` from MVP, while DEC-70 made ~75% of our entries user-attributed — we are inverted relative to the spec's stated MVP scope. `Net Native` (the email's named example of an integrated-application actor) does not exist anywhere in `HISTORY_SYSTEM_SOURCES`. Our two LINX-13065 events (`PGI Error Corrected`, `Quote Entered`, added under DEC-70) do not appear in the spec's list — flagged as a tension, **not** treated as an error, since LINX-13065 is an independently-sourced real Jira requirement.
- **Source:** `apps/odyssey-one/tools/generate.mjs` (`HISTORY_ACTIONS` ~line 979, `HISTORY_SYSTEM_SOURCES` ~line 999, detail-building `switch` ~line 1024), `apps/odyssey-one/src/components/detail/HistoryTab.jsx`, DEC-70, vs `vault/00-inbox/MVP - History Screen.md` + Pappu's email.
- **Implemented:** Not implemented — analysis only, recorded to prevent re-deriving it. No code changed.
- **Open:** reconciliation (which list "wins," whether to merge, whether the vocabulary is open or closed) is a product decision for Pappu/Ramesh — see [[../shipment-trail#Open / TBD]].

### DEC-80: The Shipment Trail RENDERS backend events — it does not author them. Pappu's catalog governs; `Quote Entered` dropped; PGI/PGR data-only
- **Previous:** DEC-79 recorded the divergence between our 16-event `HISTORY_ACTIONS` and Pappu's 15-event MVP catalog, and left four questions open for Pappu/Ramesh: the actor taxonomy, whether the vocabulary is open or closed, the LINX-13065 tension, and a suspected typo. Our implementation authored events locally: `HISTORY_ACTIONS` is a hardcoded list and a `switch` (`tools/generate.mjs` ~:1024) *composes* each `details` string in the frontend's own data layer.
- **Decision:** four rulings from the user, 2026-08-10, all quoted verbatim in [[../shipment-trail#Settled by user ruling, 2026-08-10]]:
  1. **The Trail is a RENDERER.** *"Event refers to the system in the back has nothing to do with us, we just need to show data in history tab."* The backend produces events; we display `event · details · timestamp · actor` as received. **This retires the open/closed-vocabulary question as not ours** — a renderer needs no advance knowledge of the event set. It also reframes DEC-79's finding: our model is wrong **in kind**, not merely in content. A fixed local list plus a local string-composing `switch` is the frontend authoring data it should only be presenting.
  2. **Actor for MVP is system or integrated application** (e.g. `Net Native`), not user — resolving the DEC-79 actor tension toward the reading in which user attribution is not the MVP shape. This **inverts DEC-70's seeded ~75%-user-attributed ratio**, which must be reversed.
  3. **`Quote Entered` is dropped.** *"we are not adding quote entered because seems this history is more to describe what's happening in the system in the back, so pappu already gave you the specifics."* Quote entry is a USER action; the Trail describes backend activity, so it falls out by the same logic that defers `User Action` from MVP. Closes the LINX-13065 tension in the spreadsheet's favour **for this event specifically** — `PGI Error Corrected` was not ruled on and stays open.
  4. **PGI/PGR are out of project scope.** *"PGI/PGR is not on this project scope so feel free to fill things that you need as you feel (no design on PGI/PGR please)."* Their events remain in the DATA (a real backend trail would contain them) and seeded values may be filled at our discretion, but **no design work** on PGI/PGR surfaces — they render through the same generic row treatment as everything else, with no special-casing.
- **Correction recorded:** the `<$125.00>` "typo" flagged at intake was **NOT a typo**. Per the user, *"<brackets are to specify theres a value there>"* — angle brackets are placeholder notation, so the example row simply retained the bracket. The flag is withdrawn; bracketed tokens are the parameter contract throughout the catalog.
- **Source:** User rulings, 2026-08-10, in direct response to the [[../shipment-trail|Shipment Trail canon]]'s open questions. Upstream spec: Pappu's `MVP - History Screen.xlsx` + his 2026-08-10 email, both archived under `vault-sources/10-domains/shipments/`.
- **Implemented:** Session 114 — seeded event catalog swapped to the lifecycle model and actors re-based on system/integration; `Quote Entered` removed. The deeper architectural consequence (that a renderer should not hold a fixed vocabulary at all) is **canon here but NOT yet fully realised in code** — the generator still necessarily composes strings because there is no real backend emitting them, so this is a seam, not a finished migration. Flagged deliberately rather than claimed as done.
- **Open:** `PGI Error Corrected` (see canon item 3) · whether "Event details" implies structured old/new pairs, which under this ruling becomes a question about what the BACKEND sends rather than what we choose to build.

---

### DEC-82: Shipment Details editing is SECTION-level — the per-field pen is removed entirely
- **Previous:** three individual fields carried a pencil icon — `Base`, `Markup`, `Equipment` — declared in an `EDITABLE_FIELDS` map (`ShipmentDetailsModal.jsx:28-32`), each rendered by an `EditableField` wrapper that put an `icon-action` pen beside a `TitleSubtitle`. All three pens opened the same Tender `QuoteModal` in edit mode. Nothing else in the modal was editable, and the pen was the only edit affordance anywhere in it.
- **Decision:** editing moves up a level, from field to SECTION. Each section header carries one control on its trailing side: a **secondary `sm` "Edit"** button that becomes a **primary `sm` "Save Changes"** button plus a clickable cancel **X** while that section is in edit mode. **No pen icon remains anywhere in the modal.**
  - **Save Changes is disabled until the draft is actually dirty**, so the button itself communicates whether there is anything to lose. Dirtiness is a JSON-stringify comparison of draft against a baseline captured at Edit-click time (`sectionDraft.js`), deliberately pure so the rule is testable without a DOM — it gates both the button and the discard prompt, and a silent regression would either strand the user or destroy work.
  - **Only one section may be in edit mode at a time.** This is enforced *structurally* rather than by a rule: the whole edit state is a single object `{ section, draft, baseline }`, and `section` cannot hold two values.
  - **Save Changes was made the PRIMARY face** (Edit is secondary) on the user's call — the promoted button is the one that commits.
    - **⚠️ REVERSED 2026-08-12, one day later.** User ruling: *"lets not make the save changes button primary, keep it secondary."* **Both faces are now secondary**; only the label and the `disabled` state change between them. The original text above is left standing rather than edited, so the reversal is visible rather than silent. Rationale (ours, recorded as inference not instruction): a section header lives *inside* a modal that already owns a primary action, and with four editable sections the body could have shown several primaries at once — so the variant was carrying state that `disabled` already carries. **Consequence to watch:** the control's appearance no longer distinguishes view mode from edit mode at a glance; the label and the sibling cancel X are now the only signals. If that proves too quiet in the browser pass, the fix is a different treatment, not a return to primary.
- **Source:** User direction, 2026-08-11, relayed after a conversation with Jana. Explicit instructions included *"no more pen icon"*, *"Save Changes will be disabled by default and enabled only when a change was made"*, *"when Save Changes show will become a primary button"*, *"headers will have an x clickable icon trailing side of its row to cancel the edit mode"*, and *"only one section can be on edit mode at a time"*.
- **Implemented:** Session 117 — `Section` rewritten with `editable`/`editing`/`dirty`/`editDisabled` props; `EditableField` and `EDITABLE_FIELDS` deleted along with their `.shp-details__field*` CSS; `.shp-details__section-head` added. The 12 pen-era tests were deleted rather than adapted — they asserted an affordance that no longer exists.
- **Stops is deliberately excluded:** its Edit button renders **disabled**. Per the user, *"Stops we will not do this one for now but will be triggered by the same button, put the inherent button for now."* Disabled rather than inert so the affordance is visible and a click gives honest feedback.

### DEC-83: Shipment-stage field edits are a SHIPMENT concern — they never write back to order data
- **Previous:** the modal's only local persistence was an `overrides` state object that survived until the modal unmounted. There was no shipment-level write endpoint at all: `PUT .../tender` (routing options) was the sole shipment-side mutation, and the reference values rendered in this modal are sourced from `orderDetails[]`.
- **Decision:** Mode, Gross Weight, Volume and per-order reference rows persist to a new **additive nullable `shipments.overrides` jsonb column**, written by **`PATCH /shipment-service/v1/sell-shipment-out/:id/overrides`**. Editing a PO Number here **must not touch the order** — the value is a shipment-stage annotation, which is precisely why it lives on the shipment row rather than in `orders`.
  - **Whole-object replace, not a deep merge.** The modal always holds and sends its complete override set; a merge would make CLEARING a field impossible.
  - **`references` is keyed by orderNumber and replaces that order's whole list** when present. The editor is seeded from the current values, so a save always carries the full set — per-field merging would make deleting a reference impossible.
  - **An absent key means "no override", NOT "cleared".** The read path attaches `overrides` to the detail blob only when the column is non-null; an `overrides: null` key would make every `??` fallback in the mapper misread an absent column as an explicit clear.
  - **The list grid honours the same overrides** via `COALESCE(overrides->>'mode', mode)` / `COALESCE(overrides->>'grossWeight', gross_weight)` in the shared `ROW_COLUMNS` projection — without it the grid would contradict the modal the user had just saved in. Only these two: `volume` has no list column and references are not a list concern. Safe as written because both underlying columns are `text` (`001_schema.sql:31`), so no cast is needed.
- **Source:** User decision, 2026-08-11 — *"Order number cannot be editable but PO number does (DB: which will not update the order data itself, it will be a shipment stage only thing)"*. The migration is additive (`ADD COLUMN IF NOT EXISTS`, nullable, no default), so no backfill and **no reseed**.
- **Implemented:** Session 117 — `packages/db/migrations/008_shipment_overrides.sql`, `saveShipmentOverrides` handler + route, `ShipmentOverridesDTO` through the mapper, `saveShipmentOverrides` client call. **The migration is written and committed but NOT yet applied to Neon** — applying it is separately user-gated.

### DEC-84: General Information's save is a deliberate TWO-CALL split
- **Previous:** N/A — no shipment-stage save existed. Worth recording because the split looks like an inconsistency until the data model is understood.
- **Decision:** saving General Information issues **two writes, sequentially**:
  1. **Equipment** → `saveTenderOption` (VM → `routingOptionVmToDto` → `PUT .../tender`), because Equipment is a field of the **routing option**, not of the shipment. This modal reads it from the current routing option (per the 2026-08-10 ruling *"the one related to the quote"*), so it must write back to the same place.
  2. **Mode / Gross Weight / Volume** → `saveShipmentOverrides` (`PATCH .../overrides`).
  - **Sequential, not `Promise.all`** — if the tender write fails, we must not have already reported the whole save as succeeded.
  - Equipment is therefore **deliberately absent** from the `overrides` shape. Putting it in both places would split the source of truth for one value.
- **Source:** derived from the existing data model this session, not from a stakeholder — `RoutingOptionVM.equipment` (`shipmentDetail.ts:149`) versus the new shipment-level column. Recorded because the asymmetry is otherwise indistinguishable from an oversight.
- **Implemented:** Session 117 — `saveSection` in `ShipmentDetailsModal.jsx`.
- **Still open:** the local `overrides` state now holds BOTH capitalised keys written by `QuoteModal`'s save (`Equipment`) and lower-case keys written by the General Information draft (`equipment`) — two keys for one value. Harmless today because the two read sites are disjoint, but it is a latent divergence and should be reconciled when the quote save path is rewritten (see [[#DEC-85]]).

### DEC-85: Edit Quote is a VIEW of the Shipment Details modal, not a dialog stacked on top of it
- **Previous:** each pen opened `QuoteModal`, which self-portals to `document.body` inside its own `ModalMedium` — a second dialog **over** the details modal. That stacking is what forced the capture-phase Escape handler in `ShipmentDetailsModal` (`:163-170`): both dialogs registered unconditional `window` keydown listeners, so Escape had to be intercepted before either could act on it.
- **Decision:** the Cost section does not edit in place. Its Edit control **replaces the details body with the quote form**, retitles the shell to "Edit Quote", and offers a **back control** returning to the details view — a navigation flow *within one modal*. The header X still closes the whole modal from either view.
  - This requires **`QuoteModal` to gain an embedded (portal-less, shell-less) mode**, with the host owning the dialog shell and footer.
  - It also requires **`ModalMedium` to gain a `leading` header slot** — it has only title + close today. `ModalMedium` is a normalized `@odyssey/ui` component (Figma 2032:915), so this is a **design-system change**: Figma first, then NORMALIZING in both DSMs, version bump, Angular twin. Per the project's Figma-before-code rule, the user was given the choice between a cheaper in-content back button and this, and chose the header slot.
  - With one dialog instead of two, the capture-phase Escape workaround becomes unnecessary and is removed.
- **Source:** User decision, 2026-08-11 — *"Cost: Will redirect to edit quote modal, which Edit Quote modal will replace (not overlap the shipment details modal) with a back button next to the header, so user can go back to the Details or close the modal altogether, so it is a navigation flow in the Modal."* Slot-vs-in-content resolved by the user on 2026-08-11 in favour of the slot.
- **Implemented:** **NOT YET.** Gated on the Figma change. The Cost section currently renders an enabled Edit button wired to a no-op stub.

### DEC-86: The Shipment Details quote save never persisted — and the code comments asserted that it did
- **Previous:** `ShipmentDetailsModal.jsx:229-241` passed `QuoteModal` an `onSave` that called **only `setOverrides(...)`**. It never called `saveTenderOption`. `QuoteModal` itself imports no service — persistence lives in `RoutingGuideTab`'s `handleQuoteSave`, and this path did not go through it. **Every Base / Markup / Equipment edit made from the Shipment Details modal was lost on reload**, from the day the pens shipped (2026-08-10) until this session.
  - The file's own comments claimed the opposite, in two places. `:15-18`: *"a commit must PERSIST like everything else… QuoteModal's save already routes through saveTenderOption → PUT .../tender"*. And `:143-146`: *"every commit still comes from QuoteModal's real save (saveTenderOption → PUT .../tender), so it durably survives a reload"*.
- **Decision:** the save must actually write, through the same choke point every other tender write uses: `saveTenderOption(sellShipment, routingOptionVmToDto(result))`. Both stale comment blocks are **deleted and replaced** with one describing what the code actually does.
- **Source:** found this session by a code-recon pass over the Tender feature, not by a failing test — no test asserted persistence from this path, which is why the divergence survived. Independently corroborated by reading `QuoteModal.jsx`'s import list (no service import) and `shipmentService.ts`'s call sites.
- **Implemented:** **NOT YET** — the fix lands with [[#DEC-85]], because it rewrites the same `onSave` block. Recorded now, separately from the feature, so the defect is traceable on its own.
- **Lesson, recorded deliberately:** a comment asserting a behaviour is not evidence of that behaviour. Two comments, written in the same session as the code they described, both confidently stated a call that was never made. This is the same class as the S114 finding that `ShipmentsRoute.jsx:106` destructured `isError` but never `error` — a producer fixed while the consumer stayed inert.

### DEC-87: History badge colour is a FIVE-tier hierarchy — green is reserved for milestones, not for "this step didn't fail"
- **Previous:** [[#DEC-81]] keyed badge and dot colour on `entry.outcome` with four values (`success`→green, `failure`→red, `update`→blue, `neutral`→amber). `pushHistory`'s outcome argument **defaults to `'success'`**, so every event that was never given an explicit variant emitted green: **11 of the 15 catalog events**. A normal, unremarkable shipment therefore rendered a near-solid column of green badges.
- **Decision (user ruling, 2026-08-12, verbatim):** *"i dont like the color assignment for the events there are too many greens (overused means false user flags for important things), please understand each type of event and assign new color decisions."* Green is now scarce and means **a milestone was reached**, not merely "no error occurred":
  - **green (`success`) — exactly three events:** `Tender Response Received` **Accepted** (a carrier committed), `PGI Response Received` **clean** variant (goods issue posted), `Shipment Planning Completed` (terminal — status → Done).
  - **blue (`update`) — the lifecycle advanced:** `Shipment Created`, `Routing Completed`, `Optimization Evaluation` (Consolidation branch), `Consolidation Completed`, `Routing & Rating Completed`, `Ready for Tender`, `Auto Tender Validation` (passed), `Tender Sent`, `Post PGI Rating Completed`, `Shipment Updated`.
  - **gray (`info`, NEW value) — outbound messaging that asserts nothing about the shipment's own state:** `Planned Shipment Sent`, `Shipment Update Notification` (sent). These are "we sent a message", not "the shipment changed"; they are the highest-volume, lowest-signal rows in the trail and now recede instead of competing.
  - **amber (`neutral`) — completed, but unfavourable or non-advancing:** `Tender Response Received` **Declined** (unchanged from DEC-81's follow-up) and, **newly**, `Optimization Evaluation` → **Hold**.
  - **red (`failure`) — unchanged:** every failure variant, including `PGI Response Received` with validation errors and a failed `Shipment Update Notification` delivery.
- **Source:** user ruling, 2026-08-12 (above). Event vocabulary unchanged — this decision touches only which `outcome` each existing event emits, so [[#DEC-80]]'s "the Trail renders, it does not author" position is untouched: the colour tier travels with the event as data.
- **Implemented:** Session 118 — `tools/generate.mjs` (explicit outcome per `pushHistory` call site; `info` added to the contract) + `HistoryTab.jsx` (`BADGE_VARIANTS.info` + matching dot case). Guarded by a generator test asserting that **only the three milestone actions may carry `success`**, so a future edit cannot quietly re-green a pipeline step.
- **Flagged, not silently resolved:** `Optimization Evaluation → Hold` as amber is **our call**, made here — S114 had parked it as an open question for Pappu. It is recorded as ours precisely so it can be overruled cheaply.

### DEC-88: Only an event a PERSON can cause may carry a human author — machine events are system-authored, 100% of the time
- **Previous:** human authorship (re-introduced 2026-08-11 at the user's direct request, partially revisiting [[#DEC-80]] ruling 2) was drawn **uniformly across every event**: a flat ~15% of entries got a named internal/external person regardless of which event it was. That let `Auto Tender Validation` — an event whose own name says a machine did it — and the automated `Tender Sent` that follows it be attributed to a named human with an email address. S117 flagged this as owed-before-the-reseed.
- **Decision:** authorship is gated on the event, not on a dice roll. `Shipment Updated` is the **only** catalog event our product lets a user cause — it is exactly what section editing in the Shipment Details modal writes — so it is the only event that may draw a human author. Every other event in Pappu's catalog is a pipeline stage a machine emits ([[#DEC-80]] ruling 2) and is now system-authored unconditionally.
- **Source:** S117 carry-forward, ruled 2026-08-12 by the user's instruction to finish the outstanding items before the reseed.
- **Implemented:** Session 118 — `tools/generate.mjs` `buildAuthor(action, source)`. **The gate consumes exactly the same seeded faker draws it did before** (a name is drawn and then discarded for machine events) because shipment IDs come off that same stream and `src/spotboard/board.js` anchors its demo fixtures to real seeded ids — a shifted stream would have re-numbered every shipment and 404'd every SpotBoard demo row. That claim is now a test: the demo fixture ids are asserted to resolve against a freshly built dataset.

### DEC-89: The trail stamps UTC and attributes every system event to one name — `System (OdysseyOne)`
- **Previous:** timestamps rendered through `formatDateTimeMDYHM(new Date(ts))`, which reads the VIEWER'S LOCAL zone — two people in different offices saw different times on the same audit row, with nothing on screen saying which zone either was seeing. Actors rendered the emitting service verbatim (`ERP`, `Linx`, `Net Native`, `Legacy TMS`), a distinction inherited from `HISTORY_SYSTEM_SOURCES` rather than asked for.
- **Decision (user, 2026-08-12, verbatim):** *"date and time should UTC for history"* and *"All System authors is `System OdysseyOne`"*.
  - **UTC, labelled.** `formatDateTimeMDYHM` gained a `{ utc }` option that takes the **date** from UTC as well as the clock — not cosmetic: `2026-06-02T02:30Z` is June **1st** in every US zone, so formatting only the time prints a UTC clock against a local date. The ` UTC` suffix is **ours, not the ruling's** — an unlabelled UTC time is indistinguishable from a local one, and the app already stamps zones elsewhere (`04/15/2026 09:00 CDT` on stops). Scoped to History; **every other `formatDateTimeMDYHM` caller still renders local**, which leaves the Tender tab's audit timestamps (`RoutingGuideTab.jsx:873,939`) on a different clock from the trail — flagged, not silently changed.
  - **One system name.** Substituted at RENDER time, deliberately not in the generator: `entry.source` keeps the real emitting service as data a backend would genuinely send, and rows seeded before the ruling comply **with no reseed**. Applies equally to the legacy no-`author` shape. **Final spelling is parenthesised — `System (OdysseyOne)`** — a same-day follow-up to the quote above; the unparenthesised form shipped first and was live for one deploy.
- **Also this round:** the human author (the only actor carrying a tooltip) gets `cursor: pointer`; system actors keep the default, so the cursor never promises an interaction that doesn't exist.
- **Implemented:** Session 118 — `lib/dates.js`, `HistoryTab.jsx`, `panes/history.css`. Verified on production, not just in tests: jsdom cannot compute `cursor`, and the History chunk is lazy-loaded so it never appears in `index.html`'s asset list — **grepping the live bundle proves nothing here**, and the empty grep was NOT evidence of a failed deploy. Proof came from driving `odyssey-one-stage.vercel.app` itself.

### DEC-90: Full-stage bar reaches the navbar's bottom edge — the mid-page-title clearance is retired
- **Previous:** [[#DEC-56]] (S79c) capped the full stage at `100dvh − --bottombar-top-clearance` (104px, originally 146px) so the bar's top edge stopped mid page-title row, leaving a visible strip of page content between the bar and the navbar even at full expansion.
- **Decision:** full stage now fills every pixel between the navbar's bottom edge and the viewport bottom: `height: calc(100dvh - var(--navbar-height))`. `.shipments-bar` is `position: fixed` to the viewport (not a flex child of `AppShell`'s chrome), so the navbar's own height token is what has to be subtracted — the same pattern already used by the sidebar height calc and `.shipments-bar__scrim`'s `top`. `--bottombar-top-clearance` had exactly one live consumer (this rule); removed from `tokens.css` rather than left dead. Partial stage (`--bottombar-partial`) and the collapsed strip are unchanged.
- **Source:** User task instruction, 2026-08-15 — "the expanded state should occupy every available pixel between the navbar and the bottom of the viewport."
- **Implemented:** `packages/tokens/tokens.css` (token removed), `apps/odyssey-one/src/styles/components.css:5586` (`.shipments-bar--expanded`), `packages/ui/src/ShipmentsBar.jsx` (JSDoc), `ShipmentsBar.demo.jsx` (props/tokens table + legend). Not testable in jsdom (no layout engine, no class/attribute encodes the value) — verified by reading the CSS calc and the token chain instead.

---

### DEC-91: `quoteFlag` — not a rate total — is what tells a user quote from a contracted rate
- **Previous:** S120 keyed the Tender Actions menu on `hasQuote = option.rateDetails.apTotal > 0`, and gated Delete Quote additionally on `rateSource === 'Manual'` (recorded at the time as an inference, "medium-high confidence… not a field Jira names explicitly as the contract/quote discriminator").
- **Decision:** `hasQuote` is `option.quoteFlag === 'Y'`, and `canDeleteQuote` drops the `rateSource` test entirely (`hasQuote && !tenderIsLocked`). The previous reading was **wrong in kind, not merely imprecise**: a *contracted* rate also carries a positive `apTotal`, and `tools/generate.mjs:770` seeds `rateDetails` on **every** routing option. So `hasQuote` was true for every row in the app — **"Add Quote" never rendered**, the LINX-13894 contracted-rate confirm was **unreachable dead code**, and since no seeded option carries `rateSource: 'Manual'`, **Delete Quote never rendered either**. The entire 13894 action matrix collapsed to a single always-"Edit Quote" menu item. `quoteFlag` is the field Jira itself names for this: LINX-13896 sets `'Y'` on save, LINX-13897 sets `'N'` on delete, and a contracted-rate option carries neither — absent and `'N'` stay distinguishable.
- **Source:** LINX-13894 (action-visibility table), LINX-13896 ("Set Quote Flag = 'Y'"), LINX-13897 ("Set Quote Flag = 'N'") — all three `Approved` by Steve O'Hara 2026-08-05. Bug found by audit, 2026-08-16; retires the carry-forward flagged in S120.
- **Implemented:** `RoutingGuideTab.jsx` (`hasQuote`, `canDeleteQuote`), plus the round-trip fix below — without which the flag would have been written and silently discarded.

### DEC-92: `quoteFlag`/`quoteAudit` were written but never read — the whitelist mapper, a fourth time
- **Previous:** S120 persisted `quoteFlag: 'N'` on delete. `routingOptionVmToDto` spreads `...rest`, so the **write** carried it into the `tenders.option` JSON blob correctly. But `mapRoutingOption` is an **explicit whitelist** — it names every VM key it builds — so on the next load the field evaporated. Harmless while nothing read it; load-bearing the moment [[#DEC-91]] keyed the menu on it.
- **Decision:** `quoteFlag` and `quoteAudit` are declared on `SellShipmentRoutingOption` and `RoutingOptionVM` and passed through `mapRoutingOption`. `quoteFlag` is passed through **undefaulted** — absent ("contracted rate, never quoted") is a genuinely different state from an explicit `'N'` ("quote deleted"), and `orDash`-ing or defaulting it would erase that distinction.
- **Source:** Found by audit, 2026-08-16, while verifying DEC-91's round-trip. This is the **fourth** occurrence of the whitelist-mapper bug class (S120's `planningDateType` was the third). No migration — both fields ride the existing JSON blob.
- **Implemented:** `api/types/sellShipmentOut.ts`, `api/types/shipmentDetail.ts`, `api/mappers/mapSellShipmentOutToDetail.ts`.

### DEC-93: Add Quote attaches to the SELECTED routing option — it never creates one
- **Previous:** `handleQuoteSave`'s `add` branch **appended a brand-new routing option** at `maxRank + 1`, synthesising ~50 placeholder fields (`routeGroup: 'Spot'`, `linehaul: 'Pending'`, `description: 'Manual quote'`…) for a carrier the routing guide never returned. Leftover from the page-level "Add Quote" button S120 deleted when Jana moved the action into the per-row truck menu.
- **Decision:** Add and Edit are **one operation** on the option whose row menu was used — the branches collapse to a single in-place update. LINX-13894: "Quote information shall be maintained independently for each Routing Option"; LINX-13895 makes the entry page's Carrier Option section read-only, *sourced from that option*. Both entry points now pass the selected option as `carrierData` (the contracted-rate confirm path passed `null`, so the form opened blank).
- **Source:** LINX-13894 + LINX-13895 (`Approved`), plus Jana's own framing that moved the action per-row — "quote is being added for every option."
- **Implemented:** `RoutingGuideTab.jsx` (`handleQuoteSave`, `handleConfirmAddQuote`, `handleAction`). Regression pinned by a test asserting the option count is unchanged and the rank preserved.

### DEC-94: Both quote confirms carry Jira's copy verbatim — the S119 shortening rule does not reach them
- **Previous:** both dialogs shipped shortened. LINX-13894's read "A contracted rate already exists for this carrier option. Do you want to continue?" — dropping the sentence naming the actual consequence. LINX-13897's read "This quote will be permanently removed and cannot be undone", under a comment **claiming it was verbatim from the ticket**; it was not.
- **Decision:** both messages are now verbatim. [[#DEC-89]]-era S119 shortened the tab **error surfaces** on the user ruling *"we dont want to overwhelm the user with a big message"* — that ruling was scoped to error states with a Reload affordance, not to destructive-action confirms. A confirm whose second sentence states the consequence ("Entering a quote will override the existing contracted rate") is not overwhelming the user; removing it makes them confirm something the dialog never told them.
- **Source:** LINX-13894 and LINX-13897 AC text, both `Approved` 2026-08-05.
- **Implemented:** `RoutingGuideTab.jsx` (`AddQuoteConfirm`, `DeleteQuoteConfirm`).

### DEC-95: A quote save writes an audit record; a delete keeps it
- **Previous:** save wrote only `modifyUser`/`modifyDate`, and only on the add path — editing a quote updated neither. Delete set `quoteFlag: 'N'` but left `carrierQuoted` reading `'Yes'`.
- **Decision:** every save writes `quoteFlag: 'Y'`, `carrierQuoted: 'Yes'`, `rateSource: 'Manual'` (the Rate Source column would otherwise still read "Contract" on a user-typed rate) and a `quoteAudit` object — `createdBy`/`createdDate` survive an edit, `updatedBy`/`updatedDate` move. Delete sets `carrierQuoted: 'No'` (LINX-13897's "Set Carrier Quoted = Unchecked" — skipped in S120 because LINX-12581 isn't built, but the *field* has to be right whether or not a checkbox reads it) and **deliberately retains `quoteAudit`**: an audit trail that vanishes with the thing it audits is not an audit trail.
- **Source:** LINX-13896 ("Audit Information" — Created By/Date, Updated By/Date, Initial Cost, Final Cost) and LINX-13897, both `Approved`.
- **⚠️ Inference, flagged:** 13896 specifies only *"Initial Cost (either null or cost/total exist from the initial quote)"*. We read `initialApAmount` as **the AP total before the first user quote** — i.e. the contracted rate being overridden — preserved across later edits. That is the reading that makes it useful beside `finalApAmount`, but the sentence also supports "the first quote's own total". **Needs Jana.** Recorded per the S114 lesson that a ticket's existence is not a ticket's specification.

### DEC-96: Quote entry is blocked when the option has no pickup/delivery dates
- **Previous:** no such gate; Add Quote always opened the form.
- **Decision:** Add Quote first checks the option's `pickupDateTime`/`deliveryDateTime` (absent, empty, or the `--` placeholder all count as unavailable) and shows a single-OK dialog carrying LINX-13895's verbatim message; the entry page does not open and the user stays on Routing Options. The gate runs **before** the contracted-rate confirm. `ConfirmDialog`'s `cancelLabel` became optional so one shell covers both one- and two-button dialogs rather than a second portal being written.
- **Scoping call:** the AC names **Add Quote only**, so Edit Quote is deliberately not gated — an existing quote already has dates. Commented in place.
- **Source:** LINX-13895 "Quote Entry Validation", `Approved` 2026-08-05.
- **Implemented:** `RoutingGuideTab.jsx` (`DatesUnavailableConfirm`, `handleAction`). Escape and the header X route to the same dismiss as OK.

---

### DEC-97: The Carrier Option section is read-only — and the note that blocked this was stale
- **Previous:** `add` and `edit` mode rendered SCAC and Equipment as editable ComboBoxes and Pickup/Delivery as editable date/time pickers. Only `view` mode showed them as values.
- **Decision:** LINX-13895's "Carrier Option" section is **read-only in all three modes** — SCAC, Carrier Name, Equipment, Pickup, Delivery, in the ticket's own order, sourced from the selected Routing Option and rendered as `TitleSubtitle`. The page is now the two sections the ticket names: read-only **Carrier Option**, then editable **Quote** (the section `<h3>` was "Rate"; renamed to the ticket's word). The SCAC lookup, `EQUIPMENT_OPTIONS`, `handleScacSelect` and the editable `DateTimePair` branch were deleted as newly dead. **Read-only does not mean dropped from the save** — `handleSave` still emits all five fields, and a test pins the `equipmentCode` round-trip that protects.
- **⚠️ This reverses an escalation I raised and got wrong.** I told the user 13895 conflicted with [[#DEC-84]] because this modal was "the only place a quote's Equipment is edited" — sourced from a comment in `QuoteModal.jsx`'s own header. That comment was **stale**: `ShipmentDetailsModal.jsx:22` has `EDITABLE_GENERAL = new Set([… 'Equipment'])` with its own ComboBox and its own `saveTenderOption` call, and [[#DEC-82]] had already removed the three per-field pens the comment described. There was never a conflict. The lesson is the S114 one again in a new costume: **a code comment is not evidence**, and an escalation built on one blocks real work. The comment is now corrected in place rather than deleted, so the next reader sees why.
- **Source:** LINX-13895 ("The Quote Entry Page shall display a read-only Carrier Option section"; "Carrier Option information shall be read-only"), `Approved` 2026-08-05. Raised by the user, 2026-08-16 — *"it specifies there are two sections one read only other for edit."*
- **Implemented:** `QuoteModal.jsx`, tests across `QuoteModal.test.jsx` / `RoutingGuideTab.test.jsx` / `ShipmentDetailsModal.test.jsx`.

### DEC-98: Pickup/Delivery carry Day and Org Hours — and the day is DERIVED, not stored
- **Previous:** the composed read-only value was date + time + timezone only.
- **Decision:** LINX-13895's Carrier Option table specifies "Pickup Date, Time (if available), Time Zone, **Day, Org Hrs**", with its own example `01/07/2026 09:00 CST, Tue, (07:00-15:30)`. Both are now rendered. Day-of-week is **derived from the date**, not read from a field: the VM carries `pickupOrgDay` but has **no `deliveryOrgDay`**, so only one side could ever have used a stored value — and a stored day can silently disagree with its own date, which a derived one cannot. Parsed part-wise rather than via `new Date(string)`, whose `MM/DD/YYYY` handling is implementation-defined, and an impossible date (`02/31`) yields no day rather than a rolled-over one. Every part is optional and omitted when absent, so a partial record degrades to `01/07/2026, Tue` rather than `01/07/2026 , , ()`; an empty one reads `--`.
- **Corroboration:** LINX-13953 says "org hrs are not required" for *dropped carriers* — the explicit exception confirms org hrs are required here.
- **Source:** LINX-13895 Carrier Option table, `Approved`. Gap found on a re-read after the user challenged the depth of the first requirements pass, 2026-08-16.

### DEC-99: `quoteFlag` is SEEDED — a discriminator no data carries makes half the UI unreachable
- **Previous:** [[#DEC-91]] keyed the Tender Actions menu on `quoteFlag`, which `generate.mjs` never wrote. Correct per Jira and **worse in practice**: where the old bug made every row read "Edit Quote", the fix made every row read "Add Quote", so Edit Quote and Delete Quote became unreachable in the running app. A discriminator is only as real as the data behind it.
- **Decision:** `'Manual'` joins the `rateSource` draw, and `quoteFlag: 'Y'` / `carrierQuoted: 'Yes'` / `quoteAudit` are **derived** from it. ~19.5% of routing options are user-quoted, across 1349 of 2200 shipments, so both menu states are demonstrable without the user first creating a quote. Coherence over mere presence ([[feedback_seeded_data_must_be_coherent]]): a flagged option always has an audit record, because a row claiming a saved quote with no audit trail is data contradicting itself. `initialApAmount` is null — these seeded quotes overrode no recorded contracted rate.
- **Zero new faker draws, verified not argued:** `arrayElement` consumes one draw regardless of array length, and the derivation block draws nothing. Checked empirically by stashing the change, regenerating, and diffing all 2200 ids — **identical**. This matters because [[feedback_seeded_ids_are_load_bearing]]: one extra draw renumbers every shipment and kills hardcoded ids silently.
- **Source:** user, 2026-08-16 — *"why we just have add quote now."*

### DEC-100: Confirmation dialogs get their own reading measure
- **Previous:** the three confirms rendered at `.modal-medium`'s default sizing — `width: auto`, `max-width: 920px`, content-driven for the Shipment Details 4-column grid ([[#DEC-56]]-era, S102).
- **Decision:** `.modal-medium.confirm-dialog { max-width: 440px }`, applied through the `className` prop `ModalMedium` already exposes — the shared normalized component is **not** touched, so no Figma/DSM/Angular cycle is triggered. 440px holds roughly 60 characters at `--text-label-sm-regular`, inside the 45–75 range that keeps prose readable, and sits clear of the 350px min-width so the constraints don't fight. Deliberately a local layout constant rather than a token: it describes this dialog's reading measure, not a system-wide value. Colour, radius, type and shadow still come from `.modal-medium`'s tokens.
- **Self-inflicted cause, recorded:** the dialogs only looked wrong *after* [[#DEC-94]] restored the verbatim multi-sentence Jira copy. Fixing copy without fixing the measure it now needed was half a job.
- **Source:** user, 2026-08-16 — *"Confirm Add Quote modal looks unnecessarily wide, when we are only displaying a confirmation dialog use a narrow width."*
- **Not verified:** jsdom has no layout engine. Tests assert the class is applied; **actual width needs a browser check.**

---

### DEC-101: `initialApAmount` is the AP total BEFORE the first user quote — the contracted rate being overridden
- **Previous:** implemented that way in [[#DEC-95]] but recorded as **our inference**, since LINX-13896 says only *"Initial Cost (either null or cost/total exist from the initial quote)"* — a sentence that equally supports "the first quote's own total".
- **Decision:** reading (a) is confirmed. `initialApAmount` captures the AP total as it stood *before* a user quote replaced it, is null when the option carried no rate to override, and is preserved across every later edit while `finalApAmount` tracks the current one. The pair therefore answers *"what did overriding the contract cost us?"*, not *"how far has this quote drifted?"*
- **Source:** user ruling, 2026-08-16, choosing option (a) from the two readings put to them.
- **Implemented:** already live — no code change. This entry exists only to retire the inference flag on [[#DEC-95]]; the field's meaning is now specified rather than assumed.

### DEC-102: LINX-13897 wins — Delete Quote is hidden on `Sent` and `Accepted`
- **Previous:** two `Approved` tickets contradicted each other and the resolution was mine, not the product's. **LINX-13897:** *"Delete Quote option should not be available when the Option is in tender status 'Sent' or 'Accepted'. Edit option will be to user."* **LINX-13894's table:** Quote Exists = Yes → *"Edit Quote, Delete Quote"*, with no status condition at all. Both approved by Steve O'Hara on 2026-08-05.
- **Decision:** follow **LINX-13897**. A quoted option in `Sent`/`Accepted` offers Edit Quote only; every other status offers Edit and Delete. This is why some quoted rows legitimately show no Delete — behaviour that read as a bug until the rule was written down.
- **Source:** user ruling, 2026-08-16. Supersedes the risk-based judgement recorded in `RoutingGuideTab.jsx`'s comment, which now describes a settled rule rather than a pending one.
- **Implemented:** already live (`canDeleteQuote = hasQuote && !tenderIsLocked`). No code change; the code comment should stop describing this as flagged for re-decision.

### DEC-103: The Quote Entry "Page" is a MODAL — the ticket's noun is Jana's vocabulary, not an architecture
- **Previous:** open question. LINX-13895 is titled *"Tender - Quote Entry Page"* and inherits that noun from [[#DEC-103|LINX-3966]], which describes a genuine full page reached from the **Rating Errors** screen with `Save and Reallocate Quote` / `Cancel Quote` / `Retry` buttons and a real navigation away and back.
- **Decision:** in the **Tender tab** context it is a modal, and that is correct. 13895's own wording is modal-compatible — *"User shall remain on Tender → Routing Options"* — and the form has two hosts: a page from Rating Errors (3966) and a modal from the Tender tab (13895). "Page" is how Jana refers to the form, not a statement about routing.
- **Source:** user ruling, 2026-08-16 — *"is modal, jana calls it page."*
- **Why it matters:** it also means **LINX-3966 is prior art for this form**, not merely a cross-reference. It is `Done`, authored by Jana, and specifies field-level behaviour (6 decimals, currency from TMS master data, 3-letter charge codes, auto-populated descriptions) that 13895 abbreviates to "check story LINX-3966". Read 3966 before treating any 13895 field rule as underspecified.

### DEC-104: Currency must be explicitly SELECTED — defaulting it to USD made an approved validation unreachable
- **Previous:** `QuoteModal` seeded `currency` from `carrierData?.rateDetails?.currency || 'USD'`. I then reported the AC *"Please select a currency"* as **vestigial** — reasoning from our implementation back to the spec, which had it exactly backwards.
- **Decision:** currency starts unselected on a new quote and must be chosen deliberately; an existing quote restores its saved currency. The validation message was already wired and correct — our default is what made it dead code.
- **⚠️ Note for whoever implements a variant of this:** deleting the `|| 'USD'` is NOT sufficient. `mapRoutingOption` defaults an absent `rateDetails` to `{ …, currency: 'USD', … }`, and `generate.mjs` writes `currency: 'USD'` onto every seeded routing option — so `carrierData.rateDetails.currency` reads `'USD'` even for an option nobody ever quoted. The add-vs-edit distinction has to come from `mode` or `quoteFlag`, not from the currency value itself.
- **Source:** **LINX-3966** General Rule 5 (verbatim): *"If currency is not selected for the fields for which data added (Rate/amount), then error message should be displayed under each of those currency fields as 'Please select a currency'."* Corroborated by LINX-13895's Validation Messages table and its *"Currency Selection is mandatory."* User approved the fix, 2026-08-16.

### DEC-105 (OPEN): 3966 wants a missing-markup warning that 13895 never mentions
- **LINX-3966:** *"If the user misses entering Markup, and AP and AR rates are the same, display the error message: 'AP and AR rates are same. Markup amount has not been provided. Please check and input markup amount to ensure it is not missed.'"*
- **Status:** **not implemented, not ruled on.** LINX-13895 is silent on it, and 13895 only points at 3966 for currency and charge-code sourcing — so it is genuinely unclear whether this warning belongs on the tender-side Quote Entry page or only on the Rating-Errors one. Markup is optional in both tickets, so this is a nudge rather than a blocker.
- **Needs Jana.** Logged rather than silently adopted or silently dropped.

---

### DEC-106: Dropped carriers ride in `shipments.detail` — no migration, no API change
- **Previous:** no dropped-carrier data existed anywhere. Zero hits for `dropped`/`droppedCarrier`/`reason` across the generator, seed, API handlers and DB. The plan opened assuming an additive `shipments.dropped_carriers` jsonb column, mirroring [[#DEC-82|DEC-82]]'s `overrides`.
- **Decision:** **no column and no migration.** `sellShipmentDetail()` (`api/_lib/shipments.mjs:200,223`) returns `shipments.detail` **verbatim**, overlaying only `shippingOptionList` from the `tenders` table. So a `droppedCarrierList` key emitted by the generator into `SellShipmentOut` lands in `detail` at seed time and comes straight back out — the API layer needs no change at all.
- **Rationale:** the migration would have bought nothing. `overrides` needed its own column because it is **written** after seed time by a PATCH; dropped carriers are read-only routing output, written once. Adding a column for a value that is never independently written is ceremony.
- **⚠️ Forward risk, recorded now rather than discovered later:** because `detail` is written once at seed time, this shape supports **read only**. LINX-13954's Process SCAC does not need it — [[dropped-carrier#OQ-10|OQ-10]] was ruled **COPY**, so the dropped row is never mutated. Had it been ruled *move*, 13954 would have needed an overlay column after all.
- **Source:** LINX-13953. Shape confirmed against the live handler, not inferred from the schema.
- **Implemented:** `tools/generate.mjs`, `api/types/sellShipmentOut.ts`, `4eb1c80`.

### DEC-107: Dropped carriers draw from an ISOLATED Faker instance — verified, not argued
- **Previous:** every draw in `generate.mjs` comes from the one module-level `faker` singleton. Adding one draw to that sequence renumbers every shipment id downstream — the failure that silently killed the SpotBoard demo fixtures in S118 ([[#DEC-99|DEC-99]] hit the same wall from the other side).
- **Decision:** `const droppedFaker = new Faker({ locale: en })`, seeded `1953` alongside `faker.seed(42)`. `buildDroppedCarriers` touches **only** `droppedFaker`. Id stability is therefore true by construction rather than by luck.
- **Verified, not asserted.** The pre-change generator was extracted from git, both versions were imported into one process, and every generated value was compared: **2200 shipment ids identical in order · 2200 buyShipment ids identical · 5077 order numbers identical · all 2200 detail payloads identical on every field**. The one field that did differ, `documentList.createdAt`, was proved pre-existing by a control run comparing the OLD generator **against itself** — it comes from `faker.date.recent()`, which is relative to the wall clock, and drifts identically with no change applied at all.
- **Rationale:** the S121 lesson generalised. "It cannot perturb the sequence" is an argument; a full-corpus diff is evidence, and it costs four minutes.
- **Source:** [[feedback_seeded_ids_are_load_bearing]]. **Implemented:** `4eb1c80`.

### DEC-108: The Dropped Carrier table is deliberately mostly dashes
- **Previous:** the first plan seeded rich values for all 23 of LINX-13953's fields — route rank, RPC-ID, transit time, dates, a full commitment block.
- **Decision:** **seed only what routing actually returns.** The sample payload (Jana, confirmed current 2026-08-17) gives a dropped carrier **five** attributes — `seq`, `service`, `carrier`, `drop-code`, `drop-reason` — against eighteen for a qualified one. So `routeRank`, `pickup`, `delivery`, `startDate`, `stopDate`, `transitTime`, `transitSource`, `routeGroup`, `rpcId`, `ttId` and the entire commitment block are seeded `null` and render `--`.
- **Rationale:** 13953 anticipates exactly this with a blanket rule — *"If Routing does not return a value for **any** field displayed within the Dropped Carrier section, Odyssey One shall display '--'"* — plus seven fields individually marked *"(if returned by Routing)"*. Seeding rich values would have made the prototype look finished while the real screen renders dashes, which inverts the point of seeded data ([[feedback_seeded_data_must_be_coherent]]).
- **This corrected an escalation of mine.** I raised the sparse payload as a **blocker** — "the ticket asks for 23 fields and routing returns 5". Jana's reply, *"all of those questions are already answered in the stories"*, was correct: the Null Handling rule is at line 112 of an AC I had already transcribed. I read the field table and stopped before the rules. Same failure as [[#DEC-97|DEC-97]] in a new costume.
- **Consequence, flagged not hidden:** most columns are empty today. Whether that is the right *presentation* is a VD question, and it is now answerable by looking at the real thing rather than a flattering mock.
- **Source:** LINX-13953 Null Handling + the routing payload. **Implemented:** `4eb1c80`, `5b617c5`.

### DEC-109: The drop-reason CODES are real; the descriptions are still ours
- **Previous:** six invented reason codes, of which exactly one (*Missing Transit Time*) matched reality — the only pair LINX-13953 supplies.
- **Decision:** the catalog is now the payload's own: **`1` No Rates · `2` Prohibited Carrier · `23` Missing Transit Time**, weighted 4 / 1 / 6 to the sample's observed mix. `dropCode` is carried as its own field through DTO → VM because it is the **lookup key** for the long description.
- **Still invented: the descriptions.** Routing returns the short label only. Jana says the long text comes *"From TMS"*, looked up by drop-code, and the exact table is still owed — it is the ticket's surviving *"require code from Dave"* red flag ([[dropped-carrier#OQ-2|OQ-2]]). ⚠️ **Do not demo the description column as real TMS text.** Same standing as the invented charge codes from S121.
- **Note on `Prohibited Carrier`:** Jana said *"there's no such thing as prohibited"* when asked whether such a carrier should be processable. Read as *no special case* — Process SCAC must not branch on drop reason. The code stays in the catalog because it is verbatim in his own confirmed-current payload; the tension is recorded in [[../questions-for-jana-2026-08-17|the question set]] rather than resolved by deleting data.
- **Codes are sparse (1, 2, 23),** so the real catalog has at least 23 entries and we have seen three.
- **Source:** `vault-sources/10-domains/shipments/sources/routing-response-sample-S260000025.xml`. **Implemented:** `4eb1c80`.

---

## Changelog

| Date | Decisions added |
|---|---|
| Aug 17, 2026 | DEC-106 through DEC-109 — Dropped Carrier display shipped (LINX-13953): **DEC-106** the data rides in the existing `shipments.detail` jsonb because `sellShipmentDetail()` returns it verbatim, so **no migration and no API change** (the forward risk is noted: `detail` is write-once, which only works because OQ-10 was ruled COPY); **DEC-107** an isolated Faker instance keeps the main draw sequence intact, **verified by a full-corpus diff** — 2200 ids, 5077 order numbers and every detail payload identical, with the one drifting field proved pre-existing by a control run of the OLD generator against itself; **DEC-108** the table is **deliberately mostly dashes** because routing returns five attributes for a dropped carrier, which the AC's blanket Null Handling rule already anticipates — correcting a blocker I raised that the ticket had answered all along; **DEC-109** the drop CODES are real (1 No Rates / 2 Prohibited Carrier / 23 Missing Transit Time) but the long descriptions are still ours pending Dave's TMS table |
| Aug 16, 2026 | DEC-101 through DEC-105 — user rulings closing the Quote group's open questions: **DEC-101** `initialApAmount` = the AP total before the first user quote (retires the DEC-95 inference flag); **DEC-102** LINX-13897 wins over 13894 — Delete hidden on `Sent`/`Accepted`; **DEC-103** the Quote Entry "Page" is a modal in the Tender tab, "page" being Jana's vocabulary — and **LINX-3966 is prior art for this form**, not just a cross-reference; **DEC-104** currency must be explicitly selected, our `\|\| 'USD'` default having made an approved validation unreachable; **DEC-105** logged OPEN — 3966's missing-markup warning has no ruling for the tender-side page |
| Aug 16, 2026 | DEC-97 through DEC-100 — second pass after the user challenged the first: **DEC-97** the Carrier Option section is read-only in all three modes, reversing an escalation I raised off a **stale code comment** that claimed this modal was the only Equipment editor (it never was); **DEC-98** Pickup/Delivery gain Day and Org Hours, with the day DERIVED because `deliveryOrgDay` does not exist; **DEC-99** `quoteFlag` seeded — DEC-91 was right per Jira but left Edit/Delete Quote unreachable because no data carried the field, fixed with zero new faker draws and all 2200 ids verified unchanged; **DEC-100** confirmation dialogs capped at a 440px reading measure, a problem DEC-94's verbatim copy created |
| Aug 16, 2026 | DEC-91 through DEC-96 — the Quote group (LINX-13894/13895/13896/13897) taken from "shipped" to actually reachable: **DEC-91** the Add/Edit/Delete menu keys on `quoteFlag`, not `apTotal > 0`, which had been true for every seeded row and made "Add Quote" and the contracted-rate confirm dead code; **DEC-92** that flag was being written and silently dropped on read by the mapper whitelist (**fourth** occurrence of that bug class); **DEC-93** Add Quote attaches to the selected option instead of appending a phantom one; **DEC-94** both confirms restored to Jira's verbatim copy, with one comment that had falsely claimed to be verbatim; **DEC-95** save writes a retained audit record and delete unchecks Carrier Quoted, with the `initialApAmount` reading flagged as ours; **DEC-96** quote entry gated on the option having pickup/delivery dates |
| Aug 15, 2026 | DEC-90 — full-stage BottomBar now fills every pixel between the navbar and the viewport bottom (`100dvh − --navbar-height`), retiring the S79c mid-page-title `--bottombar-top-clearance` cap |
| Aug 12, 2026 | DEC-89 — the trail stamps **UTC** (date and clock both, labelled) and attributes every system event to a single name, **`System (OdysseyOne)`**, substituted at render time so `entry.source` keeps the real provenance and pre-ruling rows need no reseed; human authors get a pointer cursor, system actors deliberately don't |
| Aug 12, 2026 | DEC-87 + DEC-88 — History trail truthfulness pass before the reseed: badge colour becomes a **five**-tier hierarchy with green reserved for three genuine milestones (Tender Accepted, clean PGI, Planning Completed), a new gray `info` tier absorbing outbound-messaging chatter, and `Optimization Evaluation → Hold` moved to amber (our call, previously parked for Pappu); and human authorship gated to `Shipment Updated` — the only event a user can actually cause — so machine events can no longer be attributed to a named person |
| Aug 11, 2026 | DEC-82 through DEC-86 — Shipment Details modal section-level edit mode: the per-field pen removed entirely in favour of one Edit → Save Changes control per section header (disabled until dirty, primary when saving, cancel X, one section at a time enforced structurally by a single state object); shipment-STAGE edits given their own additive `shipments.overrides` jsonb column + `PATCH .../overrides`, explicitly never writing back to order data, with the list grid COALESCEing the same overrides so it can't contradict the modal; General Information's save recorded as a deliberate two-call sequential split (Equipment → tenders row because it belongs to the routing option, everything else → overrides); Edit Quote reframed as a VIEW of the details modal rather than a dialog stacked on it (gated on a `leading` header slot for the normalized `ModalMedium`, Figma-first); and **DEC-86 — the modal's quote save never persisted at all since the pens shipped, while two of its own comments asserted that it did** |
| Aug 10, 2026 | DEC-80 — user rulings closing the Shipment Trail's open questions: the Trail RENDERS backend events rather than authoring them (retiring the open/closed-vocabulary question as not ours, and reframing DEC-79 as wrong-in-kind not wrong-in-content); MVP actor is system or integrated application (`Net Native`), inverting DEC-70's ~75% user-attributed seeded ratio; `Quote Entered` dropped as a user action; PGI/PGR data-only with no design; and the `<$125.00>` "typo" flag WITHDRAWN — angle brackets are placeholder notation |
| Aug 10, 2026 | DEC-77 through DEC-79 — Shipment Trail intake (Pappu MVP spec + email): "Shipment Trail" ruled identical to the History screen (terminology only); MVP event catalog (15 events/25 variants, parameterized templates) ingested as canon, not implemented; gap analysis finding only 2/16 events overlap by name, divergence is user-centric (ours) vs lifecycle-centric (spec), Tender Accepted/Declined vs one Tender Response Received event is structural not naming, MVP scope inversion (~75% of our entries are user-attributed while Sheet3 defers User Action), Net Native missing from HISTORY_SYSTEM_SOURCES, LINX-13065 events flagged as a tension not an error |
| Aug 10, 2026 | DEC-71 through DEC-76 — S114 Tender audit round: CostTooltip AR sourced from `rateDetails.arTotal` (the old read was to a non-existent field, so AR and Margin were dead since ship); one currency per quote (`markupCurrency` deleted as arithmetically incoherent, not persisted); tender actions write the audit trail with NOTIFY vs RESPONSE distinguished across all five actions and `Re-Tender` clearing the prior cycle; live timestamps on the `formatDateTimeMDYHM` canon with the TZ honestly omitted; `rate === rateDetails.baseRate` established as an invariant (broken by Edit Quote **and** by a duplicate generator draw — reseed owed); and `routingOptionVmToDto`'s 6-pair list **verified 57/51/6 field-by-field**, closing the S113 debt, plus the Routing Guide column gear removed |
| Aug 3, 2026 | DEC-70 — History tab rebuilt: timeline anatomy kept over order-domain tabular AC (our call), MM/DD/YYYY HH:MM 24h + User/System split verbatim from LINX-8091, PGI-corrected + quote-entered events verbatim from LINX-13065 |
| Apr 1, 2026 | Initial decision log created — DEC-01 through DEC-17 from Sessions 2-5 |
| Apr 1, 2026 | DEC-18 (panel pools), DEC-19 (filter vs column visibility), DEC-20 (context-aware menu) from Session 6 speccing |
| Apr 1, 2026 | DEC-21 through DEC-27 — Major corrections from grooming with Jana: Monitoring = same screen as Exceptions, PPT slides were one split table, tender statuses reduced to 4, shipment status mapping, actions in both panels, shipment status column |
| Apr 13, 2026 | DEC-28 through DEC-38 — David's written feedback review + Apr 9 grooming with Jana/David/Manuela: hazmat badges, column auto-fit/wrapping, cost visibility from tender tab, panel-aware presets, date-only display, "Tender Sent" rename, order tab overhaul, TenderSummary removal, Order # deprioritized |
| Apr 13, 2026 | DEC-39 — Merge Hazmat Class/Group into Hazardous column with hover tooltip (PENDING stakeholder approval) |
| Jul 5, 2026 | DEC-40 through DEC-47 — S79 Shipments update: Orders tab SubAccordion rebuild, shadow-up-lg token, tab arrangement panel, radio removal, GlobalSearch as table search, Tooltip migration, icon-button standardization, sidebar-shift fix |
| Jul 6, 2026 | DEC-48 through DEC-55 — S79b: pane column tiers, content-proportional bar height, up-only shadow clip, search glimpse/commit/open flow, DataTable external footer + Paginator restyle (React+Angular, demoted), sticky-header gap root cause, Orders canon fake data + orphaned documents/notes/history wired, all 7 tab panes restyled |
| Jul 6, 2026 | DEC-61 through DEC-65 — S79d/e: bar animation v3 + open-to-cap, customers data-backed, toolbar parity, GroupTable + SummaryStrip staging components |
| Jul 30, 2026 | DEC-69 — only LTL is capped at 2 stops; stop-splitting no longer gated on TL (refuted by the real 1P/3D TT/ISO load in the Tracking payload) |
| Jul 30, 2026 | DEC-68 — SETTLED: Consolidation is the umbrella, Aggregation (same O/D) + Multistop (multiple pickup and/or delivery) its subtypes; all seeded shapes valid, no constraint needed; direct cost order-level |
| Jul 30, 2026 | DEC-67 — order↔stop invariant: TL deliveries split like pickups, order ship-to follows its own delivery stop. Includes a rejected over-correction (mode-gated order count) recorded so it is not re-attempted (regen; reseed owed) |
| Jul 24, 2026 | DEC-66 — buyShipment = THE shipment ID (Jira-confirmed LINX-11591/12490/13023): buy-first default columns, unique buyShipment in generator + DB UNIQUE + reseed; sell stays internal wire key |
| Jul 6, 2026 | DEC-56 through DEC-60 — S79c: bar interaction model v2 (104px cap, drawer easing, useTransition tab switch, close=deselect, outside-click close), unified search criteria + search-aware counts, zero-count tab hiding (PGI/PGR exempt), customer-list first-order scoping (+ERCO assigned), sticky toolbar clamp |
