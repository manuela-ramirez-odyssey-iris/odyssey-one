---
domain: consolidation
type: decision-log
tags: [consolidation, decisions]
date: 2026-09-15
status: active
---

# Decision Log — Consolidation

Prefix `CNS-`. Deliberately not `CON-`, which the deck already uses for Consolidation IDs
(`CON-001`).

Decisions about the *identifier* itself live in
[[../../shipments/decisions/decision-log|the Shipments log]] (DEC-144…151).

### CNS-01 — Consolidating CREATES a new shipment; loads are moved into it
- **Decided:** 2026-09-15 (S148 intake)
- **Previous state:** we assumed consolidation meant adding orders to an existing shipment — the mental model behind Order Change's `AddOrdersModal`.
- **Decision:** a consolidation is a **new** shipment. The loads of the participating single-order shipments are **reassigned** to it. Orders are never added to a direct shipment.
- **Rationale:** two independent sources agree. Dave Schultz, 2026-09-15: *"that would be done by MOVING the loads from their current single order shipments over to a NEW shipment that is a consolidation (you can't add orders to a direct shipment…)"*. The deck's own audit trail, written 08-Sept: `Consolidated Shipment Created | SH3001 | CON001` followed by `Load Reassigned to Another Shipment | SH1001 → SH3001`.
- **Source:** deck slide 7; Dave Schultz Q&A, `vault-sources/10-domains/shipments/sources/laurie-dave-odyssey-shipment-identifier-2026-09-15.md`.
- **Affects:** the Oct build has **no** creation path today; Order Change's Add Orders is a *within-an-existing-consolidation* tool, not the consolidation mechanism.

### CNS-02 — Consolidation is its own top-level domain, not a Shipments tab
- **Decided:** 2026-09-15 (S148 intake)
- **Previous state:** consolidation was treated as a mode of the Shipments Order Change flow.
- **Decision:** Consolidation is a sibling nav area with three sub-pages — Candidate Workbench (15786), Review & Apply (15787), Audit Trail (15788). Canon lives in `vault/10-domains/consolidation/`.
- **Rationale:** both workbench mockups render a left sidebar with `Consolidation` as a top-level expandable item alongside Shipments / Loads / Orders, with those three children; the active child is highlighted.
- **Source:** deck slides 2–3 and 5 (screens transcribed in `vault-sources/.../screenshots/`).
- **Affects:** our sidebar (6 domains + users) gains a 7th area; `AppShell` routing.

### CNS-03 — The candidate pool offers SINGLE shipments
- **Decided:** 2026-09-15 (S148 intake)
- **Previous state:** none — no candidate concept existed.
- **Decision:** the workbench grid carries a `Shipment Type` column whose value is `Single` on every mocked row. Candidates are single-order shipments.
- **Rationale:** the UI expression of CNS-01 — you consolidate singles, you do not grow a consolidation.
- **Source:** deck slide 2 grid, column 3.
- **Affects:** open question 6 — whether `Single` is our LINX-11597 `Direct` under a different label.

### CNS-04 — `Consolidation ID` is a SEPARATE identifier, unreconciled with the Odyssey Shipment Identifier
- **Decided:** 2026-09-15 — logged as an open tension, NOT resolved
- **Previous state:** S148 shipped `odysseyShipmentIdentifier` (`C…` consolidated / `O…` single) as the shipment's identity (DEC-144).
- **Decision:** record that the deck treats `Shipment ID` and `Consolidation ID` as **different columns in the same audit table** (`SH3001` alongside `CON001`), and that the success modal announces `Consolidation ID: CON–001`. Do **not** assume `CON-001` is the new shipment's `C…` identifier.
- **Rationale:** they appear side by side on one row with different values; one cannot be a rendering of the other. A consolidation *event/grouping* key and a *shipment* identity are plausibly both real.
- **Source:** deck slides 6 and 7.
- **Affects:** directly touches DEC-144…151. **Ask Dave before building anything that keys on either.**

### CNS-05 — Utilization is the organizing metric, and its target is per Customer Profile
- **Decided:** 2026-09-15 (S148 intake)
- **Previous state:** no utilization concept exists anywhere in our data or UI.
- **Decision:** Weight Utilization % and Volume Utilization % appear per candidate row, per selected shipment, and as a selection aggregate; the loop in slide 4 is explicitly "keep modifying the selection to improve weight/vol utilization". The threshold that makes a selection good enough is **defined in the applicable Customer Profile**, not globally.
- **Rationale:** slide 4 verbatim: *"If additional weight and/or volume capacity is available (Weight Utilization % and/or Volume Utilization % is less than the target defined in the applicable Customer Profile), the Planner may select Modify Selection."*
- **Source:** deck slide 4; screens on slides 2–3, 5.
- **Affects:** new seeded fields, new column semantics, and a Customer Profile concept we do not model.

