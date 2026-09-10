import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppShell from '../../components/layout/AppShell'
import CreateOrderForm from '../../components/orders/create/CreateOrderForm.jsx'
import ConfirmationView from '../../components/orders/create/ConfirmationView.jsx'
import ResolveShell from '../../components/orders/resolve/ResolveShell.jsx'
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
  // ?resolve=<orderNumber> opens the two-step OIF resolution page (S145):
  // ResolveShell owns the timeline, Step 1 (LINX-16049) and Step 3, and mounts
  // CreateOrderForm as Step 2 (LINX-11137). The grid row's
  // errorCount/interfaceErrorCount/customer ride along in history state — the
  // shell reads it itself, so the route no longer plumbs it through.
  const resolveKey = searchParams.get('resolve')

  return (
    <AppShell>
      <div className={submitted ? 'order-summary-page' : 'create-order-page'}>
        {resolveKey ? (
          <ResolveShell orderNumber={resolveKey} />
        ) : submitted ? (
          <ConfirmationView
            data={submitted.response.data}
            values={submitted.values}
            variant={forceAsync ? 'async' : 'sync'}
          />
        ) : (
          <CreateOrderForm draftKey={draftKey} onSubmitted={setSubmitted} />
        )}
      </div>
    </AppShell>
  )
}
