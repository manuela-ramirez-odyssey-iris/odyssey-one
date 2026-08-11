import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpDown, MoveUp, MoveDown, Plus, RefreshCw } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import Tooltip from './Tooltip.jsx'
import Spinner from './Spinner.jsx'
import Button from './Button.jsx'

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
 * Per-instance FEATURE SWITCHES (all default off — mix freely; see DataTable.usage.md):
 *   sortable          — header sort buttons, asc ↔ desc, one column always drives
 *                       (auto-seeds the first sortable column when unseeded).
 *   truncationTooltip — full-text Tooltip on any ellipsis-truncated cell (S93: was > 1 hidden word).
 *   onCellClick       — per-cell click callback (suppressed on interactive cells).
 * Plus per-table column RESIZE (TanStack `enableColumnResizing` → grips on resizable
 * columns; pinned system columns set `enableResizing:false`) and per-column WHOLE-CELL
 * CLICK FORWARDING (`meta.forwardClick: true` — a click on the non-interactive part of
 * the cell forwards to its first interactive element, e.g. the ⋮ ActionMenu trigger;
 * the whole cell becomes the tap target). Reorder + column visibility are reflected
 * automatically (the shell renders from the table's visible/ordered columns); the
 * driver UI is a separate RightPanel — and it should touch DATA columns only (the
 * select + action columns stay pinned).
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

/** Default-width cap (S85): a column never defaults wider than this — wider content
 *  ellipsizes (and can raise the truncation tooltip). A drag may exceed it. */
export const MAX_COL_WIDTH = 290

/**
 * Per-column locked widths. A column with a non-null `sizes[i]` is "sized" (user-dragged
 * via TanStack columnSizing) — it uses that width verbatim (floored at `mins[i]`) and is
 * excluded from flex distribution. Every other column defaults to
 * min(MAX_COL_WIDTH, max(header label, cell content)) — S85 rule: whichever of the two
 * is smaller would clip, so take the larger; past the cap, content ellipsizes and the
 * user widens by drag. Un-sized columns share leftover container width if their flexFlag
 * is true (Refinement R1: flex by flag, not position). `headerWidths` are label-content
 * widths + cell padding; `bodyWidths` are natural column widths (see the measure pass).
 */
export function getColWidths(headerWidths, bodyWidths, containerWidth, flexFlags, sizes = [], mins = []) {
  const widths = headerWidths.map((hw, i) =>
    sizes[i] != null
      ? Math.max(mins[i] ?? 0, Math.ceil(sizes[i]))
      // header label always fits (never capped); body-driven width caps at MAX_COL_WIDTH
      : Math.ceil(Math.max(hw, Math.min(MAX_COL_WIDTH, bodyWidths[i] ?? 0)))
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

/**
 * Whether a column header is a sort button: the table opted in via the DataTable
 * `sortable` prop AND the column allows it (`getCanSort()` — system columns like
 * select/action opt out with `enableSorting: false` on their columnDef).
 */
export function showSortButton(sortable, column) {
  return sortable === true && column?.getCanSort?.() === true
}

/**
 * Item-counter copy for the Table Actions row. `null`/`undefined` → an em dash (the
 * count isn't known yet — Orders' pre-S116 toolbar behavior, which is the correct
 * one: "0 items" would be a lie while the first page is still in flight).
 * Thousands are separated (en-US) — Shipments' hand-rolled row printed raw digits.
 */
export function itemCountLabel(count) {
  return count == null ? '—' : `${count.toLocaleString('en-US')} items`
}

/** aria-sort value for a sortable header. TanStack getIsSorted(): false | 'asc' | 'desc'. */
export function ariaSortValue(sorted) {
  return sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
}

/** Lucide master per sort state: neutral (another column drives) → arrow-up-down;
 *  asc → move-up; desc → move-down. */
function SortIcon({ sorted }) {
  const Icon = sorted === 'asc' ? MoveUp : sorted === 'desc' ? MoveDown : ArrowUpDown
  return (
    <Icon
      size={16}
      className={`odyssey-data-table__sort-icon${sorted ? ' is-sorted' : ''}`}
      aria-hidden="true"
    />
  )
}

/** Resize drag floors — EVERY resizable column has one, sorting or not: cell padding
 *  (2×16) + one character (~10) + ellipsis (~12) = 54; a sortable column adds its
 *  icon (16) + gap (4). Keeps a drag from crushing the header past "X…" / "X… ↕".
 *  Floors bind on DRAG only — default widths stay at measured header content. */
// ponytail: px constants, not measured per-font — recompute if the table type scale changes
export const MIN_COL_WIDTH = 54
export const SORT_MIN_WIDTH = MIN_COL_WIDTH + 20

/**
 * Estimated count of words hidden behind a cell's ellipsis. The visible share of the
 * text is proportional to clientWidth/scrollWidth (nowrap single line, one font — a
 * good-enough linear estimate); whatever falls past it is the hidden tail.
 * Drives the S85 truncation-tooltip rule: show the tooltip only when MORE than one
 * word is hidden. Returns 0 when nothing is clipped.
 */
export function hiddenWordCount(text, clientWidth, scrollWidth) {
  if (!text || scrollWidth <= clientWidth + 1) return 0
  const visibleChars = Math.floor(text.length * (clientWidth / scrollWidth))
  const hidden = text.slice(visibleChars).trim()
  return hidden ? hidden.split(/\s+/).length : 0
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

// Per-instance feature switches (all default OFF — a plain table needs none of them):
//   sortable          — header sort buttons (asc↔desc, one column always drives; the
//                       shell auto-seeds the first sortable column when the consumer
//                       hasn't). Client tables also pass getSortedRowModel() to the
//                       engine; server tables set manualSorting and map the sorting
//                       state to their query.
//   truncationTooltip — full-text Tooltip on any ellipsis-truncated cell (S93: was > 1 hidden word).
//   onCellClick       — per-cell click callback.
//   onRowClick        — row-level click callback (S93): fires for clicks on any
//                       non-interactive part of the row (interactive elements keep
//                       their native behavior). Runs AFTER onCellClick when both are
//                       provided — most consumers pick one.
//   loadingRows       — data cells render "Loading…" text while stale placeholder
//                       rows show (tab-change/refetch — chrome + rows already on
//                       screen, only the values are stale). Restored S107 after S106
//                       briefly blanked the cells in favor of loading's overlay.
//   loading           — whole-table mode (initial mount, nothing to show yet): rows
//                       are suppressed entirely and a centered Spinner (32px, no
//                       text) covers the BODY area only — never the sticky header,
//                       which stays fully visible (S108). Mutually exclusive with
//                       loadingRows in practice — a table has no rows yet on first mount.
//   scrollSelectedIntoView — keep the selected row (TanStack rowSelection) visible
//                       between the sticky header and a bottom boundary (S93; extracted
//                       from the Shipments arrow-navigation autoscroll). `true` or
//                       `{ bottomBoundary?: () => px, freshDelay?: ms, switchDelay?: ms }`:
//                       bottomBoundary defaults to the viewport bottom (pass e.g. an
//                       open detail bar's top edge); freshDelay (default 600) applies on
//                       an empty→selected change so consumer open-animations can land;
//                       switchDelay (default 50) on selection switches (arrows).
//   actionsRow        — S116: the "Table Actions" row ABOVE the card (Figma
//                       `Table Container` 5057:8509). Object, absent → no row:
//                         { count, trailing, stickyTop }
//                       count     — number|null → "1,284 items" / "—" (itemCountLabel).
//                       trailing  — ReactNode slot, right-aligned. A SLOT, not typed
//                                   primary/secondary props: the three toolbars this
//                                   replaced needed one primary, one secondary and TWO
//                                   secondaries respectively, so a fixed pair could not
//                                   render all three. Toggling a button off is the
//                                   consumer's `{cond && <Button/>}`.
//                       stickyTop — number (px) or CSS length. PRESENT → the row leaves
//                                   the VERTICAL scroll and parks at that offset; ABSENT
//                                   → it scrolls away with the page. Both behaviors
//                                   shipped in the app already (Orders' toolbar stuck,
//                                   Shipments' scrolled away since S82), so this is a
//                                   real axis, not a speculative one. `0` is a valid
//                                   offset — presence is `!= null`, not truthiness.
//                                   Never part of the HORIZONTAL scroll either way: the
//                                   row is a sibling ABOVE the card, outside the body
//                                   scroller, and never a colSpan row inside <table>.
//                       A sticky row anchors the WHOLE band: the h-scroll track and the
//                       column header park at `actionsRow.stickyTop + the row's MEASURED
//                       height` (the table-level `stickyTop` does not apply — the header
//                       cannot park above a row pinned over it). Measuring here is what
//                       let OrdersTable drop its querySelector('.orders-toolbar') dance.
//   error             — S116: the THIRD body state (Figma `Table Container Error`
//                       5065:8602). { message, detail, onRetry, retryLabel }: two lines
//                       of label/xs in --text-error over a secondary "Reload" button
//                       (lucide refresh-cw). NO icon — the Figma error state has none,
//                       unlike the app-local stopgap it replaces.
//                       Rows are suppressed; the header and the actions row stay, so the
//                       user keeps the table's chrome and context. Ranks BELOW `loading`
//                       (a refetch that is still in flight has not failed yet) and ABOVE
//                       `composeRows` (a failed load is not an invitation to compose).
//                       Owning it here is what stops consumers rendering an error surface
//                       INSTEAD of the table and reaching around the shell.
//   composeRows       — S116: COMPOSE MODE — the table is built by hand, row by row.
//                       { text, actionLabel, onAction } — the fourth body state (Figma
//                       `Fourth Content State`): centered supporting text over a SECONDARY
//                       "+" button, shown ONLY while the table has no rows. The first row
//                       added retires it.
//                       Opting in is manual: a fetched table never falls into this state
//                       just by being empty (that stays the consumer's own empty state).
//                       It does NOT switch on the actions row. Getting from row 1 to row 2
//                       is the consumer's own affordance, wired to any button it likes
//                       (typically one in `actionsRow.trailing`) — adding a row is a FLOW, not
//                       a single callback, and the two are deliberately not coupled here.
//                       Renders as a sibling of the horizontal scroller, so a table wider
//                       than the viewport can't drag the centered block sideways (same
//                       reasoning as `loading`).
//   (column resize stays a TanStack option: enableColumnResizing on the table.)
export default function DataTable({ table, stickyTop = 0, footer, ariaLabel, onCellClick, onRowClick, sortable = false, truncationTooltip = false, loadingRows = false, loading = false, scrollSelectedIntoView = false, actionsRow, composeRows, error, className = '' }) {
  // stickyTop: number (px) or any CSS length expression (string). The sticky reference is
  // the page scroller's CONTENT edge — a padded scroller (e.g. an app shell <main> with
  // padding-top) parks a `top: 0` header padding-top BELOW the visible clip edge, letting
  // rows scroll through the strip above it. Consumers compensate with a negative offset
  // (e.g. `stickyTop="calc(-1 * var(--spacing-8))"`); a measured-toolbar consumer keeps
  // passing its number and stays consistent with its own equally-offset toolbar.
  const toCssLength = (v) => (typeof v === 'number' ? `${v}px` : v)
  const stickyTopValue = toCssLength(stickyTop)
  // `actionsRow.stickyTop` is a VALUE, not a flag: present → the row is sticky and
  // parks at that offset; absent → it scrolls away with the page. `0` is a real
  // offset, so presence is tested with != null, never truthiness.
  //
  // When the row IS sticky it becomes the anchor for the WHOLE sticky band: the
  // h-scroll track and the column header park at `actionsRow.stickyTop + the row's
  // measured height`, and the table-level `stickyTop` doesn't apply (the header
  // cannot park above a row that's pinned over it). Height is MEASURED, not assumed —
  // it follows the trailing buttons, which the consumer owns.
  const actionsStickyTop = actionsRow?.stickyTop != null ? toCssLength(actionsRow.stickyTop) : null
  const actionsRef = useRef(null)
  const [actionsH, setActionsH] = useState(0)
  useLayoutEffect(() => {
    const el = actionsRef.current
    if (actionsStickyTop == null || !el) { setActionsH(0); return }
    const measure = () => setActionsH(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [actionsStickyTop, actionsRow])
  // Either offset may be an expression (e.g. `calc(-1 * var(--spacing-8))`) — nesting
  // calc() is valid CSS, so this composes with any consumer offset.
  const bandTop = actionsStickyTop != null && actionsH
    ? `calc(${actionsStickyTop} + ${actionsH}px)`
    : stickyTopValue
  const headRef = useRef(null)       // head-inner (overflow:hidden); scrollLeft set on it mirrors the body — the split-header trick, NOT a bug
  const wrapRef = useRef(null)       // body horizontal scroller
  const headTableRef = useRef(null)
  const bodyTableRef = useRef(null)
  const [measured, setMeasured] = useState(null) // { headerWidths, bodyWidths, container } — the measure pass

  const rowModel = table.getRowModel()

  // Compose mode (S116): the fourth body state is the zero-row case only — the first
  // row retires it. It does not reach the actions row: that stays independently the
  // consumer's, because getting from row 1 to row 2 is a flow, not a callback.
  const hasRows = rowModel.rows.length > 0
  // Body-state precedence, one place: loading → error → compose → rows. A failed load
  // suppresses rows (stale values under an error message read as current data) and
  // suppresses the compose invitation (nothing is known about what's there yet).
  const showError = Boolean(error) && !loading
  const showCompose = Boolean(composeRows) && !loading && !showError && !hasRows

  // scrollSelectedIntoView (S93): after a selection change, scroll the selected
  // row into the visible band between the sticky header (+12px breathing room)
  // and the bottom boundary. Scrolls the nearest scrollable ancestor.
  const svOpts = scrollSelectedIntoView === true ? {} : scrollSelectedIntoView
  const selectionKey = svOpts ? JSON.stringify(table.getState().rowSelection ?? {}) : ''
  const prevSelectionRef = useRef('')
  useEffect(() => {
    if (!svOpts) return
    const hadSelection = prevSelectionRef.current && prevSelectionRef.current !== '{}'
    prevSelectionRef.current = selectionKey
    if (!selectionKey || selectionKey === '{}') return
    const delay = hadSelection ? (svOpts.switchDelay ?? 50) : (svOpts.freshDelay ?? 600)
    const t = setTimeout(() => {
      const row = bodyTableRef.current?.querySelector('tr[data-selected]')
      if (!row) return
      const scroller = (() => {
        for (let p = row.parentElement; p; p = p.parentElement) {
          const s = getComputedStyle(p)
          if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight) return p
        }
        return null
      })()
      const rect = row.getBoundingClientRect()
      const bottom = svOpts.bottomBoundary?.() ?? window.innerHeight
      const headerBottom = bodyTableRef.current?.closest('.odyssey-data-table')
        ?.querySelector('thead')?.getBoundingClientRect().bottom ?? 0
      const downOverlap = rect.bottom - bottom
      const upOverlap = (headerBottom + 12) - rect.top
      const target = scroller ?? window
      if (downOverlap > 0) target.scrollBy({ top: downOverlap, behavior: 'smooth' })
      else if (upOverlap > 0) target.scrollBy({ top: -upOverlap, behavior: 'smooth' })
      else row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, delay)
    return () => clearTimeout(t)
    // svOpts is a per-render literal; the selection key is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey])
  // Re-measure only when the column SET/ORDER or the rows change — NOT when sizing changes.
  // A resize drag updates the derived widths below without a DOM re-measure (re-measuring
  // per mouse-move was the resize lag). A by-value string keeps this stable across renders.
  const columnSignature = table.getVisibleLeafColumns().map((c) => c.id).join('|')

  // Pass 1: with `measured` null the table renders width:max-content (NOT auto — auto is
  // shrink-to-fit, so a table wider than its container gets its columns COMPRESSED before
  // we can measure, locking in pre-truncated headers). Two captures per column:
  //   headerWidths — the header LABEL element (sort button, or the plain-header wrapper
  //                  span) + cell padding: the guaranteed floor, the full column name
  //                  always shows.
  //   bodyWidths   — the first-row <td> rects; at max-content, table layout makes each
  //                  td the column's NATURAL width (its widest rendered cell).
  // Pass 2 (derived, below) locks min/max'd widths into a shared <colgroup> and hands
  // leftover space to flex columns — recomputed cheaply per render, no re-read on drag.
  useLayoutEffect(() => { setMeasured(null) }, [rowModel.rows, columnSignature])
  useLayoutEffect(() => {
    if (measured) return
    const ths = headTableRef.current?.querySelectorAll('thead th')
    const tds = bodyTableRef.current?.querySelectorAll('tbody tr:first-child td')
    if (!ths?.length || !tds?.length) return
    const headerWidths = Array.from(ths).map((th) => {
      const label = th.querySelector('.odyssey-data-table__sort, .odyssey-data-table__head-label')
      if (!label) return th.getBoundingClientRect().width
      const cs = window.getComputedStyle(th)
      return label.getBoundingClientRect().width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
    })
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

  // Re-measure once the web font is in — a first paint on the fallback font measures
  // NARROWER labels; locking those into the colgroup ellipsizes every header when the
  // real font swaps in. (fonts.ready resolves immediately when already loaded.)
  useEffect(() => {
    let alive = true
    document.fonts?.ready?.then(() => { if (alive) setMeasured(null) })
    return () => { alive = false }
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
  // Per-column drag floor: every column gets the base min; sortable columns add the
  // icon's width (see MIN_COL_WIDTH/SORT_MIN_WIDTH). Applied on drag only.
  const mins = leafCols.map((c) => (showSortButton(sortable, c) ? SORT_MIN_WIDTH : MIN_COL_WIDTH))
  const colWidths = measured
    ? getColWidths(measured.headerWidths, measured.bodyWidths, measured.container, flexFlags, sizes, mins)
    : null

  // Shell-owned resize drag. TanStack's getResizeHandler() captures `getSize()` as the
  // start width — for a never-dragged column that's the injected default 150, NOT the
  // visible measured width, so the column jumped to ~150px the moment a drag began.
  // Instead we start from the rendered colgroup width and write deltas back through the
  // official `setColumnSizing`, so consumer state/persistence stay TanStack-native.
  const [resizingId, setResizingId] = useState(null)
  const startResize = (e, colId, index) => {
    e.preventDefault()
    e.stopPropagation()
    const startW = colWidths?.[index] ?? e.currentTarget.closest('th')?.getBoundingClientRect().width ?? 0
    const startX = e.clientX
    const min = mins[index] ?? MIN_COL_WIDTH
    setResizingId(colId)
    const move = (ev) => {
      const w = Math.max(min, Math.round(startW + ev.clientX - startX))
      table.setColumnSizing((prev) => ({ ...prev, [colId]: w }))
    }
    const up = () => {
      setResizingId(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // One column always drives the sort: when the consumer hasn't seeded a sorting state,
  // seed the first sortable column asc. Works controlled (setSorting → onSortingChange)
  // and uncontrolled (TanStack internal state) alike.
  useEffect(() => {
    if (!sortable || table.getState().sorting?.length) return
    const first = table.getVisibleLeafColumns().find((c) => c.getCanSort?.())
    if (first) table.setSorting?.([{ id: first.id, desc: false }])
  }, [sortable, table]) // eslint-disable-line react-hooks/exhaustive-deps

  // Truncation tooltip (S85, opt-in via `truncationTooltip`): hovering a body cell whose
  // ellipsis hides MORE than one word raises the normalized Tooltip with the full text.
  // The clipped element may be the <td> itself OR an inner wrapper that owns its own
  // overflow — check descendants too. Cells that bring their OWN tooltip (a
  // [data-tooltip-trigger] wrapper — e.g. the complementary-data tooltips on
  // date/status cells) are left alone.
  const [truncTip, setTruncTip] = useState(null) // { text, left, top }
  const onCellEnter = (e) => {
    const td = e.currentTarget
    if (td.querySelector('[data-tooltip-trigger]')) return
    const clipped = [td, ...td.querySelectorAll('*')]
      .find((el) => el.scrollWidth > el.clientWidth + 1)
    if (!clipped) return
    const text = clipped.textContent.trim()
    if (hiddenWordCount(text, clipped.clientWidth, clipped.scrollWidth) < 1) return
    const r = td.getBoundingClientRect()
    setTruncTip({ text, left: Math.max(8, r.left), top: r.top - 6 })
  }
  const onCellLeave = () => setTruncTip(null)

  const totalWidth = colWidths ? colWidths.reduce((a, b) => a + b, 0) : 0
  const tableStyle = colWidths
    ? { tableLayout: 'fixed', width: '100%', minWidth: `${totalWidth}px` }
    : { width: 'max-content' } // measure pass — never shrink-to-fit (see the measure effect)
  const colgroup = colWidths && (
    <colgroup>
      {colWidths.map((w, i) => <col key={i} style={{ width: `${w}px` }} />)}
    </colgroup>
  )

  return (
    <div className={`odyssey-data-table${onCellClick ? ' odyssey-data-table--cell-clickable' : ''}${className ? ` ${className}` : ''}`}>
      {/* Table Actions (S116): a sibling ABOVE the card, on the page canvas — NOT a
          row inside <table>, so it never participates in the horizontal scroll and
          never needs a colSpan. `sticky` decides only whether it leaves the VERTICAL
          scroll. When stuck it needs the canvas background, or rows scrolling beneath
          would show through (the same reason .odyssey-data-table__head paints one). */}
      {actionsRow && (
        <div
          ref={actionsRef}
          className={`odyssey-data-table__actions${actionsStickyTop != null ? ' odyssey-data-table__actions--sticky' : ''}`}
          style={actionsStickyTop != null ? { top: actionsStickyTop } : undefined}
        >
          <span className="odyssey-data-table__actions-count text-label-sm-regular">
            {itemCountLabel(actionsRow.count)}
          </span>
          {actionsRow.trailing && (
            <div className="odyssey-data-table__actions-trail">{actionsRow.trailing}</div>
          )}
        </div>
      )}
      {/* Horizontal scrollbar: a sibling ABOVE the card so it's never clipped by
          the card's border-radius + overflow:clip. Sticky at stickyTop; the card's
          header shifts down +8px while it's present. */}
      {hbar && (
        <div
          ref={trackRef}
          className="odyssey-data-table__hscroll"
          style={{ top: bandTop }}
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
          style={{ top: hbar ? `calc(${bandTop} + 8px)` : bandTop }}
        >
          <div className="odyssey-data-table__head-inner" ref={headRef}>
            <table className="odyssey-table" ref={headTableRef} style={tableStyle}>
              {colgroup}
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header, hi) => {
                      const meta = header.column.columnDef.meta
                      // The LAST resizable column (next column is the sticky-right action
                      // column, or there is none) gets an inset grip — flush at right:0 it
                      // sat under / hard against the sticky column's edge shadow.
                      const nextHeader = hg.headers[hi + 1]
                      const edgeGrip = !nextHeader || nextHeader.column.columnDef.meta?.sticky === 'right'
                      const headerLabel = typeof header.column.columnDef.header === 'string'
                        ? header.column.columnDef.header
                        : header.column.id
                      const sortBtn = showSortButton(sortable, header.column)
                      const sorted = sortBtn ? header.column.getIsSorted() : false
                      return (
                        <th
                          key={header.id}
                          className={headClassName(meta, meta?.sticky === 'right')}
                          aria-sort={sortBtn ? ariaSortValue(sorted) : undefined}
                        >
                          {sortBtn ? (
                            <button
                              type="button"
                              className="odyssey-data-table__sort"
                              // asc ↔ desc only — never back to unsorted. One column always
                              // drives the sort (getToggleSortingHandler's third "off" step
                              // would leave the table driverless); clicking another column
                              // moves the driver there (asc first).
                              onClick={() => header.column.toggleSorting(sorted === 'asc')}
                              aria-label={`Sort by ${headerLabel}`}
                            >
                              <span className="odyssey-data-table__sort-label">
                                {renderCell(header.column.columnDef.header, header.getContext())}
                              </span>
                              <SortIcon sorted={sorted} />
                            </button>
                          ) : (
                            // Wrapper span = the measure hook for the header-label
                            // default width (the sort button plays this role on
                            // sortable columns).
                            <span className="odyssey-data-table__head-label">
                              {renderCell(header.column.columnDef.header, header.getContext())}
                            </span>
                          )}
                          {showResizeGrip(table, header.column) && (
                            <span
                              className={`odyssey-data-table__resize-grip${edgeGrip ? ' odyssey-data-table__resize-grip--edge' : ''}${resizingId === header.column.id ? ' is-resizing' : ''}`}
                              onPointerDown={(e) => startResize(e, header.column.id, header.index)}
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
        <div
          className={`odyssey-data-table__body${loading ? ' odyssey-data-table__body--loading' : ''}`}
          ref={wrapRef}
        >
          {/* loading: whole-table mode — centered spinner scoped to the BODY area
              only (a sibling of the head, never overlapping it), no rows rendered
              underneath (nothing to show yet on first mount). The animated ring
              alone, no text (user direction, GS-21 era). */}
          {loading && (
            <div className="odyssey-data-table__loading">
              <Spinner size={32} />
            </div>
          )}
          <table className="odyssey-table" ref={bodyTableRef} style={tableStyle} aria-label={ariaLabel}>
            {colgroup}
            <tbody>
              {/* loading (whole-table mode): no rows — the card-level Spinner
                  above is the only loading signal while nothing is fetched yet.
                  error: rows are suppressed too — stale values sitting under an
                  error message read as current data. */}
              {!loading && !showError && rowModel.rows.map((row) => (
                <tr
                  key={row.id}
                  data-selected={row.getIsSelected() || undefined}
                  onClick={onRowClick
                    ? (e) => {
                        // Interactive elements keep their native behavior (same
                        // rule as cell clicks).
                        const t = e.target
                        if (t instanceof Element && t.closest(INTERACTIVE_SELECTOR)) return
                        onRowClick(row)
                      }
                    : undefined}
                >
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
                        onMouseEnter={truncationTooltip ? onCellEnter : undefined}
                        onMouseLeave={truncationTooltip ? onCellLeave : undefined}
                        onClick={(onCellClick || forwardClick)
                          ? (e) => {
                              const action = resolveCellClick(e.target, e.currentTarget, forwardClick)
                              if (action.type === 'forward') action.el.click()
                              else if (action.type === 'cell') onCellClick?.(cell, row)
                            }
                          : undefined}
                      >
                        {/* loadingRows feature switch (S93, restored S107): while
                            the consumer shows stale placeholder rows for a new
                            page/filter (e.g. TanStack Query keepPreviousData),
                            DATA cells (accessor columns) render "Loading…" instead
                            of the stale value; display columns (select/actions)
                            keep rendering. */}
                        {loadingRows && cell.column.accessorFn
                          ? <span className="odyssey-table__cell-loading">Loading…</span>
                          : renderCell(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* composeRows (S116): the fourth body state — compose mode with nothing built
            yet. A sibling of the horizontal scroller, not a row inside it: centered
            content inside the scroller would slide out of view on a wide table. Gone
            the moment a row exists, and never shown during `loading`, where the
            Spinner is the single signal. */}
        {/* error (S116): the third body state — Figma `Table Container Error`.
            Same block geometry as compose, inside the card and outside the
            horizontal scroller. role="alert" so it is announced, not just seen. */}
        {showError && (
          <div className="odyssey-data-table__error" role="alert">
            {error.message && (
              <p className="odyssey-data-table__error-text text-label-xs-regular">{error.message}</p>
            )}
            {error.detail && (
              <p className="odyssey-data-table__error-text text-label-xs-regular">{error.detail}</p>
            )}
            {error.onRetry && (
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw {...ICON_MD} aria-hidden="true" />}
                onClick={error.onRetry}
              >
                {error.retryLabel ?? 'Reload'}
              </Button>
            )}
          </div>
        )}
        {showCompose && (
          <div className="odyssey-data-table__compose">
            {composeRows.text && (
              <p className="odyssey-data-table__compose-text text-label-sm-regular">{composeRows.text}</p>
            )}
            {composeRows.actionLabel && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus {...ICON_MD} />}
                onClick={composeRows.onAction}
              >
                {composeRows.actionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
      {footer && <div className="odyssey-data-table__footer">{footer}</div>}
      {truncTip && createPortal(
        <div
          style={{
            position: 'fixed',
            left: truncTip.left,
            top: truncTip.top,
            transform: 'translateY(-100%)',
            width: 'max-content',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <Tooltip groups={[{ content: truncTip.text }]} />
        </div>,
        document.body
      )}
    </div>
  )
}
