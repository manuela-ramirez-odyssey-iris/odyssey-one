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
// Labels are provisional fakes; codes are the shared pool.
export const EQUIPMENT_LABELS = { FLT: 'Flatbed', LTH: 'Lowboy', VAN: 'Dry Van', REEFER: 'Refrigerated' }
// Orgs listed here see a restricted subset; everyone else sees all four
// (plan decision 15 — proves org scoping observably in mock mode).
export const EQUIPMENT_SCOPE = {
  ACME_LOG_01: ['VAN', 'FLT'],
  WEYERH_01: ['FLT', 'LTH'],
}

// ── Plain selects ──────────────────────────────────────────
export const FREIGHT_TERMS = [
  { value: 'Pre-Paid', label: 'Pre-Paid' },
  { value: 'COL', label: 'COL (Collect)' },
  { value: 'Third Party', label: 'Third Party' },
]
export const SHIP_DIRECTIONS = [
  { value: 'Outbound', label: 'Outbound' },
  { value: 'Inbound', label: 'Inbound' },
]
// The 4-option class lookup (domain-analysis §3.3). Column label stays the
// interim constant "Ship Class" (Q26 residual — Efrain owns the canonical pick).
export const SHIP_CLASSES = ['Product Class', 'Commodity', 'Harmonized', 'NMFC']

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
export const CARRIERS = [
  { scac: 'KNGT', name: 'Knight-Swift Transportation', frequency: 95 },
  { scac: 'SCNN', name: 'Schneider National', frequency: 90 },
  { scac: 'JBHT', name: 'J.B. Hunt Transport', frequency: 85 },
  { scac: 'WERN', name: 'Werner Enterprises', frequency: 70 },
  { scac: 'ODFL', name: 'Old Dominion Freight Line', frequency: 60 },
  { scac: 'SAIA', name: 'Saia LTL Freight', frequency: 40 },
]

// ── Timezones + city→TZ auto-derivation (spec §10: static map in mock) ──
export const TIMEZONES = ['EST', 'CST', 'MST', 'PST', 'AKST', 'HST']
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
