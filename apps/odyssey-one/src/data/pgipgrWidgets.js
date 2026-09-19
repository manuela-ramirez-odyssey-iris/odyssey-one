/**
 * PGI/PGR widget breakdowns — HARDCODED, and deliberately so.
 *
 * No seeded shipment carries `panel: 'pgipgr'` (the corpus is exceptions +
 * monitoring only); the panel is kept visible as a demo surface with zero
 * counts. So there is nothing to derive these from, and nothing they can
 * contradict. They exist to show the SHAPE of the three PGI/PGR subtabs as
 * widgets (user, 2026-09-18: "some hardcoded data … we just need to show how
 * it looks"). Replace with real counts when PGI/PGR is modelled — the panel
 * reads live counts first and only falls back to these when they are 0.
 *
 * Each entry mirrors one `PANEL_CONFIG.pgipgr` category, keyed by the same
 * `key`/`badgeKey`, so the tab badges and the widgets cannot disagree.
 *
 * Slice colours run --chart-1 upward in the token file's own pair order
 * (1/2 Ice Blue · 3/4 Tan Hide · 5/6 Caribbean Green · 7/8 Sunrise Yellow ·
 * 9 Purple · 10/11 Bittersweet). Bittersweet landing on a small slice is not a
 * severity signal — on a legend row a colour is a category, not a verdict
 * (tokens.css, D17).
 *
 * Sources for the category vocabulary: PGI/PGR interface validation, the
 * Rating Errors Overview (error code 387, HTTP 400/500, spot='Y') and the
 * Customer PGI/PGR Configuration profile (Manual PGI: Yes, overdue threshold,
 * line-level reconciliation). Counts themselves are invented.
 */
export const PGIPGR_WIDGETS = [
  {
    key: 'pgipgr-errors',
    badgeKey: 'pgipgrErrors',
    title: 'PGI/PGR Errors',
    metricLabel: 'Validation errors',
    // Executed shipments whose PGI/PGR payload from the customer ERP failed
    // interface data validation.
    slices: [
      { label: 'Shipment ID Not Found', value: 72, color: 'var(--chart-1)' },
      { label: 'SCAC Error', value: 58, color: 'var(--chart-2)' },
      { label: 'Unit (UoM)', value: 44, color: 'var(--chart-3)' },
      { label: 'Equipment / Equipment Type', value: 39, color: 'var(--chart-4)' },
      { label: 'Time Zone', value: 34, color: 'var(--chart-5)' },
      { label: 'Ship Item', value: 28, color: 'var(--chart-6)' },
      { label: 'Commodity Code', value: 26, color: 'var(--chart-7)' },
      { label: 'Packaging Type', value: 21, color: 'var(--chart-8)' },
      { label: 'Hazmat Group', value: 15, color: 'var(--chart-9)' },
      { label: 'Product Class', value: 11, color: 'var(--chart-10)' },
    ],
  },
  {
    key: 'rating-failure',
    badgeKey: 'ratingFailure',
    title: 'Rating Failure',
    metricLabel: 'Unrated shipments',
    // Automatic rating/re-rating after PGI/PGR or tender acceptance failed.
    slices: [
      { label: 'Base Rate Unavailable', value: 61, color: 'var(--chart-1)' },
      { label: 'Rate Validation / Spot Quote Required', value: 28, color: 'var(--chart-2)' },
      { label: 'Invalid / Missing System ID', value: 22, color: 'var(--chart-3)' },
      { label: 'Service Unavailable', value: 15, color: 'var(--chart-4)' },
    ],
  },
  {
    key: 'manual-pgipgr',
    badgeKey: 'manualPgipgr',
    title: 'Manual PGI/PGR',
    metricLabel: 'In manual review',
    // Shipments needing operational intervention per the customer's PGI/PGR profile.
    slices: [
      { label: 'Pending Manual Entry', value: 96, color: 'var(--chart-1)' },
      { label: 'Missed PGI/PGR (Overdue)', value: 63, color: 'var(--chart-2)' },
      { label: 'Line-Level Update Required', value: 35, color: 'var(--chart-3)' },
    ],
  },
]

/** A widget's centre metric — the sum of its slices, never a separate number. */
export const widgetTotal = (w) => w.slices.reduce((sum, s) => sum + s.value, 0)

/** `{ pgipgrErrors, ratingFailure, manualPgipgr }` — the demo counts as badges. */
export const PGIPGR_DEMO_COUNTS = Object.fromEntries(
  PGIPGR_WIDGETS.map((w) => [w.badgeKey, widgetTotal(w)]),
)
