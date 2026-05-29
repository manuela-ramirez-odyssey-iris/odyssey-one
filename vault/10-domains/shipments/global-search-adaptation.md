---
title: GlobalSearch — Shipments Adaptation
domain: shipments
type: adaptation
tags: [global-search, shipments, search, filtering, adaptation, v1-target]
status: draft
date: 2026-05-29
---

# GlobalSearch — Shipments Adaptation

How the cross-cutting [[../../20-cross-cutting/global-search/global-search|GlobalSearch canon]] lands inside the Shipments domain — the **v1 deployment target**.

This doc owns the Shipments-specific deltas: attribute coverage gap, mechanism gap, Shipments-only extras (three panels, entity hierarchy, locked filters, pooling/Rule-11), and the migration ladder for the build. The canon owns the general behavior; this doc owns the adaptation.

> **Status:** Draft, written 2026-05-29 after reading the current Shipments search trio (`TableControls.jsx`, `SearchChipPanel.jsx`, `FilterPanel.jsx`) and comparing line-by-line against canon. Solid enough to start the build. Section 4 (Open Questions) lists what to validate with Jana / Efrain before any of it locks.

## 1. Current Shipments search — what exists today

Three app-local components in `apps/odyssey-one/src/components/shipments/`:

| Component | Purpose | Anatomy |
|---|---|---|
| [`TableControls.jsx`](../../../apps/odyssey-one/src/components/shipments/TableControls.jsx) (247 lines) | Search bar (420px) + sort + export action buttons. Renders the chip row beneath when query active. Hosts the inline saved-query pill inside the bar. | Search input + applied-saved-query inline pill (lines 93-130) + clear X + bookmark icon (line 148) + sort / Export buttons |
| [`SearchChipPanel.jsx`](../../../apps/odyssey-one/src/components/shipments/SearchChipPanel.jsx) (101 lines) | Type-based chip suggestions appearing **under** the bar when input has content. Exclusive — one chip active at a time. | Pill-shaped buttons (line 33-43) toggling `activeChipKey`; Filter icon at end with left divider (line 51-77) |
| [`FilterPanel.jsx`](../../../apps/odyssey-one/src/components/shipments/FilterPanel.jsx) (361 lines) | 354px right-side drawer. Two pill-tabs: All (form sections) + Saved (hardcoded list). | 4 hardcoded sections (Location, Status, Carrier Information, Date Range); 6 hardcoded `SAVED_QUERIES` (line 5-12) as `key:value` DSL strings |

The attribute set lives at [`apps/odyssey-one/src/data/index.js:65`](../../../apps/odyssey-one/src/data/index.js) as `SEARCH_ATTRIBUTES` — a flat array of 15 attributes with `{ key, label, type, dataKey, values? }`.

## 2. Attribute coverage gap

CSV at [[data/attributes-progression-grouping|attributes-progression-grouping.csv]] defines **51 attributes** across 10 progression tiers (5 explicitly skipped: `Pickup #`, `Validation Message`, original combined `SCAC - Tender Status`, …). Code has **15**. Canon's working number is ~55.

**36 attributes missing.** Breakdown:

