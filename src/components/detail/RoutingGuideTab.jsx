import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TruckElectric, Columns3Cog } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════
   Section 1 — Constants
   ═══════════════════════════════════════════════════════════ */

const STATUS_STYLES = {
  Accepted: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  Sent: { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  Declined: { bg: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' },
  Cancelled: { bg: 'var(--bg-tertiary)', color: 'var(--text-placeholder)' },
}

const LOCKED_COLUMNS = [
  { key: 'routeRank', label: 'Route Rank', primary: true, narrow: true },
  { key: 'rank', label: 'Rank', primary: true, narrow: true },
  { key: 'scac', label: 'SCAC', narrow: true },
  { key: 'carrierName', label: 'Carrier Name', primary: true },
  { key: 'equipment', label: 'Equipment' },
  { key: 'cost', label: 'AP Cost', narrow: true },
  { key: 'status', label: 'Tender Status' },
  { key: 'pickupDateTime', label: 'Pickup Date/Time' },
  { key: 'deliveryDateTime', label: 'Delivery Date/Time' },
]

const TAB_COLUMNS = {
  'routing-options': [
    { key: 'transit', label: 'Transit Time' },
    { key: 'distance', label: 'Distance' },
    { key: 'api', label: 'Notify Method' },
    { key: 'notifyDateTime', label: 'Notify Date' },
    { key: 'responseMethod', label: 'Response Method' },
    { key: 'responseDateTime', label: 'Response Date' },
    { key: 'responseUser', label: 'Response User' },
    { key: 'carrierQuoted', label: 'Carrier Quoted', narrow: true },
    { key: 'networkLeverage', label: 'Network Leverage', narrow: true },
  ],
  'notify-response': [
    { key: 'proNumber', label: 'Pro #' },
    { key: 'transportingCarrier', label: 'Transporting Carrier' },
    { key: 'equipNumber', label: 'Equip #' },
    { key: 'routeGroup', label: 'Route Group' },
  ],
  'volume-commitment': [
    { key: 'commitment', label: 'Commitment', narrow: true },
    { key: 'uom', label: 'UOM', narrow: true },
    { key: 'vcEquipNumber', label: 'Equip #' },
    { key: 'vcOpen', label: 'Open', narrow: true },
    { key: 'vcAccept', label: 'Accept', narrow: true },
    { key: 'vcDecline', label: 'Decline', narrow: true },
  ],
  'additional-info': [
    { key: 'carrierPickup', label: 'Carrier Pickup #' },
    { key: 'carrierApiTenderId', label: 'Carrier API Tender ID' },
    { key: 'breakPoint', label: 'Break Point' },
    { key: 'rateSource', label: 'Rate Source' },
    { key: 'distanceSource', label: 'Distance Source' },
    { key: 'description', label: 'Description' },
    { key: 'transitTimeSource', label: 'Transit Time Source' },
    { key: 'transitTimeId', label: 'Transit Time ID' },
    { key: 'loadboardExpiry', label: 'Loadboard Expiry' },
    { key: 'rcpId', label: 'RCP ID' },
    { key: 'lcePkId', label: 'LCE PK_ID' },
  ],
  others: [
    { key: 'modifyUser', label: 'Modify User' },
    { key: 'modifyDate', label: 'Modify Date' },
    { key: 'indirectPoint', label: 'Indirect Point' },
    { key: 'roundTrip', label: 'Round Trip', narrow: true },
    { key: 'customerPreferred', label: 'Customer Preferred', narrow: true },
    { key: 'orderEquip', label: 'Order Equip' },
    { key: 'contactExped', label: 'Contact Exped' },
    { key: 'note', label: 'Note' },
  ],
}

const SUB_TABS = [
  { key: 'routing-options', label: 'Routing Options' },
  { key: 'notify-response', label: 'Notify & Response Method' },
  { key: 'volume-commitment', label: 'View Volume Commitment' },
  { key: 'additional-info', label: 'Additional Info' },
  { key: 'others', label: 'Others' },
]

const TENDER_ACTIONS = {
  null: ['Tender'],
  Sent: ['Accept', 'Decline', 'Cancel'],
  Accepted: ['Cancel'],
  Declined: ['Re-Tender'],
  Cancelled: ['Re-Tender'],
}

const STATUS_AFTER_ACTION = {
  Tender: 'Sent',
  Accept: 'Accepted',
  Decline: 'Declined',
  Cancel: 'Cancelled',
  'Re-Tender': 'Sent',
}

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-subtle)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
}

