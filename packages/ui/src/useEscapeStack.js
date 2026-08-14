import { useEffect, useRef } from 'react'

// Module-level registry of open dialog ids, in mount order. Escape should only dismiss
// the TOPMOST dialog — without this, two stacked ModalMedium/ModalLarge instances each
// ran their own independent window keydown listener, so one Escape press closed both.
// ponytail: single shared array, fine for one document; would need scoping if dialogs
// ever rendered across iframes/workers.
let openStack = []
let nextId = 0

/**
 * useEscapeStack(onClose) — Escape dismisses this dialog only while it is the topmost
 * entry in `openStack`. Registration is keyed by a stable per-instance id, so dialogs
 * unmounting out of order (not just LIFO) still leave the correct remaining dialog on top.
 */
export default function useEscapeStack(onClose) {
  const idRef = useRef(null)
  if (idRef.current === null) idRef.current = ++nextId

  useEffect(() => {
    const id = idRef.current
    openStack.push(id)
    return () => {
      openStack = openStack.filter((openId) => openId !== id)
    }
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape' || !onClose) return
      if (openStack[openStack.length - 1] !== idRef.current) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}
