---
domain: cross-cutting
type: plan
tags: [animation, routing, sheets, shipments, orders]
date: 2026-09-23
status: draft
---

# Sheets — full-page views slide over a live page, app-wide

## Problem (measured, S158)

Every full-page view is a **sibling route**, and React Router renders exactly one.
Opening a view unmounts the page you came from; closing it remounts that page
from zero. Where a slide exists (`useSlideRoute`, 3 Shipments views), the exit
slides the view's content off its **own empty `<main>`** — the blank — then the
list mounts, renders empty, and rows pop in. Orders' views don't animate at all.
Every back-and-forth pays a full remount + reload and loses scroll, selection
and any open modal.

## Decision

One app-level **sheet stack**. A sheet is a route drawn in a full-screen layer
over the page it was opened from; that page (and any sheet under it) **stays
mounted**. Closing slides the sheet off the live page beneath. Slide only, no
fade (user, 2026-09-20).

Nothing is preloaded: only pages already on the path stay mounted (typically
1–3 deep). The opened sheet loads its data on open, as today.

### Sheets (initial set)

| Area | View | Route |
|---|---|---|
| Shipments | Consolidation review | `/shipments/consolidate/review` |
| Shipments | Order change review (direct + consolidation) | `/shipments/order-change/:sellShipment` |
| Shipments | Order change › edit stops | `/shipments/order-change/:sellShipment/stops` |
| Orders | View order (summary) | `/orders/:orderId` |
| Orders | Audit trail | `/orders/:orderId/audit-trail` |
| Orders | Create / edit draft / resolve | `/orders/create` (`?draft=` / `?resolve=`) |

Openers that become `openSheet`: Orders row actions (View, Audit Trail, Edit,
Resolve) + New Order button, Home › Create a New Order, Shipment detail modal ›
order link, ConfirmationView › order link, ShipmentTable / StopsTab /
RoutingGuideTab › order change, consolidate mode › Review.

## Design

### 1. The stack lives in history
`location.state.sheetStack` = the locations beneath the current one. Opening
pushes the current location; the stack travels with each history entry, so
**browser back/forward render the right layers for free**.

`App.jsx` renders:
- **Base** — `<Routes location={stack[0] ?? location}>`, always the first child,
  so it never remounts when a sheet opens over it.
- **Layers** — `stack.slice(1)` + the current location, each in
  `<SheetLayer key={loc.key}><Routes location={loc}>…</Routes></SheetLayer>`.

Pages under a layer read their own frozen `location` (Routes `location` prop), so
their state is untouched while covered.

A sheet route loaded by direct URL has no stack → it renders as the base, full
page, no slide. (Consolidation review already handles "nothing to review".)

### 2. Layer + animation
- `SheetLayer` portals to `document.body`, `position: fixed; inset: 0; z-index: 200`.
  The project convention already puts every portal (modals, menus, ComboBox,
  ActionMenu) at 200 on body, stacked by DOM order: the sheet covers whatever was
  open before it (e.g. the shipment detail modal) and everything the sheet opens
  afterwards lands above it. Tooltips (9999) unaffected. **No changes to
  `@odyssey/ui` portals.**
- Layer root is transparent; each sheet still renders its own `AppShell`, so its
  navbar/sidebar appear instantly, as today. Only **`main`** slides
  (`.sheet-layer main { animation: slide-in }`) — as it moves, the live page
  shows through.
- **Exit is generic.** App remembers the layers it rendered last; a layer that
  disappears from the stack is kept for 300 ms with `.sheet-layer--leaving`
  (slide-out), then dropped. Closing therefore navigates **immediately** — the
  page underneath applies its return intent while the sheet slides off it, and
  browser Back animates too.
- Covered base/layers get `inert`. Reduced motion: no animation, no hold.
- `useSlideRoute.js` + `slide-route.css` are deleted (replaced).

