import { useRef } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { ComboBox, FormField } from '@odyssey/ui'
import SelectField from '../fields/SelectField.jsx'
import { US_STATES, COUNTRIES, CITY_OPTIONS, POSTAL_OPTIONS, LOCATION_ADDRESSES } from '../../../../data/master-data'

const toOptions = (list) => list.map((v) => ({ value: v, label: v }))
const STATE_OPTS = toOptions(US_STATES)
const COUNTRY_OPTS = toOptions(COUNTRIES)
const CITY_OPTS = toOptions(CITY_OPTIONS)
const LONG_NAME_OPTS = toOptions([...new Set(LOCATION_ADDRESSES.map((l) => l.longName))].sort())
const POSTAL_SET = new Set(POSTAL_OPTIONS)

/**
 * AddressFields — the manual-address grid (Figma 5921:16412; Efrain §2).
 * Mandatory: ID/Org Name, Long Name, Address 1, City, State, Postal,
 * Country; Address 2 optional. Per the mock: Address 1/2 span the full row.
 * City/State/Country are TYPABLE dropdowns (ComboBox over master data) with
 * free-text commit on blur — a value missing from master data shows
 * "<Field> not found in master data. Please enter manually & submit" in the
 * dropdown slot (Efrain, 2026-07-28) and is still accepted. Postal is a free
 * input with the same message as a non-blocking warning below the field.
 * The LINX-8042 bidirectional cascade is NOT wired yet (known gap).
 * `basePath` = "pickupDelivery.consignor" etc.
 *
 * `id` props follow the co-pickupDelivery-<path> pattern (Batch 3 parity).
 */
export default function AddressFields({ basePath }) {
  const { control } = useFormContext()

  // Derive a stable id prefix from the basePath (e.g. "pickupDelivery.consignor"
  // → "co-pickupDelivery-consignor") matching the Batch 3 co-general-* convention.
  const idPrefix = `co-${basePath.replace(/\./g, '-')}`

  // One typed-text ref per combo field (free-text commit on blur, LINX-8126 pattern)
  const typedRef = useRef({})

  const text = (name, label, placeholder) => (
    <Controller
      name={`${basePath}.${name}`}
      control={control}
      render={({ field, fieldState }) => (
        <FormField
          id={`${idPrefix}-${name}`}
          label={label}
          placeholder={placeholder}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          error={fieldState.error?.message}
        />
      )}
    />
  )

  const select = (name, label, options, placeholder) => (
    <Controller
      name={`${basePath}.${name}`}
      control={control}
      render={({ field, fieldState }) => (
        <SelectField
          id={`${idPrefix}-${name}`}
          label={label}
          placeholder={placeholder}
          options={options}
          value={field.value}
          onChange={field.onChange}
          error={fieldState.error?.message}
        />
      )}
    />
  )

  // Typable dropdown: pick from master data OR commit free text on blur;
  // the not-found message renders in the dropdown slot, entry is not blocked.
  const combo = (name, label, options, placeholder, notFoundMessage) => (
    <Controller
      name={`${basePath}.${name}`}
      control={control}
      render={({ field, fieldState }) => (
        <ComboBox
          id={`${idPrefix}-${name}`}
          variant="select"
          showLabel
          label={label}
          placeholder={placeholder}
          options={options}
          value={field.value}
          onChange={(text) => {
            typedRef.current[name] = text
            if (field.value && text !== field.value) field.onChange('')
          }}
          onBlur={() => {
            const t = (typedRef.current[name] ?? '').trim()
            if (t && t !== field.value) field.onChange(t)
          }}
          onSelect={(val) => {
            typedRef.current[name] = val ?? ''
            field.onChange(val ?? '')
          }}
          emptyMessage={notFoundMessage}
          error={fieldState.error?.message}
        />
      )}
    />
  )

  // Postal: free input; non-blocking master-data warning below the field
  const postal = useWatch({ control, name: `${basePath}.postal` })
  const postalWarning = postal && !POSTAL_SET.has(postal.trim())
    ? 'Postal Code not found in master data. Please enter manually & submit'
    : null

  return (
    <div className="co-address-grid">
      {text('idOrgName', 'ID/Org Name *', 'Search ID/Org Name')}
      {select('longName', 'Long Name *', LONG_NAME_OPTS, 'Search Name')}
      <div className="co-address-grid__full">
        {text('address1', 'Address 1 *', 'Street address (e.g., 123 Main St)')}
      </div>
      <div className="co-address-grid__full">
        {text('address2', 'Address 2', 'Apt, suite, or unit number')}
      </div>
      {combo('city', 'City *', CITY_OPTS, 'e.g., Dallas', 'City not found in master data. Please enter manually & submit')}
      {combo('state', 'State *', STATE_OPTS, 'Select an option', 'State not found in master data. Please enter manually & submit')}
      <div>
        {text('postal', 'Postal Code *', '75201')}
        {postalWarning && (
          <p className="co-field-warning text-label-xs-regular">{postalWarning}</p>
        )}
      </div>
      {combo('country', 'Country *', COUNTRY_OPTS, 'United States', 'Country not found in master data. Please enter manually & submit')}
    </div>
  )
}
