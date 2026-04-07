# SHP-25: Panel Assignment Derived from Tender Outcome

**Date:** 2026-04-06
**Status:** Design Spec (Ready for Implementation)
**Epic:** Data Integrity — Generator Logic
**Source:** Jana grooming session 2026-04-06
**Assignee:** TBD

---

## Overview

The generator (`tools/generate.mjs`) currently assigns shipments to panels (Exceptions vs Monitoring vs PGI/PGR) using index-based counting that is completely independent of each shipment's tender outcome. This produces invalid data: Exceptions shipments can have an Accepted carrier, and Monitoring shipments can have all carriers declined — both are logically impossible in the real system.

Jana's rule is definitive: **a shipment's panel is determined entirely by its tender outcome, not by any random weight or index.**

Additionally, the generator currently only produces two tender scenarios (Accepted 85%, Sent 15%), which means 100% of generated shipments would land in Monitoring. A third scenario — tender completely failed, all carriers declined or cancelled — must be introduced to populate the Exceptions panel.

**Key quote from Jana:** "Exceptions are shipments that were not able to tender — no carrier was able to tender that shipment."

---

## Functional Requirements

### 1. Introduce a Third Tender Scenario: `tenderFailed`

The generator must support three mutually exclusive tendering scenarios, replacing the current two:

| Scenario | Probability | Decisive carrier status | Panel result |
|---|---|---|---|
| `tenderCompleted` | ~55% | Accepted | Monitoring |
| `tenderInProgress` | ~15% | Sent | Monitoring |
| `tenderFailed` | ~30% | None (all Declined/Cancelled) | Exceptions |

Implementation: draw a single float `[0, 1)` at the start of shipment generation and assign the scenario based on thresholds:
- `< 0.55` → `tenderCompleted`
- `< 0.70` → `tenderInProgress`
- `>= 0.70` → `tenderFailed`

### 2. Routing Table Consistency per Scenario

The carrier status sequence in `routingOptions` must be internally consistent with the scenario:

**Scenario A — `tenderCompleted` (Accepted):**
- Carriers at ranks `1` to `decisiveRank - 1`: `'Declined'` or `'Cancelled'` (they were tried and failed)
- Carrier at rank `decisiveRank`: `'Accepted'`
- Carriers at ranks `decisiveRank + 1` to `routingCount`: `null` (never tendered — system stopped after acceptance)

**Scenario B — `tenderInProgress` (Sent):**
- Carriers at ranks `1` to `decisiveRank - 1`: `'Declined'` or `'Cancelled'` (tried before the current one)
- Carrier at rank `decisiveRank`: `'Sent'`
- Carriers at ranks `decisiveRank + 1` to `routingCount`: `null` (not yet reached)

**Scenario C — `tenderFailed` (all failed):**
- ALL carriers in the table: `'Declined'` or `'Cancelled'` — no `null`, no `'Sent'`, no `'Accepted'`
- Rationale: the system exhausted every option on the routing guide and every carrier responded negatively. No carrier remains untried.
- The `decisiveRank` variable is not used in this scenario (no single decisive carrier).

### 3. Derive Panel from Tender Outcome

Remove the `assignPanelAndCategory()` function's panel-assignment logic. Panel must be computed from the already-derived `hasAccepted` / `hasSent` booleans:

```js
const hasAccepted = routingStatuses.includes('Accepted');
const hasSent = routingStatuses.includes('Sent');
const panel = (hasAccepted || hasSent) ? 'monitoring' : 'exceptions';
```

This replaces the current index-based panel block (`index < PANEL_COUNTS.exceptions`, etc.).

### 4. Shipment Status Mapping (unchanged)

The existing derivation is correct and must be preserved:

```js
const tenderStatus = hasAccepted ? 'Accepted' : hasSent ? 'Sent' : (routingStatuses.length > 0 ? routingStatuses[0] : 'Declined');
const shipmentStatus = hasAccepted ? 'Done' : hasSent ? '' : 'Review';
```

Note: the fallback in `tenderStatus` for the `tenderFailed` scenario should return the status of the first carrier row (e.g., `'Declined'`), since `routingStatuses` will always be non-empty in that case.

### 5. Category Assignment — Exceptions Only

The `category` field must only be populated for Exceptions panel shipments. Monitoring shipments do not have an exception category.

