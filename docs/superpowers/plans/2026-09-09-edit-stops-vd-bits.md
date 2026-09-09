# Edit Shipment Stops — Missing VD Bits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Model policy (hard rule):** all implementation subagents run on **Sonnet**. Planning/review stays at the main model.

**Goal:** Close the four VD gaps S143 left on Edit Shipment Stops: the **Approve Shipment Change** confirmation (VD `2066-77150`), the **Add to** stop picker (VD `2076-8110`), the **order hover Tooltip** (VD `2143-11775`), and the **Add New Order(s)** search modal with its inner Filters view (VD `2137-59231`, LINX-15870). Closes OC-open-14 and OC-open-15.

**Architecture:** Everything stays on the S143 shape — a pure `stopsSandbox.js` gains two functions (`addToStop` with a target stop, `addPending`), `EditStopsView` gains three surfaces (ConfirmDialog, ActionMenu, AddOrdersModal) and a `TooltipTrigger` on every order link. Candidate orders for the search come from ONE pure builder in `api/_lib/candidateOrders.mjs` (the app already imports `api/_lib` modules — `src/search/orders/criteria.js` is the precedent) run over the mock datasets in `mock` mode and over a Neon join in `live` mode; the modal filters client-side. On **Add Order(s)** the app fetches each selected order's SOURCE shipment through the existing `getSellShipmentDetail` and takes the `OrderDetailVM` off it, so external orders enter the sandbox in exactly the shape the shipment's own orders have (same `fmtLocation`, so match-or-create works). `save-stops` learns `externalOrders`: it revalidates the source shipment (15872 statuses), copies the order record into this shipment's `orderList`, and drops every order left pending (the confirm modal's promise).

**Tech Stack:** React 19, `@odyssey/ui` (`ModalMedium`, `ActionMenu`, `Tooltip`, `GroupTable flat selectable`, `ComboBox`, `FilterButton`, `FormField`, `DatePicker`, `Dropdown`, `Alert`, `Button`), `ConfirmDialog` (app), TanStack Query, Neon via `api/_lib`, node --test (api), vitest + jsdom (app).

---

## Sources (provenance)

| Source | Cited as |
|---|---|
| Jira ACs LINX-15869, 15870, 15871, 15872 — `vault-sources/10-domains/shipments/sources/linx-order-change-consolidation-ac-2026-09-08.md` | `AC 158xx` |
| VD `2066-77150` — `ModalMedium` "Approve Shipment Change"; body *"Any orders left pending for assignment will be removed from this shipment when you approve it."*; footer Cancel / primary reads **"Remove Order"** | `VD confirm` |
| VD `2076-8110` — `DropdownMenu` of `MenuRow`s "Stop 1 / Stop 2 / Stop 3" opened from *Add to* | `VD addto` |
| VD `2143-11775` — frame named *"Should Be In A ToolTip"*: strip "Order Number: 000000004859", a "Details" strip, rows Planning Type · Pickup/ Delivery Date Time · Volume · Origin · Destination | `VD tooltip` |
| VD `2137-59231` — `ModalMedium` "Add New Order(s)": `ComboBox` search + `FilterButton` "Filter" + Button "Clear All"; `GroupTable` header strip "Results (2)", select column, 11 columns Customer · Origin · Destination · Order Number · Order Weight · Order Volume · Buy Shipment · Shipment Status · Tender Status · Shipment Type · Orders in the Shipment; footer Cancel / **Add Order(s)**. User: *"if filters is clicked we show them in the inner modal"* (modal navigation stack) | `VD add` |
| S143 canon §10.3, DEC-136…139, OC-open-13…17 — `vault/10-domains/shipments/order-change.md` | canon |

## Decisions locked

| # | Decision | Source |
|---|---|---|
| D1 | **Approve Changes opens a confirm** (`ConfirmDialog` over `ModalMedium`): title *Approve Shipment Change*, the VD body verbatim, Cancel / **Approve**. The VD's primary label "Remove Order" is a copy leftover from the sibling remove dialog — shipped as "Approve", logged **OC-open-18** for Laura. Shown on every approve (the body's "any orders left pending" already reads as conditional). | `VD confirm`, inference |
| D2 | **Pending orders are dropped at Save** — the confirm's promise. Server: `orderList` keeps only orders that sit on a stop. (15869: "Removed orders shall be permanently removed from the shipment" — the Phase-1 "new shipment for the removed order" is NOT built; **OC-open-19**.) | `AC 15869`, `VD confirm` |
| D3 | **Add to = stop picker** (user ruling 2026-09-09: the pending column is a buffer pool, the planner CHOOSES where an order goes). `ActionMenu label="Add to"` → menu rows **`Stop N · Pickup · <location>`** / **`Stop N · Delivery · <location>`** (the VD's bare "Stop 1/2/3" is an example, not the copy). Picking a stop puts the order on it as that stop's leg; the order's OTHER leg is placed by the 15871 rule (matching location → join, else new `P?`/`D?`). Re-placing that other leg by hand needs a per-order *Move to* (Jana's deck: "move the order to any stop") — no VD, **OC-open-21**, not in this slice. Closes OC-open-14. | `user`, `VD addto`, `AC 15871` |
| D4 | **Order hover = the canon `Tooltip`** (dark card, header label + subtitle/content groups) via `TooltipTrigger`, on every order link (stop rows and pending rows). Header *Order Number: N*; groups Planning Type · Pickup Date Time / Delivery Date Time (the STOP's leg; both on a pending row) · Volume · Origin · Destination. The VD draws a light table card and names itself "Should Be In A ToolTip" — the normalized Tooltip is that component; its "Details" strip has no Tooltip equivalent and is dropped. Logged **DEC-142**. | `VD tooltip` |
| D5 | **Add New Order(s)** = `AddOrdersModal`: search + Filter + Clear All over a flat selectable `GroupTable` with the VD's 11 columns, default sort Buy Shipment ascending, **max five selected** (a sixth pick is refused with an inline `Alert`), footer Cancel / Add Order(s). Filter opens a **second `ModalMedium` with `onBack`** (the DSM's documented modal navigation stack) holding Customer (locked to this shipment) · Order # · Buy Shipment · Ship Date · Delivery Date · Origin · Destination · Shipment Status · Tender Status, footer Clear / Apply. Draft filters apply on Apply only. Closes OC-open-15. | `VD add`, `AC 15870` |
| D6 | **Candidate population** = every order of another shipment of the SAME customer, minus this shipment's orders (and anything already pending). The AC's eight eligible shipment statuses are not the seed's vocabulary (`''`, `Done`, `Review`) — no status gate is applied; **OC-open-20**. Search text matches order #, buy shipment, origin, destination, orders-in-shipment. **Blocked rows** (user ruling 2026-09-09, closes OC-open-11): an order whose shipment would fail the 15872 Save check — shipment status `Approved/Done/SpotBid/Bid Review` or tender `To Be Tendered/Sent/Accepted` — is listed **greyed and not selectable** (`selectDisabled`), its Order Number carrying a Tooltip *"This order cannot be moved: its shipment is approved, completed, or in an active tender or bid."* The builder stamps `blocked: true`; the server keeps its own Save check (statuses can change between search and Save). | `AC 15870`, `AC 15872`, `user`, Jana deck |
| D7 | **External order record** enters the sandbox as an `OrderDetailVM` read off its SOURCE shipment's detail (`getSellShipmentDetail(sourceSellShipment).orderDetails`) — same mapper, same `fmtLocation`, so a matching stop is found. ≤5 fetches per Add. | coherence rule |
| D8 | **Save with external orders** = the 15872 move: body carries `externalOrders: [{ orderNumber, sourceSellShipment }]`. Server revalidates each source (shipment status `Approved/Done/SpotBid/Bid Review` or tender `To Be Tendered/Sent/Accepted` → **400** with the 15872 message + *Order impacted: …*; nothing written), copies the `SellShipmentOrder` from the source `detail.orderList` into this shipment's `orderList` BEFORE `mergeStops` (so stop totals count it), updates this shipment's `orders` / `order_count`, and **updates each source shipment**: the order leaves its `orderList` and every stop's `orderIds`, emptied stops are dropped and renumbered, stop totals recomputed through the same `mergeStops`, `orders` / `order_count` rewritten. All writes in one transaction (`BEGIN`/`COMMIT` — first transaction in this file; `ponytail:` comment). What stays out: 15869's Phase-1 "new shipment for a removed order" — **OC-open-19**. | `AC 15872` |
| D9 | Prior view: pending column stays muted; `Add to` renders as the existing disabled Button there (ActionMenu has no disabled state — the code-only rule of DEC-136 holds). | canon |

**Open for Laura/Jana (log in canon §12):** OC-open-18 confirm primary copy (Figma text already changed to "Approve" this session — tell Laura); OC-open-19 what happens to an order left pending at Save (15869: Phase-1 process creates a new shipment for it — not specified, not built; today it simply leaves this shipment); OC-open-20 status vocabulary; OC-open-13 (per-stop date control) still halted.

---

## File structure

