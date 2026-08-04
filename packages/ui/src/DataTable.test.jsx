// @vitest-environment jsdom
import { afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { getColWidths, getSizesFromState, showResizeGrip, showSortButton, ariaSortValue, MIN_COL_WIDTH, SORT_MIN_WIDTH, MAX_COL_WIDTH, hiddenWordCount, renderCell, cellClassName, headClassName, isInteractiveTarget, resolveCellClick } from './DataTable.jsx'
import DataTable from './DataTable.jsx'

afterEach(cleanup)

// ── render-mode tests: loading (whole-table Spinner) vs loadingRows (per-cell) ──
const col = createColumnHelper()
const COLUMNS = [col.accessor('name', { header: 'Name' })]
const ROWS = [{ id: '1', name: 'Atlanta' }, { id: '2', name: 'Dallas' }]

// Minimal harness — a real TanStack table instance (client-side, no pagination),
// consistent with how ShipmentTable/OrdersTable drive the shell.
function Harness({ data = ROWS, ...props }) {
  const table = useReactTable({ data, columns: COLUMNS, getCoreRowModel: getCoreRowModel() })
  return <DataTable table={table} ariaLabel="Test table" {...props} />
}

describe('DataTable loading modes (S107: per-cell restored + whole-table added)', () => {
  it('loadingRows renders "Loading…" per data cell, rows still present', () => {
    render(<Harness loadingRows />)
    expect(screen.getAllByText('Loading…')).toHaveLength(ROWS.length)
    // the real data is NOT rendered while its cell is in loading state
    expect(screen.queryByText('Atlanta')).toBeNull()
  })

  it('loading (whole-table) renders the Spinner and no data rows', () => {
    render(<Harness loading />)
    // Spinner renders an SVG with role="status" via its own normalized markup —
    // assert via the absence of any row content instead of the Spinner internals.
    expect(screen.queryByText('Atlanta')).toBeNull()
    expect(screen.queryByText('Dallas')).toBeNull()
    expect(screen.queryByText('Loading…')).toBeNull()
    expect(document.querySelector('.odyssey-data-table__loading')).not.toBeNull()
    expect(document.querySelectorAll('tbody tr')).toHaveLength(0)
  })

  it('plain mode (neither flag) renders populated rows verbatim', () => {
    render(<Harness />)
    expect(screen.getByText('Atlanta')).not.toBeNull()
    expect(screen.getByText('Dallas')).not.toBeNull()
    expect(document.querySelector('.odyssey-data-table__loading')).toBeNull()
  })

  it('modes are mutually exclusive with populated rows: loading wins over loadingRows when both are set', () => {
    render(<Harness loading loadingRows />)
    expect(document.querySelectorAll('tbody tr')).toHaveLength(0)
    expect(screen.queryByText('Loading…')).toBeNull()
    expect(document.querySelector('.odyssey-data-table__loading')).not.toBeNull()
  })
})

describe('getColWidths (S85: default = max(header label, body) capped at MAX_COL_WIDTH)', () => {
  it('defaults each column to max(header, body), rounded up', () => {
    // container small enough that no slack is distributed
    expect(getColWidths([40, 100, 30], [48, 90, 35.2], 0, [false, true, false]))
      .toEqual([48, 100, 36])
  })

  it('caps a body-driven default at MAX_COL_WIDTH (wider content ellipsizes)', () => {
    expect(getColWidths([80, 80], [400, 100], 0, [false, false]))
      .toEqual([MAX_COL_WIDTH, 100])
  })

  it('never caps the header label — the full column name always shows', () => {
    expect(getColWidths([MAX_COL_WIDTH + 30, 80], [0, 0], 0, [false, false]))
      .toEqual([MAX_COL_WIDTH + 30, 80])
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

  it('uses the provided size for a sized column and excludes it from flex', () => {
    // col0 sized=120; cols 1,2 auto+flex. widths=[120,100,50] total 270; container 320 →
    // slack 50 over the 2 flex+unsized cols → +25 each.
    expect(getColWidths([50, 100, 50], [0, 0, 0], 320, [false, true, true], [120, null, null]))
      .toEqual([120, 125, 75])
  })
  it('a sized column is never widened by flex even if flagged flex', () => {
    // widths=[80(sized), 50]; total 130; container 400 → slack 270 to the one flex+unsized col.
    expect(getColWidths([50, 50], [0, 0], 400, [true, true], [80, null]))
      .toEqual([80, 320])
  })
  it('a drag may exceed MAX_COL_WIDTH (the cap is on defaults only)', () => {
    expect(getColWidths([50, 50], [0, 0], 0, [false, false], [400, null]))
      .toEqual([400, 50])
  })
  it('clamps a DRAGGED column to its min (sortable columns floor at SORT_MIN_WIDTH)', () => {
    // col0 dragged to 30 but min 74 → 74; col1 unclamped
    expect(getColWidths([50, 100], [0, 0], 0, [false, false], [30, null], [SORT_MIN_WIDTH, 0]))
      .toEqual([SORT_MIN_WIDTH, 100])
  })
  it('does NOT clamp a measured default — the label always fits by construction', () => {
    expect(getColWidths([20, 100], [0, 0], 0, [false, false], [], [MIN_COL_WIDTH, 0]))
      .toEqual([20, 100])
  })
  it('non-sortable dragged columns floor at MIN_COL_WIDTH', () => {
    expect(getColWidths([100, 100], [0, 0], 0, [false, false], [10, null], [MIN_COL_WIDTH, MIN_COL_WIDTH]))
      .toEqual([MIN_COL_WIDTH, 100])
  })
})

describe('hiddenWordCount (S85 truncation-tooltip rule: show when > 1 word hidden)', () => {
  it('is 0 when nothing is clipped', () => {
    expect(hiddenWordCount('Lake Charles', 100, 100)).toBe(0)
    expect(hiddenWordCount('Lake Charles', 100, 80)).toBe(0)
  })
  it('estimates the words past the visible share', () => {
    // half visible → 'three four five six' hidden (> 1 word → tooltip)
    expect(hiddenWordCount('one two three four five six', 50, 100)).toBeGreaterThan(1)
  })
  it('a short clipped tail stays under the threshold', () => {
    // ~80% visible of a 2-word string → at most 1 hidden word → no tooltip
    expect(hiddenWordCount('Lake Charleston', 80, 100)).toBeLessThanOrEqual(1)
  })
  it('handles empty text', () => {
    expect(hiddenWordCount('', 10, 100)).toBe(0)
  })
})

describe('showSortButton (sorting = the DataTable `sortable` feature switch)', () => {
  const column = (canSort) => ({ getCanSort: () => canSort })

  it('hides the sort button when the instance has not opted in (getCanSort defaults true in TanStack)', () => {
    expect(showSortButton(undefined, column(true))).toBe(false)
    expect(showSortButton(false, column(true))).toBe(false)
  })
  it('shows the button when the instance opts in AND the column allows sorting', () => {
    expect(showSortButton(true, column(true))).toBe(true)
  })
  it('hides the button on a column that opts out (select/action: enableSorting:false)', () => {
    expect(showSortButton(true, column(false))).toBe(false)
  })
})

describe('ariaSortValue', () => {
  it('maps TanStack getIsSorted() to aria-sort', () => {
    expect(ariaSortValue('asc')).toBe('ascending')
    expect(ariaSortValue('desc')).toBe('descending')
    expect(ariaSortValue(false)).toBe('none')
  })
})

describe('getSizesFromState (which columns are user-sized)', () => {
  // TanStack's ColumnSizing feature writes a default `columnDef.size = 150` onto EVERY
  // column, so columnDef.size can never mean "the user sized this". Only the live
  // columnSizing state (set by a drag) counts — otherwise every column locks to 150px.
  const col = (id, defSize, sizeReturn) => ({ id, columnDef: { size: defSize }, getSize: () => sizeReturn })

  it('treats NO column as sized when columnSizing is empty, even with columnDef.size=150', () => {
    const cols = [col('a', 150, 150), col('b', 150, 150)]
    expect(getSizesFromState(cols, {})).toEqual([null, null])
  })

  it('returns getSize() only for a column the user dragged (present in columnSizing)', () => {
    const cols = [col('a', 150, 220), col('b', 150, 150)]
    expect(getSizesFromState(cols, { a: 220 })).toEqual([220, null])
  })

  it('defaults to an empty columnSizing (treats nothing as sized)', () => {
    const cols = [col('a', 150, 150)]
    expect(getSizesFromState(cols)).toEqual([null])
  })
})

describe('showResizeGrip (resize is per-table opt-in)', () => {
  const table = (enableColumnResizing) => ({ options: { enableColumnResizing } })
  const column = (canResize) => ({ getCanResize: () => canResize })

  it('hides the grip when the table has not opted in (getCanResize defaults true in TanStack)', () => {
    expect(showResizeGrip(table(undefined), column(true))).toBe(false)
    expect(showResizeGrip(table(false), column(true))).toBe(false)
  })

  it('shows the grip when the table opts in AND the column allows resize', () => {
    expect(showResizeGrip(table(true), column(true))).toBe(true)
  })

  it('hides the grip on a pinned column that opts out (select/action: enableResizing:false → getCanResize false)', () => {
    expect(showResizeGrip(table(true), column(false))).toBe(false)
  })
})

describe('isInteractiveTarget', () => {
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
  it('is true when the DOM target is outside the cell (portaled overlay — React-tree bubbling)', () => {
    // ActionMenu portals its menu to document.body; the item click bubbles to the
    // cell through the React tree with a DOM target the cell does not contain.
    const [cell] = cellWith('<button type="button">⋮</button>')
    const portaled = document.createElement('div')
    portaled.innerHTML = '<div role="menuitem">Edit</div>'
    const target = portaled.querySelector('div')
    expect(isInteractiveTarget(target, cell)).toBe(true)
  })
})

describe('resolveCellClick (whole-cell click delegation — meta.forwardClick)', () => {
  const cellWith = (html, targetSelector) => {
    const cell = document.createElement('td')
    cell.innerHTML = html
    const target = targetSelector ? cell.querySelector(targetSelector) : cell
    return [cell, target]
  }

  it('is "native" when the click lands on the interactive element itself (button handles it)', () => {
    const [cell, target] = cellWith('<button type="button">⋮</button>', 'button')
    expect(resolveCellClick(target, cell, true)).toEqual({ type: 'native' })
  })
  it('is "native" for out-of-cell DOM targets (portaled ActionMenu items) — the S81 fix must not regress', () => {
    const [cell] = cellWith('<button type="button">⋮</button>')
    const portaled = document.createElement('div')
    portaled.innerHTML = '<div role="menuitem">Edit</div>'
    expect(resolveCellClick(portaled.querySelector('div'), cell, true)).toEqual({ type: 'native' })
  })
  it('is "cell" for a plain cell without forwardClick (fires onCellClick)', () => {
    const [cell, target] = cellWith('<span>Atlanta</span>', 'span')
    expect(resolveCellClick(target, cell, false)).toEqual({ type: 'cell' })
  })
  it('is "cell" when forwardClick is omitted (default false)', () => {
    const [cell, target] = cellWith('<span>Atlanta</span>', 'span')
    expect(resolveCellClick(target, cell)).toEqual({ type: 'cell' })
  })
  it('forwards a non-interactive click in a forwardClick cell to the first interactive element', () => {
    const [cell, target] = cellWith('<span class="pad">pad</span><button type="button">⋮</button>', 'span')
    const action = resolveCellClick(target, cell, true)
    expect(action.type).toBe('forward')
    expect(action.el).toBe(cell.querySelector('button'))
  })
  it('forwards a click on the cell element itself (the padding around the trigger)', () => {
    const [cell, target] = cellWith('<button type="button">⋮</button>') // target = the <td>
    const action = resolveCellClick(target, cell, true)
    expect(action.type).toBe('forward')
    expect(action.el).toBe(cell.querySelector('button'))
  })
  it('is "none" for a forwardClick cell with nothing interactive inside (never falls through to onCellClick)', () => {
    const [cell, target] = cellWith('<span>empty</span>', 'span')
    expect(resolveCellClick(target, cell, true)).toEqual({ type: 'none' })
  })
})

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
  it('adds meta.headClass additively without sticky-right (the common header cell)', () => {
    expect(headClassName({ headClass: 'odyssey-table__cell--control' }, false))
      .toBe('text-label-sm-semibold odyssey-table__cell--control')
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
  it('adds the forward-click modifier when the column opts into meta.forwardClick (drives cursor:pointer)', () => {
    expect(cellClassName({ forwardClick: true }, true))
      .toBe('text-label-sm-regular odyssey-table__cell--sticky-right odyssey-table__cell--forward-click')
  })
})
