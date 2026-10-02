// @vitest-environment jsdom
// Consolidation workbench easy pass (S165, spec 2026-10-01-consolidation-
// workbench-easy-fixes): the mode's column set (Ramesh #2/3/8/9/11/12,
// LINX-15786 BR II), the Scenario 2 empty copy, and grid sorting (LINX-15893
// BR I). Same harness as consolidateMode.test.jsx; the grid service is wrapped
// so a test can spy on the list params and empty the pool.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ShipmentsRoute from './ShipmentsRoute.jsx'
import ShipmentTable from '../../components/shipments/ShipmentTable.jsx'
import { COLUMN_CONFIG } from '../../components/shipments/ShipmentTable.jsx'
import { ALL_COLUMNS } from '../../components/detail/ColumnPanel.jsx'
import { SORTABLE_KEYS } from '../../components/shipments/sortableColumns.js'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { __clearMockPreferences } from '../../api/services/preferenceService'
import { getShipmentErrorList } from '../../api/services/gridService'
import { weightLb } from '../../consolidation/equipmentCapacity'

let emptyPool = false
vi.mock('../../api/services/gridService', async (importOriginal) => {
  const real = await importOriginal()
  return {
    ...real,
    getShipmentErrorList: vi.fn((p) => (emptyPool && p.category === 'consolidation'
      ? Promise.resolve({ pageNumber: 0, pageSize: p.pageSize, totalCount: 0, rows: [] })
      : real.getShipmentErrorList(p))),
  }
})

