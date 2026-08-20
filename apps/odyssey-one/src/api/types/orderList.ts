// Order list contract — field names VERBATIM from the "Order Service Phase-2" LLD
// (Confluence 3401056276, fetched 2026-06-11; raw dump at
// vault-sources/10-domains/orders/lld/order-service-phase-2.md).
// Endpoint: POST /order-service/v3/order/list. Final confirmation against live
// Swagger remains; mapOrderListRow is the single reconciliation point.

export interface OrderListRow {
  orderNumber: string               // "SUT355123" — the ID column value; '' while an
                                    // async creation is still processing (number unassigned)
  orderId?: number                  // internal id (LINX-11013) — mock carries it ONLY on
                                    // number-less pending rows so they stay addressable
  orderSource: string               // "INTEGRATED"
  customer: string                  // "SABIC_CLT" — display key; no separate customerId on the row
  shipDirection: string             // "I" — wire code; mapped to a label at the grid seam
  freightTerms: string              // "P" — wire code; mapped to a label at the grid seam
  equipment: string                 // "TL"
  consignor: {
    locationId: string              // "RGC-STL-001" — Origin cell prefix code
    name?: string                   // facility name — "J & K INGREDIENTS" (location cell line 2)
    address?: string                // street line — "900 Hall St SW" (location cell line 3)
    city: string
    state: string
    country: string
    earliestPickupDateTime: string  // ISO
    latestPickupDateTime: string
  }
  consignee: {
    locationId: string
    name?: string
    address?: string
    city: string
    state: string
    country: string
    earliestDeliveryDateTime: string
    latestDeliveryDateTime: string
  }
  grossWeight: { value: number; uom: string }   // { 4300, "lbs" }
  volume: { value: number; uom: string }        // { 730, "cbf" }
  commodity: string                 // "Plastic"
  orderStatus: string               // DISPLAY LABEL on the row ("Ready For Plan"), not a code
  hazardous?: boolean               // ≥1 hazardous line item (LINX-12102)
  createdAt?: string                // ISO — first draft/creation timestamp (Draft tab "Created")
  createdBy?: string                // "amy.cook" — Odyssey USERNAME, not display name (R2-4,
                                     // user ruling 2026-08-01: display names collide across users)
  createdTimeZoneCode?: string      // "CDT" — zone abbrev sibling of createdAt (R2-3, LLD pattern,
                                     // e.g. requestedPickupTimeZoneCode); wire shape unchanged
  lastEditAt?: string               // ISO — most recent edit (Draft tab "Last Edit")
  lastEditedBy?: string             // "ben.planner" — username of the last editor (R2-4)
  lastEditTimeZoneCode?: string     // "CDT" — zone abbrev sibling of lastEditAt (R2-3)
  draftOrderStatus?: string         // 'Ready' | 'Complete' | 'Purge' — VE-tab rows only (LINX-11659)
  errorCount?: number               // validation error count — VE-tab rows only
}

// /order-status/lookup enum (LLD) + DRAFT (create-order remark).
// NOTE: HOLD is NOT a status — it's a boolean orderHoldStatus flag on the order
// (LLD; resolves the old Hold-status question).
export type OrderStatusCode =
  | 'DRAFT' | 'RD_4_PLNNG' | 'PLN_LD' | 'PLNED_SHIP'
  | 'PLNNG_FAIL' | 'SHIP_FAIL' | 'CAN'

/** One City-State-Country selection from the Origin/Destination filter. */
export interface LocationTriple {
  city: string
  state: string
  country: string
}

export interface OrderListRequest {
  pagination: {
    pageNumber: number              // LLD list example is 1-BASED ("pageNumber": 1) but the sibling
                                    // lookup example is 0-based — discrepancy tracked in Q29
    pageSize: number                // LLD examples use 20; max not stated (Q29)
  }
  filters?: {                       // all-array filter object; the page sends none in THIS build.
    customers?: string[]            // EntityChip scope binds here later
    orderStatuses?: string[]        // future tab strip binds here (Q25)
    orderNumbers?: string[]
    originCities?: string[]
    originStates?: string[]
    originCountries?: string[]
    destinationCities?: string[]
    destinationStates?: string[]
    destinationCountries?: string[]
    earliestPickupDateFrom?: string
    earliestPickupDateTo?: string
    latestPickupDateFrom?: string
    latestPickupDateTo?: string
    earliestDeliveryDateFrom?: string
    earliestDeliveryDateTo?: string
    latestDeliveryDateFrom?: string
    latestDeliveryDateTo?: string

    // ── OUR CONTRACT EXTENSION (2026-08-20) ────────────────────────────────
    // The LLD's filter object covers the All tab only. LINX-11663 (Draft) and
    // LINX-11659 (Validation Errors) specify filter sets with no LLD field to
    // bind to, so these are ours to propose — same footing as the
    // /order-service/v3/order/tab-counts endpoint (also not in the LLD).
    // Naming follows the LLD's own conventions (<field>From/To, plural arrays).
    createdDateFrom?: string          // LINX-11663 — Draft "Created Date" range
    createdDateTo?: string
    lastEditDateFrom?: string         // LINX-11663 — Draft "Last Edit Date" range
    lastEditDateTo?: string
    createdBy?: string[]              // LINX-11663 — usernames, matches row.createdBy
    lastEditedBy?: string[]           // LINX-11663 — matches row.lastEditedBy
    // LINX-11659 — the VE tab's "Order Status" is draftOrderStatus
    // (Ready/Complete/Purge, the OIF validation state per LINX-11137), NOT the
    // lifecycle orderStatus. Separate field so the two vocabularies can't collide.
    draftOrderStatuses?: string[]
    errorCountOperator?: 'gt' | 'eq' | 'lt'  // LINX-11659 — Greater Than / Equals / Less Than
    errorCountValue?: number                 // whole number ≥ 1, no decimals

    /**
     * GlobalSearch free text as the user committed it — the CLIENT-facing
     * field. `getOrderList` resolves it into `searchTerms` below; nothing else
     * should read it.
     */
    searchText?: string

    /**
     * The resolved NEEDLES — what actually reaches the matcher and the SQL.
     * Semantics are Shipments' verbatim (search/criteria-core): each needle is
     * a case-insensitive SUBSTRING match ORed across the Orders free-text
     * columns, and the needles are ORed with each other — the multi-code union,
     * so "CODE1 CODE2" returns both orders' results mixed.
     *
     * An ARRAY, not a raw string, on purpose: phrase-vs-code-list is a property
     * of the QUERY against the whole dataset, decided ONCE per query and never
     * re-derived per row — or per PAGE, which would let page 2 disagree with
     * page 1 about what the query even meant.
     */
    searchTerms?: string[]

    // Location triples (LINX-10285). The three parallel arrays above are the
    // LLD's model and are ANDed, which cross-products on multi-select: two
    // selected triples also match every mix of their parts. These carry the
    // intended semantics (match ANY whole triple); the mock uses them when
    // present and falls back to the arrays otherwise. Open with Ramesh —
    // when the LLD shape is settled, one of the two representations goes away.
    originLocations?: LocationTriple[]
    destinationLocations?: LocationTriple[]
  }
  sort?: { field: string; direction: 'asc' | 'desc' }  // LLD example default: orderNumber asc;
                                                        // valid field list not stated (Q31)
}

export interface OrderListResponse {
  success: boolean
  orders: OrderListRow[]
  pagination: { pageNumber: number; pageSize: number; totalCount: number }
  error: string | null
}
