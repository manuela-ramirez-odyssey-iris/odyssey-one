---
title: Order Change
domain: shipments
type: canon
tags: [order-change, tender, direct-shipment, consolidation, multi-stop, linx-14509, linx-14515, linx-8820, linx-8284]
date: 2026-09-02
status: active
---

# Order Change

Canon for **Review Order Change**: what happens to a shipment when the customer's system updates an order that is already planned and tendered, and how the planner reviews it. Two halves with very different maturity:

- **Direct shipment** (one order, one pickup, one delivery) — seven Jira stories (LINX-14509…14515), a Figma mock by Laura, and a screen shipped in S134–S137. **Settled behaviour.**
- **Consolidation / multi-stop** — no stories. Jana's deck carries the intent, and the second half of that deck is pasted LLM output. **Design intent only.**

Sources, read together per [[feedback_multi_source_truth]]:

| Source | Cited as | Authority |
|---|---|---|
| Jana's discussion call, 2026-08-14 (81 min) | `disc @mm:ss` | Intent for both halves; first explanation of the model |
| Jana's review of Laura's mock, 2026-08-29 (37 min) | `review @mm:ss` | Rulings on the Direct screen; the walkthrough the build was measured against |
| Deck *Order changes – Direct and Consolidation – Mock design*, 2026-08-12 | `deck sN` | Layout/field source for Direct; Consolidation slides 8–13 are LLM output (see §8) |
| Jira ACs LINX-14509…14516 + context LINX-8820/8284/8253/8252 | `LINX-nnnnn` | Primary per [[feedback_stories_are_primary_source]] |
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

## 10. Consolidation / multi-stop — intent only

**Status: no Jira stories** (*"I don't have the stories, but I have the design"*, `disc @01:17:15`). Backend contract is only LINX-8284 step 3 (flag for user review). Jana's priority: Quote → Drop Carrier → OC Direct → **OC Consolidation last** (`disc @01:19:06`). Everything below is Jana's proposal, offered as *"my idea… if you find a better idea, welcome"* (`disc @36:55`).

**Deck provenance warning.** Slides 8–13 (`image13`–`image26`) are ASCII mock-ups in a code-block viewer with "Show less" chrome and a closing slide titled *"Recommended Final UX — If I were building this for Odyssey, I would use:"*. They are pasted LLM output, not Jana's drawings. Slide 7's screenshots (`image9`, `image10`) are our own prototype's Stops tab. Treat 8–13 as a sketch of the idea, never as a spec.

**Trigger differs from Direct.** Any order in any stop can change; *"this does not matter if the shipment is tendered, not tendered"* (`disc @16:xx`). Whole shipment is flagged for review.

**Summary screen (the "before edit" view).**
- Stop-level flag: e.g. `P2 Atlanta [UPDATED]` with a change summary (*1 Location Change · 2 Date Changes · 1 Weight Change · 4 Orders Changed*, `image11`) — tooltip or inline, *"I leave it to your design"* (`disc @21:xx`).
- Per-order list of changes (`image12`: `Order 108497 [LOCATION CHANGE]`…), each opening the **same compare screen as Direct** (§8) for that order.
- Weight/Volume changes get an indicator on the stop; warning triangle suggested.
- Two new stop fields: **Planning Date Type** (SSD vs RDD) and **Anchor Date** (the date sent to routing) — `deck s7`, `disc @15:xx`.
- Two actions: **Approve Plan** (also the approval step for Optimizer recommendations) or **Edit Shipment & Stops**.

**Editor — three sections** (`disc @24:xx–34:xx`, `image14`, `image16`):

| Section | Contents | Actions |
|---|---|---|
| **Stops** | P1/P2/…/D1 with drag handles; orders as chips under each | **drag to reorder** (renumbers: P2 dragged above P1 becomes P1); **Add Pickup Stop / Add Delivery Stop** (appended at the bottom of its type, renumbered, `image18`) |
| **Stop details** | orders on the selected stop (P1 auto-selected); stop weight and volume | **Move** (drag an order to another stop); **Remove** (order leaves the shipment entirely and goes to Available Orders so it can be re-added; confirm dialog `image17`) |
| **Available orders** | search across all shipments, monitoring and exceptions | columns Customer, Origin, Destination, Order #, Buy Shipment, Shipment Status, Tender Status (`deck s11`); **cannot add an order whose shipment is Tender Sent or Accepted**; added orders can then be dragged onto any stop |

Jana kept stop-actions and order-actions in separate sections on purpose: *"I don't want to put everything in one thing"* (`disc @33:48`).

**Validation** (deck s9, `image25`): delivery cannot precede pickup of the same order; an order cannot sit in delivery without a pickup or vice versa; at least one order per stop before finalizing; pickup date within requested window; equipment capacity. LLM slide 11 adds a stop-matching rule (match Location ID + address → reuse stop, else create and flag "New Stop") — unconfirmed by Jana.

**Finalize** (`image23`): a change summary (*Order 108499 moved P2 → P1 · Added Pickup Stop P3 · Order 108501 added · …*), shipment impact (weight, volume, current carrier), validation results, then **Approve Plan**.

**Feasibility escalation on record.** The designer, `disc @34:23–46:19`: *"It's not going to be an improvement. It's going to be a restructure later"*; asks for user research on what an MVP truly needs. Jana concedes complexity, confirms Laurie and Nirab know, date held at October, and routes the concern to Laurie. Unactioned as of 2026-09-02. Jana's own defence: the concepts (move stop, remove order, add order) all exist in legacy TMS, only drag-and-drop is new (`disc @45:12`).

---

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
- **OC-open-5** — Consolidation stories do not exist; Jana will not write them until a design exists (`disc @01:17:35`); the designer will not design until scope is researched. Deadlock routed to Laurie.
- **OC-open-6** — Is the Tender tab supposed to stay *readable* while locked (row 4)?
- **OC-open-7** — Figma 1703-156564 out of sync with shipped purple/segment presentation and with S137's lock overlay.
