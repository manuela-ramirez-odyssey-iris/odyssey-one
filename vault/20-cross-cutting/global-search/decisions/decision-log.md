---
title: GlobalSearch — Decision Log
domain: cross-cutting
type: decision-log
tags: [global-search, decisions, search, filtering]
status: active
date: 2026-05-28
---

# GlobalSearch — Decision Log

Cross-cutting decisions about the GlobalSearch mechanism. Per-domain decisions about *how each domain consumes* GlobalSearch live in that domain's own decision log.

## Format

```
### GS-XX — <title>
**Decided:** YYYY-MM-DD
**Previous state:** what existed before
**Decision:** what was decided
**Rationale:** why
**Source:** session / stakeholder / transcript reference
**Affects:** components, files, or backlog items impacted
```

Decision IDs use the `GS-` prefix (GlobalSearch).

## Decisions

### GS-01 — Default search scope is the full universe, not the active panel-filter tab
**Decided:** 2026-05-28
**Previous state:** Shipments table search filters within the currently-selected panel tab (Exceptions/Monitoring/PGI). Behavior was implicit.
**Decision:** GlobalSearch always filters the full records universe (e.g. all 57,897 trackings). The currently-selected panel-filter tab does NOT pre-scope the search. Instead, the panel-tab strip prunes itself to categories still populated under the active query (see GS-07).
**Rationale:** Users frequently search beyond their current view (e.g. Scenario 2: cross-customer search by reference number without knowing which queue it sits in). Pre-scoping would hide valid matches.
**Source:** Kathleen O'Donnell, transcript 24:48–26:48 ("the default goes to all all shipments… it's taking that 57,000 shipments and it's filtering that list" — Efrain confirms).
**Affects:** GlobalSearch behavior, ShipmentsRoute search filtering, equivalent Tracking-route logic when that domain ships.

### GS-02 — Filters drawer and chip stream are two views of the same query
**Decided:** 2026-05-28
**Previous state:** Shipments has a chip row (live filtering) and a separate filter panel (Apply-button-driven, disjoint vocabularies). Two interaction models, two states.
**Decision:** The drawer ALWAYS reflects the active chip stream and vice versa. Open the drawer → see chips rendered as form selections. Edit any drawer field → chip stream updates. They are equivalent representations of one query.
**Rationale:** A single source of truth eliminates the disjoint-state bug class and makes the structured-form view a natural drill-down rather than a parallel UI.
**Source:** Kathleen O'Donnell + Efrain Hernandez, transcript 24:24 ("So, the filter will automatically contain everything from the top that the user put in there?" / "Yeah, yeah, definitely."). Visual confirmation: frame 218 shows `All 3` pill-tab badge equals the 3 chips in the bar.
**Affects:** Drawer architecture, state model, the Shipments FilterPanel which is absorbed.

### GS-03 — Filter button is a direct entry point; typing not required
**Decided:** 2026-05-28
**Previous state:** Current Shipments chip-row filter icon is disabled until a chip is selected — drawer access is query-gated.
**Decision:** The standalone Filter button (outside the search bar) opens the drawer at any time, even with an empty bar. Users can build a query entirely in the drawer.
**Rationale:** Some users prefer form-driven filtering over chip-stream building (especially for date ranges, dropdowns, complex compound filters). Removing the query gate respects that.
**Source:** Efrain Hernandez, transcript 25:29 ("you can go to the filter, only click here without any typing here is possible").
**Affects:** Filter button enable-state, drawer state defaults.

### GS-04 — Chips are additive (AND semantics across chips)
**Decided:** 2026-05-28
**Previous state:** Shipments SearchChipPanel is exclusive — one chip active at a time, scoping the search to that single attribute.
**Decision:** Multiple chips coexist in the bar. Each adds a condition. Cross-chip semantics is AND.
**Rationale:** Demonstrated across Scenarios 1, 2, 3.x, 6 with 2-3 simultaneous chips. Matches mental model of "narrowing the search."
**Source:** Tracking-demo screenshots (Sc 1 frame 215, Sc 2 frame 237, Sc 3.x frame 228a, Sc 6 frame 246).
**Affects:** Query model, chip removal UX, applied-conditions count badge.

