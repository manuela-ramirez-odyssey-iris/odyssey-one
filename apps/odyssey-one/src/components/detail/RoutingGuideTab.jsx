import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TruckElectric, Columns3Cog, X, Trash2, FoldHorizontal, UnfoldHorizontal } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Button, Tab } from '@odyssey/ui'
import { parseDollar, fmtDollar } from '../../utils/money'

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
  height: 48,
  verticalAlign: 'middle',
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

export function Field({ label, value }) {
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

export function SectionHeader({ children }) {
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
          position: 'sticky',
          top: 0,
          background: 'var(--bg-primary)',
          zIndex: 1,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
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
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDollar(numBase)}</span>
              </div>
              {additionalCharges.filter(c => c.code).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>{c.code}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDollar(c.amount || 0)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                <span>Total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDollar(apTotal)}</span>
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
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDollar(numBase)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                <span>Markup</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDollar(numMarkup)}</span>
              </div>
              {additionalCharges.filter(c => c.code).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>{c.code}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDollar(c.amount || 0)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                <span>Total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDollar(arTotal)}</span>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
            <Button variant="secondary" onClick={onClose}>
              {isView ? 'Close' : 'Cancel'}
            </Button>
            {!isView && (
              <Button variant="primary" onClick={handleSave} disabled={!scac || !baseRate}>
                Save Quote
              </Button>
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
   Section 5b — CostTooltip (AP cost hover in routing table)
   ═══════════════════════════════════════════════════════════ */

function CostTooltip({ carrier, onViewDetails }) {
  const [show, setShow] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)

  const handleEnter = () => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 })
    setShow(true)
    setHovered(true)
  }

  const apTotal = carrier.cost || carrier.apFreightCost || '--'
  const arTotal = carrier.arCost || carrier.arFreightCost || '--'
  const apNum = parseDollar(apTotal)
  const arNum = parseDollar(arTotal)
  const margin = (apNum != null && arNum != null) ? arNum - apNum : null
  const marginPct = (margin != null && apNum > 0) ? ((margin / apNum) * 100).toFixed(1) : null

  return (
    <span
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => { setShow(false); setHovered(false) }}
      onClick={(e) => { e.stopPropagation(); onViewDetails() }}
      style={{ cursor: 'pointer', color: hovered ? 'var(--carolina-blue-400)' : 'inherit', transition: 'color var(--transition-fast)' }}
    >
      {apTotal}
      {show && createPortal(
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            background: 'var(--deep-sea-neutral-900, #1B2537)',
            color: 'var(--deep-sea-neutral-300, #D0D4DB)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 13,
            lineHeight: 1.6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            zIndex: 99999,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <div>AP Total: <strong>{apTotal}</strong></div>
          <div>AR Total: <strong>{arTotal}</strong></div>
          {margin != null && (
            <div style={{ color: margin >= 0 ? '#34d399' : '#f87171' }}>
              Margin: ${Math.abs(margin).toLocaleString('en-US', { minimumFractionDigits: 2 })} ({marginPct}%)
            </div>
          )}
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', color: 'var(--carolina-blue-400)', fontSize: 12 }}>
            Click to view details
          </div>
        </div>,
        document.body
      )}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════
   Section 6 — RoutingTable
   ═══════════════════════════════════════════════════════════ */

