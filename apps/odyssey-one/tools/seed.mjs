// apps/odyssey-one/tools/seed.mjs — buildDataset(10k) → Neon bulk insert.
// Usage: node --env-file=.env.local tools/seed.mjs [--shipments=10000]
// Ritual: node ../../packages/db/migrate.mjs --reset --yes && node tools/seed.mjs
import pg from 'pg'
import { buildDataset, CARRIERS } from './generate.mjs'
import { CUSTOMERS, LOCATIONS, locationIdFor } from './data-pools.mjs'
import { USERS } from './seed-users.mjs'

export function parseDisplayDate(s) {
  if (!s) return null
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}) CST$/.exec(s)
  if (!m) return null
  return `${m[3]}-${m[1]}-${m[2]}T${m[4]}:${m[5]}:00-06:00` // ponytail: CST fixed offset is fine for fake data
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
async function insertRows(client, table, cols, rows) {
  if (rows.length === 0) return
  for (const part of chunk(rows, 200)) {
    const params = []
    const tuples = part.map((row, r) => `(${row.map((_, c) => `$${r * cols.length + c + 1}`).join(',')})`)
    part.forEach((row) => params.push(...row))
    await client.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${tuples.join(',')}`, params)
  }
}

export async function seed(client, { totalShipments = 10000 } = {}) {
  const ds = buildDataset({ totalShipments })

  await insertRows(client, 'customers', ['id', 'name'], CUSTOMERS.map((c) => [c.id, c.name]))
  await insertRows(client, 'carriers', ['scac', 'name'], CARRIERS.map((c) => [c.scac, c.name]))
  await insertRows(client, 'locations', ['id', 'facility_name', 'city', 'state', 'zip'],
    LOCATIONS.map((l, i) => [locationIdFor(l, i), l.facility, l.city, l.state, l.zip]))

  // shipments — orders[] is a native JS array (pg maps to text[]); detail is jsonb (stringify).
  await insertRows(client, 'shipments',
    ['sell_shipment','buy_shipment','orders','pro','customer_id','customer_name','consignor','consignee',
     'origin','destination','pickup_date','delivery_date','pickup_ts','delivery_ts','mode','equipment_code',
     'equipment','seal','scac','tender_status','shipment_status','panel','category','validation_message',
     'gross_weight','load','load_count','order_count','ap_freight_cost','detail'],
    ds.shipments.map((s) => [
      s.sellShipment, s.buyShipment, s.orders, s.pro, s.customerId, s.customerName, s.consignor, s.consignee,
      s.origin, s.destination, s.pickupDate, s.deliveryDate, parseDisplayDate(s.pickupDate), parseDisplayDate(s.deliveryDate),
      s.mode, s.equipmentCode, s.equipment, s.seal, s.scac, s.tenderStatus, s.shipmentStatus, s.panel, s.category,
      s.validationMessage, s.grossWeight, s.load, s.loadCount, s.orderCount, s.apFreightCost,
      JSON.stringify(ds.details.get(s.sellShipment)),
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
     'hazardous','created_at','created_by','last_edit_at','draft_order_status','error_count'],
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

  await insertRows(client, 'users', ['id','email','name','password','role'],
    USERS.map((u) => [u.id, u.email, u.name, u.password, u.role]))
  await insertRows(client, 'user_customer_assignments', ['user_id','customer_id'],
    USERS.flatMap((u) => u.customers.map((c) => [u.id, c])))

  return { shipments: ds.shipments.length, orders: ds.orders.length, stops: stopRows.length, tenders: tenderRows.length, events: eventRows.length }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const totalShipments = Number((process.argv.find((a) => a.startsWith('--shipments=')) ?? '').split('=')[1]) || 10000
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.time('seed')
  const counts = await seed(client, { totalShipments })
  console.timeEnd('seed')
  console.log(counts)
  await client.end()
}
