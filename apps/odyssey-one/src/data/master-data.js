// src/data/master-data.js — master-data pools for the create-order mock lookups.
// Shared pools come from tools/data-pools.mjs (A7: master data is shared
// cross-domain — the grid generator and these lookups must agree). Pools that
// only the create flow needs (freight terms, ship classes, special services,
// carriers, timezones, UoMs) are defined here. `frequency` drives the
// LINX-7553 frequency sort in lookupService; values are PROVISIONAL fakes.
import { CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, CHEMICAL_PRODUCTS, locationIdFor } from '../../tools/data-pools.mjs'

export { CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, CHEMICAL_PRODUCTS }

// ── Owning organizations (typeahead) ───────────────────────
export const OWNING_ORGS = CUSTOMERS.map((c, i) => ({
  value: c.id,
  label: c.name,
  frequency: CUSTOMERS.length - i,
}))

// ── Equipment (typeahead, scoped by Owning Organization) ───
// REAL vocabulary (lookup-only swap, 2026-07-28 — lookup-vocabularies research):
// codes from the LINX-13893 matrix + old-TMS captures. The SHARED generator
// pool (EQUIPMENT_CODES = FLT/LTH/VAN/REEFER) is deliberately untouched —
// swapping it requires regen + Neon reseed (DB ledger; end-of-Orders reseed).
// Descriptions: TL/TLR/TLF old-system verbatim; others standard or inferred
// (LTH/TLH/TT UNCONFIRMED — open Q with Ramesh/master-data).
export const EQUIPMENT_LABELS = {
  LTL: 'Less Than Truckload', LTR: 'LTL Refrigerated', LTH: 'LTL Hazmat',
  TL: 'Truck Load', TLR: 'Refrigerated Box Trailer', TLH: 'TL Hazmat',
  TT: 'Tank Truck', TLF: 'Frozen Box Trailer',
  LCL: 'Less than Container Load', FCL: 'Full Container Load', RR: 'Rail',
}
export const EQUIPMENT_LOOKUP_CODES = Object.keys(EQUIPMENT_LABELS)
// Orgs listed here see a restricted subset; everyone else sees the full
// catalog (plan decision 15 — proves org scoping observably in mock mode).
export const EQUIPMENT_SCOPE = {
  ACME_LOG_01: ['TL', 'TLR', 'LTL', 'LTR'],
  WEYERH_01: ['TL', 'TLF', 'RR', 'FCL', 'LCL'],
}

// ── Plain selects ──────────────────────────────────────────
// QA-build catalog (inbox screenshot 2026-07-27): 5 display labels, default
// Pre-Paid. Wire codes (PPD/COL/…?) unconfirmed — value=label until master
// data answers (open Q, freight-terms lookup).
export const FREIGHT_TERMS = [
  { value: 'Pre-Paid', label: 'Pre-Paid' },
  { value: 'Collect', label: 'Collect' },
  { value: 'Pre-Paid/Add', label: 'Pre-Paid/Add' },
  { value: 'Third Party', label: 'Third Party' },
  { value: 'No Charge', label: 'No Charge' },
]
export const SHIP_DIRECTIONS = [
  { value: 'Outbound', label: 'Outbound' },
  { value: 'Inbound', label: 'Inbound' },
]
// The 4-option class lookup (domain-analysis §3.3). Column label stays the
// interim constant "Ship Class" (Q26 residual — Efrain owns the canonical pick).
export const SHIP_CLASSES = ['Product Class', 'Commodity', 'Harmonized', 'NMFC']

// Reference types for the References rows (Figma 6238:24599). Mock of the
// real `reference-codes/lookup` master data (LINX-6036); Pickup/PO Number are
// selectable types like any other — picking one locks the row's type cell.
export const REFERENCE_TYPES = ['Pickup Number', 'PO Number', 'BOL Number', 'Delivery Number', 'Sales Order Number', 'Seal Number', 'Shipment Number']

