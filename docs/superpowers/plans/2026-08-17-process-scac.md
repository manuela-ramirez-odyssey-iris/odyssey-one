# Process SCAC (LINX-13954) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user press **Process SCAC** on a dropped carrier and have it appear in the Tender List — with the duplicate check, the manual date dialog, the rating reminder and the success message the AC specifies — end to end, visible in the running app in live mode.

**Architecture:** No migration and no API change. `saveTender` (`api/_lib/shipments.mjs:290`) already upserts — it UPDATEs by `(shipment_sell_id, rank)` and INSERTs when nothing matched — so a processed carrier is just a new `rank`, which falls straight through the INSERT path. All branching lives in **one pure function** (`planProcessScac`) that returns an ordered step list; `RoutingGuideTab` walks that list and owns only the dialogs and the in-flight lock. The action itself is `GroupTable`'s existing `stickyActions` slot — one prop and one node, exactly as S122 predicted.

**Tech Stack:** React 18, Vite, Vitest, `@odyssey/ui` (`GroupTable`, `Button`, `ModalMedium`, `Alert`, `DatePicker`, `TimePicker`), Neon Postgres.

**Source of truth:** verbatim AC in [`vault-sources/10-domains/shipments/sources/linx-dropped-carrier-ac-2026-08-17.md`](../../../vault-sources/10-domains/shipments/sources/linx-dropped-carrier-ac-2026-08-17.md) (LINX-13954 section) · Jana's rulings in [`vault/10-domains/shipments/questions-for-jana-2026-08-17.md`](../../../vault/10-domains/shipments/questions-for-jana-2026-08-17.md) · canon in [`vault/10-domains/shipments/dropped-carrier.md`](../../../vault/10-domains/shipments/dropped-carrier.md).

---

## What the code read already settled (do not re-investigate)

| Question | Answer | Evidence |
|---|---|---|
| Does adding a tender row need a migration or a new endpoint? | **No.** `saveTender` update-then-inserts. | `api/_lib/shipments.mjs:290-300` |
| Does the dropped row disappear on success? | **No — COPY.** It stays in both lists. | Jana, 2026-08-17 (OQ-10) |
| Is the action slot ready? | **Yes.** `stickyActions` + `actionsHeader` + `group.action` + `group.actionTone`. | `packages/ui/src/GroupTable.jsx:69,86,214-227` |
| Where does the tender list live in state? | `const [options, setOptions] = useState(data?.options || [])` | `RoutingGuideTab.jsx:870` |
| How is a tender row persisted? | `persistTender` → `saveTenderOption(id, routingOptionVmToDto(option))` | `RoutingGuideTab.jsx:1043` |
| Is the tender list grouped by equipment? | **No.** It is flat, `ORDER BY rank`. | `shipments.mjs:211` |

---

## Decisions taken, and they are ours — flag them in any demo

These are not in the ticket. Each is annotated in code with the reasoning so a later reader does not mistake them for spec.

**D1 — Routing and Rating are SIMULATED, driven by the seeded `dropCode`.** The prototype has no routing or rating service. The branch is derived deterministically from the reason routing already gave us:

| dropCode | Reason | Simulated outcome | Why it is the honest mapping |
|---|---|---|---|
| `23` | Missing Transit Time | routing returns **no dates** → manual entry dialog | The drop reason *is* "routing could not compute the dates" |
| `1` | No Rates | routing **succeeds** | Nothing stops date calculation for this carrier |
| `2` | Prohibited Carrier | routing **succeeds** | No special case (Jana Q4) |

No randomness — the same carrier always takes the same branch, so a demo is repeatable and every branch is reachable (the seeded mix is 6/4/1, so all three appear on most shipments).

**D2 — Rating always fails for a dropped carrier.** Rating only runs on the routing-failure branch (Jana Q2: "follow the ticket"), and we hold no rate data whatsoever for a dropped carrier — routing returns five attributes and none of them is a rate. "No rate available" is therefore the truthful outcome, not a coin flip.

**D3 — Append at `max(rank) + 1`. Never renumber.** The AC says "inserted at the bottom of the matching Equipment group" and "Rank shall be recalculated". Our tender list is **flat** — there are no equipment groups — so the AC's own fallback applies verbatim: *"If no matching Equipment group exists, the carrier shall be inserted at the end of the Tender List."* Renumbering is additionally **not expressible through this endpoint**: the write is addressed `WHERE rank = $8`, so shifting a row from rank 5 to 6 would overwrite whatever currently holds rank 6. Appending is the only rank operation this API supports, and it is the only one we need.

**D4 — The 3-second success message is an inline `Alert`, not a new Toast.** No toast/auto-dismiss pattern exists anywhere in this app. An `Alert` above the tender table with a `setTimeout` is ~6 lines against a new normalized component that would owe Figma, a DSM entry and an Angular twin. Revisit if a second consumer appears.

**D5 — Audit logging is out of scope.** The AC's audit list (user, date/time, shipment, SCAC, routing result, rating result, manual dates) is explicitly *"recorded in backend audit logs"*. There is no audit table in Neon and no endpoint for one. Not built, recorded here as a known gap.

**D6 — Route Rank and RPC-ID come from the dropped row, which means both are blank.** The AC says to carry them across. Routing returns neither for a dropped carrier, so the copied row lands with an empty route rank and RPC-ID — identical to what the AC's *"from scratch"* branch prescribes. That is correct behaviour on today's data, not a bug, and it will start carrying real values the moment routing widens.

---

## Scope

