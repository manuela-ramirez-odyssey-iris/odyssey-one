import { useEffect } from 'react'
import { X } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import IconButtonGhost from './IconButtonGhost.jsx'

/**
 * ModalMedium — organism shell. Content-sized reusable modal (width auto, 350–780px,
 * height auto capped at 90vh — content slot scrolls past the cap) with a header (title + close X),
 * content slot (children), and footer slot. ESC + overlay-click dismiss; dialog click
 * does not propagate. No subtitle (unlike ModalLarge).
 *
 * Mirrors Figma component `ModalMedium` at 2032:915. Content / Footer SLOT properties
 * map to React children / footer props respectively.
 *
 * `scrollableContent` — implementation-only flag (not in Figma): set true when the
 * content slot contains its own vertically-scrolling region. Removes the default
 * 20px bottom padding so the scroller runs flush against the footer divider.
 */
export default function ModalMedium({
  title,
  onClose,
  children,
  footer,
  scrollableContent = false,
  className = '',
  ariaLabel,
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-medium-overlay" onClick={onClose}>
      <div
        className={`modal-medium ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-medium__header">
          <span className="text-heading-lg-semibold modal-medium__title">{title}</span>
          {onClose && (
            <IconButtonGhost
              icon={<X {...ICON_LG} aria-hidden="true" />}
              onClick={onClose}
              ariaLabel="Close"
            />
          )}
        </header>
        <div className={`modal-medium__content${scrollableContent ? ' modal-medium__content--scroll' : ''}`}>
          {children}
        </div>
        {footer && <footer className="modal-medium__footer">{footer}</footer>}
      </div>
    </div>
  )
}
