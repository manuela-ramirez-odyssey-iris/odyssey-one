// Single source of truth for panel names and category labels.
// ShipmentsPanelTabs (panel tabs + category pill/widget rows) derives from this config.

export const PANEL_CONFIG = {
  exceptions: {
    title: 'Shipment Exceptions',
    categories: [
      { key: 'date-issues', label: 'Date Issues', badgeKey: 'dateIssues' },
      { key: 'routing-review', label: 'Routing Review', badgeKey: 'routingReview' },
      { key: 'tender-issues', label: 'Tender Issues', badgeKey: 'tenderIssues' },
      { key: 'tender-review', label: 'Tender Review', badgeKey: 'tenderReview' },
      { key: 'bid-review', label: 'Bid Review', badgeKey: 'bidReview' },
      { key: 'order-change', label: 'Order Change', badgeKey: 'orderChange' },
    ],
  },
  monitoring: {
    title: 'Monitoring',
    categories: [
      { key: 'hold', label: 'Hold', badgeKey: 'hold' },
      { key: 'consolidation', label: 'Consolidation', badgeKey: 'consolidation' },
      { key: 'sent', label: 'Tender Sent', badgeKey: 'sent' },
      { key: 'spotbid', label: 'SpotBid', badgeKey: 'spotBid' },
      { key: 'approved', label: 'Approved', badgeKey: 'approved' },
    ],
  },
  pgipgr: {
    title: 'PGI/PGR',
    categories: [
      { key: 'pgipgr-errors', label: 'PGI/PGR Errors', badgeKey: 'pgipgrErrors' },
      { key: 'rating-failure', label: 'Rating Failure', badgeKey: 'ratingFailure' },
      { key: 'manual-pgipgr', label: 'Manual PGI/PGR', badgeKey: 'manualPgipgr' },
    ],
  },
}

/**
 * Matches per panel for a metrics object (the per-category counts the count
 * endpoint returns). Shared by the zero-count hiding and the search auto-jump.
 */
export function panelTotals(metrics) {
  const out = {}
  for (const key of Object.keys(PANEL_CONFIG)) {
    out[key] = (PANEL_CONFIG[key]?.categories ?? [])
      .reduce((sum, c) => sum + (metrics?.[c.badgeKey] ?? 0), 0)
  }
  return out
}

/**
 * Which panel a committed search should land on: the one holding the MOST
 * matches (GS-17 — panels are post-filters over one result set, so the user
 * should land where the results are, not on whichever tab they happened to be
 * on). Ties break on PANEL_CONFIG order. Returns null when nothing matches
 * anywhere, so the caller leaves the current panel alone.
 */
export function bestPanelForSearch(totals) {
  return Object.keys(PANEL_CONFIG)
    .filter((key) => (totals?.[key] ?? 0) > 0)
    .sort((a, b) => totals[b] - totals[a])[0] ?? null
}

/**
 * GS-18 landing target for a committed search. `preferred` is the panel of the
 * PREVIEW's leading result group (what the user's eyes were on) — honored when
 * it actually has matches under the committed criteria; 'auto' (unreadable
 * preview) or a zero-match preferred panel falls back to the fullest panel
 * (GS-17 / bestPanelForSearch). Null = nothing matches anywhere; stay put.
 */
export function landingPanel(preferred, totals) {
  if ((totals?.[preferred] ?? 0) > 0) return preferred
  return bestPanelForSearch(totals)
}
