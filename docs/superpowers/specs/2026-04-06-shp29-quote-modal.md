# SHP-29: Add Quote / Edit Quote / Show Rate Details Modal

**Ticket:** SHP-29
**Date:** 2026-04-06
**Status:** Ready for Implementation
**Component:** `src/components/detail/RoutingGuideTab.jsx`
**Generator:** `tools/generate.mjs`
**Depends on:** SHP-21 (Tender Tab), SHP-24 (3-dot menu)

---

## 1. Overview

The Quote Modal is a single React component that operates in three modes — `add`, `edit`, and `view` — triggered from different entry points on the Tender Tab. It allows planners to attach rate data to a carrier option (AP cost + markup to derive AR), and lets them inspect that data later in a read-only view. The three modes share the same layout and data model; mode controls which fields are editable and whether the Save button is visible.

A critical data integrity requirement is introduced alongside this modal: the shipment-level Cost Allocation data must be derived from the accepted carrier's `rateDetails` object, not generated independently. This ensures that "Show Rate Details" on the accepted carrier and the Cost Allocation tab always show consistent numbers.

---

## 2. Functional Requirements

### 2.1 Entry Points and Mode Mapping

| # | Requirement |
|---|-------------|
| FR-1 | An "Add Quote" button is rendered above the routing table sub-tabs (same row as the sub-tab labels), right-aligned. It is always visible regardless of tender status. |
| FR-2 | Clicking "Add Quote" opens the modal in `add` mode with an empty form. |
| FR-3 | The 3-dot menu (ActionDropdown) "Tender Actions" group must include an "Edit Quote" option for every carrier. It appears below the existing tender actions (Tender / Accept / Decline / Cancel / Re-Tender) in the same group. |
| FR-4 | Clicking "Edit Quote" opens the modal in `edit` mode, pre-filled with that carrier row's `rateDetails`. |
| FR-5 | The 3-dot menu "Rate Details" group already has "Show Rate Details". Clicking it opens the modal in `view` mode, pre-filled with that carrier row's `rateDetails`. |
| FR-6 | Only one modal is open at a time. Opening a second entry point while the modal is open replaces the current contents. |

### 2.2 Modal Header

| # | Requirement |
|---|-------------|
| FR-7 | Modal title is "Add Quote" in `add` mode, "Edit Quote" in `edit` mode, "Rate Details" in `view` mode. |
| FR-8 | An X button is placed top-right. Clicking it closes the modal without saving. |
| FR-9 | Pressing Escape closes the modal without saving. |
| FR-10 | Clicking the backdrop overlay closes the modal without saving. |

### 2.3 Carrier Section

| # | Requirement |
|---|-------------|
| FR-11 | SCAC field is a dropdown populated from the `CARRIERS` constant (`{ scac, name }` objects). Display format in dropdown: `"SCAC — Carrier Name"`. |
| FR-12 | When SCAC is selected, the Carrier Name field auto-populates from the matching carrier entry and is read-only. |
| FR-13 | In `edit` and `view` modes, SCAC is pre-filled and disabled (non-editable); Carrier Name is read-only. |
| FR-14 | Pickup Date/Time is a datetime-local input. In `view` mode it is disabled. |
| FR-15 | Delivery Date/Time is a datetime-local input. In `view` mode it is disabled. |

### 2.4 Rate Section

| # | Requirement |
|---|-------------|
| FR-16 | Base Rate is a number input (required). In `view` mode it is disabled. |
| FR-17 | Currency for Base Rate is a dropdown defaulting to "USD". Options: USD, CAD, MXN. In `view` mode it is disabled. |
| FR-18 | Markup is a number input. This value is added to the AR side only, not AP. In `view` mode it is disabled. |
| FR-19 | Currency for Markup is a dropdown defaulting to "USD". In `view` mode it is disabled. |
| FR-20 | All number inputs accept decimals to 2 places. They do not accept negative values. |

### 2.5 Additional Charges Section

