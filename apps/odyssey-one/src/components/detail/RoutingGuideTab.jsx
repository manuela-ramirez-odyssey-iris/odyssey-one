import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TruckElectric, Columns3Cog, X, Trash2, Plus, FoldHorizontal, UnfoldHorizontal } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { Badge, Button, ComboBox, FormField, ModalMedium, Tab, TimePicker, TitleSubtitle } from '@odyssey/ui'
import MeasureField from '../orders/create/fields/MeasureField.jsx'
import DateField from '../orders/create/fields/DateField.jsx'
import { TIMEZONE_LABELS } from '../../data/master-data'
import { getLookupOptions } from '../../api/services/lookupService'
import { saveTenderOption } from '../../api/services/shipmentService'
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

// Carriers come from the shared lookup (`getLookupOptions('carrier')`) — the
// local 15-row copy that used to live here was a duplicate of master-data's 51.

const DASH = '--' // LINX-13590 — empty optional values read '--'

// Read-only money face: "$803.73 USD", or the dash when unset. Keeps the
// currency visible now that the MeasureField's uom selector is gone in view mode.
const money = (amount, uom) =>
  (amount === '' || amount == null) ? DASH : `${fmtDollar(parseDollar(amount))}${uom ? ` ${uom}` : ''}`

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

// QuoteModal — one modal, three modes (Figma: Add Quote 1175:39228 · Rate
// Details 1408:21725 · Edit Quote 1408:23260). Same anatomy in all three:
// ModalMedium shell → Carrier / Rate / Additional Charges sections → AP + AR
// summary cards → Cancel · Save Quote footer (view has NO footer — read-only).
// `view` renders everything disabled; `edit` locks the carrier identity (SCAC).
//
// Field components follow the create-order canon (S102 audit): dates are the
// normalized DatePicker + time/timezone selects, not a masked free-text field;
// SCAC is the shared paged carrier lookup, not a local 15-row copy.
const CHARGE_CODE_OPTIONS = CHARGE_CODES.map(c => ({ value: c.code, label: c.code }))
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'CAD', label: 'CAD' },
  { value: 'EUR', label: 'EUR' },
]

const CARRIER_PAGE_SIZE = 25
const loadCarriers = async (q, skip = 0) => {
  if (q.trim().length === 1) return { options: [], total: 0 } // 2-char typing gate (LINX-8118)
  const all = await getLookupOptions('carrier', q)
  return { options: all.slice(skip, skip + CARRIER_PAGE_SIZE), total: all.length }
}

// Timezone shown beside the time as its UTC offset only — "(UTC-06:00)". The
// full TIMEZONE_LABELS string starved the TimePicker in a half-width column,
// and the bare initials read too terse (user, S102).
export const tzOffset = (tz) => {
  if (!tz) return ''
  const m = /^\((UTC[^)]*)\)/.exec(TIMEZONE_LABELS[tz] ?? '')
  // Fallback = whatever the data actually carries, verbatim (IANA zones like
  // "America/New_York" miss the short-code map). Parenthesised either way.
  return `(${m ? m[1] : tz})`
}

// Quote timestamps ride as one display string ("01/07/2026 09:00 CST") through
// the routing-option DTO. The form edits the three parts separately.
export function splitDateTime(s) {
  const m = /^(\d{2}\/\d{2}\/\d{4})?\s*(\d{1,2}:\d{2})?\s*([A-Z]{3,4})?/.exec(String(s ?? '').trim())
  if (!m) return { date: '', time: '', tz: 'CST' }
  return { date: m[1] ?? '', time: m[2] ? m[2].padStart(5, '0') : '', tz: m[3] ?? 'CST' }
}
export function joinDateTime({ date, time, tz }) {
  if (!date) return ''
  return [date, time, time ? tz : ''].filter(Boolean).join(' ')
}

