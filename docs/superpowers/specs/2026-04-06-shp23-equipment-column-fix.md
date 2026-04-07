# SHP-23: Fix Equipment Column Data Key in Routing Table

**Date:** 2026-04-06  
**Status:** Design Spec (Ready for Implementation)  
**Epic:** Data Integrity & Display  
**Assignee:** TBD

---

## Overview

The Equipment locked column in the routing table is configured to display `rate` data instead of equipment type, causing incorrect information to render. This spec defines a minimal fix to ensure the Equipment column displays the equipment type (FLT, LTH, VAN, REEFER) rather than cost/rate data.

**Issue Source:** Jana spotted during 2026-04-06 grooming session: "Equipment should not be rate."

---

## Functional Requirements

1. **Equipment Field in Data Generator**
   - Add `equipment: pick(EQUIPMENT_CODES)` to the carrier option object in `tools/generate.mjs` (line ~464)
   - Leverage existing `EQUIPMENT_CODES = ['FLT', 'LTH', 'VAN', 'REEFER']` constant
   - Use existing `pick()` helper for random selection

2. **Column Definition Fix**
   - Update `LOCKED_COLUMNS` array in `src/components/detail/RoutingGuideTab.jsx` (line 21)
   - Change: `{ key: 'equipment', label: 'Equipment', dataKey: 'rate' }`
   - To: `{ key: 'equipment', label: 'Equipment' }`
   - Removes incorrect `dataKey: 'rate'` override; column now reads `option.equipment` directly via default key matching

3. **Data Regeneration**
   - Run `node tools/generate.mjs` to regenerate test data with new equipment field

---

## Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `tools/generate.mjs` | Add `equipment: pick(EQUIPMENT_CODES)` to routing option return | ~464 |
| `src/components/detail/RoutingGuideTab.jsx` | Remove `dataKey: 'rate'` from equipment column def | 21 |

---

## Verification Steps

1. **Visual Inspection**
   - Open Routing Guide tab in any shipment detail
   - Verify Equipment column displays values like "FLT", "LTH", "VAN", or "REEFER"
   - Confirm Equipment column values differ from AP Cost column (which shows "$XXX.XX USD")

2. **Data Source Verification**
   - Inspect browser DevTools on a rendered table row
   - Confirm `option.equipment` is present in the data object
   - Confirm `option.rate` is separate (should be in different column)

3. **No Regression**
   - Other locked columns (SCAC, Carrier Name, Cost, Status, Pickup Date, Delivery Date) render correctly
   - AP Cost column still displays rate/cost data
   - All sub-tabs render without console errors

---

## Technical Notes

- The column rendering uses `getCellValue(option, col)` which defaults to `col.dataKey || col.key`
- Removing `dataKey` override allows the column to use `col.key` ('equipment') as the data accessor
- This aligns with the pattern used by other columns (e.g., 'scac', 'carrierName', 'cost')
- No component logic changes needed; purely configuration + data generation

---

## Decision Log

**Decision:** Treat as a bug fix, not a feature enhancement.  
**Rationale:** The Equipment column definition is misconfigured; it was never intended to display rate data. The fix is a configuration correction to match the original design intent.

**Alternative Considered:** Creating a separate `equipmentType` field. Not pursued — 'equipment' is the correct semantic field name.

