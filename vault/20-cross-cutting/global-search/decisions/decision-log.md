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

### GS-14 — An untouched bar suggests NOTHING; suggestions are reactive to typing
**Decided:** 2026-07-31 (S104)
**Previous state:** A focused, empty bar with no chips showed the first 5 progression attributes under the title "Suggested Filters" (`INITIAL_COUNT = 5`, adapter `getInitial`). This was the "entry points" half of GS/Case 2.
**Decision:** No chips + nothing typed → **no suggestion panel at all**. Suggestions appear only once the user types (attribute matches) or once a chip is committed (the drill-forward group, which is **unchanged**).
**Rationale:** User, S104 — *"users can click without understanding what to expect."* An entry-point chip offers a filter before the user has expressed any intent, and clicking one commits a chip whose effect they can't predict. The drill-forward case is different and survives: a committed chip is evidence of intent, so proposing the next group is an answer to a question the user has already asked.
**Source:** User direction 2026-07-31.
**Affects:** `adapter.getInitial` (no-chip branch), `INITIAL_COUNT` deleted, `suggestionsOpen` in `useGlobalSearch` (no items → dropdown never opens). Supersedes the entry-point half of **Case 2** in [[../composed-criteria|composed-criteria]]; the group-advancement half stands.

### GS-15 — A bare code resolves to WHAT IT IS; results are labelled by the matched attribute
**Decided:** 2026-07-31 (S104)
**Previous state:** With no chips, `searchShipments` defaulted `primaryKey` to `'buyShipment'` (adapter.js). Every row was therefore **labelled with the shipment number** and **ranked by how well the query matched `buyShipment`** — even when the query had actually matched an order number, a SCAC, or a customer. Separately, `FREE_TEXT_KEYS` covered only 8 fields, so a pasted **Pro/BOL, load, trailer or seal number returned zero results** (measured, S104).
**Decision:** Three parts.
1. **Free-text coverage widened** to every identifier a user could paste plus the parties: `pro`, `load`, `equipment`, `seal`, `consignor`, `consignee` join the existing 8. Deliberately excluded: measures (`grossWeight`, `apFreightCost`, `orderCount`, `loadCount` — a bare "2" would match half the DB) and enums (reachable as chips).
2. **Per-row attribute resolution.** Each matching row resolves which of its own fields the query best matched, scored 3/2/1 (exact / prefix / contains), progression order breaking ties.
3. **The row label carries the type**: `Order #0000000091000`, `Pro#/Booking #442376`, `SCAC FXFE`. Labels already ending in `#` join without a space.
**Rationale:** User, S104 — *"we type 00000001234, quick results should not assume that is a shipment."* The ranking machinery already existed (`searchIndex.valueMatchDetail` powers the suggestion chips and identified a pasted order number correctly); it simply was never consulted by the results rows. Measured after the change: typing a Pro number returns **both** its `Pro#/Booking #442376` row and a `Seal Number S442376` partial, exact first — the multi-type case, from real fixture data.
**Deliberately NOT done:** rows stay **shipment-grained** — an order-number match labels the row `Order #…` but does not explode into order rows. Order explosion remains chip-driven (Case 1). This preserves S79c decision 7 (glimpse `total` == the table's total), which a mixed-grain result set would break. Guarded by a test.
**Source:** User direction 2026-07-31; behavior measured against seed-42 fixtures before and after.
**Affects:** `criteria.js` `FREE_TEXT_KEYS` (shared — so `gridService` list + category counts widen identically, which is what makes "Show all results" agree with the glimpse), `adapter.searchShipments` bare-code branch, new `resolveBestMatch` / `labelMatch`. `MatchRow` **unchanged** — `matchId` is a plain string, so no `@odyssey/ui` change, no Figma cycle, no release.

### GS-16 — "Show all results" lands on the table in the PREVIEW's order
**Decided:** 2026-07-31 (S104)
**Previous state:** The preview sorted by match quality; the table did not sort at all unless the user had clicked a column header (`gridService` only sorted when `params.sortBy` was set, fed from `sorting[0]?.id`). Rows therefore arrived in generator/file order, so the exact match the preview put first could land anywhere in the table.
**Decision:** When committed criteria arrive from search and **no explicit column sort is active**, the grid orders rows by the same relevance rule as the preview — leading chip → score against that chip's field; free text → best-matching attribute, progression order breaking ties. An explicit column sort always wins; this is a default, not an override.
**Rationale:** User, S104, on seeing the labelled preview: *"if i click on show all, data shown in the table is in the same order as in the results preview?"* It wasn't. The preview's whole job is "your exact match is at the top"; discarding that on click throws away the one thing the user just confirmed.
**Implementation note:** `compareByCriteria` + `resolveBestMatch` moved into `criteria.js` (the module `gridService` already imports for `matchesCriteria` — same single-source reasoning as S79c decision 7), with the domain's attribute pool `FREE_TEXT_ATTRS` exported from `progression.js`. The glimpse still computes its own ordering because it already holds the resolved match for labelling, so the two are kept honest by **test** rather than by shared code — Case 6, which uses a *discriminating* derived query (one whose exact match is NOT already first in natural order) and was mutation-checked: disabling the grid sort fails it.
**Source:** User direction 2026-07-31.
**Affects:** `gridService.getShipmentErrorList` sort branch, `criteria.js` (+`compareByCriteria`, `resolveBestMatch`, `scoreText`), `progression.js` (+`FREE_TEXT_ATTRS`).

### GS-17 — Panels are POST-filters over one result set; a search lands on the panel holding the most matches
**Decided:** 2026-07-31 (S104)
**Previous state:** The glimpse total counted matches across ALL panels while the table rendered one panel at a time, so "Show all 123 results" could land on a tab holding 4 of them. The only panel movement was the S79c decision-8 fallback: when the active panel's criteria-filtered count hit **zero** it moved to `visiblePanels[0]` — the FIRST visible panel, not the fullest.
**Decision:** Two parts, from one ruling.
1. **The total stays global.** `N` is all matches, distributed across the tabs. The tabs are **post-filters over one result set**, not separate result sets — so a per-panel count would be answering a different question than the one the user asked.
2. **A newly committed search jumps to the panel with the most matches**, tabs reset to `all`. Fires once per criteria identity, so a manual panel pick afterwards stands. Ties break on `PANEL_CONFIG` order.
**Rationale:** User, S104 — *"123 is ALL results if some of them are in monitoring and others in exceptions and other tabs then you should take as those tabs as post filters, you are showing all that are distributed between the different places, lets actually add one criteria, always open the tab where it shows most of the previewed results."* This resolves the mismatch without lying about the count: the number is honest, and the user is placed where most of it lives. Measured case: `FXFE` → 123 total, Monitoring 90, Exceptions 33 → lands on Monitoring.
**Interpretation flagged:** "most of the previewed results" is implemented against the **full per-panel counts**, not the 15 preview rows. The preview is a relevance-capped sample, so counting it would let a truncation artifact choose the tab. Say so if the literal reading was intended.
**Implementation note:** deliberately does NOT reuse `fallbackPanelRef` — that memo restores the user's original panel the moment it is visible again, which would instantly undo the jump. Written as a render-time "adjust state on change" (the file's existing convention, and what the page-reset above uses) rather than an effect. The decision itself is extracted to `bestPanelForSearch` / `panelTotals` in `data/panelConfig.js` and unit-tested, since the route has no test harness.
**Source:** User direction 2026-07-31.
**Affects:** `ShipmentsRoute` (panel auto-jump + `totalsByPanel`), `data/panelConfig.js` (+2 exports, +`panelConfig.test.js`). The zero-hiding fallback (decision 8) is untouched and still runs first.

