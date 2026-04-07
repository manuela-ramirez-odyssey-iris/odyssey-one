# SHP-32: Restrict Shipment Modes to TL and LTL Only

**Date:** 2026-04-06  
**Status:** Spec (ready for implementation)  
**Stakeholder:** Jana (Product Owner)

---

## Overview

Currently, the shipment data generator (`tools/generate.mjs`) creates shipments with five transportation modes: TL (Truckload), LTL (Less Than Truckload), RR (Railroad), IMD (Intermodal), and AIR (Air Freight). Per Jana's demo requirements, only TL and LTL modes are supported for the current release. This spec defines the removal of RR, IMD, and AIR modes from the generator and updates the mode distribution weights.

---

## Functional Requirements

1. **Update Mode List**
   - Remove modes: RR, IMD, AIR
   - Retained modes: TL, LTL
   - Location: `tools/generate.mjs`, line 10

2. **Update Mode Weights**
   - Redistribute weights to TL: 55%, LTL: 45%
   - Rationale: Maintains relative distribution while accounting for removed modes
   - Location: `tools/generate.mjs`, line 11

3. **Remove RR Customer Restriction Logic**
   - Delete `RR_CUSTOMERS` constant (line 12)
   - Simplify mode selection logic (lines 253–265) to remove RR customer filtering
   - Impact: All customers will have equal access to TL and LTL

4. **Preserve Stop Count Rules**
   - **TL:** Multi-stop allowed (1–2 pickups in addition to 1 delivery)
   - **LTL:** Single pickup + single delivery (1 pickup stop + 1 delivery stop)
   - No changes needed; existing logic at line 329 already enforces this per-mode constraint

5. **Update Mode Label Mapping**
   - Remove RR, IMD, AIR entries from shipmentMode mapping (line 795)
   - Retain: `{ TL: 'Truckload', LTL: 'Less Than Truckload' }`

6. **Regenerate Data**
   - Run `bun tools/generate.mjs` to regenerate `src/data/shipments.json` and `src/data/shipment-details.json`
   - Verify all generated shipments contain only TL or LTL modes

---

## Files to Modify

| File | Changes | Lines |
|------|---------|-------|
| `tools/generate.mjs` | Remove RR/IMD/AIR from MODES; update MODE_WEIGHTS; remove RR_CUSTOMERS; simplify mode selection | 10–12, 253–265, 795 |
| `src/data/shipments.json` | Regenerated (RR/IMD/AIR removed) | All |
| `src/data/shipment-details.json` | Regenerated (RR/IMD/AIR removed) | All |

---

## Impact on Other Logic

### Preserved Behavior
- **Stop logic** (line 329): No changes required. TL multi-stop and LTL single-stop behavior is unchanged.
- **Equipment codes** (`EQUIPMENT_CODES`): No mode restrictions; all equipment remains available for both TL and LTL.
- **Carrier assignment**: No mode restrictions; all carriers available for both TL and LTL.

### UI Affected (Known)
- **`src/components/shipments/FilterPanel.jsx`**: Contains saved filters with `mode:IMD` (line 18). These filters will no longer match any shipments after data regeneration. Consider updating or removing:
  - Line 18: `'Intermodal -- Hazardous Cargo'` filter with `mode:IMD` query

---

## Verification Steps

1. **Code Review**
   - Confirm MODES array contains only `['TL', 'LTL']`
   - Confirm MODE_WEIGHTS sums to 100: `{ TL: 55, LTL: 45 }` ✓
   - Confirm RR_CUSTOMERS constant is removed
   - Confirm mode selection logic no longer references RR_CUSTOMERS

2. **Data Generation**
   - Run: `bun tools/generate.mjs`
   - Verify no errors in console output
   - Confirm `src/data/shipments.json` and `src/data/shipment-details.json` are updated

3. **Data Validation**
   - Spot-check generated JSON files
   - Confirm all shipments have `shipmentMode` as either `"Truckload"` or `"Less Than Truckload"`
   - Confirm no shipments contain `RR`, `IMD`, or `AIR` modes
   - Confirm TL shipments have 2–3 total stops (1–2 pickups + 1 delivery)
   - Confirm LTL shipments have exactly 2 stops (1 pickup + 1 delivery)

4. **UI Sanity Check**
   - Open app and verify Shipments page loads without errors
   - Verify default shipment list displays with correct mode labels
   - Verify mode filter in FilterPanel still functions (if updated, confirm filters work)

---

## Notes

- **No breaking changes** to component interfaces or data schema; only allowed mode values are restricted.
- **Backward compatibility**: Existing code that checks `mode === 'TL'` or `mode === 'LTL'` remains unchanged and functional.
- **Future expansion**: If RR, IMD, or AIR modes are re-enabled, this change is easily reversible by updating the constants and regenerating data.
