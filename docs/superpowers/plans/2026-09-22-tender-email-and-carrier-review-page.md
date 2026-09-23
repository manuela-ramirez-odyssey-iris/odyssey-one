# Tender email + carrier Tender Review page (LINX-15795 / 15796 / 15800)

**Date:** 2026-09-22 · **Thread:** S157 (S156 was already wrapped) · **Status:** approved 2026-09-22, in execution
**Sources:** Jira exports in `vault/00-inbox/LINX-15795.doc`, `LINX-15796.doc`, `LINX-15800.doc` (HTML); Figma VD `x38TOJGsNryYl3LsKhCtSc` nodes `2509:71686` (review), `2525:41529` (decline form), `2525:41993` (decline reason menu), `2519:39552` (declined), `2525:39252` (accepted); user brief 2026-09-22 (*"email needs to look the same as the spotbid"*, *"landing page … based on the same design as the spotbid bidding page"*).

## 0. What ships

1. **Tender email** (`TE-1` Email, `TE-2` Email & EDI copy) — CE-1's layout and blocks, Dave's subject line verbatim, one CTA **Review & Respond** → the review page. Rendered in a reference gallery at `/tender-emails` (sibling of `/spot-emails`) and previewable from the Tender tab row menu.
2. **Carrier Tender Review page** at `/tender-review/:token` — public, no AppShell, CarrierBid's chrome (external Navbar, hero, entrance stagger), the five VD sections, and the response states: review → accept / decline-with-reason → recorded banners; informational copy (Email & EDI); already processed; invalid/expired link.
3. **Plumbing** so both are reachable from real data: `tenderToken` minted on Tender/Re-Tender for Email-method options, three new fields carried through the mapper whitelist, a server-side once-only guard on the response write, and `Email & EDI` + `Manual` in the seeded notify methods (reseed owed — **not run without permission**).

Out of scope, recorded: Tender History tab (still a stub), Shipment Trail events for the carrier response, email delivery/retry (BR-9/10 of 15795 — no mail server here), EDI dispatch (15800 AC-2), the Decline → auto-tender-next cascade from the carrier side (see §7).

## 1. Data model (tender option JSON — `tenders.option` in Neon, `routingData.options[]` on the VM)

| Field | Type | Written by | Read by |
|---|---|---|---|
| `tenderToken` | string \| undefined | `handleAction` Tender / Re-Tender (and the Decline/Cancel auto-tender cascade) when `api` is `Email` or `Email & EDI`; generator for seeded `Sent` rows with those methods | review page (forgery guard), email builder |
| `declineReason` | string \| null | review page Decline | Tender tab (Others/Response columns later), Routing History |
| `responseComments` | string \| null | review page Decline (optional comments); **already seeded** by `generate.mjs` (DEC-173) but **not on the VM whitelist** | Routing History already reads it off raw data |

**Whitelist bug class (5× shipped — memory):** all three must be added to `mapRoutingOption` in `src/api/mappers/mapSellShipmentOutToDetail.ts`, to `RoutingOptionVM` and to `SellShipmentRoutingOption` (`src/api/types/`). `routingOptionVmToDto` spreads `...rest`, so the write side needs nothing. Extend the existing round-trip test (`routingOptionVmToDto — persist round-trip`) with the three fields.

**Token:** reuse `src/spotboard/token.js` `mintToken(sellShipment, scac)` / `decodeToken` unchanged (`{s, c, n}`); the forgery guard is the same string-match rule CarrierBid uses (`option.tenderToken === urlToken`). Re-Tender mints a fresh token, so a stale link fails the match → "invalid or expired" (AC-08). Cancel leaves the token but the status is no longer `Sent` → "no longer open" (see §4).