**In:** the whole of LINX-13954 except D5.

**Out:**
- Audit logging (D5).
- The red-flagged `Refer Story xxxx` "add a carrier from scratch on the tendering screen" branch — Jana owns that story and it does not exist yet.
- The **"No Rates" review item.** A carrier dropped for No Rates routes cleanly, so under the failure-only rating rule it lands in the Tender List with an empty cost and **no prompt** — the *"you should not leave it empty"* outcome Jana described designing against. Built per the ticket as ruled; flagged for review once it is on screen. Do not silently "fix" it in this plan.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `apps/odyssey-one/src/lib/processScac.js` | **All branching logic, pure.** Duplicate check, simulated routing outcome, step planner, dropped-carrier → tender-option builder. | **Create** |
| `apps/odyssey-one/src/lib/processScac.test.js` | Its tests. Pure, no DOM. | **Create** |
| `apps/odyssey-one/src/components/detail/ManualDatesModal.jsx` | The manual Pickup/Delivery dialog + its two validations. | **Create** |
| `apps/odyssey-one/src/components/detail/ManualDatesModal.test.jsx` | Its tests. | **Create** |
| `apps/odyssey-one/src/components/detail/DroppedCarrierSection.jsx` | Gains the `stickyActions` column and the `onProcess` / `processingScac` props. | Modify |
| `apps/odyssey-one/src/components/detail/DroppedCarrierSection.test.jsx` | Gains action-column tests. | Modify |
| `apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx` | Owns the flow: state, dialogs, persistence, focus, success message. | Modify |
| `apps/odyssey-one/src/components/detail/RoutingGuideTab.test.jsx` | Flow tests. | Modify |
| `vault/10-domains/shipments/decisions/dropped-carrier-decisions.md` | D1–D6 recorded. | Modify |

One new logic file, one new dialog. Everything else is additive.

---

## Task 1: `processScac.js` — the pure core

Every branch in this feature is decided here so the component holds no business logic. All of it is testable without a DOM.

**Files:**
- Create: `apps/odyssey-one/src/lib/processScac.js`
- Create: `apps/odyssey-one/src/lib/processScac.test.js`

- [ ] **Step 1: Write the failing test**

Create `apps/odyssey-one/src/lib/processScac.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { isDuplicate, planProcessScac, droppedCarrierToOption, nextRank } from './processScac'

const dropped = {
  scac: 'JBHT', carrierName: 'J.B. HUNT', equipment: 'LTL',
  dropCode: '1', reason: 'No Rates',
  routeRank: '--', rpcId: '--', pickup: '--', delivery: '--',
}
const tender = [
  { rank: 1, scac: 'TAXA', equipment: 'LTL' },
  { rank: 2, scac: 'RLCA', equipment: 'TL' },
]

describe('isDuplicate — LINX-13954 Duplicate Carrier Validation', () => {
  it('matches on SCAC *and* Equipment together, not either alone', () => {
    expect(isDuplicate({ ...dropped, scac: 'TAXA', equipment: 'LTL' }, tender)).toBe(true)
    // same SCAC, different equipment — NOT a duplicate
    expect(isDuplicate({ ...dropped, scac: 'TAXA', equipment: 'TL' }, tender)).toBe(false)
    // same equipment, different SCAC — NOT a duplicate
    expect(isDuplicate({ ...dropped, scac: 'JBHT', equipment: 'LTL' }, tender)).toBe(false)
  })

  it('is case-insensitive — a SCAC is a code, not free text', () => {
    expect(isDuplicate({ ...dropped, scac: 'taxa', equipment: 'ltl' }, tender)).toBe(true)
  })

  it('is false against an empty tender list', () => {
    expect(isDuplicate(dropped, [])).toBe(false)
  })
})

describe('planProcessScac — the ordered steps for one carrier', () => {
  it('stops at the duplicate dialog and never copies', () => {
    expect(planProcessScac({ ...dropped, scac: 'TAXA', equipment: 'LTL' }, tender))
      .toEqual(['duplicate'])
  })

  it('routes cleanly for No Rates: copy, then the success message', () => {
    // D1 — dropCode 1 is a rate problem, not a routing problem.
    expect(planProcessScac(dropped, tender)).toEqual(['copy', 'success'])
  })

  it('routes cleanly for Prohibited Carrier — no special case (Jana Q4)', () => {
    expect(planProcessScac({ ...dropped, dropCode: '2' }, tender)).toEqual(['copy', 'success'])
  })

  it('takes the failure branch for Missing Transit Time, in the AC order', () => {
    // Dates first, THEN rating, THEN the copy — the AC nests the whole rating
    // block inside routing-failure and puts "add carrier to list" at the end.
    // No 'success' step: the AC's success message belongs to Routing Success only.
    expect(planProcessScac({ ...dropped, dropCode: '23' }, tender))
      .toEqual(['manual-dates', 'rating-failed', 'copy'])
  })

  it('checks duplicates BEFORE routing, whatever the drop code', () => {
    expect(planProcessScac({ ...dropped, scac: 'TAXA', equipment: 'LTL', dropCode: '23' }, tender))
      .toEqual(['duplicate'])
  })

  it('treats the drop code as a string or a number — it crosses JSON either way', () => {
    expect(planProcessScac({ ...dropped, dropCode: 23 }, tender)[0]).toBe('manual-dates')
  })
})

describe('nextRank — D3, append only', () => {
  it('is one past the highest existing rank', () => {
    expect(nextRank(tender)).toBe(3)
  })

  it('is 1 for an empty list', () => {
    expect(nextRank([])).toBe(1)
  })

  it('uses the MAX, not the length — ranks can have gaps', () => {
    expect(nextRank([{ rank: 4 }, { rank: 9 }])).toBe(10)
  })
})

describe('droppedCarrierToOption — the copy', () => {
  it('carries identity, equipment, route rank and RPC-ID across (AC + D6)', () => {
    const o = droppedCarrierToOption(dropped, { rank: 3 })
    expect(o.rank).toBe(3)
    expect(o.scac).toBe('JBHT')
    expect(o.carrierName).toBe('J.B. HUNT')
    expect(o.equipment).toBe('LTL')
    // Both are '--' on today's data; carried, not invented.
    expect(o.routeRank).toBe('--')
    expect(o.routeGroup).toBe('--')
  })

  it('lands untendered with no rate — nothing rated this carrier', () => {
    const o = droppedCarrierToOption(dropped, { rank: 3 })
    expect(o.status).toBeNull()
    expect(o.rate).toBe('--')
    expect(o.cost).toBe('--')
    expect(o.rateDetails.baseRate).toBe(0)
    // Must NOT arrive pre-quoted — the whole point is the user may add one.
    expect(o.quoteFlag).toBeUndefined()
  })

  it('takes the user-entered dates when the manual dialog supplied them', () => {
    const o = droppedCarrierToOption({ ...dropped, dropCode: '23' }, {
      rank: 3,
      dates: { pickupDateTime: '09/01/2026 08:00 CST', deliveryDateTime: '09/03/2026 16:00 CST' },
    })
    expect(o.pickupDateTime).toBe('09/01/2026 08:00 CST')
    expect(o.deliveryDateTime).toBe('09/03/2026 16:00 CST')
  })

  it('falls back to the dropped row own dates when routing supplied them', () => {
    const o = droppedCarrierToOption(
      { ...dropped, pickup: '08/20/2025 14:00 CST, Wed', delivery: '08/22/2025 09:00 PST, Fri' },
      { rank: 3 },
    )
    expect(o.pickupDateTime).toBe('08/20/2025 14:00 CST, Wed')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run src/lib/processScac.test.js`
