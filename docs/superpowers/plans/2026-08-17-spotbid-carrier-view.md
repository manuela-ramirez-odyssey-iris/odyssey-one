# SpotBid Carrier View — sidebar domain rebuild (2026-08-17)

> **Naming: the new domain is "SpotBid"** — Kathleen's ruling, relayed verbally by Manuela 2026-08-17. Applies to the sidebar label, route (`/spotbid`), page title, and all new code identifiers. Existing planner-side `src/spotboard/` machinery and the shipment spot tab keep their names (untouched by this plan).

## Context

The SpotBoard concept pivoted (Kathleen/Irina calls, Aug 2026): the old dashboard/monitoring-board concept is dropped ("two different boards. One I crossed out and then we have the carrier board" — Kathleen, partial re-scope transcript 47:51). What ships now is a **carrier view** — a redesign of the legacy carrier portal as it runs in TMS **today** (Oracle APEX app `200`, the current overflow workflow — user confirmation 2026-08-17), photographed by Irina (`Main.jpg` / `QuoteDetails.jpg` / `QuoteEntry.jpg`, canon §19.3, quote-model §9). A planner/shipment view comes later ("when we build for the planner, we'll have a shipment view" — Kathleen 47:31).

User directives (2026-08-17):
- New SpotBid lives behind its **own sidebar button as a domain** (existing `Gavel` button, relabeled SpotBid, `/spotbid`).
- **Quote entry goes inline inside the detail page**, not a modal (deviation from legacy, user ruling).
- UX decisions delegated to Claude; UI must use `@odyssey/ui` + design tokens.
- The external bidding landing page `/spot-bid/:token` (`CarrierBid.jsx`) is **preserved untouched**.

Sources: Irina screenshots (canon `quote-model.md` §9 — screen anatomy), PRD via `quote-model.md` (charge codes §5.5, SHOW_BEST §5.7, statuses §3.3, NFRs §8), partial re-scope transcript (carrier-view ruling, open/closed filter, rows stay per-carrier).

## What exists today

| Asset | Fate |
|---|---|
| `routes/SpotBoardDashboard.jsx` (426 L, old monitoring board) | **Retired from the route.** File + tests deleted (git history keeps it; old concept is crossed out, not parked). |
| `src/spotboard/` machinery (spotStore, board, eligibility, tolerance, award, LiveBids, SetupCarriers…) | **Untouched.** It powers the per-shipment spot tab + `/spot-bid/:token`. Whether the shipment tab survives the pivot is an open question — not this plan's scope. |
| `Countdown.jsx` | **Reused** in the new list. |
| `/spot-bid/:token` `CarrierBid.jsx` | **Untouched** (preserved by ruling). |

## Screens

### 1. `/spotbid` — Requests For Quote (list)

- `AppShell` chrome + `PageHeader` ("SpotBid").
- **PillTab toggle: `Quote Requests` | `Quote History`** — replaces the legacy two-item sidebar. History uses the carrier-facing status set `Open / Expired / Awarded / Cancelled` (quote-model §3.3, sixth set); Requests shows open quotes only. A **status filter** (Dropdown — local list) covers Kathleen's "filter by the status, whether it's closed or open".
- **`DataTable`** (sortable, h-scroll), one row per quote request for this carrier session (rows stay per-carrier — Kathleen 47:31). Columns from the screenshot (§9.1), trimmed:
  `Quote#` · `Shipper` · `Equipment` · `Ship From` (city/state) · `Ship To` · `Stop-offs` · `Hazmat` (Badge) · `Pickup` · `Deliver` · `Quote Opened` · `Quote Closes` · `Your Quote` · `Best` · `Remaining` (reused `Countdown`, default sort asc).
  - Dropped from legacy: `Load Detail` icon column (whole row is clickable → detail), `SCAC` and `Username` (single-carrier session; constant columns carry no information — UX call).
  - `Best` shown (prototype = SHOW_BEST on; per-org config noted in code comment, §5.7 — amount only, never identity).
- Empty state: `EmptyState` ("No open quote requests").

### 2. `/spotbid/:quoteId` — Load Detail + inline Quote Entry

