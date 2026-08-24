import { useState } from 'react'
import { TriangleAlert, TruckElectric, Columns3Cog } from 'lucide-react'
import { GroupTable, Badge, Button, ActionMenu } from '@odyssey/ui'
import { ICON_LG } from '@odyssey/tokens'

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
  tier: 'organism',
  version: '0.14.0',
  createdVersion: '0.7.0',
  normalizing: true,
  figmaNode: '4183:773',
  codeConnect: 'packages/ui/src/GroupTable.figma.tsx',
  approved: true,
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
  { name: 'detailColumns', type: '[{ key, label, align?, width? }]', desc: 'NESTED-TABLE FLAVOR. The second table\'s OWN columns — its own keys, labels and widths, deliberately NOT aligned to `columns`. Passing this prop is what selects the flavor: an expanded group then reveals a full second table instead of child rows sharing `columns`.' },
  { name: 'renderDetailCell', type: '(row, col) => node', desc: 'Optional cell renderer for the nested table\'s rows (parallel to `renderCell`). Default: `row[col.key] ?? "--"`.' },
  { name: 'detailScroll', type: 'boolean', desc: 'Nested flavor only. Gives each nested table its NATURAL width with an independent horizontal scrollbar inside the band, instead of compressing its columns to the outer table\'s width. For nested tables with many columns (Dropped Carrier\'s 14).' },
  { name: 'stickyActions', type: 'boolean', desc: 'Render a pinned trailing action column (sticky right, 68px), fed by `actionsHeader` + `group.action`. Same convention DataTable uses, so both tables behave identically on a page carrying each.' },
  { name: 'actionsHeader', type: 'node', desc: 'Content of the pinned column\'s header cell — by convention a column-arrange `Button variant="icon"`.' },
  { name: 'groups[].detailRows', type: 'object[]', desc: 'Rows for that group\'s nested table, keyed by `detailColumns[].key`. Only read in the nested flavor.' },
  { name: 'groups[].detailNote', type: '{ label, value } | node', desc: 'Optional full-width WRAPPING row at the bottom of that group\'s nested table, spanning every detail column. For the one long free-text field among short ones (Dropped Carrier\'s Reason Description) — as a column it needs ~360px and pushes the rest off the scroll extent. Pass `{ label, value }` and the component renders and styles the label itself; a node is accepted as an escape hatch. Either way no internal class names are needed. Nested flavor only.' },
  { name: 'groups[].actionTone', type: "'danger' | 'warning' | 'success' | 'info'", desc: 'Colour scheme (glyph + background) for that row\'s pinned action cell. Omit for the neutral default. At rest the tone reads as a tile behind the glyph; on hover the WHOLE 68px cell fills with the tone and the tile dissolves into it, glyph keeping its colour. This lives on the component rather than the slot because the hover fill is the CELL\'s background — a slotted node cannot paint its own ancestor. An unrecognised value degrades to neutral.' },
  { name: 'groups[].action', type: 'node', desc: 'Content of that group row\'s pinned action cell. A PURE SLOT — the component supplies no behavior or tone. By convention pass an `ActionMenu` (the canonical row-action control, same as DataTable\'s action column): it brings the dropdown, hover/pressed states, keyboard a11y and viewport-flip placement. Clicks are stopped from toggling the row.' },
]

