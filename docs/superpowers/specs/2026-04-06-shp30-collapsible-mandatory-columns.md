# SHP-30: Collapsible Mandatory Columns in Routing Table

**Story ID:** SHP-30  
**Assigned to:** [Implementation Team]  
**Status:** Spec Complete  
**Sprint:** Odyssey Shipments v0.2  
**Date:** 2026-04-06

---

## Overview

The mandatory/locked columns in the tender routing table (Route Rank through Delivery Date/Time) consume too much horizontal space, crowding out the tab-specific columns on the right. Users need the ability to collapse those locked columns to reclaim horizontal real estate without losing the ability to expand individual columns on demand.

This spec defines a three-state interaction: all expanded (default), all collapsed, and partially expanded (one column individually restored while the rest remain collapsed). The interaction is entirely local to `RoutingGuideTab.jsx` — no URL state, no persistence, and no backend changes.

---

## Functional Requirements

1. **Column Groups**
   - The nine locked columns in `LOCKED_COLUMNS` are split into two behavioral groups:
     - **Never-collapse group** (3 columns): `routeRank`, `rank`, `status` — always render at full width; no icons, no interaction
     - **Collapsible group** (6 columns, in order): `scac`, `carrierName`, `equipment`, `cost`, `pickupDateTime`, `deliveryDateTime` — subject to the collapse/expand interaction described in this spec
   - The sticky Actions column on the right is unchanged by this feature

2. **Expanded State (default)**
   - All 6 collapsible columns render at full width with their normal labels and cell values
   - Each collapsible column header shows a `fold-horizontal` icon (lucide-react) at the trailing edge, visible only on hover of that header cell
   - The icon appears after the label text; if the label is truncated due to column width, the icon still appears at the trailing edge
   - Clicking the `fold-horizontal` icon on **any** collapsible column collapses **all 6 collapsible columns simultaneously** (batch collapse)

3. **Collapsed State**
   - All 6 collapsible columns are compressed simultaneously
   - **Header:** shows `...` text + `unfold-horizontal` icon; the icon is always visible (no hover requirement)
   - **Cells:** show the first 3 characters of the value + `...` (e.g., `"CHR..."` for `"CH Robinson"`, `"FXF..."` for `"FXFE"`)
   - **Column width:** shrinks to the minimum that fits `...` + the icon (approximately 48–56px); exact value set via inline style on `<th>` and `<td>`
   - If the compressed width cannot fit both `...` and the icon, the `...` text is dropped and only the icon is shown
   - Null/empty cell values display `--` (no truncation applied to the placeholder)

4. **Partially Expanded State**
   - From the fully collapsed state, clicking `unfold-horizontal` on **one** collapsed column expands **only that column**; the other 5 remain collapsed
   - The individually expanded column renders at full width with its normal label and cell values
   - The expanded column's header shows the `fold-horizontal` icon on hover (same behavior as the Expanded state)
   - Clicking the `fold-horizontal` icon on the individually expanded column **re-collapses all 6 columns** (returns to fully collapsed state — not to expanded state)
   - There is no state where more than one column is individually expanded; clicking `unfold-horizontal` on a second column while one is already expanded replaces the override (the first column re-collapses, the second expands)

5. **Icon Import**
   - Import `FoldHorizontal` and `UnfoldHorizontal` from `lucide-react` at the top of `RoutingGuideTab.jsx`
   - Use `size={12}` for both icons to keep them compact inside narrow headers
   - Icon color inherits from the header text color (`var(--text-tertiary)`)

6. **Sticky Positioning**
   - The never-collapse and collapsible locked columns are already frozen on the left via `position: sticky` (matching the existing `stickyLastCol` pattern used for the Actions column on the right)
   - This spec does not change the sticky behavior; the columns remain frozen regardless of collapse state
   - The collapsed columns' sticky `left` offset values must be recalculated to account for their reduced width (see Column Rendering Logic)

7. **No Persistence**
   - Collapse state is component-local React state; it resets when the tab unmounts or the user navigates away
   - No localStorage, no URL param, no backend call

---

## State Model

Two pieces of state are added to the `RoutingTable` component (or hoisted to `RoutingGuideTab` if `RoutingTable` does not exist as a separate component):

