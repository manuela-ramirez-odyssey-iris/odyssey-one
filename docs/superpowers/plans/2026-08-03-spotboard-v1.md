# SpotBoard V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Code authorship:** per project model-tier policy, every task's tests + implementation are written by **Sonnet subagents**, TDD. This plan gives each task its exact files, interfaces, field names and concrete test cases (input → expected). The implementer writes the literal test and code.

**Goal:** Build SpotBoard V1 — a planner spot-bidding tab inside the shipment (next to Tender) and a standalone token-reached carrier bid page — composed from existing `@odyssey/ui` components, mock/interactive, no DB reseed.

**Architecture:** A new lazy pane (`SpotBoardTab`) in the shipment detail bar cloning the `RoutingGuideTab` pattern (sub-tab band + `Tab` + wide column), driving a per-shipment spot quote through `Eligible → Draft → Open → Closed → Awarded`. Auction state lives in a `localStorage`-backed store keyed by `shipmentId` so a separate carrier tab (`/spot-bid/:token`, outside `AppShell`) can submit bids the planner sees live via `storage` events. Award appends a SPOT RATE row to the existing Tender guide via the existing `saveTenderOption` path.

**Tech Stack:** React 19, Vite, Vitest + Testing Library, `@odyssey/ui` (`Tab`, `DataTable`, `GroupTable` nested, `Dropdown`, `FormField`, `Checkbox`, `DatePicker`/`TimePicker`, `Badge`, `Alert`, `Button`, `EmptyState`, `OdysseyLogo`), React Router.

> **S109 plan-review corrections (verified against the codebase before execution):**
> - `MeasureField` is **NOT** a `@odyssey/ui` export — it is app-local at `apps/odyssey-one/src/components/orders/create/fields/MeasureField.jsx`. Import it from there (Task 12).
> - `getLookupOptions('carrier', q)` is **async** (`RoutingGuideTab.jsx:252` is the usage pattern). Task 3's pure `buildCarrierRows(list, carrierOptions)` stays sync; the *caller* (Task 8) awaits the pool.
> - Do **not** import `Field`/`SectionHeader` from `RoutingGuideTab.jsx` (Task 7) — that pulls the 1300-line lazy Tender pane into the SpotBoard bundle, and `SectionHeader` collides with the `@odyssey/ui` export of the same name. Write the ~13-line `Field` local to `spotboard/`.
> - Test baseline in Task 13 is stale — assert **suite green**, not a count.
> - Eligibility population (verified in `tools/generate.mjs:641-667`): 30% of shipments are `tenderFailed` (all `Declined`/`Cancelled`) → spot-eligible; 70% correctly hit the `EmptyState`. Demo from the **Exceptions** tab.

**Spec:** `docs/superpowers/specs/2026-08-03-spotboard-v1-design.md`. Field/label/value source of truth: canon `vault/10-domains/spotboard/spotboard.md` §6–§7 + `data/quote-model.md`.

---

## File structure

```
apps/odyssey-one/src/
├── spotboard/                          (new — pure logic + shared bits)
│   ├── tolerance.js                    (benchmark, ceiling, within/out, markup)
│   ├── tolerance.test.js
│   ├── token.js                        (encode/decode/expiry of carrier token)
│   ├── token.test.js
│   ├── carrierList.js                  (synth named lists + emails from carrier pool)
│   ├── carrierList.test.js
│   ├── eligibility.js                  (derive spot-eligibility from routingData)
│   ├── eligibility.test.js
│   ├── spotStore.js                    (localStorage store + state machine + events)
│   ├── spotStore.test.js
│   ├── useSpotQuote.js                 (React hook over spotStore + storage sync)
│   ├── Countdown.jsx                   (live clock)
│   ├── Countdown.test.jsx
│   ├── TolerancePanel.jsx
│   ├── SetupCarriers.jsx
│   ├── LiveBids.jsx
│   └── spotboard.css
├── components/detail/
│   ├── SpotBoardTab.jsx                (pane composing the two sub-tabs + gate)
│   └── BottomBar.jsx                   (MODIFY — register the tab)
├── routes/
│   └── CarrierBid.jsx                  (standalone external page)
└── App.jsx                             (MODIFY — /spot-bid/:token route)
```

