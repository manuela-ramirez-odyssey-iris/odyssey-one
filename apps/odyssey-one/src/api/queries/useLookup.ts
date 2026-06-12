import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getLookupOptions } from '../services/lookupService'
import type { LookupType } from '../services/lookupService'

export interface UseLookupOptions {
  orgId?: string
  enabled?: boolean // consumers gate on dropdown-open; debounce lives in useDebouncedValue
}

export function useLookup(type: LookupType, query: string, opts: UseLookupOptions = {}) {
  return useQuery({
    queryKey: ['lookup', type, query.trim().toLowerCase(), opts.orgId ?? null],
    queryFn: () => getLookupOptions(type, query, { orgId: opts.orgId }),
    enabled: opts.enabled ?? true,
    staleTime: 5 * 60 * 1000, // master data is stable within a session
    placeholderData: keepPreviousData, // no dropdown flash while typing
  })
}