| File | Responsibility |
|---|---|
| `apps/odyssey-one/api/_lib/candidateOrders.mjs` (create) | Pure: `buildCandidateRows`, `filterCandidates`, `EMPTY_FILTERS`, `SHIPMENT_STATUSES`, `TENDER_STATUSES`. Shared by mock service, live handler, modal. |
| `apps/odyssey-one/api/_lib/candidateOrders.test.mjs` (create) | node:test for the builder + filters. |
| `apps/odyssey-one/api/_lib/shipments.mjs` (modify) | `candidateOrders` handler; `save-stops` accepts `externalOrders`; `buildSaveStopsQuery` also writes `orderList`, `orders`, `order_count`. |
| `apps/odyssey-one/api/_lib/shipments.test.mjs` (modify) | Tests for the above. |
| `apps/odyssey-one/api/_lib/router.mjs` (modify) | `GET /shipment-service/v1/sell-shipment-out/:id/candidate-orders`. |
| `apps/odyssey-one/src/api/services/shipmentService.ts` (modify) | `getCandidateOrders(sellShipment, customerId, excludeOrderIds)` — mock over datasets, live over the endpoint. `resolveOrderChange` body gains `externalOrders`. |
| `apps/odyssey-one/src/api/queries/useCandidateOrders.ts` (create) | `useQuery` wrapper. |
| `apps/odyssey-one/src/api/queries/useResolveOrderChange.ts` (modify) | `externalOrders?` on the input. |
| `apps/odyssey-one/src/api/types/shipmentDetail.ts` + `mappers/mapSellShipmentOutToDetail.ts` (modify) | `customerId`, `customerName` on `ShipmentDetailVM`. |
| `apps/odyssey-one/src/components/detail/order-change/stopsSandbox.js` (+ test) (modify) | `addToStop(sb, id, orders, stopKey?)`, `addPending(sb, ids)`. |
| `apps/odyssey-one/src/components/detail/order-change/AddOrdersModal.jsx` (+ test) (create) | The search modal + inner Filters modal. |
| `apps/odyssey-one/src/components/detail/order-change/orderTooltip.js` (+ test) (create) | `orderTooltipProps(order, leg)` → Tooltip props. |
| `apps/odyssey-one/src/components/detail/order-change/EditStopsView.jsx` (+ test) (modify) | Confirm, ActionMenu, tooltips, Add New Order wiring, `extraOrders`. |
| `apps/odyssey-one/src/components/detail/order-change/edit-stops.css` (modify) | `.add-orders__*` rules (toolbar row, filters grid). |
| `apps/odyssey-one/src/routes/shipments/OrderChangeEditStopsRoute.jsx` (+ test) (modify) | Pass `sellShipment`/customer to the view; forward `externalOrders` to the mutation. |
| `vault/10-domains/shipments/order-change.md`, `decisions/decision-log.md`, `progress.md` (modify) | DEC-140…142, OC-open-14/15 closed, 18…20 opened. |

Run tests from `apps/odyssey-one`: app `npx vitest run <path>`; api `node --test api/_lib/<file>.test.mjs`.

---

### Task 1: Sandbox — `addToStop` with a target stop, `addPending`

**Files:** modify `src/components/detail/order-change/stopsSandbox.js`, `stopsSandbox.test.js`.

- [ ] **Step 1: Failing tests** (append to `stopsSandbox.test.js`; fixtures at the top of that file):

```js
import { addPending } from './stopsSandbox'

describe('addToStop with a chosen stop (VD 2076-8110, LINX-15871)', () => {
  it('puts the order on the chosen pickup stop and match-or-creates its delivery leg', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = moveToPending(s, 'C')                                  // C leaves P2 (removed) and D1
    expect(labelsOf(s)).toEqual(['P1', 'D1'])
    s = addToStop(s, 'C', orders, 's1')                        // chosen: Stop 1 = P1 (X, City) — not C's own origin
    expect(s.stops[0].orderIds).toEqual(['A', 'B', 'C'])       // sits on the chosen stop, no new P?
    expect(labelsOf(s)).toEqual(['P1', 'D1'])                  // delivery matched Z, Ville
    expect(s.stops[1].orderIds).toContain('C')
    expect(s.pending).toEqual([])
    expect(s.dirty).toBe(true); expect(s.routed).toBe(false)
  })
  it('chosen delivery stop: order joins it; pickup leg creates P? when unmatched', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = moveToPending(s, 'C')
    const ext = [...orders, { orderNumber: 'E', shipFrom: { location: 'W, Far' }, shipTo: { location: 'Z, Ville' }, grossWeight: '1 LB', totalVolume: '1 cuft', earliestPickup: '2026-06-01', earliestDelivery: '2026-06-03' }]
    s = addPending(s, ['E'])
    s = addToStop(s, 'E', ext, 's3')                            // Stop key of D1
    expect(labelsOf(s)).toEqual(['P1', 'P?', 'D1'])
    expect(s.stops[1]).toMatchObject({ type: 'pickup', unsequenced: true, orderIds: ['E'], location: 'W, Far' })
    expect(s.stops[2].orderIds).toContain('E')
  })
  it('unknown stopKey falls back to automatic placement (DEC-138)', () => {
    let s = initSandbox({ stops, consolidation: noChange, orders })
    s = moveToPending(s, 'C')
    const auto = addToStop(s, 'C', orders)
    expect(addToStop(s, 'C', orders, 'nope').stops).toEqual(auto.stops)
  })
})

describe('addPending', () => {
  it('adds ids once, ignores ids already on a stop, does not touch dirty/routed', () => {
    const s = initSandbox({ stops, consolidation: noChange, orders })
    const r = addPending(s, ['E', 'E', 'A'])
    expect(r.pending).toEqual(['E'])
    expect(r.dirty).toBe(false)
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/components/detail/order-change/stopsSandbox.test.js` → FAIL (`addPending` not exported; `addToStop` ignores `stopKey`).

- [ ] **Step 3: Implement** — replace `addToStop` and add `addPending`:

```js
// LINX-15871 + VD 2076-8110: put a pending order back. With `stopKey` the
// planner chose the stop (Add to → Stop N): the order joins THAT stop as its
// type's leg and only the other leg is matched-or-created. Without it (or an
// unknown key) both legs place automatically (DEC-138 fallback).
export function addToStop(sb, id, orders, stopKey) {
  const order = orders.find((o) => o.orderNumber === id)
  if (!order) return sb
  const stops = sb.stops.map((s) => ({ ...s, orderIds: [...s.orderIds] }))
  let seq = sb.seq
  const chosen = stopKey ? stops.find((s) => s.key === stopKey) : null
  if (chosen && !chosen.orderIds.includes(id)) chosen.orderIds.push(id)
  if (chosen?.type !== 'pickup') placeOrder(stops, id, 'pickup', order.shipFrom.location, () => `new:pickup:${++seq}`, orders)
  if (chosen?.type !== 'delivery') placeOrder(stops, id, 'delivery', order.shipTo.location, () => `new:delivery:${++seq}`, orders)
  const pending = sb.pending.filter((p) => p !== id)
  return { ...sb, stops, pending, seq, dirty: true, routed: false }
}

// LINX-15870: orders picked in Search & Add land in the pending column with
// their own Add action. Not a stop edit — dirty/routed untouched.
export function addPending(sb, ids) {
  const onStops = new Set(sb.stops.flatMap((s) => s.orderIds))
  const add = ids.filter((id, i) => !onStops.has(id) && !sb.pending.includes(id) && ids.indexOf(id) === i)
  return add.length ? { ...sb, pending: [...sb.pending, ...add] } : sb
}
```

- [ ] **Step 4: Run** the sandbox tests → PASS (all existing `addToStop` tests still pass — `stopKey` is optional).

- [ ] **Step 5: Commit** — `S144: sandbox — Add to targets a chosen stop; addPending for searched orders`

---

### Task 2: Order Tooltip

**Files:** create `src/components/detail/order-change/orderTooltip.js`, `orderTooltip.test.js`; modify `EditStopsView.jsx`, `EditStopsView.test.jsx`.

- [ ] **Step 1: Failing tests** (`orderTooltip.test.js`):

```js
import { describe, it, expect } from 'vitest'
import { orderTooltipProps } from './orderTooltip'

const o = { orderNumber: '4859', planningType: 'SSD', earliestPickup: '06/04/2026 08:00 CST', earliestDelivery: '06/06/2026 10:00 CST', totalVolume: '30 cuft', shipFrom: { location: '30301, Atlanta, GA, US' }, shipTo: { location: '55401, Minneapolis, MN, US' } }

describe('orderTooltipProps (VD 2143-11775)', () => {
  it('pickup leg: header + five groups with the pickup date', () => {
    const p = orderTooltipProps(o, 'pickup')
    expect(p.label).toBe('Order Number: 4859')
    expect(p.groups.map((g) => g.subtitle)).toEqual(['Planning Type', 'Pickup Date Time', 'Gross Weight', 'Volume', 'Origin', 'Destination'])
    expect(p.groups[1].content).toBe('06/04/2026 08:00 CST')
  })
  it('delivery leg uses the delivery date; no leg shows both', () => {
    expect(orderTooltipProps(o, 'delivery').groups[1]).toEqual({ subtitle: 'Delivery Date Time', content: '06/06/2026 10:00 CST' })
    expect(orderTooltipProps(o).groups[1]).toEqual({ subtitle: 'Pickup / Delivery Date Time', content: '06/04/2026 08:00 CST / 06/06/2026 10:00 CST' })
  })
  it('missing order → header only', () => {
    expect(orderTooltipProps(undefined, 'pickup', 'X')).toEqual({ label: 'Order Number: X', groups: [] })
  })
})
```