### CNS-06 — Optimizer integration is descoped for Oct MVP
- **Decided:** 2026-09-15 (recording the deck's own ruling)
- **Previous state:** the optimizer mockups (17-Aug-2026) read as forthcoming work.
- **Decision:** slides 9–15 are context only. Slide 8 is a full-bleed statement that optimizer integration is not in scope for the Oct MVP. Manual consolidation (15786/15787/15788) is the Oct surface.
- **Rationale:** stated by the deck itself, in the deck that supersedes the optimizer one by three weeks.
- **Source:** deck slide 8.
- **Affects:** scope. One rule from the descoped half is worth carrying regardless — slide 15 rule 2: if it is already time to tender, **do not accept the change, inform the user, and tender as-is**.

### CNS-07 — Manual consolidation is a feature of the Shipments screen, not a separate nav area
- **Decided:** 2026-09-19 (S154)
- **Previous state:** CNS-02 recorded consolidation as a 7th top-level sidebar area with three sub-pages (Candidate Workbench / Review & Apply / Audit Trail), read off the Cognizant mockup deck.
- **Decision:** for the Oct MVP surface, consolidation is a *stage* of `/shipments` — a "Consolidate" button turns the existing shipments table into a selection surface — plus one new route `/shipments/consolidate/review`. CNS-02 stands as the deck's reading; this supersedes it for what we build.
- **Rationale:** the user's ruling 2026-09-19 (*"we are building this on top of shipments like a shipments extra feature"*), and Dave Schultz on the 2026-09-17 call rejecting the separate-module model outright (at 01:04:18, on Ramesh's framing: *"Yeah, and it's not, it's not"*; Adam Shingle at 01:04:05 naming the disagreement: *"he's thinking consolidations are a different module"*). Manuela proposed exactly this button-in-Shipments shape on that call at 00:51:08 and Dave answered *"Oh yeah, yeah, absolutely"*, Adam *"Yes"*. It also keeps Dave's one-list requirement (00:54:12, *"I have to be able to see them all in one list"*) — the mode overlays the table the planner already has, tabs included.
- **Source:** `vault-sources/10-domains/shipments/sources/dave-adam-planning-consolidation-2026-09-17.vtt` (2026-09-17 Dave Schultz + Adam Shingle call); user ruling 2026-09-19, session S154; `docs/superpowers/specs/2026-09-19-manual-consolidation-mode-design.md`.
- **Affects:** `ShipmentsRoute`, `App.jsx`, `AppShell`; supersedes CNS-02 for the build.

### CNS-08 — Checkbox eligibility is Direct + no active tender + one customer (PROVISIONAL)
- **Decided:** 2026-09-19 (S154)
- **Previous state:** no selection concept existed. CNS-03 recorded the deck's `Shipment Type = Single` column as the pool's expression of "you consolidate singles".
- **Decision:** a row's checkbox is enabled when the shipment is `Direct`, its tender status is not `Sent` or `Accepted`, and (once one row is checked) it belongs to the same customer. Ineligible rows stay VISIBLE with a disabled checkbox naming the reason — nothing is filtered out of the list.
- **Rationale:** Dave Schultz 2026-09-17 — a from-scratch consolidation is built from direct shipments only (00:37:46, 00:40:19, 00:42:08: *"The from-scratch shipments have to be direct shipments"*); a tendered direct shipment cannot give up its load until the tender is cancelled (00:08:17 *"if it's already tendered, you can't put it in a consolidation"*, 00:10:51, 00:15:38); and an exception is irrelevant to eligibility (00:09:06, 00:52:43) so Exceptions-tab rows are selectable. Same-customer per Ramesh 2026-09-15 at 00:05:00 and LINX-15762 / LINX-15786 business rules.
- **Not applied, deliberately:** Ramesh's pool gates — Allow Optimization = Yes, OCM profile 97–101 validation, `Shipment Status = Consolidation` (LINX-15786 BR I). Those describe backend pool membership; the checkbox encodes Dave's rules. **The user flagged the whole gate as provisional** (2026-09-19: *"we need to discuss this in the future but do your suggestion"*), so expect it to move.
- **Source:** `vault-sources/10-domains/shipments/sources/dave-adam-planning-consolidation-2026-09-17.vtt` (2026-09-17); `vault-sources/10-domains/consolidation/sources/ramesh-consolidation-walkthrough-2026-09-15.vtt` (2026-09-15, Ramesh walkthrough); LINX-15762, LINX-15786; user ruling 2026-09-19.
- **Affects:** `src/consolidation/eligibility.js`; open question for Dave — does a Declined tender really return a direct shipment to eligibility?

