// @vitest-environment jsdom
// apps/odyssey-one/src/components/orders/audit-trail/auditTrailColumns.test.jsx
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, within, screen, fireEvent } from '@testing-library/react'
import { AUDIT_TRAIL_COLUMNS, formatAuditTimestamp, ChangeStack } from './auditTrailColumns.jsx'

afterEach(cleanup)

const headers = () => AUDIT_TRAIL_COLUMNS.map((c) => c.header)

describe('auditTrailColumns', () => {
  it('lists the AC columns in order, without Order ID (it lives in the page header)', () => {
    expect(headers()).toEqual([
      'Date & Timestamp', 'Change Made By', 'Source', 'Change Type', 'Change Category',
      'Line Item ID', 'Field Name', 'Old Value', 'New Value',
    ])
  })
  it('only Date & Timestamp is sortable (AC §I remarks)', () => {
    const sortable = AUDIT_TRAIL_COLUMNS.filter((c) => c.enableSorting !== false).map((c) => c.header)
    expect(sortable).toEqual(['Date & Timestamp'])
  })
  it('formats MM/DD/YYYY HH:MM 24-hour with the zone', () => {
    expect(formatAuditTimestamp('2026-05-23T14:30:00', 'CDT')).toBe('05/23/2026 14:30 CDT')
    expect(formatAuditTimestamp('2026-01-05T08:05:00', '')).toBe('01/05/2026 08:05')
    expect(formatAuditTimestamp('', 'CDT')).toBe('--')
  })
  it('ChangeStack renders one line per change, Old gray / New purple badges, and "--" when empty', () => {
    const changes = [
      { field: 'Gross Weight', oldValue: '200 LB', newValue: '350 LB' },
      { field: 'Equipment', oldValue: 'LTR', newValue: 'FTL' },
    ]
    const row = { id: 'r-1', lineItemId: null, changes }
    const { container: fields } = render(<ChangeStack row={row} part="field" />)
    expect(within(fields).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Gross Weight', 'Equipment'])

    const { container: olds } = render(<ChangeStack row={row} part="oldValue" />)
    const oldBadges = olds.querySelectorAll('.text-badge')
    expect(oldBadges).toHaveLength(2)
    expect(oldBadges[0].textContent).toBe('200 LB')
    expect(oldBadges[0].getAttribute('style')).toContain('--badge-gray-bg')

    const { container: news } = render(<ChangeStack row={row} part="newValue" />)
    const newBadges = news.querySelectorAll('.text-badge')
    expect(newBadges[1].textContent).toBe('FTL')
    expect(newBadges[1].getAttribute('style')).toContain('--badge-purple-bg')
    expect(news.querySelector('svg')).toBeNull() // no alarm icon — a change is not a fault

    const { container: empty } = render(<ChangeStack row={{ id: 'r-2', lineItemId: null, changes: [] }} part="field" />)
    expect(empty.textContent).toBe('--')
  })

  it('ChangeStack folds anything past 3 changes behind a "+X more" chip that opens a modal listing every change (Part 9)', () => {
    const changes = [
      { field: 'Gross Weight', oldValue: '100 LB', newValue: '150 LB' },
      { field: 'Equipment', oldValue: 'LTR', newValue: 'FTL' },
      { field: 'Freight Terms', oldValue: 'Prepaid', newValue: 'Collect' },
      { field: 'Latest Pickup', oldValue: '2026-05-01T08:00:00', newValue: '2026-05-02T08:00:00' },
    ]
    const row = { id: 'r-3', lineItemId: null, changes }

    // field/oldValue columns show 3 lines + a blank filler, no chip
    const { container: fields } = render(<ChangeStack row={row} part="field" />)
    expect(within(fields).getAllByRole('listitem')).toHaveLength(4)
    expect(fields.querySelector('button')).toBeNull()

    // newValue is the one column that renders the chip
    render(<ChangeStack row={row} part="newValue" />)
    const chip = screen.getByRole('button', { name: '+1 more' })
    fireEvent.click(chip)
    const modal = screen.getByRole('dialog', { name: 'All Changes' })
    // Every change is listed, including the 3 already shown in the stack.
    expect(within(modal).getByText('Latest Pickup')).toBeTruthy()
    expect(within(modal).getAllByRole('row')).toHaveLength(changes.length + 1) // + header row
  })

  it('Line Item ID cell reads "N lines" when a save touched more than one real line (Part 9 line-count badge)', () => {
    const lineIdCol = AUDIT_TRAIL_COLUMNS.find((c) => c.header === 'Line Item ID')
    const cellFor = (row) => render(lineIdCol.cell({ row: { original: row } }))

    const single = cellFor({ id: 'r-1', lineItemId: '11415', changes: [] })
    expect(single.container.textContent).toBe('11415')

    const multi = cellFor({ id: 'r-2', lineItemId: '11415', lineItemIds: ['11415', '11416', '11417'], changes: [] })
    expect(multi.container.querySelector('.text-badge').textContent).toBe('3 lines')

    const header = cellFor({ id: 'r-3', lineItemId: null, changes: [] })
    expect(header.container.textContent).toBe('--')
  })

  it('Change Type badge colour follows `changedBy` (User = blue, System = gray), not the changeType label (Part 9)', () => {
    const typeCol = AUDIT_TRAIL_COLUMNS.find((c) => c.header === 'Change Type')
    const badgeStyle = (row) => render(typeCol.cell({ row: { original: row } })).container.querySelector('.text-badge').getAttribute('style')

    // The mismatch case this fixes: a User act filed under the Event family
    // (audit-trail.md §3 — "Order Event · Applied on Hold · User" is legal).
    expect(badgeStyle({ changedBy: 'User', changeType: 'Order Event' })).toContain('--badge-blue-bg')
    expect(badgeStyle({ changedBy: 'System', changeType: 'Order Event' })).toContain('--badge-gray-bg')
    expect(badgeStyle({ changedBy: 'User', changeType: 'Order Action' })).toContain('--badge-blue-bg')
  })
})