```javascript
const [columnsCollapsed, setColumnsCollapsed] = useState(false)
const [expandedColumnKey, setExpandedColumnKey] = useState(null)
```

### State Combinations

| `columnsCollapsed` | `expandedColumnKey` | Meaning |
|---|---|---|
| `false` | `null` (always) | All 6 collapsible columns are expanded (default) |
| `true` | `null` | All 6 collapsible columns are collapsed |
| `true` | `'carrierName'` (example) | 5 collapsed, Carrier Name individually expanded |

`expandedColumnKey` is always `null` when `columnsCollapsed` is `false`. Setting `columnsCollapsed` to `false` must also clear `expandedColumnKey`.

### State Transitions

```
Initial:          columnsCollapsed=false, expandedColumnKey=null

[User clicks fold-horizontal on any collapsible column header]
→ setColumnsCollapsed(true); setExpandedColumnKey(null)
  Result: all 6 collapsed

[User clicks unfold-horizontal on a collapsed column header, key='scac']
→ setExpandedColumnKey('scac')     // columnsCollapsed stays true
  Result: scac expanded, 5 others still collapsed

[User clicks unfold-horizontal on another collapsed column, key='cost']
  (while expandedColumnKey='scac')
→ setExpandedColumnKey('cost')     // replaces the override
  Result: cost expanded, 5 others still collapsed (including scac)

[User clicks fold-horizontal on the individually expanded column]
→ setExpandedColumnKey(null)       // columnsCollapsed stays true
  Result: all 6 collapsed again

[There is no direct transition from partially-expanded to fully expanded;
 the user must click fold → then the expand icon returns all to collapsed,
 not to expanded. The only path back to fully expanded is a future
 "expand all" control if added in a later story.]
```

---

## Column Rendering Logic

### Helper: `isCollapsed(columnKey)`

```javascript
function isCollapsed(columnKey) {
  const neverCollapse = ['routeRank', 'rank', 'status']
  if (neverCollapse.includes(columnKey)) return false
  if (!columnsCollapsed) return false
  if (expandedColumnKey === columnKey) return false
  return true
}
```

### Header Cell Rendering

```
for each column in LOCKED_COLUMNS:
  collapsed = isCollapsed(column.key)

  if collapsed:
    render <th> with:
      - width: COLLAPSED_WIDTH (e.g. 48px), style={{ maxWidth: COLLAPSED_WIDTH }}
      - content: <span style={{ display:'flex', alignItems:'center', gap:2 }}>
                   <span style={{ overflow:'hidden' }}>...</span>
                   <UnfoldHorizontal size={12} onClick={() => setExpandedColumnKey(column.key)} />
                 </span>
      - title attribute: column.label  (for accessibility tooltip)
      - cursor: 'default' (icon handles click)
  else:
    render <th> with normal width and:
      - content: column.label + (if column is in collapsible group):
                   <FoldHorizontal size={12} style={{ opacity:0 }} className="fold-icon" />
      - CSS hover on <th>: .fold-icon opacity → 1
      - onClick on FoldHorizontal: () => { setColumnsCollapsed(true); setExpandedColumnKey(null) }
```

### Body Cell Rendering

```
for each column in LOCKED_COLUMNS:
  collapsed = isCollapsed(column.key)
  value = getCellValue(row, column.key)    // existing logic

  if collapsed:
    render <td> with:
      - width: COLLAPSED_WIDTH, style={{ maxWidth: COLLAPSED_WIDTH, overflow:'hidden' }}
      - content: value is null/empty → '--'
                 else → first 3 chars of String(value) + '...'
  else:
    render <td> with normal styling (existing logic unchanged)
```

### Collapsed Column Width Constant

```javascript
const COLLAPSED_WIDTH = 48   // px — enough for icon + minimal text
```

### Sticky Left Offsets

The locked columns use `position: sticky` with a `left` value computed from cumulative column widths. When columns collapse, their width shrinks from their normal value to `COLLAPSED_WIDTH`. The sticky `left` offset for each column must be recomputed at render time based on the current collapse state of all preceding columns.

