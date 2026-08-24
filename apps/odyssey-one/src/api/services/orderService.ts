import { getApiMode } from '../config'
import { apiGet, apiPatch, apiPost, apiPut } from '../client'
import { getAllOrders, getOrderEnrichment } from '../../data/orders'
import { currentUser } from '../../data/sso-mock'
import type { LocationTriple, OrderListRequest, OrderListResponse, OrderListRow, OrderSearchChip } from '../types/orderList'
import {
  matchesAnyNeedle, compareByCriteria, textNeedles, tokenizeText, ORDERS_FREE_TEXT_ATTRS,
} from '../../search/orders/criteria'
import { matchesChip } from '../../search/criteria-core'
import { orderSearchRow } from '../../search/orders/progression'
import { mapFormToOrderInterface } from '../mappers/mapFormToOrderInterface'
import { mapOrderViewToFormVm } from '../mappers/mapOrderViewToFormVm'
import type { CreateOrderRequest, CreateOrderResponse, ManualOrder } from '../types/createOrder'
import type { OrderFormValues } from '../types/orderFormVm'

// Order list service. live → POST /order-service/v3/order/list with the request
// verbatim (the params type IS the LLD request shape). mock → simulate the
// paginated server over orders.json: filter (AND across fields, OR within an
// array) → sort → 1-based paginate (Q29 tracks 1- vs 0-based).