beforeEach(() => {
  __clearMockPreferences()
  emptyPool = false
  getShipmentErrorList.mockClear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function renderRoute(state) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/shipments', state }]}>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>
          <Routes>
            <Route path="/shipments/*" element={<ShipmentsRoute />} />
          </Routes>
        </CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function enterMode() {
  fireEvent.click(await screen.findByRole('button', { name: 'Consolidate' }))
  await screen.findByRole('heading', { name: 'Shipments Consolidation' })
}

// Header labels in render order; the select/action columns carry no text.
const headerLabels = () => [...document.querySelectorAll('thead th')].map((th) => th.textContent.trim()).filter(Boolean)
const lastListCall = () => getShipmentErrorList.mock.calls.at(-1)[0]

describe('consolidate mode column set (E1)', () => {
  test('entering shows exactly the workbench columns, in BR II order', async () => {
    renderRoute()
    await enterMode()
    await waitFor(() => expect(headerLabels()).toEqual([
      'Odyssey Shipment ID', 'Buy Shipment', 'Shipment Type', 'Customer ID(s)', 'Customer Name',
      'Origin', 'Destination', 'Equipment', 'Gross Weight',
      'Total Volume', 'Weight Utilization %', 'Volume Utilization %',
      'Pickup Date', 'Delivery Date', 'Planning Type', 'SCAC',
    ]))
  })

  test('leaving restores the Monitoring set untouched', async () => {
    renderRoute({ panel: 'monitoring', tab: 'all' })
    await screen.findByRole('heading', { name: 'Shipments' })
    await waitFor(() => expect(headerLabels()).toContain('Tender Status'))
    const before = headerLabels()
    await enterMode()
    await waitFor(() => expect(headerLabels()).not.toContain('Tender Status'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByRole('heading', { name: 'Shipments' })
    await waitFor(() => expect(headerLabels()).toEqual(before))
  })
})

describe('Scenario 2 empty state (E2, LINX-15786)', () => {
  test('an empty pool reads the story copy', async () => {
    emptyPool = true
    renderRoute()
    await enterMode()
    expect(await screen.findByText('No Consolidation Candidates Available')).toBeTruthy()
    expect(screen.queryByText('No shipments found')).toBeNull()
  })

  test('an empty search inside the mode keeps the generic copy', async () => {
    emptyPool = true
    renderRoute()
    await enterMode()
    await screen.findByText('No Consolidation Candidates Available')
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'zzzz-no-such-shipment' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(await screen.findByText('No shipments found')).toBeTruthy()
    expect(screen.queryByText('No Consolidation Candidates Available')).toBeNull()
  })

  test('outside the mode the table keeps its generic copy', () => {
    render(
      <MemoryRouter>
        <ShipmentTable shipments={[]} onRowSelect={vi.fn()} visibleColumns={['odysseyShipmentIdentifier']} sorting={[]} onSortingChange={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('No shipments found')).toBeTruthy()
  })
})

describe('grid sorting (E3, LINX-15893 BR I)', () => {
  test('every catalog column is either sortable or deliberately not — no third state', () => {
    const catalog = new Set(ALL_COLUMNS.map((c) => c.key))
    for (const key of SORTABLE_KEYS) expect(catalog.has(key), `${key} is not a grid column`).toBe(true)
    // COLUMN_CONFIG ⊂ ALL_COLUMNS; every key falls in exactly one bucket.
    for (const { key } of COLUMN_CONFIG) expect(catalog.has(key)).toBe(true)
    expect(SORTABLE_KEYS).not.toContain('grossWeight')
    expect(SORTABLE_KEYS).not.toContain('orders')
    expect(SORTABLE_KEYS).not.toContain('hazardous')
    // S165 V2: Total Volume isn't a shipments column and the utilizations are
    // computed client-side — none of the three has anything to ORDER BY.
    for (const key of ['totalVolume', 'weightUtilization', 'volumeUtilization']) {
      expect(catalog.has(key)).toBe(true)
      expect(SORTABLE_KEYS).not.toContain(key)
    }
  })

  test('headers are clickable only on sortable columns', () => {
    const row = { id: 's1', sellShipment: 's1', buyShipment: 'b1', odysseyShipmentIdentifier: 'O1', orders: ['X1'], origin: 'Dallas', grossWeight: '100', validationMessage: '' }
    render(
      <MemoryRouter>
        <ShipmentTable
          shipments={[row]} onRowSelect={vi.fn()} totalCount={1}
          visibleColumns={['odysseyShipmentIdentifier', 'orders', 'origin', 'grossWeight', 'hazardous', 'validationMessage']}
          sorting={[{ id: 'odysseyShipmentIdentifier', desc: false }]} onSortingChange={vi.fn()}
        />
      </MemoryRouter>,
    )
    const sortButtons = screen.getAllByRole('button', { name: /^Sort by / }).map((b) => b.getAttribute('aria-label'))
    expect(sortButtons).toEqual(['Sort by Odyssey Shipment ID', 'Sort by Origin'])
  })

  test('a header click sends sortBy/orderBy for that key', async () => {
    renderRoute({ panel: 'monitoring', tab: 'all' })
    fireEvent.click(await screen.findByRole('button', { name: 'Sort by Origin' }))
    await waitFor(() => expect(lastListCall()).toMatchObject({ sortBy: 'origin', orderBy: 'asc' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Origin' }))
    await waitFor(() => expect(lastListCall()).toMatchObject({ sortBy: 'origin', orderBy: 'desc' }))
  })

  test('in the mode the default is Shipment ID descending; exit restores the prior sort', async () => {
    renderRoute()
    await screen.findByRole('heading', { name: 'Shipments' })
    await waitFor(() => expect(lastListCall()).toMatchObject({ sortBy: 'odysseyShipmentIdentifier', orderBy: 'asc' }))
    await enterMode()
    await waitFor(() => expect(lastListCall()).toMatchObject({ sortBy: 'odysseyShipmentIdentifier', orderBy: 'desc' }))
    const idHeader = screen.getByRole('button', { name: 'Sort by Odyssey Shipment ID' }).closest('th')
    expect(idHeader.getAttribute('aria-sort')).toBe('descending')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByRole('heading', { name: 'Shipments' })
    await waitFor(() => expect(lastListCall()).toMatchObject({ sortBy: 'odysseyShipmentIdentifier', orderBy: 'asc' }))
  })

  test('a mount already inside the mode starts on Shipment ID descending too', async () => {
    renderRoute({ consolidate: { rows: [] } })
    await screen.findByRole('heading', { name: 'Shipments Consolidation' })
    await waitFor(() => expect(lastListCall()).toMatchObject({ sortBy: 'odysseyShipmentIdentifier', orderBy: 'desc' }))
  })
})

// ── S165 spec 2026-10-01-consolidation-workbench-volume-utilization ──────────

const POOL_COLS = ['origin', 'destination', 'grossWeight', 'totalVolume', 'weightUtilization', 'volumeUtilization']
function renderPoolRow(over) {
  const row = { id: 's1', sellShipment: 's1', buyShipment: 'b1', odysseyShipmentIdentifier: 'O1', orders: [], origin: 'Dallas TX US 75201', destination: 'Lake Charles LA US 70601', equipmentCode: 'TLH', grossWeight: '22500', totalVolume: 1900, originLocationId: null, destinationLocationId: null, ...over }
  render(
    <MemoryRouter>
      <ShipmentTable shipments={[row]} onRowSelect={vi.fn()} totalCount={1} visibleColumns={POOL_COLS} sorting={[]} onSortingChange={vi.fn()} />
    </MemoryRouter>,
  )
  // Data cells follow visibleColumns order; anchor on the Origin cell (the
  // select/action lanes either side carry no text).
  const tds = [...document.querySelectorAll('tbody td')]
  const start = tds.findIndex((td) => td.textContent.trim() === row.origin)
  const cellOf = (key) => tds[start + POOL_COLS.indexOf(key)]
  return { cellOf, at: (key) => cellOf(key).textContent.trim() }
}

describe('Total Volume + utilization columns (V2, Ramesh #4/#5)', () => {
  test('volume formats as cuft; utilization divides by the equipment capacity', () => {
    // TLH = 45,000 LB / 3,800 cuft (equipmentCapacity.js placeholders)
    const { at } = renderPoolRow({ totalVolume: 12345 })
    expect(at('totalVolume')).toBe('12,345 cuft')
    expect(at('weightUtilization')).toBe('50%')
    expect(at('volumeUtilization')).toBe('325%')
  })

  test('blanks read -- (no volume, no weight)', () => {
    const { at } = renderPoolRow({ totalVolume: null, grossWeight: '' })
    expect(at('totalVolume')).toBe('--')
    expect(at('weightUtilization')).toBe('--')
    expect(at('volumeUtilization')).toBe('--')
  })

  test('an edited "12,345 LB" weight parses; a KG one converts to LB', () => {
    expect(weightLb('32502')).toBe(32502)
    expect(weightLb('22,500 LB')).toBe(22500)
    expect(weightLb('10,206 KG')).toBeCloseTo(22500.4, 0)
    expect(weightLb('--')).toBeNull()
    expect(weightLb(undefined)).toBeNull()
    const { at } = renderPoolRow({ grossWeight: '10,206 KG' })
    expect(at('weightUtilization')).toBe('50%')
  })

  test('the utilization cell says its capacities are placeholders', async () => {
    const { cellOf } = renderPoolRow({})
    fireEvent.mouseEnter(cellOf('weightUtilization').querySelector('[data-tooltip-trigger]'))
    expect(await screen.findByText('Based on placeholder equipment capacities')).toBeTruthy()
    expect(screen.getByText('22,500 of 45,000 LB (TLH)')).toBeTruthy()
  })

  test('the mode asks the list for the extras; other tabs do not', async () => {
    renderRoute({ panel: 'monitoring', tab: 'all' })
    await screen.findByRole('heading', { name: 'Shipments' })
    await waitFor(() => expect(lastListCall()).toBeTruthy())
    expect(lastListCall().extras).toBeUndefined()
    await enterMode()
    await waitFor(() => expect(lastListCall()).toMatchObject({ extras: 'consolidation' }))
  })

  // The mode half isn't reachable from the UI: the picker's trigger lives in the
  // action column, which consolidate mode swaps for the checkbox lane. The route
  // still hands the mode the full catalog (allColumns) for when it is.
  test('outside the mode the column picker does not offer them', async () => {
    renderRoute({ panel: 'monitoring', tab: 'all' })
    await screen.findByRole('heading', { name: 'Shipments' })
    fireEvent.click(screen.getAllByRole('button', { name: 'Column arrangement' })[0])
    fireEvent.click(await screen.findByRole('button', { name: 'All Columns' }))
    await screen.findByText('Available columns')
    expect(document.querySelector('input[value="grossWeight"]')).toBeTruthy()
    for (const key of ['totalVolume', 'weightUtilization', 'volumeUtilization']) {
      expect(document.querySelector(`input[value="${key}"]`), key).toBeNull()
    }
  })
})

describe('location-ID tooltips on Origin / Destination (V3, Ramesh #6)', () => {
  test('hovering shows the id under its subtitle', async () => {
    const { cellOf } = renderPoolRow({ originLocationId: 'DP-TX-274', destinationLocationId: 'LCP-LA-101' })
    fireEvent.mouseEnter(cellOf('origin').querySelector('[data-tooltip-trigger]'))
    expect(await screen.findByText('Origin Location ID')).toBeTruthy()
    expect(screen.getByText('DP-TX-274')).toBeTruthy()
    fireEvent.mouseEnter(cellOf('destination').querySelector('[data-tooltip-trigger]'))
    expect(await screen.findByText('Destination Location ID')).toBeTruthy()
    expect(screen.getByText('LCP-LA-101')).toBeTruthy()
  })

  test('without an id the cell is plain text', () => {
    const { cellOf } = renderPoolRow({})
    expect(cellOf('origin').textContent.trim()).toBe('Dallas TX US 75201')
    expect(cellOf('origin').querySelector('[data-tooltip-trigger]')).toBeNull()
    expect(cellOf('destination').querySelector('[data-tooltip-trigger]')).toBeNull()
  })
})
