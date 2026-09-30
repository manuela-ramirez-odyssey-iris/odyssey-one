import { useMemo } from 'react'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { Trash2, Replace } from 'lucide-react'
import { Alert, Badge, Button, DataTable, ModalMedium, Radio } from '@odyssey/ui'
import { StatusBadge as TenderStatusBadge } from '../detail/RoutingGuideTab.jsx'
import { ACTIVE_TENDER, tenderedErrorMessage } from './useTenderedCheck.js'
import './consolidation-apply.css'

const columnHelper = createColumnHelper()

// The small table inside the Tendered Shipment Detected modal (B3) — every row
// in the consolidation (the selected sources and any external order's source
// shipment), so the planner sees which one(s) tripped the check next to the
// ones that didn't.
function TenderedCheckTable({ rows }) {
  const columns = useMemo(() => [
    columnHelper.display({
      id: 'tenderedStatus',
      header: 'Shipment Status',
      // Same badge + wording as the Tender table (e.g. "Accepted", "Sent") — user, 2026-09-27.
      cell: ({ row }) => (ACTIVE_TENDER.has(row.original.tenderStatus)
        ? <span data-tendered><TenderStatusBadge status={row.original.tenderStatus} /></span>
        : null),
    }),
    columnHelper.accessor('odysseyShipmentIdentifier', { header: 'Odyssey Shipment ID' }),
    columnHelper.accessor('customerId', { header: 'Customer ID(s)' }),
    columnHelper.display({
      id: 'orderNumber',
      header: 'Order Number',
      cell: ({ row }) => (
        <div className="consolidation-apply__chips">
          {(row.original.orders ?? []).map((o) => <Badge key={o} variant="amber">{o}</Badge>)}
        </div>
      ),
    }),
    columnHelper.accessor('pickupDate', { header: 'Pickup Date' }),
  ], [])
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel(), getRowId: (r) => r.id })
  // Tendered rows read as errors — red cell text (user, 2026-09-27; CSS keys off [data-tendered]).
  return <div className="consolidation-apply__tendered-table"><DataTable table={table} ariaLabel="Shipments in this consolidation" truncationTooltip /></div>
}

/**
 * B4 follow-up (user ruling item 3): ONE modal, Confirm <-> Tendered-error.
 * Extracted from the retired Review & Apply page (CNS-19, S6.1); state lives in
 * useTenderedCheck. `applying`/`applyError` are the write's own (S6.4) — the
 * modal stays open through it and shows the error in place.
 */
export default function ConsolidationApplyModal({ check, applying = false, applyError = null }) {
  const { modal, tenderedRows, checkRows, remaining, canRemove } = check
  if (!modal) return null
  const error = modal.phase === 'error'
  const radioOptions = error && (canRemove
    ? [
        { value: 'remove', label: `Remove tendered shipment(s) and proceed with the remaining ${remaining}.`, Icon: Trash2 },
        { value: 'cancelTender', label: 'Cancel tender on the accepted shipments and continue consolidation.', Icon: Replace },
      ]
    : [
        { value: 'discard', label: 'Discard consolidation and select different shipments. Consolidation requires at least 2 shipments.', Icon: Trash2 },
        { value: 'cancelTender', label: 'Cancel tender on the accepted shipment and continue consolidation.', Icon: Replace },
      ])
  return (
    <ModalMedium
      title={error ? 'Tendered Shipment Detected' : 'Apply Consolidation'}
      onClose={applying ? undefined : check.close}
      footer={error ? (
        <>
          <Button variant="secondary" onClick={check.close}>Nevermind</Button>
          <Button onClick={check.applySolution} disabled={check.busy}>Apply Solution</Button>
        </>
      ) : (
        <>
          <Button variant="secondary" onClick={check.close} disabled={applying}>Cancel</Button>
          <Button onClick={check.confirm} disabled={applying || check.busy}>{applying ? 'Applying…' : 'Apply Consolidation'}</Button>
        </>
      )}
    >
      {error ? (
        <Alert variant="error" showClose={false}>
          {tenderedRows.length} Error(s): {tenderedErrorMessage(tenderedRows)}
        </Alert>
      ) : modal.alert ? (
        <Alert variant="success" showClose={false}>{modal.alert}</Alert>
      ) : (
        <p className="text-label-sm-regular">Are you sure you want to apply the proposed consolidation?</p>
      )}
      {check.error && <Alert variant="error" showClose={false}>{check.error}</Alert>}
      {applyError && !error && <Alert variant="error" showClose={false}>{applyError}</Alert>}
      <TenderedCheckTable rows={checkRows} />
      {/* Local markup, not @odyssey/ui — Figma's radio cards (2808:53668 /
          2808:58194) are detached frames, so this is a normalization
          candidate once a real master exists, not a component yet. */}
      {radioOptions && (
        <div className="consolidation-apply__radio-cards">
          {radioOptions.map((opt) => {
            const OptionIcon = opt.Icon
            return (
              <label key={opt.value} className="consolidation-apply__radio-card" data-selected={modal.action === opt.value || undefined}>
                <Radio
                  checked={modal.action === opt.value}
                  onChange={() => check.setAction(opt.value)}
                  name="tender-check-action"
                  value={opt.value}
                  showLabel={false}
                />
                <OptionIcon size={20} aria-hidden="true" />
                <span className="text-label-sm-medium">{opt.label}</span>
              </label>
            )
          })}
        </div>
      )}
    </ModalMedium>
  )
}
