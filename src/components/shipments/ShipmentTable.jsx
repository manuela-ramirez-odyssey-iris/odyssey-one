import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical, Columns3Cog } from 'lucide-react'
import Badge from '../ui/Badge'
import DarkTooltip from '../ui/DarkTooltip'
import { ALL_COLUMNS } from '../detail/ColumnPanel'

const BADGE_COLORS = ['amber', 'blue', 'green', 'red', 'purple']

function OrdersTooltip({ orders, children }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ top: rect.top, left: rect.left + rect.width / 2 })
    }
    setShow(true)
  }

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
    >
      {children}
      {show && orders.length > 0 && pos && createPortal(
        <div style={{
          position: 'fixed',
          top: pos.top - 8,
          left: pos.left,
          transform: 'translate(-50%, -100%)',
          background: 'var(--deep-sea-neutral-900, #1B2537)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 12, color: 'var(--deep-sea-neutral-300, #D0D4DB)', marginBottom: 8 }}>
            Order numbers on this shipment:
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {orders.map((ord, i) => (
              <Badge key={ord} variant={BADGE_COLORS[i]}>{ord}</Badge>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export const COLUMN_CONFIG = [
  { key: 'buyShipment', label: 'Buy Shipment' },
  { key: 'customerId', label: 'Customer ID(s)' },
  {
    key: 'shipmentStatus',
    label: 'Shipment Status',
    render: (s) => (
      <DarkTooltip text={s.tenderStatus ? `Tender Status: ${s.tenderStatus}` : null} width="auto">
        <span>{s.shipmentStatus ? (
          <Badge variant={s.shipmentStatus === 'Done' ? 'green' : 'gray'}>{s.shipmentStatus}</Badge>
        ) : '\u2014'}</span>
      </DarkTooltip>
    ),
  },
  {
    key: 'orders',
    label: 'Order #',
    render: (s) => (
      <OrdersTooltip orders={s.orders}>
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, overflow: 'hidden', maxWidth: 192 }}>
          {s.orders.map((ord, i) => (
            <Badge key={ord} variant={BADGE_COLORS[i]}>{ord}</Badge>
          ))}
        </div>
      </OrdersTooltip>
    ),
  },
  {
    key: 'orderCount',
    label: 'Order Count',
    render: (s) => (
      <OrdersTooltip orders={s.orders}>
        <span>{s.orderCount}</span>
      </OrdersTooltip>
    ),
  },
  { key: 'pickupDate', label: 'Pickup Date' },
  { key: 'deliveryDate', label: 'Delivery Date' },
  { key: 'origin', label: 'Origin' },
  { key: 'destination', label: 'Destination' },
  {
    key: 'grossWeight',
    label: 'Gross Weight',
    render: (s) => (
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {s.grossWeight ? `${Number(s.grossWeight).toLocaleString()} LB` : '--'}
      </span>
    ),
  },
  { key: 'mode', label: 'Mode' },
  { key: 'equipmentCode', label: 'Equipment' },
  { key: 'scac', label: 'SCAC' },
  {
    key: 'apFreightCost',
    label: 'AP Freight Cost',
    render: (s) => (
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {s.apFreightCost ? `$${Number(s.apFreightCost.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}
      </span>
    ),
  },
  {
    key: 'validationMessage',
    label: 'Message',
    render: (s) => s.validationMessage || '',
  },
]

const stickyLastCol = {
  position: 'sticky',
  right: 0,
  zIndex: 3,
  background: 'var(--bg-primary)',
  boxShadow: '-2px 0 4px rgba(0,0,0,0.06)',
}

function ActionMenu({ shipmentId, position, onClose }) {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [onClose])

  const items = [
    { label: 'Edit', key: 'edit' },
    { label: 'Tender by Preferred Carrier', key: 'tender' },
  ]

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-100%)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        zIndex: 9999,
        minWidth: 220,
        padding: '4px 0',
        fontFamily: 'var(--font-primary)',
      }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onClose()}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 14px',
            background: 'transparent',
            border: 'none',
            textAlign: 'left',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-primary)',
            transition: 'background 0.12s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  )
}

const COLUMN_CONFIG_MAP = Object.fromEntries(COLUMN_CONFIG.map(c => [c.key, c]))

const ShipmentRow = React.memo(function ShipmentRow({ shipment, isSelected, onSelect, rowRef, orderedColumns }) {
  const s = shipment
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const rowBg = isSelected ? 'var(--badge-blue-bg)' : 'var(--bg-primary)'
  return (
    <tr
      ref={rowRef}
      className="transition-colors duration-150 cursor-pointer"
      style={{ background: rowBg }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'var(--bg-secondary)'
          e.currentTarget.querySelector('[data-sticky-col]').style.background = 'var(--bg-secondary)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'var(--bg-primary)'
          e.currentTarget.querySelector('[data-sticky-col]').style.background = 'var(--bg-primary)'
        }
      }}
      onClick={() => onSelect(s)}
    >
      <td style={{ padding: '0 var(--spacing-4)', height: 56, borderBottom: '1px solid var(--bg-tertiary)', textAlign: 'center' }}
        onClick={(e) => { e.stopPropagation(); onSelect(s) }}>
        <input
          type="radio"
          name="shipment-select"
          checked={isSelected}
          readOnly
          style={{ accentColor: 'var(--border-focus)', width: 16, height: 16, cursor: 'pointer', pointerEvents: 'none' }}
        />
      </td>
      {orderedColumns.map(col => {
        const configCol = COLUMN_CONFIG_MAP[col.key]
        return (
          <td key={col.key} style={{
            padding: '0 var(--spacing-4)',
            height: 56,
            borderBottom: '1px solid var(--bg-tertiary)',
            whiteSpace: 'nowrap',
            ...(col.key === 'buyShipment' ? { fontWeight: 500, color: 'var(--text-secondary)' } : {}),
          }}>
            {configCol && configCol.render ? configCol.render(s) : (s[col.key] || '--')}
          </td>
        )
      })}
      <td
        data-sticky-col
        onClick={(e) => {
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          setMenuPos({ top: rect.bottom + 4, left: rect.right })
          setMenuOpen((prev) => !prev)
        }}
        style={{ ...stickyLastCol, padding: 0, height: 56, borderBottom: '1px solid var(--bg-tertiary)', textAlign: 'center', width: 56, cursor: 'pointer', background: isSelected ? 'var(--badge-blue-bg)' : 'var(--bg-primary)' }}
      >
        <div className="flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
          <MoreVertical size={16} style={{ color: 'var(--text-placeholder)' }} />
        </div>
        {menuOpen && <ActionMenu shipmentId={s.buyShipment} position={menuPos} onClose={() => setMenuOpen(false)} />}
      </td>
    </tr>
  )
}, (prevProps, nextProps) => {
  return prevProps.isSelected === nextProps.isSelected &&
    prevProps.shipment === nextProps.shipment &&
    prevProps.rowRef === nextProps.rowRef &&
    prevProps.orderedColumns === nextProps.orderedColumns
})

export default function ShipmentTable({ shipments, onRowSelect, selectedId, onToggleColumnPanel, visibleColumns }) {
  const tableContainerRef = useRef(null)
  const selectedRowRef = useRef(null)

  const orderedColumns = useMemo(() => {
    if (!visibleColumns) return COLUMN_CONFIG
    return visibleColumns
      .map(key => {
        const fromConfig = COLUMN_CONFIG.find(c => c.key === key)
        if (fromConfig) return fromConfig
        // Fallback: column not in COLUMN_CONFIG, render as plain text
        const allCol = ALL_COLUMNS.find(c => c.key === key)
        return { key, label: allCol ? allCol.label : key }
      })
      .filter(Boolean)
  }, [visibleColumns])

  const handleSelect = useCallback((shipment) => {
    onRowSelect(selectedId === shipment.buyShipment ? null : shipment.buyShipment)
  }, [onRowSelect, selectedId])

  // Auto-scroll selected row into view above the bottom bar
  useEffect(() => {
    if (selectedId && selectedRowRef.current) {
      // Small delay to let the bottom bar expand and metrics collapse
      setTimeout(() => {
        const row = selectedRowRef.current
        if (!row) return
        const main = row.closest('main')
        if (!main) return
        const rowRect = row.getBoundingClientRect()
        // Bottom bar expands to 50vh, so the visible area ends there
        const bottomBarTop = window.innerHeight * 0.5
        if (rowRect.bottom > bottomBarTop) {
          main.scrollBy({ top: rowRect.bottom - bottomBarTop + 80, behavior: 'smooth' })
        }
      }, 350)
    }
  }, [selectedId])

  return (
    <div ref={tableContainerRef} className="flex-1 min-h-0 overflow-auto"
      style={{ borderRadius: 'var(--radius-lg)', paddingBottom: 'var(--bottombar-collapsed)', minHeight: 560 }}>
      <table className="w-full border-collapse text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-primary)' }}>
        <thead>
          <tr>
            <th className="sticky top-0 z-2"
              style={{ width: 48, padding: '0 var(--spacing-4)', height: 'var(--bottombar-collapsed)', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            </th>
            {orderedColumns.map(col => (
              <th key={col.key} className="sticky top-0 z-2 text-left whitespace-nowrap"
                style={{ padding: '0 var(--spacing-4)', height: 'var(--bottombar-collapsed)', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-placeholder)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                {col.label}
              </th>
            ))}
            <th className="sticky top-0" style={{ ...stickyLastCol, zIndex: 5, width: 56, padding: '0 var(--spacing-4)', height: 'var(--bottombar-collapsed)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <button
                className="flex items-center justify-center mx-auto bg-transparent border-none cursor-pointer p-1 rounded"
                style={{ color: 'var(--text-placeholder)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-placeholder)'}
                onClick={() => { if (onToggleColumnPanel) onToggleColumnPanel() }}
                title="Column arrangement"
              >
                <Columns3Cog size={18} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {shipments.map((s) => (
            <ShipmentRow
              key={s.buyShipment}
              shipment={s}
              isSelected={selectedId === s.buyShipment}
              onSelect={handleSelect}
              rowRef={selectedId === s.buyShipment ? selectedRowRef : undefined}
              orderedColumns={orderedColumns}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
