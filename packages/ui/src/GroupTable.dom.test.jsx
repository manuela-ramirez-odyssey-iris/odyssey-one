// @vitest-environment jsdom
// GroupTable rendering tests. The pure helpers live in GroupTable.test.jsx
// (node env); anything that needs a DOM belongs here.
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import GroupTable from './GroupTable.jsx'

afterEach(cleanup)

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'rank', label: 'Rank' },
  { key: 'status', label: 'Status' },
]
const DETAIL_COLUMNS = [
  { key: 'method', label: 'Method' },
  { key: 'user', label: 'User' },
]
const GROUPS = [{
  id: 'g1',
  label: 'ALPHA',
  values: { name: 'ALPHA', rank: '4', status: 'Accepted' },
  detailRows: [{ method: 'Automatic Update', user: 'Moses Johnson' }],
  action: <button type="button">act</button>,
}]

const STICKY = '.odyssey-group-table__cell--sticky-right'

describe('GroupTable — the nested band keeps out of the action lane', () => {
  it('stops the nested band short of the action column instead of spanning it', () => {
    // REGRESSION (2026-08-17): the detail row was a single `colSpan={spanAll}`
    // cell that swallowed the action column, so the nested table rendered
    // straight through the pinned lane and scrolled horizontally while the
    // group rows' actions sat still — the column read as "not sticky anymore".
    //
    // The fix is the COLSPAN, not the extra cell: narrowing the host cell is
    // what keeps the inner table out of the lane. The trailing cell is only
    // there so the row still has a slot for that column — it is deliberately
    // NOT sticky (the nested flavor's `position: relative` on detail-row tds
    // out-specifies the sticky rule) and is styled as the gray band continuing,
    // not as an action cell. The inner table stays fully independent of the
    // outer columns and may carry more or fewer of them.
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS}
                  stickyActions defaultExpanded />
    )
    const detailRow = container.querySelector('.odyssey-group-table__detail-row')
    expect(detailRow, 'the nested detail row should render when expanded').toBeTruthy()

    const host = detailRow.querySelector('td[colspan]')
    expect(Number(host.getAttribute('colspan')),
      'host cell must stop short of the action column').toBe(COLUMNS.length)

    // the INNER table must never grow an action cell of its own
    expect(container.querySelectorAll(`.odyssey-group-table__detail ${STICKY}`).length,
      'the inner table is independent — it gets no action column').toBe(0)
  })

  it('every outer row has a slot for the action column when stickyActions is on', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS}
                  stickyActions defaultExpanded
                  footerRow={{ name: 'TOTAL' }}
                  actionsHeader={<button type="button">cols</button>} />
    )
    // header, group row, detail row, footer — the outer table's own rows only
    const outer = container.querySelector('.odyssey-group-table__table')
    const outerRows = [...outer.children].flatMap(sec => [...sec.children])
    for (const row of outerRows) {
      expect(row.querySelector(STICKY), `row "${row.textContent.slice(0, 30)}" has no pinned cell`).toBeTruthy()
    }
  })

  it('spans the full width again when stickyActions is off', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS} defaultExpanded />
    )
    const host = container.querySelector('.odyssey-group-table__detail-row td[colspan]')
    expect(Number(host.getAttribute('colspan'))).toBe(COLUMNS.length)
    expect(container.querySelector(STICKY)).toBeNull()
  })

  it('still renders the action node itself on the group row', () => {
    render(<GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS} stickyActions />)
    expect(screen.getByRole('button', { name: 'act' })).toBeTruthy()
  })
})

describe('GroupTable detailNote', () => {
  const withNote = (detailNote) => [{ ...GROUPS[0], detailNote }]

  it('renders { label, value } WITHOUT the consumer touching internal class names', () => {
    // The point of the object shape (user, 2026-08-17): a downstream team gets the
    // standard label treatment from props alone, not by hand-writing our internals.
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} defaultExpanded
        groups={withNote({ label: 'Reason Description', value: 'Prohibited for this lane.' })} />
    )
    const note = container.querySelector('.odyssey-group-table__detail-note > td')
    expect(note.querySelector('.odyssey-group-table__detail-note-label').textContent)
      .toBe('Reason Description')
    expect(note.textContent).toContain('Prohibited for this lane.')
    expect(Number(note.getAttribute('colspan'))).toBe(DETAIL_COLUMNS.length)
  })

  it('still takes a bare node, for what a label/value pair cannot say', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} defaultExpanded
        groups={withNote(<em>free form</em>)} />
    )
    expect(container.querySelector('.odyssey-group-table__detail-note em').textContent)
      .toBe('free form')
  })

  it('renders no note row at all when a group has none', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS} defaultExpanded />
    )
    expect(container.querySelector('.odyssey-group-table__detail-note')).toBeNull()
  })
})
