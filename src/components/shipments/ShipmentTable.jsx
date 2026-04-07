import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { List } from 'react-window'
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

const ROW_HEIGHT = 56

const ShipmentRow = React.memo(function ShipmentRow({ shipment, isSelected, onSelect, orderedColumns }) {
  const s = shipment
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const rowBg = isSelected ? 'var(--badge-blue-bg)' : 'var(--bg-primary)'

  return (
    <div
      className="flex items-center cursor-pointer transition-colors duration-150"
      style={{ background: rowBg, height: ROW_HEIGHT, minWidth: 'max-content' }}
      onClick={() => onSelect(s)}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)'
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'var(--bg-primary)'
      }}
    >
      {/* Radio */}
      <div style={{ width: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: ROW_HEIGHT, borderBottom: '1px solid var(--bg-tertiary)' }}
        onClick={(e) => { e.stopPropagation(); onSelect(s) }}>
        <input
          type="radio"
          name="shipment-select"
          checked={isSelected}
          readOnly
          style={{ accentColor: 'var(--text-primary)', width: 16, height: 16, cursor: 'pointer', pointerEvents: 'none' }}
        />
      </div>

      {/* Data columns */}
      {orderedColumns.map(col => {
        const configCol = COLUMN_CONFIG_MAP[col.key]
        return (
          <div key={col.key} style={{
            flex: '1 0 0',
            minWidth: 100,
            padding: '0 var(--spacing-4)',
            height: ROW_HEIGHT,
            borderBottom: '1px solid var(--bg-tertiary)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            ...(col.key === 'buyShipment' ? { fontWeight: 500, color: 'var(--text-secondary)' } : {}),
          }}>
            {configCol && configCol.render ? configCol.render(s) : (s[col.key] || '--')}
          </div>
        )
      })}

      {/* Sticky actions column */}
      <div
        onClick={(e) => {
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          setMenuPos({ top: rect.bottom + 4, left: rect.right })
          setMenuOpen((prev) => !prev)
        }}
        style={{ ...stickyLastCol, width: 56, flexShrink: 0, height: ROW_HEIGHT, borderBottom: '1px solid var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: isSelected ? 'var(--badge-blue-bg)' : 'var(--bg-primary)' }}
      >
        <MoreVertical size={16} style={{ color: 'var(--text-placeholder)' }} />
        {menuOpen && <ActionMenu shipmentId={s.buyShipment} position={menuPos} onClose={() => setMenuOpen(false)} />}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.isSelected === nextProps.isSelected &&
    prevProps.shipment === nextProps.shipment &&
    prevProps.orderedColumns === nextProps.orderedColumns
})

const VirtualRow = React.memo(function VirtualRow({ index, style, data }) {
  const { shipments, selectedId, handleSelect, orderedColumns } = data
  const s = shipments[index]
  return (
    <div style={style}>
      <ShipmentRow
        shipment={s}
        isSelected={selectedId === s.buyShipment}
        onSelect={handleSelect}
        orderedColumns={orderedColumns}
      />
    </div>
  )
})

export default function ShipmentTable({ shipments, onRowSelect, selectedId, onToggleColumnPanel, visibleColumns }) {
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const [listHeight, setListHeight] = useState(600)

  const orderedColumns = useMemo(() => {
    if (!visibleColumns) return COLUMN_CONFIG
    return visibleColumns
      .map(key => {
        const fromConfig = COLUMN_CONFIG.find(c => c.key === key)
        if (fromConfig) return fromConfig
        const allCol = ALL_COLUMNS.find(c => c.key === key)
        return { key, label: allCol ? allCol.label : key }
      })
      .filter(Boolean)
  }, [visibleColumns])

  const handleSelect = useCallback((shipment) => {
    onRowSelect(selectedId === shipment.buyShipment ? null : shipment.buyShipment)
  }, [onRowSelect, selectedId])

  // Auto-scroll selected row into view
  useEffect(() => {
    if (selectedId && listRef.current) {
      const idx = shipments.findIndex(s => s.buyShipment === selectedId)
      if (idx >= 0) {
        setTimeout(() => {
          listRef.current?.scrollToItem(idx, 'smart')
        }, 100)
      }
    }
  }, [selectedId, shipments])

  // Dynamic height via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setListHeight(Math.max(400, entry.contentRect.height - 48))
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Shared data passed to each row via itemData
  const itemData = useMemo(() => ({
    shipments,
    selectedId,
    handleSelect,
    orderedColumns,
  }), [shipments, selectedId, handleSelect, orderedColumns])

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden flex flex-col"
      style={{ borderRadius: 'var(--radius-lg)', paddingBottom: 'var(--bottombar-collapsed)', minHeight: 560 }}>
      {/* Sticky header */}
      <div style={{ flexShrink: 0, overflowX: 'auto' }}>
        <div className="flex" style={{ minWidth: 'max-content' }}>
          <div style={{ width: 48, flexShrink: 0, padding: '0 var(--spacing-4)', height: 'var(--bottombar-collapsed)', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          {orderedColumns.map(col => (
            <div key={col.key} className="text-left whitespace-nowrap"
              style={{ flex: '1 0 0', minWidth: 100, padding: '0 var(--spacing-4)', height: 'var(--bottombar-collapsed)', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-placeholder)', fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center' }}>
              {col.label}
            </div>
          ))}
          <div style={{ ...stickyLastCol, zIndex: 5, width: 56, flexShrink: 0, padding: '0 var(--spacing-4)', height: 'var(--bottombar-collapsed)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          </div>
        </div>
      </div>

      {/* Virtualized row list */}
      {shipments.length === 0 ? (
        <div className="flex items-center justify-center" style={{ padding: '48px 0', color: 'var(--text-placeholder)', fontSize: 'var(--font-size-sm)' }}>
          No shipments found
        </div>
      ) : (
        <List
          ref={listRef}
          height={listHeight}
          itemCount={shipments.length}
          itemSize={ROW_HEIGHT}
          width="100%"
          overscanCount={10}
          itemData={itemData}
          style={{ overflowX: 'auto' }}
        >
          {VirtualRow}
        </List>
      )}
    </div>
  )
}
