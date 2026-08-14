---
title: Shipment Trail (= History Screen)
domain: shipments
type: canon
tags: [history, shipment-trail, audit, actor-model, mvp, gap-analysis, pappu]
date: 2026-08-10
status: active
---

# Shipment Trail

## What this is

**"Shipment Trail" is the History screen.** Ruled by the user, 2026-08-10:

> "shipment trail is the same as history screen since the same information is shown and the
> concept of history is the shipment trail."

This is a **terminology** finding, not a new concept, screen, tab, or component. Our existing
History tab (`apps/odyssey-one/src/components/detail/HistoryTab.jsx`, see [[decisions/decision-log|DEC-70]])
**is** the Shipment Trail. Do not propose a new container for it. See DEC-77.

Pappu's email (`vault/00-inbox/pappu-shipment-trail-email-2026-08-10.md`) introduces the name
alongside a feature description:

> "we will be capturing the Shipment Trail within the History screen. As part of this feature, we
> plan to record: Each event that occurs during the shipment lifecycle · Event details · Event
> timestamp · The actor responsible for the action, whether it is a user, the system, or an
> integrated application (for example, Net Native)."

Four capture dimensions are named: **event, details, timestamp, actor.** We already capture all
four in `HistoryTab.jsx` / `HISTORY_ACTIONS` — the question this document answers is whether we
capture the *right* events, in the *right* shape, with the *right* actor model. See Gap analysis
below.

## Sources (triangulated, neither elevated over the other)

1. `vault/00-inbox/MVP - History Screen.md` — MarkItDown conversion of a 3-sheet spreadsheet from
   Pappu (dated 2026-08-06). Role: **event catalog, detail-message templates, MVP scope boundary.**
   Fully transcribed in [[data/history-event-catalog|history-event-catalog.md]].
2. `vault/00-inbox/pappu-shipment-trail-email-2026-08-10.md` — Pappu's email. Role: **actor
   taxonomy, feature naming, lifecycle-completeness claim.**

Per this project's provenance rule: everything below is either a verbatim source claim (cited), an
existing implemented decision (cited to decision-log), or an explicit inference (marked **INFERRED**).

## The actor model

**Our implemented model (DEC-70, from LINX-8091):** two-way split. Every history entry's `user`
field is either a real user name, or — for ~25% of entries — a system source string from
`HISTORY_SYSTEM_SOURCES = ['ERP', 'UI', 'Legacy TMS', 'Linx']`, rendered with a muted style + a
gray "System" badge.

**Pappu's model:** three-way — "a user, the system, or an integrated application (for example, Net
Native)."

**INFERRED reconciliation (not settled, see Open below):** an integrated application may already be
representable as a flavor of our `source` field (a 5th string alongside ERP/UI/Legacy TMS/Linx)
rather than as a structurally distinct third actor category. Under this reading, "integrated
application" is a *value*, not a new *branch* in the data model. This is a plausible fit, not a
confirmed one — Pappu's email doesn't say whether "integrated application" behaves differently in
the UI (e.g., a distinct badge/icon) or only differently in name. **`Net Native` does not currently
exist anywhere in `HISTORY_SYSTEM_SOURCES`** regardless of which reading is correct.

## The event-detail template model

Our generator (`tools/generate.mjs` ~line 1024) builds each entry's `details` as a **free-text
string assembled in a `switch` statement**, one case per action, with values interpolated inline
(e.g. `` `Tendered to ${tCarrier.name} at $${fmt(...)}` ``). There is no reusable template artifact —
the string and its data are produced together, once, per entry.

Pappu's spec instead defines, per event, a **template with named `<Placeholder>` tokens**, plus a
distinct template per **outcome variant** of that event (success/failure/branch). See
[[data/history-event-catalog|history-event-catalog.md]] for the full, lossless transcription.

**This is a schema difference, not a copy difference.** Implementing the spec's model means each
history entry becomes closer to `{ event, outcome, params }` with template resolution at render (or
generation) time — not a longer list of `switch` cases producing pre-baked strings. This document
does not decide to make that change; it records what the change would be.

## MVP scope boundary

Sheet3 of the spreadsheet excludes two topics from MVP, verbatim: **"User Action"** and **"Manual
tendering."** Both are described as "topics for which analysis is required and event should be
finalized" — i.e., acknowledged future work, not rejected ideas. See the tension this creates with
the actor taxonomy, below.

## Gap analysis

Comparing the MVP spec against what's implemented (`apps/odyssey-one/tools/generate.mjs`
`HISTORY_ACTIONS` ~line 979 / `HISTORY_SYSTEM_SOURCES` ~line 999 / detail-building `switch` ~line
1024; `HistoryTab.jsx`; [[decisions/decision-log|DEC-70]]; [[domain-analysis]] §9).