// ── Special services (typeahead; codes from screens 5) ─────
export const SPECIAL_SERVICES = [
  { code: 'PALEXG', description: 'Pallet Jack', frequency: 90 },
  { code: 'PJC', description: 'Pallet Exchange', frequency: 80 },
  { code: 'LFT', description: 'Lift gate', frequency: 75 },
  { code: 'INSD', description: 'Inside Delivery', frequency: 50 },
  { code: 'RESD', description: 'Residential Delivery', frequency: 35 },
  { code: 'LUMP', description: 'Lumper Service', frequency: 20 },
]

// ── Carriers (SCAC typeahead; free-typed values also allowed) ──
// Mock of master-data/v1/scac-carrier/lookup (QA capture 2026-07-27,
// vault-sources/10-domains/orders/carriers.png): label "<SCAC> - <NAME>",
// alphabetical by NAME (LINX-8126), many QA rows carry a "(DNU)" prefix.
// First 7 (DNU) entries are QA-verbatim; the rest generated in the same style.
export const CARRIERS = [
  { scac: 'KNGT', name: 'KNIGHT-SWIFT TRANSPORTATION' },
  { scac: 'SCNN', name: 'SCHNEIDER NATIONAL' },
  { scac: 'JBHT', name: 'J.B. HUNT TRANSPORT' },
  { scac: 'WERN', name: 'WERNER ENTERPRISES' },
  { scac: 'ODFL', name: 'OLD DOMINION FREIGHT LINE' },
  { scac: 'SAIA', name: 'SAIA LTL FREIGHT' },
  { scac: 'TAPT', name: '(DNU) GLEN TAY TRANS' },
  { scac: 'GEL9', name: '(DNU) GLOBAL TRANZ' },
  { scac: 'GBYN', name: '(DNU) GO BY TRUCK' },
  { scac: 'GAFX', name: '(DNU) GREATWIDE' },
  { scac: 'GSCR', name: '(DNU) GROCERS SUPPLY' },
  { scac: 'GFCG', name: '(DNU) GULF STATES CA' },
  { scac: 'HWCI', name: '(DNU) HANDLE WITH' },
  { scac: 'ABFS', name: 'ABF FREIGHT SYSTEM' },
  { scac: 'AACT', name: 'AAA COOPER TRANSPORTATION' },
  { scac: 'AVRT', name: 'AVERT TRANSPORTATION' },
  { scac: 'BDVL', name: 'BLUE DIAMOND VAN LINES' },
  { scac: 'CLNI', name: 'CELADON TRUCKING' },
  { scac: 'CNWY', name: 'CONWAY FREIGHT' },
  { scac: 'CRST', name: 'CRST INTERNATIONAL' },
  { scac: 'CTII', name: 'CENTRAL TRANSPORT' },
  { scac: 'DAFG', name: 'DAYTON FREIGHT LINES' },
  { scac: 'DHRN', name: 'D.M. BOWMAN' },
  { scac: 'EXLA', name: 'ESTES EXPRESS LINES' },
  { scac: 'FXFE', name: 'FEDEX FREIGHT' },
  { scac: 'FXNL', name: 'FEDEX NATIONAL LTL' },
  { scac: 'HJBT', name: 'HEARTLAND EXPRESS' },
  { scac: 'HMES', name: 'USF HOLLAND' },
  { scac: 'KLLM', name: 'KLLM TRANSPORT SERVICES' },
  { scac: 'LKVL', name: 'LAKEVILLE MOTOR EXPRESS' },
  { scac: 'MGNM', name: 'MAGNUM LTL' },
  { scac: 'MRTN', name: 'MARTEN TRANSPORT' },
  { scac: 'MTVL', name: 'MONTREAL VAN LINES' },
  { scac: 'NEMF', name: 'NEW ENGLAND MOTOR FREIGHT' },
  { scac: 'PAAF', name: 'PAN AM FREIGHT' },
  { scac: 'PITD', name: 'PITT OHIO EXPRESS' },
  { scac: 'PRIJ', name: 'PRIME INC' },
  { scac: 'PYLE', name: 'A. DUIE PYLE' },
  { scac: 'RDWY', name: 'ROADWAY EXPRESS' },
  { scac: 'RETL', name: 'REDDAWAY' },
  { scac: 'RLCA', name: 'R+L CARRIERS' },
  { scac: 'SEFL', name: 'SOUTHEASTERN FREIGHT LINES' },
  { scac: 'SNLU', name: 'SCHNEIDER LOGISTICS' },
  { scac: 'SWFT', name: 'SWIFT TRANSPORTATION' },
  { scac: 'TFIN', name: 'TFORCE FREIGHT' },
  { scac: 'UPGF', name: 'UPS GROUND FREIGHT' },
  { scac: 'USXI', name: 'U.S. XPRESS' },
  { scac: 'WARD', name: 'WARD TRUCKING' },
  { scac: 'WTVA', name: '(DNU) WEST TENNESSEE VAN' },
  { scac: 'XPOL', name: 'XPO LOGISTICS' },
  { scac: 'YFSY', name: 'YELLOW FREIGHT SYSTEM' },
]

