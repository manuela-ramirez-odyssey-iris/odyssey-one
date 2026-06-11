// tools/generate-orders.mjs — seeded fake Orders dataset in the Order Service
// Phase-2 LLD row shape (Confluence 3401056276; see the 2026-06-10 spec §5).
// Run: node tools/generate-orders.mjs   (also wired into prebuild)
import { faker } from '@faker-js/faker'
import { writeFileSync } from 'fs'
import { CUSTOMERS, LOCATIONS, EQUIPMENT_CODES, CHEMICAL_PRODUCTS } from './data-pools.mjs'

faker.seed(42)

const TOTAL_ORDERS = 4509

// /order-status/lookup enum + DRAFT (LLD). HOLD is a boolean flag, not a status.
// Display labels are PROVISIONAL fakes except "Ready For Plan" (the LLD row example).
const STATUS_LABELS = {
  DRAFT: 'Draft',
  RD_4_PLNNG: 'Ready For Plan',
  PLN_LD: 'Load Planned',
  PLNED_SHIP: 'Shipment Planned',
  PLNNG_FAIL: 'Planning Failed',
  SHIP_FAIL: 'Shipment Failed',
  CAN: 'Cancelled',
}

// Weighted distribution: mostly plannable/planned work, a realistic failure tail.
const STATUS_POOL = [
  ...Array(30).fill('RD_4_PLNNG'),
  ...Array(25).fill('PLNED_SHIP'),
  ...Array(15).fill('PLN_LD'),
  ...Array(10).fill('DRAFT'),
  ...Array(8).fill('CAN'),
  ...Array(7).fill('PLNNG_FAIL'),
  ...Array(5).fill('SHIP_FAIL'),
]

// Deterministic location ids in the LLD "RGC-STL-001" shape:
// facility initials (≤3) – state – sequence.
const LOCATION_IDS = LOCATIONS.map((loc, i) => {
  const initials = loc.facility.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()
  return `${initials}-${loc.state}-${String(i + 1).padStart(3, '0')}`
})

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function generateOrder(i) {
  const customer = faker.helpers.arrayElement(CUSTOMERS)
  const originIdx = faker.number.int({ min: 0, max: LOCATIONS.length - 1 })
  let destIdx = faker.number.int({ min: 0, max: LOCATIONS.length - 1 })
  if (destIdx === originIdx) destIdx = (destIdx + 1) % LOCATIONS.length
  const origin = LOCATIONS[originIdx]
  const dest = LOCATIONS[destIdx]
  const product = faker.helpers.arrayElement(CHEMICAL_PRODUCTS)
  const statusCode = faker.helpers.arrayElement(STATUS_POOL)

  // Sequential digits → "orderNumber desc" works as the newest-first proxy (Q31);
  // customer-derived 3-letter prefix keeps the LLD's "SUT355123" look. NOTE the
  // proxy is lexicographic, so it groups by prefix first — acceptable until Q31
  // lands a real date sort field.
  const prefix = customer.id.replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X')
  const orderNumber = `${prefix}${100000 + i}`

  const earliestPickup = faker.date.between({ from: '2026-03-01T00:00:00.000Z', to: '2026-09-30T00:00:00.000Z' })
  const latestPickup = new Date(earliestPickup.getTime() + faker.number.int({ min: 4, max: 48 }) * HOUR)
  const earliestDelivery = new Date(latestPickup.getTime() + faker.number.int({ min: 1, max: 5 }) * DAY)
  const latestDelivery = new Date(earliestDelivery.getTime() + faker.number.int({ min: 4, max: 48 }) * HOUR)

  return {
    orderNumber,
    orderSource: faker.helpers.arrayElement(['INTEGRATED', 'INTEGRATED', 'INTEGRATED', 'MANUAL']),
    customer: customer.id,
    shipDirection: faker.helpers.arrayElement(['Inbound', 'Outbound']),
    freightTerms: faker.helpers.arrayElement(['Pre-Paid', 'Collect', 'Third Party']),
    equipment: faker.helpers.arrayElement(EQUIPMENT_CODES),
    consignor: {
      locationId: LOCATION_IDS[originIdx],
      city: origin.city,
      state: origin.state,
      country: 'US',
      earliestPickupDateTime: earliestPickup.toISOString(),
      latestPickupDateTime: latestPickup.toISOString(),
    },
    consignee: {
      locationId: LOCATION_IDS[destIdx],
      city: dest.city,
      state: dest.state,
      country: 'US',
      earliestDeliveryDateTime: earliestDelivery.toISOString(),
      latestDeliveryDateTime: latestDelivery.toISOString(),
    },
    grossWeight: { value: faker.number.int({ min: 500, max: 45000 }), uom: 'lbs' },
    volume: { value: faker.number.int({ min: 50, max: 3000 }), uom: 'cbf' },
    commodity: product.desc,
    orderStatus: STATUS_LABELS[statusCode],
  }
}

const orders = []
for (let i = 0; i < TOTAL_ORDERS; i++) orders.push(generateOrder(i))

const outDir = new URL('../src/data/', import.meta.url)
writeFileSync(new URL('orders.json', outDir), JSON.stringify(orders, null, 2))
console.log(`Wrote ${orders.length} orders → src/data/orders.json`)
