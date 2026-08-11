import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Inbox, CircleAlert } from 'lucide-react'
import { PageHeader, GroupTable, SubAccordion, WidgetMini, PillTab, ButtonToggle, Dropdown, FormField, Badge, Button, EmptyState, Alert } from '@odyssey/ui'
import AppShell from '../components/layout/AppShell'
import Countdown from '../spotboard/Countdown.jsx'
import { formatDateTimeMDYHM } from '../lib/dates'
import { listAllQuotes, boardKpis, filterRows } from '../spotboard/board'
import { clearQuote } from '../spotboard/spotStore'
import { getSellShipmentDetail } from '../api/services/shipmentService'
import '../spotboard/dashboard.css'

/**
 * SpotBoardDashboard — cross-shipment SpotBoard monitoring board (wireframe
 * Screen 6). Canon: 5 KPI tiles, filters, a 10-column table, row action
 * contextual to status. This is a drill-in surface only — every row action
 * routes into that shipment's existing per-shipment SpotBoard tab (BottomBar's
 * `spot` tab, apps/odyssey-one/src/components/detail/BottomBar.jsx:39); it
 * owns no SpotBoard state of its own.
 *
 * ── GRAIN (SPB-30) ────────────────────────────────────────────────────────
 * The legacy cross-bid screen this replaces ("Quote Viewer") is ONE ROW PER
 * CARRIER, grouped by Quote# — the whole point of the screen is comparing
 * what each carrier quoted, side by side. We originally shipped one row per
 * QUOTE with only aggregates (Resp./Invited + Leading Bid), which made the
 * comparison reachable only by drilling into the shipment. GroupTable's
 * nested flavor restores the legacy grain: the quote row stays as the
 * summary, and expanding it reveals that quote's carriers in their own table.
 *
 * Groups default to COLLAPSED — a monitoring board is scanned by quote first;
 * legacy's per-quote bands are small only because its result set is (16 rows).
 *
 * DataTable → GroupTable: nothing was lost. This board never used sorting,
 * pagination or selection, which is the boundary between the two components;
 * it needed grouped read-only presentation, which is exactly GroupTable.
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

// The category row, rendered exactly as the Shipments page renders its own —
// PillTabs or WidgetMini cards behind a ButtonToggle — so the two boards share
// one idiom instead of each inventing a metric strip.
//
// Each tile carries the FILTER THAT REPRODUCES ITS OWN COUNT. WidgetMini is a
// filter card by contract (it renders a <button> with aria-pressed), so using
// it as a static counter would leave an inert button behind; wiring the filter
// is what conforms to its API. The two "…today" tiles therefore carry
// `today: true`, because status alone would filter to every Awarded quote ever
// and contradict the number printed on the tile.
//
// Each entry carries THREE things that used to be spread
// across a tile, a dropdown option and a heading:
//   label  — the short name on the card/pill (user ruling: the tiles were too
//            wordy to scan; "Closing" beats "Closing < 15 min" at card size)
//   title  — the long name, which becomes the section heading once selected,
//            so the precise definition is never lost — just relocated to where
//            there is room for it
//   filter — the slice, which must reproduce the number on the card
//
// This row REPLACED the Status dropdown, so it has to cover every selection
// that dropdown could express: hence `all` (no filter) and `invalidated`.
// 'All Quotes' and 'Invalidated Quotes' are our wording — the user specified
// long names for the other five only.
const KPI_TILES = [
  { key: 'all', label: 'All', title: 'All Quotes', filter: {} },
  { key: 'openBids', label: 'Open', title: 'Open Bids', filter: { status: 'Open' } },
  { key: 'closingSoon', label: 'Closing', title: 'Closing < 15 min', filter: { status: 'Closing soon' }, chartColor: 'var(--text-error)' },
  { key: 'awaitingReview', label: 'Review', title: 'Awaiting Review', filter: { status: 'In review' }, chartColor: 'var(--text-warning)' },
  { key: 'unawardedToday', label: 'Unawarded', title: 'Unawarded - Expired Today', filter: { status: 'Unawarded', today: true } },
  { key: 'awardedToday', label: 'Awarded', title: 'Awarded Today', filter: { status: 'Awarded', today: true } },
  { key: 'invalidated', label: 'Invalidated', title: 'Invalidated Quotes', filter: { status: 'Invalidated' } },
]

// (The Status dropdown that used to live here is gone — the category row above
// expresses every one of its options, and two controls for one concept meant
// two places to disagree about what the board is showing.)

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

// Outer table — the per-quote summary row. The Action column is NOT listed
// here: GroupTable renders it itself via `stickyActions`/`actionsHeader`.
const QUOTE_COLUMNS = [
  { key: 'quoteId', label: 'Quote ID' },
  { key: 'load', label: 'Load' },
  { key: 'client', label: 'Client' },
  { key: 'lane', label: 'Lane' },
  { key: 'equipment', label: 'Equip' },
  { key: 'responded', label: 'Resp. / Invited' },
  { key: 'leadingBid', label: 'Leading Bid', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'time', label: 'Time' },
]

// Nested table — one row per carrier, mirroring the legacy Quote Viewer's
// per-carrier columns (SCAC · Response Time · Response User · Quoted Cost ·
// Awarded). `Carrier` is additional: legacy's own per-shipment screen carries
// a Name column beside the SCAC, and a bare SCAC is unreadable to anyone who
// hasn't memorised the codes.
const CARRIER_COLUMNS = [
  { key: 'scac', label: 'SCAC' },
  { key: 'name', label: 'Carrier' },
  { key: 'responseTime', label: 'Response Time' },
  { key: 'responseUser', label: 'Response User' },
  { key: 'quotedCost', label: 'Quoted Cost', align: 'right' },
  { key: 'awarded', label: 'Awarded', align: 'center' },
]

// Legacy's `Interval` filter (image 4 shows it set to "6 days"); we had no
// time-window control at all. 'All' is kept as the default so the board's
// existing behaviour is unchanged until the filter is actually used.
const INTERVAL_OPTIONS = [
  { value: '', label: 'All' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
]

const fmtMoney = (v) => (v == null ? '--' : `$${Number(v).toLocaleString('en-US')}`)

/** True only when every visible group is expanded — drives Expand All's label.
 *  An empty board is NOT "all expanded" (there is nothing to collapse). */
