import { GripVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * MenuRow — atom. A single-select row inside menus, dropdowns, and panels
 * (e.g. the Paginator rows-per-page dropdown, MenuDropdown groups, the
 * WidgetsLeftMenu catalog). Optional leading icon + a truncating label.
 *
 * Selection intent picks the component: single → MenuRow, single + drill-in →
 * MenuRowRadio, multi-select + reorder → MenuRowCheckbox. `draggable` is an
 * orthogonal capability (a trailing grip + grab cursor) for single-select rows
 * that can be reordered/dragged — e.g. the WidgetsLeftMenu catalog. It composes
 * with `selected` + `disabled`; it is NOT a competing semantic variant.
 *
 * `selected` marks the chosen row (DSN/100 bg). `disabled` mutes the label/icon
 * (DSN/400) and suppresses the click. Hover / pressed are runtime CSS.
 * Library-pure: renders a `<div>` (not a button) so consumers can wrap it with a
 * DnD adapter. Figma master: `MenuRow` set 1973:87 (Type=Select + Draggable
 * boolean), Components-Molecules.
 */
export default function MenuRow({
  label,
  selected = false,
  leadingIcon = null,
  draggable = false,
  onClick,
  disabled = false,
  className = '',
  ...rest
}) {
  const cls = [
    'menu-row',
    draggable ? 'menu-row--draggable' : '',
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
      {draggable && (
        <span className="menu-row__trailing" aria-hidden="true">
          <GripVertical {...ICON_MD} />
        </span>
      )}
    </div>
  )
}
