import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * DataTable — a thin presentation shell for a TanStack v8 table. It owns the
 * table chrome (split sticky header + colgroup width-lock + horizontal
 * scroll-sync) and applies the normalized `.odyssey-table` Cell contract.
 * Structure (S79b, decision 6): a transparent root wrapping the bordered
 * white CARD (table only) + the `footer` slot (Paginator) as a sibling BELOW
 * the card, transparent on the page canvas.
 * Driven by a duck-typed `table` instance — this package takes NO @tanstack
 * dependency. The consumer owns columns / data / state. See the design specs
 * 2026-06-25-datatable-shell-design.md + 2026-06-26-datatable-extensibility-design.md.
 *
 * Opt-in extensibility (per-table): column RESIZE (the consumer turns on
 * `enableColumnResizing` on the table → grips render on resizable columns; pinned system
 * columns like select/action set `enableResizing:false` and never get one), per-cell
 * CLICK (`onCellClick(cell,row)`, suppressed on interactive cells), and per-column
 * WHOLE-CELL CLICK FORWARDING (`meta.forwardClick: true` — a click on the non-interactive
 * part of the cell is forwarded to the first interactive element inside it, e.g. the ⋮
 * ActionMenu trigger, instead of firing onCellClick; the whole cell becomes the tap
 * target and shows `cursor: pointer` even when the table has no onCellClick). Reorder + column
 * visibility are reflected automatically (the shell renders from the table's
 * visible/ordered columns); the driver UI is a separate RightPanel — and it should touch
 * DATA columns only (the select + action columns stay pinned).
 */

/** Selector for elements that "own" a click — a cell containing one of these is an
 *  interactive cell, so onCellClick is suppressed for it. `[data-no-cell-click]` is the
 *  escape hatch for custom clickable components (e.g. a ButtonLink). */
const INTERACTIVE_SELECTOR =
  'button, a[href], input, select, textarea, label, [role="button"], [role="menuitem"], [role="link"], [contenteditable="true"], [data-no-cell-click]'

/** True when a cell click originated inside an interactive/clickable element within the cell. */
export function isInteractiveTarget(target, cellEl) {
  if (!(target instanceof Element) || !cellEl) return false
  // React portals bubble synthetic events through the REACT tree, so a click on
  // portaled overlay content (e.g. an ActionMenu item rendered into document.body)
  // reaches the cell's onClick with a DOM target outside the cell. That is never
  // a cell click — without this guard it double-fires alongside the menu action.
  if (!cellEl.contains(target)) return true
  const hit = target.closest(INTERACTIVE_SELECTOR)
  return hit != null && cellEl.contains(hit)
}

/**
 * Decide what a cell click does. Pure decision logic for the <td> onClick:
 *   - 'native'  → the click landed on (or bubbled from) an interactive element —
 *                 do nothing, the element handles it itself (isInteractiveTarget path).
 *   - 'forward' → non-interactive part of a `meta.forwardClick` cell — forward to the
 *                 first interactive element inside the cell (`el.click()`), making the
 *                 whole cell the tap target (the ⋮ alone is too small).
 *   - 'cell'    → plain cell click → fire onCellClick(cell, row).
 *   - 'none'    → forwardClick cell with nothing interactive inside — swallow (a
 *                 forwardClick cell never falls through to onCellClick).
 */
export function resolveCellClick(target, cellEl, forwardClick = false) {
  if (isInteractiveTarget(target, cellEl)) return { type: 'native' }
  if (forwardClick) {
    const el = cellEl?.querySelector(INTERACTIVE_SELECTOR)
    return el ? { type: 'forward', el } : { type: 'none' }
  }
  return { type: 'cell' }
}

