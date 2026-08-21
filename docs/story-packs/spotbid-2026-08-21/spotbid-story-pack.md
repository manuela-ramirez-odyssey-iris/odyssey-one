# SpotBid Story Pack — for Kathleen

**Purpose:** everything needed to write the SpotBid user stories for the dev team without reverse-engineering the prototype. The functionality below is **built, approved, and live** at `odyssey-one-stage.vercel.app`; the normalized components devs will use already exist in the design system. Every behavior in this pack carries its **source** — your PRD/calls, Jira prior art, or *our design decision awaiting your ratification* — so you always know what is settled versus what a story should decide.

**How to use this pack**
1. Section 3 is the suggested story slicing — 18 stories with draft acceptance criteria. They are skeletons for you to reshape, not finished stories.
2. Every story references screenshots in `screens/` (named `NN-*.png`) — drag them into the Jira story as attachments. You do not need to take any screenshots yourself. Where useful, the live URL is given too, but attach the PNG anyway: the deploy moves, the PNG doesn't.
3. Section 4 lists **prototype stand-ins** — things we built to make the demo real that stories must NOT harden into requirements without a decision.
4. Section 5 maps your PRD's own eight epic-level stories (PRD §7) onto this slicing, so the trace back to your document is explicit.

**Live entry points**
- Planner: `odyssey-one-stage.vercel.app/shipments` → open a shipment → **SpotBid** tab (spot-eligible = no Accepted/Sent tender; the "Bid Review" pill is a good hunting ground).
- Carrier: the tokenized `/spot-bid/<token>` links generated when an RFQ is sent (RFQ Links panel on the tab).

---

## 1. The model in one paragraph

A planner opens the **SpotBid tab** on a shipment whose route guide failed (no accepted/sent tender). The tab derives an **overflow carrier list from the shipment's own routing history**: route-guide carriers who declined, never responded, were cancelled, or were dropped by routing arrive **flagged and unselected**; the rest of the eligible pool arrives selected. The planner sets **quote terms** (duration, general planned dates, flexible-dates flag) in a Quote Setup dialog, adjusts per-carrier dates/inclusion, and **sends the RFQ** — which opens a countdown window and emails each included carrier a **tokenized, no-login bid link** (email send itself not built yet — see §4). Carriers land on a branded bid page showing the shipment (never a Load/Order ID), the live countdown, and their charge sheet **pre-seeded from the shipment's real charge lines**; they submit, update, or decline — each behind a confirmation. Bids stream back to the planner's **Live Bids** view (shared DB, ~4s poll). After close, the planner **awards**, which appends the winner as the last route-guide row and hands off to the normal Tender flow. Setups can be saved and restored as **drafts**.

**Actors:** Planner (Logistics Coordinator) · Carrier (external, unauthenticated token link) · Ops Manager (monitoring — deferred, see §4).

---

## 2. Flow walkthroughs — what is built, rule by rule

Column key — **Source:** `PRD` (your PRD + §refs), `CALL <date>` (your sessions), `SPB-NN` (logged decision in the vault decision log, traceable to its source), `LINX-NNNN` (Jira prior art), `OURS` (our design decision — **needs your ratification**).

### 2A. Planner — SpotBid tab

