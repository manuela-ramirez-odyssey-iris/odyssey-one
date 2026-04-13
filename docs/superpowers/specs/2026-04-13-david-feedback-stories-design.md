# David's Feedback Stories — Design Spec

**Source:** Review-David1.docx (David Johns) + 0409-Shipment-grooming-JanaDavid.vtt (Apr 9, 2026 — Jana, David, Manuela)
**Date:** April 13, 2026

---

## Context

David Johns reviewed the live shipments demo and provided written feedback (13 items across Shipment List, Order General, Product, Tender, and Cost Allocation areas). A grooming session on Apr 9 with Jana and Manuela resolved all items — confirming 11 as actionable, deferring 2, and adding 1 new item from the discussion.

---

## SHP-43 — Hazmat Badge Visual

**Source:** David feedback #11 ("Haz — would an image work better than Yes value?") + grooming confirmation (Jana: "a triangle, warning triangle")

### Product Tab (Haz column)
- **Hazmat = true:** Yellow badge with warning triangle icon + "Hazmat" text
- **Hazmat = false:** Display "--" (no badge, no text)

### Shipments Table (Hazardous column)
- Rename column header: "Hazardous(Y/N)" → **"Hazardous"**
- Same badge logic: yellow badge + warning icon + "Hazmat" when true, "--" when false

**Size:** S

---

## SHP-44 — Column Auto-Fit, Header Wrapping, and Manual Resize

**Source:** David feedback #3 ("Is there a way for a user to change column width?") + grooming discussion (Jana: auto-adjust based on content; David: "sounds good, hard to say in practice")

### Auto-Fit Defaults
- Column width = header text width + ~20-30% buffer
- Headers wrap words vertically (stacked) when header text is wider than the computed width — e.g., "Shipment Status" becomes two lines, making the header row taller
- Header content is **always fully visible, never clipped**

### Content Truncation
- Cells that overflow their column width show "..."
- Hover tooltip shown **only if more than 2 words are truncated** — minor clipping shows "..." but no tooltip (avoids tooltip spam)
- Default widths are "forgiving" — if content nearly fits the header width, give it enough room rather than truncating for 1-2 characters

### Manual Resize
- Users can drag header column borders to resize
- **Visual cue:** on hover over any header cell, resize handle strokes appear on the column borders — making the drag affordance discoverable
- Minimum column width = whatever fully displays the wrapped header text
- Columns can **never shrink enough to clip header words**

**Size:** L

---

## SHP-45 — Cost Visibility from Tender Tab

**Source:** David feedback #13 ("Will this only populate when a carrier is Accepted?") + grooming resolution (Jana: AP/AR costs populate during tendering evaluation; Manuela proposed clickable AP cost link)

### AP Cost Cell in Routing Table
- Hover on AP cost value → **compact tooltip** showing:
  - AP Total: $X,XXX
  - AR Total: $X,XXX
  - Margin: $XXX (X.X%)
  - "View Details" link
- Click "View Details" → opens existing **Show Rate Details modal** (SHP-29) for that carrier

### Domain Note
- Cost Allocation tab data is available from "Sent" status onward (rating service is called during tendering evaluation), not just after carrier acceptance

**Size:** S

---

## SHP-46 — Product Tab Table Styling Overhaul

**Source:** David feedback #10 ("Can we move the column headers closer to the rows?") + grooming discussion (Jana: "differentiate header from data"; Manuela: "I had the same feelings")

### Problem
The Product tab table has multiple visual issues that confuse users:
1. Table sits flush against the tab bar (negative margin hack) — header blends with tabs
2. **Order separator rows** have white background + heavy 2px border-default stroke — visually compete with the actual column headers
3. **Expand/collapse buttons** have bordered white boxes (1px solid border-default) that look like interactive header elements, adding visual noise
4. Overall the table doesn't match the clean style of other detail tables (e.g., Cost Allocation)