Expected: FAIL — `Failed to resolve import "./processScac"`.

- [ ] **Step 3: Write the implementation**

Create `apps/odyssey-one/src/lib/processScac.js`:

```js
/**
 * LINX-13954 — Process SCAC, the pure core.
 *
 * Every branch this feature can take is decided here so RoutingGuideTab holds
 * only dialogs and state. All of it is testable without a DOM.
 *
 * ⚠️ ROUTING AND RATING ARE SIMULATED (plan D1/D2). This prototype has no
 * routing or rating service. The outcome is derived deterministically from the
 * drop code routing already gave us, so a demo is repeatable and every branch
 * is reachable. Replace `routingReturnsDates` with the real call when one
 * exists — nothing else in this file needs to change.
 */

const DASH = '--'

// Routing could not compute dates for exactly the carriers it told us it could
// not compute transit for. Any other drop reason is a rate or policy problem,
// which does not stop date calculation.
const DROP_CODE_MISSING_TRANSIT_TIME = '23'

/** Crosses JSON as a number from the generator and a string from the VM. */
const code = (c) => String(c?.dropCode ?? '')

const key = (scac, equipment) => `${String(scac ?? '').toUpperCase()}|${String(equipment ?? '').toUpperCase()}`

/**
 * AC: "validate whether the same SCAC and Equipment combination already exists
 * within the Tender List." Both, together — the same carrier on different
 * equipment is a legitimate second option.
 *
 * Load-bearing, not defensive: Jana ruled the action COPIES rather than moves,
 * so the dropped row survives its own success and WILL be pressed again.
 */
export function isDuplicate(carrier, tenderOptions = []) {
  const target = key(carrier?.scac, carrier?.equipment)
  return tenderOptions.some((o) => key(o.scac, o.equipment) === target)
}

/** SIMULATED — see the file header. */
function routingReturnsDates(carrier) {
  return code(carrier) !== DROP_CODE_MISSING_TRANSIT_TIME
}

/**
 * The ordered steps for one Process SCAC press. The component walks this list;
 * it does not decide anything itself.
 *
 * Order is the AC's, not ours:
 *   • the duplicate check runs "before processing the carrier", so it precedes
 *     the routing call and short-circuits everything
 *   • the whole rating block is nested INSIDE routing-failure
 *   • "Add carrier to list" sits at the END of the failure branch
 *   • the "Routing completed successfully" message belongs to Routing Success
 *     only — there is deliberately no 'success' step on the failure path
 */
export function planProcessScac(carrier, tenderOptions = []) {
  if (isDuplicate(carrier, tenderOptions)) return ['duplicate']
  if (routingReturnsDates(carrier)) return ['copy', 'success']
  // Rating runs only here (Jana Q2: follow the ticket), and always fails: we
  // hold no rate data for a dropped carrier, so "no rate available" is the
  // truthful outcome rather than a coin flip (D2).
  return ['manual-dates', 'rating-failed', 'copy']
}

/**
 * D3 — append only. The write endpoint addresses rows `WHERE rank = $8`, so
 * shifting an existing row would overwrite whichever row currently holds the
 * destination rank. MAX rather than length because ranks can have gaps.
 */
export function nextRank(tenderOptions = []) {
  return tenderOptions.reduce((max, o) => Math.max(max, Number(o.rank) || 0), 0) + 1
}

/**
 * Build the Tender List row from the dropped carrier.
 *
 * Shaped as a RoutingOptionVM, because RoutingGuideTab's `options` state is
 * VM-shaped and `persistTender` runs it back through `routingOptionVmToDto`
 * on the way out.
 *
 * Route Rank and RPC-ID are CARRIED, per the AC — which on today's data means
 * both arrive blank, since routing returns neither for a dropped carrier (D6).
 * That matches what the AC's own "from scratch" branch prescribes, and it
 * starts carrying real values for free if routing ever widens.
 */
export function droppedCarrierToOption(carrier, { rank, dates } = {}) {
  return {
    rank,
    routeRank: carrier.routeRank ?? DASH,
    scac: carrier.scac,
    carrierName: carrier.carrierName,
    equipment: carrier.equipment,
    // Nothing rated this carrier. Zeroes rather than nulls because the Cost
    // column formats numbers and `rateDetails` is read unconditionally.
    rate: DASH,
    cost: DASH,
    rateDetails: { baseRate: 0, currency: 'USD', markup: 0, additionalCharges: [], apTotal: 0, arTotal: 0 },
    // Untendered. Must NOT arrive with a quoteFlag — the point of landing here
    // is that the user MAY add a quote (LINX-13896).
    status: null,
    pickupDateTime: dates?.pickupDateTime ?? (carrier.pickup !== DASH ? carrier.pickup : null),
    pickupTZ: '',
    pickupOrgHours: DASH,
    pickupOrgDay: '',
    deliveryDateTime: dates?.deliveryDateTime ?? (carrier.delivery !== DASH ? carrier.delivery : null),
    deliveryTZ: '',
    deliveryOrgHours: DASH,
    transit: carrier.transitTime ?? DASH,
    distance: DASH,
    sl: DASH,
    linehaul: DASH,
    routeGroup: carrier.routeGroup ?? DASH,
    api: DASH,
    notifyDateTime: DASH,
    responseMethod: DASH,
    responseDateTime: DASH,
    carrierPickup: DASH,
    deliveryNum: DASH,
    transitTimeSource: carrier.transitSource ?? DASH,
    description: DASH,
    responseUser: null,
    carrierQuoted: 'No',
    networkLeverage: DASH,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run src/lib/processScac.test.js`