// Date-range bounds are yyyy-mm-dd; compare against the row's ISO datetime by
// date part so the To-bound is inclusive.
function dateInRange(iso: string | undefined, from?: string, to?: string): boolean {
  const d = iso?.slice(0, 10)
  if (!d) return false
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

const oneOf = (values: string[] | undefined, v: string | undefined) =>
  !values?.length || values.includes(v ?? '')

// LINX-11663 note: "Filters can not be applied on blank values" — a row whose
// field is blank must not match a filter on that field. `oneOf` already gives
// that (a filter of ['Ready'] can't include ''), and `dateInRange` returns
// false for a missing date. Nothing extra needed; stated here so the next
// reader doesn't "fix" it into a permissive null-passes check.

// Match a location against selected City-State-Country triples: the row matches
// if it equals ANY WHOLE triple. This is what the three parallel LLD arrays
// can't express — ANDing them cross-products, so Miami/Florida/US +
// Milan/Lombardy/Italy would also admit "Miami, Lombardy, Italy". Applied only
// when the triples are present; the arrays remain the fallback.
function matchesLocation(
  loc: { city?: string; state?: string; country?: string } | undefined,
  triples: LocationTriple[] | undefined,
): boolean {
  if (!triples?.length) return true
  if (!loc) return false
  return triples.some(t =>
    (t.city ?? '') === (loc.city ?? '') &&
    (t.state ?? '') === (loc.state ?? '') &&
    (t.country ?? '') === (loc.country ?? ''))
}

/**
 * GlobalSearch free text (S128). Delegates to the SHARED matcher so the Orders
 * bar behaves exactly as the Shipments one does — substring match ORed across
 * the free-text columns, needles ORed with each other (multi-code union).
 * Relevance ordering is applied separately, below, so prefix hits float to the
 * top the way they do in Shipments.
 */
/**
 * Swap the client-facing raw `searchText` for the resolved `searchTerms` the
 * matcher and the SQL actually consume. `searchText` never goes on the wire —
 * leaving it there would invite a second, divergent server-side resolution.
 */
function withTerms(
  filters: OrderListRequest['filters'],
  searchTerms?: string[],
): OrderListRequest['filters'] {
  const next = { ...filters }
  delete next!.searchText
  if (searchTerms?.length) next!.searchTerms = searchTerms
  else delete next!.searchTerms
  return next
}

function matchesSearchTerms(row: OrderListRow, terms: string[] | undefined): boolean {
  if (!terms?.length) return true
  return matchesAnyNeedle(row as unknown as Record<string, unknown>, terms)
}

// LINX-11659 Error Count comparator. A row with no errorCount never matches
// (same blank-value rule as above) — the field only exists on VE-tab rows.
function matchesErrorCount(
  count: number | undefined,
  op: 'gt' | 'eq' | 'lt' | undefined,
  value: number | undefined,
): boolean {
  if (!op || value == null) return true
  if (count == null) return false
  if (op === 'gt') return count > value
  if (op === 'lt') return count < value
  return count === value
}

// Column id → row-value getter for header sorting (S94). Ids matching a
// top-level string field (orderNumber, customer, orderStatus, ...) need no
// entry — the comparator's default fallback reads the field directly.
const SORT_GETTERS: Record<string, (r: OrderListRow) => string | number> = {
  weight: r => r.grossWeight?.value ?? 0,
  volume: r => r.volume?.value ?? 0,
  latestPickup: r => r.consignor?.latestPickupDateTime ?? '',
  latestDelivery: r => r.consignee?.latestDeliveryDateTime ?? '',
  shipperLocation: r => r.consignor?.locationId ?? '',
  destinationLocation: r => r.consignee?.locationId ?? '',
  created: r => r.createdAt ?? '',
  lastEdit: r => r.lastEditAt ?? '',
  errorCount: r => r.errorCount ?? 0,
  hazardous: r => (r.hazardous ? 1 : 0),
  orderSource: r => r.orderSource ?? '',
  draftOrderStatus: r => r.draftOrderStatus ?? '',
}

// Mock row assembly shared by list + tab counts. Overlay rows SHADOW base rows
// with the same order number (a session draft saved over a generated Draft row
// must not duplicate it — duplicate ids would also collide as TanStack row keys).
function mockScopedRows(customerIds?: string[]): OrderListRow[] {
  const overlayNumbers = new Set(overlayRows.map(r => r.orderNumber).filter(Boolean))
  let rows = [
    ...overlayRows,
    ...(getAllOrders() as OrderListRow[]).filter(r => !overlayNumbers.has(r.orderNumber)),
  ]
  if (customerIds) {
    const scope = new Set(customerIds)
    rows = rows.filter(r => scope.has(r.customer))
  }
  return rows
}

/**
 * Statuses the "Validation Errors" main tab filters to (display labels — the
 * mock service matches labels; code→label mapping deferred, plan decision 8).
 * Inferred from the Orders Tabs mock: the failure statuses are the "orders that
 * need error validation".
 */
export const VALIDATION_ERROR_STATUSES = ['Planning Failed', 'Shipment Failed']

export interface OrderTabCounts {
  all: number
  draft: number
  validationErrors: number
}

/**
 * Counts for the Orders main tabs (All / Draft / Validation Errors), scoped by
 * the navbar customer selection — same semantics as getOrderList's customerIds.
 * live → GET /order-service/v3/order/tab-counts?customers=csv — OUR contract
 * extension (the LLD has no counts endpoint); mock computes over orders.json.
 */
export async function getOrderTabCounts(customerIds?: string[]): Promise<OrderTabCounts> {
  if (customerIds && customerIds.length === 0) return { all: 0, draft: 0, validationErrors: 0 }
  if (getApiMode() === 'live') {
    const params = customerIds !== undefined ? `?customers=${encodeURIComponent(customerIds.join(','))}` : ''
    return apiGet<OrderTabCounts>(`/order-service/v3/order/tab-counts${params}`)
  }
  const rows = mockScopedRows(customerIds)
  return {
    all: rows.length,
    draft: rows.filter(r => r.orderStatus === 'Draft').length,
    validationErrors: rows.filter(r => VALIDATION_ERROR_STATUSES.includes(r.orderStatus ?? '')).length,
  }
}

/**
 * Committed bar chips (S130), mock side. Every chip must match, and each one is
 * evaluated by `matchesChip` — the SAME function the search adapter's preview
 * uses — over the SAME projected row. That is what makes the preview's count and
 * the grid's count agree; reimplementing the comparison here is exactly the
 * drift criteria-core exists to prevent.
 *
 * The row is projected because an order row is not flat: locations are objects,
 * dates ISO, measures `{ value, uom }`, and three enums stored as codes while
 * the chip carries the label the column displays.
 */
function matchesSearchChips(row: OrderListRow, chips?: OrderSearchChip[]): boolean {
  if (!chips?.length) return true
  const projected = orderSearchRow(row as unknown as Record<string, unknown>)
  return chips.every((chip) => matchesChip(projected, chip))
}

/**
 * Order list. `customerIds` is the navbar-customer FIRST-order scope — the same
 * semantics gridService applies to Shipments (S79c decision 10): `undefined` =
 * unscoped (legacy callers/tests), `[]` honestly yields nothing, otherwise rows
 * outside the selected customers don't exist for this user. Applied before the
 * LLD filters; in live mode it folds into `filters.customers`.
 */
export async function getOrderList(
  request: OrderListRequest,
  customerIds?: string[],
): Promise<OrderListResponse> {
  if (customerIds && customerIds.length === 0) {
    const { pageNumber, pageSize } = request.pagination
    return { success: true, orders: [], pagination: { pageNumber, pageSize, totalCount: 0 }, error: null }
  }
  const searchText = request.filters?.searchText?.trim()

  if (getApiMode() === 'live') {
    // The navbar scope and a panel Customer filter must INTERSECT, not replace.
    // This used to be a flat `customers: customerIds`, which silently threw away
    // the panel's own Customer selection — the live path returned the whole
    // scope while mock (scope first, then `oneOf`) correctly ANDed them, so the
    // two modes disagreed and only live was wrong. An empty intersection is
    // honest: filtering to a customer outside your scope yields nothing.
    const picked = request.filters?.customers
    const scopedFilters = {
      ...request.filters,
      ...(customerIds
        ? { customers: picked?.length ? picked.filter(c => customerIds.includes(c)) : customerIds }
        : {}),
    }
    const post = (searchTerms?: string[]) =>
      apiPost<OrderListResponse>('/order-service/v3/order/list', {
        ...request,
        filters: withTerms(scopedFilters, searchTerms),
      })

    if (!searchText) return post()

    // Phrase-vs-code-list, server-side twin (criteria-core `textNeedles`): we
    // cannot ask "does the phrase match ANY row?" from here without the whole
    // dataset, so ask the server — run the phrase, and only if it matches
    // NOTHING re-run as a code list. The second round trip happens exactly in
    // the miss case, which is the case the union exists to rescue.
    const phrase = await post([searchText.toLowerCase()])
    if (phrase.pagination.totalCount > 0) return phrase
    const tokens = tokenizeText(searchText)
    return tokens.length >= 2 ? post(tokens) : phrase
  }

  let rows = mockScopedRows(customerIds)

  // Resolved ONCE, against the FULL dataset (not the customer-scoped rows) so
  // every consumer reads the query the same way — the criteria-core contract.
  const mockNeedles = searchText
    ? textNeedles(getAllOrders() as unknown as Record<string, unknown>[], searchText)
    : []

  const f = request.filters
  if (f) {
    // Origin/Destination: the triples win when the caller sent them (the panel
    // always does); the parallel arrays stay the path for any caller still on
    // the raw LLD shape. Sending both would otherwise double-filter, which is
    // harmless but makes the cross-product bug invisible in the mock.
    const originTriples = f.originLocations
    const destTriples = f.destinationLocations
    rows = rows.filter(r =>
      oneOf(f.customers, r.customer) &&
      oneOf(f.orderNumbers, r.orderNumber) &&
      // mock matches display labels; code→label mapping deferred until filters bind (plan decision 8)
      oneOf(f.orderStatuses, r.orderStatus) &&
      // LINX-11659 — the VE tab's own status vocabulary, distinct from orderStatus above.
      oneOf(f.draftOrderStatuses, r.draftOrderStatus) &&
      oneOf(f.createdBy, r.createdBy) &&
      oneOf(f.lastEditedBy, r.lastEditedBy) &&
      matchesErrorCount(r.errorCount, f.errorCountOperator, f.errorCountValue) &&
      matchesSearchTerms(r, mockNeedles) &&
      matchesSearchChips(r, f.searchChips) &&
      (originTriples?.length
        ? matchesLocation(r.consignor, originTriples)
        : oneOf(f.originCities, r.consignor?.city) &&
          oneOf(f.originStates, r.consignor?.state) &&
          oneOf(f.originCountries, r.consignor?.country)) &&
      (destTriples?.length
        ? matchesLocation(r.consignee, destTriples)
        : oneOf(f.destinationCities, r.consignee?.city) &&
          oneOf(f.destinationStates, r.consignee?.state) &&
          oneOf(f.destinationCountries, r.consignee?.country)))
    if (f.earliestPickupDateFrom || f.earliestPickupDateTo)
      rows = rows.filter(r => dateInRange(r.consignor?.earliestPickupDateTime, f.earliestPickupDateFrom, f.earliestPickupDateTo))
    if (f.latestPickupDateFrom || f.latestPickupDateTo)
      rows = rows.filter(r => dateInRange(r.consignor?.latestPickupDateTime, f.latestPickupDateFrom, f.latestPickupDateTo))
    if (f.earliestDeliveryDateFrom || f.earliestDeliveryDateTo)
      rows = rows.filter(r => dateInRange(r.consignee?.earliestDeliveryDateTime, f.earliestDeliveryDateFrom, f.earliestDeliveryDateTo))
    if (f.latestDeliveryDateFrom || f.latestDeliveryDateTo)
      rows = rows.filter(r => dateInRange(r.consignee?.latestDeliveryDateTime, f.latestDeliveryDateFrom, f.latestDeliveryDateTo))
    // LINX-11663 (Draft tab) — same From/To semantics over the audit timestamps.
    if (f.createdDateFrom || f.createdDateTo)
      rows = rows.filter(r => dateInRange(r.createdAt, f.createdDateFrom, f.createdDateTo))
    if (f.lastEditDateFrom || f.lastEditDateTo)
      rows = rows.filter(r => dateInRange(r.lastEditAt, f.lastEditDateFrom, f.lastEditDateTo))
  }

  // RELEVANCE first, when the bar carries free text (S128). Same rule Shipments
  // applies: exact > starts-with > contains, ties broken by which free-text
  // attribute matched. This is what makes "type the first characters of an
  // order number" put that order at the TOP rather than somewhere in 5,000
  // rows — the substring matcher above admits interior hits too, and without
  // this they would interleave with the prefix hits.
  //
  // It deliberately OVERRIDES the column sort while a search is active, exactly
  // as the Shipments grid does (gridService's `compareByCriteria` branch):
  // a relevance-ranked result list that is then re-sorted by created-date is
  // just an unranked list.
  if (mockNeedles.length) {
    const cmp = compareByCriteria({ text: mockNeedles[0], chips: [] }, ORDERS_FREE_TEXT_ATTRS, mockNeedles)
    if (cmp) rows = [...rows].sort(cmp as (a: OrderListRow, b: OrderListRow) => number)
    const { pageNumber: pn, pageSize: ps } = request.pagination
    return {
      success: true,
      orders: rows.slice((pn - 1) * ps, (pn - 1) * ps + ps),
      pagination: { pageNumber: pn, pageSize: ps, totalCount: rows.length },
      error: null,
    }
  }

  // LLD example default: orderNumber asc. Header sorting (S94) needs more than
  // top-level string fields — SORT_GETTERS reaches into nested/typed values for
  // the ids OrdersRoute's column→field map sends; anything else falls back to
  // the raw top-level field as a string (the old behavior).
  const sort = request.sort ?? { field: 'orderNumber', direction: 'asc' }
  const dir = sort.direction === 'desc' ? -1 : 1
  const get = SORT_GETTERS[sort.field] ??
    ((r: OrderListRow) => String((r as unknown as Record<string, unknown>)[sort.field] ?? ''))
  rows = [...rows].sort((a, b) => {
    const av = get(a)
    const bv = get(b)
    // Number-less pending rows (async create in flight) are the NEWEST orders —
    // treat the empty orderNumber as greatest so the default "orderNumber desc"
    // (the newest-first proxy) surfaces them first.
    if (sort.field === 'orderNumber' && !av !== !bv) return (av === '' ? 1 : -1) * dir
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
    return cmp * dir
  })

  const { pageNumber, pageSize } = request.pagination
  const totalCount = rows.length
  const start = (pageNumber - 1) * pageSize // 1-based per the LLD list example (Q29)
  return {
    success: true,
    orders: rows.slice(start, start + pageSize),
    pagination: { pageNumber, pageSize, totalCount },
    error: null,
  }
}

// ─── Write layer (spec §2.3) ────────────────────────────────────────────────
// Mock mode keeps a module-level in-memory overlay over orders.json: created
// orders and drafts prepend grid rows; drafts also retain their form values
// for reopen via /orders/create?draft=<key>. Lost on refresh — accepted.

let overlayRows: OrderListRow[] = []
const draftValues = new Map<string, OrderFormValues>()
const draftIdByOrderNumber = new Map<string, string>()
const orderNumberByDraftId = new Map<string, string>()
let createSeq = 0
let draftSeq = 0

/** Test hook — resets all mock write state. */
export function __resetOrderWriteState(): void {
  overlayRows = []
  draftValues.clear()
  draftIdByOrderNumber.clear()
  orderNumberByDraftId.clear()
  createSeq = 0
  draftSeq = 0
}

// Shared by submitDraftOrder/cancelOrder: shadow the row into the overlay
// (copying it from the base seed the first time it's touched, same as
// saveDraft/createOrder above) and stamp the new status label.
function overlayUpdateStatus(orderNumber: string, status: string): void {
  const existing = overlayRows.find(r => r.orderNumber === orderNumber)
  const base = existing ?? (getAllOrders() as OrderListRow[]).find(r => r.orderNumber === orderNumber)
  if (!base) return
  overlayRows = [
    { ...base, orderStatus: status },
    ...overlayRows.filter(r => r.orderNumber !== orderNumber),
  ]
}

// Shared live write: PATCH /order-service/v3/order/status (DB ledger row 9).
// Pending rows are addressed as 'pending-<orderId>' — the builder resolves them.
async function patchOrderStatus(orderNumber: string, status: string): Promise<void> {
  await apiPatch('/order-service/v3/order/status', { orderNumber, status })
}

/** Draft-tab Submit (LINX-11663): Draft → 'Ready For Plan'; row moves to All. */
export async function submitDraftOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') return patchOrderStatus(orderNumber, 'Ready For Plan')
  overlayUpdateStatus(orderNumber, 'Ready For Plan')
}