**Generator (`tools/generate.mjs`):**
- `ROUTING_APIS = ['API', 'EDI', 'Email', 'Email & EDI', 'Fax', 'Manual']` (`Manual` landed in S156's BR-11 commit; `Email & EDI` is 15800's method name).
- For every option with `status === 'Sent'` (or Accepted/Declined — a responded tender also had a link) and `apiSource ∈ {Email, Email & EDI}`, stamp a **deterministic** token: `toBase64Url(JSON.stringify({ s: sellShipment, c: scac, n: `seed-${lcePkId}` }))` — no `crypto.randomUUID()` (seed 42 must stay reproducible) and **no faker draw** (ids must not move; verify with the existing full-corpus id check, DEC-107 pattern). `pick(ROUTING_APIS)` is one `arrayElement` draw whatever the array length, so lengthening the list does not renumber anything — state this in the commit.
- **Reseed of Neon is owed** for `Manual`, `Email & EDI` and the tokens to be reachable live. Ask before running.

## 2. API (`api/_lib/shipments.mjs`, same router for Vercel and `tools/local-api.mjs`)

`PUT /shipment-service/v1/sell-shipment-out/:id/tender` gains an optional `body.expectStatus`. When present, `buildTenderUpdateQuery` adds `AND status = $9`; zero rows updated with `expectStatus` set → **409** `{ error: 'already-processed' }` (no insert fallback on that path). This is BR-07 / AC-06 (15796) enforced where it counts — two tabs cannot both record. Pure-builder test + handler test (existing `shipments.test.mjs` idioms). `saveTenderOption(id, dto, { expectStatus })` in `src/api/services/shipmentService.ts` passes it through; the mock-mode path mirrors the check against the local option's status.

Read side needs nothing new: the review page loads the shipment through the existing `useShipmentDetail(sellShipment)` (the API is unauthenticated in this prototype, same as `/spot-bid`). *ponytail:* BR-09 "public accessibility" is satisfied by that; a real deployment scopes a read endpoint to the token — note in code.

## 3. Email (`src/tender/email/`)

Files: `tenderEmail.js` (templates), `tenderEmailContext.js` (VM → ctx), `tenderEmailContext.test.js`, `tenderEmail.test.js`. Import `blocks/renderHtml/renderText` from `../../spotboard/email/emailLayout.js` and `PLANNING_GROUP_MAILBOX`, `APP_ORIGIN`, `fmtDate` from `../../spotboard/email/emailContext.js` — the layout stays where it is (moving it is churn; leave a one-line note that the email layer is shared, not spot-specific).

**Subject — verbatim Dave (15795 BR-5):**
- Direct: `Tender Notification to <SCAC> of Shipment ID:<odysseyShipmentIdentifier>, for <Customer> delivery:<OrderNo>`
- Consolidation (`shipmentType === 'C'` / >1 order): `Tender Notification to <SCAC> of Shipment ID:<odysseyShipmentIdentifier>, for <Customer>, multiple deliveries`
- `<Customer>` = `customerName` with a leading `*` stripped and anything from `_SYS` on removed (Dave's own guess at the TMS rule — cite it, keep it one regex, test `*USALCO_SYS_01 → USALCO` and a plain name unchanged).

**Body (CE-1 shape — `rfqEmail` is the model, line for line):**
- `eyebrow('Tender Notification')`, `headline('<SCAC> — Shipment <odysseyShipmentIdentifier>')`
- `notice('Tendered <notifyDateTime>', 'info')` — TE-2 instead: `notice('Informational copy — this tender was also sent to you by EDI. Please respond through your EDI connection.', 'info')`
- `columnStack([[Shipper, Carrier], [Shipment ID, Equipment, Weight, Hazmat]])`, `route(from, to)`, `addressPair(Ship From / Ship To, foot: Pickup / Deliver)`, `factGrid([[Distance], [Offered Rate]])`, stop-offs grid as CE-1 when middle stops exist
- `button('Review & Respond', `${appOrigin}/tender-review/${token}`)` — TE-2: `button('Review Tender', …)`
- `paragraph('This link is for your company only. Opening it does not accept or decline the tender — you confirm your response on the review page.')` (BR-01/BR-08 of 15796)
- Text twin mirrors the lines exactly as CE-1 does.

**Envelope:** `from: PLANNING_GROUP_MAILBOX`; `to: ops@<scac>.example.com` — the same synthesized convention `spotboard/carrierList.js` uses. *ponytail:* BR-3 says the To-list comes from `mf$get.load_tender_communication(...)`, one email per returned entry; no carrier contact model exists here, so one synthesized address stands in. No CC (none configured).

**Offered Rate:** the option's `rate` + `rateDetails.currency` (the carrier's AP rate — Dave, Shipments canon §4: *"we send them a tender with that $1000 for them to accept"*). Never AR/markup.