/**
 * Per-column locked widths. A column with a non-null `sizes[i]` is "sized" (user-dragged
 * via TanStack columnSizing, or an explicit columnDef.size) — it uses that width verbatim
 * and is excluded from flex distribution. Every other column is max(header, firstRow) and
 * shares leftover container width if its flexFlag is true (Refinement R1: flex by flag,
 * not position). `headerWidths`/`bodyWidths` are raw `getBoundingClientRect().width` floats.
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

/**
 * Which columns are "user-sized" (use TanStack `getSize()` verbatim + skip auto-measure +
 * exclude from flex). A column counts as sized ONLY when its id is present in the live
 * `columnSizing` state — i.e. the user dragged it. We deliberately do NOT key off
 * `columnDef.size`: TanStack's ColumnSizing feature injects a default `size: 150` onto
 * EVERY column, so `columnDef.size != null` is always true and would lock every column to
 * 150px (killing content-measure + flex). Returns one entry per column: the dragged width or null.
 */
export function getSizesFromState(leafCols, columnSizing = {}) {
  return leafCols.map((c) => (columnSizing[c.id] != null ? c.getSize() : null))
}

/**
 * Whether a column shows a resize grip. Resize is a per-table OPT-IN feature: the grip
 * appears only when the consumer turned resizing on at the table level
 * (`table.options.enableColumnResizing === true`) AND the column itself allows it
 * (`getCanResize()`). `getCanResize()` defaults to true in TanStack, so it cannot be the
 * switch on its own — the table-level flag is. Pinned system columns (select/action) opt
 * out with `enableResizing: false`, so `getCanResize()` is false and they never get a grip.
 */
export function showResizeGrip(table, column) {
  return table?.options?.enableColumnResizing === true && column?.getCanResize?.() === true
}

/** Inlined flexRender: call a function renderer with its context, else return
 *  the value (a plain header string, a number, etc.). Nullish → null. Keeps the
 *  library free of any @tanstack import. */
export function renderCell(renderer, context) {
  if (renderer == null) return null
  return typeof renderer === 'function' ? renderer(context) : renderer
}

/** `<th>` classes: the `text-label-sm-semibold` base is ALWAYS included;
 *  `meta.headClass` is additive on top of it; `odyssey-table__cell--sticky-right`
 *  when the column is pinned right. */
export function headClassName(meta, isStickyRight) {
  return [
    'text-label-sm-semibold',
    meta?.headClass,
    isStickyRight && 'odyssey-table__cell--sticky-right',
  ].filter(Boolean).join(' ')
}

/** `<td>` classes: `meta.cellClass` REPLACES the `text-label-sm-regular` default
 *  entirely (a Title cell passes `'odyssey-table__cell--title text-label-sm-medium'`);
 *  `odyssey-table__cell--sticky-right` when the column is pinned right;
 *  `odyssey-table__cell--forward-click` when the column opts into whole-cell click
 *  forwarding (drives the pointer cursor independently of onCellClick). */
export function cellClassName(meta, isStickyRight) {
  return [
    meta?.cellClass ?? 'text-label-sm-regular',
    isStickyRight && 'odyssey-table__cell--sticky-right',
    meta?.forwardClick && 'odyssey-table__cell--forward-click',
  ].filter(Boolean).join(' ')
}

