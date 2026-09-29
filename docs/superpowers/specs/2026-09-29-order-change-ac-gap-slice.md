---
title: Order change — AC-gap slice (C13, C15, C16, C17, C20, C23, C24)
date: 2026-09-29
session: S163
status: approved direction (user 2026-09-29: "yes go")
---

# Order change — AC-gap slice

The last consolidated order-change items that need no design. Plan: `docs/superpowers/plans/2026-09-25-order-change-remaining.md` §C+. The only UI change is small: the existing change badges reach more fields, filter options are added, and a line of text is added. Paths are under `apps/odyssey-one/`. GEN = `tools/generate.mjs`, API = `api/_lib/shipments.mjs`, SB = `src/components/detail/order-change/stopsSandbox.js`, ESV = `src/components/detail/order-change/EditStopsView.jsx`.

Out of scope: C14 and C18 (on hold for design); D2, D4, D5 (Direct). The edit-mode "Save" label (C23's last bullet) is **dropped**: the user chose Reset / Discard / Save in S162. Needs a **reseed** (T1 and T6 seed changes), on the user's go.

## T1 — C13: every 15436 stop field can be highlighted
**Seed (GEN `buildConsolidationChange`):**
- **Location change:** `fields.location.prior/new` use the stop's own display format via `stopLocationOf` (facility, city, ST zip country), not `"facility, city"`. Add `fields.address = { prior: st.address1, new: loc.address1 }`. The new address already exists in `newLocByStopSeq`, so no new draws.
- **Appointment change:** a new salted stream `mulberry32(seedFrom(sellShipment + ':occ-appt'))`, not the `:occ` stream, so existing values stay put. For ~30% of changed stops, `fields.appointment = { prior: st.appointmentTime, new: <same zone, hour shifted +1..+3, wrapped at 23> }`. Check the `appointmentTime` format (GEN ~`:947`, `"HH:00 TZ"`). Zero faker draws, and the ids must not move (diff as before).

**Render (`src/components/detail/StopsTab.jsx` `ReviewStopContent`):**
- Pass `change={fields.appointment}` to Appointment and `change={fields.address}` to Address.
- Location's combined badge carries Site ID, City, State, Zip and Country together. This is our presentation (the stop shows one Location field), recorded in the canon, not in a DEC. Address 2–3 aren't displayed anywhere today, so there is nothing to badge. Say both in a comment.
- 15438 BR2 lists appointment among the auto-routing changes. Nothing else to do: routing is seeded and re-routed (DEC-215).

**Tests:** a seed test that location-changed stops carry `fields.address` and a full-format `fields.location`, and that some stops carry `fields.appointment`. A StopsTab test that the Appointment and Address badges render.

## T2 — C15: Search & Add filter gaps (LINX-15870)
- `api/_lib/candidateOrders.mjs`:
  - `TENDER_STATUSES` gains `'To Be Tendered'` and `'Not Tendered'`. The latter matches rows whose `tenderStatus` is blank or null. It is a filter token only; the column still shows `--`.
  - The origin and destination filters match on a haystack of `siteId city, ST postal country`, built from the order's consignor and consignee objects. Read their keys in the builder: site id is likely `externalIdentifier` or `partnerId`, postal is `postal`. The displayed `origin`/`destination` strings are unchanged.
- `src/components/detail/order-change/AddOrdersModal.jsx`: the locked Customer filter shows `Name (ID)`, and the column label "Order Number" becomes **"Order #"** (15870's wording).
- **Tests:** a candidate row matches origin by ZIP and by site id; the "Not Tendered" and "To Be Tendered" filters work; the modal shows the customer with its ID.

## T3 — C16: Evaluate needs date, time and time zone (15669 §5 / BR-4)
- SB `routeBlocker`: a stop is `'undated'` unless `parseStamp(s.date)` succeeds **and** carries a `tz`.
- `isRoutable` uses the same check: one helper, `isStopDated(s)`, used by both.
- ESV's tooltip for `undated` becomes *"Set a date, time and time zone on every stop"*.
- **Tests:** a stop dated `"March 4, 2026 10:00"` (no zone) blocks Evaluate; a fully stamped stop passes.

## T4 — C17: the street address on Edit Stops rows (15667 §3)
In ESV's stop row (~`:394-420`), render `s.address` as a second line under the location. Use the muted text style the row already uses for secondary text (look for an existing class; add no new token). Render it only when non-empty and not `--`, and on the Prior and New sides alike. **Test:** the address text renders for a stop.

## T5 — C20: the review doorways agree (15435 BR1)
- **Marker (API):** save-stops writes `orderChange.consolidation.stopsSaved = true` to the target, in the same `jsonb_set` chain as the stopChanges reset. From then on the consolidated review is done; any remaining decision is Scenario A's Direct decision (LINX-15671).
- **Rule, in one exported helper** (`src/lib/orderChangeDoorway.js` or next to `useApproveOrderChange`): `consolidatedReviewPending(orderChange) = !!orderChange?.consolidation && !orderChange.consolidation.stopsSaved && !orderChange.resolution`. It is used by:
  - StopsTab's `review` flag (today `!!c && !orderChange?.resolution`);
  - RoutingGuideTab's Review button (~`:1592`): the label and the target. When it's false and the row is still in order change, open the Direct route (Scenario A's decision).
- **Row menu** (`src/components/shipments/ShipmentTable.jsx` ~`:332`): the list row carries no detail, so it keeps `orderCount > 1`. `ponytail:` note: after a Scenario A save, the row menu lands on the plain Stops tab, and the Tender tab's button takes the planner to the decision. The upgrade path is a list column for the marker.
- **Row click** (`src/components/detail/BottomBar.jsx` ~`:209`): a fresh open of a row whose category is `order-change` and whose `orderCount > 1` lands on **Stops**, not Orders (15435 "Stops tab shall be selected by default when accessed from an Order Change exception"). Read how the bar gets the selected row's category and count. If it only has `shipmentDetails`, use `consolidatedReviewPending(details.orderChange)` instead.
- **Tests:**
  - API: save-stops writes `stopsSaved`;
  - helper truth table;
  - StopsTab: no review mode when `stopsSaved`;
  - RoutingGuideTab: the button goes Direct when `stopsSaved`;
  - BottomBar: a fresh open of a consolidated order-change row lands on Stops.

## T6 — C23: copy and format
- StopsTab `APPROVE_BODY` → *"The order changes will be applied as shown. You'll choose the tender action next."* It is true for Scenario A (the Direct decision) and Scenario B (Tender Review). Update its test.
- Seed: the consolidated compare row `'Incoterm'` → `'Incoterm Info'` (the Direct review's label; verify the exact string in `buildOrderChange`'s comparison rows).
- **Cost format:** ViewRoutingModal prints `$1,234.00 USD`, while the StopsTab header prints `1,234.00 USD`. Use the header's format in the modal. Find the modal's formatter; it may be shared with the Direct lists (`OrderChangeTenderLists`). If it's shared, change only the consolidated modal's call site and say so.
- **DST zone:** ESV (~`:52`, `:77`) shows a stop stamped in daylight time (e.g. `PDT`) as the standard zone, so re-picking shifts it by an hour. Read the code. The zone picker must round-trip the stamp's own abbreviation (PDT stays PDT), or map a picked IANA zone plus the stop's date to the right abbreviation (`Intl` with `timeZoneName: 'short'`, as `formatInZone` in SB already does). **Test:** a PDT-stamped stop opens with the right zone and saves unchanged when nothing is edited.

## T7 — C24: an adopted list carries its dropped carriers
When the API adopts `newTenderList` (Scenario B save-stops, approve-plan, and retender/bypass/cancel, i.e. every `writeTenderAdoption`), also write `detail.droppedCarrierList` = `orderChange.droppedCarriers.new`, mapped to the shipment list's shape:
- `equipmentCode: row.equipment`;
- `scac`, `carrierName`, `routeRank`, `dropCode`, `reason`, `reasonDescription` pass through;
- `rpcId`, `startDate`, `stopDate`, `routeGroup` come from the shipment's **existing** `droppedCarrierList` entry for the same scac if there is one, else `null`.

First read the Tender tab's dropped-carrier consumers (grep `droppedCarrierList` in `src/`) and confirm that nulls render as `--` and don't crash. If a field is required, say which. Put the mapping in a pure exported helper, and write it in the same transaction (one more `jsonb_set` on the resolve query, or next to `buildShippingOptionListQuery`). **Tests:** the mapping (shape plus the existing-entry fill), and that adoption writes it.

## Done when
- `node --test api/_lib/*.test.mjs tools/*.test.mjs` passes. `npx vitest run` passes, apart from the known `src/utils/toast.test.js`. `npm run build:odyssey-one` passes.
- The generator has been rerun, `src/data/*.json` is regenerated, the id diff is empty (2,200/2,200), and `npm run progression:audit` is clean.
- No reseed, no deploy, no DB contact. Implementers don't stage or commit.
