import { createContext, useContext, useState, useCallback, useRef } from 'react'

const EditModeContext = createContext(null)

export function EditModeProvider({ children }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const handlersRef = useRef({ onSave: null, onCancel: null })

  const enterEditMode = useCallback(({ onSave, onCancel } = {}) => {
    handlersRef.current = { onSave, onCancel }
    setIsEditMode(true)
  }, [])

  const exitEditMode = useCallback(() => {
    handlersRef.current = { onSave: null, onCancel: null }
    setIsEditMode(false)
  }, [])

  const save = useCallback(() => {
    const fn = handlersRef.current.onSave
    if (fn) fn()
    exitEditMode()
  }, [exitEditMode])

  const cancel = useCallback(() => {
    const fn = handlersRef.current.onCancel
    if (fn) fn()
    exitEditMode()
  }, [exitEditMode])

  return (
    <EditModeContext.Provider value={{ isEditMode, enterEditMode, save, cancel }}>
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode() {
  const ctx = useContext(EditModeContext)
  if (!ctx) throw new Error('useEditMode must be used inside EditModeProvider')
  return ctx
}
