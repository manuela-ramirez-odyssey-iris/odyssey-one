import { ChevronDown } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { FormField, TitleSubtitle } from '@odyssey/ui'

// FieldRow — one grid row of fields for the Executed Shipment Details
// accordions. `fields` up to 4 per row (the mock's own grid). Editable, local
// state only (S159 spec #5) — `values`/`onChange` are the parent's plain
// object + setter, no form library.
//
// `dropdown: true` fields have no real option list (nothing to pick from in
// this UI-only prototype) — a trailing chevron is enough to read as a select;
// they stay plain editable text otherwise, same as every other field here.
//
// `readOnly` (S159 READ-ONLY mode, Figma node 2701:9930) — no inputs, no
// error states: each field renders as an @odyssey/ui TitleSubtitle
// (subtitle=label, title=value) instead of a FormField.
export default function FieldRow({ fields, values, onChange, readOnly = false }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${fields.length}, 1fr)`,
        gap: 'var(--spacing-4)',
      }}
    >
      {fields.map((f) => (
        readOnly ? (
          <TitleSubtitle key={f.id} subtitle={f.label} title={values[f.id] ?? f.value ?? ''} />
        ) : (
          <FormField
            key={f.id}
            id={f.id}
            label={f.label}
            value={values[f.id] ?? ''}
            onChange={(e) => onChange(f.id, e.target.value)}
            error={f.error}
            trailingIcon={f.dropdown ? <ChevronDown {...ICON_MD} /> : undefined}
          />
        )
      ))}
    </div>
  )
}
