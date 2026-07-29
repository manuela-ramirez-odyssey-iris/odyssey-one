import { createContext, useContext } from 'react'

/**
 * Resolve-mode plumbing (LINX-11137 behavior). Inactive (null) in the normal
 * create/edit flow. Active value shape (built in CreateOrderForm):
 *   { errorByPath: Map<path, error>, resolvedSet: Set<path> }
 */
const ResolveModeContext = createContext(null)
export const ResolveModeProvider = ResolveModeContext.Provider

export function useResolveMode() {
  return useContext(ResolveModeContext)
}

/**
 * Per-field prop injection — call with the context value + an RHF path; spread
 * the result LAST at a field call site so it wins over fieldState props.
 * - not in resolve mode / non-pool field → {}
 * - pool field, unresolved → { error: <category reason>, validated: false }
 * - pool field, resolved   → { error: undefined, validated: true }
 */
export function resolveFieldProps(ctx, path) {
  if (!ctx) return {}
  const err = ctx.errorByPath.get(path)
  if (!err) return {}
  return ctx.resolvedSet.has(path)
    ? { error: undefined, validated: true }
    : { error: err.reason, validated: false }
}
