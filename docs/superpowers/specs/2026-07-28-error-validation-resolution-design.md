# Error Validation Resolution (OIF behavior) — Design

**Date:** 2026-07-28 (S99)
**Sources:** LINX-11137 AC (story screenshot → `vault-sources/10-domains/orders/LINX-11137 OIF Validation Error Resolution AC.png`), LINX-11659 (Validation Errors tab + Resolve gating, already built ORD-04), Efrain mocks 6005:40078 / 6005:39544 / 5711:16403 / 6146:22632 / 6089:26557 / 5720:8239 (Orders---OdysseyONE), user direction 2026-07-28.
**User rulings this session:** behavior on existing screens (not a new screen build); full tab transition on Save/Purge (client overlay, no DB write); error details = derive + seed hybrid; host = CreateOrderForm resolution mode (approach A).

## What it is

Clicking **Resolve** on a Validation Errors row (enabled only while `draftOrderStatus === 'Ready'` — already implemented) opens the create-order form in a **resolution mode**: the order's data hydrated read-only, only the error fields editable (red, with the error prompt), an error-validation Alert at the top listing every error, immediate re-validation flipping fixed fields to the green Validated state, and Save/Purge moving the order out of the tab as "Ready for Planning".

Per the AC: heading **"OIF Validation Error Resolution"** ("Order Validation Error Resolution" in the mocks — mocks outrank, use the mock title), sub-heading **Order Number \<n\>**, top-right **"← Back to overview page"** link → `/orders`.

## Components (all already built — this is wiring)

| Piece | Contract used |
|---|---|
| `Alert` (`packages/ui/src/Alert.jsx`) | `errors=[{field, reason, resolved?}]` + `contextText` ("ORD-x · Integrated from ACME") activates the validation anatomy. `onErrorNav(i)` (original-array index) fires from "Validate Errors →", list-row clicks, and docked arrows. `docked` = the sticky morph ("R out of N errors resolved" + ← Error i/N →); the **consumer** owns `position:sticky`, the scroll trigger, and autoscroll-to-field. `resolved:true` entries leave the count and list. |
| `Accordion` | `status='error'` + `errorCount` → red "N Errors" badge; `status='on'` + `errorCount` → green "Completed · N Errors validated". Validation is consumer-driven. |
| `FormField` / `ComboBox` | `error` (red border + prompt) and the new `validated` (green border + check + "Validated" line, S99). |
| `ModalMedium` | Purge confirm: "Confirmation / Are you sure you want to purge this Order?" Cancel · Yes (per mock 6089:26557). |
| `CreateOrderForm` | Gains `mode="resolve"` (see below). Sections, RHF + zod, per-field wiring all reused. |

## New module: `useValidationErrors(order)`

`apps/odyssey-one/src/components/orders/resolve/useValidationErrors.js`

Derive + seed hybrid, deterministic per `order.orderNumber` (seeded PRNG, same recipe as the generator):

1. Pick `order.errorCount` entries from a candidate pool of mandatory field descriptors: `{ path (RHF), label ("Equipment *"), section, reason }`. Reasons follow the three AC categories — most are **Missing Mandatory** (field value blanked in the hydrated draft, so data and error list agree), one deterministic pick per order is **Invalid Data** (kept value, seeded TMS mismatch), one **Invalid Data Type** where the pool allows (e.g. character in phone → corrupted value).
2. Returns `{ errors, fieldErrorMap (path → {reason, index}), sectionCounts, mutateDraft(draft) }` — `mutateDraft` applies the blanks/corruptions to the hydrated form values.
3. Resolution state is *live*: an error is `resolved` when its field currently passes its zod check (blank→filled, corrupted→fixed). Recomputed from RHF watch, not stored.

Consistency rule: the list tab's `errorCount` column and the derived set always match because both key off the same stored `errorCount` + order id.

## `CreateOrderForm mode="resolve"`

- **Route:** `/orders/resolve/:orderNumber` (Resolve button navigates here). Hydrates like Edit from the order-view data, then `mutateDraft`.
- **Chrome:** mock title + order-number sub-heading + Back link replace the create header. Footer = Cancel · Purge · **Save** (Save enabled only when all errors resolved — AC "Complete" precondition).
- **Fields:** everything read-only/muted except paths in `fieldErrorMap`. Error fields start with `error=<reason>`; once their live zod check passes they render `validated` and the Alert entry flips `resolved`.
- **Alert:** rendered above the sections, `defaultExpanded` per mock 6005:39544's context. `onErrorNav(i)` → scroll the field's ref into view + focus + flip `docked=true` (the Alert.demo consumer pattern). Docked bar is `position:sticky; top:0` under the navbar; it un-docks when scrolled back to top. When all resolved, the docked bar flips to the success tint ("12 out of 12 errors resolved", mock 6146:22632) — variant swap on the same Alert.
- **Section refs registry:** a `Map(path → ref)` populated by the sections in resolve mode; nav = `scrollIntoView({block:'center'})` + focus.
- **Accordions:** `status = sectionCounts[section] ? (allResolved(section) ? 'on' : 'error') : (normal derived status)` + `errorCount=sectionCounts[section]`. Sections with errors start expanded (mock 6005:40078); error-free sections start collapsed (mock 6005:39544 shows them collapsed).
- **Save:** applies the transition — order leaves Validation Errors, appears in All with status "Ready for Planning" — through the same client-side list overlay `createOrder` uses. **Purge:** ModalMedium confirm → same transition, no field fixing required. **Cancel:** back to `/orders`, nothing changes.

## Out of scope

- Real OIF API (LINX-11137 in Analysis, Q3 re-validate/re-send contract unknown) — the derive+seed module is the seam a future endpoint replaces.
- The AC's "retry mechanism on technical errors" (no real submission exists).
- Create-flow changes: manual create stays inline-per-field (Jira §6 research).
- "Complete" as a visible intermediate status (we go straight Ready-for-Planning on Save, matching the transition table's end state).

## Testing

- `useValidationErrors` unit tests: determinism (same order → same errors), count fidelity, category mix, mutateDraft blanks exactly the Missing-Mandatory paths.
- Resolve-mode RTL tests: alert renders N errors + context; row click navs + docks; fixing a field flips validated + decrements the open count; Save disabled until 0 open; Save/Purge transition (row leaves VE tab data, appears in All with Ready for Planning); Purge confirm modal.
- Existing 542 stay green (create/edit modes untouched by default-off mode prop).
