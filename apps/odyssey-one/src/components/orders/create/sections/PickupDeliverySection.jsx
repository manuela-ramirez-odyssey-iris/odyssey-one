import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, MapPin, Plus } from 'lucide-react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { Alert, Button, Checkbox, ComboBox, Radio, TimePicker } from '@odyssey/ui'
import DateField from '../fields/DateField.jsx'
import AddressFields from './AddressFields.jsx'
import ContactFields from './ContactFields.jsx'
import { useResolveMode } from '../../resolve/ResolveModeContext.jsx'
import { getPastDateWarnings } from '../schema'
import { getLookupOptions } from '../../../../api/services/lookupService'
import { deriveTimezone, tzAbbrev } from '../../../../data/master-data'

// Location search: server lookup (org-address master data) → ComboBox
// variant='search' (magnifier face per Figma 5920:18351); paged 25/request,
// browse on focus, 2-char gate while typing.
const LOOKUP_PAGE_SIZE = 25
const pagedLocationLookup = async (q, skip = 0) => {
  if (q.trim().length === 1) return { options: [], total: 0 }
  const all = await getLookupOptions('org-address', q)
  return {
    // Rich two-line rows (Figma 6010:42268): map-pin avatar, "ID:" semibold +
    // long name, "City, ST ZIP" sub-line
    options: all.slice(skip, skip + LOOKUP_PAGE_SIZE).map((a) => ({
      ...a,
      matchId: `${a.value}:`,
      customer: String(a.meta?.longName ?? ''),
      address: a.description,
    })),
    total: all.length,
  }
}
const locationRowProps = { showAvatar: true, showInfo: true, icon: <MapPin size={20} /> }

// A query shaped like a location id (e.g. HCO-TX-010) that matches nothing is
// an INVALID ID, not a plain no-match (message spec: Efrain, 2026-07-28)
const LOCATION_ID_RE = /^[A-Za-z]{2,5}-[A-Za-z]{2}-\d+$/
const locationEmptyMessage = (q) => {
  const t = q.trim()
  if (t.length === 1) return 'Type at least 2 characters'
  if (LOCATION_ID_RE.test(t)) return 'Invalid location ID entered. Please check the value and enter the correct location ID'
  return 'No matching locations found.'
}
const DUPLICATE_LOCATION_MESSAGE =
  'Consignor & Consignee location IDs can not be the same. Please check the value and enter the correct location ID'

// Lookup pick hydrates the manual fields from master data, so the mapper
// reads ONE set of address fields regardless of entry path.
//
// KNOWN LIMITATION: after a lookup hydrates address fields, manually editing
// any hydrated field (address1, city, etc.) does NOT clear locationId, so
// the typeahead display label can desync from the actual edited address.
// Candidate fix: clear locationId on any manual edit of a hydrated field.
// Deferred pending spec decision (confirm with Jana).
function applyLocation(setValue, base, opt) {
  if (!opt) {
    setValue(`${base}.locationId`, '', { shouldValidate: true })
    return
  }
  const a = opt.meta ?? {}
  setValue(`${base}.locationId`, opt.value, { shouldValidate: true })
  setValue(`${base}.idOrgName`, opt.value)
  setValue(`${base}.longName`, a.longName ?? '')
  setValue(`${base}.address1`, a.address1 ?? '')
  setValue(`${base}.address2`, '')
  setValue(`${base}.city`, a.city ?? '', { shouldValidate: true })
  setValue(`${base}.state`, a.state ?? '')
  setValue(`${base}.postal`, a.postal ?? '')
  setValue(`${base}.country`, a.country ?? 'United States')
}

