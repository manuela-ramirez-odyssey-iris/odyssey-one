# SHP-24: Three-dot menu cleanup + row highlight + dropdown clipping

**Date:** 2026-04-06
**Author:** Manuela Ramirez
**Status:** Ready for implementation
**Story:** SHP-24
**Project:** Odyssey Shipments — React 19 prototype (Bun + Vite + Tailwind v4)

---

## Overview

Three independent fixes collected from Jana's review session. Each fix is self-contained and can be implemented in sequence without requiring shared state changes between them.

1. **Fix 1 — ShipmentTable action menu:** Remove the "Buy Shipment" item from the main table's three-dot menu. Jana confirmed it is redundant because the shipment ID is already visible inline in the row.
2. **Fix 2 — RoutingGuideTab row highlight color:** The highlighted row (when a three-dot menu is open) currently always uses `var(--badge-blue-bg)`. It should instead reflect the row's tender status badge color for visual consistency.
3. **Fix 3 — RoutingGuideTab dropdown clipping:** When a three-dot menu is triggered on a row near the bottom of the viewport, the `ActionDropdown` portal clips below the visible area. The dropdown should flip upward when insufficient space exists below the trigger.

---

## Functional Requirements

### Fix 1 — Main shipments table: remove "Buy Shipment" menu item

**F1.1** The `ActionMenu` component in `ShipmentTable.jsx` shall contain exactly two items:
- `{ label: 'Edit', key: 'edit' }`
- `{ label: 'Tender by Preferred Carrier', key: 'tender' }`

**F1.2** The `{ label: 'Buy Shipment', key: 'buy' }` item shall be removed entirely.

**F1.3** No other behavior of `ActionMenu` (positioning, portal rendering, click-outside close) shall change.

---

### Fix 2 — Routing guide table: status-matched row highlight

**F2.1** When a row is highlighted (`isHighlighted === true`), the `<tr>` background shall be set to the badge background color matching the row's tender status, using `STATUS_STYLES[option.status]?.bg`.

**F2.2** Status-to-background mapping:

| `option.status` | Highlighted row background |
|---|---|
| `'Accepted'` | `var(--badge-green-bg)` |
| `'Sent'` | `var(--badge-blue-bg)` |
| `'Declined'` | `var(--badge-red-bg)` |
| `'Cancelled'` | `var(--bg-tertiary)` |
| `null` / `undefined` (no status) | `var(--badge-blue-bg)` (default) |

**F2.3** The sticky action column `<td>` (the truck-icon cell) shall use the same status-matched background when `isHighlighted`, replacing the current hardcoded `'var(--badge-blue-bg)'`.

**F2.4** The `onMouseLeave` handler on the `<tr>` currently restores to `'var(--badge-blue-bg)'` when highlighted. It shall be updated to restore to the correct status-matched background instead. (The guard `if (!isHighlighted)` already prevents this path from running during non-highlighted mouse leave — verify the handler logic is consistent after the change.)

**F2.5** When `option.status` is `null`/`undefined` and the row is highlighted, fall back to `var(--badge-blue-bg)`. Use the expression:

```js
STATUS_STYLES[option.status]?.bg ?? 'var(--badge-blue-bg)'
```

**F2.6** No change to the `StatusBadge` component or `STATUS_STYLES` constant itself.

---

### Fix 3 — Routing guide table: dropdown flip when near viewport bottom

**F3.1** When `onOpenMenu` is called (triggered by clicking the truck icon `<td>`), the position calculation shall check available space below the trigger cell.

**F3.2** The estimated dropdown height is **200px** (covers the maximum expected item count of 4–8 items at ~28px each plus group labels and padding).

**F3.3** Position logic:
- **Space below** = `window.innerHeight - rect.bottom`
- If `space below < 200`: position dropdown **above** the trigger: `top: rect.top - 200`
- Otherwise: position dropdown **below** the trigger (current behavior): `top: rect.bottom + 4`

**F3.4** Horizontal positioning (`left: rect.right` with `transform: 'translateX(-100%)'`) remains unchanged. The dropdown stays anchored to the left edge of the action column in both above and below cases.

**F3.5** The calculated `top` value shall be passed through the existing `menuPos` state to `ActionDropdown` via `_menuPos` on the option object. No new state field is required — only the calculation at the call site changes.

**F3.6** The `ActionDropdown` component itself (`position` prop consumption and inline style `top`) requires no changes.

**F3.7** If `rect.top - 200` would result in a negative value (i.e., the trigger is in the top 200px of the screen and space below is also insufficient), clamp `top` to `8` (8px from viewport top) as a last resort. This edge case is rare given the table layout but should be guarded.

---

## Files to Modify

### `src/components/shipments/ShipmentTable.jsx`

- **Lines 77–81** — `items` array inside `ActionMenu`. Remove the first element (`Buy Shipment`). After the change the array has 2 items.

```js
// Before
const items = [
  { label: 'Buy Shipment', key: 'buy' },
  { label: 'Edit', key: 'edit' },
  { label: 'Tender by Preferred Carrier', key: 'tender' },
]

// After
const items = [
  { label: 'Edit', key: 'edit' },
  { label: 'Tender by Preferred Carrier', key: 'tender' },
]
```

