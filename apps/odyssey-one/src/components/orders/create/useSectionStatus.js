import { useEffect, useState } from 'react'
import { useWatch } from 'react-hook-form'
import { generalInfoSchema, pickupDeliverySchema, productsSchema } from './schema'

/**
 * Per-section StepIndicator status (spec §2.2): each circle derives from its
 * sub-schema's validity against watched values, debounced 300ms. Special
 * Services is optional — it shows complete once ≥1 service is picked (plan
 * decision 20; a pure schema check would render it green from first paint).
 */
export function useSectionStatus(control) {
  const values = useWatch({ control })
  const [status, setStatus] = useState({
    general: false,
    pickupDelivery: false,
    products: false,
    specialServices: false,
  })

  useEffect(() => {
    const t = setTimeout(() => {
      setStatus({
        general: generalInfoSchema.safeParse(values?.general).success,
        pickupDelivery: pickupDeliverySchema.safeParse(values?.pickupDelivery).success,
        products: productsSchema.safeParse(values?.products).success,
        specialServices: (values?.specialServices?.length ?? 0) > 0,
      })
    }, 300)
    return () => clearTimeout(t)
  }, [values])

  return status
}
