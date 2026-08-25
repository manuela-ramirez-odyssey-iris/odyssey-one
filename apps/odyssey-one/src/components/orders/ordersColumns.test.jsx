import { describe, it, expect } from 'vitest'
import { TAB_COLUMNS, allTabActionLabels, primaryRowAction } from './ordersColumns'

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
  // S131 — opening a row (a search-result click) offers only what that row's own
  // menu offers: Resolve → Edit → View, each gated by its real availability.
  it('picks the first AVAILABLE action, in resolve → edit → view order', () => {
    // Resolve exactly where the VE tab's button is enabled.
    expect(primaryRowAction({ status: 'Planning Failed', draftOrderStatus: 'Ready', orderSource: 'Manual' })).toBe('Resolve')
    // Not resolvable, but still erroring and editable → the place to fix it.
    expect(primaryRowAction({ status: 'Shipment Failed', draftOrderStatus: 'Complete', orderSource: 'Manual' })).toBe('Edit')
    expect(primaryRowAction({ status: 'Draft', orderSource: 'Manual' })).toBe('Edit')
    // Integrated is never editable — an earlier cut opened the create form for
    // an INTEGRATED draft, an action its own ⋮ menu (['View','Copy']) refuses.
    expect(primaryRowAction({ status: 'Draft', orderSource: 'Integrated' })).toBe('View')
    expect(primaryRowAction({ status: 'Shipment Failed', draftOrderStatus: 'Purge', orderSource: 'Integrated' })).toBe('View')
    // Cancelled drops Edit from the menu; a finished order reads, not edits.
    expect(primaryRowAction({ status: 'Cancelled', orderSource: 'Manual' })).toBe('View')
    expect(primaryRowAction({ status: 'Ready For Plan', orderSource: 'Manual' })).toBe('View')
  })
})
