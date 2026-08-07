// @vitest-environment jsdom
// Rendered proof of the merged group-header row (S112). The pure split lives in
// GroupTable.test.jsx (node env); this asserts the DOM actually carries it —
// without the merge the lead column stretches to fit the group label, which is
// exactly what a checkbox column must not do.
import { describe, test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import GroupTable from './GroupTable.jsx'

afterEach(cleanup)

const columns = [
  { key: 'incl', label: 'Incl' },
  { key: 'carrier', label: 'Carrier' },
  { key: 'equip', label: 'Equip' },
  { key: 'email', label: 'Email' },
  { key: 'pickup', label: 'Pickup' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'flags', label: 'Flags' },
]

const headerCells = (container) =>
  container.querySelector('.odyssey-group-table__group-row').querySelectorAll('td')

describe('GroupTable group header row', () => {
  test('merges the label across all but the trailing three columns', () => {
    const { container } = render(
      <GroupTable
        columns={columns}
        groups={[{ id: 'g1', label: 'LTL Comparable Set', rows: [{ carrier: 'ODFL' }] }]}
      />
    )
    const cells = headerCells(container)
    expect(cells).toHaveLength(4) // 1 merged label + 3 value cells, not 7
    expect(cells[0].getAttribute('colspan')).toBe('4')
    expect(cells[0].textContent).toContain('LTL Comparable Set')
  })

  test('trailing value cells still render group.values', () => {
    const { container } = render(
      <GroupTable
        columns={columns}
        groups={[{ id: 'g1', label: 'Set', values: { flags: 'FLAGGED' }, rows: [] }]}
      />
    )
    expect(headerCells(container)[3].textContent).toBe('FLAGGED')
  })

  // The nested flavor's group row IS a data row (one value per column), so it
  // must keep the grid rather than merging.
  test('nested flavor keeps one cell per column', () => {
    const { container } = render(
      <GroupTable
        columns={columns}
        groups={[{ id: 'g1', label: 'ODFL', values: {}, detailRows: [] }]}
        detailColumns={[{ key: 'code', label: 'Code' }]}
      />
    )
    expect(headerCells(container)).toHaveLength(columns.length)
  })
})
