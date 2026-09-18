import { describe, it, expect } from 'vitest'
import { TAB_COLUMNS, allTabActionLabels, primaryRowAction } from './ordersColumns'

describe('ordersColumns', () => {
  it('exposes the three per-tab column sets with spec headers', () => {
    expect(TAB_COLUMNS.created.map(c => c.header).filter(h => typeof h === 'string')).toContain('Shipper Location')
    expect(TAB_COLUMNS.draft.map(c => c.header)).toEqual(['Order Number', 'Customer', 'Created', 'Created By', 'Last Edit', 'Last Edited By'])
    expect(TAB_COLUMNS['validation-errors'].map(c => c.header)).toEqual(['Order Number', 'Customer', 'Validation Status', 'Errors Count'])
  })
  it('adapts All-tab actions per row (LINX-10233); Audit Trail on every Created row (ORD-27)', () => {
    expect(allTabActionLabels({ orderSource: 'Manual', status: 'Ready for Planning' })).toEqual(['View', 'Audit Trail', 'Edit', 'Copy', 'Cancel'])
    expect(allTabActionLabels({ orderSource: 'Integrated', status: 'Ready for Planning' })).toEqual(['View', 'Audit Trail', 'Copy'])
    expect(allTabActionLabels({ orderSource: 'Manual', status: 'Cancelled' })).toEqual(['View', 'Audit Trail', 'Copy', 'Restore'])
  })
  // DEC-164 — "See in Shipments" only where the status MEANS the order is in a
  // shipment. S149 also allowed `Shipment Failed`; DEC-162 retired that for
  // shipped orders (a failed tender is not a failed shipment), leaving
  // `Planned Shipment` as the exact invariant.
  it('offers See in Shipments only for orders that are in a shipment', () => {
    expect(allTabActionLabels({ orderSource: 'Integrated', status: 'Planned Shipment' })).toEqual(['View', 'Audit Trail', 'See in Shipments', 'Copy'])
    expect(allTabActionLabels({ orderSource: 'Manual', status: 'Planned Shipment' })).toEqual(['View', 'Audit Trail', 'See in Shipments', 'Edit', 'Copy', 'Cancel'])
    for (const status of ['Ready for Planning', 'Planned Load', 'Planning Failed', 'Shipment Failed', 'Hold', 'Draft', 'Cancelled']) {
      expect(allTabActionLabels({ orderSource: 'Manual', status }), status).not.toContain('See in Shipments')
    }
  })

  // The gate must agree with the corpus, not just with itself: every order the
  // seed puts in a shipment must be offered the action, and no order outside
  // one may be. This is what caught DEC-155 going stale when DEC-162 rewrote
  // the status vocabulary underneath it.
  it('the gate matches the seeded corpus exactly', async () => {
    const [{ default: shipments }, { default: orders }] = await Promise.all([
      import('../../data/shipments.json'),
      import('../../data/orders.json'),
    ])
    const inShipment = new Set(shipments.flatMap((s) => s.orders))
    const offered = (o) => allTabActionLabels({ orderSource: o.orderSource, status: o.orderStatus }).includes('See in Shipments')
    // Validation-Errors rows (orderStatus null) never reach this menu.
    const lifecycle = orders.filter((o) => o.orderStatus)
    const missed = lifecycle.filter((o) => inShipment.has(o.orderNumber) && !offered(o))
    const wrong = lifecycle.filter((o) => !inShipment.has(o.orderNumber) && offered(o))
    expect(missed.map((o) => `${o.orderNumber}:${o.orderStatus}`).slice(0, 5)).toEqual([])
    expect(wrong.map((o) => `${o.orderNumber}:${o.orderStatus}`).slice(0, 5)).toEqual([])
  })
  // S131 — opening a row (a search-result click) offers only what that row's own
  // menu offers: Resolve → Edit → View, each gated by its real availability.
  it('picks the first AVAILABLE action, in resolve → edit → view order', () => {
    // Resolve exactly where the VE tab's button is enabled.
    expect(primaryRowAction({ status: 'Planning Failed', draftOrderStatus: 'Error', orderSource: 'Manual' })).toBe('Resolve')
    // Not resolvable, but still erroring and editable → the place to fix it.
    expect(primaryRowAction({ status: 'Shipment Failed', draftOrderStatus: 'Complete', orderSource: 'Manual' })).toBe('Edit')
    expect(primaryRowAction({ status: 'Draft', orderSource: 'Manual' })).toBe('Edit')
    // Integrated is never editable — an earlier cut opened the create form for
    // an INTEGRATED draft, an action its own ⋮ menu (['View','Copy']) refuses.
    expect(primaryRowAction({ status: 'Draft', orderSource: 'Integrated' })).toBe('View')
    expect(primaryRowAction({ status: 'Shipment Failed', draftOrderStatus: 'Purge', orderSource: 'Integrated' })).toBe('View')
    // Cancelled drops Edit from the menu; a finished order reads, not edits.
    expect(primaryRowAction({ status: 'Cancelled', orderSource: 'Manual' })).toBe('View')
    expect(primaryRowAction({ status: 'Ready for Planning', orderSource: 'Manual' })).toBe('View')
    // Audit Trail is never a row's primary action — opening a row reads or fixes it.
    expect(primaryRowAction({ status: 'Cancelled', orderSource: 'Integrated' })).toBe('View')
  })
})