/**
 * OIF resolution (LINX-11137): Save-with-all-resolved and Purge both send the
 * order to the re-processing queue → 'Ready For Plan' (the AC's "Ready for
 * Planning" in app vocabulary). The status flip alone moves the row out of the
 * status-filtered Validation Errors tab into All. Live mode writes the status
 * directly — there is no dedicated OIF endpoint yet.
 */
export async function resolveOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') return patchOrderStatus(orderNumber, 'Ready For Plan')
  overlayUpdateStatus(orderNumber, 'Ready For Plan')
}

/** Cancel (LINX-10258 soft delete): status → 'Cancelled'. */
export async function cancelOrder(orderNumber: string): Promise<void> {
  if (getApiMode() === 'live') return patchOrderStatus(orderNumber, 'Cancelled')
  overlayUpdateStatus(orderNumber, 'Cancelled')
}

function manualOrderToListRow(mo: ManualOrder, orderNumber: string, statusLabel: string): OrderListRow {
  return {
    orderNumber,
    orderSource: 'MANUAL',
    customer: mo.customerId ?? '',
    shipDirection: mo.shipDirectionCode ?? '',
    freightTerms: mo.freightTermCode ?? '',
    equipment: mo.orderCarrierEquipDetailList?.[0]?.equipmentCode ?? '',
    consignor: {
      locationId: mo.originPartnerId ?? '',
      city: mo.originCity ?? '',
      state: mo.originRegion ?? '',
      country: mo.originCountry ?? 'US',
      earliestPickupDateTime: mo.requestedPickupDate ?? '',
      latestPickupDateTime: mo.pickupAppointment ?? '',
    },
    consignee: {
      locationId: mo.destinationPartnerId ?? '',
      city: mo.destinationCity ?? '',
      state: mo.destinationRegion ?? '',
      country: mo.destinationCountry ?? 'US',
      earliestDeliveryDateTime: mo.requestedDeliveryDate ?? '',
      latestDeliveryDateTime: mo.deliveryAppointment ?? '',
    },
    grossWeight: { value: mo.grossWeightValue ?? 0, uom: mo.grossWeightUomCode ?? 'lbs' },
    volume: { value: mo.volumeValue ?? 0, uom: mo.volumeUomCode ?? 'cbf' },
    commodity: mo.orderLines?.[0]?.productDescription ?? '',
    orderStatus: statusLabel,
  }
}

