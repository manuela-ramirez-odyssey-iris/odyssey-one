import { ChevronLeft, Pencil, X } from 'lucide-react'
import { ICON_LG, ICON_MD } from '@odyssey/tokens'
import IconButtonGhost from './IconButtonGhost.jsx'

/**
 * RightPanel — organism shell. Self-contained right-side drawer / panel card:
 * a header (optional back chevron · title · optional edit pencil · optional subtitle ·
 * optional close X), a content slot (children), and an optional footer slot.
 *
 * Presentational only — no overlay / ESC / positioning baked in. Consumers place it
 * (inline column, popover, slide-in drawer) and wire dismissal via onBack / onClose.
 *
 * Mirrors Figma `RightPanel` (3449:10701): Slot → children; Footer (BOOLEAN, which
 * shows a ModalFooter instance in the master) → the `footer` ReactNode slot here.
 * The Figma header (a static ModalHeader instance) has no props; the React header is
 * intentionally parameterized (title/subtitle/back/edit). Header icons are real Lucide
 * masters (chevron-left lg, pencil md); close uses IconButtonGhost (X lg).
 */
export default function RightPanel({
  title,
  subtitle,
  onBack,
  onEdit,
  onClose,
  footer,
  children,
  className = '',
  ariaLabel,
}) {
  return (
    <section className={`right-panel ${className}`.trim()} aria-label={ariaLabel || title}>
      <header className="right-panel__header">
        <div className="right-panel__header-lead">
          {onBack && (
            <button
              type="button"
              className="right-panel__icon-btn right-panel__back"
              onClick={onBack}
              aria-label="Back"
            >
              <ChevronLeft {...ICON_LG} aria-hidden="true" />
            </button>
          )}
          <div className="right-panel__header-text">
            <div className="right-panel__title-row">
              <span className="text-heading-lg-semibold right-panel__title">{title}</span>
              {onEdit && (
                <button
                  type="button"
                  className="right-panel__icon-btn right-panel__edit"
                  onClick={onEdit}
                  aria-label="Edit"
                >
                  <Pencil {...ICON_MD} aria-hidden="true" />
                </button>
              )}
            </div>
            {subtitle && <span className="right-panel__subtitle">{subtitle}</span>}
          </div>
        </div>
        {onClose && (
          <IconButtonGhost
            icon={<X {...ICON_LG} aria-hidden="true" />}
            onClick={onClose}
            ariaLabel="Close"
          />
        )}
      </header>

      <div className="right-panel__content">{children}</div>

      {footer && <footer className="right-panel__footer">{footer}</footer>}
    </section>
  )
}
