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
