import { getApiMode } from '../config'
import { apiGet, apiPost } from '../client'
import { getAllShipments } from '../../data'
// Shared chip+text matcher — the SAME predicate the GlobalSearch glimpse uses
// (adapter.searchShipments), so criteria-filtered panel totals always sum to the
// glimpse total (S79c decision 7).
import { hasCriteria, matchesCriteria, compareByCriteria, textNeedles, FREE_TEXT_KEYS } from '../../search/shipments/criteria'
import { FREE_TEXT_ATTRS } from '../../search/shipments/progression'

/**
 * Sentinel `sortBy` meaning "order by search relevance, no column drives".
 * The shipments table always has a sorted column (DataTable never renders
 * unsorted), so relevance needs its own sort identity rather than the absence
 * of one — otherwise the default column sort silently wins (GS-16 follow-up).
 */
export const RELEVANCE_SORT = 'relevance'
import type {
  ShipmentErrorRow,
  ShipmentErrorListResponse,
  ShipmentErrorListParams,
  CategoryCount,
  SearchCriteria,
} from '../types/shipmentErrorList'

interface CategoryCountParams {
  panel: string
  // Committed GlobalSearch criteria — counts filter BEFORE counting so tab badges,
  // category pills and metrics reflect the active search (S79c decision 7).
  searchCriteria?: SearchCriteria
  // Customer scoping (S79c decision 10) — FIRST-order filter, applied before the
  // panel. Omit = unscoped; [] = zero counts (no data-backed customers selected).
  customerIds?: string[]
}

// FIRST-order customer scope (S79c decision 10): rows outside the selected
// customers' dataIds don't exist for this user — applied before panel, category,
// search criteria and filters. `undefined` = unscoped (legacy callers/tests);
// `[]` honestly yields nothing.
function scopeToCustomers(rows: ShipmentErrorRow[], customerIds?: string[]): ShipmentErrorRow[] {
  if (!customerIds) return rows
  const ids = new Set(customerIds)
  return rows.filter(r => ids.has(r.customerId))
}

export async function getCategoryCounts(params: CategoryCountParams): Promise<CategoryCount[]> {
  if (getApiMode() === 'live') {
    // Real: GET /shipment-service/v1/shipment/error/category/count → { errorOverview, total }
    // Our fake backend grew the customerIds filter (plan deviation 1). searchText
    // landed with the S104 search slice — without it the tab badges counted the
    // whole panel while the grid below showed the search's rows.
    const search = new URLSearchParams({ panel: params.panel })
    if (params.customerIds !== undefined) search.set('customerIds', params.customerIds.join(','))
    const criteriaText = params.searchCriteria?.text?.trim()
    if (criteriaText) search.set('searchText', criteriaText)
    // Committed chips (GS-12 follow-up) — GET has no body, so they ride a
    // JSON-encoded param. Server parses defensively; only key/queryValue are
    // sent (the rest of the chip shape is UI-only: label, group, dataKey...).
    const chips = params.searchCriteria?.chips
    if (chips?.length) {
      search.set('searchChips', JSON.stringify(chips.map(c => ({ key: c.key, queryValue: c.queryValue }))))
    }
    const res = await apiGet<{ errorOverview: CategoryCount[] }>(
      `/shipment-service/v1/shipment/error/category/count?${search.toString()}`,
    )
    return res.errorOverview ?? []
  }
  // mock: group the panel's rows by category (after applying the customer scope
  // and committed search criteria)
  let rows = scopeToCustomers(getAllShipments() as ShipmentErrorRow[], params.customerIds)
    .filter(r => r.panel === params.panel)
  if (hasCriteria(params.searchCriteria)) {
    // Text interpretation resolved once against the FULL dataset (GS-20), so the
    // counts read the query identically to the glimpse and the list.
    const needles = textNeedles(getAllShipments() as ShipmentErrorRow[], params.searchCriteria!.text)
    rows = rows.filter(r => matchesCriteria(r, params.searchCriteria, needles))
  }
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  return [...counts].map(([category, count]) => ({ category, count }))
}

// Legacy free-text search fields — same single-source list the shared criteria
// matcher uses (S79c decision 7); keeps the legacy searchTerm path coherent.
const SEARCH_FIELDS = FREE_TEXT_KEYS as (keyof ShipmentErrorRow)[]

