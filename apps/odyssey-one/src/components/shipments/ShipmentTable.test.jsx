// @vitest-environment jsdom
// Covers the grid-level error surface only. Added 2026-08-10 against the
// app-local ErrorState; S116 moved it onto DataTable's own `error` body state
// (Figma `Table Container Error` 5065:8602), so the table's header + chrome now
// SURVIVE the failure instead of being replaced by a bare message. The button
// label also went Retry → Reload with the Figma design.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ShipmentTable from './ShipmentTable.jsx'

afterEach(cleanup)

const baseProps = {
  shipments: [],
  onRowSelect: vi.fn(),
  selectedId: null,
  onToggleColumnPanel: vi.fn(),
  visibleColumns: undefined,
  sorting: [],
  onSortingChange: vi.fn(),
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
}

// ShipmentTable calls useNavigate() (the row action's LINX-14509 Review Order
// Change entry), so every render needs a Router ancestor — same pattern as
// ShipmentDetailsModal.test.jsx.
function renderTable(props) {
  return render(
    <MemoryRouter>
      <ShipmentTable {...baseProps} {...props} />
    </MemoryRouter>,
  )
}

describe('ShipmentTable — error state', () => {
  test('renders the error body state with an alert role when isError', () => {
    renderTable({ isError: true, onRetry: vi.fn() })
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText("Couldn't load shipments.")).toBeTruthy()
  })

  // User ruling (2026-08-14): the grid draws both Figma lines — a short
  // headline and a brief reason from getErrorDetail (never the raw server
  // string, see src/components/common/errorDetail.js).
  test('renders the brief-reason detail line derived from the query error', () => {
    renderTable({
      isError: true,
      onRetry: vi.fn(),
      error: { name: 'ApiError', status: 503, message: 'gridService: upstream 503' },
    })
    expect(screen.getByText("Couldn't load shipments.")).toBeTruthy()
    expect(screen.getByText('The service is temporarily unavailable.')).toBeTruthy()
    expect(screen.queryByText('gridService: upstream 503')).toBeFalsy()
  })

  test('falls back to the generic brief reason when no error detail is known', () => {
    renderTable({ isError: true, onRetry: vi.fn() })
    expect(screen.getByText("Couldn't load shipments.")).toBeTruthy()
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy()
  })

  test('reload action fires onRetry', () => {
    const onRetry = vi.fn()
    renderTable({ isError: true, onRetry })
    fireEvent.click(screen.getByRole('button', { name: /Reload/ }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  test('omits the reload action when onRetry is absent', () => {
    renderTable({ isError: true })
    // Guard: this asserted the old "Retry" name after the rename, so it passed
    // vacuously for one commit — matching on the CURRENT label is the point.
    expect(screen.queryByRole('button', { name: /Reload/ })).toBeFalsy()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  test('the table chrome survives the error — the header is still rendered', () => {
    const { container } = renderTable({ isError: true, onRetry: vi.fn() })
    // The whole point of moving this into DataTable: an error no longer replaces
    // the table, it renders inside it.
    expect(container.querySelector('.odyssey-data-table__card')).toBeTruthy()
    expect(container.querySelector('thead')).toBeTruthy()
  })
})

// LINX-14509 — the pinned action column gains a row-aware first entry for
// Order Change exception rows, which navigates to the (later-task) review
// route. Everyone else keeps the plain static SHIPMENT_ACTIONS list.
describe('ShipmentTable — row actions menu (LINX-14509 Review Order Change)', () => {
  const orderChangeRow = {
    id: '0000000012345', sellShipment: '0000000012345', buyShipment: '0000000054321',
    category: 'order-change', orders: [],
  }
  const dateIssueRow = {
    id: '0000000099999', sellShipment: '0000000099999', buyShipment: '0000000011111',
    category: 'date-issues', orders: [],
  }

  test('order-change rows expose Review Order Change in the actions menu', () => {
    renderTable({ shipments: [orderChangeRow] })
    fireEvent.click(screen.getByRole('button', { name: 'Shipment actions' }))
    expect(screen.getByRole('menuitem', { name: 'Review Order Change' })).toBeTruthy()
    // The regular actions must still be there alongside it.
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Tender by Preferred Carrier' })).toBeTruthy()
  })

  test('other rows do not expose Review Order Change', () => {
    renderTable({ shipments: [dateIssueRow] })
    fireEvent.click(screen.getByRole('button', { name: 'Shipment actions' }))
    expect(screen.queryByRole('menuitem', { name: 'Review Order Change' })).toBeFalsy()
    // The regular actions menu still works, unregressed.
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Tender by Preferred Carrier' })).toBeTruthy()
  })
})
