# SHP-31: View Full Details Modal Cleanup

**Date:** 2026-04-06
**File:** `src/components/detail/RoutingGuideTab.jsx`
**Component:** `TenderDetailModal`

---

## Overview

The "View Full Details" modal opened from the TenderSummary card has three presentation problems: two fields use the wrong display pattern (checkboxes instead of labeled fields), and the close affordance is buried in a footer alongside unrelated action buttons. This spec defines the minimal changes to correct all three without altering any other modal behavior.

---

## Functional Requirements

### 1. Replace Hazardous checkbox with a Field

**Current code (lines 347–348):**
```jsx
<CheckboxField label="Hazardous" checked={order?.hazmat === 'Yes'} />
```

**Required behavior:**
- Replace with `<Field label="Hazardous" value={...} />`.
- When `order?.hazmat === 'Yes'`: display a composite string built from the first product in `shipmentDetails.productsData.orders[0].products` that has `hazmat === true`. Use the fields: `hazmatClass`, `hazmatGroup`, `hazmatDescription`, `hazmatUnNumber`. Format: `"Yes — {hazmatClass}, Group {hazmatGroup}, {hazmatDescription} ({hazmatUnNumber})"`. If none of those sub-fields are populated (all `"--"`), fall back to `"Yes"`.
- When `order?.hazmat !== 'Yes'`: display `"No"`.

**Data path for hazmat detail:**
```
shipmentDetails.productsData.orders[0].products  → array of product objects
Each product has: hazmat (bool), hazmatClass, hazmatGroup, hazmatDescription, hazmatUnNumber
```
Find the first product where `hazmat === true` to source the display values.

**Example output values:**
- Hazardous: `Yes — Class 5, Group I, Oxidizing substance (UN2014)`
- Hazardous: `No`

---

### 2. Replace Instructions checkbox with a Field showing total instruction count

**Current code (line 347):**
```jsx
<CheckboxField label="Instructions" checked={true} />
```

**Required behavior:**
- Replace with `<Field label="Instructions" value={...} />`.
- Count the total number of instruction entries across **all orders** in `shipmentDetails.instructionsData.orders`.
- Each order entry has an `instructions` array; sum `instructions.length` across all orders.
- Display as:
  - `"5 instructions"` when count > 1
  - `"1 instruction"` when count === 1
  - `"No instructions"` when count === 0 or `instructionsData` is missing

**Data structure:**
```json
"instructionsData": {
  "orders": [
    {
      "orderId": "ORD-S26431945M",
      "instructions": [
        { "seq": 1, "text": "..." },
        { "seq": 2, "text": "..." }
      ]
    },
    {
      "orderId": "ORD-S26909320M",
      "instructions": [
        { "seq": 1, "text": "..." },
        { "seq": 2, "text": "..." }
      ]
    }
  ]
}
```
In this example, the total count is 8 → display `"8 instructions"`.

**Derivation logic (inside the modal, before the return):**
```js
const instructionCount = (shipmentDetails?.instructionsData?.orders || [])
  .reduce((sum, o) => sum + (o.instructions?.length || 0), 0)
const instructionsValue = instructionCount === 0
  ? 'No instructions'
  : instructionCount === 1
    ? '1 instruction'
    : `${instructionCount} instructions`
```

---

### 3. Replace footer with an X button in the modal header

**Current footer (lines 390–413):** A `div` with `borderTop` containing three buttons: "Routing Query (QCP)", "View Stops", "Close".

**Required change:**
- Remove the entire footer `div` (the `borderTop` separator div and all three `<button>` elements inside it).
- Add a header bar at the top of the modal inner `div`, above the 4-column grid.
- The header contains a title on the left ("Shipment Details") and the X close button on the right, matching the export modal pattern from `src/components/shipments/TableControls.jsx` lines 254–268.
- Add `X` to the lucide-react import at line 3.

**Header structure:**
```jsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Shipment Details</span>
  <button
    onClick={onClose}
    className="flex items-center justify-center bg-transparent border-none cursor-pointer"
    style={{ color: 'var(--text-placeholder)', padding: 0, transition: 'color 0.15s ease' }}
    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-placeholder)'}
  >
    <X size={18} />
  </button>
</div>
```

The `neutralBtn` constant and the `CheckboxField` component can be left in place — they may be used elsewhere. Do not remove them unless confirmed unused.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/detail/RoutingGuideTab.jsx` | Import `X` from lucide-react; add header bar; replace two `CheckboxField`s with `Field`s; remove footer |

No data files, no new components, no new files.

---

## Verification Steps

1. Open any shipment detail panel and navigate to the **Routing Guide** tab.
2. Click **View Full Details** — confirm the modal opens with a header bar showing "Shipment Details" and an X button top-right.
3. Confirm there is **no footer** and no "Close", "Routing Query (QCP)", or "View Stops" buttons.
4. Click the X button — confirm the modal closes. Also confirm Escape key still closes it.
5. Click the backdrop — confirm the modal closes (existing behavior unchanged).
6. In the **Shipment** column of the modal:
   - **Instructions field:** confirm it shows a count like `"8 instructions"`, not a checkbox. Verify the count matches the actual total across all `instructionsData.orders[*].instructions` arrays for that shipment.
   - **Hazardous field:** for a shipment where `order.hazmat === 'Yes'`, confirm the value includes hazmat class, group, description, and UN number (e.g., `"Yes — Class 5, Group I, Oxidizing substance (UN2014)"`). For a shipment where hazmat is `"No"`, confirm it displays `"No"`.
7. Confirm no regressions in other parts of the Routing Guide tab (sub-tabs, action dropdown, tender cascade logic, column panel toggle).
