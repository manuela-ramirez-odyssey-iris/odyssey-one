# Dropped Carrier Display (LINX-13953) Implementation Plan

> # ⚠️ AMENDED 2026-08-17 — read before Task 2 and Task 6. NOT blocked.
>
> The routing sample payload arrived after this plan was written, and Jana ruled on it the same
> day. Analysis: [`vault/10-domains/shipments/data/routing-payload-analysis.md`](../../../vault/10-domains/shipments/data/routing-payload-analysis.md).
>
> **The payload is CURRENT** (Jana, confirmed) and a dropped carrier carries only **five**
> attributes — `seq`, `service`, `carrier`, `drop-code`, `drop-reason`. A qualified option carries
> eighteen. So routing returns no route rank, no RPC-ID, no transit time, no transit source, no
> dates, no commitment for a dropped carrier.
>
> **This is NOT a spec gap.** 13953's Null Handling rule is blanket — *"If Routing does not
> return a value for any field displayed within the Dropped Carrier section, Odyssey One shall
> display `--`"* — and seven fields carry their own *"(if returned by Routing)"* qualifier. The
> ticket expects sparse data. Build all 23 field slots; the absent ones render `--`.
>
> **Two amendments, both in Task 2. Task 6 is unchanged:**
>
> 1. **Seed SPARSELY, matching the real payload.** The generator must emit only what routing
>    actually returns — SCAC, carrier name, equipment, drop code, drop reason — and leave the
>    other ~18 fields `null` so they render `--`. Emitting rich values would make the prototype
>    look finished while the real screen is mostly dashes, which inverts the point of seeded
>    data. Step 3 below is rewritten for this.
> 2. **Replace the invented reason catalog** with the real one and carry `dropCode` as its own
>    field, since the long description is looked up by code: `1 = No Rates`,
>    `2 = Prohibited Carrier`, `23 = Missing Transit Time`.
>
> **Design note for the VD, not a build blocker:** with today's routing data most of the 23
> columns are dashes. Whether that is the right presentation is Manuela's call — and building it
> sparse means Jana can be shown the real thing rather than a flattering mock.
>
> **Other Jana rulings folded in:** Rating runs only on the routing-failure branch (follow the
> ticket) · processed carriers are **COPIED**, appearing in both lists — no storage change needed
> for 13954 · the section is **open** by default · reason descriptions come from **TMS**.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a read-only Dropped Carrier section below the Tender List showing every carrier routing excluded, why it was excluded, and its volume-commitment context — end to end, visible in the running app in live mode.

**Architecture:** Dropped carriers ride inside the existing `shipments.detail` jsonb blob, which `sellShipmentDetail()` already returns verbatim — **no migration, no API change**. The generator emits `droppedCarrierList` on `SellShipmentOut` using a *second, independently-seeded* Faker instance so the main draw sequence (and therefore every existing shipment id) is byte-identical. A new whitelist mapper converts DTO → VM. The UI is one new component: `SubAccordion` wrapping `GroupTable` in its **nested flavor** — each dropped carrier is a group whose header row is the carrier's 8 key fields, expanding to reveal a second table with the remaining 15.

**Tech Stack:** React 18, Vite, Vitest (app), `node:test` (generator), `@odyssey/ui` (`GroupTable`, `SubAccordion`), `@faker-js/faker` 9.9.0, Neon Postgres.

**Source of truth:** [`vault/10-domains/shipments/dropped-carrier.md`](../../../vault/10-domains/shipments/dropped-carrier.md) · rulings in [`decisions/dropped-carrier-decisions.md`](../../../vault/10-domains/shipments/decisions/dropped-carrier-decisions.md) · verbatim AC in [`vault-sources/10-domains/shipments/sources/linx-dropped-carrier-ac-2026-08-17.md`](../../../vault-sources/10-domains/shipments/sources/linx-dropped-carrier-ac-2026-08-17.md).

---

## Scope

**In:** LINX-13953 only — the read-only display.

**Out:** LINX-13954 (Process SCAC). It gets its own plan and is **deliberately not started**, because two of its rules are unresolved and would have to be guessed:
- **OQ-1** — does Rating run on the routing-*success* path? The AC says no, Jana says yes.
- **OQ-10** — copy or move? Decides whether the source row disappears on success.

This plan leaves the `stickyActions` / `group.action` slot **unused**. `GroupTable` already supports it (`GroupTable.jsx:64-67,103-107`, shipped precedent at `spotboard/LiveBids.jsx:121-125`), so 13954 adds one prop and one node. Nothing here needs to change to make room for it.

### Known-unresolved items this plan ships around

| Item | How this plan handles it |
|---|---|
| **OQ-2** — the Reason description lookup does not exist in 13397, and 13953 still red-flags it *"require code from Dave"* | Field is rendered. Values are **invented** (Task 2) and flagged in code + in the report. |
| **OQ-3/4/5** — CVC ID source, UoM source, Transit vs Distance Source | Rendered from whatever the generator emits. No lookup is implemented — this is a prototype surface, not the TMS integration. |
| **OQ-7** — Accepted / Open arithmetic, pending Dave | Fields are **displayed**, never computed. The generator emits coherent values; nothing in the app derives them. |
| **OQ-11** — default collapse state | **RULED 2026-08-17 (user): the section is OPEN by default.** Note this is the *section*; each carrier's own detail disclosure still starts closed. Known consequence, accepted: at the bottom bar's `partial` stage an open second table sits below the fold and pushes the Tender List up. |

### ⚠️ Invented data — read before demoing

Task 2 invents the **drop reason catalog** (`Missing Transit Time`, `No Rate Found`, …) and its descriptions. 13953 supplies exactly one real example pair; there is no catalog anywhere in Jira, and 13397 has no lookup for it. This is the same trap as the invented charge codes from S121 — **do not demo the Reason column to anyone who knows the real TMS reason codes** without saying it is placeholder.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `apps/odyssey-one/src/lib/dates.js` | Platform date canon (S107). Gains the four date composers currently stranded in `QuoteModal.jsx`. | Modify |
| `apps/odyssey-one/src/components/detail/QuoteModal.jsx` | Quote entry. Loses the composers, re-exports them for compat. | Modify |
| `apps/odyssey-one/tools/generate.mjs` | Seeded dataset. Gains `DROP_REASONS`, `buildDroppedCarriers()`, `droppedCarrierList`. | Modify |
| `apps/odyssey-one/tools/generate.test.mjs` | Generator invariants (`node:test`). | Modify |
| `apps/odyssey-one/src/api/types/sellShipmentOut.ts` | Wire DTO types. Gains `SellShipmentDroppedCarrier`. | Modify |
| `apps/odyssey-one/src/api/types/shipmentDetail.ts` | View-model types. Gains `DroppedCarrierVM`. | Modify |
| `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts` | DTO → VM. Gains `mapDroppedCarrier` + `droppedCarriers` on the VM root. | Modify |
| `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts` | Mapper tests, incl. the whitelist guard. | Modify |
| `apps/odyssey-one/src/components/detail/DroppedCarrierSection.jsx` | **The whole feature UI.** Column config + rendering. | **Create** |
| `apps/odyssey-one/src/components/detail/DroppedCarrierSection.test.jsx` | Component tests. | **Create** |
| `apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx` | Tender tab. Mounts the new section. | Modify |

One new component file. Everything else is an additive edit to a file that already owns that responsibility.

---

## Task 1: Move the date composers to `lib/dates.js`

`composeCarrierDateTime` produces exactly 13953's required format — `08/20/2025 14:00 CST, Wed` — because its org-hours segment is dropped by `filter(Boolean)` when absent, and 13953 says org hrs are **not** required. It already exists, is already tested, and is already exported. It is just in the wrong file: a date formatter living in a modal, about to gain a second consumer, when `lib/dates.js` is the established home for date formatting (S107).

**Files:**
- Modify: `apps/odyssey-one/src/lib/dates.js`
- Modify: `apps/odyssey-one/src/components/detail/QuoteModal.jsx:73-135`
- Test: `apps/odyssey-one/src/components/detail/QuoteModal.test.jsx` (unchanged — the re-export keeps it green)

