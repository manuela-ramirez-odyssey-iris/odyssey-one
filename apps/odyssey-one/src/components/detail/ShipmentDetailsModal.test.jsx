// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ShipmentDetailsModal from './ShipmentDetailsModal'
import * as shipmentService from '../../api/services/shipmentService'

afterEach(cleanup)

const shipment = {
  buyShipment: '85611354', sellShipment: '25068206', pro: '67819A88',
  customerName: 'USALCO', shipmentStatus: 'Accepted',
  mode: 'LTL', equipmentCode: 'LTL', orders: ['VAN2TBVV8', 'OUF4PEUH2'],
}
const details = {
  ratingStatus: 'Successful',
  trackingUrl: 'https://tracking.oneodyssey.com/t/67819A88',
  orderDetails: [
    { orderNumber: 'L14372086', hazmat: 'Yes', paymentTerms: 'Collect', proBooking: '67819A88', poNumber: 'PO-5512', salesOrder: '--' },
    { orderNumber: 'L14372084', hazmat: 'No', salesOrder: '--', poNumber: '--' },
  ],
  stopsData: {
    stops: [
      { type: 'pickup', stopNumber: 1, order: 'L14372086, L14372084', orderIds: ['L14372086', 'L14372084'], address: '244 E Jackson Street, Baytown, TX', date: '06/02/2026 08:00 CST' },
      { type: 'delivery', stopNumber: 2, order: 'L14372084', orderIds: ['L14372084'], address: '129 Broadway Avenue, Miami, FL', date: '06/04/2026 14:00 CST' },
    ],
    summary: { grossWeight: '44,470 LB', volume: '200 cuft', acceptedCarrier: 'CTNS', seedEquipment: 'LTL' },
  },
  routingData: { options: [
    { rank: 1, status: null, pickupDateTime: '06/01/2026 07:00 CST', deliveryDateTime: '06/03/2026 12:00 CST' },
    {
      rank: 2, status: 'Accepted', pickupDateTime: '06/02/2026 08:00 CST', deliveryDateTime: '06/04/2026 14:00 CST',
      // scac/carrierName only needed so QuoteModal's Save Quote button isn't
      // disabled (it requires both scac and baseRate) in the save-round-trip test.
      scac: 'CTNS', carrierName: 'Contract Freighters Inc',
      // equipment is the QUOTE's equipment (RoutingOptionVM.equipment) — same
      // value as shipment.equipmentCode/summary.seedEquipment here on purpose,
      // so the existing combobox-interaction tests don't need new values; a
      // dedicated test below uses a DIFFERENT value to prove sourcing.
      equipment: 'LTL',
      // rateDetails backs Markup (QuoteModal's own field) — deliberately
      // distinct from costData.summary below so a test can prove Markup never
      // reads costSummary.margin.
      rateDetails: { baseRate: 2900, currency: 'USD', markup: 300, additionalCharges: [], apTotal: 3150, arTotal: 3450 },
    },
  ] },
  userDefinedData: { orders: [
    { orderId: 'L14372086', fields: [{ name: 'TEMP_SENSITIVITY', value: 'REEFER 34-38F' }, { name: 'AFTER_HOURS', value: 'Y' }] },
    { orderId: 'L14372084', fields: [] },
  ] },
  costData: { planned: { summary: {
    base: '$2,900.00', fuel: '$250.00', accessorials: '$56.00',
    apTotal: '$3,206.00', arTotal: '$3,456.00', margin: '$250.00 (7.7%)',
    directCost: '$3,906.00',
  } } },
}

