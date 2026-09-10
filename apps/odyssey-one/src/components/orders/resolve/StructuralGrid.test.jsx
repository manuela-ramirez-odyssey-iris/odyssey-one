// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import StructuralGrid, { isStructuralFixed } from './StructuralGrid.jsx'

afterEach(cleanup)

const products = [
  { id: 'prod-1', productId: 'A', grossWeight: { value: '100', uom: 'lbs' }, volume: { value: '10', uom: 'cbf' }, schedules: [{ id: 'prod-1-sch-1' }, { id: 'prod-1-sch-2' }] },
  { id: 'prod-2', productId: 'B', grossWeight: { value: '200', uom: 'lbs' }, volume: { value: '20', uom: 'cbf' }, scheduleQuantity: { grossWeight: '250', volume: '20' } },
  { id: 'prod-3', productId: 'C', grossWeight: { value: '300', uom: 'lbs' }, volume: { value: '30', uom: 'cbf' }, scheduleTimezone: '' },
  { id: 'prod-4', productId: 'D', grossWeight: { value: '400', uom: 'lbs' }, volume: { value: '40', uom: 'cbf' } },
]
const structural = [
  { id: 's1', rule: 1, kind: 'extra-schedule', line: 1, field: 'Schedules per line', message: 'An order line can have only 1 schedule.' },
  { id: 's2', rule: 2, kind: 'quantity-mismatch', line: 2, field: 'Line vs schedule quantity', message: 'Line and Schedule mismatch.' },
  { id: 's3', rule: 4, kind: 'timezone-missing', line: 3, field: 'Requested Ship Time Zone', message: 'Requested Ship Time-Zone missing.' },
]

describe('StructuralGrid', () => {
  test('lists only the offending lines', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} />)
    const rows = screen.getAllByRole('row').slice(1) // minus header
    expect(rows.length).toBe(3)
    expect(screen.queryByText('D')).toBeNull()
  })

  test('extra schedule: trash on the second schedule fires onFix(s1)', () => {
    const onFix = vi.fn()
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove schedule 2 on line 1' }))
    expect(onFix).toHaveBeenCalledWith('s1', { removeSchedule: 'prod-1-sch-2' })
  })

  test('quantity mismatch: editing the line weight to the schedule value fires onFix(s2)', () => {
    const onFix = vi.fn()
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />)
    const input = screen.getByLabelText('Gross weight, line 2')
    fireEvent.change(input, { target: { value: '250' } })
    expect(onFix).toHaveBeenCalledWith('s2', { grossWeight: '250' })
  })

  test('timezone missing: picking a zone fires onFix(s3)', () => {
    const onFix = vi.fn()
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />)
    fireEvent.change(screen.getByLabelText('Time zone, line 3'), { target: { value: 'CST' } })
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
  // asserted. The honest behaviour: a fixed row STAYS editable so the planner
  // can change their mind before submitting; only `disabled` freezes it.
  test('a fixed row renders its Validated state and stays editable', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{ s2: { grossWeight: '250' }, s3: { timezone: 'CST' } }} onFix={() => {}} />)
    const row2 = screen.getByText('B').closest('tr')
    expect(within(row2).getByText('Validated')).toBeTruthy()
    expect(screen.getByLabelText('Gross weight, line 2').hasAttribute('disabled')).toBe(false)
    expect(screen.getByLabelText('Time zone, line 3').hasAttribute('disabled')).toBe(false)
  })

  test('disabled renders every control inert', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} disabled />)
    expect(screen.queryByRole('button', { name: /Remove schedule/ })).toBeNull()
    expect(screen.getByLabelText('Gross weight, line 2').hasAttribute('disabled')).toBe(true)
    expect(screen.getByLabelText('Time zone, line 3').hasAttribute('disabled')).toBe(true)
  })

  test('isStructuralFixed is the predicate the composing panel must reuse', () => {
    expect(isStructuralFixed(products[1], structural[1], { grossWeight: '250' })).toBe(true)
    expect(isStructuralFixed(products[1], structural[1], { grossWeight: '999' })).toBe(false)
    expect(isStructuralFixed(products[0], structural[0], { removeSchedule: 'prod-1-sch-2' })).toBe(true)
    expect(isStructuralFixed(products[2], structural[2], { timezone: '' })).toBe(false)
  })
})