function toISO(dateStr: string): string | null {
  if (!dateStr) return null
  const datePart = dateStr.split(' ')[0]
  const [mm, dd, yyyy] = datePart.split('/')
  if (!mm || !dd || !yyyy) return null
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

function fieldContains(row: ShipmentErrorRow, key: keyof ShipmentErrorRow, needle: string): boolean {
  const raw = row[key]
  const vals = Array.isArray(raw) ? raw : [raw]
  return vals.some(v => String(v ?? '').toLowerCase().includes(needle))
}

export async function getShipmentErrorList(
  params: ShipmentErrorListParams,
): Promise<ShipmentErrorListResponse> {
  if (getApiMode() === 'live') {
    // Real: POST /shipment-service/pgi-pgr/v1/error/list → { pageNumber, pageSize, totalCount, <rows> }
    const res = await apiPost<ShipmentErrorListResponse & Record<string, unknown>>(
      `/shipment-service/pgi-pgr/v1/error/list`,
      {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        // searchFilters stays NESTED (not spread flat) so the server can tell
        // substring-filters from exact-filters and apply ILIKE not = (Task 5 review).
        filter: {
          panel: params.panel, category: params.category, customerIds: params.customerIds,
          ...params.filter, ...params.dateFilters,
          searchTerm: params.searchTerm, searchCriteria: params.searchCriteria,
          ...(params.searchFilters !== undefined ? { searchFilters: params.searchFilters } : {}),
        },
        sortBy: params.sortBy,
        orderBy: params.orderBy,
      },
    )
    // normalize the (TBD) row-array name to `rows`
    const rows = (res.rows ?? (res as Record<string, unknown>).errors ?? (res as Record<string, unknown>).data ?? []) as ShipmentErrorRow[]
    return { pageNumber: res.pageNumber, pageSize: res.pageSize, totalCount: res.totalCount, rows }
  }

  // ── mock: simulate the paginated server over shipments.json ──
  // Customer scope first (decision 10), then panel/category.
  let rows = scopeToCustomers(getAllShipments() as ShipmentErrorRow[], params.customerIds)
    .filter(r => r.panel === params.panel)
  if (params.category && params.category !== 'all') rows = rows.filter(r => r.category === params.category)

  // committed GlobalSearch criteria (chips ANDed + free text) — applied after
  // panel/category scoping with the SAME matcher as the search-panel glimpse
  const criteriaNeedles = hasCriteria(params.searchCriteria)
    ? textNeedles(getAllShipments() as ShipmentErrorRow[], params.searchCriteria!.text)
    : []
  if (hasCriteria(params.searchCriteria)) {
    rows = rows.filter(r => matchesCriteria(r, params.searchCriteria, criteriaNeedles))
  }

  // exact-equality filters (FilterPanel dropdown selections)
  if (params.filter) {
    for (const [key, value] of Object.entries(params.filter)) {
      if (!value) continue
      rows = rows.filter(r => String((r as unknown as Record<string, unknown>)[key] ?? '') === value)
    }
  }

  // substring filters per field (saved-query conditions, e.g. origin:Dallas → "Dallas TX US 75201")
  if (params.searchFilters) {
    for (const [key, value] of Object.entries(params.searchFilters)) {
      if (!value) continue
      rows = rows.filter(r => fieldContains(r, key as keyof ShipmentErrorRow, value.toLowerCase()))
    }
  }

  // date-range filters
  const df = params.dateFilters
  if (df) {
    if (df.pickupDateFrom) rows = rows.filter(r => { const d = toISO(r.pickupDate); return d != null && d >= df.pickupDateFrom! })
    if (df.pickupDateTo)   rows = rows.filter(r => { const d = toISO(r.pickupDate); return d != null && d <= df.pickupDateTo! })
    if (df.deliveryDateFrom) rows = rows.filter(r => { const d = toISO(r.deliveryDate); return d != null && d >= df.deliveryDateFrom! })
    if (df.deliveryDateTo)   rows = rows.filter(r => { const d = toISO(r.deliveryDate); return d != null && d <= df.deliveryDateTo! })
  }

  // free-text search
  const term = params.searchTerm?.trim().toLowerCase()
  if (term) {
    if (params.searchAttributeKey) {
      const key = params.searchAttributeKey as keyof ShipmentErrorRow
      rows = rows.filter(r => fieldContains(r, key, term))
    } else {
      rows = rows.filter(r => SEARCH_FIELDS.some(k => fieldContains(r, k, term)))
    }
  }

  // optional sort — numeric-aware ('10' sorts after '2', not before: orderCount etc.
  // are numeric strings). ponytail: date columns sort lexically (values are display
  // strings) — parse to Date here if that ever matters for the prototype.
  if (params.sortBy && params.sortBy !== RELEVANCE_SORT) {
    const key = params.sortBy as keyof ShipmentErrorRow
    const dir = params.orderBy === 'desc' ? -1 : 1
    rows = [...rows].sort((a, b) =>
      String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, { numeric: true }) * dir)
  } else if (hasCriteria(params.searchCriteria)) {
    // Rows arrived from a search and no COLUMN sort is driving → order them
    // exactly as the results preview did, so "Show all results" lands on the
    // list the user was just looking at, exact match first (S104, GS-16).
    //
    // The `RELEVANCE_SORT` sentinel exists because this table is never unsorted:
    // the route seeds `sorting` with a real column, so `sortBy` was ALWAYS set
    // and this branch was dead in the app (caught by the user, not by a test —
    // the S104 test called this service directly and omitted sortBy).
    const cmp = compareByCriteria(params.searchCriteria, FREE_TEXT_ATTRS, criteriaNeedles)
    if (cmp) rows = [...rows].sort(cmp)
  }

  const totalCount = rows.length
  const start = params.pageNumber * params.pageSize
  return {
    pageNumber: params.pageNumber,
    pageSize: params.pageSize,
    totalCount,
    rows: rows.slice(start, start + params.pageSize),
  }
}
