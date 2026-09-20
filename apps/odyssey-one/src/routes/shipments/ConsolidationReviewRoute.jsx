import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { Inbox, MapPin } from 'lucide-react'
import { Alert, Badge, Breadcrumb, Button, Checkbox, DataTable, EmptyState, PageHeader, StepperButtonsFooter, SubAccordion, SummaryStrip, Timeline } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import { COLUMN_CONFIG } from '../../components/shipments/ShipmentTable'
import { getSellShipmentDetail } from '../../api/services/shipmentService'
import { shipmentDetailQueryKey } from '../../api/queries/useShipmentDetail'
import { buildProposal } from '../../consolidation/proposal'
import useSlideRoute from './useSlideRoute'
import '../../components/shipments/order-change/order-change.css'
import './consolidation-review.css'
import '../../styles/slide-route.css'

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

// checkedIds: Set of row.id INCLUDED in the consolidation. Unchecking a row
// never removes it from the table — it stays visible, grayed (CSS, keyed off
// TanStack rowSelection → data-selected, see consolidation-review.css) — so
// the planner can put it back.
function SelectedShipmentsTable({ rows, checkedIds, onToggle, onToggleAll }) {
  const columns = useMemo(() => {
    const selectColumn = columnHelper.display({
      id: 'select',
      enableSorting: false,
      header: () => {
        const allChecked = rows.length > 0 && rows.every((r) => checkedIds.has(r.id))
        const someChecked = rows.some((r) => checkedIds.has(r.id))
        return (
          <Checkbox
            showLabel={false}
            aria-label="Include all shipments to consolidate"
            checked={allChecked}
            indeterminate={someChecked && !allChecked}
            onChange={(e) => onToggleAll(e.target.checked)}
          />
        )
      },
      cell: ({ row }) => {
        const r = row.original
        return (
          <Checkbox
            showLabel={false}
            aria-label={`Include ${r.buyShipment || r.sellShipment}`}
            checked={checkedIds.has(r.id)}
            onChange={(e) => onToggle(r.id, e.target.checked)}
          />
        )
      },
      meta: { fixedWidth: true },
    })
    const dataCols = REVIEW_COLUMNS.map((key) => {
      const cfg = COLUMN_BY_KEY[key]
      return columnHelper.accessor(key, {
        id: key,
        header: cfg?.label ?? key,
        cell: cfg?.render ? ({ row }) => cfg.render(row.original) : ({ getValue }) => getValue() ?? '—',
        enableSorting: false,
      })
    })
    return [selectColumn, ...dataCols]
  }, [rows, checkedIds, onToggle, onToggleAll])

  // rowSelection is CONTROLLED from checkedIds so row.getIsSelected() (and the
  // DataTable-owned data-selected attribute) reflects INCLUDED, not excluded.
  const rowSelection = useMemo(
    () => Object.fromEntries([...checkedIds].map((id) => [id, true])),
    [checkedIds],
  )
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (r) => r.id,
    state: { rowSelection },
    enableRowSelection: true,
  })
  return <DataTable table={table} ariaLabel="Selected shipments to consolidate" truncationTooltip />
}

