import { QueryClient } from '@tanstack/react-query'

// Single app-wide client. Replaces the hand-rolled 50-entry detailsCache Map:
// gcTime caps memory, staleTime avoids refetch storms when reopening a shipment.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