| Tier | Stakeholder Group | CSV count | In code | Status |
|---|---|---:|---:|---|
| 1 | Find — Shipment Identifiers | 4 | 4 | complete (Buy/Sell Shipment #, Order #, Pro#) |
| 2 | Who — Customers & Parties | 4 | 4 | complete (Customer ID/Name, Consignor, Consignee) |
| 3 | Where — Route & Geography | 5 | 2 | **missing**: Distance, Stops, Ship Direction |
| 4 | When — Schedule & Appointments | 6 | 0 | **all missing**: Pickup/Delivery Date + Earliest/Latest variants × 2 |
| 5 | How — Transport & Equipment | 6 | 2 | **missing**: Equipment #, Seal #, Incoterm Info, Freight Terms |
| 6 | Status — Carrier & Tender | 3 | 3 | complete (SCAC, Tender Status, Shipment Status) |
| 7 | Cargo & Handling | 5 | 0 | **all missing**: Gross/Net/Tare Weight, Pkg Count, Hazardous (Y/N) |
| 8 | Rates & Costs | 4 | 0 | **all missing**: AP/AR Freight Cost, Preferred AP/AR Direct Cost |
| 9 | Load Details | 3 | 0 | **all missing**: Load #, Load Count, Load Status |
| 10 | Edges — Advanced / Rare | 3 | 0 | **all missing** (GS-11 Shipments-unique): Shipment Type, Sequence Leg, Next Shipment ID |

**Pattern:** code today covers tiers 1, 2, 6 cleanly. Everything from tier 4 onward (dates, cargo, costs, loads, edges) is unimplemented. The Shipments-unique attributes that don't exist in Tracking ([[../../20-cross-cutting/global-search/decisions/decision-log#GS-11|GS-11]]) are entirely missing.

## 3. Mechanism gap (the behaviors)

Comparing the trio above against canon §Anatomy + §Behaviors:

| # | Canon mechanism (citation) | Current Shipments code | Verdict |
|---|---|---|---|
| M-01 | Chip stream **inside** the input bar | Chips render in a row **under** the bar via `SearchChipPanel` | Different anatomy |
| M-02 | **AND-additive** multiple chips (GS-04) | `SearchChipPanel.jsx:26` — exclusive single-chip toggle | Wrong semantics |
| M-03 | **Progression-ordered** Suggested Filters | No `progressionTier` field on attributes; array order only | Missing |
| M-04 | **Multi-value attributes** (GS-12) — Origin/Destination remain after chipped | All exclusive | Missing |
| M-05 | **Location-ambiguity disambiguation** (GS-05) — offer both Origin AND Destination on "New York" | `getChipsForQuery` (lines 82-101) is pure type-based filter; no value-overlap rule | Missing |
| M-06 | Filter button **outside** bar, **direct drawer access** (GS-03) | Filter icon **inside** `SearchChipPanel`, **disabled until a chip is active** (line 64) | Inverted rule |
| M-07 | Filter button carries **active-conditions badge** (incl. silent default) | No badge | Missing |
| M-08 | **Drawer ↔ chips bidirectional** (GS-02) | `FilterPanel` form state independent of chips; 4 hardcoded sections | Missing |
| M-09 | **Save-current-filters flow** (modal pre-fills from chips) | No save UI; `SAVED_QUERIES` is 6 hardcoded items | Missing |
| M-10 | Saved filters as **structured `AttributeCondition[]`** (GS-10) | Hardcoded DSL strings (e.g. `'mode:LTL shipment-status:Review …'`) | Wrong model |
| M-11 | Saved filter applies as **single named chip** in stream (GS-09) | Renders as inline pill *inside the bar* next to the input (`TableControls.jsx:93-130`) | Close but misaligned slot |
| M-12 | **Bulk-paste compaction** (GS-06) — multi-line → `Trackings Set • N IDs` | No paste handling; multi-line becomes a single search string | Missing |
| M-13 | **Compound chip** with chevron + popover | No such atom | Missing |
| M-14 | **Duration-shortcut chip** + silent `Last Days: 30 Days` default | No concept; no silent default | Missing |
| M-15 | **Date Range Picker** popover (single-month calendar) | Native `<input type="date">` pair (from/to) | Different control |
| M-16 | **Suggestions dropdown** with Best Match + Suggested Filters side-by-side | No dropdown exists | Missing entirely |
| M-17 | **Panel-tab pruning** (GS-07) on result categories | `ShipmentTabs.jsx` has counts but no auto-prune-to-populated after filter | Missing |

## 4. Shipments-specific extras (beyond Tracking design)

These don't exist in the Tracking design source — Shipments has to layer them on top.

### 4.1 Three-panel cardinality

Shipments multiplexes **panel-type AND status categorization**:
- **Exceptions** panel — system-stuck states needing user action
- **Monitoring** panel — system-working states user is watching
- **PGI/PGR** panel — post goods issue/receipt cost reconciliation

Tracking has one panel. GS-07 pruning needs to hook into `apps/odyssey-one/src/components/shipments/ShipmentTabs.jsx` *and* the panel-type selector above it (Exceptions / Monitoring / PGI cards in [`MonitorPanels.jsx`]).

### 4.2 Entity hierarchy — Order → Load → Shipment

Multi-stop loads, pooling, Rule 11 (multi-leg carriage swap). Per [[../../20-cross-cutting/global-search/decisions/decision-log#GS-13|GS-13]] hypothesis, result cards adapt to row shape (multi-stop = denser card with stop count + labeled Origin/Destination blocks).

**Open in Shipments specifically:** today there are **no result cards** — only the shipment table row. We need to decide:
- **Option A:** Keep the table row as the only result surface; suggestions dropdown shows Best Match as table-row-shaped previews
- **Option B:** Introduce dropdown Best-Match cards as a *new surface above* the table, distinct shape from the row
- **Option C:** Dropdown shows compact cards; clicking pivots to the row in-table

Worth a quick conversation with Efrain before building — the canon's dropdown anatomy assumes card-shaped Best Match, which doesn't match Shipments' current table-only result rendering.

### 4.3 Locked filters per panel

Per [[domain-analysis|domain-analysis §11]], Monitoring panel always shows: Rank / SCAC / Carrier Name / Equipment / AP Cost / Tender Status / Pickup Date / Delivery Date. Schema's `locked: true` flag exists in the contract — nothing reads it yet. Need to model **per-panel locked-attribute sets**, not just a global locked list.

### 4.4 Cross-customer multi-value at the data level

CSV row 9: `Customer ID = *G20TECH_SYS_01, 2nd customer ID` — a single shipment row can carry multiple customer IDs. This is **distinct** from `multiValue: true` on the attribute (which governs chip count in the bar). Need a separate concept — maybe `valueIsList: true` on the schema, or normalize during data ingestion. Naming TBD; flagged in [[../../20-cross-cutting/global-search/data/attribute-schema|attribute-schema §Gaps to close]].

### 4.5 Shipments-unique attributes (GS-11)

- **`shipmentType`** — Pooling / Cross customer / Line haul / Rule 11 (dropdown)
- **`shipmentSequenceLeg`** — 1 / 2 / 3 (dropdown)
- **`nextShipmentId`** — text linkage for pooling/Rule 11

None exist in Tracking. All needed for v1.

## 5. Build ladder

Eight steps. Order reflects dependency graph; steps 3 and 4 are interchangeable.

| # | Step | What lands | Replaces |
|---|---|---|---|
| 1 | **`Chip` atom** (5 variants) | standard / range / duration-shortcut / compound-bulk / saved-filter-named | nothing existing — Badge stays unchanged for non-search chips |
| 2 | **`SuggestionChip` atom** | Click-to-apply pill, multi-select-capable | `SearchChipPanel.jsx` chip buttons (lines 33-43) |
| 3 | **`SearchBar` composite** | Inside-bar chip stream + input + clear X | `TableControls.jsx` search bar block (lines 46-169) |
| 4 | **`SuggestionsDropdown`** | Best Match + Suggested Filters side-by-side | net-new surface — does not exist today |
| 5 | **`FiltersDrawer`** | Modal popover anchored below bar; tabs All/Saved; schema-driven form | `FilterPanel.jsx` (361 lines) — full replacement |
| 6 | **`SaveFilterModal`** | Pre-fills title from active chips; conditions list with removal | net-new |
| 7 | **Schema migration** | Add `progressionTier`, `multiValue`, `valueOverlapsWith`, `defaultValue`, `locked`, `hidden` to `SEARCH_ATTRIBUTES`; expand from 15 to 51 attributes | extends `apps/odyssey-one/src/data/index.js:65` |
| 8 | **State wiring** | Replace Shipments' search state with GlobalSearch state model | rewires `ShipmentsRoute` filter handling |

### 5.1 Normalization deferred

**Decision:** v1 build is **app-local**. No `/normalize` gate, no DSM Normalize tab, no Code Connect mappings, no Figma component publish for the new search atoms until after end-to-end works in Shipments. Rationale: 8-step structural rewrite with interdependent atoms — the API surface of `Chip`, `SearchBar`, `SuggestionsDropdown`, etc. won't stabilize until the system runs. Normalizing now means re-normalizing.

**Path forward:** build under `apps/odyssey-one/src/components/global-search/` (or similar app-local namespace). Once Shipments v1 is working and the API is stable, run normalization in a single pass — atoms first (`Chip`, `SuggestionChip`), then composites (`SearchBar`, `SuggestionsDropdown`, `FiltersDrawer`), then move into `@odyssey/ui/src/`.

This is a **scoped deviation** from the standard [[../../../CLAUDE|CLAUDE.md]] normalization policy — applies to GlobalSearch v1 only, not a general workflow shift. Tokens (`var(--…)`) and Figma-first-for-design still apply.

## 6. Open questions

To validate before / during build:

### Stakeholders
- **Jana** — confirm the tier-4 date attribute distinctions (Earliest/Latest Pickup/Delivery vs. plain Pickup Date) and the locked-per-panel rules from domain-analysis §11. Are the locked sets per panel still accurate, or have they shifted since the original grooming?
- **Jana** — `Customer ID` cross-customer comma-separated values: is this still a real data shape in production, or has it been normalized away? Affects M-04 + §4.4.
- **Efrain** — result card design for Shipments specifically (§4.2 — A/B/C options). The Tracking demo card doesn't fit Shipments' table-only rendering today.
- **Efrain** — [[../../20-cross-cutting/global-search/global-search#open--tbd|open questions from canon §Open/TBD]] still apply: per-chip remove affordance, Best-Match ↔ Suggested-Filters toggle, Show N results on Saved tab, Customer/Customer Name/Client label drift, bar-wrap threshold.

### Architecture
- App-local namespace for the build: `apps/odyssey-one/src/components/global-search/` vs. `…/components/shipments/global-search/`? Cross-cutting framing argues for the former even while app-local.
- `MonitorPanels.jsx` integration with GS-07 pruning: does the panel-type strip (Exceptions / Monitoring / PGI) also prune, or only the status-tab strip inside the selected panel?
- Backwards compat during build: do we keep `TableControls` + `SearchChipPanel` + `FilterPanel` rendering until step 8 ships, or replace incrementally? Probably incremental — start by swapping the chip atom while leaving the bar shell unchanged.

## 7. Related

- [[../../20-cross-cutting/global-search/global-search|GlobalSearch Canon]] — cross-cutting source of truth
- [[../../20-cross-cutting/global-search/decisions/decision-log|GlobalSearch Decision Log]] — GS-01 through GS-13
- [[../../20-cross-cutting/global-search/data/attribute-schema|Attribute Schema Contract]] — the shape this Shipments adaptation implements
- [[data/attributes-progression-grouping|Shipments Attribute CSV]] — taxonomy source
- [[domain-analysis|Shipments Domain Analysis]] — §11 covers locked filters per panel
- [[decisions/decision-log|Shipments Decision Log]] — Shipments-domain decisions (no GS-prefixed entries here; those live in cross-cutting)
