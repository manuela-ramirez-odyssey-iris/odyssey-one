# DataTable Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the Orders table's chrome + scroll behavior into a thin, reusable `@odyssey/ui` `DataTable` molecule, then refactor `OrdersTable` to consume it and wire the `@odyssey/ui` `Paginator` (retiring the app-local `OrdersTablePagination`), with zero visual/behavioral change (Δ=0).

**Architecture:** `DataTable` is presentation-only and driven by a TanStack v8 table instance (duck-typed structural interface — the library takes **no** `@tanstack` dependency; `flexRender` is inlined). It renders the split sticky header + two-pass colgroup width-lock + horizontal scroll-sync, applies the `.odyssey-table` Cell contract, and exposes per-column behavior through TanStack `column.meta` (`cellClass`, `headClass`, `sticky:'right'`, `fixedWidth`). The consumer owns columns/data/state. Source spec: `docs/superpowers/specs/2026-06-25-datatable-shell-design.md`.

**Tech Stack:** React 19, `@tanstack/react-table` v8 (app-side only), Vitest (node env), the `@odyssey/ui` workspace package, CSS custom-property design tokens.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/ui/src/DataTable.jsx` (new) | The shell component + 4 exported pure helpers (`getColWidths`, `renderCell`, `cellClassName`, `headClassName`). |
| `packages/ui/src/DataTable.test.jsx` (new) | Node-env TDD of the 4 pure helpers. |
| `packages/ui/src/index.js` (edit) | Export `DataTable` in the Molecules group. |
| `apps/odyssey-one/vite.config.js` (edit) | Extend test `include` to scan `packages/ui/src`. |
| `apps/odyssey-one/src/styles/components.css` (edit) | New global `.odyssey-data-table*` chrome contract + `.odyssey-table__cell--sticky-right`. |
| `apps/odyssey-one/src/components/orders/orders.css` (edit) | Drop the table-chrome rules (now generic); keep toolbar / row-menu / page-status. |
| `apps/odyssey-one/src/components/orders/OrdersTable.jsx` (rewrite) | Orders-specific config of `DataTable`: column defs + table instance + toolbar-measured `stickyTop` + `<Paginator>` footer. |
| `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx` (edit) | Pagination state moves onto the table instance (`{pageIndex,pageSize}`, `rowCount` from server). |
| `apps/odyssey-one/src/components/orders/OrdersTablePagination.jsx` (delete) | Replaced by `@odyssey/ui` `Paginator`. |
| `apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx` (new) | DSM demo (auto-collected) exercising scroll + sticky + footer. |
| `playground/normalization-tracker.md` (edit) | Mark DataTable in-progress (React shell done; Angular + Figma pending). |

---

## Task 1: Record the Δ=0 invariants (GATE baseline)

No code change — capture the exact behavior the refactor must preserve, so Task 10 has concrete targets.

**Files:** none (reference only).

- [ ] **Step 1: Confirm the app builds on the current `main` before touching anything**

Run: `npm run build:odyssey-one`
Expected: build succeeds (this is the known-good baseline).

- [ ] **Step 2: Run the app and capture the Orders baseline**

Run: `npm run dev:odyssey-one`, open `http://localhost:5173/orders`.
Capture a screenshot to `/tmp/dsm-measure/datatable-baseline/orders.png`. Note these behaviors visually: (a) horizontal scroll moves the header in lockstep with the body; (b) the header strip parks directly under the sticky toolbar; (c) the **Action** column stays pinned to the right edge with a left shadow during horizontal scroll; (d) the pagination footer stays at the left while scrolling horizontally.

- [ ] **Step 3: Record the chrome computed-style invariants**

These come from `apps/odyssey-one/src/components/orders/orders.css` and must hold identically after the refactor (selectors will be renamed; the *resolved* values must not change):

| Element (post-refactor selector) | Invariant |
| --- | --- |
| `.odyssey-data-table` (was `.orders-table-card`) | `background: var(--bg-primary)`; `border-radius: var(--radius-2xl)` (16px); `overflow: clip` |
| `.odyssey-data-table__head` (was `.orders-table-head`) | `position: sticky`; `z-index: 3`; `background: var(--bg-secondary)` |
| `.odyssey-data-table__head-inner` (was `.orders-table-head__inner`) | `overflow: hidden`; `border-radius: 16px 16px 0 0`; `background: var(--bg-primary)` |
| `.odyssey-data-table__body` (was `.orders-table-wrap`) | `overflow-x: auto`; `overscroll-behavior-x: none`; `background: var(--bg-primary)` |
| `.odyssey-table__cell--sticky-right` (was `.orders-table__cell--action`) | `position: sticky`; `right: 0`; `z-index: 1`; `text-align: center`; `box-shadow: -2px 0 4px rgba(0,0,0,0.06)` |
| `.odyssey-data-table__footer` (was `.orders-pagination` positioning) | `position: sticky`; `left: 0`; `border-top: 1px solid var(--border-subtle)` |

No commit (reference task).

---

## Task 2: Make Vitest scan the library

The app's vitest only scans `apps/odyssey-one/src`. Extend it so `packages/ui` logic is testable (the library's first unit tests).

