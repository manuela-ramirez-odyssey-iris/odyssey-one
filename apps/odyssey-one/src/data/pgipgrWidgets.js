/**
 * PGI/PGR widget breakdowns — HARDCODED, and deliberately so.
 *
 * No seeded shipment carries `panel: 'pgipgr'` (the corpus is exceptions +
 * monitoring only); the panel is kept visible as a demo surface with zero
 * counts. So there is nothing to derive these from, and nothing they can
 * contradict. They exist to show the SHAPE of the four PGI/PGR subtabs as
 * widgets (user, 2026-09-18: "some hardcoded data … we just need to show how
 * it looks"). Replace with real counts when PGI/PGR is modelled — the panel
 * reads live counts first and only falls back to these when they are 0.
 *
 * Each entry mirrors one `PANEL_CONFIG.pgipgr` category, keyed by the same
 * `key`/`badgeKey`, so the tab badges and the widgets cannot disagree.
 *
 * 4 CATEGORIES (2026-09-24 Figma pass, x38TOJGsNryYl3LsKhCtSc), replacing the
 * earlier 3 (PGI/PGR Errors / Rating Failure / Manual PGI/PGR — Manual PGI/PGR
 * is retired, no longer part of the domain). Unlike the retired shape there is
 * no roll-up "All" card summarizing the four against each other — the mock
 * shows exactly four selectable cards, each its own donut + legend breakdown:
 *
 *   Post PGI/PGR Errors  Ice Blue/600     — data arrived and FAILED validation
 *   All Sell Shipments   Tan Hide/600     — every executed sell shipment, by status
 *   Rating Errors        Bittersweet/600  — RED: automatic rating/re-rating failed
 *   Not Responsible      Tan Hide/300     — light orange: rating manually marked
 *                                           not responsible, no further auto-rate
 *
 * Sources for the category vocabulary: PGI/PGR interface validation, the
 * Rating Errors Overview (error code 387, HTTP 400/500, spot='Y') and the
 * Customer PGI/PGR Configuration profile. Counts themselves are invented.
 *
 * SLICE COUNT PER CARD IS EXACT, not illustrative (user fix, screenshot-
 * confirmed legend rows on Figma node 2554:58830's 4-card row): Post PGI/PGR
 * Errors carries 2 (SCAC Error, Shipment ID Not Found); the other three each
 * carry exactly 1 — the whole category as one slice, same as its own card
 * title. A single-slice card's donut is NOT a full ring: the mock shows one
 * colored arc + a grey `--chart-rest` remainder, so `chartTotal` below is set
 * higher than the slice value on purpose (Widget's own doc says "omit for
 * 3xChart", but WidgetPieChart's `total` prop works identically on every
 * variant, and this is the one 3xChart case that needs it).
 */
export const PGIPGR_WIDGETS = [
  {
    key: 'post-errors',
    rollupColor: 'var(--chart-1)', // Ice Blue/600 — data that FAILED validation
    badgeKey: 'postErrors',
    title: 'Post PGI/PGR Errors',
    metricLabel: 'Validation errors',
    slices: [
      { label: 'SCAC Error', value: 72 },
      { label: 'Shipment ID Not Found', value: 58 },
    ],
  },
  {
    key: 'all-sell-shipments',
    rollupColor: 'var(--chart-3)', // Tan Hide/600 — orange
    badgeKey: 'allSellShipments',
    title: 'All Sell Shipments',
    metricLabel: 'Executed sell shipments',
    slices: [{ label: 'All Sell Shipments', value: 354 }],
    chartTotal: 1345, // ~26% fill + grey remainder, matching the mock
  },
  {
    key: 'rating-errors',
    rollupColor: 'var(--chart-10)', // Bittersweet/600 — RED (user fix, was purple)
    badgeKey: 'ratingErrors',
    title: 'Rating Errors',
    metricLabel: 'Unrated shipments',
    slices: [{ label: 'Base Rate Not Available', value: 61 }],
    chartTotal: 232,
  },
  {
    key: 'not-responsible',
    rollupColor: 'var(--chart-4)', // Tan Hide/300 — LIGHT ORANGE
    badgeKey: 'notResponsible',
    title: 'Not Responsible',
    metricLabel: 'Marked not responsible',
    slices: [{ label: 'Not Responsible', value: 61 }],
    chartTotal: 232,
  },
]

// The palette in the token file's own pair order. A widget's slices walk it
// from ITS OWN rollup colour, wrapping — so the card's biggest slice is the
// colour that card has in the category strip, and a reader can carry one
// identity from the summary into the breakdown. Within a donut every slice is
// distinct, which is the only hard requirement; repeats ACROSS donuts are
// fine, they are separate charts.
const PALETTE = Array.from({ length: 11 }, (_, i) => `var(--chart-${i + 1})`)

for (const w of PGIPGR_WIDGETS) {
  const start = PALETTE.indexOf(w.rampStart ?? w.rollupColor)
  w.slices.forEach((s, i) => { s.color = PALETTE[(start + i) % PALETTE.length] })
}

/** A widget's centre metric — the sum of its slices, never a separate number. */
export const widgetTotal = (w) => w.slices.reduce((sum, s) => sum + s.value, 0)

/** `{ postErrors, allSellShipments, ratingErrors, notResponsible }` — the demo counts as badges. */
export const PGIPGR_DEMO_COUNTS = Object.fromEntries(
  PGIPGR_WIDGETS.map((w) => [w.badgeKey, widgetTotal(w)]),
)

/**
 * There is no roll-up "All" tab in the 4-card shape — the default selection is
 * simply the first card. Callers that may still be holding the old generic
 * 'all' key (route default state, consolidate-mode restore, etc.) resolve it
 * through here rather than each re-deriving the fallback.
 */
export function effectivePgipgrTab(activeTab) {
  return PGIPGR_WIDGETS.some((w) => w.key === activeTab) ? activeTab : PGIPGR_WIDGETS[0].key
}