export async function createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
  if (getApiMode() === 'live') {
    // userId (R2-4/R2-5): same identity pattern as updateOrder/preferenceService
    // — the server resolves it to the username that fills created_by.
    return apiPost<CreateOrderResponse>('/order-service/v3/manual-order', { ...request, userId: currentUser.id })
  }
  createSeq += 1
  const mo = request.manualOrder
  // LINX-9742/9279: blank order number → BE auto-generates orderNumber = orderId.
  // 90000+seq stays below the seeded id range (91000+), so no collisions.
  const orderId = 90000 + createSeq
  const orderNumber = mo.orderNumber?.trim() || String(orderId).padStart(13, '0') // 13-digit external-ID form, matches seeded shape
  overlayRows = [
    manualOrderToListRow(mo, orderNumber, 'Ready For Plan'),
    ...overlayRows.filter(r => r.orderNumber !== orderNumber),
  ]
  return {
    orderId,
    success: true,
    message: `Order ${orderNumber} created successfully`,
    data: {
      orderNumber,
      orderDate: new Date().toISOString(),
      orderDateTimeZoneCode: 'EST',
      shipmentMode: 'Ground', // Q28 open — derivation unknown; mock constant
    },
  }
}

/**
 * Edit Order save (LINX-10248) — "Confirm & Save Changes" on an EXISTING order.
 * Distinct from createOrder (mints a row) and saveDraft (draft lifecycle): this
 * rewrites the order in place, keeping its number, customer and status.
 * Audit trail (LINX-13853–13866) not implemented.
 */