| # | Requirement |
|---|-------------|
| FR-21 | Additional charges are displayed as a table with columns: Charge Code (dropdown), Charge Description (auto-populated, read-only), Amount (number), Currency (dropdown, default USD). |
| FR-22 | Charge Code dropdown options and their auto-populated descriptions: |
|       | `THC` → Terminal Handling Charge |
|       | `FSC` → Fuel Surcharge |
|       | `SOC` → Stop-Off Charge |
|       | `HZC` → Hazmat Charge |
|       | `ACC` → Accessorial |
| FR-23 | Selecting a Charge Code from the dropdown immediately populates the Charge Description field in the same row. |
| FR-24 | A "+ Add Row" button appears below the charges table. Clicking it appends a new empty row. Hidden in `view` mode. |
| FR-25 | Each row has a trash icon delete button on the right. Clicking it removes that row. Hidden in `view` mode. |
| FR-26 | In `view` mode, the charges table rows are fully disabled (no dropdowns, no inputs active). |

### 2.6 Summary Section

| # | Requirement |
|---|-------------|
| FR-27 | The Summary section is always read-only and auto-calculated. It does not change based on mode. |
| FR-28 | AP Total = Base Rate + sum of all Additional Charge amounts. |
| FR-29 | AR Total = Base Rate + Markup + sum of all Additional Charge amounts. |
| FR-30 | Summary updates in real-time as the user changes Base Rate, Markup, or any charge amount. |
| FR-31 | Summary displays two rows: "AP Total" and "AR Total", each showing the calculated value formatted as currency (2 decimal places, currency code). |
| FR-32 | Summary is positioned at the bottom of the modal form, spanning full width, visually separated by a divider above it. |

### 2.7 Modal Footer

| # | Requirement |
|---|-------------|
| FR-33 | Footer contains a "Cancel" button (neutral/secondary style) on the left and a "Save Quote" button (primary style) on the right. |
| FR-34 | In `view` mode, the Save Quote button is hidden. Only the Cancel/Close button is shown, relabeled "Close". |
| FR-35 | Save Quote button is disabled if Base Rate is empty or non-numeric. |

### 2.8 Save Behavior — Add Mode

| # | Requirement |
|---|-------------|
| FR-36 | On save in `add` mode, a new carrier row is appended to the bottom of the routing options table with `status: null` (not yet tendered). |
| FR-37 | The new row uses the selected SCAC and Carrier Name. All other routing table fields (transit, distance, etc.) default to `'--'` or `null`. |
| FR-38 | The new row's `rateDetails` is set from the modal form values, with computed `apTotal` and `arTotal`. |
| FR-39 | The new row's `rank` is set to `max(existing ranks) + 1`. `routeRank` is set to the same value for simplicity. |
| FR-40 | After save, the modal closes and the routing table re-renders with the new row visible. |
| FR-41 | The new row's AP Cost cell (`cost` column) renders as the formatted `apTotal` from `rateDetails`. |

### 2.9 Save Behavior — Edit Mode

| # | Requirement |
|---|-------------|
| FR-42 | On save in `edit` mode, the existing carrier row's `rateDetails` is updated in place. |
| FR-43 | The row's `pickupDateTime` and `deliveryDateTime` fields update from the modal's date inputs (formatted to match existing `MM/DD/YYYY HH:MM CST` pattern). |
| FR-44 | The row's `cost` column value re-renders from the updated `rateDetails.apTotal`. |
| FR-45 | After save, the modal closes. The routing table row reflects the updated values immediately. |

### 2.10 Cascade: Cost Allocation Consistency

| # | Requirement |
|---|-------------|
| FR-46 | The Cost Allocation tab data for a shipment must be derived from the `rateDetails` of the carrier row whose `status === 'Accepted'`. |
| FR-47 | In the generator, Cost Allocation is no longer generated independently. It is computed after the routing options array is finalized, reading from the accepted carrier's `rateDetails`. |
| FR-48 | The mapping between `rateDetails` charge codes and Cost Allocation fields: `FSC` → `apFuel`/`arFuel`, `HZC` → `apHzc`/`arHzc`, `SOC` → `apSoc`/`arSoc`, `ACC` → contributes to totals without a separate named breakdown field. |
| FR-49 | Base Rate in `rateDetails` → `apBase`/`arBase` (AR = AP Base + markup). |
| FR-50 | If no carrier has `status === 'Accepted'`, Cost Allocation falls back to the existing independent generation approach (in-progress tenders have no finalized cost). |

