import { faker } from '@faker-js/faker';
import { writeFileSync } from 'fs';

faker.seed(42);

// ============================================================
// DOMAIN CONSTANTS (from grooming sessions + prototype)
// ============================================================

const MODES = ['FTL', 'LTL', 'INTERMODAL'];
const EQUIPMENT_CODES = ['FLT', 'LTH', 'VAN', 'REEFER'];
const TENDER_STATUSES = ['Done', 'Pending', 'Rejected'];
const SHIPMENT_STATUSES = ['Tender', 'In Transit', 'Delivered', 'Booked'];
const INSTRUCTION_TYPES = ['BOL', 'MISC', 'TRA', 'ADC', 'ZD02', 'SPC'];
const DOC_TYPES = ['BoL', 'MBoL', 'Invoice', 'Instructions', 'Other'];
const ROUTING_STATUSES = ['Accepted', 'Pending', 'Rejected', 'Declined'];
const ROUTING_APIS = ['API', 'EDI', 'Email', 'Fax'];
const RESPONSE_METHODS = ['API Update', 'EDI Update', 'Manual Update', 'Automatic Update'];
const ROUTE_GROUPS = ['Primary', 'Backup', 'Spot'];
const PACKAGE_TYPES = ['Boxes', 'Pallets', 'Bags', 'Drums', 'Totes', 'Crates'];
const PAYMENT_TERMS = ['Prepaid', 'Collect', 'Third Party'];
const SHIP_DIRECTIONS = ['Outbound', 'Inbound'];
const HAZMAT_CLASSES = ['Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 8', 'Class 9'];
const HAZMAT_GROUPS = ['I', 'II', 'III'];
const PRODUCT_CLASSES = ['Commodity', 'Harmonized', 'NMFC', 'Product Class'];
const TUNNEL_CODES = ['A', 'B', 'C', 'D', 'E'];

const CARRIERS = [
  { scac: 'SEFL', name: 'SOUTHEASTERN FREIGHT LINES' },
  { scac: 'ODFL', name: 'OLD DOMINION FREIGHT LINE' },
  { scac: 'XPOL', name: 'XPO LOGISTICS' },
  { scac: 'EXLA', name: 'ESTES EXPRESS LINES' },
  { scac: 'SAIA', name: 'SAIA INC' },
  { scac: 'CTNS', name: 'CONTINENTAL TRANSPORTATION' },
  { scac: 'JBHT', name: 'J.B. HUNT TRANSPORT' },
  { scac: 'SNLU', name: 'SCHNEIDER NATIONAL' },
  { scac: 'USFC', name: 'USF CORPORATION' },
  { scac: 'FXFE', name: 'FEDEX FREIGHT ECONOMY' },
  { scac: 'UPGF', name: 'UPS FREIGHT' },
  { scac: 'RLCA', name: 'R+L CARRIERS' },
  { scac: 'ABFS', name: 'ABF FREIGHT SYSTEM' },
  { scac: 'CNWY', name: 'CONWAY FREIGHT' },
  { scac: 'WARD', name: 'WARD TRUCKING' },
];

const CUSTOMERS = [
  { id: 'ERCO_SYS_01', name: 'ERCO Systems Inc' },
  { id: 'G20TECH_SYS_01', name: 'G2O Technologies LLC' },
  { id: 'USALCO_SYS_01', name: 'USALCO LLC' },
  { id: 'ACME_LOG_01', name: 'ACME Logistics Corp' },
  { id: 'BASF_CHM_01', name: 'BASF Chemical Corp' },
  { id: 'DOW_IND_01', name: 'DOW Industrial Solutions' },
  { id: 'SHELL_OIL_01', name: 'Shell Oil Products US' },
  { id: 'HUNT_REF_01', name: 'Huntsman Refining LLC' },
  { id: 'LYOND_PET_01', name: 'LyondellBasell Industries' },
  { id: 'COVES_PLY_01', name: 'Covestro Polymers LLC' },
  { id: 'INEOS_STY_01', name: 'INEOS Styrolution America' },
  { id: 'CELANESE_01', name: 'Celanese Corporation' },
  { id: 'EAST_CHM_01', name: 'Eastman Chemical Company' },
  { id: 'NOURYON_01', name: 'Nouryon Surface Chemistry' },
  { id: 'WEYERH_01', name: 'Weyerhaeuser Company' },
];

