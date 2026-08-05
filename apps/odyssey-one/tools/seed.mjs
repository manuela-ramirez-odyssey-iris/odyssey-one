// apps/odyssey-one/tools/seed.mjs — buildDataset(10k) → Neon bulk insert.
// Usage: node --env-file=.env.local tools/seed.mjs [--shipments=10000] [--reseed]
//
// RESEED RITUAL (current, S110): migrate WITHOUT --reset, then seed --reseed.
//   node --env-file=.env.local ../../packages/db/migrate.mjs
//   node --env-file=.env.local tools/seed.mjs --reseed
// --reseed truncates only SEEDED_TABLES (below) and preserves `users`, so real
// user_preferences / shared_filters rows survive.
//
// ⚠ The OLD ritual — `migrate.mjs --reset --yes && seed` — is DESTRUCTIVE and
// should not be used against a database anyone has saved anything in: --reset
// does DROP SCHEMA public CASCADE, which takes user_preferences (saved filters,
// column presets) and shared_filters with it. Use it only to rebuild from empty.
import pg from 'pg'
import { buildDataset, CARRIERS } from './generate.mjs'
import { CUSTOMERS, EXTRA_CUSTOMERS, LOCATIONS, locationIdFor } from './data-pools.mjs'
import { USERS, usernameFor } from './seed-users.mjs'
import { buildProjection } from './project-search.mjs'

// US timezone abbreviation → fixed UTC offset. The generator emits DST-correct
// abbreviations (CDT in July, CST in January — see tzAbbrev in data-pools.mjs),
// so the offset must follow the abbreviation, not be hardcoded. This parser
// previously matched ` CST` ONLY, which would have silently NULLed 2,823 of
// 4,400 shipment timestamps the first time a non-CST date reached it.
// ponytail: a flat lookup beats a tz library for fake data — the abbreviation
// already encodes the DST decision.
const TZ_OFFSETS = {
  EST: '-05:00', EDT: '-04:00',
  CST: '-06:00', CDT: '-05:00',
  MST: '-07:00', MDT: '-06:00',
  PST: '-08:00', PDT: '-07:00',
  AKST: '-09:00', AKDT: '-08:00',
  HST: '-10:00',
}

export function parseDisplayDate(s) {
  if (!s) return null
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}) ([A-Z]{3,4})$/.exec(s)
  if (!m) return null
  const offset = TZ_OFFSETS[m[6]]
  if (!offset) return null // unknown zone — better a null than a wrong instant
  return `${m[3]}-${m[1]}-${m[2]}T${m[4]}:${m[5]}:00${offset}`
}

export function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

// stop location_id: pool ids are index-derived, so match the stop's facility+city
// back to the pool row. ponytail: linear map build once, O(1) lookups after.
const LOCATION_ID_BY_KEY = new Map(
  LOCATIONS.map((l, i) => [`${l.facility}|${l.city}`, locationIdFor(l, i)]),
)

// Multi-row parameterized INSERT for one chunk. cols = ['a','b'], rows = [[1,2],...]
// pg's parameter cap is 65535; 200 rows × ~30 cols stays well under.
// Tables this seeder OWNS — everything it inserts except `users`. A reseed
// clears exactly these and nothing else.
//
// `users` is deliberately EXCLUDED and never truncated: both `user_preferences`
// and `shared_filters` reference `users(id) ON DELETE CASCADE`, so clearing the
// user rows would silently cascade away every saved filter and column preset a
// real person created. That is also why the documented `migrate --reset --yes`
// ritual (DROP SCHEMA public CASCADE) must NOT be used for a reseed any more —
// it takes the same data with it. The USERS list is static and deterministic,
// so preserving the rows costs nothing.
export const SEEDED_TABLES = [
  'search_index', 'events', 'tenders', 'stops', 'orders', 'shipments',
  'user_customer_assignments', 'locations', 'carriers', 'customers',
]

// One statement so mutual FKs between the listed tables can't block the clear.
export async function truncateSeeded(client) {
  await client.query(`TRUNCATE TABLE ${SEEDED_TABLES.join(', ')}`)
}

