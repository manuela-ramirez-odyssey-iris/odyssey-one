---
title: Order Change
domain: shipments
type: canon
tags: [order-change, tender, direct-shipment, consolidation, multi-stop, compare-screen, linx-14509, linx-14515, linx-15435, linx-15872, linx-8820, linx-8284]
date: 2026-09-08
status: active
---

# Order Change

Canon for **Review Order Change**: what happens to a shipment when the customer's system updates an order that is already planned and tendered, and how the planner reviews it. Two halves with very different maturity:

- **Direct shipment** (one order, one pickup, one delivery) — seven Jira stories (LINX-14509…14515), a Figma mock by Laura, and a screen shipped in S134–S137. **Settled behaviour.**
- **Consolidation / multi-stop** — thirteen stories (LINX-15435…15438, 15667…15671, 15869…15872), Laura's VDs for the Stops-tab half, shipped in S142. The Compare Screen half awaits its VDs. **Settled behaviour for Surface A; specced-not-built for Surface B.**

Sources, read together per [[feedback_multi_source_truth]]:

| Source | Cited as | Authority |
|---|---|---|
| Jana's discussion call, 2026-08-14 (81 min) | `disc @mm:ss` | Intent for both halves; first explanation of the model |
| Jana's review of Laura's mock, 2026-08-29 (37 min) | `review @mm:ss` | Rulings on the Direct screen; the walkthrough the build was measured against |
| Deck *Order changes – Direct and Consolidation – Mock design*, 2026-08-12 | `deck sN` | Layout/field source for Direct; Consolidation slides 8–13 are LLM output (see §8) |
| Jira ACs LINX-14509…14516 + context LINX-8820/8284/8253/8252 | `LINX-nnnnn` | Primary per [[feedback_stories_are_primary_source]] |
| Jira ACs LINX-15435…15872 (consolidation, 13 stories, fetched 2026-09-08) | `LINX-nnnnn` | Primary; supersede deck slides 8–13 |
| Laura's VDs — Stops Consolidated `1910-31512`, Planning Dates `2102-10502`, View Routing `2108-14708`, per-order compare `2107-12719` | `VD nnnn` | Layout of record for Surface A; copy normalized to AC wording |
| Raw archive | `vault-sources/10-domains/shipments/{sources,screenshots/order-change}/` | |

Related canon: [[dropped-carrier]] (the dropped list rides inside the review), [[domain-analysis]] §Tender, [[decisions/decision-log]] DEC-114…DEC-127.

---

## 1. What an order change is

**Who changes the order.** Nobody in Odyssey One. The customer's own system posts an update over the integration; the Order domain applies it and messages the Shipment domain (`disc @18:41–20:19`, `review @07:36–08:00`). The planner never edits the order here — they **review the consequence** on the shipment and take an action. Jana corrected the framing explicitly: *"It is not order editing, order changes, reviewing the order change"* (`disc @01:00:51`).

**Transportation-relevant (TR) fields** — LINX-8820 (Done) defines the comparison. Any change in any of these marks the update TR = Yes and captures field / old / new for audit:

| Level | Fields |
|---|---|
| Shipment — Origin / Destination | Country, Postal Code, City, State, Site |
| Shipment — Schedule | Direction, Type (SSD pickup / RDD delivery), Date & Time |
| Shipment — Service | Service Type (LTL…), Carrier SCAC |
| Shipment — Attribute | Hazardous indicator |
| Line | Weight + unit, Volume + unit, Class, Packages, Item; add line / delete line |
| Charges | cost or currency change on an existing charge code; charge added / removed |

Non-TR but essential: Order #, System ID, Dropped Carrier flag, Line Sequence (cannot change).

## 2. What the system does before a human sees it (LINX-8284)

1. Not TR → apply, update loads, no state change, done.
2. TR and an open SpotBid / BidReview → close the bid, then apply.
3. **Consolidation (more than one load)** → flag for **User Review**, do not change state, stop. (Nothing else is specified — this is the whole backend contract for §8.)
4. **Direct (one load)** → call routing (QCP). Do **not** destroy existing Tender Sent / Accepted information. Do not change state.
5. Tender Sent or Accepted exists → shipment state **Review**, run auto-tender checks.
6. No tender → **Consolidation** if optimization allowed, else **Hold**.

