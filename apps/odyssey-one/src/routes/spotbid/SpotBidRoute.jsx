import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { Inbox } from 'lucide-react'
import { PageHeader, Tab, PillTab, DataTable, Badge, EmptyState } from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import Countdown from '../../spotboard/Countdown.jsx'
import { formatDateTimeMDYHM } from '../../lib/dates'
import { listQuotes, getBid, statusFor, totalFor, yourQuoteFor, bestFor, subscribe } from '../../spotbid/carrierQuotes'
import './spotbid-list.css'

/**
 * SpotBidRoute — `/spotbid` list ("Requests For Quote"), Phase 2 of the
 * 2026-08-17 SpotBid plan. Carrier-facing redesign of the legacy TMS
 * overflow portal (quote-model.md §9.1): PillTab Requests/History replaces
 * the old two-item sidebar, a single DataTable replaces the legacy grid.
 *
 * Single-carrier session (quote-model.md §9: "Scoped to one carrier per
 * session/SCAC") — SCAC/Username/Load-Detail-icon columns are dropped on
 * purpose; the whole row is the load-detail affordance (onRowClick).
 *
 * `now` is read ONCE at mount (the same idiom SpotBoardDashboard uses for
 * `boardKpis(rows, Date.now())` inside a `[rows]`-keyed useMemo) — a quote's
 * Open/closed classification does not live-reclassify while the tab sits
 * open; only the per-row Countdown ticks (it owns its own interval).
 */

const HISTORY_STATUSES = ['Expired', 'Awarded', 'Cancelled']

const STATUS_BADGE_VARIANT = {
  Expired: 'gray',
  Awarded: 'green',
  Cancelled: 'red',
}

// '' = All, in front of the three closed statuses.
const HISTORY_STATUS_PILLS = ['', ...HISTORY_STATUSES]

const fmtMoney = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const cityStateZip = (addr) => `${addr.city}, ${addr.state} ${addr.zip}`

const columnHelper = createColumnHelper()

// Columns shared by both tabs. The final column (Remaining vs. Status) is
// appended per-tab below — same field (closesAt) drives both, but they are
// visually and semantically different (a live countdown vs. a closed outcome).
function baseColumns() {
  return [
    columnHelper.accessor('quoteId', { header: 'Quote#' }),
    columnHelper.accessor('shipper', { header: 'Shipper' }),
    columnHelper.accessor('equipment', { header: 'Equipment' }),
    columnHelper.accessor((q) => cityStateZip(q.shipFrom), { id: 'shipFrom', header: 'Ship From' }),
    columnHelper.accessor((q) => cityStateZip(q.shipTo), { id: 'shipTo', header: 'Ship To' }),
    columnHelper.accessor((q) => (q.stopOffs > 0 ? q.stopOffs : '–'), { id: 'stopOffs', header: 'Stop-offs' }),
    columnHelper.accessor('hazmat', {
      header: 'Hazmat',
      cell: (info) => (info.getValue() ? <Badge variant="red">Yes</Badge> : '–'),
    }),
    columnHelper.accessor('pickupDate', { header: 'Pickup' }),
    columnHelper.accessor('deliverDate', { header: 'Deliver' }),
    columnHelper.accessor((q) => formatDateTimeMDYHM(new Date(q.openedAt)), { id: 'quoteOpened', header: 'Quote Opened' }),
    columnHelper.accessor((q) => formatDateTimeMDYHM(new Date(q.closesAt)), { id: 'quoteCloses', header: 'Quote Closes' }),
    // Your Quote / Best read the live bid store at render time (no store
    // value is copied into row data) — a `submitBid`/`declineBid` call
    // notifies subscribers, which bumps `bidTick` below and re-renders this
    // cell with the fresh value.
    columnHelper.display({
      id: 'yourQuote',
      header: 'Your Quote',
      cell: ({ row }) => {
        const quote = row.original
        const value = yourQuoteFor(quote, getBid(quote.quoteId))
        if (value == null) return '–'
        return typeof value === 'number' ? fmtMoney(value) : value
      },
    }),
    columnHelper.display({
      id: 'best',
      header: 'Best',
      cell: ({ row }) => {
        const value = bestFor(row.original, Date.now())
        return value == null ? '–' : fmtMoney(value)
      },
    }),
  ]
}