And in `EditStopsView.test.jsx` replace the two "Coming soon" expectations (search the file for `Coming soon`) with:

```jsx
it('hovering an order link shows the order Tooltip with the stop leg date (VD 2143-11775)', () => {
  setup({ orders: orders.map((o) => ({ ...o, planningType: 'SSD', earliestPickup: '06/04/2026', earliestDelivery: '06/06/2026' })) })
  fireEvent.mouseEnter(screen.getAllByRole('button', { name: 'C' })[0].parentElement)  // C's only pickup row (P2)
  expect(screen.getByRole('tooltip').textContent).toContain('Order Number: C')
  expect(screen.getByRole('tooltip').textContent).toContain('Pickup Date Time06/04/2026')
})
```

- [ ] **Step 2: Run** both files → FAIL.

- [ ] **Step 3: Implement** `orderTooltip.js`:

```js
// VD 2143-11775 ("Should Be In A ToolTip") through the canon Tooltip: header
// label + subtitle/content groups. `leg` = the stop's type when hovered on a
// stop row; undefined on a pending row (both dates). The VD's "Details" strip
// has no Tooltip counterpart and is dropped (DEC-142).
const val = (v) => (v == null || v === '' ? '--' : v)

export function orderTooltipProps(order, leg, fallbackId) {
  const label = `Order Number: ${order?.orderNumber ?? fallbackId ?? ''}`
  if (!order) return { label, groups: [] }
  const date = leg === 'pickup'
    ? { subtitle: 'Pickup Date Time', content: val(order.earliestPickup) }
    : leg === 'delivery'
      ? { subtitle: 'Delivery Date Time', content: val(order.earliestDelivery) }
      : { subtitle: 'Pickup / Delivery Date Time', content: `${val(order.earliestPickup)} / ${val(order.earliestDelivery)}` }
  return {
    label,
    groups: [
      { subtitle: 'Planning Type', content: val(order.planningType) },
      date,
      // Jana's deck (2026-08-12, slide 9) lists Gross weight in the tooltip; the VD dropped it. Domain content → kept.
      { subtitle: 'Gross Weight', content: val(order.grossWeight) },
      { subtitle: 'Volume', content: val(order.totalVolume) },
      { subtitle: 'Origin', content: val(order.shipFrom?.location) },
      { subtitle: 'Destination', content: val(order.shipTo?.location) },
    ],
  }
}
```

In `EditStopsView.jsx`: `import { orderTooltipProps } from './orderTooltip.js'`; add `const orderById = useMemo(() => new Map(allOrders.map((o) => [o.orderNumber, o])), [allOrders])` (`allOrders` arrives in Task 4 — until then use `orders`). Replace the two `tooltipProps={{ groups: [{ content: 'Coming soon' }] }}` on order links with `tooltipProps={orderTooltipProps(orderById.get(id), s.type, id)}` (stop rows) and `tooltipProps={orderTooltipProps(orderById.get(id), undefined, id)}` (pending rows). The link `onClick={() => {}}` and its `ponytail:` comment stay.

- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `S144: order hover Tooltip on Edit Shipment Stops (VD 2143-11775)`

---

### Task 3: Add to → stop picker; Approve → confirm

**Files:** modify `EditStopsView.jsx`, `EditStopsView.test.jsx`, `src/routes/shipments/OrderChangeEditStopsRoute.test.jsx`.

- [ ] **Step 1: Failing tests** — in `EditStopsView.test.jsx` rewrite the existing *"Add to returns a pending order to a matched stop"* test and add the confirm test:

```jsx
it('Add to opens a Stop N menu; picking a stop puts the order there (VD 2076-8110)', () => {
  setup()
  fireEvent.click(screen.getAllByRole('button', { name: 'Move To Pending' })[2])   // C off P2/D1
  fireEvent.click(screen.getByRole('button', { name: 'Add to' }))
  const items = screen.getAllByRole('menuitem')
  expect(items.map((i) => i.textContent)).toEqual(['Stop 1 · Pickup · X, City', 'Stop 2 · Delivery · Z, Ville'])   // P1, D1 after P2 emptied
  fireEvent.click(items[0])
  expect(screen.queryByRole('button', { name: 'Add to' })).toBeNull()
  expect(screen.getByText('Stop 1').closest('.edit-stops__card').textContent).toContain('C')
})

it('Approve Changes asks for confirmation, then calls onApprove (VD 2066-77150)', () => {
  const { onApprove } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'View Routing' }))
  fireEvent.click(screen.getByRole('button', { name: 'Go Back' }))                 // close ViewRoutingModal (check its footer label; adjust if it differs)
  fireEvent.click(screen.getByRole('button', { name: 'Approve Changes' }))
  expect(onApprove).not.toHaveBeenCalled()
  expect(screen.getByText('Approve Shipment Change')).toBeTruthy()
  expect(screen.getByText(/Any orders left pending for assignment will be removed/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
  expect(onApprove).toHaveBeenCalledTimes(1)
  expect(onApprove.mock.calls[0][1]).toEqual([])                                     // externalOrders — Task 4 fills it
})
```

Update the existing *"Approve Changes calls onApprove with toDto rows…"* test to click **Approve** in the dialog after **Approve Changes**. In `OrderChangeEditStopsRoute.test.jsx` every `fireEvent.click(... 'Approve Changes')` gets a following `fireEvent.click(screen.getByRole('button', { name: 'Approve' }))`.

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** in `EditStopsView.jsx`:

```jsx
import { ActionMenu } from '@odyssey/ui'   // add to the existing import list
const CONFIRM_TITLE = 'Approve Shipment Change'
const CONFIRM_BODY = 'Any orders left pending for assignment will be removed from this shipment when you approve it.'
```

Handler: `const handleAddTo = (id, stopKey) => { setErrorMsg(null); setSb((s) => addToStop(s, id, allOrders, stopKey)) }` (use `orders` until Task 4).

Pending row — replace the `Add to` Button:

```jsx
{isPrior
  ? <Button variant="secondary" icon={<Plus {...ICON_MD} />} disabled>Add to</Button>
  : (
    <ActionMenu
      label="Add to"
      ariaLabel={`Add ${id} to a stop`}
      align="right"
      // D3 — the planner chooses; type + location make the choice readable.
      options={sb.stops.map((s, i) => ({ id: s.key, label: `Stop ${i + 1} · ${s.type === 'pickup' ? 'Pickup' : 'Delivery'} · ${s.location || '--'}`, onSelect: () => handleAddTo(id, s.key) }))}
    />
  )}
```

Footer: `onSave={() => setModal('confirm')}`. Add the dialog next to the discard one:

```jsx
{modal === 'confirm' && (
  <ConfirmDialog
    title={CONFIRM_TITLE}
    message={CONFIRM_BODY}
    confirmLabel="Approve"
    cancelLabel="Cancel"
    onConfirm={() => { setModal(null); onApprove?.(toDto(sb), externalOrdersOnStops) }}
    onCancel={() => setModal(null)}
  />
)}
```

Until Task 4, `const externalOrdersOnStops = []`.

- [ ] **Step 4: Run** the two test files → PASS.
- [ ] **Step 5: Commit** — `S144: Add to stop picker (DEC-140) + Approve Shipment Change confirm (DEC-141)`

---

### Task 4: Candidate orders — pure builder + filters (`api/_lib/candidateOrders.mjs`)

**Files:** create `api/_lib/candidateOrders.mjs`, `api/_lib/candidateOrders.test.mjs`.

Row shape (the grid row AND what Add needs to fetch the source detail):

```js
// { orderNumber, sourceSellShipment, customer, origin, destination, weight, volume,
//   buyShipment, shipmentStatus, tenderStatus, shipmentType, ordersInShipment: string[],
//   shipDate: 'YYYY-MM-DD', deliveryDate: 'YYYY-MM-DD', blocked: boolean }
```

- [ ] **Step 1: Failing tests** (`candidateOrders.test.mjs`, node:test):

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCandidateRows, filterCandidates, EMPTY_FILTERS } from './candidateOrders.mjs'

const ship = (o) => ({ sellShipment: '1', buyShipment: '900', customerId: 'ERCO', customerName: 'Erco', orders: ['A'], shipmentStatus: 'Review', tenderStatus: 'Sent', shipmentType: 'Direct', ...o })
const ord = (o) => ({ orderNumber: 'A', customer: 'ERCO', consignor: { locationId: 'ATL-1', city: 'Atlanta', state: 'GA', country: 'US', earliestPickupDateTime: '2026-06-04T08:00:00' }, consignee: { locationId: 'MSP-1', city: 'Minneapolis', state: 'MN', country: 'US', earliestDeliveryDateTime: '2026-06-06T10:00:00' }, grossWeight: { value: 500, uom: 'lbs' }, volume: { value: 40, uom: 'cbf' }, ...o })

const shipments = [
  ship({ sellShipment: '1', buyShipment: '900', orders: ['A', 'B'], shipmentType: 'Consolidation' }),
  ship({ sellShipment: '2', buyShipment: '300', orders: ['C'] }),
  ship({ sellShipment: '3', buyShipment: '100', orders: ['D'], customerId: 'OTHER' }),
  ship({ sellShipment: '9', buyShipment: '950', orders: ['X'] }),           // the current shipment
]
const orders = [ord({ orderNumber: 'A' }), ord({ orderNumber: 'B' }), ord({ orderNumber: 'C', consignor: { ...ord().consignor, city: 'Boston', state: 'MA' } }), ord({ orderNumber: 'D', customer: 'OTHER' }), ord({ orderNumber: 'X' })]