**Amended 2026-09-20 (S155):** ineligible-by-TYPE rows are no longer listed at all. In consolidate mode the list and the tab counts carry Direct shipments only (user: *"C shipments can appear only in non consol mode"*), applied as a mode rule like the hidden PGI/PGR tabs — not a visible chip, unlike the CNS-10 customer lock. The checkbox reasons still guard tender and customer on the Direct rows that ARE listed. Editing an existing consolidation starts from its row-menu **Edit** (disabled while tendered), which enters the mode with that row as the anchor; the row is in the selection and the review, never in the mode's list. Affects: `ShipmentsRoute.jsx` (`effectiveCriteria`, `enterConsolidate(seedRow)`), `ShipmentTable.jsx` (`onEditConsolidation`), `eligibility.js` (`consolidationEditReason`).

### CNS-09 — The Consolidation ID is the Odyssey Shipment Identifier — this closes CNS-04
- **Decided:** 2026-09-19 (S154)
- **Previous state:** CNS-04 logged an unresolved tension: the deck's audit trail carries `Shipment ID` (`SH3001`) and `Consolidation ID` (`CON001`) as separate columns, and CNS-04 said not to assume they are the same thing.
- **Decision:** they are the same. A consolidation's identity is its Odyssey Shipment Identifier, which carries the `C` prefix (direct shipments carry `O`). No separate `CON-…` key is modelled.
- **Rationale:** on the 2026-09-17 call Manuela stated it (00:51:01, *"that is why we have an Odyssey shipment ID… the prefix C are for consolidated ones"*) and both Adam Shingle (*"Yep, that's correct"*) and Dave Schultz (*"Yep"*) confirmed. Ramesh had only ever guessed at a separate ID (2026-09-15 at 00:13:45, *"I am guessing it could be some kind of a consolidation ID"*) and conceded the Odyssey identifier could serve at 00:14:44.
- **Source:** `vault-sources/10-domains/shipments/sources/dave-adam-planning-consolidation-2026-09-17.vtt` (2026-09-17); `vault-sources/10-domains/consolidation/sources/ramesh-consolidation-walkthrough-2026-09-15.vtt` (2026-09-15).
- **Affects:** closes CNS-04; the review screen labels selected shipments by `odysseyShipmentIdentifier`; whatever Apply eventually creates gets a `C…` identifier, not a new key. Ties to the Shipments log's DEC-144…151.

### CNS-10 — The first selected row locks the customer, and the lock scopes the list
- **Decided:** 2026-09-19 (S154)
- **Previous state:** the Shipments list was scoped only by the navbar Customers panel. Same-customer was a rule with no UI expression.
- **Decision:** in consolidate mode the first row checked becomes the anchor; the shipments list and the category-tab counts then scope to that customer alone, a "Selected Customer" badge row appears under the page header, and the search placeholder becomes "Search for {customer}". Clearing the selection releases all three. The Customers panel is not modified and keeps its own meaning — it decides what is LISTED, the anchor decides what may JOIN this consolidation.
- **Rationale:** user ruling 2026-09-19 — rather than leaving other customers' rows visible with disabled checkboxes, remove them from the list and say which customer is active. The mechanism is free: `dataId` in the Customers panel IS the `customerId` stamped on shipment rows, so the anchor's id goes into the same scope parameter the panel already drives.
- **Source:** user ruling 2026-09-19, session S154; `docs/superpowers/specs/2026-09-19-manual-consolidation-mode-design.md` §3.4; `CustomersContext.jsx:33`.
- **Affects:** `ShipmentsRoute` (`effectiveCustomerIds`, feeding `listParams` and the three category-count queries).

