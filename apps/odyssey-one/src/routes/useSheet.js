import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// useSheet() — the sheet-stack navigation API (S158, docs/superpowers/plans/
// 2026-09-23-slide-over-routes.md Part 1 §3). `location.state.sheetStack` is
// the list of locations BENEATH the current one; it travels with every
// history entry App.jsx pushes, which is what makes browser back/forward
// render the right layers for free (§1) — this hook only ever reads/writes
// that one array, it owns none of the stacking itself (App.jsx does).

function pathnameOf(to) {
  if (typeof to !== 'string') return to?.pathname
  const cut = to.search(/[?#]/)
  return cut === -1 ? to : to.slice(0, cut)
}

export default function useSheet() {
  const location = useLocation()
  const navigate = useNavigate()
  const stack = location.state?.sheetStack ?? []

  // openSheet — pushes the CURRENT location onto the stack and navigates to
  // `to`, which then renders as a new top layer over it (App.jsx). `replace`
  // (user, 2026-09-23 — Create → Confirmation → View order) swaps the
  // CURRENT layer for `to` instead of stacking a new one on top of it, so
  // closing `to` lands on whatever was under the sheet being replaced, not
  // back on the sheet that opened it.
  const openSheet = useCallback((to, { state, replace = false } = {}) => {
    const nextStack = replace ? stack : [...stack, location]
    navigate(to, { state: { ...state, sheetStack: nextStack } })
  }, [navigate, stack, location])

  // closeSheet — if `to`'s pathname matches a layer already in the stack,
  // cut the stack there and land on it: every layer above it closes at once,
  // but only the (former) top one is visible, so only it actually animates
  // (App.jsx's exit retention). No match (e.g. a breadcrumb to a different
  // area than anything under this sheet) → a plain navigate, no slide.
  const closeSheet = useCallback((to, { state } = {}) => {
    const idx = stack.findIndex((loc) => loc.pathname === pathnameOf(to))
    if (idx === -1) {
      navigate(to, { state })
      return
    }
    navigate(to, { state: { ...state, sheetStack: stack.slice(0, idx) } })
  }, [navigate, stack])

  return { openSheet, closeSheet }
}
