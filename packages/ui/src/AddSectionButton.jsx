import { Plus } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

/**
 * AddSectionButton — atom. Prominent "add new section" affordance shown once
 * at the very bottom of all sections in Home edit mode (the secondary entry
 * point — the primary is the top-bar "Add Section" Button).
 *
 * Visual: full-width row with a 1px CB/600 top border, and a centered 36×36
 * CB/600 pill straddling the border line. The pill contains a white lucide
 * plus icon. The line is decorative; only the pill is interactive.
 *
 * Polymorphic pill: renders the pill as `<button>` when `onClick` is provided,
 * `<span>` otherwise (keeps markup valid when nested in another interactive
 * element).
 *
 * Figma master: `AddSectionButton` 2210:302 on Components-Atoms (Panels artboard).
 */
export default function AddSectionButton({
  onClick,
  ariaLabel = 'Add section',
  className = '',
  ...rest
}) {
  const classes = ['add-section-button', className].filter(Boolean).join(' ')
  const isInteractive = typeof onClick === 'function'
  const pillClasses = [
    'add-section-button__pill',
    isInteractive && 'add-section-button__pill--interactive',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...rest}>
      {isInteractive ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          className={pillClasses}
        >
          <Plus {...ICON_LG} />
        </button>
      ) : (
        <span className={pillClasses} aria-hidden="true">
          <Plus {...ICON_LG} />
        </span>
      )}
    </div>
  )
}