| # | Behavior (as built) | Source | Screen |
|---|---|---|---|
| A1 | Tab shows only an explanatory empty state when the shipment already has an Accepted/Sent tender ("This shipment already has a … tender — spot bidding is unavailable"). Entry is NOT gated on route-guide exhaustion. | SPB-12, SPB-31 | 01 |
| A2 | Sticky context strip on the tab: **Quote Duration** (always visible, `--` until set) · Origin (City, ST) · Destination · Pickup Window (compacted: time range if same-day, date range otherwise) · Distance · Equipment · Hazmat. Full values on hover via tooltip. Distance is calculated (tender distance → routing option distance → shipment header distance). | OURS (strip); distance ruling LINX-12067 context | 02, 04 |
| A3 | Once the RFQ is open, the strip's Quote Duration cell becomes the **live countdown badge** (green → amber at ≤30% remaining → red at 0; never self-resets). | CALL 08-07 (duration-driven expiry), SPB-61; color ramp OURS | 08 |
| A4 | **Carrier list is derived per shipment**: route-guide participants (routing options ∪ dropped carriers) arrive **unselected**, flagged `Routed` + why (`Declined`, `No Response`, `Cancelled`, or the routing drop reason e.g. `No Rates`, `Missing Transit Time`); the remaining eligible pool arrives selected. TL/LTL/All pill tabs with live counts, **All** first. | CALL 08-07 [27:52] (routed carriers excluded by default); per-shipment derivation OURS; membership stand-in — see §4.3 | 02, 03 |
| A5 | A carrier row can only be **included** when it has both planned dates; excluding is never blocked. Filling both dates auto-checks the row; clearing one unchecks it. Select-all is scoped to the rows on screen. | OURS (mechanic), consistent with legacy date-window model SPB-13 | 02 |
| A6 | **Quote Setup** modal (primary button on the count row): Quote Duration (typable + pick-list) and Flexible checkbox on row 1; Planned Pickup / Planned Delivery on row 2. The general dates **set every row at once** (clearing them clears every row); they persist across modal reopens until page reload; rows whose dates wouldn't change are left untouched (a deliberately-unchecked carrier isn't silently re-included). | Duration window CALL 08-07; flexible flag SPB-60; general-dates mechanic OURS | 05, 06 |
| A7 | Dates are date-only — no time on the quote. | Kathleen written answer #5 (SPB-59 — note its logged tension) | 05 |
| A8 | **Send x/y RFQ** (x = included, y = listed) → confirmation dialog listing recipients + terms → on confirm, quote opens, per-carrier token links mint, countdown starts, view auto-switches to Live Bids. | Send lifecycle SPB-61; x/y label + auto-switch OURS | 07, 08 |
| A9 | **Live Bids**: sticky quote strip (hoverable cells), one row per carrier with status badge (`Awaiting`/`Bid`/`Declined`/`No Bid Submitted`/`Lowest bid`) and **Total** on the top line, breakdown expandable. Actions column hidden until a bid exists. | Total-on-top SPB-62; no-decline-required SPB-17 | 09 |
| A10 | Bids from carrier browsers appear via shared DB within seconds, no reload (PRD NFR: ≤30s; built: ~4s poll). | PRD §6 | 09 |
| A11 | After close: tolerance panel vs benchmark (highest routed cost), **Award Carrier & Send to Tender**, Modify & Resend, Clear & Start Over. Award appends the spot carrier as the **last route-guide row** (not a direct tender); a closed quote is never reopened — re-quoting is a new quote. | Benchmark PRD; award mechanics SPB-02/06; new-quote rule SPB-29; ⚠ SPB-63 wants radio-select + single "Award and Tender" — see §4.8 | 09 |
| A12 | **Drafts** sub-tab: Save Draft snapshots the whole setup (timestamped); Restore repopulates Setup & Carriers (disabled while a quote is open/awarded); Delete removes. | OURS — not in PRD; needs ratification | 10 |

### 2B. Carrier — tokenized bid page

| # | Behavior (as built) | Source | Screen |
|---|---|---|---|
| B1 | Access via per-carrier **tokenized email link**, no login, mobile-viable page. Token is self-contained and forgery-guarded (must match the token minted for that carrier); invalid/expired/closed states get a clear message page. ⚠ Token **expiry at quote close is not yet enforced** (PRD NFR) — the closed-window check covers it functionally. | SPB-09/19; PRD §6; guard OURS | 11, 18 |
| B2 | The page never shows Load ID / Order ID or any cross-carrier information. | SPB-05, SPB-51, PRD §6 | 12 |
| B3 | Branded page: navbar shows a large **HH : MM : SS countdown** with labels, shrinking on scroll; a "Bid Open" status badge floats beneath it. | Remaining-time need PRD §7 story 7; presentation OURS | 11 |
| B4 | Shipment summary: shipper, origin/destination, pickup/delivery (+ **Flexible** badges when the planner set the flag), stops, distance, weight, equipment, hazmat (MSDS link), special services, instructions. | Fields legacy/SPB-22; flexible badge OURS on SPB-60 | 12 |
| B5 | **Charges pre-seeded from the shipment's real charge lines** (e.g. Hazmat, Terminal Handling, Fuel Surcharge, per the routing rate structure), all rows editable/deletable, "Add More" for new rows off the charge-code catalog. Special-service codes not covered by the charge lines still seed a row. | Seed-from-shipment OURS (user-approved 08-21); catalog should be the OCM "COFL Charges" profile — SPB-55, see §4.4 | 13 |
| B6 | Fuel: when the seeded charges include an FSC line, it is the fuel figure (editable); otherwise a system-precalculated read-only "Fuel (Estimated)" shows in Base Charge. ⚠ SPB-56 says fuel is precalculated and NOT carrier-editable — the FSC-row editability needs a ruling. | SPB-56 vs OURS 08-21 | 13 |
| B7 | **Submit/Update Bid** behind a confirmation dialog summarizing Base, Additional, Grand Total. A returning carrier sees "Last submitted …" and **Update Bid** — updating while open is supported. | Update-while-open PRD §7 story 6 (supersedes the earlier V1 no-revision constraint SPB-23); dialog OURS | 14, 17 |
| B8 | **Decline** behind a confirmation explaining they can still bid while the window is open. After declining: button disabled reading "Declined", primary becomes "Bid Now"; submitting a bid re-enters the normal flow. Declining is never required (silence = "No Bid Submitted"). | SPB-17; dialog + states OURS (user-specified 08-21) | 15, 16 |
| B9 | Bid wire shape: linehaul + fuel + charge lines + total; prior accessorials rehydrate on return visits. | Legacy anatomy SPB-38 | 17 |

