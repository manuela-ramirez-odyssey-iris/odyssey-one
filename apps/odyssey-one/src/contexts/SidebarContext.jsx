import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const SidebarContext = createContext(null)

/**
 * Sidebar rail expansion, held above the router.
 *
 * It has to live here rather than in AppShell: every route renders its OWN
 * AppShell, so state kept there is re-initialised on each navigation and the
 * hamburger silently forgets itself the moment you leave the page.
 *
 * Two triggers drive the SAME `expanded` state, not two parallel ones:
 *   pinned  — the hamburger click. Explicit, sticky, survives the pointer
 *             leaving the rail.
 *   peeking — hovering or focusing into the (collapsed) rail. Transient —
 *             clears the moment the pointer/focus leaves.
 * `expanded = pinned || peeking`, so hover reuses the exact same width/type
 * machinery the hamburger already drives — never a second CSS-only expand.
 * An explicit pin outranks a transient peek: leaving the rail while pinned
 * never collapses it, because `pinned` alone still holds `expanded` true.
 */
export function SidebarProvider({ children }) {
  const [pinned, setPinned] = useState(false)
  const [peeking, setPeeking] = useState(false)
  const expanded = pinned || peeking
  const toggle = useCallback(() => setPinned((v) => !v), [])
  const value = useMemo(
    () => ({ expanded, pinned, setPeeking, toggle }),
    [expanded, pinned],
  )
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

/**
 * Falls back to component-local state when no provider is above it, rather than
 * throwing: AppShell is rendered bare in dozens of route tests, and making every
 * one of them wrap a provider would be churn for no coverage. Without a provider
 * the rail simply doesn't persist across navigation — which is exactly what a
 * single-render test sees anyway.
 */
export function useSidebar() {
  const ctx = useContext(SidebarContext)
  const [pinnedLocal, setPinnedLocal] = useState(false)
  const [peekingLocal, setPeekingLocal] = useState(false)
  const fallback = useMemo(
    () => ({
      expanded: pinnedLocal || peekingLocal,
      pinned: pinnedLocal,
      setPeeking: setPeekingLocal,
      toggle: () => setPinnedLocal((v) => !v),
    }),
    [pinnedLocal, peekingLocal],
  )
  return ctx ?? fallback
}
