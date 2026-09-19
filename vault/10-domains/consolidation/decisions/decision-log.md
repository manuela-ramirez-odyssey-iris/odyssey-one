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
- **Source:** `vault/00-inbox/Planning and Consolidation.vtt` (2026-09-17 Dave Schultz + Adam Shingle call); user ruling 2026-09-19, session S154; `docs/superpowers/specs/2026-09-19-manual-consolidation-mode-design.md`.
- **Affects:** `ShipmentsRoute`, `App.jsx`, `AppShell`; supersedes CNS-02 for the build.

### CNS-08 — Checkbox eligibility is Direct + no active tender + one customer (PROVISIONAL)
- **Decided:** 2026-09-19 (S154)
- **Previous state:** no selection concept existed. CNS-03 recorded the deck's `Shipment Type = Single` column as the pool's expression of "you consolidate singles".
- **Decision:** a row's checkbox is enabled when the shipment is `Direct`, its tender status is not `Sent` or `Accepted`, and (once one row is checked) it belongs to the same customer. Ineligible rows stay VISIBLE with a disabled checkbox naming the reason — nothing is filtered out of the list.
- **Rationale:** Dave Schultz 2026-09-17 — a from-scratch consolidation is built from direct shipments only (00:37:46, 00:40:19, 00:42:08: *"The from-scratch shipments have to be direct shipments"*); a tendered direct shipment cannot give up its load until the tender is cancelled (00:08:17 *"if it's already tendered, you can't put it in a consolidation"*, 00:10:51, 00:15:38); and an exception is irrelevant to eligibility (00:09:06, 00:52:43) so Exceptions-tab rows are selectable. Same-customer per Ramesh 2026-09-15 at 00:05:00 and LINX-15762 / LINX-15786 business rules.
- **Not applied, deliberately:** Ramesh's pool gates — Allow Optimization = Yes, OCM profile 97–101 validation, `Shipment Status = Consolidation` (LINX-15786 BR I). Those describe backend pool membership; the checkbox encodes Dave's rules. **The user flagged the whole gate as provisional** (2026-09-19: *"we need to discuss this in the future but do your suggestion"*), so expect it to move.
- **Source:** `vault/00-inbox/Planning and Consolidation.vtt` (2026-09-17); `vault/00-inbox/Consolidation.vtt` (2026-09-15, Ramesh walkthrough); LINX-15762, LINX-15786; user ruling 2026-09-19.
- **Affects:** `src/consolidation/eligibility.js`; open question for Dave — does a Declined tender really return a direct shipment to eligibility?

### CNS-09 — The Consolidation ID is the Odyssey Shipment Identifier — this closes CNS-04
- **Decided:** 2026-09-19 (S154)
- **Previous state:** CNS-04 logged an unresolved tension: the deck's audit trail carries `Shipment ID` (`SH3001`) and `Consolidation ID` (`CON001`) as separate columns, and CNS-04 said not to assume they are the same thing.
- **Decision:** they are the same. A consolidation's identity is its Odyssey Shipment Identifier, which carries the `C` prefix (direct shipments carry `O`). No separate `CON-…` key is modelled.
- **Rationale:** on the 2026-09-17 call Manuela stated it (00:51:01, *"that is why we have an Odyssey shipment ID… the prefix C are for consolidated ones"*) and both Adam Shingle (*"Yep, that's correct"*) and Dave Schultz (*"Yep"*) confirmed. Ramesh had only ever guessed at a separate ID (2026-09-15 at 00:13:45, *"I am guessing it could be some kind of a consolidation ID"*) and conceded the Odyssey identifier could serve at 00:14:44.
- **Source:** `vault/00-inbox/Planning and Consolidation.vtt` (2026-09-17); `vault/00-inbox/Consolidation.vtt` (2026-09-15).
- **Affects:** closes CNS-04; the review screen labels selected shipments by `odysseyShipmentIdentifier`; whatever Apply eventually creates gets a `C…` identifier, not a new key. Ties to the Shipments log's DEC-144…151.

### CNS-10 — The first selected row locks the customer, and the lock scopes the list
- **Decided:** 2026-09-19 (S154)
- **Previous state:** the Shipments list was scoped only by the navbar Customers panel. Same-customer was a rule with no UI expression.
- **Decision:** in consolidate mode the first row checked becomes the anchor; the shipments list and the category-tab counts then scope to that customer alone, a "Selected Customer" badge row appears under the page header, and the search placeholder becomes "Search for {customer}". Clearing the selection releases all three. The Customers panel is not modified and keeps its own meaning — it decides what is LISTED, the anchor decides what may JOIN this consolidation.
- **Rationale:** user ruling 2026-09-19 — rather than leaving other customers' rows visible with disabled checkboxes, remove them from the list and say which customer is active. The mechanism is free: `dataId` in the Customers panel IS the `customerId` stamped on shipment rows, so the anchor's id goes into the same scope parameter the panel already drives.
- **Source:** user ruling 2026-09-19, session S154; `docs/superpowers/specs/2026-09-19-manual-consolidation-mode-design.md` §3.4; `CustomersContext.jsx:33`.
- **Affects:** `ShipmentsRoute` (`effectiveCustomerIds`, feeding `listParams` and the three category-count queries).