### GS-05 — Location-ambiguous queries offer both Origin and Destination
**Decided:** 2026-05-28
**Previous state:** Shipments search makes no special-case for location queries; ambiguity isn't surfaced.
**Decision:** When a query value can plausibly occupy more than one attribute slot (e.g. `New York` could be Origin OR Destination), the Suggested Filters list shows BOTH options. System does not guess. User picks. Pattern generalizes to any value-overloaded attribute.
**Rationale:** Removes silent wrong-attribute matches. Frame 213 (Scenario 1 a-branch) shows the same pattern beyond locations: typing `del` surfaces `Status: Delivered` AND `Client: Delaware Inc.` AND `Carrier: Delaware Logistic Service` AND `Status: At Risk Delivery` AND the rest of the Status enum — multi-attribute value-overlap.
**Source:** Tracking-demo Scenario 4 (Desktop - 240) — standalone disambiguation. Also demonstrated in context of an active multi-chip search in Scenario 1's b-branch (Desktop - 216b, added 2026-05-28): with `Tracking #: C814` + `Status: Delivered` already chipped, typing `New York` still surfaces BOTH `Origin: New York, NY` AND `Destination: New York, NY`. Multi-attribute version is frame 213. Updated `UsabilityScenarios.txt` (2026-05-28) folds this case under Scenario 1.
**Affects:** Suggested-filters generation logic; attribute schema may need a `valueOverlapsWith` hint to detect ambiguity.

### GS-06 — Bulk-pasted identifiers collapse to one compact chip + enumerate in drawer
**Decided:** 2026-05-28
**Previous state:** No bulk-paste UX in current Shipments search.
**Decision:** Pasting N identifiers into the input first displays as raw multi-line text in the input field (frame 231), then on blur/enter collapses to a single `Trackings Set • N IDs` chip in the bar with `^` chevron (frame 233). Clicking the chevron expands a popover showing the comma-separated list. The drawer's corresponding attribute field renders the N IDs as an enumerated list.
**Rationale:** Internal operations teams (per Usability Scenario 3) paste 10–50+ identifiers at once. A chip-per-ID would overwhelm the bar; a single bulk-chip is legible. The drawer remains the place to inspect/edit the full list.
**Source:** Tracking-demo Scenario 2 frames 231 (raw paste) → 233 (compaction) + Kathleen O'Donnell transcript 24:33 ("the 12 example of 12 shipment numbers, now those would all show in this filter" / Efrain "Yeah").
**Affects:** Input paste handler, chip rendering, drawer multi-value-attribute rendering.

### GS-07 — Panel-filter tab strip prunes to categories still populated under the active query
**Decided:** 2026-05-28
**Previous state:** Shipments panel-filter tabs (Exceptions/Monitoring/PGI categorizations) are always shown, regardless of search state.
**Decision:** Panel-filter tabs auto-prune to only those still populated under the active query. Counts update. Empty categories disappear.
**Rationale:** Pairs with GS-01: search scope is the full universe, panel tabs become a downstream view; pruning prevents zero-result clicks. Example: Sc 1 results show 3 tabs (Delivered / Delivered-On-Time / Delivered-Late) after `Status: Delivered` chip — the 4 non-Delivered tabs dropped.
**Source:** Tracking-demo Sc 1 frame 223 vs 210 (7 → 3 tabs); Sc 7 frame 249 retains all 7 tabs because only the Last Days quick-filter is applied; Sc 6 frame 238 after `Status: Picked Up - On Time` shows a single `Picked Up - On Time 8` tab.
**Affects:** Panel-tab rendering, count aggregation.

### GS-08 — Natural-language → multi-chip parsing is v2, not v1
**Decided:** 2026-05-28
**Previous state:** No NL parsing in any search today.
**Decision:** v1 ships structured chip stream + Suggested Filters disambiguation. NL parsing (typing `treatments arriving this week` and getting auto-derived chips) is explicit future scope.
**Rationale:** Efrain framed it as roadmap, not requirement. NL adds significant complexity (parser, intent classification, value resolution) that would block shipping.
**Source:** Efrain Hernandez, transcript 20:57–22:22.
**Affects:** v1 scope boundary; future v2 design work.