**Amended 2026-09-20 (S154):**
- **Decided:** 2026-09-20 (S154)
- **Previous state:** the above — the anchor's customer id fed `effectiveCustomerIds`, a route-private override of `listParams` and the three category-count queries, sitting outside the filter system entirely.
- **Decision:** the lock is now applied **at the filter level**, reusing the filtering the planner already has, instead of as a hidden query override. Entering consolidate mode changes no filters — any committed filter is preserved, including a customer filter holding several customers. Checking the first row sets the customer filter to exactly that row's customer, narrowing a multi-customer filter rather than duplicating it, and **locks** it: the chip has no remove control, survives Backspace, and is refused by every removal/replacement route (`onChipRemove`, `onClear`, `applyChips`, a same-key commit); its control in the Filters panel renders disabled with its value still visible and is excluded from that panel's Clear paths; while locked the search bar stops offering the Customer ID / Customer Name attributes. The lock cannot be bypassed because no control to bypass it is offered. Clearing the selection, or cancelling the mode, restores the filter the lock displaced. The lock matches the customer id **exactly** — ordinary typed customer search matches by substring, which the lock deliberately does not use, since a substring could admit a second customer and defeat the rule the lock exists to enforce; this preserves the exactness of the `customerIds` scope parameter it replaces.
- **Rationale:** user ruling 2026-09-20 — *"the customer selection will be applied at filter level, so is reusing the same filtering functionality we have, with the only difference that customer filtering cannot be edited to be mixed with two customers different customers. This way we gave user more clarity that we are filtering a customer"*; and *"I wanna make sure we dont bypass the rule of only one customer filtering in consol mode."* The table, the category-tab counts, and the search glimpse already consume committed criteria, so filtering through a chip needs no separate query plumbing — the change removes code rather than adding it. One behavior here is ours, not a user ruling: restoring the displaced filter when the lock releases was chosen for symmetry with how leaving the mode restores the sort and view.
- **Source:** user ruling 2026-09-20, session S154.
- **Affects:** supersedes the `Affects` line above. `ShipmentsRoute.jsx` (the `lockedChip` memo; `effectiveCustomerIds` deleted, `selectedDataIds` restored), `useGlobalSearch.js` (`setLockedChip`, the removal guards, the displaced-chip restore), `ShipmentsGlobalSearch.jsx` (`lockedChip` prop), `ShipmentsFiltersView.jsx` (locked keys), `packages/ui/src/GlobalSearch.jsx` (a locked chip renders no X and is skipped by Backspace).
- **Not reconciled:** the original decision above also named a "Selected Customer" badge row under the page header and a "Search for {customer}" placeholder swap. Neither is mentioned in the 2026-09-20 ruling or its affected-files list, so this amendment does not confirm or retract them — left as previously recorded, pending confirmation.

### CNS-11 — Apply creates the `C…` shipment, takes the loads, and removes the emptied directs
- **Decided:** 2026-09-20 (S155)
- **Previous state:** Apply was a stub (S154, user ruling "lets land the first part first"). The `C…` shipment, the load moves and the emptied shells were "next session's work".
- **Decision:** Apply builds ONE consolidated shipment from the checked sources in both runtimes through one pure builder (`api/_lib/consolidateShipments.mjs`, sibling of `planShipment.mjs`): `shipmentType: 'Consolidation'` (the LINX-11597 enum the grid already branches on — not a new spelling), orders/loads/pickup numbers unioned, weight summed, stops = every source pickup in selection order then every delivery, born in `Monitoring › Consolidation` with no tender (DEC-156/157). Ids come from a band disjoint from the seed and from order-created shipments (`C7…` / sell `27…` / buy `910…`); **if exactly one source is already a Consolidation shipment its ids are reused**, so editing a consolidation keeps its Consolidation ID (CNS-09). Sources vanish from the grid: mock tombstones them in the overlay, live DELETEs after repointing `orders.shipment_sell_id` to the new row and rewriting `search_index`. After Apply the review screen becomes a preview (`Review {id}`, "Back to Shipments" / "Edit Consolidated Shipment"), a success banner carries the id and a "View Shipment" link that lands on Shipments with the new row pinned to the top of page 1 and highlighted.
- **Rationale:** user, 2026-09-20 — "since we are closing the loop make sure consol is correctly wired"; the banner copy, the preview state and the two buttons are the user's own spec. Live sequence numbering is count-based (`// ponytail:` in `consolidations.mjs`) — a real sequence needs a migration, which needs a Neon write the user has not asked for.
- **Source:** user asks 2026-09-20, session S155; `docs/superpowers/specs/2026-09-20-consolidation-apply-and-fixes.md` §2.6, §3.
- **Affects:** `ConsolidationReviewRoute.jsx`, `api/_lib/consolidateShipments.mjs`, `api/_lib/consolidations.mjs` (`POST /shipment-service/v1/consolidation`), `src/api/services/consolidationService.ts`, `src/data/index.js` (`removeShipments`), `ShipmentsRoute.jsx` (`createdShipment` pin + highlight).
- **Open:** where the removed shells are viewed (Dave, CNS-01) — nothing in the prototype shows a removed shipment, so tombstone and DELETE are indistinguishable today. Whether a "Consolidation"-type row may be re-selected as a source is exercised only through "Edit Consolidated Shipment"; the checkbox rule (CNS-08) still refuses it by hand.