Expected: PASS, all tests.

- [ ] **Step 5: Confirm the option shape actually satisfies `RoutingOptionVM`**

`droppedCarrierToOption` is in a `.js` file so `tsc` will not check it. Prove the shape by hand once:

```bash
cd apps/odyssey-one
node -e "
const src = require('fs').readFileSync('src/api/types/shipmentDetail.ts','utf8')
const block = src.split('export interface RoutingOptionVM {')[1].split('\n}')[0]
const required = [...block.matchAll(/^\s{2}(\w+)([?]?):/gm)].filter(m => m[2] !== '?').map(m => m[1])
const built = require('fs').readFileSync('src/lib/processScac.js','utf8')
const missing = required.filter(k => !new RegExp('(^|\\\\s)' + k + ':').test(built))
console.log(missing.length ? 'MISSING: ' + missing.join(', ') : 'ALL REQUIRED VM FIELDS PRESENT')
"
```

Expected: `ALL REQUIRED VM FIELDS PRESENT`. If anything is listed, add it to `droppedCarrierToOption` with `DASH` (or `null` for a nullable) and re-run.

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/lib/processScac.js apps/odyssey-one/src/lib/processScac.test.js
git commit -m "feat(tender): pure core for Process SCAC (LINX-13954)

Duplicate check, step planner, rank allocation and the dropped-carrier ->
tender-option copy, all pure and DOM-free. Routing/rating outcomes are
SIMULATED from the seeded drop code (plan D1/D2) — the prototype has no such
service, and deriving the branch from data routing already sent keeps every
branch reachable and every demo repeatable."
```

---

## Task 2: the Process SCAC action column

**Files:**
- Modify: `apps/odyssey-one/src/components/detail/DroppedCarrierSection.jsx`
- Modify: `apps/odyssey-one/src/components/detail/DroppedCarrierSection.test.jsx`

The section stays presentational — it renders a button and calls back. It does no validation and knows nothing about routing.

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe('DroppedCarrierSection (LINX-13953)')` block in `apps/odyssey-one/src/components/detail/DroppedCarrierSection.test.jsx`:

```jsx
  it('renders a Process SCAC button per carrier and reports which one was pressed', async () => {
    const user = userEvent.setup()
    const onProcess = vi.fn()
    render(
      <DroppedCarrierSection
        carriers={[carrier, { ...carrier, scac: 'RLCA' }]}
        onProcess={onProcess}
      />,
    )
    const buttons = screen.getAllByRole('button', { name: /Process SCAC/ })
    expect(buttons).toHaveLength(2)
    await user.click(buttons[1])
    expect(onProcess).toHaveBeenCalledTimes(1)
    expect(onProcess.mock.calls[0][0].scac).toBe('RLCA')
  })

  it('disables EVERY Process SCAC while one is in flight, not just the pressed one', () => {
    // AC: "Process SCAC shall be disabled (for the current SCAC and other
    // dropped carrier SCACs)" — only one may be processed at a time.
    render(
      <DroppedCarrierSection
        carriers={[carrier, { ...carrier, scac: 'RLCA' }]}
        onProcess={() => {}}
        processingScac="JBHT"
      />,
    )
    for (const b of screen.getAllByRole('button', { name: /Process SCAC/ })) {
      expect(b).toBeDisabled()
    }
  })

  it('renders no action column at all when no handler is supplied', () => {
    // 13953 shipped read-only and must stay renderable that way.
    render(<DroppedCarrierSection carriers={[carrier]} />)
    expect(screen.queryByRole('button', { name: /Process SCAC/ })).not.toBeInTheDocument()
  })
```

