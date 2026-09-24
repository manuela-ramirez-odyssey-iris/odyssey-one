import { useState, useRef, useLayoutEffect } from 'react'
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
 *   `mouseenter`, scans the cell's descendants (covers both `<dt>` and `<dd>`
 *   — either can clip) for the first element hiding at least
 *   `TOOLTIP_MIN_HIDDEN_CHARS`, and raises the normalized `Tooltip` showing
 *   the WHOLE cell: the label as the group's `subtitle` over the value as its
 *   `content` (2026-09-16). It deliberately does NOT show only the run that
 *   clipped — a bare value leaves the reader guessing which field it is, and a
 *   clipped label over a complete value is an equally unreadable cell. A
 *   label-less or value-less cell raises the half it has. Unlike DataTable, this gates on hidden
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
 *
 * - `background` (default true): drops the band fill and bottom hairline
 *   when false (`.summary-strip--plain`), leaving cells/dividers/spacing/type
 *   untouched. The Figma master (4234:1291) has no such axis — this is a
 *   deliberate code-only extension (user ruling, 2026-09-20, S154: "lets
 *   make the strip background toggleable, no need to do it in figma") for a
 *   consumer that wants the strip's layout without reading as a card. The
 *   next Figma sync should not "correct" this away.
 *
 * - `size` ('default' | 'mini', Figma `Size` axis on 4254:904, D22): Mini
 *   puts label beside value on one row (8px gap), cells hug content, 8/12
 *   padding, value label/sm — a ~36px band instead of 76px. Cells hug content (no 152px basis).
 * - `sticky` (default off): sticks the strip to the top of its scroll
 *   container and flips it to Mini while stuck (i.e. once content scrolls
 *   under it), back to `size` at rest. While stuck-mini the band is widened
 *   to 120% of its resting width, centered on it, and clamped to the window
 *   (user, D22: "20% wider than the large one … never overflow the window")
 *   — the extra room keeps one-row cells from ellipsizing.
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

// Sticky un-stick hysteresis (px) — must exceed the Default→Mini height delta
// (76 − 36 = 40). See the stuck-detection effect.
export const STICKY_HYSTERESIS = 48

export default function SummaryStrip({ items = [], className = '', truncationTooltip = false, background = true, size = 'default', sticky = false, style, ...rest }) {
  // Stuck detection: a zero-height sentinel just above the strip, measured
  // against its nearest scrolling ancestor. HYSTERESIS: stick as soon as the
  // sentinel passes the container top, un-stick only once it's back
  // STICKY_HYSTERESIS px below it. Without it, the 76→36px shrink on stick
  // makes the browser's scroll anchoring shift scrollTop by the same 40px,
  // which un-sticks, which grows, which re-sticks — a flicker loop on slow
  // scrolls (user, D22). The gap must exceed that height delta.
  const sentinelRef = useRef(null)
  const stripRef = useRef(null)
  const [stuck, setStuck] = useState(false)
  const [bleed, setBleed] = useState(null) // { marginLeft, marginRight } while stuck
  useLayoutEffect(() => {
    if (!sticky) return
    let el = sentinelRef.current.parentElement
    while (el && el !== document.body && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement
    const scroller = el && el !== document.body ? el : window
    let raf = 0
    const check = () => {
      raf = 0
      const top = scroller === window ? 0 : scroller.getBoundingClientRect().top
      const d = sentinelRef.current.getBoundingClientRect().top - top
      // A strip resting at the very top of its scroller never gets
      // STICKY_HYSTERESIS px of room, so "scrolled back to the top" always
      // un-sticks too (Stops/Cost Allocation — user, D22).
      const atTop = (scroller === window ? window.scrollY : scroller.scrollTop) <= 0
      setStuck((was) => (was ? d < STICKY_HYSTERESIS && !atTop : d < 0))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check) }
    check()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => { scroller.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [sticky])
  useLayoutEffect(() => {
    if (!stuck) { setBleed(null); return }
    // Measure the RESTING width off the parent (the strip itself is widened),
    // then clamp the 120% band inside the viewport (clientWidth excludes the
    // scrollbar).
    const measure = () => {
      const r = stripRef.current?.parentElement?.getBoundingClientRect()
      if (!r) return
      const vw = document.documentElement.clientWidth
      const width = Math.min(r.width * 1.2, vw)
      const left = Math.min(Math.max(r.left - (width - r.width) / 2, 0), vw - width)
      // Bleed via NEGATIVE MARGINS, never an explicit width: a set width
      // counts toward the ancestors' intrinsic size and widened the whole
      // SpotBid column (tables/footers overflowed — user, D22). Negative
      // margins grow the box without growing its container.
      const ml = left - r.left
      setBleed({ marginLeft: ml, marginRight: -(width - r.width) - ml })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [stuck])
  const mini = size === 'mini' || (sticky && stuck)
  // Overflow tooltip state — see docblock. Detected at hover time, never at mount
  // (a stale mount-time check is a bug this codebase already shed once — see the
  // TruncatedText deletion in playground/normalization-tracker.md).
  const [tip, setTip] = useState(null) // { label, value, left, top }
  const onCellEnter = (e) => {
    const cell = e.currentTarget
    // Any clipped run in the cell ARMS the tooltip; the card then shows the
    // WHOLE cell — label over value — not just the run that clipped (user,
    // 2026-09-16). Showing the value alone left the reader guessing which
    // field it belonged to, and a clipped LABEL over a complete value is just
    // as unreadable a cell. Tooltip's own {subtitle, content} group is exactly
    // that shape, so this needs no new presentation.
    //
    // The gate is applied per element rather than to whichever element clipped
    // FIRST: a label clipped by one glyph used to suppress the tooltip for a
    // badly-clipped value below it, because the scan stopped at the label.
    const clipped = [...cell.querySelectorAll('*')].find(
      (el) => hiddenCharCount(el.textContent.trim(), el.clientWidth, el.scrollWidth) >= TOOLTIP_MIN_HIDDEN_CHARS,
    )
    if (!clipped) return
    const r = cell.getBoundingClientRect()
    // A label-less or value-less cell (SPB-43) raises the half it has.
    setTip({
      label: cell.querySelector('dt')?.textContent.trim() || undefined,
      value: cell.querySelector('dd')?.textContent.trim() || undefined,
      left: Math.max(8, r.left),
      top: r.top - 6,
    })
  }
  const onCellLeave = () => setTip(null)

  const strip = (
    <dl
      ref={stripRef}
      role="region"
      className={`summary-strip${background ? '' : ' summary-strip--plain'}${mini ? ' summary-strip--mini' : ''}${sticky ? ' summary-strip--sticky' : ''}${className ? ` ${className}` : ''}`}
      style={bleed ? { ...style, ...bleed } : style}
      {...rest}
    >
      {items.map((item, index) => {
        const { label, tone, truncate, emphasis } = item
        const hasValue = 'value' in item
        // A non-string/non-number value is a NODE (S155 §2.2: a Badge list) — it
        // renders verbatim: no '--' placeholder (a node is never "empty"), no
        // lead-truncation, no `title` (a node has no text to put in one).
        const isNode = hasValue && item.value != null && typeof item.value !== 'string' && typeof item.value !== 'number'
        const display = hasValue ? (item.value == null || item.value === '' ? '--' : item.value) : null
        const lead = !isNode && truncate === 'lead' && display != null && display !== '--'
        return (
          <div
            key={index}
            className={`summary-strip__cell${lead ? ' summary-strip__cell--truncate' : ''}`}
            onMouseEnter={truncationTooltip ? onCellEnter : undefined}
            onMouseLeave={truncationTooltip ? onCellLeave : undefined}
          >
            {label != null && <dt className="summary-strip__label">{label}</dt>}
            {display != null && (
              /* ponytail: inline style, not a modifier class — the strip's base
                 value rule is nowrap+ellipsis (built for text) and a node must be
                 free to wrap. Promote to `.summary-strip__value--node` if a second
                 node consumer appears. */
              <dd
                className={`summary-strip__value${
                  tone === 'positive' || tone === 'negative' ? ` summary-strip__value--${tone}` : ''
                }${emphasis === 'display' ? ' summary-strip__value--display' : ''}${lead ? ' summary-strip__value--truncate-lead' : ''}`}
                title={lead && !truncationTooltip ? display : undefined}
                style={isNode ? { whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip' } : undefined}
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
          <Tooltip groups={[{ subtitle: tip.label, content: tip.value }]} />
        </div>,
        document.body
      )}
    </dl>
  )
  if (!sticky) return strip
  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" style={{ height: 0 }} />
      {strip}
    </>
  )
}
