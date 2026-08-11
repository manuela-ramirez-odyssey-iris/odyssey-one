// @vitest-environment jsdom
// Covers the grid-level error surface only — the shared ErrorState (see
// src/components/common/ErrorState.jsx) — added 2026-08-10 alongside the
// BottomBar unification. Not a full ShipmentTable suite.
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
  test('renders the shared ErrorState with an alert role when isError', () => {
    render(<ShipmentTable {...baseProps} isError onRetry={vi.fn()} />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText("Couldn't load shipments.")).toBeTruthy()
  })

  test('retry action fires onRetry', () => {
    const onRetry = vi.fn()
    render(<ShipmentTable {...baseProps} isError onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  test('omits the retry action when onRetry is absent', () => {
    render(<ShipmentTable {...baseProps} isError />)
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeFalsy()
  })
})