const LOCATIONS = [
  { city: 'Houston', state: 'TX', zip: '77001', facility: 'ERCO WORLDWIDE' },
  { city: 'Bastrop', state: 'LA', zip: '71202', facility: 'G2O TECH SOLUTIONS' },
  { city: 'Geismar', state: 'LA', zip: '70734', facility: 'USALCO CHEMICALS' },
  { city: 'Dallas', state: 'TX', zip: '75201', facility: 'ACME DISTRIBUTION CTR' },
  { city: 'Lake Charles', state: 'LA', zip: '70601', facility: 'WESTLAKE CHEMICAL PL' },
  { city: 'Baton Rouge', state: 'LA', zip: '70801', facility: 'BAYOU CHEMICAL PLANT' },
  { city: 'Freeport', state: 'TX', zip: '77541', facility: 'DOW CHEMICAL FREEPORT' },
  { city: 'Baytown', state: 'TX', zip: '77520', facility: 'COVESTRO BAYTOWN PL' },
  { city: 'Channelview', state: 'TX', zip: '77530', facility: 'LYONDELLBASELL CHANN' },
  { city: 'Odessa', state: 'TX', zip: '79761', facility: 'HUNTSMAN CORP ODESSA' },
  { city: 'Atlanta', state: 'GA', zip: '30301', facility: 'ERCO GLOBAL LOGISTICS' },
  { city: 'Columbus', state: 'GA', zip: '31907', facility: 'INEOS STYROLUTION PL' },
  { city: 'Chicago', state: 'IL', zip: '60601', facility: 'CELANESE MIDWEST HUB' },
  { city: 'Miami', state: 'FL', zip: '33101', facility: 'ACME FREIGHT SERVICES' },
  { city: 'San Antonio', state: 'TX', zip: '78201', facility: 'GULF COAST RECEIVING' },
  { city: 'Kingsport', state: 'TN', zip: '37660', facility: 'EASTMAN CHEMICAL RECV' },
  { city: 'Wyandotte', state: 'MI', zip: '48192', facility: 'BASF CORP WYANDOTTE' },
  { city: 'Phoenix', state: 'AZ', zip: '85001', facility: 'ERCO SOUTHWEST' },
  { city: 'Denver', state: 'CO', zip: '80201', facility: 'USALCO MOUNTAIN DIV' },
  { city: 'Seattle', state: 'WA', zip: '98101', facility: 'ACME PACIFIC NW' },
  { city: 'Portland', state: 'OR', zip: '97201', facility: 'USALCO PACIFIC' },
  { city: 'Minneapolis', state: 'MN', zip: '55401', facility: 'NOURYON NORTH CENTRAL' },
  { city: 'Detroit', state: 'MI', zip: '48201', facility: 'DOW MIDLAND COMPLEX' },
  { city: 'New Orleans', state: 'LA', zip: '70112', facility: 'CF INDUSTRIES DONALDSV' },
  { city: 'Salt Lake City', state: 'UT', zip: '84101', facility: 'WEYERHAEUSER WEST' },
  { city: 'Kansas City', state: 'MO', zip: '64101', facility: 'NOURYON COLUMBUS PL' },
  { city: 'San Diego', state: 'CA', zip: '92101', facility: 'SEMPRA ENERGY OTAY' },
  { city: 'Neenah', state: 'WI', zip: '54956', facility: 'SHIPTUSLA NEENAH' },
  { city: 'McIntosh', state: 'AL', zip: '36553', facility: 'OLIN CORP MCINTOSH' },
  { city: 'Green River', state: 'WY', zip: '82935', facility: 'SOLVAY CHEMICALS PL' },
];

