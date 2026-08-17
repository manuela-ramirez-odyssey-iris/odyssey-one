---
title: Dropped Carrier — Decisions
domain: shipments
type: decision-log
tags: [dropped-carrier, tender, process-scac, routing]
date: 2026-08-17
status: active
---

# Dropped Carrier — Decisions

Rulings settled by a source for the Dropped Carrier group: **LINX-13953** (Display Dropped Carrier),
**LINX-13954** (Process SCAC), **LINX-13397** (TMS Master Data Lookup Queries).

**Prefix is `DC-`, not `DEC-`, on purpose.** [[decision-log|decision-log.md]] records *implemented*
decisions traced to shipped code. **Nothing in this topic is implemented** — all three tickets are in
`Initial UX/UI Design` / `New`, and this session was analysis only. Keeping these in their own file with
their own prefix stops them being read as shipped behaviour.

Anything I had to guess at is **not** here — it is an Open Question in
[[../dropped-carrier#6-open-questions|the canon]].

Sources: the verbatim AC at `vault-sources/10-domains/shipments/sources/linx-dropped-carrier-ac-2026-08-17.md`,
and Jana's call of 2026-08-11 (`jana-tender-drop-carrier-and-process-scac-2026-08-11.vtt`), cited as
`VTT [mm:ss]`.

---

## Placement & interaction

### DC-01: Dropped Carrier is an inline collapsible section below the Tender List — not TMS's separate screen
- **Previous:** unplaced. 13953's AC refers only to "the Dropped Carrier section" and never says where it
  goes. TMS's own implementation is a **Drop Carrier button that opens a separate screen**, which is the
  obvious thing to copy and the wrong thing to copy.
- **Decision:** render it **inline, directly beneath the Tender List, inside the Tender tab, as a
  collapsible section** that expands to show the full list.
- **Rationale:** Jana wants the planner to see that dropped options exist without navigating away — the
  whole judgement the screen supports ("is this exclusion real, or a data gap I can fill?") requires the
  two lists side by side. *"Here, just below in TMS, it has a separate screen. You want to just provide it
  below the screen itself."* … *"It should be collapsible, click, it should open, then it should give you
  all the entire list, so that the user can see and see the list, first of all."*
- **Source:** VTT `[00:41]`, `[01:31]`, `[01:42]`, `[06:51]`–`[07:15]` — Jana, unprompted, three times.
- **Status:** ✅ **implemented** 2026-08-17 (S122), LINX-13953 display build.

### DC-02: Process SCAC is a per-row action, not a toolbar button above the section
- **Previous:** ambiguous. 13954 says only that Process SCAC *"shall only be available for carriers
  displayed within the Dropped Carrier section"* — true of both a per-row action and a
  select-then-press-the-top-button pattern. TMS uses the top button.
- **Decision:** **every dropped-carrier option carries its own Process SCAC action.** No single
  section-level button.
- **Rationale:** Jana raised it herself while looking at the TMS screen and explicitly rejected the
  top-button pattern: *"Process SCAC should not be like here… Each drop carrier list option should have
  this action button, where they would select and process the SCAC **instead of just having one button on
  the top** to say like Process SCAC."* The same argument they apply one breath earlier to Add Quote — the
  action belongs to the option, not to the tender.
- **Source:** VTT `[21:31]`–`[21:56]`.
- **Status:** ✅ **implemented** 2026-08-17, LINX-13954 build — action column (`006d3ce`), wired end to
  end (`033576d`). See [[#DC-12|DC-12]] onward for the implementation calls.
- **Note:** the identical argument applied to **Add Quote** (*"instead of being on the top, it should be
  here as part of the dropdown"*, VTT `[21:03]`) targets already-shipped Quote UI. Logged in the canon §7,
  deliberately not actioned here.

---

## Semantics

### DC-03: "Routing failure" means routing returned WITHOUT dates — not a service error
- **Previous:** 13954's pseudocode reads *"If routing call fails"*, which naturally parses as "the routing
  service errored". Under that reading the manual-date dialog fires on transport failures, and the
  separate "Processing Failure" system-error branch is redundant.
- **Decision:** in this spec, **"routing failure" = the routing call completed but did not return Pickup
  and/or Delivery dates.** A genuine service/system error is the separate Processing Failure branch
  (§4.12 of the canon), with its own message and a retry affordance.
- **Rationale:** Jana defines the term in so many words: *"If it is not able to calculate the date, it
  would ask the user to fill a date. **That is what I am calling as a routing failure.**"* The AC agrees in
  its Manual-Entry precondition — *"Routing fails (Routing call successful but didn't return Pickup or
  Delivery or both dates)"* — it just contradicts itself in the pseudocode above it.
- **Source:** VTT `[19:04]`; LINX-13954 AC, "Manual Pickup and Delivery Entry" precondition.
- **Status:** ✅ **implemented** 2026-08-17, LINX-13954 build — `routingReturnsDates` in
  `apps/odyssey-one/src/lib/processScac.js` (commit `7367759`).
- **Why it matters:** it is the difference between a dialog that asks the user for dates and a dialog that
  tells them to call an administrator. Getting it backwards puts a date picker in front of a network
  outage.

### DC-04: There is no fixed equipment hierarchy — group order is whatever routing returned for this shipment
- **Previous:** Manuela's working assumption, stated twice on the call: that equipment groups follow a
  standing preference order (LTL, then TL, then IS…) that the UI could hardcode.
- **Decision:** **no.** The equipment-group order in the Tender List is routing's output **for that
  shipment** and varies shipment to shipment. Newly processed or manually added carriers are appended to
  the **bottom of their matching equipment group** (or the end of the list if no group matches).
- **Rationale:** *"Not like that… it is for this particular list. In this case, LTL is the first."* and
  *"In some list, it could be TL. TL is the number one… **it is determined by the routing itself. You
  don't have to determine anything.**"* The bottom-of-group insert has its own reason: routing has already
  sorted each group by quality for this shipment, so a user's manual pick has not earned a position inside
  that ordering — *"When the routing is making a call, it is going to sort the list and put it accordingly.
  **That is why when the user is adding, it is inserting towards the last** in that particular equipment
  list."*
- **Scope:** the append rule applies **only** to user-driven insertion — *"only when user is manually
  adding or processing a SCAC from the drop carrier list"*. Routing's own results are never re-sorted by us.
- **Source:** VTT `[32:15]`, `[32:26]`, `[32:43]`–`[32:59]`, `[33:35]`; LINX-13954 "Carrier Insertion Logic".
- **Status:** ✅ **implemented** 2026-08-17 (S122), LINX-13953 display build.

### DC-05: Rank ≠ Route Rank — one is recalculated, the other is carried over
- **Previous:** 13954 appears to contradict itself: *"Rank shall be recalculated based on the carrier's
  position in the Tender List"* sits two lines above *"use the route rank from the dropped carrier list"*.
  Read as one field, those rules are mutually exclusive.
- **Decision:** they are **two fields**. **Rank** = the row's position in the Tender List, recalculated on
  insert. **Route Rank** = routing's own rank, carried over from the dropped-carrier row together with its
  **RPC-ID**. On the manual add-from-scratch path both Route Rank and RPC-ID are left empty.
- **Rationale:** Jana broke off mid-sentence while reading the AC aloud to draw exactly this line: *"The
  rank shall be calculated — route rank logic. Okay, this is a route rank logic. **It is not about this
  one, right? This is not about this.** This is a route rank logic."*
- **Source:** VTT `[37:44]`, `[38:03]`–`[38:31]`; LINX-13954 "Carrier Insertion Logic".
- **Status:** ✅ **implemented** 2026-08-17, LINX-13954 build (commit `7367759`) — see [[#DC-17|DC-17]]
  for what "carried" resolves to on today's seeded data.
- **Why it matters:** Route Rank and RPC-ID travel as a pair — the RPC-ID is what makes Start Date, Stop
  Date and Route Group (13397 §7/§8) resolvable on the promoted row. Dropping Route Rank on promotion
  would silently blank three other fields.

---

## Volume Commitment

### DC-06: Volume Commitment display is IN scope; the Accepted/Open calculation is deferred
- **Previous:** all-or-nothing. Jana opened by saying they would move Volume Commitment out of 13953
  entirely — which would have taken the fields off the design with it.
- **Decision:** **design and display the Volume Commitment fields** (Commitment, UoM, Accepted, Open,
  Comment, CVC ID). **Do not implement the Accepted/Open arithmetic** — those rules are owed by Dave.
  Until then Accepted and Open follow 13953's own `--` fallback rules.
- **Rationale:** Jana split it herself, in one breath. Deferral: *"I want to move this to a separate story.
  Because Dave needs to give me some rules behind it, how to calculate what needs to be done. So what he
  said was that is very difficult… You don't have to work on this one right now."* Then, immediately:
  *"Or even if you want, you can just put the fields and just keep it, whatever information what we have."*
  and decisively: *"I think it's **more the logic refinement, not the display refinement**."*
- **Source:** VTT `[07:50]`–`[08:35]`, `[11:57]`.
- **Status:** ✅ **implemented** 2026-08-17 (S122), LINX-13953 display build.
- **Note:** the promised split **has not happened**. The AC pulled on 2026-08-17 still carries the Volume
  Commitment table inside 13953, and the same 2026-08-11 revision *strengthened* rather than removed it
  (see DC-07). Treat 13953 as the home of these fields until a separate ticket actually exists.

### DC-07: Commitment is looked up by CVC ID — the 13953 TBD is resolved, and CVC ID is per-row
- **Previous:** 13953's Commitment field was red-flagged: *"Commitment (TBD - If commitment returned by
  routing or lookup using CVC ID)"*. Two candidate sources, no ruling.
- **Decision:** **lookup by CVC ID wins.** The 2026-08-11 AC revision removed the red flag and the field is
  now plain `Commitment`, with the steps *"Using CVC ID, get Commitment for SCAC, Equipment and CVC ID"*.
  13397 §10 (`get_cvc_id`) and §11 (commitment data by cvc_id) give the exact functions. Additionally: the
  commitment is keyed on **(carrier, equipment, week)** and therefore belongs **on each row**, not on the
  section.
- **Rationale:** the per-row point is the VTT's contribution and it is a design trap the AC's flat table
  hides — *"Every SCAC will have its own CVC ID… here you would see it as if like it is applicable for the
  entire drop carrier list, but it is actually applicable for each and every option of the drop carrier
  list."* And why equipment is part of the key: *"For this rule number one, for this particular carrier and
  the equipment, the carrier is committed for 10 loads. For a different equipment, they might have
  committed a different number of loads. That is why this rule is important."*
- **Source:** LINX-13953 AC diff, 2026-08-11 09:10 (red flag removed); LINX-13397 §10–§11; VTT `[10:20]`,
  `[11:03]`.
- **Status:** ◐ **partly implemented** 2026-08-17 (S122) — CVC ID renders per row, as required. The `get_cvc_id` lookup itself is not built: routing returns no commitment data, so every commitment cell is `--` today.
- **Open remainder:** *who* produces the CVC ID is still contested — 13953 says routing returns it, 13397
  §10 derives it. Logged as OQ-3, not resolved here.

---

## Copy corrections

### DC-08: The manual date dialog's buttons are OK / Cancel — "Yes" is a leftover
- **Previous:** 13954 says, twice, *"once above validations are complete, then **Yes** button activated"*,
  while both of its own response tables directly beneath say **OK** and **Cancel**. A designer reading the
  sentence rather than the table would build the wrong dialog.
- **Decision:** the buttons are **OK** and **Cancel**. OK is enabled only once every validation has
  cleared. "Yes" is stale wording, not a third button and not a different dialog.
- **Rationale:** the VTT gives the naming and the enablement rule together, unambiguously: *"It should give
  a button saying that **okay and cancel**, and okay is continue processing, and **okay should be enabled
  only when this validation message is gone**."* The AC's own button tables agree; only its prose does not.
- **Source:** VTT `[35:37]`; LINX-13954 "Manual Pickup and Delivery Entry" button tables.
- **Status:** ✅ **implemented** 2026-08-17, LINX-13954 build — `ManualDatesModal` (commit `14d1bfd`).
  Both validations browser-verified; see [[#DC-21|DC-21]].

---

## Scope & provenance corrections

### DC-09: `Refer Story xxxx` is the manual Add Carrier + SCAC path — and Jana said on this call that they still owe the ticket
- **Previous:** S120 matched 13954's red-flagged `Refer Story xxxx` to a manual Add-Carrier-and-SCAC ask,
  and recorded it as *born and deferred on this call* with the quote *"Let's not talk about it right now."*
- **Decision:** **the match is correct; the framing is not.** The hole is the manual **Add Carrier (SCAC +
  Equipment)** action on the Tender screen. But it was not deferred on this call — Jana **demoed it in
  TMS**, described it as the second of two entry points into the same flow, and stated they own the ticket:
  *"Adding from scratch from the tender screen, **I have to write the story**, leave the route rank empty
  and leave the RPC-ID empty."* The phrase *"Let's not talk about it right now"* **does not occur anywhere
  in this transcript** (verified by grep); if it was said, it was on a different call.
- **Rationale + shape:** *"There are two ways to process SCAC. We saw from drop carrier list, and the other
  one is you will see here Process SCAC. I can select a carrier from this list… and then I can select the
  equipment."* and crucially *"Both are same. **Steps are the same.** But in the drop carrier list, it is
  returned by routing. Here, the user is going and adding it."* So the missing story reuses 13954's entire
  state machine; the only difference is that Route Rank and RPC-ID start empty. The `else` branch inside
  13954 exists solely to say what *not* to carry over — it is not 13954 scope.
- **Source:** VTT `[15:19]`–`[16:45]`, `[37:08]`, `[38:58]`; LINX-13954 "Carrier Insertion Logic".
- **Status:** analysis — not implemented. **Ticket does not exist; Jana owns writing it.**

### DC-10: LINX-13397 is fully written — it was never the blocking hole prior sessions recorded
- **Previous:** prior sessions recorded 13397 as an empty/blocking dependency. Its workflow status is `New`,
  it is unassigned, and its `description` is a single sentence — which is all `getJiraIssue` returns by
  default.
- **Decision:** **13397's AC specifies 11 lookups** (SCAC list, carrier name, equipment, distance-source
  description, org hours, PRO# *(deferred)*, start/stop dates, route group, AP org, `get_cvc_id`,
  commitment data) with SQL and function signatures. It is a written spec awaiting assignment, not a gap.
- **Rationale:** the earlier reading came from the one-sentence `description`, not the AC. Acceptance
  Criteria is `customfield_10032` and is **not returned by default** — every one of these tickets looks
  empty unless it is requested explicitly.
- **Source:** LINX-13397 AC, pulled live 2026-08-17 (S122). Method note recorded in the source file header.
- **Status:** analysis — not implemented. Corrects prior canon.
- **Remaining real gap:** 13397 contains **no drop-reason-description lookup**, which is exactly what
  13953 points at it for. That hole is genuine and still red-flagged on Dave (OQ-2).

### DC-11: Terminology — "Dropped Carrier" and "Tender List" are canon; "drop carrier" and "usable carriers" are the source vocabularies
- **Previous:** three names for two lists, used interchangeably across the sources.
- **Decision:** canon spelling follows the tickets — **Dropped Carrier** and **Tender List**. Jana's spoken
  *"drop carrier"* / *"drop carrier list"* and the routing payload's *"usable carriers"* / *"drop carrier
  list"* are the same things and should be normalised on the way in.
- **Rationale:** consistent with [[decision-log#DEC-01|DEC-01]], which established that user-facing
  language follows the tender vocabulary rather than backend/system naming. The routing payload literally
  labels its two arrays `usable carriers` and `drop carrier list` (VTT `[03:18]`), so the mapping needs
  stating once rather than being re-derived at every read.
- **Source:** LINX-13953/13954 titles and AC; VTT `[03:18]`, `[03:44]`, `[12:22]`.
- **Status:** ✅ **implemented** 2026-08-17 (S122), LINX-13953 display build.

---

## Process SCAC — implementation calls (LINX-13954, built)

Entries below are engineering decisions made while **building** LINX-13954, not new readings of the AC or
the VTT — the ticket does not make these calls, we did. Each entry says so explicitly.

### DC-12: Routing and Rating are SIMULATED, driven by the seeded `dropCode`
- **This is our call, not the ticket's.** LINX-13954 assumes real Routing and Rating services exist to
  call; this prototype has neither.
- **Previous:** no simulation existed — `planProcessScac` had no branch logic to write against.
- **Decision:** derive the routing/rating outcome deterministically from the `dropCode` routing already
  gave a dropped carrier. `dropCode 23` (Missing Transit Time) → routing returns no dates → manual entry
  dialog. `dropCode 1` (No Rates) and `2` (Prohibited Carrier) → routing succeeds.
- **Rationale:** deterministic, no randomness, so demos repeat and every branch is reachable on request.
- **Source:** `apps/odyssey-one/src/lib/processScac.js` (`routingReturnsDates`,
  `DROP_CODE_MISSING_TRANSIT_TIME`). Replacing it with a real call touches nothing else — the function is
  the only seam.
- **Status:** ✅ **implemented** 2026-08-17, LINX-13954 build. Commit `7367759`.

### DC-13: Rating always fails for a dropped carrier
- **This is our call, not the ticket's.**
- **Previous:** [[../dropped-carrier#OQ-1|OQ-1]] had already ruled "follow the ticket" — Rating runs only
  on the routing-failure branch. No rating *outcome* existed yet to build against.
- **Decision:** on that branch, Rating always returns no rate.
- **Rationale:** we hold no rate data for a dropped carrier — routing returns five attributes
  ([[../dropped-carrier#OQ-13|OQ-13]]) and none is a rate — so "No rate available" is truthful, not a coin
  flip.
- **Source:** `processScac.js` (`planProcessScac`'s `'rating-failed'` step, unconditional on the failure
  branch).
- **Status:** ✅ **implemented** 2026-08-17, LINX-13954 build. Commit `7367759`.

### DC-14: Append at `max(rank) + 1`; never renumber
- **This is our call, not the ticket's**, applying the AC's own stated fallback.
- **Previous:** [[#DC-04|DC-04]] ruled bottom-of-matching-Equipment-group insert with Rank recalculated by
  position — correct for a grouped list. Our Tender List is FLAT, no equipment groups, so DC-04's primary
  rule never applies.
- **Decision:** the AC's own fallback governs every insert — *"If no matching Equipment group exists,
  insert at the end of the Tender List."* Rank = `max(existing ranks) + 1`. Existing ranks are never
  renumbered.
- **Rationale:** renumbering is additionally not expressible through the write endpoint —
  `buildTenderUpdateQuery` addresses rows `WHERE shipment_sell_id = $7 AND rank = $8`
  (`apps/odyssey-one/api/_lib/shipments.mjs:269`), so shifting row 5 to 6 would overwrite whatever
  currently holds rank 6.
- **Source:** `processScac.js` (`nextRank`); `apps/odyssey-one/api/_lib/shipments.mjs:265-276`.
- **Status:** ✅ **implemented** 2026-08-17, LINX-13954 build. Commit `7367759`.

### DC-15: The 3-second success message is an inline `Alert`, not a new Toast component
- **This is our call, not the ticket's.** The AC's flow calls it a "Toast" with a 3s auto-dismiss.
- **Previous:** no toast/auto-dismiss pattern exists anywhere in this app.
- **Decision:** `Alert variant="success"` + a `setTimeout` clearing it after 3000ms.
- **Rationale:** ~6 lines against a new normalized component that would owe Figma, a DSM entry and an
  Angular twin for one caller. Revisit if a second consumer appears.
- **Source:** `RoutingGuideTab.jsx:1466` (`<Alert variant="success" showClose={false}>`); the
  `processSuccess` auto-clear effect nearby.
- **Status:** ✅ **implemented** 2026-08-17, LINX-13954 build. Commit `033576d`.

### DC-16: Audit logging is NOT built
- **This is a known gap, not a decision.**
- **Previous:** canon §4.11 / the AC's audit list — user, date/time, shipment, SCAC, routing result, rating
  result, manual dates — explicitly "recorded in backend audit logs."
- **Decision:** not built. There is no audit table in Neon and no endpoint.
- **Source:** LINX-13954 AC, "Audit Log" step; canon §4.11.
- **Status:** ❌ **not implemented.** Known gap, flagged rather than silently dropped.

### DC-17: Route Rank and RPC-ID are carried from the dropped row, which means both arrive blank
- **This is our call, not the ticket's**, applying [[#DC-05|DC-05]] together with the routing-payload
  finding at [[../dropped-carrier#OQ-13|OQ-13]].
- **Previous:** DC-05 ruled Route Rank + RPC-ID carried over from the dropped row on the "adding from
  dropped list" branch. OQ-13 separately found routing returns neither field for a dropped carrier
  (`<d-option>` carries only `seq`, `service`, `carrier`, `drop-code`, `drop-reason`).
- **Decision:** implement the carry-over exactly as specified. On today's seeded data both fields resolve
  to blank, because there is nothing to carry.
- **Rationale:** this matches what the AC's own "from scratch" branch prescribes as an *outcome* (route
  rank and RPC-ID empty), even though mechanically we are on the "from dropped list" branch, not the
  from-scratch one.
- **Source:** `processScac.js` (`droppedCarrierToOption`: `routeRank: carrier.routeRank ?? DASH`, `rcpId:
  carrier.rpcId ?? DASH`).
- **Status:** ✅ **implemented** 2026-08-17, LINX-13954 build. Commit `7367759`.

---

## Process SCAC — engineering findings & defects (LINX-13954, built)

### DC-18: No migration and no API change were needed
- **Verified in code, not assumed.**
- **Previous:** the plan could have assumed a write-side migration was needed to persist a carrier
  promoted out of the Dropped Carrier list — the same assumption [[decision-log#DEC-106|DEC-106]]
  disproved for the read side of 13953.
- **Decision:** none needed. `saveTender` (`apps/odyssey-one/api/_lib/shipments.mjs:290`) already
  update-then-inserts — it UPDATEs by `(shipment_sell_id, rank)` and INSERTs when nothing matched. A
  processed carrier is simply a new rank falling through the INSERT path.
- **Rationale:** same "read the code before assuming a migration" finding as
  [[decision-log#DEC-106|DEC-106]].
- **Source:** `apps/odyssey-one/api/_lib/shipments.mjs:261-299`.
- **Status:** ✅ **confirmed** — no schema or endpoint change made.

### DC-19: A display dash would have been persisted into a numeric wire field — found and fixed
- **Previous:** `routingOptionVmToDto` passed `routeRank` through its `...rest` spread unchanged.
- **Finding:** a carrier processed in from the Dropped Carrier list carries `routeRank: '--'`
  ([[#DC-17|DC-17]]), so that string would have been written into `routeRank?: number` on the wire.
- **Fix:** `routeRank` pulled out of the spread and coerced: non-numeric becomes ABSENT (`undefined`),
  never `0` — a persisted `0` would read back as a real first-place rank on the next load. The VM type
  widened to `number | string` (`shipmentDetail.ts:170`) so the dash is expressible and `tsc` can see it.
- **Source:** `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts:478-501`
  (`routingOptionVmToDto`).
- **Status:** ✅ **fixed.** Commit `8bffdf1`.

### DC-20: The AC's Processing Failure branch was unreachable dead code — found and fixed
- **Previous:** `persistTender` swallowed `saveTenderOption`'s rejection and gave callers no
  success/failure signal, so `await persistTender(...)` resolved without ever surfacing a failed write — a
  failed write left the optimistic row on screen and told the user nothing, and the AC's Processing
  Failure dialog (canon §4.12) could never fire.
- **Fix:** `persistTender` now resolves `true`/`false`. The ~10 pre-existing callers are deliberately
  fire-and-forget and ignore the return value, so their behaviour is unchanged; `runProcessScac` is the
  first caller to branch on it, rolling the optimistic row back on `false`.
- **Source:** `apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx:1048-1068` (`persistTender`),
  `:1092-1106` (`runProcessScac`'s failure branch).
- **Status:** ✅ **fixed.** Commit `c29410f`.

### DC-21: Browser verification — real Chrome, live Neon (2026-08-17)
- **Not jsdom.** The build was driven end-to-end in headless Chrome against live Neon data, not asserted
  from component tests.
- **Findings:**
  - 8 dropped carriers rendered 8 Process SCAC buttons; the action cell computes `position: sticky`.
  - Clean route: tender rows 6 → 7, "Routing completed successfully." shown.
  - Duplicate: a second press on the same carrier produced "Carrier and Equipment combination
    (SCAC/Equipment) already in the list." and the row count did not change.
  - Missing Transit Time: the dates dialog opened; a past pickup and a delivery ≤ pickup each showed their
    verbatim message and kept OK disabled; a valid pair enabled OK; "No rate is available for the
    carrier..." followed.
  - Persistence confirmed cold: after a full page reload both processed carriers were still in the Tender
    List, and the manually-entered dates survived — `8 8 SAIA SAIA INC LCL -- -- 09/02/2099 08:00
    09/04/2099 16:00`.
- **Source:** manual browser session, 2026-08-17, headless Chrome against live Neon.
- **Status:** ✅ **verified.**

---

## Changelog

| Date | Decisions added |
|---|---|
| Aug 17, 2026 | DC-12 through DC-21 — Process SCAC (LINX-13954) built: six implementation calls the ticket doesn't make — **DC-12** Routing/Rating simulated off the seeded `dropCode` (`23` → no dates, `1`/`2` → success); **DC-13** Rating always fails on the failure branch, since a dropped carrier carries no rate data; **DC-14** insertion always takes the AC's own no-matching-group fallback (flat list, `max(rank)+1`, never renumbered — the write endpoint addresses rows by rank); **DC-15** the 3s success message is an `Alert`, not a new Toast component; **DC-16** audit logging is a known, unbuilt gap; **DC-17** Route Rank/RPC-ID are carried per DC-05 but arrive blank because routing supplies neither. Plus **DC-18** confirms no migration or API change was needed (`saveTender` already update-then-inserts, same finding as DEC-106); **DC-19**/**DC-20** record two defects found and fixed mid-build (a display dash almost persisted into a numeric wire field; the AC's Processing Failure branch was unreachable dead code); **DC-21** records real-Chrome/live-Neon browser verification, including cold-reload persistence. Four items verified but **not resolved** are logged as OQ-14 through OQ-17 in the canon. Also flipped four DC-01–DC-11 statuses to ✅ implemented now that the behaviour they ruled on (per-row action, routing-failure semantics, Rank vs Route Rank, OK/Cancel buttons) shipped as part of this build: **DC-02**, **DC-03**, **DC-05**, **DC-08**. |
| Aug 17, 2026 | DC-01 through DC-11 — Dropped Carrier intake (S122), from the LINX-13953/13954/13397 AC pulled live plus Jana's 2026-08-11 call. Placement and per-row action are VTT-only rulings the AC never states (**DC-01**, **DC-02**); **DC-03** pins "routing failure" to *returned-without-dates*, not a service error; **DC-04** kills the assumption of a fixed LTL→TL equipment hierarchy; **DC-05** separates Rank from Route Rank, which the AC reads as one contradictory field; **DC-06**/**DC-07** split Volume Commitment into in-scope display vs Dave-blocked calculation and confirm the CVC-ID lookup won the TBD; **DC-08** retires the AC's stray "Yes" button; **DC-09** confirms S120's `Refer Story xxxx` match but **refutes its framing** — Jana demoed the manual add path and said they owe the ticket, and the quote S120 attributed to this call is not in this transcript; **DC-10** retires the "13397 is a blocking hole" reading; **DC-11** fixes terminology. Headline unresolved item is **OQ-1** — the AC and the VTT disagree on whether Rating runs on the routing-success path. |
