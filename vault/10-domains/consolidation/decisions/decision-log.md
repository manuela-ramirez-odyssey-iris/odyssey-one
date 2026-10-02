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

## The 2026-09-29 rebuild — Jana's order-change sync (CNS-18 … CNS-20)

### CNS-18 — Manual consolidation picks only from the Consolidation pool
- **Decided:** 2026-09-29 (S164)
- **Previous state:** CNS-08 (Dave Schultz 2026-09-17): any Direct shipment with no active tender could be picked, from any panel. Exceptions were irrelevant and Hold was fine. Consolidate mode landed on Exceptions › All. Ramesh's pool gates (Allow Optimization, `Shipment Status = Consolidation`, LINX-15786 BR I) were deliberately not applied.
- **Decision:** entering consolidate mode lands on **Monitoring › Consolidation**, and every other panel and tab is hidden for the rest of the mode. Only single-order (Direct) shipments in the pool can be checked. The customer lock (CNS-10) and the guards (CNS-12) are unchanged. The server refuses any source outside `category = 'consolidation'`.
- **Rationale:** Jana, 09-29 `@27:13–33:59`: *"you just have to be in consolidation state… you will see only 159 shipments"*. The pool holds exactly the shipments the optimizer should have consolidated and didn't. Hold already failed Allow Optimization (`@33:01`). Single-order only: Manuela *"shipments that have one order only, right?"*, Jana *"Correct, correct"* (`@29:14`). This effectively applies Ramesh's pool gates, which CNS-08 had set aside. It conflicts with Dave's 09-17 position; the user ruled for Jana's scope, and Dave's view is kept here as the previous state.
- **Source:** `vault/00-inbox/Order Change Sync.vtt` (2026-09-29); user 2026-09-29; spec `docs/superpowers/specs/2026-09-29-consolidation-via-order-change.md` S1.
- **Affects:** supersedes CNS-08's panel scope (its Direct + one-customer rules survive). `ShipmentsRoute.jsx`, `consolidations.mjs`.