**Gallery `/tender-emails`:** parametrize `src/routes/spot-emails/SpotEmailsRoute.jsx` into a gallery that takes `{ title, lede, scenarios, emailsForScenario, defaultEmailIdFor, kindTone }` (keep `/spot-emails` rendering byte-identical; its test must still pass). New `src/routes/tender-emails/fixture.js` with one seeded ctx and three scenarios: *Tender sent (Email)*, *Tender sent (Email & EDI)*, *Consolidation tender* (subject variant). The fixture's token is a real `mintToken('<fixture sell id>', 'CCNI')`-shaped string so the CTA's href reads correctly; it need not resolve.

## 4. Carrier Tender Review page (`src/routes/TenderReview.jsx`, `/tender-review/:token`)

Registered in `App.jsx` exactly like `/spot-bid/:token` (lazy + Suspense, outside AppShell). Reuses CarrierBid's chrome: extract `HeroBackground` and `carrierInitials` from `CarrierBid.jsx` into `src/routes/externalPageChrome.jsx` (pure, no behaviour change; CarrierBid imports them back — its tests must stay green) and import `carrierBid.css` for the page/card classes (`carrier-bid-page`, `__main`, `carrier-bid-navbar-wrap`, `carrier-bid-card__grid…`). *ponytail:* the class names say "bid" on a tender page; rename to `external-page-*` only when a third external page appears. Navbar `context="external"`, `GlobalSearch mode="title" title="Carrier Portal"` (no countdown — a tender has no bidding window), TrailNav = SCAC over carrier name, same profile dropdown.

**Resolution:** `decodeToken(token)` → `{ shipmentId: sellShipment, scac }` → `useShipmentDetail(sellShipment)` → `option = routingData.options.find(o => o.scac === scac && o.tenderToken === token)`.

**States (one `phase` derivation, tested):**

| Condition | Render |
|---|---|
| bad token / shipment missing / no option matches | Alert (warning): **"This link is invalid or has expired."** — nothing else: no shipment data (AC-08). Loading text while the fetch is in flight, same `awaitingFirstHydration` idiom |
| `option.status === 'Sent'`, `api === 'Email'` | full page + **Your Response** with `Decline Tender` (secondary) / `Accept Tender` (primary) |
| `option.status === 'Sent'`, `api === 'Email & EDI'` | full page; Your Response replaced by an info Alert: **"This is an informational copy. This tender was also sent to you by EDI — please respond through your EDI connection."** No buttons (15800 AC-4) |
| `status === 'Accepted'` | full page; Your Response = success Alert **"Tender accepted – Recorded on <responseDateTime>. Reference <odysseyShipmentIdentifier>."** No buttons (idempotent, AC-06) |
| `status === 'Declined'` | same with error Alert **"Tender declined – Recorded on …"**; when `declineReason` is set append **" Reason: <reason>."** |
| any other status (`Cancelled`, null) | full page; Your Response = warning Alert **"This tender is no longer open."** |
| a response write returns 409 | replace the form with the verbatim BR-07 message: **"This tender response has already been submitted and cannot be processed again."** and refetch |

Footer line under the last card (all full-page states): *"Do not forward this link. It is unique to this tender option."*

**Sections (SubAccordion, `defaultExpanded`, entrance stagger index 0…4):**

