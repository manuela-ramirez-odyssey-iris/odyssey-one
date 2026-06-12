import { Controller, useFormContext } from 'react-hook-form'
import SpecialServicesPicker from '../SpecialServicesPicker.jsx'

export default function SpecialServicesSection() {
  const { control } = useFormContext()
  return (
    <Controller
      name="specialServices"
      control={control}
      render={({ field }) => (
        <SpecialServicesPicker value={field.value} onChange={field.onChange} />
      )}
    />
  )
}