describe('ShipmentDetailsModal', () => {
  it('renders the header strip + General Information from the accepted option', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    for (const t of ['General Information', 'Cost']) {
      expect(screen.getByRole('heading', { name: t })).toBeTruthy()
    }
    expect(screen.getByText('85611354')).toBeTruthy()
    expect(screen.getByText('Successful')).toBeTruthy()
    // Source Name is the customer (Jana's wording), Freight Term is paymentTerms
    expect(screen.getByText('USALCO')).toBeTruthy()
    expect(screen.getByText('Collect')).toBeTruthy()
    expect(screen.getByText('CTNS')).toBeTruthy()
    // Dates come from the ACCEPTED option (rank 2), not rank 1. 24h per
    // LINX-8120 / LINX-7629 — displayed exactly as stored.
    expect(screen.getAllByText('06/02/2026 08:00 CST').length).toBeGreaterThan(0)
    expect(screen.queryByText('06/01/2026 07:00 CST')).toBeNull()
    // Tracking Link is backed by `trackingUrl` (R2-1), shown WITHOUT the
    // protocol (display convention, 2026-08-02) — the stored URL keeps it.
    expect(screen.getByText('tracking.oneodyssey.com/t/67819A88')).toBeTruthy()
    expect(screen.queryByText('https://tracking.oneodyssey.com/t/67819A88')).toBeNull()
  })

  it('renders all seven cost rows', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    for (const l of ['Base', 'Fuel (FSC)', 'Accessorials', 'AP Total (Carrier)', 'AR Total (Customer)', 'Margin', 'Direct Cost']) {
      expect(screen.getByText(l)).toBeTruthy()
    }
    expect(screen.getByText('$3,906.00')).toBeTruthy()
  })

  it('lists Customer Reference Values per order, sparsely', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Customer Reference Values' })).toBeTruthy()
    // Also appears as a Stops link, so match on count not uniqueness
    expect(screen.getAllByText('L14372086').length).toBeGreaterThan(0)
    expect(screen.getAllByText('L14372084').length).toBeGreaterThan(0)
    // Only populated references render — '--' values are dropped, not shown as rows
    expect(screen.getByText('PO-5512')).toBeTruthy()
    expect(screen.queryByText('Sales Order Number')).toBeNull()
  })

  it('moves User Defined Fields behind its own tab, dropping the strip', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    // UDF content is not in the Details tab
    expect(screen.queryByText('TEMP_SENSITIVITY')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'User Defined Fields' }))
    expect(screen.getByText('TEMP_SENSITIVITY')).toBeTruthy()
    expect(screen.getByText('REEFER 34-38F')).toBeTruthy()
    // The identifiers strip is Details-only, and so are the Details sections
    expect(screen.queryByText('85611354')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Cost' })).toBeNull()
  })

  it('summarizes stops with an address and a link to the order view', () => {
    const onClose = vi.fn()
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={onClose} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Stops' })).toBeTruthy()
    expect(screen.getByText('Stop 1')).toBeTruthy()
    expect(screen.getByText('244 E Jackson Street, Baytown, TX')).toBeTruthy()
    expect(screen.getByText('129 Broadway Avenue, Miami, FL')).toBeTruthy()

    // A stop serving several orders renders ONE link per order
    expect(screen.getAllByRole('button', { name: 'L14372086' }).length).toBe(1)
    expect(screen.getAllByRole('button', { name: 'L14372084' }).length).toBe(2) // both stops

    // Links go into the Orders domain; the modal closes first so the user
    // isn't left with a dialog over a different route.
    fireEvent.click(screen.getAllByRole('button', { name: 'L14372086' })[0])
    expect(onClose).toHaveBeenCalled()
  })

  it('falls back to rank 1 when no option is accepted', () => {
    const d = { ...details, routingData: { options: [{ rank: 2, pickupDateTime: 'x' }, { rank: 1, pickupDateTime: '06/01/2026 07:00 CST' }] } }
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={d} onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByText('06/01/2026 07:00 CST')).toBeTruthy()
  })

  it('puts Routing Query (QCP) on the tab row, not a footer', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    const qcp = screen.getByRole('button', { name: 'Routing Query (QCP)' })
    // Trails the tabs inside the same row — the modal has no footer at all
    expect(qcp.closest('.shp-details__tabrow')).toBeTruthy()
    expect(document.querySelector('.modal-medium__footer')).toBeNull()
    expect(screen.queryByRole('button', { name: 'View Stops' })).toBeNull()
    // Survives the tab switch (the row is outside the per-tab content)
    fireEvent.click(screen.getByRole('tab', { name: 'User Defined Fields' }))
    expect(screen.getByRole('button', { name: 'Routing Query (QCP)' })).toBeTruthy()
  })

  it('shows the error body when the detail fetch failed', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={null} error onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByText(/Unable to load shipment details/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'General Information' })).toBeNull()
  })
})

