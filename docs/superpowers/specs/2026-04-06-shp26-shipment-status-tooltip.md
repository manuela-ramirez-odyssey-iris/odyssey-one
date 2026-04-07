# SHP-26: Shipment Status Tooltip

## Overview

Add hover tooltips to the **Shipment Status** column in the shipment table that display the underlying tender status. This provides users context for shipment status without expanding table columns. Since shipment status is derived from tender status, the tooltip reveals this relationship on demand.

## Functional Requirements

1. **Wrap Status Badge with DarkTooltip**: Modify the Shipment Status cell renderer in `ShipmentRow` to wrap the Badge component with the existing `DarkTooltip` component.

2. **Tooltip Content Logic**:
   - `shipmentStatus === "Done"` → tooltip: `"Tender: Accepted"`
   - `shipmentStatus === "Review"` → tooltip: `"Tender: {tenderStatus}"` (use the actual `tenderStatus` value from shipment data)
   - `shipmentStatus === ""` (empty) → tooltip: `"Tender: {tenderStatus}"` (use the actual `tenderStatus` value)
   - No tender data available → suppress tooltip (no hover behavior)

3. **Tooltip Styling**: Use `DarkTooltip`'s default dark background and centered text. No custom styling required.

4. **Accessibility**: Tooltip appears only on hover; no keyboard activation required.

## Files to Modify

- **`src/components/shipments/ShipmentTable.jsx`**
  - Import `DarkTooltip` component (if not already imported)
  - Wrap the Badge in the Shipment Status cell (lines 194–196) with `DarkTooltip`
  - Add conditional logic to determine tooltip text based on `shipmentStatus` and `tenderStatus`

## Verification Steps

1. **Visual Verification**
   - Load the shipment table in the UI
   - Hover over a shipment with `shipmentStatus === "Done"` (tender: Accepted) → verify tooltip shows "Tender: Accepted"
   - Hover over a shipment with `shipmentStatus === ""` and `tenderStatus === "Sent"` → verify tooltip shows "Tender: Sent"
   - Verify tooltip position is above the cell and centered

2. **Data Validation**
   - Confirm `tenderStatus` field is available in shipment data (already present in `src/data/shipments.json`)
   - Verify tooltip only appears when `tenderStatus` has a value

3. **Cross-browser Testing**
   - Test tooltip in Chrome, Safari, and Firefox to ensure positioning and visibility are consistent

## Related Context

- **Component Location**: `/src/components/ui/DarkTooltip.jsx` (reusable tooltip component)
- **Current Implementation**: Status cell currently renders as a Badge without tooltip
- **Data Schema**: Shipment objects include `tenderStatus` field (values: "Sent", "Accepted", "Declined", "Cancelled")
- **Status Mapping**: Shipment status values are "Done" (when tender accepted) or "" (when tender sent or awaiting response)
