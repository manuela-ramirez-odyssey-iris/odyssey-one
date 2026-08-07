import { useNavigate, useParams } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { Alert, Breadcrumb, Button, EmptyState } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import OrderSummaryView from '../../components/orders/summary/OrderSummaryView'
import mapFormVmToOrderPane from '../../components/orders/summary/mapFormVmToOrderPane'
import { useOrderView } from '../../api/queries/useOrderView'
import '../../components/orders/orders.css'
import '../../components/orders/summary/order-summary.css'

// Order Summary — /orders/:orderId (row click on the grid). Figma 4317:20483:
// breadcrumb "Orders › {id}", then the shared OrderSummaryView body (DSN/100
// info band + the four-card SubAccordion stack — same layout the create-flow
// confirmation renders). The navigation summary shows NO alert — except for
// number-less PENDING orders (async create in flight, addressed as
// `pending-<orderId>`): those show the blue processing Alert and '-' for the
// order number until the backend assigns one. Data: useOrderView(orderNumber)
// via the getOrderView seam, adapted by mapFormVmToOrderPane; sourceless
// fields render '--'.

export default function OrderSummaryRoute() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { data: values, isPending, isError, refetch } = useOrderView(orderId)
  const isPendingOrder = orderId?.startsWith('pending-')

  let vm = null
  if (values) {
    vm = mapFormVmToOrderPane(values)
    // The route param is the authoritative order number if the VM lacks one;
    // pending orders have none yet and display '-'.
    vm.strip.orderNumber = isPendingOrder ? '-' : vm.strip.orderNumber || orderId
  }

  return (
    <AppShell>
      <div className="order-summary-page">
        <nav className="order-summary__crumbs" aria-label="Breadcrumb">
          <Breadcrumb label="Orders" onClick={() => navigate('/orders')} />
          {/* A pending order has no number yet — drop the trailing token rather
              than rendering "View order -", which reads as a missing value. */}
          <Breadcrumb label={isPendingOrder ? 'View order' : `View order ${orderId}`} current />
        </nav>

        {isPending ? (
          <div className="orders-page__status text-label-sm-regular">Loading order…</div>
        ) : isError ? (
          <div className="orders-page__status">
            <span className="text-label-sm-regular">Something went wrong loading this order.</span>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : vm == null ? (
          <EmptyState icon={<Inbox size={32} />} message="Order not found" />
        ) : (
          <OrderSummaryView
            vm={vm}
            alert={isPendingOrder ? (
              <Alert variant="info">
                Your order is being processed and an order number will be assigned shortly.
                No further action is needed—we’ll notify you once it’s ready.
              </Alert>
            ) : null}
          />
        )}
      </div>
    </AppShell>
  )
}
