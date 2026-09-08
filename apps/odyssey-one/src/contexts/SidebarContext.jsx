import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const SidebarContext = createContext(null)

/**
 * Sidebar rail expansion, held above the router.
 *
 * It has to live here rather than in AppShell: every route renders its OWN
 * AppShell, so state kept there is re-initialised on each navigation and the
 * hamburger silently forgets itself the moment you leave the page.
 */
export function SidebarProvider({ children }) {
  const [expanded, setExpanded] = useState(false)
  const toggle = useCallback(() => setExpanded((v) => !v), [])
  const value = useMemo(() => ({ expanded, setExpanded, toggle }), [expanded, toggle])
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
  const [local, setLocal] = useState(false)
  const fallback = useMemo(
    () => ({ expanded: local, setExpanded: setLocal, toggle: () => setLocal((v) => !v) }),
    [local],
  )
  return ctx ?? fallback
}
