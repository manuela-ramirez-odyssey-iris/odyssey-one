// @vitest-environment jsdom
// S130 — the Orders bar is wired to the Filters panel the way Shipments' is:
// applying populates the bar with the criteria, and the bar can modify them.
// Before this the bar showed only the free-text badge, so an applied filter was
// visible ONLY as a number on the FilterButton.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'

// GlobalSearch collapses trailing chips behind a "+N" pill when they overflow
// the bar's width. jsdom reports every width as 0, so with two or more chips the
// gap alone (4px) exceeds the available 0 and the bar hides ALL of them —
// nothing would be clickable. Giving the container a real width restores the
// no-overflow path, which is the one this file is about.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1000 })
})
afterAll(() => {
  delete HTMLElement.prototype.clientWidth
})

vi.mock('../../api/config', () => ({ getApiMode: () => 'mock' }))
vi.mock('../../data/orders', () => ({
  getAllOrders: () => [{
    orderNumber: 'AAA1', customer: 'BASF_CHM_01', equipment: 'LTR',
    orderStatus: 'Load Planned', orderSource: 'INTEGRATED', hazardous: false,
    consignor: { name: 'Geismar Works', city: 'Geismar', state: 'LA', country: 'US' },
    consignee: { name: 'Chicago DC', city: 'Chicago', state: 'IL', country: 'US' },
  }],
}))

import OrdersGlobalSearch from './OrdersGlobalSearch'

afterEach(cleanup)

const setup = (props = {}) => {
  const onApply = vi.fn()
  const onSearch = vi.fn()
  const onCommitCriteria = vi.fn()
  const view = render(
    <OrdersGlobalSearch
      tab="all"
      filters={{ customer: ['BASF_CHM_01'], orderNumber: 'AAA1' }}
      onApply={onApply}
      open={false}
      onOpenChange={vi.fn()}
      onSearch={onSearch}
      onCommitCriteria={onCommitCriteria}
      {...props}
    />,
  )
  return { ...view, onApply, onSearch, onCommitCriteria }
}

describe('OrdersGlobalSearch — applied filters ride in the bar', () => {
  it('renders one chip per applied field', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Remove Order Number: AAA1' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove Customer: BASF_CHM_01' })).toBeTruthy()
  })

  it('removing a chip clears THAT field and re-applies, leaving the others', () => {
    const { onApply } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Order Number: AAA1' }))
    expect(onApply).toHaveBeenCalledTimes(1)
    const next = onApply.mock.calls[0][0]
    expect(next.orderNumber).toBe('')
    expect(next.customer).toEqual(['BASF_CHM_01']) // untouched
  })

  it('the bar X clears BOTH criteria paths, not just the text', () => {
    const { onApply, onCommitCriteria } = setup()
    fireEvent.click(screen.getByLabelText('Clear search'))
    // Bar criteria (flat searchChips + text)...
    expect(onCommitCriteria).toHaveBeenCalledWith([], '')
    // ...and the panel's own tab-scoped filters.
    expect(onApply).toHaveBeenCalledTimes(1)
    const next = onApply.mock.calls[0][0]
    expect(next.customer).toEqual([])
    expect(next.orderNumber).toBe('')
  })

  it('an unfiltered tab shows no chips at all', () => {
    setup({ filters: {} })
    expect(document.querySelectorAll('.global-search-chip')).toHaveLength(0)
  })
})

// S130 — the bar was given the Orders adapter. Before this it was constructed
// with `useGlobalSearch(null)`, so however complete the adapter was there was no
// suggestion dropdown and no results preview: "i dont see the preview panel nor
// the suggested filters popping up".
describe('OrdersGlobalSearch — suggestions + results preview', () => {
  // The bar drops its placeholder once a chip is committed, so this cannot query
  // by placeholder text after the first commit — there is exactly one text input
  // in the bar either way.
  const typeInBar = (text) => {
    const input = document.querySelector('.orders-global-search input[type="text"]')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: text } })
    return input
  }

  it('typing offers the attributes whose real values match', async () => {
    setup({ filters: {} })
    typeInBar('BASF')
    expect(await screen.findByText('Customer: BASF')).toBeTruthy()
  })

  it('does NOT offer an attribute the grid has no filter param for', async () => {
    setup({ filters: {} })
    // 'LTR' is a real Equipment value on the mocked row, so the adapter ranks
    // it — but no request param exists, so committing it could not narrow the
    // table and the bar must not pretend otherwise.
    typeInBar('LTR')
    await waitFor(() => expect(screen.queryByText(/^Equipment/)).toBeNull())
  })

  it('selecting a suggestion commits a draft chip and opens the preview', async () => {
    setup({ filters: {} })
    typeInBar('BASF')
    fireEvent.click(await screen.findByText('Customer: BASF'))
    // The chip is on the bar, and the preview panel is now showing.
    expect(await screen.findByRole('button', { name: 'Remove Customer: BASF' })).toBeTruthy()
    expect(document.querySelector('.orders-results-panel')).toBeTruthy()
  })

  it('"Show all results" commits the chips as FLAT criteria, not panel state', async () => {
    const { onApply, onCommitCriteria } = setup({ filters: {} })
    typeInBar('BASF')
    fireEvent.click(await screen.findByText('Customer: BASF'))
    fireEvent.click(await screen.findByRole('button', { name: /Show all/ }))
    expect(onCommitCriteria).toHaveBeenCalledTimes(1)
    const [chips, text] = onCommitCriteria.mock.calls[0]
    expect(chips.map((c) => [c.key, c.queryValue])).toEqual([['customer', 'BASF']])
    expect(text).toBe('')
    // The panel's tab-scoped filter state is NOT where bar criteria go.
    expect(onApply).not.toHaveBeenCalled()
  })

  it('chips and text commit together, in ONE call', async () => {
    const { onCommitCriteria } = setup({ filters: {} })
    typeInBar('BASF')
    fireEvent.click(await screen.findByText('Customer: BASF'))
    typeInBar('AAA1')
    fireEvent.click(await screen.findByRole('button', { name: /Show all/ }))
    const [chips, text] = onCommitCriteria.mock.calls.at(-1)
    expect(chips).toHaveLength(1)
    expect(text).toBe('AAA1')
  })

  it('removing a committed chip re-commits what is left', async () => {
    const { onCommitCriteria } = setup({ filters: {} })
    typeInBar('BASF')
    fireEvent.click(await screen.findByText('Customer: BASF'))
    fireEvent.click(await screen.findByRole('button', { name: /Show all/ }))
    onCommitCriteria.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Customer: BASF' }))
    // The grid must never disagree with what the bar shows.
    expect(onCommitCriteria).toHaveBeenCalledWith([], '')
  })

  it('offers an attribute that has NO panel filter field behind it', async () => {
    // Equipment is on no tab's basic-filter list, and before the flat criteria
    // path it was filtered out of the suggestions entirely.
    setup({ filters: {} })
    typeInBar('LTR')
    expect(await screen.findByText('Equipment: LTR')).toBeTruthy()
  })
})
