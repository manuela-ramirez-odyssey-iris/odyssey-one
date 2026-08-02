import { describe, it, expect } from 'vitest'
import { TAB_COLUMNS, allTabActionLabels } from './ordersColumns'

describe('ordersColumns', () => {
  it('exposes the three per-tab column sets with spec headers', () => {
    expect(TAB_COLUMNS.all.map(c => c.header).filter(h => typeof h === 'string')).toContain('Shipper Location')
    expect(TAB_COLUMNS.draft.map(c => c.header)).toEqual(['Order Number', 'Customer', 'Created', 'Created By', 'Last Edit', 'Last Edited By'])
    expect(TAB_COLUMNS['validation-errors'].map(c => c.header)).toEqual(['Order Number', 'Customer', 'Draft Order Status', 'Errors Count'])
  })
  it('adapts All-tab actions per row (LINX-10233)', () => {
    expect(allTabActionLabels({ orderSource: 'Manual', status: 'Ready For Plan' })).toEqual(['View', 'Edit', 'Copy', 'Cancel'])
    expect(allTabActionLabels({ orderSource: 'Integrated', status: 'Ready For Plan' })).toEqual(['View', 'Copy'])
    expect(allTabActionLabels({ orderSource: 'Manual', status: 'Cancelled' })).toEqual(['View', 'Copy', 'Restore'])
  })
})