### GS-18 — The landing tab comes from the PREVIEW's leading group, not the fullest panel
**Decided:** 2026-07-31 (S104) · **Supersedes GS-17 part 2** (same session, on user testing)
**Previous state:** GS-17 jumped to the panel with the most matches overall. Tested with `12`: the preview showed 5 Buy Shipment # rows, 5 Equipment # rows, 2 Load # rows — and the jump landed on Monitoring, whose top rows matched none of those leading groups.
**Decision:** take the attribute group of the **first preview row**, keep the preview rows in that group, and open the panel most of them live in. Ties inside the group fall to the earliest (highest-relevance) row. Falls back to the fullest panel only when the preview can't answer (no rows, or its rows carry no panel), and never lands on a panel with zero matches.
**Rationale:** User, S104 — *"in case we have a group like that 5, 5, 2 we should choose the group that shows first in the preview panel to pick the tab. The idea behind this is to give user eyes what they are seeing."* A larger tab the user can see nothing of is not where their attention is; the preview's top rows are the only thing they've actually looked at.
**Implementation:** result rows gained `data-panel` + `data-attr` (the RESOLVED attribute for bare-code rows), `panelForResults()` in the adapter applies the rule, and `ShipmentsGlobalSearch` passes it as `onCommitQuery(criteria, { landOnPanel })` — a second argument, so the `{ chips, text }` criteria contract (and its query keys) stays unpolluted.
**Source:** User testing 2026-07-31.
**Affects:** `adapter.js` (+`panelForResults`, row data-attributes), `ShipmentsGlobalSearch.commitQuery`, `ShipmentsRoute` (`landOnPanel` state feeding the jump). `bestPanelForSearch` survives as the fallback.