function PartyColumn({ side, title }) {
  const { control, setValue, watch } = useFormContext()
  // Resolve mode locks everything here; the pool fields that re-enable live in
  // AddressFields/ContactFields (via resolveFieldProps) — locationId never does.
  const locked = !!useResolveMode()
  const base = `pickupDelivery.${side}`
  const manualMode = watch(`${base}.manualMode`)
  const showContact = watch(`${base}.showContact`)
  const longName = watch(`${base}.longName`)

  // Duplicate-ID guard: the OTHER party's committed location id — typing or
  // picking it here shows the alert in the dropdown slot instead of the list
  const otherSide = side === 'consignor' ? 'consignee' : 'consignor'
  const otherId = watch(`pickupDelivery.${otherSide}.locationId`)
  const [typed, setTyped] = useState('')
  const isDuplicate = (id) => !!otherId && !!id && id.trim().toUpperCase() === otherId.toUpperCase()
  const panelError = isDuplicate(typed) ? DUPLICATE_LOCATION_MESSAGE : undefined

  // id prefix following co-pickupDelivery-<side> pattern (Batch 3 parity)
  const idPrefix = `co-pickupDelivery-${side}`

  return (
    <div className="co-party">
      <h3 className="co-party__title text-label-base-semibold">{title}</h3>
      <Controller
        name={`${base}.locationId`}
        control={control}
        render={({ field, fieldState }) => (
          <ComboBox
            id={`${idPrefix}-locationId`}
            variant="search"
            showLabel
            label="Add Location *"
            placeholder="Search for ID/Org Name, Address, City, State and Postal Code"
            disabled={locked}
            value={field.value ? (longName ? `${field.value}: ${longName}` : field.value) : ''}
            onChange={(text) => {
              setTyped(text)
              // Typing invalidates the committed pick
              const committed = field.value ? (longName ? `${field.value}: ${longName}` : field.value) : ''
              if (field.value && text !== committed) applyLocation(setValue, base, null)
            }}
            loadOptions={pagedLocationLookup}
            rowProps={locationRowProps}
            emptyMessage={locationEmptyMessage}
            panelError={panelError}
            onSelect={(val, opt) => {
              if (opt && isDuplicate(opt.value)) {
                setTyped(opt.value) // reopening the dropdown shows the duplicate alert
                applyLocation(setValue, base, null)
                return
              }
              setTyped('')
              applyLocation(setValue, base, opt ?? null)
            }}
            error={fieldState.error?.message}
          />
        )}
      />
      {!manualMode && (
        <div className="co-link-row co-link-row--center">
          <Button variant="link" icon={<Plus size={16} />} disabled={locked} onClick={() => setValue(`${base}.manualMode`, true)}>
            Add Location Manually
          </Button>
        </div>
      )}
      {manualMode && (
        <>
          <hr className="co-divider" />
          <AddressFields basePath={base} />
        </>
      )}
      <hr className="co-divider" />
      <Button
        variant="link"
        iconRight={showContact ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        disabled={locked}
        onClick={() => setValue(`${base}.showContact`, !showContact)}
      >
        Add Contact Information
      </Button>
      {showContact && <ContactFields basePath={base} />}
    </div>
  )
}

function DateTimeGroup({ basePath, label, required, warning }) {
  const { control } = useFormContext()
  const locked = !!useResolveMode() // date/time triads are never in the error pool
  const star = required ? ' *' : ''

  // id prefix following co-pickupDelivery-<triad> pattern (Batch 3 parity)
  // basePath e.g. "pickupDelivery.earlyPickup" → "co-pickupDelivery-earlyPickup"
  const idPrefix = `co-${basePath.replace(/\./g, '-')}`

  // PlanningDate fix capture (2026-06-12): group heading carries the
  // Earliest/Latest wording (+ star when Q22-required); field labels are
  // bare Date / Time / Time Zone in a three-equal-column triad.
  return (
    <div className="co-dt-group">
      <p className="co-dt-group__heading text-label-sm-medium">{`${label}${star}`}</p>
      <div className="co-triad">
        <Controller
          name={`${basePath}.date`}
          control={control}
          render={({ field, fieldState }) => (
            <DateField
              id={`${idPrefix}-date`}
              label={`Date${star}`}
              disabled={locked}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              warning={warning}
            />
          )}
        />
        <Controller
          name={`${basePath}.time`}
          control={control}
          render={({ field, fieldState }) => (
            <TimePicker
              id={`${idPrefix}-time`}
              label={`Time${star}`}
              placeholder="Select Time"
              disabled={locked}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        {/* No Time Zone control: the timezone is SYSTEM-determined (user, S102) —
            derived from the consignor/consignee city by the effects below and
            written straight to `${basePath}.timezone`, which the wire mapper
            still reads as requested*TimeZoneCode. */}
      </div>
    </div>
  )
}

/**
 * Pickup & Delivery (spec §3.2, screens 2/2-manual/2-Long). Quick and Long
 * are structurally identical here — the Long delta lives in General Info.
 */
export default function PickupDeliverySection() {
  const { control, watch, getValues, setValue } = useFormContext()
  const locked = !!useResolveMode()
  const planningDateType = watch('pickupDelivery.planningDateType')
  const [planningAlertOpen, setPlanningAlertOpen] = useState(true)
  const consignorCity = watch('pickupDelivery.consignor.city')
  const consigneeCity = watch('pickupDelivery.consignee.city')

  // Narrow subscription to only the four date/time triads so that keystrokes
  // in address, contact, or other fields don't re-render the full section.
  const [earlyPickup, latePickup, earlyDelivery, lateDelivery] = useWatch({
    control,
    name: [
      'pickupDelivery.earlyPickup',
      'pickupDelivery.latePickup',
      'pickupDelivery.earlyDelivery',
      'pickupDelivery.lateDelivery',
    ],
  })
  const warnings = getPastDateWarnings({ earlyPickup, latePickup, earlyDelivery, lateDelivery })

  // Appointment flags (LINX-12095/13845): each checkbox is enabled ONLY while
  // its Latest date+time is filled, and auto-clears when that date/time changes.
  const canPickupAppt = !!(latePickup?.date && latePickup?.time)
  const canDeliveryAppt = !!(lateDelivery?.date && lateDelivery?.time)
  const apptInitRef = useRef(true)
  useEffect(() => {
    if (apptInitRef.current) { apptInitRef.current = false; return } // don't clear a hydrated draft on mount
    setValue('pickupDelivery.pickupAppointment', false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latePickup?.date, latePickup?.time])
  const apptInitRef2 = useRef(true)
  useEffect(() => {
    if (apptInitRef2.current) { apptInitRef2.current = false; return }
    setValue('pickupDelivery.deliveryAppointment', false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lateDelivery?.date, lateDelivery?.time])

  const appointmentCheckbox = (name, enabled) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Checkbox
          label="Appointment"
          checked={field.value}
          disabled={!enabled || locked}
          onChange={(e) => field.onChange(e.target.checked)}
        />
      )}
    />
  )

  // TZ auto-derive (spec §10): pickup TZs from the consignor city, delivery
  // TZs from the consignee city — only when the field is still empty.
  //
  // The ORDER wire wants an abbreviation (the paired field is `*TimeZoneCode`),
  // not the IANA id — unlike shipment/tracking stops, which store IANA (TR-04).
  // So derive the zone from the city, then resolve it against THAT field's own
  // date, which is what makes it DST-correct: a July pickup in Houston is CDT,
  // the same city in January is CST. `deriveTimezone` used to return a fixed
  // code and got this wrong half the year.
  const codeFor = useCallback((city, key) => {
    const zone = deriveTimezone(city)
    if (!zone) return ''
    const raw = getValues(`pickupDelivery.${key}.date`) // MM/DD/YYYY
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw ?? '')
    const when = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : new Date()
    return tzAbbrev(zone, when)
  }, [getValues])

  useEffect(() => {
    for (const key of ['earlyPickup', 'latePickup']) {
      const tz = codeFor(consignorCity, key)
      if (tz && !getValues(`pickupDelivery.${key}.timezone`)) {
        setValue(`pickupDelivery.${key}.timezone`, tz, { shouldValidate: true })
      }
    }
  }, [consignorCity, codeFor, getValues, setValue])

  useEffect(() => {
    for (const key of ['earlyDelivery', 'lateDelivery']) {
      const tz = codeFor(consigneeCity, key)
      if (tz && !getValues(`pickupDelivery.${key}.timezone`)) {
        setValue(`pickupDelivery.${key}.timezone`, tz, { shouldValidate: true })
      }
    }
  }, [consigneeCity, codeFor, getValues, setValue])

  return (
    <div className="co-section-body">
      {/* Renames: Consignor→Shipper (LINX-12255), Consignee→Destination
          (LINX-13899) — wire keys stay consignor/consignee */}
      <div className="co-party-grid">
        <PartyColumn side="consignor" title="Shipper" />
        <PartyColumn side="consignee" title="Destination" />
      </div>

      <hr className="co-divider" />

      <div className="co-planning">
        <h3 id="co-pickupDelivery-planning-subhead" className="co-subhead text-label-base-semibold">Planning Date/Time</h3>
        {planningAlertOpen && (
          <Alert variant="info" onClose={() => setPlanningAlertOpen(false)}>
            Please enter one of the following fields: 'Latest Pickup' or 'Latest Delivery'.
          </Alert>
        )}
        <Controller
          name="pickupDelivery.planningDateType"
          control={control}
          render={({ field }) => (
            <div
              className="co-radio-row"
              role="radiogroup"
              aria-labelledby="co-pickupDelivery-planning-subhead"
            >
              <Radio
                name="planningDateType"
                value="SHIP"
                label="Ship Date & Time"
                disabled={locked}
                checked={field.value === 'SHIP'}
                onChange={() => field.onChange('SHIP')}
              />
              <Radio
                name="planningDateType"
                value="DELIVERY"
                label="Delivery Date & Time"
                disabled={locked}
                checked={field.value === 'DELIVERY'}
                onChange={() => field.onChange('DELIVERY')}
              />
            </div>
          )}
        />
        {/* PlanningDate fix capture: pickup column | delivery column with a
            vertical separator (same split-gutter mechanism as co-party-grid) */}
        <div className="co-planning-grid">
          <div className="co-planning-col">
            {appointmentCheckbox('pickupDelivery.pickupAppointment', canPickupAppt)}
            <DateTimeGroup
              basePath="pickupDelivery.earlyPickup"
              label="Earliest Pickup Date and Time"
              required={false}
              warning={warnings.earlyPickup}
            />
            <DateTimeGroup
              basePath="pickupDelivery.latePickup"
              label="Latest Pickup Date and Time"
              required={planningDateType === 'SHIP'}
              warning={warnings.latePickup}
            />
          </div>
          <div className="co-planning-col">
            {appointmentCheckbox('pickupDelivery.deliveryAppointment', canDeliveryAppt)}
            <DateTimeGroup
              basePath="pickupDelivery.earlyDelivery"
              label="Earliest Delivery Date and Time"
              required={false}
              warning={warnings.earlyDelivery}
            />
            <DateTimeGroup
              basePath="pickupDelivery.lateDelivery"
              label="Latest Delivery Date and Time"
              required={planningDateType === 'DELIVERY'}
              warning={warnings.lateDelivery}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
