-- 001_schema.sql — C-pragmatic schema (spec 2026-07-23). Text-heavy on purpose:
-- grid contracts expose display strings; *_ts columns exist for filtering/sorting.

CREATE TABLE customers (
  id   text PRIMARY KEY,          -- e.g. 'VALTRIS_01'
  name text NOT NULL
);

CREATE TABLE carriers (
  scac text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE locations (
  id            text PRIMARY KEY, -- deterministic '{initials}-{state}-{seq}'
  facility_name text NOT NULL,
  city  text NOT NULL, state text NOT NULL, zip text NOT NULL, country text NOT NULL DEFAULT 'US'
);

CREATE TABLE shipments (
  sell_shipment  text PRIMARY KEY,
  buy_shipment   text NOT NULL,
  orders         text[] NOT NULL,               -- orderNumber list (contract: rows.orders)
  pro            text, customer_id text NOT NULL REFERENCES customers(id),
  customer_name  text NOT NULL,
  consignor text, consignee text, origin text, destination text,
  pickup_date   text, delivery_date text,        -- display strings 'MM/DD/YYYY HH:MM CST'
  pickup_ts     timestamptz, delivery_ts timestamptz,
  mode text, equipment_code text, equipment text, seal text,
  scac text REFERENCES carriers(scac),
  tender_status text, shipment_status text,
  panel text NOT NULL, category text NOT NULL,
  validation_message text,
  gross_weight text, load text, load_count text, order_count text,
  ap_freight_cost text,
  detail jsonb NOT NULL                          -- full SellShipmentOut (slice-3 endpoint)
);
CREATE INDEX shipments_panel_category ON shipments (panel, category);
CREATE INDEX shipments_customer ON shipments (customer_id);
CREATE INDEX shipments_pickup ON shipments (pickup_ts);
CREATE INDEX shipments_delivery ON shipments (delivery_ts);

CREATE TABLE orders (
  id            serial PRIMARY KEY,
  order_number  text NOT NULL DEFAULT '',        -- '' = pending (I9)
  order_id      integer,                         -- pending rows only
  order_source  text, customer text NOT NULL REFERENCES customers(id),
  ship_direction text, freight_terms text, equipment text,
  consignor jsonb NOT NULL, consignee jsonb NOT NULL,   -- contract nested objects
  gross_weight jsonb, volume jsonb,
  commodity text, order_status text NOT NULL,
  shipment_sell_id text REFERENCES shipments(sell_shipment),  -- null = unshipped/pending
  manual_order jsonb,                            -- I8 enrichment (nullable)
  -- typed filter columns (derived at seed time from the same source objects)
  origin_city text, origin_state text, origin_country text,
  dest_city text, dest_state text, dest_country text,
  earliest_pickup_ts timestamptz, latest_pickup_ts timestamptz,
  earliest_delivery_ts timestamptz, latest_delivery_ts timestamptz
);
CREATE UNIQUE INDEX orders_number_unique ON orders (order_number) WHERE order_number <> '';
CREATE INDEX orders_customer_status ON orders (customer, order_status);

CREATE TABLE stops (
  id serial PRIMARY KEY,
  shipment_sell_id text NOT NULL REFERENCES shipments(sell_shipment) ON DELETE CASCADE,
  sequence integer NOT NULL, stop_type text NOT NULL,     -- 'pickup' | 'delivery'
  location_id text REFERENCES locations(id),
  scheduled_datetime text,
  data jsonb NOT NULL                                     -- full SellShipmentStop object
);
CREATE INDEX stops_shipment ON stops (shipment_sell_id);

CREATE TABLE tenders (
  id serial PRIMARY KEY,
  shipment_sell_id text NOT NULL REFERENCES shipments(sell_shipment) ON DELETE CASCADE,
  scac text, carrier_name text, status text, route_group text,
  rank integer, rate_amount numeric,
  option jsonb NOT NULL                                   -- full shippingOption (~50 fields)
);
CREATE INDEX tenders_shipment ON tenders (shipment_sell_id);

CREATE TABLE events (
  id serial PRIMARY KEY,
  shipment_sell_id text NOT NULL REFERENCES shipments(sell_shipment) ON DELETE CASCADE,
  type text, message text, actor text, occurred_at text,
  data jsonb NOT NULL                                     -- full history entry
);
CREATE INDEX events_shipment ON events (shipment_sell_id);

CREATE TABLE users (
  id text PRIMARY KEY,             -- 'guest', 'planner-ava', ...
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password text,                   -- plain fake creds; NULL for guest (cannot log in)
  role text NOT NULL               -- 'guest' | 'planner' | 'manager' | 'admin'
);

CREATE TABLE user_customer_assignments (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, customer_id)
);

CREATE TABLE user_preferences (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
