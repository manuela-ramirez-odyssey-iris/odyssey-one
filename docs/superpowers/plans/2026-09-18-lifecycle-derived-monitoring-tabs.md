# Lifecycle-Derived Monitoring Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every seeded shipment's Monitoring tab (`approved` / `sent` / `consolidation` / `hold` / `spotbid`), its tender status, its history and its orders' status are all derived from ONE lifecycle state, so the tabs stop contradicting the rows they hold and the pre-tender pool Dave describes actually exists in the data.

**Architecture:** `tools/generate.mjs` already draws one `scenarioRoll` per shipment (line ~964) and derives routing-option statuses, `tenderStatus`, `shipmentStatus` and `panel` from it. Two things break from that: monitoring `category` is a separate random `weightedPick`, and there is no pre-tender scenario at all (the `: 'Sent'` fallback at :1144 makes tendering universal). This plan adds two lifecycle bands (pre-tender, spot), derives `category` and the order status from the lifecycle, gates the tender history on it, and accepts ONE deliberate renumber of internal `sellShipment`/`buyShipment` ids — re-anchoring every hardcoded seeded id in the same change. The Odyssey Shipment Identifier (`O…`/`C…`) and order numbers come off counters and do **not** change.

**Tech Stack:** Node ESM generator (`tools/generate.mjs`, faker seeded 42), `node:test` (`tools/generate.test.mjs`, slow — builds the corpus), vitest (`src/**`), Neon via `tools/seed.mjs --reseed`.

**Rulings this encodes** (Dave Schultz — designed the legacy TMS, highest authority on shipments; call 2026-09-17, `vault/00-inbox/Planning and Consolidation.vtt`):
- Every new shipment starts in **Optimization pool** (= our `consolidation` tab), **Hold**, or **Review** — never tendering (00:21:30). Pool exit is a timer, later.
- The pool holds shipments *eligible for consolidation*; Hold holds ones that are not / too early. *"You can't put a tendered direct shipment in a consolidation"* (00:08:15).
- A load is always in a shipment from the moment the order exists (00:02:02) → every shipped order is **`Planned Shipment`**; a failed *tender* is not a failed *shipment*.

**SpotBoard entry** (PRD §2 / Feature 1, canon `vault/10-domains/spotboard/spotboard.md`, SPB-12): a planner initiates a spot bid when the route guide is *exhausted, has no carriers for the lane, or lead time is too short*; *"can only start overflow when there is no active / accepted tender"*. So a `spotbid` row has **no** Sent/Accepted option — its routing options are all Declined/Cancelled (or there were none).

**Decisions taken by us, logged as provisional (user 2026-09-18: "silent resolve"):**
- Pool vs Hold = the order's **Consolidatable** flag alone (no OCM veto). A multi-order (`C`) shipment is pool-eligible by construction.
- Pre-tender rows keep `shipmentStatus: ''` — no new status enum (would ripple into the search vocabulary and the Cognizant progression sheets). The tab carries the meaning; the badge shows `—`.
- Distribution of ALL shipments: **Accepted 28% · Sent 14% · pre-tender 21% · spot 7% · all-failed → exceptions 30%**. Of monitoring that is ≈ approved 40 / sent 20 / pool+hold 30 / spotbid 10, with pool:hold ≈ 70:30 from the existing consolidatable rate.
- **Renumber accepted** (user: "dont worry about anything that user saved… we are doing a prototype"). Internal sell/buy ids re-mint; names and order numbers don't.

**Out of scope (say so in the wrap):** exceptions-panel categories (`date-issues`, `routing-review`, `tender-issues`, `tender-review`, `bid-review`) stay a weighted random pick — deriving them needs exception-type modelling that doesn't exist; pickup dates are all in the past (Jan–Jun 2026) so "pre-tender" is a state, not a date-coherent fact; no "Spot bid initiated" history event is invented (none exists in the catalog).

---

## File structure

| File | Responsibility |
|---|---|
| **Modify** `apps/odyssey-one/tools/generate.mjs` | the lifecycle: scenario bands, routing statuses, tender/shipment status, panel+category, history gating, carrier label, order status, consolidatable coherence |
| **Modify** `apps/odyssey-one/tools/generate.test.mjs` | new distribution + coherence invariants; existing assertions that assumed universal tendering |
| **Modify** `apps/odyssey-one/src/data/shipments.json` | regenerated (committed file) |
| **Modify** ~6 `src/**/*.test.*` files | re-anchor hardcoded seeded ids to rows satisfying the same predicate (list in Task 6) |
| **Modify** `vault/10-domains/shipments/decisions/decision-log.md` | DEC entries |

