import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { Breadcrumb, Button, EmptyState, PageHeader } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import OrderChangeActionsCard from '../../components/shipments/order-change/OrderChangeActionsCard'
import OrderChangeTenderLists from '../../components/shipments/order-change/OrderChangeTenderLists'
import OrderChangeTenderDetails from '../../components/shipments/order-change/OrderChangeTenderDetails'
import OrderChangeHazmat from '../../components/shipments/order-change/OrderChangeHazmat'
import { useShipmentDetail } from '../../api/queries/useShipmentDetail'
import { useResolveOrderChange } from '../../api/queries/useResolveOrderChange'
import '../../components/shipments/order-change/order-change.css'

// Review Order Change (Direct Shipment) — /shipments/order-change/:sellShipment,
// LINX-14509…14515. Reached from the shipments table's row menu, order-change
// category only (ShipmentTable.jsx: "Review Order Change" action, gated on
// row.original.category === 'order-change'). Figma 1794-5544.
//
// Shell only (Task 8): breadcrumb + header + data/resolution wiring. The
// actions card (Task 9) and the three preview sections (Task 10) are still
// `return null` stubs — this route already passes them the real `oc` payload
// so wiring them up later is additive, not a rewrite.
//
// ShipmentDetailVM (api/types/shipmentDetail.ts) carries no `buyShipment` or
// timezone field, and neither does the SellShipmentOut DTO it's mapped from
// (tools/generate.mjs's `detail` object literal — verified: only `shipmentId`
// (the sell id) is present; `buyShipment` exists solely on the shipments-table
// ROW vm, built separately as `mainRow`). Adding it to the DTO would be a wire
// -contract change requiring a regenerate/reseed, out of scope here — instead
// the row menu (ShipmentTable.jsx) threads it through nav state, read below.
// buyShipment is THE user-facing shipment ID (LINX-11591/12490,
// ColumnPanel.jsx:92) — sellShipment is the internal wire key this route is
// keyed on. state is lossy (gone on refresh/pasted URL), so the header falls
// back to an honest "Shipment {sellShipment}" rather than mislabeling the
// sell id as "Buy Shipment" when the buy number isn't known.
export default function OrderChangeReviewRoute() {
  const { sellShipment } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const buyShipment = location.state?.buyShipment
  const { data: detail, isPending, isError, refetch } = useShipmentDetail(sellShipment)
  const resolve = useResolveOrderChange()
  const oc = detail?.orderChange
  const headerTitle = buyShipment ? `Buy Shipment ${buyShipment}` : `Shipment ${sellShipment}`

  // Tender Resolution Action (LINX-14515). Every exit off this screen —
  // Cancel tender here; retender/bypass will live in OrderChangeActionsCard,
  // Task 9 — funnels through this one mutation and the same post-success nav:
  // back to the Shipments table's Order Change tab. 'order-change' lives under
  // the 'exceptions' panel (data/panelConfig.js), and ShipmentsRoute reads its
  // deep-link target off `location.state?.panel` / `location.state?.tab`
  // (ShipmentsRoute.jsx:41-46) — not `selectedShipmentId`, which is a
  // different (row-detail) deep-link the resolved shipment no longer needs.
  function finish(action, cost) {
    resolve.mutate(
      {
        sellShipment,
        action,
        priorTenderStatus: oc?.prior?.tenderStatus ?? null,
        cost,
      },
      {
        onSuccess: () => {
          navigate('/shipments', { state: { panel: 'exceptions', tab: 'order-change' } })
        },
      },
    )
  }

  return (
    <AppShell>
      <div className="order-change">
        <nav className="order-change__crumbs" aria-label="Breadcrumb">
          <Breadcrumb label="Shipment" onClick={() => navigate('/shipments')} />
          {/* 'Tender' isn't its own route — Tender lives inside the shipment
              detail's tab set, not a standalone page — so this segment is
              decorative only (no onClick renders it as a non-interactive
              span, same as Breadcrumb's own `current` segment). */}
          <Breadcrumb label="Tender" />
          <Breadcrumb label="Review Order Change" current />
        </nav>

        {isPending ? (
          <div className="order-change__status text-label-sm-regular">Loading order change…</div>
        ) : isError ? (
          <div className="order-change__status">
            <span className="text-label-sm-regular">Something went wrong loading this shipment.</span>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !oc ? (
          // Reachable by deep-link on a shipment that never carried an order
          // change, or one already resolved out of the category — an empty
          // state beats crashing on oc.prior below.
          <EmptyState icon={<Inbox size={32} />} message="No order change to review for this shipment." />
        ) : (
          <div className="order-change__content">
            <PageHeader title={headerTitle}>
              {/* Figma shows a bordered, non-primary action here ("outline"
                  in the mock's visual language). Button.jsx's own `outline`
                  variant is documented as dark-surface-only (white text,
                  invisible on this page's light background) — `secondary` is
                  the light-surface bordered variant its own doc names for
                  this exact case, so that's what's used here. */}
              <Button variant="secondary" onClick={() => finish('cancel', null)} disabled={resolve.isPending}>
                Cancel tender
              </Button>
            </PageHeader>

            <OrderChangeActionsCard oc={oc} onAction={finish} />
            <OrderChangeTenderLists oc={oc} />

            <div className="order-change__divider text-label-sm-medium">Additional Changes Preview</div>

            <OrderChangeTenderDetails oc={oc} />
            <OrderChangeHazmat oc={oc} />
          </div>
        )}
      </div>
    </AppShell>
  )
}
