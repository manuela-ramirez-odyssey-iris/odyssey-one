---
title: Routing History
domain: shipments
type: canon
tags: [routing-history, routing-version, tender, dropped-carrier, linx-15895]
date: 2026-09-18
status: active
---

# Routing History

Canon for the **Routing History** tab — every PRIOR routing version of a shipment, read-only,
newest first — and for the **routing version** as a domain noun, which is what the tab really
introduces.

**Built in the prototype (S152).** Rulings live in
[[decisions/decision-log|the Shipments decision log]] as **DEC-165 … DEC-172**. Where this
document says *ours*, it means the prototype invented a rule the tickets do not state; those
are the lines to groom.

## Sources

| Source | What it is | Weight |
|---|---|---|
| **LINX-15895** — Routing History (tab) | The story. Status `Final Review`, Phoenix Sprint 43, reporter Jana, assignee Steve O'Hara, flagged `Impediment` | the rules |
| **VD `2257:68313` / `2259:70116`** (Shipments — Odyssey One) | Manuela's own visual design, drawn at Jana's request (comment 2026-08-31) | the layout, expand/collapse and section organisation — the AC defers to it by name |
| **LINX-5921** — Tender Process (parent epic) | Generic tender-process AC; names a Tender History section but not routing versions | background |
| **LINX-13953 / LINX-13954** — Dropped Carrier display + Process SCAC | Settled specs; 15895 says the Dropped Carrier section here *"shall follow"* them | the rules, for that section |
| **Saikat Ghosh (Cognizant), 2026-09-15** — code read on the ticket | Backend reality: `ShipmentProcessServiceImpl.replaceShippingOptions` clears the previous run before writing the new one | the *why nothing can be read yet* |

Verbatim AC + the three referenced stories are **still in `vault/00-inbox/`** — `LINX-15895.doc/.md`
and `LINX15895 references/` (5921, 13953, 13954). The archive step to
`vault-sources/10-domains/shipments/sources/` has not been run; it needs the user's go.

---

## 1. Why this tab exists

It is the answer to a question **Soni Sinha** asked on LINX-13953 on **2026-08-24**:

> "Each order update triggers a shipment update and a routing call. How should usable and dropped
> carriers for each order update appear in the UI? Should they be grouped under a version number,
> and if so, what format should that version use?"

Jana's follow-up (2026-08-31) records the answer: *"Dave suggested to add new tab called 'Routing
History' to display previous Routing options and actions."*

So the tab is not a reporting nicety. It exists because **routing runs repeatedly over the life of
a shipment** — every order update triggers one — and until now each run silently destroyed the one
before it, in the UI and in the database alike.

## 2. What a routing version IS

> Every routing execution shall create a distinct routing version. — AC

A version is the **whole outcome of one routing execution**: the carriers routing returned, their
rankings, the tenders sent against them and the responses received, the volume-commitment state,
the dropped carriers with their reasons, and the orders that were on the shipment at the time.

| Rule | Source |
|---|---|
| The **current** active version stays on the **Tender** tab. Routing History shows only prior ones. | AC |
| Versions display newest-first (`V5, V4, V3, V2, V1`). | AC, with its own worked example |
| Each version is **read-only**, and is **never updated** when a later routing execution runs. | AC |
| Everything inside a version is the **snapshot at that execution** — options, rankings, responses, comments, commitment. | AC |
| Each version has its own **Dropped Carrier** section following 13953/13954. | AC |
| No dropped carriers ⇒ *"This routing version does not contain any dropped carriers."* (verbatim) | AC |

### The five sections, plus one

The AC lists five sections per version — **Routing Options · Response Comments · View Volume
Commitment · Additional Info · Others** — and then mandates a **Dropped Carrier** section
separately. The VD draws all six as siblings, which is how it is built.

Four of them are the Tender screen's own column groups, unchanged (DEC-170). The exception is
**Response Comments**: our Tender screen's second sub-tab is *Notify & Response Method* (Pro # ·
Transporting Carrier · Equip # · Route Group), a grouping inherited from the
`Shipments-Monitoring.pptx` slide split, and it has nothing to do with carrier responses. Here the
section carries SCAC · Carrier Name · Tender Status · Response Method · Response Date · Response
User · **Comments** (DEC-171, user ruling 2026-09-18).

> ⚠️ `responseComments` exists on the real `ShippingOption` and **does not exist in our seed**. The
> prototype derives the text. If the section survives grooming it is a generator field.

## 3. The data problem, stated plainly

There is **no stored routing version anywhere** — not in our seed, and not in the real system:

```java
private void replaceShippingOptions(Shipment shipment, List<ShippingOption> shippingOptions) {
    List<ShippingOption> persistentList = shipment.getShippingOptionList();
    persistentList.clear();          // ← destroys the previous routing run
    shippingOptions.forEach(...);
}
```

The story is written as a pure viewing story (*"I want to **view** historical routing versions"*),
which implies the data exists. It does not. Saikat's own escalation on the ticket — *"does the
backend storage already exist?"* — is unanswered, as are his questions about whether a **failed**
routing run produces a version at all and what the retention window is.

Two consequences:

1. **A backend story is missing.** 15895 as written cannot be delivered by a UI change; something
   has to snapshot the run before `replaceShippingOptions` clears it. LINX-16278 / LINX-16279 (both
   Closed) are the nearest candidates — *"BE: Design of version based Tender T…"* / *"BE: [DEVIN]
   Implement API to get dist…"* — and should be read before anyone re-raises this.
