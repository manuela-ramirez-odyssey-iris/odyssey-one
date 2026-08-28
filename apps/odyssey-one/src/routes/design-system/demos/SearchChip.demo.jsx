import { useState } from 'react'
import { SearchChip } from '@odyssey/ui'

export const meta = {
  name: 'SearchChip',
  tier: 'molecule',
  version: '1.2.0',
  createdVersion: '0.1.0',
  normalizing: false,
  // GS-21 / Case 11 — committed search criterion chip (renamed from
  // MultiCodeChip when the Single variant merged in). Figma master:
  // Design System - MCP → Components-Molecules → GlobalSearch section,
  // set 4871:7334 — Type=Single|Set × State=Collapsed|Expanded,
  // Label/Summary/Codes TEXT + Show invalid BOOLEAN props. Intake mock:
  // Global Search file 1044-31186 (its local CB/500 + DSN/950 drift flagged).
}

export const props = [
  { name: 'label', type: 'string | null', desc: 'Single variant: the attribute:value text (e.g. "Carrier: ABC Logistic"). When given, the chip is a plain criterion chip — no expand.' },
  { name: 'typeLabel', type: 'string | null', desc: 'Set variant: the detected attribute of the set (named-set rule: every valid code\'s best match agrees) — "Order ID Set • 10 IDs". null → "Multiple".' },
  { name: 'codes', type: '{ value, valid }[]', desc: 'Set variant: the codes with validity flags — validation is the search engine\'s job, the chip only renders it. Invalid codes paint red and are excluded from the ID count.' },
  { name: 'onCommit', type: '(values: string[]) => void', desc: 'Set variant: fired with the re-parsed code list when an edit is committed — on Enter or collapse only, never per keystroke.' },
  { name: 'onRemove', type: '() => void', desc: 'Renders the X remove button (all variants). Chips chain — removing or keeping a Set chip never blocks committing more chips after it.' },
  { name: 'dateLabel / range / from / to / onDateChange / defaultOpen', type: 'date mode (Case 12)', desc: 'dateLabel switches to a date criterion: collapsed "<dateLabel>: from[-to]", expanded shows a CalendarPicker in the mini panel. Single dates auto-collapse on pick; ranges complete on the second pick. from/to are M/D/YYYY strings.' },
  { name: 'className', type: 'string', desc: 'Merged onto the root.' },
]

export const tokens = [
  { token: '--deep-sea-neutral-700 / -100', resolves: 'chip family bg / text', usage: 'badge — inherits .global-search-chip canon (mock\'s 600/200 flagged as drift)' },
  { token: '--deep-sea-neutral-400', resolves: '#9DA3B0', usage: 'X remove idle (hover → DSN/100), mirrors .global-search-chip__remove' },
  { token: '--deep-sea-neutral-950 / -50', resolves: '#0F182A / #F7F8FA', usage: 'panel surface / code text' },
  { token: '--carolina-blue-400', resolves: '#5BA4D4', usage: 'panel border (mock\'s Carolina Blue/500 is not a canon token — mapped down)' },
  { token: '--bittersweet-300', resolves: '#F7AEAA', usage: 'invalid code text (red legible on the dark panel)' },
  { token: '--radius-sm / --radius-lg', resolves: '4px / 8px', usage: 'badge / panel corners' },
  { token: '--shadow-sm', resolves: 'shadow/sm', usage: 'panel elevation' },
  { token: '--spacing-1', resolves: '4px', usage: 'panel anchor gap below the badge' },
]

// Demo validity: codes present in this set are "found". The real flag comes
// from the search engine's per-code validation (GS-21 follow-up wiring).
// Applying a TYPE narrows further (GS-21 rule 7 — suggestion-panel type
// application): the whole batch is asserted as that type, and codes that
// don't match go red + decounted.
const KNOWN = new Set(['C814956', 'K8147645', 'H5678954', '865435', '8987456', '09790879'])
const TYPE_RULES = {
  'Tracking ID': /^[a-z]/i, // demo rule: letter-prefixed codes
  'Order ID': /^\d+$/, //     demo rule: all-digit codes
}
const validate = (values, type) =>
  values.map((value) => ({ value, valid: KNOWN.has(value) && (!type || TYPE_RULES[type].test(value)) }))