const renderModal = (props = {}) => render(
  <MemoryRouter>
    <ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} {...props} />
  </MemoryRouter>,
)

// Section-level editing (2026-08-11) replaces the per-field pen entirely —
// no more Base/Markup/Equipment pens (see git history for the removed
// 'field editing' describe block). Each section header now owns ONE Edit
// control; only one section can be in edit mode at a time.
describe('section edit affordance', () => {
  it('every editable section header carries an Edit button', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Edit General Information' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit Cost' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit Customer Reference Values' })).toBeTruthy()
  })

  it('Stops renders its Edit button disabled', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Edit Stops' }).disabled).toBe(true)
  })

  it('clicking Edit swaps the button to a disabled Save Changes', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    const save = screen.getByRole('button', { name: 'Save Changes' })
    expect(save.disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Edit General Information' })).toBeNull()
  })

  it('editing exposes a cancel X on the section header', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    expect(screen.getByRole('button', { name: 'Cancel editing General Information' })).toBeTruthy()
  })

  it('only one section can be in edit mode — opening a second closes the first', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    expect(screen.getByRole('button', { name: 'Edit General Information' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Save Changes' }).length).toBe(1)
  })

  it('there is no pen icon anywhere', () => {
    const { container } = renderModal()
    expect(container.querySelector('.shp-details__field-action')).toBeNull()
  })
})

// Mode/Equipment render via ComboBox, which (like the rest of the codebase's
// ComboBox call sites — QuoteModal.test.jsx, RoutingGuideTab.test.jsx) has no
// <label htmlFor> association, so getByLabelText can't find them; the
// established query is screen.getByText(label).closest('.combo-box') then
// within(...).getByRole('combobox'). Gross Weight/Volume go through
// MeasureField → FormField, which DOES emit a real <label htmlFor>, so those
// stay getByLabelText.
describe('General Information editing', () => {
  it('renders editable controls for Weight, Volume, Mode and Equipment only', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    expect(screen.getByLabelText('Gross Weight')).toBeTruthy()
    expect(screen.getByLabelText('Volume')).toBeTruthy()
    expect(screen.getByText('Mode').closest('.combo-box')).toBeTruthy()
    expect(screen.getByText('Equipment').closest('.combo-box')).toBeTruthy()
    // Source Name is NOT editable — still a plain read-only value.
    expect(screen.queryByLabelText('Source Name')).toBeNull()
    expect(screen.getByText('USALCO')).toBeTruthy()
  })

  it('typing in a field enables Save Changes', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    expect(screen.getByRole('button', { name: 'Save Changes' }).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '250' } })
    expect(screen.getByRole('button', { name: 'Save Changes' }).disabled).toBe(false)
  })

  it('cancel leaves edit mode and restores the original value', () => {
    // Updated for the discard-or-save guard (2026-08-11): cancelling a DIRTY
    // section now raises the prompt instead of reverting immediately — this
    // test drives through "Discard Changes" to reach the same end state the
    // assertions below still check for.
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel editing General Information' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard Changes' }))
    expect(screen.getByText('200 cuft')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit General Information' })).toBeTruthy()
  })

  it('save exits edit mode and shows the new value', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await screen.findByRole('button', { name: 'Edit General Information' })
  })
})

