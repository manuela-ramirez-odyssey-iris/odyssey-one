import { useState } from 'react'
import { Badge, ButtonToggle, SubAccordion } from '@odyssey/ui'

/**
 * ComparisonPreviewCard — shared shell for the three "Additional Changes
 * Preview" sections on the Review Order Change screen (LINX-14510/14511):
 * Preview Tender List, Preview Tender Details, Preview Hazmat. Each is
 * read-only and shares one visual pattern — title + collapse chevron, a
 * "Differences (N)" sub-header of clickable field badges (one active filter
 * at a time), and a List/Table ButtonToggle — so the chrome lives here once;
 * each section owns only its own field mapping and body, received through
 * the `children(mode, filter)` render prop.
 *
 * Built ON SubAccordion (@odyssey/ui) rather than reimplementing "collapsible
 * white card with a title + chevron" — that is exactly what SubAccordion
 * already is (card radius/shadow/padding, aria-expanded toggle, animated
 * reveal). This file adds only the one thing SubAccordion doesn't have: the
 * Differences/filter/mode sub-header row.
 *
 * FILTER CHIPS ARE GRAY, NOT PURPLE (S134 — a designer ruling on top of the
 * earlier "purple not red" deviation, which still stands for the RESULTS).
 * Purple now means exactly one thing: a changed value highlighted inside a
 * table (`Badge variant="purple"` in the section files). The chips that
 * choose a filter are a gray, toggleable control — the app's OWN clickable
 * badge, `.badge-interactive` (components.css): `Badge variant="gray"` inside
 * a `<button aria-pressed>`, which already owns hover / pressed / selected /
 * focus-visible. Two different meanings no longer share one color.
 *
 * An "All" chip is always first: selecting it clears `filter` (same state
 * `null` already meant "unfiltered"); selecting any other chip naturally
 * deselects it, since both read off the one `filter` value — they can never
 * both be pressed.
 *
 * ButtonToggle renders EITHER icons OR text, never both (its own doc). The
 * mock shows icon+text for List/Table; this uses text-only labels and flags
 * the gap for the designer rather than silently approximating it.
 *
 * @param title        string — card title, also the collapse button's a11y name
 * @param differences  string[] — one gray filter chip per entry, after the All chip
 * @param defaultExpanded bool (default true) — Preview Tender List lands open
 *                     (it's the decision context); Tender Details and Hazmat
 *                     land COLLAPSED (designer, S135 — matching Jana's own
 *                     walkthrough of the deck: "this is how the screen will
 *                     look like when the user comes, so it will be collapsed…
 *                     they can click and expand and see what it is").
 * @param children     (mode: 'list'|'table', filter: string|null) => node
 */
export default function ComparisonPreviewCard({ title, differences = [], defaultExpanded = true, children }) {
  const [mode, setMode] = useState('list')
  const [filter, setFilter] = useState(null)

  const toggleFilter = (d) => setFilter((cur) => (cur === d ? null : d))

  // S135 (designer): the count rides the accordion TITLE as a purple "(N)" —
  // visible while the card is collapsed, which is exactly when it matters —
  // and only when there is something to count.
  const heading = differences.length ? (
    <>
      {title} <span className="comparison-preview__title-count">({differences.length})</span>
    </>
  ) : title

  return (
    <SubAccordion title={heading} showIcon={false} defaultExpanded={defaultExpanded}>
      <div className="comparison-preview__subheader">
        {/* S135 (designer): "Differences:" is just the row's label now (the
            count lives in the title); with nothing changed the chips —
            including All, which would filter nothing — collapse to a plain
            "No Differences" statement. */}
        {differences.length === 0 ? (
          <span className="comparison-preview__diff-label text-label-sm-medium">No Differences</span>
        ) : (
          <>
            <span className="comparison-preview__diff-label text-label-sm-medium">Differences:</span>
            <button
              type="button"
              className="comparison-preview__diff-badge badge-interactive"
              aria-pressed={filter === null}
              onClick={() => setFilter(null)}
            >
              <Badge variant="gray">All</Badge>
            </button>
            {differences.map((d) => (
              <button
                key={d}
                type="button"
                className="comparison-preview__diff-badge badge-interactive"
                aria-pressed={filter === d}
                onClick={() => toggleFilter(d)}
              >
                <Badge variant="gray">{d}</Badge>
              </button>
            ))}
          </>
        )}
        <ButtonToggle
          className="comparison-preview__mode-toggle"
          selected={mode === 'list' ? 'first' : 'second'}
          onChange={(next) => setMode(next === 'first' ? 'list' : 'table')}
          firstLabel="List"
          secondLabel="Table"
          firstAriaLabel="List view"
          secondAriaLabel="Table view"
        />
      </div>
      <div className="comparison-preview__body">{children(mode, filter)}</div>
    </SubAccordion>
  )
}