test('same customer, other shipments, excludes current + excluded ids, sorted by buy shipment asc', () => {
  const rows = buildCandidateRows({ shipments, orders, customerId: 'ERCO', sellShipment: '9', excludeOrderIds: ['B'] })
  assert.deepEqual(rows.map((r) => r.orderNumber), ['C', 'A'])                     // 300 < 900
  assert.deepEqual(rows[1], {
    orderNumber: 'A', sourceSellShipment: '1', customer: 'Erco',
    origin: 'Atlanta, GA US', destination: 'Minneapolis, MN US',
    weight: '500 lbs', volume: '40 cbf', buyShipment: '900', shipmentStatus: 'Review', tenderStatus: 'Sent',
    shipmentType: 'Consolidation', ordersInShipment: ['A', 'B'], shipDate: '2026-06-04', deliveryDate: '2026-06-06',
    blocked: true,                                                                 // tender Sent → would fail the 15872 Save check
  })
  assert.equal(rows[0].blocked, false)                                            // C: Review + (set tenderStatus 'Cancelled' on shipment '2' in the fixture)
})

test('blocked follows the 15872 statuses', () => {
  const mk = (shipmentStatus, tenderStatus) => buildCandidateRows({ shipments: [ship({ shipmentStatus, tenderStatus })], orders: [ord()], customerId: 'ERCO', sellShipment: '9' })[0].blocked
  assert.equal(mk('Review', 'Cancelled'), false)
  assert.equal(mk('Done', 'Cancelled'), true)
  assert.equal(mk('Review', 'Accepted'), true)
  assert.equal(mk('Review', 'To Be Tendered'), true)
})

test('filterCandidates: free text, exact-ish fields, date ranges, statuses', () => {
  const rows = buildCandidateRows({ shipments, orders, customerId: 'ERCO', sellShipment: '9', excludeOrderIds: [] })
  assert.equal(filterCandidates(rows, { q: 'bost', filters: EMPTY_FILTERS }).length, 1)
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, orderNumber: 'b' } })[0].orderNumber, 'B')
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, buyShipment: '300' } }).length, 1)
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, origin: 'MA' } }).length, 1)
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, shipDate: { from: '2026-06-05', to: '' } } }).length, 0)
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, deliveryDate: { from: '', to: '2026-06-06' } } }).length, 3)
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, shipmentType: 'Consolidation' } }).length, 2)
  assert.equal(filterCandidates(rows, { q: '', filters: { ...EMPTY_FILTERS, tenderStatus: 'Accepted' } }).length, 0)
})
```

- [ ] **Step 2: Run** `node --test api/_lib/candidateOrders.test.mjs` → FAIL.

- [ ] **Step 3: Implement**:

```js
// LINX-15870 — Search & Add Orders candidates. Pure; runs over the mock
// datasets (shipments.json + orders.json shapes) in the app and over the
// same shapes read from Neon in the handler (orders.consignor/consignee/
// gross_weight/volume are jsonb of exactly these objects — tools/seed.mjs).
export const EMPTY_FILTERS = {
  orderNumber: '', buyShipment: '', shipDate: { from: '', to: '' }, deliveryDate: { from: '', to: '' },
  origin: '', destination: '', shipmentStatus: '', tenderStatus: '',
}
// Seed vocabulary (OC-open-20: the AC lists eight statuses the seed does not carry).
export const SHIPMENT_STATUSES = ['Review', 'Done']
export const TENDER_STATUSES = ['Sent', 'Accepted', 'Cancelled', 'Declined']
// LINX-15872 — what Save refuses; shipments.mjs imports these for the server check.
export const MOVE_BLOCKED_STATUS = ['Approved', 'Done', 'SpotBid', 'Bid Review']
export const MOVE_BLOCKED_TENDER = ['To Be Tendered', 'Sent', 'Accepted']
export const MOVE_BLOCKED_TOOLTIP = 'This order cannot be moved: its shipment is approved, completed, or in an active tender or bid.'
const isBlocked = (s) => MOVE_BLOCKED_STATUS.includes(s.shipmentStatus) || MOVE_BLOCKED_TENDER.includes(s.tenderStatus)

const place = (a) => (a ? `${a.city}, ${a.state} ${a.country}` : '--')
const measure = (m) => (m && m.value != null ? `${m.value} ${m.uom}` : '--')
const day = (iso) => (iso ? String(iso).slice(0, 10) : '')

export function buildCandidateRows({ shipments, orders, customerId, sellShipment, excludeOrderIds = [] }) {
  const skip = new Set(excludeOrderIds)
  const byNumber = new Map(orders.map((o) => [o.orderNumber, o]))
  const rows = []
  for (const s of shipments) {
    if (s.customerId !== customerId || s.sellShipment === sellShipment) continue
    for (const id of s.orders ?? []) {
      const o = byNumber.get(id)
      if (!o || skip.has(id)) continue
      rows.push({
        orderNumber: id, sourceSellShipment: s.sellShipment, customer: s.customerName,
        origin: place(o.consignor), destination: place(o.consignee),
        weight: measure(o.grossWeight), volume: measure(o.volume),
        buyShipment: s.buyShipment, shipmentStatus: s.shipmentStatus, tenderStatus: s.tenderStatus,
        shipmentType: s.shipmentType, ordersInShipment: [...(s.orders ?? [])],
        shipDate: day(o.consignor?.earliestPickupDateTime), deliveryDate: day(o.consignee?.earliestDeliveryDateTime),
        blocked: isBlocked(s),
      })
    }
  }
  return rows.sort((a, b) => String(a.buyShipment).localeCompare(String(b.buyShipment), undefined, { numeric: true }))
}

const has = (hay, needle) => String(hay ?? '').toLowerCase().includes(needle.trim().toLowerCase())
const inRange = (d, { from, to }) => (!from || d >= from) && (!to || d <= to)

export function filterCandidates(rows, { q = '', filters = EMPTY_FILTERS }) {
  const f = { ...EMPTY_FILTERS, ...filters }
  return rows.filter((r) => {
    if (q.trim() && ![r.orderNumber, r.buyShipment, r.origin, r.destination, ...r.ordersInShipment].some((v) => has(v, q))) return false
    if (f.orderNumber && !has(r.orderNumber, f.orderNumber)) return false
    if (f.buyShipment && !has(r.buyShipment, f.buyShipment)) return false
    if (f.origin && !has(r.origin, f.origin)) return false
    if (f.destination && !has(r.destination, f.destination)) return false
    if (!inRange(r.shipDate, f.shipDate)) return false
    if (!inRange(r.deliveryDate, f.deliveryDate)) return false
    if (f.shipmentStatus && r.shipmentStatus !== f.shipmentStatus) return false
    if (f.tenderStatus && r.tenderStatus !== f.tenderStatus) return false
    if (f.shipmentType && r.shipmentType !== f.shipmentType) return false
    return true
  })
}
```

(`shipmentType` is accepted by the filter for the test; it is NOT a field in the Filters modal — the AC does not list it.)

- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `S144: candidateOrders builder + filters (LINX-15870)`

---

### Task 5: Candidate orders — service, endpoint, hook; `customerId` on the VM

**Files:** modify `api/_lib/shipments.mjs`, `shipments.test.mjs`, `api/_lib/router.mjs`, `src/api/services/shipmentService.ts`, `src/api/types/shipmentDetail.ts`, `src/api/mappers/mapSellShipmentOutToDetail.ts`, `mapSellShipmentOutToDetail.test.ts`; create `src/api/queries/useCandidateOrders.ts`.

- [ ] **Step 1: Failing tests**

`shipments.test.mjs`:

```js
import { buildCandidateOrdersQuery, candidateOrders } from './shipments.mjs'

test('candidate orders: one query joining orders to their shipment, scoped to the customer, excluding the current shipment', () => {
  const q = buildCandidateOrdersQuery('9')
  assert.match(q.text, /FROM orders o JOIN shipments s ON s\.sell_shipment = o\.shipment_sell_id/)
  assert.match(q.text, /s\.customer_id = \(SELECT customer_id FROM shipments WHERE sell_shipment = \$1\)/)
  assert.match(q.text, /s\.sell_shipment <> \$1/)
  assert.deepEqual(q.values, ['9'])
})

