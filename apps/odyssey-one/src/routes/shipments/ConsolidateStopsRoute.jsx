import { useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import { Breadcrumb, Button, EmptyState, PageHeader, Spinner } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import EditStopsView from '../../components/detail/order-change/EditStopsView.jsx'
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
// row menu, S1.5).
export default function ConsolidateStopsRoute() {
  const location = useLocation()
  const { closeSheet } = useSheet()
  // The rows the sandbox was built from — fixed for this visit, so a tender
  // Remove (which edits `rows`) never re-initializes the editor.
  const [initialRows] = useState(() => location.state?.rows ?? [])
  // Tender check's copy of the selection: Remove/Cancel edit it (S6.3).
  const [rows, setRows] = useState(initialRows)
  // S1.5 — one Consolidation row opened from the row menu: leaving goes to the
  // plain list, not back into a mode nobody entered.
  const editingC = initialRows.length === 1 && initialRows[0].shipmentType === 'Consolidation'
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

  // Zero-arg on purpose — these are click handlers.
  const toMode = (rowsBack) => closeSheet('/shipments', { state: editingC ? undefined : { consolidate: { rows: rowsBack } } })
  const backToMode = () => toMode(rows)
  const exitMode = () => closeSheet('/shipments', { state: { consolidateExit: true } })

  // E1 — X, crumbs and Cancel leave through the editor's dirty check.
  const cancelRef = useRef(null)
  const actionsRef = useRef(null)
  const leave = (to) => () => (cancelRef.current ? cancelRef.current(to) : to())

  const check = useTenderedCheck({
    rows,
    setRows,
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
        },
        {
          // S8.1 — land on the tab the C was filed under; ShipmentsRoute pins + animates the row.
          onSuccess: ({ row }) => closeSheet('/shipments', {
            state: { consolidateExit: true, createdShipment: row, panel: 'monitoring', tab: row.category },
          }),
        },
      )
    },
  })

  const shell = (body) => (
    <AppShell titleMode={{ title: 'Manual Consolidation', onClose: leave(editingC ? exitMode : backToMode) }} sidebarHidden>
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
            afterStrip={<SelectedShipmentsTable rows={rows} />}
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
            onApprove={(_dto, external) => check.open(external)}
            onCancel={backToMode}
            cancelRef={cancelRef}
            actionsRef={actionsRef}
            sellShipment={initialRows[0].sellShipment}
            customerId={anchor.customerId}
            customerName={anchor.customerName}
          />
        </div>
      )}
      <ConsolidationApplyModal
        check={check}
        applying={apply.isPending}
        applyError={apply.isError ? (apply.error?.message || "Couldn't apply the consolidation. Nothing was changed.") : null}
      />
    </>,
  )
}
