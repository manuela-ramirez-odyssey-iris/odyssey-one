---
title: Order change — everything still missing after Wave B (consolidated + Direct + shipment statuses)
date: 2026-09-25
session: S160
status: draft — awaiting user approval
---

# Order change — remaining work

Every item traces to a story AC (verbatim sources: `vault-sources/10-domains/shipments/sources/linx-order-change-consolidation-ac-2026-09-08.md`, `linx-order-change-direct-ac-2026-08-29.md`) or a user ruling from 2026-09-25. **Nothing here waits on Jana:** the stories answer all of it. Jana's 2026-09-25 design review (`Consolidated Order Change Process - Design Review.vtt`) confirmed 15671/15870/15872 on the call.

Done before this plan (S160): Wave B B1–B6, the per-stop window anchor, blocked source orders selectable and refused at Save (reverses OC-open-11), moving a shipment's only order allowed, Neon reseeded once. The location-change site fix is in flight and needs a second reseed.

## Rulings this plan builds on (user, 2026-09-25)
- R1: blocked source orders are refused at **Save**, not at add (15870/15872 + Jana `@00:06:06`).
- R2: a shipment's only order may be moved (Jana `@00:05:37`).
- R3: a shipment emptied by moves is **hidden** from the Shipments list (closes OC-open-23).
- R4: a sent tender's shipment status reads **Approved** (Rovo on *Shipment Status Transition-WIP*: "APPROVED / TENDERED").
- R5: Save's Scenario A reuses the Direct *Review Order Change* screen as a sheet over Edit Stops.
- R6: a removed order's new shipment lands where the seed's existing lifecycle rule puts an untendered shipment: Consolidation if consolidatable, else Hold. Optimization itself is backend and not simulated.

## C. Consolidated order change


### C0. Evaluate → routing modal → Approve (user, 2026-09-25, DEC-207). Governs C1 and C2
The stories' "View Routing must run before Save" (15869/15872) becomes a visible step instead of a hidden `routed` flag.