---

### `src/components/detail/RoutingGuideTab.jsx`

**Fix 2 changes — all inside `RoutingTable` component, `options.map()` block (~lines 561–601):**

**Line 568 — `<tr>` background when highlighted:**
```js
// Before
background: isHighlighted ? 'var(--badge-blue-bg)' : 'var(--bg-primary)',

// After
background: isHighlighted
  ? (STATUS_STYLES[option.status]?.bg ?? 'var(--badge-blue-bg)')
  : 'var(--bg-primary)',
```

**Line 572 — `onMouseLeave` restore value:**
```js
// Before
onMouseLeave={(e) => { if (!isHighlighted) e.currentTarget.style.background = isHighlighted ? 'var(--badge-blue-bg)' : 'var(--bg-primary)' }}

// After
onMouseLeave={(e) => { if (!isHighlighted) e.currentTarget.style.background = 'var(--bg-primary)' }}
```
Note: The `isHighlighted ? ... : ...` ternary inside `onMouseLeave` is dead code because the outer `if (!isHighlighted)` guard prevents it from running when highlighted. Simplify to the non-highlighted branch only.

**Line 589 — sticky action `<td>` background when highlighted:**
```js
// Before
background: isHighlighted ? 'var(--badge-blue-bg)' : (option.status && STATUS_STYLES[option.status] ? STATUS_STYLES[option.status].bg : 'var(--bg-primary)')

// After
background: isHighlighted
  ? (STATUS_STYLES[option.status]?.bg ?? 'var(--badge-blue-bg)')
  : (STATUS_STYLES[option.status]?.bg ?? 'var(--bg-primary)')
```

**Fix 3 changes — `handleOpenMenu` callback in `RoutingGuideTab` main component (~line 691) and/or the `onClick` handler on the action `<td>` (~line 591):**

The `onClick` on the sticky `<td>` currently calculates position inline:
```js
// Current (line ~592–594)
onClick={(e) => {
  e.stopPropagation()
  const rect = e.currentTarget.getBoundingClientRect()
  onOpenMenu(option.rank, { top: rect.bottom + 4, left: rect.right })
}}
```

Change to:
```js
onClick={(e) => {
  e.stopPropagation()
  const rect = e.currentTarget.getBoundingClientRect()
  const dropdownHeight = 200
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow < dropdownHeight
    ? Math.max(8, rect.top - dropdownHeight)
    : rect.bottom + 4
  onOpenMenu(option.rank, { top, left: rect.right })
}}
```

No changes are needed to `handleOpenMenu` in the main component — it only stores the position, not compute it.

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Row status is `null` (never tendered) | Highlighted background = `var(--badge-blue-bg)` (default fallback) |
| Row status is `Cancelled` | Highlighted background = `var(--bg-tertiary)` — visually muted, consistent with the Cancelled badge |
| Dropdown trigger is within 200px of viewport bottom | Dropdown flips above trigger cell |
| Dropdown trigger is also within 200px of viewport top (no room either way) | `top` is clamped to `8px` from viewport top |
| Shipment with no status changes selection while menu is open | Reset via the `useEffect` on `data` change — no stale highlight |
| Two rows highlighted simultaneously | Not possible — `highlightedRank` is a single value; opening a new menu replaces the previous rank |
| `STATUS_STYLES` key not found (unexpected status string) | Optional chaining `?.bg` returns `undefined`, fallback `?? 'var(--badge-blue-bg)'` applies |

---

## Verification Steps

### Fix 1 — ShipmentTable menu items
1. Open the main shipments list.
2. Click the three-dot (action) menu on any row.
3. Confirm the menu shows exactly two items: "Edit" and "Tender by Preferred Carrier".
4. Confirm "Buy Shipment" is absent.

### Fix 2 — Row highlight color
1. Navigate to any shipment detail and open the Routing Guide tab.
2. Click the truck icon on a row with **Accepted** status.
   - Confirm the row background turns green (`var(--badge-green-bg)`).
   - Confirm the sticky action column cell also turns green.
3. Repeat for **Sent** (blue), **Declined** (red), **Cancelled** (muted/tertiary).
4. Click the truck icon on a row with **no status** (null).
   - Confirm the row background is `var(--badge-blue-bg)` (default).
5. Click outside the dropdown to dismiss — confirm the row background returns to `var(--bg-primary)`.
6. Hover a non-highlighted row — confirm hover still shows `var(--bg-secondary)`.

### Fix 3 — Dropdown clipping
1. Open the Routing Guide tab on a shipment with enough carrier rows to fill the visible table area.
2. Scroll the table so the last row's truck icon is near the bottom of the viewport.
3. Click the truck icon — confirm the dropdown opens **above** the trigger cell, fully visible.
4. Click the truck icon on a row in the middle of the viewport — confirm the dropdown opens **below** the trigger cell (default behavior unchanged).
5. Resize the browser to a short window height and repeat step 3.
6. Confirm no dropdown is ever partially or fully hidden behind the viewport bottom edge.
