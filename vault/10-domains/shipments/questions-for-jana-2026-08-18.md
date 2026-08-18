---
domain: shipments
type: questions
tags: [dropped-carrier, tender, linx-13953, linx-13954, linx-13397, routing]
date: 2026-08-18
status: open
---

# Questions for Jana — 2026-08-18

Carried from S125. One ruling landed this session and is **already implemented**;
everything below it is still open.

## ✅ Settled 2026-08-18 — recorded here so it is not re-asked

> **"Route Rank can be empty but Rank will not be empty."**

Resolves **OQ-13**. The two are not symmetric: Route Rank is routing's ordering of
the carriers it could actually rank, so a dropped carrier may never have entered
it; Rank is the row's own position and always exists. Matches the sample payload,
where `route-rank` is absent on all eleven `<d-option>` rows.

Implemented: the seed leaves Route Rank empty on ~18% of dropped carriers, and the
`routeRank ?? rank` fallback is now known-wrong (see Q1).

---

## Q1 — Confirm we should stop substituting Rank for Route Rank

`mapRoutingOption` has carried `routeRank: o.routeRank ?? o.rank` since 2026-06-06.
It was written before we had the routing payload, when the two looked
interchangeable. Under the ruling above it is **backwards**: it fills the field
that is legitimately empty with the field that never is, so the UI shows a row's
list position as though routing had ranked it.

**Ask:** confirm a tender row with no route rank should display `--`, and that no
consumer downstream depends on Route Rank always being populated.

*Why we're asking rather than just deleting it:* the line touches **every** routing
option in the tender list, not only processed ones.

## Q2 — Does routing send RPC-ID for a dropped carrier?

Same shape as the Route Rank question, and still unanswered. `<d-option>` carries
five attributes (`seq`, `service`, `carrier`, `drop-code`, `drop-reason`) — no
`rpc-id`.

This matters more than it looks: **RPC-ID is the lookup key for three of 13953's
own fields** — Start Date, Stop Date and Route Group all come from
`mf_route_preferred_carrier where rpc_id = :rpc_id` (13397 §7/§8). No key, nothing
to look up with.

And **13954's insertion rule depends on it**: *"If adding from the dropped carrier
list → use the route rank from the dropped carrier list. Use the RPC-ID from the
dropped carrier list."*

**Ask:** is RPC-ID genuinely absent for dropped carriers, or does routing simply not
echo it on `<d-option>`? If absent, three fields in 13953 are permanently `--` and
that half of 13954's rule is dead text.

## Q3 — The reason-description table (still the ticket's own red flag)

13953 flags *"Reason description (require code from Dave)"* in red, and it is the
only red flag surviving in the current AC. Routing sends the short label only
(`drop-reason="Missing Transit Time"`); the long description is a TMS lookup on
`drop-code`.

**Our descriptions are invented.** They read plausibly and should not be demoed as
real.

**Ask:** can we get the `drop-code` → description table from Dave, and is the full
drop-code list larger than the three we have seen (`1` No Rates, `2` Prohibited
Carrier, `23` Missing Transit Time)?

## Q4 — Why is LINX-13953 flagged as an Impediment?

Jana set **Flagged: Impediment** on 13953 on 2026-08-17 at 19:29, with no comment
explaining it, then moved both stories to Final Review and assigned Steve O'Hara.

**Ask:** what is the impediment? If it is Q3 (Dave's table) we already track it; if
it is something else we are not accounting for it.

## Q5 — "No Rates" carriers land with an empty cost and no prompt

Built per the AC, flagged for review since S122 and now visible on screen.

Under 13954 the rating call runs **only on the routing-failure branch**. A "No
Rates" carrier (drop-code 1) routes cleanly, so it takes the success path, is
copied to the Tender List, and **never gets rated** — landing with an empty cost
and no prompt to obtain a quote.

That is the exact *"you should not leave it empty"* outcome Jana described designing
against, produced by following the ticket literally.

**Ask:** should a cleanly-routed carrier that has no rate still surface the *"No rate
is available for the carrier. You may obtain and enter a quote if needed."* dialog?

## Q6 — Audit logging has no home

13954 requires User / Date/Time / Shipment / SCAC / Routing Result / Rating Result /
Manual Pickup-Delivery values in **backend audit logs**. There is no table and no
endpoint for it, so it is specified and unbuilt (DC-16).

**Ask:** who owns this, and is it in scope for Valtris go-live or deferred?

---

## Not for Jana — presentation, ours to decide

Recorded so it is not accidentally escalated. Per the 2026-08-18 ruling, Jana rules
domain behaviour, not UI:

- Order Equipment / Indirect Point render as **check / circle-x icons**, not
  checkboxes. The AC's word is "Checkbox"; these are read-only routing output, and a
  checkbox advertises an affordance that does not exist.
- The dropped-carrier column split (8 key / 15 detail) is still provisional and has
  not been through Figma.