```javascript
// Column natural widths (approximate, match existing layout):
const COLUMN_WIDTHS = {
  routeRank: 80,
  rank: 60,
  scac: 80,
  carrierName: 160,
  equipment: 100,
  cost: 90,
  status: 110,
  pickupDateTime: 160,
  deliveryDateTime: 160,
}

function getEffectiveWidth(columnKey) {
  return isCollapsed(columnKey) ? COLLAPSED_WIDTH : COLUMN_WIDTHS[columnKey]
}

function getStickyLeft(columnIndex) {
  // sum of effective widths of all columns before this index
  return LOCKED_COLUMNS.slice(0, columnIndex).reduce(
    (acc, col) => acc + getEffectiveWidth(col.key), 0
  )
}
```

---

## Interaction Flow

The following step-by-step flow describes the full user journey through all reachable states.

### Flow A: Collapse All

1. User loads the Routing tab. All 9 locked columns are visible at full width.
2. User hovers over the "SCAC" header cell.
3. A `fold-horizontal` icon appears at the trailing edge of the "SCAC" header (opacity transitions from 0 to 1).
4. User clicks the icon.
5. `columnsCollapsed` becomes `true`; `expandedColumnKey` stays `null`.
6. All 6 collapsible columns shrink to `COLLAPSED_WIDTH`. Their headers show `...` + `unfold-horizontal` icon. Their cells show truncated values.
7. Route Rank, Rank, Tender Status remain unchanged.
8. The Actions column on the right remains unchanged.

### Flow B: Expand One Column Individually

9. (Continuing from step 8 — all 6 collapsed)
10. User sees the collapsed "CARRIER NAME" header showing `...` + icon.
11. User clicks the `unfold-horizontal` icon on the "CARRIER NAME" header.
12. `expandedColumnKey` becomes `'carrierName'`.
13. Carrier Name column returns to full width with its normal label and cell values.
14. The 5 other collapsible columns remain collapsed.
15. The Carrier Name header now shows the `fold-horizontal` icon on hover.

### Flow C: Switch Individual Override

16. (Continuing from step 15 — Carrier Name individually expanded)
17. User clicks `unfold-horizontal` on the collapsed "AP COST" header.
18. `expandedColumnKey` becomes `'cost'`.
19. AP Cost column expands to full width.
20. Carrier Name re-collapses (shows `...` + unfold icon again).

### Flow D: Re-Collapse All from Individual Override

21. (Continuing from step 20 — AP Cost individually expanded)
22. User hovers over the full-width "AP COST" header.
23. `fold-horizontal` icon appears on hover.
24. User clicks the icon.
25. `expandedColumnKey` becomes `null`. `columnsCollapsed` stays `true`.
26. All 6 collapsible columns are collapsed again.

### Flow E: Collapse via a Different Column's Icon

27. (Back to fully expanded state — `columnsCollapsed=false`)
28. User hovers over "DELIVERY DATE/TIME" header.
29. `fold-horizontal` icon appears.
30. User clicks it.
31. `columnsCollapsed` becomes `true`; `expandedColumnKey` is `null`.
32. All 6 collapsible columns collapse — same result as clicking any other collapsible column's icon.

---

## Visual Examples

### Expanded State — Header Row (schematic)

```
| ROUTE RANK | RANK | SCAC      fold▾ | CARRIER NAME    fold▾ | EQUIPMENT  fold▾ | AP COST  fold▾ | TENDER STATUS | PICKUP DATE/TIME  fold▾ | DELIVERY DATE/TIME  fold▾ | [tab cols...] | ACTIONS |
```
(fold icon hidden until hover; shown here on all for illustration)

### Collapsed State — Header Row

```
| ROUTE RANK | RANK | ...⇔ | ...⇔ | ...⇔ | ...⇔ | TENDER STATUS | ...⇔ | ...⇔ | [tab cols...] | ACTIONS |
```
(⇔ = unfold-horizontal icon, always visible)

### Partially Expanded — Carrier Name Restored

```
| ROUTE RANK | RANK | ...⇔ | CARRIER NAME    fold▾ | ...⇔ | ...⇔ | TENDER STATUS | ...⇔ | ...⇔ | [tab cols...] | ACTIONS |
```

### Collapsed State — Body Cell Examples