Add `vi` to the existing `vitest` import in that file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run src/components/detail/DroppedCarrierSection.test.jsx`
Expected: FAIL — `Unable to find an accessible element with the role "button" and name /Process SCAC/`.

- [ ] **Step 3: Implement**

In `apps/odyssey-one/src/components/detail/DroppedCarrierSection.jsx`, change the import line to add `Button`:

```jsx
import { Button, GroupTable, SubAccordion } from '@odyssey/ui'
```

Change the signature:

```jsx
export default function DroppedCarrierSection({
  carriers = [],
  defaultOpen = true,
  onProcess,
  processingScac = null,
}) {
```

Inside the `carriers.map`, add the action to each group object (after `detailNote`):

```jsx
    // LINX-13954. The slot GroupTable has always had — `stickyActions` pins the
    // lane, `group.action` fills it. Live precedent: spotboard/LiveBids.jsx.
    // The section stays presentational: it reports the press and renders the
    // disabled state it is told about; it validates nothing.
    action: onProcess ? (
      <Button
        variant="secondary"
        size="sm"
        // AC: only one SCAC at a time, and the OTHER carriers' buttons go down
        // too — not just this one's.
        disabled={processingScac != null}
        onClick={() => onProcess(c)}
      >
        Process SCAC
      </Button>
    ) : undefined,
```

On the `<GroupTable>`, add the two props:

```jsx
          stickyActions={Boolean(onProcess)}
          actionsHeader="Action"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run src/components/detail/DroppedCarrierSection.test.jsx`
Expected: PASS — the three new tests plus every pre-existing 13953 test.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/components/detail/DroppedCarrierSection.jsx \
        apps/odyssey-one/src/components/detail/DroppedCarrierSection.test.jsx
git commit -m "feat(tender): Process SCAC action column (LINX-13954)

Fills GroupTable's existing stickyActions slot — one prop and one node, as
S122 predicted. Section stays presentational: it reports the press and renders
the disabled state it is given. All buttons disable together, per the AC's
one-at-a-time rule."
```

---

## Task 3: the manual Pickup/Delivery dialog

**Files:**
- Create: `apps/odyssey-one/src/components/detail/ManualDatesModal.jsx`
- Create: `apps/odyssey-one/src/components/detail/ManualDatesModal.test.jsx`

Two fields, two validations, both hard blocks (Jana Q5: per the story). OK stays disabled until both pass.

- [ ] **Step 1: Write the failing test**

Create `apps/odyssey-one/src/components/detail/ManualDatesModal.test.jsx`:

```jsx
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ManualDatesModal from './ManualDatesModal'

afterEach(cleanup)

// Fixed "now" so "in the past" is deterministic. The component must read the
// clock through a prop for exactly this reason — a test that depends on the
// real wall clock is a test that fails at midnight.
const NOW = new Date(2026, 8, 1, 12, 0, 0) // 09/01/2026 12:00

function setup(props = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(<ManualDatesModal now={NOW} onConfirm={onConfirm} onCancel={onCancel} {...props} />)
  return { onConfirm, onCancel }
}

const ok = () => screen.getByRole('button', { name: 'OK' })

describe('ManualDatesModal (LINX-13954)', () => {
  it('starts with OK disabled — nothing has been entered yet', () => {
    setup()
    expect(ok()).toBeDisabled()
  })

  it('blocks and explains a delivery at or before pickup', async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()
    await user.type(screen.getByLabelText(/Pickup Date\/Time/), '09/02/2026 10:00')
    await user.type(screen.getByLabelText(/Delivery Date\/Time/), '09/02/2026 10:00')
    expect(screen.getByText('Delivery Date/Time must be later than Pickup Date/Time.')).toBeInTheDocument()
    expect(ok()).toBeDisabled()
    await user.click(ok())
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('blocks and explains a pickup in the past', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByLabelText(/Pickup Date\/Time/), '08/01/2026 10:00')
    await user.type(screen.getByLabelText(/Delivery Date\/Time/), '09/05/2026 10:00')
    expect(screen.getByText('Pickup Date/Time cannot be in the past.')).toBeInTheDocument()
    expect(ok()).toBeDisabled()
  })

  it('enables OK and returns both values once each rule passes', async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()
    await user.type(screen.getByLabelText(/Pickup Date\/Time/), '09/02/2026 08:00')
    await user.type(screen.getByLabelText(/Delivery Date\/Time/), '09/04/2026 16:00')
    expect(screen.queryByText(/must be later than/)).not.toBeInTheDocument()
    expect(screen.queryByText(/cannot be in the past/)).not.toBeInTheDocument()
    expect(ok()).toBeEnabled()
    await user.click(ok())
    expect(onConfirm).toHaveBeenCalledWith({
      pickupDateTime: '09/02/2026 08:00',
      deliveryDateTime: '09/04/2026 16:00',
    })
  })

  it('cancels without returning anything', async () => {
    const user = userEvent.setup()
    const { onCancel, onConfirm } = setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run src/components/detail/ManualDatesModal.test.jsx`
Expected: FAIL — `Failed to resolve import "./ManualDatesModal"`.

- [ ] **Step 3: Implement**

Create `apps/odyssey-one/src/components/detail/ManualDatesModal.jsx`:

```jsx
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, FormField, ModalFooter, ModalMedium } from '@odyssey/ui'

/**
 * LINX-13954 — Manual Pickup and Delivery Entry.
 *
 * Opens on the routing-failure branch, when routing came back without dates.
 * That is the single most common case in the seeded data (Missing Transit Time
 * is 6 of every 11 dropped carriers), so this dialog is on the main path, not
 * an edge case.
 *
 * BOTH validations are hard blocks — OK stays disabled until each passes.
 * "Pickup cannot be in the past" is the one we questioned (a late load is
 * plausible, not impossible); Jana ruled "per the story", so it blocks.
 *
 * `now` is a prop, not `new Date()` read inline, so the past-check is testable
 * without the wall clock deciding whether the suite passes.
 */

// "MM/DD/YYYY HH:MM" -> Date. Parsed part-wise rather than through
// `new Date(string)`, whose MM/DD/YYYY handling is implementation-defined —
// same reasoning as lib/dates.js `dayOfWeek`.
function parse(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(String(s ?? '').trim())
  if (!m) return null
  const d = new Date(+m[3], +m[1] - 1, +m[2], +m[4], +m[5])
  return d.getMonth() === +m[1] - 1 && d.getDate() === +m[2] ? d : null
}

export default function ManualDatesModal({ carrier, now = new Date(), onConfirm, onCancel }) {
  const [pickup, setPickup] = useState('')
  const [delivery, setDelivery] = useState('')

  const p = parse(pickup)
  const d = parse(delivery)

  // Only complain about a rule once there is a value to judge — an error
  // shown before the user has typed reads as the form being broken.
  const pastError = p && p < now ? 'Pickup Date/Time cannot be in the past.' : ''
  const orderError = p && d && d <= p ? 'Delivery Date/Time must be later than Pickup Date/Time.' : ''
  const valid = Boolean(p && d && !pastError && !orderError)

  return createPortal(
    <ModalMedium
      title="Enter Pickup and Delivery"
      subtitle={carrier ? `${carrier.scac} — ${carrier.carrierName}` : undefined}
      onClose={onCancel}
      footer={
        <ModalFooter>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={() => onConfirm({
            pickupDateTime: pickup.trim(),
            deliveryDateTime: delivery.trim(),
          })}>OK</Button>
        </ModalFooter>
      }
    >
      <FormField
        label="Pickup Date/Time"
        placeholder="MM/DD/YYYY HH:MM"
        value={pickup}
        onChange={(e) => setPickup(e.target.value ?? e)}
        error={pastError}
      />
      <FormField
        label="Delivery Date/Time"
        placeholder="MM/DD/YYYY HH:MM"
        value={delivery}
        onChange={(e) => setDelivery(e.target.value ?? e)}
        error={orderError}
      />
    </ModalMedium>,
    document.body,
  )
}
```

> **Implementer:** `FormField`'s exact props (`error` vs `errorText`, whether `onChange` hands you an event or a raw value) must be read off `packages/ui/src/FormField.jsx` before you trust the code above — conform to its API rather than adding an escape hatch. Same for `ModalMedium`'s `footer`/`subtitle`: copy the composition `ConfirmDialog` in `RoutingGuideTab.jsx:396` already uses, since that one is known to work.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run src/components/detail/ManualDatesModal.test.jsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/components/detail/ManualDatesModal.jsx \
        apps/odyssey-one/src/components/detail/ManualDatesModal.test.jsx
git commit -m "feat(tender): manual pickup/delivery dialog (LINX-13954)

Both validations are hard blocks per Jana's ruling. `now` is injected so the
past-check is testable without the wall clock deciding the suite."
```

---

## Task 4: wire the flow into `RoutingGuideTab`

**Files:**
- Modify: `apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx`
- Modify: `apps/odyssey-one/src/components/detail/RoutingGuideTab.test.jsx`

This is where the step list gets walked. The component owns the in-flight lock, the dialogs, persistence and focus — no business rules.

- [ ] **Step 1: Write the failing test**

Append to `apps/odyssey-one/src/components/detail/RoutingGuideTab.test.jsx` (match the file's existing render helper and imports — read the top of the file first):

```jsx
describe('Process SCAC (LINX-13954)', () => {
  it('copies a cleanly-routed carrier into the Tender List and says so', async () => {
    const user = userEvent.setup()
    renderTab({ droppedCarriers: [{ ...droppedFixture, scac: 'JBHT', dropCode: '1' }] })
    await user.click(screen.getByRole('button', { name: /Process SCAC/ }))
    expect(await screen.findByText('Routing completed successfully.')).toBeInTheDocument()
    // The row is in the tender table now — and STILL in the dropped list,
    // because Jana ruled the action copies rather than moves.
    expect(screen.getAllByText('JBHT').length).toBeGreaterThan(1)
  })

  it('refuses a SCAC+Equipment already in the Tender List', async () => {
    const user = userEvent.setup()
    // `existingFixture` is already in the tender list on the same equipment.
    renderTab({ droppedCarriers: [{ ...droppedFixture, scac: existingFixture.scac,
                                    equipment: existingFixture.equipment }] })
    await user.click(screen.getByRole('button', { name: /Process SCAC/ }))
    expect(await screen.findByText(
      'Carrier and Equipment combination (SCAC/Equipment) already in the list.',
    )).toBeInTheDocument()
  })

  it('asks for dates, then warns about the rate, for a Missing Transit Time carrier', async () => {
    const user = userEvent.setup()
    renderTab({ droppedCarriers: [{ ...droppedFixture, scac: 'JBHT', dropCode: '23' }] })
    await user.click(screen.getByRole('button', { name: /Process SCAC/ }))
    await user.type(screen.getByLabelText(/Pickup Date\/Time/), '09/02/2099 08:00')
    await user.type(screen.getByLabelText(/Delivery Date\/Time/), '09/04/2099 16:00')
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(await screen.findByText(
      'No rate is available for the carrier. You may obtain and enter a quote if needed.',
    )).toBeInTheDocument()
  })

  it('cancelling the date dialog copies nothing', async () => {
    const user = userEvent.setup()
    renderTab({ droppedCarriers: [{ ...droppedFixture, scac: 'ZZZZ', dropCode: '23' }] })
    await user.click(screen.getByRole('button', { name: /Process SCAC/ }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    // Still exactly one ZZZZ on screen — the dropped row, and nothing else.
    expect(screen.getAllByText('ZZZZ')).toHaveLength(1)
  })
})
```

> **Implementer:** this file's existing tests define how a tab is rendered with fixture data. Reuse that helper rather than inventing `renderTab`; if the file has no such helper, add one and use it for the pre-existing tests too. `droppedFixture` / `existingFixture` likewise: build them from what the file already has.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run src/components/detail/RoutingGuideTab.test.jsx`
Expected: FAIL — no Process SCAC button is rendered.

- [ ] **Step 3: Add the state and the handler**

In `apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx`, add to the imports:

```jsx
import { droppedCarrierToOption, isDuplicate, nextRank, planProcessScac } from '../../lib/processScac'
import ManualDatesModal from './ManualDatesModal'
```

Add below the `options` state (line ~870):

```jsx
  // LINX-13954. One at a time, per the AC — this doubles as the lock and as
  // the flag every Process SCAC button reads to disable itself.
  const [processingScac, setProcessingScac] = useState(null)
  const [manualDatesFor, setManualDatesFor] = useState(null)
  const [processNotice, setProcessNotice] = useState(null)   // { tone, message }
  const [processSuccess, setProcessSuccess] = useState(null) // auto-dismissing
```

Add the handler near the other `useCallback`s:

```jsx
  // Walks the step list planProcessScac returns. All the rules live there; this
  // only renders dialogs, persists, and unlocks.
  const runProcessScac = useCallback(async (carrier, dates) => {
    const steps = planProcessScac(carrier, options)

    if (steps[0] === 'duplicate') {
      setProcessNotice({
        tone: 'warning',
        message: 'Carrier and Equipment combination (SCAC/Equipment) already in the list.',
      })
      setProcessingScac(null)
      return
    }

    // Pause the walk and come back through this same function once the user
    // has supplied the dates (or bail if they cancel).
    if (steps.includes('manual-dates') && !dates) {
      setManualDatesFor(carrier)
      return
    }

    if (steps.includes('rating-failed')) {
      setProcessNotice({
        tone: 'info',
        message: 'No rate is available for the carrier. You may obtain and enter a quote if needed.',
      })
    }

    const option = droppedCarrierToOption(carrier, { rank: nextRank(options), dates })
    try {
      // Optimistic: the row is in the table before the write lands, matching
      // how every other tender edit in this file behaves.
      setOptions((prev) => [...prev, option])
      await persistTender(option)
    } catch (e) {
      console.error('process SCAC failed', e)
      setOptions((prev) => prev.filter((o) => o.rank !== option.rank))
      setProcessNotice({
        tone: 'error',
        message: 'The dropped carrier could not be processed. If the issue persists, please contact your system administrator.',
      })
      setProcessingScac(null)
      return
    }

    if (steps.includes('success')) setProcessSuccess('Routing completed successfully.')
    // AC Focus Management: move focus to the Tender List and keep the new row
    // visible. `highlightedRank` is the mechanism the tab already uses for
    // "this row is the one you just touched".
    setHighlightedRank(option.rank)
    setProcessingScac(null)
  }, [options, persistTender])

  const handleProcessScac = useCallback((carrier) => {
    if (processingScac) return   // AC: additional clicks shall not be allowed
    setProcessingScac(carrier.scac)
    runProcessScac(carrier)
  }, [processingScac, runProcessScac])
```

Add the auto-dismiss effect (D4 — no toast component exists; this is six lines against a whole new normalized component):

```jsx
  // AC: "The message disappears after 3 s. No user action required."
  useEffect(() => {
    if (!processSuccess) return
    const t = setTimeout(() => setProcessSuccess(null), 3000)
    return () => clearTimeout(t)
  }, [processSuccess])
```

- [ ] **Step 4: Render the dialogs and the message**

Change the `DroppedCarrierSection` mount at `RoutingGuideTab.jsx:1352`:

```jsx
          <DroppedCarrierSection
            carriers={shipmentDetails?.droppedCarriers || []}
            onProcess={handleProcessScac}
            processingScac={processingScac}
          />
```

Add beside the other modals in the same return:

```jsx
      {processSuccess && (
        <Alert tone="success" className="routing-guide__process-notice">{processSuccess}</Alert>
      )}
      {manualDatesFor && (
        <ManualDatesModal
          carrier={manualDatesFor}
          onCancel={() => { setManualDatesFor(null); setProcessingScac(null) }}
          onConfirm={(dates) => {
            const carrier = manualDatesFor
            setManualDatesFor(null)
            runProcessScac(carrier, dates)
          }}
        />
      )}
      {processNotice && (
        <ConfirmDialog
          title="Process SCAC"
          message={processNotice.message}
          confirmLabel="OK"
          cancelLabel={null}
          onConfirm={() => setProcessNotice(null)}
          onCancel={() => setProcessNotice(null)}
        />
      )}
```

Add `Alert` to the `@odyssey/ui` import at line 5.

> **Implementer:** `ConfirmDialog` is defined locally at `RoutingGuideTab.jsx:396`. Check whether it supports an OK-only footer (`cancelLabel={null}`); if it does not, add that one branch to it rather than writing a fourth dialog component — all three of these notices are OK-only.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run src/components/detail/RoutingGuideTab.test.jsx`
Expected: PASS, 4 new tests plus every pre-existing one.

- [ ] **Step 6: Full suite + typecheck**

Run: `cd apps/odyssey-one && npx vitest run && npm run typecheck`
Expected: PASS, no type errors. Note the pre-existing `ShipmentsGlobalSearch.test.jsx` (GS-22) flake — if that is the only failure, it is not yours.

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx \
        apps/odyssey-one/src/components/detail/RoutingGuideTab.test.jsx
git commit -m "feat(tender): wire Process SCAC end to end (LINX-13954)

Walks the step list from planProcessScac; the component owns only dialogs,
the one-at-a-time lock, persistence and focus. No migration and no API change
— saveTender already upserts, so a new rank falls through its INSERT path."
```

---

## Task 5: prove it in the browser, not in jsdom

S121, S122 and S123 all shipped something that passed jsdom and was wrong or unreachable on screen. This task exists because of that record.

**Files:** none modified — this task produces evidence.

- [ ] **Step 1: Confirm the dev server is live and not stale**

```bash
lsof -ti:5173 -sTCP:LISTEN || (cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one && npm run dev:odyssey-one &)
```

A server left running from a previous session serves inert code (the S112 trap). If one was already up before this task, kill it and restart it.

- [ ] **Step 2: Walk all four branches by hand in the browser**

Open a shipment with dropped carriers, go to the Tender tab, and confirm each:

| Branch | Pick a carrier whose | Expect |
|---|---|---|
| Clean route | Reason is `No Rates` or `Prohibited Carrier` | row appears at the bottom of the Tender List, green message, gone after 3s |
| Duplicate | any carrier you already processed | the duplicate dialog, and NO second row |
| Manual dates | Reason is `Missing Transit Time` | the date dialog, then the rate reminder, then the row |
| Cancel | same, then press Cancel | nothing added |

- [ ] **Step 3: Confirm it survived the write, not just the render**

Reload the page. The processed carrier must still be in the Tender List — that proves `saveTender`'s INSERT path fired rather than the row living in React state only. If it vanishes on reload, the write failed silently; check the network tab for the PUT.

- [ ] **Step 4: Check the layout the new column created**

The dropped table now has a pinned action lane. Confirm in the browser that it pins (does not scroll with the body columns) and that the section still fits at the bottom bar's `partial` stage, where the open-by-default section already competes with the Tender List for height.

- [ ] **Step 5: Record what you saw**

Write the outcome into the Task 6 decision-log entry. "Tests pass" is not evidence for any row of the table in Step 2.

---

## Task 6: canon and decision log

**Files:**
- Modify: `vault/10-domains/shipments/decisions/dropped-carrier-decisions.md`
- Modify: `vault/10-domains/shipments/dropped-carrier.md`

- [ ] **Step 1: Record D1–D6**

Append one entry per decision, in the file's existing format — each with its source, the previous state, and what it changes. D1, D2 and D4 are **ours, not the ticket's**, and must say so in the entry.

- [ ] **Step 2: Record the two open items**

- **The "No Rates" gap is now visible on screen.** Such a carrier routes cleanly, so it lands in the Tender List with an empty cost and no prompt. Built per the ticket as ruled; this is the moment to look at it and decide whether the rule survives contact.
- **Audit logging (D5) is not built.** No table, no endpoint.

- [ ] **Step 3: Commit**

```bash
git add vault/10-domains/shipments/decisions/dropped-carrier-decisions.md \
        vault/10-domains/shipments/dropped-carrier.md
git commit -m "docs(shipments): record Process SCAC decisions D1-D6 (LINX-13954)"
```

---

## Self-review against the AC

| AC rule | Task |
|---|---|
| Process SCAC only on dropped carriers | 2 |
| Only one SCAC at a time; others disabled; extra clicks ignored | 2 (render) + 4 (`processingScac` guard) |
| Routing success → copy + refresh + 3s message | 1 (`['copy','success']`) + 4 |
| Routing failure → dates dialog → rating → reminder | 1 (`['manual-dates','rating-failed','copy']`) + 3 + 4 |
| Manual entry fields + both validations + OK/Cancel | 3 |
| Rating failure does not prevent the add | 1 — `'copy'` follows `'rating-failed'` in the list |
| Duplicate validation + message + no update | 1 + 4 |
| Insert at end; rank recalculated; route rank + RPC-ID carried | 1 (`nextRank`, `droppedCarrierToOption`) — see D3, D6 |
| Focus moves to the Tender List, row visible | 4 (`setHighlightedRank`) |
| Audit logging | **NOT BUILT — D5** |
| Processing failure message, carrier stays, retry available | 4 (catch branch: rolls the row back, unlocks) |
| Carrier remains in the Dropped Carrier section | By construction — nothing removes it (Jana: COPY) |
