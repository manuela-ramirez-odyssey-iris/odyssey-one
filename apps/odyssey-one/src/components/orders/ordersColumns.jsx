import { createColumnHelper } from '@tanstack/react-table'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '@odyssey/ui'

/**
 * ordersColumns — the three per-tab column-def sets for the Orders grid
 * (Jira LINX-11658/11663/11659 + Efrain's Figma tables, S94 research notes).
 * OrdersTable appends the Action column (needs row-context callbacks).
 */
const col = createColumnHelper()

// Status → Badge variant. Defined in search/orders/registry.js (pure data, no
// React) so the search preview can badge a row identically; re-exported here
// because this module has always been where the grid imports them from.
export { ORDER_STATUS_VARIANT, DRAFT_ORDER_STATUS_VARIANT } from '../../search/orders/registry'
import { ORDER_STATUS_VARIANT, DRAFT_ORDER_STATUS_VARIANT } from '../../search/orders/registry'
import { VALIDATION_ERROR_STATUSES } from '../../api/services/orderService'

const statusBadge = (label, map) =>
  label ? <Badge variant={map[label] ?? 'gray'}>{label}</Badge> : '--'

const locationCell = (loc) => (
  <div className="orders-location-cell">
    <span className="text-label-sm-medium">{loc.id}</span>
    {loc.name && <span>{loc.name}</span>}
    {loc.address && <span style={{ color: 'var(--text-tertiary)' }}>{loc.address}</span>}
  </div>
)

// ── All tab (Figma: 14 data columns, flat header) ──
export const ALL_COLUMNS = [
  col.accessor('idLabel', { header: 'Order Number' }),
  col.accessor('hazardous', {
    header: 'Hazardous',
    cell: ({ getValue }) => getValue()
      ? <Badge variant="amber" leftIcon={<TriangleAlert size={12} />}>Hazmat</Badge>
      : '-',
  }),
  col.accessor('orderSource', { header: 'Order Source' }),
  col.accessor('status', {
    header: 'Order Status',
    cell: ({ getValue }) => statusBadge(getValue(), ORDER_STATUS_VARIANT),
  }),
  col.accessor('customer', {
    header: 'Customer',
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  col.accessor('shipDirection', { header: 'Ship Direction' }),
  col.accessor('freightTerms', { header: 'Freight Terms' }),
  col.accessor('equipment', { header: 'Equipment' }),
  col.accessor('shipperLocation', {
    header: 'Shipper Location',
    cell: ({ getValue }) => locationCell(getValue()),
    sortingFn: (a, b) => a.original.shipperLocation.id.localeCompare(b.original.shipperLocation.id),
  }),
  col.accessor('destinationLocation', {
    header: 'Destination Location',
    cell: ({ getValue }) => locationCell(getValue()),
    sortingFn: (a, b) => a.original.destinationLocation.id.localeCompare(b.original.destinationLocation.id),
  }),
  col.accessor('latestPickup', { header: 'Latest Pickup Date and Time' }),
  col.accessor('latestDelivery', { header: 'Latest Delivery Date and Time' }),
  col.accessor('weight', { header: 'Gross Weight' }),
  col.accessor('volume', { header: 'Volume' }),
]

// ── Draft tab (LINX-11663; Figma labels "Create/Create By" read as typos —
// Jira's "Created/Created By" adopted, flagged for Efrain) ──
export const DRAFT_COLUMNS = [
  col.accessor('idLabel', { header: 'Order Number' }),
  col.accessor('customer', {
    header: 'Customer',
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  col.accessor('created', { header: 'Created' }),
  col.accessor('createdBy', { header: 'Created By' }),
  col.accessor('lastEdit', { header: 'Last Edit' }),
  // User-directed (R2-4); deviates from LINX-11663's Draft column set —
  // logged in the orders decision log.
  col.accessor('lastEditedBy', { header: 'Last Edited By' }),
]

// ── Validation Errors tab (LINX-11659 + Figma) ──
export const VALIDATION_COLUMNS = [
  col.accessor('idLabel', { header: 'Order Number' }),
  col.accessor('customer', {
    header: 'Customer',
    meta: { cellClass: 'odyssey-table__cell--title text-label-sm-medium' },
  }),
  col.accessor('draftOrderStatus', {
    header: 'Draft Order Status',
    cell: ({ getValue }) => statusBadge(getValue(), DRAFT_ORDER_STATUS_VARIANT),
  }),
  col.accessor('errorCount', {
    header: 'Errors Count',
    cell: ({ getValue }) => getValue() ?? '--',
  }),
]

export const TAB_COLUMNS = {
  all: ALL_COLUMNS,
  draft: DRAFT_COLUMNS,
  'validation-errors': VALIDATION_COLUMNS,
}

// All-tab ⋮ options are per-row (LINX-10233): Edit/Cancel are Manual-only;
// Restore only on Cancelled orders.
export function allTabActionLabels(row) {
  if (row.status === 'Cancelled') return ['View', 'Copy', 'Restore']
  if (row.orderSource === 'Manual') return ['View', 'Edit', 'Copy', 'Cancel']
  return ['View', 'Copy']
}

export const DRAFT_ACTION_LABELS = ['Edit', 'Submit', 'Cancel']

/**
 * The row's PRIMARY action — what OPENING a row does (S131: a row click is
 * "bound from the available actions, either error validation, edit or view").
 *
 * It picks the FIRST action this row actually offers, in that precedence — it
 * never invents one. Availability is `allTabActionLabels` above, so the rule
 * cannot drift from the ⋮ menu:
 *
 *   Resolve — validation-error status AND `Ready`. Exactly when the VE tab's
 *             Resolve button is enabled; `Complete`/`Purge` are not resolvable.
 *   Edit    — an UNFINISHED order (draft, or a validation error that can't be
 *             resolved) whose menu offers Edit, i.e. Manual and not Cancelled.
 *             A draft has no Summary page, and an errored order is something to
 *             fix rather than read.
 *   View    — everything else, including any order the rules say is not
 *             editable. An INTEGRATED draft lands here: its menu is
 *             ['View', 'Copy'], so opening the create form (what an earlier cut
 *             did off `status === 'Draft'` alone) offered an edit the row does
 *             not allow.
 *
 * Takes the GRID row VM's field names (`status`, not `orderStatus`) — the search
 * preview maps onto that shape at the call site.
 */
export function primaryRowAction(row) {
  const erroring = VALIDATION_ERROR_STATUSES.includes(row?.status ?? '')
  if (erroring && row?.draftOrderStatus === 'Ready') return 'Resolve'
  const unfinished = erroring || row?.status === 'Draft'
  if (unfinished && allTabActionLabels(row ?? {}).includes('Edit')) return 'Edit'
  return 'View'
}