| Column | Full Value | Collapsed Display |
|---|---|---|
| SCAC | `ODFL` | `ODL...` |
| Carrier Name | `Old Dominion Freight` | `Old...` |
| Equipment | `Van` | `Van...` |
| AP Cost | `$1,234` | `$1,...` |
| Pickup Date/Time | `04/07 08:00` | `04/...` |
| Delivery Date/Time | `04/08 17:00` | `04/...` |
| Carrier Name | `null` | `--` |

Note: Cost values with `$` formatting will show `$` + 2 digits + `...`. This is acceptable; formatted display is for the expanded state.

---

## Edge Cases

1. **Very short values in collapsed cells**
   - If the raw cell value is 3 characters or fewer (e.g., SCAC `"FXF"`), display all 3 chars + `...` regardless: `"FXF..."`. Do not omit the ellipsis — it signals the column is collapsed and clickable.

2. **Null or undefined cell values**
   - Always display `--` in collapsed cells when the value is null, undefined, or empty string. Never display `nul...` or `und...`.

3. **StatusBadge in collapsed Tender Status column**
   - Tender Status is in the never-collapse group, so this case does not arise. No special handling needed.

4. **Width of sticky left offsets on tab switch**
   - When the user switches sub-tabs (Routing Options → Notify & Response etc.), the collapse state persists. Sticky offsets remain correct because they are computed from `LOCKED_COLUMNS` only, which do not change between tabs.

5. **Collapse state on shipment row change**
   - If the user selects a different row in the routing table, collapse state is preserved. It resets only when the component unmounts (user navigates away from the detail panel or closes the panel).

6. **Hover behavior on touch devices**
   - The `fold-horizontal` icon is hover-only in expanded state. On touch devices, hover is simulated on first tap. This is acceptable for v0.2; a touch-optimized solution is out of scope.

7. **Icon click vs. header click**
   - Only the icon itself is the click target for collapse/expand actions. Clicking the rest of the header cell has no effect. Use `e.stopPropagation()` on the icon's `onClick` if the header has any other click handler (e.g., sort).

8. **No sort interaction**
   - Locked columns do not have sort handlers in the current implementation. If sort is added in a future story, the icon click must call `e.stopPropagation()` to prevent sort from triggering when the user clicks the fold/unfold icon.

9. **Accessibility**
   - Add `title={column.label}` to collapsed `<th>` elements so screen readers and tooltip-on-hover users can identify the column.
   - Add `aria-label="Collapse all optional columns"` to the `FoldHorizontal` icon button wrapper.
   - Add `aria-label={`Expand ${column.label} column`}` to each `UnfoldHorizontal` icon wrapper.
   - Icons should be wrapped in a `<button>` element (or use `role="button"`) for keyboard accessibility, not a bare `<span>` with `onClick`.

10. **COLLAPSED_WIDTH and icon clipping**
    - If the icon (12px) plus padding does not fit in `COLLAPSED_WIDTH`, increase `COLLAPSED_WIDTH` until it does rather than clipping the icon. The `...` text is expendable; the icon must be fully visible.

---

## Files to Modify

### `src/components/detail/RoutingGuideTab.jsx`

**Changes:**

1. **Imports** — Add `FoldHorizontal, UnfoldHorizontal` to the lucide-react import line.

2. **Constants** — Add `NEVER_COLLAPSE_KEYS`, `COLLAPSIBLE_KEYS`, `COLLAPSED_WIDTH`, and `COLUMN_WIDTHS` constants after `LOCKED_COLUMNS`.

3. **State** — Add `columnsCollapsed` and `expandedColumnKey` state inside the relevant component (RoutingTable or RoutingGuideTab). Initialize both to `false` and `null` respectively.

4. **Helpers** — Add `isCollapsed(columnKey)`, `getEffectiveWidth(columnKey)`, and `getStickyLeft(columnIndex)` as local functions inside the component or as module-level utilities that receive state as arguments.

5. **Header rendering** — Modify the locked-column `<th>` loop to branch on `isCollapsed`:
   - Collapsed branch: render `...` + `<UnfoldHorizontal>` icon button with `onClick` handler
   - Expanded branch (collapsible columns only): render label + `<FoldHorizontal>` icon button hidden by default, shown on hover

6. **Cell rendering** — Modify the locked-column `<td>` loop to branch on `isCollapsed`:
   - Collapsed branch: render truncated value string
   - Expanded branch: existing rendering unchanged