### GS-09 — Saved filters render as a single named chip when applied
**Decided:** 2026-05-28
**Previous state:** Shipments inline saved-query pill — a separate token rendered inside the search bar showing the saved name + × to clear. Underlying conditions invisible.
**Decision:** A saved filter, when applied, appears as ONE chip in the bar using the user's saved title (e.g. `C814 - ABC Logistic`). The underlying conditions still drive the query; the chip is a presentational collapse.
**Rationale:** Preserves the "this is a saved set, not three loose chips" affordance. Reduces visual noise when many conditions are saved together. Title carries the meaning users care about.
**Source:** Tracking-demo Sc 1 frame 223 (`C814 - ABC Logistic` single chip) cross-referenced with Desktop - 221 (Save Filter modal pre-filling the same title from the 3 active chips before save).
**Affects:** Chip rendering logic, saved-filter application path.

### GS-10 — Saved filters are structured, not a DSL string
**Decided:** 2026-05-28
**Previous state:** Shipments `parseSavedQuery()` parses `key:value` strings like `mode:LTL shipment-status:Review destination:CA delivery:<2026-01-15`. Storage is the string.
**Decision:** Saved filters are stored as structured objects with explicit fields: `id`, `title`, `conditions[]`, `order`. Each condition is `{ attributeKey, operator, value }`. No string DSL.
**Rationale:** Save modal UI already operates on structured chips (the user removes individual conditions via × inside the modal — that requires a structured representation). Going string-DSL would force a parse/serialize round-trip with no benefit. Structured saves are also easier to migrate and reorder.
**Source:** Inferred from Save Filter modal UX (Desktop - 221) showing chips as removable tokens, and from Saved tab list (Desktop - 222) showing drag-reorderable named items.
**Affects:** Storage shape, future schema, replaces `parseSavedQuery()` in ShipmentsRoute.

### GS-11 — Shipments-target adaptation: domain provides Shipments-unique attributes; mechanics unchanged
**Decided:** 2026-05-28
**Previous state:** Canon (pre-2026-05-28) framed Tracking as the v1 implementation target. The codebase, however, contains no Tracking domain — Shipments is the only consumer with prior-art search to replace.
**Decision:** **v1 deploys into Shipments**, using the Tracking-demo screenshots as design source. Shipments brings additional schema shape — ~55 attributes (vs. ~15 in the Tracking demo), three panel types (Exceptions / Monitoring / PGI), an Order → Load → Shipment entity hierarchy with multi-stop / pooling / Rule 11, and Shipments-unique attributes (`Shipment Type`, `Shipment Sequence Leg`, `Next Shipment ID`). The GlobalSearch mechanics — chip stream, dropdown, drawer, saved filters — remain identical to the Tracking design. The Shipments schema (via [[../../../10-domains/shipments/data/attributes-progression-grouping|attributes CSV]]) is the contract input.
**Rationale:** Earlier framings ("Shipments-first" → corrected to "Tracking-first") were both partial. Resolving definitively: Tracking is the **design canvas**; Shipments is the **deployment target**; Tracking-the-domain is **future**. This matches the codebase state (no `routes/tracking/`), Jana's role as Shipments PM with the schema authority, and avoids deferring a real shipping path behind a non-existent domain.
**Source:** Stakeholder direction 2026-05-28 (this update). Cross-references: [[../../../10-domains/shipments/data/attributes-progression-grouping|Shipments CSV]] rows 52–54 (Shipment Type, Shipment Sequence Leg, Next Shipment ID); codebase audit (no Tracking route).
**Affects:** Implementation order, backlog SHP- items vs. (eventual) TRK- items, schema contract requirements, the prior canon "Tracking is the v1 implementation target" statement in both `_moc.md` and `global-search.md` (now corrected).