### CNS-12 — Selection guards: one customer per batch, a locked bar clears only with consent, never below two on review
- **Decided:** 2026-09-20 (S155)
- **Previous state:** the header checkbox with no anchor selected every eligible row on the page across all customers; the first became the anchor and narrowed the list, so the others stayed selected but invisible and could not be deselected. Clearing the search bar while locked was silently refused. The review table could be unchecked below two, which only disabled Apply.
- **Decision:** (1) any batch check is narrowed to one customer — the anchor's, or the first row's when none exists — and the header uncheck clears the whole selection, not the page; (2) "Clear all" on the search bar while the customer is locked asks first ("Clear Customer Selection … will also clear all N selected shipments for {customer}"), and consent empties the selection and the bar without restoring the displaced filter; (3) the review table refuses to drop below two — the planner is offered "Modify Selection", which returns to consolidate mode with the rows they tried to remove already unchecked; (4) the customer row under the header is present for the whole mode, reading "Select to consolidate. Only direct shipments are consolidatable" until a row is checked; (5) the lock's own commit never opens the search glimpse. No selection limit exists and none was added (Q for Dave).
- **Rationale:** user bug list 2026-09-20 (select-all "gets weird", clear-bar dialog, "we cannot have <2 selected rows", the empty-state customer row).
- **Source:** user, 2026-09-20, session S155; spec §1, §2.4.
- **Affects:** `ShipmentsRoute.jsx` (`handleSelectionChange`, `handleClearLocked`), `ShipmentTable.jsx` (header uncheck, sticky-left select column), `ShipmentsGlobalSearch.jsx` (`lockedClearMessage` / `onClearLocked`, locked chips excluded from the glimpse heuristic), `ConsolidationReviewRoute.jsx` (`guardMinimum`).

### CNS-13 — In TMS nothing is deleted — consolidation is one foreign key on the load, and the load is locked while it holds it
- **Decided:** 2026-09-22 (S156 intake of the 2026-09-21 Doug call). **Recorded as a TMS fact to validate**, not as a build ruling — Doug: *"are you changing the business model?"* (00:37:16).
- **Previous state:** DEC-156 (Dave, 2026-09-17): emptied directs are soft-deleted shells; S155 (CNS-11) removes them.
- **Decision:** Record Doug's model: standalone load `ALD` and consolidation header `ACOL`; consolidating sets `ALD.ACOL_ID`. The load persists unchanged; while keyed it cannot be tendered or edited (UI guard: *"this is part of a console"*); its own carrier list is ignored in favour of the C's; breaking the key restores it as standalone with the carrier list it already had. **Tension with DEC-156 and with LINX's mark-deleted behaviour is recorded in canon §10, unresolved** — for the 2026-09-23 meeting.
- **Rationale:** *"We don't delete anything ever"* (00:10:58); *"No data was deleted, no data was moved around. It's just a foreign key relationship"* (00:11:30); *"the standalone load is locked down… while it's in a console"* (00:24:51).
- **Source:** `vault-sources/10-domains/consolidation/sources/doug-consolidation-questions-2026-09-21.vtt` 00:06–00:12, 00:24–00:26.
- **Affects:** If adopted: `consolidateShipments.mjs`/`consolidations.mjs` stop removing sources and instead link + lock them (a `consolidatedInto` field, refused tender/edit actions, a visible state); `data/index.js` tombstones go away.

