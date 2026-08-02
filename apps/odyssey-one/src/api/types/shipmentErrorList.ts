// Grid list contract for the shipments table. The list IS the exception/monitoring/
// PGI-PGR grids (POST /shipment-service/pgi-pgr/v1/error/list); there is no generic
// "all shipments" endpoint. The row shape is provisional — the LLD does not specify
// the error/list row fields, so we use the current shipments.json row shape as a
// best-effort DTO and isolate the unknown real names behind mapShipmentErrorRow.
export interface ShipmentErrorRow {
  buyShipment: string
  sellShipment: string          // contract detail-link id (sell-shipment-out/{id})
  orders: string[]
  /** Customer pickup references, one per consolidated order (R2-2). */
  pickupNumbers?: string[]
  pro: string
  customerId: string
  customerName: string
  consignor: string
  consignee: string
  origin: string
  destination: string
  pickupDate: string
  deliveryDate: string
  mode: string
  equipmentCode: string
  scac: string
  tenderStatus: string
  shipmentStatus: string
  panel: string
  category: string
  validationMessage: string | null
  grossWeight: string
  loadCount: string
  orderCount: string
  apFreightCost: string
}

// Paginated envelope (consistent across services). Real row-array name is TBD;
// the service normalizes it to `rows` at the boundary.
export interface ShipmentErrorListResponse {
  pageNumber: number
  pageSize: number
  totalCount: number
  rows: ShipmentErrorRow[]
}

export interface CategoryCount {
  category: string
  count: number
}

// Committed GlobalSearch criteria (S79c decision 7) — chips ANDed (substring per
// dataKey), free text ANDed and ORed across the shared field list. Matching is
// implemented once in src/search/shipments/criteria.js and shared with the
// search-panel glimpse.
export interface SearchCriteriaChip {
  key?: string
  dataKey: string
  queryValue?: string | null
}

export interface SearchCriteria {
  chips: SearchCriteriaChip[]
  text?: string
}

// Request params. `filter` carries committed filter state keyed by SEARCH_ATTRIBUTES
// dataKey; `searchTerm` is free-text; `dateFilters` are ISO yyyy-mm-dd bounds.
export interface ShipmentErrorListParams {
  panel: string
  category?: string             // omit or 'all' = whole panel
  pageNumber: number
  pageSize: number
  // Customer scoping (S79c decision 10) — the FIRST-order filter, applied before
  // panel/category/search. Values are shipment-row customerIds (the selected
  // customers' dataIds). Omit = unscoped (legacy callers/tests); [] = an honest
  // empty result (the user's selection has no data-backed customers).
  customerIds?: string[]
  filter?: Record<string, string>        // exact-equality (FilterPanel dropdown selections)
  searchFilters?: Record<string, string> // substring match per field (saved-query conditions)
  searchCriteria?: SearchCriteria       // committed GlobalSearch chips+text (the S79c path)
  // Legacy free-text path (pre-S79c). Still supported by the service (and tested),
  // but the Shipments route no longer sends it — it sends searchCriteria instead.
  searchTerm?: string
  searchAttributeKey?: string           // scopes searchTerm to one attribute when set; omit for all-fields search
  dateFilters?: {
    pickupDateFrom?: string
    pickupDateTo?: string
    deliveryDateFrom?: string
    deliveryDateTo?: string
  }
  sortBy?: string
  orderBy?: 'asc' | 'desc'
}