### Changes
- Add **top spacing** between tab bar and table so the header row is clearly separate from tabs
- Match **Cost Allocation table style** across the board: header color (`--text-placeholder`), row styling, spacing
- **Order separator rows:** make more subtle — lighter treatment that clearly groups orders without heavy strokes competing with the column header. The separator should feel like a group label, not a table header.
- **Expand/collapse buttons:** more elegant, minimal design — remove the heavy bordered box look. Use a subtle chevron or icon that doesn't compete with column headers.
- Child rows background should feel like they belong to the group without harsh contrast

**Size:** S

---

## SHP-47 — Panel-Aware Column Presets

**Source:** David feedback #1 ("Can you have the columns change based on the Tab I am in?") + grooming confirmation (Manuela proposed two profiles; Jana + David confirmed)

### Behavior
- The Column Arrangement panel becomes **panel-specific** — Exceptions and Monitoring each have their own independent column panel with their own presets and user customizations
- When user switches panels, the column panel reflects that panel's configuration
- User can choose to set up the same columns for both, or different ones — their choice

### Default Presets
- **Exceptions:** includes Message, Validation Message columns (relevant for exception resolution)
- **Monitoring:** hides Message/Validation Message (David: "that message is meaningless if I go to monitoring tabs"), shows columns relevant to monitoring

### Implementation
- Builds on existing ColumnPanel preset infrastructure (SHP-18)
- Each panel stores its own active preset and column selection independently

**Size:** M

---

## SHP-48 — Date-Only Display with Time-on-Hover

**Source:** David feedback #4 ("I don't think users are very interested in the time field on dates. Maybe we only show the times when you hover?") + grooming confirmation (all three agreed)

### Shipments Table Date Columns
- Display **date only** (e.g., "Apr 10, 2026") — no time
- On hover → DarkTooltip shows full date + time (e.g., "Apr 10, 2026 06:30 CST")

### Rationale
- David: "The date is important, the time is not" — time is "a made-up time by the system" unless it's an appointment
- Saves ~50% column width on date columns — "the real estate's important"

**Size:** S

---

## SHP-49 — Rename "Sent" → "Tender Sent" in Monitoring Panel

**Source:** David feedback ("SENT in Monitoring Dashboard — Can we rename this Tender Sent?") + grooming confirmation (Jana confirmed; David: "what sent? We send data, customer, carrier")

### Change
- `MonitorPanels.jsx` line 23: `{ label: 'Sent' }` → `{ label: 'Tender Sent' }`
- Only affects the Monitoring panel tab label (the monitor card)
- Tender status badge values elsewhere stay as "Sent" — they're already in tender context

**Size:** XS

---

## SHP-50 — Order Tab Layout Overhaul

**Source:** David feedback #6-9 (white space, dates with locations, appointment indicator, totals swap) + grooming resolution. David: "We're replacing TMS for a reason" — viewing the right information in the right order matters.

### Section Reorder
Current: General | Req. Transportation | Ship From | Ship To (row 1), Schedule | Products Info | Totals | Incoterms (row 2)

New order:
1. **General** (top-left, as-is)
2. **Totals** (promoted from row 2 — David: "By the time we have a shipment, we're not concerned about requested mode. Totals tell me borderline LTL/TL, which order is creating multi-stop issues because it's too heavy")
3. **Ship From** + pickup dates merged in (from Schedule section)
4. **Ship To** + delivery dates merged in (from Schedule section)
5. **Requested Transportation** (demoted — less important at shipment stage)
6. Remaining sections: References, Contacts, etc.

### Pickup/Delivery Dates Merged into Locations
- Pickup dates (earliest/latest) move **under Ship From** section
- Delivery dates (earliest/latest) move **under Ship To** section
- Schedule section eliminated as standalone — its fields distributed into Ship From/To

### Appointment Indicator
- **Visual cue only** — not a real checkbox, not interactive
- Show as a small **badge** (e.g., "Appointment" badge) below pickup dates in Ship From when the order has a pickup appointment
- Same for Ship To: "Appointment" badge below delivery dates when delivery appointment exists
- David clarified: "it's not actions, it's back-end logic" — this is read from order data indicating the customer specified an appointment time
- If appointment exists, the appointment time is the early date (David: "that noon becomes the appointment")

