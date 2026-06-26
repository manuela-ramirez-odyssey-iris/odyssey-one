# DataTable Extensibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two opt-in capabilities to the normalized `DataTable` — column **resize** (TanStack `columnSizing` + edge grips) and **per-cell click** (`onCellClick(cell,row)`, suppressed on interactive cells) — prove reorder/visibility already work, declare TanStack as a peer dependency on the Angular side, and ship a Cognizant usage guide.

**Architecture:** React canonical first (`packages/ui/DataTable.jsx` + demo), GATE, then the Angular twin via `/port-to-angular` (which also adds the `@tanstack/angular-table` peer dep, a real-TanStack demo, and the usage guide). The shell keeps its **structural interface** (no `@tanstack` type coupling). Resize is engine-state (TanStack) + grip presentation (us); cell-click is pure presentation with runtime interactive-element detection.

**Tech Stack:** React 18 + `@tanstack/react-table` v8 (canonical), Vitest + jsdom; Angular 17 + `@tanstack/angular-table` (twin), Karma/Jasmine.

**Spec:** `docs/superpowers/specs/2026-06-26-datatable-extensibility-design.md`

---

## File structure (React canonical)

- `packages/ui/src/DataTable.jsx` — **Modify.** Add `isInteractiveTarget` (exported helper), extend `getColWidths` with a `sizes` arg, add `onCellClick` prop + `<td>` click handling, render resize grips wired to `header.getResizeHandler()`, compute per-column `sizes` from `columnSizing`/`columnDef.size`.
- `packages/ui/src/DataTable.test.jsx` — **Modify.** Add unit tests for `isInteractiveTarget`, the `sizes`-aware `getColWidths`.
- `apps/odyssey-one/src/styles/components.css` — **Modify.** Add `.odyssey-data-table__resize-grip` + the cell-clickable pointer rule.
- `apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx` — **Modify.** Enable `enableColumnResizing` on the table, add reorder/visibility demo buttons, wire `onCellClick`.

---

## Task 1: `isInteractiveTarget` helper (cell-click suppression)

**Files:**
- Modify: `packages/ui/src/DataTable.jsx`
- Test: `packages/ui/src/DataTable.test.jsx`

- [ ] **Step 1: Write the failing tests**

Add to `packages/ui/src/DataTable.test.jsx`:

```jsx
import { isInteractiveTarget } from './DataTable.jsx'

describe('isInteractiveTarget', () => {
  // helper: build a <td> with the given innerHTML and return [cell, target]
  const cellWith = (html, targetSelector) => {
    const cell = document.createElement('td')
    cell.innerHTML = html
    const target = targetSelector ? cell.querySelector(targetSelector) : cell
    return [cell, target]
  }

  it('is false for a plain text cell (click should fire onCellClick)', () => {
    const [cell, target] = cellWith('<span>Atlanta</span>', 'span')
    expect(isInteractiveTarget(target, cell)).toBe(false)
  })
  it('is true when the target is a button (ActionMenu trigger)', () => {
    const [cell, target] = cellWith('<button type="button">⋮</button>', 'button')
    expect(isInteractiveTarget(target, cell)).toBe(true)
  })
  it('is true for a checkbox input', () => {
    const [cell, target] = cellWith('<input type="checkbox" />', 'input')
    expect(isInteractiveTarget(target, cell)).toBe(true)
  })
  it('is true for an anchor with href (link cell)', () => {
    const [cell, target] = cellWith('<a href="/x">open</a>', 'a')
    expect(isInteractiveTarget(target, cell)).toBe(true)
  })
  it('is true for a custom clickable marked [data-no-cell-click]', () => {
    const [cell, target] = cellWith('<span data-no-cell-click><i>x</i></span>', 'i')
    expect(isInteractiveTarget(target, cell)).toBe(true)
  })
  it('is true for [role="menuitem"] (open DropdownMenu rows)', () => {
    const [cell, target] = cellWith('<div role="menuitem">View</div>', 'div')
    expect(isInteractiveTarget(target, cell)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one && npx vitest run packages/ui/src/DataTable.test.jsx -t isInteractiveTarget`
