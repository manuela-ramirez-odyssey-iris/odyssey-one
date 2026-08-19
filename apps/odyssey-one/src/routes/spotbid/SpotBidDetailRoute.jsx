import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  DataTable,
  EmptyState,
  FormField,
  SubAccordion,
  TitleSubtitle,
} from '@odyssey/ui'
import AppShell from '../../components/layout/AppShell'
import {
  CHARGE_NAMES,
  declineBid,
  fuelFor,
  getBid,
  listQuotes,
  statusFor,
  submitBid,
  subscribe,
  totalFor,
} from '../../spotbid/carrierQuotes.js'
import { fmtDollar } from '../../utils/money'
import './spotbid-detail.css'

// SpotBid Detail — /spotbid/:quoteId (plan §"Screens" screen 2). Carrier-facing
// redesign of the legacy TMS Load Detail + Quote Entry (quote-model.md §9.2–9.3).
// Quote entry is INLINE on the page (user ruling — replaces the legacy modal).
//
// SPB-05: carriers never see internal order/shipment IDs — nothing on this
// page reads an orderId/shipmentId; the only identifier ever shown is the
// carrier-facing quoteId (breadcrumb + route param). The quote object itself
// carries no such field (see carrierQuotes.js RAW_QUOTES).

// Status Alert copy for the three closed outcomes (statusFor never returns
// anything else once a quote's window has passed — 'Open' is handled
// separately).
const CLOSED_STATUS_COPY = {
  Expired: { variant: 'warning', message: 'This quote request has expired.' },
  Awarded: { variant: 'info', message: 'This quote request has been awarded.' },
  Cancelled: { variant: 'error', message: 'This quote request was cancelled.' },
}

const columnHelper = createColumnHelper()

// Non-sortable — a small fixed manifest, not a fetched/paginated list (DataTable.usage.md).
const ITEM_COLUMNS = [
  columnHelper.display({ id: 'item', header: 'Item', cell: (info) => info.row.index + 1 }),
  columnHelper.accessor('description', { header: 'Description' }),
  columnHelper.accessor('weightLb', { header: 'Weight', cell: (info) => `${info.getValue().toLocaleString()} lb` }),
  columnHelper.accessor('packageCount', { header: 'Package Count' }),
  columnHelper.accessor('hazmatCode', { header: 'Hazmat Code', cell: (info) => info.getValue() ?? '–' }),
  columnHelper.accessor('hazmatPackingGroup', { header: 'Packing Group', cell: (info) => info.getValue() ?? '–' }),
  columnHelper.accessor('hazmatClass', { header: 'Class', cell: (info) => info.getValue() ?? '–' }),
  columnHelper.accessor('hazmatDescription', { header: 'Hazmat Description', cell: (info) => info.getValue() ?? '–' }),
  columnHelper.accessor('sdsUrl', {
    header: 'Safety Data Sheet',
    cell: (info) => {
      const url = info.getValue()
      return url ? (
        <a href={url} target="_blank" rel="noreferrer">View</a>
      ) : (
        '–'
      )
    },
  }),
]

// Full street address, one line per part (own <span> per line so it stays
// individually text-queryable and doesn't rely on <br/> for layout).
function AddressLines({ address }) {
  return (
    <span className="spotbid-detail__address">
      <span className="spotbid-detail__address-line">{address.company}</span>
      <span className="spotbid-detail__address-line">
        {address.street}{address.street2 ? `, ${address.street2}` : ''}
      </span>
      <span className="spotbid-detail__address-line">{`${address.city}, ${address.state} ${address.zip}`}</span>
    </span>
  )
}

function BreadcrumbRow({ quoteId, onHome }) {
  return (
    <nav className="spotbid-detail__crumbs" aria-label="Breadcrumb">
      <Breadcrumb label="SpotBid" onClick={onHome} />
      <Breadcrumb label={`Quote# ${quoteId}`} current />
    </nav>
  )
}

