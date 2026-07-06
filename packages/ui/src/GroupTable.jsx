import { useId, useState } from 'react'
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
 * @param showColumnHeaders  bool (default true) — render the column-header row.
 *                       (Figma: Show Column Headers BOOLEAN on the master.)
 * @param className      extra class(es) on the root scroll element
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
  showColumnHeaders = true,
  className = '',
  ...rest
}) {
  const uid = useId()
  const controlled = expanded !== undefined
  const [internal, setInternal] = useState({})

  const isOpen = (id) =>
    controlled ? !!expanded[id] : isGroupExpanded(internal, defaultExpanded, id)

  const toggle = (id) => {
    const next = !isOpen(id)
    if (!controlled) setInternal((prev) => ({ ...prev, [id]: next }))
    onToggle?.(id, next)
  }

  const rootClasses = [
    'odyssey-group-table',
    !striped && 'odyssey-group-table--flat',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClasses} {...rest}>
      <table className="odyssey-group-table__table">
        {showColumnHeaders && (
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={alignClass(col.align) || undefined}
                  style={col.width != null ? { width: col.width } : undefined}
                >
                  <span className="odyssey-group-table__th-label">{col.label}</span>
                </th>
              ))}
            </tr>
          </thead>
        )}

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
                {columns.map((col, colIdx) =>
                  colIdx === 0 ? (
                    <td key={col.key}>
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
                  ) : (
                    <td
                      key={col.key}
                      className={[
                        'odyssey-group-table__group-value',
                        alignClass(col.align) || undefined,
                      ].filter(Boolean).join(' ') || undefined}
                    >
                      {groupHeaderValue(group, col.key)}
                    </td>
                  )
                )}
              </tr>

              {open &&
                group.rows.map((row, i) => (
                  <tr key={i} className="odyssey-group-table__row">
                    {columns.map((col) => (
                      <td key={col.key} className={alignClass(col.align) || undefined}>
                        {renderCell ? renderCell(row, col) : row[col.key] ?? '—'}
                      </td>
                    ))}
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
            </tr>
          </tfoot>
        )}
      </table>
    </div>
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
