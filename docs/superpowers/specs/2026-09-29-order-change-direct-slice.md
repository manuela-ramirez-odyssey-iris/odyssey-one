---
title: Order change — Direct slice (D2, D4, D5)
date: 2026-09-29
session: S163
status: approved direction (user 2026-09-29: "do all once and for all"); last slice before the single reseed + deploy
---

# Order change — Direct slice

The three Direct items still owed. Plan: `docs/superpowers/plans/2026-09-25-order-change-remaining.md` §D. Verbatim ACs: `vault-sources/10-domains/shipments/sources/linx-order-change-direct-ac-2026-08-29.md` (LINX-14509 `:19`, 14510 `:46`, 14513 `:200`). **No seed change**: the single reseed after this slice covers the earlier slices. Paths are under `apps/odyssey-one/`.

## D2 — Tender tab readable during review (LINX-14509)
14509: *"The user shall be able to view Tender information while the shipment is pending Order Change review"* and *"shall not be allowed to perform tender-related actions until the Order Change review process has been completed."* Today the Tender tab's table and Process SCAC are **blurred** and inert while the review is pending (S137, `src/components/detail/RoutingGuideTab.jsx`; find the lock overlay/blur class).
- Remove the blur: the table and dropped-carrier content render normally and can be read and scrolled.
- Keep every tender action locked: row action menus, Process SCAC, Add/Edit Quote, the dropped-carrier actions. Disable them; don't hide them, so the layout stays stable. Each disabled control carries the existing lock reason as a tooltip, or a new one: *"Complete the order change review first."*
- The **Review Order Change** button stays where it is. With no overlay to sit on, place it where the overlay centred it, or in the tab's header row. Pick the least disruptive spot and note it in the report.
- This applies to both Direct and consolidated order changes. The consolidated doorway already follows `consolidatedReviewPending`.
- **Tests:** while pending, the table's content is readable (text is present and there is no blur class), action triggers are disabled, and the Review button is present. After resolution, actions are enabled.

## D4 — Required dates when the prior carrier isn't in the new list (LINX-14513)
14513, Scenario 2 note: *"If Date are not available, user shall be forced to pick 'Pickup Date' and 'Delivery Date'"*, and *"If Routing and Rating do not return Pickup Date or Delivery Date values: the dates shall be displayed as editable fields… the user shall be responsible for providing the required date values before proceeding."*
- **Direct review** (`src/routes/shipments/OrderChangeReviewRoute.jsx`, `src/components/shipments/order-change/OrderChangeActionsCard.jsx`): when the prior carrier was **not returned** (`orderChange.scenario === 'not-returned'`, or no `newOption`), the Actions card shows **Pickup Date** and **Delivery Date** as editable date+time fields. Reuse the date/time/zone picker Edit Stops already uses; don't build a new control. They start **blank**. **Re-Tender** and **Bypass** are disabled, with the tooltip *"Enter the pickup and delivery dates first"*, until both are set and the delivery is after the pickup. Cancel Tender doesn't need them.
- Today's read-only date display in the Actions card (build-delta row 10) is replaced by these fields in Scenario 2. Scenario 1 (returned) keeps the new row's own dates, read-only.
- **API** (`api/_lib/shipments.mjs` `resolveOrderChange` / `adoptNewTenderList`): retender and bypass accept `body.dates = { pickupDateTime, deliveryDateTime }` (short form `MM/DD/YYYY HH:MM TZ`, the tender option's format), which is required when the prior carrier is inserted, else 400 *"Pickup and delivery dates are required for a carrier not returned by routing"*. The inserted prior row gets those dates.
- A **consolidated** order change is exempt. Its inserted prior carrier already takes the stop dates (DEC-206, `applyStopDates`), so the fields never show there. Check `orderChange.consolidation`.
- **Tests:**
  - UI: Scenario 2 shows the fields, Re-Tender stays disabled until both dates are set, and the payload carries them. Scenario 1 shows no fields.
  - API: a missing date gives 400; the inserted row carries the dates; the consolidated case needs none.

## D5 — Tender Option Versions retained (LINX-14510)
14510: a new version per order change, the latest first, **previous versions retained**, **each with its own Dropped Carrier list**. Today:
- the review screen shows New over Prior (built);
- after resolution, Routing History (LINX-15895, `src/data/routingHistory.js` + its tab) **derives** the prior version at read time from `orderChange.priorTenderList`, so only one prior version ever exists;
- the dropped list isn't versioned.

**Measure first:** read `routingHistory.js` and the Routing History tab and write down (in the report) what they derive and from where. Then build only this gap:
- On every adoption (`writeTenderAdoption` callers: Scenario B save-stops, approve-plan, retender, bypass, cancel), **append** the list being replaced to `detail.tenderOptionVersions`: `{ version, adoptedAt, reason: 'Order Change', tenderList: <prior rows>, droppedCarrierList: <the prior dropped list> }`. `version` = the array length + 1. The first entry is the original routing.
- Routing History reads `detail.tenderOptionVersions` when present, **newest first**, with each version's own dropped list. It falls back to today's derivation when the array is absent, so seeded unresolved shipments look the same as today. Where the derivation and a persisted entry describe the same version, the persisted entry wins; no duplicates.
- The version numbering and labels match what Routing History already shows ("Version 1", …). Keep its existing section layout (DEC-176); this is data, not UI.
- **Tests:**
  - API: two successive adoptions leave two entries in order, each with its own dropped list.
  - `routingHistory.js`: persisted versions render newest first, with no duplicate of the derived V1; with no array, the output is unchanged.

## Done when
- `node --test api/_lib/*.test.mjs tools/*.test.mjs` passes. `npx vitest run` passes, apart from the known `src/utils/toast.test.js`. `npm run build:odyssey-one` passes.
- No seed change; if one turns out to be needed, stop and report.
- No reseed, no deploy, no DB contact. Implementers don't stage or commit. The parallel session's uncommitted files (`src/routes/shipments/ConsolidationReviewRoute*`, `consolidation-review.css`, `src/routes/design-system/domain-usage.json`) are not touched.