const tdStyle = {
  padding: '10px 14px',
  whiteSpace: 'nowrap',
  fontSize: '14px',
  fontWeight: 400,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--bg-tertiary)',
}

const stickyLastCol = {
  position: 'sticky',
  right: 0,
  zIndex: 3,
  background: 'var(--bg-primary)',
  boxShadow: '-2px 0 4px rgba(0,0,0,0.06)',
}

/* ═══════════════════════════════════════════════════════════
   Section 2 — Helper Components
   ═══════════════════════════════════════════════════════════ */

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', lineHeight: 1.3, marginBottom: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
        {value == null || value === undefined ? '\u2014' : value}
      </div>
    </div>
  )
}

function SectionHeader({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text-primary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        paddingBottom: 6,
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

function CheckboxField({ label, checked }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <input type="checkbox" checked={checked} disabled style={{ accentColor: 'var(--border-focus)', width: 14, height: 14 }} />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  if (!status) return <span style={{ color: 'var(--text-placeholder)' }}>--</span>
  const style = STATUS_STYLES[status] || STATUS_STYLES.Declined
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-primary)',
        fontSize: '12px',
        fontWeight: 600,
        padding: '1px 8px',
        borderRadius: 'var(--radius-sm)',
        background: style.bg,
        color: style.color,
      }}
    >
      {status}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 3 — TenderSummary
   ═══════════════════════════════════════════════════════════ */

function TenderSummary({ shipment, shipmentDetails, onOpenDetail }) {
  const order = shipmentDetails?.orderDetails?.[0]
  const stops = shipmentDetails?.stopsData?.stops || []
  const pickupStop = stops.find(s => s.type === 'pickup')
  const deliveryStop = [...stops].reverse().find(s => s.type === 'delivery')

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        marginBottom: 40,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 24, alignItems: 'start' }}>
        <div>
          <Field label="Buy Shipment ID" value={shipment?.buyShipment} />
          <Field label="Sell Shipment ID" value={shipment?.sellShipment} />
          <Field label="Mode" value={shipment?.mode} />
          <Field label="Weight" value={shipment?.grossWeight ? `${Number(shipment.grossWeight).toLocaleString()} LB` : null} />
        </div>
        <div>
          <Field label="Pickup" value={order?.shipFrom?.company} />
          <Field label="Pickup Location" value={order?.shipFrom?.location} />
          <Field label="Pickup Date" value={pickupStop?.date} />
        </div>
        <div>
          <Field label="Delivery" value={order?.shipTo?.company} />
          <Field label="Delivery Location" value={order?.shipTo?.location} />
          <Field label="Delivery Date" value={deliveryStop?.date} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <button
            onClick={onOpenDetail}
            className="flex items-center text-sm font-medium"
            style={{
              padding: '6px 12px',
              fontFamily: 'var(--font-primary)',
              background: 'var(--btn-secondary-bg)',
              border: '1px solid var(--btn-secondary-border)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--btn-secondary-text)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--btn-secondary-text)'; e.currentTarget.style.background = 'var(--btn-secondary-bg)' }}
          >
            View Full Details
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 4 — TenderDetailModal
   ═══════════════════════════════════════════════════════════ */