**Edit Shipment Stops**
- The footer is **Cancel** plus a primary **Evaluate**. Evaluate is enabled when no stop is `P?`/`D?` and every stop has a date; when disabled, a tooltip names what's missing.
- The separate *View Routing* button is removed.
- Evaluate opens the routing modal (today's View Routing: New / Prior / Dropped Carriers) with **Keep Editing** and a primary **Approve Changes**.
- Approve Changes opens the existing confirm dialog (*Approve Shipment Change*; it stays), then runs C1.
- There is no `routed` state on the page: every Evaluate recomputes routing on the current stops.

**Stops-tab review (Screen 1)**
- **Edit Shipment Stops** plus **Evaluate**. The separate *View Routing* and *Approve Plan* buttons are removed.
- Evaluate opens the same modal with **Keep Reviewing** and a primary **Approve Plan** (confirm dialog, then C2).

**Both approve paths end in the same Scenario A/B handling** (C1). For Approve Plan this is OUR inference: 15438 only says the new list becomes V2.

The label "Approve Changes" deviates from 15671's "Save" (user ruling; the stories defer layout to the VD). The C1 rename to "Save" below is superseded by this.

### C1. Save flow (LINX-15671, OC-open-16/26), the biggest piece
- ~~Footer primary "Approve Changes" → **Save**~~. Superseded by C0: the approve action lives in the routing modal as **Approve Changes**, and the confirm dialog stays.
- On a successful save, branch on the shipment's tender status:
  - **Scenario A** (active tender: To Be Tendered / Sent / Accepted): open the Direct Current Tender Decision screen (`OrderChangeReviewRoute`) as a sheet over Edit Stops (R5). Same rules: Cancel Tender / Re-tender / Bypass, Prior cost vs New cost vs Quote, prior carrier inserted into the new list. The new list is the routing result the planner saw in View Routing.
  - **Scenario B** (no active tender): close Edit Stops and go to the **Tender tab**, with the new list as V2 above V1 (or only dropped carriers if the list is empty). Shipment status stays **Review**. No tender action is automatic.
  - **Cancel** discards the sandbox (already built).
- The new routing result is retained on both paths ("Additional Rules").
- Data: the new tender list comes from `orderChange.newTenderList`. Scenario B writes it as the shipment's current version with the prior as V1 (check what Routing History, LINX-15895, already reads for versions and reuse it).

### C2. Approve Plan (LINX-15438 note, OC-open-8)
Enable **Approve Plan** on the Stops-tab review. The new tender list becomes V2 on the Tender tab and the prior becomes V1. The exception clears the same way as Scenario B. No sandbox is involved (the planner accepts the change as the system computed it).

### C3. Removed orders get their own shipment (LINX-15869, OC-open-19)
At Save, each order left in *Orders Pending To Assign* becomes a **new single-order Direct shipment**. Its stops come from the order's own ship-from/ship-to, and its tab follows R6. It gets a new sell/buy shipment number from a non-colliding range. The move is written in the same transaction as the save (the `save-stops` path in `api/_lib/shipments.mjs`), including `orders.shipment_sell_id` and the OC-open-22 list aggregates.

### C4. Consolidated tender dates (Jana `@00:16:29`, 15671)
The tender's pickup date = the **first pickup stop's** planner-set date, and its delivery date = the **last delivery stop's**. Routing's dates are ignored for a consolidation. Verify View Routing + the tender rows show these, and fix wherever routing's dates leak through.

### C5. Emptied source hidden (R3, OC-open-23)
A shipment with `order_count = 0` is excluded from the Shipments list, search and counts. Its detail stays readable by id (nothing links to it). It's a list-query filter plus the search index projection.

## D. Direct order change (all story-answered)
- **D1 (OC-open-1, 14509):** seed a share of order-change shipments from **To Be Tendered**, not only Sent/Accepted. Zero new faker draws (id-keyed rnd), id diff empty.
- **D2 (OC-open-6, 14509 "shall be able to view Tender information while pending"):** the Tender tab stays readable during review. Remove the blur, keep every action locked.
- **D3 (OC-open-2, 14515):** the Prior/New cost choices show the **AP cost** (the same total as the AP Cost column), not the base rate.
- **D4 (OC-open-3, 14513):** pickup/delivery dates editable when routing returns none.
- **D5 (OC-open-4, 14510):** keep and show every Tender Option Version, not just prior and new. First measure what Routing History (15895) already covers, then build only the gap.

## S. Shipment statuses (R4 + Rovo, closes OC-open-20)
Derive `shipmentStatus` from the lifecycle the seed already draws, with zero new draws:
- consolidation → `Consolidation`, hold → `Hold`, sent → `Approved`, accepted → `Done`
- every exception category, **including SpotBid and Bid Review**, → `Review`
- `Cancelled` is not seeded (R3 hides emptied shipments rather than cancelling them)

This reverses the 2026-09-18 "keep blank, the tab carries it" ruling (DEC log entry owed).

Ripple, same commit set:
- the Shipment Status badge variants (`src/search/shipments/adapter.js`, `ShipmentTable.jsx`)
- the Add Orders filter's `SHIPMENT_STATUSES`
- **15872's block must read the lifecycle/category, not the label**: SpotBid and Bid Review now display as Review but still block a move
- **search vocabulary** (`src/search/shipments/progression.js` values), then `npm run progression:sheets` + update both `*-search-progression.md` docs (CLAUDE.md mandate; these go to Cognizant), then `npm run progression:audit` clean

Needs a reseed.

## Order of work
1. The location-change site fix (in flight), then reseed #2, a browser check, and **deploy on the user's go**.
2. **S** (statuses), which carries a reseed and the Cognizant sheets.
3. **C1 + C2** (the same flow), then **C3**, **C4**, **C5**.
4. **D1–D5** (D1 carries a reseed; batch it with any other seed change).

Each track: Fable/Opus spec, Sonnet implements, spec review then quality review, a browser check against live Neon via `npm run dev:api` + `dev:local`, and commits tagged `S1xx:`.

## Out of scope / open
- `Consoloidation Questions 2.vtt` (inbox, separate `/analyze`).
- `src/utils/toast.test.js` fails to load since `23c30f0` (S159 PGI/PGR), unrelated.
- For Laura: OC-open-9 and 18 (copy leftovers in her VDs).