// ── Extra owning orgs (create-order lookup ONLY — not in the shared
// generator pool, so they never appear in the shipments/orders DB). Mock of
// customer-service/v1/owning-org/lookup (QA capture 2026-07-27,
// vault-sources/10-domains/orders/organizations.png): "<NAME> (SOURCE)" and
// "*<NAME> SOURCE SYSTEM 01" styles. First 4 (SOURCE) + 3 starred entries are
// QA-verbatim; the rest generated in the same style.
export const EXTRA_ORGS = [
  'RECKITT-BENCKISER (SOURCE)', 'REDLAND BRICK INC (SOURCE)', 'REHEIS INC (SOURCE)',
  'REVLON CONSUMER PRODUCTS CORP (SOURCE)', '*ADAMS-REMCO SOURCE SYSTEM 01',
  '*EASTERNWIRE SOURCE SYSTEM 01', '*HABASIT-READ SOURCE SYSTEM 01',
  'AKZO NOBEL COATINGS (SOURCE)', 'ARKEMA INC (SOURCE)', 'ASHLAND SPECIALTY (SOURCE)',
  'AXALTA COATING SYSTEMS (SOURCE)', 'BRENNTAG NORTH AMERICA (SOURCE)',
  'CABOT CORPORATION (SOURCE)', 'CHEMOURS COMPANY (SOURCE)', 'CLARIANT CORP (SOURCE)',
  'ECOLAB INC (SOURCE)', 'EVONIK INDUSTRIES (SOURCE)', 'FERRO CORPORATION (SOURCE)',
  'GRACE & CO (SOURCE)', 'HB FULLER COMPANY (SOURCE)', 'HENKEL CORPORATION (SOURCE)',
  'HEXION INC (SOURCE)', 'HONEYWELL PMT (SOURCE)', 'ICL SPECIALTY PRODUCTS (SOURCE)',
  'KRATON POLYMERS (SOURCE)', 'LANXESS CORPORATION (SOURCE)', 'LUBRIZOL CORP (SOURCE)',
  'MOMENTIVE PERFORMANCE (SOURCE)', 'OLIN CORPORATION (SOURCE)', 'PPG INDUSTRIES (SOURCE)',
  'SABIC AMERICAS (SOURCE)', 'SOLVAY USA (SOURCE)', 'STEPAN COMPANY (SOURCE)',
  'TRINSEO LLC (SOURCE)', 'WACKER CHEMICAL (SOURCE)',
  '*BORAL-ROOF SOURCE SYSTEM 01', '*CARLISLE-CM SOURCE SYSTEM 01',
  '*DELTA-FAUCET SOURCE SYSTEM 01', '*GAF-MATERIALS SOURCE SYSTEM 01',
  '*JELD-WEN SOURCE SYSTEM 01', '*MASCO-CABINET SOURCE SYSTEM 01',
  '*PELLA-CORP SOURCE SYSTEM 01', '*USG-CORP SOURCE SYSTEM 01',
].map((name) => ({
  value: name.replace(/[^A-Z0-9]+/gi, '_').replace(/^_|_$/g, ''),
  label: name,
}))

