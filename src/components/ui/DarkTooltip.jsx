import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function DarkTooltip({ text, children, width = 300, align = 'center' }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const left = align === 'right' ? rect.right : rect.left + rect.width / 2
      setPos({ top: rect.top, left })
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
      {show && pos && text && createPortal(
        <div style={{
          position: 'fixed',
          top: pos.top - 8,
          left: pos.left,
          transform: align === 'right' ? 'translate(-100%, -100%)' : 'translate(-50%, -100%)',
          background: 'var(--deep-sea-neutral-900, #1B2537)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          zIndex: 9999,
          width: width === 'auto' ? 'auto' : width,
          whiteSpace: width === 'auto' ? 'nowrap' : 'normal',
          textAlign: align === 'right' ? 'right' : 'left',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 13, color: 'var(--deep-sea-neutral-300, #D0D4DB)', lineHeight: 1.4, textWrap: 'pretty' }}>
            {text}
          </span>
        </div>,
        document.body
      )}
    </div>
  )
}
