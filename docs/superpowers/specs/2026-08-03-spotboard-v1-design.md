# SpotBoard V1 — Design Spec

**Date:** 2026-08-03 · **Domain:** spotboard · **Status:** approved for planning

Canon: `vault/10-domains/spotboard/spotboard.md` (v1.5) · schema `vault/10-domains/spotboard/data/quote-model.md` · decisions `SPB-01…SPB-19`.

## Source precedence (per user, 2026-08-03)

PRD + Kathleen's HTML mockup are the design authority; the transcripts confirm/validate and set V1 scope; individual stakeholder pushback (Irina) is not authoritative absent consensus. All fields, labels and sample values below come from Kathleen's prototype (`vault-sources/10-domains/spotboard/prototypes/SpotBoard Wireframes v1 — OdysseyONE.html`) and the PRD, as distilled in the canon.

## What SpotBoard is

The spot-market bidding fallback: when contracted carriers won't cover a shipment, a planner invites a profile-derived carrier list to **bid a price**, then awards the winner, which hands off to the existing Tender flow. Asks "what would you charge?" (a price) rather than tendering's "will you take it?" (yes/no).

## V1 scope (decided July 30 call, confirmed by user)

**In:** the planner surface (compose → send → watch bids → award → to Tender) as a **tab inside the shipment, next to Tender**, plus the **carrier bid-entry page** as a **standalone external page** reached by a token link. Built from existing `@odyssey/ui` components + the `RoutingGuideTab` pane pattern. **Mock/interactive — no DB reseed.**

**Out (post-V1, do not build):** cross-shipment Monitoring Board; per-shipment/carrier Quote History; the logged-in carrier portal (login, dashboard, listing, history); in-app notifications; bid analytics; multi-currency; rail/ocean; leading-bid ("Best"/`SHOW_BEST`) display; the affiliate (CTNS) bidder.

## Architecture — 3 pieces

| Piece | Location | Clones |
|---|---|---|
| Planner SpotBoard tab | new lazy pane in `apps/odyssey-one/src/components/detail/`, registered in `BottomBar.jsx` `TABS` at index 4 (after `routing`/Tender) | `RoutingGuideTab` (sub-tab band + `Tab` + wide column + pane-canvas classes) |
| Carrier bid page | new route `/spot-bid/:token` in `App.jsx`, rendered **outside** `AppShell` | `Login` (chrome-less top-level route) |
| Award → Tender handoff | SPOT RATE row on the existing Tender tab | existing `saveTenderOption` / `routeGroup:'Spot'` path |

