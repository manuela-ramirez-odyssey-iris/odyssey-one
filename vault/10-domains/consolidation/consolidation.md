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

## 7. Build delta — this deck vs what is shipped

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

## 9. Review of the shipped loop (S155, 2026-09-21) — gaps against LINX-15762/15786/15787/15896

Read against the story ACs (converted from `vault/00-inbox/LINX-*.doc`) and the deck. What is built: select (Direct-only list, one customer, ≥2) → review (stops, totals, utilization against placeholder capacity, hazmat) → confirm → ONE `C…` shipment created in both runtimes, loads/orders unioned, sources removed, orders repointed, success banner with View Shipment, post-apply preview, edit via the row menu (id kept). Verified: same-customer re-checked server-side; missing volume never blocks (15787 BR 3/4); selections retained on Modify; Cancel discards without writes (15787 Sc. 5). Not built, by story: the six validation gates and the Validation Status panel; Load IDs anywhere; the "Proposed Consolidation Cancelled" banner; audit-trail events on the sources and an actor-bearing "Consolidation Applied" event; utilization targets and UoM from the Customer Profile; a tendering window.

### Questions to take to grooming (Q-CNS)

| # | Question | Why it matters / what we assumed |
|---|---|---|
| Q-CNS-1 | **Where does the new consolidated shipment land?** LINX-15762 III.2 says the result *"shall no longer be a part of the Consolidation Pool"*; Dave (2026-09-17) says every new shipment is born in the pool / Hold / Review, never tendering. | We put it in **Monitoring › Consolidation, untendered**. If it should go to Hold, Review or straight to the tendering window, `category`/`tenderStatus` in the builder change. |
| Q-CNS-2 | **Eligibility: Dave's rule or the pool's?** Stories gate on Shipment Status = Consolidation, Allow Optimization = Yes, OCM 97–101, load not Cancelled, window not reached. Dave: Direct + untendered + one customer, exceptions irrelevant. | We use Dave's. A Direct on the **Hold** tab (Allow Optimization = No) is selectable today. Which tabs should offer candidates? |
| Q-CNS-3 | **What are the six pre-apply validations concretely?** "Equipment compatibility", "Hazmat restrictions", "OCM profile rules" — rules, not names, are needed. Does the Validation Status panel return? | We validate only same-customer, ≥2, ids exist. |
| Q-CNS-4 | **Which equipment does the consolidation get** when sources carry different equipment codes, and where do equipment capacities live? | We take the anchor's code; capacities are a placeholder table (utilization can exceed 100% silently). |
| Q-CNS-5 | **Customer Profile: utilization target and UoM.** Where are they stored; what happens at exactly-target; is the target a hard block or advice? | Unmodelled; LB/cuft assumed. |
| Q-CNS-6 | **Are Load IDs user-visible in this domain?** Every story/mock column shows Load ID; Jana's rule (Shipments) hides loads. | We show none. The builder joins loads internally. |
| Q-CNS-7 | **Who sequences the stops?** V1 proposes pickups-then-deliveries in selection order (Dave 00:33:20). Is re-sequencing on the review, via Edit Stops after creation, or optimizer-only? | No re-sequencing UI. |
| Q-CNS-8 | **Audit trail: actor and location.** 15788 lists `Consolidation Applied` by a **user** and `Load Reassigned` per source. Once the source shell is removed, where does its trail live? Is the actor the planner or `OdysseyONE`? | We write two system-authored history entries on the new shipment only. |
| Q-CNS-9 | **What happens to the emptied direct shipments?** DEC-156 says soft-delete; Dave undecided where they are viewed (deck audit shows `SH1001 → SH3001`). | Mock tombstones, live DELETEs — indistinguishable to every reader today. |
| Q-CNS-10 | **Editing a materialized consolidation.** May a planner add loads to an existing consolidation before tender (we allow, id kept)? May a load be **removed** from one (un-consolidate → returns as what)? May two consolidations be merged? | Add: yes, id reused. Remove: not supported. Merge two C…: new id minted. |
| Q-CNS-11 | **Tendering window.** What is it relative to (pickup date? customer profile?) — it is the pool's main exit criterion and we have no concept of it. | No window; a Direct stays eligible until tendered. |
| Q-CNS-12 | **Order-level effects.** Does the order's status or anything on the order change when its load moves into a consolidation? Does an open Order-Change exception on a source carry over to the new shipment? | Orders stay `Planned Shipment` and repoint to the new shipment; exceptions do not carry over (the new row is born in Monitoring). |
| Q-CNS-13 | **Is there a maximum number of shipments per consolidation** (or is capacity the only limit)? | None. |
| Q-CNS-14 | **Cancel feedback.** The deck shows a "Proposed Consolidation Cancelled Successfully!" banner after Cancel. Wanted? | Not built; Cancel returns silently to Shipments. |
| Q-CNS-15 | **"SLS Only (Oct MVP)"** on 15787 — what is SLS? | Unknown; nothing built against it. |

Closed by the stories since S148: **cross-customer** (§8.8) — every story says one customer (settled); **Consolidation ID** (§8.1) — CNS-09; **`Single` vs `Direct`** (§8.6) — 15786 says "Single Load", our LINX-11597 `Direct` (same thing, label drift only).

## Related

- [[_moc|Consolidation MOC]] · [[decisions/decision-log|Consolidation decision log]]
- [[../shipments/domain-analysis|Shipments domain analysis]] — loads-hidden rule, statuses
- [[../shipments/order-change|Order Change]] — the surfaces slide 15 integrates with
- [[../shipments/decisions/decision-log|Shipments decision log]] — DEC-144…151 (identifiers)
