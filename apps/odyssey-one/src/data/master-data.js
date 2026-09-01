// src/data/master-data.js — master-data pools for the create-order mock lookups.
// Shared pools come from tools/data-pools.mjs (A7: master data is shared
// cross-domain — the grid generator and these lookups must agree). Pools that
// only the create flow needs (ship classes, special services,
// carriers, timezones, UoMs) are defined here. `frequency` drives the
// LINX-7553 frequency sort in lookupService; values are PROVISIONAL fakes.
import { CUSTOMERS, EXTRA_CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, EQUIPMENT_LABELS, CHEMICAL_PRODUCTS, locationIdFor, FREIGHT_TERMS, SHIP_DIRECTIONS, freightTermLabel, shipDirectionLabel, SHIP_CLASSES, SHIP_CLASS_CODES, shipClassLabel, PRODUCT_CLASSES, HANDLING_UNITS, CITY_TIMEZONES, deriveTimezone, tzAbbrev, MODES, CARRIERS as TENDER_CARRIERS, SCAC_EQUIPMENT } from '../../tools/data-pools.mjs'

export { CUSTOMERS, EXTRA_CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, EQUIPMENT_LABELS, CHEMICAL_PRODUCTS, FREIGHT_TERMS, SHIP_DIRECTIONS, freightTermLabel, shipDirectionLabel, SHIP_CLASSES, SHIP_CLASS_CODES, shipClassLabel, PRODUCT_CLASSES, HANDLING_UNITS, MODES, TENDER_CARRIERS, SCAC_EQUIPMENT }

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
// SHIP_CLASSES (class TYPE, H/C/P/N) and PRODUCT_CLASSES (the NMFC class-VALUE
// scale) now live in tools/data-pools.mjs (DB ledger row 6) — re-exported above.

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
// NOTE (S136): unrelated to the `TENDER_CARRIERS`/`SCAC_EQUIPMENT` re-exports
// above — those back the Process SCAC picker (LINX-15075, tools/data-pools.mjs,
// 15/13 entries) and would collide with this local `CARRIERS` if imported
// under the same name, hence the alias.
// Mock of master-data/v1/scac-carrier/lookup (QA capture 2026-07-27,
// vault-sources/10-domains/orders/carriers.png): label "<SCAC> - <NAME>",
// alphabetical by NAME (LINX-8126), many QA rows carry a "(DNU)" prefix.
// First 7 (DNU) entries are QA-verbatim; the rest generated in the same style.
//
// `mode` (S128, SpotBid overflow-list derivation) — real-world-accurate
// TL/LTL classification per carrier, used to split the SpotBoard overflow
// carrier list into its TL/LTL tabs. (DNU) entries carry a mode too (schema
// completeness) even though carrierList.js excludes them from the overflow
// pool outright.
export const CARRIERS = [
  { scac: 'KNGT', name: 'KNIGHT-SWIFT TRANSPORTATION', mode: 'TL' },
  { scac: 'SCNN', name: 'SCHNEIDER NATIONAL', mode: 'TL' },
  { scac: 'JBHT', name: 'J.B. HUNT TRANSPORT', mode: 'TL' },
  { scac: 'WERN', name: 'WERNER ENTERPRISES', mode: 'TL' },
  { scac: 'ODFL', name: 'OLD DOMINION FREIGHT LINE', mode: 'LTL' },
  { scac: 'SAIA', name: 'SAIA LTL FREIGHT', mode: 'LTL' },
  { scac: 'TAPT', name: '(DNU) GLEN TAY TRANS', mode: 'TL' },
  { scac: 'GEL9', name: '(DNU) GLOBAL TRANZ', mode: 'TL' },
  { scac: 'GBYN', name: '(DNU) GO BY TRUCK', mode: 'TL' },
  { scac: 'GAFX', name: '(DNU) GREATWIDE', mode: 'TL' },
  { scac: 'GSCR', name: '(DNU) GROCERS SUPPLY', mode: 'TL' },
  { scac: 'GFCG', name: '(DNU) GULF STATES CA', mode: 'TL' },
  { scac: 'HWCI', name: '(DNU) HANDLE WITH', mode: 'TL' },
  { scac: 'ABFS', name: 'ABF FREIGHT SYSTEM', mode: 'LTL' },
  { scac: 'AACT', name: 'AAA COOPER TRANSPORTATION', mode: 'LTL' },
  { scac: 'AVRT', name: 'AVERT TRANSPORTATION', mode: 'TL' },
  { scac: 'BDVL', name: 'BLUE DIAMOND VAN LINES', mode: 'TL' },
  { scac: 'CLNI', name: 'CELADON TRUCKING', mode: 'TL' },
  { scac: 'CNWY', name: 'CONWAY FREIGHT', mode: 'LTL' },
  { scac: 'CRST', name: 'CRST INTERNATIONAL', mode: 'TL' },
  { scac: 'CTII', name: 'CENTRAL TRANSPORT', mode: 'LTL' },
  { scac: 'DAFG', name: 'DAYTON FREIGHT LINES', mode: 'LTL' },
  { scac: 'DHRN', name: 'D.M. BOWMAN', mode: 'TL' },
  { scac: 'EXLA', name: 'ESTES EXPRESS LINES', mode: 'LTL' },
  { scac: 'FXFE', name: 'FEDEX FREIGHT', mode: 'LTL' },
  { scac: 'FXNL', name: 'FEDEX NATIONAL LTL', mode: 'LTL' },
  { scac: 'HJBT', name: 'HEARTLAND EXPRESS', mode: 'TL' },
  { scac: 'HMES', name: 'USF HOLLAND', mode: 'LTL' },
  { scac: 'KLLM', name: 'KLLM TRANSPORT SERVICES', mode: 'TL' },
  { scac: 'LKVL', name: 'LAKEVILLE MOTOR EXPRESS', mode: 'LTL' },
  { scac: 'MGNM', name: 'MAGNUM LTL', mode: 'LTL' },
  { scac: 'MRTN', name: 'MARTEN TRANSPORT', mode: 'TL' },
  { scac: 'MTVL', name: 'MONTREAL VAN LINES', mode: 'TL' },
  { scac: 'NEMF', name: 'NEW ENGLAND MOTOR FREIGHT', mode: 'LTL' },
  { scac: 'PAAF', name: 'PAN AM FREIGHT', mode: 'LTL' },
  { scac: 'PITD', name: 'PITT OHIO EXPRESS', mode: 'LTL' },
  { scac: 'PRIJ', name: 'PRIME INC', mode: 'TL' },
  { scac: 'PYLE', name: 'A. DUIE PYLE', mode: 'LTL' },
  { scac: 'RDWY', name: 'ROADWAY EXPRESS', mode: 'LTL' },
  { scac: 'RETL', name: 'REDDAWAY', mode: 'LTL' },
  { scac: 'RLCA', name: 'R+L CARRIERS', mode: 'LTL' },
  { scac: 'SEFL', name: 'SOUTHEASTERN FREIGHT LINES', mode: 'LTL' },
  { scac: 'SNLU', name: 'SCHNEIDER LOGISTICS', mode: 'TL' },
  { scac: 'SWFT', name: 'SWIFT TRANSPORTATION', mode: 'TL' },
  { scac: 'TFIN', name: 'TFORCE FREIGHT', mode: 'LTL' },
  { scac: 'UPGF', name: 'UPS GROUND FREIGHT', mode: 'LTL' },
  { scac: 'USXI', name: 'U.S. XPRESS', mode: 'TL' },
  { scac: 'WARD', name: 'WARD TRUCKING', mode: 'LTL' },
  { scac: 'WTVA', name: '(DNU) WEST TENNESSEE VAN', mode: 'TL' },
  { scac: 'XPOL', name: 'XPO LOGISTICS', mode: 'LTL' },
  { scac: 'YFSY', name: 'YELLOW FREIGHT SYSTEM', mode: 'LTL' },
]

