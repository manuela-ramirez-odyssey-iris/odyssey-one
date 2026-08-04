/**
 * SummaryStrip (molecule) — the full-width tab-summary band: a centered row of
 * fixed-width stat cells (uppercase muted label over a semibold value), each
 * carrying a right-hand vertical divider (INCLUDING the last — per the master),
 * on a white band closed by a bottom hairline. Sits directly on the pane
 * canvas above the tab's content column (Stops KPIs, Cost Allocation summary).
 *
 * Figma: `SummaryStrip` COMPONENT 4234:1291 (Components-Molecules › Sections;
 * né `Overview` frame 4178:8365 — componentized by us 2026-07-06 with Label
 * 1–6 / Value 1–6 TEXT props, per the SectionHeader convention). Cells are
 * fixed 152px and the row is horizontally CENTERED inside 48px band padding
 * (Spacing/12). Cell: 12/16 padding (Spacing/3 / Spacing/4), 4px label↔value
 * gap (Spacing/1), divider Deep Sea Neutral/200. Label = label/xs medium,
 * Text/tertiary, letter-spacing 0 (uppercase is content in Figma; code uses
 * text-transform so consumers pass natural-case labels). Value = label/base
 * semibold, Text/primary (bound 2026-07-06 — was raw #1B2537); band fill
 * Background/primary (the white→transparent gradient artifact flattened).
 *
 * Code extensions over the master (no Figma axis — flagged in tracker):
 * - `tone` per item ('positive' | 'negative') colors the value — Caribbean
 *   Green/600 / Bittersweet/600 (carried over from the ad-hoc `.pane-kpis`).
 * - Cells grow past 152px rather than truncate (`min-width`, not `width`).
 * - Empty/nullish values render the '--' placeholder.
 * - `truncate: 'lead'` per item caps the cell width and lead-ellipsizes the
 *   value (tail stays visible, "…" at the start — for URL-ish values like
 *   Tracking Link); full value exposed via `title`.
 *
 * Semantics: a <dl> of dt/dd pairs (each cell a div group — valid HTML).
 * Pass `aria-label` (forwarded via rest) to name the region.
 */
export default function SummaryStrip({ items = [], className = '', ...rest }) {
  return (
    <dl role="region" className={`summary-strip${className ? ` ${className}` : ''}`} {...rest}>
      {items.map(({ label, value, tone, truncate }) => {
        const display = value == null || value === '' ? '--' : value
        const lead = truncate === 'lead' && display !== '--'
        return (
          <div
            key={label}
            className={`summary-strip__cell${lead ? ' summary-strip__cell--truncate' : ''}`}
          >
            <dt className="summary-strip__label">{label}</dt>
            <dd
              className={`summary-strip__value${
                tone === 'positive' || tone === 'negative' ? ` summary-strip__value--${tone}` : ''
              }${lead ? ' summary-strip__value--truncate-lead' : ''}`}
              title={lead ? display : undefined}
            >
              {lead ? <bdi>{display}</bdi> : display}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