- `Breadcrumb`: SpotBid / Quote# NNNNNN.
- **Load summary** header card: Shipper · Ship From / Ship To (**full street addresses** — detail-only, §9.2) · Pickup · Deliver · Distance · Weight · Hazmat. No order/shipment ID anywhere (SPB-05).
- **Items** table (`DataTable`, non-sortable): Item · Description · Weight · Package Count · Hazmat Code · Packing Group · Class · Hazmat Description · Safety Data Sheet (link placeholder).
- **Instructions** section (free text, "No instructions." fallback).
- **Quote Entry — inline card** (user ruling; replaces legacy modal):
  - Base Charge: `Linehaul` (FormField number — **the only typed number**, §9.3) · `Currency` (Dropdown, USD default) · `Fuel` read-only computed `rate × distance` with `[$0.68 per mile]` annotation · `Subtotal` computed.
  - Additional Charges: five fixed rows `Haz-Mat` · `Tolls` · `Miscellaneous` · `Tarping` · `Tanker Endorsement` (§5.5 profile codes; hardcoded list for the prototype, comment cites the OCM-profile source).
  - Actions: `Decline` (Button secondary) · `Submit` (Button primary), inline at card foot. Submitted state: card collapses to a read-only "Your Quote" summary with an `Update Bid` affordance (PRD Feature 3 permits re-bid while open); Declined state shows an Alert with re-bid link ("status would move out of Declined").
  - Window closed: entry card replaced by status Alert (Expired / Awarded / Cancelled).

All values through tokens; components from `@odyssey/ui` only; new composition components stay **app-local** under `apps/odyssey-one/src/spotbid/` (un-normalized by policy — no new `@odyssey/ui` components, no Figma push in this plan).

## Data

New seed module `src/spotbid/carrierQuotes.js`:
- **Derives** ~12 coherent quote requests from the existing seeded shipment data (origins/destinations/equipment/weights pulled from real seed rows — coherence + load-bearing-ID memories; no hardcoded shipment IDs).
- Fields per quote-model §1/§9: quoteId, shipper, equipment, shipFrom/shipTo (full address split city-only for list), stops, hazmat + item rows, pickup/deliver, openedAt/closesAt (varied windows so Requests/History both populate), distance, fuelRatePerMile, charges list, status.
- In-memory bid state (module store mirroring `spotStore.js` idiom: submitBid / declineBid / updateBid / subscribe). Refresh clears — same prototype bar as auth.
- Fuel/subtotal derived, never stored.

## Execution phases (implementation = Sonnet subagents; this doc + review = main model)

1. **Seed + store** — `carrierQuotes.js` + tests (derivation coherence: fuel = rate×distance, closesAt > openedAt, history/requests split).
2. **List route** — `SpotBidRoute` (list w/ PillTab, filter, DataTable, Countdown, EmptyState) + tests.
3. **Detail route** — summary, items, instructions, inline QuoteEntryCard (submit/decline/update/closed states) + tests.
4. **Wire-up** — App.jsx routes (`/spotbid`, `/spotbid/:quoteId`; `/spotboard` → redirect to `/spotbid`), Sidebar label → SpotBid, delete `SpotBoardDashboard.jsx` + its tests, verify `/spot-bid/:token` and shipment spot tab untouched, `rtk vitest` green, build green.
5. **Traceability** — append SPB-39 (carrier-view sidebar domain), SPB-41 (name = SpotBid, Kathleen verbal 2026-08-17), SPB-40 (inline quote entry, user ruling) to the decision log; update canon §19 pointer; progress.md at /wrap.

No deploy in this plan — deploy only with explicit permission per standing rule.

## Open / flagged

- Shipment spot tab + planner machinery fate after the pivot — needs the full re-scope transcript / next Kathleen call.
- `Best` visibility default (SHOW_BEST is org-config, default N) — prototype shows it; confirm with Kathleen.
- Charge-code list is per-OCM-profile in truth; prototype hardcodes the §5.5 five.
- Mobile operability is a PRD NFR for carrier flow — layout uses responsive patterns but no dedicated mobile pass here.