Run from `apps/odyssey-one/`. `node --test tools/generate.test.mjs` takes ~4–5 min. Commit subjects carry **`S151: `**.

---

### Task 1: One lifecycle per shipment — five bands, two of them new

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs:960-1000` (the `scenarioRoll` block and the `routingOptions.map` status assignment)
- Test: `apps/odyssey-one/tools/generate.test.mjs` (append)

- [ ] **Step 1: Write the failing distribution test**

Append to `generate.test.mjs` (it already imports `buildDataset`; reuse the file's helpers):

```js
test('lifecycle bands: pre-tender and spot exist, and the mix is what was decided (S151)', () => {
  const ds = buildDataset()
  const n = ds.shipments.length
  const share = (pred) => ds.shipments.filter(pred).length / n
  // Decided 2026-09-18 — see the plan header. Tolerances are ±4 points on 2,200 rows.
  const accepted = share((s) => s.tenderStatus === 'Accepted')
  const sent     = share((s) => s.tenderStatus === 'Sent')
  const preTender = share((s) => s.tenderStatus === '' && s.panel === 'monitoring')
  const spot     = share((s) => s.category === 'spotbid')
  const failed   = share((s) => s.panel === 'exceptions' && s.category !== 'order-change')
  assert.ok(Math.abs(accepted - 0.28) < 0.04 + 0.05, `accepted ${accepted.toFixed(3)}`)   // +order-change diversion pulls ~15% of these out
  assert.ok(Math.abs(sent - 0.14) < 0.04 + 0.03, `sent ${sent.toFixed(3)}`)
  assert.ok(Math.abs(preTender - 0.21) < 0.04, `pre-tender ${preTender.toFixed(3)}`)
  assert.ok(Math.abs(spot - 0.07) < 0.03, `spot ${spot.toFixed(3)}`)
  assert.ok(preTender > 0.15, 'the pool Dave describes must actually exist in the data')
})
```

- [ ] **Step 2: Run — expect FAIL** (`pre-tender 0.000` — no such rows today)

Run: `node --test tools/generate.test.mjs` (slow). You may temporarily run only this test with `--test-name-pattern="lifecycle bands"`.

- [ ] **Step 3: Replace the scenario block**

Replace lines ~963-970 (from `// Determine tendering scenario` through the `decisiveRank` line) with:

```js
  // ── Lifecycle — ONE draw, everything downstream derives from it (S151) ──
  // Dave Schultz (2026-09-17): every shipment is created into the optimization
  // pool / Hold / Review and only LATER tenders; the pool is exactly where
  // manual consolidation picks from, so it has to exist in the seed. Spot is
  // the PRD's overflow: the guide was exhausted (every carrier declined) and
  // a planner opened a bid — never an active tender (PRD Feature 1).
  //   accepted   28%  → Monitoring › Approved
  //   sent       14%  → Monitoring › Tender Sent
  //   preTender  21%  → Monitoring › Consolidation (pool-eligible) | Hold
  //   spot        7%  → Monitoring › SpotBid   (all options declined/cancelled)
  //   failed     30%  → Exceptions (all options declined/cancelled)
  // Shares decided 2026-09-18 (user: "you decide this").
  const scenarioRoll = faker.number.float({ min: 0, max: 1 });
  const lifecycle =
    scenarioRoll < 0.28 ? 'accepted' :
    scenarioRoll < 0.42 ? 'sent' :
    scenarioRoll < 0.63 ? 'preTender' :
    scenarioRoll < 0.70 ? 'spot' : 'failed';
  const tenderCompleted  = lifecycle === 'accepted';
  const tenderInProgress = lifecycle === 'sent';
  const preTender        = lifecycle === 'preTender';
  const isSpot           = lifecycle === 'spot';
  const tenderFailed     = lifecycle === 'failed' || isSpot; // every carrier answered no
  // Pool vs Hold is the order's Consolidatable flag (Ramesh: "Allow
  // Optimization"); the orders built below INHERIT this so the header flag,
  // the tab and the history all say the same thing. A multi-order shipment is
  // pool-eligible by construction (it IS a consolidation).
  const poolEligible = orderCount > 1 || faker.datatype.boolean(0.70);
  // Which rank is the "decisive" carrier (accepted or currently sent) — not
  // used when nobody was tendered (preTender) or everybody declined (failed/spot).
  const decisiveRank = (tenderCompleted || tenderInProgress) ? faker.number.int({ min: 1, max: routingCount }) : null;
```