export function groupsAllExpanded(rows, expanded) {
  return rows.length > 0 && rows.every((r) => expanded[r.quoteId])
}

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
  // Bumped when an orphaned quote is cleared, so the board re-reads
  // localStorage and the dead row disappears.
  const [refreshKey, setRefreshKey] = useState(0)
  const [orphan, setOrphan] = useState(null)

  const [rows, loadError] = useMemo(() => {
    try {
      return [listAllQuotes(), null]
    } catch (err) {
      return [[], err]
    }
  }, [refreshKey])

  const [filters, setFilters] = useState({ org: '', search: '', interval: '' })

  // The selected category. Status/today are DERIVED from it rather than stored
  // alongside it — with the dropdown gone there is exactly one source of truth
  // for "which slice is on screen", which is also what the section heading reads.
  const [tileKey, setTileKey] = useState('all')
  const activeTile = KPI_TILES.find((t) => t.key === tileKey) ?? KPI_TILES[0]

  // 'widgets' | 'pills' — the same two renderings the Shipments category row
  // offers. Defaults to widgets: this is a monitoring board, and the counts are
  // the point of the page.
  const [viewMode, setViewMode] = useState('widgets')

  // Which quote groups are expanded, lifted out of GroupTable so SubAccordion's
  // Expand All can drive them (it owns the control; the consumer owns the state).
  const [expandedGroups, setExpandedGroups] = useState({})

  const orgOptions = useMemo(() => uniqueOptions(rows, 'org', 'All'), [rows])

  const filteredRows = useMemo(
    () => filterRows(rows, {
      org: filters.org || undefined,
      search: filters.search || undefined,
      intervalDays: filters.interval ? Number(filters.interval) : undefined,
      ...activeTile.filter,
    }),
    [rows, filters, activeTile],
  )

  const kpis = useMemo(() => boardKpis(rows, Date.now()), [rows])

  // Drill-in, guarded. A saved quote lives in localStorage, which OUTLIVES the
  // database: reseeding regenerates all 10,000 shipments, so a quote saved
  // against a shipment id from a previous dataset survives with nothing behind
  // it. The board is synchronous and cannot know that up front — but a 404 on
  // the detail fetch PROVES it, so we check at the one moment it matters and
  // self-heal, instead of navigating into a tab that can only ever error.
  //
  // Only a 404 clears anything. A network blip or a 500 must NOT delete a
  // user's quote, so anything else falls through to navigation unchanged.
  const handleRowAction = async (row) => {
    try {
      await getSellShipmentDetail(row.shipmentId)
    } catch (err) {
      if (err?.status === 404) {
        clearQuote(row.shipmentId)
        setOrphan(row)
        setRefreshKey((k) => k + 1)
        return
      }
    }
    navigate('/shipments', { state: { selectedShipmentId: row.shipmentId, requestedTab: { key: 'spot' } } })
  }

  const allExpanded = groupsAllExpanded(filteredRows, expandedGroups)

  // SubAccordion passes the requested next state; use it rather than
  // re-deriving. NOTE: it only renders Expand All in the non-collapsible
  // flavor (`!collapsible && onToggleAll`), so this was inert until the
  // section became static.
  const handleToggleAll = (next) => {
    setExpandedGroups(
      next ? Object.fromEntries(filteredRows.map((r) => [r.quoteId, true])) : {},
    )
  }

  const groups = useMemo(
    () => filteredRows.map((r) => ({
      id: r.quoteId,
      label: (
        <span className="spotboard-quote-cell">
          {r.quoteId}
          {r.demo && <Badge variant="gray">Demo</Badge>}
        </span>
      ),
      values: {
        load: r.load,
        client: r.client,
        lane: r.lane,
        equipment: r.equipment,
        responded: `${r.respondedCount} / ${r.invitedCount}`,
        leadingBid: fmtMoney(r.leadingBid),
        status: <Badge variant={STATUS_BADGE_VARIANT[r.status] ?? 'gray'}>{r.status}</Badge>,
        time: OPEN_STATUSES.has(r.status)
          ? <Countdown closeAt={r.closeAt} />
          : formatDateTimeMDYHM(new Date(r.closeAt)),
      },
      // A quote whose carriers never made it onto the row still expands — to
      // an explicit empty table rather than a silently blank band.
      detailRows: r.carriers ?? [],
      action: (
        <Button variant="secondary" size="sm" onClick={() => handleRowAction(r)}>
          {ROW_ACTION_LABEL[r.status] ?? 'Open'}
        </Button>
      ),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredRows],
  )

  const renderCarrierCell = (row, column) => {
    if (column.key === 'quotedCost') {
      // 'Declined' is a legacy VALUE in this column, not a missing number —
      // so it must pass through as text rather than through fmtMoney.
      return typeof row.quotedCost === 'string' ? row.quotedCost : fmtMoney(row.quotedCost)
    }
    if (column.key === 'awarded') {
      return row.awarded ? <Badge variant="green">Awarded</Badge> : '--'
    }
    return row[column.key] ?? '--'
  }

  return (
    <AppShell>
      <div className="spotboard-dashboard">
        {/* The mode toggle is the header's actions cluster (PageHeader's
            Default type — "Show toggle" is children presence, not a prop). */}
        <PageHeader title="SpotBoard Dashboard">
          <ButtonToggle
            firstLabel="Pill tabs mode"
            secondLabel="Widget mode"
            selected={viewMode === 'widgets' ? 'second' : 'first'}
            onChange={(next) => setViewMode(next === 'second' ? 'widgets' : 'pills')}
            firstAriaLabel="Show categories as pill tabs"
            secondAriaLabel="Show categories as widgets"
          />
        </PageHeader>

        {/* A row was removed under the user's cursor — say so, and say why,
            rather than letting it vanish as if they mis-clicked. */}
        {orphan && (
          <Alert variant="warning" onClose={() => setOrphan(null)}>
            {`Quote ${orphan.quoteId} was saved against shipment ${orphan.shipmentId}, which is no longer in the dataset — most likely it was removed when the data was reseeded. The quote has been cleared and its row removed.`}
          </Alert>
        )}

        {viewMode === 'widgets' ? (
          <div className="spotboard-dashboard__kpis">
            {KPI_TILES.map((tile) => (
              <WidgetMini
                key={tile.key}
                style={{ flex: 1, minWidth: 0 }}
                value={kpis[tile.key] ?? 0}
                label={tile.label}
                // Share of the whole board, the same basis ShipmentsPanelTabs
                // uses for its category cards. The All tile is always the whole
                // board, so its donut is a full ring rather than a self-referential
                // 100% that happens to be computed.
                percentage={rows.length > 0 ? ((kpis[tile.key] ?? 0) / rows.length) * 100 : 0}
                selected={tile.key === tileKey}
                onClick={() => setTileKey(tile.key)}
                chartColor={tile.chartColor}
              />
            ))}
          </div>
        ) : (
          <div className="spotboard-dashboard__pills">
            {KPI_TILES.map((tile) => (
              <PillTab
                key={tile.key}
                label={tile.label}
                count={kpis[tile.key] ?? 0}
                selected={tile.key === tileKey}
                onClick={() => setTileKey(tile.key)}
              />
            ))}
          </div>
        )}

        {/* Controls and grid live together inside one SubAccordion — a single
            "browse the board" unit. NON-COLLAPSIBLE (Figma State=Static): the
            board is the page, so a disclosure that could hide it entirely was
            an affordance with nothing to gain. Expand All remains, and drives
            the per-quote carrier groups — which is why GroupTable's expansion
            is controlled from here.

            The heading is the SELECTED CATEGORY'S long name. That is where the
            wordy labels went when the cards were shortened: "Closing" on the
            card, "Closing < 15 min" here, so the precise definition of what
            you are looking at is always on screen exactly once. */}
        <SubAccordion
          title={activeTile.title}
          showIcon={false}
          collapsible={false}
          allExpanded={allExpanded}
          onToggleAll={handleToggleAll}
        >
        <div className="spotboard-dashboard__filters">
          <div className="spotboard-dashboard__filter" data-testid="spotboard-filter-org">
            <span className="spotboard-dashboard__filter-label text-label-xs-medium-uppercase">My org / site</span>
            <Dropdown
              value={filters.org}
              options={orgOptions}
              onChange={(v) => setFilters((f) => ({ ...f, org: v }))}
            />
          </div>
          <div className="spotboard-dashboard__filter" data-testid="spotboard-filter-interval">
            <span className="spotboard-dashboard__filter-label text-label-xs-medium-uppercase">Interval</span>
            <Dropdown
              value={filters.interval}
              options={INTERVAL_OPTIONS}
              onChange={(v) => setFilters((f) => ({ ...f, interval: v }))}
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
            <GroupTable
              columns={QUOTE_COLUMNS}
              groups={groups}
              detailColumns={CARRIER_COLUMNS}
              renderDetailCell={renderCarrierCell}
              expanded={expandedGroups}
              onToggle={(id, next) => setExpandedGroups((prev) => ({ ...prev, [id]: next }))}
              stickyActions
              actionsHeader="Action"
              // GroupTable has no ariaLabel prop (DataTable does), and its root
              // IS the horizontal scroll container — so the name goes on the
              // scroller as a labelled region rather than being dropped.
              role="region"
              aria-label="SpotBoard quotes"
            />
          </div>
        )}
        </SubAccordion>
      </div>
    </AppShell>
  )
}