test('candidateOrders handler builds rows through buildCandidateRows', async () => {
  const db = { query: async () => ({ rows: [{
    orderNumber: 'A', customer: 'ERCO', consignor: { city: 'Atlanta', state: 'GA', country: 'US', earliestPickupDateTime: '2026-06-04T08:00:00' },
    consignee: { city: 'Minneapolis', state: 'MN', country: 'US', earliestDeliveryDateTime: '2026-06-06T10:00:00' },
    grossWeight: { value: 500, uom: 'lbs' }, volume: { value: 40, uom: 'cbf' },
    sellShipment: '1', buyShipment: '900', customerId: 'ERCO', customerName: 'Erco', orders: ['A', 'B'],
    shipmentStatus: 'Review', tenderStatus: 'Sent', shipmentType: 'Consolidation',
  }] }) }
  const rows = await candidateOrders({ params: ['9'], query: { exclude: 'B' }, db })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].origin, 'Atlanta, GA US')
  assert.deepEqual(rows[0].ordersInShipment, ['A', 'B'])
})
```

`mapSellShipmentOutToDetail.test.ts` — add: `expect(vm.customerId).toBe(dto.customerId); expect(vm.customerName).toBe(dto.customerName)` inside an existing top-level mapping test (find one that builds `vm` from the sample fixture).

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement**

`shipments.mjs` (append; import `buildCandidateRows` from `./candidateOrders.mjs`):

```js
// LINX-15870 — GET /shipment-service/v1/sell-shipment-out/:id/candidate-orders?exclude=a,b
// One query: every order of another shipment of the SAME customer. The rows
// come back in the orders.json / shipments.json shapes (jsonb parsed by pg), so
// the SAME builder the mock uses runs here — one place for the row shape.
export function buildCandidateOrdersQuery(sellShipment) {
  return {
    text: `SELECT o.order_number AS "orderNumber", o.customer, o.consignor, o.consignee,
                  o.gross_weight AS "grossWeight", o.volume,
                  s.sell_shipment AS "sellShipment", s.buy_shipment AS "buyShipment", s.customer_id AS "customerId",
                  s.customer_name AS "customerName", s.orders, s.shipment_status AS "shipmentStatus",
                  s.tender_status AS "tenderStatus", s.shipment_type AS "shipmentType"
           FROM orders o JOIN shipments s ON s.sell_shipment = o.shipment_sell_id
           WHERE s.customer_id = (SELECT customer_id FROM shipments WHERE sell_shipment = $1)
             AND s.sell_shipment <> $1`,
    values: [sellShipment],
  }
}

export async function candidateOrders({ params, query, db }) {
  const sellShipment = params[0]
  const { rows } = await db.query(buildCandidateOrdersQuery(sellShipment))
  const exclude = String(query?.exclude ?? '').split(',').filter(Boolean)
  // Split the joined row back into its two shapes — the builder joins them by
  // shipment.orders, exactly as the mock does over the two JSON files.
  const shipments = [...new Map(rows.map((r) => [r.sellShipment, r])).values()]
  const customerId = shipments[0]?.customerId
  return buildCandidateRows({ shipments, orders: rows, customerId, sellShipment, excludeOrderIds: exclude })
}
```

`router.mjs` — after `sellShipmentDetail`:

```js
{ name: 'candidateOrders', method: 'GET', pattern: /^\/shipment-service\/v1\/sell-shipment-out\/(\d+)\/candidate-orders$/, handler: candidateOrders },
```

(Check how the other GET handlers receive query params — `categoryCounts({ query })` — and reuse the same `query` object.)

`shipmentService.ts`:

```ts
import { buildCandidateRows } from '../../../api/_lib/candidateOrders.mjs'
import { getAllShipments } from '../../data'
import { getAllOrders } from '../../data/orders'

export interface CandidateOrderRow {
  orderNumber: string; sourceSellShipment: string; customer: string; origin: string; destination: string
  weight: string; volume: string; buyShipment: string; shipmentStatus: string; tenderStatus: string
  shipmentType: string; ordersInShipment: string[]; shipDate: string; deliveryDate: string
}

// LINX-15870 — candidates for Search & Add Orders. Mock runs the shared
// builder over the two datasets; live asks the endpoint (same builder server-side).
export async function getCandidateOrders(sellShipment: string, customerId: string, excludeOrderIds: string[]): Promise<CandidateOrderRow[]> {
  if (getApiMode() !== 'live') {
    return buildCandidateRows({ shipments: getAllShipments(), orders: getAllOrders(), customerId, sellShipment, excludeOrderIds })
  }
  const qs = excludeOrderIds.length ? `?exclude=${encodeURIComponent(excludeOrderIds.join(','))}` : ''
  return apiGet(`/shipment-service/v1/sell-shipment-out/${sellShipment}/candidate-orders${qs}`)
}
```

(If the TS build complains about the `.mjs` import's types, add `// @ts-expect-error untyped shared module` on the import line — `src/search/orders/criteria.js` shows the JS side; check whether a `.d.ts` shim already exists for `api/_lib` and follow it.)

`useCandidateOrders.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { getCandidateOrders } from '../services/shipmentService'

export function useCandidateOrders(sellShipment: string, customerId: string, excludeOrderIds: string[]) {
  return useQuery({
    queryKey: ['shipment', 'candidate-orders', sellShipment, [...excludeOrderIds].sort().join(',')],
    queryFn: () => getCandidateOrders(sellShipment, customerId, excludeOrderIds),
    staleTime: 60 * 1000,
  })
}
```

VM: add `customerId: string` and `customerName: string` to `ShipmentDetailVM` (next to `shipmentType`) and in the mapper's top-level return: `customerId: dto.customerId ?? '', customerName: dto.customerName ?? '',`.

- [ ] **Step 4: Run** `node --test api/_lib/shipments.test.mjs`, `npx vitest run src/api` → PASS. `npx tsc --noEmit -p .` if the app has a tsconfig (check `package.json` scripts; otherwise `npm run build:odyssey-one` from the root) → clean.
- [ ] **Step 5: Commit** — `S144: candidate-orders endpoint + service + hook; customerId on the detail VM`

---

### Task 6: `AddOrdersModal` — search, results grid, Filters stack

**Files:** create `src/components/detail/order-change/AddOrdersModal.jsx`, `AddOrdersModal.test.jsx`; modify `edit-stops.css`.

Props: `{ sellShipment, customerId, customerName, excludeOrderIds, onAdd(rows: CandidateOrderRow[]), onClose }`.

- [ ] **Step 1: Failing tests** (jsdom; mock the hook):

```jsx
// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AddOrdersModal from './AddOrdersModal'

const rows = ['100', '200', '300', '400', '500', '600'].map((b, i) => ({
  orderNumber: `O${i + 1}`, sourceSellShipment: `S${i + 1}`, customer: 'Erco', origin: i === 2 ? 'Boston, MA US' : 'Atlanta, GA US',
  destination: 'Minneapolis, MN US', weight: '500 lbs', volume: '40 cbf', buyShipment: b, shipmentStatus: 'Review',
  tenderStatus: i === 0 ? 'Accepted' : 'Sent', shipmentType: 'Direct', ordersInShipment: [`O${i + 1}`], shipDate: '2026-06-04', deliveryDate: '2026-06-06',
}))
vi.mock('../../../api/queries/useCandidateOrders', () => ({ useCandidateOrders: () => ({ data: rows, isPending: false, isError: false }) }))

afterEach(cleanup)
const setup = () => {
  const onAdd = vi.fn(); const onClose = vi.fn()
  render(<AddOrdersModal sellShipment="9" customerId="ERCO" customerName="Erco" excludeOrderIds={[]} onAdd={onAdd} onClose={onClose} />)
  return { onAdd, onClose }
}

it('renders the title, the 11 columns and Results (n); Add Order(s) disabled until a pick', () => {
  setup()
  expect(screen.getByText('Add New Order(s)')).toBeTruthy()
  expect(screen.getByText('Results (6)')).toBeTruthy()
  for (const h of ['Customer', 'Origin', 'Destination', 'Order Number', 'Order Weight', 'Order Volume', 'Buy Shipment', 'Shipment Status', 'Tender Status', 'Shipment Type', 'Orders in the Shipment']) expect(screen.getByText(h)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Add Order(s)' }).disabled).toBe(true)
})

it('search narrows the grid; Clear All restores it', () => {
  setup()
  fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'bost' } })
  expect(screen.getByText('Results (1)')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Clear All' }))
  expect(screen.getByText('Results (6)')).toBeTruthy()
})

it('caps selection at five with an inline message; Add Order(s) returns the picked rows', () => {
  const { onAdd } = setup()
  const boxes = screen.getAllByRole('checkbox').slice(1)   // [0] = header select-all
  boxes.slice(0, 6).forEach((b) => fireEvent.click(b))
  expect(screen.getAllByRole('checkbox').slice(1).filter((b) => b.checked).length).toBe(5)
  expect(screen.getByText('You can select up to five orders at a time.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Add Order(s)' }))
  expect(onAdd.mock.calls[0][0].map((r) => r.orderNumber)).toEqual(['O1', 'O2', 'O3', 'O4', 'O5'])
})

it('Filter opens the inner Filters modal (back arrow); Apply filters the grid; Clear resets', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
  expect(screen.getByText('Filters')).toBeTruthy()
  expect(screen.getByDisplayValue('Erco').disabled).toBe(true)                      // Customer locked
  fireEvent.change(screen.getByLabelText('Origin'), { target: { value: 'MA' } })
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  expect(screen.queryByText('Filters')).toBeNull()
  expect(screen.getByText('Results (1)')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  expect(screen.getByText('Results (6)')).toBeTruthy()
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** `AddOrdersModal.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Alert, Button, ComboBox, DatePicker, Dropdown, FilterButton, FormField, GroupTable, ModalMedium, Spinner } from '@odyssey/ui'
import { EMPTY_FILTERS, SHIPMENT_STATUSES, TENDER_STATUSES, MOVE_BLOCKED_TOOLTIP, filterCandidates } from '../../../../api/_lib/candidateOrders.mjs'
import TooltipTrigger from '../../ui/TooltipTrigger.jsx'
import { rowsToFlatGroups } from '../../shipments/order-change/comparisonHelpers.jsx'
import { useCandidateOrders } from '../../../api/queries/useCandidateOrders'

