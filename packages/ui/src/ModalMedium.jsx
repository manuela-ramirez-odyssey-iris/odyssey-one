import { useEffect } from 'react'
import { ChevronLeft, X } from 'lucide-react'
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
 *
 * `onBack` — optional leading back control (chevron-left, lg). Present ⇒ rendered,
 * mirroring ModalHeader's own `onBack` API so the two shells stay consistent. Used
 * when a modal hosts a navigation flow between views rather than a single view.
 */
export default function ModalMedium({
  title,
  onClose,
  onBack,
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
          <div className="modal-medium__lead">
            {onBack && (
              <button
                type="button"
                className="modal-medium__icon-btn modal-medium__back"
                onClick={onBack}
                aria-label="Back"
              >
                <ChevronLeft {...ICON_LG} aria-hidden="true" />
              </button>
            )}
            <span className="text-heading-lg-semibold modal-medium__title">{title}</span>
          </div>
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
