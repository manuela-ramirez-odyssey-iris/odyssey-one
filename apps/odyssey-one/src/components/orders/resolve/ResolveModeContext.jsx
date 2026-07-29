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
 * Per-field prop injection — call with the context value, an RHF path, and the
 * call site's own `fieldState.error?.message`; spread the result LAST so it
 * wins over the site's props. zod stays authoritative: we never paint a field
 * green while the schema rejects its value.
 * - not in resolve mode / non-pool field → {}
 * - pool field, unresolved → { error: <zod message ?? category reason>, validated: false }
 * - pool field, resolved   → { error: <zod message>, validated: !zodError }
 * Spread-last ordering is enforced by the resolve field test — a call site that
 * spreads too early loses the category reason and the test fails.
 */
export function resolveFieldProps(ctx, path, fieldError) {
  if (!ctx) return {}
  const err = ctx.errorByPath.get(path)
  if (!err) return {}
  return ctx.resolvedSet.has(path)
    ? { error: fieldError, validated: !fieldError }
    : { error: fieldError ?? err.reason, validated: false }
}
