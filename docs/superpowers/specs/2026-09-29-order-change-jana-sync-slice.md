---
title: Order change — Jana 09-29 sync, non-design slice (A, B, C, D, E)
date: 2026-09-29
session: S164
status: approved (user 2026-09-29: "go"; R1 = Remove, R2 = To Be Tendered is no prior tender, R3 = seed never-tendered Direct)
---

# Order change — Jana 09-29 sync, non-design slice

Source: `vault/00-inbox/Order Change Sync.vtt` (Jana ↔ Manuela, 2026-09-29, timestamps `@mm:ss`). Evidence: two read-only audits this session (file:line below). Design items from the same call (collapse Prior in edit mode, Prior/New summary regrouping, distance info icon, always-visible move buttons, line-item tabs, stop pickup date in the planning-dates view) are **out of scope**: they wait for Figma. Consolidation (workbench scoped to Consolidation state and reusing this flow from New) is **a separate, later spec**. Paths are under `apps/odyssey-one/`.

**One reseed + one deploy after ALL slices**, including this one and the AC-gap and Direct slices still owed (memory `feedback_batch_reseeds`). This slice changes the seed (B3 and D3).

## Rulings (user, 2026-09-29)
- **R1: "Set Aside" → "Remove"?** Jana asked again on 09-29 `@06:06`. DEC-194 (user, 09-24) rejected "Remove" because it reads as delete. Jana rules on behaviour, not presentation (memory `feedback_jana_does_not_decide_ui`), so it's the user's call. If yes, DEC-194 gets an amendment and the copy changes in `EditStopsView.jsx:510,519`, plus tests and comments.
- **R2: To Be Tendered prior.** Today Bypass on a To Be Tendered prior files a shipment nobody tendered under **Monitoring › Tender Sent** (`api/_lib/shipments.mjs:329`). Jana `@23:50` and `@26:10`: with a routing list but no tender sent, the user approves and then *"manually tender it"* on the Tender screen. Proposal: in the review, To Be Tendered counts as **no prior tender** (see D). DEC-209 (To Be Tendered enters the review, LINX-14509) still stands, since it governs entry, not the outcome.
- **R3: seed a Direct order change with a never-tendered prior** (`tenderStatus` null) so D can be demoed? None exists today (`tools/generate.mjs:1373,1394`).

## A — After Bypass / Re-Tender, land on the shipment's Tender screen (Jana `@23:20`)
Jana: *"It should take the user to the tender page and tell them this particular shipment is now tendered."* Today `landingFor()` sends both actions to the Order Change tab (`src/routes/shipments/OrderChangeReviewRoute.jsx:98`), where the shipment no longer is.
- `landingFor(action, sellShipment, priorStatus)`:
  - retender → `{ panel: 'monitoring', tab: 'sent' }`
  - bypass → `'approved'` if the prior was Accepted, else `'sent'`
  - both add `selectedShipmentId` and `requestedTab: { key: 'routing' }`, the same way cancel does (`:90-97`)
  - these mirror `OC_OUTCOMES` (`api/_lib/shipments.mjs:322-329`)
  - better: return the outcome `{ panel, category }` from the resolve PATCH (today it returns `{ success: true }`, `:1134`) and land on that, so the rule lives in one place
- Toast before `closeSheet` in `onSuccess` (`:181-183`). Use `showToast` (`src/utils/toast.js`), whose fire-then-navigate pattern is already used by `ExecutedShipmentDetailsRoute.jsx:115`. Copy:
  - Re-Tender: *"Shipment re-tendered to {SCAC}."*
  - Bypass: *"{SCAC} kept. Tender status unchanged."* Bypass sends nothing, so "tendered" would be false. That wording is ours, not Jana's.
- **Tests:** `landingFor` for each action and prior status; the toast fires with each action's copy.

## B — Tender resolution shows the seeded date, not the approved plan's (Jana `@22:33`: "should be 14th")
**Root cause:** the C4/C12 re-route re-dates only `orderChange.newTenderList`. The Prior | New carrier panel reads `orderChange.newOption` (`OrderChangeActionsCard.jsx:131-132,141,152`), and the Preview Tender Details comparison rows read `orderChange.comparison`. Both still hold the **seeded** routing-shifted date: baseDate + 1–3 days (`tools/generate.mjs:2824-2826,2909,2938-2939,3009`). Nothing writes them back: `PATCH_PATHS` has no path for them (`api/_lib/shipments.mjs:751-757`), and save-stops (`:1041-1046`) and approve-plan (`:1153`) patch the list only.
- **B1.** In `src/lib/orderChangeRouting.js`, add `rerouteOrderChange(oc, stops, baselineMiles)` beside `rerouteTenderList`. It returns `{ newTenderList, newOption, comparison }`:
  - `newOption` gets the stop dates (`applyStopDates`) and `apCost` = the matching SCAC's re-scaled `totalCostAmount` in the re-routed list;
  - the comparison's Pickup Date/Time and Delivery Date "new" values point at the same dates.
