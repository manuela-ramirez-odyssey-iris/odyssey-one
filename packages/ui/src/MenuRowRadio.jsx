import Radio from './Radio.jsx'
import Badge from './Badge.jsx'
import { ChevronRight, GripVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * MenuRowRadio — molecule. A single-select + navigate list row, on the shared
 * `.menu-row` chrome (Row family; distinct intent from MenuRow / MenuRowCheckbox).
 *
 * **Two click zones** (by design):
 *  - the **radio area** selects this option → `onSelect(value)`
 *  - the **rest of the row** (label + chevron) navigates to the next view → `onNavigate(value)`
 *
 * `selected` fills the radio + applies the DSN/900 border. Hover is CSS-only.
 * `draggable` (default false) mirrors MenuRowCheckbox's grip prop — opt-in for
 * reorderable lists; the radio row's established use is single-select + navigate.
 * Unlike MenuRowCheckbox (grip trailing, no chevron), the chevron owns the trailing
 * slot here, so the grip renders LEADING, before the radio.
 * `badge` (default none) renders in the nav zone BEFORE the chevron, which still
 * owns the trailing slot. A string becomes our `Badge` (Shape=Pill, Variant=gray,
 * the Figma default); pass a node to control it yourself.
 * Figma `MenuRowRadio` set `3447:6593`, `Draggable#4921:0` + `Show Badge#4930:0`
 * boolean properties.
 */
export default function MenuRowRadio({
  label,
  selected = false,
  draggable = false,
  badge,
  disabled = false,
  name,
  value,
  onSelect,
  onNavigate,
  className = '',
  ...rest
}) {
  const cls = [
    'menu-row',
    'menu-row-radio',
    selected && 'menu-row-radio--selected',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cls}
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
      aria-disabled={disabled || undefined}
      {...rest}
    >
      {draggable && (
        <span className="menu-row__trailing menu-row-radio__grip" aria-hidden="true">
          <GripVertical {...ICON_MD} />
        </span>
      )}
      {/* Select zone — clicking the radio picks this option. */}
      <span className="menu-row__control">
        <Radio
          checked={selected}
          disabled={disabled}
          showLabel={false}
          name={name}
          value={value}
          onChange={disabled ? undefined : () => onSelect?.(value)}
        />
      </span>
      {/* Navigate zone — clicking the label/chevron drills into the next view. */}
      <div
        className="menu-row-radio__nav"
        onClick={disabled ? undefined : () => onNavigate?.(value)}
        role={onNavigate ? 'button' : undefined}
      >
        <span className="menu-row__label">{label}</span>
        {badge && (
          <span className="menu-row-radio__badge">
            {typeof badge === 'string' ? <Badge variant="gray">{badge}</Badge> : badge}
          </span>
        )}
        {/* chevron is always present — MenuRowRadio's purpose is to navigate */}
        <span className="menu-row__trailing" aria-hidden="true">
          <ChevronRight {...ICON_MD} />
        </span>
      </div>
    </div>
  )
}