// The inline Quote Entry card — editable Base Charge + Additional Charges +
// live totals. Keyed by the parent on every "start editing" so its local
// state remounts fresh from the CURRENT bid (blank for a new bid, prefilled
// for Update Bid) instead of carrying over stale input.
function QuoteEntryForm({ quote, bid, onSubmit, onDecline }) {
  const prefill = bid.state === 'submitted' ? bid : null
  const [linehaul, setLinehaul] = useState(() => (prefill?.linehaul != null ? String(prefill.linehaul) : ''))
  const [currency, setCurrency] = useState(() => prefill?.currency ?? 'USD')
  const [chargeValues, setChargeValues] = useState(() => {
    const init = {}
    for (const name of CHARGE_NAMES) {
      const v = prefill?.chargeAmounts?.[name]
      init[name] = v != null ? String(v) : ''
    }
    return init
  })

  const linehaulNum = Number(linehaul) || 0
  const fuel = fuelFor(quote)
  const subtotal = linehaulNum + fuel

  const chargeAmounts = {}
  let chargeTotal = 0
  for (const name of CHARGE_NAMES) {
    const n = Number(chargeValues[name])
    if (n > 0) {
      chargeAmounts[name] = n
      chargeTotal += n
    }
  }
  const total = subtotal + chargeTotal

  return (
    <SubAccordion title="Quote Entry" showIcon={false} defaultExpanded>
      <div className="spotbid-qe__label text-label-sm-medium">Base Charge</div>
      <div className="spotbid-qe__grid">
        {/* Linehaul + Currency merged into one field (FormField trailingSelect
            edge, packages/ui/src/FormField.jsx ~150-175) — click the currency
            button to toggle USD/CAD; only two values exist, so a cycle is the
            smallest working control (no anchored-menu plumbing needed). */}
        <FormField
          id="qe-linehaul"
          label="Linehaul"
          format="decimal"
          value={linehaul}
          onChange={(e) => setLinehaul(e.target.value)}
          trailingSelect={{ label: currency, onClick: () => setCurrency((c) => (c === 'USD' ? 'CAD' : 'USD')) }}
        />
        <FormField
          id="qe-fuel"
          label={`Fuel [${fmtDollar(quote.fuelRatePerMile)} per mile]`}
          value={fmtDollar(fuel)}
          disabled
        />
      </div>
      <div className="spotbid-qe__total-row text-label-sm-medium">
        <span>Subtotal</span>
        <span>{fmtDollar(subtotal)}</span>
      </div>

      <div className="spotbid-qe__label text-label-sm-medium">Additional Charges</div>
      <div className="spotbid-qe__grid">
        {CHARGE_NAMES.map((name) => (
          <FormField
            key={name}
            id={`qe-charge-${name}`}
            label={name}
            format="decimal"
            value={chargeValues[name]}
            onChange={(e) => setChargeValues((m) => ({ ...m, [name]: e.target.value }))}
          />
        ))}
      </div>
      <div className="spotbid-qe__total-row text-label-sm-medium">
        <span>Total</span>
        <span>{fmtDollar(total)}</span>
      </div>

      <div className="spotbid-qe__actions">
        <Button variant="secondary" onClick={onDecline}>Decline</Button>
        <Button
          variant="primary"
          disabled={!(linehaulNum > 0)}
          onClick={() => onSubmit({ linehaul: linehaulNum, currency, chargeAmounts })}
        >
          Submit
        </Button>
      </div>
    </SubAccordion>
  )
}

// Read-only "Your Quote" — the submitted-state mirror of QuoteEntryForm.
// `onUpdate` present only while the window is still open (PRD Feature 3 —
// re-bid allowed while open); omitted once closed.
function YourQuoteSummary({ quote, bid, onUpdate }) {
  const fuel = fuelFor(quote)
  const total = totalFor(quote, bid)
  return (
    <SubAccordion title="Your Quote" showIcon={false} defaultExpanded>
      <div className="spotbid-qe__grid">
        <TitleSubtitle title={fmtDollar(bid.linehaul)} subtitle="Linehaul" />
        <TitleSubtitle title={fmtDollar(fuel)} subtitle="Fuel" />
        <TitleSubtitle title={bid.currency ?? 'USD'} subtitle="Currency" />
        {CHARGE_NAMES.map((name) => (
          <TitleSubtitle key={name} title={fmtDollar(bid.chargeAmounts?.[name] ?? null)} subtitle={name} />
        ))}
      </div>
      <div className="spotbid-qe__total-row text-label-sm-medium">
        <span>Total</span>
        <span>{fmtDollar(total)}</span>
      </div>
      {onUpdate && (
        <div className="spotbid-qe__actions">
          <Button variant="secondary" onClick={onUpdate}>Update Bid</Button>
        </div>
      )}
    </SubAccordion>
  )
}

