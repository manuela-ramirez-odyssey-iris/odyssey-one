---
title: Order change — everything still missing after Wave B (consolidated + Direct + shipment statuses)
date: 2026-09-25
session: S160
status: in progress — C0–C12, C19, C21, C22, D1, D3, S built (C12 = DEC-215 recompute); reseed + deploy owed; C6–C23 added by the S163 audit (2026-09-29)
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


### C0. Evaluate → routing modal → Approve (user, 2026-09-25, DEC-207). Governs C1 and C2 — **BUILT S160**
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

### C1. Save flow (LINX-15671, OC-open-16/26), the biggest piece — **BUILT S160; Scenario B re-filing fixed S162 (DEC-211), not deployed**
- ~~Footer primary "Approve Changes" → **Save**~~. Superseded by C0: the approve action lives in the routing modal as **Approve Changes**, and the confirm dialog stays.
- On a successful save, branch on the shipment's tender status:
  - **Scenario A** (active tender: To Be Tendered / Sent / Accepted): open the Direct Current Tender Decision screen (`OrderChangeReviewRoute`) as a sheet over Edit Stops (R5). Same rules: Cancel Tender / Re-tender / Bypass, Prior cost vs New cost vs Quote, prior carrier inserted into the new list. The new list is the routing result the planner saw in View Routing.
  - **Scenario B** (no active tender): close Edit Stops and go to the **Tender tab**, with the new list as V2 above V1 (or only dropped carriers if the list is empty). Shipment status stays **Review**. No tender action is automatic.
  - **Cancel** discards the sandbox (already built).
- The new routing result is retained on both paths ("Additional Rules").
- Data: the new tender list comes from `orderChange.newTenderList`. Scenario B writes it as the shipment's current version with the prior as V1 (check what Routing History, LINX-15895, already reads for versions and reuse it).

### C2. Approve Plan (LINX-15438 note, OC-open-8) — **BUILT S160; DEC-211 fix S162, not deployed**
Enable **Approve Plan** on the Stops-tab review. The new tender list becomes V2 on the Tender tab and the prior becomes V1. The exception clears the same way as Scenario B. No sandbox is involved (the planner accepts the change as the system computed it).

### C3. Removed orders get their own shipment (LINX-15869, OC-open-19) — **BUILT S163** (was: data loss) (S163 audit: `api/_lib/shipments.mjs:708` drops pending orders from `orderList`/`orders`, `orders.shipment_sell_id` still points here, and Search & Add can't find them — `candidateOrders.mjs:42` walks `s.orders` only)
At Save, each order left in *Orders Pending To Assign* becomes a **new single-order Direct shipment**. Its stops come from the order's own ship-from/ship-to, and its tab follows R6. It gets a new sell/buy shipment number from a non-colliding range. The move is written in the same transaction as the save (the `save-stops` path in `api/_lib/shipments.mjs`), including `orders.shipment_sell_id` and the OC-open-22 list aggregates.

### C4. Consolidated tender dates (Jana `@00:16:29`, 15671) — **BUILT S163** (consistency slice) (`adoptNewTenderList` `:577-613` keeps the seeded dates)
The tender's pickup date = the **first pickup stop's** planner-set date, and its delivery date = the **last delivery stop's**. Routing's dates are ignored for a consolidation. Verify View Routing + the tender rows show these, and fix wherever routing's dates leak through.
- The same dates fill a **prior carrier inserted into the new list** in Scenario A, which routing returns without dates (Jana 09-25 `@00:15:03–00:16:29`). So D4's "dates editable when routing returns none" does not apply to a consolidation: the stops supply them.

### C5. Emptied source hidden (R3, OC-open-23) — **BUILT S163** (consistency slice)
A shipment with `order_count = 0` is excluded from the Shipments list, search and counts. Its detail stays readable by id (nothing links to it). It's a list-query filter plus the search index projection.

## C+. Added by the S163 audit (2026-09-29)

