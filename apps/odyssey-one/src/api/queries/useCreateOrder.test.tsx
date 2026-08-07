// @vitest-environment jsdom
// S113 Task 3 (Fix B / item G): useCreateOrder only invalidated ['order-list']
// on success, unlike every sibling write mutation (useSubmitDraftOrder
// invalidates both order-list and order-tab-counts). Result: the "All (N)"
// tab badge went stale after creating an order until some unrelated refetch
// happened to fire. Both query keys must be invalidated.
import { describe, test, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useCreateOrder } from './useCreateOrder'

vi.mock('../services/orderService', () => ({
  createOrder: vi.fn(async () => ({
    success: true,
    orderId: 1,
    message: 'Order created',
    data: { orderNumber: 'ORD-1', orderDate: '', orderDateTimeZoneCode: 'EST', shipmentMode: 'Ground' },
  })),
}))
vi.mock('../mappers/mapFormToOrderInterface', () => ({
  mapFormToOrderInterface: vi.fn(() => ({ orderLines: [] })),
}))

describe('useCreateOrder', () => {
  test('invalidates both order-list and order-tab-counts on success', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children)

    const { result } = renderHook(() => useCreateOrder(), { wrapper })
    result.current.mutate({} as never)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey)
    expect(invalidatedKeys).toContainEqual(['order-list'])
    expect(invalidatedKeys).toContainEqual(['order-tab-counts'])
  })
})
