import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { Alert, Breadcrumb, Button, EmptyState, PageHeader } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import OrderChangeActionsCard from '../../components/shipments/order-change/OrderChangeActionsCard'
import OrderChangeTenderLists from '../../components/shipments/order-change/OrderChangeTenderLists'
import OrderChangeTenderDetails from '../../components/shipments/order-change/OrderChangeTenderDetails'
import OrderChangeHazmat from '../../components/shipments/order-change/OrderChangeHazmat'
import ViewTenderModal from '../../components/shipments/order-change/ViewTenderModal.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import { fmtDollar } from '../../utils/money'
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
// Confirm copy for the three Tender Resolution Actions (LINX-14515). The ACs
// define the ACTIONS but no dialog, so this wording is ours — each message
// states the consequence the AC does define, so the planner confirms
// something the dialog actually told them:
//   cancel   — "current tender shall be cancelled… shipment is in Review →
//              Tender Review" (AC, Cancel Tender)
//   retender — carrier kept, selected cost applied, tender status becomes
//              Sent and the carrier IS messaged (AC, Keep Carrier & Re-Tender)
//   bypass   — carrier kept, selected cost applied, prior status retained and
//              NO communication generated (AC, Keep Carrier & Bypass Tender)
// Cancel Tender uses Yes/No rather than a "Cancel" button, which in that
// dialog would read as "cancel the tender" instead of "back out".
function confirmCopy(action, cost, scac) {
  const carrier = scac || 'the current carrier'
  const at = cost?.amount != null ? ` at ${fmtDollar(cost.amount)}` : ''
  if (action === 'cancel') {
    return {
      title: 'Cancel Tender',
      message:
        'The current tender will be cancelled and this shipment returns to Tender Review for a new tender decision. Do you want to continue?',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
    }
  }
  if (action === 'retender') {
    return {
      title: 'Keep Carrier & Re-Tender',
      message: `${carrier} will be kept${at} and a new tender will be sent to the carrier, moving the tender status to Sent. Do you want to continue?`,
      confirmLabel: 'Re tender',
    }
  }
  return {
    title: 'Keep Carrier & Bypass Tender',
    message: `${carrier} will be kept${at} and the current tender status is retained. No tender communication will be sent to the carrier. Do you want to continue?`,
    confirmLabel: 'Bypass Tender',
  }
}

/**
 * Where the planner lands after a resolution — NOT one destination for all
 * three actions (S135, review vs Jana's call):
 *
 * - cancel — "Once the cancellation process is initiated, the user shall be
 *   presented with the Tender screen to proceed with the next tender
 *   decision" (LINX-14514), which Jana narrates as *"we'll go to the tender
 *   page and leave it to the user to make a decision… they would go back to
 *   the tender screen and select tender to the CTNS"*. The shipment isn't
 *   done — it's re-parked on exceptions/tender-review (OC_OUTCOMES,
 *   api/_lib/shipments.mjs) with another decision owed. So land on THAT tab
 *   and open the shipment's own Tender screen: `selectedShipmentId` opens the
 *   detail, `requestedTab` picks its tab (BottomBar.jsx:216). The tender
 *   screen's key is `routing` (TABS: `{ key: 'routing', label: 'Tender' }`) —
 *   `tender` is the Tender HISTORY tab, a different surface.
 * - retender / bypass — the review is complete and the shipment left the
 *   category, so there's nothing to open: back to the Order Change tab.
 */
export function landingFor(action, sellShipment) {
  if (action === 'cancel') {
    return {
      panel: 'exceptions',
      tab: 'tender-review',
      selectedShipmentId: sellShipment,
      requestedTab: { key: 'routing' },
    }
  }
  return { panel: 'exceptions', tab: 'order-change' }
}