const remainingColumn = columnHelper.display({
  id: 'remaining',
  header: 'Remaining',
  cell: ({ row }) => <Countdown closeAt={row.original.closesAt} />,
})

const statusColumn = columnHelper.display({
  id: 'status',
  header: 'Status',
  cell: ({ row }) => {
    const s = row.original.status
    return <Badge variant={STATUS_BADGE_VARIANT[s] ?? 'gray'}>{s}</Badge>
  },
})

export default function SpotBidRoute() {
  const navigate = useNavigate()

  // 'requests' | 'history'
  const [tab, setTab] = useState('requests')
  const [historyStatus, setHistoryStatus] = useState('')

  // Re-render on bid activity — see the Your Quote / Best cells above.
  const [, setBidTick] = useState(0)

  const now = useMemo(() => Date.now(), [])

  const quotes = useMemo(
    () => listQuotes(now).map((q) => ({ ...q, status: statusFor(q, null, now) })),
    [now],
  )

  useEffect(() => {
    const unsubs = quotes.map((q) => subscribe(q.quoteId, () => setBidTick((t) => t + 1)))
    return () => unsubs.forEach((unsub) => unsub())
  }, [quotes])

  const requests = useMemo(
    () => quotes.filter((q) => q.status === 'Open').sort((a, b) => a.closesAt - b.closesAt),
    [quotes],
  )
  const history = useMemo(
    () => quotes
      .filter((q) => HISTORY_STATUSES.includes(q.status) && (!historyStatus || q.status === historyStatus))
      .sort((a, b) => b.closesAt - a.closesAt),
    [quotes, historyStatus],
  )

  const rows = tab === 'requests' ? requests : history

  // Column set doesn't change identity across renders (columnHelper output
  // is static module-level state) except the tab-dependent last column.
  const columns = useMemo(
    () => [...baseColumns(), tab === 'requests' ? remainingColumn : statusColumn],
    [tab],
  )

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <AppShell>
      <div className="spotbid-list">
        <PageHeader title="SpotBid" />

        <div className="spotbid-list__tabs tab-group">
          <Tab label="Quote Requests" current={tab === 'requests'} onClick={() => setTab('requests')} />
          <Tab label="Quote History" current={tab === 'history'} onClick={() => setTab('history')} />
        </div>

        {/* Status filter — History only; every Requests row is Open, so a
            filter there would have exactly one option and reveal nothing. */}
        {tab === 'history' && (
          <div className="spotbid-list__filter" data-testid="spotbid-status-filter">
            {HISTORY_STATUS_PILLS.map((status) => (
              <PillTab
                key={status || 'all'}
                label={status || 'All'}
                selected={historyStatus === status}
                onClick={() => setHistoryStatus(status)}
              />
            ))}
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            icon={<Inbox size={32} />}
            message={tab === 'requests' ? 'No open quote requests' : 'No quote history'}
          />
        ) : (
          <div className="spotbid-list__table">
            <DataTable
              table={table}
              ariaLabel={tab === 'requests' ? 'Quote Requests' : 'Quote History'}
              onRowClick={(row) => navigate(`/spotbid/${row.original.quoteId}`)}
              // DataTable's own pointer-affordance class (--cell-clickable) is
              // tied to onCellClick, not onRowClick (packages/ui/src/DataTable.jsx)
              // — rows have no built-in hover cursor. App-local class, styled below.
              className="spotbid-list__table--row-clickable"
            />
          </div>
        )}
      </div>
    </AppShell>
  )
}
