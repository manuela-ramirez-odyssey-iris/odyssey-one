import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function DarkTooltip({ text, children, width = 300 }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ top: rect.top, left: rect.left + rect.width / 2 })
    }
    setShow(true)
  }

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {show && pos && createPortal(
        <div style={{
          position: 'fixed',
          top: pos.top - 8,
          left: pos.left,
          transform: 'translate(-50%, -100%)',
          background: 'var(--deep-sea-neutral-900, #1B2537)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          zIndex: 9999,
          width,
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 13, color: 'var(--deep-sea-neutral-300, #D0D4DB)', lineHeight: 1.4 }}>
            {text}
          </span>
        </div>,
        document.body
      )}
    </div>
  )
}
