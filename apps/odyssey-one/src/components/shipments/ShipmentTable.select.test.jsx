// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ShipmentTable from './ShipmentTable.jsx'

afterEach(cleanup)

const row = (i, over = {}) => ({
  id: `s${i}`, sellShipment: `s${i}`, buyShipment: `b${i}`, odysseyShipmentIdentifier: `O${i}`,
  orders: [], pickupNumbers: [], poNumbers: [], customerId: 'VALTRIS_01', shipmentType: 'Direct',
  tenderStatus: '', shipmentStatus: '', category: 'consolidation', grossWeight: '100', ...over,
})
const rows = [row(1), row(2, { tenderStatus: 'Sent' }), row(3)]

const baseProps = {
  shipments: rows, onRowSelect: vi.fn(), selectedId: null, onToggleColumnPanel: vi.fn(),
  visibleColumns: ['odysseyShipmentIdentifier', 'customerId'], sorting: [], onSortingChange: vi.fn(),
  onPageChange: vi.fn(), onPageSizeChange: vi.fn(), totalCount: 3,
}
const eligibility = (r) => (r.tenderStatus === 'Sent' ? 'Tendered — cancel the tender first' : null)

function renderTable(props) {
  return render(<MemoryRouter><ShipmentTable {...baseProps} {...props} /></MemoryRouter>)
}

describe('ShipmentTable — selectable mode', () => {
  test('default: no checkboxes, actions column present', () => {
    renderTable({})
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.getAllByRole('button', { name: 'Shipment actions' }).length).toBeGreaterThan(0)
  })

  test('selectable: one checkbox per row + header, actions column hidden, ineligible disabled', () => {
    renderTable({ selectable: true, selection: new Map(), onSelectionChange: vi.fn(), eligibility })
    expect(screen.queryByRole('button', { name: 'Shipment actions' })).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Select all eligible shipments on this page' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Select O1' }).disabled).toBe(false)
    expect(screen.getByRole('checkbox', { name: 'Select O2' }).disabled).toBe(true)
  })

  test('checking a row reports ([row], true); unchecking reports ([row], false)', () => {
    const onSelectionChange = vi.fn()
    const { rerender } = renderTable({ selectable: true, selection: new Map(), onSelectionChange, eligibility })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select O1' }))
    expect(onSelectionChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 's1' })], true)
    rerender(<MemoryRouter><ShipmentTable {...baseProps} selectable selection={new Map([['s1', rows[0]]])} onSelectionChange={onSelectionChange} eligibility={eligibility} /></MemoryRouter>)
    expect(screen.getByRole('checkbox', { name: 'Select O1' }).checked).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select O1' }))
    expect(onSelectionChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 's1' })], false)
  })

  test('header checkbox selects only the eligible rows on the page, and is indeterminate when partial', () => {
    const onSelectionChange = vi.fn()
    const { rerender } = renderTable({ selectable: true, selection: new Map(), onSelectionChange, eligibility })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all eligible shipments on this page' }))
    const [selected, checked] = onSelectionChange.mock.calls.at(-1)
    expect(checked).toBe(true)
    expect(selected.map((r) => r.id)).toEqual(['s1', 's3'])
    rerender(<MemoryRouter><ShipmentTable {...baseProps} selectable selection={new Map([['s1', rows[0]]])} onSelectionChange={onSelectionChange} eligibility={eligibility} /></MemoryRouter>)
    expect(screen.getByRole('checkbox', { name: 'Select all eligible shipments on this page' }).indeterminate).toBe(true)
  })

  test('row clicks are inert in selectable mode', () => {
    const onRowSelect = vi.fn()
    renderTable({ selectable: true, selection: new Map(), onSelectionChange: vi.fn(), eligibility, onRowSelect })
    fireEvent.click(screen.getByText('O1'))
    expect(onRowSelect).not.toHaveBeenCalled()
  })
})
