// @vitest-environment jsdom
// S107 addendum: live mode has NO suggestion source (adapter.getAttributeValues
// is `null`) — the Filters view's letters ComboBox must degrade to a plain
// free-text field, never the "No matching values" typeahead empty-panel (which
// misreads as "this value doesn't exist"). Mocks the adapter module so this
// test doesn't care whether the app is actually running in mock or live mode.
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

afterEach(cleanup)

describe('ShipmentsFiltersView — letters ComboBox typeahead gating', () => {
  test('mock adapter (getAttributeValues present) shows the typeahead empty-state', async () => {
    vi.resetModules()
    vi.doMock('../../search/shipments', () => ({
      shipmentsSearchAdapter: { getAttributeValues: async () => [] },
    }))
    const { default: ShipmentsFiltersView } = await import('./ShipmentsFiltersView.jsx')
    render(<ShipmentsFiltersView />)
    const input = screen.getByPlaceholderText('Select Customer ID')
    fireEvent.change(input, { target: { value: 'zz' } })
    expect(await screen.findByText('No matching values')).toBeTruthy()
    vi.doUnmock('../../search/shipments')
  })

  // S130: the live source is PAGED — it resolves { options, total } and expects
  // the accumulated count back as the second argument. Dropping `skip` in the
  // view's loadOptions wrapper silently re-requests page 1 forever, so the
  // dropdown looks like it lazy-loads while never advancing.
  test('the dataKey AND the ComboBox skip both reach the adapter', async () => {
    vi.resetModules()
    const seen = []
    vi.doMock('../../search/shipments', () => ({
      shipmentsSearchAdapter: {
        getAttributeValues: async (dataKey, q, skip) => {
          seen.push({ dataKey, q, skip })
          return { options: ['Acme Co'], total: 400 }
        },
      },
    }))
    const { default: ShipmentsFiltersView } = await import('./ShipmentsFiltersView.jsx')
    render(<ShipmentsFiltersView />)
    fireEvent.change(screen.getByPlaceholderText('Select Customer Name'), { target: { value: 'ac' } })
    // The rendered rows are virtualized (invisible to jsdom) — what this pins is
    // the call the view makes, which is where the wiring defect would live.
    await vi.waitFor(() => expect(seen.length).toBeGreaterThan(1))
    expect(seen[0]).toEqual({ dataKey: 'customerName', q: 'ac', skip: 0 })
    // `total` (400) exceeds the page, so the ComboBox asks for the next one with
    // the accumulated count — a dropped `skip` would refetch page 1 forever.
    expect(seen.some((c) => c.skip > 0)).toBe(true)
    vi.doUnmock('../../search/shipments')
  })

  test('live adapter (getAttributeValues null) never shows the typeahead panel', async () => {
    vi.resetModules()
    vi.doMock('../../search/shipments', () => ({
      shipmentsSearchAdapter: { getAttributeValues: null },
    }))
    const { default: ShipmentsFiltersView } = await import('./ShipmentsFiltersView.jsx')
    render(<ShipmentsFiltersView />)
    const input = screen.getByPlaceholderText('Select Customer ID')
    fireEvent.change(input, { target: { value: 'zz' } })
    expect(screen.queryByText('No matching values')).toBeNull()
    vi.doUnmock('../../search/shipments')
  })
})
