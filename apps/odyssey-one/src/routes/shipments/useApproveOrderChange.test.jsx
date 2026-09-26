// @vitest-environment jsdom
// T3 (S160) — the shared Scenario A/B branch (LINX-15671), extracted from
// OrderChangeEditStopsRoute.handleApprove so StopsTab's Approve Plan uses the
// exact same logic instead of a second hand-rolled copy. Mocks the SERVICE
// layer (same convention as OrderChangeEditStopsRoute.test.jsx), not the
// query hook, and exercises the hook through a tiny harness component (a
// hook that calls useNavigate/useLocation needs a Router; renderHook's
// wrapper gives it one, a plain harness makes the resulting navigation
// state visible to assertions).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useApproveOrderChange, isActiveTender, ACTIVE_TENDER_STATUSES } from './useApproveOrderChange.js'

vi.mock('../../api/services/shipmentService', () => ({ resolveOrderChange: vi.fn() }))
import { resolveOrderChange } from '../../api/services/shipmentService'

afterEach(() => {
  cleanup()
  resolveOrderChange.mockReset()
})

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="nav-probe">{location.pathname} {JSON.stringify(location.state)}</div>
}

function Harness({ sellShipment = 'S1', buyShipment = 'B1', odysseyShipmentIdentifier = 'ODY-1', tenderStatus }) {
  const { afterApprove, approvePlan, resolve } = useApproveOrderChange({ sellShipment, buyShipment, odysseyShipmentIdentifier })
  return (
    <div>
      <button onClick={() => afterApprove(tenderStatus)}>afterApprove</button>
      <button onClick={() => approvePlan(tenderStatus)}>approvePlan</button>
      <span data-testid="pending">{String(resolve.isPending)}</span>
    </div>
  )
}

function renderHarness(props) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/shipments']}>
        <LocationProbe />
        <Routes>
          <Route path="/shipments" element={<Harness {...props} />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('isActiveTender', () => {
  it('is true for every ACTIVE_TENDER_STATUSES value, false otherwise', () => {
    ACTIVE_TENDER_STATUSES.forEach((s) => expect(isActiveTender(s)).toBe(true))
    expect(isActiveTender('Declined')).toBe(false)
    expect(isActiveTender('Cancelled')).toBe(false)
    expect(isActiveTender(null)).toBe(false)
  })
})

describe('useApproveOrderChange — afterApprove (a mutate the caller already ran, e.g. save-stops)', () => {
  it('Scenario A (active tender): opens the Direct review, replacing this layer', () => {
    renderHarness({ tenderStatus: 'Sent' })
    fireEvent.click(screen.getByRole('button', { name: 'afterApprove' }))
    const probe = screen.getByTestId('nav-probe')
    expect(probe.textContent).toContain('/shipments/order-change/S1')
    expect(probe.textContent).toContain('"buyShipment":"B1"')
    expect(probe.textContent).toContain('"odysseyShipmentIdentifier":"ODY-1"')
  })

  it('Scenario B (no active tender): closes to the Tender tab on /shipments', () => {
    renderHarness({ tenderStatus: null })
    fireEvent.click(screen.getByRole('button', { name: 'afterApprove' }))
    const probe = screen.getByTestId('nav-probe')
    expect(probe.textContent).toContain('/shipments ')
    expect(probe.textContent).toContain('"selectedShipmentId":"S1"')
    expect(probe.textContent).toContain('"key":"routing"')
    expect(probe.textContent).toContain('"tab":"order-change"')
  })

  it('never calls the server itself — the caller already did', () => {
    renderHarness({ tenderStatus: 'Accepted' })
    fireEvent.click(screen.getByRole('button', { name: 'afterApprove' }))
    expect(resolveOrderChange).not.toHaveBeenCalled()
  })
})

describe('useApproveOrderChange — approvePlan (T3, StopsTab)', () => {
  it('Scenario A (active tender): opens the Direct review with NO server call', () => {
    renderHarness({ tenderStatus: 'To Be Tendered' })
    fireEvent.click(screen.getByRole('button', { name: 'approvePlan' }))
    const probe = screen.getByTestId('nav-probe')
    expect(probe.textContent).toContain('/shipments/order-change/S1')
    expect(resolveOrderChange).not.toHaveBeenCalled()
  })

  it("Scenario B (no active tender): calls resolveOrderChange('approve-plan') then closes to the Tender tab", async () => {
    resolveOrderChange.mockResolvedValue(undefined)
    renderHarness({ tenderStatus: 'Declined' })
    fireEvent.click(screen.getByRole('button', { name: 'approvePlan' }))
    await waitFor(() => expect(resolveOrderChange).toHaveBeenCalledWith(
      'S1',
      expect.objectContaining({ action: 'approve-plan', priorTenderStatus: 'Declined', cost: null, priorScac: null }),
    ))
    const probe = await screen.findByTestId('nav-probe')
    expect(probe.textContent).toContain('/shipments ')
    expect(probe.textContent).toContain('"key":"routing"')
  })

  it('a rejected mutate calls onError instead of navigating', async () => {
    resolveOrderChange.mockRejectedValue(new Error('boom'))
    const onError = vi.fn()
    function ErrHarness() {
      const { approvePlan } = useApproveOrderChange({ sellShipment: 'S1', buyShipment: 'B1', odysseyShipmentIdentifier: 'ODY-1' })
      return <button onClick={() => approvePlan(null, { onError })}>go</button>
    }
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/shipments']}>
          <LocationProbe />
          <Routes><Route path="/shipments" element={<ErrHarness />} /><Route path="*" element={null} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'go' }))
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(screen.getByTestId('nav-probe').textContent).toContain('/shipments ')
  })
})
