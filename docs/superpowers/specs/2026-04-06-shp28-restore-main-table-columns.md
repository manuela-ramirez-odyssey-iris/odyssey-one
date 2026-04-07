# SHP-28: Restore Missing Columns + New Default Preset in Main Table

**Date:** 2026-04-06
**Project:** Odyssey Shipments — React 19 prototype (Bun + Vite + Tailwind v4)
**Status:** Ready for implementation

---

## Overview

The main shipments table currently hardcodes 8 column headers as a plain string array with no data-key mapping, and the corresponding `ShipmentRow` renders each cell manually. Many columns that existed in earlier iterations were lost during refactors. Jana has requested a specific 15-column default preset for the upcoming demo.

This ticket restores missing columns, introduces a structured column configuration array in `ShipmentTable.jsx`, refactors `ShipmentRow` to drive cells from that config, and adds two fields (`apFreightCost`, `validationMessage`) to `tools/generate.mjs` so they appear in `shipments.json`.

---

## Data Audit: `shipments.json` Field Availability

Reading the first record in `src/data/shipments.json` confirms the following state before any changes:

| Field | Exists at shipment level? | Notes |
|---|---|---|
| `buyShipment` | Yes | Always present |
| `customerId` | Yes | Always present |
| `shipmentStatus` | Yes | `"Done"` or `""` or `"Review"` |
| `orders` | Yes | Array of order ID strings |
| `orderCount` | Yes | String integer |
| `pickupDate` | Yes | `"MM/DD/YYYY HH:MM CST"` |
| `deliveryDate` | Yes | `"MM/DD/YYYY HH:MM CST"` |
| `origin` | Yes | `"City ST US ZIP"` |
| `destination` | Yes | Already added by generator (line 857 of `generate.mjs`) |
| `grossWeight` | Yes | String integer (LB, no unit suffix in main row) |
| `mode` | Yes | `"TL"`, `"LTL"`, `"RR"`, `"IMD"`, `"AIR"` |
| `equipmentCode` | Yes | `"VAN"`, `"FLT"`, `"LTH"`, `"REEFER"` |
| `scac` | Yes | Carrier SCAC of the accepted/sent carrier |
| `apFreightCost` | **No** | Must be added — derive from `apTotal` in generator |
| `validationMessage` | **No** | Must be added — part of SHP-27, empty string `""` for now |

**Summary:** 13 of 15 required fields already exist at shipment level. Two fields need to be added to `mainRow` in the generator.

---

## Functional Requirements

1. **Column config array.** Replace the plain string array at `ShipmentTable.jsx` line 257 with a `COLUMN_CONFIG` constant defined above the component. Each entry must have: `{ key, label, render? }`. The `render` property is an optional function `(shipment) => ReactNode` for custom cell content; when omitted the cell renders `shipment[key]` as plain text.

2. **Header row driven by config.** The `<thead>` column loop maps over `COLUMN_CONFIG` and renders `col.label` as the header text. No other change to header styles or the sticky last-column button.

3. **`ShipmentRow` cells driven by config.** Remove the 8 hardcoded `<td>` blocks for data columns (lines 164–196). Replace with a `COLUMN_CONFIG.map(col => ...)` loop rendering one `<td>` per column. Each `<td>` calls `col.render(s)` if present, otherwise renders `s[col.key]`. Preserve existing padding, height, border-bottom, and `whiteSpace: 'nowrap'` styles as defaults; individual columns override via their `render` return value where needed.

4. **Preserve special cells.** The radio-button first cell and the sticky 3-dot last cell are not part of `COLUMN_CONFIG` — they remain as explicit, hardcoded `<td>` elements before and after the config-driven loop.

5. **Orders column render.** The `orders` column render function reuses the existing `<OrdersTooltip>` + `<Badge>` pattern already in the file. Move this logic into the column config `render` rather than duplicating it.

6. **Shipment Status column render.** The `shipmentStatus` column render function reuses the existing `<Badge variant={...}>` conditional already in the file.

7. **Gross Weight formatting.** Render as `{s.grossWeight} LB` with `font-variant-numeric: tabular-nums` applied via inline style. The raw value in JSON is a plain integer string with no unit suffix.

8. **AP Freight Cost formatting.** Render as `$${Number(s.apFreightCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}` with `font-variant-numeric: tabular-nums`. Display `--` if the value is absent or `0`.

9. **Validation Message column.** Render as plain text. If the value is an empty string or absent, render nothing (empty cell). This column will be populated by SHP-27 logic for the Exceptions panel; Monitoring shipments will remain blank.

10. **Generator: add `apFreightCost`.** In `tools/generate.mjs`, inside the `mainRow` object literal (lines 847–871), add: `apFreightCost: fmt(apTotal)`. The variable `apTotal` is already computed at line 484 in the same `generateShipment` function scope.

11. **Generator: add `validationMessage`.** In the same `mainRow` object literal, add: `validationMessage: ''`. This is a placeholder; SHP-27 will populate it with real content per category.

12. **Re-run the generator.** After modifying `generate.mjs`, run `bun tools/generate.mjs` to regenerate `src/data/shipments.json` and `src/data/shipment-details.json` with the two new fields.

13. **Horizontal scroll.** No layout changes required. The table container already uses `overflow-auto` and the `<table>` uses `w-full border-collapse`. Adding 7 more columns will increase natural table width and trigger horizontal scrolling on narrow viewports automatically.

