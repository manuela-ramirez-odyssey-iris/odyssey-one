import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Alert, Button, ComboBox, DatePicker, Dropdown, FilterButton, FormField, GroupTable, ModalMedium, Spinner } from '@odyssey/ui'
import { EMPTY_FILTERS, SHIPMENT_STATUSES, TENDER_STATUSES, MOVE_BLOCKED_TOOLTIP, filterCandidates } from '../../../../api/_lib/candidateOrders.mjs'
import TooltipTrigger from '../../ui/TooltipTrigger.jsx'
import { rowsToFlatGroups } from '../../shipments/order-change/comparisonHelpers.jsx'
import { useCandidateOrders } from '../../../api/queries/useCandidateOrders'
import './edit-stops.css'

// LINX-15870 Search & Add Orders — VD 2137-59231 (grid) + the inner Filters
// modal (user: "if filters is clicked we show them in the inner modal" —
// the DSM's modal navigation stack: a second ModalMedium with onBack).
const MAX = 5
const CAP_MSG = 'You can select up to five orders at a time.'
const COLUMNS = [
  { key: 'customer', label: 'Customer' }, { key: 'origin', label: 'Origin' }, { key: 'destination', label: 'Destination' },
  { key: 'orderNumber', label: 'Order Number' }, { key: 'weight', label: 'Order Weight' }, { key: 'volume', label: 'Order Volume' },
  { key: 'buyShipment', label: 'Buy Shipment' }, { key: 'shipmentStatus', label: 'Shipment Status' }, { key: 'tenderStatus', label: 'Tender Status' },
  { key: 'shipmentType', label: 'Shipment Type' }, { key: 'ordersInShipment', label: 'Orders in the Shipment' },
]
// D6 — a blocked row reads greyed; its Order Number explains why on hover.
const cell = (r, c) => {
  const text = c.key === 'ordersInShipment' ? r.ordersInShipment.join(' - ') : (r[c.key] || '--')
  if (!r.blocked) return text
  const span = <span className="add-orders__blocked">{text}</span>
  return c.key === 'orderNumber'
    ? <TooltipTrigger asSpan tooltipProps={{ groups: [{ content: MOVE_BLOCKED_TOOLTIP }] }}>{span}</TooltipTrigger>
    : span
}
const opts = (list) => [{ value: '', label: 'Any' }, ...list.map((v) => ({ value: v, label: v }))]

// DatePicker range value is { start, end }: Date|null; filters store 'YYYY-MM-DD' strings.
const isoToDate = (iso) => (iso ? new Date(`${iso}T00:00:00`) : null)
const dateToIso = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '')

