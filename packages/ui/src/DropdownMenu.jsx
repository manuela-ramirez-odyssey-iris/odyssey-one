import { Children } from 'react'

/**
 * DropdownMenu — molecule. A popover/menu surface for small dropdown lists
 * (e.g. the Paginator rows-per-page dropdown, action menus, select popovers).
 * White card with padding + radius + the panel shadow.
 *
 * Two states, derived from content (matches the Figma `State=Content|Empty`):
 *   - has children → renders them (typically MenuRow atoms, or a MenuDropdown group)
 *   - no children → renders a centered empty message (`emptyMessage`, default "No items")
 *
 * The surface hugs its content width; consumers position/size it for their trigger.
 * Figma master: `DropdownMenu` set `3600:1879` (Components-Molecules).
 */
export default function DropdownMenu({ children, emptyMessage = 'No items', className = '', ...rest }) {
  const hasContent = Children.count(children) > 0
  const cls = `dropdown-menu${className ? ` ${className}` : ''}`
  return (
    <div className={cls} role="menu" {...rest}>
      {hasContent ? children : <div className="dropdown-menu__empty">{emptyMessage}</div>}
    </div>
  )
}
