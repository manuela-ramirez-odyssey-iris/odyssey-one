import { useEffect, useRef } from 'react'
import { ChevronLeft, Pencil, X } from 'lucide-react'
import { ICON_LG, ICON_MD } from '@odyssey/tokens'
import IconButtonGhost from './IconButtonGhost.jsx'

/**
 * ModalHeader — molecule: the header band of a modal / panel shell (back · title · edit ·
 * subtitle · close). Composed by RightPanel (and, over time, the other modal shells).
 *
 * Owns the in-place editable title: `editableTitle` shows the pencil; `editingTitle`
 * (controlled) swaps the title for an input, focused once on enter. The value lives in the
 * consumer's variable (`title` in, `onTitleChange` out; `onTitleCommit`/`onTitleCancel` on
 * Enter/Escape; `onEditTitle` on the pencil).
 *
 * Back renders on `onBack` presence → chevron-left (lg). The close X (lg, via IconButtonGhost)
 * is ALWAYS shown; `onClose` is its handler. `subtitle` renders when set.
 *
 * Mirrors the Figma `ModalHeader` (node 3447:7661): TEXT props Title / Subtitle (editable),
 * BOOLEANs Show Back / Editable. (Subtitle + close are always shown — no visibility boolean.)
 */
export default function ModalHeader({
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
  className = '',
  ariaLabel,
}) {
  const titleInputRef = useRef(null)

  // Focus the title input when editing starts (one-shot).
  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus()
  }, [editingTitle])

  const inputLabel = ariaLabel || (typeof title === 'string' ? title : 'Title')

  return (
    <header className={`modal-header ${className}`.trim()} aria-label={ariaLabel || undefined}>
      <div className="modal-header__lead">
        {onBack && (
          <button
            type="button"
            className="modal-header__icon-btn modal-header__back"
            onClick={onBack}
            aria-label="Back"
          >
            <ChevronLeft {...ICON_LG} aria-hidden="true" />
          </button>
        )}
        <div className="modal-header__text">
          <div className="modal-header__title-row">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                autoFocus
                className="text-heading-lg-semibold modal-header__title modal-header__title-input"
                value={title ?? ''}
                onChange={(e) => onTitleChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onTitleCommit?.()
                  if (e.key === 'Escape') onTitleCancel?.()
                }}
                aria-label={inputLabel}
              />
            ) : (
              <span className="text-heading-lg-semibold modal-header__title">{title}</span>
            )}
            {editableTitle && !editingTitle && (
              <button
                type="button"
                className="modal-header__icon-btn modal-header__edit"
                onClick={onEditTitle}
                aria-label="Edit title"
              >
                <Pencil {...ICON_MD} aria-hidden="true" />
              </button>
            )}
          </div>
          {subtitle && <span className="modal-header__subtitle">{subtitle}</span>}
        </div>
      </div>
      <IconButtonGhost
        icon={<X {...ICON_LG} aria-hidden="true" />}
        onClick={onClose}
        ariaLabel="Close"
      />
    </header>
  )
}
