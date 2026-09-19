# Routing History — an Accepted tender in a historical version (DEC-175)

**Status:** implemented — R1/R3 in `f0c289b`, R2′ in `42cceab` (2026-09-18); browser-proven on live Neon. **Implementer:** Sonnet subagent. **Reviewer:** main thread.
**Touches:** `src/data/routingHistory.js` and its test only. Nothing else.

## Why

DEC-169 ("a historical version never holds an Accepted tender") was ours, provisional, and
argued from the seed's own shape. The documented record contradicts it (DEC-175, canon §3a):
Jana's definition of a version is a routed shipment that *changed* — new order, new stop, origin —
and the Order Change stories run that from an **Accepted** shipment, producing *"a new Tender
Option Version"* with *"V1 = prior"* (LINX-14509, 14514, 15435, 15438). LINX-15899 permits
Cancel / Re-Tender on Accepted. So an Accepted row in history is the norm, not an impossibility.

Two things follow for the derive:

1. It currently **forbids** Accepted in history (`HISTORICAL_STATUSES` has no `'Accepted'`).
2. Worse, it **rewrites** an accepted row's status to Declined/Cancelled/Sent while spreading the
   row's acceptance artifacts through untouched. Measured 2026-09-18 over 600 details: **543 of
   2,432 derived historical rows (22%) carry a Carrier Pickup # under a non-Accepted status** —
   e.g. `O50001096` V4 `FXFE` *Sent* with `carrierPickup: "VOF10221"`. A pickup number for a
   tender nobody has answered. Same defect class as DEC-174's response fields: an artifact
   describing a fact the row no longer states.

The seed already holds the cure for the common case. Every order-change shipment carries
`details.orderChange.priorTenderList` (the real V1, Accepted row and all), `newTenderList`, and
`droppedCarriers.prior` / `.new`. That *is* the previous routing version — LINX-15435's *"V1 =
prior"* literally. Inventing a perturbed history for a shipment that has a true one is fiction
stacked under a fact.

## Rules

**R1 — Order-change shipments get their real prior version, and only that.**
When `details.orderChange` is non-null, `deriveRoutingHistory` returns **exactly one** version:

| field | value |
|---|---|
| `version` | `1` (the current, on the Tender tab, is V2 — LINX-15435's numbering) |
| `options` | `orderChange.priorTenderList`, **verbatim** — statuses, response fields, `carrierPickup` / `proNumber` / `deliveryNum`, cost. Only `quoteFlag` / `quoteAudit` are stripped, as today (a quote is a live affordance). |
| `droppedCarriers` | `orderChange.droppedCarriers.prior`, verbatim |
| `orders` | DEC-170's prefix rule as today (the AC's own example is an order being *added*, so the prior list is shorter) |
| `routedAt` | as today — `anchorInstant` minus the first `hoursBack` draw |

No older invented versions underneath it. *Rationale:* we render what we have; the alternative
is a fact (V1) sitting on top of fictions (V0, V-1). If a reviewer wants deeper history on these
shipments, that is a seed decision, not a derive one.

**R2 — Every other shipment keeps the perturbation, unchanged in its outcomes.**
No `orderChange` ⇒ the existing rules: never-tendered ⇒ no history; 1–4 versions +1 on a dead
tender; outcomes drawn from Declined / Cancelled / Sent / none. **Accepted is still not drawn
here** — on purpose. The documented routes to an Accepted row in history are order change,
planner intervention (15899) and giveback; the derive can see only the first in the data, so the
first is the only one it asserts. Adding "Accepted at some share" to the perturbation would be a
new invented fact with no source, which is exactly what DEC-175 reversed.

**R3 — The perturbation nulls the acceptance artifacts it rewrites away from.**
In `historicalOption`, alongside `quoteFlag` / `quoteAudit`, set `carrierPickup`, `proNumber`
and `deliveryNum` to `null` — same reasoning the existing comment gives for quotes: the row's
status is being rewritten to a non-accepted one, so nothing that only exists because of an
acceptance may survive on it. Whether these are issued on acceptance or on any response is
**undocumented** (Q-RH-10); nulling them on a rewritten row is correct under *either* answer,
because the rewrite itself is the fiction.

**R4 — Response coupling is untouched.** The real prior rows come from the seed, which DEC-174
made coherent; pass through. Perturbed rows keep `historicalOption`'s existing coupling.

## Amendment 2026-09-18 — R2 was too conservative (user: *"fix it"*)

R2 as written left the column filled on **4%** of shipments (the 81 order-change ones). It held
the invented histories to a "no source, no Accepted" standard that the perturbation already
violates for every other field, and it contradicts the documented norm: LINX-14514 *Keep Carrier &
Re-Tender* — *"Sent, from Sent **or Accepted** — an accepted carrier must re-accept"* — is the
ordinary re-route story: accepted → shipment changed → re-tendered → accepted again. A history
that never shows it is less faithful, not more.

**R2′ replaces R2.** For a shipment with **no** `orderChange` whose **current** options hold an
Accepted row — call that row **A** (there is at most one; the seed's tender cascade guarantees it):

| in every historical version | rule |
|---|---|
| A's row | **status `Accepted`**, the seed's own `carrierPickup` / `proNumber` / `deliveryNum` **verbatim** (never invented — S113 ruled that out), `responseMethod` / `responseUser` / `responseComments` as seeded (DEC-174 made them coherent), `responseDateTime` = this version's `routedAt` (the response belongs to the run it happened in), cost drifted as today, `quoteFlag` / `quoteAudit` stripped. |
| every other row | as today — Declined / Cancelled / **none**, with R3's artifact nulling. **`Sent` is excluded from a version that holds an Accepted row**: a tender still in flight beside an acceptance is a state the cascade cannot produce (the seed's own scenario A: ranks below the decisive one Declined/Cancelled, the decisive one Accepted, the rest never tendered). |

