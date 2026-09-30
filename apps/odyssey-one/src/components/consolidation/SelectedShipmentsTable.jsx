import { useMemo } from 'react'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { Badge, DataTable, SubAccordion } from '@odyssey/ui'
import { COLUMN_CONFIG } from '../shipments/ShipmentTable'
import './consolidation-summary.css'

const COLUMN_BY_KEY = Object.fromEntries(COLUMN_CONFIG.map((c) => [c.key, c]))
const COLUMNS = ['odysseyShipmentIdentifier', 'customerId', 'shipmentStatus', 'orderCount', 'orders', 'pickupDate']
const columnHelper = createColumnHelper()

// No purple in a consolidation (user 2026-09-30): the list's Order # renderer
// cycles BADGE_COLORS (purple included), so this table renders its own gray chips.
const RENDER_OVERRIDE = {
  orders: (r) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {(r.orders ?? []).map((o) => <Badge key={o} variant="gray">{o}</Badge>)}
    </div>
  ),
}

// "Selected shipments to consolidate" - collapsible (default open), read-only, no select column (the rows
// ARE the consolidation). Recovered from the retired Review page (S11).
export default function SelectedShipmentsTable({ rows }) {
  const columns = useMemo(() => COLUMNS.map((key) => {
    const cfg = COLUMN_BY_KEY[key]
    return columnHelper.accessor(key, {
      id: key,
      header: cfg?.label ?? key,
      cell: (RENDER_OVERRIDE[key] ?? cfg?.render) ? ({ row }) => (RENDER_OVERRIDE[key] ?? cfg.render)(row.original) : ({ getValue }) => getValue() ?? '—',
      enableSorting: false,
    })
  }), [])
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel(), getRowId: (r) => r.id })
  return (
    <SubAccordion title="Selected shipments to consolidate" defaultExpanded>
      <div className="consolidation-summary__table-count text-label-sm-regular">{rows.length} items</div>
      <DataTable table={table} ariaLabel="Selected shipments to consolidate" truncationTooltip />
    </SubAccordion>
  )
}
