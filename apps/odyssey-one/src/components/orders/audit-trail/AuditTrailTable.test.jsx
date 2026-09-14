// @vitest-environment jsdom
// apps/odyssey-one/src/components/orders/audit-trail/AuditTrailTable.test.jsx
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import AuditTrailTable from './AuditTrailTable.jsx'

afterEach(cleanup)

const rows = [
  { id: 'a-1', timestamp: '2026-05-25T10:00:00', timeZoneCode: 'CDT', changedBy: 'System', source: 'LINX', changeType: 'Order Event', changeCategory: 'Order Lifecycle Status Change', lineItemId: null, changes: [{ field: 'Status', oldValue: 'Ready for Planning', newValue: 'Planned Load' }] },
  { id: 'a-0', timestamp: '2026-05-23T14:30:00', timeZoneCode: 'CDT', changedBy: 'User', source: 'ben.planner@odyssey.local · Ben Planner', changeType: 'Order Action', changeCategory: 'Order Creation', lineItemId: null, changes: [] },
]

function renderTable(over = {}) {
  const props = {
    rows, totalCount: 57,
    pagination: { pageIndex: 0, pageSize: 25 }, onPaginationChange: vi.fn(),
    sorting: [{ id: 'timestamp', desc: true }], onSortingChange: vi.fn(),
    ...over,
  }
  return { ...render(<AuditTrailTable {...props} />), props }
}

describe('AuditTrailTable', () => {
  it('renders the nine headers, the rows, and "--" for blank cells', () => {
    renderTable()
    // DataTable splits the sticky header into its OWN <table> (headTableRef,
    // no aria-label) from the scrolling body <table> (bodyTableRef, which
    // carries ariaLabel) — the two are sibling tables, not one. The named
    // `getByRole('table', ...)` query below only ever matches the body table,
    // so columnheaders (which live in the head table) are queried unscoped.
    expect(screen.getByRole('table', { name: 'Audit trail' })).toBeTruthy()
    expect(screen.getAllByRole('columnheader')).toHaveLength(9)
    expect(screen.getByText('05/23/2026 14:30 CDT')).toBeTruthy()
    expect(screen.getByText('Order Creation')).toBeTruthy()
    // creation row: Line Item ID, Field, Old, New all blank
    const creation = screen.getByText('Order Creation').closest('tr')
    expect(within(creation).getAllByText('--')).toHaveLength(4)
  })

  it('pages with the AC options (10–40 by 5), default 25, and reports "Showing 1 to 25 of 57 results"', () => {
    renderTable()
    expect(screen.getByText(/Showing 1 to 25 of 57 results/)).toBeTruthy()
    // Paginator's "Rows per page" control is not a native <select> and carries
    // no label association (a plain sibling <span> + a DropdownButton with
    // aria-haspopup="listbox") — screen.getByLabelText finds nothing here, and
    // there is no `.value` to read. Query the trigger button inside the
    // `.paginator__page-size` block instead and assert its displayed text.
    const pageSizeBlock = document.querySelector('.paginator__page-size')
    expect(within(pageSizeBlock).getByText('Rows per page')).toBeTruthy()
    const trigger = within(pageSizeBlock).getByRole('button')
    // jest-dom is not wired into this suite's expect (no toHaveTextContent) —
    // read textContent directly.
    expect(trigger.textContent).toContain('25')

    // The options are virtual: Dropdown only mounts its DropdownMenu (via a
    // body portal) once opened. Open it to check the AC's exact option set.
    fireEvent.click(trigger)
    const menu = screen.getByRole('menu')
    const optionLabels = within(menu).getAllByText(/^\d+$/).map((el) => el.textContent)
    expect(optionLabels).toEqual(['10', '15', '20', '25', '30', '35', '40'])
  })

  it('lifts a header click on Date & Timestamp to onSortingChange and nothing on the other headers', () => {
    const { props } = renderTable()
    fireEvent.click(screen.getByRole('button', { name: /Date & Timestamp/ }))
    expect(props.onSortingChange).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Change Category/ })).toBeNull()
  })
})