---

## Task 1: Tolerance, benchmark & markup logic

**Files:**
- Create: `apps/odyssey-one/src/spotboard/tolerance.js`
- Test: `apps/odyssey-one/src/spotboard/tolerance.test.js`

**Interface:**
```
benchmark(routingOptions: RoutingOptionVM[], { ratePerMile, distanceMi }): number
  → highest total routed cost among options with a numeric cost; if none, ratePerMile * distanceMi (per-mile fallback)
evaluateTolerance({ lowestBid, benchmark, tolerancePct, monetaryCap?, totalCap?, manualReview }): 
  → { ceiling: number, withinTolerance: boolean, reason: 'within'|'out-of-tolerance'|'total-cap'|'manual-review' }
  ceiling = benchmark * (1 + tolerancePct/100); if monetaryCap set, ceiling = min(ceiling, benchmark + monetaryCap)
  withinTolerance = lowestBid <= ceiling AND (totalCap == null || lowestBid <= totalCap) AND !manualReview
applyMarkup(bid: {linehaul, fuel, accessorials: {code,amount}[]}, markup: {type:'pct'|'flat', value}):
  → { charges: {code,description,amount}[] , total }  — appends a QMU/'QUOTE MARKUP' line:
     pct → round2((linehaul+fuel+sumAccessorials) * value/100); flat → value; total = sum of all lines incl QMU
```
Money helpers already exist at `apps/odyssey-one/src/utils/money.js` (`parseDollar`, `fmtDollar`) — reuse; round to 2dp.

- [ ] **Step 1: Write failing tests** — assert:
  - `benchmark([{cost:'$2,800 USD'},{cost:'$2,500 USD'}], …) === 2800`
  - `benchmark([], {ratePerMile:2, distanceMi:900}) === 1800`
  - `evaluateTolerance({lowestBid:2540, benchmark:2800, tolerancePct:5, manualReview:false})` → `{ceiling:2940, withinTolerance:true, reason:'within'}`
  - `evaluateTolerance({lowestBid:3000, benchmark:2800, tolerancePct:5, manualReview:false})` → `withinTolerance:false, reason:'out-of-tolerance'`
  - `evaluateTolerance({lowestBid:2540, benchmark:2800, tolerancePct:5, manualReview:true})` → `withinTolerance:false, reason:'manual-review'`
  - `evaluateTolerance({lowestBid:2900, benchmark:2800, tolerancePct:10, totalCap:2850})` → `withinTolerance:false, reason:'total-cap'`
  - `applyMarkup({linehaul:2540, fuel:0, accessorials:[]}, {type:'flat', value:150}).total === 2690` and the last charge is `{code:'QMU', amount:150}`
  - `applyMarkup({linehaul:100, fuel:0, accessorials:[]}, {type:'pct', value:50}).total === 150`
- [ ] **Step 2: Run** `npx vitest run src/spotboard/tolerance.test.js` — expect FAIL (module missing).
- [ ] **Step 3: Implement** `tolerance.js` to satisfy the assertions.
- [ ] **Step 4: Run** `npx vitest run src/spotboard/tolerance.test.js` — expect PASS.
- [ ] **Step 5: Commit** `feat(spotboard): tolerance, benchmark & markup logic`.

---

## Task 2: Carrier token encode/decode/expiry

**Files:**
- Create: `apps/odyssey-one/src/spotboard/token.js`
- Test: `apps/odyssey-one/src/spotboard/token.test.js`

