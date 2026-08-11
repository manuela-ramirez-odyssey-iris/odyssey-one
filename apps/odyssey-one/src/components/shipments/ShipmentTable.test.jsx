// @vitest-environment jsdom
// Covers the grid-level error surface only. Added 2026-08-10 against the
// app-local ErrorState; S116 moved it onto DataTable's own `error` body state
// (Figma `Table Container Error` 5065:8602), so the table's header + chrome now
// SURVIVE the failure instead of being replaced by a bare message. The button
// label also went Retry → Reload with the Figma design.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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

describe('ShipmentTable — error state', () => {
  test('renders the error body state with an alert role when isError', () => {
    render(<ShipmentTable {...baseProps} isError onRetry={vi.fn()} />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText("Couldn't load shipments.")).toBeTruthy()
  })

  test('reload action fires onRetry', () => {
    const onRetry = vi.fn()
    render(<ShipmentTable {...baseProps} isError onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /Reload/ }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  test('omits the reload action when onRetry is absent', () => {
    render(<ShipmentTable {...baseProps} isError />)
    // Guard: this asserted the old "Retry" name after the rename, so it passed
    // vacuously for one commit — matching on the CURRENT label is the point.
    expect(screen.queryByRole('button', { name: /Reload/ })).toBeFalsy()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  test('the table chrome survives the error — the header is still rendered', () => {
    const { container } = render(<ShipmentTable {...baseProps} isError onRetry={vi.fn()} />)
    // The whole point of moving this into DataTable: an error no longer replaces
    // the table, it renders inside it.
    expect(container.querySelector('.odyssey-data-table__card')).toBeTruthy()
    expect(container.querySelector('thead')).toBeTruthy()
  })
})