async function insertRows(client, table, cols, rows) {
  if (rows.length === 0) return
  for (const part of chunk(rows, 200)) {
    const params = []
    const tuples = part.map((row, r) => `(${row.map((_, c) => `$${r * cols.length + c + 1}`).join(',')})`)
    part.forEach((row) => params.push(...row))
    await client.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${tuples.join(',')}`, params)
  }
}

export async function seed(client, { totalShipments = 10000, preserveUsers = false } = {}) {
  // +1000 unshipped rows at seed volume (DB ledger row 8). Mock CLI volume
  // (2200 shipments) deliberately unchanged — bundle size stays flat.
  const ds = buildDataset({ totalShipments, unshippedOrders: Math.round(totalShipments * 0.25) + 1000 })

  await insertRows(client, 'customers', ['id', 'name'], [...CUSTOMERS, ...EXTRA_CUSTOMERS].map((c) => [c.id, c.name]))
  await insertRows(client, 'carriers', ['scac', 'name'], CARRIERS.map((c) => [c.scac, c.name]))
  await insertRows(client, 'locations', ['id', 'facility_name', 'city', 'state', 'zip'],
    LOCATIONS.map((l, i) => [locationIdFor(l, i), l.facility, l.city, l.state, l.zip]))

  // shipments — orders[] is a native JS array (pg maps to text[]); detail is jsonb (stringify).
  await insertRows(client, 'shipments',
    ['sell_shipment','buy_shipment','orders','pro','customer_id','customer_name','consignor','consignee',
     'origin','destination','pickup_date','delivery_date','pickup_ts','delivery_ts','mode','equipment_code',
     'equipment','seal','scac','tender_status','shipment_status','panel','category','validation_message',
     'gross_weight','load','load_count','order_count','ap_freight_cost','pickup_numbers','detail',
     'shipment_type','planning_type','po_numbers'],
    ds.shipments.map((s) => [
      s.sellShipment, s.buyShipment, s.orders, s.pro, s.customerId, s.customerName, s.consignor, s.consignee,
      s.origin, s.destination, s.pickupDate, s.deliveryDate, parseDisplayDate(s.pickupDate), parseDisplayDate(s.deliveryDate),
      s.mode, s.equipmentCode, s.equipment, s.seal, s.scac, s.tenderStatus, s.shipmentStatus, s.panel, s.category,
      s.validationMessage, s.grossWeight, s.load, s.loadCount, s.orderCount, s.apFreightCost,
      s.pickupNumbers ?? [],
      JSON.stringify(ds.details.get(s.sellShipment)),
      s.shipmentType ?? null, s.planningType ?? null, s.poNumbers ?? [],
    ]))

  // orders — filter columns derived from the SAME nested objects that go into JSONB
  // (single source at seed time). ISO-local window strings pass straight to timestamptz.
  const shipmentByOrder = new Map()
  for (const s of ds.shipments) for (const o of s.orders) shipmentByOrder.set(o, s.sellShipment)
  await insertRows(client, 'orders',
    ['order_number','order_id','order_source','customer','ship_direction','freight_terms','equipment',
     'consignor','consignee','gross_weight','volume','commodity','order_status','shipment_sell_id','manual_order',
     'origin_city','origin_state','origin_country','dest_city','dest_state','dest_country',
     'earliest_pickup_ts','latest_pickup_ts','earliest_delivery_ts','latest_delivery_ts',
     'hazardous','created_at','created_by','last_edit_at','draft_order_status','error_count',
     'last_edited_by','created_tz','last_edit_tz','po_number','planning_date_type'],
    ds.orders.map((o) => [
      o.orderNumber, o.orderId ?? null, o.orderSource, o.customer, o.shipDirection, o.freightTerms, o.equipment,
      JSON.stringify(o.consignor), JSON.stringify(o.consignee), JSON.stringify(o.grossWeight), JSON.stringify(o.volume),
      o.commodity, o.orderStatus, shipmentByOrder.get(o.orderNumber) ?? null,
      ds.orderDetails[o.orderNumber] ? JSON.stringify(ds.orderDetails[o.orderNumber]) : null,
      o.consignor.city, o.consignor.state, o.consignor.country, o.consignee.city, o.consignee.state, o.consignee.country,
      o.consignor.earliestPickupDateTime, o.consignor.latestPickupDateTime,
      o.consignee.earliestDeliveryDateTime, o.consignee.latestDeliveryDateTime,
      o.hazardous ?? false, o.createdAt ?? null, o.createdBy ?? null, o.lastEditAt ?? null,
      o.draftOrderStatus ?? null, o.errorCount ?? null,
      o.lastEditedBy ?? null, o.createdTimeZoneCode ?? null, o.lastEditTimeZoneCode ?? null,
      o.poNumber ?? null, o.planningDateType ?? null,
    ]))

  // stops / tenders / events extracted from each detail. Full objects into the jsonb
  // columns; typed columns pulled from the real DTO field names (verified vs generate.mjs).
  const stopRows = [], tenderRows = [], eventRows = []
  for (const [sellId, d] of ds.details) {
    for (const st of d.shipmentStopList ?? [])
      stopRows.push([sellId, st.stopSequence, st.stopType,
        LOCATION_ID_BY_KEY.get(`${st.facilityName}|${st.city}`) ?? null,
        st.scheduledDateTime, JSON.stringify(st)])
    for (const opt of d.shippingOptionList ?? [])
      tenderRows.push([sellId, opt.scac, opt.carrierName, opt.status, opt.routeGroup, opt.rank, opt.rateAmount, JSON.stringify(opt)])
    for (const ev of d.historyList ?? [])
      // history entry: action/details/user/timestamp (not type/message/actor/date)
      eventRows.push([sellId, ev.action ?? null, ev.details ?? null, ev.user ?? null, ev.timestamp ?? null, JSON.stringify(ev)])
  }
  await insertRows(client, 'stops', ['shipment_sell_id','sequence','stop_type','location_id','scheduled_datetime','data'], stopRows)
  await insertRows(client, 'tenders', ['shipment_sell_id','scac','carrier_name','status','route_group','rank','rate_amount','option'], tenderRows)
  await insertRows(client, 'events', ['shipment_sell_id','type','message','actor','occurred_at','data'], eventRows)

  // username: the queryable identity orders.created_by/last_edited_by resolve
  // against (R2-4) — derived so every seeded row names a real user.
  // `preserveUsers` skips this on a reseed: the rows already exist, are
  // deterministic, and are load-bearing for user_preferences / shared_filters
  // via ON DELETE CASCADE (see SEEDED_TABLES).
  if (!preserveUsers) {
    await insertRows(client, 'users', ['id','email','name','password','role','username'],
      USERS.map((u) => [u.id, u.email, u.name, u.password, u.role, usernameFor(u.name)]))
  }
  await insertRows(client, 'user_customer_assignments', ['user_id','customer_id'],
    USERS.flatMap((u) => u.customers.map((c) => [u.id, c])))

  // search_index — the progressive-search projection (S104). Built from the same
  // in-memory dataset, so it can never drift from the rows it indexes.
  const projectionRows = buildProjection(ds.shipments)
  await insertRows(client, 'search_index', ['domain','entity_id','attr','value','display'],
    projectionRows.map((r) => [r.domain, r.entity_id, r.attr, r.value, r.display]))

  return { shipments: ds.shipments.length, orders: ds.orders.length, stops: stopRows.length, tenders: tenderRows.length, events: eventRows.length, search_index: projectionRows.length }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const totalShipments = Number((process.argv.find((a) => a.startsWith('--shipments=')) ?? '').split('=')[1]) || 10000
  // --reseed: clear the seeded tables first, KEEPING users (and therefore every
  // user_preferences / shared_filters row). Without it this script is
  // insert-only and assumes an empty schema.
  const reseed = process.argv.includes('--reseed')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  if (reseed) {
    await truncateSeeded(client)
    console.log(`truncated: ${SEEDED_TABLES.join(', ')} (users preserved)`)
  }
  console.time('seed')
  const counts = await seed(client, { totalShipments, preserveUsers: reseed })
  console.timeEnd('seed')
  console.log(counts)
  await client.end()
}
