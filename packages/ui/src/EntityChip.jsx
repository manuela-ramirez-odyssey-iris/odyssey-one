import { Handshake, Plus } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import IconButton from './IconButton.jsx'

/**
 * EntityChip — molecule. Pill that names a scope (e.g. "Customers") and shows how many
 * entities are currently selected via stacked dashed-border icon slots.
 *
 * Display rules:
 *   count 1–3  → that many handshake icons
 *   count 4+   → 3 handshakes + a "+N" slot where N = count − 3, capped at 9
 *
 * Default `entityIcon` is Handshake (Customers context). Pass a different Lucide icon for
 * other entity types. Optional trailing `+` button (`showAddButton`) is on by default.
 */
export default function EntityChip({
  name = 'Customers',
  count = 1,
  entityIcon,
  showAddButton = true,
  onAddClick,
  onClick,
  className = '',
  ...rest
}) {
  const safeCount = Math.max(1, Math.floor(count))
  const handshakeCount = Math.min(safeCount, 3)
  const overflow = safeCount > 3 ? Math.min(safeCount - 3, 9) : 0
  const Icon = entityIcon ?? Handshake

  return (
    <div
      className={`entity-chip ${className}`.trim()}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--spacing-3)',
        padding: '6px var(--spacing-2) 6px var(--spacing-3)',
        background: 'var(--white)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-full)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      {...rest}
    >
      <span
        className="entity-chip__name"
        style={{
          fontFamily: 'var(--font-primary)',
          fontSize: 'var(--font-size-sm)',
          lineHeight: 'var(--line-height-sm)',
          fontWeight: 'var(--font-weight-regular)',
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
      <div
        className="entity-chip__icons"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {Array.from({ length: handshakeCount }).map((_, i) => (
          <EntityChipSlot key={`hs-${i}`} stacked={i > 0}>
            <Icon {...ICON_MD} />
          </EntityChipSlot>
        ))}
        {overflow > 0 && (
          <EntityChipSlot stacked={handshakeCount > 0}>
            <span
              style={{
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--font-size-xs)',
                lineHeight: 'var(--line-height-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {`+${overflow}`}
            </span>
          </EntityChipSlot>
        )}
        {showAddButton && (
          <span style={{ marginLeft: -4 }}>
            <IconButton
              icon={<Plus {...ICON_MD} />}
              onClick={onAddClick}
              ariaLabel={`Add ${name.toLowerCase()}`}
            />
          </span>
        )}
      </div>
    </div>
  )
}

function EntityChipSlot({ children, stacked = false }) {
  return (
    <span
      className="entity-chip__slot"
      style={{
        width: 24,
        height: 24,
        padding: 'var(--spacing-1)',
        marginLeft: stacked ? -4 : 0,
        borderRadius: 'var(--radius-full)',
        border: '2px dashed var(--border-default)',
        background: 'var(--white)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        color: 'var(--text-placeholder)',
      }}
    >
      {children}
    </span>
  )
}
