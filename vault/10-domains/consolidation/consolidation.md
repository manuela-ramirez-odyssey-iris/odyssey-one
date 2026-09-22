---
domain: consolidation
type: canon
tags: [consolidation, manual-consolidation, workbench, optimizer, linx-15786, linx-15787, linx-15788]
date: 2026-09-15
status: active
---

# Consolidation — domain canon

Synthesized in S148 from the **Manual Consolidation Mockups** deck (08-Sept-2026), which
is physically two decks in one file. Raw archived at
`vault-sources/10-domains/consolidation/`.

| Half | Slides | Dated | Scope |
|---|---|---|---|
| Manual Consolidation | 1–8 | 08-Sept-2026 | **Oct MVP** — LINX-15786 / 15787 / 15788 |
| Optimizer | 9–15 | 17-Aug-2026 | **DESCOPED** for Oct MVP (slide 8, full-bleed) |

> Slide 8 is a whole slide reading **"INTEGRATION WITH OPTIMIZER IS NOT IN SCOPE FOR OCT
> MVP"**. The optimizer half is recorded here as future scope and shape-of-things, not as
> build material. Do not plan Oct work against §6.

## 1. What consolidation is

Combining several single-order shipments into one multi-order shipment to improve trailer
utilization.

The mechanism is **not** "add orders to an existing shipment". Dave Schultz, 2026-09-15:

> that would be done by MOVING the loads from their current single order shipments over to
> a NEW shipment that is a consolidation — you can't add orders to a direct shipment, you
> create a NEW Consolidation shipment using the Loads from other Shipments…

The deck's own audit trail says the same thing from a different direction, three weeks
earlier — `Consolidated Shipment Created | SH3001 | CON001`, immediately followed by
`Load Reassigned to Another Shipment | SH1001 | SH1001 → SH3001`. Two independent sources,
one model. See [[decisions/decision-log|CNS-01]].

**The unit that moves is the LOAD, not the order.** Every screen pairs a Shipment ID with a
Load ID, and the reassignment event names loads.

## 2. Navigation — Consolidation is its own area

> **Superseded for the build by [[decisions/decision-log|CNS-07]] (S154, user ruling; Dave 2026-09-17 *"it's not, it's not"* a different module).** Consolidation is a stage of `/shipments` plus one review route. What follows is the deck's reading, kept as source record.

Both workbench screens show a left sidebar where **Consolidation is a top-level item**,
sibling to Shipments/Loads/Orders, expanded into three sub-pages:

```
Consolidation ▾
  Candidate Workbench     → LINX-15786
  Review & Apply          → LINX-15787
  Audit Trail             → LINX-15788
```

Our sidebar today is home / orders / carriers / shipments / spotboard / tracking (+users).
This is a **new domain-level area**, not a Shipments tab — which is why this canon lives in
its own folder. See [[decisions/decision-log|CNS-02]].

## 3. LINX-15786 — Consolidation Candidate Workbench

**Screen 1 — Candidate Summary.** Two stacked states are mocked (filters expanded; filters
collapsed with the selection summary expanded).

**Basic Filters** (row of controls): Shipment ID (search), Load ID (search), Customer,
Equipment Type, Origin, Destination, Hazmat — the four dropdowns default to `All`.
**Advanced Filters** is a separate collapsed section; `More Filters` opens it.
Buttons: `Apply Filters` · `More Filters` · `Clear` · `Refresh`, with
`Last Refreshed: 15-Oct-2026 09:15 AM CST` right-aligned.

Per the deck's annotations: *Apply Filters* applies basic and/or advanced; *More Filters*
opens the Advanced Filters page; *Clear* clears applied filters; *Refresh* re-reads the
candidate pool for newly eligible candidates.

**Grid — "Consolidation Eligible Candidates (18)"**, checkbox-selectable, 17 columns:

| # | Column |
|---|---|
| 1 | checkbox |
| 2 | Shipment ID *(link)* |
| 3 | **Shipment Type** — value `Single` on every row |
| 4 | Load ID |
| 5 | Customer Name |
| 6 | Origin (City, State, Country) |
| 7 | Destination (City, State, Country) |
| 8 | Equipment Type |
| 9 | Weight (lbs) |
| 10 | Volume (ft³) |
| 11 | Weight Utilization (%) |
| 12 | Volume Utilization (%) |
| 13 | Earliest Pickup |
| 14 | Latest Pickup |
| 15 | Earliest Delivery |
| 16 | Latest Delivery |
| 17 | Hazmat |

