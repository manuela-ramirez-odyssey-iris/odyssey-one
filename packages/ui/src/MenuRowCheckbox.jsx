import Checkbox from './Checkbox.jsx'
import { GripVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * MenuRowCheckbox — atom. A multi-select + reorderable list row, on the shared
 * `.menu-row` chrome (Row family; distinct intent from MenuRow / MenuRowRadio).
 *
 * **Only the checkbox area toggles** (`onToggle(value)`, pointer cursor); the
 * **rest of the row is the drag handle** (grab cursor — wrap with a DnD adapter
 * for reorder, like `MenuRow variant="draggable"`).
 *
 * `bordered` = the Figma `Type=Line` outline. Hover is CSS-only. Checked state is
 * the nested Checkbox's own. Figma `MenuRowCheckbox` set `3447:6592`.
 */
export default function MenuRowCheckbox({
  label,
  checked = false,
  draggable = true,
  bordered = false,
  disabled = false,
  name,
  value,
  onToggle,
  className = '',
  ...rest
}) {
  const cls = [
    'menu-row',
    'menu-row-checkbox',
    bordered && 'menu-row-checkbox--bordered',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cls}
      data-checked={checked || undefined}
      data-disabled={disabled || undefined}
      aria-disabled={disabled || undefined}
      {...rest}
    >
      <span className="menu-row__leading">
        {/* Toggle zone — only the checkbox area is clickable (pointer cursor). */}
        <span className="menu-row__control" onClick={disabled ? undefined : () => onToggle?.(value)}>
          <Checkbox
            checked={checked}
            disabled={disabled}
            showLabel={false}
            name={name}
            value={value}
            onChange={() => {}}
          />
        </span>
        <span className="menu-row__label">{label}</span>
      </span>
      {draggable && (
        <span className="menu-row__trailing menu-row-checkbox__grip" aria-hidden="true">
          <GripVertical {...ICON_MD} />
        </span>
      )}
    </div>
  )
}