**Interface:**
```
encodeToken({ shipmentId, scac }): string    — URL-safe base64 of JSON (btoa + replace +/=)
decodeToken(token: string): { shipmentId, scac } | null   — null on malformed input
```
Prototype-grade only (not signed/secure); expiry is enforced by the quote's `closeAt`, checked by the caller (Task 4/10), not by the token itself.

- [ ] **Step 1: Write failing tests** — `decodeToken(encodeToken({shipmentId:'0000000091105', scac:'ODFL'}))` deep-equals the input; `decodeToken('!!bad!!') === null`; token is URL-safe (no `+`, `/`, `=`).
- [ ] **Step 2: Run** `npx vitest run src/spotboard/token.test.js` — FAIL.
- [ ] **Step 3: Implement** `token.js`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(spotboard): carrier token encode/decode`.

---

## Task 3: Carrier-list synthesis + eligibility

**Files:**
- Create: `apps/odyssey-one/src/spotboard/carrierList.js`, `apps/odyssey-one/src/spotboard/eligibility.js`
- Test: `apps/odyssey-one/src/spotboard/carrierList.test.js`, `apps/odyssey-one/src/spotboard/eligibility.test.js`

**Context:** carrier pool is `await getLookupOptions('carrier', q)` — **async**, from `src/api/services/lookupService` (label `"SCAC - Name"`), already used by `RoutingGuideTab.jsx:252`. Do NOT hardcode a copy. `buildCarrierRows` itself stays a pure sync function over an already-resolved options array.

**Interface — carrierList.js:**
```
NAMED_LISTS: [{ id, name, equipment, defaultDurationMin }]  — e.g.
  {id:'tl-se', name:'TL Southeast Overflow', equipment:'Van', defaultDurationMin:120}
  {id:'ltl-comp', name:'LTL Comparable Set', equipment:'LTL', defaultDurationMin:240}
buildCarrierRows(list, carrierOptions): CarrierRow[]
  CarrierRow = { scac, name, email, equipment, incl, plannedPickup:'', plannedDelivery:'', flags:string[] }
  email = `ops@${scac.toLowerCase()}.example.com`
  incl default true, EXCEPT rows with flag 'Routed' or 'Waffled' → incl:false
  (flags are assigned deterministically for the demo: seed a couple of rows 'Routed'/'Waffled' by index)
```
**Interface — eligibility.js:**
```
isSpotEligible(routingData): boolean
  → false if any option.status === 'Accepted' || 'Sent' (an active/accepted tender exists); true otherwise
eligibilityReason(routingData): string   — human line for the ineligible EmptyState
```

- [ ] **Step 1: Write failing tests** — `buildCarrierRows` returns rows with synthesized emails, ≥1 row flagged `Routed` with `incl:false`; `isSpotEligible({options:[{status:'Accepted'}]}) === false`; `isSpotEligible({options:[{status:'Declined'},{status:'Cancelled'}]}) === true`; `isSpotEligible({options:[]}) === true`.
- [ ] **Step 2: Run** both test files — FAIL.
- [ ] **Step 3: Implement** both modules.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(spotboard): carrier-list synthesis + eligibility`.

---

## Task 4: localStorage-backed spot store + state machine

**Files:**
- Create: `apps/odyssey-one/src/spotboard/spotStore.js`
- Test: `apps/odyssey-one/src/spotboard/spotStore.test.js`

