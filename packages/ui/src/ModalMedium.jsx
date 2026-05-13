import { useEffect } from 'react'
import { X } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

/**
 * ModalMedium — organism shell. 540-wide reusable modal with a header (title + close X),
 * content slot (children), and footer slot. ESC + overlay-click dismiss; dialog click
 * does not propagate. No subtitle (unlike ModalLarge).
 *
 * Mirrors Figma component `ModalMedium` at 2032:915. Content / Footer SLOT properties
 * map to React children / footer props respectively.
 */
export default function ModalMedium({
  title,
  onClose,
  children,
  footer,
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
            <button
              type="button"
              className="modal-medium__close"
              onClick={onClose}
              aria-label="Close"
            >
              <X {...ICON_LG} aria-hidden="true" />
            </button>
          )}
        </header>
        <div className="modal-medium__content">{children}</div>
        {footer && <footer className="modal-medium__footer">{footer}</footer>}
      </div>
    </div>
  )
}
