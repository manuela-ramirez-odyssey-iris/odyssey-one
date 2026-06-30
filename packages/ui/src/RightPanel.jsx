import { useEffect, useRef } from 'react'
import { ChevronLeft, Pencil, X } from 'lucide-react'
import { ICON_LG, ICON_MD } from '@odyssey/tokens'
import IconButtonGhost from './IconButtonGhost.jsx'
import Button from './Button.jsx'

/**
 * RightPanel — organism shell: a right-side drawer / panel card. Owns the chrome
 * (header + content slot + optional footer slot), the slide-in-from-right animation,
 * and the editable header title.
 *
 * Render modes:
 *  - `open` omitted  → a static card (drop it wherever; the consumer owns visibility).
 *  - `open` boolean  → an animated right-dock drawer: a flex child that reserves its width
 *    and slides the card in/out from the window's right edge. Clip the off-screen slide at
 *    an app-level ancestor (`overflow:hidden`) to avoid a horizontal scrollbar.
 *
 * Header name-change (shell-owned UI; value exposed to the consumer):
 *  - `editableTitle` shows a pencil next to the title.
 *  - `editingTitle` (controlled) swaps the title text for an in-place input styled as the
 *    heading (caret right after the name; no field chrome). The shell keeps it focused while
 *    editing — re-asserted each render so content-slot interactions (e.g. a column drag)
 *    don't steal the caret.
 *  - The title value lives in the consumer's variable: `title` in, `onTitleChange(next)` out
 *    on each keystroke; `onTitleCommit` (Enter) / `onTitleCancel` (Escape) report intent so
 *    the consumer orchestrates persistence (e.g. a Save/Cancel footer); `onEditTitle` fires
 *    when the pencil is pressed.
 *
 * Footer (mirrors the Figma `Footer` BOOLEAN → a baked ModalFooter1, NOT a content slot):
 *  - `footer` (boolean) toggles the built-in footer = Cancel (secondary, md) + Save
 *    (primary, md), space-between. Handlers `onCancel` / `onSave`; labels overridable via
 *    `cancelLabel` / `saveLabel`. It is separate from the content `Slot` (children).
 *
 * Header icons are real Lucide masters (chevron-left lg, pencil md); close uses
 * IconButtonGhost (X lg). Mirrors Figma `RightPanel` (3449:10701): Slot → children,
 * Footer BOOLEAN → the baked footer.
 */
export default function RightPanel({
  open,
  title,
  subtitle,
  editableTitle = false,
  editingTitle = false,
  onEditTitle,
  onTitleChange,
  onTitleCommit,
  onTitleCancel,
  onBack,
  onClose,
  footer = false,
  onCancel,
  onSave,
  cancelLabel = 'Cancel',
  saveLabel = 'Save',
  children,
  className = '',
  ariaLabel,
}) {
  const titleInputRef = useRef(null)

  // Keep the title input focused while editing — re-asserted every render so content-slot
  // interactions (e.g. dragging a column) don't steal the caret.
  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus()
  })

  const label = ariaLabel || (typeof title === 'string' ? title : undefined)

  const panel = (
    <section className={`right-panel ${className}`.trim()} aria-label={label}>
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
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  autoFocus
                  className="text-heading-lg-semibold right-panel__title right-panel__title-input"
                  value={title ?? ''}
                  onChange={(e) => onTitleChange?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onTitleCommit?.()
                    if (e.key === 'Escape') onTitleCancel?.()
                  }}
                  aria-label={label || 'Title'}
                />
              ) : (
                <span className="text-heading-lg-semibold right-panel__title">{title}</span>
              )}
              {editableTitle && !editingTitle && (
                <button
                  type="button"
                  className="right-panel__icon-btn right-panel__edit"
                  onClick={onEditTitle}
                  aria-label="Edit title"
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

      {footer && (
        <footer className="right-panel__footer">
          <Button variant="secondary" size="md" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="primary" size="md" onClick={onSave}>{saveLabel}</Button>
        </footer>
      )}
    </section>
  )

  // Static card mode (no `open` prop) — consumer owns placement / visibility.
  if (typeof open !== 'boolean') return panel

  // Drawer mode — the shell owns the right-dock slide-in.
  return (
    <div className={`right-panel-dock${open ? ' right-panel-dock--open' : ''}`} aria-hidden={!open}>
      {panel}
    </div>
  )
}
