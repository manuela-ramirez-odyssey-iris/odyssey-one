import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Breadcrumb } from '@odyssey/ui'
import OrderSummaryView from '../summary/OrderSummaryView'
import mapFormVmToOrderPane from '../summary/mapFormVmToOrderPane'

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
 * `variant="async"` (dev trigger ?confirm=async) forces the async state even
 * when the mock service returns a number.
 */
export default function ConfirmationView({ data, values, variant }) {
  const navigate = useNavigate()
  const [alertOpen, setAlertOpen] = useState(true)
  const isAsync = variant === 'async' || !data?.orderNumber

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

  const alert = alertOpen ? (
    isAsync ? (
      <Alert variant="info" onClose={() => setAlertOpen(false)}>
        Your order is being processed and an order number will be assigned shortly.
        No further action is needed—we&apos;ll notify you once it&apos;s ready.
      </Alert>
    ) : (
      <Alert variant="success" onClose={() => setAlertOpen(false)}>
        Your Order was created successfully
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
