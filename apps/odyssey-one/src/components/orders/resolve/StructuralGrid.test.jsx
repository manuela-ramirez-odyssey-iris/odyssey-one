// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import StructuralGrid, { isStructuralFixed } from './StructuralGrid.jsx'

afterEach(cleanup)

const products = [
  { id: 'prod-1', productId: 'A', description: 'Steel Coils', grossWeight: { value: '100', uom: 'lbs' }, volume: { value: '10', uom: 'cbf' }, schedules: [
    { id: 'prod-1-sch-1', requestedShipDate: '06/15/2026', packageCount: '2', requestedShipTimeZoneCode: 'CDT' },
    { id: 'prod-1-sch-2', requestedShipDate: '06/16/2026', packageCount: '2', requestedShipTimeZoneCode: 'CDT' },
  ] },
  { id: 'prod-2', productId: 'B', grossWeight: { value: '200', uom: 'lbs' }, volume: { value: '20', uom: 'cbf' }, scheduleQuantity: { grossWeight: '250', volume: '20' } },
  { id: 'prod-3', productId: 'C', grossWeight: { value: '300', uom: 'lbs' }, volume: { value: '30', uom: 'cbf' }, scheduleTimezone: '' },
  { id: 'prod-4', productId: 'D', grossWeight: { value: '400', uom: 'lbs' }, volume: { value: '40', uom: 'cbf' } },
  // Level-1 seed invariant I8: manual_order stays NULL for a share of orders,
  // so the synthesized line has no shipItemIdentifier — productId is
  // legitimately '' (not a bug), and a lean order can lack a description too.
  { id: 'prod-5', productId: '', description: 'Sulfuric Acid 93%', grossWeight: { value: '500', uom: 'lbs' }, volume: { value: '50', uom: 'cbf' }, scheduleTimezone: '' },
  { id: 'prod-6', productId: '', description: '', grossWeight: { value: '600', uom: 'lbs' }, volume: { value: '60', uom: 'cbf' }, scheduleTimezone: '' },
  // No weight unit came in on the message — the selector must read "Select
  // unit" so the planner sees one is owed (S147, MeasureField's uomPlaceholder).
  { id: 'prod-7', productId: 'G', grossWeight: { value: '700', uom: '' }, volume: { value: '70', uom: 'cbf' }, scheduleQuantity: { grossWeight: '700', volume: '70' } },
]
// Line 1 carries TWO faults (extra-schedule + a second, unrelated timezone
// fault) so "lists only the offending lines" also proves a multi-fault line
// still renders as ONE row with both faults stacked and the badge counting
// both.
const structural = [
  { id: 's1', rule: 1, kind: 'extra-schedule', line: 1, field: 'Schedules per line', message: 'An order line can have only 1 schedule.' },
  { id: 's1b', rule: 4, kind: 'timezone-missing', line: 1, field: 'Requested Ship Time Zone', message: 'Requested Ship Time-Zone missing.' },
  { id: 's2', rule: 2, kind: 'quantity-mismatch', line: 2, field: 'Line vs schedule quantity', message: 'Line and Schedule mismatch.' },
  { id: 's3', rule: 4, kind: 'timezone-missing', line: 3, field: 'Requested Ship Time Zone', message: 'Requested Ship Time-Zone missing.' },
  { id: 's5', rule: 4, kind: 'timezone-missing', line: 5, field: 'Requested Ship Time Zone', message: 'Requested Ship Time-Zone missing.' },
  { id: 's6', rule: 4, kind: 'timezone-missing', line: 6, field: 'Requested Ship Time Zone', message: 'Requested Ship Time-Zone missing.' },
  { id: 's7', rule: 2, kind: 'quantity-mismatch', line: 7, field: 'Line vs schedule quantity', message: 'Line and Schedule mismatch.' },
]

