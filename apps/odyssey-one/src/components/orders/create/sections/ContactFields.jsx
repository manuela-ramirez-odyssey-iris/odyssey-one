import { Controller, useFormContext } from 'react-hook-form'
import { FormField } from '@odyssey/ui'
import { useResolveMode, resolveFieldProps } from '../../resolve/ResolveModeContext.jsx'

/**
 * ContactFields — optional contact for a party (Efrain §2): Name, Phone
 * (E.164 after normalization — schema-validated only when filled), Email.
 *
 * `id` props follow the co-pickupDelivery-<path> pattern (Batch 3 parity).
 *
 * Phone (S158, user ruling 2026-09-23 — OIF & Audit Trail review minutes,
 * 2026-09-16): digits only AS TYPED, not FormField's shared `format="phone"`
 * policy (packages/ui — out of scope for this change; it still allows
 * `()-. ` for other consumers). A leading `+` is kept — schema.ts's
 * `E164_RE` requires it — but stripped from anywhere else in the string.
 * This is what makes the old "letters in a phone" Level-2 seeded error
 * (validationErrors.js) unreachable: the value can never contain a letter.
 */
export const stripPhoneDigits = (raw) => {
  const leadingPlus = raw.startsWith('+') ? '+' : ''
  return leadingPlus + raw.replace(/[^0-9]/g, '')
}

export default function ContactFields({ basePath }) {
  const { control } = useFormContext()
  const resolve = useResolveMode()
  // Resolve mode locks every field; resolveFieldProps (spread last) re-enables
  // pool fields via disabled:false.
  const locked = !!resolve

  // Derive a stable id prefix from the basePath
  const idPrefix = `co-${basePath.replace(/\./g, '-')}`

  const field = (name, label, placeholder, type = 'text', format = 'text') => (
    <Controller
      name={`${basePath}.${name}`}
      control={control}
      render={({ field: f, fieldState }) => (
        <FormField
          id={`${idPrefix}-${name}`}
          label={label}
          placeholder={placeholder}
          type={type}
          format={format === 'phone' ? 'text' : format}
          inputMode={format === 'phone' ? 'tel' : undefined}
          value={f.value}
          disabled={locked}
          onChange={(e) => f.onChange(format === 'phone' ? stripPhoneDigits(e.target.value) : e.target.value)}
          error={fieldState.error?.message}
          {...resolveFieldProps(resolve, `${basePath}.${name}`, fieldState.error?.message)}
        />
      )}
    />
  )

  return (
    <div className="co-contact-grid">
      {field('contactName', 'Contact Name', 'e.g., Nick Strauss')}
      {field('contactPhone', 'Phone Number', '+1 (765) 670-4444', 'text', 'phone')}
      {field('contactEmail', 'Email Address', 'name@company.com', 'email')}
    </div>
  )
}
