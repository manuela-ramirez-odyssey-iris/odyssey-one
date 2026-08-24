// Live (Neon-backed) implementation of the Shipments search contract (S104).
//
// It implements the SAME three methods as the mock adapter and returns the SAME
// row shape — including `data-panel` and `data-attr`, which GS-18's landing rule
// and `panelForResults` read. The row-building helpers are IMPORTED from the mock
// adapter rather than reimplemented: two surfaces that are supposed to be
// identical drift the moment they are written twice (S104's preview≡table lesson,
// one layer up).
//
// Mock stays the CASE-DISCOVERY environment and the behavioural reference this
// path is checked against (user ruling, S104) — it is not dead code.
// Paths passed to apiPost are RELATIVE to the client's /api base
// (VITE_API_BASE_URL=/api) — '/api/v1/search' here becomes /api/api/v1/search on
// the wire and 404s. Third occurrence of the /api-prefix defect class (S104/S105:
// router paths, then these) — liveAdapter.paths.test.js pins it.
import { apiPost } from '../../api/client'
import { SHIPMENTS_ATTRIBUTES } from './progression'
import { formatLocation, toStatusBadge, toTenderBadge, toItem, DATE_LIKE } from './adapter'

const ATTR_BY_KEY = Object.fromEntries(SHIPMENTS_ATTRIBUTES.map((a) => [a.key, a]))
// The Filters view addresses an attribute by its dataKey (the field name on a
// mock row); the values endpoint addresses it by registry KEY. One map, built
// from the same single source of truth, rather than a second hand-kept list.
const ATTR_KEY_BY_DATAKEY = Object.fromEntries(SHIPMENTS_ATTRIBUTES.map((a) => [a.dataKey, a.key]))
// One dropdown page. Small enough that opening a field is cheap, big enough
// that most catalogs (SCAC, Consignor) never need a second fetch.
const VALUES_PAGE = 50

// "Order #" + "0000000091000" → "Order #0000000091000"; labels not ending in '#'
// get a space ("SCAC FXFE"). Same rule as the mock's labelMatch (GS-15).
function label(attrKey, display) {
  const attr = ATTR_BY_KEY[attrKey]
  const text = attr?.label ?? attrKey
  const value = attr?.dataKey === 'origin' || attr?.dataKey === 'destination'
    ? formatLocation(display)
    : display
  return text.endsWith('#') ? `${text}${value}` : `${text} ${value}`
}

function toRow({ entity_id: entityId, attr, display, entity }) {
  const s = entity ?? {}
  const isOrder = attr === 'order'
  return {
    id: isOrder ? `${s.buyShipment ?? entityId}-${display}` : (s.buyShipment ?? entityId),
    'data-shipment-key': entityId,
    // Both feed panelForResults (GS-18) — the landing tab is chosen from what the
    // user can SEE at the top of the preview, so a missing panel breaks it.
    'data-panel': s.panel,
    'data-attr': attr,
    matchId: label(attr, display),
    route: `${formatLocation(s.origin)} → ${formatLocation(s.destination)}`,
    customer: s.customerName,
    carrier: s.scac,
    bol: s.pro,
    ...(isOrder
      ? { shipmentId: s.buyShipment, iconType: 'package', source: toTenderBadge(s) }
      : { source: toStatusBadge(s) }),
    ...(CUSTOMER_ATTRS.has(attr) && { iconType: 'handshake' }),
  }
}

const CUSTOMER_ATTRS = new Set(['customer-id', 'customer-name', 'consignor', 'consignee'])

export function makeLiveAdapter(base) {
  return {
    ...base,

    // Empty-bar / drill-forward suggestions are pure progression logic over the
    // committed chips — no data involved, so the mock implementation IS correct
    // in live mode (GS-14).
    getInitial: base.getInitial.bind(base),

    // Filters-view value suggestions (S107). The mock version reads the LOCAL
    // seed index — wrong data in live mode (the resolveCodeSet lesson, S106) —
    // so this hits the real per-attribute values endpoint instead (S130; until
    // it existed this was `null`, which made every `letters` control degrade to
    // a plain text field with no dropdown at all).
    //
    // PAGED: resolving `{ options, total }` puts the ComboBox in lazy-load mode
    // — one 50-row page on open, the next fetched only when the user scrolls to
    // the end of the list. That is what keeps Customer Name (hundreds of
    // distinct values) from shipping its whole catalog to open a dropdown.
    // `skip` is supplied by the ComboBox itself; the mock's plain-array return
    // stays legacy (unpaged) and both are handled by the same component.
    async getAttributeValues(dataKey, query, skip = 0) {
      const attr = ATTR_KEY_BY_DATAKEY[dataKey]
      if (!attr) return { options: [], total: 0 }
      const { values, total } = await apiPost('/v1/search/values', {
        domain: 'shipments',
        attr,
        query: query || '',
        page: { limit: VALUES_PAGE, skip },
      })
      return { options: values ?? [], total: total ?? 0 }
    },

    async getSuggestions(query) {
      const q = (query || '').trim()
      if (!q) return this.getInitial([])
      // Case 12 (GS-22): a slashed date-like query is pure config — the date +
      // range chips need no data, so the mock implementation IS correct in
      // live mode (same reasoning as getInitial above).
      if (DATE_LIKE.test(q)) return base.getSuggestions(q)
      const { attributes } = await apiPost('/v1/search/suggest', {
        domain: 'shipments',
        criteria: { chips: [], text: q },
        scope: {},
      })
      const items = (attributes ?? [])
        .map((a) => ATTR_BY_KEY[a.attr])
        .filter(Boolean)
        .map((attr) => toItem(attr, q))
      // Same title as the mock: at this moment the panel's job is to say what the
      // typed thing COULD be, not to offer filters.
      return items.length ? [{ title: 'What is it?', items }] : []
    },

    async searchShipments(chips, query = '', customerIds) {
      const q = (query || '').trim()
      const chipList = chips ?? []
      if (!chipList.length && !q) return { results: [], total: 0 }
      const { results, total } = await apiPost('/v1/search', {
        domain: 'shipments',
        criteria: { chips: chipList, text: q },
        scope: customerIds ? { customerIds } : {},
        page: { limit: 15 },
      })
      return { total: total ?? 0, results: (results ?? []).map(toRow) }
    },
  }
}