### 2C. Persistence (both sides)

| # | Behavior | Source | 
|---|---|---|
| C1 | Quote + bids live in the shared DB (`spot_state`), planner and carrier browsers stay in sync (~4s poll); localStorage is only a cache. Drafts persist per shipment the same way. | PRD §6 (30s visibility); implementation OURS |
| C2 | Concurrency is last-write-wins per quote — acceptable for one planner + N carriers on distinct rows; a real backend should merge per-carrier writes. | OURS — engineering note for the dev stories |
| C3 | ⚠ PRD §6 requires full multi-cycle quote history per load; the prototype keeps only the current quote (Clear & Start Over discards). History is a backend story, not built. | PRD §6 — gap |

---

## 3. Suggested story slicing (18 stories, AC drafts)

One epic: **SpotBid — planner-initiated spot bidding**. Slicing below is by deliverable seam; each story stands alone for a dev. AC are Given/When/Then drafts to edit. Screens listed = the Jira attachments for that story.

### Planner

**S1 — SpotBid tab availability** *(screens 01, 02)*
- Given a shipment with an Accepted or Sent tender, when the planner opens the SpotBid tab, then an empty state explains why bidding is unavailable and names the blocking tender.
- Given no active tender, then the tab shows the SpotBid workspace. Entry does not require route-guide exhaustion (SPB-12).

**S2 — Shipment context strip** *(02, 04, 08)*
- Sticky strip with Quote Duration (`--` until set), Origin, Destination, Pickup Window (compact), Distance (calculated fallback chain), Equipment, Hazmat; full values on hover.
- When an RFQ is open, the Duration cell renders the live countdown with green/amber/red thresholds and never self-resets at zero.

**S3 — Derived overflow carrier list** *(02, 03)*
- Given the shipment's routing history, when the list builds, then route-guide participants appear flagged `Routed` + reason (Declined / No Response / Cancelled / drop reason) and **unselected**; remaining pool carriers appear selected.
- All/TL/LTL pill tabs with counts; All default. *(Open: real membership comes from OCM carrier-list profiles — §4.3.)*

**S4 — Per-carrier dates & inclusion** *(02)*
- A row can be included only with both planned dates; excluding is always allowed; date edits auto-toggle inclusion; select-all scoped to the visible list.

**S5 — Quote Setup dialog** *(05, 06)*
- Duration (typable, increments, default 30 min) + Flexible flag; Planned Pickup/Delivery apply to every row at once, clearing included; values persist across reopens within the session; unchanged rows keep their manual inclusion state. Dates are date-only (SPB-59 caveat).

**S6 — Send RFQ** *(07, 08)*
- Button reads `Send x/y RFQ`; confirmation lists recipients, duration, flexible flag, lists; confirming opens the quote, stamps per-carrier distribution (SPB-61), mints token links, starts the countdown, and lands on Live Bids.

**S7 — Carrier notification email** — **NOT BUILT; core V1 deliverable.** Email per included carrier containing the bid link; content/sender/bounce rules to define. (PRD §7 story 5.)

**S8 — Live Bids monitoring** *(09)*
- One row per carrier, Total on top, expandable breakdown, status vocabulary incl. `No Bid Submitted` after close; bids visible ≤30s (built: seconds); actions hidden until a bid exists.

**S9 — Award & tender handoff** *(09)*
- Post-close tolerance vs the highest-routed-cost benchmark; award appends carrier as last route-guide row with QMU markup line (SPB-15) and enters normal tender flow. Decide: per-row award buttons (built) vs radio-select + single "Award and Tender" (SPB-63).

**S10 — Re-quote lifecycle**
- A closed quote is immutable; Modify & Resend creates a new quote seeded from the old; Clear & Start Over abandons. Multi-cycle history retained (backend — see C3 gap).