**When the review screen appears — a recorded tension.**

| Source | Trigger statuses |
|---|---|
| LINX-8284 step 5, Jana `disc @13:46` (*"it's only when it has been sent or accepted you will have this question… if the tender has not been sent… you just apply the order changes and leave it"*), Jana `disc @01:36` | **Sent, Accepted** |
| LINX-14509 (Approved, Refinement_done) | **To Be Tendered, Sent, Accepted** |

The AC is later and approved, so it outranks the call — but the seed only puts Sent/Accepted shipments into review (`generate.mjs buildOrderChange`, "this function is only reached for a shipment holding Accepted or Sent"). **Open:** ask Jana whether To Be Tendered genuinely enters the review (what would "keep carrier" mean when no carrier holds the tender?). Logged as OC-open-1.

## 3. Entry and lock (LINX-14509)

- The shipment lands under **Shipment Exception → category Order Change** (`disc @01:36`, `review @06:53`).
- The **Tender tab** shows a **Review Order Change** button while review is pending.
- Routing and rating re-run on the latest order data and produce a **new Tender Option Version** (§7).
- **Tender-related actions are unavailable until review completes.** Jana's companion ruling via the designer (S137): the lock covers *every* tendering action — the routing table and Process SCAC — not just the button's entry point. Dropped Carrier collapses and locks too.
- The AC also says *"the user shall be able to view Tender information while the shipment is pending"*. S137 blurs + `inert`s the tender table and deleted the View Tender modal; the review screen's own Prior/New lists are now the only tender view. **Tension recorded** (build-delta row 4) — the lists inside the review arguably satisfy it, but the Tender tab itself no longer does.
- Multiple TR updates can arrive over a shipment's life; each triggers a fresh review and a fresh version.

## 4. The Direct review screen (LINX-14515)

Jana's frame: *"three boxes. One is a decision the user will be taking, there is a cost-related element, and there is a tender-related element"* (`review @09:27`). The AC orders them: **Actions (top) → Tender comparison → Order comparison**, and the user must be able to see everything before choosing a disposition.

**The decision is about ONE carrier — the tendered one.** *"The tenders are listed here, but the decision is about the prior carrier"* (`review @09:27`); *"This whole decision is about this carrier, the tendered carrier"* (`review @28:06`). There is always exactly one Sent/Accepted carrier in the prior list (`disc @11:49–13:08`), so the Actions card is single-carrier by design, not rank-1.

**Prior / New carrier panels** show, for that carrier only (LINX-14511 field table, `deck s3`): SCAC, Equipment, Route Rank, Rank, Tender Status, Pickup Date, Delivery Date. Deck and Jana put Pickup before Delivery; the AC's table is a field list, not an ordering rule (S135 ruling).

**When the prior carrier is NOT in the new routing list** (`review @09:27–13:00`):
- Route Rank is **blank** (routing did not return it).
- Rank is **computed**: the carrier is inserted at the **bottom of its equipment group** (*"the LTH will go within that equipment at the bottom"*, `review @11:42`). Same insertion logic as [[dropped-carrier]] Process SCAC (LINX-14513 note 1).
- Tender Status is **pending the user's choice**.
- Why a carrier disappears: routing's decision, typically a date change the carrier does not serve (`review @20:53`).

**Dates.** If routing returned no pickup/delivery date, the user is **forced to enter them** before proceeding (`disc @07:xx` "it has to force the user to select a pickup date and the delivery date"; LINX-14513 "displayed as editable fields"). **Not built** (build-delta row 10).

**"Button" / "Display" tags on the deck** are Jana's name-tags for what is an action versus a value, not UI (`review @28:33`).

**Laura's Figma mock** (1703-156564) is the layout of record; Jana asked to keep it because *"if you change the design, the logic also changes"* (`review @36:37`). Per [[feedback_jana_does_not_decide_ui]] that is a plea for logical fidelity, not a widget ruling; S135/S137 changed presentation (purple diff signal, header-row segments, no View Tender) and kept the logic.

## 5. Cost selection (LINX-14513)

Three radios: **Prior Cost · New Cost · New Quote.** They are *configuration* for the keep-carrier actions, not actions themselves.

