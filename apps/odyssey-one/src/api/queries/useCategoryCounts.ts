import { useQuery } from '@tanstack/react-query'
import { getCategoryCounts } from '../services/gridService'

export function useCategoryCounts(panel: string) {
  return useQuery({
    queryKey: ['shipment-category-counts', panel],
    queryFn: () => getCategoryCounts({ panel }),
  })
}
