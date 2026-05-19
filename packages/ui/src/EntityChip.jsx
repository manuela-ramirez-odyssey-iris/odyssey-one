import { Handshake, Plus } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import IconButton from './IconButton.jsx'

/**
 * EntityChip — molecule. Pill that names a scope (e.g. "Customers") and shows how many
 * entities are currently selected via stacked dashed-border icon slots.
 *
 * Display rules:
 *   count 0    → no handshakes (chip shows only name + add affordance)
 *   count 1–3  → that many handshake icons
 *   count 4+   → 3 handshakes + a "+N" slot where N = count − 3, capped at 9
 *
 * Default `entityIcon` is Handshake (Customers context). Pass a different Lucide icon for
 * other entity types. The trailing `+` IconButton is the only interactive element — the
 * pill itself is decorative. Wire `onAddClick` to handle the add affordance.
 */
export default function EntityChip({
  name = 'Customers',
  count = 1,
  entityIcon,
  showAddButton = true,
  onAddClick,
  className = '',
  ...rest
}) {
  const safeCount = Math.max(0, Math.floor(count))
  const handshakeCount = Math.min(safeCount, 3)
  const overflow = safeCount > 3 ? Math.min(safeCount - 3, 9) : 0
  const Icon = entityIcon ?? Handshake

  return (
    <div className={`entity-chip ${className}`.trim()} {...rest}>
      <span className="entity-chip__name">{name}</span>
      <span className="entity-chip__icons">
        {Array.from({ length: handshakeCount }).map((_, i) => (
          <EntityChipSlot key={`hs-${i}`} stacked={i > 0}>
            <Icon {...ICON_MD} />
          </EntityChipSlot>
        ))}
        {overflow > 0 && (
          <EntityChipSlot stacked={handshakeCount > 0}>
            <span className="entity-chip__overflow">{`+${overflow}`}</span>
          </EntityChipSlot>
        )}
        {showAddButton && (
          <span className="entity-chip__add">
            <IconButton
              icon={<Plus {...ICON_MD} />}
              onClick={onAddClick}
              ariaLabel={`Add ${name.toLowerCase()}`}
            />
          </span>
        )}
      </span>
    </div>
  )
}

function EntityChipSlot({ children, stacked = false }) {
  return (
    <span className={`entity-chip__slot${stacked ? ' entity-chip__slot--stacked' : ''}`}>
      <svg
        className="entity-chip__slot-ring"
        viewBox="0 0 28 28"
        aria-hidden="true"
      >
        <circle
          cx="14"
          cy="14"
          r="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="3 2"
        />
      </svg>
      {children}
    </span>
  )
}