**Files:**
- Modify: `apps/odyssey-one/vite.config.js:50`

- [ ] **Step 1: Read the current test config**

Run: `sed -n '45,53p' apps/odyssey-one/vite.config.js`
Expected: an `include: ['src/**/*.test.{js,jsx,ts,tsx}']` line inside the `test:` block.

- [ ] **Step 2: Extend the include glob**

Change the `include` line to also pick up library tests (path is relative to the vite root `apps/odyssey-one`):

```js
      include: [
        'src/**/*.test.{js,jsx,ts,tsx}',
        '../../packages/ui/src/**/*.test.{js,jsx}',
      ],
```

- [ ] **Step 3: Verify the suite still passes (no new tests yet)**

Run: `cd apps/odyssey-one && npm test`
Expected: PASS — same green count as before; the wider glob matches no library tests yet, so nothing breaks.

- [ ] **Step 4: Commit**

```bash
git add apps/odyssey-one/vite.config.js
git commit -m "test(ui): vitest scans packages/ui/src so library logic is testable"
```

---

## Task 3: `getColWidths` — width lock + R1 flex distribution (TDD)

The pure core of the two-pass measure: per column take `max(headerWidth, bodyWidth)`, then distribute any leftover container width to **flex** columns — selected by a `flexFlags` boolean array, **not** by index (Refinement R1, so reorder/resize never break it).

**Files:**
- Create: `packages/ui/src/DataTable.jsx`
- Create: `packages/ui/src/DataTable.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/DataTable.test.jsx`:

```jsx
import { getColWidths } from './DataTable.jsx'

describe('getColWidths', () => {
  it('takes the per-column max of header vs first-row width and rounds up', () => {
    // container small enough that no slack is distributed
    expect(getColWidths([40, 100, 30], [48, 90, 35.2], 0, [false, true, false]))
      .toEqual([48, 100, 36])
  })

  it('distributes leftover container width evenly to flex columns only', () => {
    // widths = [50, 100, 50] = 200 total; container 260 → 60 slack;
    // flex = columns 1 and 2 → +30 each; column 0 (fixed) untouched
    expect(getColWidths([50, 100, 50], [0, 0, 0], 260, [false, true, true]))
      .toEqual([50, 130, 80])
  })

  it('floors the per-column slack (no fractional pixels)', () => {
    // 200 total, container 255 → 55 slack across 2 flex cols → floor(27.5)=27 each
    expect(getColWidths([50, 100, 50], [0, 0, 0], 255, [false, true, true]))
      .toEqual([50, 127, 77])
  })

  it('distributes nothing when there are no flex columns (avoids /0)', () => {
    expect(getColWidths([50, 100, 50], [0, 0, 0], 999, [false, false, false]))
      .toEqual([50, 100, 50])
  })

  it('distributes nothing when content already exceeds the container', () => {
    expect(getColWidths([200, 200], [0, 0], 100, [true, true]))
      .toEqual([200, 200])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/odyssey-one && npx vitest run ../../packages/ui/src/DataTable.test.jsx`
Expected: FAIL — `Failed to resolve import './DataTable.jsx'` (the module does not exist yet).

- [ ] **Step 3: Create `DataTable.jsx` with the helper**

Create `packages/ui/src/DataTable.jsx`:

```jsx
/**
 * DataTable — a thin presentation shell for a TanStack v8 table. It owns the
 * table chrome (split sticky header + colgroup width-lock + horizontal
 * scroll-sync) and applies the normalized `.odyssey-table` Cell contract.
 * Driven by a duck-typed `table` instance — this package takes NO @tanstack
 * dependency. The consumer owns columns / data / state. See the design spec
 * 2026-06-25-datatable-shell-design.md.
 */

/**
 * Per-column locked widths: max(header, body) per column, then any leftover
 * container width is split evenly among the FLEX columns (flexFlags[i] === true).
 * Flex membership is by flag, not by position — so column reorder/resize never
 * mis-targets the distribution (Refinement R1).
 */
export function getColWidths(headerWidths, bodyWidths, containerWidth, flexFlags) {
  const widths = headerWidths.map((hw, i) =>
    Math.ceil(Math.max(hw, bodyWidths[i] ?? 0))
  )
  const total = widths.reduce((a, b) => a + b, 0)
  if (total < containerWidth) {
    const flexIdxs = widths.map((_, i) => i).filter((i) => flexFlags[i])
    if (flexIdxs.length) {
      const extra = Math.floor((containerWidth - total) / flexIdxs.length)
      flexIdxs.forEach((i) => { widths[i] += extra })
    }
  }
  return widths
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/odyssey-one && npx vitest run ../../packages/ui/src/DataTable.test.jsx`
Expected: PASS — 5 assertions green.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/DataTable.jsx packages/ui/src/DataTable.test.jsx
git commit -m "feat(ui): DataTable getColWidths — width lock + flex distribution by meta (R1)"
```

---

## Task 4: `renderCell`, `cellClassName`, `headClassName` (TDD)

`renderCell` is the inlined `flexRender` (so the library imports nothing from `@tanstack`). The class helpers compose the Cell-contract classes, defaults, and the sticky-right modifier.

**Files:**
- Modify: `packages/ui/src/DataTable.jsx`
- Modify: `packages/ui/src/DataTable.test.jsx`

- [ ] **Step 1: Add the failing tests**

Append to `packages/ui/src/DataTable.test.jsx`:

```jsx
import { renderCell, cellClassName, headClassName } from './DataTable.jsx'

