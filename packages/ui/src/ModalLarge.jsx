import { X } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import IconButtonGhost from './IconButtonGhost.jsx'
import useEscapeStack from './useEscapeStack.js'

/**
 * ModalLarge — organism shell. Reusable large modal with a header (title +
 * subtitle + close X), a content slot (children), and a footer slot. ESC and
 * overlay-click dismiss; clicks on the dialog itself do not propagate.
 *
 * Mirrors Figma component `ModalLarge` at 2006:663. Content / Footer SLOT
 * properties map to React children / footer props respectively.
 */
export default function ModalLarge({
  title,
  subtitle,
  showSubtitle = true,
  onClose,
  children,
  footer,
  className = '',
  ariaLabel,
}) {
  useEscapeStack(onClose)

  return (
    <div className="modal-large-overlay" onClick={onClose}>
      <div
        className={`modal-large ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-large__header">
          <div className="modal-large__header-text">
            <span className="text-label-sm-semibold modal-large__title">{title}</span>
            {showSubtitle && subtitle && (
              <span className="text-label-xs-regular modal-large__subtitle">{subtitle}</span>
            )}
          </div>
          {onClose && (
            <IconButtonGhost
              icon={<X {...ICON_LG} aria-hidden="true" />}
              onClick={onClose}
              ariaLabel="Close"
            />
          )}
        </header>
        <div className="modal-large__content">{children}</div>
        {footer && <footer className="modal-large__footer">{footer}</footer>}
      </div>
    </div>
  )
}
