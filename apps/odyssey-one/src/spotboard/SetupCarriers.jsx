import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'
import { DataTable, Dropdown, FormField, Checkbox, Badge, Button } from '@odyssey/ui'
import DateField from '../components/orders/create/fields/DateField.jsx'
import { NAMED_LISTS, buildCarrierRows } from './carrierList.js'
import './spotboard.css'

const LIST_OPTIONS = NAMED_LISTS.map((l) => ({ value: l.id, label: l.name }))

function Field({ label, value }) {
  return (
    <div className="setup-carriers__field">
      <div className="setup-carriers__field-label">{label}</div>
      <div className="setup-carriers__field-value">{value}</div>
    </div>
  )
}

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
      header: 'Carrier',
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
          <Badge key={f} variant="red">{f}</Badge>
        )),
    }),
  ]
}

/**
 * SetupCarriers — SpotBoard "Setup & Carriers" sub-tab. Read-only context
 * header (from `header`, derived upstream) + a toolbar to pick a named
 * carrier list/quote duration/flexible-pickup + the carrier DataTable
 * (Incl./Carrier/Equip/Email/dates/Flags) + Send RFQ/Save Draft/Cancel.
 *
 * `carrierOptions` arrives pre-resolved ({value: scac, label} from the async
 * `getLookupOptions('carrier', q)` pool) — the fetch is the parent's job
 * (SpotBoardTab, Task 10); this component stays sync, feeding it straight
 * into the pure `buildCarrierRows`.
 */
export default function SetupCarriers({
  quote,
  header,
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

  const toggleIncl = (scac) =>
    setRows((rs) => rs.map((r) => (r.scac === scac ? { ...r, incl: !r.incl } : r)))

  const updateDate = (scac, field, value) =>
    setRows((rs) => rs.map((r) => (r.scac === scac ? { ...r, [field]: value } : r)))

  const columns = useMemo(() => buildColumns(readOnly, toggleIncl, updateDate), [readOnly])

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })

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
      <div className="setup-carriers__header">
        <Field label="Origin" value={header?.origin} />
        <Field label="Destination" value={header?.destination} />
        <Field label="Equipment" value={header?.equipment} />
        <Field label="Distance" value={header?.distance} />
        <Field label="Hazmat" value={header?.hazmat} />
        <Field label="Pickup Window" value={header?.pickupWindow} />
      </div>

      <div className="setup-carriers__toolbar">
        <div className="setup-carriers__dropdown-field">
          <div className="setup-carriers__dropdown-label text-label-sm-medium">Carrier List</div>
          <Dropdown
            value={listId}
            options={LIST_OPTIONS}
            onChange={handleListChange}
            disabled={readOnly}
            aria-label="Carrier List"
          />
        </div>
        <FormField
          id="quote-duration"
          label="Quote Duration"
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

      <DataTable table={table} ariaLabel="Carrier List" />

      {!readOnly && (
        <div className="setup-carriers__actions">
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
  )
}
