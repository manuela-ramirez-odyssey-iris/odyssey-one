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
 * - Empty/nullish values render the '--' placeholder — but only when `value`
 *   was passed at all (see label-less/value-less cells below).
 * - `truncate: 'lead'` per item caps the cell width and lead-ellipsizes the
 *   value (tail stays visible, "…" at the start — for URL-ish values like
 *   Tracking Link); full value exposed via `title`.
 * - Label-less / value-only cells (SPB-43 §2, carrier bid countdown): a
 *   cell may omit `label` or `value` entirely to render only the other
 *   side — an omitted `label` renders no `<dt>`, an omitted `value` renders
 *   no `<dd>` (not the '--' placeholder; that only fires when `value` is
 *   present but empty/nullish — e.g. `value: null`). Keys are positional
 *   (index), not `label`, since label is no longer guaranteed unique or
 *   present.
 * - `emphasis: 'display'` per item (SPB-43, Figma 5172:7856 — carrier bid
 *   countdown H/M/S cells): swaps the value from label/base semibold to
 *   display/4xl semibold (`--font-size-4xl` / `--line-height-4xl`,
 *   packages/tokens/tokens.css). A per-item opt-in, not a strip-wide variant
 *   — one strip instance mixes emphasized digit cells with a normal-weight
 *   cell (Figma's own "Time remaining" cell). Default (no `emphasis`) is
 *   byte-identical to every existing caller.
 *
 * Semantics: a <dl> of dt/dd pairs (each cell a div group — valid HTML).
 * Pass `aria-label` (forwarded via rest) to name the region.
 */
export default function SummaryStrip({ items = [], className = '', ...rest }) {
  return (
    <dl role="region" className={`summary-strip${className ? ` ${className}` : ''}`} {...rest}>
      {items.map((item, index) => {
        const { label, tone, truncate, emphasis } = item
        const hasValue = 'value' in item
        const display = hasValue ? (item.value == null || item.value === '' ? '--' : item.value) : null
        const lead = truncate === 'lead' && display != null && display !== '--'
        return (
          <div
            key={index}
            className={`summary-strip__cell${lead ? ' summary-strip__cell--truncate' : ''}`}
          >
            {label != null && <dt className="summary-strip__label">{label}</dt>}
            {display != null && (
              <dd
                className={`summary-strip__value${
                  tone === 'positive' || tone === 'negative' ? ` summary-strip__value--${tone}` : ''
                }${emphasis === 'display' ? ' summary-strip__value--display' : ''}${lead ? ' summary-strip__value--truncate-lead' : ''}`}
                title={lead ? display : undefined}
              >
                {lead ? <bdi>{display}</bdi> : display}
              </dd>
            )}
          </div>
        )
      })}
    </dl>
  )
}