1. **Tender** — VD calls it *Request for quote*; that is the spotbid mock's copy and not canonical for a tender (memory: Efrain's mock text is normalized to Jira/user wording). Title line `<carrierName> - Tender <odysseyShipmentIdentifier>`, subline `<origin city, region postal country> → <dest …>`, right-side badge **blue** `Tendered <notifyDateTime>` (the VD's *Offer expires* has no tender-side source — see §7). Facts (TitleSubtitle pairs, 4 up): Shipper `customerName`, Shipment ID, Carrier `carrierName`, Equipment `option.equipment`; Distance `option.distance` (CarrierBid's fallback chain), Weight (CarrierBid's `weightDisplay` chain), Hazmat.
2. **Lane** — Ship From / Ship To: first pickup stop and last delivery stop (`stopsData.stops`): `location`, `address`, then `Pickup: <option.pickupDateTime> (<option.pickupTZ>)` / `Delivery: <option.deliveryDateTime> (<option.deliveryTZ>)`. Arrow between, as the VD.
3. **Equipment & Freight** — two-column label/value rows: Equipment, Carrier ID (SCAC), Total weight, Package count (`stopsData.summary.packageCount`), Requested delivery (`option.deliveryDateTime` + TZ), Transit (`option.transit`), Offered rate (bold; `rate` + currency). **Mode** and **Freight terms** are on the VD but nowhere on the VM (`shipmentDetail.ts` has neither) — omit the rows rather than fabricate; list in §7.
4. **Load References** — one row per order: left `Load <odysseyShipmentIdentifier>`, right `PO <poNumber> · Pickup No <pickupNumber>` (dash-tolerant; a consolidation lists every order).
5. **Pickup and delivery instructions** — `#` / `Instruction Description` table over `instructionsData.orders[].instructions` flattened with a running number (the VD's repeated "1" is a mock artefact). Empty → "No special instructions."
6. **Your Response** — lede *"This decision is final and will be sent to <PLANNING_GROUP_MAILBOX> immediately."* then per-state content above.

**Accept:** direct, no dialog (the VD shows none; the lede is the warning). Writes via `saveTenderOption(sellShipment, routingOptionVmToDto({ ...option, status: 'Accepted', responseMethod: 'Email Links Update', responseDateTime: now, responseUser: null, modifyUser: `${scac} (email link)`, modifyDate: now }), { expectStatus: 'Sent' })`. `responseMethod` value is **verbatim** 15796 BR-10. `responseUser` stays null — a carrier is not an Odyssey user (DEC-173). On success re-render the Accepted state from the returned option (optimistic, roll back on failure like CarrierBid).

**Decline:** click swaps the buttons for the VD form: `Dropdown` **Reason for declining** (required) with the five VD values `No capacity available` · `Rate too low` · `Lane not served` · `Cannot meet pickup or delivery window` · `Other`; `TextArea` **Comments (optional)**, `maxLength 200` with the `n/200` counter; `Cancel` (secondary, returns to the two buttons) / `Confirm Decline` (`variant="error"` — the VD's red-tinted button IS the DSM error variant). Confirm disabled until a reason is chosen. Writes as Accept with `status: 'Declined'`, `declineReason`, `responseComments` (null when blank). Uses whichever list-select molecule the DSM has for a fixed local list (memory: local list = Dropdown, not ComboBox).

**Nothing writes on open** (BR-04/BR-08): the page has no effect that mutates — assert in a test that mounting calls `saveTenderOption` zero times.

## 5. Tender tab hook (`RoutingGuideTab.jsx`)

- In `handleAction`'s `isNotifyAction` branch and in the Decline/Cancel cascade's auto-tender: when the row's `api` is `Email` or `Email & EDI`, set `tenderToken = mintToken(shipment.sellShipment, opt.scac)` on the updated option (Re-Tender re-mints; that is what expires the old link). One helper `isEmailNotify(api)` shared with the page.
- Row menu: for a row whose `tenderToken` is set, a **Preview tender email** action (`Tender Actions` group) opening a `ModalMedium` with the rendered TE-1/TE-2 in a sandboxed iframe (same `srcDoc` idiom as the gallery). The email's own CTA opens the live review page, so one affordance demos the whole loop. *ponytail:* prototype-only — the real system sends, it does not preview; comment says so.
- BR-11 (Manual) from earlier today is untouched.

## 6. Tests (vitest, jsdom — see `project_jsdom_test_ceilings`)

- `tenderEmail.test.js`: subject direct / consolidation / customer normalization; TE-2 has no Accept/Decline language and the EDI notice; CTA href carries the token; text twin contains the same facts.
- `TenderReview.test.jsx`: invalid token shows only the error; Sent+Email shows both buttons; Sent+Email&EDI shows none + notice; Accepted/Declined banners and no buttons; Accept writes once with `Email Links Update` and `expectStatus: 'Sent'`; Decline requires a reason, writes reason + comments; 409 → BR-07 message; mount writes nothing.
- `shipments.test.mjs`: `expectStatus` builder + 409 path.
- Mapper round-trip for the three fields; `RoutingGuideTab.test.jsx`: Tender on an Email row stamps `tenderToken`, on an EDI row does not.
- `SpotEmailsRoute.test.jsx` unchanged and green after the gallery extraction.

## 7. Deviations, inferences and open questions (for the decision log)

| # | Item | Status |
|---|---|---|
| D-1 | VD header *Request for quote* / *Quote #* → **Tender** / **Shipment ID** | our normalization (mock copy ≠ canon) |
| D-2 | VD *Offer expires* badge → **Tendered <date>** | no tender expiry exists in the three stories or on the VM; **ask Dave/Jana** whether an email tender has a response deadline (TMS tender timeout?) |
| D-3 | VD *Reference LCE17665976KCNTTL* → **Odyssey Shipment ID** | the VD string is a made-up composite; the identifier is the one ID common to buy and sell (DEC-144) |
| D-4 | VD rows *Mode*, *Freight terms* omitted | not on the VM; add when the header exposes them |
| D-5 | Decline reasons = the five VD values; comments optional, 200 chars | 15796 BR-06 says Dave will confirm mandatory/optional and the code table — **open** |
| D-6 | `To:` synthesized `ops@<scac>.example.com` | BR-3's `mf$get.load_tender_communication` has no counterpart here |
| D-7 | Carrier-side Decline does **not** auto-tender the next carrier | the Tender tab's cascade is planner-side UI; the real "common Tender Response workflow" (15796 FR-08) owns that — **ask** whether an emailed Decline should cascade like a planner Decline |
| D-8 | Accept has no confirm dialog | VD shows none; the lede carries the finality warning |
| D-9 | Tender History / Shipment Trail not written | TenderHistoryTab is a stub; out of scope, logged |
| D-10 | `responseUser` null for carrier responses | DEC-173: a response user is ours, only on Manual Update |

## 8. Execution (Sonnet subagents; Fable writes no code)

**Wave 1 (parallel):**
- **A — data/API:** §1 mapper/types/generator (+ id-stability check), §2 API `expectStatus` + service, tests.
- **B — email:** §3 templates, context, fixture, gallery parametrization, tests.

**Wave 2 (after A; B can still be running):**
- **C — review page:** §4 + chrome extraction from CarrierBid + route, tests.

**Wave 3 (after B and C):**
- **D — Tender tab hook + preview modal:** §5, tests.
- **E — docs:** `vault/10-domains/shipments/tender-communication.md` (canon: the three stories, the loop, the states), decision-log entries for §7, `progress.md` S156 entry, inbox `.doc`s archived to `vault-sources/10-domains/shipments/sources/`.

Each agent commits its own slice with the `S156:` tag; main thread verifies `git status` after each wave (agents commit despite instructions — memory). Reseed and deploy only on explicit go.
