---
title: GlobalSearch — Map of Content
domain: cross-cutting
type: info
tags: [moc, global-search, search, filtering, normalization]
status: active
date: 2026-05-28
---

# GlobalSearch — Map of Content

Cross-domain search mechanism. The existing `GlobalSearch` component in `@odyssey/ui` (today: the navbar input) is being expanded into the canonical search surface for the application — guiding user intent through a progression of question types (Find → Who → Where → When → How → Status → Cargo → Financial → Load → Edges) toward the right shipment / order / load / carrier / etc. Each product domain provides its own attribute schema; the mechanics (chip suggestions, drawer filters, saved filters, structured query model) are shared.

## Origins

The component lives in `packages/ui/src/GlobalSearch.jsx` today as the navbar input chrome (back/forward nav, scope pill, input, clear). Its scope dropdown was scrapped 2026-05-12 and it currently doesn't drive any actual search. The new design turns it into the real, intent-driven, cross-domain search.

**Design source vs. deployment target — the two are intentionally different.**

- **Design source = Tracking-demo.** Efrain's May 2026 screenshots (Scenarios 1–7) use the Tracking-domain UI as the design canvas. The look, the empty state, the navbar chrome, the result-card style — that's the canvas.
- **v1 deployment target = Shipments.** The Tracking *domain* does not exist in the codebase yet. Shipments does — and Shipments already encodes the intent-progression model via the [[../../10-domains/shipments/data/attributes-progression-grouping|attributes CSV]] and has the prior-art table search (`TableControls` + `SearchChipPanel` + `FilterPanel`) that GlobalSearch is replacing. v1 ships the new design *into* Shipments.
- **Tracking domain = future.** When the Tracking domain is built, GlobalSearch will already exist as the canonical surface; Tracking will consume it, providing its own attribute schema.

**Shipments adaptation is "a bit more complex" than the Tracking design.** Same UI/UX, more data shape:

- **~55 attributes** (vs. Tracking's ~15 visible in the demo) — see [[../../10-domains/shipments/data/attributes-progression-grouping|CSV]]
- **Three panel types** (Exceptions / Monitoring / PGI) — vs. Tracking's single panel
- **Entity hierarchy** — Order → Load → Shipment (multi-stop, pooling, Rule 11)
- **Shipments-unique attributes** — Shipment Type, Shipment Sequence Leg, Next Shipment ID (see [[decisions/decision-log#GS-11]])

This is the *final* framing. The canon was previously corrected once from "Shipments-first" to "Tracking-first"; we now correct definitively to **Tracking-as-design-canvas / Shipments-as-v1-target** and stop oscillating.

## Status

In active design + early implementation. Component foundation exists; canon and decisions captured from the Tracking-demo screenshots and transcript; v1 build will land in the Shipments domain.

## Canon

- [[global-search|GlobalSearch — Canon]] — anatomy, states, progression model, behavior, structured saved-filter model
- [[decisions/decision-log|Decision Log]] — additive vs exclusive chips, saved-filter storage, scope semantics, etc.
- [[data/attribute-schema|Attribute Schema Contract]] — what each domain must provide for GlobalSearch to render against its data

## Per-domain integrations

Each consuming domain documents its own attribute schema + caveats inside the domain folder, not here. Cross-cutting canon owns mechanics; domain folders own data and exceptions.

- **Shipments** — [[../../10-domains/shipments/data/attributes-progression-grouping|attributes CSV]] is the schema today. Caveats currently in [[../../10-domains/shipments/domain-analysis|domain-analysis §11]]. This is the **v1 target**, so any new contract requirement gets validated here first.
- **Tracking** — pending the Tracking domain itself.
- **Orders / Carriers / Home / Users** — pending those domains.

## Reference implementation (pre-expansion)

The expansion starts from the existing `GlobalSearch` UI shell:

- `packages/ui/src/GlobalSearch.jsx` — **foundation.** Navbar input chrome. Stays; gets expanded.
- `packages/ui/src/GlobalSearch.figma.tsx` — Code Connect mapping (3 variants today). Stays; gets extended.

The currently-existing Shipments table-search trio is the **prior art being replaced**. When GlobalSearch v1 ships into Shipments, these three components are absorbed/removed:

- `apps/odyssey-one/src/components/shipments/TableControls.jsx` — gray table searchbar
- `apps/odyssey-one/src/components/shipments/SearchChipPanel.jsx` — chip row
- `apps/odyssey-one/src/components/shipments/FilterPanel.jsx` — 354px right drawer

## Screenshots

`screenshots/` — captures of the new design (Tracking-demo, Efrain May 2026) and current Shipments behavior, kept here rather than in domain folders since the component is cross-cutting.