7. **CSS hover for fold icon** — Use an inline-style approach or a Tailwind group-hover class on the `<th>` to control icon visibility. Since Tailwind v4 is in use, prefer `group` + `group-hover:opacity-100` on the icon element, or use a CSS variable / `onMouseEnter`/`onMouseLeave` approach if Tailwind classes are not available on dynamic elements.

**No other files require modification.** This is a purely presentational change with local state.

---

## Verification Steps

1. **Default state**
   - Load the app, open any shipment detail, navigate to the Routing tab
   - Verify all 9 locked columns are visible at full width
   - Hover over any of the 6 collapsible column headers (SCAC, Carrier Name, Equipment, AP Cost, Pickup Date/Time, Delivery Date/Time)
   - Verify the `fold-horizontal` icon appears on hover and disappears when the cursor leaves
   - Verify Route Rank, Rank, and Tender Status headers show no icon (never-collapse group)

2. **Collapse all**
   - Click the `fold-horizontal` icon on any collapsible column header
   - Verify all 6 collapsible columns shrink to minimum width
   - Verify their headers show `...` + unfold icon (always visible, no hover required)
   - Verify cell values are truncated to 3 chars + `...`
   - Verify null values show `--` (not truncated)
   - Verify Route Rank, Rank, Tender Status are unchanged
   - Verify the Actions column is unchanged
   - Verify horizontal scroll now shows more tab-specific columns without scrolling

3. **Expand one column**
   - From collapsed state, click the unfold icon on one column (e.g., Carrier Name)
   - Verify only Carrier Name expands to full width
   - Verify the other 5 remain collapsed
   - Verify Carrier Name header now shows `fold-horizontal` icon on hover
   - Verify Carrier Name cells display full values

4. **Switch individual override**
   - From partially expanded state (Carrier Name expanded), click unfold on AP Cost
   - Verify AP Cost expands and Carrier Name re-collapses
   - Verify only AP Cost is at full width; 5 others collapsed

5. **Re-collapse from individual override**
   - With one column individually expanded, click the `fold-horizontal` icon on it
   - Verify all 6 collapse again (not all expand)

6. **Sticky positioning**
   - In both expanded and collapsed states, scroll the routing table horizontally
   - Verify the locked columns remain stuck to the left as expected
   - Verify no overlapping or misalignment between sticky columns

7. **Sub-tab persistence**
   - Collapse all columns, then switch sub-tabs (e.g., Routing Options → Additional Info)
   - Verify columns remain collapsed after the tab switch

8. **Accessibility**
   - Tab to a collapsed column header using the keyboard
   - Verify the unfold button is reachable and activatable via Enter/Space
   - Verify `title` tooltip shows the full column label on a collapsed header
   - Use a screen reader (or browser accessibility inspector) to confirm `aria-label` values on icon buttons

9. **Edge case: short values**
   - Find a row where SCAC is 3 characters (e.g., `"XPO"`)
   - Verify collapsed cell shows `"XPO..."` not `"XPO"` alone

10. **Edge case: empty value**
    - Find a row where a collapsible column value is null or empty
    - Verify collapsed cell shows `"--"` not `"nul..."` or blank

---

## Acceptance Criteria

- [ ] `FoldHorizontal` and `UnfoldHorizontal` icons are imported from lucide-react and used correctly
- [ ] Route Rank, Rank, Tender Status columns are never affected by collapse/expand actions
- [ ] Clicking any collapsible column's fold icon collapses all 6 simultaneously
- [ ] Clicking an individual collapsed column's unfold icon expands only that column
- [ ] Clicking the fold icon on an individually expanded column re-collapses all 6 (not all-expand)
- [ ] Collapsed headers show `...` + unfold icon (always visible)
- [ ] Collapsed cells show first 3 chars + `...`; null/empty shows `--`
- [ ] Column width shrinks to fit icon; `...` text dropped if width is insufficient
- [ ] Sticky left offsets update correctly in both collapsed and expanded states
- [ ] Collapse state persists across sub-tab switches within the same shipment detail
- [ ] Collapse state resets when detail panel unmounts
- [ ] Icon buttons have `aria-label` and collapsed headers have `title` for accessibility
- [ ] No regressions to the Actions column, tab-specific columns, or row selection behavior