### GS-16a — Relevance needs its own sort identity (the fix that made GS-16 real)
**Decided:** 2026-07-31 (S104) — bug found by the user, same session
**Previous state:** GS-16 put the relevance ordering behind `else if (!params.sortBy …)` in `gridService`. But the shipments table is **never unsorted** — `ShipmentsRoute` seeds `sorting` with `[{ id: 'buyShipment' }]` and `listParams` always sends `sortBy`. **The relevance branch never executed in the app.** The S104 tests passed because they called `getShipmentErrorList` directly and omitted `sortBy` — testing a path the product never takes.
**Decision:** relevance travels as an explicit sort id, `RELEVANCE_SORT = 'relevance'`. Committing a search sets `sorting` to it; clearing restores `DEFAULT_SORTING`. `gridService` treats it as "no column drives → order by criteria relevance".
**Rationale:** user report — typing `12` produced table rows matching none of the preview's leading groups, because the seeded `buyShipment` sort was still driving.
**Lesson recorded:** a service-level test that constructs its own params can pass while the feature is dead, because the route's real params were never exercised. The replacement tests send **exactly what `listParams` builds** (`sortBy: RELEVANCE_SORT`) and additionally assert that the old default-sort params produce a DIFFERENT first row — so the fixture proves the sentinel does something.
**Affects:** `gridService` (+`RELEVANCE_SORT` export, sort branch), `ShipmentsRoute` (`DEFAULT_SORTING`, commit sets the sort).

### GS-19 — Panel tabs are PERMANENT; only their numbers respond to a search
**Decided:** 2026-07-31 (S104) · **RETIRES the panel half of S79c decision 8**
**Previous state:** decision 8 hid zero-total panel tabs under a committed search, with PGI/PGR exempt (a "Coming soon" placeholder with **no rows at all** — 0 of 2,200). I first read the user's *"top bars are always visible even when 0"* as "so hide it too" and removed the exemption — **backwards**. Corrected same session: *"PGI/PGR AND THE OTHER TOP TABS EXCEPTIONS AND MONITORING ARE NEVER MEANT TO BE GONE."*
**Decision:** the panel tab row is fixed — Exceptions, Monitoring, PGI/PGR always render, whatever the counts. A search changes the **numbers** on them, never their presence. Category **pills** still hide at zero (`hideZeroCategories`): a pill is a filter, a panel tab is the structure of the domain.
**Rationale:** a tab disappearing mid-search reads as the application losing a feature, not as a filter narrowing. Structure must be stable for the view to stay legible; the counts carry the search's effect.
**Consequence:** the decision-8 selection-fallback machinery (`fallbackPanelRef`, forced-move-and-restore) is **deleted** — with no panel ever hidden, the active panel can never become invisible. Removed 3 lint errors' worth of render-time ref access along with it.
**Source:** User testing 2026-07-31.
**Affects:** `ShipmentsRoute.visiblePanels` (now just the config keys), `handlePanelSelect`, `panelConfig.test.js`. The GS-18 landing jump still skips empty panels — landing ON an empty tab is different from hiding it.