- [ ] **Step 1: Append the four composers to `lib/dates.js`**

Add to the end of `apps/odyssey-one/src/lib/dates.js`:

```js
// ── Carrier date/time composition ─────────────────────────────────────────────
// Moved here from QuoteModal.jsx (2026-08-17) when Dropped Carrier became the
// second consumer. Behaviour is unchanged; QuoteModal re-exports for compat.

const DASH = '--'
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function splitDateTime(s) {
  const m = /^(\d{2}\/\d{2}\/\d{4})?\s*(\d{1,2}:\d{2})?\s*([A-Z]{3,4})?/.exec(String(s ?? '').trim())
  if (!m) return { date: '', time: '', tz: 'CST' }
  return { date: m[1] ?? '', time: m[2] ? m[2].padStart(5, '0') : '', tz: m[3] ?? 'CST' }
}

export function joinDateTime({ date, time, tz }) {
  if (!date) return ''
  return [date, time, time ? tz : ''].filter(Boolean).join(' ')
}

// Day-of-week is DERIVED from the date, never read from a stored field: the
// routing VM carries `pickupOrgDay` but has NO `deliveryOrgDay`, so only one
// side could ever have used a stored value — and a stored day can silently
// disagree with its own date, which a derived one cannot (DEC-98). Parsed
// part-wise, not via `new Date(string)`, whose "MM/DD/YYYY" handling is
// implementation-defined.
export function dayOfWeek(mdY) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(mdY ?? '').trim())
  if (!m) return ''
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]))
  // Guard a rolled-over invalid date (e.g. 02/31) rather than naming a day
  // that isn't the one written down.
  if (d.getMonth() !== Number(m[1]) - 1 || d.getDate() !== Number(m[2])) return ''
  return DAY_NAMES[d.getDay()]
}

/**
 * Composes "MM/DD/YYYY HH:MM TZ, Day, (org hours)" — every part optional and
 * simply omitted when missing, so a partial record degrades to
 * "01/07/2026, Tue" rather than "01/07/2026 , , ()". Entirely empty reads '--'.
 *
 * Two consumers with deliberately different shapes:
 *   • LINX-13895 Quote — passes `orgHours`, so the trailing "(07:00-15:30)" renders.
 *   • LINX-13953 Dropped Carrier — passes no `orgHours` ("org hrs are not
 *     required"), so the segment drops out and the value matches that ticket's
 *     own example, "08/20/2025 14:00 CST, Wed".
 */
export function composeCarrierDateTime(value) {
  if (!value) return DASH
  const day = dayOfWeek(value.date)
  const hours = value.orgHours && value.orgHours !== DASH ? `(${value.orgHours})` : ''
  return [joinDateTime(value), day, hours].filter(Boolean).join(', ') || DASH
}
```

- [ ] **Step 2: Delete the originals from `QuoteModal.jsx` and re-export**

In `apps/odyssey-one/src/components/detail/QuoteModal.jsx`, delete the bodies of `splitDateTime`, `joinDateTime`, `dayOfWeek`, `composeCarrierDateTime` and the `DAY_NAMES` const (lines ~73-135, including the DEC-98 comment block, which moved with the code). Add near the other imports:

```js
// Re-exported rather than re-implemented: these moved to lib/dates.js when
// Dropped Carrier (LINX-13953) became the second consumer. QuoteModal.test.jsx
// imports them from here, and so do external callers.
export { splitDateTime, joinDateTime, dayOfWeek, composeCarrierDateTime } from '../../lib/dates'
```

Keep QuoteModal's own local `DASH` if it has one; do not delete it.

- [ ] **Step 3: Run the existing tests to prove the move is behaviour-neutral**

Run: `cd apps/odyssey-one && npx vitest run src/components/detail/QuoteModal.test.jsx`
Expected: PASS, same count as before the move. `QuoteModal.test.jsx:5` imports all four names from `./QuoteModal` and must not need editing.

- [ ] **Step 4: Typecheck**

Run: `cd apps/odyssey-one && npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/lib/dates.js apps/odyssey-one/src/components/detail/QuoteModal.jsx
git commit -m "refactor(dates): move carrier date/time composers to lib/dates.js

Second consumer incoming (LINX-13953 Dropped Carrier). Behaviour unchanged;
QuoteModal re-exports so its tests and callers are untouched."
```

---

## Task 2: Generator emits `droppedCarrierList`

**Files:**
- Modify: `apps/odyssey-one/tools/generate.mjs`
- Test: `apps/odyssey-one/tools/generate.test.mjs`

**The constraint that shapes this task:** every faker draw is positional. Adding one draw to the main sequence renumbers every shipment id downstream, which is how S118's SpotBoard demo fixtures silently died. So dropped carriers draw from a **separate Faker instance with its own seed**. The main sequence is untouched by construction, and Task 3 proves it empirically.

**Coherence requirements** (a dropped carrier row must not contradict itself):
- Dropped SCACs are **disjoint** from the shipment's routing SCACs — otherwise every row would trip 13954's duplicate rule on sight.
- The drop `reason` **determines which fields are null**. A carrier dropped for `Missing Transit Time` must not also report a transit time.
- No pickup date ⇒ **no commitment**. `get_cvc_id`'s `p_ship_date` is *"pickup date/time in the timezone of the origin"* (13397 §10), so a row with no pickup date has no valid input for the lookup and its commitment must be blank (canon §5).
- `accepted + open === commitment` when commitment exists.
- `carrierName` always matches its SCAC from `CARRIERS`.

- [ ] **Step 1: Write the failing test**

Append to `apps/odyssey-one/tools/generate.test.mjs`:

```js
test('LINX-13953: droppedCarrierList matches the real routing payload shape', () => {
  const ds = buildDataset({ totalShipments: 200 })
  let seenWithDrops = 0
  const codesSeen = new Set()

  for (const [, d] of ds.details) {
    const dropped = d.droppedCarrierList ?? []
    if (dropped.length === 0) continue
    seenWithDrops++

    const tenderScacs = new Set((d.shippingOptionList ?? []).map((o) => o.scac))
    for (const dc of dropped) {
      // disjoint from the tender list — otherwise 13954's duplicate rule fires on every row
      assert.ok(!tenderScacs.has(dc.scac), `${dc.scac} is in BOTH lists`)

      // the five routing actually returns, plus the two we look up
      assert.ok(dc.scac && dc.equipmentCode && dc.reason)
      assert.equal(typeof dc.dropCode, 'number')
      assert.ok(dc.carrierName, 'carrier name is looked up by SCAC (13397 §2)')
      assert.ok(dc.reasonDescription, 'description is looked up by dropCode (TMS)')
      codesSeen.add(dc.dropCode)

      // SPARSE BY DESIGN: routing sends none of these for a dropped carrier.
      // If a future change starts populating them, this test should be updated
      // deliberately — not silently loosened.
      for (const absent of ['routeRank', 'pickupDateTime', 'deliveryDateTime',
                            'startDate', 'stopDate', 'transitTime', 'transitSource',
                            'routeGroup', 'rpcId', 'ttId', 'commitment', 'uom',
                            'accepted', 'open', 'comment', 'cvcId']) {
        assert.equal(dc[absent], null, `${absent} must be null — routing does not return it`)
      }

      // the two checkbox fields have no '--' state
      assert.equal(dc.orderEquipment, false)
      assert.equal(dc.indirectPoint, false)
    }
  }

  assert.ok(seenWithDrops > 20, `only ${seenWithDrops}/200 shipments had dropped carriers`)
  // all three real drop codes should show up across 200 shipments
  assert.deepEqual([...codesSeen].sort((a, b) => a - b), [1, 2, 23])
})

test('LINX-13953: the dropped list can outnumber the tender list, as in the real payload', () => {
  // The sample had 11 dropped vs 7 qualified. A generator that always produces
  // a short dropped list would hide the layout problem that creates.
  const ds = buildDataset({ totalShipments: 200 })
  let sawBigger = 0
  for (const [, d] of ds.details) {
    const dropped = (d.droppedCarrierList ?? []).length
    const usable = (d.shippingOptionList ?? []).length
    if (dropped > usable) sawBigger++
  }
  assert.ok(sawBigger > 0, 'no shipment ever had more dropped carriers than tender options')
})

test('LINX-13953: dropped carriers are deterministic across builds', () => {
  const a = buildDataset({ totalShipments: 50 })
  const b = buildDataset({ totalShipments: 50 })
  const first = a.shipments[0].sellShipment
  assert.deepEqual(
    a.details.get(first).droppedCarrierList,
    b.details.get(first).droppedCarrierList,
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/odyssey-one && node --test tools/generate.test.mjs`
Expected: FAIL — `only 0/200 shipments had dropped carriers` (`droppedCarrierList` is undefined everywhere, so every shipment is skipped by the `continue`).