### CNS-14 — A consolidation keeps its C number through every edit; emptied, it is cancelled and never reused; one load is not a consolidation
- **Decided:** 2026-09-22 (S156 intake of the 2026-09-21 Doug call). **Recorded as a TMS fact to validate**, not as a build ruling — Doug: *"are you changing the business model?"* (00:37:16).
- **Previous state:** CNS-11 reuses the id only when exactly one source is a C; no remove path; ≥2 enforced on the review.
- **Decision:** New C on first creation; add/remove/reorder loads keep the same C; removing all loads cancels the C and the number is never reused; a one-load C cannot be saved. Planners hold this model (*"Yes"*, 00:21:09) and would be confused by a C that is recreated on edit.
- **Rationale:** *"you get a brand new C number"* (00:18:21); *"it's still the same C number. You're just modifying it"* (00:18:30); *"the C number gets cancelled. And it will not be reused"* (00:20:26); *"you can't have a consolidation with only one load"* (00:20:4x); *"they would be very confused"* (00:23:07).
- **Source:** `vault-sources/10-domains/consolidation/sources/doug-consolidation-questions-2026-09-21.vtt` 00:18–00:23.
- **Affects:** Confirms CNS-11's id reuse and the ≥2 guard; adds remove-load and cancel-when-empty as gaps.

### CNS-15 — Nothing but stop sequence and dates blocks a consolidation; equipment is a derived seed plus a comparison list
- **Decided:** 2026-09-22 (S156 intake of the 2026-09-21 Doug call). **Recorded as a TMS fact to validate**, not as a build ruling — Doug: *"are you changing the business model?"* (00:37:16).
- **Previous state:** S155 enforces only same-customer and ≥2; the anchor's equipment code is taken; Ramesh's six validation gates were not built (S155 review).
- **Decision:** Equipment mismatch, hazmat mixing and date spread do not block (*"Nope, you can do that"*). Save-time errors are out-of-order stop sequence or dates; TMS guesses a sequence and the planner owns it. Equipment: a database package derives a **seed equipment** from all loads, the **equipment comparison list** follows from the seed, and the carrier list/tender is always single carrier, single equipment from that list.
- **Rationale:** 00:29:16–00:29:25 (validation); 00:30:58–00:34:40 (seed, comparison list, tank truck example, single equipment on tender). Package name unknown — *"It's been like 15 years"*.
- **Source:** `vault-sources/10-domains/consolidation/sources/doug-consolidation-questions-2026-09-21.vtt` 00:29–00:35.
- **Affects:** Closes Q-CNS-3 for TMS; opens Q: where the seed package lives (Thomas/Adam to trace).

### CNS-16 — A consolidation is routed at creation and may auto-tender per OCM profile; a tendered standalone cannot join
- **Decided:** 2026-09-22 (S156 intake of the 2026-09-21 Doug call). **Recorded as a TMS fact to validate**, not as a build ruling — Doug: *"are you changing the business model?"* (00:37:16).
- **Previous state:** DEC-156/157: every new shipment is born untendered and never auto-re-tenders; S155 creates the C with no carrier list.
- **Decision:** Creating the C generates its carrier list (*"you should have created a carrier list"*, 00:04:00); auto-tender on that list follows OCM-profile configuration (00:28:51). A currently tendered standalone load cannot be put into a C (00:27:15). The keyed standalone never auto-tenders while keyed.
- **Rationale:** Doug 00:03–00:04, 00:27–00:29. **Partial tension with DEC-156's "never tendering on creation"** — Dave spoke of no auto-RE-tender after order change; Doug speaks of routing at birth. Record both.
- **Source:** `vault-sources/10-domains/consolidation/sources/doug-consolidation-questions-2026-09-21.vtt` 00:03–00:05, 00:27–00:29.
- **Affects:** If adopted: Apply returns a C with `shippingOptionList` populated (routing), and the Tender tab is not empty.

### CNS-17 — Alexey's suggestion tools (LP multi-stop + PL/SQL aggregation) exist in TMS, are not MVP, and are unaccounted for in the event-topic design
- **Decided:** 2026-09-22 (S156 intake of the 2026-09-21 Doug call). **Recorded as a TMS fact to validate**, not as a build ruling — Doug: *"are you changing the business model?"* (00:37:16).
- **Previous state:** CNS-06 descoped optimizer integration for Oct.
- **Decision:** Two further TMS forms present Alexey's suggestions (LP solver run hourly → TMS tables; aggregation heuristic in database code); planners take, modify, or drop a suggestion into an existing C. Adam: not MVP; timeline *"January"* (00:45:30). Thomas: the new event-topic flow has not considered those tables; raised for the optimization call with Laurie the same day.
- **Rationale:** 00:21:23–00:22:xx, 00:38–00:46.
- **Source:** `vault-sources/10-domains/consolidation/sources/doug-consolidation-questions-2026-09-21.vtt` 00:38–00:46.
- **Affects:** None for the build; canon §6 stands.
