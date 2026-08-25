/**
 * Live (Neon-backed) Orders search — the preview half (S131).
 *
 * WHY IT EXISTS: the mock adapter reads `orders.json` (5,077 seeded rows) while
 * the grid reads the API (23,839 rows in Neon, and DIFFERENT order numbers for
 * the same ids — see project_orders_seed_vs_neon_drift). In live mode that put
 * two datasets on one screen: searching "er" showed "Show all 56 results" and
 * landed on a table reading 293 items. Nothing was wrong with either number;
 * they were answers to the same question from different databases.
 *
 * The fix is not a second search engine. `search()` asks the ORDER LIST endpoint
 * — the very call the grid makes, with the very criteria the grid will commit —
 * and reports its `totalCount`. Preview count ≡ grid count by construction, the
 * same guarantee `criteria-core` gives the mock, and relevance ordering comes
 * from the server rather than being re-derived here.
 *
 * STILL LOCAL, deliberately: `getInitial` / `getSuggestions` / `getAttributeValues`.
 * Suggestions are built from distinct VALUES, and orders are not projected into
 * `search_index` (that table is Shipments-only), so there is no live values
 * endpoint to ask yet. A suggestion is a prompt, not a claim about the result
 * set — the moment it commits, everything below it is live. Give orders an index
 * (or a values endpoint) and this file is where that swap lands.
 */
import { getOrderList } from '../../api/services/orderService'
import { toPreviewRows } from './adapter'

// One preview page — the same 15 rows the mock returns, so the panel looks
// identical in both modes.
const PREVIEW_ROWS = 15

export function makeLiveAdapter(mock) {
  return {
    ...mock,
    async search(chips, query = '', customerIds) {
      const chipList = chips || []
      const text = String(query || '').trim()
      if (!chipList.length && !text) return { results: [], total: 0 }

      const filters = {}
      if (chipList.length) filters.searchChips = chipList
      if (text) filters.searchText = text

      // `getOrderList` owns the live/mock split, the customer scope folding and
      // the phrase-vs-code-list two-step — the preview must read a query the
      // same way the table does, and that logic already lives there. The scope
      // rides as the second argument, exactly as the grid passes it.
      const res = await getOrderList({
        pagination: { pageNumber: 1, pageSize: PREVIEW_ROWS },
        filters,
      }, customerIds)
      return {
        results: toPreviewRows(res.orders ?? [], chipList, text),
        total: res.pagination?.totalCount ?? 0,
      }
    },
  }
}