// ── Extra owning orgs — PROMOTED to real seeded customers at the end-of-Orders
// reseed (DB ledger row 3): the list now lives in data-pools EXTRA_CUSTOMERS,
// gets inserted into the customers table, and owns a thin tail of orders.
// Provenance for the list itself lives with it in data-pools.
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
// CITY_TIMEZONES / deriveTimezone now live in tools/data-pools.mjs (single
// source shared with the generator) and are re-exported from the import above.
export { CITY_TIMEZONES, deriveTimezone, tzAbbrev }

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
// HANDLING_UNITS now lives in tools/data-pools.mjs (generated order lines store
// the code) — re-exported above.
export const CURRENCIES = ['CAD', 'EUR', 'MXN', 'USD']

// ── Quote Entry additional-charge codes (LINX-13895 / LINX-3966: "TMS Master
// Data Currency" ships the same catalog CURRENCIES already models above;
// Charge Code is "Search by Code or Description" against this one) ──
// Same shape SPECIAL_SERVICES uses (code/description/frequency), plus
// `label` — moved out of QuoteModal.jsx's local array so lookupService's
// 'charge-code' type can serve it. Real legacy catalog, not invented:
// transcribed verbatim from the `MFFOOCC` "Maintain OCM Overflow Carrier
// Charges" screen (vault/10-domains/spotboard/data/quote-model.md §5.6) —
// `code`/`description` are that screen's own Code/Description columns,
// `label` is its Label-shown column (the carrier-facing Quote Entry display
// name, §9.3). Frequency preserves the table's own row order — no usage data
// exists yet to rank them by anything real.
export const CHARGE_CODES = [
  { code: 'HZC', description: 'Hazardous Materials', label: 'Haz-Mat', frequency: 50 },
  { code: 'TKM', description: 'Tankerman', label: 'Tanker Endorsement', frequency: 40 },
  { code: 'TAR', description: 'Tarping Charges', label: 'Tarping', frequency: 30 },
  { code: 'HT', description: 'Highway Toll', label: 'Tolls', frequency: 20 },
  { code: 'MSC', description: 'Misc Charge', label: 'Miscellaneous', frequency: 10 },
]