### GS-12 — Multi-value attributes remain visible in Suggested Filters after being chipped
**Decided:** 2026-05-28
**Previous state:** Suggested-filter narrowing was assumed uniform — used attributes drop out. Frame 217b/237 contradicted this; behavior was logged as TBD.
**Decision:** An attribute is flagged `multiValue: boolean` (or equivalent) on the schema. Multi-value attributes remain in Suggested Filters even after a chip of that attribute is active, allowing the user to add a second value. Single-value attributes drop out after being chipped. For v1, **Origin and Destination** are explicitly multi-value (a query may legitimately combine `Origin: New York, NY` + `Origin: Sparta, NJ`). Status, Carrier, Customer, Equipment, Last Days, Pickup Date Range, Delivery Date Range are single-value for v1 (drop out after chip).
**Rationale:** Frame 237 (Sc 2) shows BOTH `Origin:` and `Destination:` in Suggested Filters AFTER `Origin: New York, NY` was already added — alongside Trackings Set + Status chips. Frame 217b shows `Destination:` remains in Suggested Filters after `Destination: New York` chip. By contrast, frame 216 shows `Status:` removed after `Status: Delivered` chip. The behavior is per-attribute, not uniform — multi-value is the rule for location attributes only.
**Source:** Tracking-demo Sc 1 b-branch frame 217b, Sc 2 frame 237, Sc 1 a-branch frame 216 (counter-example).
**Affects:** Attribute schema contract (`multiValue` field), Suggested-filters generation logic, query model (Origin/Destination conditions must be arrays/lists).

### GS-13 — Result-card variation is driven by row shape (multi-stop entity), not by customer-scope or density toggle
**Decided:** 2026-05-28 *(working hypothesis — needs Efrain confirmation)*
**Previous state:** Sc 3.1's denser card layout was logged as TBD (Customer-scope styling? List/map toggle? Layout-density toggle?).
**Decision:** The denser card (Origin/Destination with labels, `N stops` indicator between them, right-side `View Details` CTA) renders when the row is a **multi-stop shipment** (an Order → Load → Shipment with multiple stops). The compact card (single origin/destination strings, inline `+N more` overflow, bottom `View Details ›`) renders for single-leg trackings. The trigger is the row's entity shape, not user preference.
**Rationale:** Frames 229a and 228b (the only customer-scoped results in the demo set) both show `5 stops` between Origin and Destination — the denser layout exactly tracks "row is multi-stop." Tracking-domain demo data is single-leg; Shipments-grade ERCO data is multi-stop. This explanation also matches the Shipments entity hierarchy (multi-stop loads are first-class) and resolves the variation without invoking a UI toggle. Working hypothesis only — could also be explained by customer-scope flag or a per-customer card-density preference, but those would not naturally explain `5 stops` rendering.
**Source:** Tracking-demo Sc 3.1 frame 229a (`Customer: ERCO + BOL#: TH080725` → multi-stop denser card); Sc 3.2 frame 228b (`Customer: ERCO + Pickup Date Range` → same denser card visible behind dropdown). Cross-ref: [[../../../10-domains/shipments/data/attributes-progression-grouping|Shipments CSV]] confirms multi-stop is a first-class shape (Stops attribute, Sequence Leg attribute).
**Affects:** Result-card component contract — needs to accept a multi-stop variant; backlog item to confirm trigger with Efrain; Shipments-route adapter responsible for mapping row → card shape.

---

## Pending (need source / verification)

- **Per-chip removal affordance** — likely × per chip on hover; verify in next batch of frames.
- **Card variation trigger confirmation (GS-13)** — working hypothesis; need counter-example or Efrain confirmation.
- **Watchlist tab content** — needs source.
- **Drawer ↔ Suggested Filters toggle chevron** — Efrain 26:23 ambiguous; ask.
- **`Show N results` count semantics on Saved tab** — verify (frame 222 shows `Show 4 results` against single saved-filter chip).
- **Bar resize / chip-overflow behavior** — frame 216 shows two-line wrap; spec the exact threshold.
- **`Customer` vs `Customer Name` vs `Client` label drift** — frame 232 vs 211 vs drawer in 218; canonicalize.
- **Saved-filter edit / delete affordances** — chevron implies edit; delete not visible.
