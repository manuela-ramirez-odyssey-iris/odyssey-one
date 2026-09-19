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
