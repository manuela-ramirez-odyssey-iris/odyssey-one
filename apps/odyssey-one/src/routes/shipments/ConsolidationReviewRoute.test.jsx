// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ConsolidationReviewRoute from './ConsolidationReviewRoute.jsx'
import { getSellShipmentDetail, saveTenderOption } from '../../api/services/shipmentService'
import { applyConsolidation } from '../../api/services/consolidationService'
import { CustomersProvider } from '../../contexts/CustomersContext.jsx'
import { EditModeProvider } from '../../contexts/EditModeContext.jsx'
import { CreateOrderModeProvider } from '../../contexts/CreateOrderModeContext.jsx'

// S161 — Planned Stops reorder now runs through @dnd-kit (same pattern as
// Home's metrics-library panel list). jsdom can't do a real pointer/keyboard
// drag (dnd-kit's collision detection needs real layout rects, which jsdom
// always reports as zero — see project_jsdom_test_ceilings), so DndContext is
// wrapped to capture its onDragEnd and tests invoke it directly, exactly the
// event shape a real drag would produce ({ active: { id }, over: { id } }).
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    DndContext: (props) => {
      window.__consolidationDragEnd = props.onDragEnd
      return <actual.DndContext {...props} />
    },
  }
})

vi.mock('../../api/services/consolidationService', () => ({
  applyConsolidation: vi.fn(async ({ sellShipments }) => ({
    row: { id: '27000001', sellShipment: '27000001', buyShipment: '910000001', odysseyShipmentIdentifier: 'C70000001', orders: sellShipments, customerId: 'VALTRIS_01' },
    detail: {},
  })),
}))

vi.mock('../../api/services/shipmentService', () => ({
  getSellShipmentDetail: vi.fn(async (id) => ({
    stopsData: { summary: { volume: id === 'a' ? '1,000 cuft' : '375 cuft' } },
    orderDetails: [{ hazmat: id === 'b' ? 'Yes' : 'No' }],
    routingData: { options: [] },
  })),
  saveTenderOption: vi.fn(async () => {}),
}))

afterEach(() => { cleanup(); vi.mocked(applyConsolidation).mockClear(); vi.mocked(saveTenderOption).mockClear() })

// The B3 concurrent-tender simulation is a coin flip on the first Apply
// click — every test that isn't specifically exercising it pins Math.random
// above 0.5 so the suite stays deterministic.
beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.9) })

const rows = [
  { id: 'a', sellShipment: 'a', buyShipment: 'BUY-A', odysseyShipmentIdentifier: 'O00000001', customerId: 'VALTRIS_01', customerName: 'Valtris Specialty Chemicals', origin: 'Sparta, NJ', destination: 'Baltimore, MD', pickupDate: '12/16/2026 08:00 CST', deliveryDate: '12/17/2026 08:00 CST', grossWeight: '15000', equipmentCode: 'TL', shipmentType: 'Direct', tenderStatus: '', shipmentStatus: '', orders: ['ORD-1'], orderCount: '1', pickupNumbers: [], poNumbers: [] },
  { id: 'b', sellShipment: 'b', buyShipment: 'BUY-B', odysseyShipmentIdentifier: 'O00000002', customerId: 'VALTRIS_01', customerName: 'Valtris Specialty Chemicals', origin: 'Sewaren, NJ', destination: 'Fairfax, VA', pickupDate: '12/16/2026 12:00 CST', deliveryDate: '12/18/2026 08:00 CST', grossWeight: '12500', equipmentCode: 'TL', shipmentType: 'Direct', tenderStatus: '', shipmentStatus: '', orders: ['ORD-2'], orderCount: '1', pickupNumbers: [], poNumbers: [] },
]

// A third row, used by the B3 tests so dropping/removing a tendered one
// still leaves two.
const rows3 = [...rows, { ...rows[1], id: 'c', sellShipment: 'c', buyShipment: 'BUY-C', odysseyShipmentIdentifier: 'O00000003', orders: ['ORD-3'] }]

