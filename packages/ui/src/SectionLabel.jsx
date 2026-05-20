import { Pencil, Trash2 } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

/**
 * SectionLabel — atom. Header row for a widget section on Home.
 *
 * Two modes mirror the Figma `Mode` axis:
 * - `default` — transparent surface, label only.
 * - `edit` — DSN/100 surface, label + edit (pencil) + delete (trash) actions.
 *
 * The label is always shown; the actions are only present in edit mode and
 * wired through `onEdit` / `onDelete` callbacks. Action buttons are inline
 * lucide icons (`btn--unstyled`-style transparent buttons) — small enough that
 * a dedicated IconButton would be heavier than needed.
 */
export default function SectionLabel({
  label,
  mode = 'default',
  onEdit,
  onDelete,
  className = '',
  ...rest
}) {
  const isEdit = mode === 'edit'
  const classes = ['section-label', isEdit && 'section-label--edit', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...rest}>
      <span className="section-label__text text-label-sm-medium">{label}</span>
      {isEdit && (
        <div className="section-label__actions">
          {onEdit && (
            <button
              type="button"
              className="icon-action section-label__action"
              onClick={onEdit}
              aria-label="Rename section"
            >
              <Pencil {...ICON_LG} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="icon-action section-label__action"
              onClick={onDelete}
              aria-label="Delete section"
            >
              <Trash2 {...ICON_LG} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
