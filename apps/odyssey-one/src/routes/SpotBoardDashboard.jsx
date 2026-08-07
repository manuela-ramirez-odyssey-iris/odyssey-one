import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { Search, Inbox, CircleAlert } from 'lucide-react'
import { PageHeader, DataTable, Dropdown, FormField, Badge, Button, EmptyState } from '@odyssey/ui'
import AppShell from '../components/layout/AppShell'
import Countdown from '../spotboard/Countdown.jsx'
import { formatDateTimeMDYHM } from '../lib/dates'
import { listAllQuotes, boardKpis, filterRows } from '../spotboard/board'
import '../spotboard/dashboard.css'

/**
 * SpotBoardDashboard — cross-shipment SpotBoard monitoring board (wireframe
 * Screen 6). Canon: 5 KPI tiles, 4 filters, a 10-column table, row action
 * contextual to status. This is a drill-in surface only — every row action
 * routes into that shipment's existing per-shipment SpotBoard tab (BottomBar's
 * `spot` tab, apps/odyssey-one/src/components/detail/BottomBar.jsx:39); it
 * owns no SpotBoard state of its own.
 *
 * KPI tile colors: the wireframe's placeholder `red`/`review`/`win` CSS
 * classes are NOT tokens. Mapped here to the same semantic pairs Badge
 * already uses (badge-red-bg/text, badge-yellow-bg/text) rather than
 * inventing new ones — "Closing < 15 min" reuses the red pair (alert),
 * "Awaiting review" reuses the yellow pair (amber); the other three tiles
 * stay neutral (bg-primary / border-subtle / text-primary).
 *
 * Statuses still counting down (Open, Closing soon) render the reused
 * Countdown.jsx; closed statuses (In review, Awarded, Unawarded,
 * Invalidated) render the close timestamp via the existing
 * formatDateTimeMDYHM util instead of a second countdown implementation.
 */

