# Performance Optimization — Design Spec

**Date:** 2026-04-07
**Goal:** Eliminate UI lag at 700 shipments and scale to 1000+ without adding backend infrastructure.
**Approach:** Frontend-only — table virtualization, detail data splitting, memoization, filter indexing.

---

## Problem Statement

The app is laggy when interacting with 700 shipments. Root causes identified by audit:

1. **No table virtualization** — All 700 `<tr>` elements rendered to DOM (`ShipmentTable.jsx:342-352`). At 1000 rows = 15,000+ DOM nodes.
2. **21 MB monolithic detail JSON** — `shipment-details.json` loaded entirely on first shipment click (`data/index.js:14-22`). Stays in RAM. At 1000 shipments = ~31 MB.
3. **Cascading re-renders** — Single `App.jsx` state tree (11 `useState` calls). Selecting a shipment triggers re-render of entire tree. Only `ShipmentRow` uses `React.memo`.
4. **O(n) filter chains** — 8 sequential `.filter()` passes on every state change (`App.jsx:76-156`). No indexed lookups.
5. **~5,000 inline closures** — Inline arrow functions on every row prevent effective memoization.

---

## Change 1: Table Virtualization

### What
Replace the `<table>` + `.map()` pattern in `ShipmentTable.jsx` with `react-window` `FixedSizeList`.

### Why
Only ~15 rows are visible at a time. Rendering 700+ DOM nodes is the primary cause of scroll jank and selection delay.

### How

**New dependency:** `react-window`

**ShipmentTable.jsx changes:**
- Replace `<table><tbody>{shipments.map(...)}</tbody></table>` (lines 313-355) with a `FixedSizeList` that renders only visible rows plus a small overscan buffer (5 rows above/below).
- Each row rendered by an `itemRenderer` function that receives the index and returns the existing `ShipmentRow` component.
- **Sticky header stays as a separate `<table>` element** above the virtual list (already a `<thead>` — just lift it out of the scrolling container).
- **Row height:** Fixed at 56px (current `height: 56` on all `<td>` elements, line 225).
- **Container height:** `flex: 1` to fill available space (same as current `div.flex-1.min-h-0`).
- **Selected row scroll-into-view:** Replace current `setTimeout` + `scrollBy` logic (lines 294-311) with `FixedSizeList.scrollToItem(index)`.
- **Sticky last column (actions):** Remains `position: sticky; right: 0` — works inside virtual list rows since each row is still a `<div>` with flex layout.

**Layout approach:** Since `react-window` uses `<div>` wrappers (not `<table>`), we switch to a CSS Grid or flex-based row layout:
- Header: standalone flex row with column widths matching data rows
- Each virtual row: flex `<div>` with the same column widths
- Column widths defined once in a shared config (already partially exists in `COLUMN_CONFIG`)

### Edge Cases
- Column panel changes (add/remove columns): List re-renders with new `itemData` — `react-window` handles this.
- Empty state (0 filtered results): Render existing "no results" message instead of the list.
- Auto-scroll on selection: Use `listRef.current.scrollToItem(selectedIndex, 'smart')`.
- **Sticky actions column:** Currently uses `position: sticky; right: 0` on a `<td>`. In the flex-based row layout, use the same sticky positioning on the last flex child — works identically in flex containers. The column shadow and background color transfer directly.

---

## Change 2: Split Detail Data (Per-Shipment Files)

### What
Replace the monolithic `src/data/shipment-details.json` (21 MB) with individual files in `public/details/<shipmentId>.json` (~30 KB each). Load on demand via `fetch()`.

### Why
Loading 21 MB into memory on first click causes a multi-second pause and wastes RAM. At 1000 shipments this becomes ~31 MB. Per-shipment files mean only ~30 KB loaded per selection.

### How