---

## 3. Component Architecture

### 3.1 New Component: `QuoteModal`

Location: Section 4.5 in `RoutingGuideTab.jsx`, inserted between `TenderDetailModal` and `ActionDropdown`.

```
QuoteModal
  props:
    isOpen: boolean
    mode: 'add' | 'edit' | 'view'
    carrierData: object | null   // null in add mode; routing option object in edit/view
    onClose: () => void
    onSave: (formData) => void   // not called in view mode
```

Internal state:
```
formState: {
  scac: string,
  carrierName: string,
  pickupDateTime: string,      // ISO datetime-local string
  deliveryDateTime: string,    // ISO datetime-local string
  baseRate: string,            // string for controlled input
  baseCurrency: string,        // 'USD'
  markup: string,
  markupCurrency: string,
  charges: Array<{
    id: string,                // uuid or index for React key
    code: string,
    description: string,
    amount: string,
    currency: string,
  }>
}
```

Derived (computed in render, not stored in state):
```
apTotal: number  // parseFloat(baseRate) + sum(charges.map(c => parseFloat(c.amount) || 0))
arTotal: number  // apTotal + parseFloat(markup || 0)
```

### 3.2 Modifications to `RoutingGuideTab` (main component)

Add to existing state:
```js
const [quoteModal, setQuoteModal] = useState({ isOpen: false, mode: 'add', carrierData: null })
```

Add handler functions:
- `handleOpenAddQuote()` — sets mode `add`, carrierData `null`, isOpen `true`
- `handleOpenEditQuote(option)` — sets mode `edit`, carrierData from routing option, isOpen `true`
- `handleOpenViewRateDetails(option)` — sets mode `view`, carrierData from routing option, isOpen `true`
- `handleSaveQuote(formData)` — dispatches add or edit update to routing options state, closes modal

### 3.3 Modifications to `ActionDropdown`

Add "Edit Quote" as a new action button in the Tender Actions group, rendered below the existing status-driven actions and above the separator. It is always shown regardless of carrier status (a carrier can always have its quote edited).

Update `TENDER_ACTIONS` constant: "Edit Quote" is not part of the status-driven array (it always appears), so it is rendered separately in the dropdown rather than through the `TENDER_ACTIONS[status]` map.

Wire `onAction('EditQuote')` in the button's `onClick`.

### 3.4 "Add Quote" Button Placement

Rendered in the sub-tab bar row in `RoutingGuideTab`, right-aligned via `justify-between` on the container. Uses the same secondary button style as "View Full Details" in `TenderSummary`.

---

## 4. Data Model

### 4.1 `rateDetails` Schema (per carrier option in `routingData.options`)

```js
rateDetails: {
  baseRate: number,                     // e.g. 1250.00
  currency: 'USD' | 'CAD' | 'MXN',     // defaults to 'USD'
  markup: number,                       // e.g. 200.00 — AR only
  markupCurrency: 'USD' | 'CAD' | 'MXN',
  additionalCharges: [
    {
      code: 'THC' | 'FSC' | 'SOC' | 'HZC' | 'ACC',
      description: string,              // derived from code, e.g. 'Fuel Surcharge'
      amount: number,
      currency: 'USD' | 'CAD' | 'MXN',
    },
    // 0 to 3 entries per carrier option
  ],
  apTotal: number,   // baseRate + sum(additionalCharges[].amount)
  arTotal: number,   // baseRate + markup + sum(additionalCharges[].amount)
}
```

### 4.2 Charge Code → Description Map (source of truth, used in both generator and modal)

```js
const CHARGE_CODE_DESCRIPTIONS = {
  THC: 'Terminal Handling Charge',
  FSC: 'Fuel Surcharge',
  SOC: 'Stop-Off Charge',
  HZC: 'Hazmat Charge',
  ACC: 'Accessorial',
}
```

This constant must be defined in `RoutingGuideTab.jsx` (Section 1 — Constants) and referenced by `QuoteModal` for charge description auto-fill.

### 4.3 `cost` Field Alignment

The existing `cost` field on a routing option (`"$1,250.00 USD"`) is the AP-side cost shown in the "AP Cost" locked column. After implementing this story:

- For existing generator data: `cost` is derived from `rateDetails.apTotal` at generation time.
- For user-added rows (add mode): `cost` is derived from the saved form's computed `apTotal`.
- For edited rows (edit mode): `cost` is recomputed from updated `rateDetails.apTotal`.

The routing table's `getCellValue` function must be updated so the `cost` column reads from `rateDetails.apTotal` when present, falling back to the raw `cost` string for backwards compatibility.

---

## 5. Generator Changes (`tools/generate.mjs`)

### 5.1 New Constant

Add `CHARGE_CODE_DESCRIPTIONS` object (same as Section 4.2 above) to the DOMAIN CONSTANTS block.

### 5.2 `genRateDetails(isHazmat)` Helper Function

Add a new pure generator function:

```js
function genRateDetails(isHazmat) {
  const baseRate = faker.number.float({ min: 300, max: 2500, fractionDigits: 2 });
  const markup   = faker.number.float({ min: 50, max: 600, fractionDigits: 2 });

  // Always include FSC; optionally add 0–2 more charges
  const possibleExtra = isHazmat
    ? ['THC', 'SOC', 'HZC', 'ACC']
    : ['THC', 'SOC', 'ACC'];
  const extraCodes = faker.helpers.arrayElements(possibleExtra, faker.number.int({ min: 0, max: 2 }));
  const chargeCodes = ['FSC', ...extraCodes];

  const additionalCharges = chargeCodes.map(code => ({
    code,
    description: CHARGE_CODE_DESCRIPTIONS[code],
    amount: faker.number.float({ min: 25, max: 400, fractionDigits: 2 }),
    currency: 'USD',
  }));

  const chargeTotal = additionalCharges.reduce((s, c) => s + c.amount, 0);
  const apTotal = Math.round((baseRate + chargeTotal) * 100) / 100;
  const arTotal = Math.round((baseRate + markup + chargeTotal) * 100) / 100;

  return {
    baseRate,
    currency: 'USD',
    markup,
    markupCurrency: 'USD',
    additionalCharges,
    apTotal,
    arTotal,
  };
}
```

### 5.3 Attach `rateDetails` to Each Routing Option

Inside the `routingCarriers.map(...)` block (currently building `routingOptions`), after the existing fields are set, append:

```js
const rateDetails = genRateDetails(orders.some(o => o.lines.some(l => l.hazmat)));
// ...existing option fields...
cost: `$${fmt(rateDetails.apTotal)} USD`,   // override the old independent cost
rateDetails,
```

The `baseRate` variable that currently exists in the map block (`const baseRate = faker.number.float(...)`) conflicts with the new `rateDetails.baseRate`. Rename the old one to `_legacyRate` or remove it, since `cost` will now come from `rateDetails.apTotal`.

### 5.4 Restructure Cost Allocation to Derive from Accepted Carrier

Replace the current independent cost allocation generation block with the following logic:

```
1. Find the accepted routing option: routingOptions.find(r => r.status === 'Accepted')
2. If found:
   a. Read rateDetails from the accepted option.
   b. Derive AP breakdown:
      - apBase = rateDetails.baseRate
      - apFuel = amount of FSC charge (or 0)
      - apHzc  = amount of HZC charge (or 0)
      - apSoc  = amount of SOC charge (or 0)
      - apAcc  = amount of ACC charge (or 0)
      - apTotal = rateDetails.apTotal
   c. Derive AR breakdown:
      - arBase = rateDetails.baseRate + rateDetails.markup
      - arFuel = apFuel * (1 + marginPct) where marginPct = (rateDetails.arTotal - rateDetails.apTotal) / rateDetails.apTotal
      - arHzc, arSoc computed with same marginPct
      - arTotal = rateDetails.arTotal
   d. Distribute apTotal/arTotal across orders by weight share (existing weight-share logic is unchanged).
3. If no accepted carrier:
   a. Fall back to the existing fully-random generation (current code, unchanged).
```

This ensures that Cost Allocation tab numbers match the accepted carrier's rate details.

### 5.5 `apDiscount` in Cost Allocation

The current generator produces a random `apDiscount`. In the derived path, discounts do not exist in `rateDetails` (no discount charge code). Set `apDiscount = 0` and `arDiscount = 0` when deriving from accepted carrier. The Cost Allocation UI currently handles `--` for zero discounts, so no UI change is needed.

