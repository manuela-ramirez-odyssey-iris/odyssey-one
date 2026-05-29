---
title: GlobalSearch — Canon
domain: cross-cutting
type: canon
tags: [global-search, search, filtering, progression, attributes, saved-filters]
status: draft
date: 2026-05-28
---

# GlobalSearch — Canon

Source-of-truth specification for the `GlobalSearch` component. This doc owns the mechanics; per-domain attribute schemas and caveats live in each domain folder.

> **v1 draft.** Captured from the Tracking-demo screenshots (Scenarios 1–7) + transcript + the [[../../10-domains/shipments/data/attributes-progression-grouping|Shipments attribute CSV]]. Solid enough to start implementing; sections marked **TBD** are known gaps that get filled as specific points come up.

## Purpose

Guide a user from a fuzzy intent ("I need to find a shipment / tracking / order") through a progression of attribute-typed conditions to a specific row (or filtered set of rows). The component is **domain-agnostic** — it knows nothing about shipments, orders, or carriers; each consuming domain provides an attribute schema and the component renders chips, filters, and saved filters against it.

## Design source vs. deployment target

| | |
|---|---|
| **Design source** | **Tracking-demo** (Efrain, May 2026). Used the Tracking-domain UI as the design canvas. Frames in `Scenario1/` … `Scenario7/`. |
| **v1 deployment target** | **Shipments** — the only existing domain with prior-art table search and real data. v1 ships *into Shipments*, not Tracking. |
| **Tracking domain** | Future. Doesn't exist in the codebase yet. When built, it will consume the canonical GlobalSearch already shipped against Shipments. |

The two are intentionally different. The design is rendered on the Tracking canvas; the *first deploy* lands inside Shipments. This is the final framing — earlier canon versions oscillated; don't oscillate again.

### Shipments-target adaptations vs. the Tracking design

The Tracking design covers a simpler domain. Shipments brings additional shape that must be handled while preserving the same UI/UX:

