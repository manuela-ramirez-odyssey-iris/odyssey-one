// @vitest-environment jsdom
// Fix B (2026-08-10, user ruling on DEC-61): BottomBar used to hold the
// PREVIOUS shipment's details in a hand-rolled `lastDetailsRef` while a newly
// selected shipment's detail query was in flight, so the bar header showed the
// NEW id (read synchronously off `selectedShipmentId`) over the OLD shipment's
// pane content — the wrong shipment's data, no on-screen indication. The fix
// replaces the ref with react-query v5's native previous-data behaviour
// (`placeholderData: keepPreviousData`, installed react-query is ^5.101.0 per
// package.json) so `isPlaceholderData` can drive a visible stale indicator
// instead. This test pins the query-layer half of that: switching the query
// key (id) while the old query still has data must keep serving the OLD data
// as a PLACEHOLDER (isPlaceholderData true) rather than dropping to
// undefined/isLoading, and a genuinely fresh id (never fetched before) must
// NOT get placeholder data (nothing to reuse).
import { describe, test, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useShipmentDetail } from './useShipmentDetail'

const DETAIL_A = { orderDetails: [{ orderNumber: 'ORD-A' }] }
const DETAIL_B = { orderDetails: [{ orderNumber: 'ORD-B' }] }

let resolveB: (() => void) | null = null

vi.mock('../services/shipmentService', () => ({
  getSellShipmentDetail: vi.fn(async (id: string) => {
    if (id === 'A') return DETAIL_A
    if (id === 'B') {
      // Held open until the test explicitly resolves it, so the assertions
      // below observe the mid-flight state (B still pending) rather than a
      // resolved-in-a-microtask race.
      await new Promise<void>((res) => { resolveB = res })
      return DETAIL_B
    }
    throw new Error(`unexpected id ${id}`)
  }),
}))

function wrapperFor(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useShipmentDetail — Fix B placeholderData (keepPreviousData)', () => {
  test('a fresh id (nothing cached) gets no placeholder — plain loading', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(({ id }) => useShipmentDetail(id), {
      wrapper: wrapperFor(qc),
      initialProps: { id: 'B' as string | null },
    })
    expect(result.current.data).toBeUndefined()
    expect(result.current.isPlaceholderData).toBe(false)
    expect(result.current.isLoading).toBe(true)
    resolveB?.()
    await waitFor(() => expect(result.current.data).toEqual(DETAIL_B))
  })

  test('switching from a loaded id to a new one keeps the OLD data as a placeholder', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result, rerender } = renderHook(({ id }) => useShipmentDetail(id), {
      wrapper: wrapperFor(qc),
      initialProps: { id: 'A' as string | null },
    })
    await waitFor(() => expect(result.current.data).toEqual(DETAIL_A))
    expect(result.current.isPlaceholderData).toBe(false)

    rerender({ id: 'B' })
    // Mid-flight: B hasn't resolved (held by resolveB), but A's data must
    // still be visible, flagged as a placeholder — this is the flag BottomBar
    // now uses to dim the pane + show the spinner overlay.
    expect(result.current.data).toEqual(DETAIL_A)
    expect(result.current.isPlaceholderData).toBe(true)

    resolveB?.()
    await waitFor(() => expect(result.current.data).toEqual(DETAIL_B))
    expect(result.current.isPlaceholderData).toBe(false)
  })
})
