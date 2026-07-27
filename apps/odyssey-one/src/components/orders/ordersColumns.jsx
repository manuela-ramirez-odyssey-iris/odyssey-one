import { createColumnHelper } from '@tanstack/react-table'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '@odyssey/ui'

/**
 * ordersColumns — the three per-tab column-def sets for the Orders grid
 * (Jira LINX-11658/11663/11659 + Efrain's Figma tables, S94 research notes).
 * OrdersTable appends the Action column (needs row-context callbacks).
 */
const col = createColumnHelper()

// Order Status display label → Badge variant. Figma pins New=blue,
// Ready for Planning=green, Rating/Routing Failed=red; our current label
// vocabulary maps onto the same tones.
export const ORDER_STATUS_VARIANT = {
  'Draft': 'gray',
  'Ready For Plan': 'green',
  'Shipment Planned': 'green',
  'Load Planned': 'blue',
  'Planning Failed': 'red',
  'Shipment Failed': 'red',
  'Cancelled': 'gray',
}

export const DRAFT_ORDER_STATUS_VARIANT = { Ready: 'green', Complete: 'blue', Purge: 'red' }

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
