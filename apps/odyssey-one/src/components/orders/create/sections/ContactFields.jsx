import { Controller, useFormContext } from 'react-hook-form'
import { FormField } from '@odyssey/ui'

/**
 * ContactFields — optional contact for a party (Efrain §2): Name, Phone
 * (E.164 after normalization — schema-validated only when filled), Email.
 *
 * `id` props follow the co-pickupDelivery-<path> pattern (Batch 3 parity).
 */
export default function ContactFields({ basePath }) {
  const { control } = useFormContext()

  // Derive a stable id prefix from the basePath
  const idPrefix = `co-${basePath.replace(/\./g, '-')}`

  const field = (name, label, placeholder, type = 'text') => (
    <Controller
      name={`${basePath}.${name}`}
      control={control}
      render={({ field: f, fieldState }) => (
        <FormField
          id={`${idPrefix}-${name}`}
          label={label}
          placeholder={placeholder}
          type={type}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          error={fieldState.error?.message}
        />
      )}
    />
  )

  return (
    <div className="co-contact-grid">
      {field('contactName', 'Contact Name', 'e.g., Nick Strauss')}
      {field('contactPhone', 'Phone Number', '+1 (765) 670-4444')}
      {field('contactEmail', 'Email Address', 'name@company.com', 'email')}
    </div>
  )
}
