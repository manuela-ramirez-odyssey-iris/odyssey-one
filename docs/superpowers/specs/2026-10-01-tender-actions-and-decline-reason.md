---
domain: shipments
type: spec
tags: [tender, routing-guide, decline-reason, giveback, tender-history]
date: 2026-10-01
status: approved 2026-10-01 (user, A1–A6 defaults accepted)
stories: [LINX-15899, LINX-15897]
---

# Tender actions per option + Decline reason / Carrier giveback

One spec for two stories, because they share one code path: 15899's Decline "requires the decline information defined in the Carrier Decline Reason story", and both change the same files (`RoutingGuideTab.jsx`, `tenderAction.js`, `saveTender`, the seed).

## 1. Sources

- **LINX-15899** "Tender Actions and Tender Status Management at Option Level" — Ready for Development, Steve O'Hara approved 2026-09-01; Jana asked for a VD/Vercel update (2026-08-31). AC = `customfield_10032`, fetched 2026-10-01.
- **LINX-15897** "Capture Tender Decline Reason and Carrier Load Giveback Details" — In Development, approved 2026-09-02; Jana asked for a VD (2026-08-31). AC fetched 2026-10-01.
- **Audits (S164, 2026-10-01, read-only, auditor agent).** Line numbers are against the working tree that day and are under `apps/odyssey-one/`:
  - status→actions map `src/components/detail/RoutingGuideTab.jsx:37-43`, fallback `:57-60`, menu filtering `:275-285`, row tint `:28-34`/`:791`, order-change lock `:1664/1681/1702`, manual-comm confirm `:1505-1509`/`:378-382`
  - `src/lib/tenderAction.js`: results `:15-19`, response stamp `:42-48`, Re-Tender reset `:53-59`, auto-tender cascade `:66-87`
  - `api/_lib/shipments.mjs` `saveTender` `:1303-1344` (writes the `tenders` row only, no guard, no history)
  - `src/routes/TenderReview.jsx:25-31` (5-value `DECLINE_REASONS`), `:192-193`, `:271-288`
  - `src/api/types/shipmentDetail.ts:270-271`, `mapSellShipmentOutToDetail.ts:446-447` (save passes extra fields through `:689-691`)
  - `src/components/detail/tenderColumns.js:19-92`, `RoutingHistoryTab.jsx:104`, `HistoryTab.jsx` (display only, DEC-80)
  - `tools/generate.mjs` decline seed `~1286-1300`, history events `1677+`/`2011`
  - `src/tender/email/tenderEmail.js:149` `tenderCanceledEmail` (used only by the `/tender-emails` gallery)
  - decisions: DEC-182 (5 placeholder reasons), DEC-184 (no auto-tender on carrier decline, open), DEC-186 (`responseUser` null for carrier responses), DEC-209 (To Be Tendered → Tender + Cancel); `routing-history.md:129,221` Q-RH-11.

## 2. Scope

**In:** the planner's Tender tab (per-option actions menu), the carrier email review page's decline (reason list only), `saveTender` on the API, the tender columns, shipment History, the seed.
**Out:** EDI intake (no EDI channel exists in the prototype — a carrier EDI decline is seeded, not received); real email sending (the "Cancel message" is the existing TE-4 template, recorded as sent); the Consolidation Review screen (no caller of `applyTenderAction` there — audit; the comments at `tenderAction.js:2-8` and `RoutingGuideTab.jsx:1522-1526` claiming otherwise get corrected).

## 3. Status → actions (15899, as written)

| Current Tender Status | Actions on that option |
|---|---|
| *(none tendered yet)* | Tender — on every option |
| Cancelled | Tender |
| Sent | Re-Tender, Cancel, Accept, Decline |
| Declined | Tender |
| To Be Tendered | Tender *(A2)* |
| To Be Cancelled | Cancel |
| Accepted | Re-Tender, Cancel, Decline |

Actions not in the row are **hidden**, not disabled (already how the menu filters, `:275-285`).

| Action | Communication | Result |
|---|---|---|
| Tender | Yes | Sent — **To Be Tendered** if the comm method is Manual |
| Re-Tender | Yes | Sent — **To Be Tendered** if Manual |
| Cancel | Yes | Cancelled |
| Accept | No | Accepted; response user + date/time stamped |
| Decline | Yes — the **Cancel** message | Declined; response user + date/time; requires §5 |

## 4. Single active tender

- **Active** = Sent, Accepted, To Be Tendered.
- While one option is active, every *other* option's actions menu is **disabled** (the trigger itself, same treatment as the existing order-change lock) with a tooltip naming the active SCAC: *"Complete the action on {SCAC} first."*
- The active option is marked in its row: an `Active tender` Badge next to the SCAC (prototype default, A4).
- **Server guard** in `saveTender`: refuse (409, same shape as the existing expect-status conflict) when the write would make an option active while another option of the shipment is already active, or when the action is not in §3 for the option's current status. The UI never sends either; the guard covers a stale tab and the carrier page.
- Declined/Cancelled are not active, so once the active option ends that way the others unlock (the struck-through 15899 rule is moot — it falls out of the definition).

