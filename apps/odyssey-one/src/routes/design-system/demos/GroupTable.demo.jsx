import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { GroupTable, Badge, Button } from '@odyssey/ui'

// STAGING (S79e). Figma master 4183:773 (GroupHeaderRow set 4182:787) in
// Components-Molecules › Sections; Code Connect mapping lands at batch close.
export const meta = {
  name: 'GroupTable',
  tier: 'molecule',
  figmaNode: '4183:773',
  normalizing: true,
}

export const props = [
  { name: 'columns', type: '[{ key, label, align?, width? }]', desc: "Column definitions. `align`: 'left' (default) | 'right' | 'center'; `width` pins a column (number = px)." },
  { name: 'groups', type: '[{ id, label, rows: object[] }]', desc: 'One collapsible band per group: a white GROUP HEADER ROW (chevron + bold label, the full row toggles, aria-expanded) over gray child rows.' },
  { name: 'renderCell', type: '(row, col) => node', desc: 'Optional cell renderer for CHILD rows (e.g. a hazmat Badge, a colored Diff). Default: `row[col.key] ?? "—"`.' },
  { name: 'footerRow', type: 'object', desc: 'Optional bold footer row keyed by col.key (values may be nodes) — the Compare AP/AR TOTAL. Not passed through renderCell.' },
  { name: 'expanded', type: '{ [groupId]: boolean }', desc: 'Controlled expansion map (missing key = collapsed) — pair with onToggle; lets a consumer drive Expand All.' },
  { name: 'defaultExpanded', type: 'boolean', desc: 'Uncontrolled initial state for every group. Default true.' },
  { name: 'onToggle', type: '(groupId, next) => void', desc: 'Fires on any group toggle (row click or keyboard on the header button).' },
  { name: 'striped', type: 'boolean', desc: 'Default true — child rows as light-gray bands separated by white hairline gaps (the Product mock). False = white rows with hairlines.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root scroll element.' },
]

export const tokens = [
  { token: '--text-secondary / --border-subtle', resolves: 'DSN/700 / DSN/200', usage: 'column-header labels + hairline below' },
  { token: '--text-primary + semibold', resolves: 'DSN/900 / 600', usage: 'group id, child lead cell, footer row' },
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'chevron (rotates −90° collapsed)' },
  { token: '--bg-secondary / --bg-primary', resolves: 'DSN/50 / white', usage: 'child-row band / the 2px white gap between bands + group rows' },
  { token: '--spacing-3 / --spacing-4', resolves: '12 / 16', usage: 'cell padding (v/h)' },
  { token: '--border-default', resolves: 'DSN/300', usage: '2px rule above the footer (TOTAL) row' },
  { token: '--transition-fast', resolves: '150ms ease', usage: 'group-row hover + chevron rotation' },
]

// ── Sample data ─────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'lineNumber', label: 'Line #' },
  { key: 'shipItem', label: 'Ship Item' },
  { key: 'description', label: 'Description' },
  { key: 'packageCount', label: 'Package Count' },
  { key: 'grossWeight', label: 'Gross Weight' },
  { key: 'hazmat', label: 'Hazardous' },
]

const GROUPS = [
  {
    id: 'UOI1XMWP6',
    label: 'UOI1XMWP6',
    rows: [
      { lineNumber: '001', shipItem: '28112G3M', description: 'Hydrogen Peroxide 35%', packageCount: '22 Totes', grossWeight: '5,217 LB', hazmat: true },
    ],
  },
  {
    id: 'QQY0GYYS7',
    label: 'QQY0GYYS7',
    rows: [
      { lineNumber: '001', shipItem: '55129P3R', description: 'Reprocessed Polyethylene Pellets', packageCount: '65 Totes', grossWeight: '1,258 LB', hazmat: true },
      { lineNumber: '002', shipItem: '31052D8J', description: 'Ferric Chloride Solution 42%', packageCount: '78 Totes', grossWeight: '2,047 LB', hazmat: false },
      { lineNumber: '003', shipItem: '38089L2R', description: 'Insecticide Emulsifiable', packageCount: '28 Totes', grossWeight: '901 LB', hazmat: true },
    ],
  },
]

function renderSampleCell(row, col) {
  if (col.key === 'hazmat') {
    return row.hazmat
      ? <Badge variant="amber" leftIcon={<TriangleAlert size={12} />}>Hazmat</Badge>
      : <span style={{ color: 'var(--text-placeholder)' }}>--</span>
  }
  return row[col.key] ?? '—'
}

