import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { GroupTable, Badge, Button } from '@odyssey/ui'

// Lightweight colored Diff cell (mirrors CostAllocationTab's DiffCell).
function DiffCell({ value }) {
  const positive = !value || value === '--' ? null : !value.startsWith('-')
  return (
    <span
      style={{
        color: positive === true
          ? 'var(--text-success)'
          : positive === false
          ? 'var(--text-error)'
          : undefined,
        fontWeight: 'var(--font-weight-semibold)',
      }}
    >
      {value || '--'}
    </span>
  )
}

export const meta = {
  name: 'GroupTable',
  tier: 'molecule',
  version: '0.7.0',
  createdVersion: '0.7.0',
  normalizing: false,
  figmaNode: '4183:773',
  codeConnect: 'packages/ui/src/GroupTable.figma.tsx',
}

export const props = [
  { name: 'columns', type: '[{ key, label, align?, width? }]', desc: "Column definitions. `align`: 'left' (default) | 'right' | 'center'; `width` pins a column (number = px)." },
  { name: 'groups', type: '[{ id, label, rows: object[], values?: object }]', desc: 'One collapsible band per group. `values` is optional: an object keyed by col.key whose entries appear on the group header row in matching columns (medium weight, col.align respected) — visible both collapsed and expanded. Omit for label-only headers (Product tab style).' },
  { name: 'renderCell', type: '(row, col) => node', desc: 'Optional cell renderer for CHILD rows (e.g. a hazmat Badge, a colored Diff). Default: `row[col.key] ?? "—"`.' },
  { name: 'footerRow', type: 'object', desc: 'Optional TOTAL row (medium weight) keyed by col.key (values may be nodes). Pass to show; omit to hide. Not passed through renderCell.' },
  { name: 'expanded', type: '{ [groupId]: boolean }', desc: 'Controlled expansion map (missing key = collapsed) — pair with onToggle; lets a consumer drive Expand All.' },
  { name: 'defaultExpanded', type: 'boolean', desc: 'Uncontrolled initial state for every group. Default true.' },
  { name: 'onToggle', type: '(groupId, next) => void', desc: 'Fires on any group toggle (row click or keyboard on the header button).' },
  { name: 'striped', type: 'boolean', desc: 'Default true — child rows as contiguous light-gray bands with 1px --border-subtle hairlines between them (no white gaps). False = white rows with hairlines.' },
  { name: 'className', type: 'string', desc: 'Extra class(es) on the root scroll element.' },
]

export const tokens = [
  { token: '--text-primary', resolves: 'DSN/900', usage: 'column-header labels (semibold) · group id + header values + TOTAL (medium)' },
  { token: '--text-primary + medium', resolves: 'DSN/900 / 500', usage: 'child lead cell + footer (TOTAL) row' },
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'child-row body text + chevron (rotates −90° collapsed)' },
  { token: '--bg-secondary / --bg-primary', resolves: 'DSN/50 / white', usage: 'child-row band background / group-row + card surface' },
  { token: '--spacing-4 + 48px row', resolves: '16 / raw 48px', usage: 'cell h-padding; every row fixed 48px tall (no row-height token — Cell family convention)' },
  { token: '--border-subtle', resolves: 'DSN/200', usage: '1px hairline on col-header, group rows, child rows — uniform in all states (footer has no own border)' },
  { token: '--transition-fast', resolves: '150ms ease', usage: 'group-row hover + chevron rotation' },
]

// ── Sample data — Product flavor (label-only group headers) ─────────────────
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

// ── Sample data — Compare AP/AR flavor (group headers carry per-order values) ─
const COST_COLUMNS = [
  { key: 'label', label: 'Order' },
  { key: 'ap',    label: 'AP (Carrier)',  align: 'right' },
  { key: 'ar',    label: 'AR (Customer)', align: 'right' },
  { key: 'diff',  label: 'Diff',          align: 'right' },
]

function renderCostCell(row, col) {
  if (col.key === 'diff') return <DiffCell value={row.diff} />
  return row[col.key] ?? '--'
}

