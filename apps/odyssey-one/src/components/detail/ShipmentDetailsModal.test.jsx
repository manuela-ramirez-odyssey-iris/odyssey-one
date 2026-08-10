// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ShipmentDetailsModal from './ShipmentDetailsModal'

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

// Field editing (2026-08-10, final field list — Base, Markup, Equipment;
// corrected same day after two misreads: Base briefly lost its pen, and
// Equipment briefly got an inline ComboBox + this modal's own confirmation
// instead of the shared QuoteModal). EDITABLE_FIELDS is a config map, not a
// prop — "present in the map → editable, absent → plain" is the contract
// under test. Every editable field opens the SAME QuoteModal instance; none
// of them have a local draft/confirm any more. Gross Weight and Margin stay
// unconfigured throughout as the negative cases.
describe('ShipmentDetailsModal — field editing', () => {
  it('renders a pen button for exactly the three configured fields — Base, Markup, Equipment', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Edit Base' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit Markup' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit Equipment' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit Gross Weight' })).toBeNull()
  })

  it('Margin has no pen — it stays read-only and derived, never editable', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: 'Edit Margin' })).toBeNull()
  })

  it('Equipment is sourced from the current routing option, not the shipment', () => {
    // shipment.equipmentCode/summary.seedEquipment are BOTH 'LTL' (fixture);
    // the accepted option's own equipment is set to a DIFFERENT value here to
    // prove the field reads the quote, not the shipment.
    const d = {
      ...details,
      routingData: { options: [
        details.routingData.options[0],
        { ...details.routingData.options[1], equipment: 'TL' },
      ] },
    }
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={d} onClose={() => {}} /></MemoryRouter>)
    const cell = screen.getByRole('button', { name: 'Edit Equipment' }).closest('.shp-details__field')
    expect(within(cell).getByText('TL')).toBeTruthy()
    expect(within(cell).queryByText('LTL')).toBeNull() // must NOT leak the shipment-level value
  })

  it('Equipment falls back to DASH when there is no current routing option', () => {
    const d = { ...details, routingData: { options: [] } }
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={d} onClose={() => {}} /></MemoryRouter>)
    const cell = screen.getByRole('button', { name: 'Edit Equipment' }).closest('.shp-details__field')
    expect(within(cell).getByText('--')).toBeTruthy()
  })

  it('Markup is backed by rateDetails.markup, not costSummary.margin', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    // fixture: rateDetails.markup = 300 -> "$300.00"; costData.summary.margin is
    // a totally different fixture value ("$250.00 (7.7%)") — proves no conflation
    expect(screen.getByText('$300.00')).toBeTruthy()
    expect(screen.getByText('$250.00 (7.7%)')).toBeTruthy()
  })

  it('clicking the pen on Base opens the Tender quote modal in edit mode', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Base' }))
    expect(screen.getByRole('dialog', { name: 'Edit Quote' })).toBeTruthy()
  })

  it('clicking the pen on Markup opens the Tender quote modal in edit mode', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Markup' }))
    expect(screen.getByRole('dialog', { name: 'Edit Quote' })).toBeTruthy()
  })

  it('clicking the pen on Equipment opens the Tender quote modal in edit mode — no inline ComboBox any more', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Equipment' }))
    expect(screen.getByRole('dialog', { name: 'Edit Quote' })).toBeTruthy()
    // The pen never becomes a Save icon — QuoteModal owns the save button now
    expect(screen.getByRole('button', { name: 'Edit Equipment' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save Equipment' })).toBeNull()
  })

  it('QuoteModal receives the current (accepted) routing option as carrierData', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Markup' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Quote' })
    // fixture's accepted option (rank 2) carries rateDetails.baseRate = 2900 —
    // proof carrierData is that option, not an empty/add-mode form
    const values = within(dialog).getAllByRole('textbox').map((el) => el.value)
    expect(values).toContain('2900')
  })

  it('Escape while the quote modal is open closes ONLY the quote modal — the details modal survives', () => {
    const onClose = vi.fn()
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={onClose} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Markup' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Edit Quote' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Edit Markup' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  // jsdom ceiling (project_jsdom_test_ceilings): FieldSearchResults is
  // virtualized, so ComboBox never renders role="option" rows here. Selection
  // is driven by keyboard — focus, ArrowDown ×N, Enter — the same recipe
  // ComboBox.typeahead.test.jsx and spotboard/SetupCarriers.test.jsx use for a
  // pick-only (typable={false}) select ComboBox. EQUIPMENT_CODES' key order
  // (master-data.js) is LTL, LTR, LTH, TL, ... — the fixture's accepted
  // option seeds LTL (index 0), so 2× ArrowDown lands on LTR (index 1).
  it('saving the quote modal after changing Equipment updates Base, Markup, AND Equipment together', () => {
    render(<MemoryRouter><ShipmentDetailsModal shipment={shipment} shipmentDetails={details} onClose={() => {}} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Equipment' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Quote' })

    const equipmentCombo = within(dialog).getByText('Equipment').closest('.combo-box')
    fireEvent.focus(within(equipmentCombo).getByRole('combobox'))
    fireEvent.keyDown(equipmentCombo, { key: 'ArrowDown' })
    fireEvent.keyDown(equipmentCombo, { key: 'ArrowDown' })
    fireEvent.keyDown(equipmentCombo, { key: 'Enter' }) // LTL (seed) -> LTR

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Quote' }))
    expect(screen.queryByRole('dialog', { name: 'Edit Quote' })).toBeNull()

    const equipmentCell = screen.getByRole('button', { name: 'Edit Equipment' }).closest('.shp-details__field')
    expect(within(equipmentCell).getByText('LTR')).toBeTruthy()
    // Base/Markup refreshed from the same save (fixture's unedited baseRate/markup)
    const baseCell = screen.getByRole('button', { name: 'Edit Base' }).closest('.shp-details__field')
    expect(within(baseCell).getByText('$2,900.00')).toBeTruthy()
  })
})