Paginated (`Showing 1 to 5 of 18 entries`, rows-per-page `25`, first/prev/1234/next/last).

**Shipment Type = `Single` on every candidate row** is the UI expression of Dave's rule: the
pool offers single-order shipments to consolidate. See [[decisions/decision-log|CNS-03]].

**Sticky selection summary bar** (always reflects current selection — the deck states this
twice, "Must always be updated based on current selection"):
`Selected Shipments: 2` · `Total Loads: 2` · `Total Weight: 27,500 lbs` ·
`Total Volume: 1,375 ft³` · button `View Selected (2 Shipments)`.

**Screen 2 — Candidate Details & Selection.** Collapsed by default. Expanding gives four
panels: **Selection Summary** (Weight Utilization `55%`, Volume Utilization `66%`),
**Stops Summary** (Pickup Stops `2`, Delivery Stops `1`), **Selected Shipments (2)**
(Shipment ID · Customer · Origin · Destination · Equipment Type · Weight · Volume), and
**Selected Loads (2)** (Load ID · Shipment ID · Weight · Volume). Footer:
`Modify Selection` · `Proceed to Review Consolidation`.

### Flow (slide 4, verbatim mechanics)

1. Selected Candidate Summary collapsed by default.
2. Planner applies Basic and/or Advanced filters; grid **and summary** refresh on the criteria.
3. Planner selects **two or more** shipments, clicks *View Selected*.
4. OdysseyONE expands Candidate Details & Selection with shipment + load detail.
5. If weight and/or volume utilization is **below the target defined in the applicable
   Customer Profile**, the Planner may *Modify Selection* — returning to the workbench with
   selections **retained**, to add or remove shipments and improve utilization.
6. Iterate until satisfied.
7. *Proceed to Review Consolidation* → LINX-15787.

The utilization target is **per Customer Profile**, not a global constant.

## 4. LINX-15787 — Review & Apply Manual Consolidation

