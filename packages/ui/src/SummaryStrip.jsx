import { useState } from 'react'
import { createPortal } from 'react-dom'
import Tooltip from './Tooltip.jsx'

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
 * - `truncationTooltip` (strip-level boolean, default off — mirrors
 *   DataTable's S85 mechanism verbatim: same prop name/default, same hand-
 *   rolled body portal, same inline `zIndex`/`pointerEvents: 'none'`, since
 *   this package can't reach the app-local TooltipTrigger). On cell
 *   `mouseenter`, scans the cell and its descendants (covers both `<dt>` and
 *   `<dd>` — either can clip) for the first element whose `scrollWidth >
 *   clientWidth + 1` and raises the normalized `Tooltip` with that element's
 *   full `textContent` — but only when `hiddenCharCount(...) >=
 *   TOOLTIP_MIN_HIDDEN_CHARS`. Unlike DataTable, this gates on hidden
 *   CHARACTERS, not hidden WORDS: SummaryStrip values are frequently a
 *   single long token (a tracking link, an ID) that the word estimator
 *   always reads as exactly one word, hidden or not, so a word-count gate
 *   could never fire for the values this component actually carries — a
 *   character count still tells a one-glyph sliver from real lost
 *   information. When on, the
 *   native `title` (see `truncate: 'lead'` above) is suppressed so the
 *   browser tooltip doesn't double up with the designed card; this costs no
 *   accessibility — `text-overflow: ellipsis` is purely visual and
 *   assistive tech still reads the full text node either way. Default off
 *   is byte-identical to every existing caller.
 *
 * Semantics: a <dl> of dt/dd pairs (each cell a div group — valid HTML).
 * Pass `aria-label` (forwarded via rest) to name the region.
 */
/**
 * Estimated count of characters hidden behind a cell's ellipsis. Same
 * proportional width-ratio estimate as DataTable's `hiddenWordCount`
 * (packages/ui/src/DataTable.jsx) — visible share is clientWidth/scrollWidth
 * of a nowrap single-line run, one font, good enough as a linear estimate —
 * but counts characters instead of words, since SummaryStrip values are
 * frequently a single long token where a word count is useless (see
 * docblock above). Returns 0 when nothing is clipped.
 */
export function hiddenCharCount(text, clientWidth, scrollWidth) {
  if (!text || scrollWidth <= clientWidth + 1) return 0
  const visibleChars = Math.floor(text.length * (clientWidth / scrollWidth))
  return text.length - visibleChars
}

// Below this many hidden characters, the clipping is a sliver of a glyph —
// not lost information — so the tooltip stays quiet. Tunable/testable
// rather than a magic number inline in onCellEnter.
export const TOOLTIP_MIN_HIDDEN_CHARS = 3

export default function SummaryStrip({ items = [], className = '', truncationTooltip = false, ...rest }) {
  // Overflow tooltip state — see docblock. Detected at hover time, never at mount
  // (a stale mount-time check is a bug this codebase already shed once — see the
  // TruncatedText deletion in playground/normalization-tracker.md).
  const [tip, setTip] = useState(null) // { text, left, top }
  const onCellEnter = (e) => {
    const cell = e.currentTarget
    const clipped = [cell, ...cell.querySelectorAll('*')].find((el) => el.scrollWidth > el.clientWidth + 1)
    if (!clipped) return
    const text = clipped.textContent.trim()
    if (hiddenCharCount(text, clipped.clientWidth, clipped.scrollWidth) < TOOLTIP_MIN_HIDDEN_CHARS) return
    const r = cell.getBoundingClientRect()
    setTip({ text, left: Math.max(8, r.left), top: r.top - 6 })
  }
  const onCellLeave = () => setTip(null)

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
            onMouseEnter={truncationTooltip ? onCellEnter : undefined}
            onMouseLeave={truncationTooltip ? onCellLeave : undefined}
          >
            {label != null && <dt className="summary-strip__label">{label}</dt>}
            {display != null && (
              <dd
                className={`summary-strip__value${
                  tone === 'positive' || tone === 'negative' ? ` summary-strip__value--${tone}` : ''
                }${emphasis === 'display' ? ' summary-strip__value--display' : ''}${lead ? ' summary-strip__value--truncate-lead' : ''}`}
                title={lead && !truncationTooltip ? display : undefined}
              >
                {lead ? <bdi>{display}</bdi> : display}
              </dd>
            )}
          </div>
        )
      })}
      {truncationTooltip && tip && createPortal(
        <div
          style={{
            position: 'fixed',
            left: tip.left,
            top: tip.top,
            transform: 'translateY(-100%)',
            width: 'max-content',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <Tooltip groups={[{ content: tip.text }]} />
        </div>,
        document.body
      )}
    </dl>
  )
}