### GS-20 — Multi-code lists: the typed codes UNION; a same-attribute list also offers an IN-list chip
**Decided:** 2026-08-01 (S104) — first implemented as AND, **corrected to UNION the same day by the user**
**Previous state:** the free-text needle was a single string; `"442376, 448275"` was searched literally (matching nothing) and multi-value chips didn't exist.
**My error, and the correction:** I read the user's *"CODE123 & CODE001 & …"* as boolean AND — every code must match the SAME row (narrowing). The user meant the union of result sets: *"I thought AND meant: show CODE123 results AND CODE223 results, doesn't matter if they are of the same attribute or they are different."* The ambiguity is real and worth recording — in boolean search, AND/OR describe conditions **on one row**, so "show A's results and B's results" is the operation boolean logic calls **OR**. Measured before and after on fixtures: a cross-row pro pair returns **0 rows under AND, 4 under union**.
**Decision:**
1. **Free text = UNION across codes.** Each row matches ANY code; the per-code result sets interleave, ranked by match quality (exact before prefix before contains, regardless of which code produced the hit).
2. **Each row is labeled by its OWN matched code** — in `CODE123 CODE223`, the CODE123 rows read `Order #CODE123` and the CODE223 rows read `Buy Shipment #CODE223`. There is deliberately no shared "leading code": under union a row need only match one. (This differs from GS-18's leading-group rule for the landing TAB, which still applies — the tab follows the preview's first group.)
3. **Codes may belong to different attributes** — mixed result sets are the expected shape, which is why the row format must carry its type (GS-15). Row *presentation* per entity type (an order-format row vs a shipment-format row) is **still to be designed** — flagged by the user, not built.
4. **Phrase-first, code-list fallback.** The whole string is tried as ONE needle against the full dataset; only when it matches **nothing** is it tokenized. Under union this guard is load-bearing, not cosmetic: tokenizing `"Weyerhaeuser Company"` would union in every row containing "company" anywhere. Pinned by a test asserting the loose token matches strictly more rows than the phrase.
5. **Same-attribute list → ONE IN-list chip** (`Pro#/Booking #: 442376, 448275`); committing it matches the field against ANY value (GS-12 multi-value precedent). **Mixed-attribute list → no chip** (user rule); free text still searches.
6. **The interpretation is resolved ONCE per query against the FULL dataset** — never per row, never against the customer-scoped subset — so the glimpse, the table and the counts all read the query identically (the S79c d.7 single-source rule extended from matching to parsing).
**Server-side note:** each code runs the tiered CTE independently; union = `UNION` of per-code hit sets deduped to each entity's best tier; chip IN-lists = `value = ANY($values)`. Cheaper than the AND reading (no intersect). Architecture spec §4a.
**Source:** user direction + correction 2026-08-01; semantics measured against seed-42 fixtures both before and after the flip.
**Affects:** `criteria.js` (`textNeedles`, `matchesAnyNeedle`, `resolveBestMatchNeedles`, `tokenizeChipValue`, `matchesChip`, `matchesCriteria`/`compareByCriteria` gain a `needles` param), `adapter.js` (suggestion gating, bare-code resolution, order-explosion IN handling), `gridService` (needles computed once for list + counts). Case 9 tests (10) pin all of it.

