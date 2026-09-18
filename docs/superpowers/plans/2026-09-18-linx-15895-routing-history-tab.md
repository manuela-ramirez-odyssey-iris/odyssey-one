# LINX-15895 — Routing History tab

**Story:** Routing History (tab) — Routing history and Version Management (Jana, Final Review, Phoenix Sprint 43).
**VD (Manuela's own, requested by Jana 2026-08-31):** collapsed `2257:68313` · expanded `2259:70116` (Shipments — Odyssey One, `x38TOJGsNryYl3LsKhCtSc`).
**Source of the AC text:** `vault/00-inbox/LINX-15895.md` (`customfield_10032`).

## What the story asks for

A new shipment-level tab, **Routing History**, read-only, listing every PRIOR routing
version newest-first. The Tender tab keeps showing the CURRENT active version only.
Each version holds: its associated orders, and six sections — Routing Options,
Response Comments, View Volume Commitment, Additional Info, Others, Dropped Carriers.
Each section is the SNAPSHOT captured at that routing execution, never updated by a
later run. No dropped carriers in a version ⇒ the AC's verbatim line
*"This routing version does not contain any dropped carriers."*

## Decisions taken here

| # | Decision | Why |
|---|---|---|
| D1 | **The history is DERIVED at read time, not seeded.** New pure module `src/data/routingHistory.js`, PRNG keyed on the shipment identifier. | The `src/data/auditTrail.js` precedent (S147). A new faker draw in `generate.mjs` re-numbers every seeded id (`feedback_seeded_ids_are_load_bearing`), and a **sibling session owns the seed + Neon right now**. Deriving also makes the tab work identically in mock and live with **no API change at all** — the input is the `ShipmentDetailVM` both runtimes already return. |
| D2 | **"Response Comments" shows real response data**, not our Tender tab's `notify-response` column group. Columns: SCAC · Carrier Name · Tender Status · Response Method · Response Date · Response User · Comments. | User ruling, 2026-09-18. The AC names *"carrier responses … response comments"* as its own data category, and the real backend's `ShippingOption` carries `responseComments` / `responseReason` (Saikat's code read, Jira comment 2026-09-15). Our seed has no `responseComments`, so the comment TEXT is derived — flagged as ours. |
| D3 | **One chevron per version card** — SubAccordion's own trailing one, which rotates. | User ruling, 2026-09-18. The VD's leading `›` is static in BOTH frames — a leftover of detaching the SubAccordion master, not a second affordance. |
| D4 | **Timestamp = `MM/DD/YYYY HH:MM UTC`** (`formatDateTimeMDYHM(d, {utc:true})`). | User ruling, 2026-09-18. Matches the History tab, the sibling surface one click away; the VD's `Sep 14, 2026 · 3:20 PM` is the only instance of that format in Shipments. |
| D5 | **The other five sections reuse the Tender tab's own column definitions verbatim** (`LOCKED_COLUMNS` + `TAB_COLUMNS[group]`), moved into a shared `tenderColumns.js`. | "The snapshot of the data captured during that routing execution" = the same fields the Tender screen shows. Moving beats copying: one definition, two consumers. |
| D6 | **How many versions a shipment has is derived from its own lifecycle**, not a free coin-flip: a shipment that has never been tendered (every option `status == null`) has **0** historical versions and shows the empty state; otherwise 1–4, +1 when any option is Declined/Cancelled (a dead tender is what makes a planner re-route). | `feedback_seeded_data_must_be_coherent` — coupled fields derive from real structure. It also makes the AC's "Given a shipment has MULTIPLE routing executions" reachable AND its negative case reachable. |
| D7 | **A historical version never contains an Accepted tender.** Its statuses are drawn from Declined / Cancelled / Sent / none. | An accepted tender ends the routing story — that shipment would not have been re-routed. Ours, provisional, for Jana. |
| D8 | **Orders accumulate with the version number** (V1 ⊆ V2 ⊆ … ⊆ current). | Straight off the AC's own example (`V2 - Orders: O1, O2, O3` / `V1 - Orders: O1, O2`). |

## Files

| File | Change |
|---|---|
| `src/components/detail/tenderColumns.js` | **NEW** — `WRAP_HEADER_W`, `LOCKED_COLUMNS`, `TAB_COLUMNS`, `SUB_TABS`, `NEVER_COLLAPSE_KEYS`, `COLLAPSIBLE_KEYS` moved out of `RoutingGuideTab.jsx` unchanged. |
| `src/components/detail/RoutingGuideTab.jsx` | Import those instead of declaring them. No behaviour change. |
| `src/data/routingHistory.js` | **NEW** — `deriveRoutingHistory(details, shipmentKey)` → versions, newest first. Pure. |
| `src/components/detail/RoutingHistoryTab.jsx` | **NEW** — the pane. |
| `src/components/detail/DroppedCarrierSection.jsx` | New optional `emptyMessage` prop (default = today's string) so a version can carry the AC's verbatim line. |
| `src/components/detail/BottomBar.jsx` | `{ key: 'routingHistory', label: 'Routing History' }` appended to `TABS`; lazy import; one `case`. |
| `src/styles/panes/tender.css` | The version-header layout classes. |

`mergeTabOrder` already appends a tab that did not exist when a user's order was
saved (Fix D / LINX-11786), so stored arrangements pick it up with no migration.

## Tests

* `src/data/routingHistory.test.js` — descending version order · never-tendered ⇒ `[]` ·
  orders accumulate · no Accepted status in any historical version · deterministic for
  one key, different across keys · snapshot independence (mutating the returned rows
  cannot reach the caller's `details`).
* `src/components/detail/RoutingHistoryTab.test.jsx` — empty state · one card per version,
  newest first · the badge is on the newest only · the six sections in the AC's order ·
  the AC's verbatim no-dropped-carriers line · nothing interactive beyond the disclosures.

## Flagged, not built

* **SubAccordion owes a real header slot.** The VD's version header (title + badge +
  timestamp + an Orders chip row + a trailing "Read-only") is a DETACHED instance —
  `feedback_mock_answers_ambiguous_asks`: a detach means the component owes a prop. Built
  here by passing a composed node through the existing `title` slot, which costs no
  library change and no normalize cycle. If it recurs, that is the cycle to run.
* **Questions for Jana** (recorded in the decision log, not decided here): does a
  failed routing run (no usable carriers / QCP error) produce a version at all?
  Are "associated orders" the orders at routing time or the shipment's current orders
  (we assume at-routing-time)? Is there a retention window?
