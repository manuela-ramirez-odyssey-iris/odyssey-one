import { GripVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'

/**
 * MenuRow — molecule. Single label row inside a left-menu group (e.g. WidgetsLeftMenu).
 * Library-pure: renders a `<div>` (not a button) so consumers can wrap it with their
 * DnD adapter and still get drag-from-anywhere behavior. Hover / pressed / dragging
 * states are CSS-driven via `.menu-row` rules in `apps/odyssey-one/src/styles/components.css`.
 * Figma master: `MenuRow` set at `1973:87` on Components-Molecules.
 */
export default function MenuRow({ label, onClick, className = '', ...rest }) {
  const cls = `menu-row flex items-center justify-between ${className}`.trim()
  return (
    <div
      className={cls}
      onClick={onClick}
      style={{
        height: 36,
        padding: 'var(--spacing-2) var(--spacing-4)',
        gap: 'var(--spacing-3)',
      }}
      {...rest}
    >
      <span
        style={{
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-primary)',
          fontSize: 'var(--font-size-sm)',
          lineHeight: 'var(--line-height-sm)',
          fontWeight: 'var(--font-weight-regular)',
        }}
      >
        {label}
      </span>
      <span className="menu-row__grip" aria-hidden="true">
        <GripVertical {...ICON_MD} />
      </span>
    </div>
  )
}
