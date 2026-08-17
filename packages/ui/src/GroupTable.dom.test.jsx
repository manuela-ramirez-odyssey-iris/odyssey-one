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

describe('GroupTable — the nested band spans the full width', () => {
  it('spans the action lane too, so the nested table gets the whole width', () => {
    // RULED 2026-08-17 (user): "nested table is separate, doesn't need to follow
    // the boundaries of its parent." The nested table is an INDEPENDENT table
    // that happens to render inside a row, so it takes the action lane's width
    // as well rather than leaving ~158px of dead band under every expanded row.
    //
    // This reverses the earlier narrowing, which reserved the lane so the pinned
    // column stayed opaque top to bottom. Known, accepted trade: on a
    // horizontally scrolled table the pinned action column now has a gap at each
    // expanded row. Reserving the lane again is a one-line revert.
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS}
                  stickyActions defaultExpanded />
    )
    const detailRow = container.querySelector('.odyssey-group-table__detail-row')
    expect(detailRow, 'the nested detail row should render when expanded').toBeTruthy()

    const host = detailRow.querySelector('td[colspan]')
    expect(Number(host.getAttribute('colspan')),
      'host cell must span the action column too').toBe(COLUMNS.length + 1)

    // ...and it is the ONLY cell on the row — no reserved trailing lane.
    expect(detailRow.children.length,
      'the detail row is one full-width cell, nothing beside it').toBe(1)

    // the INNER table must STILL never grow an action cell of its own: it takes
    // the width, not the outer table's column structure.
    expect(container.querySelectorAll(`.odyssey-group-table__detail ${STICKY}`).length,
      'the inner table is independent — it gets no action column').toBe(0)
  })

  it('every outer row EXCEPT the nested band still has its pinned slot', () => {
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
      // The detail row is the deliberate exception — it spans the lane instead
      // of reserving it. Every other row must still pin, or the column really
      // would read as one that scrolls away.
      if (row.classList.contains('odyssey-group-table__detail-row')) {
        expect(row.querySelector(STICKY),
          'the nested band spans the lane, it does not reserve it').toBeNull()
        continue
      }
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

describe('GroupTable — the pinned lane over the nested band', () => {
  it('paints the lane as a strip, never as a cell in the nested table', () => {
    // The nested table must NOT gain an action column: it is an independent
    // table and binding it to the outer grid is the one thing this flavor
    // exists to avoid (user, 2026-08-17). The lane is therefore painted OVER
    // the band by a sticky strip, so the band keeps its full width and its
    // content scrolls under the pin like the outer columns do.
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS}
                  stickyActions defaultExpanded />
    )
    const detailRow = container.querySelector('.odyssey-group-table__detail-row')
    // one full-width host cell, no reserved trailing cell
    expect(detailRow.children.length).toBe(1)
    expect(Number(detailRow.children[0].getAttribute('colspan'))).toBe(COLUMNS.length + 1)
    // the strip exists and is NOT a table cell
    const lane = detailRow.querySelector('.odyssey-group-table__detail-lane')
    expect(lane).toBeTruthy()
    expect(lane.tagName).toBe('DIV')
    // and the inner table still has no action column of its own
    expect(container.querySelectorAll(`.odyssey-group-table__detail ${STICKY}`).length).toBe(0)
  })

  it('omits the strip entirely when there is no action column to cover', () => {
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS} defaultExpanded />
    )
    expect(container.querySelector('.odyssey-group-table__detail-lane')).toBeNull()
  })
})