export async function updateOrder(orderNumber: string, values: OrderFormValues): Promise<void> {
  const { manualOrder } = mapFormToOrderInterface(values)
  if (getApiMode() === 'live') {
    // userId (R2-4): identity = sso-mock currentUser.id until real SSO lands
    // (same pattern as preferenceService) — the server resolves it to the
    // username that fills last_edited_by.
    await apiPut('/order-service/v3/order', { orderNumber, manualOrder, userId: currentUser.id })
    return
  }
  const existing = overlayRows.find(r => r.orderNumber === orderNumber)
    ?? (getAllOrders() as OrderListRow[]).find(r => r.orderNumber === orderNumber)
  const row = manualOrderToListRow(manualOrder, orderNumber, existing?.orderStatus ?? 'Draft')
  if (existing?.orderSource) row.orderSource = existing.orderSource
  // R2-4: mirror live's last_edited_by/last_edit_at stamp so the Draft column
  // doesn't read '--' right after a mock edit while live shows the editor.
  // Mock has no users table to resolve an id → username; derive inline with
  // the SAME lowercase-dot rule as usernameFor (tools/seed-users.mjs) — that
  // function is the twin this line stands in for.
  row.lastEditedBy = currentUser.name.toLowerCase().replace(/\./g, '').trim().split(/\s+/).join('.')
  row.lastEditAt = new Date().toISOString()
  overlayRows = [row, ...overlayRows.filter(r => r.orderNumber !== orderNumber)]
  // Retain the full form values so a reopen hydrates at full fidelity (the
  // same store getDraft/getOrderView read first).
  const id = draftIdByOrderNumber.get(orderNumber) ?? `draft-${++draftSeq}`
  draftValues.set(id, structuredClone(values))
  draftIdByOrderNumber.set(orderNumber, id)
  orderNumberByDraftId.set(id, orderNumber)
}

