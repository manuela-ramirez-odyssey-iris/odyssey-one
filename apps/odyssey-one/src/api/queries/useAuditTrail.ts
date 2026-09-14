import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getAuditTrail } from '../services/orderService'
import type { AuditTrailRequest } from '../types/auditTrail'

// Per-order audit trail page. keepPreviousData so a page/sort change keeps the
// rows on screen (DataTable `loadingRows`) instead of collapsing to a spinner.
export function useAuditTrail(req: AuditTrailRequest) {
  return useQuery({
    queryKey: ['audit-trail', req.orderNumber, req.pageNumber, req.pageSize, req.sortDirection],
    queryFn: () => getAuditTrail(req),
    enabled: !!req.orderNumber,
    placeholderData: keepPreviousData,
  })
}