Four read-only audits: every AC clause of LINX-15435…15438, 15667…15671 and 15869…15872, checked against code (not comments), plus Jana's 08-14, 08-29, 09-24 and 09-25 transcripts and the 09-23 call (still in the inbox) against the canon. Order-change tests were green (849/849) and cover none of these. Paths are under `apps/odyssey-one/`. SB = `src/components/detail/order-change/stopsSandbox.js`; API = `api/_lib/shipments.mjs`.

### Save slice: correctness and data loss (do with C3, one spec) — **BUILT S163** (C3, C6–C9, C21 + N2's detail.shipmentType; spec `docs/superpowers/specs/2026-09-29-order-change-save-slice.md`; not deployed)
- **C6. The move block reads a stale tender status (15872).** `saveTender` (API `:829`) writes only the `tenders` table. Nothing ever updates `shipments.tender_status`, which `pullExternalOrders` (`:451`) checks. An order on a shipment tendered after the reseed passes revalidation and is moved. Fix: every tender action keeps `shipments.tender_status` current, or the check reads the `tenders` rows. The spec picks one. The same stale column feeds Scenario A/B: the client sends the seeded `orderChange.prior.tenderStatus` (`OrderChangeEditStopsRoute.jsx:72`).
- **C7. A delivery-before-pickup stop order can reach routing (15669 §2, 15869).** `isRoutable` (SB `:317`) never calls `validSequence`, and neither `addToStop` nor placement validates. Reproduced: P1(O1) D1(O1) P2(O2) D2(O2), then add O3 picking up at P2's site and delivering at D1's. Also:
  - `validSequence` (SB `:148`) checks that *a* pickup comes first, not *every* pickup (15669's multi-order delivery-stop rule).
  - A `P?` is always appended after the last pickup, never "just before its own delivery" (15668 §2). On an interleaved shipment the arrows then lock, and only drag can fix it.
- **C8. The server trusts the client's `externalOrders` (15872).** The source loses every listed order, but the target gains only those on stops (API `:709` vs `:736-738`). A bad body orphans orders. Guard: 400 unless the two sets match.
- **C9. Created stops lose data at Save (15872 "saved with the user's date/time/time zone").** `toDto` (SB `:384-396`) omits lat/lng/timeZone, and `mergeStops` (API `:359-361`) builds from an empty base (`appointmentTime` null). After Save, the adjacent legs and the total read `--`.

### Consistency (batch with the next reseed) — **BUILT S163** with C4, C5, C12 (spec `docs/superpowers/specs/2026-09-29-order-change-consistency-slice.md`); **reseed + deploy owed**
- **C10. Header Weight/Volume contradict the stop cards on 74 of 74 consolidated shipments (DEC-192).** The stop cards take the DB value as Prior and DB + delta as New (`tools/generate.mjs:3136`); the header takes the DB value as New (`:3323`). Example: 25008677's header shows 30,165 → 34,528 LB, while its stop badge shows 38,891 LB. The per-order compare agrees with the stops. Pick one convention in the seed.
- **C11. Save leaves the header stale (DEC-192):**
  - `detail.totalVolumeValue` is never rewritten (API `:535-558`).
  - `summaryChanges` and `costs` stay seeded, so the header's Prior/New pairs are pre-edit.
  - New Consolidated Cost turns to `--` once `locationChange` resets, with no reason given.
  - A one-order C flips to Direct on the row (`computeListAggregates` `:424`) but not in `detail.shipmentType`. Depends on ruling N2.
- **C19. The rest of OC-open-22:** after a move, the source row's origin/destination, pickup/delivery date columns and volume stay stale. Weight, loads, PO/pickup numbers, type and count already update.

### AC-required, not built
- **C12. Re-route on the edited stops (15669 §6–7, 15671 "new routing result retained", Jana 09-25 `@00:18:42`).** The modal and Scenario B both use the seeded `newTenderList` (`ViewRoutingModal.jsx:42-44`). **Needs ruling N1** on what re-routing means in the prototype.
- **C13. 15436: 8 of 14 stop fields are never highlighted.** Built: Location, Date, Weight, Volume, Package Count, Orders (`StopsTab.jsx:129-137`). Not built: Address 1–3, State, Zip, Country, Appointment, and Site ID/City on their own. On a location change, Address still shows the old `address1` next to the new Location badge. The seed also never draws an appointment change (15438 BR2).
- **C14 — ON HOLD (needs design; user 2026-09-29). 15438 BR5: the three costs are missing from the View Routing modal.** They sit only in the Stops-tab head behind it. The header prints `1,234.00 USD` and the modal `$1,234.00 USD`; use one format.
- **C15. 15870 search gaps (`api/_lib/candidateOrders.mjs`):**
  - Tender Status options (`:17`) lack To Be Tendered and blank.
  - Origin/Destination match "City, ST Country" only (`:26,67-68`), not Site ID or ZIP.
  - The Customer filter shows the name without the ID.
  - The Tender Status column is the planner's only warning before Save refuses a busy order (DEC-201; Jana 08-14 `@00:54:12`).
- **C16. 15669 §5 / BR-4:** Evaluate checks only that a date string exists (SB `:317-326`), not time and zone separately. See DEC-214.
- **C17. 15667 §3:** the stop row doesn't show the street address (`s.address` goes only into `toDto`).
- **C18 — ON HOLD (needs design; user 2026-09-29). 15871/15872 audit and move logs**, plus Jana 09-23 `@00:20:42` ("order history… knows that it then got moved to a different shipment"). Nothing writes them. The order audit trail exists (`src/components/orders/audit-trail/`). Scope after the 09-23 `/analyze`.
- **C20. 15435 BR1 doorway:**
  - A plain row click on an Order Change row opens the Orders tab, not Stops (`BottomBar.jsx:209`).
  - The row menu picks the review by `orderCount > 1`, the Tender tab by `orderChange.consolidation`. A save that changes the count can split them.

- **C24. An adopted list doesn't carry its dropped carriers (S163, found building C22).** Scenario B / approve-plan adopt `newTenderList` into `tenders`, but `orderChange.droppedCarriers.new` never reaches `detail.droppedCarrierList`, so after an adoption (visibly after an EMPTY one) the Tender tab shows the old dropped list. The shapes differ: the order-change rows lack `rpcId`, `startDate`/`stopDate`, `routeGroup`, and use `equipment` for `equipmentCode`. Map them, or seed the order-change rows in the full shape.

### Parity and cosmetics
- **C21. Mock-mode Save is a no-op.** `resolveOrderChange` returns early outside live (`shipmentService.ts`): no revalidation, no move, no re-filing, yet it navigates to Tender Review. Needs ruling N6.
- **C22. Seed reachability:**
  - Scenario B exists on only 5 of 74.
  - No new list is ever empty, so Scenario B's "dropped carriers only" branch (Jana 09-25 `@00:21:39`) has never run.
  - A line-level change is seeded on 11 of 116 changed orders.
  - No appointment change is seeded (C13).
- **C23. Copy:**
  - The Approve Plan confirm says "will be approved" (`StopsTab.jsx:17`), but the status becomes Review (DEC-211).
  - "Incoterm" in the consolidated compare vs "Incoterm Info" in the Direct review.
  - "Order Number" vs 15870's "Order #".
  - The New panel's edit-mode **Save** (it only leaves edit mode) shares a name with 15671's Save.
  - A DST stamp displays as the standard zone, so re-picking it shifts the time by an hour (`EditStopsView.jsx:52,77`).
- **Canon drift (vault):** `order-change.md` §10c R2 and OC-open-16 still say "rename to Save owed" (superseded by DEC-207; see DEC-200's amendment), and §10.3 still describes DEC-137's arrows-only reorder. Sync them with DEC-212…214.

### Rulings (user, 2026-09-29): N1 → DEC-215, N2 → DEC-216, N3 → DEC-217, N6 → DEC-218. N4 provisionally dropped (no story); N5 closed (marks kept). Save slice spec: `docs/superpowers/specs/2026-09-29-order-change-save-slice.md`
What was asked:
- **N1. Re-routing in the prototype (C12).** There is no routing engine. Options: (a) regenerate the new list's costs and dates from the edited stops (distance via `legMiles`, dates via C4); (b) keep the seeded list, and label it as unchanged by the edits; (c) leave it as is.
- **N2. A C left with one order by an order-change Save.** Your 09-23 ruling: no single-load C, it is hidden and the load gets a new O. Today the row flips to Direct in place. Does the 09-23 ruling apply here too?
- **N3. A load taken out of a C gets a new carrier list** (Jana 09-23 `@00:43:38`: "a new list is generated [under] prevailing conditions"). This extends DEC-205, which only files the new shipment under Consolidation or Hold.
- **N4. The capacity-overage validation** (Jana 08-14 `@00:59:09`: "[exceeds] capacity by 2000 pounds") is in no story. Drop it on the record, or build it?
- **N5. A list of the planner's edits before finalizing** (Jana 08-14 `@00:56`, pre-story, partly UI imagining). DEC-136's amber planner-change marks were its answer. Check whether the S162 redesign (DEC-212) kept them.
- **N6. Mock mode:** keep Save working in mock (C21), or declare order change live-only?

N2, N3 and C18 overlap the 2026-09-23 call. `/analyze` it first (it waits on your Figma linkage UX), or rule them here.

## D. Direct order change (all story-answered)
- **D1 (OC-open-1, 14509):** seed a share of order-change shipments from **To Be Tendered**, not only Sent/Accepted. Zero new faker draws (id-keyed rnd), id diff empty. **Built S162 (DEC-209).**
- **D2 (OC-open-6, 14509 "shall be able to view Tender information while pending"):** the Tender tab stays readable during review. Remove the blur, keep every action locked.
- **D3 (OC-open-2, 14515):** the Prior/New cost choices show the **AP cost** (the same total as the AP Cost column), not the base rate. **Built S162 (DEC-208)**, together with the API write (`totalCostAmount` + the list row's AP Freight Cost). Reseed owed.
- **D4 (OC-open-3, 14513):** pickup/delivery dates editable when routing returns none.
- **D5 (OC-open-4, 14510):** keep and show every Tender Option Version, not just prior and new. First measure what Routing History (15895) already covers, then build only the gap.

## S. Shipment statuses (R4 + Rovo, closes OC-open-20) — BUILT S162, reseed owed
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

**Revised after the S163 audit (2026-09-29).** Steps 1–2 are done; D1, D3 and S are built. DEC-211 and the S162 Edit Stops work are committed but not deployed.
1. **Save slice:** C3 + C6 + C7 + C8 + C9, one spec. This is the data-loss and correctness set.
2. **Consistency + reseed:** C10 + C11 + C19 + C22, together with C4 and C5.
3. **Rulings N1–N6**, then C12 (depends on N1).
4. **AC gaps:** C13, C15, C16, C17, C20. (C14 and C18 are on hold until they're designed.)
5. **C21 / C23** and the canon sync.
6. The Direct items still owed: D2, D4, D5. The S163 audit did not re-check the Direct half.
7. Deploy on the user's go, after step 1 at the earliest.

Each track: Fable/Opus spec, Sonnet implements, spec review then quality review, a browser check against live Neon via `npm run dev:api` + `dev:local`, and commits tagged `S1xx:`.

## Out of scope / open
- `Consoloidation Questions 2.vtt` (inbox, separate `/analyze`).
- `src/utils/toast.test.js` fails to load since `23c30f0` (S159 PGI/PGR), unrelated.
- For Laura: OC-open-9 and 18 (copy leftovers in her VDs).