**Quote shape:**
```
Quote = { quoteId, shipmentId, listId, listName, durationMin, openAt:null|ms, closeAt:null|ms,
          status:'draft'|'open'|'closed'|'awarded', awardType:null|'manual'|'auto', awardedScac:null,
          carriers: CarrierRow[]  // CarrierRow gains bid?: { linehaul, fuel, accessorials:{code,description,amount}[], total, status:'bid'|'declined', submittedBy, respondedAt } }
```
**Interface (all persist to `localStorage` under key `spotboard:<shipmentId>`):**
```
getQuote(shipmentId): Quote | null
saveDraft(shipmentId, { listId, listName, durationMin, carriers }): Quote   // status 'draft'
sendRFQ(shipmentId, nowMs): Quote            // draft→open; sets openAt=now, closeAt=now+durationMin*60000; lock
submitBid(shipmentId, scac, bid, nowMs): Quote   // writes carrier.bid; no-op if status!=='open' or now>closeAt
declineBid(shipmentId, scac, nowMs): Quote
closeQuote(shipmentId, nowMs): Quote          // open→closed; silent carriers → bid.status stays absent (rendered 'No Bid Submitted')
award(shipmentId, scac, awardType): Quote     // closed→awarded; sets awardedScac, awardType
clearQuote(shipmentId): void                  // removes the key
lowestBid(quote): CarrierRow | null           // min total among carriers with bid.status==='bid'
subscribe(shipmentId, cb): () => void         // window 'storage' event → cb(getQuote)
```
Tests use `vi.useFakeTimers()` where time matters; jsdom provides `localStorage`.

- [ ] **Step 1: Write failing tests** — round-trip `saveDraft`→`getQuote`; `sendRFQ` sets `status:'open'` and `closeAt = openAt + durationMin*60000`; `submitBid` after `closeAt` is a no-op; `lowestBid` picks the min-total bidding carrier ignoring declines; `award` sets `status:'awarded'` + `awardedScac`; `clearQuote` → `getQuote` null.
- [ ] **Step 2: Run** `npx vitest run src/spotboard/spotStore.test.js` — FAIL.
- [ ] **Step 3: Implement** `spotStore.js`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(spotboard): localStorage spot store + state machine`.

---

## Task 5: `useSpotQuote` hook

**Files:**
- Create: `apps/odyssey-one/src/spotboard/useSpotQuote.js`
- Test: `apps/odyssey-one/src/spotboard/useSpotQuote.test.jsx`

**Interface:** `useSpotQuote(shipmentId)` → `{ quote, saveDraft, sendRFQ, submitBid, declineBid, closeQuote, award, clearQuote }`. Wraps `spotStore`, holds `quote` in state, re-reads on `spotStore.subscribe` (cross-tab) and after every mutation. Actions are bound to `shipmentId`.

- [ ] **Step 1: Write failing test** — render the hook (Testing Library `renderHook`), call `saveDraft`, assert `result.current.quote.status === 'draft'`; simulate a `storage` event and assert the hook re-reads.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the hook.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(spotboard): useSpotQuote hook with cross-tab sync`.

---

## Task 6: `Countdown` component

**Files:**
- Create: `apps/odyssey-one/src/spotboard/Countdown.jsx`
- Test: `apps/odyssey-one/src/spotboard/Countdown.test.jsx`

**Contract:** `<Countdown closeAt={ms} onExpire?={fn} />` — renders `Badge variant="time"` with `MM:SS` remaining, updates each second via `setInterval`, adds class `countdown--urgent` when < 15 min remain, renders `Closed` and fires `onExpire` once at 0. Use `vi.useFakeTimers()`.

- [ ] **Step 1: Write failing test** — with `closeAt = now + 20*60000`, renders `20:00`; advance 6 min → `14:00` and has `countdown--urgent`; advance past close → `Closed`, `onExpire` called once.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `Countdown.jsx`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(spotboard): Countdown component`.

---

## Task 7: `TolerancePanel` component

**Files:**
- Create: `apps/odyssey-one/src/spotboard/TolerancePanel.jsx` (+ styles in `spotboard.css`)
- Test: `apps/odyssey-one/src/spotboard/TolerancePanel.test.jsx`

**Contract:** `<TolerancePanel benchmark tolerancePct lowestBid manualReview .../>` — a bordered card (write a local ~13-line `Field` in `spotboard/`; do NOT import from `RoutingGuideTab`) showing Highest routed cost (benchmark) · Tolerance % · Ceiling · Lowest bid, and an `Alert` verdict: `variant="success"` "Within tolerance — eligible for auto-award" when `evaluateTolerance().withinTolerance`, else `variant="warning"` with the `reason`. Uses `evaluateTolerance` from Task 1 (do not recompute inline).

- [ ] **Step 1: Write failing test** — with within-tolerance inputs renders an `Alert` containing "Within tolerance"; with out-of-tolerance inputs renders a warning `Alert`; the ceiling value shown equals `evaluateTolerance(...).ceiling` formatted.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the component.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(spotboard): TolerancePanel`.