> **Also add `dropCode: number` to `SellShipmentDroppedCarrier` (Task 4) and `dropCode` to
> `DroppedCarrierVM` + `mapDroppedCarrier` (Task 5).** It arrives from routing, it is the lookup
> key for the description, and the Task 5 guard test will fail if it is missing from the mapper —
> which is exactly what that guard is for. It does not need a column in Task 6.

- [ ] **Step 3: Add the reason catalog and the isolated Faker**

In `apps/odyssey-one/tools/generate.mjs`, change the faker import at line 61:

```js
import { faker, Faker, en } from '@faker-js/faker';
```

Then add below the `CARRIERS` array (after line ~180):

```js
// REAL, from the routing sample payload Jana confirmed as current on
// 2026-08-17 (vault-sources/.../routing-response-sample-S260000025.xml).
// Routing returns BOTH the numeric code and the short label on every dropped
// carrier, so `reason` needs no lookup at all.
//
// Frequencies are the sample's own: 6/11 Missing Transit Time, 4/11 No Rates,
// 1/11 Prohibited Carrier — weighted below to match, so the seeded data looks
// like real routing output rather than a uniform spread.
//
// Codes are sparse (1, 2, 23), so the real catalog has at least 23 entries and
// we have seen three. The LONG DESCRIPTION is NOT in the payload — Jana says it
// comes "From TMS", looked up by drop-code, and the exact table is still owed
// (the ticket's "require code from Dave" flag). The descriptions below are
// therefore still OURS: plausible text, not TMS text. Do not present them as
// canonical.
export const DROP_REASONS = [
  { dropCode: 23, reason: 'Missing Transit Time', weight: 6,
    description: 'Transit time could not be calculated due to missing transit or distance data.' },
  { dropCode: 1, reason: 'No Rates', weight: 4,
    description: 'No rate is available for this carrier on this lane and equipment.' },
  { dropCode: 2, reason: 'Prohibited Carrier', weight: 1,
    description: 'This carrier is prohibited for this customer, lane or commodity.' },
];

// A SECOND, independently-seeded Faker. Dropped carriers are net-new data, and
// every draw on the main `faker` is positional — adding one to the shared
// sequence renumbers every shipment id downstream, which is exactly how S118's
// SpotBoard demo fixtures died. Isolating the draws makes id stability true by
// construction rather than by luck; generate.test.mjs proves it empirically.
const droppedFaker = new Faker({ locale: en });
```

- [ ] **Step 4: Add the builder**

Add immediately after the `droppedFaker` declaration:

```js
/**
 * LINX-13953 — the carriers routing evaluated and excluded, with the reason.
 *
 * ── SPARSE ON PURPOSE ──────────────────────────────────────────────────────
 * This mirrors what routing ACTUALLY returns, verified against the sample Jana
 * confirmed current on 2026-08-17. A <d-option> carries five attributes:
 *
 *   <d-option seq="8" service="LTL" carrier="RLCA" drop-code="2"
 *             drop-reason="Prohibited Carrier"/>
 *
 * versus eighteen on a qualified <option>. So route rank, RPC-ID, transit time,
 * transit source, dates, TT ID and the entire commitment block are NULL here —
 * not because we couldn't be bothered to invent them, but because routing does
 * not send them.
 *
 * 13953 still lists all 23 fields and handles this itself: "If Routing does not
 * return a value for ANY field displayed within the Dropped Carrier section,
 * Odyssey One shall display '--'". The mapper turns these nulls into dashes.
 *
 * Seeding rich values here would make the prototype look finished while the
 * real screen renders mostly dashes — the opposite of what seeded data is for.
 * If routing is later extended, widen this function, not the mapper.
 *
 * Carrier Name is the ONE field we add that routing doesn't send: 13953 says to
 * look it up by SCAC (13397 §2), and CARRIERS is our stand-in for mf_carrier.
 *
 * Drawn only from carriers NOT in this shipment's tender list — a SCAC in both
 * would trip 13954's duplicate rule on sight, which routing cannot produce.
 *
 * @param {{scac: string, name: string}[]} routingCarriers - already in the tender list
 * @param {string} equipmentCode - the shipment's equipment ('service' in the payload)
 */
function buildDroppedCarriers(routingCarriers, equipmentCode) {
  const taken = new Set(routingCarriers.map((c) => c.scac));
  const available = CARRIERS.filter((c) => !taken.has(c.scac));
  // 0-11. The sample had ELEVEN dropped against seven qualified, so the dropped
  // list routinely outnumbers the tender list above it — Efrain's "there are so
  // many carriers on this second list" was right. Zero is also a real state the
  // UI must survive ("it is going to be based on routing, what the routing had
  // returned").
  const count = Math.min(droppedFaker.number.int({ min: 0, max: 11 }), available.length);
  if (count === 0) return [];

  // Weighted to the sample's own mix: 6 Missing Transit Time / 4 No Rates /
  // 1 Prohibited Carrier.
  const reasonPool = DROP_REASONS.flatMap((r) => Array(r.weight).fill(r));

  return droppedFaker.helpers.arrayElements(available, count).map((c) => {
    const reason = droppedFaker.helpers.arrayElement(reasonPool);
    return {
      // ── returned by routing ────────────────────────────────────────────
      scac: c.scac,
      equipmentCode,                       // payload: service="LTL"
      dropCode: reason.dropCode,           // payload: drop-code="2"
      reason: reason.reason,               // payload: drop-reason="Prohibited Carrier"
      // ── looked up (13397 §2, by SCAC) ──────────────────────────────────
      carrierName: c.name,
      // ── looked up in TMS by dropCode (Jana: "From TMS"). Descriptions are
      //    still ours — the real master table is owed (Dave). ──────────────
      reasonDescription: reason.description,
      // ── NOT returned by routing for a dropped carrier. All render '--'. ──
      routeRank: null,
      pickupDateTime: null,
      deliveryDateTime: null,
      startDate: null,      // 13397 §7 keys on rpcId, which is null
      stopDate: null,       // 13397 §7, same
      transitTime: null,
      transitSource: null,
      routeGroup: null,     // 13397 §8 keys on rpcId, same
      rpcId: null,
      ttId: null,
      commitment: null,     // get_cvc_id needs a pickup date; there isn't one
      uom: null,
      accepted: null,
      open: null,
      comment: null,
      cvcId: null,
      // ── the two checkbox fields: no '--' state, absence means unchecked ──
      // AC: "Y-Checked N-Unchecked. If not returned, then unchecked." The
      // payload omits indirect-point on dropped carriers entirely, so both are
      // false rather than drawn.
      orderEquipment: false,
      indirectPoint: false,
    };
  });
}
```

- [ ] **Step 5: Seed the isolated Faker and attach the list**

Find `faker.seed(42);` at `generate.mjs:2226` inside `buildDataset` and add the sibling seed immediately after it:

```js
  faker.seed(42);
  // Own seed, own sequence — see the droppedFaker declaration. Re-seeded on
  // every buildDataset call so repeated calls in one process are deterministic
  // (generate.test.mjs asserts this).
  droppedFaker.seed(1953);
```

