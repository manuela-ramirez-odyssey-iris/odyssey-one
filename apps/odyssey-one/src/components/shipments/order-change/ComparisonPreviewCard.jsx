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
 * PURPLE IS A DELIBERATE DEVIATION FROM THE MOCK, which shows the difference
 * badges in red — the user ruled purple for these. Do not "fix" this back.
 *
 * ButtonToggle renders EITHER icons OR text, never both (its own doc). The
 * mock shows icon+text for List/Table; this uses text-only labels and flags
 * the gap for the designer rather than silently approximating it.
 *
 * @param title        string — card title, also the collapse button's a11y name
 * @param differences  string[] — one purple filter badge per entry
 * @param children     (mode: 'list'|'table', filter: string|null) => node
 */
export default function ComparisonPreviewCard({ title, differences = [], children }) {
  const [mode, setMode] = useState('list')
  const [filter, setFilter] = useState(null)

  const toggleFilter = (d) => setFilter((cur) => (cur === d ? null : d))

  return (
    <SubAccordion title={title} showIcon={false} defaultExpanded>
      <div className="comparison-preview__subheader">
        <span className="comparison-preview__diff-label text-label-sm-medium">
          Differences ({differences.length})
        </span>
        {differences.map((d) => (
          <button
            key={d}
            type="button"
            className="comparison-preview__diff-badge"
            aria-pressed={filter === d}
            onClick={() => toggleFilter(d)}
          >
            <Badge variant="purple">{d}</Badge>
          </button>
        ))}
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