### CNS-19 — Consolidation runs in the order-change Edit Stops screen, from New, with no Prior
- **Decided:** 2026-09-29 (S164)
- **Previous state:** the S161 **Review & Apply Manual Consolidation** page (LINX-15787, VD 2249:46444) had Planned Stops with an edit mode and allow-then-fix validation (DEC-219), a summary, the selected-shipments table and Apply.
- **Decision:**
  - After picking, the planner works in the order-change **Edit Shipment Stops** screen, reused and **not** order change itself: no order-change record, no order-change API.
  - No Prior anywhere, because the result is a new C. The strip shows Distance, Gross Weight and Volume, live. The All Stops row shows Consolidated Cost, Seed Equipment and Utilization.
  - Stops start pickups first, then deliveries, in selection order. Same-site stops of the same type merge.
  - Move, Remove, Add Orders (any of the customer's shipments, as a what-if), dates and Evaluate work as they do in order change. At least 2 orders must stay.
  - **Stop sequence follows order change's LINX-15669 rule:** a move that puts a delivery above its pickup is refused. DEC-219's allow-then-fix validation is retired, since it solved the same rule a different way (user: *"the way it is in order change is better, not allowing the user from the beginning"*).
  - The **Tendered Shipment Detected** modal (Remove / Discard / Cancel tender) is kept on Apply. It now also checks the shipments that added orders came from.
  - The Review & Apply page is deleted.
- **Rationale:** Jana `@24:43–35:07`: *"you can use exactly the same order change consolidation process to do the manual consolidation… directly you start from new… rest of the page exactly remains the same… you don't have to reinvent anything."* `@35:07`: *"the first step is good."* The 09-28 design review `@06:06` backs the what-if Add: *"you can do the what-if scenario, you cannot finalize it."* The stories (Ramesh) never described this flow.
- **Source:** as CNS-18; 09-28 `Consolidated Order Change Process - Design Review.vtt`; user rulings 2026-09-29 (R3, R4, R5, R7 in the plan).
- **Affects:** supersedes the S161 review page and DEC-219 (shipments log). `ConsolidateStopsRoute.jsx` (new), `EditStopsView.jsx` (`showPrior`, `minOrders`, `confirmApprove`, plain `tenderList` props), `stopsSandbox.js` (`initFromSources`), `ConsolidationApplyModal.jsx` (extracted).

### CNS-20 — A created C is treated like any new O shipment
- **Decided:** 2026-09-29 (S164)
- **Previous state:** CNS-11: the C was born in Monitoring › Consolidation with no carrier list (`shippingOptionList: []`). Afterwards the Review page showed a read-only preview with a success banner.
- **Decision:**
  - The C is filed by the same rule as a new O (`planShipment`): the Consolidation pool if every order is consolidatable, else Hold. It is untendered, with its status from `shipmentStatus.js`.
  - It carries the carrier list the planner evaluated, untendered (adopts CNS-16). That list is the first selected shipment's list, re-costed by the new stops' miles, as a stand-in for the routing call the prototype lacks.
  - The planner lands on the Shipments list, on the C's tab, where the row is pinned and animated in (reduced motion: highlight only).
  - Editing a pool C reuses its ids (CNS-11/14). An order left pending on it becomes its own Direct shipment.
- **Rationale:** user 2026-09-29: *"a C shipment is treated as any other O shipment after its creation"*; the landing animation was the user's idea. The 09-23 call `@43:41–44:16` (Jana): a new shipment re-runs the optimization condition and either enters the pool or gets a new list.
- **Source:** user 2026-09-29; `vault/00-inbox/Consoloidation Questions 2.vtt` (2026-09-23).
- **Affects:** `consolidateShipments.mjs`, `consolidations.mjs`, `consolidationService.ts`, `ShipmentsRoute.jsx`.

**Refined 2026-09-30 (S164, user):**
- **Color:** no purple anywhere in consolidation. Purple means an external (customer) change, and a consolidation isn't one, so stops, markers and chips are green or gray.
- **Summary:** the retired page's summary strip returns at the top, without its "Consolidation Summary" heading:
  - Customer Name and Selected Shipments chips;
  - the metrics Total Weight, Weight Utilization, Total Volume, Volume Utilization and Hazmat, live from the orders on the stops.
  - In edit mode, the metrics slot shows Distance, Gross Weight and Volume instead.
- **Table:** **Selected shipments to consolidate** returns *above* All Stops, collapsible.
- **Rail:** the rail lines are dashed, because the stop order is a proposed sequence.
- **Width and titles:** the summary, strips and panels share one centred width that leaves room for the leg-distance tooltip. The New column reads **Stops Sequence**, and the page header reads **Review & Apply Manual Consolidation**. Utilization leaves the All Stops row, so no field appears twice.

### CNS-21 — Sources are soft-deleted and linked from the C; a load pulled out gets a new O linked to both
- **Decided:** 2026-09-23 call; built 2026-09-30 (S164)
- **Previous state:** CNS-11 / S155 — Apply hard-`DELETE`d the sources (`consolidations.mjs`), and the mock tombstoned them. §10 recorded four positions on the shells (Dave soft-delete, LINX soft-delete, Doug keep-and-lock, ours delete) without resolving them.
- **Decision:**
  - A consolidated source becomes a hidden shell: emptied, with its row and trail kept as they were, plus one final "moved to consolidated shipment C…" event. It is the C5 emptied-shell rule (DEC-202), so the list, counts and search already hide it, and it stays readable by id.
  - The new C carries a **link** to each hidden source (`detail.lineage.sources`, a nested snapshot).
  - A load pulled out of a C gets a new O linked to both the C and the load's original shipment.
  - Every shipment keeps its own trail. A hidden shipment's history is reached **only through the links**.
- **Rationale:**
  - Thomas: *"We're not deleting anything"* (`@00:09:20`).
  - Doug: *"You need the audit… you have to be able to get to it"* (`@00:16:43`); Melody *"not gonna write SQL"* (`@00:35:01`).
  - Thomas: *"the question is whether you can search and find it in the UI"* (`@00:29:11`).
  - The model was drawn live by Manuela (`@00:36:29`). Thomas: *"it has a link to both of the consolidated and the original"* (`@00:38:46`) and *"I agree with you. That's how it should be"* (`@00:40:01`).
  - Jana held the UI view was not MVP; the call went the other way.
- **Source:** `vault/00-inbox/Consoloidation Questions 2.vtt` (2026-09-23); spec `docs/superpowers/specs/2026-09-30-consolidation-lineage-history.md`.
- **Affects:** `consolidateShipments.mjs`, `consolidations.mjs`, `shipments.mjs` (split), `consolidationService.ts`, `tools/generate.mjs`, `tools/seed.mjs`.
- **Refined 2026-09-30 (S164, user):** a manual consolidation includes **at most one C shipment**. CNS-14 keeps a C's number through every edit and CNS-09 reuses its id, so a second C would be a "C merged from C". Applies to the sources drawn from the Consolidation pool (CNS-18); `checkConsolidation` refuses it with a 400 (*A consolidation can include only one consolidated (C) shipment.*). Affects: `consolidateShipments.mjs` (shared by `consolidations.mjs` and `consolidationService.ts`), `consolidateShipments.test.mjs`.
  - **Extended 2026-09-30 (S164, user):** in the consolidation editor, Add Order(s) **always disables** orders that live on a C shipment (tooltip on the order number: *Orders on another consolidated (C) shipment can't be added to this consolidation.*). Pulling an order off a C, with or without a C already in the consolidation, could empty that C into a hidden source of the new one. This amends the 2026-09-25 "every row selectable, blocks only at save" rule for C rows only; order change is unchanged. `checkConsolidation` refuses the same case with that message (400). Affects: `AddOrdersModal.jsx`, `EditStopsView.jsx`, `ConsolidateStopsRoute.jsx`, `consolidateShipments.mjs`, `consolidations.mjs`, `consolidationService.ts`.
- **Ceilings (`ponytail:`):**
  - The link is a snapshot in the detail blob, not a table, so there is no cross-shipment "merged into" query. The upgrade path is a link table.
  - Seeded hidden ids come from separate bands, so a source can carry a higher id than its C.

### CNS-22 — The History tab shows the lineage: Shipment History · Lineage Tree · preview tabs
- **Decided:** 2026-09-30 (S164, user)
- **Previous state:** the History tab was one static "Shipment History" card (DEC-70/80/81/87).
- **Decision:**
  - A shipment with lineage gets tabs: **Shipment History**, **Lineage Tree**, and a closable tab per hidden shipment opened. A shipment without lineage looks the same as before.
  - **Shipment History:** a summary card (Customer / Origin / Destination, **Merged from:** its direct sources) above the unchanged trail.
  - **Lineage Tree:** a nested "Sources of X" tree with a "Preview only" lock badge on hidden rows, plus Expand All.
  - **Preview tab:** the hidden shipment's summary, with Merged from as the **ancestry path** (root → … → this), above its own trail.
  - The dot colour marks depth (blue root, green level 1, yellow deeper).
- **User rulings (2026-09-30):**
  - Merged from = ancestry path.
  - Keep our trail rows (the VD's tracking-style rows are not adopted).
  - The closable tab is app-local and logged ad-hoc for a D session.
  - The VDs set the look only; their ids and data are placeholder.
- **Source:** Figma `x38TOJGsNryYl3LsKhCtSc` 2671:81594, 3113:19333, 3121:60581, 3126:19659, 3127:20032; spec above.
- **Affects:** `HistoryTab.jsx`, `LineageTree.jsx`, `panes/history.css`, `mapSellShipmentOutToDetail.ts`.

### CNS-23 — Any C's stops are editable from its Stops tab; an active tender asks keep-or-replace at the end
- **Decided:** 2026-10-01 (S165, user approval of the spec)
- **Previous state:** a C could be edited only from the row menu, only while it sat in the Consolidation pool (S1.5 of the 09-29 spec). The server refused any source outside the pool, and an apply always filed the result untendered.
- **Decision:**
  - The Stops tab of **any** Consolidation shipment gets an **Edit Shipment Stops** button outside order-change review. It's greyed out (tooltip) while an order change is open, and opens the consolidation editor on that one C (no Prior, no order-change data, the C keeps its ids).
  - The AC's hidden items (order-change triangles, Prior / New Direct / New Consolidated cost, OC messages) are already absent in the no-Prior mode.
  - At Apply, if the C is **Sent** or **Accepted**, an *Active Tender* dialog asks: **Yes** keeps the carrier and re-sends (order change's retender outcome, Monitoring › Sent); **No** cancels the tender and lands on the Tender tab with the re-evaluated, untendered list (CNS-16). There's no Bypass. With no active tender, the planner lands back on the C's Stops tab.
  - The C itself is excluded from *Tendered Shipment Detected*; external orders' source shipments are still checked.
  - History records one *Shipment Stops Edited* entry, not *Created* + *Manual Consolidation*.
  - Editing a C (from the Stops tab or the row menu): the nav header reads **Edit Consolidation**, and the *Selected shipments to consolidate* table is not shown (user 2026-10-01).
- **Source:** LINX-15873 AC (`customfield_10032`); Jana's grooming, relayed by the user 2026-10-01 ("do you want to keep the tender and send it to the same carrier? If they say no, then it puts them back into the tender screen"); user rulings R3/R4. Spec `docs/superpowers/specs/2026-10-01-edit-consolidated-shipment-stops.md`.
- **Open:** the tender Yes/No comes from the grooming, not the Jira AC yet. Confirm with Jana that it's added to 15873.
- **Affects:** `StopsTab.jsx`, `ConsolidateStopsRoute.jsx`, `api/_lib/consolidateShipments.mjs`, `consolidationService.ts`.

### CNS-24 — The workbench grid follows LINX-15786's columns; sorting returns grid-wide; filters and refresh are halted
- **Decided:** 2026-10-01 (S165, user, on Ramesh's sheet `Manual Consol_Vercel Vs Jira_29Sept26.xlsx`)
- **Previous state:** consolidate mode showed Monitoring's column set (Tender Status, Shipment Status, Pickup #…). Sorting had been off grid-wide since the S85 test switch. An empty pool read "No shipments found".
- **Decision:**
  - **Columns** (mode-only set, in the story's BR II order, and editable in the column panel): Shipment ID, Buy Shipment, Shipment Type, Customer ID, Customer Name, Origin, Destination, Equipment, Gross Weight, Total Volume, Weight Utilization %, Volume Utilization %, Pickup Date, Delivery Date, Planning Type, SCAC.
    - Tender Status and Pickup # are dropped (tendering happens after consolidation).
    - Volume and utilization are fetched only in the mode, over the paged rows. Utilization uses **placeholder** equipment capacities (`equipmentCapacity.js`) until Dave gives the real rule (CNS-05).
    - Origin/Destination location IDs show as a hover tooltip on the address cell, not as columns.
  - **Empty pool:** "No Consolidation Candidates Available" (LINX-15786 Scenario 2). A search or customer lock that empties the list keeps the generic message.
  - **Sorting** is back on the whole Shipments grid, only on the 22 columns the server can really sort (no silent fallback). The mode defaults to Shipment ID descending (LINX-15893 BR I). Gross Weight is not sortable, because edited values carry mixed units.
  - **Halted (user):** every LINX-15893 filter/refresh item: the Hazmat filter, removing the Tender Status filter, the weight/volume comparators, Refresh, and Last Refreshed.
  - **Not yet:** the Earliest/Latest windows and Hazmat (both are in the column catalog but empty on list rows), and SCAC-from-order.
  - **Answered, unchanged:** the title stays "Shipments Consolidation". CNS-07 makes this a mode of the Shipments screen, not a standalone "Candidate Workbench". The audit trail is the History-tab lineage (CNS-21/22), not a separate page.
- **Source:** Ramesh's sheet (2026-09-30), LINX-15786 AC, LINX-15893 AC; user rulings 2026-10-01. Specs `docs/superpowers/specs/2026-10-01-consolidation-workbench-easy-fixes.md`, `…-volume-utilization.md`.
- **Note:** the sheet's story numbers are auto-incremented (LINX-15787…15797 on the workbench rows). Only 15786, 15893 and 15788 are real here.
- **Affects:** `ShipmentsRoute.jsx`, `ShipmentTable.jsx`, `ColumnPanel.jsx`, `sortableColumns.js`, `api/_lib/shipments.mjs` (SORT_MAP, list extras), `gridService.ts`.
