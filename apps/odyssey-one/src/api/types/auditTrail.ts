// apps/odyssey-one/src/api/types/auditTrail.ts
// LINX-8091 (order level) + LINX-9128 (line level) — one row shape serves both.
// `changes` is a LIST per the AC Notes §1 ("in one row … the list of all the
// fields that changed"); Ramesh said "one row per field" aloud — Q-AT-1. Either
// answer is a change to what fills `changes`, not to this shape.
export type AuditChangeType = 'Order Action' | 'Order Event'

export type AuditChangeCategory =
  | 'Order Creation'
  | 'Order Header Editing'
  | 'Order Line Item Editing'
  | 'Order Lifecycle Status Change'
  | 'Order Applied on Hold'
  | 'Order Released from Hold (Header Level Editing)'
  | 'Order Released from Hold (Line Item Editing)'
  | 'Order Partial Cancellation'
  | 'Order Full Cancellation'

export interface AuditTrailChange {
  field: string      // human label ("Gross Weight"), never the JSON path
  oldValue: string
  newValue: string
}

export interface AuditTrailRow {
  id: string                       // `${orderNumber}-${n}` — stable per derive
  timestamp: string                // local-naive ISO, same shape as orders.json createdAt
  timeZoneCode: string             // 'CDT' — the zone abbreviation shown after the time
  changedBy: 'User' | 'System'
  source: string                   // User → "email · Full Name"; System → 'ERP' | 'UI' | 'Legacy TMS' | 'LINX'
  changeType: AuditChangeType
  changeCategory: AuditChangeCategory
  lineItemId: string | null        // null on header-level rows (renders '--'); the FIRST id when lineItemIds is set
  // Set only when one save touched more than one real order line (Part 9 line-
  // count badge, 2026-09-23, "OIF & Audit Trail review" 2026-09-16) — today
  // only `deriveAuditTrail`'s Partial Cancellation step ever populates it.
  // Absent/undefined means "just the one line" — `lineItemId` alone.
  lineItemIds?: string[]
  changes: AuditTrailChange[]      // [] on Creation / Applied on Hold / Cancellation rows
}

export interface AuditTrailRequest {
  orderNumber: string
  pageNumber: number               // 1-based, like OrderListRequest.pagination
  pageSize: number
  sortDirection: 'asc' | 'desc'    // on timestamp — the only sortable column
}

export interface AuditTrailOrderMeta {
  orderNumber: string
  orderSource: 'Manual' | 'Integrated'
  createdAt: string
  createdTimeZoneCode: string
  createdBy: string                // the creation row's `source`
}

export interface AuditTrailPage {
  rows: AuditTrailRow[]
  totalCount: number
  order: AuditTrailOrderMeta | null // null → order not found
}