- **B2.** save-stops and approve-plan call it; `PATCH_PATHS` gains `newOption` and `comparison`. One function, both callers.
- **B3 (seed).** For a consolidated order change, set `newOption`'s and the comparison's dates from the stop dates at generation time (DEC-206: *routing's dates are ignored for a consolidation*). Then an unedited Scenario A shipment approved from the Stops tab, which makes no server call (`src/routes/shipments/useApproveOrderChange.js:57`), is also coherent. It adds no new rnd draws, so no id moves (memory `feedback_seeded_ids_are_load_bearing`).
- A Direct order change is unaffected: its routing dates stand (D4 handles a carrier that wasn't returned).
- **Tests:**
  - unit: `rerouteOrderChange` re-dates `newOption` and the comparison, and `apCost` follows the list;
  - API: after save-stops, `newOption.pickupDateTime` equals the first pickup stop's date;
  - seed audit: 0 consolidated order changes where `newOption`'s pickup date ≠ the first pickup stop's date.

## C — Label (R1 = yes)
"Set Aside" → "Remove" in `EditStopsView.jsx`, plus tests. Add a DEC-194 amendment row to the decision log.

## D — No prior tender → Approve → Tender screen, manual tender (Jana `@23:50`)
Consolidated (Scenario B, Declined/Cancelled prior) **already works**: Approve lands on the Tender screen with the Tender action (`useApproveOrderChange.js:38-40,51-56`; `RoutingGuideTab.jsx:37-38,55,1583`). The Direct path doesn't:
- **D1.** `OrderChangeReviewRoute` offers Bypass / Re-Tender whatever the prior tender is (`OrderChangeActionsCard.jsx:296-303`). When the prior has **no active tender** (null, Declined, Cancelled, and To Be Tendered, R2), the card offers a single **Approve Changes** instead. It runs the existing `approve-plan` mutation, then goes to the shipment's Tender screen (`closeToTenderTab`), where the planner tenders manually. That reuses the Scenario B outcome (`SCENARIO_B()`, `shipments.mjs:317-319,352`).
- **D2 (server guard).** `resolveOrderChange` rejects retender/bypass when the prior has no active tender with 409 *"No active tender to keep; approve the changes and tender manually."* Today `bypass(null)` invents `'Sent'` (`shipments.mjs:327-329`).
- **D3 (seed, R3 = yes).** A handful of Direct order changes with `prior.tenderStatus` null, using id-keyed rnd and zero faker draws.
- **Tests:** the card shows Approve Changes for null / Declined / Cancelled and To Be Tendered priors and Bypass / Re-Tender for Sent / Accepted; the API returns 409 on bypass with no active tender.

## E — The X and breadcrumbs make sense at every step (no Back button, user 09-29)
- **E1. Edit Shipment Stops loses unsaved edits.** The X (`OrderChangeEditStopsRoute.jsx:95`) and both crumbs (`:100-101`) call `exit` / `closeSheet` directly and skip the dirty check that the footer Cancel runs (`EditStopsView.jsx:317-319,711-718`). Route all three through the same `handleCancel` confirm.
- **E2. Crumb label.** Edit Stops' middle crumb says **"Review Order Change"**, but it returns to the consolidated review, whose doorway says **"Review Consolidated Change"** (`ShipmentTable.jsx:336`; `RoutingGuideTab.jsx:1612`). Match the doorway.
- **E3. The Scenario A approve loses its origin.** `openDirectReview` (`useApproveOrderChange.js:31-34`) carries no `from`, so the Direct review's X goes to the bare Order Change tab, not to the shipment just edited. Thread the origin through so X returns to that shipment.
- **E4. A resolved review can be re-entered.** Browser Back or a pasted URL re-renders the Actions card after resolution, because the route guards only `!oc` (`OrderChangeReviewRoute.jsx:219`), and a second PATCH would re-file the shipment (no guard in `resolveOrderChange`, `shipments.mjs:1002-1134`).
  - Client: when `oc.resolution` is set, redirect to the A landing.
  - Server: 409 *"This order change was already resolved."*
- **Tests:** X and crumbs with unsaved edits open the confirm; the crumb label; X after a Scenario A approve returns to the shipment; the API returns 409 on a second resolve; a resolved `oc` redirects.

## Split for implementers (disjoint files)
- **Agent 1, client:** `OrderChangeReviewRoute.jsx`, `OrderChangeActionsCard.jsx`, `useApproveOrderChange.js`, `OrderChangeEditStopsRoute.jsx`, `EditStopsView.jsx`, and their tests (A, C, D1, E1–E4 client).
- **Agent 2, server + lib + seed:** `src/lib/orderChangeRouting.js`, `api/_lib/shipments.mjs`, `tools/generate.mjs`, and their tests (A's PATCH outcome, B1–B3, D2, D3, E4 server).
- Contract between them: the resolve PATCH returns `{ success, outcome: { panel, category } }`; the 409s use the messages above.

Decision log: one DEC for the new A landing (amends S135's landing rule), one for D (no prior tender → approve → manual tender), plus the R1 and R2 outcomes. Canon: update `vault/10-domains/shipments/order-change.md` §10c/§10d to match.