**S11 — Drafts** *(10)*
- Save Draft snapshots setup; Drafts tab lists snapshots (saved time, duration, x/y carriers, lists); Restore repopulates setup (blocked while a quote is open); Delete removes. *(OURS — confirm you want this in V1.)*

### Carrier

**S12 — Tokenized access & guardrails** *(11, 18)*
- Per-carrier single-load link, no login; forged/unknown tokens rejected; closed/expired windows get a clear message; no Load/Order ID or cross-carrier data anywhere; tokens die with the quote (PRD §6 — enforce expiry).

**S13 — Bid page: shipment summary & countdown** *(11, 12)*
- Branded page, live HH:MM:SS countdown + status badge; summary fields incl. Flexible badges, MSDS for hazmat; mobile-operable (PRD §6 — verify).

**S14 — Charge sheet** *(13)*
- Pre-seeded from the shipment's charge lines; rows editable/deletable; Add More from the charge catalog (OCM COFL profile — §4.4); fuel rule per §4.5 decision.

**S15 — Submit / Update bid** *(14, 17)*
- Confirmation with totals; updates allowed while open; prior bid rehydrates on return; audit trail of submissions (PRD §6 — backend).

**S16 — Decline** *(15, 16)*
- Confirmation explaining reversibility; declined state (disabled "Declined" / "Bid Now"); silence remains a valid non-response.

### Cross-cutting

**S17 — Quote persistence & sync** — shared store for quote/bids/drafts, carrier and planner views consistent within 30s, per-carrier write isolation (replace last-write-wins), full multi-cycle history per load, all transitions logged/traceable (PRD §6).

**S18 — Configuration** — duration defaults, flexible-variance days (client × equipment, SPB-60), charge catalog (org × equipment, SPB-55), carrier-list profiles: all configurable without code changes (PRD §6). The prototype hardcodes stand-ins for each — this story is where they become real.

---

## 4. Prototype stand-ins — do NOT harden into requirements

1. **Email send path** — RFQ links render in the planner UI; no email is sent. (S7 exists precisely for this.)
2. **Auth/token** — self-contained signed-ish token with a match guard; no server-side expiry, no rate limiting. Real implementation per SPB-09/16 (token model is Kathleen-ratified for v1; Jana's authenticated portal remains the contested future).
3. **Overflow membership** — the non-route-guide pool is a deterministic per-shipment sample of the carrier master, standing in for **OCM carrier-list profiles** (SCAC × ship mode). The TL/LTL classification per carrier is our real-world judgment, not sourced.
4. **Charge catalog** — seeded from the shipment's routing rate lines + a static code list; real source is the OCM **COFL Charges** profile (org × equipment, SPB-55).
5. **Fuel** — shipment's AP fuel as "precalculated"; real fuel-index source TBD (flagged for Jana/David). Our editable-FSC behavior vs SPB-56's not-editable rule needs one ruling.
6. **Simulated bids** — demo timer lands 2–3 fake bids after send; obviously not a requirement.
7. **Concurrency & history** — last-write-wins, current-quote-only (no multi-cycle history), no audit log.
8. **Award interaction** — per-row Award buttons + "Award Carrier & Send to Tender"; SPB-63's radio-selection + single action is the logged intent — pick one in S9.
9. **Time-zone precision** — PRD §6's GMT-storage/local-display requirement is not exercised by the prototype's date-only quotes; keep it in S5/S13 AC.
10. **Deferred surfaces** — internal cross-shipment monitoring board (crossed out, preserved for later — SPB-44); carrier board is provision-only until auth exists (SPB-47); Ops-manager queue views (PRD §7 story 4) unbuilt.

## 5. Trace to the PRD's own stories (§7)

| PRD story | Covered by |
|---|---|
| 1 Initiate overflow bidding | S1, S3–S6 |
| 2 Bids ranked with tolerance | S8, S9 |
| 3 Re-open after expiry | S10 |
| 4 Ops monitor queues | deferred (§4.10) |
| 5 Carrier email link, no portal | S7 + S12 |
| 6 Update bid while open | S15 |
| 7 See remaining time | S2, S13 |
| 8 Notify on all-decline/no-bids | not built — fold into S8 or its own story |

---

*Prepared 2026-08-21 from the SpotBoard domain canon v1.9, decision log SPB-01…63, and the built prototype (sessions 126–130). Decision-log references live in `vault/10-domains/spotboard/decisions/decision-log.md` if a story needs the full source trail.*