---

## Task 8: `SetupCarriers` sub-tab

**Files:**
- Create: `apps/odyssey-one/src/spotboard/SetupCarriers.jsx`
- Test: `apps/odyssey-one/src/spotboard/SetupCarriers.test.jsx`

**Contract:** `<SetupCarriers quote header carrierOptions readOnly onSaveDraft onSendRFQ onCancel />`
- Context header (6 read-only `Field`s): Origin · Destination · Equipment · Distance · Hazmat · Pickup Window (from `header`, derived from shipment detail upstream).
- Toolbar: `Dropdown` Carrier List (options `NAMED_LISTS`) · `FormField` numeric Quote Duration (1–99,999) · `Checkbox` Flexible Pickup.
- Carrier `DataTable` (TanStack, mirror `DataTable` usage in the app): columns Incl. (`Checkbox` cell) · Carrier (`SCAC · Name`) · Equip · Contact Email · Planned Pickup (`DatePicker`/`DateField` cell) · Planned Delivery (cell) · Flags (`Badge`, red for Routed/Waffled). Selecting a Carrier List repopulates rows via `buildCarrierRows`.
- Actions: `Button` primary `Send RFQ` **disabled** unless a list is chosen and every `incl` row has both dates; `Button` secondary `Save Draft`; `Button` link `Cancel`.
- When `readOnly` (quote status `open`/`closed`): inputs disabled, actions hidden (per state matrix).

- [ ] **Step 1: Write failing tests** — `Send RFQ` disabled with no dates; becomes enabled after selecting a list and filling dates for included rows; `onSendRFQ` called with the assembled `{listId, listName, durationMin, carriers}`; `readOnly` hides the action buttons.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the component.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(spotboard): Setup & Carriers sub-tab`.

---

## Task 9: `LiveBids` sub-tab (nested GroupTable)

**Files:**
- Create: `apps/odyssey-one/src/spotboard/LiveBids.jsx`
- Test: `apps/odyssey-one/src/spotboard/LiveBids.test.jsx`

**Contract:** `<LiveBids quote onForceClose onAward onModify onClear />`
- Header strip: Quote ID · status `Badge` · Opened/Closed times · List name · Award type · `<Countdown>` while `status==='open'`.
- **Nested `GroupTable`:** `columns` = Carrier · Status · Linehaul · Fuel · Accessorials · Total · Submitted By · Response; one `group` per carrier with `values` filling those columns (Status via `Badge`: green `Lowest bid` on the `lowestBid` row, `Bid`, `Declined`, or `No Bid Submitted` when no bid and status closed); `detailColumns` = Code · Description · Amount; each group's nested rows = that bid's `accessorials` (+ linehaul/fuel lines). `stickyActions` pinned column with an Award `Button` per biddable row; `actionsHeader` empty.
- `TolerancePanel` shown when `status==='closed'` (benchmark from the shipment's routing options, lowest from `lowestBid(quote)`).
- Actions row: `status==='open'` → `Force Close`; `status==='closed'` → `Award Carrier & Send to Tender` (primary, enabled when `lowestBid` exists) · `Modify & Resend` · `Clear & Start Over`.

- [ ] **Step 1: Write failing tests** — a closed quote with 3 bids renders the lowest with a green `Lowest bid` badge; a silent carrier renders `No Bid Submitted` (not `Declined`); expanding a bid row reveals its charge breakdown (nested table shows the accessorial codes); `onAward` fires with the lowest carrier's scac; open-state shows `Force Close`, closed-state shows `Award`/`Modify`/`Clear`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the component.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(spotboard): Live Bids sub-tab with nested GroupTable`.

