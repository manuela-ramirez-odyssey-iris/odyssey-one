import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import AppShell from '../../components/layout/AppShell'
import CreateOrderForm from '../../components/orders/create/CreateOrderForm.jsx'
import ConfirmationView from '../../components/orders/create/ConfirmationView.jsx'
import '../../components/orders/create/create-order.css'
import '../../components/orders/summary/order-summary.css'

/**
 * CreateOrderRoute — /orders/create inside AppShell (sidebar stays; the
 * navbar flips via CreateOrderModeContext). Post-submit, the form unmounts
 * and the confirmation renders on the same route (spec §5) — it reuses the
 * Order Summary layout (`.order-summary-page` + OrderSummaryView) with the
 * success/info Alert slotted into the info band (Figma 4317:20483).
 * Dev triggers: ?draft=<orderNumber> reopens a draft; ?confirm=async forces
 * the async confirmation variant (Q17 — mock always returns sync).
 */
export default function CreateOrderRoute() {
  const [searchParams] = useSearchParams()
  const [submitted, setSubmitted] = useState(null)
  const draftKey = searchParams.get('draft')
  const forceAsync = searchParams.get('confirm') === 'async'
  // ?resolve=<orderNumber> opens the same form in OIF resolution mode
  // (LINX-11137). The grid row's errorCount/customer/orderSource ride along in
  // history state so the seeded errors match the Validation Errors tab.
  const resolveKey = searchParams.get('resolve')
  const location = useLocation()

  return (
    <AppShell>
      <div className={submitted ? 'order-summary-page' : 'create-order-page'}>
        {submitted ? (
          <ConfirmationView
            data={submitted.response.data}
            values={submitted.values}
            variant={forceAsync ? 'async' : 'sync'}
          />
        ) : (
          <CreateOrderForm
            draftKey={draftKey}
            resolveKey={resolveKey}
            resolveMeta={location.state}
            onSubmitted={setSubmitted}
          />
        )}
      </div>
    </AppShell>
  )
}