### GS-21 — Multi-code entry commits ONE expandable SET chip (MultiCodeChip)
**Decided:** 2026-08-02 · **Figma:** Global Search file, node `1044-31186` ("Expanded Badge" + "EditableMiniPanel")
**Previous state:** GS-20 gave multi-code lists union semantics and (same-attribute only) a plain IN-list chip rendered like any other chip — `Pro#/Booking #: 442376, 448275` grows unboundedly with the list; mixed lists got no chip at all. Bulk paste (tracking teams pasting dozens of IDs — Scenario 2) had no manageable UI.
**Decision:**
1. **A committed multi-code string becomes ONE expandable chip.** Collapsed = a summary badge: `<Attribute> Set • N IDs` when the set has a single detected type, `Multiple Set • N IDs` when mixed. `N` counts **valid codes only**.
2. **Named-set rule:** the set earns an attribute name only when *every valid code's best match* (exact > prefix > contains, progression order breaking ties) resolves to the **same attribute**. Any disagreement → `Multiple`. The name is a promise, not a guess.
3. **Chevron expands an EditableMiniPanel anchored to the badge** — 4px below, always following the badge position (the mock's navbar overflow is a mock artifact, not intent — user 2026-08-02). Codes are listed one per line; the user can add/remove codes manually.
4. **Edits apply only on collapse or Enter** — the results panel never updates per keystroke inside the panel.
5. **Not-found / invalid codes paint red** (`--bittersweet-300` on the dark panel), are **excluded from the count** and from the search.
6. **No per-code type initials — rejected** (proposed, then withdrawn with the user 2026-08-02): a code's type is a *set* of matches, not a fact (S104 measured `442376` matching both `Pro#/Booking #` and `Seal Number`). Per-code auto-resolution stays row-level where it already lives (GS-15/GS-20 self-labeling rows).
7. **Type application via the suggestion panel:** for a Mixed set, the suggestion panel offers attribute types; clicking one asserts the whole batch is that type — converting it to a single GS-12 IN-list chip. Codes that don't match under that attribute go red + decounted.
**Visual decisions (canon over mock):** badge inherits the canonical chip family — `--deep-sea-neutral-700` bg / `--deep-sea-neutral-100` text (mock's 600/200 treated as Efrain drift, flagged); panel border maps mock's `Carolina Blue/500 #378AC0` (not in canon — neither tokens.css nor the Figma snapshot has a 500) to `--carolina-blue-400`; panel bg uses our `--deep-sea-neutral-950 #0F182A` (mock file's 950 resolves `#0B1629` — value drift, flagged to Efrain). Panel radius `--radius-lg`, badge `--radius-sm`, `--shadow-sm` — exact token matches.
**Source:** user spec + confirmation 2026-08-02 (Scenario 2 — Bulk/Multi-Search for Heavy Data); Figma intake node 1044-31186; engine evidence from `criteria.js` (`resolveBestMatchNeedles`).
**Affects:** new `packages/ui/src/SearchChip.jsx` (+ DSM demo, normalizing); GlobalSearch chip row wiring + per-code validation are follow-up work. Case 11 in composed-criteria.md.
**Amended same day (user):** component renamed **MultiCodeChip → SearchChip** — the canonical single chip merged in as a `Type=Single` variant (shared intent: both are committed criteria chips); **X remove button** added to every variant so chips chain progressively (a Set chip never blocks committing more chips after it). Figma master: Design System - MCP set `4871:7334` (`Type=Single|Set` × `State=Collapsed|Expanded`, X at canon 12px DSN/400). Wording for the mixed summary ("Multiple Set" vs "Multi Query" vs recommended "Mixed Set") — **open, user to decide**.
**WIRED into the app 2026-08-02/03 (Gate-B-approved batch):** `adapter.resolveCodeSet(text)` (commit-time set detection: GS-20 phrase gate → per-code validity via the search's own fieldIncludes semantics → named-set rule) + `adapter.validateCodes(values, dataKey)` (rule-7 revalidation); `useGlobalSearch.onTextCommit` upgrades a code-list commit to a `kind:'set'` badge (raw text still drives the GS-20 union — matching unchanged); `onSetCommit(key, values)` handles panel edits (re-resolve for the badge, revalidate for typed chips; empty = removal); `getInitial(chips, setChip)` adds the **"Define set type"** section for untyped sets — clicking converts the badge into a typed IN-list set chip via the `onChipCommit` set-type intercept. `GlobalSearch.renderChip` renders `kind:'set'` through **SearchChip**; `GlobalSearchPanel` gained `loading` (the **Spinner**, driven by the hook's new `searching` flag). GlobalSearch + GlobalSearchPanel demoted to NORMALIZING (both DSMs). Live-adapter note: resolveCodeSet/validateCodes are inherited from the mock (local seed data) — a per-needle server validation endpoint is the follow-up (the GS-20 hits builder already counts `DISTINCT needle_ix`). 9 new tests (`codeSet.test.js`).

### GS-22 — Date & date-range chips; the empty bar's DATE carve-out from GS-14
**Decided:** 2026-08-03 · **Case:** composed-criteria.md Case 12
**Previous state:** dates were plain substring chips (a typed date had to literally match the stored string); GS-14 said an untouched bar offers nothing.
**Decision:**
1. Every date-typed attribute (progression `match: 'date'`) offers TWO suggestion chips: the plain date and its **Range** twin. Surfaced when the query is **slashed** date-like (`2/`, `2/3/2026`) — bare digits stay code-typing — and on the **EMPTY focused bar** ("Filter by date"), amending GS-14: dates are the one cold-bar filter users reach for; attribute entry points stay gone; more cold-bar filters may join later (user).
2. Committing lands the chip **EXPANDED** with a **CalendarPicker** in the SearchChip mini panel (new `Type=Date` mode; same badge anchoring as the set chip). A complete typed date pre-fills a bound; a single-date pick auto-collapses; ranges collapse via chevron/outside click.
3. Matching: `kind: 'date-range'` chips compare **calendar days** in shared `matchesChip` (inclusive; open-ended on a missing bound; single = one-day range; no bounds = no narrowing). Glimpse + table agree by construction.
4. "Latest/Earliest …" date fields from the user's examples join when the data carries them.
**Source:** user spec 2026-08-03 (Scenario continuation of GS-21 session).
**Affects:** `criteria.js` (`parseSearchDate`, `matchesChip` date branch), `adapter.js` (`dateItems`, `DATE_LIKE`, getInitial/getSuggestions), `useGlobalSearch` (`onDateCommit`, date-item intercept), `SearchChip` date mode (+ CalendarPicker), `GlobalSearch.renderChip`. 8 new tests (`dateChips.test.js`); the two GS-14 pins re-pinned to the amended rule. **Figma:** `Type=Date` variant on the SearchChip master OWED (master currently has Single/Set only).

### GS-23 — GS-22's empty-bar DATE carve-out is REVERSED; GS-14 restored verbatim
**Decided:** 2026-08-04 · **Reverts:** GS-22 part 1's empty-bar half (the typed-slash half of GS-22 is UNCHANGED)
**Previous state:** GS-22 (S106) made an untouched/empty focused bar show a `"Type or Filter by date"` section (`dateItems('')`) — a carve-out from GS-14's "an untouched bar suggests nothing."
**Decision:** The empty-bar date carve-out is removed. A focused bar with no chips and nothing typed now suggests **NOTHING**, full stop — GS-14's original rule, no exceptions. Typing a slashed date fragment still surfaces "Filter by date" (unchanged, still in `getSuggestions`); the `setChip` "Define set type" section and all drill-forward/progression sections (once a chip exists) are untouched.
**Rationale:** User, 2026-08-04 — the empty-bar date suggestion confused users. This is a direct reversal of the user's own S106 ruling, not a new discovery.
**Source:** User direction 2026-08-04.
**Affects:** `adapter.js` (`getInitial`'s no-chips branch — the `dateItems('')` push deleted, comment updated to record the reversal), `codeSet.test.js`, `dateChips.test.js`, `composed-criteria.test.js` (empty-bar assertions changed from `['Type or Filter by date']` to `[]`). `composed-criteria.md` Case 12 annotated with the reversal; typed-slash behavior and its tests are untouched.

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
