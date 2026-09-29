// @vitest-environment jsdom
// Live mode: a selected shipment that is NOT on the current list page (e.g.
// back from Edit Shipment Stops) must take its bar row from the LIVE detail,
// never from the mock shipments.json — sell ids coincide by seed, the O/C
// counter doesn't (sell 25430468: json C50001578, Neon C50001579).
import { test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ShipmentsRoute from './ShipmentsRoute.jsx'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'
import { getAllShipments } from '../../data'

const SELL = '25430468'
const detail = { current: null }

vi.mock('../../api/queries/useShipmentErrorList', () => ({
  useShipmentErrorList: () => ({ data: { rows: [], totalCount: 0 }, isLoading: false, isPlaceholderData: false, isError: false, error: null, refetch: () => {} }),
}))
vi.mock('../../api/queries/useShipmentDetail', async (orig) => ({
  ...(await orig()),
  useShipmentDetail: () => detail.current,
}))

afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })

function renderRoute() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }))
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/shipments', state: { selectedShipmentId: SELL } }]}>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>
          <Routes><Route path="/shipments/*" element={<ShipmentsRoute />} /></Routes>
        </CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const detailState = (data, stale = false) => ({ data, isLoading: false, isError: false, error: null, isPlaceholderData: stale, refetch: () => {} })

test('live + off-page selection + detail loaded → bar id comes from the detail, not the mock json', async () => {
  const mockId = getAllShipments().find((s) => s.sellShipment === SELL).odysseyShipmentIdentifier
  expect(mockId).toBe('C50001578') // the seed-coincident mock row this test guards against
  vi.stubEnv('VITE_API_MODE', 'live')
  detail.current = detailState({ odysseyShipmentIdentifier: 'C50001579', customerName: 'Acme' })
  renderRoute()
  expect(await screen.findByText('C50001579')).toBeTruthy()
  expect(screen.queryByText(mockId)).toBeNull()
})

test('live + detail still the PREVIOUS shipment (placeholder) → not used, and no mock fallback', async () => {
  vi.stubEnv('VITE_API_MODE', 'live')
  detail.current = detailState({ odysseyShipmentIdentifier: 'C99999999' }, true)
  renderRoute()
  expect(await screen.findByText(SELL)).toBeTruthy()
  expect(screen.queryByText('C99999999')).toBeNull()
  expect(screen.queryByText('C50001578')).toBeNull()
})
