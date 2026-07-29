// src/data/master-data.js — master-data pools for the create-order mock lookups.
// Shared pools come from tools/data-pools.mjs (A7: master data is shared
// cross-domain — the grid generator and these lookups must agree). Pools that
// only the create flow needs (ship classes, special services,
// carriers, timezones, UoMs) are defined here. `frequency` drives the
// LINX-7553 frequency sort in lookupService; values are PROVISIONAL fakes.
import { CUSTOMERS, EXTRA_CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, EQUIPMENT_LABELS, CHEMICAL_PRODUCTS, locationIdFor, FREIGHT_TERMS, SHIP_DIRECTIONS, freightTermLabel, shipDirectionLabel } from '../../tools/data-pools.mjs'

export { CUSTOMERS, EXTRA_CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, EQUIPMENT_LABELS, CHEMICAL_PRODUCTS, FREIGHT_TERMS, SHIP_DIRECTIONS, freightTermLabel, shipDirectionLabel }

// ── Owning organizations (typeahead) ───────────────────────
export const OWNING_ORGS = CUSTOMERS.map((c, i) => ({
  value: c.id,
  label: c.name,
  frequency: CUSTOMERS.length - i,
}))

// ── Equipment (typeahead, scoped by Owning Organization) ───
// Catalog + labels live in tools/data-pools.mjs (single source; both
// generators draw the same codes). Descriptions: TL/TLR/TLF old-system
// verbatim; others standard or inferred (LTH/TLH/TT UNCONFIRMED — open Q
// with Ramesh/master-data).
// Orgs listed here see a restricted subset; everyone else sees the full
// catalog (plan decision 15 — proves org scoping observably in mock mode).
export const EQUIPMENT_SCOPE = {
  ACME_LOG_01: ['TL', 'TLR', 'LTL', 'LTR'],
  WEYERH_01: ['TL', 'TLF', 'RR', 'FCL', 'LCL'],
}

// ── Plain selects ──────────────────────────────────────────
// FREIGHT_TERMS / SHIP_DIRECTIONS now live in tools/data-pools.mjs as wire
// codes (DB ledger row 2) — re-exported above with their label helpers.
// The 4-option class-TYPE dropdown — CONFIRMED by QA screenshot + live dev
// capture 2026-07-28: {H: Harmonized, C: Commodity, P: Product, N: NMFC}.
// This is what the UI's "Product Class" column renders (labels below, order
// per screenshot); wire codes are the letters H/C/P/N.
export const SHIP_CLASSES = ['Harmonized', 'Commodity', 'Product', 'NMFC']

// Product Class dropdown values — VERBATIM from the live dev capture
// (POST /master-data/v1/product-service/v1/product-class/lookup,
// dev.masterdata.linx 2026-07-28): the NMFC scale incl. 350/450/650.
// Dev also returns dirty rows (LTL, 0, 055/085 dupes, a stray product) —
// deliberately excluded from the mock.
export const PRODUCT_CLASSES = [
  '50', '55', '60', '65', '70', '77.5', '85', '92.5', '100', '110',
  '125', '150', '175', '200', '250', '300', '350', '400', '450', '500', '650',
]

// Reference types for the References rows (Figma 6238:24599). Mock of the
// real `reference-codes/lookup` master data (LINX-6036); Pickup/PO Number are
// selectable types like any other — picking one locks the row's type cell.
export const REFERENCE_TYPES = ['Pickup Number', 'PO Number', 'BOL Number', 'Delivery Number', 'Sales Order Number', 'Seal Number', 'Shipment Number']

// ── Special services (frequency-sorted per LINX-8125) ─────
// Descriptions: first 5 from Efrain's screens; the rest transcribed verbatim
// from the old-TMS screenshot (vault research special-services-catalog-2026-07-28
// — real catalog is 40+, A→I visible). CODES ARE INVENTED mnemonics (real
// charge codes unknown — swap when a dev lookup capture lands). Frequencies
// invented for sort order. LUMP/Detention excluded per LINX-8125.
export const SPECIAL_SERVICES = [
  { code: 'PALEXG', description: 'Pallet Jack', frequency: 90 },
  { code: 'PJC', description: 'Pallet Exchange', frequency: 80 },
  { code: 'LFT', description: 'Lift gate', frequency: 75 },
  { code: 'INSD', description: 'Inside Delivery', frequency: 50 },
  { code: 'RESD', description: 'Residential Delivery', frequency: 35 },
  { code: 'ADVLD', description: 'Advance Loading', frequency: 30 },
  { code: 'AHDEL', description: 'After Hours Delivery', frequency: 28 },
  { code: 'AIR', description: 'Air', frequency: 12 },
  { code: 'APTDEL', description: 'Appointment at Delivery', frequency: 32 },
  { code: 'BLNDD', description: 'Blind Shipment Delivery', frequency: 10 },
  { code: 'BLNDP', description: 'Blind Shipment Pick Up', frequency: 9 },
  { code: 'CLEAN', description: 'Cleaning', frequency: 8 },
  { code: 'XBORD', description: 'Cross Border Fee', frequency: 14 },
  { code: 'DNF', description: 'DoNotFreeze', frequency: 22 },
  { code: 'DBLRSH', description: 'Double Rush', frequency: 7 },
  { code: 'DRVAST', description: 'Driver Assist', frequency: 26 },
  { code: 'DRPTRL', description: 'Drop Trailer', frequency: 24 },
  { code: 'EXPSD', description: 'Expedited Same Day', frequency: 16 },
  { code: 'FRZN', description: 'Frozen', frequency: 18 },
  { code: 'HAZMAT', description: 'Hazmat', frequency: 20 },
  { code: 'HIDENS', description: 'High Density', frequency: 6 },
  { code: 'HOLPU', description: 'Holiday Pick Up', frequency: 5 },
  { code: 'HOSE', description: 'Hose', frequency: 4 },
  { code: 'INBND', description: 'Inbond Freight', frequency: 11 },
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

// ── Extra owning orgs — PROMOTED to real seeded customers at the end-of-Orders
// reseed (DB ledger row 3): the list now lives in data-pools EXTRA_CUSTOMERS,
// gets inserted into the customers table, and owns a thin tail of orders.
// Mock of customer-service/v1/owning-org/lookup (QA capture 2026-07-27,
// vault-sources/10-domains/orders/organizations.png): "<NAME> (SOURCE)" and
// "*<NAME> SOURCE SYSTEM 01" styles. First 4 (SOURCE) + 3 starred entries are
// QA-verbatim; the rest generated in the same style.
export const EXTRA_ORGS = EXTRA_CUSTOMERS.map((c) => ({ value: c.id, label: c.name }))

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
// Handling Unit — COMPLETE catalog, verbatim from the live dev capture
// (GET /master-data/v1/product-service/v1/handling-units 2026-07-28):
// {CRT:Crate, BUL:Bulk, PLT:Pallet, BOX:Box, DRM:Drum}. Dropdown shows the
// label; code is the wire value.
export const HANDLING_UNITS = [
  { code: 'PLT', label: 'Pallet' },
  { code: 'BOX', label: 'Box' },
  { code: 'DRM', label: 'Drum' },
  { code: 'BUL', label: 'Bulk' },
  { code: 'CRT', label: 'Crate' },
]
export const CURRENCIES = ['CAD', 'EUR', 'MXN', 'USD']
