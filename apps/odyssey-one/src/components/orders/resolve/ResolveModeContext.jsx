import { createContext, useContext } from 'react'

/**
 * Resolve-mode plumbing (LINX-11137 behavior). Inactive (null) in the normal
 * create/edit flow. Active value shape (built in CreateOrderForm):
 *   { errorByPath: Map<path, error>, resolvedSet: Set<path>, pickedPaths: Set<path> }
 * `pickedPaths` = fields the planner already decided in Step 1 (LINX-16049).
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
 * - Step 1 pick → { validated: !zodError, error: <zod message>, disabled: true }
 * - pool field, unresolved → { error: <zod message ?? category reason>, validated: false, disabled: false }
 * - pool field, resolved   → { error: <zod message>, validated: !zodError, disabled: false }
 * In resolve mode every control renders `disabled` (blanket lock at the call
 * sites); `disabled: false` here re-enables exactly the error-pool fields —
 * spread-last wins over the site's own `disabled`.
 * Spread-last ordering is enforced by the resolve field test — a call site that
 * spreads too early loses the category reason and the test fails.
 */
export function resolveFieldProps(ctx, path, fieldError) {
  if (!ctx) return {}
  // Step 1 picks come FIRST and win outright. A picked path is normally not in
  // the Level 2 pool at all (CreateOrderForm passes it as `excludePaths`), but
  // if the two ever overlap the Step 1 decision is the later one and the field
  // must read locked-and-settled, never re-opened as a Step 2 error to fix.
  // The `disabled: true` here is the ONE case that keeps resolve mode's blanket
  // lock rather than re-enabling the field.
  if (ctx.pickedPaths?.has(path)) return { validated: !fieldError, error: fieldError, disabled: true }
  const err = ctx.errorByPath.get(path)
  if (!err) return {}
  return ctx.resolvedSet.has(path)
    ? { error: fieldError, validated: !fieldError, disabled: false }
    : { error: fieldError ?? err.reason, validated: false, disabled: false }
}
