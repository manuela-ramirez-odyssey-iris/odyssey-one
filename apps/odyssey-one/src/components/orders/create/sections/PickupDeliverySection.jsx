import { useEffect } from 'react'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { Alert, Button, Radio } from '@odyssey/ui'
import TypeaheadSelect from '../fields/TypeaheadSelect.jsx'
import DateInput from '../fields/DateInput.jsx'
import TimeSelect from '../fields/TimeSelect.jsx'
import TimezoneSelect from '../fields/TimezoneSelect.jsx'
import AddressFields from './AddressFields.jsx'
import ContactFields from './ContactFields.jsx'
import { getPastDateWarnings } from '../schema'
import { deriveTimezone } from '../../../../data/master-data'

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
  const base = `pickupDelivery.${side}`
  const manualMode = watch(`${base}.manualMode`)
  const showContact = watch(`${base}.showContact`)
  const longName = watch(`${base}.longName`)

  // id prefix following co-pickupDelivery-<side> pattern (Batch 3 parity)
  const idPrefix = `co-pickupDelivery-${side}`

  return (
    <div className="co-party">
      <h3 className="co-party__title text-label-base-medium">{title}</h3>
      <Controller
        name={`${base}.locationId`}
        control={control}
        render={({ field, fieldState }) => (
          <TypeaheadSelect
            id={`${idPrefix}-locationId`}
            label="Add Location *"
            placeholder="Search for ID/Org Name, Address, City, State and Postal Code"
            lookupType="org-address"
            selected={field.value
              ? { value: field.value, label: longName ? `${field.value}: ${longName}` : field.value }
              : null}
            onSelect={(opt) => applyLocation(setValue, base, opt)}
            error={fieldState.error?.message}
          />
        )}
      />
      {!manualMode && (
        <Button variant="link" icon={<Plus size={16} />} onClick={() => setValue(`${base}.manualMode`, true)}>
          Add Location Manually
        </Button>
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
  const star = required ? ' *' : ''

  // id prefix following co-pickupDelivery-<triad> pattern (Batch 3 parity)
  // basePath e.g. "pickupDelivery.earlyPickup" → "co-pickupDelivery-earlyPickup"
  const idPrefix = `co-${basePath.replace(/\./g, '-')}`

  return (
    <div className="co-triad">
      <Controller
        name={`${basePath}.date`}
        control={control}
        render={({ field, fieldState }) => (
          <DateInput
            id={`${idPrefix}-date`}
            label={`${label} Date${star}`}
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
          <TimeSelect
            id={`${idPrefix}-time`}
            label={`Time${star}`}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        name={`${basePath}.timezone`}
        control={control}
        render={({ field, fieldState }) => (
          <TimezoneSelect
            id={`${idPrefix}-timezone`}
            label={`Time Zone${star}`}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
    </div>
  )
}

/**
 * Pickup & Delivery (spec §3.2, screens 2/2-manual/2-Long). Quick and Long
 * are structurally identical here — the Long delta lives in General Info.
 */
export default function PickupDeliverySection() {
  const { control, watch, getValues, setValue } = useFormContext()
  const planningDateType = watch('pickupDelivery.planningDateType')
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

  // TZ auto-derive (spec §10): pickup TZs from the consignor city, delivery
  // TZs from the consignee city — only when the field is still empty.
  useEffect(() => {
    const tz = deriveTimezone(consignorCity)
    if (!tz) return
    for (const key of ['earlyPickup', 'latePickup']) {
      if (!getValues(`pickupDelivery.${key}.timezone`)) {
        setValue(`pickupDelivery.${key}.timezone`, tz, { shouldValidate: true })
      }
    }
  }, [consignorCity, getValues, setValue])

  useEffect(() => {
    const tz = deriveTimezone(consigneeCity)
    if (!tz) return
    for (const key of ['earlyDelivery', 'lateDelivery']) {
      if (!getValues(`pickupDelivery.${key}.timezone`)) {
        setValue(`pickupDelivery.${key}.timezone`, tz, { shouldValidate: true })
      }
    }
  }, [consigneeCity, getValues, setValue])

  return (
    <div className="co-section-body">
      <div className="co-party-grid">
        <PartyColumn side="consignor" title="Consignor" />
        <PartyColumn side="consignee" title="Consignee" />
      </div>

      <hr className="co-divider" />

      <div className="co-planning">
        <h3 id="co-pickupDelivery-planning-subhead" className="co-subhead text-label-base-medium">Planning Date/Time</h3>
        <Alert variant="info" showClose={false}>
          Please enter one of the following fields: 'Late Pickup' or 'Late Delivery.'
        </Alert>
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
                checked={field.value === 'SHIP'}
                onChange={() => field.onChange('SHIP')}
              />
              <Radio
                name="planningDateType"
                value="DELIVERY"
                label="Delivery Date & Time"
                checked={field.value === 'DELIVERY'}
                onChange={() => field.onChange('DELIVERY')}
              />
            </div>
          )}
        />
        <div className="co-date-groups">
          <DateTimeGroup
            basePath="pickupDelivery.earlyPickup"
            label="Early Pickup"
            required={false}
            warning={warnings.earlyPickup}
          />
          <DateTimeGroup
            basePath="pickupDelivery.latePickup"
            label="Late Pickup"
            required={planningDateType === 'SHIP'}
            warning={warnings.latePickup}
          />
          <DateTimeGroup
            basePath="pickupDelivery.earlyDelivery"
            label="Early Delivery"
            required={false}
            warning={warnings.earlyDelivery}
          />
          <DateTimeGroup
            basePath="pickupDelivery.lateDelivery"
            label="Late Delivery"
            required={planningDateType === 'DELIVERY'}
            warning={warnings.lateDelivery}
          />
        </div>
      </div>
    </div>
  )
}
