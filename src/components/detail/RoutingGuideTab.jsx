import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TruckElectric, Columns3Cog, X, Trash2, FoldHorizontal, UnfoldHorizontal } from 'lucide-react'

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

const NEVER_COLLAPSE_KEYS = ['routeRank', 'rank', 'status']
const COLLAPSIBLE_KEYS = ['scac', 'carrierName', 'equipment', 'cost', 'pickupDateTime', 'deliveryDateTime']
const COLLAPSED_WIDTH = 52


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

const CARRIERS = [
  { scac: 'SEFL', name: 'SOUTHEASTERN FREIGHT LINES' },
  { scac: 'ODFL', name: 'OLD DOMINION FREIGHT LINE' },
  { scac: 'XPOL', name: 'XPO LOGISTICS' },
  { scac: 'EXLA', name: 'ESTES EXPRESS LINES' },
  { scac: 'SAIA', name: 'SAIA INC' },
  { scac: 'CTNS', name: 'CONTINENTAL TRANSPORTATION' },
  { scac: 'JBHT', name: 'J.B. HUNT TRANSPORT' },
  { scac: 'SNLU', name: 'SCHNEIDER NATIONAL' },
  { scac: 'USFC', name: 'USF CORPORATION' },
  { scac: 'FXFE', name: 'FEDEX FREIGHT ECONOMY' },
  { scac: 'UPGF', name: 'UPS FREIGHT' },
  { scac: 'RLCA', name: 'R+L CARRIERS' },
  { scac: 'ABFS', name: 'ABF FREIGHT SYSTEM' },
  { scac: 'CNWY', name: 'CONWAY FREIGHT' },
  { scac: 'WARD', name: 'WARD TRUCKING' },
]