function TenderDetailModal({ isOpen, onClose, shipment, shipmentDetails }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const order = shipmentDetails?.orderDetails?.[0]
  const stops = shipmentDetails?.stopsData?.stops || []
  const summary = shipmentDetails?.stopsData?.summary || {}
  const costOrder = shipmentDetails?.costData?.planned?.orders?.[0]
  const pickupStop = stops.find(s => s.type === 'pickup')
  const deliveryStop = [...stops].reverse().find(s => s.type === 'delivery')

  const columnStyle = { padding: '14px 16px', borderRight: '1px solid var(--border-subtle)' }
  const lastColumnStyle = { ...columnStyle, borderRight: 'none' }

  const neutralBtn = {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'var(--font-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90vw',
          maxWidth: 1100,
          maxHeight: '80vh',
          overflow: 'auto',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* 4-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          {/* Column 1: Shipment */}
          <div style={columnStyle}>
            <SectionHeader>Shipment</SectionHeader>
            <Field label="Buy Shipment ID" value={shipment?.buyShipment} />
            <Field label="Sell Shipment ID" value={shipment?.sellShipment} />
            <Field label="Mode" value={shipment?.mode} />
            <Field label="Seed Equipment" value={shipment?.equipmentCode} />
            <Field label="Planning Date Type" value="RDD" />
            <Field label="Gross Weight" value={shipment?.grossWeight ? `${Number(shipment.grossWeight).toLocaleString()} LB` : null} />
            <Field label="Pkg Count" value={pickupStop?.packageCount || null} />
            <Field label="Volume" value={summary.volume} />
            <Field label="Distance" value={summary.distance} />
            <CheckboxField label="Instructions" checked={true} />
            <CheckboxField label="Hazardous" checked={order?.hazmat === 'Yes'} />
          </div>

          {/* Column 2: Order */}
          <div style={columnStyle}>
            <SectionHeader>Order</SectionHeader>
            <Field label="Planning Date Type" value="RDD" />
            <Field label="Order Pickup Date/Time" value={order?.earliestPickup} />
            <Field label="Order Delivery Date/Time" value={order?.earliestDelivery} />
            <Field label="Order #" value={shipment?.orders?.join(', ')} />
            <Field label="Direct Cost" value={costOrder?.directCost || null} />
            <Field label="Pickup #" value={order?.pickupNumber || null} />
          </div>

          {/* Column 3: Initial Pickup */}
          <div style={columnStyle}>
            <SectionHeader>Initial Pickup</SectionHeader>
            <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginBottom: 4 }}>
              Pickup location name &amp; Address
            </div>
            <Field label="Company" value={order?.shipFrom?.company} />
            <Field label="Address" value={order?.shipFrom?.address} />
            <Field label="Location" value={order?.shipFrom?.location} />
            <div style={{ marginTop: 8 }} />
            <Field label="Pickup Date/Time" value={pickupStop?.date} />
          </div>

          {/* Column 4: Final Delivery */}
          <div style={lastColumnStyle}>
            <SectionHeader>Final Delivery</SectionHeader>
            <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginBottom: 4 }}>
              Delivery location name &amp; Address
            </div>
            <Field label="Company" value={order?.shipTo?.company} />
            <Field label="Address" value={order?.shipTo?.address} />
            <Field label="Location" value={order?.shipTo?.location} />
            <div style={{ marginTop: 8 }} />
            <Field label="Delivery Date/Time" value={deliveryStop?.date} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            style={neutralBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            Routing Query (QCP)
          </button>
          <button
            style={neutralBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            View Stops
          </button>
          <button
            onClick={onClose}
            style={neutralBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 5 — ActionDropdown
   ═══════════════════════════════════════════════════════════ */

function ActionDropdown({ status, position, onAction, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  const actions = TENDER_ACTIONS[status] || TENDER_ACTIONS[null] || []

  const btnStyle = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '7px 12px',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'var(--font-primary)',
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.1s ease',
  }

  return createPortal(
    <div
      ref={ref}
      data-tender-dropdown
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-100%)',
        minWidth: 220,
        zIndex: 9999,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: '6px',
      }}
    >
      {/* Tender Actions group */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 12px 4px' }}>
        Tender Actions
      </div>
      {actions.map((action) => (
        <button
          key={action}
          style={btnStyle}
          onClick={() => onAction(action)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {action}
        </button>
      ))}

      {/* Separator */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

      {/* Rate Details group */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 12px 4px' }}>
        Rate Details
      </div>
      <button
        style={btnStyle}
        onClick={() => { onAction('ShowRateDetails') }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        Show Rate Details
      </button>
    </div>,
    document.body,
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 6 — RoutingTable
   ═══════════════════════════════════════════════════════════ */

function RoutingTable({ options, columns, highlightedRank, openMenuRank, onOpenMenu, onCloseMenu, onAction, onToggleColumnPanel }) {
  if (!options || options.length === 0) {
    return (
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)', padding: 16 }}>
        No routing options available.
      </div>
    )
  }

  const getCellValue = (option, col) => {
    const dataKey = col.dataKey || col.key
    return option[dataKey] ?? '--'
  }

  return (
    <div style={{ overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '0 0 var(--radius-md) var(--radius-md)', marginBottom: 24 }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--font-primary)',
          fontSize: '14px',
          color: 'var(--text-secondary)',
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ ...thStyle, ...(col.narrow ? { width: 64, whiteSpace: 'normal', lineHeight: 1.3, textAlign: 'center' } : {}) }}>{col.label}</th>
            ))}
            <th className="sticky top-0" style={{ ...stickyLastCol, zIndex: 5, width: 72, padding: '0 var(--spacing-4)', textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
              <button
                className="flex items-center justify-center mx-auto bg-transparent border-none cursor-pointer p-1 rounded"
                style={{ color: 'var(--text-placeholder)' }}
                onClick={() => { if (onToggleColumnPanel) onToggleColumnPanel() }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-placeholder)' }}
                title="Column arrangement"
              >
                <Columns3Cog size={15} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {options.map((option) => {
            const isHighlighted = highlightedRank === option.rank
            return (
              <tr
                key={option.rank}
                style={{
                  cursor: 'default',
                  background: isHighlighted ? 'var(--badge-blue-bg)' : 'var(--bg-primary)',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => { if (!isHighlighted) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={(e) => { if (!isHighlighted) e.currentTarget.style.background = isHighlighted ? 'var(--badge-blue-bg)' : 'var(--bg-primary)' }}
              >
                {columns.map((col) => {
                  const isPrimary = col.primary
                  const cellStyle = {
                    ...tdStyle,
                    ...(isHighlighted ? { fontWeight: 500 } : {}),
                    ...(isPrimary ? { fontWeight: 500, color: 'var(--text-primary)' } : {}),
                    ...(col.narrow ? { width: 64, textAlign: 'center' } : {}),
                  }
                  return (
                    <td key={col.key} style={cellStyle}>
                      {col.key === 'status' ? <StatusBadge status={option.status} /> : getCellValue(option, col)}
                    </td>
                  )
                })}
                <td
                  style={{ ...stickyLastCol, padding: '0 var(--spacing-4)', borderBottom: '1px solid var(--bg-tertiary)', textAlign: 'center', width: 72, cursor: 'pointer', background: isHighlighted ? 'var(--badge-blue-bg)' : (option.status && STATUS_STYLES[option.status] ? STATUS_STYLES[option.status].bg : 'var(--bg-primary)') }}
                  onClick={(e) => {
                    e.stopPropagation()
                    const rect = e.currentTarget.getBoundingClientRect()
                    onOpenMenu(option.rank, { top: rect.bottom + 4, left: rect.right })
                  }}
                >
                  <div className="flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
                    <TruckElectric size={16} style={{ color: option.status && STATUS_STYLES[option.status] ? STATUS_STYLES[option.status].color : 'var(--text-placeholder)' }} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {openMenuRank != null && (() => {
        const activeOption = options.find(o => o.rank === openMenuRank)
        if (!activeOption) return null
        const pos = activeOption._menuPos || { top: 0, left: 0 }
        return (
          <ActionDropdown
            status={activeOption.status}
            position={pos}
            onAction={(action) => onAction(openMenuRank, action)}
            onClose={onCloseMenu}
          />
        )
      })()}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 7 — RoutingSubTabs
   ═══════════════════════════════════════════════════════════ */

function RoutingSubTabs({ activeSubTab, onTabChange }) {
  return (
    <div className="flex" style={{ gap: 'var(--spacing-6)', borderBottom: '1px solid var(--border-subtle)' }}>
      {SUB_TABS.map((tab) => {
        const isActive = tab.key === activeSubTab
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className="whitespace-nowrap bg-transparent border-none cursor-pointer text-sm font-bold"
            style={{
              padding: '8px 0',
              fontFamily: 'var(--font-primary)',
              color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: `2px solid ${isActive ? 'var(--text-tertiary)' : 'transparent'}`,
              marginBottom: -1,
              transition: 'color var(--transition-fast), border-color var(--transition-fast)',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 8 — Main Component
   ═══════════════════════════════════════════════════════════ */

export default function RoutingGuideTab({ data, shipmentDetails, shipment, onToggleColumnPanel }) {
  const [activeSubTab, setActiveSubTab] = useState('routing-options')
  const [highlightedRank, setHighlightedRank] = useState(null)
  const [openMenuRank, setOpenMenuRank] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [options, setOptions] = useState(data?.options || [])
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const tableRef = useRef(null)

  /* Reset all state when data changes (new shipment selected) */
  useEffect(() => {
    setActiveSubTab('routing-options')
    setHighlightedRank(null)
    setOpenMenuRank(null)
    setMenuPos({ top: 0, left: 0 })
    setOptions(data?.options || [])
    setIsDetailModalOpen(false)
  }, [data])

  /* Click-outside listener: clicks outside tableRef and not inside [data-tender-dropdown] */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tableRef.current && !tableRef.current.contains(e.target) && !e.target.closest('[data-tender-dropdown]')) {
        setHighlightedRank(null)
        setOpenMenuRank(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpenMenu = useCallback((rank, pos) => {
    setHighlightedRank(rank)
    setOpenMenuRank((prev) => (prev === rank ? null : rank))
    setMenuPos(pos)
  }, [])

  const handleCloseMenu = useCallback(() => {
    setOpenMenuRank(null)
  }, [])

  const handleAction = useCallback((rank, action) => {
    if (action === 'ShowRateDetails') {
      console.log('[Tender] Show Rate Details for rank', rank)
      setOpenMenuRank(null)
      return
    }

    setOptions((prev) => {
      let updated = prev.map((opt) =>
        opt.rank === rank ? { ...opt, status: STATUS_AFTER_ACTION[action] || opt.status } : opt,
      )

      /* CASCADE: on Decline or Cancel, auto-tender next null-status carrier by rank ascending */
      if (action === 'Decline' || action === 'Cancel') {
        const sortedByRank = [...updated].sort((a, b) => a.rank - b.rank)
        const nextNull = sortedByRank.find((opt) => opt.status === null || opt.status === undefined)
        if (nextNull) {
          updated = updated.map((opt) =>
            opt.rank === nextNull.rank ? { ...opt, status: 'Sent' } : opt,
          )
        }
      }

      return updated
    })

    setOpenMenuRank(null)
  }, [])

  const activeColumns = [...LOCKED_COLUMNS, ...(TAB_COLUMNS[activeSubTab] || [])]

  /* Attach _menuPos to the option that has its menu open */
  const optionsWithPos = options.map((opt) =>
    opt.rank === openMenuRank ? { ...opt, _menuPos: menuPos } : opt,
  )

  return (
    <div
      style={{
        margin: 'calc(-1 * var(--spacing-4)) calc(-1 * var(--spacing-5))',
        padding: 'var(--spacing-4) var(--spacing-5)',
        height: 'calc(100% + var(--spacing-4) * 2)',
        overflow: 'auto',
      }}
    >
      <TenderSummary
        shipment={shipment}
        shipmentDetails={shipmentDetails}
        onOpenDetail={() => setIsDetailModalOpen(true)}
      />

      <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 16, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <RoutingSubTabs activeSubTab={activeSubTab} onTabChange={setActiveSubTab} />
        </div>
        <button
          className="flex items-center text-sm font-medium"
          style={{
            padding: '6px 12px',
            fontFamily: 'var(--font-primary)',
            background: 'var(--btn-secondary-bg)',
            border: '1px solid var(--btn-secondary-border)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--btn-secondary-text)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'color 0.15s ease, background 0.15s ease',
            marginLeft: 16,
            marginBottom: 4,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--btn-secondary-text)'; e.currentTarget.style.background = 'var(--btn-secondary-bg)' }}
        >
          Add Quote
        </button>
      </div>

      <div ref={tableRef}>
        <RoutingTable
          options={optionsWithPos}
          columns={activeColumns}
          highlightedRank={highlightedRank}
          openMenuRank={openMenuRank}
          onOpenMenu={handleOpenMenu}
          onCloseMenu={handleCloseMenu}
          onAction={handleAction}
          onToggleColumnPanel={onToggleColumnPanel}
        />
      </div>

      {isDetailModalOpen && (
        <TenderDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          shipment={shipment}
          shipmentDetails={shipmentDetails}
        />
      )}
    </div>
  )
}