export interface SaveDraftResult {
  draftId: string
  orderNumber: string
}

export async function saveDraft(values: OrderFormValues, draftId?: string | null): Promise<SaveDraftResult> {
  const request = mapFormToOrderInterface(values, { draft: true })
  if (getApiMode() === 'live') {
    // A prior save on this form session already minted/adopted a server order
    // number (draftId) — upsert via PUT, the SAME endpoint + shape
    // updateOrder/saveEditInPlace already use. The server INSERT has no ON
    // CONFLICT, so re-POSTing a second time would 409 on orders_number_unique
    // (that 409 is exactly how this bug shipped invisibly — Task 4).
    if (draftId) {
      await apiPut('/order-service/v3/order', { orderNumber: draftId, manualOrder: request.manualOrder, userId: currentUser.id })
      return { draftId, orderNumber: draftId }
    }
    // First save (blank Order Number is the normal path — 2026-08-07 decision
    // D): POST mints the row, server-side auto-generating a 13-digit
    // zero-padded number when blank (LINX-9742). Adopt whatever number the
    // server actually assigned — request.manualOrder.orderNumber is often ''
    // here, and returning '' as draftId is what left the second save with
    // nothing to PUT against.
    const res = await apiPost<CreateOrderResponse>('/order-service/v3/manual-order', { ...request, userId: currentUser.id })
    const orderNumber = res.data?.orderNumber ?? ''
    return { draftId: orderNumber, orderNumber }
  }
  const id = draftId ?? `draft-${++draftSeq}`
  const orderNumber = values.general.orderNumber.trim() // save-gate guarantees non-empty
  const previousNumber = orderNumberByDraftId.get(id)
  if (previousNumber && previousNumber !== orderNumber) draftIdByOrderNumber.delete(previousNumber)
  overlayRows = [
    manualOrderToListRow(request.manualOrder, orderNumber, 'Draft'),
    ...overlayRows.filter(r => r.orderNumber !== orderNumber && r.orderNumber !== previousNumber),
  ]
  draftValues.set(id, structuredClone(values))
  draftIdByOrderNumber.set(orderNumber, id)
  orderNumberByDraftId.set(id, orderNumber)
  return { draftId: id, orderNumber }
}