const CHARGE_CODES = [
  { code: 'THC', description: 'Terminal Handling Charge' },
  { code: 'FSC', description: 'Fuel Surcharge' },
  { code: 'SOC', description: 'Stop-Off Charge' },
  { code: 'HZC', description: 'Hazmat Charge' },
  { code: 'ACC', description: 'Accessorial' },
]

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
        {/* Header bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Shipment Details</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--text-placeholder)', padding: 0, transition: 'color 0.15s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-placeholder)'}
          >
            <X size={18} />
          </button>
        </div>

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
            <Field label="Instructions" value={
              (() => {
                const orders = shipmentDetails?.instructionsData?.orders || []
                const count = orders.reduce((sum, o) => sum + (o.instructions?.length || 0), 0)
                return count > 0 ? `${count} instruction${count !== 1 ? 's' : ''}` : 'No instructions'
              })()
            } />
            <Field label="Hazardous" value={
              order?.hazmat === 'Yes'
                ? (() => {
                    const products = shipmentDetails?.productData?.orders?.[0]?.products || []
                    const haz = products.find(p => p.hazmat)
                    return haz ? `Yes — ${haz.hazmatClass || ''} ${haz.hazmatDescription || ''}`.trim() : 'Yes'
                  })()
                : 'No'
            } />
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

        {/* Footer — shipment context actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => console.log('[Tender] Routing Query (QCP) clicked')}
            className="flex items-center text-sm font-medium"
            style={{
              padding: '6px 12px',
              fontFamily: 'var(--font-primary)',
              background: 'var(--btn-secondary-bg)',
              border: '1px solid var(--btn-secondary-border)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--btn-secondary-text)',
              cursor: 'pointer',
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--btn-secondary-text)'; e.currentTarget.style.background = 'var(--btn-secondary-bg)' }}
          >
            Routing Query (QCP)
          </button>
          <button
            onClick={() => console.log('[Tender] View Stops clicked')}
            className="flex items-center text-sm font-medium"
            style={{
              padding: '6px 12px',
              fontFamily: 'var(--font-primary)',
              background: 'var(--btn-secondary-bg)',
              border: '1px solid var(--btn-secondary-border)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--btn-secondary-text)',
              cursor: 'pointer',
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--btn-secondary-text)'; e.currentTarget.style.background = 'var(--btn-secondary-bg)' }}
          >
            View Stops
          </button>
        </div>

      </div>
    </div>,
    document.body,
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 4b — QuoteModal
   ═══════════════════════════════════════════════════════════ */

function QuoteModal({ mode, carrierData, onSave, onClose }) {
  const isView = mode === 'view'
  const isEdit = mode === 'edit'

  const [scac, setScac] = useState(() => carrierData?.scac || '')
  const [carrierName, setCarrierName] = useState(() => carrierData?.carrierName || '')
  const [pickupDateTime, setPickupDateTime] = useState(() => carrierData?.pickupDateTime || '')
  const [deliveryDateTime, setDeliveryDateTime] = useState(() => carrierData?.deliveryDateTime || '')
  const [baseRate, setBaseRate] = useState(() => carrierData?.rateDetails?.baseRate ?? '')
  const [currency, setCurrency] = useState(() => carrierData?.rateDetails?.currency || 'USD')
  const [markup, setMarkup] = useState(() => carrierData?.rateDetails?.markup ?? '')
  const [markupCurrency, setMarkupCurrency] = useState(() => 'USD')
  const [additionalCharges, setAdditionalCharges] = useState(() =>
    carrierData?.rateDetails?.additionalCharges?.map(c => ({ ...c })) || [],
  )

  const handleKeyDown = useCallback(
    (e) => { if (e.key === 'Escape') onClose() },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleScacChange = (val) => {
    setScac(val)
    const found = CARRIERS.find(c => c.scac === val)
    setCarrierName(found ? found.name : '')
  }

  const addChargeRow = () => {
    setAdditionalCharges(prev => [...prev, { code: '', description: '', amount: '', currency: 'USD' }])
  }

  const updateCharge = (idx, field, value) => {
    setAdditionalCharges(prev => prev.map((c, i) => {
      if (i !== idx) return c
      if (field === 'code') {
        const found = CHARGE_CODES.find(cc => cc.code === value)
        return { ...c, code: value, description: found ? found.description : '' }
      }
      return { ...c, [field]: field === 'amount' ? (value === '' ? '' : Number(value)) : value }
    }))
  }

  const removeCharge = (idx) => {
    setAdditionalCharges(prev => prev.filter((_, i) => i !== idx))
  }

  // Derived totals
  const numBase = Number(baseRate) || 0
  const numMarkup = Number(markup) || 0
  const chargeTotal = additionalCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const apTotal = Math.round((numBase + chargeTotal) * 100) / 100
  const arTotal = Math.round((numBase + numMarkup + chargeTotal) * 100) / 100

  const handleSave = () => {
    onSave({
      scac,
      carrierName,
      pickupDateTime,
      deliveryDateTime,
      rateDetails: {
        baseRate: numBase,
        currency,
        markup: numMarkup,
        additionalCharges: additionalCharges.filter(c => c.code),
        apTotal,
        arTotal,
      },
    })
  }

  const title = mode === 'add' ? 'Add Quote' : mode === 'edit' ? 'Edit Quote' : 'Rate Details'

  const inputStyle = {
    width: '100%',
    padding: '6px 8px',
    fontSize: 13,
    fontFamily: 'var(--font-primary)',
    background: isView ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: 4,
  }

  const fmt2 = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
          maxWidth: 720,
          maxHeight: '85vh',
          overflow: 'auto',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-placeholder)', padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.15s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-placeholder)'}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Carrier Section */}
          <SectionHeader>Carrier</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={labelStyle}>SCAC</div>
              <select
                value={scac}
                onChange={(e) => handleScacChange(e.target.value)}
                disabled={isView || isEdit}
                style={{ ...inputStyle, cursor: (isView || isEdit) ? 'default' : 'pointer' }}
              >
                <option value="">Select SCAC...</option>
                {CARRIERS.map(c => (
                  <option key={c.scac} value={c.scac}>{c.scac}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Carrier Name</div>
              <input
                type="text"
                value={carrierName}
                disabled
                style={{ ...inputStyle, background: 'var(--bg-tertiary)' }}
              />
            </div>
            <div>
              <div style={labelStyle}>Pickup Date/Time</div>
              <input
                type="text"
                value={pickupDateTime}
                onChange={(e) => setPickupDateTime(e.target.value)}
                disabled={isView}
                placeholder="MM/DD/YYYY HH:MM CST"
                style={inputStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>Delivery Date/Time</div>
              <input
                type="text"
                value={deliveryDateTime}
                onChange={(e) => setDeliveryDateTime(e.target.value)}
                disabled={isView}
                placeholder="MM/DD/YYYY HH:MM CST"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Rate Section */}
          <SectionHeader>Rate</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 12, marginBottom: 16, alignItems: 'end' }}>
            <div>
              <div style={labelStyle}>Base Rate *</div>
              <input
                type="number"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={isView}
                style={inputStyle}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <div style={labelStyle}>Currency</div>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={isView} style={{ ...inputStyle, width: 80 }}>
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <div style={labelStyle}>Markup</div>
              <input
                type="number"
                value={markup}
                onChange={(e) => setMarkup(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={isView}
                style={inputStyle}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <div style={labelStyle}>Currency</div>
              <select value={markupCurrency} onChange={(e) => setMarkupCurrency(e.target.value)} disabled={isView} style={{ ...inputStyle, width: 80 }}>
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Additional Charges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SectionHeader>Additional Charges</SectionHeader>
            {!isView && (
              <button
                onClick={addChargeRow}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-primary)',
                  background: 'var(--btn-secondary-bg)',
                  border: '1px solid var(--btn-secondary-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--btn-secondary-text)',
                  cursor: 'pointer',
                }}
              >
                + Add Row
              </button>
            )}
          </div>

          {additionalCharges.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {/* Charge table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px 80px 32px', gap: 8, marginBottom: 4 }}>
                <div style={labelStyle}>Code</div>
                <div style={labelStyle}>Description</div>
                <div style={labelStyle}>Amount</div>
                <div style={labelStyle}>Currency</div>
                <div />
              </div>
              {additionalCharges.map((charge, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px 80px 32px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <select
                    value={charge.code}
                    onChange={(e) => updateCharge(idx, 'code', e.target.value)}
                    disabled={isView}
                    style={{ ...inputStyle, padding: '4px 6px' }}
                  >
                    <option value="">--</option>
                    {CHARGE_CODES.map(cc => (
                      <option key={cc.code} value={cc.code}>{cc.code}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={charge.description}
                    disabled
                    style={{ ...inputStyle, padding: '4px 6px', background: 'var(--bg-tertiary)' }}
                  />
                  <input
                    type="number"
                    value={charge.amount}
                    onChange={(e) => updateCharge(idx, 'amount', e.target.value)}
                    disabled={isView}
                    style={{ ...inputStyle, padding: '4px 6px' }}
                    min="0"
                    step="0.01"
                  />
                  <select
                    value={charge.currency}
                    onChange={(e) => updateCharge(idx, 'currency', e.target.value)}
                    disabled={isView}
                    style={{ ...inputStyle, padding: '4px 6px' }}
                  >
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  {!isView ? (
                    <button
                      onClick={() => removeCharge(idx)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-placeholder)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--badge-red-text)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-placeholder)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : <div />}
                </div>
              ))}
            </div>
          )}

          {additionalCharges.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-placeholder)', marginBottom: 16 }}>
              No additional charges.
            </div>
          )}

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* AP Card */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                AP Summary
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                <span>Base Rate</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt2(numBase)}</span>
              </div>
              {additionalCharges.filter(c => c.code).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>{c.code}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt2(c.amount || 0)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                <span>Total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt2(apTotal)}</span>
              </div>
            </div>

            {/* AR Card */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                AR Summary
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                <span>Base Rate</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt2(numBase)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                <span>Markup</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt2(numMarkup)}</span>
              </div>
              {additionalCharges.filter(c => c.code).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>{c.code}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt2(c.amount || 0)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                <span>Total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt2(arTotal)}</span>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-primary)',
                background: 'var(--btn-secondary-bg)',
                border: '1px solid var(--btn-secondary-border)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--btn-secondary-text)',
                cursor: 'pointer',
              }}
            >
              {isView ? 'Close' : 'Cancel'}
            </button>
            {!isView && (
              <button
                onClick={handleSave}
                disabled={!scac || !baseRate}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'var(--font-primary)',
                  background: (!scac || !baseRate) ? 'var(--bg-tertiary)' : 'var(--btn-primary-bg, #2563eb)',
                  border: '1px solid transparent',
                  borderRadius: 'var(--radius-lg)',
                  color: (!scac || !baseRate) ? 'var(--text-placeholder)' : '#fff',
                  cursor: (!scac || !baseRate) ? 'not-allowed' : 'pointer',
                }}
              >
                Save Quote
              </button>
            )}
          </div>
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
        onClick={() => { onAction('EditQuote') }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        Edit Quote
      </button>
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

function RoutingTable({ options, columns, tabColumns, highlightedRank, openMenuRank, onOpenMenu, onCloseMenu, onAction, onToggleColumnPanel, isCollapsed, columnsCollapsed, onCollapse, onExpand }) {
  const [hoveredRank, setHoveredRank] = useState(null)

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

  const getRowBg = (option) => {
    const isHighlighted = highlightedRank === option.rank
    const isHovered = hoveredRank === option.rank
    if (isHighlighted) return STATUS_STYLES[option.status]?.bg ?? 'var(--badge-blue-bg)'
    if (isHovered) return 'var(--bg-secondary)'
    return 'var(--bg-primary)'
  }

  const tableStyle = {
    borderCollapse: 'collapse',
    fontFamily: 'var(--font-primary)',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  }

  return (
    <div style={{ display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: '0 0 var(--radius-md) var(--radius-md)', marginBottom: 24 }}>
      {/* ── LEFT TABLE: locked columns ── */}
      <div style={{ flexShrink: 0 }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {LOCKED_COLUMNS.map((col) => {
                const collapsed = isCollapsed(col.key)

                if (collapsed) {
                  return (
                    <th key={col.key} style={{ ...thStyle, width: COLLAPSED_WIDTH, maxWidth: COLLAPSED_WIDTH, padding: '10px 4px', textAlign: 'center' }} title={col.label}>
                      <span style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>...</span>
                    </th>
                  )
                }

                return (
                  <th key={col.key} style={{ ...thStyle, ...(col.narrow ? { width: 64, whiteSpace: 'normal', lineHeight: 1.3, textAlign: 'center' } : {}) }}>
                    {col.label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {options.map((option) => {
              const isHighlighted = highlightedRank === option.rank
              return (
                <tr
                  key={option.rank}
                  style={{ cursor: 'default', background: getRowBg(option), transition: 'background 0.12s ease' }}
                  onMouseEnter={() => setHoveredRank(option.rank)}
                  onMouseLeave={() => setHoveredRank(null)}
                >
                  {LOCKED_COLUMNS.map((col) => {
                    const collapsed = isCollapsed(col.key)
                    const isPrimary = col.primary

                    if (collapsed) {
                      const rawValue = col.key === 'status' ? option.status : (option[col.dataKey || col.key] ?? '')
                      const display = (!rawValue && rawValue !== 0) ? '--' : String(rawValue).slice(0, 3) + '...'
                      return (
                        <td key={col.key} style={{ ...tdStyle, width: COLLAPSED_WIDTH, maxWidth: COLLAPSED_WIDTH, overflow: 'hidden', padding: '10px 4px', fontSize: 12 }}>
                          {display}
                        </td>
                      )
                    }

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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── CENTER TOGGLE ── */}
      <div
        onClick={() => columnsCollapsed ? onExpand() : onCollapse()}
        title={columnsCollapsed ? 'Expand columns' : 'Collapse columns'}
        style={{
          width: 28,
          minWidth: 28,
          maxWidth: 28,
          flexShrink: 0,
          alignSelf: 'stretch',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-tertiary)',
          borderLeft: '1px solid var(--border-subtle)',
          borderRight: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          color: 'var(--text-placeholder)',
        }}
      >
        {columnsCollapsed ? <UnfoldHorizontal size={14} /> : <FoldHorizontal size={14} />}
      </div>

      {/* ── RIGHT TABLE: tab-specific columns + actions ── */}
      <div style={{ flex: 1, overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {tabColumns.map((col) => (
                <th key={col.key} style={{ ...thStyle, ...(col.narrow ? { width: 64, whiteSpace: 'normal', lineHeight: 1.3, textAlign: 'center' } : {}) }}>
                  {col.label}
                </th>
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
                  style={{ cursor: 'default', background: getRowBg(option), transition: 'background 0.12s ease' }}
                  onMouseEnter={() => setHoveredRank(option.rank)}
                  onMouseLeave={() => setHoveredRank(null)}
                >
                  {tabColumns.map((col) => {
                    const cellStyle = {
                      ...tdStyle,
                      ...(isHighlighted ? { fontWeight: 500 } : {}),
                      ...(col.narrow ? { width: 64, textAlign: 'center' } : {}),
                    }
                    return (
                      <td key={col.key} style={cellStyle}>
                        {getCellValue(option, col)}
                      </td>
                    )
                  })}
                  <td
                    style={{ ...stickyLastCol, padding: '0 var(--spacing-4)', borderBottom: '1px solid var(--bg-tertiary)', textAlign: 'center', width: 72, cursor: 'pointer', background: isHighlighted ? (STATUS_STYLES[option.status]?.bg ?? 'var(--badge-blue-bg)') : (STATUS_STYLES[option.status]?.bg ?? 'var(--bg-primary)') }}
                    onClick={(e) => {
                      e.stopPropagation()
                      const rect = e.currentTarget.getBoundingClientRect()
                      const dropdownHeight = 200
                      const spaceBelow = window.innerHeight - rect.bottom
                      const top = spaceBelow < dropdownHeight
                        ? Math.max(8, rect.top - dropdownHeight)
                        : rect.bottom + 4
                      onOpenMenu(option.rank, { top, left: rect.right })
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
      </div>

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
  const [quoteModal, setQuoteModal] = useState({ isOpen: false, mode: 'add', carrierData: null })
  const [columnsCollapsed, setColumnsCollapsed] = useState(false)
  const tableRef = useRef(null)

  /* Reset all state when data changes (new shipment selected) */
  useEffect(() => {
    setActiveSubTab('routing-options')
    setHighlightedRank(null)
    setOpenMenuRank(null)
    setMenuPos({ top: 0, left: 0 })
    setOptions(data?.options || [])
    setIsDetailModalOpen(false)
    setQuoteModal({ isOpen: false, mode: 'add', carrierData: null })
    setColumnsCollapsed(false)

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

  const isCollapsed = useCallback((key) => {
    if (!COLLAPSIBLE_KEYS.includes(key)) return false
    return columnsCollapsed
  }, [columnsCollapsed])

  const handleCollapse = useCallback(() => {
    setColumnsCollapsed(true)

  }, [])


  const handleExpand = useCallback(() => {
    setColumnsCollapsed(false)

  }, [])

  const handleQuoteSave = useCallback((formData) => {
    if (quoteModal.mode === 'add') {
      setOptions((prev) => {
        const maxRank = prev.reduce((m, o) => Math.max(m, o.rank), 0)
        const newOption = {
          rank: maxRank + 1,
          routeRank: maxRank + 1,
          scac: formData.scac,
          carrierName: formData.carrierName,
          equipment: '--',
          rate: `$${formData.rateDetails.baseRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          cost: `$${formData.rateDetails.apTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
          rateDetails: formData.rateDetails,
          status: null,
          pickupDateTime: formData.pickupDateTime || '--',
          deliveryDateTime: formData.deliveryDateTime || '--',
          transit: '--',
          distance: '--',
          api: '--',
          notifyDateTime: '--',
          responseMethod: '--',
          responseDateTime: '--',
          responseUser: null,
          carrierQuoted: 'Yes',
          networkLeverage: '0%',
          proNumber: null,
          transportingCarrier: formData.carrierName,
          equipNumber: '--',
          routeGroup: 'Spot',
          commitment: 0,
          uom: '--',
          vcEquipNumber: '--',
          vcOpen: 0,
          vcAccept: 0,
          vcDecline: 0,
          carrierApiTenderId: '--',
          breakPoint: 'Direct',
          rateSource: 'Manual',
          distanceSource: '--',
          description: 'Manual quote',
          transitTimeSource: '--',
          transitTimeId: '--',
          loadboardExpiry: '--',
          rcpId: '--',
          lcePkId: '--',
          modifyUser: 'Current User',
          modifyDate: new Date().toLocaleString(),
          indirectPoint: 'N/A',
          roundTrip: 'No',
          customerPreferred: 'No',
          orderEquip: '--',
          contactExped: '--',
          note: '--',
          sl: '--',
          linehaul: 'Pending',
          carrierPickup: '--',
          deliveryNum: '--',
          pickupTZ: 'CST',
          deliveryTZ: 'CST',
          pickupOrgHours: '--',
          pickupOrgDay: '--',
          deliveryOrgHours: '--',
        }
        return [...prev, newOption]
      })
    } else if (quoteModal.mode === 'edit') {
      setOptions((prev) =>
        prev.map((opt) => {
          if (opt.rank !== quoteModal.carrierData.rank) return opt
          return {
            ...opt,
            pickupDateTime: formData.pickupDateTime || opt.pickupDateTime,
            deliveryDateTime: formData.deliveryDateTime || opt.deliveryDateTime,
            cost: `$${formData.rateDetails.apTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
            rateDetails: formData.rateDetails,
          }
        }),
      )
    }
    setQuoteModal({ isOpen: false, mode: 'add', carrierData: null })
  }, [quoteModal])

  const handleAction = useCallback((rank, action) => {
    if (action === 'ShowRateDetails') {
      const carrier = options.find(o => o.rank === rank)
      setQuoteModal({ isOpen: true, mode: 'view', carrierData: carrier || null })
      setOpenMenuRank(null)
      return
    }

    if (action === 'EditQuote') {
      const carrier = options.find(o => o.rank === rank)
      setQuoteModal({ isOpen: true, mode: 'edit', carrierData: carrier || null })
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
  }, [options])

  const activeColumns = [...LOCKED_COLUMNS, ...(TAB_COLUMNS[activeSubTab] || [])]
  const activeTabColumns = TAB_COLUMNS[activeSubTab] || []

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
          onClick={() => setQuoteModal({ isOpen: true, mode: 'add', carrierData: null })}
        >
          Add Quote
        </button>
      </div>

      <div ref={tableRef}>
        <RoutingTable
          options={optionsWithPos}
          columns={activeColumns}
          tabColumns={activeTabColumns}
          highlightedRank={highlightedRank}
          openMenuRank={openMenuRank}
          onOpenMenu={handleOpenMenu}
          onCloseMenu={handleCloseMenu}
          onAction={handleAction}
          onToggleColumnPanel={onToggleColumnPanel}
          isCollapsed={isCollapsed}
          columnsCollapsed={columnsCollapsed}
          onCollapse={handleCollapse}
          onExpand={handleExpand}
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

      {quoteModal.isOpen && (
        <QuoteModal
          mode={quoteModal.mode}
          carrierData={quoteModal.carrierData}
          onSave={handleQuoteSave}
          onClose={() => setQuoteModal({ isOpen: false, mode: 'add', carrierData: null })}
        />
      )}
    </div>
  )
}