### White Space Reduction
- Tighter grid — sections follow previous vertically to minimize gaps
- David: "I'd look at the white space" + "the requested transportation is not important, so I don't want that to be one of the first things they see"

**Size:** L

---

## SHP-51 — Tender Tab: Remove TenderSummary, Keep View Shipment Details

**Source:** David feedback #12 ("Do we need the top section? All of that data is redundant with the List View") + grooming resolution

### Current State
- `RoutingGuideTab.jsx:239-280`: 4-column TenderSummary card (Buy/Sell Shipment, Pickup, Delivery, View Full Details button) with `--bg-secondary` background, `margin-bottom: 40px`

### Changes
- **Remove** the entire TenderSummary card
- **Rename** button: "View Full Details" → **"View Shipment Details"**
- **Relocate** button to the **left side of "Add Quote"** in the tender sub-tab action row
- TenderDetailModal remains accessible via the relocated button

### Rationale
- David: "all information that's displayed elsewhere" (main table shows pickup, delivery, dates, mode, carrier behind the bottom bar)
- David: "We're replacing TMS for a reason. Let's not compare the screens."
- Jana proposed compromise: remove display, keep button — "we can save some space, move this button over here"
- Frees vertical space for the routing table (the primary content of this tab)

**Size:** S

---

## SHP-52 — Order # Column Deprioritized in Default Preset

**Source:** Grooming discussion (David: "I would move order number to the far right. I don't think people care about that. That's just a number.")

### Change
- In the default column preset, move Order # (orders) column toward the right side of the table
- Currently at position 4 in DEFAULT_COLUMNS — move to position ~12-13 (after operational columns)

**Size:** XS

---

## SHP-53 — Tender Routing Table: Animated Collapse + Default Collapsed

**Source:** Brainstorming discussion (Manuela requested)

### Changes
- All tender sub-tabs (Routing Options, Notify & Response, Volume Commitment, Additional Info, Others) start with the collapsible right section **collapsed by default**
- Add **smooth animated transition** for expand/collapse (CSS height transition or similar)
- Currently the collapse state has no animation — it snaps open/closed

**Size:** S

---

## Items Deferred (No Story Needed)

| # | Item | Resolution |
|---|---|---|
| 2 | Horizontal scroll bar | David: "Let's not change it. See what the feedback is." No action. |
| 5 | Overflow board | Jana: "We don't have those screens yet." Deferred — no requirements exist. |
| 3 (partial) | Drag-to-resize columns | Manual resize is part of SHP-44. Full Excel-style behavior deferred to actual development. |

---

## Decisions to Log (DEC-28 through DEC-38)

| ID | Decision | Source |
|---|---|---|
| DEC-28 | Hazmat: yellow badge + icon when true, "--" when false | David + Jana, Apr 9 |
| DEC-29 | Column headers wrap words vertically, content truncates with "..." | David + Jana + Manuela, Apr 9 |
| DEC-30 | Truncation tooltip only if 2+ words hidden | Manuela, Apr 13 brainstorm |
| DEC-31 | AP cost in routing table → hover tooltip with AP/AR/Margin summary | Manuela proposed, Jana agreed, Apr 9 |
| DEC-32 | Cost data available from "Sent" status onward (not just Accepted) | Jana, Apr 9 |
| DEC-33 | Panel-aware column presets: Exceptions and Monitoring get different defaults | David + Jana + Manuela, Apr 9 |
| DEC-34 | Dates show date-only in table, time on hover | David + Jana, Apr 9 |
| DEC-35 | "Sent" → "Tender Sent" in Monitoring panel tab label | David + Jana, Apr 9 |
| DEC-36 | Order tab: Totals promoted to 2nd position, pickup/delivery dates merged into Ship From/To, appointment checkbox (display-only) | David, Apr 9 |
| DEC-37 | TenderSummary card removed, "View Shipment Details" button kept (left of Add Quote) | David + Jana, Apr 9 |
| DEC-38 | Order # column moved to far right in default preset | David, Apr 9 |
