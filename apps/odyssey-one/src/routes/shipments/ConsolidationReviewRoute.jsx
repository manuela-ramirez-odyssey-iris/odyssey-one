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
import { useApplyConsolidation } from '../../api/queries/useApplyConsolidation'
import { buildProposal } from '../../consolidation/proposal'
import useSheet from '../useSheet'
import '../../components/shipments/order-change/order-change.css'
import './consolidation-review.css'

// Review & Apply Manual Consolidation — /shipments/consolidate/review
// (LINX-15787; VD x38TOJGsNryYl3LsKhCtSc node 2249:46444). Input is the
// selection ShipmentsRoute's consolidate mode hands over in
// location.state.rows; nothing is fetched to render the page except each
// shipment's detail, for volume and hazmat. Apply (S155) creates the `C…`
// shipment through useApplyConsolidation and turns this page into a read-only
// preview of what it made.

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
function SelectedShipmentsTable({ rows, checkedIds, onToggle, onToggleAll, readOnly = false }) {
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
      // sticky-left so the include/exclude control survives the table's
      // horizontal scroll — the one control the planner reaches for (S155 §1.5).
      meta: { fixedWidth: true, sticky: 'left' },
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
    // Applied: there is nothing left to include or exclude, so the column goes
    // rather than rendering dead checkboxes (S155 §2.6).
    return readOnly ? dataCols : [selectColumn, ...dataCols]
  }, [rows, checkedIds, onToggle, onToggleAll, readOnly])

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
  const { closeSheet } = useSheet()
  const rows = location.state?.rows ?? []
  const [pending, setPending] = useState(null) // 'apply' | 'cancel' | null
  // The rows a refused toggle tried to uncheck (S155 §2.4) — null when the
  // minimum-two dialog is closed. Carried so "Modify Selection" can leave with
  // the planner's INTENT (the set minus those rows), not the set they were
  // stuck with.
  const [blockedUncheck, setBlockedUncheck] = useState(null)
  const apply = useApplyConsolidation()
  const applied = apply.data ?? null
  const [alertDismissed, setAlertDismissed] = useState(false)
  // Checked = INCLUDED in the consolidation. Every row starts checked;
  // unchecking trims the consolidation without hiding the row (S154).
  const [checkedIds, setCheckedIds] = useState(() => new Set(rows.map((r) => r.id)))
  // A consolidation needs at least two shipments (LINX-15787), so a toggle that
  // would drop below two is REFUSED rather than disabling the last checkbox:
  // the planner's real intent is to change the selection, and the dialog is
  // what routes them there. Guarded in ONE place so the row checkbox and the
  // header checkbox can never disagree.
  const guardMinimum = (nextIds, tried) => {
    if (nextIds.size >= 2) { setCheckedIds(nextIds); return }
    setBlockedUncheck(tried)
  }
  const toggleChecked = (id, checked) => {
    const next = new Set(checkedIds)
    if (checked) { next.add(id); setCheckedIds(next); return }
    next.delete(id)
    guardMinimum(next, [id])
  }
  const toggleAllChecked = (checked) => {
    if (checked) { setCheckedIds(new Set(rows.map((r) => r.id))); return }
    guardMinimum(new Set(), [...checkedIds])
  }

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

  // Zero-arg on purpose — these are click handlers, and a default parameter
  // would swallow the event object as its argument.
  const backInModeWith = (rowsBack) => closeSheet('/shipments', { state: { consolidate: { rows: rowsBack } } })
  const backInMode = () => backInModeWith(checkedRows)
  // `consolidateExit: true` (S158 plan §4) — ShipmentsRoute stays MOUNTED
  // under this sheet, so leaving here must explicitly tell it to exit
  // consolidate mode (restoring its prior panel/filters); a full remount used
  // to do that silently by resetting everything to defaults.
  const leave = () => closeSheet('/shipments', { state: { consolidateExit: true } })
  const viewCreated = () => closeSheet('/shipments', { state: { consolidateExit: true, createdShipment: applied.row } })

  if (!rows.length) {
    return (
      <AppShell titleMode={{ title: 'Manual Consolidation', onClose: leave }} sidebarHidden>
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
    <AppShell titleMode={{ title: 'Manual Consolidation', onClose: applied ? leave : backInMode }} sidebarHidden>
      <div className="order-change consolidation-review">
        <nav className="order-change__crumbs" aria-label="Breadcrumb">
          <Breadcrumb label="Shipments Consolidation" onClick={applied ? leave : backInMode} />
          <Breadcrumb label={applied ? `Review ${applied.row.odysseyShipmentIdentifier}` : 'Review & Apply'} current />
        </nav>

        {/* Outcome banners sit ABOVE the header (VD): the result of the action
            the planner just took outranks the page's own title. */}
        {applied && !alertDismissed && (
          <Alert
            variant="success"
            showLink
            linkLabel="View Shipment"
            onLinkClick={viewCreated}
            onClose={() => setAlertDismissed(true)}
          >
            Consolidation Successfully Applied! Consolidation ID: {applied.row.odysseyShipmentIdentifier}. {checkedRows.length} Shipments successfully consolidated.
          </Alert>
        )}
        {apply.isError && (
          <Alert variant="error" showClose={false}>
            {apply.error?.message || "Couldn't apply the consolidation. Nothing was changed."}
          </Alert>
        )}

        <PageHeader title={applied ? `Review ${applied.row.odysseyShipmentIdentifier}` : 'Review & Apply Manual Consolidation'} />

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
            <Timeline items={timelineItems} animate aria-label="Planned stops" />
          </aside>

          <section className="consolidation-review__main">
            <h2 className="text-heading-xl-semibold">Consolidation Summary</h2>
            {/* Same strip molecule as the metrics below, backgroundless — one
                label/value idea on the page instead of a bespoke grid (S155 §2.2).
                The identifier list rides through as a NODE value. */}
            <SummaryStrip
              className="consolidation-review__strip consolidation-review__info-strip"
              background={false}
              aria-label="Consolidation summary"
              items={[
                { label: 'Customer Name', value: proposal.customerName || proposal.customerId || '--' },
                {
                  label: `Selected Shipments (${checkedRows.length})`,
                  value: (
                    <div className="consolidation-review__chips">
                      {proposal.identifiers.map((id) => <Badge key={id} variant="purple">{id}</Badge>)}
                    </div>
                  ),
                },
              ]}
            />
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
            {/* The accordion's action slot is empty since S155: "Edit
                Consolidation" in the footer is the one way back. */}
            <SubAccordion title="Selected shipments to consolidate" collapsible={false}>
              <div className="consolidation-review__table-count text-label-sm-regular">{rows.length} items</div>
              <SelectedShipmentsTable rows={rows} checkedIds={checkedIds} onToggle={toggleChecked} onToggleAll={toggleAllChecked} readOnly={!!applied} />
            </SubAccordion>
          </section>
        </div>

        {applied ? (
            <StepperButtonsFooter
              className="consolidation-review__footer"
              cancelLabel="Back to Shipments"
              primaryLabel="Edit Consolidated Shipment"
              showSave={false}
              // Same exit as the banner's "View Shipment" (user, 2026-09-21):
              // both land on Shipments with the new row pinned + highlighted.
              onCancel={viewCreated}
              // The created C… row goes back into consolidate mode as the
              // anchor selection — a consolidation is itself a source (§3.3,
              // CNS-09 id reuse).
              onPrimary={() => backInModeWith([applied.row])}
            />
          ) : (
            <StepperButtonsFooter
              className="consolidation-review__footer"
              cancelLabel="Cancel Consolidation"
              showSave
              saveLabel="Edit Consolidation"
              primaryLabel="Apply Consolidation"
              primaryDisabled={checkedRows.length < 2}
              saving={apply.isPending}
              onCancel={() => setPending('cancel')}
              onSave={backInMode}
              onPrimary={() => setPending('apply')}
            />
          )}

        {blockedUncheck && (
          <ConfirmDialog
            title="Minimum Two Shipments"
            message="A consolidation needs at least two shipments. To change the selection, go back to Shipments Consolidation and modify it."
            confirmLabel="Modify Selection"
            cancelLabel="Stay"
            // Leave with what the planner ASKED for — the rows they tried to
            // uncheck are gone, even though the toggle itself was refused.
            onConfirm={() => backInModeWith(checkedRows.filter((r) => !blockedUncheck.includes(r.id)))}
            onCancel={() => setBlockedUncheck(null)}
          />
        )}
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
            message={
              <>
                <p className="text-label-sm-regular">Are you sure you want to apply the proposed consolidation?</p>
                <div className="consolidation-review__chips">
                  {proposal.identifiers.map((id) => <Badge key={id} variant="purple">{id}</Badge>)}
                </div>
              </>
            }
            confirmLabel="Yes, Apply"
            cancelLabel="No"
            onConfirm={() => {
              setPending(null)
              apply.mutate({ sellShipments: checkedRows.map((r) => r.sellShipment) })
            }}
            onCancel={() => setPending(null)}
          />
        )}
      </div>
    </AppShell>
  )
}
