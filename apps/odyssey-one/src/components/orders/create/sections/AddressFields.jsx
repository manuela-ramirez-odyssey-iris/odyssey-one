import { Controller, useFormContext } from 'react-hook-form'
import { FormField } from '@odyssey/ui'
import SelectField from '../fields/SelectField.jsx'
import { CITY_OPTIONS, US_STATES, POSTAL_OPTIONS, COUNTRIES } from '../../../../data/master-data'

const toOptions = (list) => list.map((v) => ({ value: v, label: v }))
const CITY_OPTS = toOptions(CITY_OPTIONS)
const STATE_OPTS = toOptions(US_STATES)
const POSTAL_OPTS = toOptions(POSTAL_OPTIONS)
const COUNTRY_OPTS = toOptions(COUNTRIES)

/**
 * AddressFields — the manual-address grid (screen 2-manual; Efrain §2).
 * Mandatory: ID/Org Name, Long Name, Address 1, City, State, Postal,
 * Country; Address 2 optional. City/State/Postal/Country are selects over
 * master-data (plan decision 16). `basePath` = "pickupDelivery.consignor" etc.
 *
 * `id` props follow the co-pickupDelivery-<path> pattern (Batch 3 parity).
 */
export default function AddressFields({ basePath }) {
  const { control } = useFormContext()

  // Derive a stable id prefix from the basePath (e.g. "pickupDelivery.consignor"
  // → "co-pickupDelivery-consignor") matching the Batch 3 co-general-* convention.
  const idPrefix = `co-${basePath.replace(/\./g, '-')}`

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

  return (
    <div className="co-address-grid">
      {text('idOrgName', 'ID/Org Name *', 'e.g., KRM1234')}
      {text('longName', 'Long Name *', 'e.g., KRM Engineering')}
      {text('address1', 'Address 1 *', 'e.g., 123 manufacturing st.')}
      {text('address2', 'Address 2', 'Apt, Suite, Building')}
      {select('city', 'City *', CITY_OPTS, 'e.g., Dallas')}
      {select('state', 'State *', STATE_OPTS, 'Select an option')}
      {select('postal', 'Postal Code *', POSTAL_OPTS, 'e.g., 75201')}
      {select('country', 'Country *', COUNTRY_OPTS, 'Select an option')}
    </div>
  )
}