---

## Task 10: `SpotBoardTab` pane + BottomBar registration

**Files:**
- Create: `apps/odyssey-one/src/components/detail/SpotBoardTab.jsx`
- Modify: `apps/odyssey-one/src/components/detail/BottomBar.jsx` (TABS + renderTabContent)

**Contract:** `<SpotBoardTab shipmentDetails shipment />`
- Derives `header` (origin/destination/equipment/distance/hazmat/pickup-window) from `shipmentDetails`.
- Gate: `if (!isSpotEligible(shipmentDetails.routingData)) return <EmptyState … message={eligibilityReason(...)} />`.
- `useSpotQuote(shipment.sellShipment)` for state; sub-tab band (`pane-tabs-band` + `Tab`) with **Setup & Carriers** / **Live Bids**; renders `SetupCarriers` (readOnly when status is open/closed) and `LiveBids` accordingly.
- Auto-simulation: on `sendRFQ`, schedule 2–3 `submitBid` calls over the window via `setTimeout` (demo convenience; guarded so it no-ops after close/award/clear).
- Award handler passed down calls `onAward` (Task 11 wiring) then `award(...)`.

**BottomBar changes:**
- Add `{ key: 'spot', label: 'SpotBoard' }` to `TABS` **at index 4** (immediately after `{ key:'routing', label:'Tender' }`).
- Add `case 'spot': return <SpotBoardTab shipmentDetails={shownDetails} shipment={shipment} />` to `renderTabContent`, lazy-imported like the other panes.

- [ ] **Step 1: Write failing test** — render `SpotBoardTab` with an eligible `shipmentDetails` → shows the two sub-tabs; with an `Accepted` tender in `routingData` → shows the `EmptyState`. (Testing Library.)
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `SpotBoardTab.jsx` + register in `BottomBar.jsx`.
- [ ] **Step 4: Run** the test + `npx vitest run src/components/detail` — PASS.
- [ ] **Step 5: Commit** `feat(spotboard): SpotBoard planner tab in the detail bar`.

---

## Task 11: Award → Tender handoff + SPOT RATE badge

**Files:**
- Modify: `apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx`
- Create: `apps/odyssey-one/src/spotboard/award.js` (+ test)

**Interface — award.js:**
```
buildSpotRateOption(winningCarrier, quote, existingOptions, markup): RoutingOptionVM
  → a routing option like QuoteModal's add-path (rank = max+1, routeGroup:'Spot', rateSource:'Spot',
    status:'Sent'), cost/AP from applyMarkup(...).total, carries a `spotRate:true` marker for the badge.
```
**RoutingGuideTab changes:** in the carrier-name (or status) cell, when `option.routeGroup === 'Spot'` (or `option.spotRate`), render a `Badge variant="amber"` "SPOT RATE" beside the carrier. The Award handler (invoked from `SpotBoardTab`) appends `buildSpotRateOption(...)` and calls the existing `saveTenderOption(shipment.sellShipment, option)` — reuse, do not duplicate.

- [ ] **Step 1: Write failing tests** — `buildSpotRateOption` returns `{routeGroup:'Spot', rateSource:'Spot', status:'Sent', rank: existingMax+1}` with `cost` reflecting markup; a `RoutingGuideTab` render with a `routeGroup:'Spot'` option shows a "SPOT RATE" badge.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `award.js` + the badge in `RoutingGuideTab.jsx`.
- [ ] **Step 4: Run** `npx vitest run src/spotboard/award.test.js src/components/detail` — PASS.
- [ ] **Step 5: Commit** `feat(spotboard): award to Tender as SPOT RATE row`.

---

## Task 12: Carrier bid page + route

