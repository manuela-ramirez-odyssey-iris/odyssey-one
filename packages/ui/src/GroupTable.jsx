import { useId, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import Button from './Button.jsx'

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
 *                       Presence of this prop (or `detailSections`) selects the nested flavor.
 *                       Sugar for a single `detailSections` entry; both cannot be passed.
 * @param detailSections [{ key, columns, note?, scroll?, renderCell? }] — N SIBLING nested
 *                       tables, stacked, each one genuinely independent: its own columns, its
 *                       own widths, its own horizontal scrollbar, separated from the next by a
 *                       hairline. Use it when the fields under a row belong to two or more
 *                       NAMED groups that must not read as one flat run of columns (Dropped
 *                       Carrier's Routing Details + Volume Commitment). Repeat freely — the
 *                       count is the consumer's, the Figma master shows two only because two
 *                       is what establishes the pattern (user, 2026-08-26).
 *                         • `note: true`  — this section hosts the single `group.detailNote`
 *                                           shorthand (default: the first section). For a note
 *                                           on EVERY sibling pass `group.detailNotes` instead,
 *                                           a map keyed by section key.
 *                         • `scroll`      — per-section override of `detailScroll`, for the case
 *                                           where one sibling genuinely differs. Omit and the
 *                                           section follows `detailScroll` like any other
 *                                           nested table.
 *                         • `renderCell`  — per-section override of `renderDetailCell`.
 *                       Every section reads the SAME `group.detailRows`; a section is a column
 *                       set OVER those rows, not its own data. Actions never appear here —
 *                       `group.action` belongs to the group row alone.
 * @param renderDetailCell (row, col) => node — optional cell renderer for nested rows
 *                       (parallel to `renderCell`); default renders `row[col.key] ?? '--'`
 *                       Per-group `detailNote` renders as a full-width WRAPPING row at the
 *                       bottom of its section — for the one long free-text field that
 *                       must not become a column. Pass `{ label, value }` and the component
 *                       renders (and styles) the label itself; a node is accepted as an
 *                       escape hatch. No internal class names required either way.
 *                       Long values clamp to `noteLines` with a Show more/less toggle.
 * @param noteLines      number (default 3) — lines a `detailNote` clamps to before the
 *                       toggle appears. 0 disables the clamp entirely.
 * @param detailScroll   bool (nested flavor, default false) — give each nested table its
 *                       NATURAL width with its own horizontal scrollbar inside its
 *                       band, instead of compressing to the outer table's width.
 *                       For nested tables with many columns. Off, the nested table
 *                       fills the band and only scrolls if content genuinely cannot fit.
 *                       ONE prop, same meaning and same default in both flavors: with
 *                       `detailSections` it applies to every sibling, each scrolling in
 *                       its own band, so a wide section never drags a narrow neighbour.
 *                       Per-section `scroll` overrides it (user, 2026-08-26).
 * @param stickyActions  bool — render a pinned trailing action column (sticky right),
 *                       fed by `actionsHeader` (header cell) + `group.action` (per row)
 * @param actionsHeader  node — content of the pinned column's header cell (e.g. a
 *                       column-arrange Button)
 * @param header         { title, icon?, trail? } — optional 48px strip ABOVE the column-header
 *                       row (Figma 4183:773 "Header" frame): icon + bold title on the left, an
 *                       empty trailing slot on the right. Presence renders the strip; omit it
 *                       (the default) and the table renders exactly as before — this is a
 *                       released component, so no `header` must stay byte-identical.
 *                       `icon` is a caller-supplied node (e.g. a lucide element) — never
 *                       hardcoded here. The table is `aria-labelledby` the title.
 */
/**
 * The nested band's wrapper. Three states, one invariant — the band must NEVER
 * overflow the outer table, because overflow extends the root scroller past
 * the table and a sticky cell cannot leave its own table: the pinned action
 * column visibly slides away (the 2026-08-17 DSM bug).
 *
 *  • detailScroll     — always the scroller: inner table at natural width,
 *                       scrolled independently inside the band.
 *  • off, fits/grows  — layout-neutral div; the inner table fills the band and
 *                       rides the outer scroll (the approved default look).
 *  • off, overflowing — engines differ on whether a colSpan cell's nested
 *                       table GROWS the outer table or bleeds past it; when
 *                       this engine bleeds, the measurement flips the scroller
 *                       class on and the excess scrolls internally instead.
 *
 * jsdom measures 0/0 everywhere, so tests always see the neutral state —
 * the self-healing branch is browser-verified only.
 */
function DetailBand({ detailScroll, className, children }) {
  const ref = useRef(null)
  const [contain, setContain] = useState(false)
  useLayoutEffect(() => {
    if (detailScroll) return
    const el = ref.current
    if (!el) return
    const check = () => setContain(el.scrollWidth > el.clientWidth + 1)
    check()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [detailScroll])
  const classes = [
    (detailScroll || contain) && 'odyssey-group-table__detail-scroller',
    // Independent h-scroll is TWO things, and the wrapper is only one of them:
    // this modifier is what lets the inner table take its natural width. Without
    // it the table stays width:100%, compresses to the band, and never overflows
    // — so the scroller wrapper has nothing to scroll (found by the user,
    // 2026-08-26, after sections shipped with only half the mechanism).
    // Deliberately NOT applied for the self-healing `contain` case: there the
    // table is already overflowing on its own and must not be widened further.
    detailScroll && 'odyssey-group-table__detail-section--scroll',
    className,
  ].filter(Boolean).join(' ')
  return (
    <div ref={ref} className={classes || undefined}>
      {children}
    </div>
  )
}

/**
 * A `detailNote`'s body: the one long free-text field, clamped to `lines` with a
 * Show more / Show less toggle.
 *
 * The toggle only renders when the text ACTUALLY overflows — a one-line
 * description offering "Show more" is a lie. Overflow is measured with the same
 * ResizeObserver idiom DetailBand uses.
 *
 * JSDOM CEILING: jsdom reports scrollHeight/clientHeight as 0, so `overflowing`
 * is always false there and the toggle never renders in tests unless the test
 * stubs those properties (GroupTable.dom.test.jsx does exactly that). The clamp
 * itself is a CSS line-clamp, equally invisible to jsdom. Both are
 * browser-verified.
 */
function DetailNote({ note, lines }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const clamped = lines > 0 && !open

  useLayoutEffect(() => {
    if (!(lines > 0)) return
    const el = ref.current
    if (!el) return
    // Measured while clamped: once open, scrollHeight === clientHeight and the
    // toggle would vanish mid-interaction. `open` is deliberately NOT a dep.
    const check = () => {
      if (ref.current && !open) setOverflowing(ref.current.scrollHeight > ref.current.clientHeight + 1)
    }
    check()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [lines, note])

  return (
    /* The note must FILL the band without SIZING it. Under `width: max-content`
       a table measures its content unwrapped, so one long sentence defined the
       table's width (measured: 1305px from a 573px table) and the band scrolled
       for the wrong reason — the note row exists precisely to stop long text
       eating horizontal space. `width: 0` zeroes its max-content contribution,
       `min-width: 100%` stretches it back to the band. Same idiom
       __detail-scroller uses on the table itself. */
    <div className="odyssey-group-table__detail-note-body">
      <div
        ref={ref}
        className={clamped ? 'odyssey-group-table__detail-note-body--clamped' : undefined}
        style={clamped ? { WebkitLineClamp: lines } : undefined}
      >
        {detailNoteContent(note)}
      </div>
      {overflowing && (
        <Button
          variant="link"
          size="sm"
          className="odyssey-group-table__detail-note-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Show less' : 'Show more'}
        </Button>
      )}
    </div>
  )
}

/**
 * The trailing SLACK column of a nested table.
 *
 * Without it, a nested table narrower than its band stretches its real columns
 * to fill — a 3-column section beside a 6-column sibling ended up with columns
 * at 286/343/475px for content needing 78/93/129, values drifting to the middle
 * of an empty cell (user, 2026-08-26). `width: 100%` here makes THIS cell absorb
 * every spare pixel instead, so the real columns collapse to their content and
 * the values stay left, aligned with the sibling above.
 *
 * `padding: 0` (CSS) lets it vanish entirely when there is no slack: measured at
 * 0px on a table that overflows its band, 803px on one that does not.
 *
 * aria-hidden because it carries nothing — it is spacing, not a column, and a
 * screen reader announcing an empty trailing header is noise.
 */
function FillerCell({ head = false }) {
  const props = { className: 'odyssey-group-table__detail-filler', 'aria-hidden': 'true' }
  return head ? <th {...props} /> : <td {...props} />
}

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
  detailSections,
  renderDetailCell,
  noteLines = 3,
  detailScroll = false,
  stickyActions = false,
  actionsHeader,
  header,
  ...rest
}) {
  const uid = useId()
  const headerTitleId = `${uid}-header-title`
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

  // ONE list of sections drives the render, whichever prop the consumer used —
  // `detailColumns` is sugar for a single section, not a parallel code path.
  const sections = normalizeDetailSections({ detailColumns, detailSections, detailScroll })
  // Presence of either prop selects the nested-table flavor — see the header
  // comment for why the group row means something different in each.
  const nested = sections.length > 0
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
    // A STATE HOOK only — the scrolling behaviour is keyed on the section (see
    // `__detail-section--scroll`), because a per-section override means a root
    // class cannot say "this one but not that one".
    nested && detailScroll && 'odyssey-group-table--detail-scroll',
    stickyActions && 'odyssey-group-table--sticky-actions',
    scrolledX && 'odyssey-group-table--scrolled-x',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClasses} ref={rootRef} onScroll={handleScroll} {...rest}>
      {header && (
        /* Lives OUTSIDE <table> but INSIDE the root scroller, as a sticky-left
           sibling of the table — not a <thead> row, since it spans the full
           table width regardless of column count and must not scroll away
           with the columns (sticky, like the pinned action column). Putting
           it inside the root div (rather than wrapping GroupTable in another
           div) keeps it in the same border/radius box the docstring commits
           to, with zero effect on the sticky-actions column or the table's
           own horizontal scroll — the table element is untouched. */
        <div className="odyssey-group-table__header">
          {header.icon}
          <span id={headerTitleId} className="odyssey-group-table__header-title text-label-base-semibold">
            {header.title}
          </span>
          <span className="odyssey-group-table__header-trail">{header.trail}</span>
        </div>
      )}
      <table
        className="odyssey-group-table__table"
        aria-labelledby={header ? headerTitleId : undefined}
      >
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
          const canExpand = isGroupExpandable(group, { detailColumns, detailSections })
          const open = canExpand && isOpen(group.id)
          const bodyId = `${uid}-${group.id}`
          return (
            <tbody key={group.id} id={bodyId}>
              {/* Group header row — the WHOLE row toggles; the button carries
                  the a11y contract (focus, Enter/Space, aria-expanded). Button
                  clicks stop propagation so activation toggles exactly once.
                  When group.values is present the non-first columns render the
                  matching value (semibold, col.align) — visible collapsed + expanded.
                  A group with nothing to reveal (see isGroupExpandable) renders
                  the label as a plain, non-interactive row instead. */}
              <tr
                className={[
                  'odyssey-group-table__group-row',
                  !canExpand && 'odyssey-group-table__group-row--static',
                ].filter(Boolean).join(' ')}
                onClick={canExpand ? () => toggle(group.id) : undefined}
              >
                {/* The label is ONE merged cell (see splitHeaderRow) — the
                    header row does not follow the body's column grid, so a
                    narrow lead column isn't stretched to fit the group name. */}
                <td colSpan={labelSpan}>
                  {canExpand ? (
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
                  ) : (
                    <span className="odyssey-group-table__group-toggle odyssey-group-table__group-label--static">
                      {group.label}
                    </span>
                  )}
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
                    {/* N SIBLING tables, stacked, each one independent: its own
                        columns, its own widths, its own scrollbar, separated
                        from the next by a hairline (Figma 5356:5110, user
                        2026-08-26). Every section reads the SAME
                        `group.detailRows` — a section is a column set over
                        those rows, not its own data.

                        With `scroll` the band is its own scroller (width:0
                        zeroes its contribution to the host cell's sizing;
                        min-width:100% stretches it back; the inner table takes
                        max-content and scrolls HERE, independently). Without
                        it the wrapper is layout-neutral and the table rides the
                        outer scroll (user, 2026-08-17: off must be the original
                        behavior — which is why the legacy single-table path
                        keeps defaulting to off). */}
                    {sections.map((section, si) => (
                      <DetailBand
                        key={section.key ?? si}
                        detailScroll={section.scroll}
                        className="odyssey-group-table__detail-section"
                      >
                        <table className="odyssey-group-table__detail">
                          <thead>
                            <tr>
                              {section.columns.map((col) => (
                                <th
                                  key={col.key}
                                  scope="col"
                                  className={alignClass(col.align) || undefined}
                                  /* min-width PINS an explicit width: the filler below is
                                     width:100%, and a 100% cell squeezes plain `width`
                                     suggestions down to min-content (measured: 360px
                                     columns collapsed to 125). min-width is the floor the
                                     filler cannot argue with. */
                                  style={col.width != null ? { width: col.width, minWidth: col.width } : undefined}
                                >
                                  {col.label}
                                </th>
                              ))}
                              <FillerCell head />
                            </tr>
                          </thead>
                          <tbody>
                            {(group.detailRows ?? []).map((row, i) => {
                              const render = section.renderCell ?? renderDetailCell
                              return (
                                <tr key={i}>
                                  {section.columns.map((col) => (
                                    <td key={col.key} className={alignClass(col.align) || undefined}>
                                      {render ? render(row, col) : row[col.key] ?? '--'}
                                    </td>
                                  ))}
                                  <FillerCell />
                                </tr>
                              )
                            })}
                            {noteForSection(group, section, sections, si) && (
                              /* Full-width note row UNDER the section's data rows — the
                                 escape hatch for one long free-text field (a reason
                                 description) that as a column would need ~360px and push
                                 every other column off the scroll extent (user,
                                 2026-08-17). It wraps and clamps; every other cell in
                                 this table stays nowrap. */
                              <tr className="odyssey-group-table__detail-note">
                                <td colSpan={section.columns.length + 1}>
                                  <DetailNote note={noteForSection(group, section, sections, si)} lines={noteLines} />
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </DetailBand>
                    ))}
                  </td>
                  {/* No trailing pinned cell: the host cell above spans the
                      action lane too, so the nested tables get the full width.
                      Actions live on the group row ALONE (user, 2026-08-26) —
                      a nested table is an independent table, not a continuation
                      of the outer one, so it has no action lane to fill.
                      See the host cell's comment for the trade-off. */}
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
/**
 * Collapse `detailColumns` / `detailSections` into the ONE section list the
 * render walks. `detailColumns` is sugar for a single section, so there is no
 * second code path to keep in sync — and no ambiguity about which wins:
 * passing both throws rather than silently picking one.
 *
 * `detailScroll` means the SAME thing in both flavors and defaults the same way:
 * one prop, off unless asked for (user, 2026-08-26 — "detail scroll like we have
 * for the non sibling version"). Sections do NOT get a divergent default: a
 * consumer who knows `detailScroll` from the single-table flavor should not have
 * to learn a second rule to use siblings. Per-section `scroll` stays available
 * for the case where one sibling genuinely differs.
 *
 * @param {{detailColumns?: Array, detailSections?: Array, detailScroll?: boolean}} opts
 * @returns {Array<{key, columns, note?, scroll: boolean, renderCell?}>}
 */
export function normalizeDetailSections({ detailColumns, detailSections, detailScroll = false }) {
  const hasSections = Array.isArray(detailSections) && detailSections.length > 0
  const hasColumns = Array.isArray(detailColumns) && detailColumns.length > 0
  if (hasSections && hasColumns) {
    throw new Error('GroupTable: pass detailColumns OR detailSections, not both')
  }
  if (hasSections) {
    return detailSections
      .filter((s) => Array.isArray(s?.columns) && s.columns.length > 0)
      .map((s, i) => ({ ...s, key: s.key ?? `section-${i}`, scroll: s.scroll ?? detailScroll }))
  }
  if (hasColumns) return [{ key: 'default', columns: detailColumns, note: true, scroll: detailScroll }]
  return []
}

/**
 * Which section hosts `group.detailNote`. The one flagged `note: true`, else the
 * first — a note is never dropped just because nobody claimed it.
 *
 * @param {Array} sections
 * @returns {number}
 */
export function noteSectionIndex(sections) {
  const i = sections.findIndex((s) => s.note)
  return i === -1 ? 0 : i
}

/**
 * The note a given section renders, if any.
 *
 * TWO shapes, because two different things get asked for:
 *   • `group.detailNotes` — a map keyed by section key: ONE NOTE PER SIBLING, each
 *     section carrying its own long-text row (user, 2026-08-26).
 *   • `group.detailNote`  — the single-note shorthand, hosted by the `note: true`
 *     section (or the first). Predates the map and stays supported: most rows have
 *     exactly one long field and should not have to name a section to say so.
 *
 * The map wins for its own section, so a group can carry both — a shorthand plus
 * an override on one sibling — without the two fighting over the same row.
 *
 * @param {object} group
 * @param {object} section
 * @param {Array}  sections
 * @param {number} index — this section's position, for the shorthand's host test
 * @returns {any} the note, or null when this section has none
 */
export function noteForSection(group, section, sections, index) {
  const own = group.detailNotes?.[section.key]
  if (own) return own
  if (group.detailNote && noteSectionIndex(sections) === index) return group.detailNote
  return null
}

export function detailNoteContent(note) {
  if (!note || typeof note !== 'object' || Array.isArray(note) || note.$$typeof) return note
  if (!('label' in note) && !('value' in note)) return note
  return (
    <>
      {note.label != null && (
        <>
          {/* The colon + space belongs to the COMPONENT, not the consumer: a label
              and its value ran straight together before, and every caller would
              otherwise have to remember the punctuation (Figma 5356:5110 renders
              "Reason Description: No rate is available…"). A label that already
              ends in a colon keeps just the one — the separator is normalised
              here rather than doubled on screen. */}
          <span className="odyssey-group-table__detail-note-label">{stripTrailingColon(note.label)}:</span>{' '}
        </>
      )}
      {note.value}
    </>
  )
}

/** Drops a trailing colon from a string label so the separator is never doubled.
 *  Node labels pass through — the component cannot rewrite what it did not author. */
export function stripTrailingColon(label) {
  return typeof label === 'string' ? label.replace(/\s*:\s*$/, '') : label
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
 * Whether a group's label row should render as an expandable toggle at all.
 * A chevron that opens onto nothing is a bug, not a feature — so this is
 * derived, not just a flag the consumer sets.
 *
 * Precedence:
 *   1. `group.expandable === false` always wins — explicit opt-out.
 *   2. Otherwise, expandable iff there is something to reveal:
 *      - rows flavor:   `group.rows` has at least one row
 *      - nested flavor: `group.detailRows` has at least one row (the nested
 *        tables all read the same `detailRows` — see `normalizeDetailSections`)
 *      - either flavor: a note would render — `group.detailNote` or any value
 *        in `group.detailNotes` — since a note-only group still has a body.
 *
 * @param {object} group
 * @param {{detailColumns?: Array, detailSections?: Array}} [opts]
 * @returns {boolean}
 */
export function isGroupExpandable(group, { detailColumns, detailSections } = {}) {
  if (group.expandable === false) return false
  const nested = (Array.isArray(detailSections) && detailSections.length > 0) ||
    (Array.isArray(detailColumns) && detailColumns.length > 0)
  const hasRows = nested
    ? Array.isArray(group.detailRows) && group.detailRows.length > 0
    : Array.isArray(group.rows) && group.rows.length > 0
  const hasNote = !!group.detailNote || !!(group.detailNotes && Object.values(group.detailNotes).some(Boolean))
  return hasRows || hasNote
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