Current categories for Exceptions:
- `'date-issues'` (weight 28)
- `'routing-review'` (weight 22)
- `'tender-issues'` (weight 22)
- `'tender-review'` (weight 18)
- `'bid-review'` (weight 10)

After determining panel:

```js
const category = panel === 'exceptions'
  ? weightedPick(CATEGORY_WEIGHTS.exceptions.items, CATEGORY_WEIGHTS.exceptions.weights)
  : null;
```

`mainRow.category` should be set to `null` for Monitoring shipments (not an empty string, not omitted — `null` is explicit about "not applicable").

### 6. Remove PGI/PGR Panel from Scope

The `pgipgr` panel is out of scope for this ticket. The `PANEL_COUNTS.pgipgr` block and `pgipgr` entries in `PANEL_CATEGORIES` and `CATEGORY_WEIGHTS` should remain untouched — do not delete them. SHP-25 only addresses Exceptions vs Monitoring. If `pgipgr` was previously generated via index overflow, that logic will be broken by this change; note it as a known gap to address in a future ticket (SHP-26 or similar).

### 7. Remove `PANEL_COUNTS` and Index-Based Panel Logic

The following structures become obsolete and must be removed:

```js
// DELETE these:
const PANEL_COUNTS = { ... };
PANEL_COUNTS.pgipgr = 200 - PANEL_COUNTS.exceptions - PANEL_COUNTS.monitoring;

function assignPanelAndCategory(index, _total) { ... }
```

Replace the call site in the generation loop:

```js
// BEFORE:
const { panel, category } = assignPanelAndCategory(i, TOTAL_SHIPMENTS);
mainRow.panel = panel;
mainRow.category = category;

// AFTER:
// panel and category are now returned from generateShipment() directly
```

### 8. Move Panel and Category into `generateShipment()`

`generateShipment()` already computes `hasAccepted`, `hasSent`, `tenderStatus`, and `shipmentStatus`. Panel and category should be derived in the same function, immediately after those derivations, and returned as part of `mainRow`:

```js
// Inside generateShipment(), after tenderStatus/shipmentStatus:
const panel = (hasAccepted || hasSent) ? 'monitoring' : 'exceptions';
const category = panel === 'exceptions'
  ? weightedPick(CATEGORY_WEIGHTS.exceptions.items, CATEGORY_WEIGHTS.exceptions.weights)
  : null;

// Include in mainRow:
const mainRow = {
  ...
  tenderStatus,
  shipmentStatus,
  panel,
  category,
  ...
};
```

The generation loop becomes:

```js
for (let i = 0; i < TOTAL_SHIPMENTS; i++) {
  const { mainRow, detail } = generateShipment(i);
  // panel and category already set inside generateShipment()
  shipments.push(mainRow);
  shipmentDetails[mainRow.buyShipment] = detail;
}
```

---

## Data Model Changes

### `shipments.json` — each row

| Field | Before | After |
|---|---|---|
| `panel` | Randomly assigned by index block | Derived: `'monitoring'` if Accepted or Sent, `'exceptions'` if all failed |
| `category` | Always set (even for Monitoring) | Set for Exceptions only; `null` for Monitoring |
| `tenderStatus` | `'Accepted'`, `'Sent'`, or fallback | Same — no change |
| `shipmentStatus` | `'Done'`, `''`, or `'Review'` | Same — no change |

### `shipment-details.json` — `routingData.options[]` per shipment

| Field | Before | After |
|---|---|---|
| `status` | `null`, `'Declined'`, `'Cancelled'`, `'Accepted'`, or `'Sent'` | Same values, but `tenderFailed` shipments will have NO `null` statuses and NO `'Accepted'`/`'Sent'` |

No new fields are added to either data file. This is a behavioral change to existing fields, not a schema expansion.

---

## Generator Logic (Pseudocode)