2. **The prototype derives the history at read time** rather than seeding a fiction (DEC-167). The
   tab is therefore a *plausible reconstruction for review*, not a read. `src/data/routingHistory.js`
   builds it from the shipment's own detail with a PRNG keyed on the identifier — the
   `auditTrail.js` precedent — so the same module serves mock and live and no reseed was needed.

### Our coherence rules (all provisional, all for Jana)

| Rule | Reasoning |
|---|---|
| A shipment that has **never been tendered** has **no** history. | The AC opens *"Given a shipment has multiple routing executions"*. One execution ⇒ the Tender tab owns it. |
| 1–4 prior versions, **+1** when a tender died (Declined/Cancelled). | A dead tender is what sends a planner back through routing. |
| A historical version **never** holds an Accepted tender. | An accepted tender ends the routing story; that shipment would not have been re-routed. |
| Response method/user/comment **follow** the outcome; an unanswered tender has none. | The defect class S151 found in the monitoring tabs: two independent draws describing one fact. |
| A version's orders are a **prefix** of today's, growing with the version. | The AC's own example: `V1 - O1, O2` / `V2 - O1, O2, O3`. |

### What a "response" is (DEC-173)

LINX-5921, the parent epic, splits the two directions, and the distinction is what makes the
**Response Comments** section readable:

* **Notify** — Odyssey → carrier. *"Tender messages must be sent to carriers using … API, email
  (system-generated web links for carrier acceptance), EDI and Manual."* Ours: `apiSource`
  ("Notify Method") and `notifyDateTime`.
* **Response** — carrier → Odyssey. *"UI must clearly show when **carrier actions or system updates
  (user actions as well)** modify tender outcomes."*

`responseMethod` is **not** the carrier's channel — it names the mechanism that RECORDED the answer
inside Odyssey:

| Method | Who acted | Odyssey user? |
|---|---|---|
| `API Update` / `EDI Update` | the carrier's system, machine-to-machine | **no** |
| `Manual Update` | an Odyssey person keying in a phoned/emailed answer | **yes — ours** |
| `Automatic Update` | Odyssey itself (expiry, timeout) | **no** |

So **`Response User` is our user, not the carrier's.** And `Cancelled` is **our** action — 5921
lists Cancel among the actions *"the user should be able to perform"* (Re-tender, Cancel, Decline,
Accept) — so a cancelled row can never have been written by the carrier's own feed.

This is now seeded rather than invented at read time (DEC-174): `responseComments` is a real
generator field, and all four response fields are derived from the outcome as one fact. The measured
defect it replaced — 5,210 answered rows with no date, 312 `Sent` rows with a responder, 4,583
machine updates naming a person — is in DEC-174.

## 4. Layout (VD)

Collapsed `2257:68313` · expanded `2259:70116`.

One card per version. Its header carries the version title, a **Most recent historical** badge on
the newest one only, the run timestamp, a **Read-only** marker at the trailing edge, and the
version's orders as chips. Opening it reveals *Routing details* — *"Historical information captured
for this routing version"* — over the six sections, each itself collapsed, so a reviewer opens one
version and one section at a time (the AC's *"expand and review each routing version
independently"*).

Two deviations from the drawn mock, both ruled by the user on 2026-09-18:

* The leading `›` beside the timestamp is **dropped** — it is static in both frames, a leftover of
  detaching the SubAccordion master rather than a second affordance.
* The timestamp reads **`MM/DD/YYYY HH:MM UTC`**, matching the History tab (the sibling surface one
  click away), not the mock's `Sep 14, 2026 · 3:20 PM`.

The version card is a **detached** SubAccordion in Figma, because the molecule cannot draw that
header. It is built through the existing `title` slot; the molecule is recorded as **owing a real
header prop** (DEC-172).

## 5. Open questions

| # | Question | Who |
|---|---|---|
| Q-RH-1 | Does the backend snapshot a routing version yet, and if not, which story owns it? LINX-16278/16279 are Closed and may already answer this. | Venkata / Saikat |
| Q-RH-2 | Does a **failed** routing run (no usable carriers, QCP error) produce a version? Today those paths never touch `ShippingOption` at all. | Jana / Dave |
| Q-RH-3 | Are *associated orders* the orders **at routing time** or the shipment's current orders? We assume at-routing-time — the AC's example only makes sense that way. | Jana |
| Q-RH-4 | May a planner **Process SCAC / reinstate** a dropped carrier from a version that is no longer current? 13954 poses exactly this and does not answer it; we built read-only. | Jana / Dave |
| Q-RH-5 | Retention — all versions forever, or a rolling window? | Jana |
| Q-RH-6 | Is *Response Comments* really a distinct section, or the Tender tab's *Notify & Response Method* under a different name? We built it as distinct, and DEC-173 shows the two carry genuinely different facts (notify = outbound, response = inbound). | Jana |
| Q-RH-8 | The real `ShippingOption` carries **both** `responseReason` (a code) and `responseComments` (free text). We seed only the text — is there a reason-code vocabulary, and does the section show it as its own column? | Jana / Saikat |
| Q-RH-9 | Does an `Automatic Update` (expiry/timeout) really leave no user, or does the system write a service account the UI should show? | Jana |
| Q-RH-7 | Does the **current** version get a number the user can see (the Tender tab shows none), and what format? Soni's original question asked for the format and never got an answer. | Jana |

## See also

- [[dropped-carrier|Dropped Carrier]] — the section each version embeds, and the ticket this one grew out of
- [[decisions/decision-log|Shipments Decision Log]] — DEC-165 … DEC-172
- [[domain-analysis|Shipments Domain Analysis]] — §3 for the Tender screen's column groups
