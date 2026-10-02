---
domain: consolidation
type: spec
tags: [consolidation, order-change, edit-stops, tender, validation]
date: 2026-10-01
status: draft — awaiting user approval
---

# Spec — Edit Consolidated Shipment Stops (LINX-15873) + stop date sequence (Dave)

Paths are under `apps/odyssey-one/`. Session S165.

**Sources**
- LINX-15873 AC (`customfield_10032`, status *Final UX/UI Design*): an **Edit Shipment Stops** button on a Consolidated Shipment's Stops tab opens the consolidation stop editor, independent of order change. It hides order-change warnings, Prior Cost, New Direct Cost, New Consolidated Cost and OC indicators. It's greyed out while an order change is open.
- Jana's grooming (relayed by the user 2026-10-01): at the end, if a tender exists, the user is asked whether to keep it and send the update to the same carrier. **Yes**: update the existing carrier. **No**: go to the tender screen and choose another carrier.
- Dave Schultz in the same grooming: "stop #2 is happening before stop #1 … that you can validate."
- User rulings 2026-10-01:
  - **R1** A stop's date/time can't be earlier than any stop above it, across the whole sequence, whatever the stop type ("a pickup at 3am cannot be after another that says 4am").
  - **R2** The offending stop goes red with an inline Alert (DEC-219's look), and Evaluate/Apply are blocked. Other stops are not dimmed or locked.
  - **R3** **No** cancels the active tender and lands on the Tender tab.
  - **R4** Only Yes/No: no Bypass.

**Model:** reuse `ConsolidateStopsRoute` in its S1.5 single-C mode (one C row, no Prior, `minOrders=2`, consolidation endpoint). Nothing reads or writes `detail.orderChange`. The C keeps its ids (S7.5 of `2026-09-29-consolidation-via-order-change.md`).

---

## A. Date-sequence validation (both editors) — `src/components/detail/order-change/stopsSandbox.js`

- **A1** `dateSequenceViolations(stops)` → a `Map<stopKey, aboveKey>`. A stop violates when its `stampValue(parseStamp(date))` is **earlier than the latest dated stop above it**, and `aboveKey` names that stop. Undated stops are skipped (C16 already blocks them). Equal times are fine.
- **A2** `routeBlocker`: new reason `'dates'`, checked after `'sequence'` and before `'undated'`. `isRoutable` is false when the map is non-empty.
- **A3** `EditStopsView`, New plan only:
  - a violating stop row gets `edit-stops__stop--error` (red card/border, per the DEC-219 VD `x38TOJGsNryYl3LsKhCtSc` 3039:147748);
  - its Timeline item has `status: 'issue'` and its type Badge is the red variant;
  - an inline `<Alert variant="error">`: **"Stops are out of order. This stop's date is earlier than {aboveLabel} ({aboveDate})."**
  - Evaluate is disabled with the tooltip **"Stop {label} is dated before {aboveLabel}. Change its date or move it."** (built at the call site, like C7's tooltip).
- **A4** Moves and date edits are **not refused** for dates (unlike LINX-15669's order rule): a date edit is what causes the error, so it's flagged and fixed in place. Arrows and drag stay as today.
- **A5** Server backstop with the same rule, message `Stop dates are out of sequence.` (400):
  - `checkConsolidation` (`api/_lib/consolidateShipments.mjs`);
  - order change's save-stops (`api/_lib/shipments.mjs`).
  - One small exported helper in `api/_lib/` used by both. The client and server copies stay separate (`ponytail:`: the client isn't a module the API imports).
- **A6** Seed check (before anything ships): count the seeded shipments/order changes whose stop sequence already violates A1, then report the number to the user. **No reseed in this spec.** If the count is >0, the user decides (batch-reseed rule).

## B. The doorway — `src/components/detail/StopsTab.jsx`

- **B1** When `shipment.shipmentType === 'Consolidation'` and the tab is **not** in review mode (`!consolidatedReviewPending(orderChange)`), the All Stops header shows a secondary **Edit Shipment Stops** button.
- **B2** Disabled, with the tooltip **"Resolve the open order change first"**, when the shipment has an open order change (`orderChange` present and `resolution` null). (AC: "greyed out / not available".)
- **B3** Click → `openSheet('/shipments/consolidate/stops', { state: { rows: [row], from: 'stops' } })`. `row` is the grid row StopsTab already receives through `shipment`; if it lacks a field the route needs (`category`, `equipmentCode`, `customerId`), pass the selected row from the detail panel instead. Don't fetch it.
- **B4** The AC's hidden items (OC triangles, Prior / New Direct / New Consolidated cost, OC messages) are already absent in `showPrior={false}` mode. Verify this; build nothing for it.

## C. Route — `src/routes/shipments/ConsolidateStopsRoute.jsx`

- **C1** `editingC` (exists) now covers **any** C, not only pool C's.
- **C2** Leaving (X / crumb / Cancel) with `from: 'stops'` → back to `/shipments` with that C selected and its Stops tab open (the same `selectedShipmentId` + `requestedTab` state `useApproveOrderChange` uses).
- **C3** Tender question. On the routing modal's primary:
  - The C's own tender status is read from its detail (`tenderStatus`). If `hasActivePriorTender` (Sent/Accepted):
    - open a **ConfirmDialog**, title **"Active Tender"**: "This shipment is tendered to {SCAC} ({status}). Keep the tender and send the updated shipment to {SCAC}?"
    - **"Yes, send to {SCAC}"** → `tenderDecision: 'keep'`;
    - **"No, choose another carrier"** → `tenderDecision: 'cancel'`.
  - Otherwise there's no question: `tenderDecision: null`.
  - The C itself is **excluded** from `useTenderedCheck`'s rows, so it doesn't trigger *Tendered Shipment Detected* on itself. External orders' source shipments are still checked, as today.
- **C4** Landing after success:
  - `keep` → the C selected, **Tender** tab open, in its new panel/tab (Monitoring › Sent);
  - `cancel` → the C selected, **Tender** tab open, with the untendered carrier list (CNS-16), so the planner can tender another carrier;
  - `null` → the C selected, **Stops** tab open.
  - All three use the `closeToTenderTab` state shape (`selectedShipmentId`, `requestedTab`, `panel`, `tab`). There's no create animation (that's for a *new* C).

## D. Write path — `api/_lib/consolidateShipments.mjs` (+ mock `consolidationService.ts`)

- **D1** Body gains `tenderDecision: 'keep' | 'cancel' | null` (default null).
- **D2** `checkConsolidation`:
  - The pool guard is skipped for a single C source (`sources.length === 1 && isC`). Directs still must be in the pool.
  - New 400: a C source with an open order change → `Resolve the open order change before editing stops.`
  - New 400: a C with an active tender and no `tenderDecision` → `Choose whether to keep the active tender.`
- **D3** Filing a C edit:
  - `keep`: the OC `retender` outcome (`tenderStatus: 'Sent'`, `panel: 'monitoring'`, `category: 'sent'`). `shippingOptionList` = the posted list, with the kept carrier's row carrying `status: 'Sent'`. Reuse shipments.mjs's prior-carrier insert (`~:936`) so the kept SCAC is present even if routing dropped it.
  - `cancel`: today's filing (pool/Hold, `tenderStatus: ''`, all statuses blank). The tender cancellation is recorded the way `applyTenderAction` cancel records it (history entry).
  - `null`: today's filing.
- **D4** History on a C edit: one `Shipment Stops Edited` entry (`category: 'update'`), not `Shipment Created` + `Manual Consolidation`. The lineage stays untouched (no new sources unless externals were emptied, as today).

## E. Out of scope

- Bypass (R4). Read-only Stops tab date flags. Any reseed (A6 only reports).
- Order-change editor changes beyond A (its tender flow is LINX-15671, unchanged).

## F. Canon (main thread)

- Consolidation decision log: **CNS-23** (Edit Shipment Stops on any C; tender Yes/No; source LINX-15873 + Jana grooming).
- Shipments decision log: **DEC-234** (date-sequence rule for both editors; source Dave + user R1/R2; previous: windows flagged only, no stop-to-stop check).
- `consolidation.md`: a C-edit section. `order-change.md`: the date rule.

## Implementation split (two `implementer` agents, disjoint files)

- **Client:** A1–A4 (`stopsSandbox.js`, `EditStopsView.jsx`, `edit-stops.css`), B (`StopsTab.jsx`), C (`ConsolidateStopsRoute.jsx`, `useTenderedCheck.js` only if needed for C3's exclusion), plus tests.
- **Server + mock:** A5, A6 (report only), D (`consolidateShipments.mjs`, `shipments.mjs` save-stops guard + helper, `consolidationService.ts`, payload type), plus tests.
- The contract between them: the body's `tenderDecision`, and the 400 messages above.

## Tests

- `dateSequenceViolations`:
  - a 3am pickup below a 4am pickup → violation;
  - a delivery dated before a pickup above it → violation;
  - equal times → fine;
  - undated stops skipped.
- `EditStopsView`, in both modes:
  - a violating stop renders red with the Alert;
  - Evaluate is disabled with the tooltip;
  - fixing the date clears both.
  - All existing tests pass unchanged.
- StopsTab:
  - the button appears on a C outside review mode;
  - it's disabled with the tooltip when an order change is open;
  - it's absent on a Direct.
- Route:
  - an Accepted C → the Active Tender dialog;
  - Yes → mutate with `'keep'`, landing on the Tender tab;
  - No → `'cancel'`;
  - an untendered C → no dialog, landing on the Stops tab.
- API:
  - a non-pool C is accepted;
  - an open OC → 400;
  - an active tender with no decision → 400;
  - `keep` → Sent/monitoring/sent with the SCAC in the list;
  - `cancel` → blank;
  - out-of-sequence dates → 400 on both endpoints.

## Verification (main thread)

- `rtk vitest` (app + api) and the build.
- A browser pass on `dev:api`: open an Accepted C → Stops → Edit Shipment Stops. Date a stop earlier than the one above it, check the red state and the blocked Evaluate, then fix it.
- **Saving writes Neon: ask before that click.**
- Deploy only on the user's go, bundle-grepped for `Stop dates are out of sequence` and `Active Tender`.