```
function generateShipment(index):

  // 1. Determine scenario
  roll = random float [0, 1)
  if roll < 0.55:
    scenario = 'tenderCompleted'
  else if roll < 0.70:
    scenario = 'tenderInProgress'
  else:
    scenario = 'tenderFailed'

  // 2. Build routing options
  routingCount = random int [3, 6]
  carriers = random sample of CARRIERS, size routingCount

  if scenario != 'tenderFailed':
    decisiveRank = random int [1, routingCount]

  routingOptions = carriers.map((carrier, i):
    rank = i + 1
    if scenario == 'tenderCompleted':
      if rank < decisiveRank: status = pick(['Declined', 'Cancelled'])
      else if rank == decisiveRank: status = 'Accepted'
      else: status = null
    else if scenario == 'tenderInProgress':
      if rank < decisiveRank: status = pick(['Declined', 'Cancelled'])
      else if rank == decisiveRank: status = 'Sent'
      else: status = null
    else:  // tenderFailed
      status = pick(['Declined', 'Cancelled'])
    return { rank, status, ... }
  )

  // 3. Derive tender outcome
  routingStatuses = routingOptions.map(r => r.status).filter(Boolean)
  hasAccepted = routingStatuses.includes('Accepted')
  hasSent = routingStatuses.includes('Sent')

  tenderStatus = hasAccepted ? 'Accepted'
               : hasSent ? 'Sent'
               : routingStatuses[0]  // first carrier's status (Declined or Cancelled)

  shipmentStatus = hasAccepted ? 'Done'
                 : hasSent ? ''
                 : 'Review'

  // 4. Derive panel and category
  panel = (hasAccepted || hasSent) ? 'monitoring' : 'exceptions'

  category = panel == 'exceptions'
    ? weightedPick(EXCEPTION_CATEGORIES, EXCEPTION_WEIGHTS)
    : null

  // 5. Build and return mainRow with panel + category included
  return { mainRow: { ..., tenderStatus, shipmentStatus, panel, category }, detail }
```

---

## Edge Cases

### EC-1: `tenderFailed` with only one carrier on the routing guide

If `routingCount` is 3 (minimum) and scenario is `tenderFailed`, all 3 carriers get `'Declined'` or `'Cancelled'`. No special handling needed — the `map()` loop handles it uniformly.

### EC-2: `tenderCompleted` with `decisiveRank == 1`

The first carrier accepted immediately. No carriers above it, no Declined/Cancelled rows. All carriers after rank 1 are `null`. This is valid and already supported by the current logic.

### EC-3: `tenderInProgress` with `decisiveRank == routingCount`

The last carrier in the table is the one currently sent. All carriers above are Declined/Cancelled. No carriers after it to set to `null`. Valid edge case.

### EC-4: `tenderFailed` — `routingStatuses` is never empty

Because all carriers in `tenderFailed` receive a non-null status, `filter(Boolean)` will always return a full array. The `tenderStatus` fallback `routingStatuses[0]` is safe and will always resolve to `'Declined'` or `'Cancelled'`.

### EC-5: `stopsData.summary.acceptedCarrier` for Exceptions shipments

Currently, the stops summary includes `acceptedCarrier: \`${carrier.scac} - ${mode}\``. For `tenderFailed` shipments, there is no accepted carrier — this field will be misleading. This is a known pre-existing issue: `carrier` is picked at shipment creation and used regardless of outcome. This field should display `'--'` or `'N/A'` for Exceptions. **Recommend addressing this as a follow-on cleanup (SHP-26), not in scope for SHP-25.**

### EC-6: Category is `null` for Monitoring — UI defensiveness

Any UI that currently reads `shipment.category` and expects a string may crash or display `null` on Monitoring rows. Before implementing, verify that `BottomBar.jsx`, tab routing, and filter components handle `null` category gracefully. Add a null-guard if needed: `category ?? ''` at the read site.

### EC-7: `pgipgr` panel no longer generated

The index-based logic previously assigned the overflow shipments (roughly 35-45) to `pgipgr`. After this change, no shipments will have `panel === 'pgipgr'` — the panel derivation only produces `'exceptions'` or `'monitoring'`. The `PANEL_CATEGORIES.pgipgr` and `CATEGORY_WEIGHTS.pgipgr` constants become dead code. Leave them in place; they are not harmful and will be reactivated when PGI/PGR is implemented.

---

## Verification Steps

### V-1: Scenario distribution check

After regenerating, count shipments by panel:

```js
// In browser console or a quick node script:
const data = require('./src/data/shipments.json');
const counts = data.reduce((acc, s) => {
  acc[s.panel] = (acc[s.panel] || 0) + 1;
  return acc;
}, {});
console.log(counts);
// Expected: ~110 monitoring, ~90 exceptions (±15 variance is acceptable)
```

### V-2: Routing table consistency — Exceptions

For every shipment with `panel === 'exceptions'`:
- No routing option should have `status === 'Accepted'`
- No routing option should have `status === 'Sent'`
- No routing option should have `status === null`
- All statuses must be `'Declined'` or `'Cancelled'`

