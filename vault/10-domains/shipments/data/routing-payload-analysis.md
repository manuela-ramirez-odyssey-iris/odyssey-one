---
title: Routing Response Payload — field analysis
domain: shipments
type: data
tags: [routing, dropped-carrier, tender, payload, schema]
date: 2026-08-17
status: active
---

# Routing Response Payload — what routing actually returns

Analysis of the sample Jana shared on the 2026-08-11 call, relayed 2026-08-17.
Raw: `vault-sources/10-domains/shipments/sources/routing-response-sample-S260000025.xml`.

This is the artefact [[dropped-carrier#OQ-12|OQ-12]] was chasing. It answers three open
questions outright and **raises one that outranks everything else in the topic**.

⚠️ **One sample, one shipment, one mode (LTL), 18 options.** Structural facts below are safe;
frequency claims are not. Where a conclusion depends on this being representative, it says so.

---

## The headline: `<d-option>` carries five attributes, `<option>` carries eighteen

```xml
<option   seq="1" service="LTL" carrier="TAXA" cost="69.6" curr="USD" transit="1" t-unit="DY"
          t-source="SMC" distance="31" d-unit="MI" d-source="PCMPCL*" source="TMS"
          route-rank="9" network-leveraged="N" indirect-point="N" customer-preference="N"
          break-point="0.0" rpc-id="4457785"/>

<d-option seq="8" service="LTL" carrier="RLCA" drop-code="2" drop-reason="Prohibited Carrier"/>
```

A dropped carrier returns **`seq`, `service`, `carrier`, `drop-code`, `drop-reason`** and
nothing else. The asymmetry is deliberate, not an omission in one row — all eleven `d-option`
elements have exactly these five.

LINX-13953 specifies **23 fields**. This payload supplies **three** of them directly.

### Field-by-field against LINX-13953

| 13953 field | In `<d-option>`? | Obtainable? |
|---|---|---|
| SCAC | ✅ `carrier` | yes |
| Equipment Type | ✅ `service="LTL"` | yes — *assuming `service` means equipment, see below* |
| Reason | ✅ `drop-reason` | yes |
| Carrier Name | ❌ | ✅ lookup by SCAC — 13397 §2 |
| Reason description | ❌ | ✅ **lookup by `drop-code`** — see below |
| Order equipment | ❌ | ✅ derived (order's SCAC + equipment) |
| Indirect Point | ❌ (present on `<option>`, absent on `<d-option>`) | ✅ AC's fallback is *unchecked*, so absence is a legal answer |
| **Route Rank** | ❌ (present on `<option>` as `route-rank`) | ❓ **no source** |
| **RPC-ID** | ❌ (present on `<option>` as `rpc-id`) | ❓ **no source** |
| **Start Date** | ❌ | ❌ **blocked** — 13397 §7 keys on RPC-ID, which isn't returned |
| **Stop Date** | ❌ | ❌ **blocked** — same |
| **Route Group** | ❌ | ❌ **blocked** — 13397 §8 keys on RPC-ID, same |
| Transit Time | ❌ (`transit`+`t-unit` on `<option>`) | ❓ no source |
| Transit Source | ❌ (`t-source` on `<option>`) | ❓ no source |
| TT ID | ❌ (absent on **both**) | ❓ not in this payload at all |
| Pickup / Delivery Date/Time | ❌ (absent on **both**) | ❓ not in this payload at all |
| Commitment, UoM, Accepted, Open, Comment, CVC ID | ❌ (absent on **both**) | via `get_cvc_id` → 13397 §10/§11 |

**Read the "absent on both" rows carefully.** Pickup/delivery dates, TT ID and the whole
commitment block are missing for *usable* carriers too — so this payload is not evidence that
dropped carriers specifically lack them. Most likely this response is the pre-date-calculation
shipping-option list; Jana describes date calculation as something routing does when a carrier
is processed (*"it is trying to calculate the date for the carrier"*). Those fields need a
different question.

**The rows that ARE dropped-carrier-specific** are the ones present on `<option>` and absent on
`<d-option>`: `route-rank`, `rpc-id`, `transit`, `t-source`, `distance`, `d-source`, `cost`,
`indirect-point`, `network-leveraged`, `customer-preference`, `break-point`, `source`,
`terminal`. That set is the real finding.

### The consequence that needs a ruling

**RPC-ID is not returned for dropped carriers, and RPC-ID is the lookup key for three of
13953's own fields.** 13397 §7 and §8 both read
`from mf_route_preferred_carrier where rpc_id = :rpc_id` — that is the only specified route to
Start Date, Stop Date and Route Group. Without the key there is nothing to look up with.

**Route Rank has the same problem and it is worse**, because LINX-13954's insertion rule depends
on it: *"If adding from the dropped carrier list → Use the route rank from the dropped carrier
list. Use the RPC-ID from the dropped carrier list."* Per this payload there is no route rank
and no RPC-ID on the dropped carrier list to use. The rule describes carrying over two values
that are not there.

So either this sample predates a schema change, or **13953 and 13954 both ask for data routing
does not return**. → [[dropped-carrier#OQ-13|OQ-13]], now the top question for Jana.

---

## Answers this payload gives

### OQ-2 — Reason description: `drop-code` is the key

Routing returns **both** a numeric code and its short text:

| `drop-code` | `drop-reason` | Count in sample |
|---|---|---|
| 1 | No Rates | 4 |
| 2 | Prohibited Carrier | 1 |
| 23 | Missing Transit Time | 6 |

So **Reason is returned directly** (no lookup needed), and 13953's *"Lookup in the Master
table"* for the long description is a lookup **by `drop-code`**. The codes are sparse (1, 2, 23),
which means the real catalog is much larger than three — 23 alone implies at least that many.

Still outstanding: the master table itself, which is Dave's *"require code from Dave"* red flag.
This narrows it from "we have no idea" to "we need one lookup, keyed on an integer we already
receive."

**Our invented catalog was mostly wrong** and must be replaced — see the corrections section.

### OQ-3 — CVC ID is NOT returned by routing

There is no `cvc-id` attribute anywhere in the payload, on either element type. 13953's field
note (*"Carrier Volume Commitment identifier returned by Routing for each carrier"*) is
**contradicted**. The source is 13397 §10, `mf$carrier_vol_commitment.get_cvc_id(...)`, as the
function's existence always implied.

### OQ-4 — UoM is not returned by routing either

No commitment data of any kind in the payload. So of the AC's two contradictory statements,
*"returned as part of commitment"* is the correct one: UoM comes from 13397 §11
(`cvc_cd_flag_weight_based` / `cvc_uom_wgt`), not from routing.

### OQ-5 — Transit Source and Distance Source are different fields, and both exist

The payload carries both, distinctly:

- `t-source="SMC"` — transit source
- `d-source="PCMPCL*"` — distance source

`PCMPCL*` matches the format of 13397 §4's own example (`PCMP*` → *"PC*Miler Practical"*), so
**§4's lookup belongs to `d-source`, not to 13953's Transit Source.** 13953 asks for *Transit
Source*, which is `t-source` = `SMC`, displayed raw with no lookup.

Answered: §4 does not apply to the Dropped Carrier section.

---

## Other things worth knowing

**`seq` is one continuous sequence across both lists** — usable 1–7, dropped 8–18. Routing
evaluates one set of carriers and partitions it; the dropped list is the tail of the same
enumeration, not a separate result. Supports Jana's *"10 evaluated / 4 qualified / 6 dropped"*
framing exactly.

**Dropped can outnumber usable — here 11 vs 7.** Efrain's *"there are so many carriers on this
second list"* was right, and Jana's answer (*"it is going to be based on routing"*) is confirmed.
Any seeded fixture capping dropped carriers below the tender-list size is unrealistic.

**`route-rank` is not a position.** Values on the 7 usable options are 9, 16, 10, 2, 7, 1, 3 —
sparse, unordered, and one (16) exceeds the total option count. This is hard confirmation of
[[decisions/dropped-carrier-decisions#DC-05|DC-05]]: `seq`/Rank is position in the list,
`route-rank` is routing's own ranking from a wider set. They are unrelated numbers.

**`terminal` exists and we have no field for it** — `"CHICAGO - ARCH"` (DAFG), `"LANXESS NO
TEND"` (SAIA). Present on 2 of 7 usable options, absent on all dropped. Not in 13953, not in our
VM. Unknown whether it matters.

**`service="LTL"` is ambiguous.** Our VM has both `equipment` and `sl` (service level). 13953
calls the field *Equipment Type* with example `LTL`, so `service` → equipment is the natural
read, but every option in this sample is LTL, so the sample cannot distinguish the two. Low
risk, worth one question.

**`source="TMS"`** on usable options maps to our existing `api` / `apiSource` field.

**SAIA appears as a usable carrier here** — a reminder of the standing inconsistency where our
own data calls it `SAIA INC` in `generate.mjs` and `SAIA LTL FREIGHT` in `master-data.js`.

**Real SCACs from this payload**, worth using in seeded data over invented ones:
`TAXA ABFL WARD DAFG SAIA CNWY DLDS` (usable) · `RLCA DIVI PYLE SEFL BBRR MSUR BBFG CIEW JKRS
MTDO PENS` (dropped).

---

## Corrections this forces

1. **The invented drop-reason catalog is wrong** and must be replaced with the real shape:
   `{ code: 1, reason: 'No Rates' }`, `{ code: 2, reason: 'Prohibited Carrier' }`,
   `{ code: 23, reason: 'Missing Transit Time' }`. Of our six invented reasons only *Missing
   Transit Time* was real; *No Rate Found* was close to *No Rates*; **Prohibited Carrier** we
   never guessed, and it is a materially different kind of reason — a policy exclusion, not a
   data gap. The long descriptions remain unknown (Dave).
2. **The generator must model the sparseness.** Emitting rich values for route rank, RPC-ID,
   transit, dates and commitment on dropped carriers would make the prototype look finished
   while the real screen renders `--` in most columns. That inverts the point of seeded data.
3. **The column layout should be re-thought against reality.** An 8-column key row where 4 are
   permanently `--` is not a good table. This is a design question, not a data one.

---

## Related

- [[../dropped-carrier|Dropped Carrier canon]] — OQ-2/3/4/5 now answered above; OQ-13 raised
- [[../decisions/dropped-carrier-decisions|DC- rulings]]
- 13397's lookups: `vault-sources/10-domains/shipments/sources/linx-dropped-carrier-ac-2026-08-17.md`