Then find `shippingOptionList: routingOptions,` at `generate.mjs:1722` and add directly below it:

```js
    shippingOptionList: routingOptions,
    // LINX-13953. Rides inside shipments.detail, which sellShipmentDetail()
    // returns verbatim — no migration, no API change, no seed change.
    droppedCarrierList: buildDroppedCarriers(routingCarriers, equipmentCode),
```

> **Implementer:** confirm the identifier `equipmentCode` is in scope at line 1722. If the surrounding object builds it under a different local name, pass that instead — do **not** introduce new faker draws to obtain it.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd apps/odyssey-one && node --test tools/generate.test.mjs`
Expected: PASS, all tests including the two new ones and every pre-existing invariant.

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/tools/generate.mjs apps/odyssey-one/tools/generate.test.mjs
git commit -m "feat(generator): emit droppedCarrierList (LINX-13953)

Isolated Faker instance so the main draw sequence — and every existing
shipment id — is untouched. Reason determines which fields are null; no
pickup date means no commitment, per 13397 §10's p_ship_date input.

Reason catalog is INVENTED beyond the one pair 13953 supplies (OQ-2)."
```

---

## Task 3: Prove no shipment id moved

This is the S121 ritual, and it is not optional. The claim "the isolated Faker cannot perturb the main sequence" is an argument; this step is evidence. S118 lost a day to fixtures that died from exactly this.

**Files:** none modified — this task produces proof, not code.

- [ ] **Step 1: Capture the pre-change ids**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git stash push apps/odyssey-one/tools/generate.mjs
cd apps/odyssey-one && node tools/generate.mjs
ls public/details/ | sort > /tmp/ids-before.txt
wc -l /tmp/ids-before.txt
```

Expected: 2200 lines.

- [ ] **Step 2: Restore the change and regenerate**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
git stash pop
cd apps/odyssey-one && node tools/generate.mjs
ls public/details/ | sort > /tmp/ids-after.txt
```

- [ ] **Step 3: Diff the id sets**

Run: `diff /tmp/ids-before.txt /tmp/ids-after.txt && echo "IDS IDENTICAL"`
Expected: `IDS IDENTICAL`, no diff output.

**If this fails, STOP.** A draw leaked into the main sequence. Do not proceed — find it. The most likely cause is having called `faker.` instead of `droppedFaker.` somewhere in `buildDroppedCarriers`.

- [ ] **Step 4: Confirm the only content change is the new key**

```bash
cd apps/odyssey-one
FIRST=$(head -1 /tmp/ids-after.txt)
node -e "
const a = require('./public/details/' + process.argv[1]);
const keys = Object.keys(a);
console.log('droppedCarrierList present:', 'droppedCarrierList' in a);
console.log('count:', (a.droppedCarrierList ?? []).length);
console.log('sample:', JSON.stringify((a.droppedCarrierList ?? [])[0], null, 1));
" "$FIRST"
```

Expected: `droppedCarrierList present: true`, a count in 0–6, and a sample row (or an empty list — try another id if so).

- [ ] **Step 5: Commit the evidence in the message**

No files to add. Record the result in the Task 9 decision-log entry instead. If `git status` shows `public/details/` as modified, confirm it is gitignored (`CLAUDE.md` says the 2,200 JSONs are) — do not commit them.

---

## Task 4: DTO type

**Files:**
- Modify: `apps/odyssey-one/src/api/types/sellShipmentOut.ts`

- [ ] **Step 1: Add the interface**

Add above the `SellShipmentOut` interface in `apps/odyssey-one/src/api/types/sellShipmentOut.ts`:

```ts
/**
 * LINX-13953 — a carrier routing evaluated and excluded from the tender list.
 *
 * Nullable everywhere except identity: the AC's own field table marks Pickup,
 * Delivery, Transit Time, Transit Source and TT ID "(if returned by Routing)",
 * and its Null Handling rule is blanket — "if Routing does not return a value
 * for ANY field displayed within the Dropped Carrier section, display '--'".
 *
 * `indirectPoint` and `orderEquipment` are the exception and are NOT nullable:
 * the AC gives them a checkbox fallback ("if not returned, then unchecked"),
 * so absence is `false`, not '--'.
 */
export interface SellShipmentDroppedCarrier {
  routeRank: number
  scac: string
  carrierName: string
  equipmentCode: string
  pickupDateTime: string | null
  deliveryDateTime: string | null
  startDate: string | null
  stopDate: string | null
  transitTime: string | null
  transitSource: string | null
  routeGroup: string | null
  reason: string
  reasonDescription: string
  rpcId: string | null
  orderEquipment: boolean
  indirectPoint: boolean
  ttId: string | null
  // Volume commitment. Display is in scope (LINX-13953); the Accepted/Open
  // CALCULATION is deferred pending Dave (OQ-7) — these arrive computed and
  // nothing in the app derives them.
  commitment: number | null
  uom: string | null
  accepted: number | null
  open: number | null
  comment: string | null
  cvcId: string | null
}
```

- [ ] **Step 2: Add the field to `SellShipmentOut`**

At `apps/odyssey-one/src/api/types/sellShipmentOut.ts:301`, directly below `shippingOptionList`:

```ts
  shippingOptionList?: SellShipmentRoutingOption[]
  droppedCarrierList?: SellShipmentDroppedCarrier[]
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/odyssey-one && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/odyssey-one/src/api/types/sellShipmentOut.ts
git commit -m "feat(types): SellShipmentDroppedCarrier DTO (LINX-13953)"
```

---

## Task 5: VM type, mapper, and the whitelist guard

**Files:**
- Modify: `apps/odyssey-one/src/api/types/shipmentDetail.ts:304`
- Modify: `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts:388,563`
- Test: `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts`

**Why the guard test exists.** `mapRoutingOption` is an explicit whitelist: a DTO field not named in it is silently dropped on read. That has shipped four times (S110 `mapShipmentErrorRow`, S113, S120 `planningDateType`, S121 `quoteFlag`) — every time as a field that persisted perfectly and never came back. `mapDroppedCarrier` is a fifth whitelist. The guard makes the fifth occurrence fail a test instead of reaching the user.

- [ ] **Step 1: Write the failing test**

Append to `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts`:

