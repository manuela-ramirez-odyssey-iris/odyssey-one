// Flat display view-model the Orders grid renders. Produced by mapOrderListRow.
// '--' = the grid's empty-optional-value rendering (LINX-13590 / 9896 note).
//
// NOTE: `origin`/`destination`/`earlyPickup`/`commodity` are the PRE-S94 lean
// fields — still consumed by the current OrdersTable.jsx (Task 6 rebuilds it
// and Task 11 sweeps these). Kept alongside the new per-tab fields so nothing
// else in the app breaks mid-migration.
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
  // ── pre-S94 lean fields (dead-code swept in Task 11) ──
  origin: string      // "RGC-STL-001: St Louis, MO"
  destination: string
  commodity: string
  earlyPickup: string // "06/15/2026 08:00" (from consignor.earliestPickupDateTime)
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
  volume: string      // "64.000 cuft" — '--' when absent
  // ── Draft tab ──
  created: string     // long date format — '--' when absent
  createdBy: string
  lastEdit: string
  // ── Validation Errors tab ──
  draftOrderStatus: string // 'Ready' | 'Complete' | 'Purge' | ''
  errorCount: number | null
}