### Naming
Tab label **"SpotBoard"** (matches Kathleen's mockup + product name). Route `/spot-bid/:token`. Component `SpotBoardTab`.

## Piece 1 — Planner SpotBoard tab

Stateful pane. A shipment's spot quote moves through a state machine (from PRD §3.1–3.2):

```
Ineligible ─ (active/accepted tender on shipment) ─→ EmptyState, no flow
Eligible ─→ Draft ─(Send RFQ)→ Open ─(close/force-close)→ Closed ─(Award)→ Awarded
```

- **Ineligible:** active or accepted tender exists on the shipment → `EmptyState` explaining spot bidding is unavailable (the reciprocal lock, SPB-12). Eligibility derived client-side from `routingData.options` statuses (no accepted/sent tender ⇒ eligible). ~30% of generated shipments are tender-failed and thus eligible.
- Two sub-tabs via the `pane-tabs-band` + `Tab` pattern: **Setup & Carriers** · **Live Bids**.
- Button/field enablement follows the PRD state matrix (§3.2): Draft → `Send` enabled, equipment/duration editable; Open → duration/dates/equipment locked, `Force Close` available; Closed → `Award`/`Modify`/`Clear`.

### Sub-tab 1 · Setup & Carriers (Screen 1)
- **Context header** — 6 read-only cells: Origin · Destination · Equipment (seed) · Distance · Hazmat · Pickup Window. Reuse `RoutingGuideTab`'s `Field`/`SectionHeader` helpers.
- **Toolbar controls:**
  - Carrier List — `Dropdown`, select exactly one (local named lists → Dropdown per the data-source rule). Options e.g. "TL Southeast Overflow — Van — 120 min", "LTL Comparable Set — 240 min".
  - Quote Duration (min) — `FormField` numeric, integer 1–99,999. Locks on send.
  - Flexible Pickup — `Checkbox` ("carrier picks feasible date").
- **Carrier table** — `DataTable` (TanStack) with custom cell renderers:
  - Columns: Incl. (checkbox) · Carrier (SCAC · Name) · Equip · Contact Email · Planned Pickup (inline `DateField`) · Planned Delivery (inline `DateField`) · Flags (`Badge`).
  - Flags: `Routed` / `Waffled — Gave back` render **red and unchecked by default** (BR-3/BR-4); planner may opt them in. Hazmat-uncertified carriers (BR-1) are excluded and never appear.
- **Actions row** (`Button`): `Send RFQ` (primary; disabled until a list is selected **and** every included carrier has both planned dates) · `Save Draft` (secondary) · `Cancel` (link).
- On `Send RFQ`: set Open, compute `closeAt = now + duration`, lock equipment/duration, generate one token link per included carrier, show a confirmation surfacing those links (the CE-1 stand-in — "each shipment its own email").

### Sub-tab 2 · Live Bids (Screen 4)
- **Header strip:** Quote ID (`QT-#####`) · status `Badge` · Opened / Closed times · List name · Award type (Manual/Auto) · **live `Countdown`** while Open.
- **Bid table — nested `GroupTable`:** each carrier bid is a group row carrying the outer columns via `values` (Carrier · Status · Linehaul · Fuel · Accessorials · Total · Submitted By · Response); **expanding** reveals that bid's charge breakdown as the nested `detailColumns` table (Code · Description · Amount). `stickyActions` pins an **Award** affordance on the right. Row status: `Lowest bid` (green), `Bid`, `Declined`, `No Bid Submitted` (written at close for silent carriers — never `Declined`, per SPB-17).
- **Tolerance panel:** bordered card with the auto-award math — Highest routed cost (benchmark; highest total routed cost on the guide, per-mile fallback) · Tolerance % · Tolerance ceiling · Lowest bid — capped by an `Alert`: `success` = within tolerance, `warning` = out. `Manual-review flag` forces review regardless.
- **Actions** (state-gated): Open → `Force Close`; Closed → `Award Carrier & Send to Tender` (primary, enabled when a winnable bid exists) · `Modify & Resend` · `Clear & Start Over`.

## Piece 2 — Carrier bid page (Screen 3)

Route `/spot-bid/:token`, rendered outside `AppShell`. **Mobile-first single column** (PRD §6 hard requirement). Minimal `OdysseyLogo` header, no nav, no login.

- **Countdown:** "Bid closes in MM:SS", red in the final 15 min.
- **Shipment Detail** card: Shipper (name only) · Equipment · Origin · Destination · Stops · Distance · Pickup · Delivery · Hazmat (+ MSDS link) · Special Services · Instructions. **Order ID and Load ID excluded** (SPB-05).
- **Your Bid:** Linehaul/Base (`MeasureField`, editable) · Fuel (read-only, precalculated) · one row per OCM accessorial code · computed Total — same rate anatomy as `QuoteModal`.
- **Actions** (`Button`): `Submit Bid` · `Update Bid` (while window open) · `Decline` (re-bid allowed while open). "Last submitted: $X by <user> · <time>" provenance line.
- **Token:** encodes `{ shipmentId, scac }`. Resolves the quote + that carrier's row; submitting writes the bid into the shared session store, so the planner's Live Bids reflects it live. Token invalid/expired (past `closeAt`) → a closed-window state.

## Piece 3 — Award → Tender handoff (Screen 5)

On Award: apply markup as a discrete `QMU QUOTE MARKUP` charge line (per the prototype cost record), append the winning carrier to the route guide as the **last row** flagged **SPOT RATE** (`Badge`), persist via the existing `saveTenderOption`, set tender status → `Sent` (tender pending). Add SPOT RATE badge rendering to `RoutingGuideTab` rows where `routeGroup === 'Spot'`.

**Decision (non-blocking):** append as **last row** (matches Kathleen's mockup + existing `QuoteModal` code). Legacy instead sorts the awarded carrier to rank one — recorded as a discrepancy, not built.

## Data & mock strategy — no reseed

- **Eligibility:** derived client-side from existing `routingData` tender statuses.
- **Carrier lists:** synthesized from the existing `carriers` pool (SCAC + name); contact emails generated client-side (`ops@<scac>.example.com`); a few named lists with default durations.
- **Live auction state:** a store keyed by `shipmentId`, holding `{ quoteId, list, durationMin, openAt, closeAt, status, awardType, carriers: [{ scac, name, email, incl, plannedPickup, plannedDelivery, flags, bid?: { linehaul, fuel, accessorials[], total, status, submittedBy, respondedAt } }] }`.
- **Cross-tab sync (load-bearing):** the carrier bid page is a **separate route/tab**, so an in-memory React store would NOT reach the planner's tab. The store is therefore backed by **`localStorage`** (same-origin, shared across tabs) with a `storage`-event listener so the planner's Live Bids updates live when a carrier submits from another tab. Reset via a "Clear & Start Over" action / key wipe (prototype-acceptable; no reload persistence guarantee needed beyond the demo session).
- **Bid arrival:** the carrier page writes real bids into the store; additionally a light auto-simulation drops 2–3 bids over the window (via `setTimeout`) so the planner side demos standalone. Both paths write through the same `localStorage`-backed store.
- **Award durability:** the awarded SPOT RATE row persists through the existing `saveTenderOption` path (already works). Only the transient auction is session-held.

A reseed (a real `spot_bids` schema) is deferred until the post-V1 Monitoring Board needs a populated cross-shipment history.

## Non-functionals honored

- Carrier page operable on mobile browsers (single column, large targets).
- Token expiry no later than quote close (`closeAt`).
- Tolerance math, markup and countdown are pure functions (unit-tested).
- Time handling follows the shipment TZ convention already used in `RoutingGuideTab` (`splitDateTime`/`joinDateTime`, tz offset display).

## New / changed files (indicative)

- `apps/odyssey-one/src/components/detail/SpotBoardTab.jsx` (+ `.css`) — the pane, two sub-tabs.
- `apps/odyssey-one/src/components/spotboard/` — `SetupCarriers.jsx`, `LiveBids.jsx`, `TolerancePanel.jsx`, `Countdown.jsx`, `spotStore.js` (session store + tolerance/markup helpers), `carrierList.js` (synth lists), `token.js` (encode/decode).
- `apps/odyssey-one/src/routes/CarrierBid.jsx` (+ `.css`) — the standalone carrier page.
- `BottomBar.jsx` — register `{ key:'spot', label:'SpotBoard' }` in `TABS` at index 4; add the pane to `renderTabContent`.
- `App.jsx` — add `/spot-bid/:token` route outside `AppShell`.
- `RoutingGuideTab.jsx` — SPOT RATE badge on `routeGroup:'Spot'` rows.

## Testing (Vitest, mirroring `QuoteModal.test.jsx`)

Unit-test the non-trivial logic: eligibility derivation · tolerance evaluation (benchmark, ceiling, within/out, manual-review override) · markup application (`QMU` line, opt-out) · countdown formatting + final-15-min threshold · token encode/decode + expiry · bid state transitions (Draft→Open→Closed→Awarded, `No Bid Submitted` at close). Plus a smoke render of each surface. No new DB, no reseed.

## Component reuse checklist ("only our components")

`Tab` · `DataTable` · nested `GroupTable` (`detailColumns` + `stickyActions`) · `Dropdown` · `FormField` · `Checkbox` · `MeasureField` · `DateField`/`DatePicker`/`TimePicker` · `Badge` · `Alert` · `Button` · `EmptyState` · `OdysseyLogo` · `SummaryStrip` (optional). **One new app-local piece:** `Countdown` (pure live-clock logic; no design-system primitive exists) — styled with `Badge variant="time"`.

## Parked (non-blocking, not built)

- Award rank-one (legacy) vs last-row (mockup) — going with last-row; flag if it ever matters.
- Leading-bid ("Best") display — `SHOW_BEST` off by default, future scope.
- Exact in-shipment placement ratification (David) — not on the critical path; "tab next to Tender" is the working target.
- Eventual logged-in carrier portal + auth model — contested (SPB-16), post-user-management.
