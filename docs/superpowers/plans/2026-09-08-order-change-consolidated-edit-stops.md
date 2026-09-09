# Order Change (Consolidated) — Edit Shipment Stops Implementation Plan (Part 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Model policy (hard rule):** all implementation subagents run on **Sonnet**. Planning/review stays at the main model.

**Goal:** *Edit Shipment Stops* on a consolidated order-change review opens an in-place **sandbox editor** for the stop structure (LINX-15667…15671, 15869, 15871) with a **Prior** view toggle, the routing→save gate, and the two Save exits of LINX-15671. Laura's VD: Figma `x38TOJGsNryYl3LsKhCtSc` node `2134-53584`.

**Architecture:** *Edit Shipment Stops* navigates to its **own page** — `/shipments/order-change/:sellShipment/stops` (`OrderChangeEditStopsRoute.jsx`), the same shell as the Direct review route: `AppShell` + `Breadcrumb` + `PageHeader`, its own `useShipmentDetail` fetch, `buyShipment`/`from` in nav state (user ruling 2026-09-08 — *"shown in its own page like we did with direct order change, with a breadcrumb"*). The page hosts `EditStopsView`. All editing happens in a **pure sandbox model** (`stopsSandbox.js`: stops, pending orders, dirty/valid/routed flags, prior diff) so the rules are unit-tested without a DOM; the view renders it. Nothing is persisted until *Approve Changes*, which PATCHes the finalized stop structure onto `detail.shipmentStopList` through the existing `order-change` endpoint and then branches per 15671 (active tender → the Direct review's Actions card; none → Tender tab).

**Tech Stack:** React 19 + React Router 6, `@odyssey/ui` (`SubAccordion`, `ButtonToggle`, `Alert`, `HeaderStrip`, `TitleSubtitle`, `Badge`, `Button`, `StopBadge`/`Timeline`, `ModalFooter`, `ModalMedium`), Neon via `api/_lib`, node --test (api), vitest (FE).

**Part 1 dependency:** commits `788464e…95f044d` (S142). `consolidation` payload, `ConsolidationChangeVM`, `StopsTab` review mode, the three modals.

---

## Sources (provenance)

| Source | Cited as |
|---|---|
| Jira ACs LINX-15667, 15668, 15669, 15670, 15671, 15869, 15870, 15871, 15872 — `vault-sources/10-domains/shipments/sources/linx-order-change-consolidation-ac-2026-09-08.md` | `AC 156xx` |
| Laura's VD — Edit Shipment Stops `2134-53584` (1288×1346): SummaryStrip; `SubAccordion` "All Stops" with a **ButtonToggle New / Prior** in the header; head row Prior Cost · New Direct Cost · New Consol Cost · Distance · Gross Weight · Volume (last three purple-badged) + View Planning Dates / View Routing; info `Alert` *"Use the (↑ ↓) arrow buttons on each stop to move the entire stop (including all its orders) to a different position."*; per stop a `HeaderStrip` "Stop N" + type badge + ↑/↓ icon buttons, a 2×2 grid Location · Distance / Pickup Date · Delivery Date, then order rows `Order # <link> [Move To Pending]`; right column "Orders Pending To Assign" with `[Add New Order]` and rows `<order link> [+ Add to]`; `ModalFooter` Cancel / **Approve Changes** | `VD edit` |
| User rulings 2026-09-08 (this session): Prior toggle semantics; Margin dropped; AC wording | `user` |
| Part 1 plan + canon `vault/10-domains/shipments/order-change.md` §10.2 | canon |

## Decisions locked (VD ↔ AC)

| # | Decision |
|---|---|
| D1 | The editor is its **own route** `/shipments/order-change/:sellShipment/stops` (user ruling): breadcrumb *Shipments › Order Change › Edit Shipment Stops*, `PageHeader` naming the buy shipment, KPI strip, then the `SubAccordion` editor. Entry: the Stops-tab button navigates with `{ state: { buyShipment, from: 'stops' } }`. **Cancel / Scenario B exit** → `navigate('/shipments', { state: { selectedShipmentId, requestedTab: { key: 'stops' } } })` (the doorway `ShipmentsRoute` already reads), so the planner lands back on the review card. |
| D2 | Stop labels renumber per type (`P1 P2 D1`); the VD's `P3` on a delivery is a mock error. A stop without a sequence (system-created for a location change per 15668, or created by *Add to* per 15871) reads **`P?` / `D?`** and gets its number when placed via the arrows. |
| D3 | Reorder = **↑/↓ arrows** (AC says "reposition", never drag). A move that would put an order's delivery before its pickup is **blocked with the 15669 message** (`Alert variant="error"` inline, replaces the info alert until the next valid action). |
| D4 | Per stop the VD shows Location · Distance · Pickup Date · Delivery Date read-only. 15669's editable Planned Date/Time/TZ is **not in this slice** (Q7 — no control in the VD). Routing readiness therefore checks only "no `P?`/`D?`" + "dates present". |
| D5 | **Move To Pending** = 15869 remove: order leaves its stops → pending list; stops with no orders left are removed; renumber. Disabled + tooltip *"The last remaining order cannot be removed from the shipment."* when it's the last order in the shipment. |
| D6 | **Add to** = 15871: match the order's ship-from/ship-to against existing stops (facility + city); reuse or create `P?`/`D?` at the end of its group. Automatic; label kept (Q8). |
| D7 | **Add New Order** (15870 search) is **disabled "Coming soon"** — no VD for the search grid yet; 15872 (external move at Save) is out of this slice. |
| D8 | **Gate** (15670/15869/15871/15872): *View Routing* enabled iff routable; *Approve Changes* enabled iff routing ran after the last edit. Any edit clears `routed`. |
| D9 | **View Routing** in the sandbox = *Call Routing* by purpose (DEC-135): the click marks the sandbox routed and opens the existing `ViewRoutingModal` (New/Prior/Dropped). No live routing in the prototype — the seed's `newTenderList` stands in. Label stays "View Routing" per the VD. |
| D10 | **Approve Changes** = 15671 Save: PATCH `{ action: 'save-stops', stops }` → `detail.shipmentStopList` replaced, `orderChange.resolution` stamped; then **Scenario A** (tender To Be Tendered/Sent/Accepted) → navigate to `/shipments/order-change/:id` (Direct Actions card, `state.from = 'stops'`); **Scenario B** → `onRequestTab('routing')`, status stays Review. |
| D11 | **Cancel** with a dirty sandbox → `DiscardChangesModal` (existing); clean → straight back to the review card. |
| D12 | **Prior toggle** (`user`): `ButtonToggle New/Prior` in the SubAccordion header; **disabled until dirty**. Prior view: title "All Stops - Prior Changes"; renders the pre-edit structure read-only; every control in the slot disabled; pending column grayed; the info `Alert` reads **"Prior changes view mode"**; changes the planner made are highlighted **amber** (`Badge variant="amber"` on moved stops' labels, removed orders, changed positions) — amber = "what you changed", purple stays "what the customer changed". |
| D13 | Margin dropped; "New Consolidated Cost"; head Distance/Gross Weight/Volume are the **sandbox totals** (recomputed from current stops) and badge purple when they differ from the pre-change values. |

**Open for Laura/Jana (log in canon §12):** Q7 per-stop date/time/TZ control; Q8 *Add to* — automatic placement or a stop picker?; Q9 Search & Add Orders VD; Q10 Save copy — "Approve Changes" (VD) vs "Save" (AC).

---

## File structure

| File | Responsibility |
|---|---|
| `apps/odyssey-one/src/components/detail/order-change/stopsSandbox.js` (create) | Pure sandbox model: init, moveStop, moveToPending, addToStop, renumber, totals, validity, routed flag, prior diff, toDto. |
| `apps/odyssey-one/src/components/detail/order-change/stopsSandbox.test.js` (create) | Rules tests. |
| `apps/odyssey-one/src/components/detail/order-change/EditStopsView.jsx` (create) | The editor UI (header toggle, head, alert, stop cards, pending column, footer). |
| `apps/odyssey-one/src/components/detail/order-change/EditStopsView.test.jsx` (create) | Interaction tests. |
| `apps/odyssey-one/src/components/detail/order-change/edit-stops.css` (create) | Tokens-only styles, scoped `.edit-stops*`. |
| `apps/odyssey-one/src/routes/shipments/OrderChangeEditStopsRoute.jsx` (create) | Page shell mirroring `OrderChangeReviewRoute.jsx`: breadcrumb, header, detail fetch, loading/error states, hosts `EditStopsView`. |
| `apps/odyssey-one/src/routes/shipments/OrderChangeEditStopsRoute.test.jsx` (create) | Shell + navigation tests. |
| `apps/odyssey-one/src/App.jsx` (modify) | `<Route path="/shipments/order-change/:sellShipment/stops" …/>` next to the Direct route (App.jsx:84). |
| `apps/odyssey-one/src/components/detail/StopsTab.jsx` (modify) | Edit Shipment Stops enabled → `navigate(…/stops, { state: { buyShipment, from: 'stops' } })`. |
| `apps/odyssey-one/src/components/detail/StopsTab.test.jsx` (modify) | Navigation test (MemoryRouter + probe, same idiom as ShipmentTable.test.jsx). |
| `apps/odyssey-one/src/components/detail/BottomBar.jsx` (modify) | Re-adds `shipment` to `<StopsTab>` (buyShipment for nav state). |
| `apps/odyssey-one/api/_lib/shipments.mjs` (modify) | `save-stops` action: `buildSaveStopsQuery` writes `detail.shipmentStopList` + resolution. |
| `apps/odyssey-one/api/_lib/shipments.test.mjs` (modify) | Query + handler tests. |
| `apps/odyssey-one/src/api/queries/useResolveOrderChange.ts` (modify) | `'save-stops'` + `stops` in the input. |
| `apps/odyssey-one/src/api/services/shipmentService.ts` (modify, only if the body type is declared there) | Pass `stops` through. |
| `vault/10-domains/shipments/order-change.md`, `decisions/decision-log.md` (modify) | §10.2/§10.3 update; DEC-136…139. |

Commit tag: **`S143:`** (new session thread; product → `progress.md`).

---

### Task 1: Sandbox model (`stopsSandbox.js`)

**Files:** create `stopsSandbox.js`, `stopsSandbox.test.js` (vitest, node env — no DOM).

Inputs: `stops` = `StopVM[]` (`type`, `stopNumber`, `orderIds`, `location`, `address`, `date`, `weight`, `volume`, `packageCount`, …), `consolidation` = `ConsolidationChangeVM`, `orders` = `OrderDetailVM[]` (`orderNumber`, `shipFrom.{company,location}`, `shipTo.{…}`, `grossWeight`, `totalVolume`, `earliestPickup`, `latestPickup`, `earliestDelivery`, `latestDelivery`).

- [ ] **Step 1: Failing tests**

```js
import { describe, it, expect } from 'vitest'
import { initSandbox, moveStop, moveToPending, addToStop, canMoveStop, labelsOf, isRoutable, markRouted, totals, priorDiff } from './stopsSandbox'

const stop = (over) => ({ type: 'pickup', stopNumber: 1, orderIds: ['A'], location: 'X, City', address: '1 St', date: 'June 4, 2026 08:00 CDT', weight: '10 LB', volume: '1 cuft', packageCount: '1', ...over })
const stops = [stop({ stopNumber: 1, orderIds: ['A', 'B'] }), stop({ stopNumber: 2, orderIds: ['C'], location: 'Y, Town' }), stop({ type: 'delivery', stopNumber: 3, orderIds: ['A', 'B', 'C'], location: 'Z, Ville' })]
const orders = [
  { orderNumber: 'A', shipFrom: { company: 'X', location: 'X, City' }, shipTo: { company: 'Z', location: 'Z, Ville' }, grossWeight: '5 LB', totalVolume: '1 cuft' },
  { orderNumber: 'B', shipFrom: { company: 'X', location: 'X, City' }, shipTo: { company: 'Z', location: 'Z, Ville' }, grossWeight: '5 LB', totalVolume: '1 cuft' },
  { orderNumber: 'C', shipFrom: { company: 'Y', location: 'Y, Town' }, shipTo: { company: 'Z', location: 'Z, Ville' }, grossWeight: '5 LB', totalVolume: '1 cuft' },
]
const noChange = { locationChange: false, changedOrderIds: [], stopChanges: {}, orderComparisons: {}, summaryChanges: {}, costs: {} }

describe('initSandbox', () => {
  it('copies stops, labels P1 P2 D1, not dirty, not routed', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    expect(labelsOf(s)).toEqual(['P1', 'P2', 'D1'])
    expect(s.dirty).toBe(false); expect(s.routed).toBe(false); expect(s.pending).toEqual([])
  })
  it('applies a location change: order leaves its pickup, lands on a new P? at the end of the pickup group (LINX-15668)', () => {
    const c = { ...noChange, locationChange: true, changedOrderIds: ['C'], stopChanges: { '2': { changedOrderIds: ['C'], fields: { location: { prior: 'Y, Town', new: 'Q, Burg' } } } } }
    const s = initSandbox({ stops, consolidation: c, orders })
    expect(labelsOf(s)).toEqual(['P1', 'P?', 'D1'])          // stop 2 emptied → removed; new P? appended after pickups
    expect(s.stops[1]).toMatchObject({ type: 'pickup', unsequenced: true, orderIds: ['C'], location: 'Q, Burg' })
    expect(isRoutable(s)).toBe(false)                          // P? present
  })
})
describe('moveStop', () => {
  it('moves a stop up/down and renumbers; placing a P? sequences it', () => {
    const c = { ...noChange, locationChange: true, changedOrderIds: ['C'], stopChanges: { '2': { changedOrderIds: ['C'], fields: { location: { prior: 'Y, Town', new: 'Q, Burg' } } } } }
    let s = initSandbox({ stops, consolidation: c, orders })
    s = moveStop(s, 1, 'up')
    expect(labelsOf(s)).toEqual(['P1', 'P2', 'D1'])
    expect(s.stops[0].orderIds).toEqual(['C']); expect(s.dirty).toBe(true); expect(isRoutable(s)).toBe(true)
  })
  it('refuses a move that puts a delivery before one of its pickups (LINX-15669)', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    expect(canMoveStop(s, 2, 'up')).toEqual({ ok: false, reason: 'An order must be picked up before it can be delivered.' })
    expect(moveStop(s, 2, 'up')).toBe(s)                       // unchanged reference
  })
})
describe('moveToPending / addToStop', () => {
  it('removes the order from every stop, drops emptied stops, renumbers without gaps (LINX-15869)', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = moveToPending(s, 'C')
    expect(s.pending).toEqual(['C']); expect(labelsOf(s)).toEqual(['P1', 'D1'])
    expect(s.stops[1].orderIds).toEqual(['A', 'B'])
  })
  it('refuses to remove the last remaining order', () => {
    let s = initSandbox({ stops: [stop({ orderIds: ['A'] }), stop({ type: 'delivery', stopNumber: 2, orderIds: ['A'] })], consolidation: noChange, orders: orders.slice(0, 1) })
    expect(moveToPending(s, 'A')).toBe(s)
  })
  it('addToStop matches an existing stop by location, else creates P?/D? (LINX-15871)', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = moveToPending(s, 'C')                                    // C's pickup stop Y is gone now
    s = addToStop(s, 'C')
    expect(s.pending).toEqual([])
    expect(labelsOf(s)).toEqual(['P1', 'P?', 'D1'])              // pickup Y recreated as P?; delivery Z matched D1
    expect(s.stops[2].orderIds).toEqual(['A', 'B', 'C'])
  })
})
describe('gate + totals + prior', () => {
  it('any edit clears routed', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = markRouted(s); expect(s.routed).toBe(true)
    s = moveToPending(s, 'C'); expect(s.routed).toBe(false)
  })
  it('totals sum the orders on pickup stops', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    expect(totals(s, orders)).toEqual({ grossWeight: '15 LB', volume: '3 cuft' })
  })
  it('priorDiff reports moved/removed/added relative to the initial structure', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = moveToPending(s, 'C')
    expect(priorDiff(s)).toEqual({ removedOrderIds: ['C'], movedStopKeys: [], addedStopKeys: [], removedStopKeys: [s.prior[1].key] })
  })
})
```

- [ ] **Step 2: Run** `rtk vitest run src/components/detail/order-change/stopsSandbox.test.js` → FAIL.

- [ ] **Step 3: Implement** — pure functions, immutable updates, each stop carries a stable `key` (from `stopNumber` or a counter for created stops), `type`, `orderIds`, `location`, `address`, `date`, `unsequenced`:

```js
// stopsSandbox.js — LINX-15667 "Entire screen is like Sandbox": the whole
// Compare Screen edits THIS object; nothing reaches the API until Approve.
const clone = (o) => JSON.parse(JSON.stringify(o))
const isPickup = (s) => s.type === 'pickup'

export function initSandbox({ stops, consolidation, orders }) {
  let next = stops.map((s) => ({ key: `s${s.stopNumber}`, type: s.type, orderIds: [...s.orderIds], location: s.location, address: s.address, date: s.date, unsequenced: false }))
  // LINX-15668 — a location change moves the order to a matching stop or a new P?/D?
  // appended at the end of its group; the emptied stop is removed.
  for (const [seq, sc] of Object.entries(consolidation?.stopChanges ?? {})) {
    const loc = sc.fields?.location
    if (!loc) continue
    const src = next.find((s) => s.key === `s${seq}`)
    if (!src) continue
    for (const id of sc.changedOrderIds) next = placeOrder(next, id, src.type, loc.new, `${seq}:${id}`)
    next = next.map((s) => (s.key === src.key ? { ...s, orderIds: s.orderIds.filter((id) => !sc.changedOrderIds.includes(id)) } : s)).filter((s) => s.orderIds.length)
  }
  const prior = clone(next.map((s) => ({ ...s })))
  return { stops: next, pending: [], prior, dirty: false, routed: false, seq: 0 }
}
function placeOrder(stops, orderId, type, location, keyHint) {
  const match = stops.find((s) => s.type === type && s.location === location)
  if (match) return stops.map((s) => (s === match ? { ...s, orderIds: [...s.orderIds, orderId] } : s))
  const created = { key: `new:${type}:${keyHint}`, type, orderIds: [orderId], location, address: '', date: '', unsequenced: true }
  const lastOfType = stops.map((s) => s.type).lastIndexOf(type)
  const at = lastOfType === -1 ? (type === 'pickup' ? 0 : stops.length) : lastOfType + 1
  return [...stops.slice(0, at), created, ...stops.slice(at)]
}
export function labelsOf(sb) { let p = 0, d = 0; return sb.stops.map((s) => (s.unsequenced ? (isPickup(s) ? 'P?' : 'D?') : isPickup(s) ? `P${++p}` : `D${++d}`)) }
export function canMoveStop(sb, index, dir) {
  const to = dir === 'up' ? index - 1 : index + 1
  if (to < 0 || to >= sb.stops.length) return { ok: false, reason: 'Already at the edge.' }
  const arr = [...sb.stops]; [arr[index], arr[to]] = [arr[to], arr[index]]
  return validSequence(arr) ? { ok: true } : { ok: false, reason: 'An order must be picked up before it can be delivered.' }
}
// LINX-15669 §2: every pickup of an order precedes that order's delivery.
function validSequence(stops) {
  return stops.every((s, i) => !isPickup(s) ? s.orderIds.every((id) => stops.slice(0, i).some((p) => isPickup(p) && p.orderIds.includes(id))) : true)
}
const touched = (sb, stops, extra = {}) => ({ ...sb, stops, dirty: true, routed: false, ...extra })
export function moveStop(sb, index, dir) {
  const v = canMoveStop(sb, index, dir); if (!v.ok) return sb
  const to = dir === 'up' ? index - 1 : index + 1
  const arr = [...sb.stops]; [arr[index], arr[to]] = [arr[to], arr[index]]
  return touched(sb, arr.map((s, i) => (i === to ? { ...s, unsequenced: false } : s)))
}
export function moveToPending(sb, orderId) {
  const all = new Set(sb.stops.flatMap((s) => s.orderIds))
  if (all.size <= 1) return sb                                   // LINX-15869: last order stays
  const stops = sb.stops.map((s) => ({ ...s, orderIds: s.orderIds.filter((id) => id !== orderId) })).filter((s) => s.orderIds.length)
  return touched(sb, stops, { pending: [...sb.pending, orderId] })
}
export function addToStop(sb, orderId, orders) { /* LINX-15871: pickup → placeOrder(type pickup, order.shipFrom.location); delivery → placeOrder(type delivery, order.shipTo.location) */ }
export function isRoutable(sb) { return sb.stops.every((s) => !s.unsequenced && s.date) && sb.stops.length > 0 }
export function markRouted(sb) { return { ...sb, routed: true } }
export function totals(sb, orders) { /* Σ grossWeight/totalVolume of orders on pickup stops, formatted `${fmtInt} LB` / `cuft` (parse numbers out of the VM strings with /[^0-9.]/g) */ }
export function priorDiff(sb) { /* compare sb.stops vs sb.prior by key: removedStopKeys, addedStopKeys (new:*), movedStopKeys (index changed among survivors), removedOrderIds (= pending) */ }
export function toDto(sb, priorDto) { /* SellShipmentStop[] in the current order: stopSequence = index+1, stopType, orderIds, facility/city/address parsed from location, scheduledDateTime from date; created stops carry the location string only */ }
```
Write the bodies the tests demand; keep every function pure; `// ponytail:` where a heuristic is used (location matching is `facility, city` string equality — the AC's Location-ID+address match is the upgrade).

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `S143: stops sandbox model — placement, reorder validation, pending, routing gate (LINX-15667…15871)`.

---

### Task 2: `EditStopsView` — the editor UI

**Files:** create `EditStopsView.jsx`, `EditStopsView.test.jsx`, `edit-stops.css`; modify `StopsTab.jsx`, `StopsTab.test.jsx`, `BottomBar.jsx`.

- [ ] **Step 1: Failing tests** (jsdom; fixtures as in Task 1, wrapped in a `MemoryRouter`):

```jsx
it('Edit Shipment Stops swaps the review card for the editor and back on Cancel', () => {
  renderReview()                                    // Part 1 helper, plus onRequestTab: vi.fn()
  fireEvent.click(screen.getByRole('button', { name: 'Edit Shipment Stops' }))
  expect(screen.getByText('Orders Pending To Assign')).toBeTruthy()
  expect(screen.getByText(/arrow buttons on each stop/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByText('Orders Pending To Assign')).toBeNull()
})
it('arrows reorder; an illegal move shows the 15669 message', () => { /* click ↓ on P1 with two pickups → labels P1/P2 swap; click ↑ on D1 above its pickup → error Alert text 'An order must be picked up before it can be delivered.' */ })
it('Move To Pending lists the order on the right and disables when it is the last order', () => { /* … tooltip text 'The last remaining order cannot be removed from the shipment.' */ })
it('Add to returns a pending order to a matched stop', () => { /* … */ })
it('View Routing is disabled while a P? exists; Approve Changes is disabled until routing ran; an edit after routing disables it again', () => { /* … */ })
it('Prior toggle is disabled until dirty; Prior view is read-only with the title and alert copy', () => {
  /* enter editor → toggle disabled; Move To Pending → enabled; click Prior → heading 'All Stops - Prior Changes', Alert 'Prior changes view mode', every button in the slot disabled, pending column has class edit-stops__pending--muted, removed order carries an amber badge */
})
it('Approve Changes: Scenario A navigates to the Direct actions route; Scenario B requests the routing tab', () => { /* mock useResolveOrderChange; tenderStatus 'Sent' → navigate called with /shipments/order-change/1; tenderStatus 'Cancelled' → onRequestTab('routing') */ })
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement `EditStopsView.jsx`** (skeleton — fill per VD):

```jsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUp, ArrowDown, ClipboardList, Plus, TriangleAlert } from 'lucide-react'
import { Alert, Badge, Button, ButtonToggle, HeaderStrip, ModalFooter, StopBadge, SubAccordion, TitleSubtitle } from '@odyssey/ui'
import { ICON_MD } from '@odyssey/tokens'
import TooltipTrigger from '../../ui/TooltipTrigger.jsx'
import DiscardChangesModal from '../DiscardChangesModal.jsx'
import PlanningDatesModal from './PlanningDatesModal.jsx'
import ViewRoutingModal from './ViewRoutingModal.jsx'
import { useResolveOrderChange } from '../../../api/queries/useResolveOrderChange'
import * as sb from './stopsSandbox.js'
import './edit-stops.css'

const ACTIVE_TENDER = ['To Be Tendered', 'Sent', 'Accepted']
const HINT = 'Use the (↑ ↓) arrow buttons on each stop to move the entire stop (including all its orders) to a different position.'

export default function EditStopsView({ stops, consolidation, orders, orderChange, sellShipment, buyShipment, tenderStatus, onExit }) {   // onExit = navigate back to /shipments with the row selected on 'stops'
  const [state, setState] = useState(() => sb.initSandbox({ stops, consolidation, orders }))
  const [view, setView] = useState('first')          // ButtonToggle: first = New, second = Prior
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)           // 'planning' | 'routing' | 'discard'
  const navigate = useNavigate()
  const resolve = useResolveOrderChange()
  const prior = view === 'second'
  const shown = prior ? { ...state, stops: state.prior } : state
  const labels = sb.labelsOf(shown)
  const diff = useMemo(() => sb.priorDiff(state), [state])

  const act = (fn) => { setError(null); setState(fn) }
  const move = (i, dir) => { const v = sb.canMoveStop(state, i, dir); if (!v.ok) return setError(v.reason); act((s) => sb.moveStop(s, i, dir)) }
  const approve = () => {
    resolve.mutate({ sellShipment: shipment.sellShipment, action: 'save-stops', stops: sb.toDto(state), priorTenderStatus: shipment.tenderStatus ?? null, cost: null, priorScac: null }, {
      onSuccess: () => ACTIVE_TENDER.includes(tenderStatus)
        ? navigate(`/shipments/order-change/${sellShipment}`, { state: { buyShipment, from: 'stops' } })                                 // LINX-15671 Scenario A
        : navigate('/shipments', { state: { selectedShipmentId: sellShipment, requestedTab: { key: 'routing' } } }),                    // Scenario B → Tender tab
    })
  }
  const header = <ButtonToggle firstLabel="New" secondLabel="Prior" selected={view} onChange={setView} disabled={!state.dirty} firstAriaLabel="New structure" secondAriaLabel="Prior structure" />
  // … SubAccordion title={prior ? 'All Stops - Prior Changes' : 'All Stops'} buttonToggle={header} collapsible={false}   (SubAccordion has a dedicated `buttonToggle` slot at the head of the action cluster — use it, not `action`)
  // … head: costs (consolidation.costs) + Distance/Gross Weight/Volume from sb.totals(state, orders) badged purple when ≠ pre-change; View Planning Dates; View Routing disabled={!sb.isRoutable(state) || prior}
  // … <Alert variant={error ? 'error' : 'info'} showClose={false}>{prior ? 'Prior changes view mode' : (error ?? HINT)}</Alert>
  // … stop cards: StopBadge label={labels[i]} status={diff.movedStopKeys.includes(s.key) && prior ? 'issue' : 'completed'}; HeaderStrip title=`Stop ${i+1}` badge=<Badge green>{type}</Badge> trail={!prior && <><Button variant="icon" aria-label="Move stop up" disabled={i===0} onClick={() => move(i,'up')}><ArrowUp/></Button><Button variant="icon" … down/></>}
  //     Data 2×2: Location · Distance / Pickup Date · Delivery Date; order rows: <span>Order #</span> <Button variant="link">{id}</Button> <Button variant="secondary" iconLeft={<ClipboardList/>} disabled={prior || lastOrder} onClick={() => act(s => sb.moveToPending(s, id))}>Move To Pending</Button> (wrap in TooltipTrigger with the 15869 copy when lastOrder)
  //     in Prior view: an order in diff.removedOrderIds renders <Badge variant="amber">{id}</Badge>; a stop in movedStopKeys gets an amber "Moved" badge next to its type badge
  // … pending column: <aside className={`edit-stops__pending${prior ? ' edit-stops__pending--muted' : ''}`}> HeaderStrip "Orders Pending To Assign"; <TooltipTrigger 'Coming soon'><Button variant="secondary" disabled>Add New Order</Button></TooltipTrigger>; rows per state.pending: link + <Button variant="secondary" iconLeft={<Plus/>} disabled={prior} onClick={() => act(s => sb.addToStop(s, id, orders))}>Add to</Button>
  // … <ModalFooter> Cancel → state.dirty ? setModal('discard') : onExit(); Approve Changes primary disabled={!state.routed || prior || resolve.isPending}
  // … modals: PlanningDatesModal orders={orders on current stops, live}; ViewRoutingModal onOpen → act(markRouted) ; DiscardChangesModal onDiscard=onExit onStay=close
}
```
`Button variant="icon"` exists (used in RoutingGuideTab.jsx:789) — use it with an `aria-label`. `ButtonToggle` has NO `disabled` prop (verified: it spreads `...props` on its root) — add one to the component in `packages/ui/src/ButtonToggle.jsx` (both inner buttons `disabled`, root `aria-disabled`; default false, byte-identical otherwise; Figma-first rule applies → this is a code-only state per feedback_control_state_model, note it in the tracker), rather than wrapping. Check `SubAccordion`'s `action` prop renders at the header's action cluster (its docblock says so).

`OrderChangeEditStopsRoute.jsx`: copy the shell pattern of `OrderChangeReviewRoute.jsx` (lines 1–80: `useParams`, `useLocation().state.buyShipment`, `useShipmentDetail`, `AppShell`, `Breadcrumb` [Shipments → Order Change (link back to the Direct-style landing) → Edit Shipment Stops], `PageHeader`, loading `EmptyState`/error `Alert`). Renders `<KpiStrip>`-equivalent (reuse the review-mode summary pairs — extract `KpiStrip` from `StopsTab.jsx` into `order-change/ReviewKpiStrip.jsx` so both surfaces share it) then `<EditStopsView … onExit={() => navigate('/shipments', { state: { selectedShipmentId: sellShipment, requestedTab: { key: 'stops' } } })} />`. Guard: if `detail.orderChange?.consolidation` is absent or resolved, show an `EmptyState` "Nothing to edit" with a link back. `StopsTab.jsx`: Edit Shipment Stops → `navigate(\`/shipments/order-change/${shipment.sellShipment}/stops\`, { state: { buyShipment: shipment.buyShipment, from: 'stops' } })` (drop the "Coming soon" wrapper). `BottomBar.jsx`: pass `shipment` to `StopsTab` again. `App.jsx`: add the route.

CSS (`edit-stops.css`, tokens only): `.edit-stops__card` grid `1fr 391px`; `.edit-stops__order-row` 48px rows with bottom hairline; `.edit-stops__pending--muted { opacity: .5; pointer-events: none }`; `.edit-stops__head` like `.stops-review__head`.

- [ ] **Step 4: Run** `rtk vitest run src/components/detail` → PASS; `npm run build` clean. **Step 5: Commit** — `S143: Edit Shipment Stops editor — reorder, pending, prior view, routing→approve gate (LINX-15667…15871, VD 2134-53584)`.

---

### Task 3: `save-stops` API action

**Files:** modify `api/_lib/shipments.mjs`, `api/_lib/shipments.test.mjs`, `src/api/queries/useResolveOrderChange.ts` (+ `shipmentService.ts` body type if declared).

- [ ] **Step 1: Failing test**

```js
test('save-stops writes the finalized stop list and re-files like bypass', async () => {
  const calls = []
  const db = { query: async (q) => { calls.push(q); return { rowCount: 1 } } }
  const stops = [{ stopSequence: 1, stopType: 'pickup', orderIds: ['A'] }, { stopSequence: 2, stopType: 'delivery', orderIds: ['A'] }]
  await resolveOrderChange({ params: ['123'], body: { action: 'save-stops', priorTenderStatus: 'Sent', stops }, db })
  assert.equal(calls.length, 2)
  assert.match(calls[0].text, /shipmentStopList/)
  assert.deepEqual(JSON.parse(calls[0].values[0]), stops)
  assert.deepEqual(calls[1].values.slice(0, 3), ['Sent', 'monitoring', 'sent'])
})
```

- [ ] **Step 2: Run** `node --test api/_lib/shipments.test.mjs` → FAIL.

- [ ] **Step 3: Implement**

```js
// LINX-15671 Save — the sandbox's finalized stop structure replaces
// detail.shipmentStopList (same jsonb the detail endpoint returns verbatim,
// DEC-106), then the row re-files exactly like bypass: Scenario A's tender
// decision happens on the NEXT screen (the Direct Actions card), Scenario B
// leaves the row in Review for the planner to tender from the Tender tab.
export function buildSaveStopsQuery(sellShipment, stops) {
  return { text: `UPDATE shipments SET detail = jsonb_set(detail, '{shipmentStopList}', $1::jsonb) WHERE sell_shipment = $2 RETURNING sell_shipment`, values: [JSON.stringify(stops), sellShipment] }
}
// in OC_OUTCOMES:
  'save-stops': (prior) => OC_OUTCOMES.bypass(prior),
// in resolveOrderChange, before the resolution write:
  if (action === 'save-stops') {
    if (!Array.isArray(body?.stops) || body.stops.length === 0) { const e = new Error('save-stops requires a non-empty stops array'); e.status = 400; throw e }
    await db.query(buildSaveStopsQuery(params[0], body.stops))
  }
```
`useResolveOrderChange.ts`: `action: 'retender' | 'bypass' | 'cancel' | 'approve-plan' | 'save-stops'`, optional `stops?: SellShipmentStop[]` passed through to the service.

Note: with Scenario A the row re-files to monitoring and the planner lands on the Direct Actions card — that card reads `orderChange` and expects a *pending* review (no `resolution`). **Decide in implementation:** for `save-stops` write `resolution: { action: 'save-stops', … , pendingTenderDecision: true }` and have `OrderChangeReviewRoute`/`RoutingGuideTab` treat `pendingTenderDecision` as still-pending — OR keep the row in exceptions/order-change until the tender decision resolves it. Prefer the second (fewer moving parts): `'save-stops'` outcome = `{ tenderStatus: prior, panel: 'exceptions', category: 'order-change', validationMessage: <unchanged> }` when `ACTIVE_TENDER.includes(prior)`, else bypass's outcome. Write the test for both branches.

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `S143: save-stops order-change action persists the finalized stop list (LINX-15671)`.

---

### Task 4: Canon + decision log

- `order-change.md` §10.2 → "built (S143)" rows; DEC-132 amended: the Tender-tab *Review Order Change* jump-to-Stops for consolidated shipments is OUR inference (15435 describes opening the shipment, not a button) — confirm with Jana (OC-open-17) for 15667/15668/15669(partial)/15670/15671/15869/15871; §10.3 extended; §12 Q7–Q10 as OC-open-13…16.
- `decision-log.md`: **DEC-136** editor in place on the Stops tab with the Prior toggle semantics (user ruling); **DEC-137** arrows not DnD, blocked-move message; **DEC-138** *Add to* automatic placement; **DEC-139** Approve Changes = 15671 Save with Scenario A/B, Scenario A keeps the row in order-change until the tender decision.
- Commit `S143: canon §10.2 — Edit Shipment Stops shipped; DEC-136…139`.

---

## Self-review
- **Coverage:** 15667 (launch, three sections, actions) T2; 15668 (auto stop creation, P?/D?, empty-stop removal) T1; 15669 (reorder + validation; dates **partial**, Q7) T1/T2; 15670 (routing gate, options review) T2 via `ViewRoutingModal`; 15671 (Save + A/B) T2/T3; 15869 (remove, last-order rule, renumber, re-route gate) T1/T2; 15871 (add → match/create) T1/T2. **Deferred:** 15870 search grid (Q9), 15872 external move, per-stop date/time/TZ entry (Q7).
- **Names:** `initSandbox/moveStop/canMoveStop/moveToPending/addToStop/labelsOf/isRoutable/markRouted/totals/priorDiff/toDto` used identically in T1 and T2; action `'save-stops'` in T2 and T3; route path `/shipments/order-change/:sellShipment/stops` in App.jsx, StopsTab and the route file; exits use `ShipmentsRoute`'s `location.state.{selectedShipmentId, requestedTab}` doorway.