### 3. API — `useSheet()`
- `openSheet(to, { state })` — navigate with `sheetStack: [...stack, location]`.
- `closeSheet(to, { state })` — if `to`'s pathname matches a layer in the stack,
  navigate to it with the stack cut there (every layer above it closes; only the
  top one is visible, so only it animates). If nothing matches (e.g. View order
  opened from Shipments, then the "Orders" breadcrumb) → a plain navigate to a
  different page, no slide.
- Existing exits (`leaveTo`, ~20 `navigate('/orders')` in the Orders views,
  ResolveShell, CreateOrderForm, ConfirmationView) become `closeSheet` with the
  same target + state.

### 4. Return intents (the real work)
Pages read `location.state` **once** in lazy `useState` initialisers. Mounted,
they never re-read it. Each base page gets one `applyIntent(state)`, used by the
initialisers AND by an effect on `location.key`:

- **ShipmentsRoute** — `consolidate.rows` (replace selection), new
  `consolidateExit` → `exitConsolidate()` (restores prior panel/filters; today's
  remount silently resets to defaults), `createdShipment` (pin + highlight),
  `panel`/`tab`/`selectedShipmentId`/`requestedTab`, `orderNumber`.
- **OrdersRoute** — `tab`, `createdOrder` (highlight).
- Summary ← Audit trail: none.

### 5. Data
No change. Consolidation apply, order change, create/cancel order already
invalidate the list + counts; a mounted page refetches in place with its rows
still on screen.

## Tests
- App: opening a sheet keeps the base page in the DOM (same node — not remounted);
  closing keeps the sheet in the DOM ~300 ms with `--leaving`, then drops it;
  browser back (history POP) does the same; direct URL renders full page.
- `closeSheet` with no matching layer → plain navigate.
- Shipments: Modify Selection re-applies rows; post-apply close restores prior
  panel; no second list fetch on return.
- Orders: close from View/Audit/Create lands on the mounted list, tab intent applied.
- Existing route tests updated for `useSheet`.

## Verification
Browser, live mode, each sheet: list visible behind the slide both ways, no
empty-table flash, scroll/selection/open modal preserved; shipment detail modal →
order link → close returns to the open modal.

## Resolved (user, 2026-09-23)
- SpotBid detail — not in scope.
- Create → Confirmation → View order — View **replaces** the create sheet
  (`openSheet(to, { replace: true })`), so closing View lands on the Orders list.

---

# Part 2 — StepperButtonsFooter: sticky everywhere + top shadow

**Ask (user, 2026-09-23):** every StepperButtonsFooter pins to the bottom, not only
Consolidation Review, with a subtle top shadow "maybe the same as ShipmentsBar".

**Today:** 2 consumers. Consolidation Review pins it itself
(`consolidation-review.css:71` — `position: sticky; bottom: 0` + the page claiming
`<main>`'s height so `margin-top: auto` works). Create Order (`StickyFooter.jsx` →
`.co-footer`, also used by Resolve) sits **in flow** after the accordions despite
its name. The component (`.stepper-footer`) has no shadow.

**Shadow:** ShipmentsBar uses `--shadow-up-lg` (0 -8px 40px / .24) — a drawer
shadow, heavy for a footer. Proposed **`--shadow-up-md`** (0 -4px 16px / .08):
existing token, same up direction, subtle.

**Where it lives — RESOLVED (user, 2026-09-23): in the component, Figma + DSM.**
Order: Figma master 3164:2169 gets the up-md shadow effect (check an effect style
exists for `--shadow-up-md`; create it beside `shadow/up-lg` if not) → ask the
user to publish the library → React `.stepper-footer` gets `position: sticky;
bottom: 0; z-index: 1; box-shadow: var(--shadow-up-md)` as the default (every
instance, no prop) → both DSMs flip to NORMALIZING, version bump → Angular twin
via /port-to-angular. Consolidation Review's own sticky rules then collapse to the
bleed margins only.