const CHEMICAL_PRODUCTS = [
  { item: '32041H1D', desc: 'Sodium Hydroxide Solution 50%', hazmat: true, hClass: 'Class 8', hGroup: 'II' },
  { item: '28103A2K', desc: 'Hydrochloric Acid 32%', hazmat: true, hClass: 'Class 8', hGroup: 'II' },
  { item: '76201C5M', desc: 'Calcium Chloride Flakes 77%', hazmat: false },
  { item: '76201C5N', desc: 'Calcium Chloride Liquid 35%', hazmat: false },
  { item: '31052D8J', desc: 'Ferric Chloride Solution 42%', hazmat: true, hClass: 'Class 8', hGroup: 'III' },
  { item: '55129P3R', desc: 'Reprocessed Polyethylene Pellets', hazmat: false },
  { item: '29051A7F', desc: 'Methanol Technical Grade', hazmat: true, hClass: 'Class 3', hGroup: 'II' },
  { item: '28042B9G', desc: 'Sulfuric Acid 93%', hazmat: true, hClass: 'Class 8', hGroup: 'II' },
  { item: '38089C2H', desc: 'Herbicide Concentrate 2,4-D', hazmat: true, hClass: 'Class 6', hGroup: 'III' },
  { item: '27101D4J', desc: 'Petroleum Distillate', hazmat: true, hClass: 'Class 3', hGroup: 'III' },
  { item: '39011E6K', desc: 'Polyethylene Resin HD', hazmat: false },
  { item: '39021F8L', desc: 'Polypropylene Copolymer', hazmat: false },
  { item: '28112G3M', desc: 'Hydrogen Peroxide 35%', hazmat: true, hClass: 'Class 5', hGroup: 'I' },
  { item: '22071H5N', desc: 'Ethylene Glycol Industrial', hazmat: false },
  { item: '28151J7P', desc: 'Potassium Hydroxide 45%', hazmat: true, hClass: 'Class 8', hGroup: 'II' },
  { item: '29031K9Q', desc: 'Vinyl Chloride Monomer', hazmat: true, hClass: 'Class 2', hGroup: 'I' },
  { item: '38089L2R', desc: 'Insecticide Emulsifiable', hazmat: true, hClass: 'Class 6', hGroup: 'II' },
  { item: '34021M4S', desc: 'Surfactant Non-ionic', hazmat: false },
  { item: '28070N6T', desc: 'Phosphoric Acid 75%', hazmat: true, hClass: 'Class 8', hGroup: 'III' },
  { item: '39076P8U', desc: 'PVC Compound Rigid', hazmat: false },
];

const INSTRUCTION_TEMPLATES = [
  { type: 'TRA', text: 'Drivers are required to wear face coverings and follow social distancing guidelines. They may also be subject to temperature checks upon arrival.' },
  { type: 'ADC', text: 'DRIVER: Purchasing Contact: {contact} Main Office Phone; {phone} Receiving Hours: {hours}' },
  { type: 'SPC', text: 'SHIPPING INSTRUCTIONS: Please ship via {carrier} using our account # {account}. If product is being shipped out of the {region}, use alternate carrier {altCarrier}.' },
  { type: 'BOL', text: 'BOL REQUIREMENT: Ensure all BOL documentation includes hazmat placards for UN{unNumber}. Driver must carry emergency response guide.' },
  { type: 'ZD02', text: 'DELIVERY INSTRUCTIONS: Deliver to dock {dock} only. Facility requires {hours}-hour advance appointment scheduling. Contact dispatch at {phone} to confirm slot availability.' },
  { type: 'MISC', text: 'GENERAL NOTE: Customer account {account} requires signature confirmation on delivery. No partial deliveries accepted.' },
  { type: 'TRA', text: 'TRANSPORT: Maximum vehicle weight {weight} LB. No doubles or triples permitted. Must use sealed containers for hazmat materials.' },
  { type: 'ADC', text: 'ACCESSORIAL: Liftgate required at delivery. Inside delivery to warehouse bay {bay}. Call {phone} 30 minutes prior to arrival.' },
  { type: 'SPC', text: 'SPECIAL HANDLING: Temperature-controlled transport required. Maintain between {minTemp}F and {maxTemp}F. Log temperature readings every 4 hours.' },
  { type: 'ZD02', text: 'CUSTOMS: Export documentation required. EEI filing mandatory for shipments over $2,500. ECCN classification: {eccn}.' },
];

const NOTE_AUTHORS = [
  { name: 'Amy Cook', initials: 'AC', css: '' },
  { name: 'Jana Dharma', initials: 'JD', css: 'jd' },
  { name: 'Lucas Smith', initials: 'LS', css: 'ls' },
  { name: 'David Chen', initials: 'DC', css: 'jd' },
  { name: 'Sarah Kim', initials: 'SK', css: 'ls' },
];

