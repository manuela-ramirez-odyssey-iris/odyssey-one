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