Expected: FAIL — `isInteractiveTarget is not a function` (not exported yet).

- [ ] **Step 3: Implement `isInteractiveTarget`**

Add near the top of `packages/ui/src/DataTable.jsx` (after the imports, before `getColWidths`):

```jsx
/** Selector for elements that "own" a click — a cell containing one of these is an
 *  interactive cell, so onCellClick is suppressed for it. `[data-no-cell-click]` is the
 *  escape hatch for custom clickable components (e.g. a ButtonLink). */
const INTERACTIVE_SELECTOR =
  'button, a[href], input, select, textarea, label, [role="button"], [role="menuitem"], [role="link"], [contenteditable="true"], [data-no-cell-click]'

/** True when a cell click originated inside an interactive/clickable element within the cell. */
export function isInteractiveTarget(target, cellEl) {
  if (!(target instanceof Element) || !cellEl) return false
  const hit = target.closest(INTERACTIVE_SELECTOR)
  return hit != null && cellEl.contains(hit)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/ui/src/DataTable.test.jsx -t isInteractiveTarget`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/DataTable.jsx packages/ui/src/DataTable.test.jsx
git commit -m "feat(datatable): isInteractiveTarget — cell-click suppression helper"
```

---

## Task 2: `getColWidths` honors TanStack sizes

**Files:**
- Modify: `packages/ui/src/DataTable.jsx`
- Test: `packages/ui/src/DataTable.test.jsx`

- [ ] **Step 1: Write the failing tests**

Add to the existing `describe('getColWidths', …)` block in `DataTable.test.jsx`:

```jsx
  it('uses the provided size for a sized column and excludes it from flex', () => {
    // col 0 sized=120 (user-dragged); cols 1,2 auto + flex.
    // measured maxes: [50,100,50]; container 320 → slack 320-(120+100+50)=50 over the 2 flex cols → +25 each
    expect(getColWidths([50, 100, 50], [0, 0, 0], 320, [false, true, true], [120, null, null]))
      .toEqual([120, 125, 75])
  })
  it('a sized column is never widened by flex even if flagged flex', () => {
    // widths=[80(sized), 50]; total 130; container 400 → slack 270 to the one flex+unsized col → 50+270
    expect(getColWidths([50, 50], [0, 0], 400, [true, true], [80, null]))
      .toEqual([80, 320])
  })
  it('ignores sizes when none are provided (back-compat)', () => {
    expect(getColWidths([50, 100, 50], [0, 0, 0], 260, [false, true, true]))
      .toEqual([50, 130, 80])
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/ui/src/DataTable.test.jsx -t getColWidths`
Expected: FAIL — the new cases error (extra arg ignored; flex distributed into the sized column).

- [ ] **Step 3: Extend `getColWidths` with a `sizes` arg**

Replace the existing `getColWidths` in `DataTable.jsx` with:

```jsx
/**
 * Per-column locked widths. A column with a non-null `sizes[i]` is "sized" (user-dragged
 * via TanStack columnSizing, or an explicit columnDef.size) — it uses that width verbatim and
 * is excluded from flex distribution. Every other column is max(header, firstRow) and shares
 * leftover container width if its flexFlag is true (Refinement R1: flex membership by flag).
 */
export function getColWidths(headerWidths, bodyWidths, containerWidth, flexFlags, sizes = []) {
  const widths = headerWidths.map((hw, i) =>
    sizes[i] != null ? Math.ceil(sizes[i]) : Math.ceil(Math.max(hw, bodyWidths[i] ?? 0))
  )
  const total = widths.reduce((a, b) => a + b, 0)
  if (total < containerWidth) {
    const flexIdxs = widths.map((_, i) => i).filter((i) => flexFlags[i] && sizes[i] == null)
    if (flexIdxs.length) {
      const extra = Math.floor((containerWidth - total) / flexIdxs.length)
      flexIdxs.forEach((i) => { widths[i] += extra })
    }
  }
  return widths
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/ui/src/DataTable.test.jsx -t getColWidths`
Expected: PASS (all existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/DataTable.jsx packages/ui/src/DataTable.test.jsx
git commit -m "feat(datatable): getColWidths honors TanStack column sizes"
```

---

## Task 3: Wire `onCellClick` into the component

**Files:**
- Modify: `packages/ui/src/DataTable.jsx`

- [ ] **Step 1: Add the `onCellClick` prop + cell handler**

In `DataTable.jsx`, update the component signature and the `<td>` render.

Signature — add `onCellClick`:

```jsx
export default function DataTable({ table, stickyTop = 0, footer, ariaLabel, onCellClick, className = '' }) {
```

Root class — add a modifier when cell-click is active (drives the pointer affordance):

```jsx
    <div className={`odyssey-data-table${onCellClick ? ' odyssey-data-table--cell-clickable' : ''}${className ? ` ${className}` : ''}`}>
```

`<td>` — add the click handler (only when `onCellClick` is set):

```jsx
                  <td
                    key={cell.id}
                    className={cellClassName(meta, meta?.sticky === 'right')}
                    onClick={onCellClick
                      ? (e) => { if (!isInteractiveTarget(e.target, e.currentTarget)) onCellClick(cell, row) }
                      : undefined}
                  >
                    {renderCell(cell.column.columnDef.cell, cell.getContext())}
                  </td>
```

- [ ] **Step 2: Manual verification note**

This is wired-by-inspection (a DOM-interaction handler); it is exercised end-to-end in the demo (Task 7) and the Angular twin's spec. No new unit test here beyond Task 1's helper (which is the suppression logic).

- [ ] **Step 3: Build to verify no errors**

Run: `npm run build:odyssey-one`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/DataTable.jsx
git commit -m "feat(datatable): onCellClick prop with interactive-cell suppression"
```

---

## Task 4: Render resize grips + feed sizes to the colgroup

**Files:**
- Modify: `packages/ui/src/DataTable.jsx`

- [ ] **Step 1: Compute per-column `sizes` and pass to `getColWidths`**

In the measure effect, after computing `flexFlags`, add the `sizes` array and pass it:

```jsx
    const leafCols = table.getVisibleLeafColumns()
    const flexFlags = leafCols.map((c) => !c.columnDef.meta?.fixedWidth)
    const sizing = table.getState().columnSizing ?? {}
    const sizes = leafCols.map((c) =>
      sizing[c.id] != null || c.columnDef.size != null ? c.getSize() : null
    )
    setColWidths(getColWidths(headerWidths, bodyWidths, container, flexFlags, sizes))
```

Also re-measure when sizing changes — extend the columnSignature to include sizing, so a resize re-locks widths. Replace the `columnSignature` line:

```jsx
  const columnSignature =
    table.getVisibleLeafColumns().map((c) => c.id).join('|') +
    '::' + JSON.stringify(table.getState().columnSizing ?? {})
```

- [ ] **Step 2: Render the resize grip in each `<th>`**

In the `<th>` render, after `{renderCell(header.column.columnDef.header, header.getContext())}`, add the grip:

```jsx
                        {header.column.getCanResize() && (
                          <span
                            className={`odyssey-data-table__resize-grip${header.column.getIsResizing() ? ' is-resizing' : ''}`}
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            onClick={(e) => e.stopPropagation()}
                            role="separator"
                            aria-orientation="vertical"
                            aria-label={`Resize ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.column.id}`}
                          />
                        )}
```

> The `<th>` needs `position: relative` for the grip to anchor — handled in Task 5's CSS.

- [ ] **Step 3: Build to verify no errors**

Run: `npm run build:odyssey-one`
Expected: build succeeds (note: `getCanResize`/`getResizeHandler`/`getIsResizing` exist on a real TanStack table; the demo enables them in Task 7).

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/DataTable.jsx
git commit -m "feat(datatable): resize grips wired to TanStack getResizeHandler + sizes in colgroup"
```

---

## Task 5: Resize grip + cell-clickable CSS

**Files:**
- Modify: `apps/odyssey-one/src/styles/components.css`

- [ ] **Step 1: Add the CSS**

In the `.odyssey-data-table` block area of `components.css`, add:

```css
/* Header cells anchor the resize grip. */
.odyssey-data-table .odyssey-table th { position: relative; }

/* Resize grip — a thin hit-area on the header's right edge. */
.odyssey-data-table__resize-grip {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  user-select: none;
  touch-action: none;
}
.odyssey-data-table__resize-grip::after {
  content: '';
  position: absolute;
  top: 25%;
  right: 3px;
  width: 1px;
  height: 50%;
  background: var(--border-subtle);
  transition: background var(--transition-fast);
}
.odyssey-data-table__resize-grip:hover::after,
.odyssey-data-table__resize-grip.is-resizing::after {
  background: var(--deep-sea-neutral-500);
}

/* Cell-clickable affordance — pointer on body cells when onCellClick is wired. */
.odyssey-data-table--cell-clickable tbody td { cursor: pointer; }
```

- [ ] **Step 2: Build to verify**

Run: `npm run build:odyssey-one`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/styles/components.css
git commit -m "feat(datatable): resize grip + cell-clickable cursor styles"
```

---

## Task 6: Demo — resize enabled, reorder/visibility proof, cell-click

**Files:**
- Modify: `apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx`

- [ ] **Step 1: Enable resizing + sizing/order/visibility state on the table**

In `LiveDataTable`, add state + table options:

```jsx
  const [columnOrder, setColumnOrder] = useState([])
  const [columnVisibility, setColumnVisibility] = useState({})
  const [columnSizing, setColumnSizing] = useState({})
  const table = useReactTable({
    data: DATA,
    columns: COLUMNS,
    state: { rowSelection, pagination, columnOrder, columnVisibility, columnSizing },
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
```

- [ ] **Step 2: Wire `onCellClick` + the reorder/visibility proof buttons**

Render above the table:

```jsx
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-3)' }}>
        {/* Throwaway proof controls — NOT the RightPanel (a separate Figma-first arc). */}
        <button type="button" onClick={() => table.setColumnOrder(
          table.getState().columnOrder.length
            ? []
            : ['action', 'status', 'commodity', 'weight', 'destination', 'origin', 'name', 'select']
        )}>Toggle reverse order</button>
        <button type="button" onClick={() => table.getColumn('commodity').toggleVisibility()}>
          Toggle Commodity column
        </button>
      </div>
```

And pass `onCellClick` to the `<DataTable>`:

```jsx
    <DataTable
      table={table}
      ariaLabel="Sample data"
      onCellClick={(cell, row) => console.log('cell click', cell.column.id, row.original.name)}
      footer={<Paginator table={table} pageSizeOptions={[10, 25, 50]} />}
    />
```

- [ ] **Step 2b: Mark the demo's link/badge cells if any are clickable**

The Status cell is a `Badge` (non-interactive → cell-click fires, correct). If any demo cell renders a `ButtonLink`/custom clickable, add `data-no-cell-click` to its wrapper. (Current demo: only the select Checkbox + the ActionMenu are interactive — both auto-detected. No change needed unless you add a link column.)

- [ ] **Step 3: Run the app and verify by hand**

Run: `npm run dev:odyssey-one`, open `/design-system` → DataTable.
Verify: (a) dragging a header's right edge resizes that column; (b) "Toggle Commodity column" removes/re-adds it and widths re-lock; (c) "Toggle reverse order" reorders columns; (d) clicking a plain cell logs `cell click …`; clicking the ActionMenu or a checkbox does **not** log.

- [ ] **Step 4: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx
git commit -m "feat(datatable): demo — column resize, reorder/visibility proof, onCellClick"
```

---

## Task 7: React GATE (checkpoint)

- [ ] **Step 1: Full React verification**

Run: `npx vitest run packages/ui/src/DataTable.test.jsx` → all green.
Run: `npm run build:odyssey-one` → succeeds.

- [ ] **Step 2: Present to the user for the React GATE**

Demo the resize + reorder/visibility + cell-click at `/design-system`. **Do not start the Angular port until the user approves the React canonical** (token-economy gate — Angular is generated against a frozen, approved React spec).

---

## Task 8 (Angular phase): Port via `/port-to-angular` + Angular-specific additions

> After the React GATE, run the `/port-to-angular DataTable` routine (`playground/angular-port-routine.md`). The routine handles the faithful twin + two-window Δ=0 review + Phase-3 verification. The following are the **Angular-specific additions** this arc requires, to be done within that port:

- [ ] **Step 1: Mirror the React changes in `odyssey-data-table`**
  - `isInteractiveTarget` → a component method (or a small util), same selector.
  - `getColWidths` `sizes` arg → mirror in `data-table.utils.ts` + its spec (port Task 2's tests).
  - `@Output() cellClick = new EventEmitter<{ cell, row }>()` + the `<td>` `(click)` handler with suppression + the `.odyssey-data-table--cell-clickable` host modifier when a `cellClick` listener is bound (detect via `@Output`/a `[cellClickable]` flag if listener-detection is awkward — note in the port).
  - Resize grips in the `<th>` wired to `header.getResizeHandler()` (mousedown/touchstart); `getCanResize`/`getIsResizing` added to the structural interface (`data-table.types.ts`).
  - Re-measure on a columnSizing-inclusive signature (mirror Task 4).

- [ ] **Step 2: Add the `@tanstack/angular-table` peer dependency**
  - `projects/odyssey-ui/package.json` → add `@tanstack/angular-table` to `peerDependencies` with a pinned range; add to `ng-package.json` `allowedNonPeerDependencies` if ng-packagr flags it.
  - dsm-explorer app: add `@tanstack/angular-table` as a devDependency.

- [ ] **Step 3: Replace the demo mock with a real TanStack table**
  - `src/app/demos/data-table.demo.component.ts` → drop `DataTableMock`; build a real `createAngularTable(...)` instance with `enableColumnResizing`, `columnResizeMode: 'onChange'`, selection + pagination + columnOrder/visibility/sizing state. Cell renderers stay as the demo's TemplateRefs (the flex-render directive already supports them).
  - This removes the hand-rolled memoization (real TanStack memoizes); keep the `trackBy`s (still correct).

- [ ] **Step 4: Port the CSS** (resize grip + cell-clickable) into the global `_table.scss`.

- [ ] **Step 5: Write the Cognizant usage guide**
  - Create `projects/odyssey-ui/src/lib/data-table/DataTable.usage.md` per spec §"Cognizant usage guide": install (TanStack comes via peer), create the table + enable features, column-def example, the opt-ins (resize, `(cellClick)` + the `[data-no-cell-click]` convention, reorder/visibility via `setColumnOrder`/`setColumnVisibility`), and the structural-contract note.

- [ ] **Step 6: Phase 3 verify + two-window GATE B** (per the routine; Δ=0 vs React).

- [ ] **Step 7: Phase 5 promote** — clear `normalizing` flags, tracker, `domain-usage`, version stamp.

---

## Out of scope (do not build here)
- The **RightPanel** (reorder/add-remove UI) — separate Figma-first normalization.
- Resize **persistence** (consumer state).
- Whole-**row** click; `Table<TData>` typing / Paginator retyping (Option 1, rejected).
