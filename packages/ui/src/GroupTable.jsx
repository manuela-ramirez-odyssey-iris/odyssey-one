import { useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * GroupTable — the presentational grouped table for detail pane content
 * (ShipmentsBar panes: Product, Cost Allocation Compare AP/AR, …).
 *
 * BOUNDARY vs DataTable: DataTable is the interactive TanStack grid — split
 * sticky header, sort/resize/reorder/paginate/select, engine-driven.
 * GroupTable is READ-ONLY presentation: a plain column-header row, one
 * collapsible GROUP HEADER ROW per group (chevron + bold group id, the full
 * row is the toggle), child rows as light-gray striped bands, an optional
 * bold footer row (e.g. TOTAL). No TanStack, no engine, no interactivity
 * beyond expand/collapse. If you need sorting/pagination/selection, use
 * DataTable.
 *
 * The root owns horizontal scroll (columns overflow → the last column clips
 * and the table scrolls); the consumer's card owns the white surface.
 *
 * Expansion is controllable for "Expand All" consumers: pass `expanded`
 * (map of groupId → bool; missing key = collapsed) + `onToggle` to control
 * it, or omit `expanded` for uncontrolled state seeded by `defaultExpanded`.
 *
 * @param columns        [{ key, label, align?: 'left'|'right'|'center', width?: number|string }]
 * @param groups         [{ id, label, rows: object[], values?: object }] — one collapsible band per group.
 *                       `values` is an optional object keyed by col.key: when present those values appear
 *                       on the group header row in the matching columns (semibold, col.align respected),
 *                       visible in both expanded AND collapsed state (e.g. per-order AP/AR/Diff totals
 *                       in the Compare AP/AR flavor). Absent = label-only header (Product tab style).
 * @param renderCell     (row, col) => node — optional cell renderer for CHILD rows;
 *                       default renders `row[col.key] ?? '—'`
 * @param footerRow      object keyed by col.key (values may be nodes) — rendered medium-weight
 *                       (the TOTAL row). Pass `footerRow` to show it; omit to hide it. Values may be
 *                       nodes (e.g. a styled DiffCell). Not passed through renderCell.
 * @param expanded       map of groupId → bool (controlled; missing = collapsed)
 * @param defaultExpanded bool — uncontrolled initial state for every group (default true)
 * @param onToggle       (groupId, next: bool) — fires on any group toggle
 * @param striped        bool (default true) — child rows as contiguous gray bands
 *                       with 1px --border-subtle hairlines (no white gaps);
 *                       false = white rows with hairlines
 * @param className      extra class(es) on the root scroll element
 *
 * ── NESTED-TABLE FLAVOR (`detailColumns`) ──────────────────────────────────
 * Pass `detailColumns` to switch what an expanded group reveals: instead of
 * child rows sharing `columns`, each expanded group reveals a SECOND, FULLY
 * INDEPENDENT TABLE beneath it — its own header row, its own column widths,
 * deliberately NOT aligned to the outer columns. This is the vertical
 * alternative to two tables side by side (which gets too wide).
 *
 * The distinction that matters when reading this component:
 *   • Rows flavor  — the per-group row is a GROUP HEADER: a bold group id
 *                    spanning the lead column + optional sparse summary
 *                    `values` at the trail.
 *   • Nested flavor — the per-group row is a DATA ROW: one value per outer
 *                    column (via `values`), with the disclosure chevron simply
 *                    living in the lead cell. It is NOT a header; the table's
 *                    own `columns` header row is its header.
 *
 * @param detailColumns  [{ key, label, align?, width? }] — the nested table's OWN columns.
 *                       Presence of this prop is what selects the nested flavor.
 * @param renderDetailCell (row, col) => node — optional cell renderer for nested rows
 *                       (parallel to `renderCell`); default renders `row[col.key] ?? '--'`
 *                       Per-group `detailNote` renders as a full-width WRAPPING row at the
 *                       bottom of the nested table — for the one long free-text field that
 *                       must not become a column. Pass `{ label, value }` and the component
 *                       renders (and styles) the label itself; a node is accepted as an
 *                       escape hatch. No internal class names required either way.
 * @param detailScroll   bool (nested flavor only, default false) — give each nested
 *                       table its NATURAL width with its own horizontal scrollbar
 *                       inside the band, instead of compressing to the outer
 *                       table's width. For nested tables with many columns
 *                       (Dropped Carrier's 14). Off, the nested table fills the
 *                       band and only scrolls if content genuinely cannot fit.
 * @param stickyActions  bool — render a pinned trailing action column (sticky right),
 *                       fed by `actionsHeader` (header cell) + `group.action` (per row)
 * @param actionsHeader  node — content of the pinned column's header cell (e.g. a
 *                       column-arrange Button)
 */
export default function GroupTable({
  columns = [],
  groups = [],
  renderCell,
  footerRow,
  expanded,
  defaultExpanded = true,
  onToggle,
  striped = true,
  className = '',
  detailColumns,
  renderDetailCell,
  detailScroll = false,
  stickyActions = false,
  actionsHeader,
  ...rest
}) {
  const uid = useId()
  const controlled = expanded !== undefined
  const [internal, setInternal] = useState({})

  // The pinned first column's shadow is a scroll AFFORDANCE, not decoration: it
  // may only appear once content is actually hidden behind the column. At
  // scrollLeft 0 there is nothing underneath, so no shadow.
  const rootRef = useRef(null)
  const [scrolledX, setScrolledX] = useState(false)
  const handleScroll = (e) => {
    const next = e.currentTarget.scrollLeft > 0
    setScrolledX((prev) => (prev === next ? prev : next))
  }

  // The whole 68px action cell is the hit area, not just the ~28px control
  // inside it. Clicks land on the cell and are forwarded to the control —
  // except when the real control (or something interactive inside it) was hit
  // directly, which would otherwise fire it twice.
  const handleActionCellClick = (e) => {
    e.stopPropagation() // never toggles the row
    if (e.target.closest('button, a, input, select, [role="menuitem"]')) return
    e.currentTarget.querySelector('button, a')?.click()
  }

  const isOpen = (id) =>
    controlled ? !!expanded[id] : isGroupExpanded(internal, defaultExpanded, id)

  const toggle = (id) => {
    const next = !isOpen(id)
    if (!controlled) setInternal((prev) => ({ ...prev, [id]: next }))
    onToggle?.(id, next)
  }

  // Presence of detailColumns selects the nested-table flavor — see the header
  // comment for why the group row means something different in each.
  const nested = Array.isArray(detailColumns) && detailColumns.length > 0
  const spanAll = totalColumnCount(columns, stickyActions)
  // Nested flavor's group row IS a data row (one value per column), so it keeps
  // the column grid; only the rows flavor merges its label cell.
  const { labelSpan, valueColumns } = nested
    ? { labelSpan: 1, valueColumns: columns.slice(1) }
    : splitHeaderRow(columns)

  const rootClasses = [
    'odyssey-group-table',
    !striped && 'odyssey-group-table--flat',
    nested && 'odyssey-group-table--nested',
    nested && detailScroll && 'odyssey-group-table--detail-scroll',
    stickyActions && 'odyssey-group-table--sticky-actions',
    scrolledX && 'odyssey-group-table--scrolled-x',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClasses} ref={rootRef} onScroll={handleScroll} {...rest}>
      <table className="odyssey-group-table__table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={alignClass(col.align) || undefined}
                style={col.width != null ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
            {stickyActions && (
              <th scope="col" className="odyssey-group-table__cell--sticky-right">
                {actionsHeader}
              </th>
            )}
          </tr>
        </thead>

        {groups.map((group) => {
          const open = isOpen(group.id)
          const bodyId = `${uid}-${group.id}`
          return (
            <tbody key={group.id} id={bodyId}>
              {/* Group header row — the WHOLE row toggles; the button carries
                  the a11y contract (focus, Enter/Space, aria-expanded). Button
                  clicks stop propagation so activation toggles exactly once.
                  When group.values is present the non-first columns render the
                  matching value (semibold, col.align) — visible collapsed + expanded. */}
              <tr
                className="odyssey-group-table__group-row"
                onClick={() => toggle(group.id)}
              >
                {/* The label is ONE merged cell (see splitHeaderRow) — the
                    header row does not follow the body's column grid, so a
                    narrow lead column isn't stretched to fit the group name. */}
                <td colSpan={labelSpan}>
                  <button
                    type="button"
                    className="odyssey-group-table__group-toggle"
                    aria-expanded={open}
                    aria-controls={bodyId}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(group.id)
                    }}
                  >
                    <ChevronDown
                      {...ICON_MD}
                      className="odyssey-group-table__chevron"
                      aria-hidden="true"
                    />
                    {group.label}
                  </button>
                </td>
                {valueColumns.map((col) => (
                  <td
                    key={col.key}
                    className={[
                      'odyssey-group-table__group-value',
                      alignClass(col.align) || undefined,
                    ].filter(Boolean).join(' ') || undefined}
                  >
                    {groupHeaderValue(group, col.key)}
                  </td>
                ))}
                {stickyActions && (
                  /* The action is its own affordance — clicking it must not
                     toggle the row the way the rest of the row does. The TONE
                     lives on the cell (not the slotted node) because the hover
                     fill is the cell's own background — a slotted node cannot
                     paint its ancestor. */
                  <td
                    className={[
                      'odyssey-group-table__cell--sticky-right',
                      actionToneClass(group.actionTone),
                    ].filter(Boolean).join(' ')}
                    onClick={handleActionCellClick}
                  >
                    {group.action}
                  </td>
                )}
              </tr>

              {open && nested && (
                /* The second table. One full-width cell hosts it, so its columns
                   are free of the outer table's column widths entirely — and
                   that includes the action lane: the nested table is an
                   INDEPENDENT table that happens to be rendered inside a row,
                   not a continuation of the outer one, so it is not bound by
                   the outer table's column boundaries (user, 2026-08-17).

                   This deliberately reverses the 2026-08-17 narrowing, which
                   reserved the action lane on the detail row so the pinned
                   column stayed opaque top to bottom. The cost of that was
                   ~158px of unusable width under every expanded row while the
                   nested table crowded 14 columns into what was left. The
                   trade is known and accepted: with no pinned cell here, the
                   nested table's content occupies that lane, so on a
                   horizontally scrolled table the pinned action column has a
                   gap at each expanded row. Reserving the lane again is a
                   one-line revert if that reads worse in practice. */
                <tr className="odyssey-group-table__detail-row">
                  <td colSpan={spanAll}>
                    {/* The scroller isolates the nested table from the outer
                        table's width negotiation (width:0 zeroes its sizing
                        contribution; min-width:100% stretches it back to the
                        band). If the inner table outgrows the band — always,
                        with `detailScroll`; only when content forces it,
                        without — it scrolls HERE, independently, so the outer
                        geometry and the pinned action column never move. */}
                    <div className="odyssey-group-table__detail-scroller">
                    <table className="odyssey-group-table__detail">
                      <thead>
                        <tr>
                          {detailColumns.map((col) => (
                            <th
                              key={col.key}
                              scope="col"
                              className={alignClass(col.align) || undefined}
                              style={col.width != null ? { width: col.width } : undefined}
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(group.detailRows ?? []).map((row, i) => (
                          <tr key={i}>
                            {detailColumns.map((col) => (
                              <td key={col.key} className={alignClass(col.align) || undefined}>
                                {renderDetailCell
                                  ? renderDetailCell(row, col)
                                  : row[col.key] ?? '--'}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {group.detailNote && (
                          /* Full-width note row UNDER the nested data row — the escape
                             hatch for one long free-text field (a reason description)
                             that as a column would need ~360px and push every other
                             column off the scroll extent (user, 2026-08-17). It wraps;
                             every other cell in this table stays nowrap. */
                          <tr className="odyssey-group-table__detail-note">
                            <td colSpan={detailColumns.length}>
                              {detailNoteContent(group.detailNote)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    </div>
                  </td>
                  {/* No trailing pinned cell: the host cell above spans the
                      action lane too, so the nested table gets the full width.
                      See its comment for the trade-off. */}
                </tr>
              )}

              {open && !nested &&
                (group.rows ?? []).map((row, i) => (
                  <tr key={i} className="odyssey-group-table__row">
                    {columns.map((col) => (
                      <td key={col.key} className={alignClass(col.align) || undefined}>
                        {renderCell ? renderCell(row, col) : row[col.key] ?? '—'}
                      </td>
                    ))}
                    {stickyActions && <td className="odyssey-group-table__cell--sticky-right" />}
                  </tr>
                ))}
            </tbody>
          )
        })}

        {footerRow && (
          <tfoot>
            <tr className="odyssey-group-table__footer-row">
              {columns.map((col) => (
                <td key={col.key} className={alignClass(col.align) || undefined}>
                  {footerRow[col.key] ?? ''}
                </td>
              ))}
              {stickyActions && <td className="odyssey-group-table__cell--sticky-right" />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

/**
 * Content of a `group.detailNote` row.
 *
 * `{ label, value }` is the SUPPORTED shape: the component owns the label markup
 * and its styling, so a consumer never has to reach for an internal class name to
 * get the standard look (user, 2026-08-17 — a component whose only route to a
 * feature is hand-written internals is one every downstream team has to hack).
 * A plain node still passes through untouched for the cases the pair can't say.
 *
 * @param {{label?: node, value?: node}|node} note
 * @returns {node}
 */
export function detailNoteContent(note) {
  if (!note || typeof note !== 'object' || Array.isArray(note) || note.$$typeof) return note
  if (!('label' in note) && !('value' in note)) return note
  return (
    <>
      {note.label != null && (
        <span className="odyssey-group-table__detail-note-label">{note.label}</span>
      )}
      {note.value}
    </>
  )
}

/** Cell alignment class for a column's `align` value ('' for default left). */
export function alignClass(align) {
  if (align === 'right') return 'odyssey-group-table__cell--right'
  if (align === 'center') return 'odyssey-group-table__cell--center'
  return ''
}

/** Uncontrolled expansion resolution: a per-group override wins, otherwise
 *  every group falls back to `defaultExpanded`. */
export function isGroupExpanded(overrides, defaultExpanded, id) {
  return overrides[id] ?? !!defaultExpanded
}

/**
 * Resolves the value to render in a non-first column of a group header row.
 * Returns `group.values[colKey]` when `group.values` is present and the key
 * exists; otherwise returns `''` (empty — label-only header style).
 *
 * @param {object} group   — the group object (may have an optional `values` map)
 * @param {string} colKey  — the column key to look up
 * @returns {*} the value (string, node, …) or '' when absent
 */
export function groupHeaderValue(group, colKey) {
  return group.values?.[colKey] ?? ''
}

/**
 * How many TRAILING columns a group header row reserves for `values`.
 * Per the Figma HeaderRow master the group label is ONE merged cell spanning
 * everything before them — the header row deliberately does NOT follow the
 * body's column grid. Getting this wrong is visible: a narrow lead column (a
 * checkbox, say) gets stretched to fit the group label (user, S112).
 */
export const HEADER_VALUE_COLUMNS = 3

/**
 * Split `columns` into [labelSpan, valueColumns] for a group header row.
 * Clamped so a table with ≤ HEADER_VALUE_COLUMNS columns still renders a label
 * cell instead of colSpan={0}.
 *
 * @param {Array} columns — the outer column definitions
 * @returns {{ labelSpan: number, valueColumns: Array }}
 */
export function splitHeaderRow(columns) {
  const labelSpan = Math.max(1, columns.length - HEADER_VALUE_COLUMNS)
  return { labelSpan, valueColumns: columns.slice(labelSpan) }
}

/**
 * Total rendered column count — `columns` plus the pinned action column when
 * `stickyActions` is on. This is the `colSpan` the nested table's host cell
 * needs: get it wrong and the gray band stops short of (or overruns) the
 * pinned column.
 *
 * @param {Array}   columns       — the outer column definitions
 * @param {boolean} stickyActions — whether the pinned trailing column renders
 * @returns {number}
 */
export function totalColumnCount(columns = [], stickyActions = false) {
  return columns.length + (stickyActions ? 1 : 0)
}

/** The tones a pinned action cell may carry. Default (no tone) stays neutral —
 *  the cell paints nothing and the slotted control keeps its own hover. */
export const ACTION_TONES = ['danger', 'warning', 'success', 'info']

/**
 * Modifier class for a group's `actionTone`. Returns '' for no tone and for any
 * value outside the vocabulary — an unknown tone degrades to neutral rather
 * than emitting a class with no styles behind it.
 *
 * @param {string} [tone] — 'danger' | 'warning' | 'success' | 'info'
 * @returns {string}
 */
export function actionToneClass(tone) {
  return ACTION_TONES.includes(tone) ? `odyssey-group-table__cell--tone-${tone}` : ''
}
