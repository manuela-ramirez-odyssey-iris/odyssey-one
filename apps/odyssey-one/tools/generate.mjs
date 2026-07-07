// tools/generate.mjs — the SINGLE seeded generator for the Shipments AND Orders
// mock datasets. Orders are not a parallel universe: every order carried by a
// shipment (detail orderList / stops / cost allocation) is ALSO a row in
// src/data/orders.json with the same orderNumber, customer and facts, plus a
// tail of not-yet-shipped orders that exist only on the Orders side.
//
// ── Orders ↔ Shipments correlation invariants ──────────────────────────────
//  I1 Identity   — every orderId inside a shipment detail appears EXACTLY once
//                  in orders.json as orderNumber (globally unique, customer-
//                  prefixed sequence: "KEM100042").
//  I2 Customer   — order.customer === shipment.customerId === detail
//                  orderList[].customerId. A shipment never carries another
//                  customer's orders.
//  I3 Locations  — order.consignor = the pickup stop the order is assigned to;
//                  order.consignee = the shipment's delivery stop (same
//                  facility/city/state/zip + shared locationIdFor id).
//  I4 Dates      — earliestPickup ≤ shipment pickup ≤ latestPickup <
//                  earliestDelivery ≤ shipment delivery ≤ latestDelivery; the
//                  detail's scheduled/requested dates render the SAME instants.
//  I5 Weights    — order gross/tare/net/volume ROLL UP from its lines; stop
//                  weight = Σ of its orders; shipment grossWeight = Σ orders.
//  I6 Status     — shipped orders derive status from the tender outcome
//                  (Accepted→Shipment Planned, Sent→Load Planned, exceptions→
//                  Shipment Failed); unshipped orders keep pre-plan statuses
//                  (Ready For Plan / Draft / Planning Failed / Cancelled).
//  I7 Commodity  — order row commodity = first order line's description;
//                  equipment = the detail order header's equipmentCode.
//  I8 Enrichment — src/data/order-details.json holds ManualOrder-shaped detail
//                  (lines, instructions, services, contacts, references) for a
//                  subset of orders; its line sums equal the row totals and its
//                  instruction/service content equals the shipment detail's.
//  I9 Pending    — a few Orders-only rows have NO orderNumber yet (async
//                  create still processing): orderNumber '' + numeric orderId;
//                  they can never appear on a shipment.
import { faker } from '@faker-js/faker';
import { writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, CHEMICAL_PRODUCTS, locationIdFor } from './data-pools.mjs'

faker.seed(42);

// ── Orders accumulator (I1) ──────────────────────────────────────────────────
// Globally unique customer-prefixed order numbers, shared by shipped and
// unshipped orders so "orderNumber desc" stays a sane newest-first proxy.
let orderSeq = 0;
function genOrderNumber(customer) {
  const prefix = customer.id.replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X');
  return `${prefix}${100000 + orderSeq++}`;
}
const orderRows = [];        // → src/data/orders.json  (OrderListRow shape)
const orderEnrichments = {}; // → src/data/order-details.json (partial ManualOrder by orderNumber)

