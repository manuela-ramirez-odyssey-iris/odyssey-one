import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, Plus } from 'lucide-react'
import { Button, ComboBox, FormField, ModalMedium, TitleSubtitle } from '@odyssey/ui'
import MeasureField from '../orders/create/fields/MeasureField.jsx'
import { TIMEZONE_LABELS, CURRENCIES } from '../../data/master-data'
import { getLookupOptions } from '../../api/services/lookupService'
import { parseDollar, fmtDollar } from '../../utils/money'

// QuoteModal — one modal, three modes (Figma: Add Quote 1175:39228 · Rate
// Details 1408:21725 · Edit Quote 1408:23260). Same anatomy in all three:
// LINX-13895 structure, two sections in this order:
//   1. "Carrier Option" — READ-ONLY in all three modes (SCAC, Carrier Name,
//      Equipment, Pickup, Delivery), sourced from the selected routing option.
//   2. "Quote" — the editable fields (Base Rate + Currency, Markup) followed by
//      Additional Charges.
// Then the AP/AR summary cards (LINX-13896) and read-only Audit Information
// (LINX-13895). Footer is Cancel · Save Quote; `view` has NO footer.
//
// Corrects an earlier note here claiming this modal had to own the Equipment
// control as "the ONLY place a quote's equipment is edited". It does not:
// ShipmentDetailsModal's General Information section edits Equipment itself
// (EDITABLE_GENERAL, with its own saveTenderOption call), and DEC-82 removed
// the three per-field pens that note was describing.
//
// Extracted out of RoutingGuideTab.jsx (2026-08-10) because its old home
// statically imported it into ShipmentDetailsModal.jsx, which defeated
// BottomBar's React.lazy() split of RoutingGuideTab (~1400 lines, still
// lazy). Its own home module now, small enough to stay in the eager bundle.

const DASH = '--' // LINX-13590 — empty optional values read '--'

// Read-only money face: "$803.73 USD", or the dash when unset. Keeps the
// currency visible now that the MeasureField's uom selector is gone in view mode.
const money = (amount, uom) =>
  (amount === '' || amount == null) ? DASH : `${fmtDollar(parseDollar(amount))}${uom ? ` ${uom}` : ''}`

// Currency (Base Rate) now sources from the shared CURRENCIES master-data pool
// (LINX-13895, ticket refs LINX-3966 "TMS Master Data Currency") — same direct-
// import idiom GeneralInformationSection uses for its own plain selects
// (FREIGHT_TERMS/SHIP_DIRECTIONS), rather than a hardcoded 3-entry list that
// was missing MXN. Also registered as lookupService's 'currency' type so every
// master-data pool the app selects from is uniformly reachable through the
// registry; a plain select just doesn't need the async round-trip a real
// typeahead does.
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }))

// Charge Code (Additional Charges) moved to the shared lookup registry's
// 'charge-code' type (LINX-13895, refs LINX-3966 "Search by Code or
// Description") — was a label-only 5-entry array a `typable={false}` ComboBox
// could only ever pick, never search by description.

// The equipment catalog and the paged carrier (SCAC) lookup both lived here
// until 2026-08-16. LINX-13895 makes the whole Carrier Option section
// read-only, so nothing in this modal picks a carrier or an equipment code any
// more — both are shown as values off the selected routing option. Equipment
// is still EDITED, just not here: ShipmentDetailsModal's General Information
// section owns that control and its own save.

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

// Day-of-week for an "MM/DD/YYYY" string, as the ticket's "Tue" / "Wed".
// DERIVED from the date rather than read from a stored day field: the VM
// carries `pickupOrgDay` but has NO `deliveryOrgDay`, so only one side could
// have used a stored value — and a stored day can silently disagree with its
// own date, which a derived one cannot. Parsed part-wise, not via
// `new Date(string)`, whose "MM/DD/YYYY" handling is implementation-defined.
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export function dayOfWeek(mdY) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(mdY ?? '').trim())
  if (!m) return ''
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]))
  // Guard a rolled-over invalid date (e.g. 02/31) rather than naming a day
  // that isn't the one written down.
  if (d.getMonth() !== Number(m[1]) - 1 || d.getDate() !== Number(m[2])) return ''
  return DAY_NAMES[d.getDay()]
}

