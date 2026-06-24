import { ChevronDown, ChevronUp } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * DropdownButton — atom. Compact trigger button showing a current value + a
 * chevron, used to open a DropdownMenu (e.g. the Paginator rows-per-page
 * selector). Pure trigger: open/close state + popover positioning live in the
 * composing component (a future Dropdown/Select molecule), not here.
 *
 * `open` applies the pressed/active look AND flips the chevron up (the menu is
 * showing). Hover / pressed are CSS-driven; the chevron direction tracks `open`,
 * not the momentary :active. Chevron color tracks the label via currentColor.
 * Figma master: `DropdownButton` set `3272:3880` (Components-Atoms).
 */
export default function DropdownButton({ value, open = false, disabled = false, onClick, className = '', ...rest }) {
  const cls = ['dropdown-button', open ? 'dropdown-button--open' : '', className].filter(Boolean).join(' ')
  const Chevron = open ? ChevronUp : ChevronDown
  return (
    <button
      type="button"
      className={cls}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={open}
      {...rest}
    >
      <span className="dropdown-button__value">{value}</span>
      <Chevron {...ICON_MD} className="dropdown-button__chevron" />
    </button>
  )
}