describe('renderCell (inlined flexRender)', () => {
  it('calls a function renderer with the context', () => {
    expect(renderCell((ctx) => ctx.value, { value: 'Jane' })).toBe('Jane')
  })
  it('returns a non-function renderer as-is (e.g. a header string)', () => {
    expect(renderCell('ID', {})).toBe('ID')
  })
  it('returns null for a nullish renderer', () => {
    expect(renderCell(undefined, {})).toBeNull()
    expect(renderCell(null, {})).toBeNull()
  })
})

describe('headClassName', () => {
  it('defaults to the semibold label utility', () => {
    expect(headClassName(undefined, false)).toBe('text-label-sm-semibold')
  })
  it('appends meta.headClass and the sticky-right modifier', () => {
    expect(headClassName({ headClass: 'odyssey-table__cell--control' }, true))
      .toBe('text-label-sm-semibold odyssey-table__cell--control odyssey-table__cell--sticky-right')
  })
})

describe('cellClassName', () => {
  it('defaults to the regular label utility', () => {
    expect(cellClassName(undefined, false)).toBe('text-label-sm-regular')
  })
  it('uses meta.cellClass when present and adds the sticky-right modifier', () => {
    expect(cellClassName({ cellClass: 'odyssey-table__cell--title text-label-sm-medium' }, true))
      .toBe('odyssey-table__cell--title text-label-sm-medium odyssey-table__cell--sticky-right')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/odyssey-one && npx vitest run ../../packages/ui/src/DataTable.test.jsx`
Expected: FAIL — `renderCell`, `cellClassName`, `headClassName` are not exported.

- [ ] **Step 3: Add the helpers to `DataTable.jsx`**

Add below `getColWidths` in `packages/ui/src/DataTable.jsx`:

```jsx
/** Inlined flexRender: call a function renderer with its context, else return
 *  the value (a plain header string, a number, etc.). Nullish → null. Keeps the
 *  library free of any @tanstack import. */
export function renderCell(renderer, context) {
  if (renderer == null) return null
  return typeof renderer === 'function' ? renderer(context) : renderer
}

/** `<th>` classes: semibold label + optional meta.headClass + sticky-right. */
export function headClassName(meta, isStickyRight) {
  return [
    'text-label-sm-semibold',
    meta?.headClass,
    isStickyRight && 'odyssey-table__cell--sticky-right',
  ].filter(Boolean).join(' ')
}

/** `<td>` classes: meta.cellClass (or the regular-label default) + sticky-right. */
export function cellClassName(meta, isStickyRight) {
  return [
    meta?.cellClass ?? 'text-label-sm-regular',
    isStickyRight && 'odyssey-table__cell--sticky-right',
  ].filter(Boolean).join(' ')
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/odyssey-one && npx vitest run ../../packages/ui/src/DataTable.test.jsx`
Expected: PASS — all helper suites green.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/DataTable.jsx packages/ui/src/DataTable.test.jsx
git commit -m "feat(ui): DataTable renderCell (inlined flexRender) + cell/head class helpers"
```

---

## Task 5: DataTable chrome CSS contract

Add the generic `.odyssey-data-table*` chrome + the `.odyssey-table__cell--sticky-right` modifier to the global stylesheet, beside the existing `.odyssey-table` Cell contract. Additive — Orders keeps working off `orders.css` until Task 8.

**Files:**
- Modify: `apps/odyssey-one/src/styles/components.css` (insert after the Cell-contract block, ~line 161)

- [ ] **Step 1: Insert the chrome contract**

After the `.odyssey-table tbody tr:last-child td { border-bottom: none; }` rule (end of the Cell-contract block), insert:

```css
/* ----------------------------------------
   TABLE — DataTable shell (chrome + scroll)
   The generic chrome for the @odyssey/ui DataTable molecule: a card that
   clips both halves of a split sticky header, a body horizontal scroller, a
   sticky-right column modifier, and a sticky-left footer band. Extracted
   verbatim from the Orders table (the proven split-sticky-header pattern);
   `overflow: clip` on the card is NOT a scroll container, so the header strip
   still sticks natively against the page scroller (zero lag).
   ---------------------------------------- */
.odyssey-data-table {
  background: var(--bg-primary);
  border-radius: var(--radius-2xl);
  overflow: clip;
}

.odyssey-data-table__head {
  position: sticky;
  z-index: 3; /* above body cells incl. the sticky-right column */
  background: var(--bg-secondary);
}

.odyssey-data-table__head-inner {
  overflow: hidden;
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  background: var(--bg-primary);
}

.odyssey-data-table__body {
  overflow-x: auto;
  overscroll-behavior-x: none;
  background: var(--bg-primary);
}

/* A column pinned to the right edge (survives horizontal scroll) — applies in
   both halves of the split table (header strip + body). Set per column via
   TanStack `column.meta.sticky === 'right'`. */
.odyssey-data-table .odyssey-table__cell--sticky-right {
  position: sticky;
  right: 0;
  z-index: 1;
  text-align: center;
  box-shadow: -2px 0 4px rgba(0, 0, 0, 0.06);
}

/* Footer band (the Paginator slot): lives inside the body scroller after the
   table; sticky-left keeps it put during horizontal scroll. */
.odyssey-data-table__footer {
  position: sticky;
  left: 0;
  border-top: 1px solid var(--border-subtle);
}
```

- [ ] **Step 2: Verify the app still builds**

Run: `npm run build:odyssey-one`
Expected: build succeeds (additive CSS; nothing consumes the new classes yet).

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/styles/components.css
git commit -m "feat(ui): .odyssey-data-table chrome contract + sticky-right cell modifier"
```

---

## Task 6: Build the `DataTable` component + export it

Add the default export to `DataTable.jsx` (the helpers already exist + are tested) and export it from the package index.

**Files:**
- Modify: `packages/ui/src/DataTable.jsx`
- Modify: `packages/ui/src/index.js:45` (Molecules group)

- [ ] **Step 1: Add the React imports at the top of `DataTable.jsx`**

Insert as the first line of `packages/ui/src/DataTable.jsx` (above the file doc comment):

```jsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
```

- [ ] **Step 2: Append the component (after the helpers)**

Add to the end of `packages/ui/src/DataTable.jsx`:

```jsx
export default function DataTable({ table, stickyTop = 0, footer, ariaLabel, className = '' }) {
  const headRef = useRef(null)       // sticky strip inner (overflow hidden; scrollLeft set programmatically)
  const wrapRef = useRef(null)       // body horizontal scroller
  const headTableRef = useRef(null)
  const bodyTableRef = useRef(null)
  const [colWidths, setColWidths] = useState(null)

  const rowModel = table.getRowModel()
  // R2 — re-measure when the column set changes (add/remove/reorder), not just
  // when rows change. A by-value string keeps this stable across renders.
  const columnSignature = table.getVisibleLeafColumns().map((c) => c.id).join('|')

  // Two-pass sizing: render shrink-to-fit (colWidths null) so each column
  // reports its true content width, then lock max(header, firstRow) per column
  // into a shared <colgroup> and hand leftover space to flex columns.
  useLayoutEffect(() => { setColWidths(null) }, [rowModel.rows, columnSignature])
  useLayoutEffect(() => {
    if (colWidths) return
    const ths = headTableRef.current?.querySelectorAll('thead th')
    const tds = bodyTableRef.current?.querySelectorAll('tbody tr:first-child td')
    if (!ths?.length || !tds?.length) return
    const headerWidths = Array.from(ths).map((th) => th.getBoundingClientRect().width)
    const bodyWidths = Array.from(tds).map((td) => td.getBoundingClientRect().width)
    const container = wrapRef.current?.clientWidth ?? 0
    const flexFlags = table.getVisibleLeafColumns().map((c) => !c.columnDef.meta?.fixedWidth)
    setColWidths(getColWidths(headerWidths, bodyWidths, container, flexFlags))
  }, [colWidths, rowModel.rows, columnSignature]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure on resize (debounced).
  useEffect(() => {
    let t = 0
    const onResize = () => { clearTimeout(t); t = setTimeout(() => setColWidths(null), 150) }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t) }
  }, [])

  // Horizontal sync: the body wrap drives the header strip's scrollLeft.
  useEffect(() => {
    const wrap = wrapRef.current
    const head = headRef.current
    if (!wrap || !head) return
    const onScroll = () => { head.scrollLeft = wrap.scrollLeft }
    wrap.addEventListener('scroll', onScroll, { passive: true })
    return () => wrap.removeEventListener('scroll', onScroll)
  }, [])

  const totalWidth = colWidths ? colWidths.reduce((a, b) => a + b, 0) : 0
  const tableStyle = colWidths
    ? { tableLayout: 'fixed', width: '100%', minWidth: `${totalWidth}px` }
    : { width: 'auto' }
  const colgroup = colWidths && (
    <colgroup>
      {colWidths.map((w, i) => <col key={i} style={{ width: `${w}px` }} />)}
    </colgroup>
  )

  return (
    <div className={`odyssey-data-table${className ? ` ${className}` : ''}`}>
      <div className="odyssey-data-table__head" style={{ top: `${stickyTop}px` }}>
        <div className="odyssey-data-table__head-inner" ref={headRef}>
          <table className="odyssey-table" ref={headTableRef} style={tableStyle}>
            {colgroup}
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const meta = header.column.columnDef.meta
                    return (
                      <th key={header.id} className={headClassName(meta, meta?.sticky === 'right')}>
                        {renderCell(header.column.columnDef.header, header.getContext())}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
          </table>
        </div>
      </div>
      <div className="odyssey-data-table__body" ref={wrapRef}>
        <table className="odyssey-table" ref={bodyTableRef} style={tableStyle} aria-label={ariaLabel}>
          {colgroup}
          <tbody>
            {rowModel.rows.map((row) => (
              <tr key={row.id} data-selected={row.getIsSelected() || undefined}>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta
                  return (
                    <td key={cell.id} className={cellClassName(meta, meta?.sticky === 'right')}>
                      {renderCell(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {footer && <div className="odyssey-data-table__footer">{footer}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Export from the package index**

In `packages/ui/src/index.js`, in the Molecules group, immediately after the `Paginator` export (line 45), add:

```js
export { default as DataTable } from './DataTable.jsx';
```

- [ ] **Step 4: Verify the helper tests still pass and the app builds**

Run: `cd apps/odyssey-one && npx vitest run ../../packages/ui/src/DataTable.test.jsx && cd /Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one && npm run build:odyssey-one`
Expected: helper tests PASS; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/DataTable.jsx packages/ui/src/index.js
git commit -m "feat(ui): DataTable shell component — split sticky header + scroll-sync over TanStack"
```

---

## Task 7: DataTable DSM demo

Add an auto-collected design-system demo that exercises horizontal scroll, the sticky header, the sticky-right action column, selection, and the Paginator footer. Marked `normalizing: true` (React shell done; Angular twin + Figma retro-sync pending).

**Files:**
- Create: `apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx`

- [ ] **Step 1: Create the demo**

Create `apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx`:

```jsx
import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table'
import { DataTable, Paginator, Checkbox, Badge, Button } from '@odyssey/ui'

export const meta = {
  name: 'DataTable',
  tier: 'molecule',
  version: '0.3.0',
  // React shell built S66; Angular twin + Figma retro-sync pending → clears at the full-cycle GATE.
  normalizing: true,
}

export const props = [
  { name: 'table', type: 'Table (TanStack v8)', desc: 'A TanStack table instance — duck-typed (the library takes no TanStack dependency). The shell renders headers/rows from it; the consumer owns columns, data, and state.' },
  { name: 'stickyTop', type: 'number', desc: 'Px offset where the sticky header parks (the consumer measures its own toolbar/header). Default 0.' },
  { name: 'footer', type: 'ReactNode', desc: 'Rendered in a sticky-left footer band below the body — put a <Paginator table={table}/> here.' },
  { name: 'ariaLabel', type: 'string', desc: 'Optional aria-label on the data table.' },
  { name: 'className', type: 'string', desc: 'Merged onto the root.' },
]

export const tokens = [
  { token: '--radius-2xl', resolves: '16px', usage: 'card radius + the header strip top corners' },
  { token: '--bg-primary', resolves: 'White', usage: 'card / header-inner / body background' },
  { token: '--bg-secondary', resolves: 'Deep Sea Neutral/50', usage: 'sticky header strip background' },
  { token: '--border-subtle', resolves: 'Deep Sea Neutral/200', usage: 'footer top border' },
]

// Per-column behavior is set on the consumer's TanStack column.meta:
//   cellClass / headClass → Cell contract classes
//   sticky: 'right'       → pinned action column
//   fixedWidth: true      → excluded from flex-width distribution (stays snug)

const columnHelper = createColumnHelper()
const COLUMNS = [
  columnHelper.display({
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        indeterminate={table.getIsSomeRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
        showLabel={false}
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        showLabel={false}
        aria-label={`Select ${row.original.name}`}
      />
    ),
    meta: { headClass: 'odyssey-table__cell--control', cellClass: 'odyssey-table__cell--control', fixedWidth: true },
  }),
  columnHelper.accessor('name', {
    header: 'Customer',
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  columnHelper.accessor('origin', { header: 'Origin' }),
  columnHelper.accessor('destination', { header: 'Destination' }),
  columnHelper.accessor('weight', { header: 'Weight' }),
  columnHelper.accessor('commodity', { header: 'Commodity' }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={info.getValue() === 'Active' ? 'green' : 'gray'}>{info.getValue()}</Badge>,
  }),
  columnHelper.display({
    id: 'action',
    header: 'Action',
    cell: () => <Button variant="link">View</Button>,
    meta: { sticky: 'right', fixedWidth: true },
  }),
]

const CITIES = ['Atlanta', 'Dallas', 'Chicago', 'Denver', 'Newark', 'Seattle', 'Miami', 'Phoenix']
const GOODS = ['Electronics', 'Produce', 'Steel Coil', 'Apparel', 'Auto Parts']
const DATA = Array.from({ length: 32 }, (_, i) => ({
  id: String(i + 1),
  name: `Customer ${String.fromCharCode(65 + (i % 26))}${i}`,
  origin: CITIES[i % CITIES.length],
  destination: CITIES[(i + 3) % CITIES.length],
  weight: `${(i + 1) * 120} lb`,
  commodity: GOODS[i % GOODS.length],
  status: i % 4 === 0 ? 'Draft' : 'Active',
}))

function LiveDataTable() {
  const [rowSelection, setRowSelection] = useState({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const table = useReactTable({
    data: DATA,
    columns: COLUMNS,
    state: { rowSelection, pagination },
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  return (
    <DataTable
      table={table}
      ariaLabel="Sample data"
      footer={<Paginator table={table} pageSizeOptions={[10, 25, 50]} />}
    />
  )
}

export default function DataTableDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Thin chrome over a <code>@tanstack/react-table</code> instance: split sticky header,
        colgroup width-lock, horizontal scroll-sync, a <strong>sticky-right</strong> action column
        (<code>meta.sticky:'right'</code>), and a <strong>Paginator</strong> footer. The consumer
        owns columns / data / state. Scroll the table horizontally — the header tracks the body and
        the Action column stays pinned.
      </p>
      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Live — selection · sticky action · pagination</h4>
        <div style={{ resize: 'horizontal', overflow: 'hidden', maxWidth: '100%', width: 720, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-2xl)' }}>
          <LiveDataTable />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the demo collects and renders**

Run: `npm run dev:odyssey-one`, open `http://localhost:5173/design-system`, select **DataTable** (it appears in the Normalize tab, no NORMALIZED pill). Confirm: rows render, the **Status** column shows Badges, selecting the header checkbox toggles all, paging works, and scrolling the container horizontally keeps the **Action** column pinned right and the header tracking the body.

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx
git commit -m "feat(dsm): DataTable demo (Normalize tab) — live TanStack table + Paginator footer"
```

---

## Task 8: Refactor `OrdersTable` to consume `DataTable` + trim `orders.css`

`OrdersTable` becomes the Orders-specific config of `DataTable`: column defs (action column flagged `sticky:'right'`; select + action flagged `fixedWidth`), the table instance, the toolbar-measured `stickyTop`, and the `<Paginator>` footer. The duplicated table-chrome CSS is removed from `orders.css`.

**Files:**
- Rewrite: `apps/odyssey-one/src/components/orders/OrdersTable.jsx`
- Modify: `apps/odyssey-one/src/components/orders/orders.css` (remove chrome rules)

> Pagination state is wired in Task 9 — for now `OrdersTable` accepts `pagination` / `onPaginationChange` / `totalCount` props and passes them to the table instance. `OrdersRoute` still passes the old props until Task 9, so the app may show a transient prop mismatch between commits; Task 9 closes it. Both tasks are committed, but verify the app at the end of Task 9.

- [ ] **Step 1: Rewrite `OrdersTable.jsx`**

Replace the entire contents of `apps/odyssey-one/src/components/orders/OrdersTable.jsx` with:

```jsx
import { useLayoutEffect, useState } from 'react'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { Button, Checkbox, DataTable, Paginator } from '@odyssey/ui'
import OrderRowActionMenu from './OrderRowActionMenu'

/**
 * OrdersTable — the Orders-specific configuration of the normalized DataTable
 * shell. Owns only the column defs + the TanStack instance (selection +
 * server-side pagination) + the toolbar-measured stickyTop. The shell owns the
 * chrome/scroll; the `.odyssey-table` Cell contract owns the cell skin
 * (Figma Cell set 2714:505). manualPagination/manualSorting: the table holds
 * one server-shaped page; the service does the real work. The @odyssey/ui
 * Paginator drives the page state (footer slot).
 */

const columnHelper = createColumnHelper()

const COLUMNS = [
  columnHelper.display({
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        indeterminate={table.getIsSomeRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
        showLabel={false}
        aria-label="Select all orders on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        showLabel={false}
        aria-label={`Select order ${row.original.idLabel}`}
      />
    ),
    meta: {
      headClass: 'odyssey-table__cell--control',
      cellClass: 'odyssey-table__cell--control',
      fixedWidth: true,
    },
  }),
  columnHelper.accessor('idLabel', {
    header: 'ID',
    // Link-styled. Draft rows navigate to the create-form reopen; other rows
    // stay inert until the order-detail build (spec §2).
    cell: info => (
      <Button
        variant="link"
        onClick={() => info.table.options.meta?.onRowIdClick?.(info.row.original)}
      >
        {info.getValue()}
      </Button>
    ),
  }),
  columnHelper.accessor('customer', {
    header: 'Customer',
    // Cell Variant=Title — the row's emphasis column
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  columnHelper.accessor('origin', { header: 'Origin' }),
  columnHelper.accessor('destination', { header: 'Destination' }),
  columnHelper.accessor('weight', { header: 'Weight' }),
  columnHelper.accessor('volume', { header: 'Volume' }),
  columnHelper.accessor('commodity', { header: 'Commodity' }),
  columnHelper.accessor('equipment', { header: 'Equipment' }),
  columnHelper.accessor('earlyPickup', { header: 'Early Pickup' }),
  columnHelper.display({
    id: 'action',
    header: 'Action',
    cell: () => <OrderRowActionMenu />,
    meta: { sticky: 'right', fixedWidth: true },
  }),
]

export default function OrdersTable({
  rows,
  rowSelection,
  onRowSelectionChange,
  pagination,
  onPaginationChange,
  totalCount,
  onRowIdClick,
}) {
  const [stickyTop, setStickyTop] = useState(0)

  // Anchor line = the stuck toolbar's bottom edge: its sticky `top` is negative
  // (scrolls partially away), so stuck bottom = height + top.
  useLayoutEffect(() => {
    const toolbar = document.querySelector('.orders-toolbar')
    if (!toolbar) return
    const measure = () =>
      setStickyTop(toolbar.offsetHeight + parseFloat(getComputedStyle(toolbar).top))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const table = useReactTable({
    data: rows,
    columns: COLUMNS,
    state: { rowSelection, pagination },
    onRowSelectionChange,
    onPaginationChange,
    enableRowSelection: true,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: totalCount,
    meta: { onRowIdClick },
  })

  return (
    <DataTable
      table={table}
      stickyTop={stickyTop}
      ariaLabel="Orders"
      footer={<Paginator table={table} pageSizeOptions={[20, 50, 100]} />}
    />
  )
}
```

- [ ] **Step 2: Remove the now-generic chrome rules from `orders.css`**

In `apps/odyssey-one/src/components/orders/orders.css`, delete these blocks (now provided generically by `.odyssey-data-table*` in `components.css`): the `── Table ──` section comment + `.orders-table-card`, `.orders-table-head`, `.orders-table-head__inner`, `.orders-table-wrap`, the cell-skin comment, and `.orders-table-card .orders-table__cell--action` (lines ~39–90); and the entire `── Pagination footer ──` section + `.orders-pagination`, `.orders-pagination__size`, `.orders-pagination__select`, `.orders-pagination__page`, `.orders-pagination__nav` (lines ~139–177).

**Keep:** `.orders-page`, the `── Toolbar ──` block (`.orders-toolbar*`), the `── Row action menu ──` block (`.order-row-actions*`), the ID-column-link comment, and `.orders-page__status`.

- [ ] **Step 3: Verify the app builds**

Run: `npm run build:odyssey-one`
Expected: build succeeds. (Runtime verification happens at the end of Task 9, once `OrdersRoute` passes the new pagination props.)

- [ ] **Step 4: Commit**

```bash
git add apps/odyssey-one/src/components/orders/OrdersTable.jsx apps/odyssey-one/src/components/orders/orders.css
git commit -m "refactor(orders): OrdersTable consumes the DataTable shell; drop duplicated chrome CSS"
```

---

## Task 9: Migrate pagination to the table instance + wire Paginator + delete `OrdersTablePagination`

Move Orders pagination from the app-local 1-based `pageNumber`/`pageSize` pair onto a TanStack `{pageIndex,pageSize}` state with `rowCount` from the server, so the `@odyssey/ui` `Paginator` (already mounted as the footer in Task 8) drives it. Preserve the reset-to-first-page-on-size-change behavior and the 0↔1-based mapping for the request.

**Files:**
- Modify: `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx`
- Delete: `apps/odyssey-one/src/components/orders/OrdersTablePagination.jsx`

- [ ] **Step 1: Update `OrdersRoute` pagination state + handlers**

In `apps/odyssey-one/src/routes/orders/OrdersRoute.jsx`:

Replace the two pagination state lines (currently `const [pageNumber, setPageNumber] = useState(1)` and `const [pageSize, setPageSize] = useState(20)`) with:

```jsx
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 }) // pageIndex 0-based (TanStack)
```

Replace the `request` memo with the 0→1-based mapping:

```jsx
  const request = useMemo(() => ({
    pagination: { pageNumber: pagination.pageIndex + 1, pageSize: pagination.pageSize },
    sort: { field: 'orderNumber', direction: sortDirection },
  }), [pagination, sortDirection])
```

Replace `handleToggleSort` + `handlePageSizeChange` with:

```jsx
  // Reset to the first page whenever the query identity changes (Shipments-proven pattern).
  const handleToggleSort = () => {
    setSortDirection(d => (d === 'desc' ? 'asc' : 'desc'))
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }
  // Paginator drives setPageSize on the table → onPaginationChange. Reset to the
  // first page on a page-size change (preserves the prior UX, regardless of
  // TanStack's internal pageIndex math).
  const handlePaginationChange = (updater) => {
    setPagination(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next.pageSize !== prev.pageSize ? { ...next, pageIndex: 0 } : next
    })
  }
```

- [ ] **Step 2: Update the `OrdersTable` usage (remove the pagination child)**

Replace the `<OrdersTable> … </OrdersTable>` block (the element with the `<OrdersTablePagination>` child) with the self-closing form passing the new pagination props:

```jsx
          <OrdersTable
            rows={data.rows}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            totalCount={data.totalCount}
            onRowIdClick={(row) => {
              // Draft rows reopen in the create form (spec §4); others stay
              // inert until the order-detail build. Draft key = orderNumber
              // (plan decision 17 — the save-gate guarantees one).
              if (row.status === 'Draft') navigate(`/orders/create?draft=${encodeURIComponent(row.id)}`)
            }}
          />
```

- [ ] **Step 3: Remove the now-unused import**

Delete this line near the top of `OrdersRoute.jsx`:

```jsx
import OrdersTablePagination from '../../components/orders/OrdersTablePagination'
```

- [ ] **Step 4: Delete the app-local pagination component**

Run: `git rm apps/odyssey-one/src/components/orders/OrdersTablePagination.jsx`

- [ ] **Step 5: Verify build + full test suite**

Run: `npm run build:odyssey-one && cd apps/odyssey-one && npm test`
Expected: build succeeds; the full vitest suite (incl. the new DataTable helper tests) is green.

- [ ] **Step 6: Verify the app at `/orders`**

Run: `npm run dev:odyssey-one`, open `http://localhost:5173/orders`. Confirm: the table renders, the Paginator footer shows "Showing 1 to 20 of N results" + the page bar, paging refetches the next server page, changing rows-per-page resets to page 1, sort toggle resets to page 1, and selection still works.

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/src/routes/orders/OrdersRoute.jsx
git commit -m "refactor(orders): pagination on the table instance; wire @odyssey/ui Paginator; retire OrdersTablePagination"
```

---

## Task 10: GATE — Δ=0 verification + tracker

Confirm the refactor changed nothing visible/behavioral at `/orders`, then record the in-progress normalization.

**Files:**
- Modify: `playground/normalization-tracker.md`

- [ ] **Step 1: Δ=0 visual + behavioral check**

With the app running at `http://localhost:5173/orders`, compare against the Task 1 baseline (`/tmp/dsm-measure/datatable-baseline/orders.png`):
- Header strip parks under the toolbar (no gap, no overlap).
- Horizontal scroll moves the header in lockstep with the body.
- The **Action** column stays pinned right with its left shadow.
- The pagination footer stays left during horizontal scroll.
- Row hover + selected-row background, the 16px card radius, and column widths look identical.

In devtools, spot-check the invariants table from Task 1 against the live elements (e.g. `getComputedStyle($0)` on `.odyssey-data-table__head` → `position: sticky; z-index: 3`; on `.odyssey-table__cell--sticky-right` → `position: sticky; right: 0px; box-shadow: ...`).

Expected: identical to baseline. If anything differs, fix before continuing (do not proceed on a non-zero delta).

- [ ] **Step 2: Re-run build + tests as the final gate**

Run: `npm run build:odyssey-one && cd apps/odyssey-one && npm test`
Expected: build succeeds; full suite green.

- [ ] **Step 3: Record the in-progress normalization in the tracker**

In `playground/normalization-tracker.md`, add a row/entry for **DataTable** (molecule): React shell done (S66), Angular twin + Figma master + Code Connect pending; note it composes the `.odyssey-table` Cell contract + the `Paginator`, and that `OrdersTable` is its first consumer. (Match the file's existing format for an in-progress component.)

- [ ] **Step 4: Commit**

```bash
git add playground/normalization-tracker.md
git commit -m "docs(dsm): track DataTable shell — React done (S66), Angular + Figma pending"
```

---

## Done (React phase) → sequence tail (separate cycles, per the spec §12)

1. **Angular twin** `odyssey-data-table` in `odyssey-one-library-ui` via `/port-to-angular` (structural `DataTableTable`, component SCSS, Δ=0 vs React).
2. **Figma retro-sync** — assemble a `DataTable` master from the code + Code Connect; then set `figmaNode`/`codeConnect` on the demo meta and clear `normalizing`.
3. **Folds into the held 0.3.0 release** (dropdown stack + DSM versioning + Paginator + DataTable).

---

## Self-Review

**Spec coverage:**
- Thin API (`table`, `stickyTop`, `footer`, `ariaLabel`, `className`) → Task 6. ✓
- Column `meta` (`cellClass`/`headClass`/`sticky:'right'`/`fixedWidth`) → helpers Task 4, applied Task 6, used Task 8. ✓
- Structural interface / no `@tanstack` dep + inlined flexRender → Task 4 (`renderCell`), Task 6 (no @tanstack import). ✓
- Extracted mechanisms (split sticky header, two-pass colgroup, scroll-sync) → Task 6. ✓
- R1 (flex-by-meta) → Task 3 `getColWidths` + `fixedWidth` flags Task 8. ✓
- R2 (re-measure on column signature) → Task 6 (`columnSignature` in effect deps). ✓
- CSS contract `.odyssey-data-table*` + `--sticky-right` → Task 5; orders.css trim → Task 8. ✓
- OrdersTable first consumer → Task 8. ✓
- Paginator wiring + pagination on the instance + `rowCount` + 0↔1 mapping + retire OrdersTablePagination → Task 9. ✓
- Testing: node-env pure-helper TDD + extended include → Tasks 2–4; demo → Task 7; GATE Δ=0 → Tasks 1 + 10. ✓
- Per-domain opt-in / data-driven: the shell references no specific column/row and reads features off the instance (Task 6) — no task needed beyond the agnostic render. ✓

**Placeholder scan:** no TBD/TODO; every code step shows full code; commands have expected output. ✓

**Type/name consistency:** `getColWidths(headerWidths, bodyWidths, containerWidth, flexFlags)`, `renderCell(renderer, context)`, `cellClassName(meta, isStickyRight)`, `headClassName(meta, isStickyRight)` — identical across Tasks 3, 4, 6. Class names `.odyssey-data-table`, `__head`, `__head-inner`, `__body`, `__footer`, `.odyssey-table__cell--sticky-right` — identical across Tasks 5, 6, 8, 10. Props `pagination`/`onPaginationChange`/`totalCount` — identical across Tasks 8 and 9. ✓