/**
 * LINX-13895 — the Carrier Option section's Pickup/Delivery value, composed as
 * the ticket's own example: "01/07/2026 09:00 CST, Tue, (07:00-15:30)" —
 * date, time (if available), time zone, day, org hours.
 *
 * Every part is optional and simply omitted when missing, so a partial record
 * degrades to "01/07/2026, Tue" rather than "01/07/2026 , , ()". An entirely
 * empty one reads as the DASH, per "if any data is blank or unavailable,
 * display '--'".
 */
export function composeCarrierDateTime(value) {
  if (!value) return DASH
  const day = dayOfWeek(value.date)
  const hours = value.orgHours && value.orgHours !== DASH ? `(${value.orgHours})` : ''
  return [joinDateTime(value), day, hours].filter(Boolean).join(', ') || DASH
}

/** Read-only Pickup/Delivery value. Reads as a VALUE, not a dead input (user,
 *  S112) — the TitleSubtitle idiom ShipmentDetailsModal uses for General
 *  Information. There is no editable variant: LINX-13895 makes the whole
 *  Carrier Option section read-only in every mode. */
function CarrierDateTime({ name, value }) {
  return <TitleSubtitle subtitle={name} title={composeCarrierDateTime(value)} />
}

/** The quote form's footer buttons, for hosts that own the dialog shell. */
export function QuoteModalFooter({ onCancel, onSave, disabled }) {
  return (
    <>
      <Button variant="secondary" size="lg" onClick={onCancel}>Cancel</Button>
      <Button variant="primary" size="lg" onClick={onSave} disabled={disabled}>Save Quote</Button>
    </>
  )
}