export default function OrderChangeReviewRoute() {
  const { sellShipment } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const buyShipment = location.state?.buyShipment
  const { data: detail, isPending, isError, refetch } = useShipmentDetail(sellShipment)
  const resolve = useResolveOrderChange()
  const oc = detail?.orderChange
  const headerTitle = buyShipment ? `Buy Shipment ${buyShipment}` : `Shipment ${sellShipment}`

  // Task 11 follow-up — a failed resolveOrderChange previously settled
  // silently: button re-enabled, no feedback, planner left believing the
  // tender resolved when it didn't. Same shape as CreateOrderForm's
  // saveGateError (state string + Alert variant="error", cleared on the next
  // attempt and on manual dismiss) — this codebase's existing convention for
  // a failed mutation, not a new pattern.
  const [resolveError, setResolveError] = useState('')

  // Tender Resolution Action (LINX-14515). Every exit off this screen —
  // Cancel tender here; retender/bypass live in OrderChangeActionsCard (Task
  // 9) — funnels through this one mutation, but NOT through one destination:
  // where the planner lands depends on what the action left them to do (see
  // `landingFor`). ShipmentsRoute reads all four keys off `location.state`
  // (ShipmentsRoute.jsx:41-46).
  // Every action is confirmed first (S135, designer — the ACs specify no
  // dialog copy, so the wording below is ours): all three are irreversible
  // from this screen, they end the review and change carrier/cost/tender
  // status. `pending` holds the (action, cost) pair until the user confirms;
  // gating HERE rather than in the actions card means one dialog covers the
  // card's two buttons AND the header's Cancel tender, and nothing can reach
  // the mutation unconfirmed.
  const [pending, setPending] = useState(null)
  // "View Tender" (LINX-14509 — the planner may VIEW tender information while
  // the review is pending, but perform no tender actions). Deck p3 puts the
  // button beside the New Tender List; it opens a read-only modal rather than
  // navigating, so the cost selection made on this screen survives.
  const [tenderOpen, setTenderOpen] = useState(false)

  function finish(action, cost) {
    setPending({ action, cost })
  }

  function runPending() {
    const { action, cost } = pending
    setPending(null)
    setResolveError('') // clear any stale error before a fresh attempt
    resolve.mutate(
      {
        sellShipment,
        action,
        priorTenderStatus: oc?.prior?.tenderStatus ?? null,
        cost,
      },
      {
        onSuccess: () => {
          navigate('/shipments', { state: landingFor(action, sellShipment) })
        },
        onError: () => {
          setResolveError("Couldn't resolve this tender. Please try again.")
        },
      },
    )
  }

  return (
    // Title navbar (S135, designer): no GlobalSearch on the review — a static
    // "Review Order Change" title, TrailNav reduced to help + close. Close
    // leaves WITHOUT deciding (the review stays pending), back to the tab.
    <AppShell
      titleMode={{
        title: 'Review Order Change',
        onClose: () => navigate('/shipments', { state: { panel: 'exceptions', tab: 'order-change' } }),
      }}
    >
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
              <Button variant="secondary" onClick={() => setTenderOpen(true)}>
                View Tender
              </Button>
              <Button variant="secondary" onClick={() => finish('cancel', null)} disabled={resolve.isPending}>
                Cancel tender
              </Button>
            </PageHeader>

            {resolveError && (
              <Alert variant="error" onClose={() => setResolveError('')}>
                {resolveError}
              </Alert>
            )}

            <OrderChangeActionsCard oc={oc} onAction={finish} />
            <OrderChangeTenderLists oc={oc} />

            <div className="order-change__divider text-label-sm-medium">Additional Changes Preview</div>

            <OrderChangeTenderDetails oc={oc} />
            <OrderChangeHazmat oc={oc} />

            {tenderOpen && (
              <ViewTenderModal
                options={detail?.routingData?.options ?? []}
                onClose={() => setTenderOpen(false)}
              />
            )}

            {pending && (
              <ConfirmDialog
                {...confirmCopy(pending.action, pending.cost, oc?.prior?.scac)}
                onConfirm={runPending}
                onCancel={() => setPending(null)}
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