Shipments with **no** accepted current carrier are unchanged: Declined / Cancelled / Sent / none,
artifacts nulled. There is nothing to anchor an acceptance to without inventing an identifier.

Effect: the column fills on the accepted row of every version of every shipment that has an
accepted carrier today — ~600 shipments — plus the 81. **~30% of the corpus, always on an
Accepted row, no identifier invented.** The remaining ~70% have no accepted carrier, so `--` is
the true answer for them.

**Test changes for R2′** (in addition to the six below, which stay):
- The base `detail()` fixture's rank-1 row is Accepted with the three artifacts — assert over 100
  keys that **every** version holds **exactly one** Accepted row, it is that carrier's `scac`, its
  three artifacts `===` the seeded values, its `responseDateTime` equals the version's `routedAt`
  formatted, and **no** row in that version is `Sent`.
- A fixture with **no** Accepted current row: no version holds an Accepted row; artifacts null
  everywhere (the old behaviour, now scoped).
- The corpus guard keeps "0 artifacts under a non-Accepted status" and raises its floor:
  derived Accepted rows **> 500** (was > 0).
- Test 3's name changes again: *"holds an Accepted row only for the carrier that is accepted
  today, or from a real prior version — never invented for another carrier."*

**Measure and report (R2′):** over the full corpus, the number of shipments whose history shows
≥ 1 non-`--` Carrier Pickup # (expect ≈ 81 + the count of shipments with an Accepted current
option — **measured 602**: the 81 order-change shipments are a *subset*, their current carrier still Accepted per LINX-14514 Bypass, so 521 + 81), and the artifact-under-non-Accepted count (must stay **0**).

## Tests (`src/data/routingHistory.test.js`)

Fixture: extend the existing `detail()` builder with an `orderChange` variant carrying a
`priorTenderList` whose rank-1 row is `Accepted` with `carrierPickup: 'ABC12345'`,
`proNumber: 'PRO-1'`, `deliveryNum: 'DEL-1'`, and a `droppedCarriers.prior` of one row.

1. **R1 — the real prior is returned verbatim.** `derive(withOrderChange)` has length 1,
   `version === 1`, `options` deep-equals `priorTenderList` minus `quoteFlag`/`quoteAudit`,
   `droppedCarriers` deep-equals `droppedCarriers.prior`. The Accepted row is present **with**
   its three artifacts.
2. **R1 — no invented versions under it.** Same fixture across 50 keys: always exactly one.
3. **R2 — non-order-change shipments never hold Accepted** (the existing D7 test, now scoped:
   rename it to say *"…unless the seed carries the real prior version"*).
4. **R3 — no acceptance artifact survives a rewritten status.** Across 100 keys on the
   non-order-change fixture (whose current rank-1 row IS Accepted with `carrierPickup` set —
   add it to `option()`), every derived row has `carrierPickup`, `proNumber` and `deliveryNum`
   `=== null`. Prove it fails first: the current code keeps them.
5. **Corpus guard — the one that catches the class.** In `tools/generate.test.mjs` or a new
   app-level test reading `public/details/*.json` (follow whichever precedent the reviewer
   prefers — the app suite has none that read the corpus; the generator suite builds it): over
   every seeded detail, run the derive and assert **0** historical rows where any of the three
   artifacts is non-null while `status !== 'Accepted'`. Also assert the positive branch is
   reachable: **> 0** derived rows with `status === 'Accepted'` (only order-change shipments
   can produce them, so this doubles as the check that R1's path is live).
6. **Existing tests** — all hold except #3's rename. `pairs the response fields…` must still
   pass on the perturbed path; add the order-change fixture to it and assert the real rows pass
   through untouched (an Accepted row with its seeded `responseDateTime`, for instance).

## Measure and report

Before/after, over `public/details/*.json`:
- how many shipments carry `orderChange` and therefore take R1;
- how many of their prior lists hold an Accepted row (the count of shipments whose history now
  legitimately shows a Carrier Pickup #);
- the R3 number: historical rows with an artifact under a non-Accepted status — must go
  **543 → 0** on the same 600-file sample, or the equivalent over the full corpus.

## Do not touch

- `tools/generate.mjs` — no seed change, no reseed. The prior lists are already there.
- `RoutingHistoryTab.jsx` — `Carrier Pickup #` **stays** in Additional Info. It is live now.
- `tenderColumns.js`, anything under `api/`.
- DEC-170's order-prefix rule, `anchorInstant`, the PRNG.

## Open beside this (not in scope)

- **Q-RH-10** — what populates Carrier Pickup # / Pro # / delivery #, and does a re-tender void
  them on the live row. For Jana. Nothing here depends on the answer.
- **Q-RH-11** — LINX-15899 is not in the vault. Pull it; it may widen R2 later with a
  documented planner-intervention route.
- Whether order-change shipments should carry deeper invented history under their real V1
  (R1 says no). Revisit only if a reviewer asks for it.
