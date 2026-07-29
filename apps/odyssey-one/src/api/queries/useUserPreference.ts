import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPreference, putPreference } from '../services/preferenceService'

// Load-once + save-on-commit seam for a single user_preferences row. No
// optimistic updates / invalidation: the component owning the state IS the
// source of truth after hydration — save is fire-and-forget.
export function useUserPreference<T>(key: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-preference', key],
    queryFn: () => getPreference<T>(key),
    staleTime: Infinity,
  })
  const save = useCallback((value: T) => {
    putPreference(key, value).catch((e) => console.error(`putPreference(${key})`, e))
  }, [key])
  return { data: data ?? null, isLoading, save }
}