// Local-naive ISO ("2026-06-15T08:00:00") — the LLD datetime shape; list/view
// mappers string-slice it, so no timezone shifting.
function toIsoLocal(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

const usedSellShipments = new Set();
function genUniqueSellShipment() {
  let v;
  do { v = String(faker.number.int({ min: 25000000, max: 25999999 })); } while (usedSellShipments.has(v));
  usedSellShipments.add(v);
  return v;
}

// ============================================================
// DOMAIN CONSTANTS (from grooming sessions + prototype)
// ============================================================

const ORDER_EQUIPMENT_CODES = ['TL', 'LTL', 'VAN', 'REEFER', 'TANK', 'FLATBED'];
const SPECIAL_SERVICES_POOL = [
  { code: 'LFT',   desc: 'Lift gate' },
  { code: 'PALEXG', desc: 'Pallet Jack' },
  { code: 'PJC',   desc: 'Pallet Exchange' },
  { code: 'INSD',  desc: 'Inside Delivery' },
  { code: 'APPT',  desc: 'Appointment Required' },
];

const MODES = ['TL', 'LTL', 'RR', 'IMD', 'AIR'];
const MODE_WEIGHTS = { TL: 40, LTL: 40, RR: 5, IMD: 5, AIR: 10 };
const RR_CUSTOMERS = ['BASF_CHM_01'];
const TENDER_STATUSES = ['Sent', 'Accepted', 'Declined', 'Cancelled'];
const DOC_TYPES = ['BoL', 'MBoL', 'POD', 'SL', 'Packing List', 'Other'];
const ROUTING_APIS = ['API', 'EDI', 'Email', 'Fax'];
const RESPONSE_METHODS = ['API Update', 'EDI Update', 'Manual Update', 'Automatic Update'];
const ROUTE_GROUPS = ['Primary', 'Backup', 'Spot'];
const PACKAGE_TYPES = ['Boxes', 'Pallets', 'Bags', 'Drums', 'Totes', 'Crates'];
// Unified freight-term vocabulary — same labels the Orders LLD rows and the
// create-order form use, so shipment detail and order rows agree verbatim.
const PAYMENT_TERMS = ['Pre-Paid', 'Collect', 'Third Party'];
const SHIP_DIRECTIONS = ['Outbound', 'Inbound'];
const HAZMAT_CLASSES = ['Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 8', 'Class 9'];
const HAZMAT_GROUPS = ['I', 'II', 'III'];
const PRODUCT_CLASSES = ['Commodity', 'Harmonized', 'NMFC', 'Product Class'];
const TUNNEL_CODES = ['A', 'B', 'C', 'D', 'E'];

const VALIDATION_MESSAGES = {
  'date-issues': ['Pickup date missing', 'Delivery date in the past', 'No delivery date provided', 'Pickup/delivery date conflict'],
  'routing-review': ['No routing guide available', 'All carriers exhausted', 'Route group expired'],
  'tender-issues': ['Tender failed - carrier timeout', 'Tender rejected by system', 'Carrier API error'],
  'tender-review': ['Manual carrier selection required', 'Cost exceeds threshold', 'Preferred carrier unavailable'],
  'bid-review': ['Spot bid expired', 'Multiple bids pending review', 'Bid below minimum rate'],
};

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

const HAZMAT_DESCRIPTIONS = {
  'Class 2': 'Flammable gas',
  'Class 3': 'Flammable liquid',
  'Class 5': 'Oxidizing substance',
  'Class 6': 'Toxic substance',
  'Class 8': 'Corrosive substance',
};

const CHARGE_CODES = [
  { code: 'THC', description: 'Terminal Handling Charge' },
  { code: 'FSC', description: 'Fuel Surcharge' },
  { code: 'SOC', description: 'Stop-Off Charge' },
  { code: 'HZC', description: 'Hazmat Charge' },
  { code: 'ACC', description: 'Accessorial' },
];

const LOAD_CONSTRAINTS = ['Keep Upright', 'No Stacking', 'Temperature Controlled', 'Fragile - Handle With Care', 'Keep Dry', '--'];

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

// avatarUrl: stable per-author dummy portrait (randomuser.me static CDN — deterministic,
// no runtime API call beyond the image fetch). Amy Cook's URL is mirrored by
// CURRENT_USER_AVATAR in src/components/detail/NotesTab.jsx — keep in sync.
const NOTE_AUTHORS = [
  { name: 'Amy Cook', initials: 'AC', css: '', avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { name: 'Jana Dharma', initials: 'JD', css: 'jd', avatarUrl: 'https://randomuser.me/api/portraits/women/68.jpg' },
  { name: 'Lucas Smith', initials: 'LS', css: 'ls', avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { name: 'David Chen', initials: 'DC', css: 'jd', avatarUrl: 'https://randomuser.me/api/portraits/men/75.jpg' },
  { name: 'Sarah Kim', initials: 'SK', css: 'ls', avatarUrl: 'https://randomuser.me/api/portraits/women/17.jpg' },
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

function genLoadId() {
  // CSV example: 23567 — bare number (no LOAD prefix).
  return String(faker.number.int({ min: 200001, max: 299999 }));
}

function genProNumber() {
  // CSV example: 345678 — bare number (no PRO- prefix).
  return String(faker.number.int({ min: 440001, max: 449999 }));
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
  // CSV example: 28826319 — bare 8-digit number (no SHP- prefix). buyShipment is
  // the primary key + per-shipment detail filename; the generator rewrites both.
  const buyShipment = String(faker.number.int({ min: 10000000, max: 99999999 }));
  const sellShipment = genUniqueSellShipment();
  const customer = pick(CUSTOMERS);
  const originLoc = pick(LOCATIONS);
  const destLoc = pick(LOCATIONS.filter(l => l.city !== originLoc.city));
  // Weighted mode selection
  // If customer is not an RR customer, filter out RR from available modes
  const availableModes = RR_CUSTOMERS.includes(customer.id) ? MODES : MODES.filter(m => m !== 'RR');
  const mode = (() => {
    const weights = availableModes.map(m => MODE_WEIGHTS[m]);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = faker.number.int({ min: 1, max: total });
    for (let i = 0; i < availableModes.length; i++) {
      r -= weights[i];
      if (r <= 0) return availableModes[i];
    }
    return availableModes[availableModes.length - 1];
  })();
  const equipmentCode = pick(EQUIPMENT_CODES);
  const carrier = pick(CARRIERS);
  const baseDate = faker.date.between({ from: '2026-01-01', to: '2026-06-30' });
  baseDate.setHours(faker.number.int({ min: 6, max: 16 }), pick([0, 30]), 0, 0);
  const transitDays = faker.number.int({ min: 1, max: 7 });
  const deliveryDate = genDate(baseDate, transitDays);
  // Shared per-shipment facts the order rows must agree with (I2)
  const shipDirection = pick(SHIP_DIRECTIONS);
  const freightTerms = pick(PAYMENT_TERMS);

  // Orders per shipment — business rule: AT MOST 5 orders with a valid id
  // (the badge palette and order tabs assume this cap). The cap is NOT the
  // norm: real freight skews to single-order shipments, consolidations taper
  // off — weighted 1:45% · 2:25% · 3:15% · 4:10% · 5:5%.
  const orderCount = faker.helpers.weightedArrayElement([
    { value: 1, weight: 45 },
    { value: 2, weight: 25 },
    { value: 3, weight: 15 },
    { value: 4, weight: 10 },
    { value: 5, weight: 5 },
  ]);
  const orders = [];
  const packageType = pick(PACKAGE_TYPES); // consistent per shipment

  for (let o = 0; o < orderCount; o++) {
    const orderId = genOrderNumber(customer); // I1 — globally unique, customer-prefixed
    const lineCount = faker.number.int({ min: 1, max: 3 });
    const lines = [];

    for (let l = 0; l < lineCount; l++) {
      const product = pick(CHEMICAL_PRODUCTS);
      const lineWeight = faker.number.int({ min: 1000, max: 15000 });
      const tareWeight = Math.round(lineWeight * 0.2);
      const thirdPartRefDate = genDate(baseDate, faker.number.int({ min: -3, max: 3 }));
      const loadConstraint = pick(LOAD_CONSTRAINTS);
      // SellShipmentOrderLine DTO shape — raw numeric/nullable fields (the mapper formats)
      lines.push({
        orderLineId: `${orderId}-L${l + 1}`,
        lineNumber: String(l + 1).padStart(3, '0'),
        itemCode: product.item,
        itemDescription: product.desc,
        packageCount: faker.number.int({ min: 5, max: 80 }),
        packageType,
        grossWeightValue: lineWeight,
        grossWeightUomCode: 'LB',
        volumeValue: faker.number.int({ min: 20, max: 200 }),
        volumeUomCode: 'cuft',
        hazmatCode: product.hazmat ? product.unNumber : null,
        hazmatClass: product.hazmat ? product.hClass : null,
        hazmatGroup: product.hazmat ? product.hGroup : null,
        hazmatDescription: product.hazmat ? (HAZMAT_DESCRIPTIONS[product.hClass] || product.hClass) : null,
        hazmatUnNumber: product.hazmat ? product.unNumber : null,
        boilingPoint: product.hazmat ? `${faker.number.int({ min: 150, max: 400 })} F` : null,
        marinePollutant: product.hazmat ? (faker.number.int({ min: 1, max: 100 }) <= 30 ? 'Yes' : 'No') : null,
        wgkClass: product.hazmat ? pick(['1', '2', '3']) : null,
        tunnelCode: product.hazmat ? pick(TUNNEL_CODES) : null,
        productClass: pick(PRODUCT_CLASSES),
        shippingClass: String(faker.number.int({ min: 100000, max: 999999 })),
        flashPoint: product.hazmat ? `${faker.number.int({ min: 60, max: 200 })} F` : null,
        countryOfOrigin: 'USA',
        declaredValue: faker.number.int({ min: 2000, max: 50000 }),
        declaredValueCurrency: 'USD',
        thirdPartRef: `S${faker.number.int({ min: 1000, max: 9999 })}`,
        batchLot: `BL-${faker.number.int({ min: 40000, max: 49999 })}`,
        lengthValue: faker.number.int({ min: 2, max: 6 }),
        widthValue: faker.number.int({ min: 2, max: 6 }),
        heightValue: faker.number.int({ min: 2, max: 6 }),
        dimensionsText: `${faker.number.int({ min: 24, max: 96 })}" x ${faker.number.int({ min: 24, max: 48 })}" x ${faker.number.int({ min: 24, max: 72 })}"`,
        loadConstraints: loadConstraint === '--' ? null : loadConstraint,
        toPartnerRef: `TP-${faker.number.int({ min: 10000, max: 99999 })}`,
        thirdPartRefDate: formatShortDate(thirdPartRefDate),
        tareWeightValue: tareWeight,
        netWeightValue: lineWeight - tareWeight,
      });
    }

    // I5 — order totals ROLL UP from the lines (never independent randoms)
    const orderGross = lines.reduce((s, l) => s + l.grossWeightValue, 0);
    const orderTare = lines.reduce((s, l) => s + l.tareWeightValue, 0);
    const orderVolume = lines.reduce((s, l) => s + l.volumeValue, 0);
    const orderPackages = lines.reduce((s, l) => s + l.packageCount, 0);
    orders.push({ orderId, lineCount, lines, orderGross, orderTare, orderVolume, orderPackages });
  }

  // I5 — shipment gross weight = Σ of its orders' gross weights
  const grossWeight = orders.reduce((s, o) => s + o.orderGross, 0);
  const totalVolume = orders.reduce((s, o) => s + o.orderVolume, 0);

  // Stops
  // TL can have multi-stop; LTL, RR, IMD, AIR are always 1 pickup + 1 delivery (2 stops total)
  const pickupStopCount = Math.min(orders.length, mode === 'TL' ? faker.number.int({ min: 1, max: 2 }) : 1);
  // I3 — each order is assigned to exactly one pickup stop (contiguous chunks)
  const chunkSize = Math.ceil(orders.length / pickupStopCount);
  orders.forEach((o, oi) => { o.pickupStopIdx = Math.min(Math.floor(oi / chunkSize), pickupStopCount - 1); });
  const stopLocs = [];
  const stops = [];
  for (let s = 0; s < pickupStopCount; s++) {
    const stopLoc = s === 0 ? originLoc : pick(LOCATIONS.filter(l => l.city !== originLoc.city && l.city !== destLoc.city));
    stopLocs.push(stopLoc);
    const stopOrders = orders.filter(o => o.pickupStopIdx === s);
    // SellShipmentStop DTO shape — raw fields (the mapper builds location/weight strings)
    stops.push({
      stopSequence: s + 1,
      stopType: 'pickup',
      orderIds: stopOrders.map(o => o.orderId),
      facilityName: stopLoc.facility,
      address1: faker.location.streetAddress(),
      city: stopLoc.city,
      region: stopLoc.state,
      postal: stopLoc.zip,
      country: 'US',
      scheduledDateTime: `${formatDate(baseDate)} ${String(baseDate.getHours()).padStart(2, '0')}:00 CST`,
      appointmentTime: `${String(baseDate.getHours()).padStart(2, '0')}:00 CST`,
      // I5 — stop weight/volume/packages = Σ of the orders picked up here
      grossWeightValue: stopOrders.reduce((t, o) => t + o.orderGross, 0),
      grossWeightUomCode: 'LB',
      volumeValue: stopOrders.reduce((t, o) => t + o.orderVolume, 0),
      volumeUomCode: 'cuft',
      packageCount: stopOrders.reduce((t, o) => t + o.orderPackages, 0),
      pickupNumber: faker.datatype.boolean() ? `PU-${faker.number.int({ min: 100000, max: 999999 })}` : null,
    });
  }
  stops.push({
    stopSequence: pickupStopCount + 1,
    stopType: 'delivery',
    orderIds: orders.map(o => o.orderId),
    facilityName: destLoc.facility,
    address1: faker.location.streetAddress(),
    city: destLoc.city,
    region: destLoc.state,
    postal: destLoc.zip,
    country: 'US',
    scheduledDateTime: `${formatDate(deliveryDate)} ${String(deliveryDate.getHours()).padStart(2, '0')}:00 CST`,
    appointmentTime: `${String(deliveryDate.getHours()).padStart(2, '0')}:00 CST`,
    grossWeightValue: grossWeight,
    grossWeightUomCode: 'LB',
    volumeValue: totalVolume,
    volumeUomCode: 'cuft',
    packageCount: null,
    pickupNumber: null,
  });

  const distance = faker.number.float({ min: 50, max: 2000, fractionDigits: 2 });

  // Routing options (3-6) — sequential tendering logic
  const routingCount = faker.number.int({ min: 3, max: 6 });
  const routingCarriers = faker.helpers.arrayElements(CARRIERS, routingCount);

  // Determine tendering scenario
  const scenarioRoll = faker.number.float({ min: 0, max: 1 });
  const tenderCompleted = scenarioRoll < 0.55;    // 55% → Accepted → Monitoring
  const tenderInProgress = scenarioRoll >= 0.55 && scenarioRoll < 0.70;  // 15% → Sent → Monitoring
  const tenderFailed = scenarioRoll >= 0.70;       // 30% → All failed → Exceptions
  // Pick which rank is the "decisive" carrier (accepted or currently sent) — not used for tenderFailed
  const decisiveRank = tenderFailed ? null : faker.number.int({ min: 1, max: routingCount }); // 1-based

  // Route ranks: unique per carrier, shuffled so routeRank !== rank
  const routeRanks = faker.helpers.shuffle(Array.from({ length: routingCount }, (_, i) => i + 1));

  const routingOptions = routingCarriers.map((rc, ri) => {
    const rank = ri + 1;
    let status;
    if (tenderFailed) {
      // Scenario C: all carriers failed — no Accepted, no Sent, no null
      status = pick(['Declined', 'Cancelled']);
    } else if (tenderCompleted) {
      // Scenario A: someone accepted
      if (rank < decisiveRank) status = pick(['Declined', 'Cancelled']);
      else if (rank === decisiveRank) status = 'Accepted';
      else status = null; // never tendered
    } else {
      // Scenario B: tender in progress
      if (rank < decisiveRank) status = pick(['Declined', 'Cancelled']);
      else if (rank === decisiveRank) status = 'Sent';
      else status = null; // never tendered
    }

    const isAccepted = status === 'Accepted';
    const wasTendered = status !== null;
    const baseRate = faker.number.float({ min: 200, max: 2000, fractionDigits: 2 });
    const pickupHour = faker.number.int({ min: 6, max: 16 });
    const delivHour = faker.number.int({ min: 6, max: 22 });
    // Volume commitment: pre-compute so vcOpen + vcAccept + vcDecline === commitment
    const _commitment = faker.number.int({ min: 1, max: 20 });
    const _vcOpen = faker.number.int({ min: 0, max: _commitment });
    const _vcAccept = faker.number.int({ min: 0, max: _commitment - _vcOpen });
    const _vcDecline = _commitment - _vcOpen - _vcAccept;

    // Rate details per carrier
    const _baseRate = faker.number.float({ min: 200, max: 2000, fractionDigits: 2 });
    const _markup = faker.number.float({ min: 50, max: 400, fractionDigits: 2 });
    const _numCharges = faker.number.int({ min: 0, max: 3 });
    const _additionalCharges = faker.helpers.arrayElements(CHARGE_CODES, _numCharges).map(cc => ({
      code: cc.code,
      description: cc.description,
      amount: faker.number.float({ min: 50, max: 500, fractionDigits: 2 }),
      currency: 'USD',
    }));
    const _chargeTotal = _additionalCharges.reduce((s, c) => s + c.amount, 0);
    const _apTotal = Math.round((_baseRate + _chargeTotal) * 100) / 100;
    const _arTotal = Math.round((_baseRate + _markup + _chargeTotal) * 100) / 100;

    return {
      rank,
      routeRank: routeRanks[ri],
      scac: rc.scac,
      carrierName: rc.name,
      equipmentCode: pick(EQUIPMENT_CODES),
      rateAmount: baseRate,
      rateCurrency: 'USD',
      totalCostAmount: _apTotal,
      totalCostCurrency: 'USD',
      rateDetails: {
        baseRate: _baseRate,
        currency: 'USD',
        markup: _markup,
        additionalCharges: _additionalCharges,
        apTotal: _apTotal,
        arTotal: _arTotal,
      },
      status,
      pickupDateTime: formatDateTime(baseDate),
      pickupTZ: 'CST',
      pickupOrgHours: `${String(pickupHour).padStart(2, '0')}:00 - ${String(pickupHour + faker.number.int({ min: 6, max: 10 })).padStart(2, '0')}:30`,
      pickupOrgDay: pick(['Yes', 'No']),
      deliveryDateTime: formatDateTime(genDate(baseDate, faker.number.int({ min: 1, max: 5 }))),
      deliveryOrgHours: `${String(delivHour - 6).padStart(2, '0')}:00 - ${String(delivHour).padStart(2, '0')}:59`,
      deliveryTZ: 'CST',
      transitDays: faker.number.int({ min: 1, max: 5 }),
      distanceMiles: faker.number.float({ min: 100, max: 1500, fractionDigits: 2 }),
      serviceLevel: `${faker.number.int({ min: 85, max: 99 })}%`,
      linehaul: pick(['Completed', 'In Progress', 'Pending']),
      routeGroup: pick(ROUTE_GROUPS),
      apiSource: pick(ROUTING_APIS),
      notifyDateTime: wasTendered ? formatDateTime(genDate(baseDate, -1)) : null,
      responseMethod: wasTendered ? pick(RESPONSE_METHODS) : null,
      responseDateTime: isAccepted ? formatDateTime(genDate(baseDate, 0)) : null,
      carrierPickup: isAccepted ? `${faker.string.alphanumeric(3).toUpperCase()}${faker.number.int({ min: 10000, max: 99999 })}` : null,
      deliveryNum: isAccepted ? `${faker.string.alphanumeric(3).toUpperCase()}${faker.number.int({ min: 10000, max: 99999 })}` : null,
      transitTimeSource: 'SMC',
      description: faker.lorem.words({ min: 2, max: 4 }),

      // --- Routing Options tab (3 new) ---
      responseUser: wasTendered ? faker.person.fullName() : null,
      carrierQuoted: pick(['Yes', 'No']),
      networkLeverage: `${faker.number.int({ min: 0, max: 35 })}%`,

      // --- Notify & Response tab (3 new) ---
      proNumber: isAccepted ? `PRO-${faker.string.numeric(8)}` : null,
      transportingCarrier: faker.number.float({ min: 0, max: 1 }) < 0.7 ? rc.name : faker.company.name(),
      equipNumber: `EQ-${faker.string.alphanumeric(6).toUpperCase()}`,

      // --- Volume Commitment tab (6 new) ---
      commitment: _commitment,
      uom: pick(['Loads/Week', 'Loads/Month']),
      vcEquipNumber: `EQ-${faker.string.alphanumeric(6).toUpperCase()}`,
      vcOpen: _vcOpen,
      vcAccept: _vcAccept,
      vcDecline: _vcDecline,

      // --- Additional Info tab (8 new) ---
      carrierApiTenderId: faker.string.uuid(),
      breakPoint: faker.number.float({ min: 0, max: 1 }) < 0.8 ? faker.location.city() : 'Direct',
      rateSource: pick(['Contract', 'Spot', 'Benchmark', 'Historical']),
      distanceSource: pick(['PC Miler', 'Google Maps', 'ALK', 'Manual']),
      transitTimeId: `TT-${faker.string.alphanumeric(8).toUpperCase()}`,
      loadboardExpiry: faker.number.float({ min: 0, max: 1 }) < 0.7 ? formatDateTime(genDate(baseDate, faker.number.int({ min: 5, max: 30 }))) : null,
      rcpId: `RCP-${faker.string.alphanumeric(6).toUpperCase()}`,
      lcePkId: faker.number.int({ min: 100000, max: 999999 }),

      // --- Others tab (8 new) ---
      modifyUser: faker.person.fullName(),
      modifyDate: formatDateTime(genDate(baseDate, faker.number.int({ min: -10, max: 0 }))),
      indirectPoint: faker.number.float({ min: 0, max: 1 }) < 0.6 ? faker.location.city() : 'N/A',
      roundTrip: pick(['Yes', 'No']),
      customerPreferred: pick(['Yes', 'No']),
      orderEquip: pick(EQUIPMENT_CODES),
      contactExped: `${faker.person.fullName()} ${faker.phone.number()}`,
      note: faker.number.float({ min: 0, max: 1 }) < 0.5 ? faker.lorem.sentence() : null,
    };
  });

  // Derive tender status and shipment status from routing options
  const routingStatuses = routingOptions.map(r => r.status).filter(Boolean);
  const hasAccepted = routingStatuses.includes('Accepted');
  const hasSent = routingStatuses.includes('Sent');
  // tenderStatus = the status of the "active" routing option (accepted or sent carrier)
  const tenderStatus = hasAccepted ? 'Accepted' : hasSent ? 'Sent' : (routingStatuses.length > 0 ? routingStatuses[0] : 'Sent');
  // shipmentStatus derived from tender statuses
  const shipmentStatus = hasAccepted ? 'Done' : hasSent ? '' : 'Review';

  // Panel and category derived from tender outcome
  const panel = (hasAccepted || hasSent) ? 'monitoring' : 'exceptions';
  const category = panel === 'exceptions'
    ? weightedPick(CATEGORY_WEIGHTS.exceptions.items, CATEGORY_WEIGHTS.exceptions.weights)
    : weightedPick(CATEGORY_WEIGHTS.monitoring.items, CATEGORY_WEIGHTS.monitoring.weights);
  const validationMessage = (panel === 'exceptions' && category)
    ? pick(VALIDATION_MESSAGES[category])
    : null;

  // Use accepted carrier's rateDetails as base for cost allocation when available
  const acceptedOption = routingOptions.find(o => o.status === 'Accepted');

  // Cost allocation
  const apBase = acceptedOption
    ? acceptedOption.rateDetails.baseRate
    : faker.number.float({ min: 500, max: 5000, fractionDigits: 2 });
  const apFuel = Math.round(apBase * faker.number.float({ min: 0.25, max: 0.45, fractionDigits: 2 }) * 100) / 100;
  const apDiscount = faker.datatype.boolean() ? Math.round(apBase * faker.number.float({ min: 0.03, max: 0.1, fractionDigits: 2 }) * 100) / 100 : 0;
  const apAccessorials = faker.datatype.boolean() ? faker.number.float({ min: 50, max: 400, fractionDigits: 2 }) : 0;
  const apTotal = apBase + apFuel - apDiscount + apAccessorials;
  const marginPct = faker.number.float({ min: 0.18, max: 0.35, fractionDigits: 2 });
  // AR breakdown: apply margin to each component individually
  const arBase = Math.round(apBase * (1 + marginPct) * 100) / 100;
  const arFuel = Math.round(apFuel * (1 + marginPct) * 100) / 100;
  const arDiscount = Math.round(apDiscount * (1 + marginPct) * 100) / 100;
  const arTotal = Math.round((arBase + arFuel - arDiscount + Math.round(apAccessorials * (1 + marginPct) * 100) / 100) * 100) / 100;
  const marginAmt = Math.round((arTotal - apTotal) * 100) / 100;

  // Generate random weight shares that sum to 1.0 (simulates weight-based distribution)
  const rawShares = orders.map(() => faker.number.float({ min: 0.1, max: 1.0 }));
  const shareTotal = rawShares.reduce((a, b) => a + b, 0);
  const shares = rawShares.map(s => s / shareTotal);

  // Generate HZC/SOC at shipment level so they can be distributed by weight
  const shipApHzc = faker.datatype.boolean() ? faker.number.float({ min: 30, max: 150, fractionDigits: 2 }) : 0;
  const shipApSoc = faker.datatype.boolean() ? faker.number.float({ min: 20, max: 120, fractionDigits: 2 }) : 0;
  const shipArHzc = shipApHzc > 0 ? Math.round(shipApHzc * (1 + marginPct) * 100) / 100 : 0;
  const shipArSoc = shipApSoc > 0 ? Math.round(shipApSoc * (1 + marginPct) * 100) / 100 : 0;

  const costOrders = orders.map((ord, oi) => {
    const share = shares[oi];
    const isLast = oi === orders.length - 1;

    // For the last order, adjust to ensure exact totals (handle rounding)
    let ordApBase, ordApFuel, ordApDiscount, ordApTotal;
    let ordArBase, ordArFuel, ordArDiscount, ordArTotal;
    let ordApHzc, ordApSoc, ordArHzc, ordArSoc;

    if (!isLast) {
      ordApBase = Math.round(apBase * share * 100) / 100;
      ordApFuel = Math.round(apFuel * share * 100) / 100;
      ordApDiscount = Math.round(apDiscount * share * 100) / 100;
      ordApTotal = Math.round(apTotal * share * 100) / 100;
      ordArBase = Math.round(arBase * share * 100) / 100;
      ordArFuel = Math.round(arFuel * share * 100) / 100;
      ordArDiscount = Math.round(arDiscount * share * 100) / 100;
      ordArTotal = Math.round(arTotal * share * 100) / 100;
      ordApHzc = Math.round(shipApHzc * share * 100) / 100;
      ordApSoc = Math.round(shipApSoc * share * 100) / 100;
      ordArHzc = Math.round(shipArHzc * share * 100) / 100;
      ordArSoc = Math.round(shipArSoc * share * 100) / 100;
    } else {
      // Last order gets the remainder to avoid rounding drift
      const prevApBase = orders.slice(0, -1).reduce((s, _, j) => s + Math.round(apBase * shares[j] * 100) / 100, 0);
      const prevApFuel = orders.slice(0, -1).reduce((s, _, j) => s + Math.round(apFuel * shares[j] * 100) / 100, 0);
      const prevApDiscount = orders.slice(0, -1).reduce((s, _, j) => s + Math.round(apDiscount * shares[j] * 100) / 100, 0);
      const prevApTotal = orders.slice(0, -1).reduce((s, _, j) => s + Math.round(apTotal * shares[j] * 100) / 100, 0);
      const prevArBase = orders.slice(0, -1).reduce((s, _, j) => s + Math.round(arBase * shares[j] * 100) / 100, 0);
      const prevArFuel = orders.slice(0, -1).reduce((s, _, j) => s + Math.round(arFuel * shares[j] * 100) / 100, 0);
      const prevArDiscount = orders.slice(0, -1).reduce((s, _, j) => s + Math.round(arDiscount * shares[j] * 100) / 100, 0);
      const prevArTotal = orders.slice(0, -1).reduce((s, _, j) => s + Math.round(arTotal * shares[j] * 100) / 100, 0);
      const prevApHzc = orders.slice(0, -1).reduce((s, _, j) => s + Math.round(shipApHzc * shares[j] * 100) / 100, 0);
      const prevApSoc = orders.slice(0, -1).reduce((s, _, j) => s + Math.round(shipApSoc * shares[j] * 100) / 100, 0);
      const prevArHzc = orders.slice(0, -1).reduce((s, _, j) => s + Math.round(shipArHzc * shares[j] * 100) / 100, 0);
      const prevArSoc = orders.slice(0, -1).reduce((s, _, j) => s + Math.round(shipArSoc * shares[j] * 100) / 100, 0);

      ordApBase = Math.round((apBase - prevApBase) * 100) / 100;
      ordApFuel = Math.round((apFuel - prevApFuel) * 100) / 100;
      ordApDiscount = Math.round((apDiscount - prevApDiscount) * 100) / 100;
      ordApTotal = Math.round((apTotal - prevApTotal) * 100) / 100;
      ordArBase = Math.round((arBase - prevArBase) * 100) / 100;
      ordArFuel = Math.round((arFuel - prevArFuel) * 100) / 100;
      ordArDiscount = Math.round((arDiscount - prevArDiscount) * 100) / 100;
      ordArTotal = Math.round((arTotal - prevArTotal) * 100) / 100;
      ordApHzc = Math.round((shipApHzc - prevApHzc) * 100) / 100;
      ordApSoc = Math.round((shipApSoc - prevApSoc) * 100) / 100;
      ordArHzc = Math.round((shipArHzc - prevArHzc) * 100) / 100;
      ordArSoc = Math.round((shipArSoc - prevArSoc) * 100) / 100;
    }

    // Direct cost is independent per order
    const ordDirectCost = Math.round(ordApTotal * faker.number.float({ min: 1.05, max: 1.25, fractionDigits: 2 }) * 100) / 100;

    // SellShipmentOrderCost DTO shape — raw numeric amounts (the mapper formats + degrades)
    return {
      orderId: ord.orderId,
      cost: {
        apBaseAmount: ordApBase,
        apFuelAmount: ordApFuel,
        apDiscountAmount: ordApDiscount,
        apHzcAmount: ordApHzc,
        apSocAmount: ordApSoc,
        apTotalAmount: ordApTotal,
        arBaseAmount: ordArBase,
        arFuelAmount: ordArFuel,
        arDiscountAmount: ordArDiscount,
        arHzcAmount: ordArHzc,
        arSocAmount: ordArSoc,
        arTotalAmount: ordArTotal,
        directCostAmount: ordDirectCost,
      },
    };
  });

  // Instructions
  const instrOrders = orders.map(ord => {
    const instrCount = faker.number.int({ min: 1, max: 4 });
    const templates = faker.helpers.arrayElements(INSTRUCTION_TEMPLATES, instrCount);
    return {
      orderId: ord.orderId,
      instructionList: templates.map((t, i) => ({
        sequenceNumber: i + 1,
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
      createdAt: faker.date.recent({ days: 90 }).toISOString(),
      fileSize: faker.number.int({ min: 8, max: 2048 }), // KB
    });
  }

  // History / Audit entries
  const HISTORY_USERS = ['Jana Soundararajan', 'David Johns', 'Sarah Chen', 'Mike Rodriguez', 'Emily Park', 'Alex Kumar'];
  const HISTORY_ACTIONS = [
    { action: 'Order Created', category: 'create' },
    { action: 'Shipment Created', category: 'create' },
    { action: 'Load Assigned', category: 'update' },
    { action: 'Tender Sent', category: 'tender' },
    { action: 'Tender Accepted', category: 'tender' },
    { action: 'Tender Declined', category: 'tender' },
    { action: 'Carrier Updated', category: 'update' },
    { action: 'Schedule Updated', category: 'update' },
    { action: 'Route Changed', category: 'update' },
    { action: 'Cost Updated', category: 'update' },
    { action: 'Document Uploaded', category: 'update' },
    { action: 'Status Changed', category: 'update' },
    { action: 'PGI Completed', category: 'completion' },
    { action: 'PGR Completed', category: 'completion' },
  ];

  const historyEntryCount = faker.number.int({ min: 5, max: 12 });
  const historyEntries = [];
  // Generate timestamps spread over last 30 days
  const historyTimestamps = [];
  for (let h = 0; h < historyEntryCount; h++) {
    const daysAgo = faker.number.float({ min: 0, max: 30, fractionDigits: 4 });
    const ts = new Date(baseDate);
    ts.setDate(ts.getDate() - daysAgo);
    ts.setHours(faker.number.int({ min: 6, max: 20 }), faker.number.int({ min: 0, max: 59 }), faker.number.int({ min: 0, max: 59 }));
    historyTimestamps.push(ts);
  }
  // Sort newest first
  historyTimestamps.sort((a, b) => b - a);

  for (let h = 0; h < historyEntryCount; h++) {
    const user = pick(HISTORY_USERS);
    const actionObj = pick(HISTORY_ACTIONS);
    const ts = historyTimestamps[h];
    let details = '';
    let field = undefined;
    let oldValue = undefined;
    let newValue = undefined;

    switch (actionObj.action) {
      case 'Order Created':
        details = `Order ${orders[0].orderId} created for ${customer.name}`;
        break;
      case 'Shipment Created':
        details = `Shipment ${buyShipment} created with ${orderCount} order(s)`;
        break;
      case 'Load Assigned':
        details = `Load ${genLoadId()} assigned to shipment`;
        break;
      case 'Tender Sent': {
        const tCarrier = pick(CARRIERS);
        details = `Tendered to ${tCarrier.name} at $${fmt(faker.number.float({ min: 800, max: 5000, fractionDigits: 2 }))}`;
        break;
      }
      case 'Tender Accepted': {
        const tCarrier = pick(CARRIERS);
        details = `${tCarrier.name} accepted tender`;
        break;
      }
      case 'Tender Declined': {
        const tCarrier = pick(CARRIERS);
        details = `${tCarrier.name} declined tender — capacity unavailable`;
        break;
      }
      case 'Carrier Updated': {
        const oldCarrier = pick(CARRIERS);
        const newCarrier = pick(CARRIERS.filter(c => c.scac !== oldCarrier.scac));
        details = `Carrier changed from ${oldCarrier.name} to ${newCarrier.name}`;
        field = 'carrier';
        oldValue = oldCarrier.name;
        newValue = newCarrier.name;
        break;
      }
      case 'Schedule Updated': {
        const oldDate = formatShortDate(genDate(baseDate, -faker.number.int({ min: 1, max: 5 })));
        const newDate2 = formatShortDate(genDate(baseDate, faker.number.int({ min: 0, max: 3 })));
        details = `Pickup date rescheduled`;
        field = 'pickupDate';
        oldValue = oldDate;
        newValue = newDate2;
        break;
      }
      case 'Route Changed':
        details = `Route updated — new transit via ${pick(LOCATIONS).city}, ${pick(LOCATIONS).state}`;
        field = 'route';
        oldValue = `${pick(LOCATIONS).city} direct`;
        newValue = `Via ${pick(LOCATIONS).city}`;
        break;
      case 'Cost Updated': {
        const oldCost = fmt(faker.number.float({ min: 500, max: 4000, fractionDigits: 2 }));
        const newCost = fmt(faker.number.float({ min: 500, max: 4000, fractionDigits: 2 }));
        details = `AP cost adjusted`;
        field = 'apCost';
        oldValue = `$${oldCost}`;
        newValue = `$${newCost}`;
        break;
      }
      case 'Document Uploaded': {
        const docType = pick(DOC_TYPES);
        details = `${docType} document uploaded`;
        break;
      }
      case 'Status Changed': {
        const statusValues = ['Review', 'Done'];
        const oldStatus = pick(statusValues);
        const newStatus2 = pick(statusValues.filter(s => s !== oldStatus));
        details = `Shipment status changed`;
        field = 'status';
        oldValue = oldStatus;
        newValue = newStatus2;
        break;
      }
      case 'PGI Completed':
        details = `Post Goods Issue completed for ${orders.length} order(s)`;
        break;
      case 'PGR Completed':
        details = `Post Goods Receipt confirmed at ${destLoc.facility}`;
        break;
    }

    const entry = {
      user,
      timestamp: ts.toISOString(),
      action: actionObj.action,
      category: actionObj.category,
      details,
    };
    if (field) entry.field = field;
    if (oldValue !== undefined) entry.oldValue = oldValue;
    if (newValue !== undefined) entry.newValue = newValue;

    historyEntries.push(entry);
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
      avatarUrl: author.avatarUrl,
      date: formatDateTime(noteDate),
      body: fillTemplate(pick(NOTE_TEMPLATES), null),
    });
  }
  notes.sort((a, b) => new Date(b.date) - new Date(a.date));

  // SellShipmentOrder headers — one raw-DTO order header per order (the mapper formats).
  // The Order tab maps at "core fidelity": fields not present here (orderDate, shipmentMode,
  // serviceLevel, salesOrder, etc.) degrade to '--' in the mapper, matching the real contract.
  const orderHeaders = orders.map((ord) => {
    // I5 — header weights are the line roll-ups computed above
    const orderGrossWeight = ord.orderGross;
    const orderTareWeight = ord.orderTare;
    const orderTotalWeight = orderGrossWeight - orderTareWeight;
    const orderVolume = ord.orderVolume;
    // I3 — ship-from = the pickup stop this order is assigned to; ship-to =
    // the shipment's delivery stop. I2 — the order belongs to the shipment's
    // customer, never a random one.
    const shipFromLoc = stopLocs[ord.pickupStopIdx];
    const shipToLoc = destLoc;
    const shipFromCustomer = customer;

    // I4 — pickup window CONTAINS the shipment pickup instant (baseDate);
    // delivery window CONTAINS the shipment delivery instant (deliveryDate).
    const orderPickupBase = new Date(baseDate);
    orderPickupBase.setHours(baseDate.getHours() - faker.number.int({ min: 1, max: 5 }), pick([0, 15, 30, 45]), 0, 0);
    const orderPickupLate = new Date(baseDate);
    orderPickupLate.setHours(baseDate.getHours() + faker.number.int({ min: 2, max: 8 }), pick([0, 30]), 0, 0);

    const orderDeliveryEarly = new Date(deliveryDate);
    orderDeliveryEarly.setHours(deliveryDate.getHours() - faker.number.int({ min: 1, max: 4 }), pick([0, 15, 30, 45]), 0, 0);
    const orderDeliveryLate = new Date(deliveryDate.getTime() + faker.number.int({ min: 4, max: 24 }) * 60 * 60 * 1000);
    // Stash the window instants for the orders.json row emission (same facts)
    ord.window = {
      earliestPickup: orderPickupBase,
      latestPickup: orderPickupLate,
      earliestDelivery: orderDeliveryEarly,
      latestDelivery: orderDeliveryLate,
    };
    ord.shipFromLocIdx = LOCATIONS.indexOf(shipFromLoc);
    ord.shipToLocIdx = LOCATIONS.indexOf(shipToLoc);

    // New order-level fields (decision 11 / W1-B)
    const orderEquipCode = pick(ORDER_EQUIPMENT_CODES);
    const orderEquipRef = faker.number.float({ min: 0, max: 1 }) < 0.25
      ? `TANK-${faker.number.int({ min: 1000, max: 9999 })}`
      : null;
    const orderCarrier = faker.number.float({ min: 0, max: 1 }) < 0.20
      ? pick(CARRIERS).scac
      : null;
    const orderPickupNumber = faker.number.float({ min: 0, max: 1 }) < 0.60
      ? `PU-${faker.number.int({ min: 100000, max: 999999 })}`
      : null;
    const orderHasSpecial = faker.number.float({ min: 0, max: 1 }) < 0.40;
    const orderSpecialServices = orderHasSpecial
      ? faker.helpers.arrayElements(SPECIAL_SERVICES_POOL, faker.number.int({ min: 1, max: 3 }))
      : [];

    return {
      orderId: ord.orderId,
      orderNumber: ord.orderId,
      customerId: shipFromCustomer.id,
      owningOrganization: shipFromCustomer.name,
      consolidatable: faker.number.float({ min: 0, max: 1 }) < 0.70,
      equipmentCode: orderEquipCode,
      equipmentReferenceNumber: orderEquipRef,
      customerRequiredCarrier: orderCarrier,
      pickupNumber: orderPickupNumber,
      specialServices: orderSpecialServices,
      poNumber: `PO-${faker.number.int({ min: 100000, max: 999999 })}`,
      bolNo: `BOL-${faker.number.int({ min: 100000, max: 999999 })}`,
      shipDirectionCode: shipDirection === 'Outbound' ? 'O' : 'I', // I2 — matches the shipment + order row
      origin: {
        externalIdentifier: shipFromLoc.facility,
        fullName: shipFromCustomer.name,
        address1: faker.location.streetAddress(),
        address2: faker.number.float({ min: 0, max: 1 }) < 0.30 ? faker.location.secondaryAddress() : undefined,
        city: shipFromLoc.city,
        region: shipFromLoc.state,
        postal: shipFromLoc.zip,
        country: 'US',
        contactName: faker.person.fullName(),
        phone: faker.phone.number({ style: 'international' }),
        email: faker.internet.email(),
      },
      destination: {
        externalIdentifier: shipToLoc.facility,
        fullName: shipToLoc.facility,
        address1: faker.location.streetAddress(),
        address2: faker.number.float({ min: 0, max: 1 }) < 0.30 ? faker.location.secondaryAddress() : undefined,
        city: shipToLoc.city,
        region: shipToLoc.state,
        postal: shipToLoc.zip,
        country: 'US',
        contactName: faker.person.fullName(),
        phone: faker.phone.number({ style: 'international' }),
        email: faker.internet.email(),
      },
      scheduledShipDate: formatDateTime(orderPickupBase),
      requestedShipDate: formatDateTime(orderPickupLate),
      scheduledDeliveryDate: formatDateTime(orderDeliveryEarly),
      requestedDeliveryDate: formatDateTime(orderDeliveryLate),
      pickupAppointment: faker.datatype.boolean(0.3) ? `${String(orderPickupBase.getHours()).padStart(2, '0')}:00 CST` : null,
      deliveryAppointment: faker.datatype.boolean(0.2) ? `${String(orderDeliveryEarly.getHours()).padStart(2, '0')}:00 CST` : null,
      grossWeightValue: orderGrossWeight,
      grossWeightUomCode: 'LB',
      tareWeightValue: orderTareWeight,
      netWeightValue: orderTotalWeight,
      volumeValue: orderVolume,
      volumeUomCode: 'cuft',
    };
  });

  // Assemble the SellShipmentOrder list — merge header + lines + instructions + cost by index
  const orderList = orders.map((ord, oi) => ({
    ...orderHeaders[oi],
    orderLines: ord.lines,
    instructionList: instrOrders[oi].instructionList,
    cost: costOrders[oi].cost,
  }));

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
    panel,
    category,
    validationMessage,
    grossWeight: String(grossWeight),
    load: String(faker.number.int({ min: 10000, max: 99999 })),
    loadCount: String(orders.reduce((s, o) => s + o.lineCount, 0)),
    orderCount: String(orderCount),
    apFreightCost: fmt(apTotal),
  };

  // Detail = the SellShipmentOut DTO (raw contract shape). The app's mock service path
  // runs this through mapSellShipmentOutToDetail to build the view-model the tabs consume.
  // Documents/Notes/History have no API in the real contract yet, so they are NOT emitted
  // here — those tabs degrade to empty until their endpoints exist.
  const detail = {
    shipmentId: sellShipment,
    shipmentType: 'sell',
    customerId: customer.id,
    customerName: customer.name,
    shipDirection,
    freightTerms,
    incotermInfo: pick(['FOB', 'CIF', 'EXW', 'DDP', 'FCA']),
    numberOfStops: stops.length,
    pgiFlag: faker.datatype.boolean(),
    ratingStatus: pick(['Rated', 'Not Rated', 'Pending']),
    distanceMiles: parseFloat(distance.toFixed(2)),
    totalVolumeValue: totalVolume, // I5 — Σ order volumes
    totalVolumeUomCode: 'cuft',
    acceptedCarrierLabel: acceptedOption ? `${acceptedOption.scac} - ${mode}` : `${carrier.scac} - ${mode}`,
    seedEquipment: equipmentCode,
    utilizationPercent: faker.number.int({ min: 50, max: 100 }),
    costSummary: {
      apBaseAmount: apBase,
      apFuelAmount: apFuel,
      apDiscountAmount: apDiscount,
      apAccessorialsAmount: apAccessorials,
      apTotalAmount: apTotal,
      arTotalAmount: arTotal,
      marginAmount: marginAmt,
      marginPercent: parseFloat((marginPct * 100).toFixed(1)),
    },
    orderList,
    shipmentStopList: stops,
    shippingOptionList: routingOptions,
    documentList: documents,
    noteList: notes,
    historyList: historyEntries,
  };

  // ── Orders-side emission (I1–I8): every order this shipment carries becomes
  // an orders.json row with the SAME id, customer, locations, dates, weights.
  const orderStatusLabel = hasAccepted ? 'Shipment Planned' : hasSent ? 'Load Planned' : 'Shipment Failed'; // I6
  orders.forEach((ord, oi) => {
    const h = orderHeaders[oi];
    const w = ord.window;
    const from = LOCATIONS[ord.shipFromLocIdx];
    const to = LOCATIONS[ord.shipToLocIdx];
    orderRows.push({
      orderNumber: ord.orderId,
      orderSource: faker.number.float({ min: 0, max: 1 }) < 0.85 ? 'INTEGRATED' : 'MANUAL',
      customer: customer.id, // I2
      shipDirection,
      freightTerms,
      equipment: h.equipmentCode, // I7
      consignor: {
        locationId: locationIdFor(from, ord.shipFromLocIdx),
        city: from.city, state: from.state, country: 'US',
        earliestPickupDateTime: toIsoLocal(w.earliestPickup),
        latestPickupDateTime: toIsoLocal(w.latestPickup),
      },
      consignee: {
        locationId: locationIdFor(to, ord.shipToLocIdx),
        city: to.city, state: to.state, country: 'US',
        earliestDeliveryDateTime: toIsoLocal(w.earliestDelivery),
        latestDeliveryDateTime: toIsoLocal(w.latestDelivery),
      },
      grossWeight: { value: ord.orderGross, uom: 'lbs' }, // I5
      volume: { value: ord.orderVolume, uom: 'cbf' },
      commodity: ord.lines[0].itemDescription, // I7
      orderStatus: orderStatusLabel,
    });
    // I8 — a subset of shipped orders gets full ManualOrder enrichment so the
    // Order Summary shows the SAME lines/instructions/services as the shipment
    // detail; the rest resolve through the lean row (consistent aggregates).
    if (faker.number.float({ min: 0, max: 1 }) < 0.25) {
      orderEnrichments[ord.orderId] = buildOrderEnrichment({
        orderNumber: ord.orderId,
        customer, freightTerms, shipDirection,
        header: h, lines: ord.lines, window: w,
        instructionList: instrOrders[oi].instructionList,
        fromIdx: ord.shipFromLocIdx, toIdx: ord.shipToLocIdx,
      });
    }
  });

  return { mainRow, detail };
}

// ManualOrder-shaped enrichment (the /order/view DTO subset) derived from the
// SAME header/lines/instructions objects the shipment detail embeds (I8).
function buildOrderEnrichment({ orderNumber, customer, freightTerms, shipDirection, header, lines, window: w, instructionList, fromIdx, toIdx }) {
  const from = LOCATIONS[fromIdx];
  const to = LOCATIONS[toIdx];
  return {
    orderNumber,
    customerId: customer.id,
    freightTermCode: freightTerms,
    shipDirectionCode: shipDirection,
    pickupNumber: header.pickupNumber ?? undefined,
    poNumber: header.poNumber ?? undefined,
    requestedDateType: 'SHIP',
    requestedPickupDate: toIsoLocal(w.earliestPickup), requestedPickupTimeZoneCode: 'CST',
    pickupAppointment: toIsoLocal(w.latestPickup), pickupAppointmentTimeZoneCode: 'CST',
    requestedDeliveryDate: toIsoLocal(w.earliestDelivery), requestedDeliveryTimeZoneCode: 'CST',
    deliveryAppointment: toIsoLocal(w.latestDelivery), deliveryAppointmentTimeZoneCode: 'CST',
    equipmentNumber: header.equipmentReferenceNumber ?? undefined,
    originPartnerId: locationIdFor(from, fromIdx),
    originFullName: header.origin.fullName,
    originAddress1: header.origin.address1,
    originAddress2: header.origin.address2 ?? undefined,
    originCity: from.city, originRegion: from.state, originPostal: from.zip, originCountry: 'US',
    originContactName: header.origin.contactName,
    originPhone: header.origin.phone,
    originEmail: header.origin.email,
    destinationPartnerId: locationIdFor(to, toIdx),
    destinationFullName: header.destination.fullName,
    destinationAddress1: header.destination.address1,
    destinationAddress2: header.destination.address2 ?? undefined,
    destinationCity: to.city, destinationRegion: to.state, destinationPostal: to.zip, destinationCountry: 'US',
    destinationContactName: header.destination.contactName,
    destinationPhone: header.destination.phone,
    destinationEmail: header.destination.email,
    grossWeightValue: lines.reduce((s, l) => s + l.grossWeightValue, 0),
    grossWeightUomCode: 'lb',
    volumeValue: lines.reduce((s, l) => s + l.volumeValue, 0),
    volumeUomCode: 'cuft',
    orderCarrierEquipDetailList: [{
      carrierSequence: 1,
      equipmentCode: header.equipmentCode,
      ...(header.customerRequiredCarrier ? { scacCode: header.customerRequiredCarrier } : {}),
    }],
    orderLines: lines.map((l, i) => ({
      lineIdentifier: i + 1,
      shipItemIdentifier: l.itemCode,
      productDescription: l.itemDescription,
      grossWeightValue: l.grossWeightValue,
      grossWeightUomCode: 'lb',
      volumeValue: l.volumeValue,
      volumeUomCode: 'cuft',
      shipClass: l.productClass,
    })),
    orderAccessorialDetails: (header.specialServices ?? []).map((s, i) => ({
      accessorialCode: s.code,
      orderAccessorialDetailSequence: i + 1,
    })),
    orderInstructionList: instructionList.map((ins) => ({
      instructionNumber: ins.sequenceNumber,
      instructionType: '0012',
      instructionDetail: ins.text,
    })),
    userFieldList: [
      { userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: header.consolidatable ? 'Y' : 'N' },
      ...(header.bolNo ? [{ userfieldType: 'REFERENCE', name: 'BOL Number', value: header.bolNo }] : []),
    ],
  };
}

// ============================================================
// PANEL / CATEGORY ASSIGNMENT
// ============================================================

const PANEL_CATEGORIES = {
  exceptions: ['date-issues', 'routing-review', 'tender-issues', 'tender-review', 'bid-review'],
  monitoring: ['hold', 'consolidation', 'sent', 'spotbid'],
  pgipgr: ['pgipgr-errors', 'rating-failure', 'manual-pgipgr'],
};

// Weighted random: pick from items using weights array (weights are relative, not %)
function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = faker.number.float({ min: 0, max: total, multipleOf: 0.001 });
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Category weights within each panel (realistic, unequal distribution)
const CATEGORY_WEIGHTS = {
  exceptions: {
    items:   ['date-issues', 'routing-review', 'tender-issues', 'tender-review', 'bid-review'],
    weights: [28, 22, 22, 18, 10], // date-issues most common, bid-review least
  },
  monitoring: {
    items:   ['sent', 'hold', 'consolidation', 'spotbid', 'approved'],
    weights: [25, 15, 15, 15, 30], // approved most common (accepted carriers), sent next
  },
  pgipgr: {
    items:   ['pgipgr-errors', 'manual-pgipgr', 'rating-failure'],
    weights: [45, 33, 22], // PGI errors most common
  },
};

// ============================================================
// GENERATE SHIPMENTS
// ============================================================

console.log('Generating 2200 shipments...');

const TOTAL_SHIPMENTS = 2200;
const shipments = [];
const shipmentDetails = {};

for (let i = 0; i < TOTAL_SHIPMENTS; i++) {
  const { mainRow, detail } = generateShipment(i);
  shipments.push(mainRow);
  shipmentDetails[mainRow.sellShipment] = detail;
}

// Write main table data (statically imported by app)
const outDir = new URL('../src/data/', import.meta.url);
writeFileSync(new URL('shipments.json', outDir), JSON.stringify(shipments, null, 2));

// Write per-shipment detail files to public/details/
const detailsDir = new URL('../public/details/', import.meta.url);
const detailsDirPath = new URL('.', detailsDir).pathname;

// Ensure directory exists
mkdirSync(detailsDirPath, { recursive: true });

// Clean old detail files
if (existsSync(detailsDirPath)) {
  for (const f of readdirSync(detailsDirPath)) {
    if (f.endsWith('.json')) unlinkSync(detailsDirPath + f);
  }
}

// Write individual files
for (const [id, detail] of Object.entries(shipmentDetails)) {
  writeFileSync(detailsDirPath + id + '.json', JSON.stringify(detail));
}

// ============================================================
// UNSHIPPED ORDERS (Orders-side only — I6/I9)
// ============================================================
// Orders that exist but are NOT on any shipment yet: awaiting planning, drafts,
// failures, cancellations, and a few number-less async creations (I9). Facts
// follow the same invariants (line roll-ups, ordered date windows, shared
// location ids) so the create-form contract can explain every row.

const shippedOrderCount = orderRows.length;
// Scaled with TOTAL_SHIPMENTS (~25% of shipments' order volume stays pre-plan)
// so the status mix reads like a living system at any database size.
const UNSHIPPED_ORDERS = 550;
const PENDING_ORDERS = 20; // orderNumber not assigned yet (async create processing)

// Weighted pre-plan statuses (I6) — HOLD is a flag, not a status.
const UNSHIPPED_STATUS_POOL = [
  ...Array(50).fill('Ready For Plan'),
  ...Array(20).fill('Draft'),
  ...Array(18).fill('Planning Failed'),
  ...Array(12).fill('Cancelled'),
];

// Long, MULTILINE-worthy instruction bodies for the rich unshipped orders.
const LONG_INSTRUCTIONS = [
  'RECEIVING PROTOCOL:\n1. Check in at the guard shack with BOL and photo ID — no exceptions.\n2. Tarps remain ON until a dock door is assigned by the receiving supervisor.\n3. Hazmat loads stage in the marked lane only; placards verified before unload.\n4. Overages, shortages and damages must be noted on the POD before the driver leaves the yard.',
  'PLANT SHUTDOWN WINDOW: The Geismar facility is dark June 28 – July 6 for turnaround.\nNo deliveries will be received during that window.\nLoads arriving early must be scheduled through central dispatch at least 48 hours in advance; detention will not be honored for unscheduled arrivals.',
  'TEMPERATURE LOG REQUIREMENT:\nMaintain product between 40F and 75F for the entire transit.\nRecord readings at pickup, every 4 hours in transit, and at delivery.\nSubmit the complete log with the POD — invoices without a temperature log will be short-paid per the quality agreement.',
];

function generateUnshippedOrder(n, pending) {
  const customer = pick(CUSTOMERS);
  const originIdx = faker.number.int({ min: 0, max: LOCATIONS.length - 1 });
  let destIdx = faker.number.int({ min: 0, max: LOCATIONS.length - 1 });
  if (destIdx === originIdx) destIdx = (destIdx + 1) % LOCATIONS.length;
  const from = LOCATIONS[originIdx];
  const to = LOCATIONS[destIdx];

  // Lines first; totals roll up (I5 applies Orders-side too)
  const lineCount = faker.number.int({ min: 1, max: 3 });
  const lines = [];
  for (let l = 0; l < lineCount; l++) {
    const product = pick(CHEMICAL_PRODUCTS);
    lines.push({
      itemCode: product.item,
      itemDescription: product.desc,
      grossWeightValue: faker.number.int({ min: 1000, max: 15000 }),
      volumeValue: faker.number.int({ min: 20, max: 200 }),
      productClass: pick(PRODUCT_CLASSES),
    });
  }
  const gross = lines.reduce((s, l) => s + l.grossWeightValue, 0);
  const volume = lines.reduce((s, l) => s + l.volumeValue, 0);

  // Future-leaning ordered windows (I4 without a shipment instant)
  const earliestPickup = faker.date.between({ from: '2026-06-20T06:00:00', to: '2026-09-30T16:00:00' });
  earliestPickup.setMinutes(pick([0, 30]), 0, 0);
  const latestPickup = new Date(earliestPickup.getTime() + faker.number.int({ min: 4, max: 48 }) * 60 * 60 * 1000);
  const earliestDelivery = new Date(latestPickup.getTime() + faker.number.int({ min: 1, max: 5 }) * 24 * 60 * 60 * 1000);
  const latestDelivery = new Date(earliestDelivery.getTime() + faker.number.int({ min: 4, max: 48 }) * 60 * 60 * 1000);

  const orderNumber = pending ? '' : genOrderNumber(customer);
  const row = {
    orderNumber,
    // Pending rows came through the async manual-create flow (I9)
    orderSource: pending ? 'MANUAL' : pick(['INTEGRATED', 'INTEGRATED', 'MANUAL']),
    customer: customer.id,
    shipDirection: pick(SHIP_DIRECTIONS),
    freightTerms: pick(PAYMENT_TERMS),
    equipment: pick(EQUIPMENT_CODES),
    consignor: {
      locationId: locationIdFor(from, originIdx),
      city: from.city, state: from.state, country: 'US',
      earliestPickupDateTime: toIsoLocal(earliestPickup),
      latestPickupDateTime: toIsoLocal(latestPickup),
    },
    consignee: {
      locationId: locationIdFor(to, destIdx),
      city: to.city, state: to.state, country: 'US',
      earliestDeliveryDateTime: toIsoLocal(earliestDelivery),
      latestDeliveryDateTime: toIsoLocal(latestDelivery),
    },
    grossWeight: { value: gross, uom: 'lbs' },
    volume: { value: volume, uom: 'cbf' },
    commodity: lines[0].itemDescription,
    orderStatus: pending ? 'Ready For Plan' : pick(UNSHIPPED_STATUS_POOL),
  };
  if (pending) row.orderId = 91000 + n; // internal id — the only handle a number-less row has

  // ~half of the numbered unshipped orders are RICH: every optional create-form
  // field populated (references, long multiline instructions, services,
  // contacts, appointments). The rest stay LEAN — minimum required fields only.
  if (!pending && faker.number.float({ min: 0, max: 1 }) < 0.5) {
    const serviceCount = faker.number.int({ min: 1, max: 3 });
    const instructions = [
      pick(LONG_INSTRUCTIONS),
      ...Array.from({ length: faker.number.int({ min: 0, max: 2 }) }, () => fillTemplate(pick(INSTRUCTION_TEMPLATES).text, null)),
    ];
    orderEnrichments[orderNumber] = {
      orderNumber,
      customerId: customer.id,
      freightTermCode: row.freightTerms,
      shipDirectionCode: row.shipDirection,
      pickupNumber: `PU-${faker.number.int({ min: 100000, max: 999999 })}`,
      poNumber: `PO-${faker.number.int({ min: 100000, max: 999999 })}`,
      requestedDateType: 'SHIP',
      requestedPickupDate: toIsoLocal(earliestPickup), requestedPickupTimeZoneCode: 'CST',
      pickupAppointment: toIsoLocal(latestPickup), pickupAppointmentTimeZoneCode: 'CST',
      requestedDeliveryDate: toIsoLocal(earliestDelivery), requestedDeliveryTimeZoneCode: 'CST',
      deliveryAppointment: toIsoLocal(latestDelivery), deliveryAppointmentTimeZoneCode: 'CST',
      equipmentNumber: faker.number.float({ min: 0, max: 1 }) < 0.4 ? `TANK-${faker.number.int({ min: 1000, max: 9999 })}` : undefined,
      originPartnerId: locationIdFor(from, originIdx),
      originFullName: from.facility,
      originAddress1: faker.location.streetAddress(),
      originCity: from.city, originRegion: from.state, originPostal: from.zip, originCountry: 'US',
      originContactName: faker.person.fullName(),
      originPhone: faker.phone.number({ style: 'international' }),
      originEmail: faker.internet.email(),
      destinationPartnerId: locationIdFor(to, destIdx),
      destinationFullName: to.facility,
      destinationAddress1: faker.location.streetAddress(),
      destinationCity: to.city, destinationRegion: to.state, destinationPostal: to.zip, destinationCountry: 'US',
      destinationContactName: faker.person.fullName(),
      destinationPhone: faker.phone.number({ style: 'international' }),
      destinationEmail: faker.internet.email(),
      grossWeightValue: gross, grossWeightUomCode: 'lb',
      volumeValue: volume, volumeUomCode: 'cuft',
      orderCarrierEquipDetailList: [{
        carrierSequence: 1,
        equipmentCode: row.equipment,
        ...(faker.number.float({ min: 0, max: 1 }) < 0.4 ? { scacCode: pick(CARRIERS).scac } : {}),
      }],
      orderLines: lines.map((l, i) => ({
        lineIdentifier: i + 1,
        shipItemIdentifier: l.itemCode,
        productDescription: l.itemDescription,
        grossWeightValue: l.grossWeightValue,
        grossWeightUomCode: 'lb',
        volumeValue: l.volumeValue,
        volumeUomCode: 'cuft',
        shipClass: l.productClass,
      })),
      orderAccessorialDetails: faker.helpers.arrayElements(SPECIAL_SERVICES_POOL, serviceCount)
        .map((s, i) => ({ accessorialCode: s.code, orderAccessorialDetailSequence: i + 1 })),
      orderInstructionList: instructions.map((text, i) => ({
        instructionNumber: i + 1, instructionType: '0012', instructionDetail: text,
      })),
      userFieldList: [
        { userfieldType: 'FLAG', name: 'CONSOLIDATABLE', value: pick(['Y', 'N']) },
        { userfieldType: 'REFERENCE', name: 'Sales Order', value: `SO-${faker.number.int({ min: 100000, max: 999999 })}` },
        { userfieldType: 'REFERENCE', name: 'Delivery Note', value: `DN-${faker.number.int({ min: 100000, max: 999999 })}` },
      ],
    };
  }
  return row;
}

for (let n = 0; n < UNSHIPPED_ORDERS; n++) orderRows.push(generateUnshippedOrder(n, false));
for (let n = 0; n < PENDING_ORDERS; n++) orderRows.push(generateUnshippedOrder(n, true));

writeFileSync(new URL('orders.json', outDir), JSON.stringify(orderRows, null, 1));
writeFileSync(new URL('order-details.json', outDir), JSON.stringify(orderEnrichments));

console.log(`Done! Generated ${shipments.length} shipments.`);
console.log(`  shipments.json: ${shipments.length} rows`);
console.log(`  public/details/: ${Object.keys(shipmentDetails).length} detail files`);
console.log(`  orders.json: ${orderRows.length} rows (${shippedOrderCount} shipped + ${UNSHIPPED_ORDERS} unshipped + ${PENDING_ORDERS} pending/number-less)`);
console.log(`  order-details.json: ${Object.keys(orderEnrichments).length} enriched orders`);