```ts
describe('mapDroppedCarrier (LINX-13953)', () => {
  const full: SellShipmentDroppedCarrier = {
    routeRank: 3,
    scac: 'JBHT',
    carrierName: 'J.B. HUNT',
    equipmentCode: 'LTL',
    pickupDateTime: '08/20/2025 14:00 CST',
    deliveryDateTime: '08/22/2025 09:00 PST',
    startDate: '08/20/2025',
    stopDate: '08/22/2025',
    transitTime: '2 DY',
    transitSource: 'PCMILER',
    routeGroup: 'EAST-01',
    reason: 'Missing Transit Time',
    reasonDescription: 'Transit time could not be calculated due to missing transit or distance data.',
    rpcId: '3913973',
    orderEquipment: true,
    indirectPoint: false,
    ttId: '10901692',
    commitment: 10,
    uom: 'Loads/Week',
    accepted: 6,
    open: 4,
    comment: 'Contract renewal pending.',
    cvcId: 'CVC12345',
  }

  it('composes Pickup/Delivery as date + time + zone + day, with NO org hours', () => {
    const [vm] = mapSellShipmentOutToDetail({ droppedCarrierList: [full] } as never).droppedCarriers
    // 13953's own example. Org hrs are explicitly not required here, so the
    // trailing "(07:00-15:30)" that the Quote flow renders must be absent.
    expect(vm.pickup).toBe('08/20/2025 14:00 CST, Wed')
    expect(vm.delivery).toBe('08/22/2025 09:00 PST, Fri')
    expect(vm.pickup).not.toContain('(')
  })

  it('renders every absent field as -- EXCEPT the two checkboxes, which fall back to false', () => {
    const sparse: SellShipmentDroppedCarrier = {
      ...full,
      pickupDateTime: null, deliveryDateTime: null, startDate: null, stopDate: null,
      transitTime: null, transitSource: null, routeGroup: null, rpcId: null, ttId: null,
      commitment: null, uom: null, accepted: null, open: null, comment: null, cvcId: null,
      orderEquipment: false, indirectPoint: false,
    }
    const [vm] = mapSellShipmentOutToDetail({ droppedCarrierList: [sparse] } as never).droppedCarriers
    for (const k of ['pickup', 'delivery', 'startDate', 'stopDate', 'transitTime',
                     'transitSource', 'routeGroup', 'rpcId', 'ttId', 'commitment',
                     'uom', 'accepted', 'open', 'comment', 'cvcId'] as const) {
      expect(vm[k]).toBe('--')
    }
    // The AC's deliberate asymmetry: these are checkboxes, not values.
    expect(vm.orderEquipment).toBe(false)
    expect(vm.indirectPoint).toBe(false)
  })

  it('GUARD: every DTO field reaches the VM — mapDroppedCarrier is a whitelist', () => {
    // This mapper drops any field it does not explicitly name. That exact bug
    // has shipped four times (S110/S113/S120/S121). If you add a field to
    // SellShipmentDroppedCarrier and not to mapDroppedCarrier, this fails here
    // instead of silently blanking a column in production.
    const [vm] = mapSellShipmentOutToDetail({ droppedCarrierList: [full] } as never).droppedCarriers
    const rendered = JSON.stringify(vm)
    const skip = new Set([
      'pickupDateTime', 'deliveryDateTime', // composed into pickup/delivery
      'equipmentCode',                       // renamed to `equipment`
    ])
    for (const [key, value] of Object.entries(full)) {
      if (skip.has(key) || typeof value === 'boolean') continue
      expect(rendered, `DTO field "${key}" (${value}) never reached the VM`)
        .toContain(String(value))
    }
    expect(vm.equipment).toBe('LTL')
  })

  it('returns an empty array when routing dropped nobody', () => {
    expect(mapSellShipmentOutToDetail({} as never).droppedCarriers).toEqual([])
  })
})
```

Add `SellShipmentDroppedCarrier` to the existing type import at the top of the test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts`
Expected: FAIL — `droppedCarriers` is undefined on the result, so destructuring throws.

- [ ] **Step 3: Add the VM type**

At `apps/odyssey-one/src/api/types/shipmentDetail.ts`, add above the interface containing line 304:

```ts
/**
 * LINX-13953 — display-ready dropped carrier. Every value is already a string
 * ('--' when absent) except the two checkbox fields, which stay boolean because
 * the AC gives them an unchecked fallback rather than a dash.
 */
export interface DroppedCarrierVM {
  routeRank: number
  scac: string
  carrierName: string
  equipment: string
  pickup: string
  delivery: string
  startDate: string
  stopDate: string
  transitTime: string
  transitSource: string
  routeGroup: string
  reason: string
  reasonDescription: string
  rpcId: string
  orderEquipment: boolean
  indirectPoint: boolean
  ttId: string
  commitment: string
  uom: string
  accepted: string
  open: string
  comment: string
  cvcId: string
}
```

Then at line 304, add the sibling field:

```ts
  routingData: { options: RoutingOptionVM[] }
  droppedCarriers: DroppedCarrierVM[]
```

- [ ] **Step 4: Add the mapper**

In `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts`, add after `mapRoutingOption` closes at line 388:

```ts
/**
 * LINX-13953. A whitelist, like mapRoutingOption — a DTO field not named here
 * is silently dropped. See the GUARD test in this file's spec.
 *
 * Pickup and Delivery are composed to the ticket's own example format,
 * "08/20/2025 14:00 CST, Wed" — date, time, zone, day-of-week. Org hours are
 * deliberately NOT passed: 13953 says twice that "org hrs are not required",
 * which is the explicit exception that confirms they ARE required on the Quote
 * flow's equivalent field (DEC-98).
 */
function mapDroppedCarrier(d: SellShipmentDroppedCarrier): DroppedCarrierVM {
  return {
    routeRank: d.routeRank,
    scac: orDash(d.scac),
    carrierName: orDash(d.carrierName),
    equipment: orDash(d.equipmentCode),
    pickup: composeCarrierDateTime(splitDateTime(d.pickupDateTime)),
    delivery: composeCarrierDateTime(splitDateTime(d.deliveryDateTime)),
    startDate: orDash(d.startDate),
    stopDate: orDash(d.stopDate),
    transitTime: orDash(d.transitTime),
    transitSource: orDash(d.transitSource),
    routeGroup: orDash(d.routeGroup),
    reason: orDash(d.reason),
    reasonDescription: orDash(d.reasonDescription),
    rpcId: orDash(d.rpcId),
    // Booleans, not values: the AC's fallback for these is "unchecked", not '--'.
    orderEquipment: d.orderEquipment === true,
    indirectPoint: d.indirectPoint === true,
    ttId: orDash(d.ttId),
    commitment: d.commitment != null ? String(d.commitment) : DASH,
    uom: orDash(d.uom),
    // Never computed here. The Accepted/Open arithmetic is Dave's, and deferred
    // (OQ-7) — we display what arrives and nothing more. The AC's gate ("a CVC
    // ID alone shall not trigger the calculation") is therefore satisfied by
    // construction: there is no calculation to trigger.
    accepted: d.accepted != null ? String(d.accepted) : DASH,
    open: d.open != null ? String(d.open) : DASH,
    comment: orDash(d.comment),
    cvcId: orDash(d.cvcId),
  }
}
```

Add the imports at the top of the file:

```ts
import { composeCarrierDateTime, splitDateTime } from '../../lib/dates'
```

and add `SellShipmentDroppedCarrier` / `DroppedCarrierVM` to the existing type imports.

- [ ] **Step 5: Wire it into the root mapper**

At `apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts:563`, below `routingData`:

```ts
    routingData: mapRouting(dto),
    droppedCarriers: (dto.droppedCarrierList ?? []).map(mapDroppedCarrier),
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run src/api/mappers/mapSellShipmentOutToDetail.test.ts`
Expected: PASS, 4 new tests green.

- [ ] **Step 7: Mutation-check the guard**

The guard test must be able to fail. Temporarily delete the `cvcId:` line from `mapDroppedCarrier` and re-run.
Expected: FAIL with `DTO field "cvcId" (CVC12345) never reached the VM`.
**Restore the line** and re-run to green before continuing. A guard that cannot fail is worse than no guard — S111 found three such tests in one task.

- [ ] **Step 8: Commit**

```bash
git add apps/odyssey-one/src/api/types/shipmentDetail.ts \
        apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.ts \
        apps/odyssey-one/src/api/mappers/mapSellShipmentOutToDetail.test.ts
git commit -m "feat(mappers): mapDroppedCarrier + whitelist guard test (LINX-13953)

Fifth whitelist mapper in the repo. The guard fails the build if a DTO field
is added without a mapper line — the bug class that shipped in S110, S113,
S120 and S121, every time as a field that persisted and never came back."
```

---

## Task 6: `DroppedCarrierSection` component

**Files:**
- Create: `apps/odyssey-one/src/components/detail/DroppedCarrierSection.jsx`
- Create: `apps/odyssey-one/src/components/detail/DroppedCarrierSection.test.jsx`

**Layout.** `GroupTable`'s **nested flavor** (selected by passing `detailColumns`). One group per dropped carrier: the group row is a *data row* carrying the 8 key fields via `values`, and expanding it reveals a second independent table holding the remaining 15. This keeps CVC ID and the whole commitment block **on the carrier row** rather than hoisted to a section header — Jana was explicit that commitment is keyed on (carrier, equipment, week): *"it is actually applicable for each and every option of the drop carrier list."*

The column split is **provisional** — it is a design decision that has not been through Figma. It is annotated as such in the file.

- [ ] **Step 1: Write the failing test**

Create `apps/odyssey-one/src/components/detail/DroppedCarrierSection.test.jsx`:

```jsx
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import DroppedCarrierSection from './DroppedCarrierSection'

