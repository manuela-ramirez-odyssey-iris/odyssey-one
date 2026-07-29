# Orders Confirmation Page — full case conformance (LINX-9002 / ORD S98-1)

**Sources:** Figma 4139:11389 (Quick·success), 4465:12225 (Long·success), 4758:6943 (Quick·async), 4758:8241 (Long·async) + user spec (2026-07-28 session) + LINX-9002. User rulings: Click-here → Order Summary page (async → Orders list); async completion adds/increments the navbar Bell badge; apply BOTH renames (Shipper, Destination).

**Model:** Quick vs Long confirmation is **data-driven** — no mode flag. Long-only blocks render only when populated. Shared cards (`OrderPaneSections`) serve ConfirmationView AND OrderSummaryRoute, so the navigation summary conforms for free.

## Tasks

### 1. Rollups — `mapFormVmToOrderPane` (+ productMath if needed)
Extend `d` with the mock's 8-field Product summary:
- `totalGrossWeight` (sum grossWeight — existing rollup), `totalVolume` (existing)
- `packageCount` — sum `handlingCount`; label = uniform handlingUnit label plural ("15 Boxes"); mixed/absent → count only / `--`
- `declaredValue` — sum where currency uniform → `$X,XXX.XX CUR`; mixed/absent → `--`
- `countryOfOrigin` — uniform `manufacturingCountry` else `--`
- `hazmat` — from row `hazardous` flags (form's own checkbox, not the catalog lookup)
- `totalProductWeight`, `totalTareWeight` — **not captured by the form** → `--`, gap-noted (owed to Ramesh)

### 2. `OrderPaneSections` conformance
- **GeneralInfoCard:** Equipment always; Customer Required Carrier + Equipment Reference Number only when set. References block only when ≥1 populated row; Instructions block only when ≥1. (Empty-state dash rows go away — hidden instead.)
- **PartyColumn:** titles → "Shipper details" / "Destination details" (LINX-12255 + LINX-13899); contact block (Name/Phone/Email) renders only when any value present.
- **ProductInfoCard rebuild:** drop 🚧/inert/dimming + US-Metric static toggle + old field set. New: 8-field 4-col rollup grid (Hazmat = yellow Badge w/ triangle icon when Yes, `--` when No), "N products added" line, 6-col read-only table (Line #, Product ID, Product Description, Gross Weight, Volume, Product Class) with static sort + column-cog icons per mock.
- SpecialServicesCard: unchanged (already conformant).

### 3. `ConfirmationView` behavior
- Success alert: `showLink` → navigate `/orders/<orderNumber>`; verify mock service persists created orders for OrderSummaryRoute — if not, fall back to `/orders`.
- Async alert: `showLink` → `/orders`.
- Async flip (Scenario 2): ~8s timer → order number populates in strip, alert flips to success, navbar Bell badge increments. Timer cleaned up on unmount.
- Strip Order Number while async: dash per convention.

### 4. Notification counter
Tiny module store (`useSyncExternalStore`, ~15 lines) — Navbar swaps hardcoded `notificationCount={6}` for the store value (seed 6); ConfirmationView increments on flip.

### 5. Tests + verify
- Update/extend confirmation tests: empty optional blocks hidden (quick), populated shown (long), rollup math (package count, declared value, mixed-currency fallback), async flip w/ fake timers + bell increment.
- Browser pass against all 4 mocks incl. the S98 QA details (LINX-10987–10993: breadcrumb, sidebar active state, Payment terms=Freight Term, chevrons).

### 6. Bookkeeping
Decision-log entries (data-driven quick/long, both renames, notification behavior); requirements-tracker LINX-9002 note; gap notes (net/tare weight, LINX-13899 ahead of Figma).

## Out of scope
Real notification center/toast content, Edit-flow, reseed, deploys.