**Generator changes (`tools/generate.mjs`):**
- After generating all shipment details, write each entry to `public/details/<buyShipment>.json` instead of (or in addition to) `src/data/shipment-details.json`.
- Output: 1000 individual JSON files, ~30 KB each.
- Keep `src/data/shipments.json` as-is (0.6 MB main table data, statically imported).

**Data layer changes (`src/data/index.js`):**
- Remove `import('./shipment-details.json')` dynamic import entirely.
- Replace `loadShipmentDetails()` and `getShipmentDetails()` with:

```js
const detailsCache = new Map()

export async function getShipmentDetails(id) {
  if (detailsCache.has(id)) return detailsCache.get(id)
  const res = await fetch(`/details/${id}.json`)
  const data = await res.json()
  detailsCache.set(id, data)
  return data
}
```

- **LRU eviction (optional):** If memory is a concern, cap the cache at ~50 entries and evict oldest. At 30 KB each, 50 entries = 1.5 MB — negligible.

**App.jsx changes:**
- `shipmentDetails` becomes async: the `useEffect` on `selectedShipmentId` calls `getShipmentDetails(id)` and sets state on resolve.
- `detailsLoaded` flag replaced by per-shipment loading state (or kept as simple boolean).
- BottomBar receives `shipmentDetails` as before — no change to tab components.

**Build/deploy:**
- `public/details/` files are copied to `dist/details/` by Vite automatically.
- Works with any static file server (Python, Cloudflare, Vercel, nginx).
- Browser HTTP caching makes repeat visits instant.

### Edge Cases
- Rapid selection changes: Cancel or ignore stale fetches (check if `selectedShipmentId` still matches when fetch resolves).
- Network error: Show inline error in BottomBar, retry on next click.
- First-ever click: ~30 KB fetch, sub-100ms on local, <500ms on network.

---

## Change 3: Memoization Pass

### What
Wrap key components in `React.memo` and extract inline handlers to `useCallback`.

### Why
10+ components have zero memoization. Every state change in App.jsx cascades through the entire tree. Inline arrow functions on 700 rows create ~5,000 function objects per render.

### How

**Components to wrap in `React.memo`:**
- `MonitorPanels` — re-renders on every App state change, only needs `activePanel` + `metrics` + `collapsed`
- `ShipmentTabs` — only needs `activeTab` + badge counts
- `TableControls` — only needs search state + filter toggles
- `Navbar` — completely static after mount, zero props that change
- `Sidebar` — same as Navbar
- All detail tabs: `OrderTab`, `StopsTab`, `ProductTab`, `CostAllocationTab`, `InstructionsTab`, `DocumentsTab`, `NotesTab`, `HistoryTab`

**Inline handler extraction in ShipmentRow:**
- `onMouseEnter` / `onMouseLeave` hover handlers (lines 211-222): Replace with CSS `:hover` pseudo-class (no JS needed).
- Menu `onClick` (line 251-256): Already inside memoized component, acceptable.

**App.jsx handler stabilization:**
- `handleRowSelect` (already `useCallback`) — good.
- `setActivePanel`, `setActiveTab`, etc. — React state setters are stable by default, no action needed.
- `setFilters`, `setSearchQuery` — passed as props, stable.

**Metrics computation (`App.jsx:158-180`):**
- Currently recomputes panel/category counts on every render cycle.
- Pre-compute once at data load time: Build a `Map<panel, Map<category, count>>` from `allShipments` in a single pass. Store as a `useMemo` with `[allShipments]` dependency (already the case, but the inner logic does 10+ `.filter()` passes — replace with single-pass accumulator).

---

## Change 4: Filter Indexing

### What
Replace sequential O(n) `.filter()` chains with pre-built indexes for the most common filter dimensions.

### Why
8 sequential filter passes on 1000 shipments = up to 8,000 comparisons per keystroke. With indexes, panel + tab filtering drops to O(1) lookup.

### How

**Build indexes once at data load time (`src/data/index.js` or `App.jsx`):**