export const QuoteModal = forwardRef(function QuoteModal(
  { mode, carrierData, shipmentTz, onSave, onClose, embedded = false, onValidityChange },
  ref,
) {
  const isView = mode === 'view'
  const isEdit = mode === 'edit'

  // LINX-13895 — the Carrier Option section is READ-ONLY in every mode
  // ("Carrier Option information shall be read-only"), sourced from the
  // selected Routing Option. So none of these five are state: there is nothing
  // to edit and nothing to sync back. They ride straight off the prop.
  //
  // This corrects a 2026-08-10 note claiming this modal had to own Equipment
  // because it was the only editor. It isn't: ShipmentDetailsModal's General
  // Information section edits Equipment itself (EDITABLE_GENERAL, with its own
  // saveTenderOption call), and DEC-82 removed the per-field pens that note
  // referred to.
  const scac = carrierData?.scac || ''
  const carrierName = carrierData?.carrierName || ''
  const equipment = carrierData?.equipment || ''
  // Timezone is the shipment's, not the user's: prefer the quote's own stored
  // TZ, else the one every other option on this shipment carries.
  const tzFor = (own, fallback) => {
    const v = own && own !== DASH ? own : fallback
    return v && v !== DASH ? v : 'CST'
  }
  const pickup = {
    ...splitDateTime(carrierData?.pickupDateTime),
    tz: tzFor(carrierData?.pickupTZ, shipmentTz?.pickup),
    orgHours: carrierData?.pickupOrgHours,
  }
  const delivery = {
    ...splitDateTime(carrierData?.deliveryDateTime),
    tz: tzFor(carrierData?.deliveryTZ, shipmentTz?.delivery),
    orgHours: carrierData?.deliveryOrgHours,
  }
  const [baseRate, setBaseRate] = useState(() => carrierData?.rateDetails?.baseRate ?? '')
  // LINX-3966 (General Rule 5) / LINX-13895 ("Currency Selection is
  // mandatory"): a NEW quote must start with no currency chosen, forcing a
  // deliberate pick — defaulting to 'USD' made the ticket's own "Please
  // select a currency" error permanently unreachable, since it can only fire
  // when currency is falsy. Verified this isn't only a `|| 'USD'` bug here:
  // mapRoutingOption (mapSellShipmentOutToDetail.ts:331) defaults an absent
  // `rateDetails` to `{ ..., currency: 'USD', ... }`, AND generate.mjs writes
  // `currency: 'USD'` into every seeded routing option's rateDetails
  // regardless of quoteFlag (tools/generate.mjs:774) — so
  // `carrierData.rateDetails.currency` reads 'USD' even for an option that
  // has never been quoted.
  //
  // Discriminator is `mode`, not `quoteFlag === 'Y'`: `view` (Rate Details)
  // must keep showing an option's real currency even when it was never
  // quoted (quoteFlag !== 'Y') — ShowRateDetails isn't gated by hasQuote
  // (RoutingGuideTab.jsx:330/1080), only the Edit-vs-Add row-menu label is
  // (RoutingGuideTab.jsx:1094). A quoteFlag check would wrongly blank that
  // view. `mode === 'edit'` and `quoteFlag === 'Y'` never disagree where it'd
  // matter — the row menu only offers Edit Quote when quoteFlag === 'Y' — so
  // this only changes behavior for `add`.
  const [currency, setCurrency] = useState(() =>
    mode === 'add' ? '' : (carrierData?.rateDetails?.currency || ''),
  )
  const [markup, setMarkup] = useState(() => carrierData?.rateDetails?.markup ?? '')
  const [additionalCharges, setAdditionalCharges] = useState(() =>
    carrierData?.rateDetails?.additionalCharges?.map(c => ({ ...c })) || [],
  )
  // Audit Information (LINX-13895) is read-only in every mode and never
  // edited here, so it rides straight off the prop — no local state to seed
  // or sync back.
  const audit = carrierData?.quoteAudit

  // Field-level validation (LINX-13895 table). `touched` gates when a
  // still-empty/invalid field first shows red — same on-blur idiom as
  // create-order's react-hook-form fields (mode: onTouched), reimplemented
  // here without the dependency since this form is plain useState. A Save
  // attempt (`submitted`) reveals everything at once, the same way a form
  // library surfaces every field on submit.
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const touch = (key) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }))
  const showError = (key, msg) => (touched[key] || submitted) ? msg : null

  const isBlank = (v) => v === '' || v == null
  const decimalPlaces = (v) => {
    const s = String(v)
    const i = s.indexOf('.')
    return i === -1 ? 0 : s.length - i - 1
  }
  // Shared shape for Base Rate / Markup / each Charge Amount: numeric-or-blank,
  // then the two amount-specific rules from the ticket's table.
  const amountError = (raw) => {
    if (isBlank(raw)) return null // required-ness is each caller's own rule
    if (!Number.isFinite(Number(raw))) return 'Please enter a valid numeric amount.'
    if (decimalPlaces(raw) > 6) return 'Amount supports up to 6 decimal places.'
    return null
  }
  // Base Rate is mandatory; Currency Selection is mandatory (ticket's field
  // table) — both ride the one error slot MeasureField exposes for the
  // combined value+currency control.
  const baseRateError = isBlank(baseRate)
    ? 'Base Rate is required.'
    : amountError(baseRate) || (!currency ? 'Please select a currency.' : null)
  const markupError = amountError(markup) // Markup is optional — no required check
  const chargeErrors = additionalCharges.map((c) => ({
    code: !c.code ? 'Charge Code is required.' : null,
    amount: isBlank(c.amount) ? 'Amount is required.' : amountError(c.amount),
  }))
  const hasErrors = !!baseRateError || !!markupError || chargeErrors.some((e) => e.code || e.amount)

  const addChargeRow = () => {
    setAdditionalCharges(prev => [...prev, { code: '', description: '', amount: '', currency: 'USD' }])
  }

  const updateCharge = (idx, patch) => {
    setAdditionalCharges(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  // Charge Description is "Auto-populated / Derived from Charge Code"
  // (LINX-13895) — the lookup's own `description` field on the selected
  // option, not a re-lookup against a local array.
  const setChargeCode = (idx, code, description) => {
    updateCharge(idx, { code: code ?? '', description: code ? (description ?? '') : '' })
  }

  const removeCharge = (idx) => {
    setAdditionalCharges(prev => prev.filter((_, i) => i !== idx))
  }

  // Derived totals — AP pays base + charges, AR bills that plus the markup.
  const numBase = Number(baseRate) || 0
  const numMarkup = Number(markup) || 0
  const codedCharges = additionalCharges.filter(c => c.code)
  const chargeTotal = additionalCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  // Rounded to 6dp, not 2 (LINX-13895 — amounts input up to 6 decimal places).
  // Snapping to cents here silently dropped any sub-cent precision the ticket
  // explicitly allows on input, before it ever reached onSave's payload;
  // display everywhere still reads 2dp because fmtDollar rounds at render
  // time regardless of how many decimals the stored total carries.
  const apTotal = Math.round((numBase + chargeTotal) * 1e6) / 1e6
  const arTotal = Math.round((numBase + numMarkup + chargeTotal) * 1e6) / 1e6

  const handleSave = () => {
    setSubmitted(true) // reveal every remaining error at once, form-submit idiom
    if (hasErrors || !scac) return
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
        // Fields hold raw text; numbers are produced here, once. Currency is
        // forced to the shared `currency` here too — LINX-13895: "All quote
        // information shall use a single currency," so the persisted charge
        // rows can never carry a stale/divergent currency even if the seed
        // data did.
        additionalCharges: codedCharges.map((c) => ({ ...c, amount: Number(c.amount) || 0, currency })),
        apTotal,
        arTotal,
      },
    })
  }

  const title = mode === 'add' ? 'Add Quote' : isEdit ? 'Edit Quote' : 'Rate Details'
  const chargeRows = codedCharges.map(c => [c.code, Number(c.amount) || 0])
  const disabled = !scac || hasErrors

  // Embedded hosts (ShipmentDetailsModal's Edit Quote view) own the footer
  // themselves via QuoteModalFooter, so they need `save` + the live validity
  // state without lifting every field. A ref exposes the imperative action
  // (mirrors a form-library submit ref); `onValidityChange` mirrors it back
  // out for the host's Save button `disabled` prop — one render behind a
  // keystroke, same as any other derived-in-an-effect value, and imperceptible
  // for a button's disabled attribute.
  useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave])
  useEffect(() => { onValidityChange?.(disabled) }, [disabled, onValidityChange])

  const body = (
      <div className="quote-modal">
        {/* LINX-13895 — "Carrier Option", READ-ONLY, identical in all three
            modes. The five fields and their order are the ticket's own table:
            SCAC, Carrier Name, Equipment, Pickup, Delivery, each "of the
            selected routing option". Previously add/edit rendered SCAC and
            Equipment as comboboxes and the dates as editable pickers, which
            contradicted the section's stated contract. */}
        <section>
          <h3 className="text-label-base-semibold quote-modal__section-title">Carrier Option</h3>
          <div className="quote-modal__grid-2">
            <TitleSubtitle subtitle="SCAC" title={scac || DASH} />
            <TitleSubtitle subtitle="Carrier Name" title={carrierName || DASH} />
            <TitleSubtitle subtitle="Equipment" title={equipment || DASH} />
            <CarrierDateTime name="Pickup" value={pickup} />
            <CarrierDateTime name="Delivery" value={delivery} />
          </div>
        </section>

        <section>
          {/* "Quote" — the ticket's own section name for the editable fields,
              paired against the read-only "Carrier Option" above it. */}
          <h3 className="text-label-base-semibold quote-modal__section-title">Quote</h3>
          <div className="quote-modal__grid-2">
            {isView ? (
              <>
                <TitleSubtitle subtitle="Base Rate" title={money(baseRate, currency)} />
                <TitleSubtitle subtitle="Markup" title={money(markup, currency)} />
              </>
            ) : (
              <>
                <MeasureField
                  showLabel
                  label="Base Rate"
                  // Numeric, up to 6 decimal places (LINX-13895).
                  decimals={6}
                  value={{ value: baseRate, uom: currency }}
                  options={CURRENCY_OPTIONS}
                  onChange={(v) => { setBaseRate(v.value); setCurrency(v.uom) }}
                  onBlur={() => touch('baseRate')}
                  error={showError('baseRate', baseRateError)}
                />
                <MeasureField
                  showLabel
                  label="Markup"
                  // Numeric, up to 6 decimal places (LINX-13895).
                  decimals={6}
                  // UoM here IS the quote's shared `currency` (2026-08-10 ruling:
                  // arTotal sums base + markup as a single currency, so an
                  // independent markup currency was arithmetically incoherent).
                  // LINX-13895 completes that ruling: "Currency shall only be
                  // selected on Base Rate" / "Users shall not modify currency
                  // on: Markup Amount." A single-entry `options` array is this
                  // codebase's existing idiom for a MeasureField whose unit is
                  // fixed rather than pickable — CarrierBid.jsx's Linehaul/Base
                  // field locks USD the same way — so selecting the one option
                  // is always a no-op; MeasureField/FieldSelect expose no
                  // separate "trailing select disabled, input still editable"
                  // affordance, and forking either was out of scope. Empty
                  // options (not a `{ value: '', label: '' }` entry) while
                  // currency is still unselected — MeasureField's own
                  // `uomLabel` lookup falls back to 'UOM' when nothing
                  // matches, so an unselected shared currency reads as the
                  // same placeholder Base Rate shows, not a blank pill.
                  value={{ value: markup, uom: currency }}
                  options={currency ? [{ value: currency, label: currency }] : []}
                  onChange={(v) => setMarkup(v.value)}
                  onBlur={() => touch('markup')}
                  error={showError('markup', markupError)}
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
                      {/* Currency shown, never charge.currency — every quote
                          component reads the one shared currency (LINX-13895). */}
                      <span className="text-label-sm-regular">{money(charge.amount, currency)}</span>
                    </>
                  ) : (
                    <>
                      <ComboBox
                        variant="select"
                        showLabel={false}
                        placeholder="--"
                        // Searchable, not pick-only (LINX-13895/3966: "Search by
                        // Code or Description") — loadOptions routes through the
                        // shared registry, whose matcher already checks
                        // value/label/description, so typing "Fuel" finds FSC.
                        loadOptions={(q) => getLookupOptions('charge-code', q)}
                        emptyMessage={(q) => (q.trim().length === 1 ? 'Type at least 2 characters' : 'No matching charge codes')}
                        value={charge.code}
                        onSelect={(v, opt) => setChargeCode(idx, v, opt?.description)}
                        onBlur={() => touch(`charge-${idx}-code`)}
                        error={showError(`charge-${idx}-code`, chargeErrors[idx].code)}
                      />
                      <FormField showLabel={false} value={charge.description} disabled />
                      <MeasureField
                        // Numeric, up to 6 decimal places (LINX-13895).
                        decimals={6}
                        value={{ value: charge.amount, uom: currency }}
                        // Fixed unit, not a picker — same single-entry-options
                        // idiom as Markup above: Additional Charges > Currency
                        // is "Auto-populated — Derived from Base Rate Currency"
                        // per the ticket, so only Base Rate's own MeasureField
                        // keeps the real CURRENCY_OPTIONS list. Empty options
                        // (not a blank-value entry) while currency is still
                        // unselected — same 'UOM' fallback as Markup above.
                        options={currency ? [{ value: currency, label: currency }] : []}
                        onChange={(v) => updateCharge(idx, { amount: v.value })}
                        onBlur={() => touch(`charge-${idx}-amount`)}
                        error={showError(`charge-${idx}-amount`, chargeErrors[idx].amount)}
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

        {/* Audit Information (LINX-13895) — read-only in all three modes,
            never edited here. Always rendered, every field individually
            DASHed, rather than omitted on a never-quoted option: every other
            read-only section in this file (Pickup and Delivery, Carrier in
            view mode) follows the same rule — the section's shape never
            depends on whether the data behind it exists. */}
        <section>
          <h3 className="text-label-base-semibold quote-modal__section-title">Audit Information</h3>
          <div className="quote-modal__grid-2">
            <TitleSubtitle subtitle="Created By" title={audit?.createdBy || DASH} />
            <TitleSubtitle subtitle="Created Date/Time" title={audit?.createdDate || DASH} />
            <TitleSubtitle subtitle="Updated By" title={audit?.updatedBy || DASH} />
            <TitleSubtitle subtitle="Updated Date/Time" title={audit?.updatedDate || DASH} />
            <TitleSubtitle subtitle="Initial AP Amount" title={audit?.initialApAmount != null ? fmtDollar(audit.initialApAmount) : DASH} />
            <TitleSubtitle subtitle="Final AP Amount" title={audit?.finalApAmount != null ? fmtDollar(audit.finalApAmount) : DASH} />
          </div>
        </section>
      </div>
  )

  // Embedded: the HOST owns the dialog shell (its own ModalMedium, its own
  // header and footer), so this renders bare and does NOT portal. Used by the
  // Shipment Details modal, where Edit Quote is a VIEW of that modal rather
  // than a second dialog stacked on it (user, 2026-08-11).
  if (embedded) return body

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
        <QuoteModalFooter onCancel={onClose} onSave={handleSave} disabled={disabled} />
      )}
    >
      {body}
    </ModalMedium>,
    document.body,
  )
})
