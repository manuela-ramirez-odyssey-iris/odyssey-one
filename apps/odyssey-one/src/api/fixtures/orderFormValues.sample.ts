import type { OrderFormValues } from '../types/orderFormVm'

// Filled long-form sample for schema/mapper/service tests. Location ids use
// the generator formula (EW-TX-001 = Houston/ERCO, GCR-TX-015 = San Antonio/
// GULF COAST RECEIVING); product items come from CHEMICAL_PRODUCTS; weights
// sum to 4300 lb / 730 cuft — the LLD list example's numbers.
export const orderFormValuesSample: OrderFormValues = {
  general: {
    orderNumber: 'ORD-1001',
    owningOrganization: 'ERCO_SYS_01',
    owningOrganizationName: 'ERCO Systems Inc',
    equipment: 'VAN',
    freightTerm: 'P',
    shipDirection: 'O',
    hazardous: false,
    consolidatable: true,
    carrierScac: 'KNGT',
    equipmentReferenceNumber: 'EQ-REF-9',
    instructions: [
      { id: 'i1', description: 'Call ahead before pickup' },
    ],
    references: [
      { id: 'ref-pickup', guided: true, type: 'Pickup Number', value: '41197' },
      { id: 'ref-po', guided: true, type: 'PO Number', value: 'I567649422' },
      { id: 'r3', guided: false, type: 'Dock Code', value: 'D-12' },
    ],
  },
  pickupDelivery: {
    consignor: {
      locationId: 'EW-TX-001', manualMode: false,
      idOrgName: 'EW-TX-001', longName: 'ERCO WORLDWIDE',
      address1: '100 Industrial Blvd', address2: '',
      city: 'Houston', state: 'TX', postal: '77001', country: 'United States',
      showContact: true,
      contactName: 'Nick Strauss',
      contactPhone: '+1 (765) 670-4444',
      contactEmail: 'nick.strauss@krm.com',
    },
    consignee: {
      locationId: 'GCR-TX-015', manualMode: false,
      idOrgName: 'GCR-TX-015', longName: 'GULF COAST RECEIVING',
      address1: '114 Industrial Blvd', address2: '',
      city: 'San Antonio', state: 'TX', postal: '78201', country: 'United States',
      showContact: false, contactName: '', contactPhone: '', contactEmail: '',
    },
    planningDateType: 'SHIP',
    pickupAppointment: false,
    deliveryAppointment: false,
    earlyPickup: { date: '06/15/2026', time: '08:00', timezone: 'CST' },
    latePickup: { date: '06/15/2026', time: '16:00', timezone: 'CST' },
    earlyDelivery: { date: '', time: '00:00', timezone: '' },
    lateDelivery: { date: '06/18/2026', time: '12:00', timezone: 'CST' },
  },
  products: [
    {
      id: 'p1', productId: '39011E6K', description: 'Polyethylene Resin HD',
      grossWeight: { value: '100', uom: 'lb' }, volume: { value: '79', uom: 'cuft' },
      shipClass: 'Commodity',
    },
    {
      id: 'p2', productId: '28042B9G', description: 'Sulfuric Acid 93%',
      grossWeight: { value: '4200', uom: 'lb' }, volume: { value: '651', uom: 'cuft' },
      shipClass: 'Product Class',
    },
  ],
  specialServices: [
    { code: 'LFT', description: 'Lift gate' },
  ],
}