## 5. Decline dialog (15897)

Opened by **Decline** on a Sent or Accepted option. Nothing is written until Save.

- **Decline Reason** — required. `ComboBox` from `@odyssey/ui` (type-ahead), options from a new shared `src/data/declineReasons.js` (`[{ code, description }]`, 20 rows below). Each option renders `CODE — Description`; the search matches code OR description. Picking one fills the description.
- **Comments** — optional `TextArea`. Required when giveback is checked.
- **Carrier Gave Back the Load** — `Checkbox`, optional. Shown only when declining an **Accepted** option (giveback = the carrier accepted then returned it; a Sent option was never accepted — prototype reading, A5).
- **Save** is enabled once a reason is picked AND (giveback unchecked OR the comment has ≥1 non-blank character). Pressing **Decline Tender** without a reason shows the message instead of a silent disabled button.
- Validation messages, verbatim:
  - no reason: `Decline Reason is required.`
  - giveback checked, comment blank: `Comments are required when "Carrier Gave Back the Load" is selected.`

Decline reason codes (`declineReasons.js`, order as in the story):

| Code | Description |
|---|---|
| CAD | Carrier Accepted after Initial Decline |
| CBH | Carrier Can't Get a Backhaul |
| CDI | Customer Data Issues |
| CEC | Customer Orders Surpass Allowed Capacities |
| DNS | Destination Not Served |
| DOT | DOT Regulations (Hours Of Service) |
| ESC | Team Secured Coverage |
| HAZ | Hazardous Material |
| HOP | Hours Of Operation - Unable to Load or Deliver Based on Consignee Hours |
| NAV | No Availability |
| NRE | Non-response to Tender |
| OCE | Carrier Capacity Exceeded |
| OIT | IT System Issues |
| OMD | Incorrect Master Data Allocation |
| OPL | Operations Team Incorrect Planning |
| OSC | Operations Team Secured Coverage |
| OTL | Odyssey Booked Order after Cut Off |
| SLT | Short Lead Time |
| TTM | Transit Time / Mileage |
| WRP | Wrong Price |

**Captured on the option** (no DB migration — the option is stored as JSON, `shipments.mjs:1309`): `declineReasonCode`, `declineReason` (= description, keeps the existing field), `responseComments`, `carrierGaveBack` (boolean), plus the existing `responseUser`/`responseDateTime`/`responseMethod`. Types: `shipmentDetail.ts`, `sellShipmentOut.ts`, mapper `:446-447`.

**Carrier email page** (`TenderReview.jsx`): its 5-value list is replaced by the same 20 codes (A3). No giveback checkbox there (a carrier declining from Sent never accepted). *Not built in this slice's first pass if `TenderReview.jsx` is mid-edit — swap the import only.*

**Giveback flag.** An option with `carrierGaveBack: true` shows a red `Badge` "Gave back" beside its SCAC in the Tender tab and Routing History (A4). It persists on the option, so it survives Re-Tender of *another* option and stays visible in history.

**Cancel message on Decline.** Decline records a TE-4 cancellation (`tenderCanceledEmail`) for Email / Email & EDI options: the history entry's Communication Status reads `Success` and names TE-4. No mail is actually sent (prototype), same as Tender today.

## 6. Tender history (15899 + 15897)

`saveTender` appends one `historyList` entry per Tender / Re-Tender / Cancel / Accept / Decline:

| Field | Source |
|---|---|
| User / system | planner = signed-in user; carrier page = `modifyUser` `"<SCAC> (email link)"` (A3) |
| Date and time | server time, formatted like the other history rows |
| Action | Tender · Re-Tender · Cancel · Accept · Decline |
| Previous → New Tender Status | the option's status before / after |
| Communication Status | `Success` / `Failure` / `—` (Accept has none) |
| SCAC | the option |
| Decline only (15897 "Option Note") | `Code - Description`, Comment, Carrier Gave Back the Load (checkbox shown checked/unchecked) |

`HistoryTab.jsx` renders the new event types with the existing row layout; the Decline note shows as `Option Note: WRP - Wrong Price · "comment" · ☑ Carrier Gave Back the Load` (A4).

## 7. Build table