---

## 6. Modal States Table

| Property | `add` mode | `edit` mode | `view` mode |
|---|---|---|---|
| Modal title | "Add Quote" | "Edit Quote" | "Rate Details" |
| SCAC dropdown | Enabled, empty | Disabled, pre-filled | Disabled, pre-filled |
| Carrier Name | Read-only, auto-fills on SCAC select | Read-only, pre-filled | Read-only, pre-filled |
| Pickup DateTime | Enabled, empty | Enabled, pre-filled | Disabled, pre-filled |
| Delivery DateTime | Enabled, empty | Enabled, pre-filled | Disabled, pre-filled |
| Base Rate | Enabled, empty | Enabled, pre-filled | Disabled, pre-filled |
| Markup | Enabled, empty | Enabled, pre-filled | Disabled, pre-filled |
| Charge Code dropdown | Enabled | Enabled | Disabled |
| Amount inputs | Enabled | Enabled | Disabled |
| "+ Add Row" button | Visible | Visible | Hidden |
| Row delete button | Visible | Visible | Hidden |
| AP/AR Summary | Live-calculated | Live-calculated | Static from data |
| Save button | Visible, primary | Visible, primary | Hidden |
| Cancel/Close button | "Cancel" | "Cancel" | "Close" |

---

## 7. Edge Cases

| # | Scenario | Expected Behavior |
|---|---|---|
| EC-1 | User opens "Add Quote" without selecting a SCAC before clicking Save. | Save button is disabled. SCAC field shows validation error state (red border). |
| EC-2 | User opens "Add Quote" without entering a Base Rate before clicking Save. | Save button is disabled. Base Rate field shows validation error state. |
| EC-3 | User selects a carrier SCAC that already exists in the routing table (duplicate). | No blocking error in prototype. In future: warn "This carrier is already in the routing guide." |
| EC-4 | Carrier option has no `rateDetails` (e.g. old data before generator change). | "Edit Quote" pre-fills with empty form (add-mode behavior). "Show Rate Details" shows all fields as `--`. |
| EC-5 | User enters a non-numeric value in a number field. | Input shows browser native validation error. Save remains disabled. |
| EC-6 | User adds a charge row but leaves Amount blank. | Blank amounts are treated as `0` for AP/AR Total calculation. Row is saved with `amount: 0`. |
| EC-7 | User adds the same charge code twice (e.g. two FSC rows). | Allowed in prototype. Both rows are saved and summed in totals. |
| EC-8 | User opens Edit Quote, clears Base Rate, and attempts to save. | Save button is disabled (FR-35). |
| EC-9 | No carrier has `status === 'Accepted'` in the routing data. | Cost Allocation uses fallback random generation. "Show Rate Details" is still available per carrier but Cost Allocation data is independent. |
| EC-10 | Modal is open and user clicks a different carrier's 3-dot menu. | Modal closes (onClose fires on backdrop click or direct dismiss); the new 3-dot menu opens. Alternatively, the user must explicitly close the modal first. For the prototype, prevent 3-dot from opening while modal is open (block event propagation). |
| EC-11 | User opens Add Quote, selects SCAC, then changes selection. | Carrier Name field updates immediately to match the new SCAC selection. |
| EC-12 | User opens view mode for a carrier with zero additional charges. | Additional charges table renders empty (no rows). "+ Add Row" button is hidden. The summary still shows AP/AR totals from base rate only. |

---

## 8. Verification Steps

### 8.1 Generator Verification

- [ ] Run `bun run generate` — no errors.
- [ ] Open `src/data/shipment-details.json`. Pick any shipment. Verify `routingData.options[*].rateDetails` is present on every carrier option.
- [ ] Verify `rateDetails` has: `baseRate` (number), `currency` (string), `markup` (number), `markupCurrency`, `additionalCharges` (array of 1–4 objects), `apTotal`, `arTotal`.
- [ ] Verify `additionalCharges` always includes at least one `FSC` entry.
- [ ] Verify `apTotal = baseRate + sum(additionalCharges[].amount)` — calculate manually for 2–3 entries.
- [ ] Verify `arTotal = baseRate + markup + sum(additionalCharges[].amount)`.
- [ ] Find a shipment with an Accepted carrier. Verify that `costData.planned.orders[*].apBase` equals `rateDetails.baseRate` of that accepted carrier (distributed by weight share).
- [ ] Find a shipment with no Accepted carrier. Verify `costData.planned.orders[*].apBase` is a random number (fallback path).
- [ ] Verify `cost` field on each routing option matches `$${rateDetails.apTotal.toFixed(2)} USD`.

