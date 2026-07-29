import { useMemo } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { MultiSelect } from '@odyssey/ui'
import { useResolveMode } from '../../resolve/ResolveModeContext.jsx'
import { SPECIAL_SERVICES } from '../../../../data/master-data'

// Options frequency-sorted (LINX-8125); catalog already excludes Lumper/Detention.
// Form value stays [{ code, description }] (wire shape) — mapped to/from
// MultiSelect's selected-values array here.
const OPTIONS = [...SPECIAL_SERVICES]
  .sort((a, b) => b.frequency - a.frequency)
  .map((s) => ({ value: s.code, label: s.code, description: s.description }))

export default function SpecialServicesSection() {
  const { control } = useFormContext()
  const locked = !!useResolveMode() // special services are never in the error pool
  const byCode = useMemo(() => new Map(OPTIONS.map((o) => [o.value, o])), [])
  return (
    <Controller
      name="specialServices"
      control={control}
      render={({ field }) => (
        <MultiSelect
          id="co-special-services"
          label="Special Services"
          placeholder="Search a special services"
          options={OPTIONS}
          disabled={locked}
          emptyTableMessage="No special services added"
          selected={(field.value ?? []).map((s) => s.code)}
          onChange={(codes) =>
            field.onChange(codes.map((c) => ({ code: c, description: byCode.get(c)?.description ?? '' })))
          }
        />
      )}
    />
  )
}
