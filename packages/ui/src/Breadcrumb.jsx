import { ChevronRight } from 'lucide-react'
import { ICON_LG } from '@odyssey/tokens'

/**
 * Breadcrumb — atom. One segment of a breadcrumb trail: a label followed by a
 * trailing chevron-right. Compose multiple segments in a flex row to build the
 * trail (e.g. "Orders › Create new order").
 *
 * Mirrors the Figma `Current` variant axis:
 * - `current` (the last / innermost segment — the current page): dark label
 *   (DSN/700), not interactive, marked `aria-current="page"`.
 * - link segment (default): lighter label (DSN/400); pass `onClick` to make it
 *   an interactive button.
 *
 * The trailing chevron is ALWAYS DSN/400 (light) — it never tracks the label
 * color — including on the current segment.
 */
export default function Breadcrumb({
  label,
  current = false,
  onClick,
  className = '',
  ...rest
}) {
  const classes = ['breadcrumb', current && 'breadcrumb--current', className]
    .filter(Boolean)
    .join(' ')

  const interactive = !current && typeof onClick === 'function'

  return (
    <div className={classes} {...rest}>
      {interactive ? (
        <button
          type="button"
          className="breadcrumb__label text-label-sm-medium"
          onClick={onClick}
        >
          {label}
        </button>
      ) : (
        <span
          className="breadcrumb__label text-label-sm-medium"
          aria-current={current ? 'page' : undefined}
        >
          {label}
        </span>
      )}
      <ChevronRight className="breadcrumb__chevron" {...ICON_LG} aria-hidden="true" />
    </div>
  )
}