### Event overlap: exactly 2 of 16

Our 16 `HISTORY_ACTIONS`:

`Order Created`, `Shipment Created`, `Load Assigned`, `Tender Sent`, `Tender Accepted`,
`Tender Declined`, `Carrier Updated`, `Schedule Updated`, `Route Changed`, `Cost Updated`,
`Document Uploaded`, `Status Changed`, `PGI Completed`, `PGR Completed`, `PGI Error Corrected`,
`Quote Entered`.

The spec's 15 events (see [[data/history-event-catalog|catalog]] for full detail): `Shipment
Created`, `Routing Completed`, `Optimization Evaluation`, `Consolidation Completed`, `Routing &
Rating Completed`, `Ready for Tender`, `Auto Tender Validation`, `Tender Sent`, `Tender Response
Received`, `Shipment Planning Completed`, `Planned Shipment Sent`, `PGI Response Received`, `Post
PGI Rating Completed`, `Shipment Update Notification`, `Shipment Updated`.

**Verified by exact-name comparison: only `Shipment Created` and `Tender Sent` appear in both
lists.** Everything else is either unique to us or unique to the spec.

### The divergence is systematic, not incidental

- **Ours is user-centric** — most of our non-overlapping events describe something a *person*
  does: `Carrier Updated`, `Schedule Updated`, `Route Changed`, `Cost Updated`, `Document
  Uploaded`, `Status Changed`.
- **The spec's is lifecycle/pipeline-centric** — its non-overlapping events describe the *system*
  progressing a shipment through stages: routing → optimization evaluation → consolidation →
  routing & rating → ready-for-tender → auto tender validation → PGI → shipment update
  notification.

These read as two different lenses on the same shipment, not two versions of one list.
**INFERRED, not stated by either source:** the spec is closer to a backend/pipeline audit trail;
ours is closer to a user-facing activity log. Whether the Shipment Trail should be one merged list
or continue to serve a narrower purpose than the spec implies is an open product question (see
below).

### Structural difference: Tender Accepted/Declined vs Tender Response Received

Our `Tender Accepted` and `Tender Declined` are two independent top-level events. The spec models
one event, `Tender Response Received`, with **three outcome variants** (Declined / Accepted /
Timeout-declined) sharing one template shape. **This is a structural difference, not a naming
difference** — collapsing ours into the spec's shape means changing the event model
(event+outcome), not renaming two strings.

### MVP scope inversion

Sheet3 puts `User Action` and `Manual tendering` **out of MVP**. Meanwhile, [[decisions/decision-log|DEC-70]]
gives only ~25% of our entries a system `source` — roughly **75% of our entries are user-attributed
today**. If the spec's MVP boundary is read literally (user-action events are out of scope for now),
**we are inverted relative to the stated MVP scope**: most of what we generate is exactly the
category the spec defers.

### Details are free-text strings vs parameterized templates

Already covered above under "The event-detail template model" — restated here because it's a
top-3 gap: implementing the spec is a schema change (`event + outcome + params`), not a content
change.

### `Net Native` is absent

Named in the email as a concrete example of an integrated-application actor. It does not appear in
`HISTORY_SYSTEM_SOURCES` (`['ERP', 'UI', 'Legacy TMS', 'Linx']`) or anywhere else in the codebase
search performed for this analysis.

### LINX-13065 events not in the spec — a flagged tension, not an error

`PGI Error Corrected` and `Quote Entered` (added under [[decisions/decision-log|DEC-70]], sourced
from LINX-13065 — "Shipment View - Audit Log") do not appear in Pappu's spreadsheet. **Do not
assume our events are wrong** — LINX-13065 is a real, independently-sourced Jira requirement, and
Pappu's spreadsheet does not claim to supersede it (nor does it claim to be exhaustive against Jira
— see the open completeness question below). Flagged as a tension for Pappu/Ramesh to reconcile,
not resolved here.

## Settled by user ruling, 2026-08-10

Five of the seven questions this document originally opened were closed by the user the same day.
Recorded here because each one changes what gets built. See **DEC-80** for the governing ruling.

1. **The Trail is a RENDERER, not an author. — the governing constraint.**
   > *"Event refers to the system in the back has nothing to do with us, we just need to show data
   > in history tab."*
   Events are produced by the backend system. We neither define the vocabulary nor compose the
   detail strings — we display `event · details · timestamp · actor` as received. This retires the
   "is the vocabulary open or closed?" question as **not ours to answer**: an open vocabulary is
   fine, because a renderer does not need to know the set in advance. It also makes our current
   `HISTORY_ACTIONS` + `switch`-that-builds-`details` model wrong in kind, not merely wrong in
   content (see [[decisions/decision-log|DEC-80]]).
2. **Actor taxonomy — Reading B, effectively.** Because every event is a backend/system event, the
   actor for MVP is the **system** or an **integrated application** (e.g. `Net Native`). User
   attribution is not the MVP shape. This inverts DEC-70's ~75%-user-attributed seeded data.
3. **`Quote Entered` is DROPPED.**
   > *"we are not adding quote entered because seems this history is more to describe what's
   > happening in the system in the back, so pappu already gave you the specifics."*
   Pappu's catalog governs. Quote entry is a *user* action, and the Trail describes backend
   activity — so it is out by the same logic that puts `User Action` out of MVP. This closes the
   LINX-13065-vs-spreadsheet question in the spreadsheet's favour **for `Quote Entered`
   specifically**.
4. **Angle brackets are placeholder notation, not a typo.**
   > *"<brackets are to specify theres a value there>"*
   So `<$125.00>` in the Routing Completed example is *"a value goes here, e.g. $125.00"* — the
   example row simply kept the bracket. The earlier "typo" flag was WRONG and is withdrawn.
   Bracketed tokens are the parameter contract throughout
   [[data/history-event-catalog|the catalog]].
5. **PGI / PGR are out of project scope.**
   > *"PGI/PGR is not on this project scope so feel free to fill things that you need as you feel
   > (no design on PGI/PGR please)."*
   The catalog's PGI events stay in the data (a backend-driven trail would legitimately contain
   them), and seeded values may be filled at our discretion — but **no design work** on PGI/PGR
   surfaces. They render through the same generic row treatment as every other event, with no
   special-casing.

## Open / TBD

Genuinely still open.

1. **A visual pass over the original `.xlsx` is owed.** MarkItDown drops colour/strikethrough
   formatting; if the spreadsheet used either to signal scope or priority per-row, that signal is
   gone from this transcription (precedent: Session 108, PRD strikethrough flattened, presenting
   dead questions as live). Not yet done — needs the original file, which we do not hold in vault.
2. **Does "Event details" imply structured old-value/new-value pairs?** LINX-8091's tabular audit
   AC (the order-domain precedent DEC-70 partially reused) has Field/Old/New columns, and our
   `HistoryTab.jsx` carries optional `field`/`oldValue`/`newValue` on some entries rendered as a
   diff row. The spec's "Event details" is a single rendered string per template. Whether the diff
   row survives alongside it is unresolved — though note that under the renderer ruling above, this
   is really a question about **what the backend sends**, not about what we choose to build.
3. **`PGI Error Corrected`** — unlike `Quote Entered`, this was not explicitly ruled on. It is a
   backend/system event (so it survives the renderer logic) and LINX-13065 requires it, but it is
   also PGI, which is out of project scope. Kept in data, no design. Confirm with Pappu whether it
   belongs in the MVP catalog at all.
4. **Consolidation Completed's fixed 3-order-placeholder template** — behaviour for 2 or 4+ orders
   is unaddressed by the spec (see catalog). A renderer receiving a pre-composed string from the
   backend would not care; this only matters while WE compose seeded strings.
5. **`Optimization Evaluation → Hold` renders amber, and that is OUR call.** Under
   [[decisions/decision-log#DEC-87]] amber means "the step completed, but the business result is
   unfavourable or non-advancing" — a Hold stops the shipment advancing, so it reads as amber
   rather than the blue every other lifecycle step gets. Nothing in Pappu's catalog says how the
   two Optimization Evaluation branches should differ, or whether Hold is even an unhappy outcome
   in his model. Ask Pappu **together with #3** — both are "is this event's meaning what we assumed"
   questions, and both are cheap to reverse (one literal in `tools/generate.mjs`, then a reseed).

## Related

- [[data/history-event-catalog|History Event Catalog]] — the full lossless template transcription
- [[decisions/decision-log|Decision Log]] — DEC-70 (History tab rebuilt), DEC-77 through DEC-79 (this intake)
- [[domain-analysis]] §9 — "History — Two Distinct Types" (Shipment History vs Tender History; this
  document concerns Shipment History only — Tender History is untouched by this intake)
- Implementation: `apps/odyssey-one/src/components/detail/HistoryTab.jsx`,
  `apps/odyssey-one/tools/generate.mjs` (`HISTORY_ACTIONS`, `HISTORY_SYSTEM_SOURCES`),
  `apps/odyssey-one/src/styles/panes/history.css`