Create Order also needs the page-height fix Consolidation Review has
(`margin-top: auto` against a full-height page) so a short form still puts the
footer at the bottom.

Inside a sheet, the footer is inside the sliding `<main>`, so it slides with the page.

---

# Part 3 — Consolidate mode: selected shipments float to the top

**Ask (user, 2026-09-23):** in consolidate mode the selected shipments sit on top;
everything else keeps the table's normal order, so the selection is always in view.

**Today:** default sort = Odyssey Shipment ID asc (numeric part only), server-side,
paginated. The selection is a client Map of row snapshots (`consolidate.rows`).
There is already a one-row pin (`created`, `ShipmentsRoute.jsx:315`) that prepends
on page 1 and de-dupes only against the current page.

**Design:**
- Page 1 = selected rows (their snapshots, ordered by the active sort) **above**
  the normal page. The server list **excludes** the selected ids
  (`filter.excludeIds` → `sell_shipment <> ALL($n)` in `buildListQuery`, same in
  the mock `gridService`), so a selected row never appears twice or shifts
  pagination. Page size/offsets unchanged; page 1 just grows by the selection.
- The anchor (Edit of an existing consolidation) is simply the first selected row.
- Rows move to the top **as they are checked** (that is the point — always in
  hand). Unchecking returns the row to its sorted place. The moved row gets the
  existing `highlightRowId` pulse so the eye can follow it.
- Outside the mode: no change.

---

# Part 4 — Shipments Export modal: primary + secondary

`TableControls.jsx:61-80` renders both footer buttons as `secondary`. The
ModalMedium convention is secondary left, primary right: **All Columns →
secondary**, **Visible Columns → primary** (the export of what you're looking at
is the common case). Orders' export modal already follows this.

---

# Part 5 — One error state for every data table

Shipments renders a failed load **inside** the DataTable shell (`error` prop →
Figma "Table Container Error": headline + short reason + Retry, header and
chrome kept; S116, user ruling 2026-08-14). Other tables roll their own:

| Table | Today |
|---|---|
| Orders list (`OrdersRoute.jsx:371`) | a bare line of text + small Retry **instead of** the table |
| Audit trail (`OrderAuditTrailRoute.jsx:55`) | own error branch, no table |
| SpotBid list (`SpotBidRoute.jsx`) | no error handling on the table |

All three move to the DataTable `error` prop with the same two-line copy pattern
(`"Couldn't load orders."` + `getErrorDetail(error)` + Retry). Non-table pages
(order summary, order-change review) keep their own error views — out of scope.

---

# Part 6 — PGI/PGR has no ShipmentsBar

The BottomBar (which hosts the ShipmentsBar) mounts whenever not in consolidate
mode (`ShipmentsRoute.jsx:837`). PGI/PGR is widget-only with no rows to open, so:
`{!inMode && activePanel !== 'pgipgr' && <BottomBar …/>}`. Switching to PGI/PGR
with a shipment open closes it.

---

# Part 7 — OIF resolve gets a breadcrumb

The resolve flow (`ResolveShell.jsx:228`) uses an `← ` link-button back to Orders;
Create Order / Order Summary / Audit Trail use `Breadcrumb`s. Replace with
**Orders › Resolve Order <id>** in the same `co-breadcrumb` nav. "Orders" is a
`closeSheet('/orders')` once Part 1 lands.

---

# Part 8 — OIF structural errors: no modal, decisions inline

**Sources:** OIF & Audit Trail review minutes (Ramesh, 2026-09-16; Venkat, Ramesh,
Dave, Steve) — transcript to follow; Venkat's error payload + OrderInterface JSON
(2026-09-23, relayed by user). Stories (LINX-16049 / 11137) stay primary; the
minutes confirm and fill gaps.

