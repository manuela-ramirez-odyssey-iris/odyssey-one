// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import StructuralGrid, { isStructuralFixed } from './StructuralGrid.jsx'

afterEach(cleanup)

const products = [
  { id: 'prod-1', productId: 'A', description: 'Steel Coils', grossWeight: { value: '100', uom: 'lbs' }, volume: { value: '10', uom: 'cbf' }, handlingCount: '2', schedules: [
    { id: 'prod-1-sch-1', requestedShipDate: '06/15/2026', latestDeliveryDate: '06/20/2026', packageCount: '2', requestedShipTimeZoneCode: 'CDT', grossWeight: '100', grossWeightUom: 'lbs' },
    { id: 'prod-1-sch-2', requestedShipDate: '06/16/2026', latestDeliveryDate: '06/21/2026', packageCount: '2', requestedShipTimeZoneCode: 'CDT', grossWeight: '100', grossWeightUom: 'lbs' },
  ] },
  { id: 'prod-2', productId: 'B', grossWeight: { value: '200', uom: 'lbs' }, volume: { value: '20', uom: 'cbf' }, handlingCount: '3', scheduleQuantity: { grossWeight: '250', grossWeightUom: 'lbs', volume: '20' } },
  { id: 'prod-3', productId: 'C', grossWeight: { value: '300', uom: 'lbs' }, volume: { value: '30', uom: 'cbf' }, scheduleTimezone: '' },
  { id: 'prod-4', productId: 'D', grossWeight: { value: '400', uom: 'lbs' }, volume: { value: '40', uom: 'cbf' } },
  // Level-1 seed invariant I8: manual_order stays NULL for a share of orders,
  // so the synthesized line has no shipItemIdentifier — productId is
  // legitimately '' (not a bug), and a lean order can lack a description too.
  { id: 'prod-5', productId: '', description: 'Sulfuric Acid 93%', grossWeight: { value: '500', uom: 'lbs' }, volume: { value: '50', uom: 'cbf' }, scheduleTimezone: '' },
  { id: 'prod-6', productId: '', description: '', grossWeight: { value: '600', uom: 'lbs' }, volume: { value: '60', uom: 'cbf' }, scheduleTimezone: '' },
  { id: 'prod-7', productId: 'G', grossWeight: { value: '700', uom: '' }, volume: { value: '70', uom: 'cbf' }, handlingCount: '1', schedules: [
    { id: 'prod-7-sch-1', requestedShipDate: '07/01/2026', latestDeliveryDate: '07/05/2026', packageCount: '1', grossWeight: '700', grossWeightUom: '' },
    { id: 'prod-7-sch-2', requestedShipDate: '07/02/2026', latestDeliveryDate: '07/06/2026', packageCount: '1', grossWeight: '700', grossWeightUom: '' },
  ] },
]
// Line 1 carries TWO faults (extra-schedule + a second, unrelated timezone
// fault) so "lists only the offending lines" also proves a multi-fault line
// still renders as ONE row with both faults stacked and the badge counting
// both. Line 7 also carries an extra-schedule fault, so the consistency strip
// (line 1's decision showing line 7's schedule) has something to show.
const structural = [
  { id: 's1', rule: 1, kind: 'extra-schedule', line: 1, field: 'Schedules per line', message: 'An order line can have only 1 schedule.' },
  { id: 's1b', rule: 4, kind: 'timezone-missing', line: 1, field: 'Requested Ship Time Zone', message: 'Requested Ship Time-Zone missing.' },
  { id: 's2', rule: 2, kind: 'quantity-mismatch', line: 2, field: 'Line vs schedule quantity', message: 'Line and Schedule mismatch.' },
  { id: 's3', rule: 4, kind: 'timezone-missing', line: 3, field: 'Requested Ship Time Zone', message: 'Requested Ship Time-Zone missing.' },
  { id: 's5', rule: 4, kind: 'timezone-missing', line: 5, field: 'Requested Ship Time Zone', message: 'Requested Ship Time-Zone missing.' },
  { id: 's6', rule: 4, kind: 'timezone-missing', line: 6, field: 'Requested Ship Time Zone', message: 'Requested Ship Time-Zone missing.' },
  { id: 's7', rule: 1, kind: 'extra-schedule', line: 7, field: 'Schedules per line', message: 'An order line can have only 1 schedule.' },
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

  // S158, user ruling 2026-09-23: StructuralFixModal's Done/Cancel transaction
  // is gone — every decision is an inline PillTab chip, committed the instant
  // it's clicked, straight through to `onFix`. No staging, no modal.
  test('extra schedule: clicking a schedule chip fires onFix(s1, { keepSchedule }) immediately', () => {
    const onFix = vi.fn()
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />)
    const row1 = screen.getByText('A').closest('tr')
    fireEvent.click(within(row1).getByRole('button', { name: /^Schedule 2 ·/ }))
    expect(onFix).toHaveBeenCalledWith('s1', { keepSchedule: 'prod-1-sch-2' })
  })

  test('extra schedule: the other faulty line\'s schedule dates show in a read-only strip', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} />)
    const row1 = screen.getByText('A').closest('tr')
    // Line 7 also has an extra-schedule fault — its first schedule's dates
    // (before any pick) appear in line 1's strip.
    expect(within(row1).getByText(/Line 7: ship 07\/01\/2026 · delivery 07\/05\/2026/)).toBeTruthy()
  })

  test('quantity mismatch: clicking a chip fires onFix(s2, { use }) immediately', () => {
    const onFix = vi.fn()
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />)
    fireEvent.click(screen.getByRole('button', { name: /^Use schedule value ·/ }))
    expect(onFix).toHaveBeenCalledWith('s2', { use: 'schedule' })
    fireEvent.click(screen.getByRole('button', { name: /^Use line value ·/ }))
    expect(onFix).toHaveBeenCalledWith('s2', { use: 'line' })
  })

  // The row badge flips to Validated once the parent re-renders with the fix
  // in place — StructuralGrid doesn't own that state, `fixes` does.
  test('quantity mismatch: the row badge reads Validated once a side is picked', () => {
    const { rerender } = render(
      <StructuralGrid products={products} structural={structural} fixes={{}} onFix={() => {}} />,
    )
    expect(within(screen.getByText('B').closest('tr')).getByText('1 open')).toBeTruthy()
    rerender(<StructuralGrid products={products} structural={structural} fixes={{ s2: { use: 'schedule' } }} onFix={() => {}} />)
    expect(within(screen.getByText('B').closest('tr')).getByText('Validated')).toBeTruthy()
  })

  test('timezone missing: picking a zone via the Dropdown fires onFix(s3, { timezone }) immediately', () => {
    const onFix = vi.fn()
    render(<StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />)
    // The Dropdown trigger renders the placeholder value as its own text (same
    // pattern AuditTrailTable.test.jsx uses for the Paginator's Dropdown) — the
    // anchored portal renders a `menu` role jsdom CAN drive without layout.
    fireEvent.click(screen.getByRole('button', { name: 'Time zone, line 3' }))
    fireEvent.click(within(screen.getByRole('menu')).getByText('CST'))
    expect(onFix).toHaveBeenCalledWith('s3', { timezone: 'CST' })
  })

  // Reversible by construction (user ruling, 2026-09-23): a per-fault Reset
  // clears the decision — no Done/Cancel transaction, nothing staged.
  test('Reset clears a fixed fault, and only shows once a decision exists', () => {
    const onFix = vi.fn()
    const { rerender } = render(
      <StructuralGrid products={products} structural={structural} fixes={{}} onFix={onFix} />,
    )
    const row1 = screen.getByText('A').closest('tr')
    expect(within(row1).queryByRole('button', { name: 'Reset' })).toBeNull()
    rerender(<StructuralGrid products={products} structural={structural} fixes={{ s1: { keepSchedule: 'prod-1-sch-2' } }} onFix={onFix} />)
    const row1b = screen.getByText('A').closest('tr')
    fireEvent.click(within(row1b).getByRole('button', { name: 'Reset' }))
    expect(onFix).toHaveBeenCalledWith('s1', null)
  })

  test('a fixed fault renders its checked state and stays editable (chips/dropdown never freeze except via `disabled`)', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{ s2: { use: 'schedule' }, s3: { timezone: 'CST' } }} onFix={() => {}} />)
    const qtyChip = screen.getByRole('button', { name: /^Use schedule value ·/ })
    expect(qtyChip.hasAttribute('disabled')).toBe(false)
    expect(qtyChip.getAttribute('aria-pressed')).toBe('true')

    const tzTrigger = screen.getByRole('button', { name: 'Time zone, line 3' })
    expect(tzTrigger.hasAttribute('disabled')).toBe(false)
    expect(tzTrigger.textContent).toContain('CST')
  })

  test('disabled: chips, Dropdown and Reset all render inert, no per-fault controls fire', () => {
    render(<StructuralGrid products={products} structural={structural} fixes={{ s2: { use: 'schedule' } }} onFix={() => {}} disabled />)
    expect(screen.getByRole('button', { name: /^Use schedule value ·/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: /^Use line value ·/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Time zone, line 3' }).hasAttribute('disabled')).toBe(true)
  })

  test('isStructuralFixed is the predicate the composing panel must reuse', () => {
    expect(isStructuralFixed(products[1], structural[2], { use: 'schedule' })).toBe(true)
    expect(isStructuralFixed(products[1], structural[2], {})).toBe(false)
    expect(isStructuralFixed(products[0], structural[0], { keepSchedule: 'prod-1-sch-2' })).toBe(true)
    expect(isStructuralFixed(products[0], structural[0], {})).toBe(false)
    expect(isStructuralFixed(products[2], structural[3], { timezone: '' })).toBe(false)
    expect(isStructuralFixed(products[2], structural[3], { timezone: 'CST' })).toBe(true)
  })
})