export const tokens = [
  { token: '--text-primary', resolves: 'DSN/900', usage: 'column-header labels (semibold) · group id + header values + TOTAL (medium)' },
  { token: '--text-primary + medium', resolves: 'DSN/900 / 500', usage: 'child lead cell + footer (TOTAL) row' },
  { token: '--text-tertiary', resolves: 'DSN/500', usage: 'child-row body text + chevron (rotates −90° collapsed)' },
  { token: '--bg-secondary / --bg-primary', resolves: 'DSN/50 / white', usage: 'child-row band background / group-row + card surface' },
  { token: '--spacing-4 + 48px row', resolves: '16 / raw 48px', usage: 'cell h-padding; every row fixed 48px tall (no row-height token — Cell family convention)' },
  { token: '--border-subtle', resolves: 'DSN/200', usage: '1px hairline on col-header, group rows, child rows — uniform in all states (footer has no own border)' },
  { token: '--transition-fast', resolves: '150ms ease', usage: 'group-row hover + chevron rotation + action-tone fill' },
  { token: '--bg-error/--text-error · --badge-{yellow,green,blue}-*', resolves: 'per tone', usage: "groups[].actionTone — danger | warning | success | info, via the --gt-action-bg/--gt-action-fg pair each tone declares" },
  { token: '--bg-secondary + 48px inset', resolves: 'DSN/50 / raw 48px', usage: 'nested flavor: the gray band hosting the second table, inset 48px on the LEFT only (a right inset would cut it short of the scroll extent)' },
  { token: '--text-primary semibold / --text-tertiary', resolves: 'DSN/900 / DSN/500', usage: 'nested table header labels / nested row values — same treatment as the outer table, over the gray band' },
  { token: '--bg-primary + --border-subtle', resolves: 'white / DSN/200', usage: 'pinned action column (68px, sticky right) + its left shadow — DataTable\'s exact value, and the table is border-collapse: separate because Chrome will not paint cell shadows in collapsed tables' },
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

// ── Sample data — Nested-table flavor ───────────────────────────────────────
// The outer columns are the identity/summary set; the nested table carries a
// SECOND, unrelated column set. The two are deliberately not aligned.
const ROUTE_COLUMNS = [
  { key: 'routeRank', label: 'Route Rank' },
  { key: 'rank', label: 'Rank' },
  { key: 'scac', label: 'SCAC' },
  { key: 'carrier', label: 'Carrier Name' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'apCost', label: 'AP Cost (Carrier)' },
  { key: 'status', label: 'Tender Status' },
]

const ROUTE_DETAIL_COLUMNS = [
  { key: 'transit', label: 'Transit' },
  { key: 'distance', label: 'Distance' },
  { key: 'notifyMethod', label: 'Notify Method' },
  { key: 'notifyDate', label: 'Notify Date' },
  { key: 'responseMethod', label: 'Response Method' },
  { key: 'responseUser', label: 'Response User' },
  { key: 'quoted', label: 'Carrier Quoted' },
]

// The pinned column's content is entirely the consumer's — including its tone.
// The component supplies the slot and nothing else.
//
// Composed from the normalized ActionMenu rather than a bespoke tile: it is the
// canonical row-action control (the same one DataTable's action column uses), so
// the dropdown, hover/pressed states, keyboard a11y, viewport-flip placement and
// the `vertical-align: middle` that centers a trigger in a table cell's line box
// all come with it. `tone` only tints — the behavior is ActionMenu's.
function ActionTile({ label }) {
  return (
    <ActionMenu
      icon={<TruckElectric {...ICON_LG} />}
      ariaLabel={`Actions for route ${label}`}
      options={[
        { label: 'View rate details', onSelect: () => {} },
        { label: 'Re-tender', onSelect: () => {} },
        { label: 'Cancel tender', onSelect: () => {}, danger: true },
      ]}
    />
  )
}

const ROUTE_GROUPS = [
  {
    id: 'r1',
    label: '4',
    values: { rank: '1', scac: 'SEFL', carrier: 'Southeastern FRT', equipment: 'LTL', apCost: '107.35 USD', status: <Badge variant="green">Accepted</Badge> },
    action: <ActionTile label="4" />,
    detailRows: [{ transit: '1 DY', distance: '476.98 mi', notifyMethod: 'Fax', notifyDate: '02/12/2026 08:00 CST', responseMethod: 'Automatic Update', responseUser: 'Moses Johnson', quoted: 'Yes' }],
  },
  {
    id: 'r2',
    label: '2',
    values: { rank: '2', scac: 'ODFL', carrier: 'Old Dominion Freight Line', equipment: 'LTL', apCost: '107.35 USD', status: <Badge variant="gray">Cancelled</Badge> },
    action: <ActionTile label="2" />,
    actionTone: 'warning',
    detailRows: [{ transit: '3 DY', distance: '1,434.31 mi', notifyMethod: 'EDI', notifyDate: '02/12/2026 08:00 CST', responseMethod: 'EDI Update', responseUser: 'Shari Witting', quoted: 'No' }],
  },
  {
    id: 'r3',
    label: '3',
    values: { rank: '3', scac: 'ODFL', carrier: 'Old Dominion Freight Line', equipment: 'LTL', apCost: '107.35 USD', status: <Badge variant="red">Declined</Badge> },
    action: <ActionTile label="3" />,
    actionTone: 'danger',
    detailRows: [{ transit: '1 DY', distance: '499.39 mi', notifyMethod: 'Email', notifyDate: '02/12/2026 08:00 CST', responseMethod: 'EDI Update', responseUser: 'Devin Bernhard', quoted: 'No' }],
    // `detailNote` on ONE group deliberately: it is optional per group, and the
    // other two rows show what the nested table looks like without it.
    detailNote: {
      label: 'Decline Reason',
      value: 'Carrier declined — no equipment available in the pickup window. Long free text like this is exactly what the note row exists for: as a column it would need ~360px and push every short column off the scroll extent.',
    },
  },
]

export const apiDoc = `// TWO FLAVORS, selected by whether you pass \`detailColumns\`.

// 1. Rows (default) — an expanded group reveals CHILD ROWS sharing \`columns\`.
//    The per-group row is a GROUP HEADER: bold group id spanning the lead
//    column, optional sparse summary \`values\` at the trail.
<GroupTable columns={COLS} groups={[{ id, label, rows, values }]} />

// 2. Nested table — an expanded group reveals a SECOND, FULLY INDEPENDENT
//    TABLE: its own header row, its own column widths, deliberately NOT
//    aligned to \`columns\`. The vertical alternative to two tables side by
//    side (which gets too wide).
<GroupTable
  columns={IDENTITY_COLS}
  detailColumns={DETAIL_COLS}      // own keys/labels/widths — shares nothing with columns
  groups={[{ id, label, values, detailRows, action }]}
/>

// ─────────────────────────────────────────────────────────────────────────
// READ THE EXPANDABLE ROW AS A DATA ROW, NOT A HEADER.
//
// This is the single most confusable thing about the nested flavor. In the
// Rows flavor the per-group row heads its children. In the nested flavor it
// does NOT head anything: it is an ordinary data row — one value per outer
// column (via \`values\`), at regular weight, with the disclosure chevron
// merely living in its lead cell.
//
//   Its header is GroupTable's own \`columns\` header row.
//
// The nested table then brings a header of its own, for its own columns.
// So an expanded group shows TWO header rows on screen, belonging to two
// different tables — that is correct, not a duplicate.
//
//   columns header row        <- heads the data rows
//   > data row                <- NOT a header
//       detailColumns header  <- heads the nested rows (repeats per expanded row)
//       nested row
//   > data row
// ─────────────────────────────────────────────────────────────────────────

// Pinned action column — same convention as DataTable's sticky-right column.
// The cell is a PURE SLOT: tone/state is the consumer's, there is no row-tone
// prop (a "declined" red tile is just a node you pass).
<GroupTable
  stickyActions
  actionsHeader={<Button variant="icon" size="sm" icon={<Columns3Cog {...ICON_LG} />} aria-label="Arrange columns" />}
  groups={[{
    id, label, values,
    action: <ActionMenu icon={<TruckElectric {...ICON_LG} />} options={…} />,
    actionTone: 'danger',   // 'danger' | 'warning' | 'success' | 'info'
  }]}
/>

// Expansion: controlled (\`expanded\` map + \`onToggle\`, drives Expand All) or
// uncontrolled (\`defaultExpanded\`). The nested header repeats under every
// expanded row, so a single open row still reads on its own.`

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
        <LegendRow part="detailColumns" nested>Switches the group body to a <strong>second, independent table</strong> (own header, own widths, not aligned to <code>columns</code>) on a gray band inset 48px both sides. In this flavor the group row stops being a header and becomes a <strong>data row</strong> — see the nested-flavor section.</LegendRow>
        <LegendRow part="stickyActions" nested>Pinned trailing column (68px, sticky right, <code>--border-subtle</code> left seam) — <code>actionsHeader</code> in the header cell, <code>group.action</code> per row. Pure slot: tone/state is the consumer&apos;s. Same convention as <code>DataTable</code>&apos;s right-sticky column.</LegendRow>
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

// The three flavors are mutually exclusive (each needs its own sample data +
// expansion keys), so they're one selector rather than three toggles.
const FLAVORS = {
  product: { label: 'Product (label-only group headers)', groups: GROUPS },
  cost: { label: 'Compare AP/AR (group.values)', groups: COST_GROUPS },
  nested: { label: 'Nested table (detailColumns)', groups: ROUTE_GROUPS },
}

function Playground() {
  const [flavor, setFlavor] = useState('product')
  const [striped, setStriped] = useState(true)
  const [showFooter, setShowFooter] = useState(true)
  const [stickyActions, setStickyActions] = useState(false)
  const [narrow, setNarrow] = useState(false)
  // detailNote is per-group and optional in the API; this toggle just strips it
  // from the demo data so both states are visible (nested flavor only).
  const [showDetailNote, setShowDetailNote] = useState(true)
  const [detailScroll, setDetailScroll] = useState(false)

  const activeGroups = showDetailNote
    ? FLAVORS[flavor].groups
    : FLAVORS[flavor].groups.map(({ detailNote, ...g }) => g)
  const [expanded, setExpanded] = useState(() =>
    Object.fromEntries(GROUPS.map((g) => [g.id, true]))
  )
  const allExpanded = activeGroups.every((g) => expanded[g.id])

  // Each flavor has its own group ids, so reset expansion when switching.
  const handleFlavor = (next) => {
    setExpanded(Object.fromEntries(FLAVORS[next].groups.map((g) => [g.id, true])))
    if (next === 'nested') setStickyActions(true) // the flavor this was built for
    setFlavor(next)
  }

  const shared = {
    groups: activeGroups,
    expanded,
    onToggle: (id, next) => setExpanded((prev) => ({ ...prev, [id]: next })),
    striped,
    stickyActions,
    actionsHeader: <Button variant="icon" size="sm" icon={<Columns3Cog {...ICON_LG} />} aria-label="Arrange columns" />,
  }

  return (
    <div>
      <div className="ds-demo-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* The flavor switch drives the whole demo, so it reads as a control
            rather than another checkbox — same treatment as the DSM header's
            own selects (.ds-domain__select). */}
        <label
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2)',
            fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
            color: 'var(--text-primary)',
          }}
        >
          flavor
          <select
            className="ds-domain__select"
            value={flavor}
            onChange={(e) => handleFlavor(e.target.value)}
          >
            {Object.entries(FLAVORS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </label>
        <Toggle label="striped" value={striped} set={setStriped} />
        <Toggle label="footerRow (totals row — pass to show, omit to hide)" value={showFooter} set={setShowFooter} />
        <Toggle label="stickyActions (pinned action column)" value={stickyActions} set={setStickyActions} />
        <Toggle label="narrow container (h-scroll)" value={narrow} set={setNarrow} />
        {flavor === 'nested' && (
          <>
            <Toggle label="detailNote (per-group note row)" value={showDetailNote} set={setShowDetailNote} />
            <Toggle label="detailScroll (independent nested h-scroll)" value={detailScroll} set={setDetailScroll} />
          </>
        )}
        <Button
          variant="link"
          onClick={() => setExpanded(Object.fromEntries(activeGroups.map((g) => [g.id, !allExpanded])))}
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-6)' }}>
        <div style={{ maxWidth: narrow ? 480 : undefined, background: 'var(--bg-primary)', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-4) var(--spacing-6)' }}>
          {flavor === 'cost' && (
            <GroupTable
              {...shared}
              columns={COST_COLUMNS}
              renderCell={renderCostCell}
              footerRow={showFooter ? COST_FOOTER : undefined}
              aria-label="Compare AP/AR by order"
            />
          )}
          {flavor === 'product' && (
            <GroupTable
              {...shared}
              columns={COLUMNS}
              renderCell={renderSampleCell}
              footerRow={showFooter ? { lineNumber: 'TOTAL', packageCount: '193 Totes', grossWeight: '9,423 LB' } : undefined}
              aria-label="Sample product lines"
            />
          )}
          {flavor === 'nested' && (
            <GroupTable
              {...shared}
              columns={ROUTE_COLUMNS}
              detailColumns={ROUTE_DETAIL_COLUMNS}
              detailScroll={detailScroll}
              aria-label="Routing options"
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
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        <strong>Two flavors, selected by <code>detailColumns</code>.</strong> Without it
        (default), an expanded group reveals <em>child rows sharing the outer columns</em> and
        the per-group row is a group header. With it, an expanded group reveals a{' '}
        <em>second, fully independent table</em> and the per-group row is an ordinary data
        row — <strong>not</strong> a header. The two read very differently; the API tab
        spells out the distinction.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Schematic — anatomy</h4>
        <Schematic />
      </div>


      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Playground — flavor (Rows · group.values · nested table), striping, footerRow totals, stickyActions, controlled Expand All, h-scroll</h4>
        <Playground />
      </div>
    </div>
  )
}
