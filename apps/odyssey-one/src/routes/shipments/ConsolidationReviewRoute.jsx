import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { Inbox, MapPin, Pencil } from 'lucide-react'
import { Alert, Badge, Breadcrumb, Button, DataTable, EmptyState, PageHeader, StepperButtonsFooter, SubAccordion, SummaryStrip, Timeline } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import { COLUMN_CONFIG } from '../../components/shipments/ShipmentTable'
import { getSellShipmentDetail } from '../../api/services/shipmentService'
import { shipmentDetailQueryKey } from '../../api/queries/useShipmentDetail'
import { buildProposal } from '../../consolidation/proposal'
import '../../components/shipments/order-change/order-change.css'
import './consolidation-review.css'

// Review & Apply Manual Consolidation — /shipments/consolidate/review
// (LINX-15787; VD x38TOJGsNryYl3LsKhCtSc node 2249:46444). Input is the
// selection ShipmentsRoute's consolidate mode hands over in
// location.state.rows; nothing is fetched to render the page except each
// shipment's detail, for volume and hazmat. Apply is a confirm-dialog STUB
// this session (user ruling, Task 7 spec) — the eventual mechanics are the
// next session's work.

const COLUMN_BY_KEY = Object.fromEntries(COLUMN_CONFIG.map((c) => [c.key, c]))
const REVIEW_COLUMNS = ['buyShipment', 'customerId', 'shipmentStatus', 'orderCount', 'orders', 'pickupDate']
const columnHelper = createColumnHelper()

const fmtLb = (n) => `${Math.round(n).toLocaleString('en-US')} LB`
const fmtCuft = (n) => (n == null ? '--' : `${Math.round(n).toLocaleString('en-US')} cuft`)
const fmtPct = (n) => (n == null ? '--' : `${n}%`)

function SelectedShipmentsTable({ rows }) {
  const columns = useMemo(() => REVIEW_COLUMNS.map((key) => {
    const cfg = COLUMN_BY_KEY[key]
    return columnHelper.accessor(key, {
      id: key,
      header: cfg?.label ?? key,
      cell: cfg?.render ? ({ row }) => cfg.render(row.original) : ({ getValue }) => getValue() ?? '—',
      enableSorting: false,
    })
  }), [])
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel(), getRowId: (r) => r.id })
  return <DataTable table={table} ariaLabel="Selected shipments to consolidate" truncationTooltip />
}

