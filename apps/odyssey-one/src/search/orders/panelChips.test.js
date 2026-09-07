// S131 — the Orders panel and the search bar are ONE criteria state: the panel
// writes chips for every field the bar can express, and opening it shows the
// chips already committed. The failure this guards against is a criterion that
// exists on both paths at once (applied twice, with different matching rules).
import { describe, expect, it } from 'vitest'
import { chipsToPanelState, panelOwnedChipKeys, panelStateToChips } from './panelChips'
import { toRequestFilters } from './toRequest'

const chip = (key, queryValue) => ({ key, queryValue })

describe('panelStateToChips — what leaves the panel as a chip', () => {
  it('emits chips for the twinned fields and blanks their params', () => {
    const { chips, params } = panelStateToChips('all', {
      orderNumber: '091000, 091001',
      customer: ['BASF_CHM_01'],
      orderStatus: ['Draft', 'Cancelled'],
    })
    expect(chips.map((c) => [c.key, c.queryValue])).toEqual([
      ['order-number', '091000, 091001'],
      ['order-status', 'Draft, Cancelled'],
      ['customer', 'BASF_CHM_01'],
    ])
    // Never both paths for one criterion.
    expect(toRequestFilters('all', params)).toEqual({})
  })

  it('keeps a fixed-catalog chip EXACT, so "Draft" cannot match "Draft Order"', () => {
    const { chips } = panelStateToChips('all', { orderStatus: ['Draft'] })
    expect(chips[0].exact).toBe(true)
  })

  it('leaves untwinned fields on the param path', () => {
    const { chips, params } = panelStateToChips('all', {
      origin: ['Geismar|LA|US'],
      latestPickup: { from: '2026-05-01', to: '2026-05-09' },
    })
    expect(chips).toEqual([])
    expect(toRequestFilters('all', params)).toMatchObject({
      latestPickupDateFrom: '2026-05-01',
      latestPickupDateTo: '2026-05-09',
    })
  })

  it('both status fields chip independently — one panel, no tab scoping (ORD-23)', () => {
    const { chips } = panelStateToChips('validation-errors', {
      draftOrderStatus: ['Purge'],
      orderStatus: ['Draft'],
    })
    expect(chips.map((c) => c.key).sort()).toEqual(['draft-order-status', 'order-status'])
  })
})

describe('chipsToPanelState — what the panel shows when it opens', () => {
  it('seeds each control in its own value shape', () => {
    // 'Cancelled', not 'Draft' — Draft is excluded from the Created tab's
    // Order Status catalog (D3, ORD-24): it has its own tab.
    expect(chipsToPanelState('all', [
      chip('order-number', '091000'),
      chip('customer', 'BASF'),
      chip('order-status', 'Cancelled'),
      chip('latest-pickup', '5/29/2026'),
    ])).toEqual({
      orderNumber: '091000',
      customer: ['BASF'],
      orderStatus: ['Cancelled'],
      latestPickup: { from: '2026-05-29', to: '2026-05-29' },
    })
  })

  it('ignores a chip with no panel twin at all', () => {
    // Equipment has no CHIP_TWINS/DATE_TWINS entry — it stays bar-only on
    // every tab, unlike Created By which IS a panel field now (ORD-23).
    expect(chipsToPanelState('all', [chip('equipment', 'LTR'), chip('created-by', 'jdoe')]))
      .toEqual({ createdBy: ['jdoe'] })
  })

  it('drops an enum value that is not in the catalog', () => {
    expect(chipsToPanelState('all', [chip('order-status', 'Nonsense')])).toEqual({ orderStatus: [] })
  })

  it('round-trips a panel draft through the bar unchanged', () => {
    const draft = { orderNumber: '091000', customer: ['BASF_CHM_01'], orderStatus: ['Cancelled'] }
    const { chips } = panelStateToChips('all', draft)
    expect(chipsToPanelState('all', chips)).toEqual(draft)
  })
})

describe('panelOwnedChipKeys — what an apply replaces on the bar', () => {
  it('covers the chip twins AND the date fields the panel seeds', () => {
    const owned = panelOwnedChipKeys('all')
    expect(owned.has('customer')).toBe(true)
    expect(owned.has('latest-pickup')).toBe(true)   // seeded from a chip, applied as a param
    expect(owned.has('equipment')).toBe(false)      // bar-only, must survive an apply
  })
})