| Scenario | Condition | Options | Auto-selected | Source |
|---|---|---|---|---|
| 1 — carrier returned | prior carrier in new list, rated | Prior / New / New Quote | **New Cost** | `review @18:43` "automatically it selects the new cost" |
| 2 — carrier not returned | prior carrier absent; has a prior rated or quoted cost | Prior / New Quote; **New Cost greyed** | **Prior Cost** | `review @13:xx` "it's automatically pointing here and saying 1901.56… and greys out" |

Effects:
- **Prior Cost** → carrier retained/inserted with the prior AP cost overwriting the new list's AP cost. **If the prior cost was a quote, the entire quote is copied onto the new tender list** and the row reads as quoted (`review @28:44–30:38`, AC note).
- **New Cost** → latest rated cost used.
- **New Quote** → opens the quote entry (same modal as the Tender tab, [[decisions/decision-log#DEC-103]]); overrides AP cost; validated with existing quote rules.
- Prior/New cost values are **not editable**; New Quote is the only editable path (`review @14:11`).

Why a planner keeps the old cost when routing says it rose: *"one pallet increase on a truckload… you don't want to give a new cost to the carrier… you are saving for the customer"* (`review @23:12–24:03`). Odyssey absorbs the difference deliberately.

**Open (S137, for Jana):** the card labels read "Prior Cost / New Cost" with no unit, above a column labelled "AP Cost" holding a larger number (base rate vs total). OC-open-2.

## 6. Tender resolution actions (LINX-14514)

| Action | Carrier | Message to carrier | New tender status |
|---|---|---|---|
| **Cancel Tender** | released — *"I don't want to go with this carrier"* (`review @28:02`) | cancel sent | shipment → **Review**; user lands on the **Tender screen** to choose the next option (`review @27:31`, AC). The other carriers are *not* selectable from the review page. |
| **Keep Carrier & Re-Tender** | retained with selected cost | **yes** — "there has been an order change, take note" | **Sent** (from Sent *or* Accepted — an accepted carrier must re-accept) |
| **Keep Carrier & Bypass Tender** | retained with selected cost | **none** — *"the pallet weight went from 1000 to 1010… not a big deal to the carrier"* (`review @25:37`) | **retained** (Sent stays Sent, Accepted stays Accepted) |

On completion the exception clears, tender restrictions lift, processing continues with the chosen carrier/cost/status.

Confirmation dialogs on all three are **ours** (S135) — the ACs define actions, not dialogs; copy states each action's AC consequence.

## 7. Tender comparison and versions (LINX-14511, LINX-14510)

- **New list above Prior list**; both **collapsed on landing** (`review @31:14` "it will be collapsed").
- Each list is a full carrier list for that version, same columns as the Tender tab (`deck s3` images: Route Rank, Rank, SCAC, Carrier Name, Equipment, AP Cost, Tender Status, Pickup, Delivery). Typical size 10–20 rows, *"100, I don't think so"* (`disc @13:23`).
- **Dropped carriers ride inside the review** for the new version — Jana added this late: *"I have asked Laura to include the drop carrier as well… maybe I did not have it initially as part of the request"* (`review @31:14`). A prior carrier that was not returned is, by construction, in the new version's dropped list.
- **Prior = the last version the user reviewed/approved, or on which the tender went To Be Tendered/Sent/Accepted.** Intermediate never-reviewed versions are skipped: Change #1 approved, #2 and #3 arrive → compare #1 vs #3. Jana's shorthand: *"the recent prior… there could be only one sent"* (`disc @11:49`).
- **Versions are retained** with their own dropped-carrier list; the Tender tab shows latest on top, previous below. **Not built** — the prototype keeps one prior/new pair (build-delta row 11). User-observed consequence (S135): while review is pending the Tender tab shows the *original* version's dropped list while the review shows the new one.
- The deck's **View Tender** button (jump to the full tender page) was **deleted in S137** by the user; the review's own lists plus the exception-tab origin cover it.

## 8. Order comparison view (LINX-14512)

Informational, **no action** (`review @34:33`). Prior and New side by side; **changed fields highlighted and listed first**, unchanged below, `--` when a value is missing, standard shipment date format.

Field list (AC; `deck s5` is the same table with a third column *Source*):

| Routing | Order | Shipment |
|---|---|---|
| Delivery Date, Pickup Date/Time, Distance, Distance Source, Network Leverage | Incoterm, Order Requested Date (SSD/RDD), Bill To, Seed Equipment, Ship Direction, Ship From, Ship To, and every hazmat field | Package Count, Volume, Gross Weight |

Delivery/Pickup Appointment come from Order **or** Shipment. Hazmat per line: Boiling Point, Flash Point (= Boiling Point per deck), Hazmat Class, Code, Description, Pkg Group (tracks Class), Item/Description, Marine Pollutant (checkbox), Shipping Class, Tunnel Code, WGK Class — *"if multiple lines exist, list by line / sequence #"*. LINX-14516's Given/When/Then repeats this view's rule but its body is Auto-Tender error handling; it belongs to another epic and is not part of this scope.

The legacy TMS **Compare** screen (`deck s4` image8: Compare Item | Prior Detail/Value | New Detail/Value, with hazmat rows) is the ancestor of this view.

## 9. Adjacent ruling captured on the way — Buy Shipment details

`deck s2` (*Buy Shipment View*) and `disc @01:04:01–01:09:49`: the shipment details view should expose the **cost breakdown** (Base, FSC, Accessorials, AP Total, AR Total, Margin, Direct Cost) and Stops/UDF/Customer Reference Values. The designer objected to duplicating the Cost tab; Jana accepted a **"view more" that routes to the existing details** — *"I'm not asking you to display it all the time. This is summary"* (`disc @01:09:19`). Same rule for Stops (*"picked up from this location to this location… click and it takes them"*).

## 10. Consolidation / multi-stop (LINX-15435…15872)

**Status: 13 stories, three passes, all `VD_Pending`; LINX-15435/15436 On Hold `optmizer_pending`.** Fetched verbatim 2026-09-08 → `vault-sources/10-domains/shipments/sources/linx-order-change-consolidation-ac-2026-09-08.md`. They supersede the deck-derived sketch this section used to hold (slides 8–13 remain LLM output — see the provenance warning in the S134 canon, now archived in git history) and close OC-open-5. Laura's VDs: Stops Consolidated `1910-31512`, Planning Dates `2102-10502`, View Routing `2108-14708`, per-order compare `2107-12719`; the Compare Screen VDs are still owed.

**Trigger.** Any TR change on any order of a multi-order shipment flags the whole shipment for user review (LINX-8284 step 3; `disc @16:xx`). LINX-14509's Direct flow "applies only to Direct Shipments" — so a consolidated shipment never enters the Direct review route ([[decisions/decision-log#DEC-132]]).

**Two surfaces, not one.** The deck blurred them; the stories separate them cleanly.

### 10.1 Surface A — the Stops tab *is* the review (LINX-15435–15438)

Read-only. The Stops tab is selected by default when the shipment is opened from the Order Change exception (15435).

| Element | Rule | Source |
|---|---|---|
| Header strip | Distance · Gross Weight · Volume show **Prior and New only when changed**, else the current value; then Accepted Carrier, Seed Equipment, Utilization | 15435 |
| Costs | **Prior Cost** (current tender cost once tendering started; preferred-carrier AP before; blank when exhausted) · **New Direct Cost** (Σ per-order direct costs from routing) · **New Consolidated Cost** (preferred-carrier AP from routing — **only when no location changed**) | 15435, 15438 |
| Planning dates | per order: Planning Type (RDD/SSD), Earliest/Latest Ship, Earliest/Latest Delivery — surfaced as the *View Planning Dates* modal | 15435, VD 2102-10502 |
| Highlighting | 14 stop-level fields (Site ID, Address 1–3, City, State/Province, Zip, Country, Date, Appointment, Orders, Weight, Volume, Package Count); each stop says which of its orders changed; changed orders distinguished from unchanged | 15436 |
| Per-order compare | click a changed order → prior/new side-by-side, changed first = the LINX-14512 view (§8) for that order | 15437, VD 2107-12719 |
| Auto-routing | non-location changes (weight, volume, package count, pickup/delivery date, appointment) re-route automatically; routing returns updated options + consolidated cost | 15438 |
| View Routing | Prior Tender, New Tender (New above Prior, §7), **Dropped Carriers**, the three costs. **Disabled while a site/location change is unfinalized** | 15438, VD 2108-14708 |
| Actions | **Edit Shipment Stops** (→ Surface B) · **View Routing** · **Approve Plan** (new list becomes V2 on the Tender tab; V1 = prior) | 15435, 15438 note |

### 10.2 Surface B — the Compare Screen sandbox (LINX-15667–15671, 15869–15872)

Opened by *Edit Shipment Stops*. **Nothing touches the database until Save** (15667 note: "Entire screen is like Sandbox"). Three sections: **Stops · Orders · Search & Add Orders.**

- **Automatic stop creation (15668).** On a location change the system matches Location ID + address against existing stops of the same type; reuse if matched, else create a stop labelled **`P?` / `D?`** appended at the end of its type group. The order leaves its previous stop; empty stops are removed. **Finalization cannot happen with a `P?`/`D?` left** — placing it is what numbers it.
- **Reposition + validate (15669).** Every order's pickup precedes its delivery; all pickups on a multi-order delivery stop precede that delivery. Per stop **Planned Date / Time / Time Zone** are editable (TZ defaults from the address) and all three are required before routing. Order date-window violations are **highlighted, informational only**.
- **Remove orders (15869).** Removed orders drop into Search & Add and can come back; stops renumber without gaps. **The last order can never be removed** — button disabled with tooltip *"The last remaining order cannot be removed from the shipment."*
- **Search & add (15870, 15871).** Search is locked to the current shipment's customer, excludes its own orders, max **five** selected per action, 11-column grid sorted by Buy Shipment. *Add* attaches the order to a matching stop or creates `P?`/`D?`; the source shipment is untouched until Save.
- **The gate (stated in 15669, 15670, 15869, 15871, 15872).** Routing is enabled only when no `P?`/`D?` remains and every stop has Date/Time/TZ; **Save is disabled until routing succeeds; any subsequent edit invalidates routing and re-disables Save.**
- **Save (15671 + 15872).** External orders are revalidated (source status Approved/Done/SpotBid/Bid Review, or an active tender/bid, blocks the move); the move is all-or-nothing; then: **Scenario A** — an active tender (To Be Tendered/Sent/Accepted) → the **Current Tender Decision** = the Direct §6 actions verbatim; **Scenario B** — no active tender → close, land on the Tender tab, new list as V2 above V1, status stays Review, no auto-tender.

**Naming.** 15669 calls the sandbox button *Call Routing*; 15670/15869/15871 and the VD say *View Routing*. Name follows purpose ([[decisions/decision-log#DEC-135]]): the Stops tab **views** results that already exist; the sandbox **calls** routing on a structure nothing has routed yet.

**Feasibility escalation (2026-08-14)** — still on record; the ACs do not mandate drag-and-drop ("reposition"/"move"), which is the designer's leverage.

### 10.3 Shipped (S142, 2026-09-08) — Surface A

Seed: 131 of the 218 order-change shipments are multi-order and now carry `orderChange.consolidation` (id-stable, zero faker draws). Entry: the row action and the Tender-tab button branch on `shipmentType` — Consolidation opens the bottom bar on the Stops tab, Direct keeps its route. Stops tab review mode: KPI prior/new pairs, cost row, purple change badges (the Direct review's `DiffValue`, with the VD's warning triangle), Affected Orders column, rail status `issue` on changed stops; Planning Dates modal; View Routing modal (New / Prior / Dropped Carriers, symmetric cost badges); per-order compare modal reusing the §8 section uncarded. **Rendered but disabled:** Edit Shipment Stops (Surface B not built) and Approve Plan (OC-open-8).

## 11. Build-delta — shipped (S134–S137) vs sources

| # | Shipped state | Ruling / source | Verdict |
|---|---|---|---|
| 1 | Entry via exception tab + Tender-tab "Review Order Change" button | LINX-14509, `review @06:53` | **Confirmed** |
| 2 | All tendering actions locked (table + Process SCAC blurred, inert), Dropped Carrier locked | LINX-14509 + Jana via designer S137 | **Confirmed** |
| 3 | Seed enters review only from Sent/Accepted | LINX-14509 adds To Be Tendered; Jana said Sent/Accepted only | **Tension → OC-open-1** |
| 4 | View Tender modal deleted; Tender tab table blurred while pending | LINX-14509 "user shall be able to view Tender information while pending" | **Tension** — review lists cover it; Tender tab no longer does |
| 5 | Actions card = the single tendered carrier | `review @09:27`, `@28:06` | **Confirmed** |
| 6 | Not-returned: blank route rank, rank = bottom of equipment group, New Cost greyed, Prior auto-selected; returned: New auto-selected | LINX-14513, `review @11:42`, `@18:43` | **Confirmed** |
| 7 | Quote copied to new list when Prior Cost was quoted; QuoteModal cancel reverts radio | `review @28:44`, AC note | **Confirmed** |
| 8 | Re-Tender → Sent; Bypass retains; Cancel → Tender Review with Tender screen open | LINX-14514, `review @25:03–27:59` | **Confirmed** |
| 9 | Confirm dialogs on all three actions | not in any source | **Ours** — no objection recorded |
| 10 | Pickup/Delivery dates read-only when routing returns none | LINX-14513 "editable fields", `disc @07` "force the user" | **Gap — AC requires** |
| 11 | One prior/new pair; no version history; Tender tab dropped list is original version's | LINX-14510 | **Gap — AC requires** |
| 12 | New above Prior, collapsed on landing, dropped-carrier badge + modal on the New list | LINX-14511, `review @31:14` | **Confirmed** |
| 13 | Comparison: 18 shipment fields + 11 hazmat, changed-first as segment split, display-only | LINX-14512 (28 rows) | **Confirmed**; field-by-field parity unverified (Distance Source, Network Leverage, Order Requested Date) |
| 14 | Hazmat merged into Tender Details, always lands in Unchanged (seed identical) | LINX-14512 per-line highlight | **Seed gap** — highlight path unreachable |
| 15 | Purple as the only diff signal; header-row segment labels | Figma 1703-156564 shows red + band rows | **Designer's call**; Figma stale, not a Jana ruling |
| 16 | "Prior Cost / New Cost" unlabelled base rate above an "AP Cost" total column | S137 measurement | **Open → OC-open-2** |
| 17 | Consolidation: nothing | no stories; deck intent only | **Not started, correctly** |
| 18 | Buy Shipment details "view more" to Cost tab | `disc @01:07:26` | **Unverified in build** |

## 12. Open / TBD

- **OC-open-1** — Does *To Be Tendered* enter the review (LINX-14509) or only Sent/Accepted (Jana, LINX-8284)? Blocks nothing today; would change seed + lock gating.
- **OC-open-2** — Unit/label mismatch on the cost radios vs the AP Cost column (S137). Ask Jana whether the radios should show totals.
- **OC-open-3** — Editable pickup/delivery dates when routing returns none (row 10). AC-required, unbuilt.
- **OC-open-4** — Tender Option Version history (row 11). AC-required, unbuilt.
- **OC-open-5** — CLOSED 2026-09-08: the 13 consolidation stories exist (§10). VDs for Surface A delivered; Surface B VDs still owed.
- **OC-open-6** — Is the Tender tab supposed to stay *readable* while locked (row 4)?
- **OC-open-7** — Figma 1703-156564 out of sync with shipped purple/segment presentation and with S137's lock overlay.
- **OC-open-8** — What happens after **Approve Plan** on the Stops tab when a Sent/Accepted tender exists? 15671 Scenario A routes the sandbox's *Save* to the Current Tender Decision; nothing says whether Approve Plan does the same or approves silently. Waiting on Laura's post-approval VD; the button ships disabled.
- **OC-open-9** — Per-order compare modal title: VD 2107-12719 reads "Planning Dates" (copy leftover from the sibling modal); shipped as **"Order Changes"** pending Laura.
- **OC-open-10** — 15435/15436 are On Hold `optmizer_pending`: the two foundation stories are gated on the Optimizer. Surface A is built on them regardless; confirm with Ramesh/Jana that the hold is scheduling, not scope.
- **OC-open-11** — 15870 lets the planner *search* orders whose shipment is Approved/Done/SpotBid/Bid Review; 15872 *blocks the move* at Save. Validate-late by design, but the planner does all the work before being refused — recommend surfacing ineligibility in the grid. Also contradicts the deck's "cannot add an order whose shipment is Tender Sent or Accepted".