Check the name `orderCount` is already in scope at this point (it is used at :1663 `const isConsolidation = orderCount > 1`; find where it is declared — if it is declared AFTER this block, use `orders.length` instead and say so in the report).

- [ ] **Step 4: Make pre-tender produce untendered options**

In the `routingOptions.map` status assignment, the first branch is `if (tenderFailed) { status = pick(['Declined', 'Cancelled']); }`. Insert a branch BEFORE it:

```js
    if (preTender) {
      // Routing happened (options exist, rates exist) but nothing was tendered
      // yet — the shipment is parked in the pool/Hold until its window (Dave).
      status = null;
    } else if (tenderFailed) {
```

- [ ] **Step 5: Run the distribution test — it will still FAIL** on `preTender` because `panel`/`tenderStatus` still classify untendered rows as exceptions (Task 2 fixes that). Confirm the failure message moved from `0.000` to a wrong-panel count, then commit.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/tools/generate.mjs apps/odyssey-one/tools/generate.test.mjs
git commit -m "S151: one lifecycle draw per shipment — pre-tender and spot become real states"
```

---

### Task 2: Derive tender status, shipment status, panel and category from the lifecycle

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs:1140-1170`

- [ ] **Step 1: Write the failing coherence test** (append to `generate.test.mjs`)

```js
test('monitoring tabs agree with tender state — the S151 invariant', () => {
  const ds = buildDataset()
  for (const s of ds.shipments) {
    if (s.panel !== 'monitoring') continue
    switch (s.category) {
      case 'approved':      assert.equal(s.tenderStatus, 'Accepted', s.sellShipment); break
      case 'sent':          assert.equal(s.tenderStatus, 'Sent', s.sellShipment); break
      case 'consolidation':
      case 'hold':          assert.equal(s.tenderStatus, '', `${s.sellShipment} in the pool but tendered`); assert.equal(s.shipmentStatus, ''); break
      case 'spotbid':       assert.ok(['Declined', 'Cancelled'].includes(s.tenderStatus), `${s.sellShipment} in spot with an active tender (PRD Feature 1)`); break
      default: assert.fail(`${s.sellShipment} unknown monitoring category ${s.category}`)
    }
  }
  // Every monitoring category must be populated — an empty tab is a regression.
  for (const c of ['approved', 'sent', 'consolidation', 'hold', 'spotbid'])
    assert.ok(ds.shipments.some((s) => s.panel === 'monitoring' && s.category === c), `no rows in ${c}`)
})
```

- [ ] **Step 2: Run — expect FAIL** (today `consolidation` rows are Accepted)

- [ ] **Step 3: Rewrite the derivation block**

Replace lines ~1140-1166 (from `const routingStatuses = …` through the `let validationMessage = …` statement) with:

```js
  const routingStatuses = routingOptions.map(r => r.status).filter(Boolean);
  const hasAccepted = routingStatuses.includes('Accepted');
  const hasSent = routingStatuses.includes('Sent');
  // tenderStatus = the active option's status, or the last real carrier answer
  // when every carrier said no, or '' when nothing has been tendered yet
  // (preTender: routingStatuses is EMPTY by construction — Task 1).
  const tenderStatus = hasAccepted ? 'Accepted' : hasSent ? 'Sent'
    : (routingStatuses.length > 0 ? routingStatuses[0] : '');
  // shipmentStatus: Done once a carrier committed; Review when the tender
  // failed and a human must act; '' while mid-flight OR parked pre-tender
  // (decided 2026-09-18: no new "Consolidation"/"Hold" status value — the tab
  // carries that meaning; a new enum would ripple into the search vocabulary).
  // `let`: the order-change diversion below is the ONE legitimate override.
  let shipmentStatus = hasAccepted ? 'Done' : (hasSent || preTender || isSpot) ? '' : 'Review';

  // Panel + category DERIVED from the lifecycle — the category used to be a
  // separate weighted pick that never looked at the tender state beside it,
  // which put 137 tender-accepted shipments in the pool and made "Tender Sent"
  // 84% already-accepted (measured 2026-09-17, S150). Exceptions categories
  // stay a weighted pick: nothing in the data distinguishes a date issue from a
  // routing review yet (out of scope, see plan header).
  let panel = (lifecycle === 'failed') ? 'exceptions' : 'monitoring';
  const originalPanel = panel; // see NOTE_BUCKET_WEIGHTS comment below — must stay
  let category;
  if (panel === 'exceptions') {
    category = weightedPick(CATEGORY_WEIGHTS.exceptions.items, CATEGORY_WEIGHTS.exceptions.weights);
  } else if (hasAccepted) {
    category = 'approved';
  } else if (hasSent) {
    category = 'sent';
  } else if (isSpot) {
    category = 'spotbid';
  } else {
    category = poolEligible ? 'consolidation' : 'hold';
  }
  let validationMessage = (panel === 'exceptions' && category)
    ? pick(VALIDATION_MESSAGES[category])
    : null;
```

