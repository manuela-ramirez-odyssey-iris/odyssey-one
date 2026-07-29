import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Breadcrumb } from '@odyssey/ui'
import OrderSummaryView from '../summary/OrderSummaryView'
import mapFormVmToOrderPane from '../summary/mapFormVmToOrderPane'
import { pushNotification } from '../../../utils/notifications'

// LINX-9002 Scenario 2: the async number assignment, simulated. Real backend
// pushes it; the mock create response already carries the generated number,
// so the flip just reveals it after a demo-scale delay.
const ASYNC_ASSIGN_MS = 8000

const formatOrderDate = (iso, tz) => {
  if (!iso) return ''
  const [date, time] = iso.split('T')
  if (!date || !time) return iso
  const [y, m, d] = date.split('-')
  return `${m}/${d}/${y} ${time.slice(0, 5)}${tz ? `, ${tz}` : ''}`
}

/**
 * ConfirmationView — post-submit confirmation (Figma 4317:20483,
 * "Confirmation Page - Long Creation - Success Message"). The confirmation
 * IS the Order Summary layout: breadcrumb → grey info band (Alert + KV
 * strip) → the shared four-card stack (OrderSummaryView). Two alert states,
 * keyed off the create response's order number:
 *  - number assigned  → success ("created successfully")
 *  - no number (async creation, Q17) → info ("being processed…") and the
 *    KV strip's Order Number renders the '--' dash convention.
 * Async is REAL behavior now (LINX-9002 Scenario 2): it triggers whenever the
 * user left Order Number blank (the mock service generates one immediately, so
 * async never keyed off the response). After ASYNC_ASSIGN_MS the number
 * populates, the alert flips to success, and the navbar bell gains a
 * notification. `variant="async"` (dev trigger ?confirm=async) still forces
 * the initial async state for QA.
 */
export default function ConfirmationView({ data, values, variant }) {
  const navigate = useNavigate()
  const [alertOpen, setAlertOpen] = useState(true)
  const startedAsync =
    variant === 'async' || !values?.general?.orderNumber?.trim() || !data?.orderNumber
  const [assigned, setAssigned] = useState(false)
  const isAsync = startedAsync && !assigned

  // Scenario-2 flip: number arrives "from the backend" → success + bell.
  useEffect(() => {
    if (!startedAsync || !data?.orderNumber) return undefined
    const t = setTimeout(() => {
      setAssigned(true)
      setAlertOpen(true) // re-surface even if the pending alert was dismissed
      pushNotification()
    }, ASYNC_ASSIGN_MS)
    return () => clearTimeout(t)
  }, [startedAsync, data?.orderNumber])

  const vm = useMemo(() => {
    const base = mapFormVmToOrderPane(values)
    return {
      ...base,
      strip: {
        ...base.strip,
        // Order Date + Shipment Mode exist only on the create response —
        // the navigation summary leaves them '--' (view-DTO gap).
        orderNumber: isAsync ? '' : data?.orderNumber || base.strip.orderNumber,
        orderDate: formatOrderDate(data?.orderDate, data?.orderDateTimeZoneCode),
        shipmentMode: data?.shipmentMode || base.strip.shipmentMode,
      },
    }
  }, [values, data, isAsync])

  // "Click here" targets (user ruling 2026-07-28): success → the created
  // order's summary page (createOrder persists into the list overlay, so
  // getOrderView serves it); async (no number yet) → the Orders list.
  const alert = alertOpen ? (
    isAsync ? (
      <Alert variant="info" showLink onLinkClick={() => navigate('/orders')} onClose={() => setAlertOpen(false)}>
        Your order is being processed and an order number will be assigned shortly.
        No further action is needed—we&apos;ll notify you once it&apos;s ready.
      </Alert>
    ) : (
      <Alert
        variant="success"
        showLink
        onLinkClick={() => navigate(`/orders/${data?.orderNumber || values?.general?.orderNumber || ''}`)}
        onClose={() => setAlertOpen(false)}
      >
        Your order was created successfully.
      </Alert>
    )
  ) : null

  return (
    <>
      <nav className="order-summary__crumbs" aria-label="Breadcrumb">
        <Breadcrumb label="Orders" onClick={() => navigate('/orders')} />
        <Breadcrumb label="Create new order" current />
      </nav>
      <OrderSummaryView vm={vm} alert={alert} />
    </>
  )
}