**Files:**
- Create: `apps/odyssey-one/src/routes/CarrierBid.jsx` (+ styles)
- Modify: `apps/odyssey-one/src/App.jsx` (route outside AppShell)
- Test: `apps/odyssey-one/src/routes/CarrierBid.test.jsx`

**Contract:** `CarrierBid` reads `:token` (React Router `useParams`), `decodeToken` → `{shipmentId, scac}`; loads the quote via `spotStore.getQuote(shipmentId)`; if missing/closed/expired → a closed-window message. Otherwise renders, **mobile-first single column**, no `AppShell`:
- `OdysseyLogo` header (no nav).
- `<Countdown closeAt={quote.closeAt} />`.
- Shipment Detail card: Shipper (name only) · Equipment · Origin · Destination · Stops · Distance · Pickup · Delivery · Hazmat (+ MSDS link) · Special Services · Instructions. **No Order/Load ID.**
- Your Bid: `MeasureField` Linehaul/Base (editable) · Fuel (read-only) · accessorial rows (OCM codes) · computed Total (reuse the AP-summary pattern from `QuoteModal`).
- `Button`s: Submit / Update (while open) / Decline → `spotStore.submitBid`/`declineBid`; "Last submitted by…" line when a prior bid exists.

**App.jsx change:** add `<Route path="/spot-bid/:token" element={<CarrierBid />} />` as a sibling of the other routes but rendered WITHOUT `AppShell` (CarrierBid renders its own bare shell), lazy-imported.

- [ ] **Step 1: Write failing tests** — visiting `/spot-bid/<token>` for an open quote renders the bid form and NO sidebar/navbar; submitting writes a bid to `spotStore` for that `scac`; an expired/closed quote shows the closed-window state; Order/Load ID never appears in the DOM.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `CarrierBid.jsx` + the route.
- [ ] **Step 4: Run** `npx vitest run src/routes/CarrierBid.test.jsx` — PASS.
- [ ] **Step 5: Commit** `feat(spotboard): standalone carrier bid page`.

---

## Task 13: End-to-end smoke + full suite

**Files:**
- Create: `apps/odyssey-one/src/spotboard/e2e.test.jsx`

- [ ] **Step 1: Write failing test** — drive the store end to end: `saveDraft` → `sendRFQ` → `submitBid` (two carriers) → `closeQuote` → `lowestBid` picks the min → `award` → `buildSpotRateOption` yields a `routeGroup:'Spot'` row with markup applied. Assert each transition.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3:** No new impl expected; fix any integration gaps surfaced.
- [ ] **Step 4: Run full suite** `npx vitest run` (app) — expect **all green** (record the new total; do not assert a pre-set number, the S108 baseline was stale). Run `npm run build:odyssey-one` — expect green.
- [ ] **Step 5: Commit** `test(spotboard): end-to-end auction flow + suite green`.

---

## Self-review notes

- **Spec coverage:** planner tab (Tasks 8–10), carrier page (Task 12), award handoff (Task 11), tolerance/markup (Task 1), countdown (Task 6), no-reseed store + cross-tab sync (Tasks 4–5), eligibility gate (Tasks 3, 10), SPOT RATE badge (Task 11). Out-of-scope items (board, history, portal, notifications, analytics, multi-currency, leading-bid) have no tasks — correct.
- **Nested GroupTable** used in Task 9 per the design.
- **No new dependencies**; all UI from `@odyssey/ui`; `Countdown` is the only new (app-local) piece, Task 6.
- **Reseed:** none — award persists via existing `saveTenderOption`; auction is `localStorage`.
- **Field names** (`routeGroup`, `rateSource`, `sellShipment`, `routingData.options`, `cost`) match the existing `RoutingOptionVM` / `RoutingGuideTab` and the spec.
- **Parked (no task):** award rank-one vs last-row → last-row (Task 11); David placement ratification; eventual carrier portal/auth.
