// Single source of truth for panel names and category labels.
// MonitorPanels and ShipmentTabs both derive from this config.

export const PANEL_CONFIG = {
  exceptions: {
    title: 'Shipment Exceptions',
    categories: [
      { key: 'date-issues', label: 'Date Issues', badgeKey: 'dateIssues' },
      { key: 'routing-review', label: 'Routing Review', badgeKey: 'routingReview' },
      { key: 'tender-issues', label: 'Tender Issues', badgeKey: 'tenderIssues' },
      { key: 'tender-review', label: 'Tender Review', badgeKey: 'tenderReview' },
      { key: 'bid-review', label: 'Bid Review', badgeKey: 'bidReview' },
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