function ShipmentsProbe() {
  const { state } = useLocation()
  return <div data-testid="shipments-probe">{JSON.stringify(state ?? null)}</div>
}

function renderReview(state) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/shipments/consolidate/review', state }]}>
        <CustomersProvider><EditModeProvider><CreateOrderModeProvider>
          <Routes>
            <Route path="/shipments/consolidate/review" element={<ConsolidationReviewRoute />} />
            <Route path="/shipments/*" element={<ShipmentsProbe />} />
          </Routes>
        </CreateOrderModeProvider></EditModeProvider></CustomersProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Apply's click handler runs the B3 simulation check (async) before opening
// the merged modal (Confirm or Error phase) — every click on the page-level
// "Apply Consolidation" button needs a tick to flush. Returns the dialog so
// callers can scope inside it — the modal's OWN "Apply Consolidation" /
// "Cancel" buttons share a name with page-level chrome once it's open.
async function clickApply() {
  fireEvent.click(screen.getByRole('button', { name: 'Apply Consolidation' }))
  return screen.findByRole('dialog')
}

describe('ConsolidationReviewRoute', () => {
  test('renders the proposal from location.state rows', async () => {
    renderReview({ rows })
    expect(screen.getByRole('heading', { name: 'Review & Apply Manual Consolidation' })).toBeTruthy()
    expect(screen.getByText('Valtris Specialty Chemicals')).toBeTruthy()
    expect(screen.getByText('Selected Shipments (2)')).toBeTruthy()
    // The ID shows in the Selected Shipments chips AND the table's first column.
    expect(within(screen.getByRole('table', { name: 'Selected shipments to consolidate' })).getByText('O00000001')).toBeTruthy()
    expect(screen.queryByText('BUY-A')).toBeNull() // Odyssey Shipment ID replaced Buy Shipment (user, 2026-09-27)
    expect(screen.getByText('2 Pickup Stops')).toBeTruthy()
    expect(screen.getByText('2 Delivery Stops')).toBeTruthy()
    expect(screen.getByText('27,500 LB')).toBeTruthy()
    expect(await screen.findByText('1,375 cuft')).toBeTruthy()
    expect(screen.getByText('Yes')).toBeTruthy()
    const table = screen.getByRole('table', { name: 'Selected shipments to consolidate' })
    expect(within(table).getByText('O00000001')).toBeTruthy()
    expect(within(table).getByText('O00000002')).toBeTruthy()
  })

  // B1: no checkboxes anywhere — the rows ARE the consolidation.
  test('no include/exclude checkboxes render on the review screen', () => {
    renderReview({ rows })
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  test('the table has no select column — every column is a data column', () => {
    const { container } = renderReview({ rows })
    expect(container.querySelector('.odyssey-table__cell--sticky-left')).toBeNull()
  })

  test('Edit Consolidation returns to Shipments in mode with EVERY row (no exclusion)', async () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Edit Consolidation' }))
    const state = JSON.parse((await screen.findByTestId('shipments-probe')).textContent)
    expect(state.consolidate.rows.map((r) => r.id)).toEqual(['a', 'b'])
  })

  test('Cancel Consolidation asks "Yes, Cancel", then leaves with nothing retained', async () => {
    renderReview({ rows })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Consolidation' }))
    expect(screen.getByText(/Are you sure you want to cancel the proposed consolidation\?/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.queryByText(/Are you sure you want to cancel/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Consolidation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Cancel' }))
    const state = JSON.parse((await screen.findByTestId('shipments-probe')).textContent)
    expect(state).toEqual({ consolidateExit: true })
  })

  // The Apply confirmation now lives INSIDE the merged modal's Confirm phase
  // (user ruling item 3) — no more standalone "Yes, Apply" dialog.
  test('Apply opens the merged modal in Confirm state with the shipments table, then applies every sell shipment', async () => {
    renderReview({ rows })
    const dialog = await clickApply()
    expect(dialog.getAttribute('aria-label')).toBe('Apply Consolidation') // title
    expect(within(dialog).getByText('Are you sure you want to apply the proposed consolidation?')).toBeTruthy()
    expect(within(dialog).getByText('O00000001')).toBeTruthy()
    expect(within(dialog).getByText('O00000002')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Consolidation' }))
    await screen.findByText(/Consolidation Successfully Applied!/)
    expect(vi.mocked(applyConsolidation).mock.calls[0][0].sellShipments).toEqual(['a', 'b'])
    // B2: the default (untouched) stop order rides along even when unedited.
    expect(vi.mocked(applyConsolidation).mock.calls[0][0].stopOrder).toEqual(['pickup-a', 'pickup-b', 'delivery-a', 'delivery-b'])
  })

  test('Cancel closes the apply modal without applying', async () => {
    renderReview({ rows })
    const dialog = await clickApply()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Are you sure you want to apply the proposed consolidation?')).toBeNull()
    expect(vi.mocked(applyConsolidation)).not.toHaveBeenCalled()
  })

  async function applyAndWait() {
    const rendered = renderReview({ rows })
    const dialog = await clickApply()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Consolidation' }))
    await screen.findByText(/Consolidation Successfully Applied!/)
    return rendered
  }

  // B4 — applied state
  test('after Apply: success alert, renamed header and breadcrumb', async () => {
    await applyAndWait()
    expect(screen.getByText(/Consolidation ID: C70000001\. 2 Shipments successfully consolidated\./)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Review C70000001' })).toBeTruthy()
    expect(screen.getAllByText('Review C70000001').length).toBeGreaterThan(1) // header + breadcrumb
  })

  test('after Apply: the summary band shows Customer Name / Odyssey Shipment ID / Orders, not Selected Shipments', async () => {
    const { container } = await applyAndWait()
    const strip = container.querySelector('.consolidation-review__info-strip')
    expect(within(strip).getByText('Customer Name')).toBeTruthy()
    expect(within(strip).getByText('Odyssey Shipment ID')).toBeTruthy()
    expect(within(strip).getByText('Orders')).toBeTruthy()
    expect(within(strip).queryByText(/Selected Shipments/)).toBeNull()
  })

  test('after Apply: the table shows the ONE new consolidated row, not the sources', async () => {
    await applyAndWait()
    const table = screen.getByRole('table', { name: 'Selected shipments to consolidate' })
    expect(within(table).getByText('C70000001')).toBeTruthy()
    expect(within(table).queryByText('BUY-A')).toBeNull()
    expect(within(table).queryByText('BUY-B')).toBeNull()
    expect(screen.getByText('1 items')).toBeTruthy()
  })

  test('after Apply: the success alert is dismissable', async () => {
    await applyAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText(/Consolidation Successfully Applied!/)).toBeNull()
  })

  test('after Apply: View Shipment hands the created row to the grid', async () => {
    await applyAndWait()
    fireEvent.click(screen.getByRole('button', { name: /View Shipment/ }))
    const state = JSON.parse((await screen.findByTestId('shipments-probe')).textContent)
    expect(state.createdShipment.id).toBe('27000001')
    expect(state.createdShipment.odysseyShipmentIdentifier).toBe('C70000001')
  })

  test('after Apply: Edit Consolidated Shipment re-enters mode with the NEW row', async () => {
    await applyAndWait()
    expect(screen.queryByRole('button', { name: 'Edit Consolidation' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Consolidated Shipment' }))
    const state = JSON.parse((await screen.findByTestId('shipments-probe')).textContent)
    expect(state.consolidate.rows.map((r) => r.id)).toEqual(['27000001'])
  })

  test('after Apply: Back to Shipments is the same exit as View Shipment — lands with the created row', async () => {
    await applyAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Shipments' }))
    expect(screen.queryByText(/Are you sure/)).toBeNull()
    const state = JSON.parse((await screen.findByTestId('shipments-probe')).textContent)
    expect(state.createdShipment.id).toBe('27000001')
  })

  test('a failed Apply shows the error and leaves the page editable', async () => {
    vi.mocked(applyConsolidation).mockRejectedValueOnce(new Error('Unknown shipment(s): a'))
    renderReview({ rows })
    const dialog = await clickApply()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Consolidation' }))
    expect(await screen.findByText('Unknown shipment(s): a')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Review & Apply Manual Consolidation' })).toBeTruthy()
  })

  test('a failed detail fetch shows the alert but still renders the weight total', async () => {
    vi.mocked(getSellShipmentDetail).mockImplementationOnce(() => Promise.reject(new Error('boom')))
    renderReview({ rows })
    expect(await screen.findByText("Couldn't load volume and hazmat for every selected shipment. The totals below are incomplete.")).toBeTruthy()
    expect(screen.getByText('27,500 LB')).toBeTruthy()
  })

  test('no rows in state → empty state with a way back', async () => {
    renderReview(undefined)
    expect(screen.getByText('No consolidation to review.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Shipments' }))
    expect(await screen.findByTestId('shipments-probe')).toBeTruthy()
  })

  test('the rail is hidden — the review continues consolidate mode, and the VD has no sidebar', () => {
    const { container } = renderReview({ rows })
    expect(container.querySelector('.sidebar--hidden')).toBeTruthy()
    expect(container.querySelector('.sidebar:not(.sidebar--hidden)')).toBeNull()
  })

  // B2 — sortable Planned Stops (S161: dnd-kit, same pattern as Home's
  // metrics-library panel list).
  test('Reset renders disabled until the stop order changes, and each stop carries a grip', () => {
    const { container } = renderReview({ rows })
    expect(screen.getByRole('button', { name: 'Reset' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Apply Consolidation' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save Stop Changes' })).toBeNull()
    expect(container.querySelectorAll('.consolidation-review__stop-grip').length).toBe(4) // 2 pickups + 2 deliveries
  })

  test('Planned Stops are read-only after Apply — no grips, no Reset, no helper text', async () => {
    const { container } = await applyAndWait()
    expect(container.querySelectorAll('.consolidation-review__stop-grip').length).toBe(0)
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
    expect(screen.queryByText('Drag stops to reorganize')).toBeNull()
  })

  test('helper text "Drag stops to reorganize" shows only while editable', () => {
    renderReview({ rows })
    expect(screen.getByText('Drag stops to reorganize')).toBeTruthy()
  })

  // Simulates a completed dnd-kit drag by invoking the DndContext's onDragEnd
  // directly (captured by the mock above) with the event shape a real
  // pointer/keyboard drag produces — jsdom can't do the real thing (see the
  // mock's comment).
  function simulateDragEnd(activeId, overId) {
    act(() => { window.__consolidationDragEnd({ active: { id: activeId }, over: { id: overId } }) })
  }

  test('a drag reorder relabels stops live and shows Save Stop Changes on the footer', () => {
    renderReview({ rows })
    expect(screen.getByRole('button', { name: 'Apply Consolidation' })).toBeTruthy()
    simulateDragEnd('pickup-a', 'pickup-b') // swap the two pickups
    expect(screen.queryByRole('button', { name: 'Apply Consolidation' })).toBeNull()
    const saveBtn = screen.getByRole('button', { name: 'Save Stop Changes' })
    expect(saveBtn.disabled).toBe(false) // never disabled for unsaved stops (user ruling 2026-09-27, item 2)
    expect(screen.getByRole('button', { name: 'Reset' }).disabled).toBe(false)
  })

  test('Save Stop Changes saves without a dialog and flips the footer back to Apply Consolidation; Apply then opens the modal with the saved order', async () => {
    renderReview({ rows })
    simulateDragEnd('pickup-a', 'pickup-b')
    fireEvent.click(screen.getByRole('button', { name: 'Save Stop Changes' }))
    expect(screen.queryByRole('dialog')).toBeNull() // no modal on a successful save
    expect(screen.queryByRole('button', { name: 'Save Stop Changes' })).toBeNull()
    const applyBtn = screen.getByRole('button', { name: 'Apply Consolidation' })
    expect(applyBtn.disabled).toBe(false)
    fireEvent.click(applyBtn)
    const dialog = await screen.findByRole('dialog', { name: 'Apply Consolidation' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Consolidation' }))
    await screen.findByText(/Consolidation Successfully Applied!/)
    expect(vi.mocked(applyConsolidation).mock.calls[0][0].stopOrder).toEqual(['pickup-b', 'pickup-a', 'delivery-a', 'delivery-b'])
  })

  // User, 2026-09-25: a delivery above its OWN pickup is invalid — Save marks
  // that pair red and asks to Amend or Reset; nothing is saved.
  test('Save with a delivery above its own pickup: pair turns red, dialog offers Amend / Reset', () => {
    const { container } = renderReview({ rows })
    simulateDragEnd('delivery-a', 'pickup-a') // delivery-a above pickup-a
    fireEvent.click(screen.getByRole('button', { name: 'Save Stop Changes' }))
    const dialog = screen.getByRole('dialog', { name: 'Invalid Stop Sequence' })
    expect(container.querySelectorAll('.stop-badge--issue').length).toBe(2)
    expect(container.querySelectorAll('.consolidation-review__stop-location--invalid').length).toBe(2)
    expect(container.querySelectorAll('.stop-badge--changed').length).toBe(0) // the valid ones fall back to original colours
    fireEvent.click(within(dialog).getByRole('button', { name: 'Amend' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Save Stop Changes' })).toBeTruthy() // still unsaved
  })

  test('the invalid dialog\'s Reset restores the original sequence and clears the red', () => {
    const { container } = renderReview({ rows })
    simulateDragEnd('delivery-a', 'pickup-a')
    fireEvent.click(screen.getByRole('button', { name: 'Save Stop Changes' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset' }))
    expect(container.querySelectorAll('.stop-badge--issue').length).toBe(0)
    expect(screen.getByRole('button', { name: 'Apply Consolidation' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset' }).disabled).toBe(true)
  })

  // Labels follow the pair (user, 2026-09-27): P1/D1 = shipment 1, and they
  // travel with the stop. Each stop also names its shipment.
  test('labels stay with their shipment when stops move; every stop shows its Shipment', () => {
    const { container } = renderReview({ rows })
    expect(screen.getAllByText(/^Shipment: /).length).toBe(4)
    const labels = () => Array.from(container.querySelectorAll('.consolidation-review__stop'))
      .map((el) => el.closest('.odyssey-timeline__row').querySelector('.odyssey-timeline__rail').textContent.trim())
    simulateDragEnd('pickup-a', 'pickup-b') // swap the pickups
    expect(labels()).toEqual(['P', 'P', 'D1', 'D2']) // moved stops lose their number until saved
    fireEvent.click(screen.getByRole('button', { name: 'Save Stop Changes' }))
    expect(labels()).toEqual(['P2', 'P1', 'D1', 'D2']) // P1 still = shipment a's pickup, now second
  })

  test('hovering a stop lights up both stops of its shipment', () => {
    const { container } = renderReview({ rows })
    const [firstPickup] = container.querySelectorAll('.consolidation-review__stop')
    fireEvent.mouseEnter(firstPickup)
    expect(container.querySelectorAll('.consolidation-review__stop--paired').length).toBe(2)
    fireEvent.mouseLeave(firstPickup)
    expect(container.querySelectorAll('.consolidation-review__stop--paired').length).toBe(0)
  })

  // Purple = moved since the last save; a successful Save returns every stop
  // to its original colours (user, 2026-09-25).
  test('moved stops are purple until Saved, then original colours; Reset stays enabled after a save', () => {
    const { container } = renderReview({ rows })
    simulateDragEnd('pickup-a', 'pickup-b')
    expect(container.querySelectorAll('.stop-badge--changed').length).toBe(2)
    expect(container.querySelectorAll('.consolidation-review__stop-location--changed').length).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: 'Save Stop Changes' }))
    expect(container.querySelectorAll('.stop-badge--changed').length).toBe(0)
    expect(screen.getByRole('button', { name: 'Reset' }).disabled).toBe(false) // saved ≠ original
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('button', { name: 'Reset' }).disabled).toBe(true)
  })

  // B3 — tendered check at Apply (Math.random pinned above 0.5 in beforeEach,
  // so the concurrent-tender coin flip never fires here — only the SEEDED
  // tendered row trips the check).
  describe('tendered shipment detected', () => {
    function rowsWithTender(remaining) {
      const base = remaining >= 2 ? rows3 : rows
      return base.map((r) => (r.id === 'a' ? { ...r, tenderStatus: 'Sent' } : r))
    }

    test('remaining >= 2: offers Remove / Cancel, singular error for one tendered row', async () => {
      renderReview({ rows: rowsWithTender(2) })
      await clickApply()
      expect(screen.getByText('Tendered Shipment Detected')).toBeTruthy()
      expect(screen.getByText('1 Error(s): Shipment O00000001 has been tendered and cannot be consolidated.')).toBeTruthy()
      expect(screen.getByText('Remove tendered shipment(s) and proceed with the remaining 2.')).toBeTruthy()
      expect(screen.getByText('Cancel tender on the accepted shipments and continue consolidation.')).toBeTruthy()
    })

    test('remaining < 2: offers Discard / Cancel instead', async () => {
      renderReview({ rows: rowsWithTender(1) })
      await clickApply()
      expect(screen.getByText('Discard and select different shipments. Consolidation requires at least 2 shipments.')).toBeTruthy()
      expect(screen.getByText('Cancel tender on the accepted shipment and continue consolidation.')).toBeTruthy()
    })

    test('Nevermind closes the modal and changes nothing', async () => {
      renderReview({ rows: rowsWithTender(2) })
      await clickApply()
      fireEvent.click(screen.getByRole('button', { name: 'Nevermind' }))
      expect(screen.queryByText('Tendered Shipment Detected')).toBeNull()
      expect(vi.mocked(applyConsolidation)).not.toHaveBeenCalled()
    })

    test('Remove (default) drops the tendered row, shows a green success alert, then applies the remaining rows', async () => {
      renderReview({ rows: rowsWithTender(2) })
      const dialog = await clickApply()
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Solution' }))
      expect(await within(dialog).findByText('Tendered shipment O00000001 removed from the consolidation.')).toBeTruthy()
      expect(within(dialog).queryByText('Tendered')).toBeNull() // badge gone with the row
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Consolidation' }))
      await screen.findByText(/Consolidation Successfully Applied!/)
      expect(vi.mocked(applyConsolidation).mock.calls[0][0].sellShipments).toEqual(['b', 'c'])
    })

    test('Discard (remaining < 2) leaves the review with the tendered row unselected', async () => {
      renderReview({ rows: rowsWithTender(1) })
      await clickApply()
      fireEvent.click(screen.getByRole('button', { name: 'Apply Solution' }))
      const state = JSON.parse((await screen.findByTestId('shipments-probe')).textContent)
      expect(state.consolidate.rows.map((r) => r.id)).toEqual(['b'])
    })

    test('Cancel tendered shipment(s) reuses the Tender-tab save path, shows a green alert, then applies ALL rows', async () => {
      vi.mocked(getSellShipmentDetail).mockImplementation(async (id) => ({
        stopsData: { summary: { volume: '1,000 cuft' } },
        orderDetails: [{ hazmat: 'No' }],
        routingData: { options: id === 'a' ? [{ rank: 1, status: 'Sent', api: 'EDI', scac: 'ABCD', carrierName: 'ABC Co' }] : [] },
      }))
      renderReview({ rows: rowsWithTender(2) })
      const dialog = await clickApply()
      fireEvent.click(within(dialog).getByText('Cancel tender on the accepted shipments and continue consolidation.'))
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Solution' }))
      expect(await within(dialog).findByText('Tender cancelled on shipment O00000001.')).toBeTruthy()
      expect(within(dialog).queryByText('Tendered')).toBeNull() // badge cleared, row still present
      expect(vi.mocked(saveTenderOption)).toHaveBeenCalledWith('a', expect.objectContaining({ rank: 1, status: 'Cancelled' }))
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Consolidation' }))
      await screen.findByText(/Consolidation Successfully Applied!/)
      // ALL rows (including the cancelled-tender one) went into the apply — Cancel doesn't drop anyone.
      expect(vi.mocked(applyConsolidation).mock.calls[0][0].sellShipments).toEqual(['a', 'b', 'c'])
    })
  })

  // The concurrent-tender simulation itself (ponytail comment in the route).
  test('the concurrent-tender simulation fires on a 50/50 hit and opens the tendered check', async () => {
    Math.random.mockReturnValue(0.1) // < 0.5 → simulate
    vi.mocked(getSellShipmentDetail).mockImplementation(async () => ({
      stopsData: { summary: { volume: '1,000 cuft' } },
      orderDetails: [{ hazmat: 'No' }],
      routingData: { options: [{ rank: 1, status: 'Sent', api: 'EDI', scac: 'ABCD', carrierName: 'ABC Co' }] },
    }))
    renderReview({ rows })
    // Wait for the detail queries to resolve — the simulation reads the
    // FIRST-ranked routing option off them, and clicking before they land
    // would find nothing to tender (same data the totals below prove loaded).
    await screen.findByText('2,000 cuft')
    await clickApply()
    expect(screen.getByText('Tendered Shipment Detected')).toBeTruthy()
    expect(vi.mocked(saveTenderOption)).toHaveBeenCalledWith(expect.stringMatching(/^[ab]$/), expect.objectContaining({ status: 'Accepted' }))
  })

  // Re-verify at final Apply (user ruling item 3, "Simulation") — the >5s
  // re-roll only re-arms once the modal has SAT in Confirm past
  // CONFIRM_REROLL_MS; under it, Apply Consolidation never re-checks.
  describe('re-verify on the final Apply Consolidation click', () => {
    const tenderableDetail = async () => ({
      stopsData: { summary: { volume: '1,000 cuft' } },
      orderDetails: [{ hazmat: 'No' }],
      routingData: { options: [{ rank: 1, status: 'Sent', api: 'EDI', scac: 'ABCD', carrierName: 'ABC Co' }] },
    })

    test('under 5s in Confirm state, Apply Consolidation never re-rolls even when the coin would hit', async () => {
      vi.mocked(getSellShipmentDetail).mockImplementation(tenderableDetail)
      const now = vi.spyOn(Date, 'now')
      now.mockReturnValue(1000)
      renderReview({ rows })
      await screen.findByText('2,000 cuft')
      const dialog = await clickApply() // first-open roll misses (Math.random 0.9) → Confirm, confirmEnteredAt = 1000
      now.mockReturnValue(1000 + 2000) // 2s later — under the 5s threshold
      Math.random.mockReturnValue(0.1) // would hit if a re-roll were attempted
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Consolidation' }))
      await screen.findByText(/Consolidation Successfully Applied!/)
      expect(screen.queryByText('Tendered Shipment Detected')).toBeNull()
      expect(vi.mocked(saveTenderOption)).not.toHaveBeenCalled()
      now.mockRestore()
    })

    test('over 5s in Confirm state, Apply Consolidation re-rolls; a hit tenders a row and reopens the Error state', async () => {
      vi.mocked(getSellShipmentDetail).mockImplementation(tenderableDetail)
      const now = vi.spyOn(Date, 'now')
      now.mockReturnValue(1000)
      renderReview({ rows })
      await screen.findByText('2,000 cuft')
      const dialog = await clickApply() // Confirm, confirmEnteredAt = 1000
      now.mockReturnValue(1000 + 5001) // >5s later
      Math.random.mockReturnValue(0.1) // hits the re-roll, then picks the first candidate
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Consolidation' }))
      await screen.findByText('Tendered Shipment Detected')
      expect(vi.mocked(saveTenderOption)).toHaveBeenCalledWith(expect.stringMatching(/^[ab]$/), expect.objectContaining({ status: 'Accepted' }))
      expect(vi.mocked(applyConsolidation)).not.toHaveBeenCalled()
      now.mockRestore()
    })
  })
})
