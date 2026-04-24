# @odyssey/db

Placeholder for the shared Supabase client and schema types.

All Odyssey domain apps (Shipments, Home, Carriers, Orders) share a single
Supabase project. This package centralizes the client setup and the
type definitions so no app has to re-implement them.

## Contract (when populated)

- **`createClient(url, anonKey)`** — factory that returns a Supabase client.
  Apps call this in their own bootstrap code with their own env vars, so
  env-var ownership stays with the app.
- **Schema types** — generated via `supabase gen types typescript` and
  re-exported here. Any app importing `@odyssey/db` gets the same types.
- **Query helpers** — reusable queries that span domains (e.g.
  "get active shipments for a carrier") live here, not duplicated
  per-app.

## Populate when

- SHP-55 (Supabase schema design) produces a live schema.
- At least one app actually reads/writes via Supabase.

Do not install `@supabase/supabase-js` speculatively. YAGNI until a real
consumer exists.
