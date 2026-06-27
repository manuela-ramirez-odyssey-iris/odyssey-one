import Radio from './Radio.jsx'
import { ChevronRight } from 'lucide-react'
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
 * Figma `MenuRowRadio` set `3447:6593`.
 */
export default function MenuRowRadio({
  label,
  selected = false,
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
        {/* chevron is always present — MenuRowRadio's purpose is to navigate */}
        <span className="menu-row__trailing" aria-hidden="true">
          <ChevronRight {...ICON_MD} />
        </span>
      </div>
    </div>
  )
}