export default function ConsolidationReviewRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const rows = location.state?.rows ?? []
  const [pending, setPending] = useState(null) // 'apply' | 'cancel' | null

  // Volume and hazmat live on the detail, not the grid row (proposal.js).
  const detailQueries = useQueries({
    queries: rows.map((r) => ({
      queryKey: shipmentDetailQueryKey(r.sellShipment),
      queryFn: () => getSellShipmentDetail(r.sellShipment),
    })),
  })
  const details = detailQueries.map((q) => q.data)
  const detailsFailed = detailQueries.some((q) => q.isError)
  // buildProposal is a cheap reduce over a handful of rows — no memo needed.
  const proposal = buildProposal(rows, details)

  const backInMode = () => navigate('/shipments', { state: { consolidate: { rows } } })
  const leave = () => navigate('/shipments')

  if (!rows.length) {
    return (
      <AppShell titleMode={{ title: 'Manual Consolidation', onClose: leave }}>
        <div className="order-change">
          <EmptyState icon={<Inbox size={32} />} message="No consolidation to review." />
          <div><Button variant="secondary" onClick={leave}>Back to Shipments</Button></div>
        </div>
      </AppShell>
    )
  }

  const timelineItems = proposal.stops.map((s) => ({
    key: s.key,
    label: s.label,
    // StopBadge has no "planned" skin yet — `pending` (white) is the honest
    // state for a stop that has not happened. The VD's blue/green stop pills
    // are a StopBadge variant owed to the design-system thread.
    status: 'pending',
    content: (
      <div className="consolidation-review__stop">
        <div className="consolidation-review__stop-head">
          <span className="text-label-sm-medium">{s.location}</span>
          <Badge variant={s.type === 'pickup' ? 'blue' : 'green'}>{s.type === 'pickup' ? 'Pickup' : 'Delivery'}</Badge>
        </div>
        <span className="text-label-xs-regular consolidation-review__stop-date">Scheduled: {s.date}</span>
      </div>
    ),
  }))

  return (
    <AppShell titleMode={{ title: 'Manual Consolidation', onClose: backInMode }}>
      <div className="order-change consolidation-review">
        <nav className="order-change__crumbs" aria-label="Breadcrumb">
          <Breadcrumb label="Shipments Consolidation" onClick={backInMode} />
          <Breadcrumb label="Review & Apply" current />
        </nav>

        <PageHeader title="Review & Apply Manual Consolidation">
          <Button variant="secondary" icon={<Pencil size={20} />} onClick={backInMode}>Modify Selection</Button>
        </PageHeader>

        <div className="consolidation-review__body">
          <aside className="consolidation-review__side">
            <h2 className="text-display-xs-semibold consolidation-review__side-title">Proposed Stop Count &amp; Sequence</h2>
            <div className="consolidation-review__counts">
              <Badge variant="blue" leftIcon={<MapPin size={16} />}>{proposal.pickupCount} Pickup Stops</Badge>
              <Badge variant="green" leftIcon={<MapPin size={16} />}>{proposal.deliveryCount} Delivery Stops</Badge>
            </div>
            <h3 className="text-label-md-semibold">Planned Stops</h3>
            <Timeline items={timelineItems} aria-label="Planned stops" />
          </aside>

          <section className="consolidation-review__main">
            <h2 className="text-display-xs-semibold">Consolidation Summary</h2>
            <div className="consolidation-review__info">
              <div className="consolidation-review__info-cell">
                <span className="text-label-xs-regular consolidation-review__label">Customer Name</span>
                <span className="text-label-md-semibold">{proposal.customerName || proposal.customerId || '--'}</span>
              </div>
              <div className="consolidation-review__info-cell">
                <span className="text-label-xs-regular consolidation-review__label">Selected Shipments ({rows.length})</span>
                <div className="consolidation-review__chips">
                  {proposal.identifiers.map((id) => <Badge key={id} variant="purple">{id}</Badge>)}
                </div>
              </div>
            </div>
            {detailsFailed && (
              <Alert variant="error" showClose={false}>
                Couldn't load volume and hazmat for every selected shipment. The totals below are incomplete.
              </Alert>
            )}
            {/* Weight/Weight Utilization come from the grid rows (proposal.js), not the
                per-shipment detail fetch above — a failed detail fetch doesn't affect them. */}
            <SummaryStrip
              className="consolidation-review__strip"
              items={[
                { label: 'Total Weight', value: fmtLb(proposal.weightLb) },
                { label: 'Weight Utilization', value: fmtPct(proposal.weightUtilization) },
                { label: 'Total Volume', value: fmtCuft(proposal.volumeCuft) },
                { label: 'Volume Utilization', value: fmtPct(proposal.volumeUtilization) },
                { label: 'Hazmat', value: proposal.hazmat == null ? '--' : (proposal.hazmat ? 'Yes' : 'No'), tone: proposal.hazmat ? 'negative' : undefined },
              ]}
            />
            <SubAccordion title="Selected shipments to consolidate" defaultExpanded>
              <div className="consolidation-review__table-count text-label-sm-regular">{rows.length} items</div>
              <SelectedShipmentsTable rows={rows} />
            </SubAccordion>
          </section>
        </div>

        <div className="consolidation-review__footer">
          <StepperButtonsFooter
            cancelLabel="Cancel and Modify Selection"
            primaryLabel="Apply Consolidation"
            showSave={false}
            onCancel={() => setPending('cancel')}
            onPrimary={() => setPending('apply')}
          />
        </div>

        {pending === 'cancel' && (
          <ConfirmDialog
            title="Cancel Proposed Consolidation"
            message="Are you sure you want to cancel the proposed consolidation? All the selected shipments will be removed from the proposed consolidation."
            confirmLabel="Yes, Cancel"
            cancelLabel="No"
            onConfirm={leave}
            onCancel={() => setPending(null)}
          />
        )}
        {pending === 'apply' && (
          <ConfirmDialog
            title="Apply Proposed Consolidation"
            message="Are you sure you want to apply this consolidation?"
            confirmLabel="Yes"
            cancelLabel="No"
            // ponytail: Apply is a stub — creating the consolidated shipment,
            // moving the loads and soft-deleting the emptied direct
            // shipments is the next session's work. Yes just closes the
            // dialog and stays on the page (user ruling, Task 7 spec).
            onConfirm={() => setPending(null)}
            onCancel={() => setPending(null)}
          />
        )}
      </div>
    </AppShell>
  )
}
