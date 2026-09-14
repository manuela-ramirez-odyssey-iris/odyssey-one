// @vitest-environment jsdom
// apps/odyssey-one/src/components/orders/audit-trail/auditTrailColumns.test.jsx
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
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
    const { container: fields } = render(<ChangeStack changes={changes} part="field" />)
    expect(within(fields).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Gross Weight', 'Equipment'])

    const { container: olds } = render(<ChangeStack changes={changes} part="oldValue" />)
    const oldBadges = olds.querySelectorAll('.text-badge')
    expect(oldBadges).toHaveLength(2)
    expect(oldBadges[0].textContent).toBe('200 LB')
    expect(oldBadges[0].getAttribute('style')).toContain('--badge-gray-bg')

    const { container: news } = render(<ChangeStack changes={changes} part="newValue" />)
    const newBadges = news.querySelectorAll('.text-badge')
    expect(newBadges[1].textContent).toBe('FTL')
    expect(newBadges[1].getAttribute('style')).toContain('--badge-purple-bg')
    expect(news.querySelector('svg')).toBeNull() // no alarm icon — a change is not a fault

    const { container: empty } = render(<ChangeStack changes={[]} part="field" />)
    expect(empty.textContent).toBe('--')
  })
})