```js
const allShipments = getAllShipments()

// Pre-build grouped indexes
const byPanel = Map.groupBy(allShipments, s => s.panel)
const byPanelAndCategory = new Map()
for (const [panel, shipments] of byPanel) {
  byPanelAndCategory.set(panel, Map.groupBy(shipments, s => s.category))
}
```

**App.jsx `filteredShipments` optimization:**
- Step 0 (panel filter): `byPanel.get(activePanel)` instead of `.filter()` — O(1).
- Step 1 (tab filter): `byPanelAndCategory.get(panel).get(tab)` — O(1).
- Steps 2-8 (search, saved query, dropdown filters, date ranges): Still O(n) on the already-reduced set (typically 200-300 items after panel+tab, not 1000).

**Metrics computation:**
- Replace 10+ `.filter().length` calls with: `byPanelAndCategory.get('exceptions').get('date-issues')?.length ?? 0` — O(1) for all counts.

### Edge Cases
- Indexes built once (allShipments never changes in current architecture).
- If shipments ever become mutable (future feature), indexes would need rebuilding — but that's not in scope.

---

## Change 5: Increase to 1000 Shipments

### What
Update the generator to produce 1000 shipments (up from 700).

### Why
User requirement. With the above optimizations, 1000 shipments will feel as fast as 100 did before.

### How
- Change `NUM_SHIPMENTS` constant in `tools/generate.mjs` from 700 to 1000.
- Generator outputs `public/details/<id>.json` (1000 files) + `src/data/shipments.json` (1000 rows, ~0.9 MB).
- Run `bun tools/generate.mjs` to regenerate.

---

## Dependency Changes

| Package | Action | Why |
|---------|--------|-----|
| `react-window` | Add | Table virtualization |

No other new dependencies. No backend. No database.

---

## Files Modified

| File | Change |
|------|--------|
| `tools/generate.mjs` | Output per-shipment detail files to `public/details/`, bump to 1000 shipments |
| `src/data/index.js` | Replace bulk import with `fetch()`-based per-shipment loader + cache. Add index builders. |
| `src/App.jsx` | Async detail loading, pre-computed metrics, filter index usage |
| `src/components/shipments/ShipmentTable.jsx` | Replace `<table>` with `react-window` `FixedSizeList` + flex row layout |
| `src/components/shipments/MonitorPanels.jsx` | Wrap in `React.memo` |
| `src/components/shipments/ShipmentTabs.jsx` | Wrap in `React.memo` |
| `src/components/shipments/TableControls.jsx` | Wrap in `React.memo` |
| `src/components/layout/Navbar.jsx` | Wrap in `React.memo` |
| `src/components/layout/Sidebar.jsx` | Wrap in `React.memo` |
| Detail tabs (OrderTab, StopsTab, etc.) | Wrap each in `React.memo` |
| `package.json` | Add `react-window` |

## Files Created

| File | Purpose |
|------|---------|
| `public/details/<id>.json` (x1000) | Per-shipment detail data |

## Files Removed

| File | Why |
|------|-----|
| `src/data/shipment-details.json` | Replaced by 1000 individual files in `public/details/` |

---

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| DOM nodes in table | 700-1000 rows | ~20 visible rows |
| Detail data loaded per click | 21 MB (all) | ~30 KB (one) |
| Memory at peak | ~35 MB | ~5 MB + cache |
| Filter computation (panel+tab) | O(n) x2 | O(1) lookup |
| Metrics computation | 10 filter passes | Pre-computed counts |
| Components re-rendering on selection | Entire tree | Only changed components |
| Scroll performance | Jank at 700+ | Smooth at 10,000+ |

---

## Out of Scope
- Backend/database (not needed for this data volume)
- Server-side filtering/pagination (client-side is sufficient at 1000)
- Web Workers for filtering (overkill — indexed lookups are fast enough)
- React state library migration (useState/useMemo sufficient after memoization)