export default function DataTable({ table, stickyTop = 0, footer, ariaLabel, onCellClick, className = '' }) {
  // stickyTop: number (px) or any CSS length expression (string). The sticky reference is
  // the page scroller's CONTENT edge — a padded scroller (e.g. an app shell <main> with
  // padding-top) parks a `top: 0` header padding-top BELOW the visible clip edge, letting
  // rows scroll through the strip above it. Consumers compensate with a negative offset
  // (e.g. `stickyTop="calc(-1 * var(--spacing-8))"`); a measured-toolbar consumer keeps
  // passing its number and stays consistent with its own equally-offset toolbar.
  const stickyTopValue = typeof stickyTop === 'number' ? `${stickyTop}px` : stickyTop
  const headRef = useRef(null)       // head-inner (overflow:hidden); scrollLeft set on it mirrors the body — the split-header trick, NOT a bug
  const wrapRef = useRef(null)       // body horizontal scroller
  const headTableRef = useRef(null)
  const bodyTableRef = useRef(null)
  const [measured, setMeasured] = useState(null) // { headerWidths, bodyWidths, container } — the content-width pass

  const rowModel = table.getRowModel()
  // Re-measure only when the column SET/ORDER or the rows change — NOT when sizing changes.
  // A resize drag updates the derived widths below without a DOM re-measure (re-measuring
  // per mouse-move was the resize lag). A by-value string keeps this stable across renders.
  const columnSignature = table.getVisibleLeafColumns().map((c) => c.id).join('|')

  // Pass 1: with `measured` null the table renders width:auto so each column reports its true
  // content width; capture those raw widths once. Pass 2 (derived, below) locks them into a
  // shared <colgroup> and hands leftover space to flex columns — recomputed cheaply on every
  // render so a drag updates the colgroup live without re-reading the DOM.
  useLayoutEffect(() => { setMeasured(null) }, [rowModel.rows, columnSignature])
  useLayoutEffect(() => {
    if (measured) return
    const ths = headTableRef.current?.querySelectorAll('thead th')
    const tds = bodyTableRef.current?.querySelectorAll('tbody tr:first-child td')
    if (!ths?.length || !tds?.length) return
    const headerWidths = Array.from(ths).map((th) => th.getBoundingClientRect().width)
    const bodyWidths = Array.from(tds).map((td) => td.getBoundingClientRect().width)
    const container = wrapRef.current?.clientWidth ?? 0
    setMeasured({ headerWidths, bodyWidths, container })
  }, [measured, rowModel.rows, columnSignature]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure on window resize (debounced) — the container width changed.
  useEffect(() => {
    let t = 0
    const onResize = () => { clearTimeout(t); t = setTimeout(() => setMeasured(null), 150) }
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

  // Custom horizontal scrollbar (S82): a sticky track + draggable thumb ABOVE
  // the header, part of the table chrome, rendered only when the body
  // overflows. A real element because the body's NATIVE bar sits at the
  // bottom of the tall table AND hides in macOS overlay mode (custom
  // ::-webkit-scrollbar styling no longer opts out of overlay scrollbars in
  // current Chrome). Track click jumps; thumb drags; body scroll paints the
  // thumb position directly (no per-frame React state).
  const trackRef = useRef(null)
  const thumbRef = useRef(null)
  const [hbar, setHbar] = useState(null) // { track, content } px — null when no overflow
  const thumbW = hbar ? Math.max(40, (hbar.track / hbar.content) * hbar.track) : 0

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const measure = () => {
      // Value-stable update: returning the SAME object when nothing changed is
      // load-bearing — a fresh object each run + the hbar effect dep would
      // re-render in a loop (starving transitions in the consumer).
      setHbar((prev) => {
        if (wrap.scrollWidth - wrap.clientWidth <= 1) return null
        if (prev && prev.track === wrap.clientWidth && prev.content === wrap.scrollWidth) return prev
        return { track: wrap.clientWidth, content: wrap.scrollWidth }
      })
    }
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    if (bodyTableRef.current) ro.observe(bodyTableRef.current) // column resize/visibility changes
    measure()
    const paint = () => {
      const track = trackRef.current
      const thumb = thumbRef.current
      if (!track || !thumb) return
      const max = wrap.scrollWidth - wrap.clientWidth
      const range = track.clientWidth - thumb.offsetWidth
      thumb.style.transform = `translateX(${max > 0 ? (wrap.scrollLeft / max) * range : 0}px)`
    }
    wrap.addEventListener('scroll', paint, { passive: true })
    paint()
    return () => {
      ro.disconnect()
      wrap.removeEventListener('scroll', paint)
    }
    // hbar dep: the track/thumb mount only once overflow is detected — re-run
    // so the first paint() finds them (identity is value-stable, no loop).
  }, [hbar])

  const dragThumb = (e) => {
    const wrap = wrapRef.current
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!wrap || !track || !thumb) return
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startLeft = wrap.scrollLeft
    const max = wrap.scrollWidth - wrap.clientWidth
    const range = track.clientWidth - thumb.offsetWidth
    if (range <= 0) return
    const move = (ev) => { wrap.scrollLeft = startLeft + (ev.clientX - startX) * (max / range) }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const jumpTrack = (e) => {
    if (e.target !== trackRef.current) return // thumb handles its own drag
    const wrap = wrapRef.current
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!wrap || !track || !thumb) return
    const rect = track.getBoundingClientRect()
    const range = rect.width - thumb.offsetWidth
    if (range <= 0) return
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left - thumb.offsetWidth / 2) / range))
    wrap.scrollLeft = ratio * (wrap.scrollWidth - wrap.clientWidth)
  }

  // Derived each render (cheap, no DOM read): lock measured content widths into the colgroup,
  // but let user-dragged columns use their live `getSize()` so a resize tracks the cursor
  // smoothly. `sizes` is keyed off columnSizing only (see getSizesFromState) — un-dragged
  // columns auto-fit their content and flex; they are NOT all forced to 150px.
  const leafCols = table.getVisibleLeafColumns()
  const flexFlags = leafCols.map((c) => !c.columnDef.meta?.fixedWidth)
  const sizes = getSizesFromState(leafCols, table.getState().columnSizing ?? {})
  const colWidths = measured
    ? getColWidths(measured.headerWidths, measured.bodyWidths, measured.container, flexFlags, sizes)
    : null

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
    <div className={`odyssey-data-table${onCellClick ? ' odyssey-data-table--cell-clickable' : ''}${className ? ` ${className}` : ''}`}>
      {/* Horizontal scrollbar: a sibling ABOVE the card so it's never clipped by
          the card's border-radius + overflow:clip. Sticky at stickyTop; the card's
          header shifts down +8px while it's present. */}
      {hbar && (
        <div
          ref={trackRef}
          className="odyssey-data-table__hscroll"
          style={{ top: stickyTopValue }}
          aria-hidden="true"
          onPointerDown={jumpTrack}
        >
          <div
            ref={thumbRef}
            className="odyssey-data-table__hscroll-thumb"
            style={{ width: thumbW }}
            onPointerDown={dragThumb}
          />
        </div>
      )}
      {/* The bordered white card holds the table ONLY; the footer (Paginator) sits
          below it as a sibling, transparent on the page canvas (S79b, decision 6). */}
      <div className="odyssey-data-table__card">
        <div
          className="odyssey-data-table__head"
          style={{ top: hbar ? `calc(${stickyTopValue} + 8px)` : stickyTopValue }}
        >
          <div className="odyssey-data-table__head-inner" ref={headRef}>
            <table className="odyssey-table" ref={headTableRef} style={tableStyle}>
              {colgroup}
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => {
                      const meta = header.column.columnDef.meta
                      const headerLabel = typeof header.column.columnDef.header === 'string'
                        ? header.column.columnDef.header
                        : header.column.id
                      return (
                        <th key={header.id} className={headClassName(meta, meta?.sticky === 'right')}>
                          {renderCell(header.column.columnDef.header, header.getContext())}
                          {showResizeGrip(table, header.column) && (
                            <span
                              className={`odyssey-data-table__resize-grip${header.column.getIsResizing?.() ? ' is-resizing' : ''}`}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onClick={(e) => e.stopPropagation()}
                              role="separator"
                              aria-orientation="vertical"
                              aria-label={`Resize ${headerLabel}`}
                            />
                          )}
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
                    const forwardClick = meta?.forwardClick === true
                    // The handler attaches when the TABLE has onCellClick OR the COLUMN
                    // opted into forwarding — a forwardClick action column works even on
                    // tables with no cell-click behavior at all.
                    return (
                      <td
                        key={cell.id}
                        className={cellClassName(meta, meta?.sticky === 'right')}
                        onClick={(onCellClick || forwardClick)
                          ? (e) => {
                              const action = resolveCellClick(e.target, e.currentTarget, forwardClick)
                              if (action.type === 'forward') action.el.click()
                              else if (action.type === 'cell') onCellClick?.(cell, row)
                            }
                          : undefined}
                      >
                        {renderCell(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {footer && <div className="odyssey-data-table__footer">{footer}</div>}
    </div>
  )
}
