import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppShell from '../../components/layout/AppShell'
import CreateOrderForm from '../../components/orders/create/CreateOrderForm.jsx'
import ConfirmationView from '../../components/orders/create/ConfirmationView.jsx'
import '../../components/orders/create/create-order.css'

/**
 * CreateOrderRoute — /orders/create inside AppShell (sidebar stays; the
 * navbar flips via CreateOrderModeContext). Post-submit, the form unmounts
 * and the confirmation renders on the same route (spec §5).
 * Dev triggers: ?draft=<orderNumber> reopens a draft; ?confirm=async forces
 * the async confirmation variant (Q17 — mock always returns sync).
 */
export default function CreateOrderRoute() {
  const [searchParams] = useSearchParams()
  const [submitted, setSubmitted] = useState(null)
  const draftKey = searchParams.get('draft')
  const forceAsync = searchParams.get('confirm') === 'async'

  return (
    <AppShell>
      <div className="create-order-page">
        {submitted ? (
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
