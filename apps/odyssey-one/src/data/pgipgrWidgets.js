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
 * COLOUR IS SEMANTIC AT THE TOP LEVEL. The All donut sets three categories
 * against each other, so its three colours have to mean something:
 *   PGI/PGR Errors  Bittersweet  — data arrived and FAILED validation
 *   Rating Failure  Tan Hide/300 — light orange: nothing is broken, not yet rated
 *   Manual PGI/PGR  Ice Blue     — not an error at all: work waiting on a person
 * Red / orange / blue reads error → gap → routine, which is the actual shape of
 * these three. Inside a single widget every slice is the SAME kind of thing
 * (all ten are validation errors), so there is no severity to encode — the job
 * there is only distinctness, and the ramp below carries the card's identity
 * colour onto its largest slice.
 *
 * Sources for the category vocabulary: PGI/PGR interface validation, the
 * Rating Errors Overview (error code 387, HTTP 400/500, spot='Y') and the
 * Customer PGI/PGR Configuration profile (Manual PGI: Yes, overdue threshold,
 * line-level reconciliation). Counts themselves are invented.
 */
export const PGIPGR_WIDGETS = [
  {
    key: 'pgipgr-errors',
    // Colour for THIS category in the All roll-up (one per hue family, so the
    // summary donut reads as three categories, not three shades).
    rollupColor: 'var(--chart-10)',   // Bittersweet — data that FAILED validation
    badgeKey: 'pgipgrErrors',
    title: 'PGI/PGR Errors',
    metricLabel: 'Validation errors',
    // Executed shipments whose PGI/PGR payload from the customer ERP failed
    // interface data validation.
    slices: [
      { label: 'Shipment ID Not Found', value: 72 },
      { label: 'SCAC Error', value: 58 },
      { label: 'Unit (UoM)', value: 44 },
      { label: 'Equipment / Equipment Type', value: 39 },
      { label: 'Time Zone', value: 34 },
      { label: 'Ship Item', value: 28 },
      { label: 'Commodity Code', value: 26 },
      { label: 'Packaging Type', value: 21 },
      { label: 'Hazmat Group', value: 15 },
      { label: 'Product Class', value: 11 },
    ],
  },
  {
    key: 'rating-failure',
    // Colour for THIS category in the All roll-up (one per hue family, so the
    // summary donut reads as three categories, not three shades).
    rollupColor: 'var(--chart-4)',    // Tan Hide/300 — LIGHT ORANGE: rated nothing yet, but nothing is broken
    badgeKey: 'ratingFailure',
    title: 'Rating Failure',
    metricLabel: 'Unrated shipments',
    // Automatic rating/re-rating after PGI/PGR or tender acceptance failed.
    slices: [
      { label: 'Base Rate Unavailable', value: 61 },
      { label: 'Rate Validation / Spot Quote Required', value: 28 },
      { label: 'Invalid / Missing System ID', value: 22 },
      { label: 'Service Unavailable', value: 15 },
    ],
  },
  {
    key: 'manual-pgipgr',
    // Colour for THIS category in the All roll-up (one per hue family, so the
    // summary donut reads as three categories, not three shades).
    rollupColor: 'var(--chart-1)',    // Ice Blue — not an error at all: work waiting on a person
    badgeKey: 'manualPgipgr',
    title: 'Manual PGI/PGR',
    metricLabel: 'In manual review',
    // Shipments needing operational intervention per the customer's PGI/PGR profile.
    slices: [
      { label: 'Pending Manual Entry', value: 96 },
      { label: 'Missed PGI/PGR (Overdue)', value: 63 },
      { label: 'Line-Level Update Required', value: 35 },
    ],
  },
]

// The palette in the token file's own pair order. A widget's slices walk it
// from ITS OWN rollup colour, wrapping — so the card's biggest slice is the
// colour that card has in the All donut, and a reader can carry one identity
// from the summary into the breakdown. Within a donut every slice is distinct,
// which is the only hard requirement; repeats ACROSS donuts are fine, they are
// separate charts.
const PALETTE = Array.from({ length: 11 }, (_, i) => `var(--chart-${i + 1})`)

for (const w of PGIPGR_WIDGETS) {
  // The card's biggest slice is the colour that card has in All, so one
  // identity carries from summary into breakdown. `rampStart` is the escape
  // hatch for a card whose own ramp should begin elsewhere — unused today,
  // every card leads with its rollup colour.
  const start = PALETTE.indexOf(w.rampStart ?? w.rollupColor)
  w.slices.forEach((s, i) => { s.color = PALETTE[(start + i) % PALETTE.length] })
}

/** A widget's centre metric — the sum of its slices, never a separate number. */
export const widgetTotal = (w) => w.slices.reduce((sum, s) => sum + s.value, 0)

/** `{ pgipgrErrors, ratingFailure, manualPgipgr }` — the demo counts as badges. */
export const PGIPGR_DEMO_COUNTS = Object.fromEntries(
  PGIPGR_WIDGETS.map((w) => [w.badgeKey, widgetTotal(w)]),
)