14. **Column panel compatibility.** The existing `ColumnPanel` component is not in scope for this ticket. The `COLUMN_CONFIG` array introduced here should be exported so a future ticket can wire it into column visibility toggling.

---

## Column Configuration (15-column default preset)

| # | Label | Key | Source | Render notes |
|---|---|---|---|---|
| 1 | Buy Shipment | `buyShipment` | `shipments.json` — always present | Plain text, `fontWeight: 500`, `color: var(--text-secondary)` |
| 2 | Customer ID(s) | `customerId` | `shipments.json` — always present | Plain text |
| 3 | Shipment Status | `shipmentStatus` | `shipments.json` — always present | `<Badge variant="green">` for `"Done"`, `<Badge variant="amber">` for anything else; empty cell when value is `""` |
| 4 | Order # | `orders` | `shipments.json` — array | `<OrdersTooltip>` wrapping `<Badge>` per order, up to first 2 visible, tooltip shows all; existing pattern |
| 5 | Order Count | `orderCount` | `shipments.json` — always present | `<OrdersTooltip>` wrapping plain count number; existing pattern |
| 6 | Pickup Date | `pickupDate` | `shipments.json` — always present | Plain text, `minWidth: 170` |
| 7 | Delivery Date | `deliveryDate` | `shipments.json` — always present | Plain text, `minWidth: 170` |
| 8 | Origin | `origin` | `shipments.json` — always present | Plain text, `minWidth: 180` |
| 9 | Destination | `destination` | `shipments.json` — already present (generator line 857) | Plain text, `minWidth: 180` |
| 10 | Gross Weight | `grossWeight` | `shipments.json` — always present | `{value} LB`, `tabular-nums`, `minWidth: 100`, right-align |
| 11 | Mode | `mode` | `shipments.json` — always present | Plain text |
| 12 | Equipment | `equipmentCode` | `shipments.json` — always present | Plain text |
| 13 | SCAC | `scac` | `shipments.json` — already present (generator line 864) | Plain text |
| 14 | AP Freight Cost | `apFreightCost` | **Add to generator** — derived from `apTotal` | `$X,XXX.XX` format, `tabular-nums`, right-align; `--` when falsy |
| 15 | Validation Message | `validationMessage` | **Add to generator** — empty string `""` by default | Plain text; empty cell when `""` or absent |

---

## Files to Modify

### 1. `tools/generate.mjs`

**Location:** `mainRow` object literal, lines 847–871.

Add two fields after `orderCount` (currently the last field):

```js
// existing last two lines of mainRow:
loadCount: String(orders.reduce((s, o) => s + o.lineCount, 0)),
orderCount: String(orderCount),
// ADD:
apFreightCost: fmt(apTotal),
validationMessage: '',
```

`apTotal` is already computed at line 484. `fmt` is the existing two-decimal formatter defined at line 169.

### 2. `src/components/shipments/ShipmentTable.jsx`

**Step A — Add `COLUMN_CONFIG` constant** above the `ShipmentRow` function (before line 130). Export it as a named export alongside the default export so future column-panel work can import it.

**Step B — Replace header loop** at line 257. Change from:

```js
{['Buy Shipment', 'Customer ID(s)', 'Order #', 'Order Count', 'Pickup Date', 'Delivery Date', 'Origin', 'Shipment Status'].map(col => (
  <th key={col} ...>{col}</th>
))}
```

To:

```js
{COLUMN_CONFIG.map(col => (
  <th key={col.key} ...>{col.label}</th>
))}
```

**Step C — Replace data `<td>` blocks in `ShipmentRow`** (lines 164–196). Remove all 8 hardcoded data cells. Replace with:

```js
{COLUMN_CONFIG.map(col => (
  <td key={col.key} style={{ padding: '0 var(--spacing-4)', height: 56, borderBottom: '1px solid var(--bg-tertiary)', whiteSpace: 'nowrap' }}>
    {col.render ? col.render(s) : s[col.key]}
  </td>
))}
```

Individual columns that need non-default styles (minWidth, tabular-nums, right-align) handle those via their `render` function returning a `<span>` or `<div>` with the necessary inline style, or by providing a `tdStyle` property on the config entry and spreading it into the `<td>` style.

---

## Verification Steps

1. Run `bun tools/generate.mjs`. Confirm output ends with `Done! Generated 200 shipments.` with no errors.
2. Inspect `src/data/shipments.json` — first record must contain `apFreightCost` (a string like `"1234.56"`) and `validationMessage` (empty string `""`).
3. Start the dev server (`bun run dev`). Open the shipments table. Confirm all 15 column headers are visible.
4. Scroll horizontally — confirm Destination, Gross Weight, Mode, Equipment, SCAC, AP Freight Cost, and Validation Message columns are present after Origin.
5. Confirm Order # column still shows colored badges with tooltip on hover.
6. Confirm Shipment Status column still shows green/amber badges.
7. Confirm AP Freight Cost cells show dollar-formatted values (e.g. `$2,341.78`) with no blank cells other than when value is genuinely `0`.
8. Confirm Validation Message column is blank for all rows (pending SHP-27 integration).
9. Confirm the sticky 3-dot last column and the radio-button first column are unaffected.
10. Confirm clicking a row still opens the detail bottom bar.
11. Check browser console — no React key warnings, no undefined-render errors.

---

## Out of Scope

- Column visibility toggling (ColumnPanel wiring) — future ticket.
- Column reordering — future ticket.
- `apFreightCost` population from real carrier cost data — generator mock value is sufficient for demo.
- `validationMessage` population per category — SHP-27 owns that logic.
