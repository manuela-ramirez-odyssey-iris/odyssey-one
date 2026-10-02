import { useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import { Breadcrumb, Button, EmptyState, PageHeader, Spinner } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import EditStopsView from '../../components/detail/order-change/EditStopsView.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import { initFromSources } from '../../components/detail/order-change/stopsSandbox.js'
import ConsolidationSummary from '../../components/consolidation/ConsolidationSummary.jsx'
import SelectedShipmentsTable from '../../components/consolidation/SelectedShipmentsTable.jsx'
import ConsolidationApplyModal from '../../components/consolidation/ConsolidationApplyModal.jsx'
import { useTenderedCheck } from '../../components/consolidation/useTenderedCheck.js'
import { getSellShipmentDetail } from '../../api/services/shipmentService'
import { shipmentDetailQueryKey } from '../../api/queries/useShipmentDetail'
import { useApplyConsolidation } from '../../api/queries/useApplyConsolidation'
import { routingOptionVmToDto } from '../../api/mappers/mapSellShipmentOutToDetail'
import useSheet from '../useSheet'
import { hasActivePriorTender } from './useApproveOrderChange.js'
import '../../components/shipments/order-change/order-change.css'

// Manual consolidation — /shipments/consolidate/stops (CNS-19; Jana 2026-09-29
// `Order Change Sync.vtt` @34:06: "you don't have the prior… directly you start
// from new, rest of the page exactly remains the same").
//
// Reuses the order-change EDITOR (EditStopsView + stopsSandbox) but not order
// change: no detail.orderChange is read or written and the order-change API is
// never called. A consolidation creates a NEW C, so there is no Prior; until
// Apply the C is a sandbox built from the selected pool shipments. Input is
// location.state.rows (the mode's selection, or one Consolidation row from the
// row menu, S1.5, or from any C's Stops tab, LINX-15873 B3 `from: 'stops'`).
const NO_ROWS = []
const noop = () => {}

export default function ConsolidateStopsRoute() {
  const location = useLocation()
  const { closeSheet } = useSheet()
  // The rows the sandbox was built from — fixed for this visit, so a tender
  // Remove (which edits `rows`) never re-initializes the editor.
  const [initialRows] = useState(() => location.state?.rows ?? [])
  // Tender check's copy of the selection: Remove/Cancel edit it (S6.3).
  const [rows, setRows] = useState(initialRows)
  // S1.5 — one Consolidation row opened from the row menu: leaving goes to the
  // plain list, not back into a mode nobody entered. LINX-15873 C1: any C, in
  // the pool or not (the Stops tab's Edit Shipment Stops).
  const editingC = initialRows.length === 1 && initialRows[0].shipmentType === 'Consolidation'
  const fromStops = location.state?.from === 'stops'
  const apply = useApplyConsolidation()

  const queries = useQueries({
    queries: initialRows.map((r) => ({
      queryKey: shipmentDetailQueryKey(r.sellShipment),
      queryFn: () => getSellShipmentDetail(r.sellShipment),
    })),
  })
  const loading = queries.some((q) => q.isPending)
  const failed = queries.some((q) => q.isError)
  const details = queries.map((q) => q.data)
  const anchor = details[0]

  // Unmemoized: EditStopsView consumes `initial` once (a useState initializer)
  // and reads `orders` by content.
  const sources = loading || failed ? null : initialRows.map((row, i) => ({ row, detail: details[i] }))
  const initial = sources ? initFromSources(sources) : null
  const orders = sources ? sources.flatMap((s) => s.detail.orderDetails) : []
  const tenderList = useMemo(
    () => (anchor?.routingData?.options ?? []).map(routingOptionVmToDto).map((o) => ({ ...o, status: '' })),
    [anchor],
  )

  // LINX-15873 C3 — the edited C's own live tender (Sent/Accepted; To Be
  // Tendered isn't one): Yes keeps it and re-sends to the same carrier, No
  // cancels it (user R3). Read off the detail's tender OPTIONS, the same source
  // the server's 400 guard uses — the row's tenderStatus can be stale, and a
  // disagreement would leave the planner a 400 with no question to answer.
  const activeTender = editingC ? anchor?.routingData?.options?.find((o) => hasActivePriorTender(o.status)) ?? null : null
  const [tenderAsk, setTenderAsk] = useState(null) // { external } while the Active Tender question is up
  const tenderDecision = useRef(null) // 'keep' | 'cancel' | null, read by the write

  // Zero-arg on purpose — these are click handlers.
  // LINX-15873 C2 — opened from a C's Stops tab: every exit returns there.
  const toStopsTab = () => closeSheet('/shipments', { state: { selectedShipmentId: initialRows[0].sellShipment, requestedTab: { key: 'stops' } } })
  const toMode = (rowsBack) => (fromStops ? toStopsTab() : closeSheet('/shipments', { state: editingC ? undefined : { consolidate: { rows: rowsBack } } }))
  const backToMode = () => toMode(rows)
  const exitMode = () => (fromStops ? toStopsTab() : closeSheet('/shipments', { state: { consolidateExit: true } }))

  // E1 — X, crumbs and Cancel leave through the editor's dirty check.
  const cancelRef = useRef(null)
  const actionsRef = useRef(null)
  const leave = (to) => () => (cancelRef.current ? cancelRef.current(to) : to())

  const check = useTenderedCheck({
    // LINX-15873 C3 — a C being edited never trips Tendered Shipment Detected
    // on itself (its tender is the Active Tender question); external orders'
    // sources are still checked.
    rows: editingC ? NO_ROWS : rows,
    setRows: editingC ? noop : setRows,
    details: Object.fromEntries(initialRows.map((r, i) => [r.sellShipment, details[i]])),
    onRemove: (ids) => actionsRef.current?.removeOrders(ids),
    onDiscard: toMode,
    onProceed: () => {
      const p = actionsRef.current.payload()
      // Every source stays in sellShipments even after a tender Remove: a
      // removed source's orders are left pending (untouched, stays in the pool
      // — S7.4) and merged stops may still name it as their source.
      apply.mutate(
        {
          sellShipments: initialRows.map((r) => r.sellShipment),
          stops: p.stops,
          externalOrders: p.externalOrders.map(({ orderNumber, sourceSellShipment }) => ({ orderNumber, sourceSellShipment })),
          tenderList: p.tenderList,
          tenderDecision: tenderDecision.current,
        },
        {
          // S8.1 — land on the tab the C was filed under; ShipmentsRoute pins + animates the row.
          // LINX-15873 C4 — an edited C isn't new (no pin/animation): it's selected on the tab
          // it was filed under (keep -> Monitoring > Sent), Tender tab open after a tender
          // answer, Stops tab otherwise.
          onSuccess: ({ row }) => closeSheet('/shipments', {
            state: editingC
              ? { selectedShipmentId: row.sellShipment, requestedTab: { key: tenderDecision.current ? 'routing' : 'stops' }, panel: 'monitoring', tab: row.category }
              : { consolidateExit: true, createdShipment: row, panel: 'monitoring', tab: row.category },
          }),
        },
      )
    },
  })

  const shell = (body) => (
    <AppShell titleMode={{ title: editingC ? 'Edit Consolidation' : 'Manual Consolidation', onClose: leave(editingC ? exitMode : backToMode) }} sidebarHidden>
      <div className="order-change order-change--edit-stops">{body}</div>
    </AppShell>
  )

  if (!initialRows.length) {
    return shell(
      <>
        <EmptyState icon={<Inbox size={32} />} message="No consolidation to edit." />
        <div><Button variant="secondary" onClick={exitMode}>Back to Shipments</Button></div>
      </>,
    )
  }

  const headerTitle = editingC && anchor?.odysseyShipmentIdentifier ? `Shipment ${anchor.odysseyShipmentIdentifier}` : 'Review & Apply Manual Consolidation'

  return shell(
    <>
      <nav className="order-change__crumbs" aria-label="Breadcrumb">
        <Breadcrumb label={editingC ? 'Shipments' : 'Shipments Consolidation'} onClick={leave(backToMode)} />
        <Breadcrumb label="Edit Shipment Stops" current />
      </nav>
      {loading ? (
        <div className="order-change__status"><Spinner size={24} /></div>
      ) : failed ? (
        <div className="order-change__status">
          <span className="text-label-sm-regular">Something went wrong loading the selected shipments.</span>
          <Button variant="secondary" size="sm" onClick={() => queries.forEach((q) => q.isError && q.refetch())}>Retry</Button>
        </div>
      ) : (
        <div className="order-change__content">
          <PageHeader title={headerTitle} />
          <EditStopsView
            initial={initial}
            summaryTop={<ConsolidationSummary customerName={anchor.customerName} customerId={anchor.customerId} rows={rows} />}
            // User 2026-10-01: editing one C has no "Selected shipments to consolidate" table.
            afterStrip={editingC ? null : <SelectedShipmentsTable rows={rows} />}
            // Disabled while the async tender check or the write runs (S6.1: the old page's checkingApply).
            saving={check.checking || apply.isPending}
            orders={orders}
            tenderList={tenderList}
            summary={{ headerDistance: anchor.stopsData.summary.headerDistance, seedEquipment: anchor.stopsData.summary.seedEquipment }}
            equipmentCode={initialRows[0].equipmentCode}
            showPrior={false}
            minOrders={2}
            confirmApprove={false}
            approveLabel="Apply Consolidation"
            // The Apply modal owns the write's state; the routing modal stays open underneath.
            onApprove={(_dto, external) => {
              tenderDecision.current = null
              if (activeTender) setTenderAsk({ external })
              else check.open(external)
            }}
            onCancel={backToMode}
            cancelRef={cancelRef}
            actionsRef={actionsRef}
            blockCRows
            sellShipment={initialRows[0].sellShipment}
            customerId={anchor.customerId}
            customerName={anchor.customerName}
          />
        </div>
      )}
      {tenderAsk && (
        // LINX-15873 C3 (Jana grooming; R4: Yes/No only, no Bypass). The X only
        // dismisses — "No" cancels a live tender, so it isn't the safe exit.
        <ConfirmDialog
          title="Active Tender"
          message={`This shipment is tendered to ${activeTender.scac} (${activeTender.status}). Keep the tender and send the updated shipment to ${activeTender.scac}?`}
          confirmLabel={`Yes, send to ${activeTender.scac}`}
          cancelLabel="No, choose another carrier"
          onConfirm={() => { tenderDecision.current = 'keep'; setTenderAsk(null); check.open(tenderAsk.external) }}
          onCancel={() => { tenderDecision.current = 'cancel'; setTenderAsk(null); check.open(tenderAsk.external) }}
          onClose={() => setTenderAsk(null)}
        />
      )}
      <ConsolidationApplyModal
        check={check}
        applying={apply.isPending}
        applyError={apply.isError ? (apply.error?.message || "Couldn't apply the consolidation. Nothing was changed.") : null}
      />
    </>,
  )
}
