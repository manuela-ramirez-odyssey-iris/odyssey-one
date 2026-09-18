# LINX-15895 — the Response fields, coupled to the tender outcome

Feeds the **Response Comments** section of the Routing History tab (S152). Five of that
tab's six sections are already 100% covered by the seed; this is the sixth — the one
section that is not a Tender sub-tab, and the one with no data behind it.

## What a "response" is

`LINX-5921` (Tender Process, the parent epic) splits the two directions:

* **Notify** — Odyssey → carrier. *"Tender messages must be sent to carriers using …
  API, email (system-generated web links for carrier acceptance), EDI and Manual."*
  Ours: `apiSource` ("Notify Method") + `notifyDateTime`.
* **Response** — carrier → Odyssey. *"History should include … Actions taken
  (user/system), Timestamps, **Carrier responses**"*, and *"UI must clearly show when
  **carrier actions or system updates (user actions as well)** modify tender outcomes."*

`responseMethod` is **not** the carrier's channel — it is the mechanism that recorded the
answer inside Odyssey. `generate.mjs:171`:

```js
const RESPONSE_METHODS = ['API Update', 'EDI Update', 'Manual Update', 'Automatic Update']
```

| Method | Who acted | Odyssey user? |
|---|---|---|
| `API Update` / `EDI Update` | the carrier's system, machine-to-machine | **no** |
| `Manual Update` | an Odyssey person keying in a phoned/emailed answer | **yes — ours** |
| `Automatic Update` | Odyssey itself (expiry, timeout) | **no** |

So **`Response User` is our user, not the carrier's, and exists only on `Manual Update`.**

And `Cancelled` is **our** action, not the carrier's — LINX-5921 lists Cancel among the
tender actions *"the user should be able to perform"* (Re-tender, Cancel, Decline,
Accept). A cancelled row therefore cannot have been written by the carrier's own API/EDI
feed.

## The defect — three independent gates describing one fact

`generate.mjs:1110-1118` gates `responseMethod`/`responseUser` on `wasTendered` but
`responseDateTime` on `isAccepted`. Measured over 9,880 seeded options:

```
status        n     respDate  respMethod  respUser
Accepted    602        602        602        602
Declined   2621          0       2621       2621   ← responded, no date
Cancelled  2589          0       2589       2589   ← responded, no date
Sent        312          0        312        312   ← hasn't responded, has both
(none)     3756          0          0          0
```

Plus, among the 6,124 tendered rows, `responseMethod` is evenly split four ways — so
**4,583 API/EDI/Automatic rows name a person for an update no person made.**

This is the S151 defect class (two independent draws describing one fact), and
`responseComments` does not exist in the seed at all — `src/data/routingHistory.js`
invents the text at read time, which S152 flagged as owing a generator field.

## The coupling to encode

| status | who | method | user | date | comments |
|---|---|---|---|---|---|
| `Sent` | nobody yet | — | — | — | — |
| `Accepted` | carrier | as drawn | only on `Manual Update` | yes | a third carry one |
| `Declined` | carrier | as drawn | only on `Manual Update` | yes | **yes — the reason** |
| `Cancelled` | **our planner** | `Manual` / `Automatic` only | only on `Manual Update` | yes | yes |

## Tasks

**T1 — `src/data/responseComments.js` (new).** The status-keyed comment pools, one small
plain-data module. Lives app-side and is imported by the generator, matching the existing
`generate.mjs:77` → `../src/components/orders/resolve/interfaceErrors.js` precedent (the
reverse direction would pull generator code into the app bundle).

**T2 — `generate.mjs`: a derivation block after the `option` const**, beside the
LINX-13894 quote block, which works the same way and says so. **Zero new faker calls:**

* the response date reuses `formatDateTime(genDate(baseDate, 0))` — both pure, no faker;
* `Cancelled`'s method remap and the comment pick are indexed by the already-drawn
  `lcePkId`;
* `responseUser` **keeps the roll and discards it** (S151's accessorials trick) when the
  method is not `Manual Update`.

So the faker stream does not shift: shipment ids, order numbers, SpotBid fixtures and the
golden ids in `generate.test.mjs` all stay put. This is the whole reason not to simply
re-gate `genDate`, which would renumber the corpus.

**T3 — `src/data/routingHistory.js`** reads the seeded `responseComments` instead of
inventing it, and applies the same method→user→date coupling to the *perturbed* status
(the derive rewrites a historical row's outcome, so it cannot just copy the seeded
values). Its local `RESPONSE_COMMENTS` constant is deleted in favour of T1's module.

**T4 — regenerate** the 2,200 JSONs and prove the stream did not move: every id, order
number, date, weight, carrier and status byte-identical to the previous corpus, with the
four response fields the only diff.

**T5 — tests.** The generator suite (the coupling is an invariant worth pinning: no
answered row without a date, no non-`Manual Update` row with a user, no `Sent` row with
either), plus the app suite for the derive change.

**T6 — Neon reseed** (~19 min). Authorized by the user, 2026-09-18. No schema change is
needed: live stores the option as a JSONB blob (`tenders.option`,
`api/_lib/shipments.mjs:225`), so a new field rides through with no column whitelist to
update — the bug class that has shipped five times does not apply here.

**T7 — decision log + canon**, and `routing-history.md` §5 gains the open question below.

## Flagged, not built

The real `ShippingOption` carries **both** `responseReason` (a code) and
`responseComments` (free text) — Saikat's code read, LINX-15895 comment 2026-09-15. We
seed only the text. Inventing a reason-code vocabulary is a question for Jana, not a
gap to fill silently.