export default function SpotBidDetailRoute() {
  const { quoteId } = useParams()
  const navigate = useNavigate()
  const goHome = () => navigate('/spotbid')

  // Frozen at mount: listQuotes derives every window as an OFFSET from `now`
  // (carrierQuotes.js), so re-deriving on every render would make a quote's
  // dates/remaining-window drift render to render. One `now` per page visit.
  const [now] = useState(() => Date.now())
  const quote = useMemo(() => listQuotes(now).find((q) => q.quoteId === quoteId), [now, quoteId])

  const [bid, setBid] = useState(() => (quote ? getBid(quote.quoteId) : null))
  useEffect(() => {
    if (!quote) return undefined
    setBid(getBid(quote.quoteId))
    return subscribe(quote.quoteId, setBid)
  }, [quote])

  // Whether the entry card is showing the editable form right now (as
  // opposed to a read-only summary/alert) — toggled by Update Bid / re-bid.
  const [editing, setEditing] = useState(false)
  const [editKey, setEditKey] = useState(0)
  const startEdit = () => {
    setEditKey((k) => k + 1)
    setEditing(true)
  }

  // Items table — built unconditionally (hooks can't be conditional); an
  // unknown quote just feeds it an empty array, and the early-return below
  // never renders it.
  const itemsTable = useReactTable({
    data: quote?.items ?? [],
    columns: ITEM_COLUMNS,
    getCoreRowModel: getCoreRowModel(),
  })

  if (!quote) {
    return (
      <AppShell>
        <div className="spotbid-detail">
          <BreadcrumbRow quoteId={quoteId} onHome={goHome} />
          <EmptyState icon={<Search size={32} />} message="Quote not found" />
          <Button variant="link" onClick={goHome}>Back to SpotBid</Button>
        </div>
      </AppShell>
    )
  }

  const status = statusFor(quote, bid, now)
  const isOpen = status === 'Open'

  const handleSubmit = (values) => {
    submitBid(quote.quoteId, values, now)
    setEditing(false)
  }
  const handleDecline = () => {
    declineBid(quote.quoteId, now)
    setEditing(false)
  }

  const showForm = isOpen && (bid.state === 'none' || editing)
  const showSummary = bid.state === 'submitted' && !showForm
  const showDeclinedAlert = isOpen && bid.state === 'declined' && !editing
  const closedCopy = !isOpen ? (CLOSED_STATUS_COPY[status] ?? CLOSED_STATUS_COPY.Expired) : null

  return (
    <AppShell>
      <div className="spotbid-detail">
        <BreadcrumbRow quoteId={quote.quoteId} onHome={goHome} />

        <SubAccordion title="Load Summary" showIcon={false} defaultExpanded>
          <div className="spotbid-detail__shipper-row">
            <TitleSubtitle title={quote.shipper} subtitle="Shipper" />
            <TitleSubtitle title={<AddressLines address={quote.shipFrom} />} subtitle="Ship From" />
            <TitleSubtitle title={<AddressLines address={quote.shipTo} />} subtitle="Ship To" />
          </div>
          <div className="spotbid-detail__grid">
            <TitleSubtitle title={quote.pickupDate} subtitle="Pickup" />
            <TitleSubtitle title={quote.deliverDate} subtitle="Deliver" />
            <TitleSubtitle title={`${quote.distanceMi} mi`} subtitle="Distance" />
            <TitleSubtitle title={`${quote.weightLb.toLocaleString()} lb`} subtitle="Weight" />
            <div className="spotbid-detail__hazmat">
              <span className="text-label-xs-medium title-subtitle__subtitle">Hazmat</span>
              <Badge variant={quote.hazmat ? 'red' : 'gray'}>{quote.hazmat ? 'Yes' : 'No'}</Badge>
            </div>
          </div>
        </SubAccordion>

        <SubAccordion title="Items" showIcon={false} defaultExpanded>
          <DataTable table={itemsTable} ariaLabel="Items" />
        </SubAccordion>

        <SubAccordion title="Instructions" showIcon={false} defaultExpanded>
          <p className="text-label-sm-regular spotbid-detail__instructions">
            {quote.instructions || 'No instructions.'}
          </p>
        </SubAccordion>

        {closedCopy && (
          <Alert variant={closedCopy.variant} showClose={false}>{closedCopy.message}</Alert>
        )}

        {showDeclinedAlert && (
          <Alert
            variant="warning"
            showClose={false}
            showLink
            linkLabel="Submit a bid"
            onLinkClick={startEdit}
          >
            You declined this quote request.
          </Alert>
        )}

        {showSummary && (
          <YourQuoteSummary quote={quote} bid={bid} onUpdate={isOpen ? startEdit : undefined} />
        )}

        {showForm && (
          <QuoteEntryForm key={editKey} quote={quote} bid={bid} onSubmit={handleSubmit} onDecline={handleDecline} />
        )}
      </div>
    </AppShell>
  )
}
