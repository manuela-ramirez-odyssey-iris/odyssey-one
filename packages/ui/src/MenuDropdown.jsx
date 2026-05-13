import { ChevronDown, ChevronRight } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * MenuDropdown — molecule. Collapsible group inside a left-menu (e.g. WidgetsLeftMenu).
 * Header click toggles `expanded`; items render inside a composition slot via `children`
 * (typically `MenuRow` instances). When collapsed the items container is unmounted.
 * Figma master: `MenuDropdown` at `1981:79` on Components-Molecules.
 */
export default function MenuDropdown({
  title,
  expanded = true,
  onToggle,
  children,
  className = '',
  ...rest
}) {
  const cls = `menu-dropdown flex flex-col ${className}`.trim()
  return (
    <div
      className={cls}
      style={{ paddingTop: 'var(--spacing-3)' }}
      {...rest}
    >
      <button
        type="button"
        onClick={onToggle}
        className="menu-dropdown__header flex items-center justify-between border-none bg-transparent cursor-pointer text-label-xs-medium-uppercase"
        style={{
          height: 32,
          padding: 'var(--spacing-2) var(--spacing-4)',
          gap: 'var(--spacing-3)',
          borderBottom: '1px solid var(--border-subtle)',
          textAlign: 'left',
        }}
      >
        <span style={{ flex: 1 }}>{title}</span>
        {expanded ? (
          <ChevronDown {...ICON_MD} aria-hidden="true" />
        ) : (
          <ChevronRight {...ICON_MD} aria-hidden="true" />
        )}
      </button>
      {expanded && <div className="flex flex-col">{children}</div>}
    </div>
  )
}
