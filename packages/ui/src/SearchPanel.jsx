import { ChevronLeft, X, CirclePlus } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'
import Button from './Button.jsx'
import IconButtonGhost from './IconButtonGhost.jsx'

/**
 * SearchPanel — organism shell. The card that drops below the GlobalSearch bar
 * (720px, shadow/2xl) once search criteria are committed. Follows the modal
 * pattern (cf. ModalLarge / ModalMedium): a conditional header (back + title +
 * close X), a single content slot (`children`), and a baked footer with the
 * toggleable link + secondary (white) grouped on the lead/left, and the primary
 * action — optionally preceded by a second (trail) secondary — on the trail/right.
 * (Results/Saved use the lead secondary; Filters·All uses the trail secondary so
 * "Clear all" sits next to "Show N".)
 *
 * Each search state fills the content slot with its own component:
 * Results → <SearchResults>, Filters → <SearchFilters> (later cycle).
 *
 * Figma master: `SearchPanel` 2462:149 on Components-Organisms (Modals artboard).
 * Content SLOT → `children`. The header / footer toggles map to the Show header /
 * Show back / Show link / Show secondary booleans on the master.
 */
export default function SearchPanel({
  // Header — hidden by default (the Results state has no header).
  showHeader = false,
  showBack = false,
  title = 'Filters',
  onBack,
  onClose,
  // Content slot.
  children,
  // Footer (baked) — link + secondary (white) on the lead/left; primary (+ optional
  // trail secondary, for the Filters·All "Clear all" next to "Show N") on the trail/right.
  showLink = false,
  linkLabel = 'Save Filters',
  linkIcon = <CirclePlus {...ICON_LG} />,
  onLink,
  showSecondary = true,
  showTrailSecondary = false,
  secondaryLabel = 'Clear all',
  onClear,
  count,
  primaryLabel,
  onShowResults,
  className = '',
  style,
  ...rest
}) {
  const primary =
    primaryLabel ?? `Show ${count ?? 0} ${count === 1 ? 'result' : 'results'}`
  return (
    <div className={`search-panel ${className}`.trim()} style={style} {...rest}>
      {showHeader && (
        <header className="search-panel__header">
          <div className="search-panel__header-left">
            {showBack && (
              <IconButtonGhost
                icon={<ChevronLeft {...ICON_LG} aria-hidden="true" />}
                onClick={onBack}
                ariaLabel="Back"
              />
            )}
            <span className="text-heading-lg-semibold search-panel__title">{title}</span>
          </div>
          {onClose && (
            <IconButtonGhost
              icon={<X {...ICON_LG} aria-hidden="true" />}
              onClick={onClose}
              ariaLabel="Close"
            />
          )}
        </header>
      )}

      <div className="search-panel__content">{children}</div>

      <div className="search-panel__footer">
        <div className="search-panel__footer-left">
          {showLink && (
            <Button variant="link" size="sm" icon={linkIcon} onClick={onLink}>
              {linkLabel}
            </Button>
          )}
          {showSecondary && (
            <Button variant="secondary" size="md" onClick={onClear}>
              {secondaryLabel}
            </Button>
          )}
        </div>
        <div className="search-panel__footer-right">
          {showTrailSecondary && (
            <Button variant="secondary" size="md" onClick={onClear}>
              {secondaryLabel}
            </Button>
          )}
          <Button variant="primary" size="md" onClick={onShowResults}>
            {primary}
          </Button>
        </div>
      </div>
    </div>
  )
}