// ── Schematic ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap' }}>{tier}</span>
  )
}
function LegendRow({ part, tier, nested = false, children }) {
  const cell = { padding: 'var(--spacing-2) 0', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-primary)', fontSize: 'var(--font-size-sm)' }
  return (
    <li style={{ display: 'contents' }}>
      <span style={{ ...cell, display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', whiteSpace: 'nowrap', paddingLeft: nested ? 'var(--spacing-6)' : 0, color: 'var(--text-primary)', fontWeight: nested ? 'var(--font-weight-medium)' : 'var(--font-weight-semibold)' }}>
        {nested && <span style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">└</span>}
        {part}{tier && <TierBadge tier={tier} />}
      </span>
      <span style={{ ...cell, color: 'var(--text-secondary)' }}>{children}</span>
    </li>
  )
}

function Schematic() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-8)', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ flex: '1 1 480px', minWidth: 380, background: 'var(--bg-primary)', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-4) var(--spacing-6)' }}>
        <GroupTable
          columns={COLUMNS.slice(0, 5)}
          groups={GROUPS}
          renderCell={renderSampleCell}
          footerRow={{ lineNumber: 'TOTAL', packageCount: '193 Totes', grossWeight: '9,423 LB' }}
        />
      </div>
      <ul style={{ flex: '1 1 320px', minWidth: 280, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
        <LegendRow part="root" tier="molecule">Presentational grouped table — <strong>read-only</strong> (vs <code>DataTable</code> = the interactive TanStack grid: sort/resize/paginate/select). Root owns horizontal scroll; the consumer&apos;s card owns the white surface.</LegendRow>
        <LegendRow part="header row" nested>Plain muted column labels (<code>--text-secondary</code> semibold) over a <code>--border-subtle</code> hairline.</LegendRow>
        <LegendRow part="group header row" nested>White band per group: chevron (<code>--text-tertiary</code>, rotates −90° collapsed) + bold group id. The FULL row is the toggle — a row-filling <code>&lt;button aria-expanded aria-controls&gt;</code> carries focus + Enter/Space.</LegendRow>
        <LegendRow part="child rows" nested>Light-gray bands (<code>--bg-secondary</code>) separated by 2px white gaps; lead cell emphasized. <code>renderCell</code> injects nodes (Badge, Diff).</LegendRow>
        <LegendRow part="footer row" nested>Optional bold TOTAL keyed by <code>col.key</code>, above a 2px <code>--border-default</code> rule.</LegendRow>
      </ul>
    </div>
  )
}

// ── Playground ──────────────────────────────────────────────────────────────
function Toggle({ label, value, set }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )
}

function Playground() {
  const [striped, setStriped] = useState(true)
  const [showFooter, setShowFooter] = useState(true)
  const [narrow, setNarrow] = useState(false)
  // Controlled expansion — the consumer pattern that drives "Expand All".
  const [expanded, setExpanded] = useState(() =>
    Object.fromEntries(GROUPS.map((g) => [g.id, true]))
  )
  const allExpanded = GROUPS.every((g) => expanded[g.id])

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <Toggle label="striped" value={striped} set={setStriped} />
        <Toggle label="footerRow" value={showFooter} set={setShowFooter} />
        <Toggle label="narrow container (h-scroll)" value={narrow} set={setNarrow} />
        <Button
          variant="link"
          onClick={() => setExpanded(Object.fromEntries(GROUPS.map((g) => [g.id, !allExpanded])))}
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)' }}>
        <div style={{ maxWidth: narrow ? 480 : undefined, background: 'var(--bg-primary)', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-4) var(--spacing-6)' }}>
          <GroupTable
            columns={COLUMNS}
            groups={GROUPS}
            renderCell={renderSampleCell}
            footerRow={showFooter ? { lineNumber: 'TOTAL', packageCount: '193 Totes', grossWeight: '9,423 LB' } : undefined}
            expanded={expanded}
            onToggle={(id, next) => setExpanded((prev) => ({ ...prev, [id]: next }))}
            striped={striped}
            aria-label="Sample product lines"
          />
        </div>
      </div>
    </div>
  )
}

export default function GroupTableDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        The presentational grouped table for ShipmentsBar detail panes (Product,
        Cost Allocation Compare AP/AR). <strong>Boundary:</strong> <code>DataTable</code> is
        the interactive TanStack grid (sort/resize/paginate/select); <code>GroupTable</code> is
        read-only presentation — no TanStack, no engine. Collapsible group bands
        (full-row toggle, <code>aria-expanded</code>), gray striped child rows,
        optional bold TOTAL footer, horizontal scroll on column overflow.
        Replaces the old sticky-left square expand-button table.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — striping, footer, controlled Expand All, h-scroll</h4>
        <Playground />
      </div>
    </div>
  )
}
