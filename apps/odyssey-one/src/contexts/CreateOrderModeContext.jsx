import { createContext, useContext, useState, useCallback, useRef } from 'react'

const CreateOrderModeContext = createContext(null)

// Contextual-navbar state for /orders/create (spec §2.1) — the Home
// widget-edit pattern: the route's form registers handlers on mount; the
// Navbar's create-order branch calls them. saveForLater does NOT exit the
// mode itself — the handler navigates away, which unmounts the form and
// exits via its cleanup.
export function CreateOrderModeProvider({ children }) {
  const [isCreateOrderMode, setIsCreateOrderMode] = useState(false)
  const handlersRef = useRef({ onSaveForLater: null, onClose: null })

  const enterCreateOrderMode = useCallback(({ onSaveForLater, onClose } = {}) => {
    handlersRef.current = { onSaveForLater, onClose }
    setIsCreateOrderMode(true)
  }, [])

  const exitCreateOrderMode = useCallback(() => {
    handlersRef.current = { onSaveForLater: null, onClose: null }
    setIsCreateOrderMode(false)
  }, [])

  const saveForLater = useCallback(() => {
    handlersRef.current.onSaveForLater?.()
  }, [])

  // ✕ routes through the same path as Cancel: the discard/save modal
  const close = useCallback(() => {
    handlersRef.current.onClose?.()
  }, [])

  return (
    <CreateOrderModeContext.Provider
      value={{ isCreateOrderMode, enterCreateOrderMode, exitCreateOrderMode, saveForLater, close }}
    >
      {children}
    </CreateOrderModeContext.Provider>
  )
}

export function useCreateOrderMode() {
  const ctx = useContext(CreateOrderModeContext)
  if (!ctx) throw new Error('useCreateOrderMode must be used inside CreateOrderModeProvider')
  return ctx
}