const NOTE_TEMPLATES = [
  'Confirmed with {carrier} dispatcher — pickup window adjusted to {time} per facility request.',
  'Customer requested delivery before {date} due to plant shutdown. Flagged as priority.',
  'Hazmat paperwork verified for all line items. Class {class} documentation is complete.',
  'Rate renegotiated with {carrier}. New AP cost reflects {discount}% volume discount.',
  'Consolidation approved — combined with shipment {shipId} for cost savings.',
  'Carrier {carrier} confirmed equipment availability for {date}. No issues expected.',
  'Hold placed per customer request. Awaiting revised delivery schedule.',
  'PGI documentation received. Invoice generated and sent to billing.',
  'Routing review completed. Selected {carrier} based on transit time optimization.',
  'Weight discrepancy noted at origin. Actual gross weight: {weight} LB vs manifest {manifestWeight} LB.',
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function pick(arr) { return faker.helpers.arrayElement(arr); }
function pickN(arr, min, max) { return faker.helpers.arrayElements(arr, faker.number.int({ min, max })); }
function fmt(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtInt(n) { return n.toLocaleString('en-US'); }

function genShipmentId(prefix, i) {
  const num = faker.number.int({ min: 10000000, max: 99999999 });
  return `SHP-${prefix}${num}`;
}

function genOrderId() {
  const num = faker.number.int({ min: 26000001, max: 26999999 });
  return `ORD-S${num}M`;
}

function genLoadId() {
  return `LOAD${faker.number.int({ min: 200001, max: 299999 })}`;
}

function genProNumber() {
  return `PRO-${faker.number.int({ min: 440001, max: 449999 })}`;
}

function genDate(baseDate, offsetDays) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

function formatDateTime(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd}/${yyyy} ${hh}:${min} CST`;
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatShortDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function fillTemplate(template, shipment) {
  return template
    .replace('{contact}', faker.person.fullName())
    .replace('{phone}', faker.phone.number({ style: 'national' }))
    .replace('{hours}', pick(['Monday - Friday 7:30-3:30', 'Monday - Friday 8:00-5:00', 'Monday - Saturday 6:00-18:00']))
    .replace('{carrier}', pick(CARRIERS).name)
    .replace('{altCarrier}', pick(CARRIERS).scac)
    .replace('{account}', `00${faker.number.int({ min: 100000, max: 999999 })}`)
    .replace('{region}', pick(['South Eastern United States', 'Gulf Coast region', 'Midwest corridor', 'Pacific Northwest']))
    .replace('{unNumber}', faker.number.int({ min: 1000, max: 3999 }))
    .replace('{dock}', `${faker.number.int({ min: 1, max: 30 })}${pick(['A', 'B', 'C'])}`)
    .replace('{bay}', faker.number.int({ min: 1, max: 20 }))
    .replace('{weight}', fmtInt(faker.number.int({ min: 40000, max: 80000 })))
    .replace('{minTemp}', faker.number.int({ min: 35, max: 50 }))
    .replace('{maxTemp}', faker.number.int({ min: 60, max: 80 }))
    .replace('{eccn}', `EAR99`)
    .replace('{date}', formatShortDate(faker.date.soon({ days: 14 })))
    .replace('{time}', `${faker.number.int({ min: 6, max: 16 })}:00-${faker.number.int({ min: 17, max: 22 })}:00 CST`)
    .replace('{class}', pick(HAZMAT_CLASSES).replace('Class ', ''))
    .replace('{discount}', faker.number.int({ min: 5, max: 15 }))
    .replace('{shipId}', genShipmentId(pick(['D', 'B']), 0))
    .replace('{weight}', fmtInt(faker.number.int({ min: 3000, max: 15000 })))
    .replace('{manifestWeight}', fmtInt(faker.number.int({ min: 3000, max: 15000 })));
}

// ============================================================
// SHIPMENT GENERATOR
// ============================================================

function generateShipment(index) {
  const prefix = pick(['D', 'B']);
  const buyShipment = `SHP-${prefix}${faker.number.int({ min: 10000000, max: 99999999 })}`;
  const sellShipment = String(faker.number.int({ min: 25690000, max: 25699999 }));
  const customer = pick(CUSTOMERS);
  const originLoc = pick(LOCATIONS);
  const destLoc = pick(LOCATIONS.filter(l => l.city !== originLoc.city));
  const mode = pick(MODES);
  const equipmentCode = pick(EQUIPMENT_CODES);
  const carrier = pick(CARRIERS);
  const tenderStatus = pick(TENDER_STATUSES);
  const shipmentStatus = pick(SHIPMENT_STATUSES);
  const baseDate = faker.date.between({ from: '2026-01-01', to: '2026-06-30' });
  baseDate.setHours(faker.number.int({ min: 6, max: 16 }), pick([0, 30]), 0, 0);
  const transitDays = faker.number.int({ min: 1, max: 7 });
  const deliveryDate = genDate(baseDate, transitDays);
  const grossWeight = faker.number.int({ min: 2000, max: 45000 });

  // Orders (1-4 per shipment)
  const orderCount = faker.number.int({ min: 1, max: 4 });
  const orders = [];
  const packageType = pick(PACKAGE_TYPES); // consistent per shipment

  for (let o = 0; o < orderCount; o++) {
    const orderId = genOrderId();
    const lineCount = faker.number.int({ min: 1, max: 3 });
    const lines = [];

    for (let l = 0; l < lineCount; l++) {
      const product = pick(CHEMICAL_PRODUCTS);
      const lineWeight = faker.number.int({ min: 1000, max: 15000 });
      const tareWeight = Math.round(lineWeight * 0.2);
      lines.push({
        lineNumber: String(l + 1).padStart(3, '0'),
        shipItem: product.item,
        description: product.desc,
        packageCount: `${faker.number.int({ min: 5, max: 80 })} ${packageType}`,
        grossWeight: `${fmtInt(lineWeight)} LB`,
        volume: `${faker.number.int({ min: 20, max: 200 })} cuft`,
        hazmat: product.hazmat,
        tareWeight: `${fmtInt(tareWeight)} LB`,
        netWeight: `${fmtInt(lineWeight - tareWeight)} LB`,
        hazmatClass: product.hazmat ? product.hClass : '--',
        hazmatGroup: product.hazmat ? product.hGroup : '--',
        productClass: pick(PRODUCT_CLASSES),
        shippingClass: String(faker.number.int({ min: 100000, max: 999999 })),
        flashPoint: product.hazmat ? `${faker.number.int({ min: 60, max: 200 })} F` : '--',
        countryOfOrigin: 'USA',
        declaredValue: `$${fmt(faker.number.int({ min: 2000, max: 50000 }))} USD`,
        thirdPartRef: `S${faker.number.int({ min: 1000, max: 9999 })}`,
        batchLot: `BL-${faker.number.int({ min: 40000, max: 49999 })}`,
        length: `${faker.number.int({ min: 2, max: 6 })} FT`,
        width: `${faker.number.int({ min: 2, max: 6 })} FT`,
        height: `${faker.number.int({ min: 2, max: 6 })} FT`,
      });
    }

    orders.push({ orderId, lineCount, lines });
  }

  // Stops
  const pickupStopCount = faker.number.int({ min: 1, max: 2 });
  const stops = [];
  for (let s = 0; s < pickupStopCount; s++) {
    const stopLoc = s === 0 ? originLoc : pick(LOCATIONS.filter(l => l.city !== originLoc.city && l.city !== destLoc.city));
    stops.push({
      type: 'pickup',
      stopNumber: s + 1,
      order: orders.slice(s, s + Math.ceil(orders.length / pickupStopCount)).map(o => o.orderId).join(', '),
      location: `${stopLoc.facility}, ${stopLoc.city}, ${stopLoc.state} ${stopLoc.zip} US`,
      address: `${faker.location.streetAddress()}, ${stopLoc.city}, ${stopLoc.state} ${stopLoc.zip} US`,
      date: `${formatDate(baseDate)} ${String(baseDate.getHours()).padStart(2, '0')}:00 CST`,
      appointment: `${String(baseDate.getHours()).padStart(2, '0')}:00 CST`,
      weight: `${fmtInt(Math.round(grossWeight / pickupStopCount))} LB`,
      volume: `${faker.number.int({ min: 40, max: 300 })} cuft`,
      packageCount: `${faker.number.int({ min: 5, max: 80 })}`,
      pickupNo: faker.datatype.boolean() ? `PU-${faker.number.int({ min: 100000, max: 999999 })}` : '--',
    });
  }
  stops.push({
    type: 'delivery',
    stopNumber: pickupStopCount + 1,
    order: orders.map(o => o.orderId).join(', '),
    location: `${destLoc.facility}, ${destLoc.city}, ${destLoc.state} ${destLoc.zip} US`,
    address: `${faker.location.streetAddress()}, ${destLoc.city}, ${destLoc.state} ${destLoc.zip} US`,
    date: `${formatDate(deliveryDate)} ${String(deliveryDate.getHours()).padStart(2, '0')}:00 CST`,
    appointment: `${String(deliveryDate.getHours()).padStart(2, '0')}:00 CST`,
    weight: `${fmtInt(grossWeight)} LB`,
    volume: `${faker.number.int({ min: 40, max: 300 })} cuft`,
    packageCount: '--',
    pickupNo: '--',
  });

  const distance = faker.number.float({ min: 50, max: 2000, fractionDigits: 2 });

  // Routing options (3-6)
  const routingCount = faker.number.int({ min: 3, max: 6 });
  const routingCarriers = faker.helpers.arrayElements(CARRIERS, routingCount);
  const routingOptions = routingCarriers.map((rc, ri) => {
    const baseRate = faker.number.float({ min: 200, max: 2000, fractionDigits: 2 });
    const cost = faker.number.float({ min: 100, max: 800, fractionDigits: 2 });
    const pickupHour = faker.number.int({ min: 6, max: 16 });
    const delivHour = faker.number.int({ min: 6, max: 22 });
    return {
      rank: ri + 1,
      routeRank: faker.number.int({ min: 1, max: 3 }),
      scac: rc.scac,
      carrierName: rc.name,
      rate: `$${fmt(baseRate)}`,
      cost: `$${fmt(cost)} USD`,
      status: ri === 0 ? 'Accepted' : pick(ROUTING_STATUSES.filter(s => s !== 'Accepted')),
      pickupDateTime: formatDateTime(baseDate),
      pickupTZ: 'CST',
      pickupOrgHours: `${String(pickupHour).padStart(2, '0')}:00 - ${String(pickupHour + faker.number.int({ min: 6, max: 10 })).padStart(2, '0')}:30`,
      pickupOrgDay: pick(['Yes', 'No']),
      deliveryDateTime: formatDateTime(genDate(baseDate, faker.number.int({ min: 1, max: 5 }))),
      deliveryOrgHours: `${String(delivHour - 6).padStart(2, '0')}:00 - ${String(delivHour).padStart(2, '0')}:59`,
      deliveryTZ: 'CST',
      transit: `${faker.number.int({ min: 1, max: 5 })} Days`,
      distance: `${faker.number.float({ min: 100, max: 1500, fractionDigits: 2 })} mi`,
      sl: `${faker.number.int({ min: 85, max: 99 })}%`,
      linehaul: pick(['Completed', 'In Progress', 'Pending']),
      routeGroup: pick(ROUTE_GROUPS),
      api: pick(ROUTING_APIS),
      notifyDateTime: formatDateTime(genDate(baseDate, -1)),
      responseMethod: pick(RESPONSE_METHODS),
      responseDateTime: ri === 0 ? formatDateTime(genDate(baseDate, 0)) : '--',
      carrierPickup: ri === 0 ? `${faker.string.alphanumeric(3).toUpperCase()}${faker.number.int({ min: 10000, max: 99999 })}` : '--',
      deliveryNum: ri === 0 ? `${faker.string.alphanumeric(3).toUpperCase()}${faker.number.int({ min: 10000, max: 99999 })}` : '--',
      transitTimeSource: 'SMC',
      description: faker.lorem.words({ min: 2, max: 4 }),
    };
  });

  // Cost allocation
  const apBase = faker.number.float({ min: 500, max: 5000, fractionDigits: 2 });
  const apFuel = Math.round(apBase * faker.number.float({ min: 0.25, max: 0.45, fractionDigits: 2 }) * 100) / 100;
  const apDiscount = faker.datatype.boolean() ? Math.round(apBase * faker.number.float({ min: 0.03, max: 0.1, fractionDigits: 2 }) * 100) / 100 : 0;
  const apAccessorials = faker.datatype.boolean() ? faker.number.float({ min: 50, max: 400, fractionDigits: 2 }) : 0;
  const apTotal = apBase + apFuel - apDiscount + apAccessorials;
  const marginPct = faker.number.float({ min: 0.18, max: 0.35, fractionDigits: 2 });
  const arTotal = Math.round(apTotal * (1 + marginPct) * 100) / 100;
  const marginAmt = Math.round((arTotal - apTotal) * 100) / 100;

  const costOrders = orders.map((ord, oi) => {
    const orderShare = 1 / orders.length;
    const ordApBase = Math.round(apBase * orderShare * 100) / 100;
    const ordApFuel = Math.round(apFuel * orderShare * 100) / 100;
    const ordApDiscount = Math.round(apDiscount * orderShare * 100) / 100;
    const ordApTotal = Math.round(apTotal * orderShare * 100) / 100;
    const ordArTotal = Math.round(arTotal * orderShare * 100) / 100;
    const ordDirectCost = Math.round(ordApTotal * faker.number.float({ min: 1.05, max: 1.25, fractionDigits: 2 }) * 100) / 100;
    const ordMargin = Math.round((ordArTotal - ordApTotal) * 100) / 100;
    const hzc = faker.datatype.boolean() ? faker.number.float({ min: 30, max: 150, fractionDigits: 2 }) : 0;
    const soc = faker.datatype.boolean() ? faker.number.float({ min: 20, max: 120, fractionDigits: 2 }) : 0;

    const loads = ord.lines.map((line, li) => {
      const loadShare = 1 / ord.lineCount;
      return {
        loadLabel: `Load ${li + 1} — ${genLoadId()}`,
        directCost: `$${fmt(ordDirectCost * loadShare)} USD`,
        apCost: `$${fmt(ordApTotal * loadShare)} USD`,
        arCost: `$${fmt(ordArTotal * loadShare)} USD`,
        margin: `$${fmt(ordMargin * loadShare)}`,
        base: `$${fmt(ordApBase * loadShare)}`,
        fuel: `$${fmt(ordApFuel * loadShare)}`,
        discount: ordApDiscount > 0 ? `-$${fmt(ordApDiscount * loadShare)}` : '--',
        hzc: hzc > 0 ? `$${fmt(hzc * loadShare)}` : '--',
        soc: soc > 0 ? `$${fmt(soc * loadShare)}` : '--',
      };
    });

    return {
      orderId: ord.orderId,
      directCost: `$${fmt(ordDirectCost)} USD`,
      apCost: `$${fmt(ordApTotal)} USD`,
      arCost: `$${fmt(ordArTotal)} USD`,
      margin: `$${fmt(ordMargin)}`,
      base: `$${fmt(ordApBase)}`,
      fuel: `$${fmt(ordApFuel)}`,
      discount: ordApDiscount > 0 ? `-$${fmt(ordApDiscount)}` : '--',
      hzc: hzc > 0 ? `$${fmt(hzc)}` : '--',
      soc: soc > 0 ? `$${fmt(soc)}` : '--',
      loads: ord.lineCount > 1 ? loads : [],
    };
  });

  // Instructions
  const instrOrders = orders.map(ord => {
    const instrCount = faker.number.int({ min: 1, max: 4 });
    const templates = faker.helpers.arrayElements(INSTRUCTION_TEMPLATES, instrCount);
    return {
      orderId: ord.orderId,
      instructions: templates.map((t, i) => ({
        seq: i + 1,
        type: t.type,
        text: fillTemplate(t.text, null),
      })),
    };
  });

  // Documents
  const docCount = faker.number.int({ min: 1, max: 4 });
  const documents = [];
  for (let d = 0; d < docCount; d++) {
    const docType = pick(DOC_TYPES);
    const ext = pick(['.pdf', '.xlsx', '.docx']);
    documents.push({
      type: docType,
      description: `${docType} — ${buyShipment}${d > 0 ? ` (${faker.lorem.words(2)})` : ''}`,
      fileName: `${docType.replace('/', '_')}_${buyShipment}${ext}`,
    });
  }

  // Notes
  const noteCount = faker.number.int({ min: 0, max: 5 });
  const notes = [];
  for (let n = 0; n < noteCount; n++) {
    const author = pick(NOTE_AUTHORS);
    const noteDate = genDate(baseDate, -faker.number.int({ min: 0, max: 10 }));
    noteDate.setHours(faker.number.int({ min: 7, max: 18 }), faker.number.int({ min: 0, max: 59 }));
    notes.push({
      author: author.name,
      authorInitials: author.initials,
      avatarClass: author.css,
      date: formatDateTime(noteDate),
      body: fillTemplate(pick(NOTE_TEMPLATES), null),
    });
  }
  notes.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Order tab detail
  const orderDetail = {
    orderNumber: orders[0].orderId,
    shipDirection: pick(SHIP_DIRECTIONS),
    orderDate: formatDateTime(genDate(baseDate, -faker.number.int({ min: 1, max: 5 }))),
    paymentTerms: pick(PAYMENT_TERMS),
    shipmentMode: mode === 'FTL' ? 'Ground' : mode === 'LTL' ? 'Ground LTL' : 'Intermodal',
    expedited: pick(['Yes', 'No']),
    consolidatable: pick(['Yes', 'No']),
    equipment: equipmentCode,
    specialServices: faker.datatype.boolean() ? 'Hazmat handling' : '',
    lsp: '',
    carrier: tenderStatus === 'Done' ? carrier.name : '',
    shipFrom: {
      siteId: originLoc.facility,
      company: customer.name,
      location: `${originLoc.zip}, ${originLoc.city}, ${originLoc.state}, US`,
      address: faker.location.streetAddress(),
    },
    shipTo: {
      siteId: destLoc.facility,
      company: destLoc.facility,
      location: `${destLoc.zip}, ${destLoc.city}, ${destLoc.state}, US`,
      address: faker.location.streetAddress(),
    },
    earliestPickup: formatDateTime(baseDate),
    latestPickup: formatDateTime(genDate(baseDate, 0)),
    earliestDelivery: '',
    latestDelivery: '',
    numProducts: orders.reduce((s, o) => s + o.lineCount, 0),
    totalWeight: `${fmtInt(grossWeight)} LB`,
    totalVolume: `${faker.number.int({ min: 50, max: 500 })} cuft`,
    hazmat: orders.some(o => o.lines.some(l => l.hazmat)) ? 'Yes' : 'No',
    contactName: faker.person.fullName(),
    contactEmail: faker.internet.email(),
    contactPhone: faker.phone.number({ style: 'national' }),
  };

  // Main table row
  const mainRow = {
    buyShipment,
    sellShipment,
    orders: orders.map(o => o.orderId),
    pro: genProNumber(),
    customerId: customer.id,
    customerName: customer.name,
    consignor: originLoc.facility,
    consignee: destLoc.facility,
    origin: `${originLoc.city} ${originLoc.state} US ${originLoc.zip}`,
    destination: `${destLoc.city} ${destLoc.state} US ${destLoc.zip}`,
    pickupDate: formatDateTime(baseDate),
    deliveryDate: formatDateTime(deliveryDate),
    mode,
    equipmentCode,
    equipment: String(faker.number.int({ min: 1000, max: 9999 })),
    seal: `S${faker.number.int({ min: 440000, max: 449999 })}`,
    scac: carrier.scac,
    tenderStatus,
    shipmentStatus,
    grossWeight: String(grossWeight),
    load: String(faker.number.int({ min: 10000, max: 99999 })),
    loadCount: String(orders.reduce((s, o) => s + o.lineCount, 0)),
    orderCount: String(orderCount),
  };

  // Detail data
  const detail = {
    orderDetail,
    stopsData: {
      summary: {
        distance: `${fmt(distance)} mi`,
        grossWeight: `${fmtInt(grossWeight)} LB`,
        volume: `${faker.number.int({ min: 50, max: 500 })} cuft`,
        acceptedCarrier: `${carrier.scac} - ${mode}`,
        seedEquipment: equipmentCode,
        utilization: `${faker.number.int({ min: 50, max: 100 })}%`,
      },
      stops,
    },
    productData: { orders },
    routingData: { options: routingOptions },
    costData: {
      planned: {
        summary: {
          base: `$${fmt(apBase)}`,
          discount: apDiscount > 0 ? `-$${fmt(apDiscount)}` : '$0.00',
          fuel: `$${fmt(apFuel)}`,
          accessorials: apAccessorials > 0 ? `$${fmt(apAccessorials)}` : '$0.00',
          apTotal: `$${fmt(apTotal)}`,
          arTotal: `$${fmt(arTotal)}`,
          margin: `$${fmt(marginAmt)} (${(marginPct * 100).toFixed(1)}%)`,
        },
        orders: costOrders,
      },
    },
    instructionsData: { orders: instrOrders },
    documentsData: { documents },
    notesData: { notes },
  };

  return { mainRow, detail };
}

// ============================================================
// GENERATE 200 SHIPMENTS
// ============================================================

console.log('Generating 200 shipments...');

const shipments = [];
const shipmentDetails = {};

for (let i = 0; i < 200; i++) {
  const { mainRow, detail } = generateShipment(i);
  shipments.push(mainRow);
  shipmentDetails[mainRow.buyShipment] = detail;
}

const outDir = new URL('../src/data/', import.meta.url);
writeFileSync(new URL('shipments.json', outDir), JSON.stringify(shipments, null, 2));
writeFileSync(new URL('shipment-details.json', outDir), JSON.stringify(shipmentDetails, null, 2));

console.log(`Done! Generated ${shipments.length} shipments.`);
console.log(`  shipments.json: ${shipments.length} rows`);
console.log(`  shipment-details.json: ${Object.keys(shipmentDetails).length} detail records`);
console.log(`  Total orders: ${shipments.reduce((s, r) => s + r.orders.length, 0)}`);
