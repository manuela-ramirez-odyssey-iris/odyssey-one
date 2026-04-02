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

## Changelog

| Date | Decisions added |
|---|---|
| Apr 1, 2026 | Initial decision log created — DEC-01 through DEC-17 from Sessions 2-5 |
| Apr 1, 2026 | DEC-18 (panel pools), DEC-19 (filter vs column visibility), DEC-20 (context-aware menu) from Session 6 speccing |
| Apr 1, 2026 | DEC-21 through DEC-27 — Major corrections from grooming with Jana: Monitoring = same screen as Exceptions, PPT slides were one split table, tender statuses reduced to 4, shipment status mapping, actions in both panels, shipment status column |
