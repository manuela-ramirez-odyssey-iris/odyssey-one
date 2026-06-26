import { useState, useCallback } from 'react'
import DropdownButton from './DropdownButton'
import DropdownMenu from './DropdownMenu'
import MenuRow from './MenuRow'
import { useAnchoredPortal } from './useAnchoredPortal'

/**
 * Dropdown — molecule. Value-selecting dropdown: a DropdownButton trigger that
 * opens a DropdownMenu of MenuRow options anchored below it. Picking an option
 * fires onChange + closes; it also closes on outside-click, scroll, or resize.
 * First consumer: the Paginator rows-per-page selector.
 *
 * Composes DropdownButton (atom) + DropdownMenu (molecule) + MenuRow (atom);
 * positioning via useAnchoredPortal (body portal, anchored below the trigger).
 * `value` is controlled; open/close is internal.
 *
 * Figma master: `Dropdown` set `3644:549` (Components-Molecules), State=Closed|Open.
 */
export default function Dropdown({
  value,
  options = [],
  onChange,
  disabled = false,
  emptyMessage = 'No items',
  className = '',
  ...rest
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({ open, onClose: close })

  const selected = options.find((o) => o.value === value)
  const label = selected ? selected.label : value ?? ''

  const handleSelect = (val) => {
    onChange?.(val)
    setOpen(false)
  }

  const cls = `dropdown${className ? ` ${className}` : ''}`
  return (
    <span className={cls} {...rest}>
      <span ref={triggerRef} className="dropdown__trigger">
        <DropdownButton
          value={label}
          open={open}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
        />
      </span>
      {open && (
        <AnchoredPortal>
          <div ref={dropdownRef}>
            <DropdownMenu emptyMessage={emptyMessage}>
              {options.map((o) => (
                <MenuRow
                  key={o.value}
                  label={o.label}
                  selected={o.value === value}
                  onClick={() => handleSelect(o.value)}
                />
              ))}
            </DropdownMenu>
          </div>
        </AnchoredPortal>
      )}
    </span>
  )
}
