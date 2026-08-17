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

describe('GroupTable — pinned action column continuity', () => {
  it('gives the nested detail row its own pinned cell, so the column is unbroken', () => {
    // REGRESSION (2026-08-17): the detail row was a single `colSpan={spanAll}`
    // cell that swallowed the action column. The nested table then rendered
    // underneath the pinned lane with nothing pinned above it, so its content
    // stayed visible there and scrolled horizontally while the group rows'
    // actions sat still — the column read as "not sticky anymore".
    const { container } = render(
      <GroupTable columns={COLUMNS} detailColumns={DETAIL_COLUMNS} groups={GROUPS}
                  stickyActions defaultExpanded />
    )
    const detailRow = container.querySelector('.odyssey-group-table__detail-row')
    expect(detailRow, 'the nested detail row should render when expanded').toBeTruthy()
    expect(detailRow.querySelector(STICKY),
      'detail row must carry a pinned cell or the action column has a hole in it').toBeTruthy()

    // and the host cell must stop SHORT of the action column, not span it
    const host = detailRow.querySelector('td[colspan]')
    expect(Number(host.getAttribute('colspan'))).toBe(COLUMNS.length)
  })

  it('every outer row carries a pinned cell when stickyActions is on', () => {
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
