import { GripVertical, ChevronRight } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * MenuRow — atom. A row inside menus, dropdowns, and panels (e.g. the
 * Paginator rows-per-page dropdown, WidgetsLeftMenu, panel profiles).
 *
 * `variant` is a semantic role that drives the trailing affordance, cursor,
 * and click intent — not just an icon:
 *   - 'select'    → plain selectable option (dropdown / static panel); no trailing icon.
 *   - 'navigate'  → drills into another view (iOS-style disclosure); chevron, pointer.
 *   - 'draggable' → reorderable; grip handle, grab cursor (wrap with a DnD adapter).
 *
 * `bordered` adds the standalone DSN/300 outline (intended for `navigate` in a
 * standalone panel). `selected` marks the chosen row — its look is per-variant
 * (navigate has no selected state by design: clicking navigates away).
 *
 * Library-pure: renders a `<div>` (not a button) so consumers can wrap it with a
 * DnD adapter and still get drag-from-anywhere behavior. Hover / pressed /
 * selected are CSS-driven via `.menu-row` rules in `components.css`.
 * Figma master: `MenuRow` set at `1973:87` on Components-Molecules.
 */
export default function MenuRow({
  label,
  variant = 'select',
  bordered = false,
  selected = false,
  leadingIcon = null,
  onClick,
  disabled = false,
  className = '',
  ...rest
}) {
  const cls = [
    'menu-row',
    `menu-row--${variant}`,
    bordered && variant === 'navigate' ? 'menu-row--bordered' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cls}
      onClick={disabled ? undefined : onClick}
      data-disabled={disabled || undefined}
      data-selected={selected || undefined}
      aria-disabled={disabled || undefined}
      {...rest}
    >
      <span className="menu-row__leading">
        {leadingIcon && (
          <span className="menu-row__icon" aria-hidden="true">{leadingIcon}</span>
        )}
        <span className="menu-row__label">{label}</span>
      </span>
      {variant === 'navigate' && (
        <span className="menu-row__trailing" aria-hidden="true">
          <ChevronRight {...ICON_MD} />
        </span>
      )}
      {variant === 'draggable' && (
        <span className="menu-row__trailing" aria-hidden="true">
          <GripVertical {...ICON_MD} />
        </span>
      )}
    </div>
  )
}