const KPI_TILES = [
  { key: 'openBids', label: 'Open bids', tone: 'default' },
  { key: 'closingSoon', label: 'Closing < 15 min', tone: 'alert' },
  { key: 'awaitingReview', label: 'Awaiting review', tone: 'amber' },
  { key: 'unawardedToday', label: 'Unawarded / expired today', tone: 'default' },
  { key: 'awardedToday', label: 'Awarded today', tone: 'default' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Open', label: 'Open' },
  { value: 'Closing soon', label: 'Closing soon' },
  { value: 'In review', label: 'In review' },
  { value: 'Awarded', label: 'Awarded' },
  { value: 'Unawarded', label: 'Unawarded' },
  { value: 'Invalidated', label: 'Invalidated' },
]

const STATUS_BADGE_VARIANT = {
  'Open': 'blue',
  'Closing soon': 'red',
  'In review': 'amber',
  'Awarded': 'green',
  'Unawarded': 'gray',
  'Invalidated': 'gray',
}

// Row action per status (canon: Open→Open, In review→Review, Awarded→View,
// Unawarded→Re-quote). 'Closing soon' and 'Invalidated' aren't in the canon
// mapping — extended here: Closing soon is still an open auction (same
// action as Open); Invalidated is a dead quote needing a fresh one, same as
// Unawarded's Re-quote. Flagged in the session report as invented.
const ROW_ACTION_LABEL = {
  'Open': 'Open',
  'Closing soon': 'Open',
  'In review': 'Review',
  'Awarded': 'View',
  'Unawarded': 'Re-quote',
  'Invalidated': 'Re-quote',
}

const OPEN_STATUSES = new Set(['Open', 'Closing soon'])

const col = createColumnHelper()

function uniqueOptions(rows, field, allLabel) {
  const values = Array.from(new Set(rows.map((r) => r[field]).filter(Boolean))).sort()
  return [{ value: '', label: allLabel }, ...values.map((v) => ({ value: v, label: v }))]
}

export default function SpotBoardDashboard() {
  const navigate = useNavigate()

  // board.js is synchronous (returns BoardRow[] directly, no Promise) — there
  // is no real async boundary here, so no loading spinner is invented (would
  // be theatrical for a function that never suspends). A defensive try/catch
  // still guards against a thrown error (e.g. a corrupt localStorage-backed
  // quote) so one bad quote can't blank the whole board.
  const [rows, loadError] = useMemo(() => {
    try {
      return [listAllQuotes(), null]
    } catch (err) {
      return [[], err]
    }
  }, [])

  const [filters, setFilters] = useState({ client: '', status: '', org: '', search: '' })

  const clientOptions = useMemo(() => uniqueOptions(rows, 'client', 'All clients'), [rows])
  const orgOptions = useMemo(() => uniqueOptions(rows, 'org', 'All'), [rows])

  const filteredRows = useMemo(
    () => filterRows(rows, {
      client: filters.client || undefined,
      status: filters.status || undefined,
      org: filters.org || undefined,
      search: filters.search || undefined,
    }),
    [rows, filters],
  )

  const kpis = useMemo(() => boardKpis(rows, Date.now()), [rows])

  const handleRowAction = (row) => {
    navigate('/shipments', { state: { selectedShipmentId: row.shipmentId, requestedTab: { key: 'spot' } } })
  }

  const columns = useMemo(() => [
    col.accessor('quoteId', {
      header: 'Quote ID',
      cell: ({ row }) => (
        <span className="spotboard-quote-cell">
          {row.original.quoteId}
          {row.original.demo && <Badge variant="gray">Demo</Badge>}
        </span>
      ),
    }),
    col.accessor('load', { header: 'Load' }),
    col.accessor('client', { header: 'Client' }),
    col.accessor('lane', { header: 'Lane' }),
    col.accessor('equipment', { header: 'Equip' }),
    col.display({
      id: 'responded',
      header: 'Resp. / Invited',
      cell: ({ row }) => `${row.original.respondedCount} / ${row.original.invitedCount}`,
    }),
    col.accessor('leadingBid', {
      header: 'Leading Bid',
      cell: ({ getValue }) => {
        const v = getValue()
        return v == null ? '--' : `$${Number(v).toLocaleString('en-US')}`
      },
    }),
    col.accessor('status', {
      header: 'Status',
      cell: ({ getValue }) => <Badge variant={STATUS_BADGE_VARIANT[getValue()] ?? 'gray'}>{getValue()}</Badge>,
    }),
    col.display({
      id: 'time',
      header: 'Time',
      cell: ({ row }) => (
        OPEN_STATUSES.has(row.original.status)
          ? <Countdown closeAt={row.original.closeAt} />
          : formatDateTimeMDYHM(new Date(row.original.closeAt))
      ),
    }),
    col.display({
      id: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <Button variant="secondary" size="sm" onClick={() => handleRowAction(row.original)}>
          {ROW_ACTION_LABEL[row.original.status] ?? 'Open'}
        </Button>
      ),
      meta: { sticky: 'right', fixedWidth: true },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])

  const table = useReactTable({
    data: filteredRows,
    columns,
    getRowId: (row) => row.quoteId,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <AppShell>
      <div className="spotboard-dashboard">
        <PageHeader title="SpotBoard Dashboard" />

        <div className="spotboard-dashboard__kpis">
          {KPI_TILES.map((tile) => (
            <div key={tile.key} className={`spotboard-kpi spotboard-kpi--${tile.tone}`}>
              <span className="spotboard-kpi__label">{tile.label}</span>
              <span className="spotboard-kpi__value">{kpis[tile.key] ?? 0}</span>
            </div>
          ))}
        </div>

        <div className="spotboard-dashboard__filters">
          <div className="spotboard-dashboard__filter" data-testid="spotboard-filter-client">
            <span className="spotboard-dashboard__filter-label text-label-xs-medium-uppercase">Client</span>
            <Dropdown
              value={filters.client}
              options={clientOptions}
              onChange={(v) => setFilters((f) => ({ ...f, client: v }))}
            />
          </div>
          <div className="spotboard-dashboard__filter" data-testid="spotboard-filter-status">
            <span className="spotboard-dashboard__filter-label text-label-xs-medium-uppercase">Status</span>
            <Dropdown
              value={filters.status}
              options={STATUS_OPTIONS}
              onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            />
          </div>
          <div className="spotboard-dashboard__filter" data-testid="spotboard-filter-org">
            <span className="spotboard-dashboard__filter-label text-label-xs-medium-uppercase">My org / site</span>
            <Dropdown
              value={filters.org}
              options={orgOptions}
              onChange={(v) => setFilters((f) => ({ ...f, org: v }))}
            />
          </div>
          <FormField
            id="spotboard-search"
            label="Search (Quote ID / Load)"
            placeholder="Search Quote ID or Load"
            leadingIcon={<Search size={16} aria-hidden="true" />}
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        {loadError ? (
          <EmptyState icon={<CircleAlert size={32} />} message="Couldn't load SpotBoard data." />
        ) : filteredRows.length === 0 ? (
          <EmptyState icon={<Inbox size={32} />} message="No quotes match these filters." />
        ) : (
          <div className="spotboard-dashboard__table">
            <DataTable table={table} ariaLabel="SpotBoard quotes" />
          </div>
        )}
      </div>
    </AppShell>
  )
}