describe('StructuralGrid', () => {
  test('lists only the offending lines, one row per line', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} />)
    const rows = screen.getAllByRole('row').slice(1) // minus header
    expect(rows.length).toBe(6) // lines 1, 2, 3, 5, 6, 7 — not 4 (D has no faults)
    expect(screen.queryByText('D')).toBeNull()
    // Line 1's two faults both show in its row, and the badge counts both.
    const row1 = screen.getByText('A').closest('tr')
    expect(within(row1).getByText('Schedules per line')).toBeTruthy()
    expect(within(row1).getByText('Requested Ship Time Zone')).toBeTruthy()
    expect(within(row1).getByText('2 open')).toBeTruthy()
  })

  test('product cell is two-line: ID then description, description omitted when empty', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} />)
    expect(screen.getByText('A').closest('.structural-grid__product-cell')).toBeTruthy()
    expect(screen.getByText('Steel Coils')).toBeTruthy()
    // Product B (line 2) has no description — only its ID line renders.
    const row2 = screen.getByText('B').closest('.structural-grid__product-cell')
    expect(row2.querySelector('.text-label-xs-regular')).toBeNull()
  })

  test('product cell: no productId (lean order) renders description alone, no blank first line', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} />)
    const cell = screen.getByText('Sulfuric Acid 93%').closest('.structural-grid__product-cell')
    expect(cell.children.length).toBe(1)
    expect(cell.querySelector('.text-label-sm-medium')).toBeNull()
  })

  test('product cell: neither productId nor description renders "--"', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} />)
    const row6 = screen.getByText('6').closest('tr')
    expect(within(row6).getByText('--')).toBeTruthy()
  })

  test('extra schedule: checking one and clicking Delete selected fires onFix(s1) with that id', () => {
    const onFix = vi.fn()
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fix line 1' }))
    fireEvent.click(screen.getByLabelText(/Schedule 2 —/))
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }))
    expect(onFix).toHaveBeenCalledWith('s1', { removeSchedules: ['prod-1-sch-2'] })
  })

  test('extra schedule: Delete selected stays disabled until a schedule is checked, and while all are checked', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fix line 1' }))
    const del = screen.getByRole('button', { name: 'Delete selected' })
    expect(del.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByLabelText(/Schedule 1 —/))
    fireEvent.click(screen.getByLabelText(/Schedule 2 —/))
    // both checked → nothing would remain
    expect(screen.getByRole('button', { name: 'Delete selected' }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByLabelText(/Schedule 1 —/))
    expect(screen.getByRole('button', { name: 'Delete selected' }).hasAttribute('disabled')).toBe(false)
  })

  test('quantity mismatch: editing the line weight to the schedule value fires onFix(s2)', () => {
    const onFix = vi.fn()
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fix line 2' }))
    const input = screen.getByLabelText('Gross weight, line 2')
    fireEvent.change(input, { target: { value: '250' } })
    expect(onFix).toHaveBeenCalledWith('s2', { grossWeight: '250', grossWeightUom: 'lbs' })
  })

  // The row badge flips to Validated once the parent re-renders with the fix
  // in place — the modal doesn't own that state, `fixes` does.
  test('quantity mismatch: the row badge reads Validated after the fix lands', () => {
    const { rerender } = render(
      <StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} />,
    )
    expect(within(screen.getByText('B').closest('tr')).getByText('1 open')).toBeTruthy()
    rerender(<StructuralGrid products={products} structural={structural} fixes={{ s2: { grossWeight: '250' } }} onFix={() => {}} />)
    expect(within(screen.getByText('B').closest('tr')).getByText('Validated')).toBeTruthy()
  })

  test('timezone missing: picking a zone via the Dropdown fires onFix(s3)', () => {
    const onFix = vi.fn()
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fix line 3' }))
    // The Dropdown trigger renders the placeholder value as its own text (same
    // pattern AuditTrailTable.test.jsx uses for the Paginator's Dropdown) — the
    // anchored portal renders a `menu` role jsdom CAN drive without layout.
    fireEvent.click(screen.getByRole('button', { name: 'Time zone, line 3' }))
    fireEvent.click(within(screen.getByRole('menu')).getByText('CST'))
    expect(onFix).toHaveBeenCalledWith('s3', { timezone: 'CST' })
  })

  // Weak point 4 — a quantity fix counts ONLY when the line value equals the
  // schedule's. Typing "any value" must not paint the row green.
  test('quantity mismatch: only a value equal to the schedule counts as fixed', () => {
    const { rerender } = render(
      <StructuralGrid products={products} structural={structural} fixes={{ s2: { grossWeight: '999' } }} onFix={() => {}} />,
    )
    expect(within(screen.getByText('B').closest('tr')).queryByText('Validated')).toBeNull()

    rerender(<StructuralGrid products={products} structural={structural} fixes={{ s2: { grossWeight: '250' } }} onFix={() => {}} />)
    expect(within(screen.getByText('B').closest('tr')).getByText('Validated')).toBeTruthy()
  })

  // Weak point 3 — the plan's test name promised a disabled control it never
  // asserted. The honest behaviour: a fixed fault STAYS editable so the
  // planner can change their mind before submitting; only `disabled` freezes it.
  test('a fixed fault renders its Validated state and stays editable', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{ s2: { grossWeight: '250' }, s3: { timezone: 'CST' } }} onFix={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fix line 2' }))
    expect(screen.getByLabelText('Gross weight, line 2').hasAttribute('disabled')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Fix line 3' }))
    // The sr-only wrapper label names the trigger; its VISIBLE text is still
    // the current value ("CST"), the two are separate accessible-name vs.
    // content concerns.
    const tzTrigger = screen.getByRole('button', { name: 'Time zone, line 3' })
    expect(tzTrigger.hasAttribute('disabled')).toBe(false)
    expect(tzTrigger.textContent).toContain('CST')
  })

  test('disabled: the row action reads View, and the modal renders every control inert', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} disabled />)
    expect(screen.queryByRole('button', { name: /^Fix line/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'View line 1' }))
    expect(screen.queryByRole('button', { name: /Remove schedule/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'View line 2' }))
    expect(screen.getByLabelText('Gross weight, line 2').hasAttribute('disabled')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'View line 3' }))
    expect(screen.getByRole('button', { name: 'Time zone, line 3' }).hasAttribute('disabled')).toBe(true)
  })

  test('isStructuralFixed is the predicate the composing panel must reuse', () => {
    expect(isStructuralFixed(products[1], structural[2], { grossWeight: '250' })).toBe(true)
    expect(isStructuralFixed(products[1], structural[2], { grossWeight: '999' })).toBe(false)
    expect(isStructuralFixed(products[0], structural[0], { removeSchedules: ['prod-1-sch-2'] })).toBe(true)
    expect(isStructuralFixed(products[2], structural[3], { timezone: '' })).toBe(false)
  })
})