| # | Clause | Today | Target | Files |
|---|---|---|---|---|
| 1 | Single active tender (UI) | none | §4 disable + marker | `RoutingGuideTab.jsx` |
| 2 | Single active tender (server) | none | §4 409 guard | `api/_lib/shipments.mjs` |
| 3 | Actions matrix | 5 rows differ | §3 table | `RoutingGuideTab.jsx:37-43` |
| 4 | To Be Cancelled | absent; unknown status falls to Tender menu | status + Badge tone + Cancel only | `RoutingGuideTab.jsx`, `tenderColumns.js` |
| 5 | Manual comm → To Be Tendered | always Sent | Tender/Re-Tender on Manual → To Be Tendered, no token | `tenderAction.js:15,19` |
| 6 | Decline on Accepted | Cancel only | Re-Tender, Cancel, Decline | `RoutingGuideTab.jsx:41` |
| 7 | Decline dialog | sets status immediately | §5 | `RoutingGuideTab.jsx`, new `src/data/declineReasons.js`, `tenderAction.js` |
| 8 | Decline fields | `declineReason` text only | + code, giveback | types, mapper |
| 9 | Carrier page list | 5 placeholders | 20 codes | `TenderReview.jsx:25-31` |
| 10 | Giveback flag | none | §5 Badge | `tenderColumns.js`, `RoutingHistoryTab.jsx` |
| 11 | Cancel message on Decline | none | TE-4 recorded | `tenderAction.js`, history entry |
| 12 | Tender history | seed only | §6 on every action | `shipments.mjs` `saveTender`, `HistoryTab.jsx` |
| 13 | **Bug:** Re-Tender keeps the old decline | `declineReason`/`responseComments` survive | clear them (and code) on Tender/Re-Tender; **keep** `carrierGaveBack` | `tenderAction.js:53-59` |
| 14 | Auto-tender cascade | Decline/Cancel tenders the next carrier | removed (A1) | `tenderAction.js:66-87` |

Tests: `tenderAction.test.js` (matrix, manual → To Be Tendered, cascade gone, bug 13), a `RoutingGuideTab` test for the lock + dialog validation, an API test for the 409 guard. `declineReasons.js` needs no test.

## 8. Seed (one reseed, batched with the other approved slices)

- Declined options draw a code from `declineReasons.js` (id-keyed `rnd`, **no new faker draw** — ids are load-bearing) and set `declineReason` to its description.
- A few Declined-after-Accepted options get `carrierGaveBack: true` + a comment.
- Seed history events for the five actions (DEC-80 event list extended) so History isn't empty for old shipments.
- Possibly a handful of To Be Cancelled options.
- `src/data/responseComments.js:19-24` stops avoiding a reason vocabulary — it now has one.

## 9. Decision-log entries

- **New DEC:** the 20 coded reasons replace DEC-182's 5 placeholders on both sides — **supersedes DEC-182**. Update the S156 plan `docs/superpowers/plans/2026-09-22-tender-email-and-carrier-review-page.md:91,117` (D-5).
- **Amend DEC-209:** To Be Tendered → Tender only (LINX-15899 supersedes LINX-8253 here) — if A2 stands.
- **New DEC:** single active tender + server guard; cascade removed (A1). DEC-184 (carrier decline doesn't auto-tender) becomes moot — close it.
- **Close Q-RH-11** (`routing-history.md:129,221`): 15899 confirms Re-Tender / Cancel / Decline on Accepted. Update DEC-175 (it quoted 15899 secondhand).
- **New DEC:** history actor for carrier responses = `"<SCAC> (email link)"`; `responseUser` stays null per DEC-186.

## 10. Assumptions pending ruling

Each has a default so the spec can be approved as-is.

| # | Question | Default |
|---|---|---|
| A1 | Keep the auto-tender cascade after Decline/Cancel? It makes a second option active and skips the manual-comm confirm. | **Drop it.** The planner tenders the next option by hand. |
| A2 | To Be Tendered: Tender + Cancel (DEC-209 / LINX-8253) or Tender only (15899)? | **Tender only**, follow the story; amend DEC-209. |
| A3 | Carrier email decline uses the same 20 codes? History actor = `"<SCAC> (email link)"`? | **Yes / yes.** |
| A4 | Dialog layout, "Active tender" marker, giveback icon, history line format — no VD yet (Jana asked Manuela 2026-08-31). | Prototype default from existing `@odyssey/ui` atoms (`ComboBox`, `TextArea`, `Checkbox`, `Badge`, the existing modal shell); restyle when the VD lands. |
| A5 | Show the giveback checkbox when declining a **Sent** option too? | **Accepted only** — a Sent option was never accepted. |
| A6 | Comm Failure — can it happen in the prototype? | No; always `Success`. The field exists so a real send can fill it. |

Validate with Jana (domain) and Adam/Dave (tender ops) before build; the VD with Laura/Efrain.

## 11. Next spec: LINX-15873 (not specced here)

Open questions from the S164 audit, to settle before that spec:
1. **Save semantics** — rewrite the consolidated shipment (new carrier list, re-tender?) or only re-route / discard? The story says "before finalizing" but not what finalizing does.
2. **Eligibility** — tendered/Accepted consolidated shipments too, or only those still in the Consolidation category (the `/consolidate` server refuses others, `consolidateShipments.mjs:70-71`)?
3. **Minimum orders** — 2 (consolidation rule, `EditStopsView.jsx:146`) or 1 (order change)?
4. **"Open order change" gate** — any unresolved order change (`orderChange && !orderChange.resolution`), including after a Scenario A save? `consolidatedReviewPending` turns false too early.
5. **"Outside planning window" triangle** — hidden too, or only order-change warnings?
6. **Figma node** — Mayank says an initial VD exists; none is referenced in the repo. Get the node first.

Likely reuse base: `ConsolidateStopsRoute.jsx` + `EditStopsView` with `showPrior={false}` (already order-change-free), with a button + gate on `StopsTab.jsx`.