export default function ConsolidationReviewRoute() {
  const location = useLocation()
  const { className: slideClassName, leaveTo } = useSlideRoute()
  const rows = location.state?.rows ?? []
  const [pending, setPending] = useState(null) // 'apply' | 'cancel' | null
  // Checked = INCLUDED in the consolidation. Every row starts checked;
  // unchecking trims the consolidation without hiding the row (S154).
  const [checkedIds, setCheckedIds] = useState(() => new Set(rows.map((r) => r.id)))
  const toggleChecked = (id, checked) => setCheckedIds((prev) => {
    const next = new Set(prev)
    if (checked) next.add(id); else next.delete(id)
    return next
  })
  const toggleAllChecked = (checked) => setCheckedIds(checked ? new Set(rows.map((r) => r.id)) : new Set())

  // Volume and hazmat live on the detail, not the grid row (proposal.js).
  const detailQueries = useQueries({
    queries: rows.map((r) => ({
      queryKey: shipmentDetailQueryKey(r.sellShipment),
      queryFn: () => getSellShipmentDetail(r.sellShipment),
    })),
  })
  const details = detailQueries.map((q) => q.data)
  // Everything on this screen — totals, stops, chips, the error banner — is
  // derived from the CHECKED subset only (S154): an excluded row stops
  // counting the moment it's unchecked, even though it stays in the table.
  const checkedIdx = rows.map((_, i) => i).filter((i) => checkedIds.has(rows[i].id))
  const checkedRows = checkedIdx.map((i) => rows[i])
  const checkedDetails = checkedIdx.map((i) => details[i])
  const detailsFailed = checkedIdx.some((i) => detailQueries[i].isError)
  // buildProposal is a cheap reduce over a handful of rows — no memo needed.
  const proposal = buildProposal(checkedRows, checkedDetails)

  const backInMode = () => leaveTo('/shipments', { state: { consolidate: { rows: checkedRows } } })
  const leave = () => leaveTo('/shipments')

  if (!rows.length) {
    return (
      <AppShell titleMode={{ title: 'Manual Consolidation', onClose: leave }} sidebarHidden>
        <div className={`order-change ${slideClassName}`}>
          <EmptyState icon={<Inbox size={32} />} message="No consolidation to review." />
          <div><Button variant="secondary" onClick={leave}>Back to Shipments</Button></div>
        </div>
      </AppShell>
    )
  }

  const timelineItems = proposal.stops.map((s) => ({
    key: s.key,
    label: s.label,
    // S154: the VD's marker pills are SOLID with white text, not the
    // outlined "pending" skin — `completed` is already exactly the delivery
    // marker (Caribbean Green/600 + white); pickup reuses it as its base and
    // gets re-tinted blue by a scoped CSS rule (Timeline forwards
    // badgeClassName to StopBadge). No status circle — these are planned
    // stops, not tracked progress.
    status: 'completed',
    showStatusBadge: false,
    badgeClassName: s.type === 'pickup' ? 'consolidation-review__stop-badge--pickup' : undefined,
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
    // sidebarHidden: the VD (2249:46444) shows no rail, and this screen
    // continues consolidate mode from /shipments, which already hid it —
    // it should stay hidden for the rest of the flow.
    <AppShell titleMode={{ title: 'Manual Consolidation', onClose: backInMode }} sidebarHidden>
      <div className={`order-change consolidation-review ${slideClassName}`}>
        <nav className="order-change__crumbs" aria-label="Breadcrumb">
          <Breadcrumb label="Shipments Consolidation" onClick={backInMode} />
          <Breadcrumb label="Review & Apply" current />
        </nav>

        <PageHeader title="Review & Apply Manual Consolidation" />

        <div className="consolidation-review__body">
          <aside className="consolidation-review__side">
            <h2 className="text-heading-xl-semibold consolidation-review__side-title">Proposed Stop Count &amp; Sequence</h2>
            <div className="consolidation-review__counts">
              <div className="consolidation-review__count consolidation-review__count--pickup">
                <MapPin size={16} />
                <span className="text-label-sm-medium">{proposal.pickupCount} Pickup Stops</span>
              </div>
              <div className="consolidation-review__count consolidation-review__count--delivery">
                <MapPin size={16} />
                <span className="text-label-sm-medium">{proposal.deliveryCount} Delivery Stops</span>
              </div>
            </div>
            <h3 className="text-label-base-semibold consolidation-review__stops-heading">Planned Stops</h3>
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
                <span className="text-label-xs-regular consolidation-review__label">Selected Shipments ({checkedRows.length})</span>
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
              background={false}
              items={[
                { label: 'Total Weight', value: fmtLb(proposal.weightLb) },
                { label: 'Weight Utilization', value: fmtPct(proposal.weightUtilization) },
                { label: 'Total Volume', value: fmtCuft(proposal.volumeCuft) },
                { label: 'Volume Utilization', value: fmtPct(proposal.volumeUtilization) },
                { label: 'Hazmat', value: proposal.hazmat == null ? '--' : (proposal.hazmat ? 'Yes' : 'No'), tone: proposal.hazmat ? 'negative' : undefined },
              ]}
            />
            <SubAccordion
              title="Selected shipments to consolidate"
              collapsible={false}
              action={
                <Button variant="secondary" size="sm" onClick={backInMode}>Modify Whole Selection</Button>
              }
            >
              <div className="consolidation-review__table-count text-label-sm-regular">{rows.length} items</div>
              <SelectedShipmentsTable rows={rows} checkedIds={checkedIds} onToggle={toggleChecked} onToggleAll={toggleAllChecked} />
            </SubAccordion>
          </section>
        </div>

        <div className="consolidation-review__footer">
          <StepperButtonsFooter
            cancelLabel="Cancel and Modify Selection"
            primaryLabel="Apply Consolidation"
            showSave={false}
            primaryDisabled={checkedRows.length < 2}
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