export interface DraftRecord {
  draftId: string
  values: OrderFormValues
}

/** Resolves by internal draftId OR order number (the ?draft=<orderNumber> URL). */
export async function getDraft(key: string): Promise<DraftRecord | null> {
  if (getApiMode() === 'live') {
    // Session drafts are a mock-only concept — live has no draft store, every
    // row (Draft or not) hydrates through getOrderView. Returning null lets the
    // caller's fallback run; this used to THROW, which rejected the hydration
    // chain and left every live Edit Order form blank (S102 fix).
    return null
  }
  const draftId = draftValues.has(key) ? key : draftIdByOrderNumber.get(key)
  if (!draftId) return null
  const values = draftValues.get(draftId)
  return values ? { draftId, values: structuredClone(values) } : null
}

// ─── Order detail / View Order (spec §3.2) ──────────────────────────────────
// Inverse of manualOrderToListRow: promotes a lean grid row to the DTO subset
// it can fill, so getOrderView feeds the same reverse mapper for every tier.
// commodity → one product line carrying the row's header weight/volume.
function listRowToManualOrder(row: OrderListRow): ManualOrder {
  return {
    orderNumber: row.orderNumber,
    customerId: row.customer,
    freightTermCode: row.freightTerms,
    shipDirectionCode: row.shipDirection,
    requestedPickupDate: row.consignor?.earliestPickupDateTime,
    pickupAppointment: row.consignor?.latestPickupDateTime,
    requestedDeliveryDate: row.consignee?.earliestDeliveryDateTime,
    deliveryAppointment: row.consignee?.latestDeliveryDateTime,
    originPartnerId: row.consignor?.locationId,
    originCity: row.consignor?.city,
    originRegion: row.consignor?.state,
    originCountry: row.consignor?.country,
    destinationPartnerId: row.consignee?.locationId,
    destinationCity: row.consignee?.city,
    destinationRegion: row.consignee?.state,
    destinationCountry: row.consignee?.country,
    grossWeightValue: row.grossWeight?.value,
    grossWeightUomCode: row.grossWeight?.uom,
    volumeValue: row.volume?.value,
    volumeUomCode: row.volume?.uom,
    orderStatus: { orderStatusCode: '', orderStatusName: row.orderStatus ?? '' },
    orderCarrierEquipDetailList: row.equipment ? [{ carrierSequence: 1, equipmentCode: row.equipment }] : [],
    orderLines: row.commodity
      ? [{
          lineIdentifier: 1,
          shipItemIdentifier: '',
          productDescription: row.commodity,
          grossWeightValue: row.grossWeight?.value ?? 0,
          grossWeightUomCode: row.grossWeight?.uom ?? 'lbs',
          volumeValue: row.volume?.value ?? 0,
          volumeUomCode: row.volume?.uom ?? 'cbf',
          shipClass: '',
          // R2-7: carry the grid's row.hazardous onto the synthetic line so the
          // LINX-8121 line→order derivation downstream (mapOrderViewToFormVm,
          // mapFormVmToOrderPane) has something to derive from — lean rows have
          // no other line data. Previously dropped, so a row the grid flagged
          // hazardous showed non-hazardous in View Order.
          hazardous: row.hazardous ?? false,
        }]
      : [],
  }
}