```js
const details = require('./src/data/shipment-details.json');
const exceptions = data.filter(s => s.panel === 'exceptions');
exceptions.forEach(s => {
  const opts = details[s.buyShipment].routingData.options;
  const bad = opts.filter(o => o.status === 'Accepted' || o.status === 'Sent' || o.status === null);
  if (bad.length > 0) console.error(`FAIL: ${s.buyShipment}`, bad.map(o => o.status));
});
```

### V-3: Routing table consistency — Monitoring

For every shipment with `panel === 'monitoring'`:
- At least one routing option must have `status === 'Accepted'` OR `status === 'Sent'`
- The Accepted/Sent carrier must appear only once (no duplicates)
- All carriers ranked above the Accepted/Sent carrier must be `'Declined'` or `'Cancelled'`
- All carriers ranked below the Accepted/Sent carrier must be `null`

### V-4: Panel ↔ shipmentStatus alignment

| `panel` | Expected `shipmentStatus` |
|---|---|
| `'monitoring'` (with Accepted) | `'Done'` |
| `'monitoring'` (with Sent) | `''` (empty string) |
| `'exceptions'` | `'Review'` |

Verify no Monitoring shipment has `shipmentStatus === 'Review'`, and no Exceptions shipment has `shipmentStatus === 'Done'` or `shipmentStatus === ''`.

### V-5: Category null for Monitoring

Every shipment with `panel === 'monitoring'` must have `category === null`. Every shipment with `panel === 'exceptions'` must have `category` set to one of `['date-issues', 'routing-review', 'tender-issues', 'tender-review', 'bid-review']`.

### V-6: UI smoke test — Exceptions panel

1. Open the app and navigate to the Exceptions panel
2. Confirm shipments appear in the list
3. Open a shipment detail and navigate to the Routing Guide tab
4. Confirm all carrier rows show Declined or Cancelled status — no Accepted, no Sent, no empty/null rows
5. Confirm `shipmentStatus` badge shows "Review"

### V-7: UI smoke test — Monitoring panel

1. Open the app and navigate to the Monitoring panel
2. Open a shipment that shows "Done" status — confirm at least one carrier row is Accepted
3. Open a shipment with no status badge — confirm at least one carrier row is Sent
4. Confirm null-status rows render without errors (typically shown as `'--'` or empty cell)

---

## Files to Modify

| File | Change | Approximate lines |
|---|---|---|
| `tools/generate.mjs` | Replace two-scenario block with three-scenario block inside `generateShipment()` | 367–388 |
| `tools/generate.mjs` | Add panel + category derivation inside `generateShipment()`, return in `mainRow` | ~478 area |
| `tools/generate.mjs` | Remove `PANEL_COUNTS` constants and `assignPanelAndCategory()` function | 949–970 |
| `tools/generate.mjs` | Simplify generation loop (remove `assignPanelAndCategory` call) | 982–989 |
| `src/data/shipments.json` | Regenerated output — no manual edit | — |
| `src/data/shipment-details.json` | Regenerated output — no manual edit | — |

No UI component files require changes for the core data fix. If EC-6 (null category guard) is triggered, `src/components/detail/BottomBar.jsx` or filter components may need a defensive read.

---

## Decision Log

**Decision:** Derive `panel` inside `generateShipment()` rather than as a post-processing step.
**Rationale:** Panel depends on tender outcome, which is computed inside the function. Keeping derivation co-located with its source data eliminates the possibility of mismatch between what the routing table contains and what `panel` is set to. The index-based post-assignment created this exact mismatch.

**Decision:** Set `category = null` for Monitoring shipments rather than an empty string or omitting the field.
**Rationale:** Null is semantically distinct from "no category selected" (empty string). It signals "this field does not apply to this record type," which is more honest and easier to guard in UI code (`category !== null` is a clean check).

**Decision:** Do not fix `stopsData.summary.acceptedCarrier` for Exceptions in this ticket (EC-5).
**Rationale:** That field requires its own thinking about what to display for failed tenders (N/A? last tried carrier? nothing?). Mixing it into SHP-25 would expand scope. Scope is: panel assignment and routing table consistency only.

**Decision:** Leave `CATEGORY_WEIGHTS.pgipgr` and `PANEL_CATEGORIES.pgipgr` in place.
**Rationale:** These constants will be needed when PGI/PGR is implemented. Deleting dead code that is known to be reused soon creates unnecessary churn.