// LINX-15870 Search & Add Orders — VD 2137-59231 (grid) + the inner Filters
// modal (user: "if filters is clicked we show them in the inner modal" —
// the DSM's modal navigation stack: a second ModalMedium with onBack).
const MAX = 5
const CAP_MSG = 'You can select up to five orders at a time.'
const COLUMNS = [
  { key: 'customer', label: 'Customer' }, { key: 'origin', label: 'Origin' }, { key: 'destination', label: 'Destination' },
  { key: 'orderNumber', label: 'Order Number' }, { key: 'weight', label: 'Order Weight' }, { key: 'volume', label: 'Order Volume' },
  { key: 'buyShipment', label: 'Buy Shipment' }, { key: 'shipmentStatus', label: 'Shipment Status' }, { key: 'tenderStatus', label: 'Tender Status' },
  { key: 'shipmentType', label: 'Shipment Type' }, { key: 'ordersInShipment', label: 'Orders in the Shipment' },
]
// D6 — a blocked row reads greyed; its Order Number explains why on hover.
const cell = (r, c) => {
  const text = c.key === 'ordersInShipment' ? r.ordersInShipment.join(' - ') : (r[c.key] || '--')
  if (!r.blocked) return text
  const span = <span className="add-orders__blocked">{text}</span>
  return c.key === 'orderNumber'
    ? <TooltipTrigger asSpan tooltipProps={{ groups: [{ content: MOVE_BLOCKED_TOOLTIP }] }}>{span}</TooltipTrigger>
    : span
}
const opts = (list) => [{ value: '', label: 'Any' }, ...list.map((v) => ({ value: v, label: v }))]

export default function AddOrdersModal({ sellShipment, customerId, customerName, excludeOrderIds, onAdd, onClose }) {
  const { data, isPending, isError } = useCandidateOrders(sellShipment, customerId, excludeOrderIds)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [draft, setDraft] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selected, setSelected] = useState([])
  const [capped, setCapped] = useState(false)

  const rows = useMemo(() => filterCandidates(data ?? [], { q, filters }), [data, q, filters])
  const byId = useMemo(() => new Map(rows.map((r) => [r.orderNumber, r])), [rows])

  const select = (id, next) => {
    if (!next) { setSelected((s) => s.filter((x) => x !== id)); setCapped(false); return }
    if (selected.length >= MAX) { setCapped(true); return }
    setSelected((s) => [...s, id])
  }
  // Header checkbox: every selectable row when it fits, else the first five (and say so).
  const selectAll = (next) => {
    if (!next) { setSelected([]); setCapped(false); return }
    const open = rows.filter((r) => !r.blocked)
    setSelected(open.slice(0, MAX).map((r) => r.orderNumber)); setCapped(open.length > MAX)
  }
  const clearAll = () => { setQ(''); setFilters(EMPTY_FILTERS); setDraft(EMPTY_FILTERS); setSelected([]); setCapped(false) }
  const openFilters = () => { setDraft(filters); setFiltersOpen(true) }
  const apply = () => { setFilters(draft); setFiltersOpen(false) }
  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }))

  return createPortal(
    <>
      <ModalMedium
        title="Add New Order(s)"
        ariaLabel="Add New Order(s)"
        onClose={onClose}
        className="add-orders"
        footer={(
          <>
            <Button variant="secondary" size="lg" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="lg" disabled={selected.length === 0} onClick={() => onAdd(selected.map((id) => byId.get(id)).filter(Boolean))}>Add Order(s)</Button>
          </>
        )}
      >
        <div className="add-orders__toolbar">
          <ComboBox variant="search" placeholder="Search" value={q} onChange={setQ} onClear={() => setQ('')} className="add-orders__search" />
          <FilterButton active={filtersOpen} onClick={openFilters} />
          <Button variant="secondary" onClick={clearAll}>Clear All</Button>
        </div>
        {capped && <Alert variant="warning" onClose={() => setCapped(false)}>{CAP_MSG}</Alert>}
        {isPending ? <Spinner /> : isError ? <Alert variant="error" showClose={false}>Could not load orders.</Alert> : (
          <GroupTable
            flat
            selectable
            header={{ title: `Results (${rows.length})` }}
            columns={COLUMNS}
            groups={rowsToFlatGroups(rows, COLUMNS, cell).map((g, i) => ({ ...g, id: rows[i].orderNumber, selectDisabled: rows[i].blocked }))}
            selectedIds={selected}
            onSelect={select}
            onSelectAll={selectAll}
            selectLabel={(g) => `Select order ${g.id}`}
          />
        )}
      </ModalMedium>

      {filtersOpen && (
        <ModalMedium
          title="Filters"
          ariaLabel="Filters"
          onBack={() => setFiltersOpen(false)}
          onClose={() => setFiltersOpen(false)}
          className="add-orders__filters modal-nav-view"
          footer={(
            <>
              <Button variant="secondary" size="lg" onClick={() => setDraft(EMPTY_FILTERS)}>Clear</Button>
              <Button variant="primary" size="lg" onClick={apply}>Apply</Button>
            </>
          )}
        >
          <div className="add-orders__grid">
            <FormField label="Customer" value={customerName} disabled onChange={() => {}} />
            <FormField label="Order #" value={draft.orderNumber} onChange={set('orderNumber')} />
            <FormField label="Buy Shipment" value={draft.buyShipment} onChange={set('buyShipment')} />
            <DatePicker mode="range" label="Ship Date" value={draft.shipDate} onChange={set('shipDate')} />
            <DatePicker mode="range" label="Delivery Date" value={draft.deliveryDate} onChange={set('deliveryDate')} />
            <FormField label="Origin" placeholder="Site ID, City, State, ZIP or Country" value={draft.origin} onChange={set('origin')} />
            <FormField label="Destination" placeholder="Site ID, City, State, ZIP or Country" value={draft.destination} onChange={set('destination')} />
            <label className="text-label-xs-medium">Shipment Status<Dropdown value={draft.shipmentStatus} options={opts(SHIPMENT_STATUSES)} onChange={set('shipmentStatus')} /></label>
            <label className="text-label-xs-medium">Tender Status<Dropdown value={draft.tenderStatus} options={opts(TENDER_STATUSES)} onChange={set('tenderStatus')} /></label>
          </div>
        </ModalMedium>
      )}
    </>,
    document.body,
  )
}
```

Before writing it, read the three control APIs the way S141's `OrdersFiltersView.jsx` uses them (`FormField` `onChange` — value or event?; `DatePicker mode="range"` value shape — `{ from, to }` strings in which format?; `Dropdown` `onChange(value)`) and conform; the `DatePicker` range value must be converted to `YYYY-MM-DD` before `filterCandidates` (write a 3-line `toIso` next to `set` if the picker returns `MM/DD/YYYY`). `selectLabel`'s signature: check `GroupTable.jsx:361` usage.

`edit-stops.css` additions:

```css
/* AddOrdersModal — VD 2137-59231. */
.add-orders { width: min(1648px, 96vw); }
.add-orders__toolbar { display: flex; align-items: center; gap: var(--spacing-3); padding-bottom: var(--spacing-3); }
.add-orders__search { width: 389px; }
.add-orders__filters { width: 640px; }
.add-orders__grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4); }
.add-orders__blocked { color: var(--text-tertiary); }
```

(Confirm `ModalMedium`'s max-width cap in `components.css` — the demo says max 780px; if `.add-orders` needs to exceed it, override `max-width` on `.modal-medium.add-orders` in the same rule.)

- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `S144: AddOrdersModal — search grid + inner Filters (LINX-15870, VD 2137-59231)`

---

### Task 7: Wire Add New Order into the editor; external orders through Save

**Files:** modify `EditStopsView.jsx`, `EditStopsView.test.jsx`, `OrderChangeEditStopsRoute.jsx`, `OrderChangeEditStopsRoute.test.jsx`, `src/api/queries/useResolveOrderChange.ts`, `src/api/services/shipmentService.ts`, `api/_lib/shipments.mjs`, `shipments.test.mjs`.

- [ ] **Step 1: Failing tests**

`EditStopsView.test.jsx` — replace *"Add New Order is disabled"*:

```jsx
vi.mock('./AddOrdersModal', () => ({ default: ({ onAdd }) => <button onClick={() => onAdd([{ orderNumber: 'E', sourceSellShipment: '77' }])}>mock-add</button> }))
vi.mock('../../../api/services/shipmentService', () => ({
  getSellShipmentDetail: async () => ({ orderDetails: [{ orderNumber: 'E', planningType: 'SSD', shipFrom: { location: 'X, City' }, shipTo: { location: 'Z, Ville' }, grossWeight: '7 LB', totalVolume: '2 cuft', earliestPickup: '06/04/2026', earliestDelivery: '06/06/2026' }] }),
}))