### 8.2 Add Quote Mode

- [ ] Click "Add Quote" button — modal opens with title "Add Quote".
- [ ] All form fields are empty on open.
- [ ] Save button is disabled when SCAC is empty.
- [ ] Save button is disabled when Base Rate is empty.
- [ ] Select a SCAC from dropdown — Carrier Name auto-fills and is not editable.
- [ ] Enter Base Rate → AP Total and AR Total update in real-time in Summary.
- [ ] Enter Markup → AR Total updates; AP Total does not change.
- [ ] Click "+ Add Row" → new charge row appears.
- [ ] Select charge code in new row → Charge Description auto-fills.
- [ ] Enter amount in charge row → AP Total and AR Total update.
- [ ] Click trash icon on a row → row is removed, totals recalculate.
- [ ] Press Escape → modal closes, no new row is added to the table.
- [ ] Fill all required fields and click Save → modal closes, new row appears at the bottom of the routing table with `status` showing `--` (no badge).
- [ ] New row's AP Cost column shows the correct `apTotal` value.

### 8.3 Edit Quote Mode

- [ ] Open 3-dot menu on any carrier row → "Edit Quote" appears in Tender Actions group.
- [ ] Click "Edit Quote" → modal opens with title "Edit Quote".
- [ ] SCAC field shows carrier's SCAC and is disabled (cannot change).
- [ ] Carrier Name is pre-filled and read-only.
- [ ] Base Rate, Markup, charges are pre-filled from that carrier's `rateDetails`.
- [ ] Summary shows correct pre-calculated totals.
- [ ] Edit the Base Rate → Summary updates in real-time.
- [ ] Add a new charge row → totals update.
- [ ] Click Save → modal closes, routing table row's `cost` column updates.
- [ ] Re-open Edit Quote on same row → new values are reflected.

### 8.4 View (Show Rate Details) Mode

- [ ] Open 3-dot menu → click "Show Rate Details" → modal opens with title "Rate Details".
- [ ] SCAC, Carrier Name, Base Rate, Markup, charges are all pre-filled.
- [ ] All inputs are disabled (cannot type or change dropdowns).
- [ ] "+ Add Row" button is absent.
- [ ] Delete buttons are absent on charge rows.
- [ ] Summary shows AP Total and AR Total correctly.
- [ ] "Save Quote" button is absent.
- [ ] "Close" button (not "Cancel") is present.
- [ ] Clicking Close or pressing Escape dismisses the modal.

### 8.5 Cost Allocation Consistency

- [ ] Find an Accepted carrier row. Note its `rateDetails.apTotal`.
- [ ] Navigate to the Cost Allocation tab for the same shipment. The sum of `apCost` across all orders must equal `rateDetails.apTotal`.
- [ ] Note `rateDetails.baseRate`. Verify that `apBase` in Cost Allocation (summed across orders) equals `rateDetails.baseRate`.
- [ ] Note FSC amount in `rateDetails.additionalCharges`. Verify `apFuel` in Cost Allocation (summed) equals that FSC amount.
- [ ] Open "Show Rate Details" on the Accepted carrier. Confirm that the AP Total shown matches what the Cost Allocation tab shows as the total AP cost.

---

## 9. Non-Goals (Out of Scope for SHP-29)

- Currency conversion between USD, CAD, MXN — all values are stored and displayed in their nominal amount; no FX rate logic.
- Saving data to a backend — this is a prototype; all state is in-memory / re-generated on next `bun run generate`.
- Inline editing of the routing table cells without the modal.
- Quote history / audit trail for changes made via Edit Quote.
- Multiple markups or split markup by order — markup is a single shipment-level value.
- Validation that the same SCAC is not added twice via Add Quote.