- **~55 attributes vs. ~15** — Shipments schema is materially larger. Suggested Filters narrowing and the All-tab form must handle the volume. See [[../../10-domains/shipments/data/attributes-progression-grouping|Shipments CSV]].
- **Three panel types** — Exceptions / Monitoring / PGI. The panel-tab strip in Shipments multiplexes panel-type AND status-categorization, vs. Tracking's single panel + statuses.
- **Entity hierarchy** — Order → Load → Shipment. Multi-stop loads, pooling, Rule 11 (multi-leg carriage swap). The result card needs to render this. **Frame 229a from Scenarios 3.1 & 3.2 already shows it:** when scoped to Customer ERCO, results render in a denser card with multi-stop count (`5 stops`) between Origin and Destination plus a right-side `View Details` CTA — see [[#card-variation]] below.
- **Shipments-unique attributes** — `Shipment Type` (Pooling / Cross customer / Line haul / Rule 11), `Shipment Sequence Leg` (1/2/3), `Next Shipment ID` (pooling/Rule 11 linkage). These have no Tracking equivalent — see [[decisions/decision-log#GS-11]].

The stakeholder shorthand is "a bit more complex" — UI mechanics are the same; data structure is heavier.

## Scope

- Expands the existing `packages/ui/src/GlobalSearch.jsx` (navbar input chrome) into the canonical search surface of the application.
- Absorbs the responsibilities currently held by the app-local Shipments trio (`TableControls` + `SearchChipPanel` + `FilterPanel`). Those three components go away as GlobalSearch v1 ships into Shipments.
- Stays in `@odyssey/ui` (already normalized there).
- Consumed by every domain with searchable data (Shipments first, then Tracking, Orders, Carriers, …).

## Out of scope

- Domain-specific data fetching (each domain owns its data layer).
- Per-domain attribute definitions (each domain ships its own schema — see [[data/attribute-schema]]).
- Column arrangement (related but separate concern).
- **Add Customers** popover (see [[#adjacent-add-customers-not-globalsearch]] — separate component).
- Mobile / narrow layouts (no frame covers it; not in v1).

## Location in the UI

Lives in the navbar (deep-sea-neutral surface), centered, ~700-800px wide. Composed of:

```
[ ⌕ chip · chip · chip · input……………… ⊗ ]   [ ⇄ Filter ⓷ ]   [ ⊕ customers ] [ 🔔 ] [ Avatar ]
└───────── search bar ─────────────────┘  └ external trigger ┘   └─────── nav icons ────────┘
```

Outside the bar: **Filter button** (opens the Filters drawer; carries the active-conditions count badge), then **Add Customers** trigger (adjacent, separate component), notifications, avatar.

## Anatomy

### Inside the search bar
1. **Chip stream** — token list rendered inline before the input. Each chip is `Attribute: Value`. Variants:
   - Standard: `Tracking Number: C814`, `Status: Delivered`, `Carrier: ABC Logistic`
   - Range: `Pickup Date Range: 2/6/2026-2/25/2026`
   - Duration shortcut: `Last Days: 7 Days`
   - Compound / bulk: `Trackings Set • 12 IDs` with `^` chevron — click expands a comma-separated list of the underlying IDs in a small popover (frame 233)
   - Saved-filter applied: single chip displaying the saved title (e.g. `C814 - ABC Logistic`) — collapses N underlying conditions
2. **Input field** — primary text entry; multi-line accepts paste (frame 231 shows raw multi-line paste; frame 233 shows the collapse into the compound chip).
3. **Clear X** — clears all chips + input.

### Suggestions dropdown
Appears below the bar on typing (and on focus-with-content). Two side-by-side sections:

| Best Match (left) | Suggested Filters (right) |
|---|---|
| Matching rows with details — origin → dest, customer, carrier, status, identifiers; the value that matched the active query is visually emphasized | Possible attribute filters for the query. Narrows by typed text AND by chips already applied (single-value used attributes are removed; multi-value attributes — Origin, Destination — can remain) |

Footer row: `All Filters` link (opens drawer) · `Clear all` · **`Show N results`** primary CTA (dark).

### Filter button (outside the bar)
Direct entry point to the Filters drawer. Carries a red/blue badge with the count of active filter conditions. Counts the **silent default** `Last Days: 30 Days` even when the bar is empty (frame 210 shows badge = `1` with no chips).

### Filters drawer
Modal popover anchored below the bar (NOT a side drawer — different from the current Shipments `FilterPanel`).

- **Header:** back chevron · "Filters" title · close X
- **Pill tabs:** `All [N]` (form view) · `Saved [N]` (saved-filter list)
- **All tab body:** form sections organized by category (Status as tag-row, Client as dropdown, Location, …). Sections derive from the consuming domain's attribute schema.
- **All tab footer:** `⊕ Save Filters` (left, primary-blue, opens Save modal) · `Clear all` · `Show N results` (right, primary-dark)
- **Saved tab body:** drag-reorderable list of saved filters; each entry has a 6-dot drag handle, name, right-chevron.
- **Saved tab footer:** `Cancel` · `Show N results` *(semantics of `Show N results` on Saved tab: **TBD** — see open questions)*

### Save Filter modal (nested over drawer)
- **Header:** "Save Filter" · close X
- **Filter Title** input — pre-populated with a name derived from active chips (e.g. `C814 - ABC Logistic`)
- **Selected Filters** — token list of the conditions being saved; each removable via `×`
- **Footer:** `Cancel` · `Save` (dark primary)

### Date Range Picker
Single-month calendar popover (frame 229b, 244). Current date dimmed (out of range), valid days highlighted, navigation chevrons left/right of month label. Selecting a start date converts the chip from `Pickup Date Range: 2/6/20` → `Pickup Date Range: 2/6/2026-` to a range pill once end is selected (frames 228b → 229b → 230b).

## States

| State | Visual cue |
|---|---|
| Idle, no chips, no input | Empty bar; badge reflects default(s) count (typically `1` for the silent 30-Day default) |
| Focused, no input, no chips | Bar gets focus border; dropdown opens with default Suggested Filters (Tracking #, Shipment #, Order #, BOL#, PRO#, PO# in frame 211) |
| Typing, no chips | Dropdown opens with Suggested Filters narrowed by query; Best Match empty (frame 211 — single chars) |
| Typing, chips present | Dropdown opens with Best Match (rendering chip-narrowed rows) AND Suggested Filters (narrowed to unused-or-multivalue attributes matching the query) |
| Chip(s) applied | Chips render in bar; input continues to accept next condition |
| Saved-filter applied | Single named chip in bar representing N underlying conditions |
| Drawer open | Modal anchored below bar; page dimmed |
| Save modal open | Nested over drawer |
| Bulk paste (in flight) | Multi-line text visible in input (frame 231) — wraps; clearing whitespace and pressing enter/blur converts to `Trackings Set • N IDs` chip (frame 233) |

## Behaviors

- **Additive chips** (GS-04) — Multiple chips stack; each adds a condition. AND semantics across chips.
- **Default scope = full universe** (GS-01) — Search filters the entire records pool (e.g. all 57,897 trackings), NOT the active panel-filter tab. Confirmed by Kathleen 26:48.
- **Panel-tab pruning** (GS-07) — The panel-filter tab strip auto-prunes to categories still populated under the active query. Counts update. Example: Sc 1 starting tabs `7` → results tabs `3` after `Status: Delivered` chip (frame 219).
- **Drawer ↔ chip-stream are equivalent** (GS-02) — Same query, two UIs. Open drawer → chips render as form selections (frame 218 — `All 3` badge = the 3 chips). Edit drawer → chips update. Confirmed by Efrain 24:24.
- **Direct drawer access** (GS-03) — Filter button opens drawer without typing. Confirmed by Efrain 25:29.
- **Location-ambiguity disambiguation** (GS-05) — `New York` → BOTH `Origin: New York, NY` and `Destination: New York, NY` offered (frames 216b, 240). System does not guess.
- **Bulk paste compaction** (GS-06) — Pasting N identifiers → single compact `Trackings Set • N IDs` chip in bar (with `^` chevron to expand the comma-separated list, frame 233) + enumerated list in drawer.
- **Suggested-filter narrowing** — Suggestions remove single-value attributes already used as chips. **Multi-value attributes (Origin, Destination) remain visible even after being chipped** — frame 237 shows BOTH `Origin:` and `Destination:` still listed in Suggested Filters after `Origin: New York, NY` was already added, alongside the active Trackings Set + Status chips. Rule formalized as GS-12.
- **Match-value highlighting in Best Match** — Rows in Best Match render the value matching the active query/chip in bold. Frame 218b: destination `New York` bolded in matching rows. Frame 234 (after Trackings Set): the relevant IDs from the pasted set are surfaced.
- **Default 30-Day filter** — Silent active filter contributing to badge count. Becomes a visible chip only when user changes it (Sc 7 frame 248: `Last Days: 7 Days`). The right-rail page-info row reflects it textually: `Last Days: 30 Days (Selected Filter by default)` (frame 210) vs `Last Days: 7 Days` (frame 249) once changed.
- **Saved filter as single chip** (GS-09) — A saved filter applied renders as one named chip in the bar even though it expands to multiple underlying conditions.
- **Save flow** — Build chips → open drawer (or stay in dropdown) → `⊕ Save Filters` → modal pre-fills title from chips → user adjusts title and optionally removes specific conditions → `Save` → filter joins Saved tab.
- **Saved-filter management** — Saved tab is drag-reorderable (6-dot handle on each row, frame 222); each item has chevron for edit/expand. CRUD: create from active chips; reorder; delete (TBD — affordance not visible in current frames).

## Card variation

Tracking-style card (Scenarios 1, 2, 6, 7) renders single-leg shipments:

```
Tracking # ▿ ↑    Customer  Carrier  Mode    [Picked Up — Delivered]
R7896543          ...       ...      ...     Origin → Destination
[Delivered]       BOL#  PRO#  PO#   +N more  Latest Event
View Details ›
```

**Customer-scoped card** (frame 229a from Scenarios 3.1 & 3.2; `Customer: ERCO` + `BOL#: TH080725` active) renders a denser, multi-stop variant:

```
C814956 [Delivered]   Client: ERCO  Carrier: ABC Logistic  Mode: Ground  BOL#: ...  ⊘ ↑ View Details
Origin:                                                  Destination:
Sparta, NJ, US        --- 5 stops --->                    Fairfax, VA, US
Scheduled Pickup:                                        Scheduled Delivery:
12/16/2025 …                                             12/16/2025 …
                              [progress rail: Picked Up → Delivered, Sparta, NJ → Baltimore, MD]
Latest Event: ETA at Consignee's Location - BALTIMORE, MD, US | 12/17/2025 …
```

This is **NOT** a list/map toggle and **NOT** an arbitrary density preference. It is the result card adapting to a **multi-stop entity** — note `5 stops` between Origin and Destination, plus the Origin/Destination labelled blocks (vs. Tracking's terse "Sparta, NU, US / Fairfax, VA, US" with no label). This aligns precisely with the **Shipments entity hierarchy** (Order → Load → Shipment; multi-stop loads are first-class). Working hypothesis (GS-13): the card style is determined by the **shape of the underlying row** — multi-stop shipments render the denser card with stop count and labelled endpoints; single-leg trackings render the compact card. Customer scope doesn't *cause* the variation; it just happens that the ERCO data in the demo is multi-stop shipment-grade data. Needs confirmation with Efrain.

## Saved-filter model

Replaces the prior `key:value` DSL approach. Structured, not a string:

```ts
type SavedFilter = {
  id: string
  title: string                        // user-set, default derived from chips
  conditions: AttributeCondition[]     // structured filter set
  order: number                        // user-controlled position in Saved tab
}

type AttributeCondition = {
  attributeKey: string                 // matches GlobalSearchAttribute.key
  operator: 'eq' | 'in' | 'range' | 'contains' | 'between'
  value: unknown                       // shape depends on attribute type
}
```

Applied saved filter renders as **one chip** with `title` as the display label. The underlying conditions still drive the query; the chip is a presentation collapse.

## Future scope (v2)

**Natural-language → multi-chip parsing** (Efrain 20:57–22:22). User types prose, system parses into multiple chips automatically:

- `tracking delayed today` → `Status: Delayed` + `Last Days: Today`
- `carriers operating in Texas` → `Status: Active` + `Location: TX`
- `treatments arriving this week` → `Delivery Date Range: this week`
- `where is C814` → `Tracking#: C814` (+ system-derived) `Location: Baltimore, US`

Explicitly framed as v2. v1 stays on structured chips.

## Adjacent: Add Customers (NOT GlobalSearch)

The **Add Customers** popover (Scenario 5, frame 241) is a separate navbar component for setting the user's customer-context. Architecturally independent of GlobalSearch but visually adjacent in the navbar. The customer scope it sets flows to every domain (cf. the Home customer-scoped widgets pattern). Will get its own canon doc; out of scope here.

Key points worth tracking until that doc lands:
- Trigger lives in navbar between Filter button and notifications (small icon)
- Popover anchored top-right (~280px wide)
- Sets which customer(s) the active user is operating against → influences what every domain shows
- Has internal search field, favorite (star), remove (trash), Save/Cancel
- Scenario 6 (Consolidated Multi-Customer Management) is its primary use case — multi-customer is "set in this popover; then GlobalSearch operates on that union"

## Reference scenarios (Tracking-demo, May 2026)

Maps each scenario folder in the source materials to the canon mechanisms it demonstrates. Citations below reference frame names by file name; raw artifacts archived at `vault-sources/20-cross-cutting/global-search/` after main-thread archival.

| # | Source narrative | What it demonstrates |
|---|---|---|
| **Sc 1** | Searching a known customer's data + tracking-specific combined criteria. Updated 2026-05-28 to call out `Tracking # + Status + Location + Save Filters` as the canonical combined-criteria flow, AND to fold the ambiguous-location subcase under this scenario. | **End-to-end canonical flow, demonstrated in two branches**:<br><br>**a-branch (Carrier example, ends with save):** frames 210 → 211 → 212 → 213 → 214 → 215 → 216 → 217 → 218 → 219 → 220 → 221 → 222 → 223. (1) empty-bar Suggested Filters shows identifier types (211); (2) typing `del` narrows to status options including a `Client: Delaware Inc.` / `Carrier: Delaware Logistic Service` ambiguity flush with the status list (213 — this is the multi-attribute ambiguity general case); (3) chips stack additively, third chip is `Carrier: ABC Logistic` (215, 217); (4) Filter drawer reflects the chip stream as `All 3` (218); (5) `+ Save Filters` opens Save modal with auto-titled chips (220); (6) Saved tab lists saved filters drag-reorderably (222); (7) a saved filter applies as a single named chip in the bar `C814 - ABC Logistic` (223).<br><br>**b-branch (Location example, ends with raw chips):** frames 216b → 217b → 218b → 219b → 219b2-results. (1) starting from 2 chips (`Tracking #: C814` + `Status: Delivered`), user types `New York` → dropdown shows BOTH `Origin: New York, NY` AND `Destination: New York, NY` (216b — ambiguity disambiguation in context of an active multi-chip search); (2) selecting `Destination: New York` adds chip; Suggested Filters narrows further (217b — note Destination *still listed*); (3) Best Match rows render the matched value visually emphasized — `Allentown, PA → New York` (218b); (4) results applied with 3 raw chips, no save (219b2-results) — panel tabs prune to `Delivered 2 · Delivered-On-Time 1 · Delivered-Late 1`.<br><br>Together the two branches cover: chip stream additive build, ambiguous-location disambiguation, Suggested Filters narrowing, multi-value attribute persistence, Filter drawer ↔ chip equivalence, Save flow + saved-filter named-chip collapse, panel-tab pruning, match-value highlighting in Best Match. |
| **Sc 2** | Searching with an unknown customer (cross-customer global search). | Cross-customer query without a Customer scope chip; multi-line raw paste (frame 231) collapsing to bulk-paste compaction (`Trackings Set • 12 IDs` — frame 233; expanded list visible on chevron click); chip stack continues normally afterwards (frames 235, 236, 237). |
| **Sc 3.1** | Customer (ERCO) + BOL#. | Customer-scoped search composed with identifier chip. Suggested Filters reflects the suffix typed (TH080725 across identifier types, frame 228a). **Result card variation** — multi-stop entity rendering (frame 229a, see [[#card-variation]]). |
| **Sc 3.2** | Customer (ERCO) + Pickup Date Range. | Customer-scoped search composed with date-range chip; demonstrates Date Range Picker behavior (frames 228b, 229b, 230b); Suggested Filters narrows to unused attributes (Status, Carrier, Equipment, Last Days, Origin, Destination, Delivery Date). |
| **Sc 4** | Ambiguous location ("New York") in isolation. | Disambiguation pattern with no other chips: empty-bar query that overlaps Origin and Destination → both offered, no guessing (frame 240). *(Same mechanism is now also part of Sc 1's b-branch narrative.)* |
| **Sc 5** | Add Customer popover. | **NOT GlobalSearch.** Adjacent navbar component for customer-context scoping. See [[#adjacent-add-customers-not-globalsearch]]. Frame 241. |
| **Sc 6** | Consolidated multi-customer management (Pickup Date Range + Equipment, no Customer chip). | Multi-attribute composition without customer scope — works against the union of the user's assigned customer set (set via Sc 5's popover). Frames 243 (date typing) → 244 (calendar) → 245 (Equipment narrowing — note `Equipment: LTL` ranked above identifier types because exact-prefix match) → 246 (drawer with two chips). |
| **Sc 7** | Last 7 Days quick filter. | Duration-shortcut chip (`Last Days: 7 Days`) replacing the silent default `Last Days: 30 Days`. Frame 247 reveals the full enum: Today / Yesterday / 7 Days / 30 Days / 60 Days / 90 Days / 180 Days / 365 Days. Frame 249 shows the right-rail text `Last Days: 7 Days` (no longer "Selected Filter by default" suffix). |

## Open / TBD

- **Per-chip remove affordance** — Probably `×` per chip on hover, not visible in static frames.
- **Card-variation trigger** — Working hypothesis (GS-13) is "row is multi-stop shipment vs. single-leg tracking." Confirm with Efrain — could also be (a) Customer-scope flag, (b) layout-density preference, (c) per-row state. Frames 229a and 228b are the only customer-scoped result frames; both are multi-stop, so the two hypotheses are observationally entangled. Need a counter-example (customer-scoped single-leg, or non-customer-scoped multi-stop).
- **List/map toggle** — Frame 116/list icons in result header are visible across all result frames; map view never demonstrated.
- **Watchlist tab** (top of page, sibling of All Shipments) — Content unknown. Possibly user-favorited shipments, possibly user-level overlay of saved filters. Needs spec.
- **Best-Match ↔ Suggested-Filters toggle** — Efrain 26:23 mentioned "switch between the best match with the filters... in this leader chevron." Ambiguous: dropdown-internal swap, or drawer↔dropdown navigation? In all frames the two appear side-by-side. Ask Efrain.
- **Show N results on Saved tab** — Frame 222 shows `Show 4 results` while the bar carries only one saved-filter chip (`C814 - ABC Logistic`). Semantics: hover-preview of pointed-at saved filter, or applied count, or combined? Verify.
- **`Customer:` vs `Customer Name:` label** — Frame 232 (Sc 2 Suggested Filters) shows `Customer Name:` where most other frames show `Customer:`. Probably a slip in the design file; flag with Efrain for canonical label.
- **Bar resizing** — Existing component has `minWidth`/`maxWidth` (580-900px). Frame 216 shows the bar growing to two lines when chips overflow horizontal space (`Tracking Number: C814 · Status: Delivered · Carrier: ABC Logistic` wraps; the dropdown anchors below the lower line). Spec how this wrap/scroll/condense decision is made.
- **Saved-filter edit / delete flows** — Edit via chevron is implied; delete affordance not visible.
- **Customer label drift across the chip label and Suggested-Filter label** — `Customer Name:` vs `Customer:` vs `Client:` (the drawer uses `Client` in frame 218). Tighten vocabulary.

## Related

- [[decisions/decision-log|Decision Log]]
- [[data/attribute-schema|Attribute Schema Contract]]
- [[../../10-domains/shipments/data/attributes-progression-grouping|Shipments Attribute CSV]] — reference taxonomy + Shipments-target schema source
- [[../design-system/_moc|Design System]] — normalization pipeline this expansion goes through