function RoutingTable({ options, tabColumns, highlightedRank, openMenuRank, onOpenMenu, onCloseMenu, onAction, onToggleColumnPanel, isCollapsed, columnsCollapsed, collapsedWidths, onCollapse, onExpand, onViewRateDetails }) {
  const [hoveredRank, setHoveredRank] = useState(null)
  const [showToggle, setShowToggle] = useState(false)
  const rightTableRef = useRef(null)

  useEffect(() => {
    const el = rightTableRef.current
    if (!el) return
    const check = () => {
      const hiddenRatio = el.scrollWidth > 0 ? 1 - (el.clientWidth / el.scrollWidth) : 0
      setShowToggle(hiddenRatio >= 0.4)
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [tabColumns])

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
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'var(--font-primary)',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  }

  return (
    <div data-routing-container style={{ display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 24, overflow: 'hidden' }}>
      {/* ── LEFT TABLE + TOGGLE: fixed container with shadow ── */}
      <div style={{ flexShrink: 0, display: 'flex', boxShadow: '2px 0 4px rgba(0,0,0,0.06)', zIndex: 3 }}>
      <div data-left-table style={{ flexShrink: 0 }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {LOCKED_COLUMNS.map((col) => {
                const collapsed = isCollapsed(col.key)
                const hasWidth = collapsedWidths && COLLAPSIBLE_KEYS.includes(col.key)
                const w = hasWidth ? collapsedWidths[col.key] : null
                const wrapWhenCollapsed = columnsCollapsed && !col.narrow ? { whiteSpace: 'normal', lineHeight: 1.3 } : {}
                const statusNarrow = columnsCollapsed && col.key === 'status' ? { width: 78, maxWidth: 78 } : {}
                return (
                  <th key={col.key} style={{
                    ...thStyle,
                    ...(col.narrow ? { width: 64, whiteSpace: 'normal', lineHeight: 1.3, textAlign: 'center' } : {}),
                    ...wrapWhenCollapsed,
                    ...statusNarrow,
                    ...(hasWidth ? { width: w, maxWidth: w, overflow: 'hidden' } : {}),
                    ...(collapsed ? { padding: '10px 4px' } : {}),
                    transition: 'width var(--transition-base), max-width var(--transition-base), padding var(--transition-base)',
                  }} title={col.label}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap', ...(collapsed ? { fontSize: 11, color: 'var(--text-placeholder)' } : {}) }}>
                      {col.label}
                    </span>
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
                    const hasWidth = collapsedWidths && COLLAPSIBLE_KEYS.includes(col.key)
                    const w = hasWidth ? collapsedWidths[col.key] : null

                    const cellStyle = {
                      ...tdStyle,
                      ...(isHighlighted ? { fontWeight: 500 } : {}),
                      ...(isPrimary ? { fontWeight: 500, color: 'var(--text-primary)' } : {}),
                      ...(col.narrow ? { width: 64, textAlign: 'center' } : {}),
                      ...(columnsCollapsed && col.key === 'status' ? { width: 78, maxWidth: 78 } : {}),
                      ...(hasWidth ? { width: w, maxWidth: w, overflow: 'hidden', textOverflow: 'ellipsis' } : {}),
                      ...(collapsed ? { padding: '10px 4px', fontSize: 12 } : {}),
                      transition: 'width var(--transition-base), max-width var(--transition-base), padding var(--transition-base)',
                    }

                    const content = col.key === 'status' ? <StatusBadge status={option.status} />
                      : col.key === 'cost' ? <CostTooltip carrier={option} onViewDetails={() => onViewRateDetails(option)} />
                      : getCellValue(option, col)

                    return (
                      <td key={col.key} style={cellStyle}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
                          {content}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── CENTER TOGGLE (only shows when right table is >40% hidden) ── */}
      {(showToggle || columnsCollapsed) && (
        <div
          onClick={() => columnsCollapsed ? onExpand() : onCollapse()}
          title={columnsCollapsed ? 'Expand columns' : 'Collapse columns'}
          style={{
            width: 20,
            minWidth: 20,
            maxWidth: 20,
            flexShrink: 0,
            alignSelf: 'stretch',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-secondary)',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
        >
          {columnsCollapsed ? <UnfoldHorizontal size={14} /> : <FoldHorizontal size={14} />}
        </div>
      )}
      </div>

      {/* ── RIGHT TABLE: tab-specific columns + actions ── */}
      <div ref={rightTableRef} data-right-table style={{ flex: 1, overflowX: 'auto', minWidth: 100 }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {tabColumns.map((col) => (
                <th key={col.key} style={{ ...thStyle, ...(col.narrow ? { width: 64, whiteSpace: 'normal', lineHeight: 1.3, textAlign: 'center' } : {}) }}>
                  {col.label}
                </th>
              ))}
              <th className="sticky top-0" style={{ ...stickyLastCol, zIndex: 5, width: 50, minWidth: 50, maxWidth: 50, padding: '0 var(--spacing-4)', textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
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
                    style={{ ...stickyLastCol, padding: '0 var(--spacing-4)', borderBottom: '1px solid var(--bg-tertiary)', textAlign: 'center', width: 50, minWidth: 50, maxWidth: 50, cursor: 'pointer', background: isHighlighted ? (STATUS_STYLES[option.status]?.bg ?? 'var(--badge-blue-bg)') : (STATUS_STYLES[option.status]?.bg ?? 'var(--bg-primary)') }}
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
                      <TruckElectric {...ICON_MD} style={{ color: option.status && STATUS_STYLES[option.status] ? STATUS_STYLES[option.status].color : 'var(--text-placeholder)' }} />
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
  const [quoteModal, setQuoteModal] = useState({ isOpen: false, mode: 'add', carrierData: null })
  const [collapsedWidths, setCollapsedWidths] = useState(null)
  const [expandedWidths, setExpandedWidths] = useState(null)
  const tableRef = useRef(null)

  /* Reset all state when data changes (new shipment selected) */
  useEffect(() => {
    setActiveSubTab('routing-options')
    setHighlightedRank(null)
    setOpenMenuRank(null)
    setMenuPos({ top: 0, left: 0 })
    setOptions(data?.options || [])
    setQuoteModal({ isOpen: false, mode: 'add', carrierData: null })

    setCollapsedWidths(null)

  }, [data])

  /* Note: collapse useEffect is placed after handleCollapse/handleExpand definitions below */

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
    if (!collapsedWidths || !COLLAPSIBLE_KEYS.includes(key)) return false
    // Not visually collapsed if width matches expanded width (transitioning back)
    if (expandedWidths && collapsedWidths[key] >= expandedWidths[key]) return false
    return true
  }, [collapsedWidths, expandedWidths])

  const handleCollapse = useCallback(() => {
    const container = document.querySelector('[data-routing-container]')
    const leftTable = document.querySelector('[data-left-table] table')
    const rightEl = document.querySelector('[data-right-table]')
    const rightTable = rightEl?.querySelector('table')
    if (!container || !leftTable || !rightEl || !rightTable) return

    const containerWidth = container.clientWidth

    const rightContentWidth = rightTable.scrollWidth
    const targetLeftWidth = Math.max(200, containerWidth - rightContentWidth)

    const leftCurrentWidth = leftTable.getBoundingClientRect().width
    if (targetLeftWidth >= leftCurrentWidth) return

    const headerCells = [...leftTable.querySelectorAll('thead th')]
    const neverCollapseWidth = NEVER_COLLAPSE_KEYS.reduce((sum, key) => {
      const idx = LOCKED_COLUMNS.findIndex(c => c.key === key)
      return sum + (headerCells[idx]?.getBoundingClientRect().width || 0)
    }, 0)

    const collapsibleCurrentWidths = {}
    let totalCollapsibleWidth = 0
    COLLAPSIBLE_KEYS.forEach(key => {
      const idx = LOCKED_COLUMNS.findIndex(c => c.key === key)
      const w = headerCells[idx]?.getBoundingClientRect().width || 80
      collapsibleCurrentWidths[key] = w
      totalCollapsibleWidth += w
    })

    // Save expanded widths for smooth expand animation later
    setExpandedWidths({ ...collapsibleCurrentWidths })

    const targetCollapsibleWidth = targetLeftWidth - neverCollapseWidth
    const scaleFactor = Math.max(0.2, targetCollapsibleWidth / totalCollapsibleWidth)
    const MIN_COL_WIDTH = 40

    const newWidths = {}
    COLLAPSIBLE_KEYS.forEach(key => {
      newWidths[key] = Math.max(MIN_COL_WIDTH, Math.round(collapsibleCurrentWidths[key] * scaleFactor))
    })

    setCollapsedWidths(newWidths)
  }, [])

  const handleExpand = useCallback(() => {
    if (expandedWidths) {
      // Transition to saved full widths, then clear
      setCollapsedWidths(expandedWidths)
      setTimeout(() => setCollapsedWidths(null), 250)
    } else {
      setCollapsedWidths(null)
    }
  }, [expandedWidths])

  /* Re-collapse when switching sub-tabs (columns change per tab) */
  useEffect(() => {
    setCollapsedWidths(null)
    const timer = setTimeout(() => handleCollapse(), 100)
    return () => clearTimeout(timer)
  }, [activeSubTab, handleCollapse])


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

  const activeTabColumns = TAB_COLUMNS[activeSubTab] || []

  /* Attach _menuPos to the option that has its menu open */
  const optionsWithPos = options.map((opt) =>
    opt.rank === openMenuRank ? { ...opt, _menuPos: menuPos } : opt,
  )

  return (
    <div className="pane-canvas tender-pane">
      {/* Row 1: full-width tabs band (official ShipmentsBar tab-content styling)
          — underline sub-tabs left, actions right, content aligned to the wide column */}
      <div className="pane-tabs-band">
        <div className="pane-band-inner pane-band-inner--wide tender-pane__tab-row">
          <div className="tab-group">
            {SUB_TABS.map((tab) => (
              <Tab
                key={tab.key}
                label={tab.label}
                current={activeSubTab === tab.key}
                onClick={() => setActiveSubTab(tab.key)}
              />
            ))}
          </div>
          <div className="tender-pane__tab-actions">
            <Button variant="primary" onClick={() => setQuoteModal({ isOpen: true, mode: 'add', carrierData: null })}>
              + Add Quote
            </Button>
          </div>
        </div>
      </div>

      <div className="pane-col pane-col--wide tender-pane__col">
        {/* Row 2: table in a wide bordered container directly on canvas */}
        <div className="tender-pane__table-card">
          <div ref={tableRef}>
            <RoutingTable
          options={optionsWithPos}
          tabColumns={activeTabColumns}
          highlightedRank={highlightedRank}
          openMenuRank={openMenuRank}
          onOpenMenu={handleOpenMenu}
          onCloseMenu={handleCloseMenu}
          onAction={handleAction}
          onToggleColumnPanel={onToggleColumnPanel}
          isCollapsed={isCollapsed}
          columnsCollapsed={collapsedWidths !== null}
          collapsedWidths={collapsedWidths}
          onCollapse={handleCollapse}
          onExpand={handleExpand}
          onViewRateDetails={(carrier) => setQuoteModal({ isOpen: true, mode: 'view', carrierData: carrier })}
        />
          </div>
        </div>{/* /tender-pane__table-card */}
      </div>{/* /pane-col */}

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
