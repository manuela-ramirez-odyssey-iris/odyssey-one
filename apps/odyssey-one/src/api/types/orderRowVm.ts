// Flat display view-model the Orders grid renders. Produced by mapOrderListRow.
// '--' = the grid's empty-optional-value rendering (LINX-13590 / 9896 note).
export interface LocationCellVM {
  id: string          // "RGC-STL-001" — line 1
  name: string        // facility name — line 2 ('' if unknown)
  address: string     // "900 Hall St SW Grand Rapids, MI, US" — line 3
}

export interface OrderRowVM {
  id: string          // orderNumber — row key; "pending-<orderId>" for number-less rows
  idLabel: string     // displayed Order Number; '-' while async creation processes
  pending: boolean
  customer: string
  // ── All tab ──
  hazardous: boolean
  orderSource: string // 'Manual' | 'Integrated' (display case)
  status: string      // display label — drives the Order Status badge
  shipDirection: string
  freightTerms: string
  equipment: string
  shipperLocation: LocationCellVM
  destinationLocation: LocationCellVM
  latestPickup: string   // "Jun 8, 2026 at 8:45 AM" — '' when absent (blank, not '--')
  latestDelivery: string
  weight: string      // "24,530 LB" — '--' when absent
  volume: string      // "64 cuft" — '--' when absent
  // ── Draft tab ──
  created: string     // long date format — '--' when absent
  createdBy: string
  lastEdit: string
  // ── Validation Errors tab ──
  draftOrderStatus: string // 'Ready' | 'Complete' | 'Purge' | ''
  errorCount: number | null
}