Keep the existing long comment about `originalPanel`/`NOTE_BUCKET_WEIGHTS` (S134) above `const originalPanel` — move it, do not delete it.

- [ ] **Step 4: Keep the order-change diversion on LIVE tenders only**

In the diversion block just below (`if (panel === 'monitoring') { const rnd = mulberry32(...); if (rnd() < 0.15) {`), change the outer condition to:

```js
  if (panel === 'monitoring' && (hasAccepted || hasSent)) {
```

Rationale in a comment: LINX-14509 — an order change is an exception ON a live tender; a pre-tender or spot row has none. (This also keeps `generate.test.mjs:1200`'s order-change assertion true.)

- [ ] **Step 5: Remove the now-dead monitoring weights** — in `CATEGORY_WEIGHTS` (~:2352) delete the `monitoring:` entry and add a one-line comment: `// monitoring categories are DERIVED from the lifecycle (S151) — see the derivation block ~:1155`. Keep `PANEL_CATEGORIES.monitoring` (other code may read it — grep first; if nothing reads it, leave it anyway, it documents the vocabulary).

- [ ] **Step 6: Run both new tests — expect PASS.** Also run the whole generator suite; expect the two `order-change` tests (`:1170-1217`) and the `notes skew` test to still pass. If `notes skew` fails, `originalPanel` was not preserved for `NOTE_BUCKET_WEIGHTS` — fix that, do not weaken the test.

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/tools/generate.mjs apps/odyssey-one/tools/generate.test.mjs
git commit -m "S151: the monitoring tab is derived from the tender state it sits beside"
```

---

### Task 3: History stops where the lifecycle stops; the carrier label tells the truth

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs:1664-1680` (Optimization Evaluation text), `:1700-1790` (Ready for Tender … Tender Response), `:2098-2105` (`acceptedCarrierLabel`)

- [ ] **Step 1: Write the failing history test** (append)

```js
test('history ends at Optimization Evaluation for a pre-tender shipment, and names the right pool (S151)', () => {
  const ds = buildDataset()
  const rowBySell = new Map(ds.shipments.map((s) => [s.sellShipment, s]))
  let seenPool = 0, seenHold = 0
  for (const [id, d] of ds.details) {
    const s = rowBySell.get(id)
    const actions = d.historyList.map((h) => h.action)
    if (s.tenderStatus === '' && s.panel === 'monitoring') {
      assert.ok(!actions.includes('Ready for Tender'), `${id} pre-tender but reached Ready for Tender`)
      assert.ok(!actions.includes('Tender Sent'), `${id} pre-tender but has Tender Sent`)
      const opt = d.historyList.find((h) => h.action === 'Optimization Evaluation' && h.outcome !== 'failure')
      assert.ok(opt, `${id} has no Optimization Evaluation`)
      if (s.category === 'consolidation') { assert.match(opt.details, /moved to Consolidation/); seenPool++ }
      if (s.category === 'hold')          { assert.match(opt.details, /moved to Hold/); seenHold++ }
      assert.equal(d.acceptedCarrierLabel, null, `${id} pre-tender but shows an accepted carrier`)
    } else {
      assert.ok(actions.includes('Tender Sent'), `${id} tendered but no Tender Sent event`)
    }
    if (s.tenderStatus !== 'Accepted') assert.equal(d.acceptedCarrierLabel, null, `${id} ${s.tenderStatus} but has acceptedCarrierLabel`)
  }
  assert.ok(seenPool > 0 && seenHold > 0)
})
```

- [ ] **Step 2: Run — expect FAIL** (`Tender Sent` is pushed unconditionally today at :1737)

- [ ] **Step 3: Make Optimization Evaluation follow pool eligibility**

At ~:1663-1672 the branch text keys on `isConsolidation = orderCount > 1`. Change the message selection to use `poolEligible` (which is `true` for every multi-order shipment, so existing `C` rows are unchanged):

```js
  pushHistory('Optimization Evaluation', 'update', 'Linx',
    poolEligible
      ? 'Optimization evaluation completed. Shipment moved to Consolidation.'
      : 'Optimization evaluation completed. Shipment moved to Hold.',
    poolEligible ? 'update' : 'neutral');
```

Leave `if (isConsolidation) { … Consolidation Completed … Routing & Rating Completed }` keyed on `isConsolidation` — those events are about a REAL multi-order consolidation, not pool membership.

- [ ] **Step 4: Gate the tender pipeline**

Wrap everything from `// 6. Ready for Tender` down to (and including) the whole `if (hasAccepted) { … } else if (hasSent) { … } else { … PGI Response Received (validation-errors) … }` block in:

```js
  if (!preTender) {
    // ── Tendering pipeline — only a shipment whose window has arrived gets
    // here. A pre-tender shipment is parked in the pool/Hold (Dave 2026-09-17)
    // and its history ends at Optimization Evaluation above. ──
    …existing code, indented…
  }
```

`focusOption` is declared inside that block and only used inside it — confirm with grep before wrapping; if anything below the block reads `focusOption`, report it.

The `if (hasAccepted) { // 10-15 Post-acceptance pipeline` block that follows is already gated on `hasAccepted` and needs no change.

- [ ] **Step 5: The carrier label**

At ~:2105 replace

```js
    acceptedCarrierLabel: acceptedOption ? `${acceptedOption.scac} - ${mode}` : `${carrier.scac} - ${mode}`,
```

with

```js
    // Only an ACCEPTED carrier is "the" carrier. The old fallback stamped a
    // random routing carrier onto every un-accepted shipment — including ones
    // nobody had tendered yet (S151).
    acceptedCarrierLabel: acceptedOption ? `${acceptedOption.scac} - ${mode}` : null,
```

Check `mapSellShipmentOutToDetail.ts`'s `mapStops` renders `orDash(dto.acceptedCarrierLabel)` — a `null` becomes `--`, no crash (verified in S150 review).

- [ ] **Step 6: Run — expect PASS** (the new test and the whole generator suite)

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/tools/generate.mjs apps/odyssey-one/tools/generate.test.mjs
git commit -m "S151: a parked shipment's history stops at the pool, and only an accepted carrier is named"
```

---

### Task 4: A shipped order is a Planned Shipment; a consolidatable flag means what the tab says

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs:2154` (`orderStatusLabel`), `:~1960` (`consolidatable:` in `orderHeaders`)

- [ ] **Step 1: Write the failing tests** (append)

```js
test('every order that has a shipment reads Planned Shipment — a failed tender is not a failed shipment (S151)', () => {
  const ds = buildDataset()
  const shipped = new Set(ds.shipments.flatMap((s) => s.orders))
  for (const o of ds.orders) {
    if (!shipped.has(o.orderNumber)) continue
    assert.equal(o.orderStatus, 'Planned Shipment', `${o.orderNumber} is shipped but reads ${o.orderStatus}`)
  }
  // Unshipped orders keep their own ladder — nothing here may have touched them.
  assert.ok(ds.orders.some((o) => !shipped.has(o.orderNumber) && o.orderStatus === 'Ready for Planning'))
})

test('the Consolidatable flag on the order agrees with the pool/Hold tab (S151)', () => {
  const ds = buildDataset()
  for (const s of ds.shipments) {
    const d = ds.details.get(s.sellShipment)
    if (s.orders.length > 1) { for (const o of d.orderList) assert.equal(o.consolidatable, true, `${s.sellShipment} is a C but an order is not consolidatable`); continue }
    if (s.category === 'consolidation') assert.equal(d.orderList[0].consolidatable, true, s.sellShipment)
    if (s.category === 'hold')          assert.equal(d.orderList[0].consolidatable, false, s.sellShipment)
  }
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Order status**

Replace `:2154`:

```js
  // Dave Schultz (2026-09-17): a load is always in a shipment from the moment the
  // order exists — so an order that HAS a shipment is Planned Shipment, full
  // stop. The tender's fate is the shipment's story, not the order's. The old
  // mapping read Sent as 'Planned Load' and a declined tender as 'Shipment
  // Failed'; both conflated axes. Planning Failed / Shipment Failed remain
  // reachable only through generateUnshippedOrder (no shipment exists there).
  const orderStatusLabel = 'Planned Shipment'; // I6, revised S151
```

Grep `generateUnshippedOrder` to confirm it owns the `Planning Failed`/`Shipment Failed` statuses independently; if it does not produce them, report it (the Orders grid would lose those states entirely).

- [ ] **Step 4: Consolidatable inherits the lifecycle**

In `orderHeaders` (~:1960) replace

```js
      consolidatable: faker.number.float({ min: 0, max: 1 }) < 0.70,
```

with

```js
      // Inherited from the shipment's pool eligibility (Task 1) so the header
      // checkbox, the Monitoring tab and the Optimization Evaluation history
      // line cannot disagree. Every order of a C is consolidatable by construction.
      consolidatable: poolEligible,
```

(This removes one faker draw per order — fine under the accepted renumber.)

- [ ] **Step 5: Run — expect PASS.** Also grep `src/data/auditTrail.js` `LIFECYCLE_PATH` — `'Planned Shipment': ['Planned Load', 'Planned Shipment']` still derives a coherent trail; no change needed there.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/tools/generate.mjs apps/odyssey-one/tools/generate.test.mjs
git commit -m "S151: a shipped order is Planned Shipment, and the Consolidatable flag matches its tab"
```

---

### Task 5: Regenerate, measure, and prove the shape

**Files:**
- Modify: `apps/odyssey-one/src/data/shipments.json` (regenerated); `public/details/*.json` (gitignored)

- [ ] **Step 1: Regenerate**

```bash
node tools/generate.mjs
```

- [ ] **Step 2: Measure the monitoring cross-tab and paste it in the report**

```bash
python3 - <<'EOF'
import json, collections
d=json.load(open('src/data/shipments.json'))
mon=[r for r in d if r['panel']=='monitoring']
t=collections.Counter((r['category'], r['tenderStatus'] or '(blank)') for r in mon)
cats=sorted({c for c,_ in t}); tss=sorted({s for _,s in t})
print(f"monitoring rows: {len(mon)} of {len(d)}")
print(f"{'category':<16}"+"".join(f"{s:>11}" for s in tss))
for c in cats: print(f"{c:<16}"+"".join(f"{t.get((c,s),0):>11}" for s in tss))
print("exceptions:", sum(1 for r in d if r['panel']=='exceptions'), " order-change:", sum(1 for r in d if r['category']=='order-change'))
print("orders by status:", dict(collections.Counter(o['orderStatus'] for o in json.load(open('src/data/orders.json')))))
EOF
```

Expected shape: `approved` only Accepted; `sent` only Sent; `consolidation`/`hold` only blank; `spotbid` only Declined/Cancelled; pool ≈ 2.3× hold; every shipped order `Planned Shipment`.

- [ ] **Step 3: Confirm what did and did not move**

The Odyssey identifiers and order numbers must be byte-identical to before; sell/buy ids are EXPECTED to differ:

```bash
git show HEAD:apps/odyssey-one/src/data/shipments.json > /tmp/before.json
python3 - <<'EOF'
import json
a=json.load(open('/tmp/before.json')); b=json.load(open('src/data/shipments.json'))
ida=[r['odysseyShipmentIdentifier'] for r in a]; idb=[r['odysseyShipmentIdentifier'] for r in b]
print("odyssey ids identical:", ida==idb)
print("order lists identical:", [r['orders'] for r in a]==[r['orders'] for r in b])
print("sell ids changed (expected under the accepted renumber):", sum(1 for x,y in zip(a,b) if x['sellShipment']!=y['sellShipment']))
EOF
```

If the Odyssey ids or order lists are NOT identical, STOP — a counter moved, which this plan does not intend.

- [ ] **Step 4: Commit the regenerated data** (no code in this commit)

```bash
git add apps/odyssey-one/src/data/shipments.json apps/odyssey-one/src/data/orders.json apps/odyssey-one/src/data/order-details.json
git commit -m "S151: regenerate — the pool exists, the tabs tell the truth, sell/buy ids re-minted"
```

(Only add `orders.json` / `order-details.json` if `git status` shows them changed — they will, because `orderStatus` and `consolidatable` moved.)

---

### Task 6: Re-anchor every hardcoded seeded id, then make the whole suite green

**Files:**
- Modify (as needed): `src/routes/shipments/tabOrderPersistence.test.jsx`, `src/routes/shipments/OrderChangeReviewRoute.test.jsx`, `src/routes/shipments/OrderChangeEditStopsRoute.test.jsx`, `src/routes/CarrierBid.test.jsx`, `src/spotboard/spotStore.live.test.js`, `src/components/detail/ShipmentDetailsModal.test.jsx`, `src/components/detail/RoutingGuideTab.test.jsx`, `src/components/detail/StopsTab.test.jsx`, `src/spotboard/email/emailContext.test.js`, `src/data/shipmentsOverlay.test.js`, `src/api/services/shipmentService.test.ts`, `src/api/fixtures/sellShipmentOut.sample.ts`

- [ ] **Step 1: Run vitest and collect failures**

```bash
npx vitest run 2>&1 | tail -60
```

- [ ] **Step 2: Triage each failing file by WHY it held that id**

Each test that hardcodes a `25xxxxxx` id falls in one of two classes — read the comment above the constant to tell which:

- **Pure fixture** (`sellShipmentOut.sample.ts`, `shipmentService.test.ts`, `RoutingGuideTab.test.jsx`, `StopsTab.test.jsx`, `emailContext.test.js`, `ShipmentDetailsModal.test.jsx`, `shipmentsOverlay.test.js`): the id never has to exist in the seed. These should NOT have failed; if one did, the failure is about behaviour, not the id — investigate, do not re-anchor.
- **Reads a REAL seeded row** (`tabOrderPersistence.test.jsx` — comments name `25319141 → VALTRIS_01, panel 'exceptions'` and `25888777 → KEMIRA_NA_01, panel 'monitoring'`; `OrderChangeReviewRoute.test.jsx` / `OrderChangeEditStopsRoute.test.jsx` — `25319141` must be an order-change row; `CarrierBid.test.jsx` / `spotStore.live.test.js` — check whether `25690001` must exist or is a fixture): pick a NEW id from the regenerated `shipments.json` that satisfies **the same predicate the comment states**, and update the constant AND the comment. Script it — for example:

```bash
python3 - <<'EOF'
import json
d=json.load(open('src/data/shipments.json'))
pick=lambda p: next(r['sellShipment'] for r in d if p(r))
print("exceptions VALTRIS_01:", pick(lambda r: r['panel']=='exceptions' and r['customerId']=='VALTRIS_01'))
print("monitoring KEMIRA_NA_01:", pick(lambda r: r['panel']=='monitoring' and r['customerId']=='KEMIRA_NA_01'))
print("order-change, Direct:", pick(lambda r: r['category']=='order-change' and r['shipmentType']=='Direct'))
print("order-change, Consolidation:", pick(lambda r: r['category']=='order-change' and r['shipmentType']=='Consolidation'))
EOF
```

Match each test's exact stated predicate (some need Direct vs Consolidation, a specific customer, a specific panel). **Never** change what a test asserts to make an id fit — change the id to fit the assertion.

- [ ] **Step 3: Run the full suites**

```bash
npx vitest run            # expect 191 files, all passing (count may change only if a test was added)
node --test api/_lib/*.test.mjs   # expect 231 — untouched by this plan
node --test tools/generate.test.mjs  # expect all passing, incl. the 5 added here
npm run typecheck
npm run progression:audit  # the search vocabulary did NOT change; this must exit 0
```

If `progression:audit` exits 1, STOP and report — that means a vocabulary drifted, which this plan does not intend.

- [ ] **Step 4: Commit**

```bash
git add <only the test files you changed>
git commit -m "S151: hardcoded seeded ids re-anchored to rows that satisfy the same predicates"
```

---

### Task 7: Reseed Neon (authorised: user 2026-09-17 "do the seed that you need"; 2026-09-18 "dont worry about anything that user saved")

**Files:** none

- [ ] **Step 1: Ritual — migrate WITHOUT `--reset`, then `--reseed`** (from `apps/odyssey-one`):

```bash
node --env-file=.env.local ../../packages/db/migrate.mjs
node --env-file=.env.local tools/seed.mjs --reseed
```

~19 minutes. `--reseed` truncates `search_index, events, tenders, stops, orders, shipments, user_customer_assignments, locations, carriers, customers` and **preserves `users`**. Never use `--reset`.

- [ ] **Step 2: Verify in Neon** (psql or the console):

```sql
SELECT category, tender_status, count(*) FROM shipments WHERE panel='monitoring' GROUP BY 1,2 ORDER BY 1,2;
-- expect: approved/Accepted, sent/Sent, consolidation/'' , hold/'' , spotbid/{Declined,Cancelled} — and nothing else
SELECT order_status, count(*) FROM orders WHERE shipment_sell_id IS NOT NULL GROUP BY 1;
-- expect: Planned Shipment only
```

- [ ] **Step 3: Record the counts in the report.** No commit.

---

### Task 8: Traceability

**Files:**
- Modify: `vault/10-domains/shipments/decisions/decision-log.md` (append; follow the file's real format — read the last entries; last id was DEC-157)

- [ ] **Step 1: Append (adapting to the file's format, one Changelog row per the file's convention)**

- **DEC-158 — Monitoring tabs are derived from one lifecycle state.** Previous: `category` was a separate weighted random pick; measured 2026-09-17: every monitoring tab carried the same ~78/22 Accepted/Sent split (Tender Sent 84% already accepted; 137 accepted shipments in the pool). Decision: one `lifecycle` draw (accepted 28 / sent 14 / pre-tender 21 / spot 7 / failed 30) derives routing statuses, tender status, shipment status, panel, category, history and order status. Source: Dave Schultz 2026-09-17 (00:21:30 three creation states; 00:08:15 no tendered direct in a consolidation); PRD §2/Feature 1 for spot (SPB-12). Affects: `tools/generate.mjs`, every seeded row's tab.
- **DEC-159 — The pre-tender pool exists in the seed.** Previous: unreachable (`: 'Sent'` fallback). Decision: 21% of shipments are untendered, parked in `consolidation` (Consolidatable) or `hold`. Shares are OUR call (user: "you decide this"). Affects: the Consolidation tab now has candidates for the future consolidate action.
- **DEC-160 — Pool vs Hold is the Consolidatable flag alone; the flag is inherited, not drawn.** Provisional — Dave never named OCM for manual planning; revisit if Ramesh's OCM 97–101 turns out to gate it.
- **DEC-161 — No new shipment-status value for the pool (silent resolve).** `shipmentStatus` stays `''`; tab carries meaning; badge `—`. Rationale: a new enum ripples into the search vocabulary and the Cognizant progression sheets. Revisit with Dave.
- **DEC-162 — A shipped order is `Planned Shipment`; a failed tender is not a failed shipment.** Previous: Sent → Planned Load, declined → Shipment Failed. Source: Dave 00:02:02 (a load is always in a shipment). Affects: Orders grid status distribution, `orderStatusLabel`.
- **DEC-163 — One deliberate renumber of sell/buy ids.** Odyssey identifiers and order numbers unchanged (counters). User 2026-09-18: prototype, nothing saved matters. Hardcoded test ids re-anchored in the same change.

- [ ] **Step 2: Commit**

```bash
git add vault/10-domains/shipments/decisions/decision-log.md
git commit -m "S151: decision log — the monitoring tabs derive from one lifecycle"
```

---

## Self-review

**Spec coverage.** Category derived (T2) ✔ · pre-tender exists with the decided share (T1, T5) ✔ · spot = exhausted guide, no active tender (T1 `isSpot → tenderFailed`, T2 `spotbid` only when no Sent/Accepted) ✔ · history stops at the pool (T3) ✔ · carrier label only when accepted (T3) ✔ · Consolidatable flag ↔ tab (T1 `poolEligible`, T4) ✔ · shipped orders Planned Shipment (T4) ✔ · badge silent resolve (T2 `shipmentStatus ''`, DEC-161) ✔ · renumber + re-anchor (T5, T6) ✔ · reseed (T7) ✔ · traceability (T8) ✔.

**Placeholder scan.** Every code step has code; the two places an implementer must look something up (`orderCount` scope in T1, `focusOption` scope in T3, `generateUnshippedOrder` in T4) say exactly what to check and what to do if it's not as assumed.

**Consistency.** `lifecycle`, `preTender`, `isSpot`, `poolEligible`, `tenderFailed` are declared in T1 and consumed by T2, T3, T4 under the same names. `poolEligible` is used by both the category (T2) and the Optimization Evaluation text (T3) and the order header (T4) — the single source that keeps the three in agreement, which is the whole point.
