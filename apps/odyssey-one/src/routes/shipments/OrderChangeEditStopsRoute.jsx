import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { Alert, Breadcrumb, Button, EmptyState, PageHeader } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import EditStopsView from '../../components/detail/order-change/EditStopsView.jsx'
import ReviewKpiStrip from '../../components/detail/order-change/ReviewKpiStrip.jsx'
import { useShipmentDetail } from '../../api/queries/useShipmentDetail'
import { useResolveOrderChange } from '../../api/queries/useResolveOrderChange'
import '../../components/shipments/order-change/order-change.css'

// Edit Shipment Stops — /shipments/order-change/:sellShipment/stops,
// LINX-15667…15671/15869/15871, VD x38TOJGsNryYl3LsKhCtSc node 2134-53584.
// Reached from the Stops tab's review-mode "Edit Shipment Stops" button
// (StopsTab.jsx) once a consolidated order change is pending — same shell
// pattern as the Direct route (OrderChangeReviewRoute.jsx), one level deeper
// in the URL because this editor is scoped to ONE shipment's stops plan
// rather than the whole tender review.
//
// buyShipment travels through nav state exactly like the Direct route's
// (same DTO gap: SellShipmentOut carries no buyShipment field — see that
// route's header comment) — the header falls back to "Shipment
// {sellShipment}" when state is lost (refresh / pasted URL).

// Where the review's own KPI strip + editor come from is the SAME
// consolidated-order-change shape StopsTab renders inline (S142/LINX-
// 15435/15436) — this route just hosts EditStopsView full-screen instead of
// embedding it in the detail bar's tab pane.
export default function OrderChangeEditStopsRoute() {
  const { sellShipment } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const buyShipment = location.state?.buyShipment
  const { data: detail, isPending, isError, refetch } = useShipmentDetail(sellShipment)
  const resolve = useResolveOrderChange()
  const headerTitle = buyShipment ? `Buy Shipment ${buyShipment}` : `Shipment ${sellShipment}`

  // Same convention as OrderChangeReviewRoute's resolveError — a failed save
  // shouldn't settle silently (Task 11 lesson).
  const [saveError, setSaveError] = useState('')

  // Exit back to this shipment's Stops tab (LINX-15667 — "cancel returns to
  // the review screen") — ShipmentsRoute.jsx:41-46 reads exactly these four
  // state keys to open the detail bar on the right shipment/tab.
  const exit = () => navigate('/shipments', {
    state: {
      selectedShipmentId: sellShipment,
      requestedTab: { key: 'stops' },
      panel: 'exceptions',
      tab: 'order-change',
    },
  })

  // Nothing to edit — deep-linked on a shipment with no pending consolidation
  // plan, or one already resolved out of the category. Same guard StopsTab
  // uses to fall back to plain mode (`review = !!c && !orderChange.resolution`).
  const c = detail?.orderChange?.consolidation
  const empty = !isPending && !isError && (!c || detail.orderChange.resolution)

  // LINX-15671 Scenario A/B — where Approve lands depends on whether a
  // tender is already active. Same source the Direct route reads for its
  // own resolution payload (OrderChangeReviewRoute.jsx: priorTenderStatus =
  // oc?.prior?.tenderStatus) — NOT routingData.options, whose statuses never
  // include 'To Be Tendered'.
  const ACTIVE = ['To Be Tendered', 'Sent', 'Accepted']
  const tender = detail?.orderChange?.prior?.tenderStatus ?? null

  // S143 Task 3 — PATCH save-stops. The navigation branch below (Scenario
  // A/B) only fires on success; a failed save leaves the planner on this
  // screen with the Alert below rather than navigating them away from an
  // edit that never persisted.
  function handleApprove(stopsDto) {
    setSaveError('')
    resolve.mutate(
      { sellShipment, action: 'save-stops', stops: stopsDto, priorTenderStatus: tender, cost: null, priorScac: null },
      {
        onSuccess: () => {
          if (ACTIVE.includes(tender)) {
            // Scenario A — a tender is already active: land back on the
            // Direct review screen so the planner can resolve it with the
            // new stops plan. No `from` key — the Direct route only reads
            // 'from-tender' semantics via from === 'tender', which this exit isn't.
            navigate(`/shipments/order-change/${sellShipment}`, { state: { buyShipment } })
          } else {
            // Scenario B — no active tender yet: send the planner to Tender
            // to start one on the finalized plan, still parked on the Order Change tab.
            navigate('/shipments', {
              state: { selectedShipmentId: sellShipment, requestedTab: { key: 'routing' }, panel: 'exceptions', tab: 'order-change' },
            })
          }
        },
        onError: (e) => setSaveError(e.message),
      },
    )
  }

  return (
    <AppShell
      titleMode={{
        title: 'Edit Shipment Stops',
        onClose: exit,
      }}
    >
      <div className="order-change">
        <nav className="order-change__crumbs" aria-label="Breadcrumb">
          <Breadcrumb label="Shipment" onClick={() => navigate('/shipments', { state: { panel: 'exceptions', tab: 'order-change' } })} />
          <Breadcrumb label="Review Order Change" onClick={exit} />
          <Breadcrumb label="Edit Shipment Stops" current />
        </nav>

        {isPending ? (
          <div className="order-change__status text-label-sm-regular">Loading order change…</div>
        ) : isError ? (
          <div className="order-change__status">
            <span className="text-label-sm-regular">Something went wrong loading this shipment.</span>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : empty ? (
          <EmptyState icon={<Inbox size={32} />} message="Nothing to edit for this shipment." />
        ) : (
          <div className="order-change__content">
            <PageHeader title={headerTitle} />

            {saveError && (
              <Alert variant="error" onClose={() => setSaveError('')}>
                {saveError}
              </Alert>
            )}

            <ReviewKpiStrip summary={detail.stopsData.summary} changes={c.summaryChanges} />

            <EditStopsView
              key={sellShipment}
              stops={detail.stopsData.stops}
              consolidation={c}
              orders={detail.orderDetails}
              orderChange={detail.orderChange}
              summary={detail.stopsData.summary}
              saving={resolve.isPending}
              onApprove={handleApprove}
              onCancel={exit}
            />
          </div>
        )}
      </div>
    </AppShell>
  )
}
