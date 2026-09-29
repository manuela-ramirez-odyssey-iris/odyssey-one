import { useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { Breadcrumb, Button, EmptyState, PageHeader } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import EditStopsView from '../../components/detail/order-change/EditStopsView.jsx'
import ReviewKpiStrip from '../../components/detail/order-change/ReviewKpiStrip.jsx'
import { useShipmentDetail } from '../../api/queries/useShipmentDetail'
import { useResolveOrderChange } from '../../api/queries/useResolveOrderChange'
import { useApproveOrderChange } from './useApproveOrderChange.js'
import useSheet from '../useSheet'
import '../../components/shipments/order-change/order-change.css'

// Edit Shipment Stops — /shipments/order-change/:sellShipment/stops,
// LINX-15667…15671/15869/15871, VD x38TOJGsNryYl3LsKhCtSc node 2134-53584.
// Reached from the Stops tab's review-mode "Edit Shipment Stops" button
// (StopsTab.jsx) once a consolidated order change is pending — same shell
// pattern as the Direct route (OrderChangeReviewRoute.jsx), one level deeper
// in the URL because this editor is scoped to ONE shipment's stops plan
// rather than the whole tender review.
//
// S148 — same header fallback chain as the Direct route
// (OrderChangeReviewRoute.jsx): fetched detail.odysseyShipmentIdentifier wins
// (survives refresh/pasted URL), then the nav-state copy (correct on first
// paint before the fetch resolves), then buyShipment, then the raw sell id.

// Where the review's own KPI strip + editor come from is the SAME
// consolidated-order-change shape StopsTab renders inline (S142/LINX-
// 15435/15436) — this route just hosts EditStopsView full-screen instead of
// embedding it in the detail bar's tab pane.
export default function OrderChangeEditStopsRoute() {
  const { sellShipment } = useParams()
  const location = useLocation()
  const { closeSheet } = useSheet()
  const buyShipment = location.state?.buyShipment
  const odysseyShipmentIdentifier = location.state?.odysseyShipmentIdentifier
  const { data: detail, isPending, isError, refetch } = useShipmentDetail(sellShipment)
  const resolve = useResolveOrderChange()
  const { afterApprove } = useApproveOrderChange({ sellShipment, buyShipment, odysseyShipmentIdentifier })
  const headerTitle = detail?.odysseyShipmentIdentifier
    ? `Shipment ${detail.odysseyShipmentIdentifier}`
    : odysseyShipmentIdentifier
    ? `Shipment ${odysseyShipmentIdentifier}`
    : buyShipment ? `Buy Shipment ${buyShipment}` : `Shipment ${sellShipment}`

  // Same convention as OrderChangeReviewRoute's resolveError — a failed save
  // shouldn't settle silently (Task 11 lesson).
  const [saveError, setSaveError] = useState('')

  // Exit back to this shipment's Stops tab (LINX-15667 — "cancel returns to
  // the review screen") — ShipmentsRoute.jsx:41-46 reads exactly these four
  // state keys to open the detail bar on the right shipment/tab.
  const exit = () => closeSheet('/shipments', {
    state: {
      selectedShipmentId: sellShipment,
      requestedTab: { key: 'stops' },
      panel: 'exceptions',
      tab: 'order-change',
    },
  })

  // E1 — X and crumbs go through the editor's own dirty check (its footer
  // Cancel does), so unsaved stop edits can't be lost by one click. Falls back
  // to leaving directly while the editor isn't mounted (loading/empty).
  const cancelRef = useRef(null)
  const leave = (to) => () => (cancelRef.current ? cancelRef.current(to) : to())
  const toShipmentTab = () => closeSheet('/shipments', { state: { panel: 'exceptions', tab: 'order-change' } })

  // Nothing to edit — deep-linked on a shipment with no pending consolidation
  // plan, or one already resolved out of the category. Same guard StopsTab
  // uses to fall back to plain mode (`review = !!c && !orderChange.resolution`).
  const c = detail?.orderChange?.consolidation
  const empty = !isPending && !isError && (!c || detail.orderChange.resolution)

  // LINX-15671 Scenario A/B — where Approve lands depends on whether a
  // tender is already active. Same source the Direct route reads for its
  // own resolution payload (OrderChangeReviewRoute.jsx: priorTenderStatus =
  // oc?.prior?.tenderStatus) — the payload's own record of the prior tender.
  const tender = detail?.orderChange?.prior?.tenderStatus ?? null

  // S143 Task 3 — PATCH save-stops. The navigation branch (Scenario A/B,
  // T3 — extracted into useApproveOrderChange's afterApprove, shared with
  // StopsTab's Approve Plan) only fires on success; a failed save leaves
  // the planner on this screen (saveError shown inside the routing modal,
  // T2/DEC-207) rather than navigating them away from an edit that never
  // persisted.
  function handleApprove(stopsDto, externalOrders = []) {
    setSaveError('')
    resolve.mutate(
      { sellShipment, action: 'save-stops', stops: stopsDto, externalOrders, priorTenderStatus: tender, cost: null, priorScac: null },
      {
        onSuccess: () => afterApprove(tender),
        onError: (e) => setSaveError(e.message),
      },
    )
  }

  return (
    <AppShell
      titleMode={{
        title: 'Edit Shipment Stops',
        onClose: leave(exit),
      }}
    >
      <div className="order-change order-change--edit-stops">
        <nav className="order-change__crumbs" aria-label="Breadcrumb">
          <Breadcrumb label="Shipment" onClick={leave(toShipmentTab)} />
          {/* E2 — the consolidated review's doorway says "Review Consolidated Change" (ShipmentTable, RoutingGuideTab). */}
          <Breadcrumb label="Review Consolidated Change" onClick={leave(exit)} />
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

            <ReviewKpiStrip summary={detail.stopsData.summary} changes={c.summaryChanges} />

            {/* DEC-207/LINX-15872 (T2) — a failed Approve is shown INSIDE the
                routing modal (EditStopsView passes it to ViewRoutingModal's
                `error`), not as a page-level Alert: the modal is what stays
                open, so that's where the planner sees why it failed. */}
            <EditStopsView
              key={sellShipment}
              stops={detail.stopsData.stops}
              consolidation={c}
              orders={detail.orderDetails}
              orderChange={detail.orderChange}
              summary={detail.stopsData.summary}
              saving={resolve.isPending}
              saveError={saveError}
              onApprove={handleApprove}
              onCancel={exit}
              cancelRef={cancelRef}
              sellShipment={sellShipment}
              customerId={detail.customerId}
              customerName={detail.customerName}
            />
          </div>
        )}
      </div>
    </AppShell>
  )
}