afterEach(cleanup)

const carrier = {
  routeRank: 3, scac: 'JBHT', carrierName: 'J.B. HUNT', equipment: 'LTL',
  pickup: '08/20/2025 14:00 CST, Wed', delivery: '08/22/2025 09:00 PST, Fri',
  startDate: '08/20/2025', stopDate: '08/22/2025',
  transitTime: '2 DY', transitSource: 'PCMILER', routeGroup: 'EAST-01',
  reason: 'Missing Transit Time',
  reasonDescription: 'Transit time could not be calculated due to missing transit or distance data.',
  rpcId: '3913973', orderEquipment: true, indirectPoint: false, ttId: '10901692',
  commitment: '10', uom: 'Loads/Week', accepted: '6', open: '4',
  comment: 'Contract renewal pending.', cvcId: 'CVC12345',
}

describe('DroppedCarrierSection (LINX-13953)', () => {
  it('names the section and counts the carriers', () => {
    render(<DroppedCarrierSection carriers={[carrier, { ...carrier, scac: 'RLCA' }]} />)
    expect(screen.getByText('Dropped Carrier (2)')).toBeInTheDocument()
  })

  it('renders an empty state rather than disappearing when routing dropped nobody', () => {
    // Absence of the section is ambiguous — the user cannot tell "none" from
    // "broken". The count is itself information (Jana's 10 evaluated / 4
    // qualified / 6 dropped framing).
    render(<DroppedCarrierSection carriers={[]} />)
    expect(screen.getByText('Dropped Carrier (0)')).toBeInTheDocument()
  })

  it('opens by default, showing the key fields without a click', () => {
    // User ruling 2026-08-17. The SECTION is open; the per-carrier detail
    // disclosure below is a separate control and still starts closed.
    render(<DroppedCarrierSection carriers={[carrier]} />)
    expect(screen.getByText('JBHT')).toBeInTheDocument()
    expect(screen.getByText('Missing Transit Time')).toBeInTheDocument()
    expect(screen.getByText('08/20/2025 14:00 CST, Wed')).toBeInTheDocument()
  })

  it('still collapses when the user asks it to', async () => {
    const user = userEvent.setup()
    render(<DroppedCarrierSection carriers={[carrier]} />)
    await user.click(screen.getByRole('button', { name: /Dropped Carrier/ }))
    expect(screen.queryByText('JBHT')).not.toBeInTheDocument()
  })

  it('keeps the detail fields behind the row disclosure', async () => {
    const user = userEvent.setup()
    render(<DroppedCarrierSection carriers={[carrier]} />)
    // key field visible, detail field not
    expect(screen.getByText('JBHT')).toBeInTheDocument()
    expect(screen.queryByText('CVC12345')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /JBHT/ }))
    expect(screen.getByText('CVC12345')).toBeInTheDocument()
    expect(screen.getByText('Contract renewal pending.')).toBeInTheDocument()
  })

  it('renders the two checkbox fields as checked/unchecked, never as a dash', async () => {
    const user = userEvent.setup()
    render(<DroppedCarrierSection carriers={[carrier]} />)
    await user.click(screen.getByRole('button', { name: /JBHT/ }))
    expect(screen.getByLabelText('Order equipment: yes')).toBeInTheDocument()
    expect(screen.getByLabelText('Indirect point: no')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run src/components/detail/DroppedCarrierSection.test.jsx`
Expected: FAIL — `Failed to resolve import "./DroppedCarrierSection"`.

- [ ] **Step 3: Write the component**

Create `apps/odyssey-one/src/components/detail/DroppedCarrierSection.jsx`:

```jsx
import { Square, SquareCheck } from 'lucide-react'
import { GroupTable, SubAccordion } from '@odyssey/ui'

/**
 * LINX-13953 — Dropped Carrier.
 *
 * The carriers routing evaluated and EXCLUDED, with the reason for each. Sits
 * inline below the Tender List, deliberately not behind a button on its own
 * screen the way TMS does it: "You want to just provide it below the screen
 * itself" (Jana, 2026-08-11). Canon: vault/10-domains/shipments/dropped-carrier.md
 *
 * READ-ONLY. The per-row Process SCAC action is LINX-13954 and lands in
 * GroupTable's existing `stickyActions` / `group.action` slot — no change to
 * this file's structure is needed to add it.
 *
 * COLUMN SPLIT IS PROVISIONAL. 13953 specifies 23 fields and no layout. Eight
 * are promoted to the always-visible row and fifteen sit behind the row
 * disclosure; that division is ours, not the ticket's, and has not been through
 * Figma. What is NOT negotiable is that the commitment block stays on the
 * CARRIER row: commitment is keyed on (carrier, equipment, week), and Jana
 * called out the trap directly — "here you would see it as if like it is
 * applicable for the entire drop carrier list, but it is actually applicable
 * for each and every option".
 */

// The always-visible row: who, what, when, and why it was dropped.
const COLUMNS = [
  { key: 'routeRank', label: 'Route Rank', align: 'center', width: 96 },
  { key: 'scac', label: 'SCAC', width: 84 },
  { key: 'carrierName', label: 'Carrier Name', width: 200 },
  { key: 'equipment', label: 'Equipment', width: 110 },
  { key: 'pickup', label: 'Pickup Date/Time', width: 210 },
  { key: 'delivery', label: 'Delivery Date/Time', width: 210 },
  { key: 'reason', label: 'Reason', width: 180 },
  { key: 'commitment', label: 'Commitment', align: 'right', width: 116 },
]

// Behind the row disclosure: routing provenance, then the commitment block.
const DETAIL_COLUMNS = [
  { key: 'startDate', label: 'Start Date', width: 110 },
  { key: 'stopDate', label: 'Stop Date', width: 110 },
  { key: 'transitTime', label: 'Transit Time', width: 110 },
  { key: 'transitSource', label: 'Transit Source', width: 130 },
  { key: 'routeGroup', label: 'Route Group', width: 120 },
  { key: 'rpcId', label: 'RPC-ID', width: 110 },
  { key: 'ttId', label: 'TT ID', width: 116 },
  { key: 'orderEquipment', label: 'Order Equipment', align: 'center', width: 140 },
  { key: 'indirectPoint', label: 'Indirect Point', align: 'center', width: 124 },
  { key: 'uom', label: 'UoM', width: 116 },
  { key: 'accepted', label: 'Accepted', align: 'right', width: 100 },
  { key: 'open', label: 'Open', align: 'right', width: 92 },
  { key: 'cvcId', label: 'CVC ID', width: 116 },
  { key: 'comment', label: 'Comment', width: 220 },
  { key: 'reasonDescription', label: 'Reason Description', width: 340 },
]

const CHECKBOX_LABELS = {
  orderEquipment: 'Order equipment',
  indirectPoint: 'Indirect point',
}

// The AC's one deliberate asymmetry: every absent field displays '--', EXCEPT
// these two, which fall back to unchecked. "If not returned, then unchecked" —
// so a dash here would be wrong, not merely ugly.
function CheckCell({ field, on }) {
  const Icon = on ? SquareCheck : Square
  return <Icon size={16} aria-label={`${CHECKBOX_LABELS[field]}: ${on ? 'yes' : 'no'}`} />
}

// Two independent disclosure levels, deliberately different defaults:
//   • the SECTION opens by default (user ruling, 2026-08-17)
//   • each CARRIER's detail table stays closed until asked for
export default function DroppedCarrierSection({ carriers = [], defaultOpen = true }) {
  const groups = carriers.map((c) => ({
    // RPC-ID is not unique enough to key on: it is null for any carrier dropped
    // for a missing route preference. SCAC + equipment is the same compound key
    // 13954's duplicate rule uses, and routeRank disambiguates the rest.
    id: `${c.scac}-${c.equipment}-${c.routeRank}`,
    label: c.scac,
    values: c,
    rows: [c],
  }))

  return (
    <SubAccordion title={`Dropped Carrier (${carriers.length})`} defaultExpanded={defaultOpen}>
      {carriers.length === 0 ? (
        <p className="dropped-carrier__empty">Routing did not drop any carriers for this shipment.</p>
      ) : (
        <GroupTable
          columns={COLUMNS}
          detailColumns={DETAIL_COLUMNS}
          groups={groups}
          defaultExpanded={false}
          renderDetailCell={(row, col) =>
            col.key in CHECKBOX_LABELS
              ? <CheckCell field={col.key} on={row[col.key]} />
              : (row[col.key] ?? '--')
          }
          data-dropped-carrier-table
        />
      )}
    </SubAccordion>
  )
}
```

> **Implementer:** `data-dropped-carrier-table` is deliberately NOT `data-routing-container`. `RoutingGuideTab.jsx:899-942`'s `handleCollapse` runs a **global** `document.querySelector('[data-routing-container]')`, so reusing that attribute name would make the tender table's collapse arithmetic grab this table instead.

- [ ] **Step 4: Add the empty-state style**

Append to `apps/odyssey-one/src/styles/components.css` (or the tender pane stylesheet, matching where sibling `.tender-pane__*` rules live):

```css
/* LINX-13953 — Dropped Carrier empty state. The section renders even at zero
   so the count itself is readable; absence would be ambiguous. */
.dropped-carrier__empty {
  padding: var(--spacing-4);
  color: var(--text-secondary);
  font: var(--body-sm);
}
```

> **Implementer:** verify `--text-secondary` and `--body-sm` exist in `packages/tokens/tokens.css`. If either does not, use the nearest existing token — **do not** hardcode a colour or a font size.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run src/components/detail/DroppedCarrierSection.test.jsx`
Expected: PASS, 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/components/detail/DroppedCarrierSection.jsx \
        apps/odyssey-one/src/components/detail/DroppedCarrierSection.test.jsx \
        apps/odyssey-one/src/styles/components.css
git commit -m "feat(shipments): DroppedCarrierSection (LINX-13953)

GroupTable nested flavor inside SubAccordion. 8 key fields on the carrier row,
15 behind the row disclosure. Commitment stays on the row, not the section
header — it is keyed on (carrier, equipment, week).

Column split is provisional and has not been through Figma."
```

---

## Task 7: Mount it in the Tender tab

**Files:**
- Modify: `apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx:1265-1266`
- Test: `apps/odyssey-one/src/components/detail/RoutingGuideTab.test.jsx`

The insertion point is a sibling card after the tender table's card, inside `.pane-col`. That container is `display: flex; flex-direction: column; gap: var(--spacing-3)` (`components.css:6156`), so the new section stacks with correct spacing and needs no layout CSS of its own. It must go in its **own card**, not inside `.tender-pane__table-card` — that card is `overflow: hidden` and `GroupTable`'s root owns its own horizontal scroll.

- [ ] **Step 1: Write the failing test**

Append to `apps/odyssey-one/src/components/detail/RoutingGuideTab.test.jsx`, matching the file's existing render-helper idiom:

```jsx
it('LINX-13953: renders the Dropped Carrier section below the tender table', () => {
  renderTab({
    droppedCarriers: [{
      routeRank: 1, scac: 'JBHT', carrierName: 'J.B. HUNT', equipment: 'LTL',
      pickup: '08/20/2025 14:00 CST, Wed', delivery: '08/22/2025 09:00 PST, Fri',
      startDate: '--', stopDate: '--', transitTime: '--', transitSource: '--',
      routeGroup: 'EAST-01', reason: 'Missing Transit Time',
      reasonDescription: 'Transit time could not be calculated.', rpcId: '--',
      orderEquipment: false, indirectPoint: false, ttId: '--',
      commitment: '--', uom: '--', accepted: '--', open: '--', comment: '--', cvcId: '--',
    }],
  })
  expect(screen.getByText('Dropped Carrier (1)')).toBeInTheDocument()
})

it('LINX-13953: the dropped table does not answer to the tender table\'s collapse selector', () => {
  // handleCollapse queries [data-routing-container] GLOBALLY. If the dropped
  // table ever carried that attribute the tender collapse maths would grab the
  // wrong table — this pins the attribute names apart.
  const { container } = renderTab({ droppedCarriers: [] })
  expect(container.querySelectorAll('[data-routing-container]').length).toBeLessThanOrEqual(1)
})
```

> **Implementer:** read the top of `RoutingGuideTab.test.jsx` first and use whatever render helper and prop shape it already establishes. If the tab reads its data from a context or a hook rather than props, wire `droppedCarriers` through the same channel the existing tests use for `routingData`. Do not introduce a second data path.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run src/components/detail/RoutingGuideTab.test.jsx`
Expected: FAIL — `Unable to find an element with the text: Dropped Carrier (1)`.

- [ ] **Step 3: Mount the section**

In `apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx`, add the import beside the other component imports:

```jsx
import DroppedCarrierSection from './DroppedCarrierSection'
```

Then at lines 1265-1266, after the tender table's card closes and before `.pane-col` closes:

```jsx
      </div>{/* /tender-pane__table-card */}

      {/* LINX-13953 — its own card: GroupTable owns horizontal scroll and
          .tender-pane__table-card is overflow:hidden. */}
      <div className="tender-pane__table-card">
        <DroppedCarrierSection carriers={droppedCarriers} />
      </div>
    </div>{/* /pane-col */}
```

Read `droppedCarriers` from the same source the component already reads `routingData` from, defaulting to `[]`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run src/components/detail/RoutingGuideTab.test.jsx`
Expected: PASS, including every pre-existing test in the file.

- [ ] **Step 5: Run the full app suite**

Run: `cd apps/odyssey-one && npx vitest run`
Expected: PASS. Baseline before this plan is **1315** app+ui tests; expect roughly 1326+.

> `src/components/ShipmentsGlobalSearch.test.jsx` (GS-22) is a **known pre-existing flake** — roughly 1 full-suite run in 6, clean in isolation. If it and only it fails, re-run that file alone to confirm, and do not treat it as caused by this work.

- [ ] **Step 6: Browser-verify in mock mode**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
npm run dev:odyssey-one
```

Open a shipment → Tender tab. Confirm, **in the browser, not in jsdom**:
1. "Dropped Carrier (N)" appears below the tender table, **open**, showing the 8-column row per carrier.
2. Collapsing and re-opening the section works.
3. Expanding a carrier row reveals the 15-column detail table.
3b. **Set the bottom bar to its half-height (`partial`) stage.** The section is open by
    default, so it now competes with the Tender List for vertical space. Confirm the Tender
    List is still usable and the page scrolls rather than clipping. This is the one thing the
    open-by-default ruling put at risk, and jsdom cannot see it.
4. Pickup reads `MM/DD/YYYY HH:MM TZ, Day` with **no** trailing parenthesised hours.
5. The tender table's own collapse toggle still works — this is the `data-routing-container` risk.
6. Find a shipment with zero dropped carriers and confirm the empty state.

**Every previous session that skipped this step shipped something invisible.** jsdom cannot see layout, and this section's whole risk surface is layout.

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx \
        apps/odyssey-one/src/components/detail/RoutingGuideTab.test.jsx
git commit -m "feat(shipments): mount Dropped Carrier below the tender table (LINX-13953)

Own card — GroupTable owns horizontal scroll, tender-pane__table-card is
overflow:hidden. Attribute deliberately not data-routing-container: that
selector is queried globally by handleCollapse."
```

---

## Task 8: Reseed and verify live

**⚠️ THIS TASK REQUIRES EXPLICIT USER AUTHORIZATION.** A Neon reseed is a destructive operation on the shared database and must be approved for *this specific reseed*. Do not run it because this plan says so — ask, and wait.

**Why it is needed:** `.env.local` sets `VITE_API_MODE=live`. In live mode the app reads Neon, whose `shipments.detail` blobs were seeded before `droppedCarrierList` existed. Without a reseed the feature is invisible in the running app while every test passes — the exact S121 trap, four times over.

- [ ] **Step 1: Confirm the reseed is genuinely required**

```bash
cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one
grep VITE_API_MODE apps/odyssey-one/.env.local
```

If this prints `mock`, skip to Step 5 — no reseed needed. If it prints `live`, continue.

- [ ] **Step 2: ASK THE USER**

Report: live mode is on, N shipments in Neon carry no `droppedCarrierList`, and the reseed takes roughly 6–7 minutes based on S121's run. Ask for explicit approval. **Stop here until it is given.**

- [ ] **Step 3: Reseed**

```bash
cd apps/odyssey-one && node tools/seed.mjs --reseed
```

Use `--reseed`, never `--reset`: `user_preferences` and `shared_filters` cascade from `users`, and `--reset` would delete saved filters (found in S110).

Expected: ~10,000 shipments, completes in 6–7 minutes.

- [ ] **Step 4: Verify against the real handler, not the tables**

```bash
cd apps/odyssey-one && node -e "
import('./api/_lib/shipments.mjs').then(async (m) => {
  const db = await import('./api/_lib/db.mjs')
  const { rows } = await db.query('SELECT sell_shipment FROM shipments LIMIT 40')
  let withDrops = 0, total = 0
  for (const r of rows) {
    const detail = await m.sellShipmentDetail([r.sell_shipment])
    const n = (detail.droppedCarrierList ?? []).length
    if (n > 0) withDrops++
    total += n
  }
  console.log(\`\${withDrops}/40 shipments have dropped carriers, \${total} rows total\`)
  process.exit(0)
})
"
```

Expected: a non-zero count. **Call the handler, not a raw table query** — that is what proves the value survives the whole read path, which is where the four whitelist bugs all lived.

> **Implementer:** adjust the import paths and the db helper name to match the repo. The point of the step is the *shape* of the check, not these exact lines.

- [ ] **Step 5: Browser-verify in live mode**

Restart the dev server and repeat Task 7 Step 6's six checks against live data.

- [ ] **Step 6: Commit**

Nothing to commit — the reseed changes data, not files. Record the row counts in Task 9.

---

## Task 9: Traceability

**Files:**
- Modify: `vault/10-domains/shipments/decisions/decision-log.md`
- Modify: `vault/10-domains/shipments/decisions/dropped-carrier-decisions.md`
- Modify: `progress.md`

- [ ] **Step 1: Log the implemented decisions**

Append to `vault/10-domains/shipments/decisions/decision-log.md`, continuing from **DEC-105**, matching the file's existing entry style. One entry each for:

- **DEC-106** — Dropped carriers ride in `shipments.detail`, not a new column or table. Rationale: `sellShipmentDetail()` returns `detail` verbatim, so the feature needs no migration and no API change. Note the forward risk: `detail` is written once at seed time, so if **OQ-10** resolves to *move*, 13954 will need an overlay (the `overrides` pattern) to record that a dropped carrier was processed.
- **DEC-107** — Dropped carriers draw from an isolated Faker instance. Include the Task 3 diff result as the evidence.
- **DEC-108** — Column split: 8 on the row, 15 behind the disclosure; commitment on the carrier row. Mark the split provisional and pending Figma.
- **DEC-109** — The drop reason catalog is invented; only the one pair from 13953 is real. Cross-link **OQ-2**.

- [ ] **Step 2: Promote the DC- rulings that this work implemented**

In `vault/10-domains/shipments/decisions/dropped-carrier-decisions.md`, change `Status: analysis — not implemented` to `Status: implemented (S<N>)` on **DC-01**, **DC-03**, **DC-04**, **DC-06**, **DC-07**, **DC-11** only. Leave DC-02, DC-05, DC-08, DC-09, DC-10 as analysis — they belong to 13954 or to no code.

- [ ] **Step 3: Update `progress.md`**

Add the session entry per the house format. State plainly: what shipped, the test delta, whether the reseed ran, whether anything was browser-verified, and that **13954 is not started and why** (OQ-1 and OQ-10 unresolved).

- [ ] **Step 4: Commit**

```bash
git add vault/10-domains/shipments/decisions/decision-log.md \
        vault/10-domains/shipments/decisions/dropped-carrier-decisions.md \
        progress.md
git commit -m "docs: DEC-106..109 — Dropped Carrier display shipped (LINX-13953)"
```

---

## Questions for Jana

Carry these out of this plan — they are what unblocks 13954. Ordered by how much they cost to get wrong.

1. **OQ-1 — Is Rating called on the routing-SUCCESS path?** The AC says rating runs only when routing fails; you described both always firing, including "routing succeeded but could not calculate the rate". If the AC is literal, a cleanly-routed carrier lands in the Tender List with no rate and no prompt — the outcome you said you were designing against. **Blocks 13954's flow.**
2. **OQ-10 — Copy or move?** The AC says "copied" throughout; you said "move". Decides whether the dropped row disappears on success, and whether 13954 needs a persistence overlay at all. **Blocks 13954's data model.**
3. **OQ-2 — Reason description.** 13953 points at 13397 for the lookup; 13397 does not have one, and the field is still flagged "require code from Dave". Is there a real reason-code catalog anywhere? Ours is invented.
4. **OQ-12 — The routing sample payload** you shared on the 2026-08-11 call. It would settle OQ-3 (CVC ID source), OQ-4 (UoM source) and OQ-5 (Transit vs Distance Source) by inspection. It is not in the vault.
5. **OQ-6 — "Pickup Date/Time cannot be in the past"** is a hard block with no override and no stated rationale. Confirm it should block rather than warn, especially when reprocessing an older shipment.
6. **OQ-11 — Default collapse state.** Shipping collapsed; confirm.
7. **OQ-9 — What happens to an already-processed carrier on a Routing Options refresh?** Routing's inputs have not changed, so it will likely reappear in the dropped list while also sitting in the Tender List.

---

## Self-Review

**Spec coverage** — every 13953 requirement maps to a task:

| AC section | Task |
|---|---|
| Dropped Carrier Fields (17) | 2 (data), 4/5 (types+mapper), 6 (render) |
| Volume Commitment Fields (6) | 2, 4/5, 6 — display only; calculation deferred (OQ-7) |
| Display Rules — all options, no cap | 6 (`groups` maps every carrier, no slice) |
| Display Rules — Pickup/Delivery = Date+Time+Zone+Day | 1 (`composeCarrierDateTime`), 5 (test pins the exact string) |
| Display Rules — org hrs not required | 1 + 5 (`orgHours` never passed; test asserts no `(`) |
| Commitment Rules — Accepted/Open only when Commitment AND UoM | 2 (generator enforces), 5 (`--` when null) |
| Commitment Rules — CVC ID alone does not calculate | 5 — satisfied by construction: nothing calculates |
| Null Handling — `--` everywhere | 5 (`orDash`) + its dedicated test |
| Null Handling — Indirect Point unchecked, not `--` | 5 (boolean), 6 (`CheckCell`), both tested |
| Refresh with Routing Options | Inherited — the section reads the same VM the tender table does, so it re-renders on the same data change. **No separate refresh wiring, and none is needed.** |

**Placeholder scan** — no TBDs, no "add error handling", no "similar to Task N". Three steps carry an explicit *Implementer* note where the exact local identifier must be read from the file rather than guessed (Task 2 Step 5, Task 6 Step 4, Task 7 Step 1); each names precisely what to check and what not to do.

**Type consistency** — `SellShipmentDroppedCarrier` (DTO, Task 4) → `DroppedCarrierVM` (VM, Task 5) → `carriers` prop (Task 6). The two renames are `equipmentCode`→`equipment` and `pickupDateTime`/`deliveryDateTime`→`pickup`/`delivery`; both are declared in the mapper and both are excluded in the guard test's `skip` set. Generator field names (Task 2) match the DTO exactly — checked field-for-field.

**One deliberate deviation from the skill's TDD shape:** Task 3 has no test, because it *is* a test — an empirical diff that no unit test can express.