/**
 * View Order detail (LINX-10233/10700). live → POST /order-service/v3/order/view
 * → reverse-map the manualOrder. mock → resolution precedence:
 *   1) draft form values (full fidelity)  2) overlay grid row (lean)
 *   3) seeded orders.json (lean)          not found → null.
 * Returns the form-VM shape the read view consumes (OrderReadView, when built).
 */
export async function getOrderView(
  orderNumber: string,
  customerId?: string,
): Promise<OrderFormValues | null> {
  if (getApiMode() === 'live') {
    // OUR backend resolves by orderNumber alone (orders.order_number is UNIQUE;
    // 'pending-<orderId>' keys resolve by internal id) — the Q30 customerId gate
    // applied to the real order-service contract, not this one. The endpoint
    // returns the lean list row + the manual_order enrichment JSONB; compose
    // them exactly like the mock ladder below.
    const { row, manualOrder } = await apiPost<{ row: OrderListRow; manualOrder: Partial<ManualOrder> | null }>(
      '/order-service/v3/order/view', { orderNumber },
    )
    const dto = manualOrder ? { ...listRowToManualOrder(row), ...manualOrder } : listRowToManualOrder(row)
    return mapOrderViewToFormVm(dto)
  }

  const draftId = draftValues.has(orderNumber) ? orderNumber : draftIdByOrderNumber.get(orderNumber)
  if (draftId) {
    const values = draftValues.get(draftId)
    if (values) return structuredClone(values) // full fidelity
  }
  // Number-less pending orders (async create in flight) are addressed by their
  // synthetic grid key `pending-<orderId>` — resolve by internal orderId.
  const pendingId = orderNumber.startsWith('pending-') ? orderNumber.slice('pending-'.length) : null
  const row = pendingId
    ? (getAllOrders() as OrderListRow[]).find(r => !r.orderNumber && String(r.orderId) === pendingId)
    : overlayRows.find(r => r.orderNumber === orderNumber) ??
      (getAllOrders() as OrderListRow[]).find(r => r.orderNumber === orderNumber)
  if (!row) return null
  // Seeded enrichment (order-details.json — generator invariant I8): the full
  // ManualOrder detail (real lines, instructions, services, contacts) layered
  // over the lean row; enrichment line sums equal the row's header totals, so
  // both tiers tell the same story at different fidelity.
  const enrichment = getOrderEnrichment(orderNumber) as Partial<ManualOrder> | null
  const manualOrder = enrichment
    ? { ...listRowToManualOrder(row), ...enrichment }
    : listRowToManualOrder(row)
  return mapOrderViewToFormVm(manualOrder)
}