export default function AddOrdersModal({ sellShipment, customerId, customerName, excludeOrderIds, onAdd, onClose }) {
  const { data, isPending, isError } = useCandidateOrders(sellShipment, customerId, excludeOrderIds)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [draft, setDraft] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selected, setSelected] = useState([])
  const [capped, setCapped] = useState(false)

  const rows = useMemo(() => filterCandidates(data ?? [], { q, filters }), [data, q, filters])
  // Unfiltered — a pick made before a later search/filter narrows the grid must still resolve.
  const byId = useMemo(() => new Map((data ?? []).map((r) => [r.orderNumber, r])), [data])

  const select = (id, next) => {
    if (!next) { setSelected((s) => s.filter((x) => x !== id)); setCapped(false); return }
    if (selected.length >= MAX) { setCapped(true); return }
    setSelected((s) => [...s, id])
  }
  // Header checkbox: every selectable row when it fits, else the first five (and say so).
  const selectAll = (next) => {
    if (!next) { setSelected([]); setCapped(false); return }
    const open = rows.filter((r) => !r.blocked)
    setSelected(open.slice(0, MAX).map((r) => r.orderNumber)); setCapped(open.length > MAX)
  }
  const clearAll = () => { setQ(''); setFilters(EMPTY_FILTERS); setDraft(EMPTY_FILTERS); setSelected([]); setCapped(false) }
  const openFilters = () => { setDraft(filters); setFiltersOpen(true) }
  const apply = () => { setFilters(draft); setFiltersOpen(false) }
  const setField = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }))
  const setPick = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }))
  const setRange = (k) => (range) => setDraft((d) => ({ ...d, [k]: { from: dateToIso(range?.start), to: dateToIso(range?.end) } }))

  return createPortal(
    <>
      <ModalMedium title="Add New Order(s)" ariaLabel="Add New Order(s)" onClose={onClose} className="add-orders"
        footer={(<>
          <Button variant="secondary" size="lg" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="lg" disabled={selected.length === 0} onClick={() => onAdd(selected.map((id) => byId.get(id)).filter(Boolean))}>Add Order(s)</Button>
        </>)}>
        <div className="add-orders__toolbar">
          <ComboBox variant="search" placeholder="Search" value={q} onChange={setQ} onClear={() => setQ('')} className="add-orders__search" />
          <FilterButton active={filtersOpen} onClick={openFilters} />
          <Button variant="secondary" onClick={clearAll}>Clear All</Button>
        </div>
        {capped && <Alert variant="warning" onClose={() => setCapped(false)}>{CAP_MSG}</Alert>}
        {isPending ? <Spinner /> : isError ? <Alert variant="error" showClose={false}>Could not load orders.</Alert> : (
          <GroupTable flat selectable header={{ title: `Results (${rows.length})` }} columns={COLUMNS}
            groups={rowsToFlatGroups(rows, COLUMNS, cell).map((g, i) => ({ ...g, id: rows[i].orderNumber, selectDisabled: rows[i].blocked }))}
            selectedIds={selected} onSelect={select} onSelectAll={selectAll} selectLabel={(g) => `Select order ${g.id}`} />
        )}
      </ModalMedium>

      {filtersOpen && (
        <ModalMedium title="Filters" ariaLabel="Filters" onBack={() => setFiltersOpen(false)} onClose={() => setFiltersOpen(false)} className="add-orders__filters modal-nav-view"
          footer={(<>
            <Button variant="secondary" size="lg" onClick={() => setDraft(EMPTY_FILTERS)}>Clear</Button>
            <Button variant="primary" size="lg" onClick={apply}>Apply</Button>
          </>)}>
          <div className="add-orders__grid">
            {/* ponytail: FormField has no readOnly, only disabled; onChange is inert since disabled already blocks input. */}
            <FormField id="add-orders-customer" label="Customer" value={customerName} disabled onChange={() => {}} />
            <FormField id="add-orders-order-number" label="Order #" value={draft.orderNumber} onChange={setField('orderNumber')} />
            <FormField id="add-orders-buy-shipment" label="Buy Shipment" value={draft.buyShipment} onChange={setField('buyShipment')} />
            <DatePicker mode="range" label="Ship Date" value={{ start: isoToDate(draft.shipDate.from), end: isoToDate(draft.shipDate.to) }} onChange={setRange('shipDate')} />
            <DatePicker mode="range" label="Delivery Date" value={{ start: isoToDate(draft.deliveryDate.from), end: isoToDate(draft.deliveryDate.to) }} onChange={setRange('deliveryDate')} />
            <FormField id="add-orders-origin" label="Origin" placeholder="Site ID, City, State, ZIP or Country" value={draft.origin} onChange={setField('origin')} />
            <FormField id="add-orders-destination" label="Destination" placeholder="Site ID, City, State, ZIP or Country" value={draft.destination} onChange={setField('destination')} />
            {/* No htmlFor/id: Dropdown's id lands on a non-labelable span, not the trigger button — the wrapping label implicitly labels the inner control instead. */}
            <label className="text-label-xs-medium">Shipment Status<Dropdown value={draft.shipmentStatus} options={opts(SHIPMENT_STATUSES)} onChange={setPick('shipmentStatus')} /></label>
            <label className="text-label-xs-medium">Tender Status<Dropdown value={draft.tenderStatus} options={opts(TENDER_STATUSES)} onChange={setPick('tenderStatus')} /></label>
          </div>
        </ModalMedium>
      )}
    </>,
    document.body,
  )
}
