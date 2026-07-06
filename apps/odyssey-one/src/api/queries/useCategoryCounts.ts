import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getCategoryCounts } from '../services/gridService'
import type { SearchCriteria } from '../types/shipmentErrorList'

// Category counts per panel, aware of the committed GlobalSearch criteria (S79c
// decision 7) AND the customer scope (decision 10 — first-order filter): the key
// includes both so tab badges / pills / metrics refetch when a search is
// committed/cleared or the customer selection changes. keepPreviousData keeps
// the old counts visible during the refetch so the zero-count hiding (decision
// 8) never flashes on an empty interim state.
export function useCategoryCounts(panel: string, searchCriteria?: SearchCriteria, customerIds?: string[]) {
  return useQuery({
    queryKey: ['shipment-category-counts', panel, searchCriteria ?? null, customerIds ?? null],
    queryFn: () => getCategoryCounts({ panel, searchCriteria, customerIds }),
    placeholderData: keepPreviousData,
  })
}
