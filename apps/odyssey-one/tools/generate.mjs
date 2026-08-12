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
//  I13 MultiStop — only LTL is capped at 2 stops (1 pickup + 1 delivery). Every
//                  other mode MAY be multi-stop. Never gate stop-splitting on
//                  mode === 'TL': the real Tracking payload has a 1P/3D load on
//                  mode TT/ISO (TR-07), so that gate made shapes that exist in
//                  production unrepresentable here.
//  I3 Locations  — every order is picked up at EXACTLY ONE stop and delivered
//                  at EXACTLY ONE stop (so it appears twice across the stop
//                  list, once per side — that is correct; the same order twice
//                  on the SAME side is not). order.consignor = its pickup stop,
//                  order.consignee = its DELIVERY stop (same facility/city/
//                  state/zip + shared locationIdFor id) — NOT the shipment's
//                  destination, which differs once TL deliveries split.
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
//  I10 Tab fields — every order row carries createdAt/createdBy/lastEditAt
//                  (Draft-tab columns) regardless of status; Draft-status rows
//                  additionally get a lastEdit ≥ created; Validation-Errors
//                  statuses (Planning Failed/Shipment Failed) additionally get
//                  draftOrderStatus (Ready/Complete/Purge) + a numeric
//                  errorCount — the per-tab grid (S94) reads these directly,
//                  no join required. row.hazardous (LINX-12102, S95) is DERIVED
//                  from the order's lines (some(l => hazmat)), never an
//                  independent draw — must agree with shipment detail line
//                  items' hazmat fields, which share the same product.hazmat source.
//  (NOT an invariant) Jana's AGGREGATION (1 pickup + 1 delivery) /
//                  CONSOLIDATION (>1 pickup AND >1 delivery) taxonomy is
//                  documented in DEC-68 but deliberately NOT enforced — it is
//                  not confirmed to be exhaustive, so mixed shapes stay legal.
//  I12 DirectCost— direct cost is an ORDER fact (the cost of that order going
//                  point A → point B). A shipment has none of its own; the
//                  rollup is Σ of its orders' directCostAmount (DEC-68).
import { faker } from '@faker-js/faker';
import { writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { deriveTimezone, tzAbbrev, CUSTOMERS, EXTRA_CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, CHEMICAL_PRODUCTS, locationIdFor, FREIGHT_TERMS, SHIP_DIRECTIONS, SHIP_CLASS_CODES, shipClassLabel, PRODUCT_CLASSES, HANDLING_UNITS, MODES } from './data-pools.mjs'
import { ORDER_AUTHOR_USERNAMES } from './seed-users.mjs'

// ── Orders accumulator (I1) ──────────────────────────────────────────────────
// LINX-9742/9279: every order (shipped + unshipped + pending) draws a globally
// unique NUMERIC orderId from ONE shared sequence (91000+, the legacy pending
// range family). ~71% of numbers are auto-generated (orderNumber = the
// 13-digit zero-padded orderId, mirroring the product external-ID convention);
// ~29% are user-provided free text (customer prefix + the same id, "user typed
// it to remember which customer" — uniqueness holds trivially). Equal-length
// numeric strings keep "orderNumber desc" a sane newest-first proxy for the
// auto majority.
// Module-level mutable state (orderSeq, orderRows, orderEnrichments,
// usedSellShipments) is reset by buildDataset() so repeated in-process calls
// stay deterministic. resetGeneratorState() zeroes it all at once.
const ORDER_ID_BASE = 91000; // 5-digit family; ~5k orders/run stays 5-digit
let orderSeq = ORDER_ID_BASE;
function nextOrderId() { return orderSeq++; }
function genOrderNumber(customer, orderId) {
  if (faker.number.float({ min: 0, max: 1 }) < 0.29) {
    // user-provided free-text number (customer-styled)
    const prefix = customer.id.replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X');
    return `${prefix}-${orderId}`;
  }
  return String(orderId).padStart(13, '0'); // auto-generated: 13-digit external-ID form
}
let orderRows = [];        // → src/data/orders.json  (OrderListRow shape)
let orderEnrichments = {}; // → src/data/order-details.json (partial ManualOrder by orderNumber)

function resetGeneratorState() {
  orderSeq = ORDER_ID_BASE;
  orderRows = [];
  orderEnrichments = {};
  usedSellShipments.clear();
  usedBuyShipments.clear();
}

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

// buyShipment is THE user-facing shipment ID (LINX-11591/12490) — must be unique
// like the DB's UNIQUE constraint on shipments.buy_shipment.
const usedBuyShipments = new Set();
function genUniqueBuyShipment() {
  let v;
  do { v = String(faker.number.int({ min: 10000000, max: 99999999 })); } while (usedBuyShipments.has(v));
  usedBuyShipments.add(v);
  return v;
}

// ============================================================
// DOMAIN CONSTANTS (from grooming sessions + prototype)
// ============================================================

const SPECIAL_SERVICES_POOL = [
  { code: 'LFT',   desc: 'Lift gate' },
  { code: 'PALEXG', desc: 'Pallet Jack' },
  { code: 'PJC',   desc: 'Pallet Exchange' },
  { code: 'INSD',  desc: 'Inside Delivery' },
  { code: 'APPT',  desc: 'Appointment Required' },
];

const MODE_WEIGHTS = { TL: 40, LTL: 40, RR: 5, IMD: 5, AIR: 10 };
const RR_CUSTOMERS = ['BASF_CHM_01'];
const TENDER_STATUSES = ['Sent', 'Accepted', 'Declined', 'Cancelled'];
const DOC_TYPES = ['BoL', 'MBoL', 'POD', 'SL', 'Packing List', 'Other'];
const ROUTING_APIS = ['API', 'EDI', 'Email', 'Fax'];
const RESPONSE_METHODS = ['API Update', 'EDI Update', 'Manual Update', 'Automatic Update'];
const ROUTE_GROUPS = ['Primary', 'Backup', 'Spot'];
const PACKAGE_TYPES = ['Boxes', 'Pallets', 'Bags', 'Drums', 'Totes', 'Crates'];
// Wire-code vocabulary (DB ledger row 2): rows store the letter codes; the UI
// maps code → label at render. Shipment detail and order rows agree verbatim.
const PAYMENT_TERM_CODES = FREIGHT_TERMS.map((t) => t.value)          // P/C/A/T/N
const SHIP_DIRECTION_CODES = SHIP_DIRECTIONS.map((d) => d.value) // O/I
const HAZMAT_CLASSES = ['Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 8', 'Class 9'];
const HAZMAT_GROUPS = ['I', 'II', 'III'];
// PRODUCT_CLASSES (NMFC class VALUES) + SHIP_CLASS_CODES (class TYPE H/C/P/N)
// + HANDLING_UNITS come from data-pools.mjs (DB ledger row 6).
const TUNNEL_CODES = ['A', 'B', 'C', 'D', 'E'];

const VALIDATION_MESSAGES = {
  'date-issues': ['Pickup date missing', 'Delivery date in the past', 'No delivery date provided', 'Pickup/delivery date conflict'],
  'routing-review': ['No routing guide available', 'All carriers exhausted', 'Route group expired'],
  'tender-issues': ['Tender failed - carrier timeout', 'Tender rejected by system', 'Carrier API error'],
  'tender-review': ['Manual carrier selection required', 'Cost exceeds threshold', 'Preferred carrier unavailable'],
  'bid-review': ['Spot bid expired', 'Multiple bids pending review', 'Bid below minimum rate'],
};

export const CARRIERS = [
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

/* User Defined Fields — order-scoped extra information the CUSTOMER supplies;
   it does not originate from any domain (Jana, 2026-07-30: "sometimes it's
   external" — CSV drops, email). Therefore: not a fixed schema, SPARSE (an
   order carries only the keys its customer happened to send), and free-text.
   INVENTED DATA — the field names come from the 2026-07-30 spec artifact, the
   value generators are ours. Flagged in
   vault/10-domains/shipments/shipment-details-modal-spec-2026-07-30.md. */
const UDF_CATALOG = [
  { name: 'TEMP_SENSITIVITY',         gen: () => pick(['AMBIENT', 'REEFER 34-38F', 'PROTECT FROM FREEZING', 'NONE']) },
  { name: 'CONTACT',                  gen: () => faker.person.fullName() },
  { name: 'DATE_AVAILABLE',           gen: () => formatDate(genDate(new Date(), faker.number.int({ min: -5, max: 20 }))) },
  { name: 'PICKUP_NUMBER',            gen: () => `PU${faker.number.int({ min: 100000, max: 999999 })}` },
  { name: 'MANUAL_SHIPMENT_PLANNING', gen: () => pick(['Y', 'N']) },
  { name: 'STATUS_1',                 gen: () => pick(['OPEN', 'HOLD', 'RELEASED', 'CLOSED']) },
  { name: 'STATUS_2',                 gen: () => pick(['REVIEWED', 'PENDING REVIEW', 'EXCEPTION']) },
  { name: 'MANUAL_TRACKING_REQUEST',  gen: () => pick(['Y', 'N']) },
  { name: 'AFTER_HOURS',              gen: () => pick(['Y', 'N']) },
  { name: 'EXTERNAL_TRANSACTION_ID',  gen: () => String(faker.number.int({ min: 100000000, max: 999999999 })) },
  ...Array.from({ length: 7 }, (_, i) => ({
    name: `ALD_USER${11 + i}`,
    gen: () => faker.string.alphanumeric({ length: { min: 4, max: 10 }, casing: 'upper' }),
  })),
];

// Every order carries UDFs (user: "fill user field details with anything") —
// WHICH keys stay sparse and random, so the shape still reflects the real
// model where each customer sends a different subset.
function genUserDefinedFields() {
  return faker.helpers
    .arrayElements(UDF_CATALOG, faker.number.int({ min: 3, max: 8 }))
    .map(({ name, gen }) => ({ name, value: gen() }));
}

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

// External (customer-side) human authors for history events — see
// buildAuthor() below. Plain ASCII names only: these become email
// local-parts (first.last@<customer-domain>), and an accented character in a
// synthetic corporate address reads as a bug, not realism.
const EXTERNAL_AUTHOR_NAMES = ['Marcus Webb', 'Priya Anand', 'Daniel Osei', 'Grace Liu'];

// Derives a plausible corporate domain from a real CUSTOMERS pool name (e.g.
// 'USALCO LLC' → 'usalco.com') so an external history author's email matches
// the customer actually on the shipment, per the seeded-data-must-be-coherent
// rule — never an invented, unrelated domain.
function customerEmailDomain(cust) {
  const slug = cust.name
    .replace(/\b(LLC|Inc|Corp|Corporation|Company|Co)\b\.?/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return `${slug}.com`;
}

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

// Ownership pick (DB ledger row 3): the original 25 shared-pool customers stay
// dominant (~92% of shipments/orders); promoted extras own a thin tail so they
// exist observably without re-shaping per-customer distributions.
function pickCustomer() {
  return faker.number.float({ min: 0, max: 1 }) < 0.92 ? pick(CUSTOMERS) : pick(EXTRA_CUSTOMERS)
}
// errorCount weighted LOW (DB ledger row 7 — user flagged too many 12s):
// most orders 1–4 errors, thin tail to 8, rare 9–12. Cap 12 stays under the
// OIF RESOLVE_POOL size (15) so the resolve view can always seed them.
function genErrorCount() {
  return faker.helpers.weightedArrayElement([
    { value: 1, weight: 28 }, { value: 2, weight: 24 }, { value: 3, weight: 18 },
    { value: 4, weight: 12 }, { value: 5, weight: 7 },  { value: 6, weight: 4 },
    { value: 7, weight: 3 },  { value: 8, weight: 2 },
    { value: 9, weight: 0.6 }, { value: 10, weight: 0.5 },
    { value: 11, weight: 0.5 }, { value: 12, weight: 0.4 },
  ])
}

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

// LINX-12039 — order-header PO number. REAL shapes supplied by the user from
// Rovo (2026-08-05), replacing the invented `PO-######` guess in the DB motion
// plan (docs/superpowers/plans/2026-08-04-combined-db-motion.md). Real POs are
// heterogeneous across ERPs, so generate a MIX — ⚠️ the DISTRIBUTION across the
// three shapes is INVENTED (no source gives the real split): 40% alphanumeric
// / 40% plain-numeric / 20% prefixed-numeric.
function genPoNumber() {
  const shape = faker.number.float({ min: 0, max: 1 });
  if (shape < 0.4) return faker.string.alphanumeric({ length: 9, casing: 'upper' }); // e.g. SVI5HCKT4
  if (shape < 0.8) return faker.string.numeric(10); // e.g. 4000438190
  return `${faker.string.numeric(2)}-${faker.string.numeric(9)}`; // e.g. 01-410068964
}

// poNumber sits beside pickupNumber (LINX-12039) — same "not every order has
// one" shape. ⚠️ Coverage ~60% INVENTED — mirrors pickupNumber's coverage
// assumption; no canon source gives the real rate.
function genOrderPoNumber() {
  return faker.number.float({ min: 0, max: 1 }) < 0.60 ? genPoNumber() : null;
}

// LINX-12898 — order-level planning basis: RDD (Requested Delivery Date) or
// SSD (Scheduled Ship Date). ⚠️ Ratio INVENTED (~35% RDD / 65% SSD, per the DB
// motion plan) — Rovo defined the TERMS, not the real-world mix.
function genPlanningDateType() {
  return faker.number.float({ min: 0, max: 1 }) < 0.35 ? 'RDD' : 'SSD';
}

function genDate(baseDate, offsetDays) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/* `zone` is an IANA id; the trailing abbreviation is DERIVED per-instant so it
   is DST-correct (a July Houston time reads CDT, the same clock in January
   reads CST). Defaults to America/Chicago for the many call sites that carry no
   location context. */
function formatDateTime(d, zone = 'America/Chicago') {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd}/${yyyy} ${hh}:${min} ${tzAbbrev(zone, d) || 'CST'}`;
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

// chainOverride (multi-leg chains, see buildChainLegs below) pins customer/
// geography/pickup-instant so a leg's facts agree with its neighbors — every
// other fact (mode, carrier, orders, routing, notes …) still generates
// normally, exactly as a standalone shipment would.
function generateShipment(index, chainOverride) {
  // CSV example: 28826319 — bare 8-digit number (no SHP- prefix). buyShipment is
  // the primary key + per-shipment detail filename; the generator rewrites both.
  const buyShipment = genUniqueBuyShipment();
  const sellShipment = genUniqueSellShipment();
  const customer = chainOverride?.customer ?? pickCustomer();
  const originLoc = chainOverride?.originLoc ?? pick(LOCATIONS);
  const destLoc = chainOverride?.destLoc ?? pick(LOCATIONS.filter(l => l.city !== originLoc.city));
  // A shipment's times are read in the STOP's timezone (user ruling, S102) —
  // never the carrier's. Quote pickup/delivery inherit these.
  const originTz = deriveTimezone(originLoc.city) || 'America/Chicago';
  const destTz = deriveTimezone(destLoc.city) || 'America/Chicago';
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
  // chainOverride.baseDate is already a specific chosen instant (this leg's
  // forced pickup — see buildChainLegs); a fresh random hour on top of it
  // could push the leg BEFORE the invariant that put it there.
  const baseDate = chainOverride?.baseDate ? new Date(chainOverride.baseDate)
    : faker.date.between({ from: '2026-01-01', to: '2026-06-30' });
  if (!chainOverride?.baseDate) baseDate.setHours(faker.number.int({ min: 6, max: 16 }), pick([0, 30]), 0, 0);
  const transitDays = faker.number.int({ min: 1, max: 7 });
  const deliveryDate = genDate(baseDate, transitDays);
  // Shared per-shipment facts the order rows must agree with (I2)
  const shipDirection = pick(SHIP_DIRECTION_CODES);
  const freightTerms = pick(PAYMENT_TERM_CODES);

  // Orders per shipment — business rule: AT MOST 5 orders with a valid id
  // (the badge palette and order tabs assume this cap). The cap is NOT the
  // norm: real freight skews to single-order shipments, consolidations taper
  // off — weighted 1:45% · 2:25% · 3:15% · 4:10% · 5:5%.
  //
  // Order count is deliberately INDEPENDENT of mode. A 2-stop shipment
  // carrying 5 orders is a legitimate consolidation — all 5 are picked up at
  // one shipper and delivered to one consignee, so both stops listing all 5 is
  // correct, not a defect. (A mode gate was briefly added on 2026-07-30 and
  // reverted the same day: it cost 30% of seeded orders to "fix" a non-problem.)
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
    const numericOrderId = nextOrderId();                 // I1 — globally unique numeric id
    const orderId = genOrderNumber(customer, numericOrderId); // orderNumber string (auto = String(id), ~15% user-styled)
    const lineCount = faker.number.int({ min: 1, max: 3 });
    const lines = [];

    for (let l = 0; l < lineCount; l++) {
      const product = pick(CHEMICAL_PRODUCTS);
      const lineWeight = faker.number.int({ min: 1000, max: 15000 });
      const tareWeight = Math.round(lineWeight * 0.2);
      const thirdPartRefDate = genDate(baseDate, faker.number.int({ min: -3, max: 3 }));
      const loadConstraint = pick(LOAD_CONSTRAINTS);
      // Shipments canon (shipments-exceptions.md:324-325): detail Product Class
      // is the TYPE label; Shipping Class is the VALUE that type implies —
      // Commodity/Product → rail-commodity/product code, Harmonized → the
      // harmonized code, NMFC → the NMFC scale. One draw keeps them coherent.
      const shipClassCode = pick(SHIP_CLASS_CODES);
      const harmonizedCode = `${faker.number.int({ min: 2800, max: 3999 })}.${faker.string.numeric(2)}.${faker.string.numeric(2)}.${faker.string.numeric(2)}`;
      const shippingClass = shipClassCode === 'N' ? pick(PRODUCT_CLASSES)
        : shipClassCode === 'H' ? harmonizedCode
        : String(faker.number.int({ min: 100000, max: 999999 }));
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
        productClass: shipClassLabel(shipClassCode), // TYPE label (canon)
        shipClassCode,                             // same draw as a wire code (H/C/P/N) — form wire `shipClass`
        handlingUnit: pick(HANDLING_UNITS).code,   // PLT/BOX/DRM/BUL/CRT (ledger row 6)
        harmonizedCode,
        stccCode: faker.string.numeric(7),
        shippingClass,                             // the VALUE the type implies
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
    // Pickup # is an ORDER-HEADER field (R2-2 / D3) — a customer-provided pickup
    // reference from the customer ERP / SAP PGI-PGR flow, sitting beside poNumber
    // and orderNumber. It is COPIED to the load and the stop, never minted there.
    // Generated here, on the order, so the stop and the shipment roll-up read the
    // same value instead of each inventing its own (the stop used to mint its own
    // on a coin flip, so half of all pickup stops rendered '--').
    const pickupNumber = faker.number.float({ min: 0, max: 1 }) < 0.60
      ? `PU-${faker.number.int({ min: 100000, max: 999999 })}`
      : null;
    // LINX-12039 / LINX-12898 — minted once here (same discipline as
    // pickupNumber) so the order header, the orders.json row, and the
    // shipment roll-up below all read the same value instead of drifting.
    const poNumber = genOrderPoNumber();
    const planningDateType = genPlanningDateType();
    orders.push({ orderId, numericOrderId, lineCount, lines, orderGross, orderTare, orderVolume, orderPackages, pickupNumber, poNumber, planningDateType });
  }

  // A shipment consolidates N orders, each with its own pickup reference, so the
  // shipment carries an ARRAY — same shape as `orders` (D3, user 2026-08-02).
  const pickupNumbers = [...new Set(orders.map((o) => o.pickupNumber).filter(Boolean))];
  // shipments.po_numbers — dedup array of its orders' PO numbers, mirrors
  // pickupNumbers exactly (DB motion plan, "Data rules").
  const poNumbers = [...new Set(orders.map((o) => o.poNumber).filter(Boolean))];
  // shipments.planning_type (LINX-12902 verbatim) — RDD if ANY mapped order is RDD, else SSD.
  const planningType = orders.some((o) => o.planningDateType === 'RDD') ? 'RDD' : 'SSD';

  // I5 — shipment gross weight = Σ of its orders' gross weights
  const grossWeight = orders.reduce((s, o) => s + o.orderGross, 0);
  const totalVolume = orders.reduce((s, o) => s + o.orderVolume, 0);

  // Stops
  // LTL is 2 stops only — 1 pickup + 1 delivery (project_mode_definitions,
  // David). Every OTHER mode may be multi-stop.
  //
  // Do NOT gate stop-splitting on `mode === 'TL'`. David's rule names LTL
  // specifically; extending it to "every mode except TL is 2 stops" was our
  // generalization, and the real Tracking payload refutes it: document
  // 0200994650 is 1 pickup + 3 deliveries on mode `TT/ISO` — a multi-stop load
  // in a mode we do not even carry. Under the old gate our generator could not
  // represent a shipment that exists in production today. See TR-07 in
  // vault/10-domains/tracking/decisions/decision-log.md.
  //
  // I3 — every order is picked up at exactly ONE stop and delivered at exactly
  // ONE stop. An order therefore appears twice across the stop list (once per
  // side), which is correct; what must never happen is one order appearing at
  // two stops on the SAME side.
  //
  // Pickup and delivery counts are drawn INDEPENDENTLY. Jana's aggregation /
  // consolidation taxonomy (DEC-68) describes the two common shapes but is not
  // known to be exhaustive, so mixed shapes — 2 pickups feeding 1 consignee, a
  // milk run — stay possible (0200994650 is exactly such a shape). Do not
  // constrain to the two named patterns without confirming with Jana.
  const canMultiStop = mode !== 'LTL';
  const splitCount = (n) => Math.min(n, faker.number.int({ min: 1, max: 2 }));
  const pickupStopCount = canMultiStop ? splitCount(orders.length) : 1;
  const chunkSize = Math.ceil(orders.length / pickupStopCount);
  orders.forEach((o, oi) => { o.pickupStopIdx = Math.min(Math.floor(oi / chunkSize), pickupStopCount - 1); });
  const stopLocs = [];
  const stops = [];
  for (let s = 0; s < pickupStopCount; s++) {
    const stopLoc = s === 0 ? originLoc : pick(LOCATIONS.filter(l => l.city !== originLoc.city && l.city !== destLoc.city));
    stopLocs.push(stopLoc);
    const stopOrders = orders.filter(o => o.pickupStopIdx === s);
    // This stop's own zone + own instant, shared by scheduledDateTime AND
    // appointmentTime. They were computed separately before, which is how the
    // appointment kept a literal ' CST' after S103 fixed the scheduled time
    // (S104 Task 10b) — a Denver stop read MDT scheduled / CST appointment in
    // the same grid. One source, so they cannot disagree again.
    const stopTz = deriveTimezone(stopLoc.city) || 'America/Chicago';
    const stopAt = new Date(baseDate);
    stopAt.setHours(baseDate.getHours() + s * 3);
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
      // IANA id, mirroring the real Tracking contract's stop `timeZone` (TR-04)
      timeZone: stopTz,
      // Stops are sequenced in time, and the SHIPMENT's pickup date is the
      // FIRST pickup (Jana, Feb 17 — "we took the first one for the pickup"),
      // so stop 0 sits exactly on baseDate and later pickups run 3h apart.
      scheduledDateTime: `${formatDate(stopAt)} ${String(stopAt.getHours()).padStart(2, '0')}:00 ${tzAbbrev(stopTz, stopAt)}`,
      appointmentTime: `${String(stopAt.getHours()).padStart(2, '0')}:00 ${tzAbbrev(stopTz, stopAt)}`,
      // I5 — stop weight/volume/packages = Σ of the orders picked up here
      grossWeightValue: stopOrders.reduce((t, o) => t + o.orderGross, 0),
      grossWeightUomCode: 'LB',
      volumeValue: stopOrders.reduce((t, o) => t + o.orderVolume, 0),
      volumeUomCode: 'cuft',
      packageCount: stopOrders.reduce((t, o) => t + o.orderPackages, 0),
      // Copied from the orders picked up at THIS stop (R2-2). Was a per-stop coin
      // flip, which rendered '--' on half of all pickup stops despite the field
      // being fully plumbed through to StopsTab.
      pickupNumber: stopOrders.map((o) => o.pickupNumber).find(Boolean) ?? null,
    });
  }
  /* Deliveries mirror pickups. Before 2026-07-30 there was always exactly ONE
     delivery stop carrying orderIds for EVERY order, which is why every stop on
     a shipment listed the same orders. `deliveryLocs` is captured because the
     ORDER's shipTo must be the stop it actually delivers at — it used to be
     hardcoded to the shipment's destination, so a 5-order shipment claimed one
     destination while its stops said otherwise. */
  const deliveryStopCount = canMultiStop ? splitCount(orders.length) : 1;
  const dChunk = Math.ceil(orders.length / deliveryStopCount);
  orders.forEach((o, oi) => { o.deliveryStopIdx = Math.min(Math.floor(oi / dChunk), deliveryStopCount - 1); });
  const deliveryLocs = [];
  for (let s = 0; s < deliveryStopCount; s++) {
    const dLoc = s === 0 ? destLoc : pick(LOCATIONS.filter(l => l.city !== originLoc.city && l.city !== destLoc.city));
    deliveryLocs.push(dLoc);
    const dOrders = orders.filter(o => o.deliveryStopIdx === s);
    // Same one-source rule as the pickup side (S104 Task 10b).
    const dTz = s === 0 ? destTz : (deriveTimezone(dLoc.city) || 'America/Chicago');
    const dAt = new Date(deliveryDate);
    dAt.setHours(deliveryDate.getHours() - (deliveryStopCount - 1 - s) * 3);
    stops.push({
      stopSequence: pickupStopCount + s + 1,
      stopType: 'delivery',
      orderIds: dOrders.map(o => o.orderId),
      facilityName: dLoc.facility,
      address1: faker.location.streetAddress(),
      city: dLoc.city,
      region: dLoc.state,
      postal: dLoc.zip,
      country: 'US',
      timeZone: dTz,
      // The SHIPMENT's delivery date is the LAST delivery (Jana, Feb 17 — "if
      // there are two deliveries, we will take the last one"), so the final
      // stop sits exactly on deliveryDate and earlier drops run 3h before it.
      scheduledDateTime: `${formatDate(dAt)} ${String(dAt.getHours()).padStart(2, '0')}:00 ${tzAbbrev(dTz, dAt)}`,
      appointmentTime: `${String(dAt.getHours()).padStart(2, '0')}:00 ${tzAbbrev(dTz, dAt)}`,
      // Σ of the orders dropped here (mirrors invariant I5 on the pickup side)
      grossWeightValue: dOrders.reduce((t, o) => t + o.orderGross, 0),
      grossWeightUomCode: 'LB',
      volumeValue: dOrders.reduce((t, o) => t + o.orderVolume, 0),
      volumeUomCode: 'cuft',
      // LINX-12068 (2026-08-10) — Common Structure Rule: delivery mirrors
      // pickup, only the party context differs. Sum of orders dropped here,
      // same as grossWeightValue/volumeValue above (was hardcoded null).
      packageCount: dOrders.reduce((t, o) => t + o.orderPackages, 0),
      pickupNumber: null,
    });
  }

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
    const pickupHour = faker.number.int({ min: 6, max: 16 });
    const delivHour = faker.number.int({ min: 6, max: 22 });
    // Volume commitment: pre-compute so vcOpen + vcAccept + vcDecline === commitment
    const _commitment = faker.number.int({ min: 1, max: 20 });
    const _vcOpen = faker.number.int({ min: 0, max: _commitment });
    const _vcAccept = faker.number.int({ min: 0, max: _commitment - _vcOpen });
    const _vcDecline = _commitment - _vcOpen - _vcAccept;

    // Rate details per carrier. rateAmount === rateDetails.baseRate is an invariant the
    // app itself relies on (RoutingGuideTab.jsx:814 derives the Rate column from baseRate) —
    // one draw feeds both instead of two independent ones.
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
      rateAmount: _baseRate,
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
      pickupDateTime: formatDateTime(baseDate, originTz),
      pickupTZ: originTz,
      pickupOrgHours: `${String(pickupHour).padStart(2, '0')}:00 - ${String(pickupHour + faker.number.int({ min: 6, max: 10 })).padStart(2, '0')}:30`,
      pickupOrgDay: pick(['Yes', 'No']),
      deliveryDateTime: formatDateTime(genDate(baseDate, faker.number.int({ min: 1, max: 5 })), destTz),
      deliveryOrgHours: `${String(delivHour - 6).padStart(2, '0')}:00 - ${String(delivHour).padStart(2, '0')}:59`,
      deliveryTZ: destTz,
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

  // History / Audit entries — Shipment Trail rebuild per DEC-80 (2026-08-10):
  // the Trail RENDERS backend-emitted lifecycle events, it does not author
  // user actions. Event vocabulary + detail-message templates come verbatim
  // from vault/10-domains/shipments/data/history-event-catalog.md (Pappu's
  // MVP spec, 2026-08-06); every `<Placeholder>` is filled from THIS
  // shipment's own real state (buyShipment/sellShipment/orders/
  // routingOptions/apTotal/arTotal — all computed above), never an unrelated
  // faker draw — that was exactly the S113-era bug class this rebuild fixes
  // (`pick(CARRIERS)` naming a carrier the shipment never actually tendered).
  // The old user-centric HISTORY_ACTIONS list (Carrier/Schedule/Route/Cost/
  // Document/Status Updated, Order Created, Load Assigned) is DROPPED
  // entirely — none of it is in the MVP catalog and DEC-80 rules it out of
  // scope by kind, not just by name. Pappu's spreadsheet is now the ONLY
  // source for event vocabulary. Both DEC-70's LINX-13065-sourced events are
  // dropped too: `Quote Entered` per DEC-80 ruling 3 (verbatim — it's a user
  // action), and `PGI Error Corrected` per a same-day follow-up user ruling
  // (2026-08-10) after fetching LINX-13065 directly — it turned out to be a
  // one-sentence, unrefined ticket (no acceptance criteria, status Todo,
  // zero labels) whose entire body just asks for audit entries on
  // "pgi errors...corrected, and quotes...entered." DEC-70's "verbatim from
  // LINX-13065" framing OVERSTATED that sentence as a requirement; it wasn't
  // one. PGI/PGR is out of project scope anyway (DEC-80 ruling 4), and
  // Pappu's own catalog already supplies its own PGI events (`PGI Response
  // Received`, `Post PGI Rating Completed`, both implemented below) — so
  // nothing from the LINX-13065 pair survives.
  //
  // Actor model (DEC-80 ruling 2): every entry is system- or integrated-
  // application-authored now, none user-attributed — this INVERTS DEC-70's
  // ~75%-user-attributed seeded ratio. `Net Native` (Pappu's named example of
  // an integrated application) is added to HISTORY_SYSTEM_SOURCES below.
  // Smallest honest model, not a new actor kind: "integrated application" is
  // just another VALUE of the existing `source` field, so it renders through
  // HistoryTab.jsx's existing muted-actor + gray "System" badge treatment
  // unchanged — no new visual design, per DEC-70's Figma-first rule.
  const HISTORY_SYSTEM_SOURCES = ['ERP', 'UI', 'Legacy TMS', 'Linx', 'Net Native'];

  // Which of the catalog's events actually apply to THIS shipment, and which
  // outcome variant, is GATED on real derived state (hasAccepted/hasSent/
  // tenderFailed/orderCount/apTotal/arTotal/routingOptions — all computed
  // above) — never chosen at random. This replaces the old `pick(HISTORY_
  // ACTIONS)` random-sample-of-5-to-12 model entirely, so entry COUNT is now
  // a consequence of shipment state, not an independent faker draw.
  const historyEntries = [];
  let clock = new Date(baseDate);
  clock.setDate(clock.getDate() - faker.number.int({ min: 2, max: 10 }));
  clock.setHours(faker.number.int({ min: 6, max: 16 }), pick([0, 15, 30, 45]), 0, 0);

  // Advances the shared clock forward by a random (hours) amount and returns
  // the new instant — keeps every pushed entry strictly ascending in time,
  // matching the required pipeline order (Created → ... → Update
  // Notification), unlike the old model's random-action / sorted-timestamp
  // mismatch.
  function advanceClock(minHours, maxHours) {
    const deltaMs = faker.number.float({ min: minHours, max: maxHours, fractionDigits: 3 }) * 3600 * 1000;
    clock = new Date(clock.getTime() + deltaMs);
    return new Date(clock);
  }
  // `outcome` added 2026-08-10 (failure-scenario pass, same-day follow-up to
  // DEC-80): originally 'success' | 'failure' | 'update' | 'neutral',
  // additive to `category` (which still drives other things unchanged).
  // Renderer keys badge color off this. Defaults to 'success' so every one of
  // the pre-existing calls below that never had a failure/update/neutral
  // variant needs no edit to comply with the "every entry carries outcome"
  // contract.
  //   - 'success' — the step completed AND the business result is good
  //     (e.g. Tender Accepted).
  //   - 'failure' — the step did not complete / nothing arrived (e.g. tender
  //     timeout: no carrier response received at all).
  //   - 'update'  — informational state change, neither good nor bad.
  //   - 'neutral' — DEC-81 follow-up (2026-08-10 user ruling): the step
  //     completed successfully — a response was received and recorded — but
  //     the business outcome is unfavourable or non-advancing. Not an error
  //     (nothing failed), not a good outcome either. Added specifically for
  //     Tender Response Received/Declined: a real carrier decline is exactly
  //     the event that lands a shipment in Review, and rendering it green
  //     (as a bare 'success' would) reads as "this went fine" on the very
  //     row that explains the stall. User's verbatim ruling: "A fourth
  //     neutral/amber treatment."
  //
  // DEC-87 (2026-08-12, user ruling): the four-value model above let green
  // mean "the step finished" — 11 of the 15 catalog events defaulted to
  // 'success', so a normal shipment's trail was a wall of green and green
  // stopped meaning anything. User's verbatim problem report: "there are too
  // many greens (overused means false user flags for important things)."
  // Green is now RESERVED for real milestones; a fifth value, 'info', is
  // added for outbound messaging that asserts nothing about the shipment's
  // own state. Every `pushHistory` call site that must now emit something
  // other than the 'success' default carries an EXPLICIT outcome argument —
  // nothing here is inferred at render time.
  //   - 'success' (green) — RESERVED for exactly three milestones: Tender
  //     Response Received (Accepted variant — a carrier committed), PGI
  //     Response Received (clean variant — goods issue posted; the
  //     validation-errors variant stays 'failure'), and Shipment Planning
  //     Completed (terminal: status → Done). No other call site may pass
  //     (or default to) 'success'.
  //   - 'update' (blue) — a real state change that ADVANCES the lifecycle
  //     without itself being a milestone: Shipment Created (success variant),
  //     Routing Completed (success variant), Optimization Evaluation
  //     (Consolidation branch), Consolidation Completed, Routing & Rating
  //     Completed, Ready for Tender, Auto Tender Validation (passed variant),
  //     Tender Sent, Post PGI Rating Completed, Shipment Updated (unchanged
  //     from DEC-81).
  //   - 'info' (gray, NEW) — outbound messaging that asserts nothing about
  //     the shipment's own state: Planned Shipment Sent, and Shipment Update
  //     Notification (the "successfully sent" variant only — its
  //     delivery-failed variant stays 'failure').
  //   - 'neutral' (amber) — unchanged meaning from the DEC-81 follow-up
  //     above, PLUS one reclassification: Optimization Evaluation's Hold
  //     branch ('Optimization evaluation completed. Shipment moved to
  //     Hold.') moves from 'success' to 'neutral' — it completed, but the
  //     shipment stopped advancing rather than reaching a milestone. This is
  //     OUR call implementing DEC-87, not a ratified spec answer — it
  //     deliberately resolves the Hold-branch question S114 had parked open
  //     for Pappu.
  //   - 'failure' (red) — unchanged from DEC-81.
  // Authorship (user request 2026-08-11, corrected 2026-08-12 — see
  // HistoryTab.jsx header comment for the DEC-80 partial-revisit note and
  // the 2026-08-12 correction). EVERY entry now carries an `author` — the
  // 2026-08-11 pass only gave a minority (human) entries one and left system
  // entries with no `author` object at all; user's verbatim 2026-08-12
  // correction ("system authors also exists so we need bot human nad
  // system") means system is now a real author `kind` too, not an absence.
  // The ~15% human / 85% system split and the 65/35 internal/external split
  // WITHIN human are unchanged from the 2026-08-11 pass — only the SHAPE of
  // the system branch changed (a real `{ name, kind: 'system' }` object
  // instead of `undefined`), so the faker draw sequence is unshifted: same
  // two `faker.number.float` calls in the same order as before, just with a
  // populated return on the branch that used to return early. Internal
  // roster reuses NOTE_AUTHORS rather than inventing a second names list
  // (same idea: an Odyssey ops person touching the shipment). External
  // authors are a customer contact — email domain derived from THIS
  // shipment's own `customer.name` so it plausibly belongs to the customer
  // actually on the shipment, not invented noise. System authors reuse
  // `source` verbatim as `name` (e.g. `Net Native`) — nothing invented.
  // Which catalog events a PERSON can plausibly have caused (2026-08-12 gate,
  // closing the S117 carry-forward). The 2026-08-11 pass drew human authorship
  // UNIFORMLY across every event, which let `Auto Tender Validation` — an event
  // whose own name says a machine did it — and the automated `Tender Sent` that
  // follows it be attributed to a named person. Everything in Pappu's catalog is
  // a pipeline stage a machine emits (DEC-80 ruling 2); the single exception is
  // `Shipment Updated`, which is exactly what a user editing sections in the
  // Shipment Details modal causes. Not a rate change — a truth gate: the events
  // outside this set are now system-authored 100% of the time.
  const HUMAN_AUTHORED_ACTIONS = new Set(['Shipment Updated']);
  function buildAuthor(action, source) {
    // ponytail: the three draws below happen in exactly the order and count
    // they did before the gate existed, and the name is drawn even when it is
    // then thrown away. Deliberate: shipment IDs come off this same seeded
    // stream (genUniqueSellShipment), and spotboard/board.js anchors its demo
    // fixtures to REAL seeded ids — consuming one draw fewer here would shift
    // every id allocated after it and 404 every demo row on the board. The gate
    // therefore changes ONLY authorship; the rest of the dataset is unmoved.
    // Upgrade path: if the seed is ever reallocated on purpose, delete the
    // discarded draw and re-anchor those fixtures in the same commit.
    const humanRoll = faker.number.float({ min: 0, max: 1 });
    if (humanRoll >= 0.15) {
      return { name: source, kind: 'system' }; // no email, no tooltip
    }
    const internal = faker.number.float({ min: 0, max: 1 }) < 0.65;
    const name = internal ? pick(NOTE_AUTHORS).name : pick(EXTERNAL_AUTHOR_NAMES);
    if (!HUMAN_AUTHORED_ACTIONS.has(action)) {
      return { name: source, kind: 'system' }; // machine-emitted event — never a person
    }
    const [first, last] = name.toLowerCase().split(' ');
    return internal
      ? { name, email: `${first}.${last}@odysseylogistics.com`, kind: 'internal' }
      : { name, email: `${first}.${last}@${customerEmailDomain(customer)}`, kind: 'external' };
  }

  function pushHistory(action, category, source, details, outcome = 'success') {
    const author = buildAuthor(action, source);
    historyEntries.push({
      user: source, source, timestamp: clock.toISOString(), action, category, details, outcome, author,
    });
  }
  // Oxford-comma join — Consolidation Completed's template (catalog event
  // #4) hardcodes exactly 3 `<Order Number>` placeholders; real shipments
  // here carry 1-5 orders. Listing ALL of this shipment's real orders
  // instead of truncating/padding to 3 keeps the row coherent — inventing
  // filler order numbers or dropping real ones would violate the
  // shipment-wide coherence this rebuild exists to fix. Flagged open item,
  // not silently resolved: the spec doesn't address 2-or-4+-order shipments.
  function joinOrders(items) {
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  }

  // ── Failure-scenario pass (2026-08-10, same-day follow-up to DEC-80) ──────
  // The prior pass implemented SUCCESS only, reporting the catalog's Failure/
  // third-branch variants as "no reachable signal." The user has now asked
  // for them explicitly, gated on real state where state exists, and marked
  // honestly-random where it doesn't (never silently invented as if derived).
  //
  // CROSS-TAB COHERENCE CORRECTION (coordinator-flagged, same day): the first
  // draft of this pass modeled Routing Completed / Optimization Evaluation /
  // Auto Tender Validation as TERMINAL failures on a random slice of Review
  // shipments. That was wrong and was caught by direct data verification:
  // routingOptions are generated UNCONDITIONALLY for every shipment
  // (routingCount is always 3-6, never 0) regardless of hasAccepted/hasSent —
  // confirmed against real data (every Review-terminal shipment has 3+ tender
  // rows, minimum 3, ALL of them). A shipment whose History says "Routing
  // call failed, moved to Review" while its OWN Tender tab shows 3+ carriers
  // tendered and declined is a direct cross-tab contradiction — the exact bug
  // class this whole rebuild exists to remove. Three of the four candidate
  // stages are therefore ruled out as terminal by the shipment's own data;
  // only the TENDER stage can be a real Review-causing terminal event, because
  // "tendered and every carrier declined/cancelled" is the one Review path
  // that is actually consistent with routing options always existing.
  //
  // TERMINAL vs TRANSIENT (two different failure shapes, commented at each
  // site below):
  //  - TERMINAL: the shipment genuinely ends in Review because of THIS step.
  //    The ONLY terminal stage left standing after the correction above is
  //    the tender-response step (declined/timeout), gated on isReviewTerminal
  //    (shipmentStatus === 'Review', i.e. !hasAccepted && !hasSent) — real
  //    derived state that matches the catalog's failure copy directly.
  //  - TRANSIENT: a step fails then succeeds on retry (both entries emitted,
  //    same action name back to back) — realistic audit-log shape, and lets
  //    otherwise-fine shipments still show a failure without contradicting
  //    later success. Used for Shipment Created, Routing Completed,
  //    Optimization Evaluation, Auto Tender Validation, and Shipment Update
  //    Notification — every one of these demonstrably DID succeed for every
  //    shipment in this dataset (it exists / it has tender rows / it reached
  //    Done), so a failure here can only ever be a since-retried blip, never
  //    gated on real state. Honestly random (seeded, not tied to any field),
  //    flagged as such at each site rather than dressed up as derived.
  const isReviewTerminal = !hasAccepted && !hasSent;

  // 1. Shipment Created — TRANSIENT only, honestly random (no field
  // distinguishes which shipments retried creation once).
  if (faker.number.float({ min: 0, max: 1 }) < 0.06) {
    pushHistory('Shipment Created', 'create', 'ERP',
      `Shipment creation failed for Order ${orders[0].orderId}.`, 'failure');
    advanceClock(0.01, 0.1);
  }
  pushHistory('Shipment Created', 'create', 'ERP',
    `Buy Shipment ${buyShipment} and Sell Shipment ${sellShipment} created successfully for Order ${orders[0].orderId}.`,
    'update'); // DEC-87: advances the lifecycle, not a milestone

  // 2. Routing Completed — TRANSIENT only (see cross-tab correction above):
  // routingOptions exist unconditionally, so every shipment's routing call
  // DID eventually succeed; a failure here can only be a retried blip, never
  // terminal. Honestly random, not tied to any field.
  advanceClock(0.02, 0.5);
  const totalDirectCost = costOrders.reduce((s, c) => s + c.cost.directCostAmount, 0);
  if (faker.number.float({ min: 0, max: 1 }) < 0.05) {
    pushHistory('Routing Completed', 'update', 'Linx',
      'Routing call failed. Shipment moved to Review.', 'failure');
    advanceClock(0.02, 0.3);
  }
  pushHistory('Routing Completed', 'update', 'Linx',
    `Routing completed successfully. Direct cost calculated: $${fmt(totalDirectCost)}. Eligible carriers and route details identified.`,
    'update'); // DEC-87: advances the lifecycle, not a milestone

  // 3. Optimization Evaluation — Consolidation branch for multi-order
  // shipments, Hold branch for single-order ones (order count is the only
  // optimization-relevant fact this generator tracks). TRANSIENT only, same
  // reasoning as Routing Completed above — every shipment's own routing data
  // proves it eventually cleared this stage.
  advanceClock(0.02, 0.5);
  if (faker.number.float({ min: 0, max: 1 }) < 0.05) {
    pushHistory('Optimization Evaluation', 'update', 'Linx',
      'Optimization evaluation failed. Shipment status updated to Review.', 'failure');
    advanceClock(0.02, 0.3);
  }
  const isConsolidation = orderCount > 1;
  pushHistory('Optimization Evaluation', 'update', 'Linx',
    isConsolidation
      ? 'Optimization evaluation completed. Shipment moved to Consolidation.'
      : 'Optimization evaluation completed. Shipment moved to Hold.',
    // DEC-87: Consolidation branch advances the lifecycle ('update'); Hold
    // branch completed but the shipment stopped advancing ('neutral') — OUR
    // call, not ratified spec (see outcome contract comment above, resolves
    // the Hold-branch question S114 parked for Pappu).
    isConsolidation ? 'update' : 'neutral');

  if (isConsolidation) {
    // 4. Consolidation Completed
    advanceClock(0.1, 1);
    pushHistory('Consolidation Completed', 'update', 'Linx',
      `Consolidation completed. Final Shipment ${buyShipment} contains Orders ${joinOrders(orders.map(o => o.orderId))}.`,
      'update'); // DEC-87: advances the lifecycle, not a milestone

    // 5. Routing & Rating Completed
    advanceClock(0.05, 0.5);
    pushHistory('Routing & Rating Completed', 'update', 'Linx',
      `Consolidated shipment routed and rated successfully. AP: $${fmt(apTotal)}; AR: $${fmt(arTotal)}. Carrier and route details refreshed.`,
      'update'); // DEC-87: advances the lifecycle, not a milestone
  }

  // 6. Ready for Tender
  advanceClock(1, 48);
  pushHistory('Ready for Tender', 'update', 'Linx',
    'Time-to-Tender reached. Shipment is eligible for tendering and moved to auto tender evaluation.',
    'update'); // DEC-87: advances the lifecycle, not a milestone

  // 7. Auto Tender Validation — TRANSIENT only: every shipment below actually
  // gets tendered (Tender Sent always follows), so a validation failure here
  // can only be a retried blip, never this shipment's real terminal event.
  advanceClock(0.01, 0.2);
  if (faker.number.float({ min: 0, max: 1 }) < 0.05) {
    pushHistory('Auto Tender Validation', 'tender', 'Linx',
      'Auto tender validation failed. Shipment moved for User Review.', 'failure');
    advanceClock(0.01, 0.1);
  }
  pushHistory('Auto Tender Validation', 'tender', 'Linx',
    'Auto tender validation passed. Tender initiated.',
    'update'); // DEC-87: advances the lifecycle, not a milestone

  // 8/9. Tender Sent + Tender Response Received name the SAME carrier both
  // times — this generator doesn't model re-tender cascades (Sheet3 defers
  // "Manual tendering" from MVP). focusOption is this shipment's real
  // accepted carrier, its real in-progress "Sent" carrier, or (all-declined
  // scenario) its rank-1 carrier — never an unrelated pick(CARRIERS) draw.
  // tenderFailed assigns EVERY rank an independent Declined/Cancelled draw
  // (not just rank-1), so routingOptions[0] alone can be 'Cancelled' while
  // another rank on the SAME shipment really was 'Declined' — a genuine
  // carrier response. Preferring a real Declined option here (before falling
  // back to rank-1) is what keeps the tender-timeout narrative below honest:
  // it only fires when NO option on this shipment shows a real response,
  // never alongside a Declined one.
  const focusOption = acceptedOption
    || routingOptions.find(o => o.status === 'Sent')
    || routingOptions.find(o => o.status === 'Declined')
    || routingOptions[0];
  advanceClock(0.01, 0.5);
  pushHistory('Tender Sent', 'tender', 'Net Native',
    `Tender status updated to Sent. Tender sent to carrier ${focusOption.carrierName} via ${focusOption.apiSource}.`,
    'update'); // DEC-87: advances the lifecycle, not a milestone

  if (hasAccepted) {
    advanceClock(0.5, 24);
    pushHistory('Tender Response Received', 'tender', 'Net Native',
      `Tender response received from carrier ${focusOption.carrierName} via ${focusOption.responseMethod}. Tender status updated to Accepted.`,
      'success'); // DEC-87 milestone #1: a carrier committed
  } else if (hasSent) {
    // Genuinely mid-flight (tenderStatus === 'Sent', no accepted carrier
    // yet) — no response has arrived, so NO Tender Response Received event
    // is pushed. This is the "no response event on a not-yet-responded
    // tender" guard made concrete, and it is reachable today (~15% of
    // shipments, the tenderInProgress scenario).
  } else {
    // tenderFailed (isReviewTerminal): every carrier was tendered and every
    // one declined or was cancelled (never null — routingCount is never 0
    // and tenderFailed assigns a status to every rank), so a response WAS
    // received, just not an acceptance. This IS this shipment's real
    // terminal event — the only stage the cross-tab correction above leaves
    // standing as coherent with the shipment's own tender data.
    advanceClock(0.5, 24);
    if (focusOption.status === 'Declined') {
      // DEC-81 follow-up (2026-08-10 user ruling): a real carrier decline is
      // a normal (if unhappy) SYSTEM outcome — the response arrived and was
      // recorded successfully, so this is not 'failure' (nothing failed) —
      // but it is also not a good business outcome, and these are exactly
      // the shipments that end up in Review. Was outcome: 'success' (bare
      // green) until this ruling; now 'neutral' (amber) per the user's
      // verbatim call for "a fourth neutral/amber treatment." The Accepted
      // branch above is untouched — it stays 'success'.
      pushHistory('Tender Response Received', 'tender', 'Net Native',
        `Tender response received from carrier ${focusOption.carrierName} via ${focusOption.responseMethod}. Tender status updated to Declined.`,
        'neutral');
    } else {
      // 'Cancelled' maps to the catalog's Timeout variant — this generator's
      // status enum has no literal "timeout"; "Cancelled" (no active carrier
      // decision recorded) is the closer real-world analogue than "Declined".
      pushHistory('Tender Response Received', 'tender', 'Net Native',
        'No carrier response received. Tender timed out and was automatically declined.', 'failure');
    }

    // PGI Response Received (validation-errors variant) — TERMINAL wrap-up,
    // gated on a REAL signal rather than another random draw: this
    // shipment's own orders resolve orderStatus to 'Shipment Failed'
    // whenever !hasAccepted && !hasSent (see orderStatusLabel a few hundred
    // lines below — VALIDATION_ERROR_STATUSES includes 'Shipment Failed'),
    // which is exactly the condition guarding this whole branch (isReview
    // Terminal). So every shipment that reaches here really does carry a
    // validation-error order; the PGI-errors variant is unconditional here,
    // not a coin flip.
    advanceClock(1, 24);
    pushHistory('PGI Response Received', 'completion', 'ERP',
      'PGI response received with validation errors. Moved to user review for correction.', 'failure');
  }

  // 10-15. Post-acceptance pipeline — only a shipment actually Accepted
  // (shipmentStatus === 'Done') reaches planning completion, PGI, and the
  // final update notification. A Sent-or-declined-or-earlier-terminated
  // shipment stops at the branches above.
  if (hasAccepted) {
    advanceClock(0.1, 2);
    pushHistory('Shipment Planning Completed', 'completion', 'ERP', 'Shipment status updated to Done.',
      'success'); // DEC-87 milestone #3: terminal, status → Done

    advanceClock(0.05, 1);
    pushHistory('Planned Shipment Sent', 'completion', 'ERP', 'Planned shipment details sent to customer.',
      'info'); // DEC-87: outbound messaging, asserts nothing about shipment state

    // PGI/PGR are out of project scope (DEC-80 ruling 4) — values below are
    // filled at our discretion per the user's explicit "feel free to fill
    // things that you need as you feel" ruling; no design implied or built.
    // Accepted shipments always get the clean PGI success text here — the
    // validation-errors variant above is reachable only via the tenderFailed
    // (Review) branch, matching the real VALIDATION_ERROR_STATUSES gate.
    advanceClock(12, 72);
    pushHistory('PGI Response Received', 'completion', 'ERP',
      'PGI received and execution updates applied to orders and shipment.',
      'success'); // DEC-87 milestone #2: clean PGI, goods issue posted

    advanceClock(0.1, 2);
    const plannedCost = acceptedOption.rateDetails.baseRate;
    const variance = Math.round((apTotal - plannedCost) * 100) / 100;
    const varianceSign = variance >= 0 ? '+' : '-';
    pushHistory('Post PGI Rating Completed', 'completion', 'ERP',
      `Buy and Sell shipments rated successfully following PGI update. Planned Cost: $${fmt(plannedCost)}, Actual Cost (AP): $${fmt(apTotal)}, Variance: ${varianceSign}$${fmt(Math.abs(variance))}, Sell Rate (AR): $${fmt(arTotal)}.`,
      'update'); // DEC-87: advances the lifecycle, not a milestone

    // Event #15, Shipment Updated — NOT part of the linear pipeline list in
    // this rebuild's brief; gated on a real signal (this shipment actually
    // carries a post-quote AP discount or accessorial, i.e. its cost WAS
    // revised) rather than emitted unconditionally, so it doesn't duplicate
    // what Routing & Rating Completed already said for every accepted
    // consolidated shipment. The catalog gives TWO variants here (both
    // outcome: 'update', not failures) — split on which real cost component
    // actually moved: a discount implies the rate/route was renegotiated
    // (Transportation Relevant); an accessorial-only change is a rating-only
    // adjustment (Non-Transportation Relevant). Mutually exclusive by
    // construction (apDiscount checked first), so only one fires per
    // shipment — both variants are reachable across the dataset.
    if (apDiscount > 0) {
      advanceClock(1, 24);
      pushHistory('Shipment Updated', 'update', 'ERP',
        `Shipment updated (Transportation Relevant). AP Cost: $${fmt(apTotal)}; AR Rate: $${fmt(arTotal)}. Routing and rating recalculated successfully.`,
        'update');
    } else if (apAccessorials > 0) {
      advanceClock(1, 24);
      pushHistory('Shipment Updated', 'update', 'ERP',
        `Shipment updated (Non-Transportation Relevant). AP Cost: $${fmt(apTotal)}; AR Rate: $${fmt(arTotal)}. Rating recalculated successfully.`,
        'update');
    }

    // Shipment Update Notification — TRANSIENT only, same honestly-random
    // shape as Shipment Created above: no real field distinguishes which
    // accepted shipments hit a delivery failure on this outbound message, so
    // a modest random share retries once before the (always-present) success.
    advanceClock(0.05, 1);
    if (faker.number.float({ min: 0, max: 1 }) < 0.08) {
      pushHistory('Shipment Update Notification', 'completion', 'Legacy TMS',
        'Buy Shipment Out and Sell Shipment Out message delivery failed.', 'failure');
      advanceClock(0.05, 0.5);
    }
    pushHistory('Shipment Update Notification', 'completion', 'Legacy TMS',
      'Buy Shipment Out and Sell Shipment Out message successfully sent.',
      'info'); // DEC-87: outbound messaging, asserts nothing about shipment state
  }

  // Notes — S111 (user ruling 2026-08-05): the S108 "min 1" fix over-corrected
  // into EVERY shipment carrying a note, which isn't realistic — most
  // shipments are unremarkable and untouched; worked/exception ones
  // accumulate a few. Weighted target ~65% zero / ~25% one–two / ~10%
  // three–five, biased by `panel` (already computed above, so keying off it
  // is free): EXCEPTIONS shipments are the ones people actually work, so they
  // skew toward the higher buckets; MONITORING is weighted to pull the
  // blended average back to the stated target (panel splits ~30/70 —
  // see hasAccepted/hasSent above). The Notes tab already supports
  // add/edit/delete, so this is purely seed shape, not a feature change.
  const NOTE_BUCKET_WEIGHTS = panel === 'exceptions'
    ? [{ value: 0, weight: 49 }, { value: 1, weight: 32 }, { value: 2, weight: 19 }]
    : [{ value: 0, weight: 72 }, { value: 1, weight: 22 }, { value: 2, weight: 6 }];
  const noteBucket = faker.helpers.weightedArrayElement(NOTE_BUCKET_WEIGHTS);
  const noteCount = noteBucket === 0 ? 0
    : noteBucket === 1 ? faker.number.int({ min: 1, max: 2 })
    : faker.number.int({ min: 3, max: 5 });
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
    // the DELIVERY stop it is assigned to (was hardcoded to the shipment's
    // destination until 2026-07-30, which contradicted the stop list on every
    // multi-delivery shipment). I2 — the order belongs to the shipment's
    // customer, never a random one.
    const shipFromLoc = stopLocs[ord.pickupStopIdx];
    const shipToLoc = deliveryLocs[ord.deliveryStopIdx];
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
    const orderEquipCode = pick(EQUIPMENT_CODES);
    const orderEquipRef = faker.number.float({ min: 0, max: 1 }) < 0.25
      ? `TANK-${faker.number.int({ min: 1000, max: 9999 })}`
      : null;
    const orderCarrier = faker.number.float({ min: 0, max: 1 }) < 0.20
      ? pick(CARRIERS).scac
      : null;
    // Minted with the order (see the orders loop) so stop + shipment agree.
    const orderPickupNumber = ord.pickupNumber;
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
      userDefinedFieldList: genUserDefinedFields(),
      poNumber: ord.poNumber, // LINX-12039 — minted once with the order (see the orders loop)
      planningDateType: ord.planningDateType, // LINX-12898
      bolNo: `BOL-${faker.number.int({ min: 100000, max: 999999 })}`,
      shipDirectionCode: shipDirection, // I2 — same value as the shipment + order row
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
    pickupNumbers,
    poNumbers,
    // LINX-11597 verbatim — Direct (1 mapped order) vs Consolidation (>1).
    shipmentType: orderCount === 1 ? 'Direct' : 'Consolidation',
    planningType,
    // Multi-leg linkage triplet (007_multileg_chains.sql, user ruling
    // 2026-08-05) — null on every normal, single-leg shipment. Chain
    // participants get these three overwritten together by buildChainLegs
    // AFTER generation, never independently (invariant 7/8).
    legType: null,
    // NAME NOTE: the row field is `shipmentSequenceLeg`, matching BOTH the
    // ColumnPanel key and the live API's alias (`sequence_leg AS
    // "shipmentSequenceLeg"`). Calling it `sequenceLeg` here would render fine
    // in live mode and stay BLANK in mock mode, since the column accessor reads
    // the row property by that exact key.
    shipmentSequenceLeg: null,
    nextShipmentId: null,
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
    // Was hardcoded 'sell' — the buy/sell DTO side, a field nothing in the app
    // ever read (grep-verified, 2026-08-05). S108 repurposes the ONE
    // `shipmentType` name for the real concept (LINX-11597 Direct/Consolidation,
    // same value as mainRow.shipmentType) rather than carrying two differently-
    // meaning fields under the same key.
    shipmentType: mainRow.shipmentType,
    customerId: customer.id,
    customerName: customer.name,
    shipDirection,
    freightTerms,
    incotermInfo: pick(['FOB', 'CIF', 'EXW', 'DDP', 'FCA']),
    numberOfStops: stops.length,
    pgiFlag: faker.datatype.boolean(),
    ratingStatus: pick(['Rated', 'Not Rated', 'Pending']),
    // Tracking Link (R2-1). The real contract has no such field yet, so the URL
    // SHAPE IS INVENTED — flagged in the orders decision log. Per the 2026-07-30
    // annotated spec the link hangs off the Pro/Booking # value.
    trackingUrl: `https://tracking.oneodyssey.com/t/${mainRow.pro}`,
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
    // R2-3: the created instant, drawn ONCE — createdAt and createdTimeZoneCode
    // below both reuse it (see orderRow.createdTimeZoneCode comment).
    const createdInstant = new Date(w.earliestPickup.getTime() - faker.number.int({ min: 24, max: 240 }) * 3600e3);
    const orderRow = {
      orderNumber: ord.orderId,
      orderId: ord.numericOrderId,
      orderSource: faker.number.float({ min: 0, max: 1 }) < 0.85 ? 'INTEGRATED' : 'MANUAL',
      customer: customer.id, // I2
      shipDirection,
      freightTerms,
      equipment: h.equipmentCode, // I7
      poNumber: h.poNumber, // LINX-12039
      planningDateType: h.planningDateType, // LINX-12898
      consignor: {
        locationId: locationIdFor(from, ord.shipFromLocIdx),
        name: from.facility,
        address: `${faker.number.int({ min: 100, max: 9900 })} ${faker.location.street()}`,
        city: from.city, state: from.state, country: 'US',
        earliestPickupDateTime: toIsoLocal(w.earliestPickup),
        latestPickupDateTime: toIsoLocal(w.latestPickup),
      },
      consignee: {
        locationId: locationIdFor(to, ord.shipToLocIdx),
        name: to.facility,
        address: `${faker.number.int({ min: 100, max: 9900 })} ${faker.location.street()}`,
        city: to.city, state: to.state, country: 'US',
        earliestDeliveryDateTime: toIsoLocal(w.earliestDelivery),
        latestDeliveryDateTime: toIsoLocal(w.latestDelivery),
      },
      grossWeight: { value: ord.orderGross, uom: 'lbs' }, // I5
      volume: { value: ord.orderVolume, uom: 'cbf' },
      commodity: ord.lines[0].itemDescription, // I7
      orderStatus: orderStatusLabel,
      hazardous: ord.lines.some(l => !!l.hazmatCode), // LINX-12102 — derived from lines (matches detail hazmat fields), not an independent draw
      createdAt: toIsoLocal(createdInstant),
      createdBy: pick(ORDER_USERS),
      // R2-3: zone sibling of createdAt, same instant (computed once above —
      // a second faker/Date draw would shift the stream). Zone source =
      // consignor (origin) city is INVENTED — no LINX field names one;
      // flagged for the orders decision log.
      createdTimeZoneCode: tzAbbrev(deriveTimezone(from.city) || 'America/Chicago', createdInstant),
    };
    if (VALIDATION_ERROR_STATUSES.includes(orderRow.orderStatus)) {
      orderRow.draftOrderStatus = pick(DRAFT_ORDER_STATUS_POOL);
      orderRow.errorCount = genErrorCount();
    }
    orderRows.push(orderRow);
    // I8 — most shipped orders get full ManualOrder enrichment, so the Order
    // Summary shows the SAME lines/instructions/services as the shipment detail;
    // the remainder resolve through the lean row (consistent aggregates).
    //
    // S113 (2026-08-07) raised this from 0.25 to 0.65 (user call). The lean-row
    // fallback was a generator shortcut, not a domain truth: real orders carry
    // their product detail whatever the source. At 25%, 71% of orders (17,004)
    // had manual_order NULL, and since product lines live ONLY inside that
    // payload, View Order had to synthesise a single line from the flat
    // `commodity` string — so its product table was mostly dashes (visible once
    // ORD-13 made the table equipment-driven). 0.65 keeps a real population of
    // lean orders rather than pretending every order is fully detailed.
    //
    // The draw is still CONSUMED rather than deleted: faker is seeded, so
    // removing the call would shift every subsequent random draw and change the
    // whole dataset. Keeping it means the ONLY delta is added enrichment.
    if (faker.number.float({ min: 0, max: 1 }) < 0.65) {
      const enrichment = buildOrderEnrichment({
        orderNumber: ord.orderId,
        customer, freightTerms, shipDirection,
        header: h, lines: ord.lines, window: w,
        instructionList: instrOrders[oi].instructionList,
        fromIdx: ord.shipFromLocIdx, toIdx: ord.shipToLocIdx,
      });
      orderEnrichments[ord.orderId] = enrichment;
    }
  });

  // _delivery: the raw Date (not the formatted string) — buildChainLegs needs
  // the actual instant to floor the NEXT leg's pickup against (invariant 3).
  // Not part of the mainRow/detail contract; ignored by every other caller.
  return { mainRow, detail, _delivery: deliveryDate };
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
      hazardous: l.hazmatCode ? true : undefined,
      grossWeightValue: l.grossWeightValue,
      grossWeightUomCode: 'lb',
      volumeValue: l.volumeValue,
      volumeUomCode: 'cuft',
      shipClass: l.shipClassCode,               // class TYPE code (H/C/P/N)
      handlingUnit: l.handlingUnit,             // PLT/BOX/DRM/BUL/CRT
      handlingUnitCount: l.packageCount,
      lengthValue: l.lengthValue,
      widthValue: l.widthValue,
      heightValue: l.heightValue,
      dimensionUomCode: 'ft',
      harmonizedCode: l.harmonizedCode,
      declaredValue: l.declaredValue,
      declaredValueCurrency: l.declaredValueCurrency,
      manufacturingCountryCode: 'United States', // matches the form's COUNTRIES select values
      stccCode: l.stccCode,
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
// UNSHIPPED ORDERS (Orders-side only — I6/I9)
// ============================================================
// Orders that exist but are NOT on any shipment yet: awaiting planning, drafts,
// failures, cancellations, and a few number-less async creations (I9). Facts
// follow the same invariants (line roll-ups, ordered date windows, shared
// location ids) so the create-form contract can explain every row.

// Weighted pre-plan statuses (I6) — HOLD is a flag, not a status.
const UNSHIPPED_STATUS_POOL = [
  ...Array(50).fill('Ready For Plan'),
  ...Array(20).fill('Draft'),
  ...Array(18).fill('Planning Failed'),
  ...Array(12).fill('Cancelled'),
];

// "Created By" / "Last Edited By" pool — Odyssey USERNAMES (R2-4, user ruling
// 2026-08-01: a display name is ambiguous when two users share one).
// DEVIATES from LINX-11663 ("plain full names") — logged in the orders decision
// log. Drawn from the SEEDED users, so every created_by resolves to a real row
// in `users`; the invented names are replaced when the user-management domain
// arrives (user, 2026-08-02).
const ORDER_USERS = ORDER_AUTHOR_USERNAMES;
const VALIDATION_ERROR_STATUSES = ['Planning Failed', 'Shipment Failed'];
const DRAFT_ORDER_STATUS_POOL = ['Ready', 'Ready', 'Ready', 'Complete', 'Complete', 'Purge'];

// Long, MULTILINE-worthy instruction bodies for the rich unshipped orders.
const LONG_INSTRUCTIONS = [
  'RECEIVING PROTOCOL:\n1. Check in at the guard shack with BOL and photo ID — no exceptions.\n2. Tarps remain ON until a dock door is assigned by the receiving supervisor.\n3. Hazmat loads stage in the marked lane only; placards verified before unload.\n4. Overages, shortages and damages must be noted on the POD before the driver leaves the yard.',
  'PLANT SHUTDOWN WINDOW: The Geismar facility is dark June 28 – July 6 for turnaround.\nNo deliveries will be received during that window.\nLoads arriving early must be scheduled through central dispatch at least 48 hours in advance; detention will not be honored for unscheduled arrivals.',
  'TEMPERATURE LOG REQUIREMENT:\nMaintain product between 40F and 75F for the entire transit.\nRecord readings at pickup, every 4 hours in transit, and at delivery.\nSubmit the complete log with the POD — invoices without a temperature log will be short-paid per the quality agreement.',
];

function generateUnshippedOrder(n, pending) {
  const customer = pickCustomer();
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
      packageCount: faker.number.int({ min: 5, max: 80 }),
      shipClassCode: pick(SHIP_CLASS_CODES),     // class TYPE (H/C/P/N)
      handlingUnit: pick(HANDLING_UNITS).code,   // PLT/BOX/DRM/BUL/CRT
      lengthValue: faker.number.int({ min: 2, max: 6 }),
      widthValue: faker.number.int({ min: 2, max: 6 }),
      heightValue: faker.number.int({ min: 2, max: 6 }),
      harmonizedCode: `${faker.number.int({ min: 2800, max: 3999 })}.${faker.string.numeric(2)}.${faker.string.numeric(2)}.${faker.string.numeric(2)}`,
      stccCode: faker.string.numeric(7),
      declaredValue: faker.number.int({ min: 2000, max: 50000 }),
      declaredValueCurrency: 'USD',
      hazmat: product.hazmat, // local only — not serialized; feeds row.hazardous derivation below
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

  const numericOrderId = nextOrderId();
  const orderNumber = pending ? '' : genOrderNumber(customer, numericOrderId);
  // R2-3: the created instant, drawn ONCE — createdAt and createdTimeZoneCode
  // below both reuse it (a second faker/Date draw would shift the stream).
  const createdInstant = new Date(earliestPickup.getTime() - faker.number.int({ min: 24, max: 240 }) * 3600e3);
  // Zone source = consignor (origin) city is INVENTED — no LINX field names
  // one; flagged for the orders decision log. Hoisted once so created and
  // last-edit STRUCTURALLY share the same zone, not by comment convention.
  const zone = deriveTimezone(from.city) || 'America/Chicago';
  const row = {
    orderNumber,
    orderId: numericOrderId, // pending rows' only handle; present on all rows (LINX-9742)
    // Pending rows came through the async manual-create flow (I9)
    orderSource: pending ? 'MANUAL' : pick(['INTEGRATED', 'INTEGRATED', 'MANUAL']),
    customer: customer.id,
    poNumber: genOrderPoNumber(), // LINX-12039
    planningDateType: genPlanningDateType(), // LINX-12898
    shipDirection: pick(SHIP_DIRECTION_CODES),
    freightTerms: pick(PAYMENT_TERM_CODES),
    equipment: pick(EQUIPMENT_CODES),
    consignor: {
      locationId: locationIdFor(from, originIdx),
      name: from.facility,
      address: `${faker.number.int({ min: 100, max: 9900 })} ${faker.location.street()}`,
      city: from.city, state: from.state, country: 'US',
      earliestPickupDateTime: toIsoLocal(earliestPickup),
      latestPickupDateTime: toIsoLocal(latestPickup),
    },
    consignee: {
      locationId: locationIdFor(to, destIdx),
      name: to.facility,
      address: `${faker.number.int({ min: 100, max: 9900 })} ${faker.location.street()}`,
      city: to.city, state: to.state, country: 'US',
      earliestDeliveryDateTime: toIsoLocal(earliestDelivery),
      latestDeliveryDateTime: toIsoLocal(latestDelivery),
    },
    grossWeight: { value: gross, uom: 'lbs' },
    volume: { value: volume, uom: 'cbf' },
    commodity: lines[0].itemDescription,
    orderStatus: pending ? 'Ready For Plan' : pick(UNSHIPPED_STATUS_POOL),
    hazardous: lines.some(l => l.hazmat), // LINX-12102 — derived from lines, not an independent draw
    createdAt: toIsoLocal(createdInstant),
    createdBy: pick(ORDER_USERS),
    createdTimeZoneCode: tzAbbrev(zone, createdInstant), // R2-3: zone sibling of createdAt, same instant
  };
  if (row.orderStatus === 'Draft') {
    row.lastEditAt = toIsoLocal(new Date(new Date(row.createdAt).getTime() + faker.number.int({ min: 1, max: 72 }) * 3600e3));
    // R2-4: last-edit zone shares `zone` with created (no second location
    // exists for a draft edit) — the LLD sibling pattern.
    row.lastEditTimeZoneCode = tzAbbrev(zone, new Date(row.lastEditAt));
    row.lastEditedBy = pick(ORDER_USERS);
  }
  if (VALIDATION_ERROR_STATUSES.includes(row.orderStatus)) {
    row.draftOrderStatus = pick(DRAFT_ORDER_STATUS_POOL);
    row.errorCount = genErrorCount();
  }

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
      poNumber: genPoNumber(), // real PO shapes (LINX-12039) — was PO-######
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
        hazardous: l.hazmat || undefined,
        grossWeightValue: l.grossWeightValue,
        grossWeightUomCode: 'lb',
        volumeValue: l.volumeValue,
        volumeUomCode: 'cuft',
        shipClass: l.shipClassCode,               // class TYPE code (H/C/P/N)
        handlingUnit: l.handlingUnit,             // PLT/BOX/DRM/BUL/CRT
        handlingUnitCount: l.packageCount,
        lengthValue: l.lengthValue,
        widthValue: l.widthValue,
        heightValue: l.heightValue,
        dimensionUomCode: 'ft',
        harmonizedCode: l.harmonizedCode,
        declaredValue: l.declaredValue,
        declaredValueCurrency: l.declaredValueCurrency,
        manufacturingCountryCode: 'United States', // matches the form's COUNTRIES select values
        stccCode: l.stccCode,
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

// ============================================================
// MULTI-LEG LINKAGE CHAINS (007_multileg_chains.sql, user ruling 2026-08-05)
// ============================================================
// A journey split across carriers/contracts becomes N `shipments` rows (one
// per leg), stitched by legType + shipmentSequenceLeg + nextShipmentId. Built as a
// real route FIRST — shared customer, N+1 DISTINCT waypoints, a strictly
// forward timeline — then sliced into legs, because that is the only way to
// get destination[N] === origin[N+1] and delivery[N] <= pickup[N+1] to hold
// EVERY time: drawing each leg's geography/dates independently (like a
// standalone shipment does) would make two legs agree only by astronomical
// coincidence.
//
// legType — only 'Pooling' and 'Rule 11' are generated, the two values the
// CSV's Next Shipment ID note explicitly names ("used for pooling or Rule
// 11"). The CSV's other two "Shipment Type" values are deliberately NOT
// generated:
//   'Line haul' names a ROLE within a chain (the long middle segment), not a
//   chain-wide type — coherently seeding it needs a scheme where one chain
//   can mix types by leg position, which is a bigger feature than this task
//   (open question Q1.2, questions-for-jana-2026-08-05.md).
//   'Cross customer' does not read as a multi-leg concept at all — it
//   describes whose freight shares a truck, not a route split into legs.
//   Seeding it as a chain type would itself be the incoherence this whole
//   feature exists to avoid (open question Q1.5, same doc).
const LEG_TYPES = ['Pooling', 'Rule 11'];

// Builds ONE complete chain of `legCount` shipment rows and returns them as
// [{ mainRow, detail }, …] in leg order, linkage fields already set.
function buildChainLegs(legCount) {
  const legType = pick(LEG_TYPES);           // invariant 7: one type per chain
  const customer = pickCustomer();           // invariant 2: same customer per chain
  // invariant 1: legCount+1 DISTINCT waypoints (30 unique cities in the pool,
  // ample for a 2–3 leg chain) sliced into consecutive (origin, dest) pairs —
  // leg N's destination IS leg N+1's origin because they are the same object.
  const waypoints = faker.helpers.arrayElements(LOCATIONS, legCount + 1);
  // First leg's pickup instant; each subsequent leg's is derived below from
  // the ACTUAL delivery instant generateShipment produced (transitDays is
  // randomized inside it, so it can't be predicted from out here).
  let legPickup = faker.date.between({ from: '2026-01-01', to: '2026-06-30' });
  legPickup.setHours(faker.number.int({ min: 6, max: 16 }), pick([0, 30]), 0, 0);

  const legs = [];
  for (let leg = 0; leg < legCount; leg++) {
    const { mainRow, detail, _delivery } = generateShipment(0, {
      customer, originLoc: waypoints[leg], destLoc: waypoints[leg + 1], baseDate: legPickup,
    });
    legs.push({ mainRow, detail });
    // invariant 3: next leg's pickup is never before this leg's delivery. A
    // 0–48h layover (pool dwell / interchange) reads as realistic rather than
    // a suspicious back-to-back handoff at the exact same instant every time.
    legPickup = new Date(_delivery.getTime() + faker.number.int({ min: 0, max: 48 }) * 3600e3);
  }

  // invariants 4–6, applied together so they can never disagree: dense
  // 1-based sequence, next_shipment_id points at the ACTUAL next row's
  // buyShipment (the user-facing shipment ID — LINX-11591/12490, same id the
  // grid's own Buy Shipment # column shows), null terminates the last leg.
  legs.forEach((l, i) => {
    l.mainRow.legType = legType;
    l.mainRow.shipmentSequenceLeg = i + 1;
    l.mainRow.nextShipmentId = i < legs.length - 1 ? legs[i + 1].mainRow.buyShipment : null;
  });
  return legs;
}

// ============================================================
// DATASET BUILDER + CLI
// ============================================================

// Build the whole dataset IN MEMORY (no fs). Deterministic per seed 42 across
// repeated in-process calls because all module state is reset up front.
//   totalShipments   — mainRows generated (each carries 1–5 shipped orders)
//   unshippedOrders  — Orders-only pre-plan rows; default 25% of shipments,
//                      which is 550 at the CLI default of 2200 (byte-identical)
//   pendingOrders    — number-less async-create rows (I9)
export function buildDataset({
  totalShipments = 2200,
  unshippedOrders = Math.round(totalShipments * 0.25),
  pendingOrders = 20,
} = {}) {
  faker.seed(42);
  resetGeneratorState();

  const shipments = [];       // mainRow per shipment
  const details = new Map();  // sellShipment -> SellShipmentOut detail

  // ~4% of shipments join a chain (user ruling 2026-08-05: "realistic
  // minority … chains of 2 (most) and 3 (fewer)"). The budget is a TARGET,
  // not a hard cap — chains are built whole, so once the remaining budget
  // can't fit even a 2-leg chain, building stops rather than truncating a
  // chain mid-journey (which would orphan a leg and break invariant 5/6).
  let chainBudget = Math.round(totalShipments * 0.04);
  while (chainBudget >= 2) {
    // 2-leg chains are "most"; 3-leg are "fewer" — weighted 70/30, and only
    // offered when the budget can still fit one.
    const legCount = (chainBudget >= 3 && faker.number.float({ min: 0, max: 1 }) < 0.3) ? 3 : 2;
    for (const leg of buildChainLegs(legCount)) {
      shipments.push(leg.mainRow);
      details.set(leg.mainRow.sellShipment, leg.detail);
    }
    chainBudget -= legCount;
  }

  for (let i = shipments.length; i < totalShipments; i++) {
    const { mainRow, detail } = generateShipment(i);
    shipments.push(mainRow);
    details.set(mainRow.sellShipment, detail);
  }

  for (let n = 0; n < unshippedOrders; n++) orderRows.push(generateUnshippedOrder(n, false));
  for (let n = 0; n < pendingOrders; n++) orderRows.push(generateUnshippedOrder(n, true));

  // orderRows / orderEnrichments are the module accumulators generateShipment +
  // generateUnshippedOrder pushed into — hand them back as the dataset's orders.
  return { shipments, details, orders: orderRows, orderDetails: orderEnrichments };
}

// Write the dataset to disk exactly as the original top-level driver did.
function writeOutputs({ shipments, details, orders, orderDetails }) {
  const outDir = new URL('../src/data/', import.meta.url);
  writeFileSync(new URL('shipments.json', outDir), JSON.stringify(shipments, null, 2));

  const detailsDir = new URL('../public/details/', import.meta.url);
  const detailsDirPath = new URL('.', detailsDir).pathname;
  mkdirSync(detailsDirPath, { recursive: true });
  if (existsSync(detailsDirPath)) {
    for (const f of readdirSync(detailsDirPath)) {
      if (f.endsWith('.json')) unlinkSync(detailsDirPath + f);
    }
  }
  for (const [id, detail] of details) {
    writeFileSync(detailsDirPath + id + '.json', JSON.stringify(detail));
  }

  writeFileSync(new URL('orders.json', outDir), JSON.stringify(orders, null, 1));
  writeFileSync(new URL('order-details.json', outDir), JSON.stringify(orderDetails));
}

// CLI: unchanged behavior — 2200 shipments, same seed, same files.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log('Generating 2200 shipments...');
  const ds = buildDataset();
  writeOutputs(ds);
  const unshippedCount = Math.round(2200 * 0.25);
  const shippedOrderCount = ds.orders.length - unshippedCount - 20;
  console.log(`Done! Generated ${ds.shipments.length} shipments.`);
  console.log(`  shipments.json: ${ds.shipments.length} rows`);
  console.log(`  public/details/: ${ds.details.size} detail files`);
  console.log(`  orders.json: ${ds.orders.length} rows (${shippedOrderCount} shipped + ${unshippedCount} unshipped + 20 pending/number-less)`);
  console.log(`  order-details.json: ${Object.keys(ds.orderDetails).length} enriched orders`);
}