// ── Timezones + city→TZ auto-derivation (spec §10: static map in mock) ──
// Display format "(UTC-06:00) City/Zone" per Efrain's dropdown mock
// (vault-sources/10-domains/orders/Time zones format DropdownMenu.png,
// 2026-07-28); wire values stay the short codes. Sorted ascending by offset
// (most negative first) matching the mock.
export const TIMEZONES = ['HST', 'AKST', 'PST', 'MST', 'CST', 'EST']
export const TIMEZONE_LABELS = {
  HST: '(UTC-10:00) Hawaii',
  AKST: '(UTC-09:00) Alaska',
  PST: '(UTC-08:00) Pacific Time (US & Canada)',
  MST: '(UTC-07:00) Mountain Time (US & Canada)',
  CST: '(UTC-06:00) Central Time (US & Canada)',
  EST: '(UTC-05:00) Eastern Time (US & Canada)',
}
export const CITY_TIMEZONES = {
  Houston: 'CST', Bastrop: 'CST', Geismar: 'CST', Dallas: 'CST',
  'Lake Charles': 'CST', 'Baton Rouge': 'CST', Freeport: 'CST', Baytown: 'CST',
  Channelview: 'CST', Odessa: 'CST', Atlanta: 'EST', Columbus: 'EST',
  Chicago: 'CST', Miami: 'EST', 'San Antonio': 'CST', Kingsport: 'EST',
  Wyandotte: 'EST', Phoenix: 'MST', Denver: 'MST', Seattle: 'PST',
  Portland: 'PST', Minneapolis: 'CST', Detroit: 'EST', 'New Orleans': 'CST',
  'Salt Lake City': 'MST', 'Kansas City': 'CST', 'San Diego': 'PST',
  Neenah: 'CST', McIntosh: 'CST', 'Green River': 'MST',
}
export const deriveTimezone = (city) => CITY_TIMEZONES[city] ?? ''

// ── Location addresses (org-address typeahead; hydrates the manual grid) ──
// locationId comes from the SHARED data-pools formula (locationIdFor), so
// lookup picks match the ids on the Orders grid AND the shipment stops.
export const LOCATION_ADDRESSES = LOCATIONS.map((loc, i) => {
  return {
    locationId: locationIdFor(loc, i),
    longName: loc.facility,
    address1: `${100 + i} Industrial Blvd`, // synthetic street — pools carry no street line
    city: loc.city,
    state: loc.state,
    postal: loc.zip,
    country: 'United States',
    frequency: LOCATIONS.length - i,
  }
})

// ── Address sub-form selects (screens show comboboxes; lean selects now) ──
export const US_STATES = [...new Set(LOCATIONS.map(l => l.state))].sort()
export const CITY_OPTIONS = [...new Set(LOCATIONS.map(l => l.city))].sort()
export const POSTAL_OPTIONS = [...new Set(LOCATIONS.map(l => l.zip))].sort()
export const COUNTRIES = ['United States', 'Canada', 'Mexico']

// ── UoM selects (Product grid; stored codes, display labels) ──
export const UOM_WEIGHT = [
  { value: 'lb', label: 'Lb' },
  { value: 'kg', label: 'Kg' },
]
export const UOM_VOLUME = [
  { value: 'cuft', label: 'Cu ft' },
  { value: 'm3', label: 'm³' },
]
export const UOM_DIMENSION = [
  { value: 'ft', label: 'Ft' },
  { value: 'in', label: 'In' },
  { value: 'm', label: 'm' },
]

// ── Product grid catalogs (LINX-8135 handling units; LINX-8131 currencies —
// ISO alphabetic, alphabetical) ──
export const HANDLING_UNITS = ['BAG', 'BOX', 'DRUM', 'PLT', 'TOTE']
export const CURRENCIES = ['CAD', 'EUR', 'MXN', 'USD']