it('Add New Order opens the modal; added orders land in pending with Add to; a placed external order rides Approve as externalOrders', async () => {
  const { onApprove } = setup({ sellShipment: '9', customerId: 'ERCO', customerName: 'Erco' })
  fireEvent.click(screen.getByRole('button', { name: 'Add New Order' }))
  fireEvent.click(screen.getByText('mock-add'))
  expect(await screen.findByRole('button', { name: 'E' })).toBeTruthy()          // pending row link
  fireEvent.click(screen.getByRole('button', { name: 'Add to' }))
  fireEvent.click(screen.getAllByRole('menuitem')[0])                            // Stop 1 (P1, X, City)
  expect(screen.getByText('Stop 1').closest('.edit-stops__card').textContent).toContain('E')
  expect(screen.getByText('17 LB')).toBeTruthy()                                  // 5+5+7 — external order counts in totals
  fireEvent.click(screen.getByRole('button', { name: 'View Routing' }))
  fireEvent.click(screen.getByRole('button', { name: 'Go Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve Changes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
  expect(onApprove.mock.calls[0][1]).toEqual([{ orderNumber: 'E', sourceSellShipment: '77' }])
})
```

`OrderChangeEditStopsRoute.test.jsx` — in the Scenario A test assert `body.externalOrders` is forwarded (`expect(body.externalOrders).toEqual([])` on the plain path is enough).

`shipments.test.mjs`:

```js
describe('save-stops with externalOrders (LINX-15872 slice)', () => {
  const target = { orderList: [{ orderNumber: 'A', grossWeightValue: 5 }, { orderNumber: 'B', grossWeightValue: 5 }], shipmentStopList: [] }
  const source = { orderList: [{ orderNumber: 'E', grossWeightValue: 7 }] }
  const mk = (srcRow) => {
    const calls = []
    const db = { query: async (q) => {
      calls.push(q)
      if (/SELECT detail FROM shipments WHERE sell_shipment = \$1/.test(q.text)) return { rows: [{ detail: target }] }
      if (/sell_shipment = ANY/.test(q.text)) return { rows: [srcRow] }
      return { rows: [], rowCount: 1 }
    } }
    return { db, calls }
  }
  const body = { action: 'save-stops', priorTenderStatus: 'Sent', stops: [{ stopSequence: 1, stopType: 'pickup', orderIds: ['A', 'E'], sourceStopSequence: null }], externalOrders: [{ orderNumber: 'E', sourceSellShipment: '77' }] }

  it('copies the external record in, drops pending B, writes orderList + orders + order_count, and removes E from its source — one transaction', async () => {
    const src = { orderList: [{ orderNumber: 'E', grossWeightValue: 7 }, { orderNumber: 'F', grossWeightValue: 1 }],
      shipmentStopList: [
        { stopSequence: 1, stopType: 'pickup', orderIds: ['E'], facilityName: 'X', grossWeightValue: 7 },
        { stopSequence: 2, stopType: 'pickup', orderIds: ['F'], facilityName: 'Y', grossWeightValue: 1 },
        { stopSequence: 3, stopType: 'delivery', orderIds: ['E', 'F'], facilityName: 'Z', grossWeightValue: 8 },
      ] }
    const { db, calls } = mk({ sellShipment: '77', shipmentStatus: 'Review', tenderStatus: 'Cancelled', detail: src })
    await resolveOrderChange({ params: ['9'], body, db })
    const texts = calls.map((q) => (typeof q === 'string' ? q : q.text))
    assert.equal(texts[0], 'BEGIN'); assert.equal(texts[texts.length - 1], 'COMMIT')
    const saves = calls.filter((q) => /shipmentStopList/.test(q.text))
    assert.equal(saves.length, 2)                                                  // target + source
    const [target, sourceSave] = saves.map((q) => ({ q, stops: JSON.parse(q.values[0]), orderList: JSON.parse(q.values[1]), ids: q.values[2], sell: q.values[4] }))
    assert.equal(target.sell, '9')
    assert.equal(target.stops[0].grossWeightValue, 12)                             // A(5) + E(7): the copied record counted
    assert.deepEqual(target.orderList.map((o) => o.orderNumber), ['A', 'E'])      // B was pending → dropped
    assert.deepEqual(target.ids, ['A', 'E'])
    assert.equal(sourceSave.sell, '77')
    assert.deepEqual(sourceSave.orderList.map((o) => o.orderNumber), ['F'])       // E left its source (LINX-15872 "Source Shipment Update")
    assert.deepEqual(sourceSave.stops.map((s) => [s.stopSequence, s.orderIds]), [[1, ['F']], [2, ['F']]])   // emptied P1 dropped, renumbered
    assert.equal(sourceSave.stops[1].grossWeightValue, 1)                          // recomputed from its remaining order
    assert.deepEqual(sourceSave.ids, ['F'])
  })
  it('a failing source rolls back and writes nothing', async () => {
    const { db, calls } = mk({ sellShipment: '77', shipmentStatus: 'Done', tenderStatus: 'Cancelled', detail: source })
    await assert.rejects(() => resolveOrderChange({ params: ['9'], body, db }))
    assert.ok(!calls.some((q) => /shipmentStopList/.test(q.text ?? '')))
    assert.ok(calls.some((q) => (q.text ?? q) === 'ROLLBACK'))
  })
  it('refuses when the source shipment is Done or has an active tender, naming the order', async () => {
    const { db } = mk({ sellShipment: '77', shipmentStatus: 'Done', tenderStatus: 'Cancelled', detail: source })
    await assert.rejects(() => resolveOrderChange({ params: ['9'], body, db }), (e) => e.status === 400 && /cannot be moved/.test(e.message) && /Order impacted: E/.test(e.message))
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement**

`EditStopsView.jsx` — new props `sellShipment, customerId, customerName`; new state and derived values:

```jsx
import AddOrdersModal from './AddOrdersModal.jsx'
import { getSellShipmentDetail } from '../../../api/services/shipmentService'

const [extraOrders, setExtraOrders] = useState([])            // OrderDetailVM + sourceSellShipment, from Add Order(s)
const allOrders = useMemo(() => [...orders, ...extraOrders], [orders, extraOrders])
```

Use `allOrders` for `curTotals`, `orderById`, `handleAddTo`, `planningOrders`; keep `initialTotals` on `orders`. The pending column:

```jsx
<Button variant="secondary" disabled={isPrior} className="edit-stops__add-new" onClick={() => setModal('add-orders')}>Add New Order</Button>
```

Add handler + modal:

```jsx
// D7: the record comes off the SOURCE shipment's detail through the same
// mapper the shipment's own orders use — same fmtLocation, so Add to's
// match-or-create sees the same strings.
const handleAddOrders = async (rows) => {
  setModal(null)
  const fetched = await Promise.all(rows.map(async (r) => {
    const d = await getSellShipmentDetail(r.sourceSellShipment)
    const vm = d.orderDetails.find((o) => o.orderNumber === r.orderNumber)
    return vm ? { ...vm, sourceSellShipment: r.sourceSellShipment } : null
  }))
  const recs = fetched.filter(Boolean)
  setExtraOrders((prev) => [...prev, ...recs.filter((r) => !prev.some((p) => p.orderNumber === r.orderNumber))])
  setSb((s) => addPending(s, recs.map((r) => r.orderNumber)))
}
…
{modal === 'add-orders' && (
  <AddOrdersModal
    sellShipment={sellShipment}
    customerId={customerId}
    customerName={customerName}
    excludeOrderIds={[...liveOrderIds, ...sb.pending]}
    onAdd={handleAddOrders}
    onClose={() => setModal(null)}
  />
)}
```

`externalOrdersOnStops` (replaces Task 3's `[]`):

```jsx
const externalOrdersOnStops = extraOrders
  .filter((r) => liveOrderIds.has(r.orderNumber))
  .map((r) => ({ orderNumber: r.orderNumber, sourceSellShipment: r.sourceSellShipment }))
```

(`liveOrderIds` is already computed above the return — move it above this line.) Import `addPending` from the sandbox.

`OrderChangeEditStopsRoute.jsx`: `handleApprove(stopsDto, externalOrders = [])` → `resolve.mutate({ …, stops: stopsDto, externalOrders, … })`; pass `sellShipment={sellShipment} customerId={detail.customerId} customerName={detail.customerName}` to `EditStopsView`.

`useResolveOrderChange.ts` + `shipmentService.ts`: `externalOrders?: Array<{ orderNumber: string; sourceSellShipment: string }>` on the input/body.

`shipments.mjs`:

```js
import { MOVE_BLOCKED_STATUS, MOVE_BLOCKED_TENDER } from './candidateOrders.mjs'   // at the top of the file
const MOVE_MESSAGE = 'The selected order cannot be moved because its current shipment is approved, completed, or involved in an active tender or bid process. Edit the source shipment or cancel the applicable tender or bid action before moving the order.'

export function buildSourceShipmentsQuery(sellShipments) {
  return { text: 'SELECT sell_shipment AS "sellShipment", shipment_status AS "shipmentStatus", tender_status AS "tenderStatus", detail FROM shipments WHERE sell_shipment = ANY($1)', values: [sellShipments] }
}

// LINX-15872 — revalidate every external order against its source shipment's
// LATEST status; any failure blocks the whole save (nothing written).
// Returns the source rows with the order records to move.
async function pullExternalOrders(db, externalOrders) {
  if (!externalOrders?.length) return { records: [], sources: [] }
  const { rows } = await db.query(buildSourceShipmentsQuery([...new Set(externalOrders.map((e) => e.sourceSellShipment))]))
  const bySell = new Map(rows.map((r) => [r.sellShipment, r]))
  const blocked = []
  const records = []
  for (const { orderNumber, sourceSellShipment } of externalOrders) {
    const src = bySell.get(sourceSellShipment)
    const rec = src?.detail?.orderList?.find((o) => (o.orderNumber ?? o.orderId) === orderNumber)
    if (!src || !rec || MOVE_BLOCKED_STATUS.includes(src.shipmentStatus) || MOVE_BLOCKED_TENDER.includes(src.tenderStatus)) { blocked.push(orderNumber); continue }
    records.push(rec)
  }
  if (blocked.length) { const e = new Error(`${MOVE_MESSAGE} Order impacted: ${blocked.join(', ')}`); e.status = 400; throw e }
  return { records, sources: rows }
}

// LINX-15872 "Source Shipment Update": the moved orders leave the source's
// orderList and every stop; emptied stops drop, the rest renumber, totals
// recompute — through the same mergeStops the target uses, so a source stop
// can never disagree with its remaining orders either.
export function removeOrdersFromSource(detail, movedIds) {
  const gone = new Set(movedIds)
  const orderList = (detail.orderList ?? []).filter((o) => !gone.has(o.orderNumber ?? o.orderId))
  const rows = (detail.shipmentStopList ?? [])
    .map((s) => ({ ...s, orderIds: (s.orderIds ?? []).filter((id) => !gone.has(id)) }))
    .filter((s) => s.orderIds.length > 0)
    .map((s, i) => ({ stopSequence: i + 1, stopType: s.stopType, orderIds: s.orderIds, sourceStopSequence: s.stopSequence }))
  return { orderList, stops: mergeStops({ ...detail, orderList }, rows) }
}
```

In the `save-stops` branch, after reading the detail (the whole save runs inside a transaction — `ponytail:` first BEGIN/COMMIT in this file; the AC demands "one Save transaction" and two shipments now change together):

```js
    const detail = rows[0].detail
    const { records: external, sources } = await pullExternalOrders(db, body.externalOrders)
    const onStops = new Set(body.stops.flatMap((s) => s.orderIds ?? []))
    // D2 — the confirm dialog's promise: orders left pending leave the shipment.
    const orderList = [...(detail.orderList ?? []), ...external].filter((o) => onStops.has(o.orderNumber ?? o.orderId))
    const merged = mergeStops({ ...detail, orderList }, body.stops)
    await db.query('BEGIN')
    try {
      await db.query(buildSaveStopsQuery(sellShipment, merged, orderList))
      for (const src of sources) {
        const movedIds = (body.externalOrders ?? []).filter((e) => e.sourceSellShipment === src.sellShipment).map((e) => e.orderNumber)
        const next = removeOrdersFromSource(src.detail, movedIds)
        await db.query(buildSaveStopsQuery(src.sellShipment, next.stops, next.orderList))
      }
      if (!OC_ACTIVE_TENDER_STATUSES.includes(body?.priorTenderStatus)) {
        const resolution = { action, cost: null, resolvedAt: new Date().toISOString() }
        await db.query(buildOrderChangeResolveQuery(sellShipment, outcome, resolution))
      }
      await db.query('COMMIT')
    } catch (e) {
      await db.query('ROLLBACK')
      throw e
    }
    return { success: true }
```

(`pullExternalOrders` runs BEFORE `BEGIN` so a validation failure never opens a transaction; the second test's `ROLLBACK` expectation therefore only holds for a failure inside the write block — change that test to make the target's `buildSaveStopsQuery` throw via the `db` stub instead, and keep the "nothing written" assertion for the validation failure. `db.query('BEGIN')` receives a plain string: the `mk` stub's `q.text` reads must tolerate it — see `texts` in the test.) Note the source save also resets `orderChange.consolidation.stopChanges` / `locationChange` on the source via `buildSaveStopsQuery` — harmless on a shipment with no pending consolidation; if a source row is itself in order-change review that reset is wrong, so `buildSaveStopsQuery` should take a fourth `{ resetChanges = true }` option and the source call passes `false`.

`buildSaveStopsQuery(sellShipment, stops, orderList, { resetChanges = true } = {})`:

```js
export function buildSaveStopsQuery(sellShipment, stops, orderList, { resetChanges = true } = {}) {
  const ids = orderList.map((o) => o.orderNumber ?? String(o.orderId))
  const base = `jsonb_set(jsonb_set(detail, '{shipmentStopList}', $1::jsonb), '{orderList}', $2::jsonb)`
  // The target's own consolidation badges are stale after a save (S143);
  // a SOURCE shipment keeps whatever review state it had.
  const detailSql = resetChanges
    ? `jsonb_set(jsonb_set(${base}, '{orderChange,consolidation,stopChanges}', '{}'::jsonb), '{orderChange,consolidation,locationChange}', 'false'::jsonb)`
    : base
  return {
    text: `UPDATE shipments SET detail = ${detailSql}, orders = $3, order_count = $4
           WHERE sell_shipment = $5 RETURNING sell_shipment`,
    values: [JSON.stringify(stops), JSON.stringify(orderList), ids, String(ids.length), sellShipment],
  }
}
```

The source call in the transaction passes `{ resetChanges: false }`.

Check the existing `buildSaveStopsQuery` test in `shipments.test.mjs` and update its `values` expectations (`order_count` is a text column in the seed — `s.orderCount` is a string; keep `String(ids.length)`).

- [ ] **Step 4: Run** `npx vitest run src/components/detail/order-change src/routes/shipments src/api` and `node --test api/_lib/shipments.test.mjs` → PASS. Then the full app suite `npx vitest run` → green (S143 baseline 2400).
- [ ] **Step 5: Commit** — `S144: Add New Order wired; external orders revalidated + copied in at save-stops; pending dropped (LINX-15870/15872)`

---

### Task 8: Browser check (mock mode) + canon

**Files:** modify `vault/10-domains/shipments/order-change.md`, `vault/10-domains/shipments/decisions/decision-log.md`, `progress.md` (via `/wrap`).

- [ ] **Step 1: Run it** — `VITE_API_MODE=mock npm run dev:odyssey-one` from the root; open a consolidated order-change row (Exceptions › Order Change, a `Consolidation` row; `25969909` is the pinned golden id) › Stops tab › **Edit Shipment Stops**. Verify with your eyes, not the suite (S136/S137 lesson):
  - hover an order link → dark Tooltip with the five rows;
  - Move To Pending → **Add to** → a menu of `Stop N`; pick one → the order lands there, totals move;
  - **Add New Order** → modal lists same-customer orders, search narrows, Filter opens the inner modal with the back chevron, Apply filters, a sixth pick shows the warning, Add Order(s) → pending rows;
  - View Routing → Approve Changes → **Approve Shipment Change** → Approve (mock is a no-op; the route navigates per Scenario A/B).
  - Note anything off (widths of the 11-column grid inside `ModalMedium`, the ActionMenu trigger vs the VD's `+ Add to` button) for the user; do not redesign.
- [ ] **Step 2: Canon** — `order-change.md` §10.3 add a *"Surface B slice 2 (S144)"* paragraph (confirm, stop picker, tooltip, Search & Add, external orders at save); §12: close OC-open-14 and OC-open-15, add OC-open-18/19/20 as worded in D1/D2/D6/D8. `decision-log.md`: **DEC-140** *Add to* = stop picker (source VD 2076-8110; previous state DEC-138 automatic); **DEC-141** Approve confirm + pending dropped at save (VD 2066-77150, AC 15869); **DEC-142** order hover through the canon Tooltip (VD 2143-11775 "Should Be In A ToolTip"); **DEC-143** Search & Add Orders modal + inner Filters (VD 2137-59231, AC 15870); the 15872 move at Save — revalidate, copy in, remove from source, one transaction.
- [ ] **Step 3: Commit** — `S144: canon §10.3 slice 2 — DEC-140…143; OC-open-14/15 closed, 18…20 opened`

---

## Self-review

- **Spec coverage.** VD confirm → Task 3 (D1) + Task 7 server side (D2). VD addto → Task 1 + Task 3 (D3). VD tooltip → Task 2 (D4). VD add + inner filters → Tasks 4, 5, 6, 7 (D5–D8). AC 15870 max five / customer lock / exclude own orders / default sort / 11 columns → Tasks 4, 6. AC 15871 add semantics → Task 1. AC 15872 revalidation message + impacted orders, source-shipment update, one transaction → Task 7 (`removeOrdersFromSource`, BEGIN/COMMIT). Canon → Task 8.
- **Placeholders.** None: every step carries its code; the two "check the API first" notes (FormField/DatePicker/Dropdown value shapes, `selectLabel`) name the exact file to read.
- **Type consistency.** `addToStop(sb, id, orders, stopKey)` / `addPending(sb, ids)` (Task 1) match Tasks 3 and 7. `CandidateOrderRow` (Task 5) = the builder's row (Task 4) = what `AddOrdersModal.onAdd` returns (Task 6) = what `handleAddOrders` consumes (Task 7). `onApprove(stopsDto, externalOrders)` (Task 3) = the route's `handleApprove` (Task 7) = `externalOrders` on the mutation/body/handler (Task 7). `buildSaveStopsQuery(sellShipment, stops, orderList)` is the only signature change on the server; its existing test is updated in Task 7.
- **Ponytail.** Client-side filtering over one fetch per customer (~150 rows) instead of a server-side filter API; one shared builder instead of two mappers; the source update reuses `mergeStops` + `buildSaveStopsQuery`; no new UI primitives.