function Playground() {
  const [values, setValues] = useState([...KNOWN])
  const [type, setType] = useState(null)
  const [removed, setRemoved] = useState(false)
  // Case 12 — date-range chip state ({from,to} as M/D/YYYY strings).
  const [dateRange, setDateRange] = useState({ from: '2/6/2026', to: null })
  const typeButton = (t) => (
    <button
      key={t ?? 'mixed'}
      className="text-label-xs-medium"
      style={{
        color: type === t ? 'var(--deep-sea-neutral-50)' : 'var(--deep-sea-neutral-400)',
        background: type === t ? 'var(--deep-sea-neutral-700)' : 'none',
        border: '1px solid var(--deep-sea-neutral-600)',
        borderRadius: 'var(--radius-sm)',
        padding: '2px var(--spacing-2)',
        cursor: 'pointer',
      }}
      onClick={() => setType(t)}
    >
      {t ?? 'Mixed (no type)'}
    </button>
  )
  return (
    <div style={{ background: 'var(--deep-sea-neutral-800)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)', minHeight: 260 }}>
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center', marginBottom: 'var(--spacing-4)' }}>
        <span className="text-label-xs-medium" style={{ color: 'var(--deep-sea-neutral-400)' }}>
          Apply set type (simulates the suggestion panel):
        </span>
        {[null, 'Tracking ID', 'Order ID'].map(typeButton)}
      </div>
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'flex-start' }}>
        {!removed && (
          <SearchChip
            typeLabel={type}
            codes={validate(values, type)}
            onCommit={setValues}
            onRemove={() => setRemoved(true)}
          />
        )}
        <SearchChip label="Carrier: ABC Logistic" onRemove={() => {}} />
        <SearchChip
          dateLabel="Pickup Date Range"
          range
          from={dateRange.from}
          to={dateRange.to}
          onDateChange={setDateRange}
          onRemove={() => {}}
        />
        {removed && (
          <button className="text-label-xs-medium" style={{ color: 'var(--deep-sea-neutral-400)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setRemoved(false); setValues([...KNOWN]); setType(null) }}>
            restore set chip
          </button>
        )}
      </div>
    </div>
  )
}

export default function SearchChipDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        A committed search criterion as a chip. <strong>Single</strong> = one attribute:value.{' '}
        <strong>Set</strong> = a bulk multi-code list as <strong>one expandable chip</strong> (GS-21 —
        tracking teams pasting many IDs): collapsed it summarizes — <code>&lt;Attribute&gt; Set • N
        IDs</code> or <code>Multiple Set • N IDs</code>, counting <strong>valid codes only</strong>.
        The chevron expands an editable mini panel anchored 4px below the badge; edits commit on{' '}
        <kbd>Enter</kbd> or collapse — never per keystroke. Invalid codes paint red and are
        decounted. The X removes the chip — chips keep chaining after a Set like after any other.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Demo validity: the six seeded codes are "found" — add any other code (expand → click the
          list → type, <kbd>Enter</kbd>) and it comes back <span style={{ color: 'var(--bittersweet-600)' }}>red</span> and
          uncounted. Clicking the list starts editing <em>at the clicked spot</em>; clicking outside
          the open panel collapses it and commits (= triggers the search). Escape cancels an edit.
          Applying a type asserts the whole batch as that type — non-matching codes go red +
          decounted, and the summary renames (e.g. <code>Order ID Set • 3 IDs</code>). The X
          removes; a single chip sits alongside.
        </p>
        <Playground />
      </div>
    </div>
  )
}
