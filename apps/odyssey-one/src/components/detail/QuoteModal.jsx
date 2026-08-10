import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, Plus } from 'lucide-react'
import { Button, ComboBox, FormField, ModalMedium, TimePicker, TitleSubtitle } from '@odyssey/ui'
import MeasureField from '../orders/create/fields/MeasureField.jsx'
import DateField from '../orders/create/fields/DateField.jsx'
import { TIMEZONE_LABELS, EQUIPMENT_CODES, EQUIPMENT_LABELS } from '../../data/master-data'
import { getLookupOptions } from '../../api/services/lookupService'
import { parseDollar, fmtDollar } from '../../utils/money'

// QuoteModal — one modal, three modes (Figma: Add Quote 1175:39228 · Rate
// Details 1408:21725 · Edit Quote 1408:23260). Same anatomy in all three:
// ModalMedium shell → Carrier / Rate / Additional Charges sections → AP + AR
// summary cards → Cancel · Save Quote footer (view has NO footer — read-only).
// `view` renders everything disabled; `edit` locks the carrier identity (SCAC).
//
// Field components follow the create-order canon (S102 audit): dates are the
// normalized DatePicker + time/timezone selects, not a masked free-text field;
// SCAC is the shared paged carrier lookup, not a local 15-row copy.
//
// Extracted out of RoutingGuideTab.jsx (2026-08-10) — ShipmentDetailsModal's
// three edit pens (Base, Markup, Equipment) all open this modal, and its old
// home statically imported it into ShipmentDetailsModal.jsx, which defeated
// BottomBar's React.lazy() split of RoutingGuideTab (~1400 lines, still
// lazy). Its own home module now, small enough to stay in the eager bundle.

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

const CHARGE_CODE_OPTIONS = CHARGE_CODES.map(c => ({ value: c.code, label: c.code }))
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'CAD', label: 'CAD' },
  { value: 'EUR', label: 'EUR' },
]

// Real equipment catalog (master-data.js — SINGLE SOURCE per its own header
// comment). "CODE - Full Name" rows while picking (same idiom
// ShipmentDetailsModal's old inline Equipment combobox used, and SetupCarriers'
// SCAC picker) — the field still displays/commits the bare CODE.
const EQUIPMENT_OPTIONS = EQUIPMENT_CODES.map((code) => ({ value: code, label: `${code} - ${EQUIPMENT_LABELS[code]}` }))

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
  // Equipment — the ONLY place a quote's equipment is edited (2026-08-10):
  // ShipmentDetailsModal's own pens for Base/Markup/Equipment all open this
  // modal instead of any inline control, so it must own the field. Seeds from
  // the routing option's own `equipment` (RoutingOptionVM.equipment).
  const [equipment, setEquipment] = useState(() => carrierData?.equipment || '')
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
      equipment,
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
                <TitleSubtitle subtitle="Equipment" title={equipment || DASH} />
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
                <ComboBox
                  id="quote-equipment"
                  variant="select"
                  typable={false}
                  showLabel
                  label="Equipment"
                  placeholder="Select equipment"
                  options={EQUIPMENT_OPTIONS}
                  value={equipment}
                  onSelect={(v) => setEquipment(v ?? '')}
                />
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
