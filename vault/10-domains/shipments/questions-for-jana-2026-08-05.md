---
title: Questions for Jana — multi-leg linkage + Odyssey default filters
domain: shipments
type: question-set
tags: [shipments, questions, jana, shipment-type, saved-filters]
status: open
date: 2026-08-05
---

# Questions for Jana — 2026-08-05

Two unrelated asks, both blocking work that is otherwise ready. Drafted to be sent
as-is; each states what we already believe so Jana only has to confirm or correct.

---

## 1. The multi-leg linkage triplet — what does a chain actually look like?

**Why we're asking:** we want to seed `Shipment Type`, `Shipment Sequence Leg` and
`Next Shipment ID` with realistic data. We believe these three are **one feature**,
not three independent columns — the CSV's own note on Next Shipment ID reads
*"used for pooling or Rule 11"*, which means the three have to **agree with each
other**. Filling them independently would produce Next Shipment IDs pointing at
shipments that aren't the next leg of anything, which is worse than leaving them
empty. So we've deliberately carved this out of the current data motion rather
than fake it.

**Source of our understanding:** `attributes-progression-grouping.csv` rows 52–54
(binned by the stakeholder exercise as "Others / Advanced / Rare Fields") and
`shipments-exceptions.pptx` ("Shipment Type: Pooling, Cross customer, Line haul,
Rule 11"; "Next Shipment ID: ID of the next shipment — applicable for pooling,
Rule 11").

**What we need:**

1. **Does a chain have a fixed length**, or does it vary by type? Is a Rule 11
   move always exactly 2 legs, and can pooling run to 3+?
2. **Does every leg carry the same `Shipment Type`**, or does the type describe
   the *relationship* rather than the shipment (i.e. can leg 1 be "Line haul" and
   leg 2 something else)?
3. **Is `Next Shipment ID` set on the last leg?** We assume it's null/empty there
   — please confirm, since that's the terminator for the whole chain.
4. **Is `Shipment Sequence Leg` 1-based** and always dense (1, 2, 3 with no gaps)?
5. **Cross customer** — is that a chain type at all, or a flag about whose freight
   is on the truck? It's the one value in the list that doesn't read like a
   multi-leg concept to us.

**⚠ Name collision worth flagging to Jana explicitly.** There appear to be **two
different fields both called "Shipment Type"**:

- **This one** — Pooling / Cross customer / Line haul / Rule 11, from our CSV.
- **LINX-11597** (Story 7/7, in QA Testing) — `Direct` (one order) vs
  `Consolidation` (more than one order).

Our read is that these are genuinely different concepts sharing a name, not two
descriptions of one field. **Which one owns the label "Shipment Type" in the UI,
and what should the other be called?** Shipping both under one name will confuse
users and us.

---

## 2. Odyssey default filters — ratify or replace (blocking a demo)

**Why we're asking:** Saved Filters now ships with two groups — **Custom Filters**
(what a user saves) and **Odyssey Filters** (defaults we ship, which nobody can
edit or delete). **No canon defines what those shipped defaults should be**, so we
invented two placeholders to have something real to build against:

| Default | Filter |
|---|---|
| **TL Shipments** | Mode = TL |
| **Pending Tenders** | Tender Status = Sent |

We picked these two only because both attributes are genuinely searchable today —
a default built on an attribute the search doesn't project would silently return
zero results and look broken. (We dropped a proposed third, **Hazmat**, for exactly
that reason: it isn't in the search vocabulary at all.)

**What we need:** what would a planner actually want pinned there on day one? These
are the filters every user sees before they've saved anything of their own, so
they set the tone for the whole feature. Replacing ours is expected, not a problem —
they're placeholders, and they're marked as invented in our decision log (GS-27).

**Constraint to mention if Jana proposes something:** the filter must be built from
attributes the search projects. If a proposed default needs an attribute we don't
project today, that's useful to know — it becomes a separate request rather than a
blocked default.

---

## Related

- Decision log: [[../../20-cross-cutting/global-search/decisions/decision-log|GS-24…GS-27]]
- Data motion plan: `docs/superpowers/plans/2026-08-04-combined-db-motion.md`
  (§"NOT in this motion" carves out the linkage triplet pending answer 1)
