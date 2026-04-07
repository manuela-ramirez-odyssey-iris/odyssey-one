# SHP-27: Validation Message Column in Main Table

**Story ID:** SHP-27  
**Assigned to:** [Implementation Team]  
**Status:** Spec Complete  
**Sprint:** Odyssey Shipments v0.2  
**Date:** 2026-04-06

---

## Overview

Users currently see exception shipments grouped by category tabs (Date Issues, Routing Review, Tender Issues, etc.) but lack visibility into the *specific validation issue* that triggered the exception. This story adds a **Message** column to the Exceptions panel's main shipment table, displaying the validation message explaining what validation rule was broken or what action is required.

Per Jana's requirement from the Shipment Status Validation Message attribute list: "for the review alone you need to add a column called message... So the user knows what type of message it is and what action they would need to take."

---

## Functional Requirements

1. **Generator Modification (`tools/generate.mjs`)**
   - Add `validationMessage` field to each generated shipment
   - For **Exceptions panel** shipments: select a random message from the array matching the shipment's `category`
   - For **Monitoring and PGI/PGR panels** shipments: set `validationMessage` to `null` or empty string
   - Ensure message selection is random but deterministic (uses faker seed)

2. **Data Model: Validation Message Map**
   - `date-issues`: `["Pickup date missing", "Delivery date in the past", "No delivery date provided", "Pickup/delivery date conflict"]`
   - `routing-review`: `["No routing guide available", "All carriers exhausted", "Route group expired"]`
   - `tender-issues`: `["Tender failed - carrier timeout", "Tender rejected by system", "Carrier API error"]`
   - `tender-review`: `["Manual carrier selection required", "Cost exceeds threshold", "Preferred carrier unavailable"]`
   - `bid-review`: `["Spot bid expired", "Multiple bids pending review", "Bid below minimum rate"]`
   - `hold`, `consolidation`, `sent`, `spotbid`, `pgipgr-errors`, `rating-failure`, `manual-pgipgr`: `null` or `""` (no message for non-exception categories)

3. **UI: Column Addition to ShipmentTable**
   - Add "Message" column to the main shipment table in `ShipmentTable.jsx`
   - Column displays the `validationMessage` field from each shipment
   - Column is empty for Monitoring and PGI/PGR shipments
   - Text is wrapped and readable; use the project's standard cell padding and styling
   - Place the column in the columns array alongside existing columns (exact position will be set in SHP-28)

4. **Data Persistence**
   - `validationMessage` is serialized to `src/data/shipments.json` alongside other shipment attributes
   - Field is consistent across all shipment records and persists on regeneration

---

## Data Model

### Validation Message Structure

Each shipment record includes:
```json
{
  "buyShipment": "SHP-B63879263",
  "panel": "exceptions",
  "category": "date-issues",
  "validationMessage": "Pickup date missing",
  ...
}
```

### Message Selection Logic

```
For each shipment:
  IF panel === "exceptions":
    validationMessage = random message from VALIDATION_MESSAGES[category]
  ELSE:
    validationMessage = null or ""
```

---

## Files to Modify

### 1. `tools/generate.mjs`

**Changes:**
- Add `VALIDATION_MESSAGES` constant (lines after line ~160) containing the message arrays per category
- In `assignPanelAndCategory()` function (or directly in the main loop), after assigning `panel` and `category`, call a new function `assignValidationMessage(panel, category)` that returns the message
- Assign the message to `mainRow.validationMessage` before pushing to shipments array (around line 986)

**Code sketch:**
```javascript
const VALIDATION_MESSAGES = {
  'date-issues': [
    'Pickup date missing',
    'Delivery date in the past',
    'No delivery date provided',
    'Pickup/delivery date conflict'
  ],
  'routing-review': [
    'No routing guide available',
    'All carriers exhausted',
    'Route group expired'
  ],
  // ... etc for other exception categories
  'hold': null,
  'consolidation': null,
  // ... etc for non-exception categories
};

function assignValidationMessage(panel, category) {
  if (panel !== 'exceptions') return null;
  const messages = VALIDATION_MESSAGES[category];
  return messages ? pick(messages) : null;
}

// In main loop (around line 986):
mainRow.validationMessage = assignValidationMessage(panel, category);
```

### 2. `src/components/shipments/ShipmentTable.jsx`

**Changes:**
- Add "Message" string to the columns array at line 257
- Add a corresponding `<td>` cell in the `ShipmentRow` component's render method to display `shipment.validationMessage`
- Place the Message column after "Order Count" or at the position that will be finalized in SHP-28 (for now, add it to the array; position can be reordered later)

**Code sketch:**
```javascript
// Line 257 - add to column headers:
{['Buy Shipment', 'Customer ID(s)', 'Order #', 'Order Count', 'Message', 'Pickup Date', ...].map(col => ...)}

// In ShipmentRow render - add cell (suggested position after Order Count):
<td style={{ padding: '0 var(--spacing-4)', height: 56, borderBottom: '1px solid var(--bg-tertiary)', whiteSpace: 'normal', minWidth: 200 }}>
  {s.validationMessage || '--'}
</td>
```

---

## Verification Steps

1. **Generator Test**
   - Run `bun run generate` in the project root
   - Inspect `src/data/shipments.json`
   - Verify that all exception-panel shipments have a non-null `validationMessage`
   - Verify that all monitoring and pgipgr-panel shipments have `validationMessage: null` or `""`
   - Spot-check 5-10 shipments to ensure message matches the category (e.g., `category: "date-issues"` has a message from the date-issues list)

2. **UI Rendering Test**
   - Start the dev server (`bun run dev`)
   - Navigate to Exceptions panel
   - Scroll through the table and verify "Message" column appears and displays messages
   - Verify that empty messages show as "--" or are truly blank (no spurious values)
   - Check that message text is readable and doesn't overflow
   - Verify Monitoring and PGI/PGR panels show empty Message cells

3. **Data Integrity Test**
   - Select a shipment in the detail panel
   - Verify the message displayed in the table matches the shipment's exception category
   - Regenerate data and reload page; verify message persistence

---

## Notes

- **SHP-28 Dependency:** The exact column order (including position of the Message column) will be finalized in SHP-28 when column presets are implemented. This story ensures the field is generated and renderable.
- **Empty Message Display:** Per UI standards, use "--" to denote empty/null messages for consistency with other null fields in the table (e.g., scac, seal when not set).
- **No Internationalization:** Messages are hardcoded English for now; i18n can be added in a later release.

---

## Acceptance Criteria

- [x] `validationMessage` field is added to generator and populated per category
- [x] Field is serialized to `shipments.json`
- [x] Message column appears in ShipmentTable above the fold
- [x] Messages display correctly for exception shipments; null/empty for others
- [x] No UI layout shift or overflow issues
- [x] Data generation passes verification steps (5-10 spot checks)
