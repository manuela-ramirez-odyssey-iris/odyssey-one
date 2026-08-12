---
title: Questions for Jana — Shipment Details section editing
domain: shipments
type: question-set
tags: [shipments, questions, jana, shipment-details, references, editing]
status: open
date: 2026-08-11
---

# Questions for Jana — 2026-08-11

Three asks arising from building section-level editing in the Shipment Details modal
([[decisions/decision-log|DEC-82…DEC-86]]). None of them blocks the work — it shipped
under a stated assumption in each case — but each assumption is ours, not his, and
one of them is user-visible today.

---

## 1. The reference type vocabulary doesn't cover what we already display

**The problem, concretely.** The modal renders six reference values per order:
Sales Order Number, Delivery Number, PO Number, **Pro/Booking Number**, Pickup Number,
**Confirmation Number**.

The picker we reuse for editing them — the same References block as order creation —
offers seven types: Pickup Number, PO Number, BOL Number, Delivery Number,
Sales Order Number, Seal Number, Shipment Number.

The two lists disagree in both directions. **Pro/Booking Number and Confirmation Number
are displayed but not selectable**, so once a user clears one of those rows they cannot
put it back. BOL / Seal / Shipment Number are selectable but never seeded.

**What we did:** nothing — both lists are left exactly as they are, and the gap is
recorded rather than papered over. Silently dropping the two undisplayable types would
have hidden data; silently adding them to the picker would have invented vocabulary.

**What we need:** are Pro/Booking Number and Confirmation Number *references* the user
should be able to add, or are they order-sourced values that merely render in the same
block? If the former, they belong in the shared type list. If the latter, they should
probably not be editable rows at all.

---

## 2. Does a shipment-stage override survive a routing refresh?

**Why we're asking:** Gross Weight, Volume and Mode can now be edited on the shipment
without touching the underlying order. Gross Weight in particular is normally *derived*
— it's the sum of the orders' weights.

So there are two values with a claim to the same cell, and we had to pick a precedence.

**What we assumed:** the user's override **wins indefinitely**. Once someone types a
Gross Weight, that is what the modal and the grid show, even if the orders beneath it
change and the derived total moves.

**Why it might be wrong:** if a planner corrects a weight to unblock something, and
then the real weight arrives from the orders, our rule keeps showing the stale manual
value with no indication it is overriding anything. The alternative — a refresh clears
the override — loses deliberate corrections instead.

**What we need:** which way should it fall, and should an overridden field *look*
different from a derived one?

---

## 3. Who is allowed to edit these fields?

**What we did:** no permission model at all. Any user who can open the Shipment Details
modal can edit General Information and the reference values, and (once the quote
navigation lands) the cost quote too.

**Why we're flagging it rather than guessing:** every other editable surface we've built
has been equally open, so this is consistent — but Mode and Gross Weight feed downstream
rating and planning, and a shipment-stage PO Number is the kind of field that tends to
carry audit expectations.

**What we need:** is edit access role-gated in the real system, and is there an audit
expectation on these specific fields beyond the created/updated stamps the Tender
quote already keeps?

---

## Related

- Decision log: [[decisions/decision-log|DEC-82…DEC-86]]
- Implementation plan: `docs/superpowers/plans/2026-08-11-shipment-details-edit-mode.md`
- Prior modal canon: [[shipment-details-modal-spec-2026-07-30]]