describe('Customer Reference Values editing', () => {
  it('swaps the reference display for the repeatable-rows editor', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    expect(screen.getAllByText('Reference Type').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Reference Value').length).toBeGreaterThan(0)
    // No duplicated "References" heading — the section header already says it.
    expect(screen.queryByRole('heading', { name: 'References' })).toBeNull()
  })

  it('keeps the order number visible and read-only', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    // Also appears as a Stops link (same reason the existing "lists Customer
    // Reference Values" test above matches on count, not uniqueness).
    expect(screen.getAllByText('L14372086').length).toBeGreaterThan(0)
    expect(screen.queryByDisplayValue('L14372086')).toBeNull()
  })

  it('PO Number is editable and dirties the section', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    const po = screen.getByDisplayValue('PO-5512')
    fireEvent.change(po, { target: { value: 'PO-9999' } })
    expect(screen.getByRole('button', { name: 'Save Changes' }).disabled).toBe(false)
  })

  it('a new reference row can be added', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    fireEvent.click(screen.getAllByRole('button', { name: /Add New Reference Code/ })[0])
    expect(screen.getByRole('button', { name: 'Save Changes' }).disabled).toBe(false)
  })

  it('a saved reference survives leaving edit mode', async () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    fireEvent.change(screen.getByDisplayValue('PO-5512'), { target: { value: 'PO-9999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await screen.findByRole('button', { name: 'Edit Customer Reference Values' })
    expect(screen.getByText('PO-9999')).toBeTruthy()
  })
})

// Discard-or-save guard (2026-08-11, Task 8): every way OUT of an edited
// section — closing the modal, the section's own cancel X, opening a
// different section, switching tabs — funnels through one prompt when the
// draft is dirty. A clean draft is not "leaving an edit" in the sense the
// requirement means, so those paths must stay silent.
describe('unsaved-changes guard', () => {
  const dirtyGeneral = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '250' } })
  }

  it('closing the modal with a dirty draft prompts instead of closing', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    dirtyGeneral()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closing with a CLEAN draft closes immediately', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('the section cancel X prompts when dirty', () => {
    renderModal()
    dirtyGeneral()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel editing General Information' }))
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
  })

  it('switching sections with a dirty draft prompts', () => {
    renderModal()
    dirtyGeneral()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Reference Values' }))
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
  })

  it('switching tabs with a dirty draft prompts', () => {
    renderModal()
    dirtyGeneral()
    fireEvent.click(screen.getByRole('tab', { name: 'User Defined Fields' }))
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
  })

  it('discard drops the change and completes the exit', () => {
    renderModal()
    dirtyGeneral()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel editing General Information' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard Changes' }))
    expect(screen.queryByText('Unsaved changes')).toBeNull()
    expect(screen.getByText('200 cuft')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit General Information' })).toBeTruthy()
  })

  it('edit mode resets when the modal is reopened', () => {
    const { unmount } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit General Information' }))
    unmount()
    renderModal()
    expect(screen.getByRole('button', { name: 'Edit General Information' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull()
  })
})

// Cost → Edit Quote (Task 11, 2026-08-12): Edit Quote is a VIEW of this same
// modal (ModalMedium onBack navigation), not a second stacked dialog — user's
// explicit requirement. Also the DEC-86 regression guard: the quote save
// used to only touch local `overrides`, never `saveTenderOption`, so every
// Base/Markup/Equipment edit from this modal was lost on reload.
describe('Cost → Edit Quote navigation', () => {
  it('replaces the details body rather than stacking a second dialog', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Cost' }))
    expect(document.querySelectorAll('[role="dialog"]').length).toBe(1)
    expect(screen.queryByText('General Information')).toBeNull()
    expect(screen.getByText('Carrier')).toBeTruthy()
  })

  it('offers a back control that returns to the details view', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Cost' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('General Information')).toBeTruthy()
  })

  it('the close X still closes the whole modal from the quote view', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Edit Cost' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('saving the quote persists through saveTenderOption', async () => {
    const spy = vi.spyOn(shipmentService, 'saveTenderOption').mockResolvedValue(undefined)
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Cost' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Quote' }))
    await screen.findByText('General Information')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