function SummaryCard({ title, rows, total }) {
  return (
    <div className="quote-summary">
      <div className="text-label-sm-semibold quote-summary__title">{title}</div>
      <div className="quote-summary__rows">
        {rows.map(([label, value], i) => (
          <div key={`${label}-${i}`} className="quote-summary__row text-label-sm-regular">
            <span>{label}</span>
            <span className="quote-summary__amount">{fmtDollar(value)}</span>
          </div>
        ))}
      </div>
      <div className="quote-summary__total text-label-sm-medium">
        <span>Total</span>
        <span className="quote-summary__amount">{fmtDollar(total)}</span>
      </div>
    </div>
  )
}

/**
 * Date + Time. NO timezone CONTROL — the timezone is SYSTEM-determined from the
 * shipment (user, S102); it renders as static initials beside the time and rides
 * back out through joinDateTime.
 *
 * `readOnly` (Rate Details) collapses the whole thing to ONE blocked field
 * showing the composed "MM/DD/YYYY HH:MM CST" — nothing to edit, so nothing is
 * split into parts.
 *
 * Editable: date takes 1fr; time + the timezone label share the other 1fr, with
 * the TimePicker flexing to fill whatever the initials don't use.
 */
function DateTimePair({ idPrefix, name, value, onChange, disabled, readOnly }) {
  if (readOnly) {
    // Read-only reads as a VALUE, not a dead input (user, S112) — same
    // TitleSubtitle idiom ShipmentDetailsModal uses for General Information.
    return <TitleSubtitle subtitle={name} title={joinDateTime(value) || DASH} />
  }
  return (
    <div className="quote-datetime">
      <div className="quote-datetime__row">
        <DateField
          id={`${idPrefix}-date`}
          label="Date"
          value={value.date}
          onChange={(date) => onChange({ ...value, date })}
          disabled={disabled}
        />
        <TimePicker
          id={`${idPrefix}-time`}
          label="Time"
          /* 24h — LINX-8120 / LINX-7629 data-format contract. Efrain's 12h mocks
             do NOT govern this: source precedence covers design descriptions,
             not data formats (user ruling, 2026-08-06). */
          format="international"
          /* No timezone here — it's SYSTEM-determined, so it qualifies the
             Pickup/Delivery section title instead of the control. */
          value={value.time}
          onChange={(time) => onChange({ ...value, time })}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export function QuoteModal({ mode, carrierData, shipmentTz, onSave, onClose }) {
  const isView = mode === 'view'
  const isEdit = mode === 'edit'

  const [scac, setScac] = useState(() => carrierData?.scac || '')
  const [carrierName, setCarrierName] = useState(() => carrierData?.carrierName || '')
  // Timezone is the shipment's, not the user's: prefer the quote's own stored
  // TZ, else the one every other option on this shipment carries.
  const tzFor = (own, fallback) => {
    const v = own && own !== DASH ? own : fallback
    return v && v !== DASH ? v : 'CST'
  }
  const [pickup, setPickup] = useState(() => ({
    ...splitDateTime(carrierData?.pickupDateTime),
    tz: tzFor(carrierData?.pickupTZ, shipmentTz?.pickup),
  }))
  const [delivery, setDelivery] = useState(() => ({
    ...splitDateTime(carrierData?.deliveryDateTime),
    tz: tzFor(carrierData?.deliveryTZ, shipmentTz?.delivery),
  }))
  const [baseRate, setBaseRate] = useState(() => carrierData?.rateDetails?.baseRate ?? '')
  const [currency, setCurrency] = useState(() => carrierData?.rateDetails?.currency || 'USD')
  const [markup, setMarkup] = useState(() => carrierData?.rateDetails?.markup ?? '')
  const [markupCurrency, setMarkupCurrency] = useState(() => 'USD')
  const [additionalCharges, setAdditionalCharges] = useState(() =>
    carrierData?.rateDetails?.additionalCharges?.map(c => ({ ...c })) || [],
  )

  // The lookup labels read "SCAC - Carrier Name"; the field shows the code only
  // (mock) and the name lands in its own derived field.
  const handleScacSelect = (val, opt) => {
    setScac(val ?? '')
    const label = opt?.label ?? ''
    const dash = label.indexOf(' - ')
    setCarrierName(dash >= 0 ? label.slice(dash + 3) : '')
  }

  const addChargeRow = () => {
    setAdditionalCharges(prev => [...prev, { code: '', description: '', amount: '', currency: 'USD' }])
  }

  const updateCharge = (idx, patch) => {
    setAdditionalCharges(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  const setChargeCode = (idx, code) => {
    const found = CHARGE_CODES.find(cc => cc.code === code)
    updateCharge(idx, { code: code ?? '', description: found ? found.description : '' })
  }

  const removeCharge = (idx) => {
    setAdditionalCharges(prev => prev.filter((_, i) => i !== idx))
  }

  // Derived totals — AP pays base + charges, AR bills that plus the markup.
  const numBase = Number(baseRate) || 0
  const numMarkup = Number(markup) || 0
  const codedCharges = additionalCharges.filter(c => c.code)
  const chargeTotal = additionalCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const apTotal = Math.round((numBase + chargeTotal) * 100) / 100
  const arTotal = Math.round((numBase + numMarkup + chargeTotal) * 100) / 100

  const handleSave = () => {
    onSave({
      scac,
      carrierName,
      pickupDateTime: joinDateTime(pickup),
      deliveryDateTime: joinDateTime(delivery),
      rateDetails: {
        baseRate: numBase,
        currency,
        markup: numMarkup,
        // Fields hold raw text; numbers are produced here, once.
        additionalCharges: codedCharges.map((c) => ({ ...c, amount: Number(c.amount) || 0 })),
        apTotal,
        arTotal,
      },
    })
  }

  const title = mode === 'add' ? 'Add Quote' : isEdit ? 'Edit Quote' : 'Rate Details'
  const chargeRows = codedCharges.map(c => [c.code, Number(c.amount) || 0])

  return createPortal(
    <ModalMedium
      title={title}
      onClose={onClose}
      ariaLabel={title}
      className="quote-modal-shell"
      /* Rate Details is read-only — no footer at all (user, S102). The mock
         carries Cancel/Save there because it reuses the same ModalMedium
         instance; the header X is the only exit. */
      footer={isView ? null : (
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="lg" onClick={handleSave} disabled={!scac || !baseRate}>
            Save Quote
          </Button>
        </>
      )}
    >
      <div className="quote-modal">
        <section>
          <h3 className="text-label-base-semibold quote-modal__section-title">Carrier</h3>
          <div className="quote-modal__grid-2">
            {isView ? (
              <>
                <TitleSubtitle subtitle="SCAC" title={scac || DASH} />
                <TitleSubtitle subtitle="Carrier Name" title={carrierName || DASH} />
              </>
            ) : (
              <>
                <ComboBox
                  id="quote-scac"
                  variant="select"
                  showLabel
                  label="SCAC"
                  placeholder="Select SCAC"
                  loadOptions={loadCarriers}
                  value={scac}
                  onChange={(text) => { if (scac && text !== scac) { setScac(''); setCarrierName('') } }}
                  onSelect={handleScacSelect}
                  emptyMessage={(q) => (q.trim().length === 1 ? 'Type at least 2 characters' : 'No matches')}
                  disabled={isEdit}
                />
                {/* Carrier Name is always derived from the SCAC — never typed. */}
                <FormField label="Carrier Name" value={carrierName} disabled />
              </>
            )}
          </div>
        </section>

        {/* View mode composes each side into one self-describing value, so the
            two sections collapse to one (user, S112). Editing still needs them
            apart — that's the only thing telling Pickup's fields from
            Delivery's, since the controls are just "Date" and "Time". */}
        {isView ? (
          <section>
            <h3 className="text-label-base-semibold quote-modal__section-title">Pickup and Delivery</h3>
            <div className="quote-modal__grid-2">
              <DateTimePair idPrefix="quote-pickup" name="Pickup" value={pickup} readOnly />
              <DateTimePair idPrefix="quote-delivery" name="Delivery" value={delivery} readOnly />
            </div>
          </section>
        ) : (
          <div className="quote-modal__grid-2">
            <section>
              <h3 className="text-label-base-semibold quote-modal__section-title">Pickup</h3>
              <DateTimePair idPrefix="quote-pickup" name="Pickup" value={pickup} onChange={setPickup} />
            </section>
            <section>
              <h3 className="text-label-base-semibold quote-modal__section-title">Delivery</h3>
              <DateTimePair idPrefix="quote-delivery" name="Delivery" value={delivery} onChange={setDelivery} />
            </section>
          </div>
        )}

        <section>
          <h3 className="text-label-base-semibold quote-modal__section-title">Rate</h3>
          <div className="quote-modal__grid-2">
            {isView ? (
              <>
                <TitleSubtitle subtitle="Base Rate" title={money(baseRate, currency)} />
                <TitleSubtitle subtitle="Markup" title={money(markup, markupCurrency)} />
              </>
            ) : (
              <>
                <MeasureField
                  showLabel
                  label="Base Rate"
                  decimals={2}
                  value={{ value: baseRate, uom: currency }}
                  options={CURRENCY_OPTIONS}
                  onChange={(v) => { setBaseRate(v.value); setCurrency(v.uom) }}
                />
                <MeasureField
                  showLabel
                  label="Markup"
                  decimals={2}
                  value={{ value: markup, uom: markupCurrency }}
                  options={CURRENCY_OPTIONS}
                  onChange={(v) => { setMarkup(v.value); setMarkupCurrency(v.uom) }}
                />
              </>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-label-base-semibold quote-modal__section-title">Additional Charges</h3>
          {additionalCharges.length === 0 ? (
            <p className="text-label-sm-regular quote-modal__empty">No additional charges.</p>
          ) : (
            <div className="quote-charges">
              <div className="quote-charges__head text-label-xs-medium-uppercase">
                <span>Code</span>
                <span>Description</span>
                <span>Amount</span>
                {!isView && <span />}
              </div>
              {additionalCharges.map((charge, idx) => (
                <div key={idx} className={`quote-charges__row${isView ? '' : ' quote-charges__row--editable'}`}>
                  {isView ? (
                    <>
                      <span className="text-label-sm-regular">{charge.code || DASH}</span>
                      <span className="text-label-sm-regular">{charge.description || DASH}</span>
                      <span className="text-label-sm-regular">{money(charge.amount, charge.currency)}</span>
                    </>
                  ) : (
                    <>
                      <ComboBox
                        variant="select"
                        typable={false}
                        showLabel={false}
                        placeholder="--"
                        options={CHARGE_CODE_OPTIONS}
                        value={charge.code}
                        onSelect={(v) => setChargeCode(idx, v)}
                      />
                      <FormField showLabel={false} value={charge.description} disabled />
                      <MeasureField
                        decimals={2}
                        value={{ value: charge.amount, uom: charge.currency }}
                        options={CURRENCY_OPTIONS}
                        onChange={(v) => updateCharge(idx, { amount: v.value, currency: v.uom })}
                      />
                    </>
                  )}
                  {/* Plain icon affordance, never a Button (row-action convention).
                      NOTE: the mocks show no delete — flagged for Efrain. */}
                  {!isView && (
                    <button
                      type="button"
                      className="quote-charges__remove"
                      aria-label={`Remove charge ${idx + 1}`}
                      onClick={() => removeCharge(idx)}
                    >
                      <Trash2 size={20} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!isView && (
            <Button variant="link" icon={<Plus size={16} />} onClick={addChargeRow}>
              Add Row
            </Button>
          )}
        </section>

        <div className="quote-modal__grid-2">
          <SummaryCard
            title="AP Summary"
            rows={[['Base Rate', numBase], ...chargeRows]}
            total={apTotal}
          />
          <SummaryCard
            title="AR Summary"
            rows={[['Base Rate', numBase], ['Markup', numMarkup], ...chargeRows]}
            total={arTotal}
          />
        </div>
      </div>
    </ModalMedium>,
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
                      : col.key === 'carrierName' && option.spotRate ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {getCellValue(option, col)}
                          <Badge variant="amber">SPOT RATE</Badge>
                        </span>
                      )
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


  // Quotes are durable: every add / edit / tender-status change writes the option
  // back to the shipment's `tenders` rows, so it survives a reload instead of
  // living only in this component's state (S102). Optimistic — the local update
  // lands immediately and a failed write is logged, not rolled back.
  const persistTender = useCallback((option) => {
    const id = shipment?.sellShipment
    if (!id || !option) return
    saveTenderOption(id, option).catch((e) => console.error('tender save failed', e))
  }, [shipment])

  const handleQuoteSave = useCallback((formData) => {
    if (quoteModal.mode === 'add') {
      {
        const maxRank = options.reduce((m, o) => Math.max(m, o.rank), 0)
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
        setOptions((prev) => [...prev, newOption])
        persistTender(newOption)
      }
    } else if (quoteModal.mode === 'edit') {
      const target = options.find((o) => o.rank === quoteModal.carrierData.rank)
      if (target) {
        const updated = {
          ...target,
          scac: formData.scac || target.scac,
          carrierName: formData.carrierName || target.carrierName,
          pickupDateTime: formData.pickupDateTime || target.pickupDateTime,
          deliveryDateTime: formData.deliveryDateTime || target.deliveryDateTime,
          cost: `$${formData.rateDetails.apTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
          rateDetails: formData.rateDetails,
        }
        setOptions((prev) => prev.map((opt) => (opt.rank === updated.rank ? updated : opt)))
        persistTender(updated)
      }
    }
    setQuoteModal({ isOpen: false, mode: 'add', carrierData: null })
  }, [quoteModal, options, persistTender])

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

    let updated = options.map((opt) =>
      opt.rank === rank ? { ...opt, status: STATUS_AFTER_ACTION[action] || opt.status } : opt,
    )
    const touched = [rank]

    /* CASCADE: on Decline or Cancel, auto-tender next null-status carrier by rank ascending */
    if (action === 'Decline' || action === 'Cancel') {
      const sortedByRank = [...updated].sort((a, b) => a.rank - b.rank)
      const nextNull = sortedByRank.find((opt) => opt.status === null || opt.status === undefined)
      if (nextNull) {
        updated = updated.map((opt) =>
          opt.rank === nextNull.rank ? { ...opt, status: 'Sent' } : opt,
        )
        touched.push(nextNull.rank)
      }
    }

    setOptions(updated)
    // The cascade changes TWO rows — persist both, not just the clicked one.
    touched.forEach((r) => persistTender(updated.find((o) => o.rank === r)))

    setOpenMenuRank(null)
  }, [options, persistTender])

  // Every option on a shipment shares its pickup/delivery timezone — take the
  // first one that actually carries a value as the shipment's TZ, so a NEW quote
  // (no carrierData) still gets the right one.
  const shipmentTz = {
    pickup: options.find((o) => o.pickupTZ && o.pickupTZ !== DASH)?.pickupTZ,
    delivery: options.find((o) => o.deliveryTZ && o.deliveryTZ !== DASH)?.deliveryTZ,
  }

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
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setQuoteModal({ isOpen: true, mode: 'add', carrierData: null })}
            >
              Add Quote
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
          shipmentTz={shipmentTz}
          onSave={handleQuoteSave}
          onClose={() => setQuoteModal({ isOpen: false, mode: 'add', carrierData: null })}
        />
      )}
    </div>
  )
}