const COST_GROUPS = [
  {
    id: 'UOI1XMWP6',
    label: 'UOI1XMWP6',
    values: { ap: '$1,240.00', ar: '$1,350.00', diff: <DiffCell value="+$110.00" /> },
    rows: [
      { label: 'Base',     ap: '$1,000.00', ar: '$1,100.00', diff: '+$100.00' },
      { label: 'Fuel',     ap: '$200.00',   ar: '$210.00',   diff: '+$10.00' },
      { label: 'HZC',      ap: '$40.00',    ar: '$40.00',    diff: '$0.00' },
    ],
  },
  {
    id: 'QQY0GYYS7',
    label: 'QQY0GYYS7',
    values: { ap: '$2,580.00', ar: '$2,430.00', diff: <DiffCell value="-$150.00" /> },
    rows: [
      { label: 'Base',     ap: '$2,100.00', ar: '$2,000.00', diff: '-$100.00' },
      { label: 'Fuel',     ap: '$380.00',   ar: '$350.00',   diff: '-$30.00' },
      { label: 'Discount', ap: '$100.00',   ar: '$80.00',    diff: '-$20.00' },
    ],
  },
]

const COST_FOOTER = {
  label: 'TOTAL',
  ap: '$3,820.00 USD',
  ar: '$3,780.00 USD',
  diff: <DiffCell value="-$40.00" />,
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
        <LegendRow part="header row" nested>Dark column labels (<code>--text-primary</code> semibold) over a <code>--border-subtle</code> hairline. 48px tall like every other row.</LegendRow>
        <LegendRow part="group header row" nested>White band per group: chevron (<code>--text-tertiary</code>, rotates −90° collapsed) + bold group id. The FULL row is the toggle — a row-filling <code>&lt;button aria-expanded aria-controls&gt;</code> carries focus + Enter/Space.</LegendRow>
        <LegendRow part="group.values" nested>Optional per-column values on the group header (e.g. per-order AP/AR/Diff). Semibold, <code>col.align</code> respected; visible both collapsed and expanded. Omit for label-only headers (Product tab style).</LegendRow>
        <LegendRow part="child rows" nested>Contiguous light-gray bands (<code>--bg-secondary</code>, <code>--text-tertiary</code> body), separated by 1px <code>--border-subtle</code> hairlines — no white gaps. Lead cell emphasized (<code>--text-primary</code> medium). <code>renderCell</code> injects nodes (Badge, Diff).</LegendRow>
        <LegendRow part="footer row" nested>Optional TOTAL (medium, <code>--text-primary</code>) keyed by <code>col.key</code> — pass <code>footerRow</code> to show, omit to hide. Values may be nodes. Not passed through <code>renderCell</code>. The last visible row (footer or last child/header) carries no bottom border.</LegendRow>
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
  const [showValues, setShowValues] = useState(false)
  const [narrow, setNarrow] = useState(false)

  // When values mode is active, switch to the AP/AR sample (its groups carry
  // `values`). Expansion key set changes too, so keep the maps separate.
  const activeGroups = showValues ? COST_GROUPS : GROUPS
  const [expanded, setExpanded] = useState(() =>
    Object.fromEntries(activeGroups.map((g) => [g.id, true]))
  )
  const allExpanded = activeGroups.every((g) => expanded[g.id])

  // Reset expansion when switching flavors.
  const handleShowValues = (next) => {
    const src = next ? COST_GROUPS : GROUPS
    setExpanded(Object.fromEntries(src.map((g) => [g.id, true])))
    setShowValues(next)
  }

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <Toggle label="striped" value={striped} set={setStriped} />
        <Toggle label="footerRow (totals row — pass to show, omit to hide)" value={showFooter} set={setShowFooter} />
        <Toggle label="group.values (Compare AP/AR flavor)" value={showValues} set={handleShowValues} />
        <Toggle label="narrow container (h-scroll)" value={narrow} set={setNarrow} />
        <Button
          variant="link"
          onClick={() => setExpanded(Object.fromEntries(activeGroups.map((g) => [g.id, !allExpanded])))}
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)' }}>
        <div style={{ maxWidth: narrow ? 480 : undefined, background: 'var(--bg-primary)', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-4) var(--spacing-6)' }}>
          {showValues ? (
            <GroupTable
              columns={COST_COLUMNS}
              groups={COST_GROUPS}
              renderCell={renderCostCell}
              footerRow={showFooter ? COST_FOOTER : undefined}
              expanded={expanded}
              onToggle={(id, next) => setExpanded((prev) => ({ ...prev, [id]: next }))}
              striped={striped}
              aria-label="Compare AP/AR by order"
            />
          ) : (
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
          )}
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
        <h4 className="ds-demo-section__title">Playground — striping, group.values (AP/AR flavor), footerRow totals toggle, controlled Expand All, h-scroll</h4>
        <Playground />
      </div>
    </div>
  )
}