Header badge: **`SLS Only (Oct MVP)`** — a scope limiter; the expansion of "SLS" is not
established by this deck ([[#8-open--tbd|open]]).

Panels:

- **Consolidation Summary** — Customer Name; Selected Shipments (3) as chips `SH1001`
  `SH1002` `SH1003`; Total Weight `27,500 lbs`; Weight Utilization `92%`; Total Volume
  `1,375 ft³`; Volume Utilization `88%`; Hazmat `No`.
- **Proposed Stop Count & Sequence** — Pickup Stops `1`, Delivery Stops `2`; ordered stop
  cards (`Chicago, IL` pickup → `Dallas, TX` delivery → `Houston, TX` delivery) each with
  date + time, joined by a route line.
- **Selected Shipments (3)** — 12-column table (#, Shipment ID, Load ID, Customer, Origin,
  Destination, Equipment Type, Weight, Volume, Weight Util. %, Volume Util. %, Hazmat),
  sortable, with `Export`.
- **Validation Status** — green "All validations passed" with six named gates:
  `Shipment status: Consolidation` · `Loads not cancelled` · `OCM profile rules satisfied` ·
  `Equipment compatibility` · `Hazmat restrictions` · `Pool eligibility criteria`.
- **Important Notes** — "This is a proposed consolidation. No changes have been applied yet."

### Button behaviour (slide 5, verbatim)

| Button | Behaviour |
|---|---|
| **Modify Selection** | Back to the workbench (15786), **retain** existing selections; planner may add/remove candidates |
| **Cancel Proposed Consolidation** | Back to the workbench, **do not retain** any selection; planner starts afresh |
| **Apply Proposed Consolidation** | Confirmation popup → Yes applies (Shipments domain handles the changes) / No returns |

### Confirmations (slide 6, verbatim copy)

- **Apply** — "Are you sure you want to apply the proposed consolidation?" · Yes / No
- **Cancel** — "Are you sure you want to cancel the proposed consolidation? All the selected
  shipments will be removed from the proposed consolidation." · **Yes, Cancel** / No
- **Success modal** — "Consolidation Successfully Applied!", **`Consolidation ID: CON–001`**,
  "2 Shipments successfully consolidated", buttons `View Shipment` / `Close`
- **Cancel banner** — "Proposed Consolidation Cancelled Successfully !"

Note "Yes, Cancel" is deliberately asymmetric with the plain "Yes" of Apply.

## 5. LINX-15788 — Consolidation Audit Trail

`Refresh` + `Last Refresh : 08-Sep-26 10:00 am CST`. Eight columns:
**Event Timestamp · Event Type · Shipment ID · Consolidation ID · Previous Value · New Value ·
Exit Reason · Updated By**.

Event vocabulary observed (9 rows), with actor:

| Event Type | Actor | Notes |
|---|---|---|
| Entered Consolidation Pool | OdysseyONE | `-- → Consolidation` |
| Shipment Proceeded to Tendering | OdysseyONE | exit reason `Tendering Window Reached` |
| Shipment Exited Consolidation Pool | OdysseyONE | `Consolidation → Hold`, `Weight Threshold Reached` |
| Shipment Transitioned to Hold | OdysseyONE | `Consolidation → Hold`, `Volume Threshold Reached` |
| Consolidated Shipment Created | OdysseyONE | new shipment `SH3001`, `CON001` |
| Load Reassigned to Another Shipment | OdysseyONE | `SH1001 → SH3001` |
| Proposed Consolidation Cancelled | *user email* | `SH1001, SH1002 → --` |
| Proposed Consolidation Modified | *user email* | `SH1001, SH1002 → SH1001, SH1002, SH1003` |
| Consolidation Applied | *user email* | `-- → CON001` |

Two actor classes: `OdysseyONE` (system) and a named user
(`johndoe@odysseylogistics.com`). Consistent with [[../shipments/shipment-trail|DEC-89]]'s
`System (OdysseyOne)` convention, though here the system name carries no parenthetical.

**A consolidation POOL with its own state machine** is implied and never specified: shipments
enter it, exit it to `Hold` on weight/volume thresholds, or leave it to tendering when the
window is reached. This is the largest unspecified area in the deck.

## 6. Optimizer — DESCOPED for Oct MVP (context only)

Recorded so it isn't re-discovered. **Not Oct build material.**

- **LINX-14633 / 13292** — Recommendation Summary: `Recommendation ID · # Orders · #Shipments ·
  Customer · Type · Pre-Optimization Cost · Optimized Cost · Savings · Current Status ·
  Created Date · Action`. Types seen: `Aggregation`, `Continuous Move`, `Multi-Stop`.
  Statuses: `Pending Review`, `Accepted`.
- **LINX-13291 / 14687** — View vs Review of one recommendation: Recommendation Summary
  (Cross Customer Indicator, Consolidation Type, **Consolidation Sub-Type** e.g.
  `Multi Pick-Up / Multi-Drop`), Route Information, Associated Orders, Planning Summary,
  Associated Shipments, Cost Impact. Review adds `Accept Recommendation` / `Reject Recommendation`.
  - Reject copy: "…Rejected recommendations will return to the optimization pool"
  - Accept copy: "…This action can't be undone"
- **LINX-13472** — Optimization Audit Trail: filters (Job ID, Recommendation ID, Current
  Status, Recommendation Decision, Event Type, Initiated By, Configuration Name, Created Date
  range); table (Timestamp · Event Type · Job ID · Recommendation ID · Current Status ·
  Recommendation Decision · Initiated By · Action); right-hand **Audit Record Details** panel
  (General Information incl. `Configuration Name: VALTRIS_default`, `Load Count: 152`,
  `Load IDs: LD1001, … (+149 more)`; Status / Recommendation / Decision / Shipment Processing
  Action / Error Information). Job statuses: `Registered → Started → Running → Finished|Failed`.
- **Slide 15 — re-optimization rules** when a consolidated shipment's orders change:
  1. If the order is part of a job already running, Optimizer will not accept it until terminal
     status; the revised order returns to the pool if eligible.
  2. If it is already time to tender — **don't accept the change, inform the user, tender as-is**.
  3. Otherwise, if ≥1 order field changed (address/weight/volume/product info) requiring
     re-optimization, the revised order joins the next optimization batch.

Rule 2 is a hard behavioural rule that will outlive the descope.

## 7. Build delta — this deck vs what is shipped (as of S148; see §9 for S155)

> Stale rows since S155: the creation path now exists ([[decisions/decision-log|CNS-11]]); the identifier question is closed ([[decisions/decision-log|CNS-09]]); the nav area is not built ([[decisions/decision-log|CNS-07]]).

| Shipped state (ours) | This deck | Verdict |
|---|---|---|
| Consolidating = add orders to a shipment via Order Change `AddOrdersModal` | Consolidating = create a NEW shipment, reassign loads into it | **Contradicts our mental model, confirms our code** — our Add Orders is gated to an existing consolidation review, so nothing shipped is wrong; but the *creation* path does not exist at all |
| `odysseyShipmentIdentifier` `C…`/`O…` is THE shipment identity (S148, DEC-144) | Separate `Shipment ID` **and** `Consolidation ID` (`CON-001`) columns in one table | **Unreconciled** — a third identifier. See [[decisions/decision-log|CNS-04]] |
| Loads are hidden from users ([[../shipments/domain-analysis]], Jana S3) | `Load ID` is a first-class column on every consolidation screen, and loads are the unit reassigned | **Contradicts** — loads become user-visible in this domain |
| No utilization concept anywhere | Weight/Volume Utilization % per shipment **and** aggregate, colour-coded, targets per Customer Profile | **New** — new data, new seeding, new column semantics |
| Shipment statuses per [[../shipments/domain-analysis]] | Validation gate reads `Shipment status: Consolidation`; audit shows `Consolidation → Hold` | **New status value + pool state machine**, unspecified |
| `shipmentType` `Direct`/`Consolidation` (LINX-11597) | Workbench column `Shipment Type` = `Single` | **Vocabulary drift** — `Single` vs our `Direct` |
| Order-change compare + Edit Shipment Stops shipped (S142–S147) | Slide 15 reuses exactly those surfaces as the integration point | **Confirms** the surfaces; adds re-optimization rules on top |
| Sidebar has 6 domains + users | Consolidation is a 7th top-level area with 3 sub-pages | **New nav area** |

## 8. Open / TBD

1. **`Consolidation ID` vs the Odyssey Shipment Identifier.** The audit trail carries both
   `Shipment ID` (`SH3001`) and `Consolidation ID` (`CON001`) as distinct columns, so they are
   not the same thing. Is `CON-001` a grouping key over the consolidation *event*, while the
   new consolidated shipment separately gets its own `C…` Odyssey Shipment Identifier? **Ask
   Dave** — this lands directly on S148's work.
2. **What is "SLS"?** (`SLS Only (Oct MVP)` badge on 15787.)
3. **The consolidation pool.** Entry criteria, exit criteria, the weight/volume thresholds, and
   who owns `Hold` — none are specified. Largest gap for Oct.
4. **Customer Profile utilization targets** — where they live, who sets them, what happens at
   exactly-target.
5. **Advanced Filters** — "More Filters opens the Advanced Filters Page"; its contents are
   never shown.
6. **`Single` vs `Direct`** — is the workbench's `Shipment Type` our LINX-11597 field under a
   different label, or a different field?
7. **Utilization colour thresholds** — the mock renders `60%` green in one cell and `60%`
   red/orange in another on the same screen. Recorded as a mock inconsistency, not a rule.
8. **Cross-customer consolidation** — the optimizer half has a `Cross Customer Indicator`; the
   manual half filters by a single Customer and every example is one customer. Unclear whether
   manual consolidation may span customers.
9. **`View Shipment`** on the success modal — presumably deep-links to the newly created
   consolidated shipment; unconfirmed.

## 9. Review of the shipped loop (S155, 2026-09-21) — and what to validate with Dave

**Source precedence here (user, 2026-09-21):** Ramesh's stories describe *his design*, not the real functionality — Dave Schultz has the upper hand. So the questions below validate **ideas** with Dave; a story clause is cited only to show where a story and Dave diverge, never as the thing to implement.

**What is built and follows Dave:** consolidate from the Shipments list (not a module) · candidates are Direct + untendered + one customer (his rule, CNS-08; exceptions irrelevant) · Apply creates a **new** `C…` shipment and moves the loads (CNS-01) · born untendered in the pool (DEC-156/157) · the emptied directs go away (DEC-156) · Consolidation ID = the `C…` identifier (CNS-09, confirmed by Dave). Also built, our own calls: the Direct-only list in mode, the customer lock as a filter chip, id reuse on edit, pickups-then-deliveries in selection order, placeholder equipment capacity.

**Where the stories diverge from Dave and we followed Dave:** eligibility (stories: `Shipment Status = Consolidation` + Allow Optimization + OCM 97–101; Dave: Direct + untendered); where the result lands (LINX-15762: *"no longer part of the Consolidation Pool"*; Dave: every new shipment is born in the pool / Hold / Review). **No contradiction inside the canon**: CNS-08 and CNS-11 record Dave's version and name the story clause they override.

**Deck/story design we deliberately did not build (Ramesh's UI, not domain rules):** the Validation Status panel with six named gates, Load ID columns, the Cancel banner, the success *modal* (we use a banner + preview, user ruling), the separate nav area, the Advanced Filters bank.

### Ideas to validate with Dave (Q-CNS)

| # | Idea to validate | What we built / assumed |
|---|---|---|
| Q-CNS-1 | **A consolidation is born in the pool, like any new shipment** — even though it was just hand-built. Or does the planner's act of consolidating mean it should skip the pool and wait for its tendering window (Hold)? | Monitoring › Consolidation, untendered. |
| Q-CNS-2 | **Is "Direct + untendered + same customer" really the whole gate?** Specifically: a Direct on **Hold** (customer said no optimization) — still fair game for a *manual* consolidation? And a Direct that already has a Declined/Rejected tender — back in play? | Yes to both today (provisional CNS-08). |
| Q-CNS-3 | **What actually stops a consolidation in the old TMS?** Equipment mismatch? Hazmat with non-hazmat? Different pickup dates too far apart? We need the rules Dave enforced, not the six labels on the mock. | Only same-customer and ≥2 are enforced. |
| Q-CNS-4 | **Which equipment does the consolidation inherit** when sources differ, and who decides it — the planner at review, or routing later? Where do capacities per equipment code live? | Anchor's code; placeholder capacities, so utilization can exceed 100% silently. |
| Q-CNS-5 | **Do planners think in loads here?** Jana's rule hides loads from users; Ramesh's screens put Load ID everywhere and Dave says "the load is what moves". Is a Load ID something a planner needs to *see* while consolidating, or an internal unit? | Loads are joined internally, never shown. |
| Q-CNS-6 | **Who sequences the stops, and when?** Dave (00:33:20): V1 proposes, the planner re-sequences later. On the review, via Edit Stops after creation, or only the optimizer? | Pickups then deliveries in selection order; no re-sequencing UI. |
| Q-CNS-7 | **What becomes of the emptied direct shipments** and their history? Dave was undecided where they are viewed (00:06:32). If nobody ever views them, delete is fine; if the audit needs `SH1001 → SH3001`, something has to keep the shell. | Mock tombstones / live DELETE; the source's history is gone with it. |
| Q-CNS-8 | **Editing a consolidation before tender:** add loads (we allow, id kept) — real? Remove a load (un-consolidate: does it become a Direct again, with which id)? Merge two consolidations? | Add: yes. Remove: not supported. Merge: new id minted. |
| Q-CNS-9 | **The tendering window.** It is the pool's main exit criterion in every source, and we have no concept of it. What is it relative to — pickup date, customer profile lead time? Does a Direct past its window still consolidate by hand? | No window; a Direct stays eligible until tendered. |
| Q-CNS-10 | **Order-side effects.** Does anything on the order change when its load moves (status, a visible link)? Does an open order-change exception on a source travel with the load? | Orders stay `Planned Shipment`, repoint to the new shipment; exceptions do not carry. |
| Q-CNS-11 | **Utilization: whose target, and is it a block or advice?** Ramesh puts targets and UoM in the Customer Profile. Did the old TMS have a target at all, or did planners eyeball weight/volume against the trailer? | Unmodelled; LB/cuft assumed; nothing blocks. |
| Q-CNS-12 | **Audit actor.** Is the consolidation event attributed to the planner (user) or to the system? | Two system-authored entries on the new shipment. |
| Q-CNS-13 | **Any hard cap on shipments per consolidation** beyond capacity? | None. |
| Q-CNS-14 | **"SLS Only (Oct MVP)"** — what is SLS, and does it limit which shipments may consolidate? | Unknown; nothing built against it. |

Closed by consensus since S148: **cross-customer** (§8.8) — one customer, every source agrees; **Consolidation ID** (§8.1) — CNS-09; **`Single` vs `Direct`** (§8.6) — label drift only.

## 10. The TMS consolidation model — Doug, 2026-09-21 (S156 intake)

Source: `vault-sources/10-domains/consolidation/sources/doug-consolidation-questions-2026-09-21.vtt` — Doug (TMS engineer, ~15 years on the code; appears as `@1` in the VTT and is addressed as Doug throughout), Adam Shingle, Soni Sinha, Thomas Quaile, Steve O'Hara, Manuela. Doug answers **from TMS**, and said so twice: *"I don't know links, I don't know Dave's plans for links, but I could just tell you what happens in TMS"* (00:03:xx) and *"are you changing the business model?"* (00:37:16). OdysseyONE adds a layer TMS never had — shipments on top of loads — so every ruling below is a TMS fact to be **validated as an idea**, not copied ([[decisions/decision-log|CNS-13…CNS-20]]).

**The model in one paragraph.** A standalone load (`ALD`) and a consolidation header (`ACOL`) are two records; consolidating sets one **foreign key** on the load. *"No data was deleted, no data was moved around. It's just a foreign key relationship"* (00:11:30). While the key is set the load is **locked** — the UI refuses tender and edits with *"this is part of a console"* (00:24:51–00:25:57; the tender service simply never looks at keyed loads, so the guard is UI-side, 00:26:10). Break the key and the load is standalone again, using the carrier list it already had. Consolidating mints a **brand-new C number** (00:18:21); adding, removing or reordering loads later keeps it (00:18:30); remove every load and the C is **cancelled and never reused** (00:20:26–00:20:32); a **one-load C cannot be saved** (00:20:4x). Creating the C **generates its carrier list** (*"you should have created a carrier list"*, 00:04:00) and it can auto-tender if the OCM profile says so (00:28:51). A currently-tendered standalone **cannot** be put into a C (00:27:15). Planners **do** hold this mental model (00:21:09, one-word *"Yes"*), and *"if they remove the load and we threw away that consolidation and made a new one, they would be very confused"* (00:23:07). Planners work a consolidation screen that lets them *"add… remove loads, reorder loads, redo the dates, the stop offs, whatever"* (00:22:50).

**What does NOT block a consolidation.** Equipment mismatch, hazmat with non-hazmat, dates far apart: *"Nope, you can do that"* (00:29:16). LTL into TL is fine; tank truck would be refused by the equipment list, not by a rule. TMS **derives a seed equipment** from all loads (database package, name unknown after 15 years) and pulls the **equipment comparison list** from it; that list is what may appear on the carrier list, and a tender is always single carrier, single equipment (00:31:13–00:34:40). The only save-time errors are **stop sequence and date order** — TMS guesses the sequence, the planner owns it (00:29:25).

**Beyond MVP, on the record.** Two more TMS forms: Alexey's LP solver (multi-stop, runs hourly, dumps into TMS tables) and an aggregation heuristic in PL/SQL; planners take, modify, or drop a suggestion into an existing C. Adam: *"this isn't for MVP right now"* (00:45:10); Thomas flagged that the event-topic design has not accounted for those tables. Follow-up set for **2026-09-23** with Jana (00:36:25).

### Tension — the shells (record, not resolve)

| Source | What happens to the single-order shipment when its load is consolidated |
|---|---|
| Dave, 2026-09-17 (DEC-156) | soft-deleted empty shell; where it is viewed undecided |
| LINX today (Soni, 00:14:xx) | marked deleted; an order replan later creates a NEW shipment |
| Doug, 2026-09-21 | nothing deleted; the load stays, keyed to the C, locked; comes back on removal |
| Ours (S155) | removed (mock tombstone / live DELETE) |

Dave and Doug agree on the load-bearing part — a **new** C that takes loads. They differ on the shells. Manuela on the call: *"I don't think it's a good idea to delete shipments… It needs to be a new shipment for the console and… all the shipments shouldn't be scrapped, should be inside, linked to the C number."* User stance (2026-09-21): preserve the planners' mental model; the OdysseyONE team appears to be deliberately not reusing TMS as-is, which is the thing to settle on the 23rd.

### Build delta — S155 shipped state vs Doug

| Shipped (S155) | Doug | Verdict |
|---|---|---|
| Apply mints a new `C…` | brand-new C number | **confirms** CNS-11 |
| Edit reuses the C id when one source is a C | same C number on modify | **confirms** |
| Sources removed | kept, keyed, locked, restorable | **contradicts** — the largest delta; also contradicts DEC-156's "soft-deleted" wording |
| No "remove a load" path | remove/add/reorder freely; empty → cancelled | **gap** |
| ≥2 enforced | one-load C cannot be saved | **confirms** |
| No equipment/hazmat gate | none in TMS either; seed equipment derived | **confirms the absence**, adds seed-equipment derivation as a gap |
| Anchor's equipment code | seed algorithm over all loads | **gap** (package unnamed) |
| Pickups then deliveries, no re-sequencing | TMS guesses; planner edits sequence + per-stop dates; save validates order | **gap** |
| Born untendered, no carrier list | carrier list generated on creation; OCM auto-tender may fire | **contradicts** in part — DEC-156/157's "never tendering on creation" holds for the auto-re-tender case Dave described, but Doug says a C gets routed at birth |
| Tendered directs excluded | tendered standalone cannot join | **confirms** CNS-08 |
| Eligibility ignores Hold / optimizer | not discussed | still open |

### Q-CNS status after this call

Answered by Doug (TMS): Q-CNS-1 partly (a C is routed at creation; pool vs window still Dave's call), Q-CNS-3 (nothing blocks but sequence/dates), Q-CNS-4 (seed equipment + comparison list; capacities not discussed), Q-CNS-5 (planners think in loads AND the model is loads), Q-CNS-6 (planner re-sequences; TMS guesses), Q-CNS-7 (nothing deleted; history "pieced together from notes" — not designed), Q-CNS-8 (add/remove/merge-by-adding all allowed; empty → cancelled), Q-CNS-13 (no cap beyond the equipment list). Still open: Q-CNS-2 (Hold / declined tender / optimizer lock), Q-CNS-9 (tendering window), Q-CNS-10 (order-side effects), Q-CNS-11 (targets), Q-CNS-12 (audit actor), Q-CNS-14 (SLS).

### Questions for 2026-09-23 (Jana + Doug), in TMS language

1. When a load leaves a C, does the standalone go straight back to planning, or to Hold?
2. After a C is created and routed, does it wait in the pool or run to its tendering window with that carrier list?
3. Where does the seed-equipment package live, and who ports it? Is it master-data code or planning code?
4. What does the TMS load form show on a locked standalone (keyed to a C), so we can mirror the state?
5. Is the consolidation audit on the C, on each load, or both — and do we get to design it, given TMS has only notes?
6. Does anything change on the order when its load is keyed to a C?
7. Beyond "picks before drops, dates in order", are there sequence or date rules the save enforces?
8. **For Dave/Jana specifically:** do we keep TMS's keep-and-lock model for the single-order shipments, or LINX's mark-deleted? Planners' mental model argues for keep-and-lock.

## Related

- [[_moc|Consolidation MOC]] · [[decisions/decision-log|Consolidation decision log]]
- [[../shipments/domain-analysis|Shipments domain analysis]] — loads-hidden rule, statuses
- [[../shipments/order-change|Order Change]] — the surfaces slide 15 integrates with
- [[../shipments/decisions/decision-log|Shipments decision log]] — DEC-144…151 (identifiers)