**Today:** Step 1's StructuralGrid lists faulty lines; its Action column opens
`StructuralFixModal`, a Done/Cancel transaction per line: extra schedules =
checkboxes + "Delete selected"; quantity mismatch = type a new line weight until
it equals the schedule's; missing time zone = dropdown. Cross-line conflicts
already work **inline** via `ConflictPicker` (one chip per distinct value,
labelled with its lines).

**What the meeting said (verbatim intent):**
- Structural corrections must be **reversible** if the wrong option was chosen.
- Quantity mismatch: the planner **chooses** line value or schedule value —
  "a decision rather than forcing one value to overwrite the other".
- While resolving a line's schedules, the planner needs **other lines' schedule
  info**. One schedule per line; ship and delivery dates consistent across lines.
- Errors come from the **backend** list, not UI validation logic.

**Design:** delete `StructuralFixModal`; each faulty line becomes an inline block
in Step 1 (same visual family as the ConflictPicker rows), one decision per fault:
- **Extra schedules → "Keep one schedule."** One chip per schedule (ship date ·
  delivery date · package count · weight), pick one; the others are dropped on
  reprocess. A compact read-only strip under it shows the **other lines'**
  schedule dates, so the pick can be made consistent.
- **Quantity mismatch → "Use line value / Use schedule value."** Two chips, each
  showing its package count · weight · volume with UOM. No typing.
- **Missing time zone** → the Dropdown, inline.
- **Reversible by construction:** every decision is a selection that can be
  changed or cleared (**Reset**) until the order is reprocessed. No Done step, no
  staged transaction.
- Line status badge (Validated / Needs decision) stays, driven by the same
  `isStructuralFixed` (updated for the pick model).

**Payload alignment:** our fault records already use Venkat's shape
(`fieldTree` / `field` / `message`); the envelope adds `warnings: []` — carried
through, not displayed until there's a warning case.

**Schedule dates — RESOLVED (user, 2026-09-23): pick-only.** Structural schedule
decisions choose among the dates the lines carry; no free date entry.

**Also in this part (user, 2026-09-23, from the same minutes):**
- **Phone:** no validation error. The phone input accepts digits only as typed
  (the "Invalid Data Type — letters in a phone" validation case is removed).
- **Reprocess is automatic:** Step 2's primary becomes **Save & Reprocess**; on
  press, a short "Reprocessing…" state precedes the existing success screen.

---

# Part 9 — Audit Trail (same 2026-09-16 call)

- **"+X more":** a row's Field / Old / New stacks show the first **3** changes;
  a `+X more` chip opens a modal with every change, grouped by line item
  (Line ID · Field · Previous · New).
- **Line count badge:** when one save touched more than one order line, the row
  shows a badge with the line count (`3 lines`).
- **Colour-coded event types:** system events vs user actions distinguished by
  Badge colour, using Shipments' history colours as the reference (today:
  "Order Action" blue, everything else gray).
- Audit Trail stays Created-orders-only (already true). "All Orders" → Created:
  tab already done; Home widget label `All Orders` → **Created** (`Home.jsx:363`).

---

# Execution

Session S158. Code by Sonnet subagents; every wave ends with tests + a
browser check, then one tagged commit per part.

- **Now (main thread):** Part 2 Figma — shadow effect on master 3164:2169 →
  **user publishes the library** → React + DSMs + Angular twin.
- **Wave A (parallel, disjoint files):**
  - A1 — Parts 3, 4, 6 (ShipmentsRoute, TableControls, shipments API + gridService)
  - A2 — Part 5 for Orders list + SpotBid (OrdersRoute, OrdersTable, SpotBidRoute)
  - A3 — Parts 7, 8 (ResolveShell, Step1Panel, StructuralGrid, StructuralFixModal
    deleted, validationErrors, resolve footer)
  - A4 — Part 9 + Part 5 for Audit Trail (audit-trail/*, OrderAuditTrailRoute, Home label)
- **Wave B:** Part 1 sheets — touches App + every opener/closer, so it goes last,
  on top of Wave A.
