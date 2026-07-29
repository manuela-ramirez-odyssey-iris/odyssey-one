// tools/data-pools.mjs — master-data pools shared by the fake-data generators.
//
// In the real system master data is shared cross-domain (order-service proxies
// /master-data/v1/*; spec A7), so the fake generators share these pools too:
// generate.mjs (shipments) and generate-orders.mjs (orders) must draw customers,
// locations, equipment, and commodities from the same lists.
// These are the REAL vocabularies the UI maps code→label against, so editing
// any value here is a data migration, not a code tweak: it requires the full
// regen + Neon reseed motion and a DB-ledger row. Don't edit in isolation.

// Real equipment catalog (LINX-13893 matrix + old-TMS captures) — swapped at
// the end-of-Orders reseed (DB ledger row 1). SINGLE SOURCE: master-data.js
// re-exports these; both generators draw EQUIPMENT_CODES. Old mock LTH
// ("Lowboy") is gone — LTH now means LTL Hazmat everywhere.
// key order = lookup display/frequency order — do not reorder
export const EQUIPMENT_LABELS = {
  LTL: 'Less Than Truckload', LTR: 'LTL Refrigerated', LTH: 'LTL Hazmat',
  TL: 'Truck Load', TLR: 'Refrigerated Box Trailer', TLH: 'TL Hazmat',
  TT: 'Tank Truck', TLF: 'Frozen Box Trailer',
  LCL: 'Less than Container Load', FCL: 'Full Container Load', RR: 'Rail',
}
export const EQUIPMENT_CODES = Object.keys(EQUIPMENT_LABELS)

export const CUSTOMERS = [
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
  // Legacy planner customers — now data-backed (S79 data fix)
  { id: 'KEMIRA_NA_01', name: 'Kemira North America' },
  { id: 'KEMIRA_EU_01', name: 'Kemira Europe' },
  { id: 'GEON_01', name: 'Geon Performance Solutions' },
  { id: 'VALTRIS_01', name: 'Valtris Specialty Chemicals' },
  { id: 'DUBOIS_01', name: 'DuBois Chemicals' },
  { id: 'SOLENIS_01', name: 'Solenis LLC' },
  { id: 'ETEX_01', name: 'Etex Building Performance' },
  { id: 'MONUMENT_01', name: 'Monument Chemical' },
  { id: 'GRACE_01', name: 'W.R. Grace & Co' },
  { id: 'IMCD_01', name: 'IMCD US' },
];

export const LOCATIONS = [
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

// Deterministic location ids in the LLD "RGC-STL-001" shape: facility initials
// (≤3) – state – sequence. Single source for the generators AND the
// master-data LOCATION_ADDRESSES lookup, so an order's consignor.locationId,
// the create-form location picks and the shipment stops all agree.
export const locationIdFor = (loc, i) => {
  const initials = loc.facility.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()
  return `${initials}-${loc.state}-${String(i + 1).padStart(3, '0')}`
}

export const CHEMICAL_PRODUCTS = [
  { item: '32041H1D', desc: 'Sodium Hydroxide Solution 50%', hazmat: true, hClass: 'Class 8', hGroup: 'II', unNumber: 'UN1824' },
  { item: '28103A2K', desc: 'Hydrochloric Acid 32%', hazmat: false },
  { item: '76201C5M', desc: 'Calcium Chloride Flakes 77%', hazmat: false },
  { item: '76201C5N', desc: 'Calcium Chloride Liquid 35%', hazmat: false },
  { item: '31052D8J', desc: 'Ferric Chloride Solution 42%', hazmat: false },
  { item: '55129P3R', desc: 'Reprocessed Polyethylene Pellets', hazmat: false },
  { item: '29051A7F', desc: 'Methanol Technical Grade', hazmat: false },
  { item: '28042B9G', desc: 'Sulfuric Acid 93%', hazmat: true, hClass: 'Class 8', hGroup: 'II', unNumber: 'UN1830' },
  { item: '38089C2H', desc: 'Herbicide Concentrate 2,4-D', hazmat: false },
  { item: '27101D4J', desc: 'Petroleum Distillate', hazmat: false },
  { item: '39011E6K', desc: 'Polyethylene Resin HD', hazmat: false },
  { item: '39021F8L', desc: 'Polypropylene Copolymer', hazmat: false },
  { item: '28112G3M', desc: 'Hydrogen Peroxide 35%', hazmat: false },
  { item: '22071H5N', desc: 'Ethylene Glycol Industrial', hazmat: false },
  { item: '28151J7P', desc: 'Potassium Hydroxide 45%', hazmat: false },
  { item: '29031K9Q', desc: 'Vinyl Chloride Monomer', hazmat: false },
  { item: '38089L2R', desc: 'Insecticide Emulsifiable', hazmat: false },
  { item: '34021M4S', desc: 'Surfactant Non-ionic', hazmat: false },
  { item: '28070N6T', desc: 'Phosphoric Acid 75%', hazmat: false },
  { item: '39076P8U', desc: 'PVC Compound Rigid', hazmat: false },
];

// Freight-term / ship-direction wire codes — CONFIRMED via live dev capture
// (DB ledger row 2). The DB and generator rows store the letter codes; the UI
// maps code → label at render. Order keeps Pre-Paid first (Q20 default).
export const FREIGHT_TERMS = [
  { value: 'P', label: 'Pre-Paid' },
  { value: 'C', label: 'Collect' },
  { value: 'A', label: 'Pre-Paid/Add' },
  { value: 'T', label: 'Third Party' },
  { value: 'N', label: 'No Charge' },
]
export const SHIP_DIRECTIONS = [
  { value: 'O', label: 'Outbound' },
  { value: 'I', label: 'Inbound' },
]
export const freightTermLabel = (code) => FREIGHT_TERMS.find((t) => t.value === code)?.label ?? code
export const shipDirectionLabel = (code) => SHIP_DIRECTIONS.find((d) => d.value === code)?.label ?? code

// Promoted create-order orgs (user decision 2026-07-29 — DB ledger row 3):
// formerly lookup-only EXTRA_ORGS; now real seeded customers that can own
// orders. Ids derive from the names exactly as master-data's lookup values
// always did.
// Source: customer-service/v1/owning-org/lookup (QA capture 2026-07-27,
// vault-sources/10-domains/orders/organizations.png): "<NAME> (SOURCE)" and
// "*<NAME> SOURCE SYSTEM 01" styles. First 4 (SOURCE) + 3 starred entries are
// QA-verbatim; the rest generated in the same style.
export const EXTRA_CUSTOMERS = [
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
].map((name) => ({ id: name.replace(/[^A-Z0-9]+/gi, '_').replace(/^_|_$/g, ''), name }))
