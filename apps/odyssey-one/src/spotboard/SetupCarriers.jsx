import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { DataTable, ComboBox, FormField, Checkbox, Badge, Button } from '@odyssey/ui'
import DateField from '../components/orders/create/fields/DateField.jsx'
import { NAMED_LISTS, buildCarrierRows, FLAG_LABELS } from './carrierList.js'
import './spotboard.css'

const LIST_OPTIONS = NAMED_LISTS.map((l) => ({ value: l.id, label: l.name }))

const columnHelper = createColumnHelper()

function buildColumns(readOnly, toggleIncl, updateDate) {
  return [
    columnHelper.display({
      id: 'incl',
      header: 'Incl.',
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.incl}
          onChange={() => toggleIncl(row.original.scac)}
          disabled={readOnly}
          showLabel={false}
          aria-label={`Include ${row.original.scac}`}
        />
      ),
    }),
    columnHelper.display({
      id: 'carrier',
      header: 'Carrier (SCAC · Name)',
      cell: ({ row }) => `${row.original.scac} · ${row.original.name}`,
    }),
    columnHelper.accessor('equipment', { header: 'Equip' }),
    columnHelper.accessor('email', { header: 'Contact Email' }),
    columnHelper.display({
      id: 'plannedPickup',
      header: 'Planned Pickup',
      cell: ({ row }) => (
        <div data-testid={`pickup-${row.original.scac}`}>
          <DateField
            value={row.original.plannedPickup}
            onChange={(v) => updateDate(row.original.scac, 'plannedPickup', v)}
            disabled={readOnly}
          />
        </div>
      ),
    }),
    columnHelper.display({
      id: 'plannedDelivery',
      header: 'Planned Delivery',
      cell: ({ row }) => (
        <div data-testid={`delivery-${row.original.scac}`}>
          <DateField
            value={row.original.plannedDelivery}
            onChange={(v) => updateDate(row.original.scac, 'plannedDelivery', v)}
            disabled={readOnly}
          />
        </div>
      ),
    }),
    columnHelper.display({
      id: 'flags',
      header: 'Flags',
      cell: ({ row }) =>
        row.original.flags.map((f) => (
          <Badge key={f} variant="red">{FLAG_LABELS[f] || f}</Badge>
        )),
    }),
  ]
}

/**
 * SetupCarriers — SpotBoard "Setup & Carriers" sub-tab. A toolbar to pick a
 * named carrier list/quote duration/flexible-pickup + the carrier DataTable
 * (Incl./Carrier/Equip/Email/dates/Flags) + Send RFQ/Save Draft/Cancel.
 *
 * The shipment-context SummaryStrip now lives in the parent (SpotBoardTab),
 * hoisted above both sub-tabs — it's not this component's concern anymore.
 *
 * `carrierOptions` arrives pre-resolved ({value: scac, label} from the async
 * `getLookupOptions('carrier', q)` pool) — the fetch is the parent's job
 * (SpotBoardTab, Task 10); this component stays sync, feeding it straight
 * into the pure `buildCarrierRows`.
 */
export default function SetupCarriers({
  quote,
  carrierOptions,
  readOnly = false,
  onSaveDraft,
  onSendRFQ,
  onCancel,
}) {
  const [listId, setListId] = useState(quote?.listId ?? '')
  const [durationMin, setDurationMin] = useState(
    quote?.durationMin != null ? String(quote.durationMin) : ''
  )
  const [flexiblePickup, setFlexiblePickup] = useState(quote?.flexiblePickup ?? false)
  const [rows, setRows] = useState(quote?.carriers ?? [])

  const handleListChange = (id) => {
    setListId(id)
    const list = NAMED_LISTS.find((l) => l.id === id)
    if (!list) return
    setRows(buildCarrierRows(list, carrierOptions))
    setDurationMin(String(list.defaultDurationMin))
  }

  // No existing quote → default to the first named list, same as if the user
  // had picked it themselves (reuses handleListChange, not a parallel copy).
  // `carrierOptions` resolves async in the parent, so this re-fires until the
  // rows actually populate (guarded on `!listId` so it only ever runs once).
  useEffect(() => {
    if (!quote && !listId) handleListChange(NAMED_LISTS[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrierOptions])

  const toggleIncl = (scac) =>
    setRows((rs) => rs.map((r) => (r.scac === scac ? { ...r, incl: !r.incl } : r)))

  const updateDate = (scac, field, value) =>
    setRows((rs) => rs.map((r) => (r.scac === scac ? { ...r, [field]: value } : r)))

  const columns = useMemo(() => buildColumns(readOnly, toggleIncl, updateDate), [readOnly])

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })

  // Toolbar sticks above the table (spotboard.css); measure its rendered
  // height + sticky offset and hand it to DataTable, exactly like
  // OrdersTable does for orders-toolbar — the table header then sticks
  // directly beneath it instead of underneath.
  const toolbarRef = useRef(null)
  const [stickyTop, setStickyTop] = useState(0)
  useLayoutEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return
    const measure = () =>
      setStickyTop(toolbar.offsetHeight + parseFloat(getComputedStyle(toolbar).top))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const includedRows = rows.filter((r) => r.incl)
  const canSend =
    !!listId &&
    includedRows.length > 0 &&
    includedRows.every((r) => r.plannedPickup && r.plannedDelivery)

  const buildPayload = () => {
    const list = NAMED_LISTS.find((l) => l.id === listId)
    return {
      listId,
      listName: list?.name ?? '',
      durationMin: Number(durationMin) || 0,
      carriers: rows,
      flexiblePickup,
    }
  }

  return (
    <div className="setup-carriers">
      <div className="setup-carriers__toolbar" ref={toolbarRef}>
        <div className="setup-carriers__toolbar-top">
          <span className="setup-carriers__toolbar-count text-label-sm-regular">
            {rows.length} {rows.length === 1 ? 'carrier' : 'carriers'}
          </span>
          {!readOnly && (
            <div className="setup-carriers__toolbar-right">
              <Button variant="primary" disabled={!canSend} onClick={() => onSendRFQ?.(buildPayload())}>
                Send RFQ
              </Button>
              <Button variant="secondary" onClick={() => onSaveDraft?.(buildPayload())}>
                Save Draft
              </Button>
              <Button variant="link" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          )}
        </div>
        <div className="setup-carriers__toolbar-controls">
          <ComboBox
            id="carrier-list"
            variant="select"
            typable={false}
            showLabel
            label="Carrier List (select exactly one)"
            options={LIST_OPTIONS}
            value={listId}
            onSelect={handleListChange}
            disabled={readOnly}
          />
          <FormField
            id="quote-duration"
            label="Quote Duration (open window, min)"
            format="integer"
            maxLength={5}
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            disabled={readOnly}
          />
          <Checkbox
            label="Flexible Pickup"
            checked={flexiblePickup}
            onChange={(e) => setFlexiblePickup(e.target.checked)}
            disabled={readOnly}
          />
        </div>
      </div>

      <DataTable table={table} stickyTop={stickyTop} ariaLabel="Carrier List" />
    </div>
  )
}
