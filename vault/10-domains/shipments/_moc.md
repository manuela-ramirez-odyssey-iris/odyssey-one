---
title: Shipments Domain — Map of Content
domain: shipments
type: info
tags: [moc, shipments]
status: active
---

# Shipments — Map of Content

Entry point for the Shipments domain knowledge base.

## Canon

- [[domain-analysis|Domain Analysis]] — source-of-truth document, distilled from Jana + David grooming
- [[decisions/decision-log|Decision Log]] — every implemented decision traced to its source
- [[dropped-carrier|Dropped Carrier]] — the Tender tab's dropped-carrier section (LINX-13953) and Process SCAC (LINX-13954): what a dropped carrier is, inline collapsible placement, per-row action, the full state machine, the LINX-13397 lookups each field needs
- [[decisions/dropped-carrier-decisions|Dropped Carrier Decisions]] — `DC-` rulings for the Dropped Carrier group; **analysis only, nothing implemented** (kept out of the decision log for that reason)
- [[global-search-adaptation|GlobalSearch — Shipments Adaptation]] — how the cross-cutting [[../../20-cross-cutting/global-search/global-search|GlobalSearch canon]] lands as Shipments v1: attribute coverage gap, mechanism gap, Shipments-only extras, build ladder
- [[shipment-trail|Shipment Trail (= History Screen)]] — terminology ruling, actor model, event-template model, MVP scope boundary, gap analysis against `HISTORY_ACTIONS`
- [[data/history-event-catalog|History Event Catalog]] — Pappu's MVP event/variant/template spec, transcribed lossless with `<Placeholder>` tokens intact

## Backlog

Domain-tagged items live in the unified backlog at `vault/60-backlog/`. Filter by `domain: shipments` to see Shipments-only.

## Grooming

Raw transcripts from Jana + David sessions in `grooming/`. Feedback / review sessions in `grooming/feedback/`.

## Powerpoints

`powerpoints/` — Shipments-Exceptions and Shipments-Monitoring source decks + their MarkItDown-converted Markdown views.

## Data

`data/` — domain-specific CSVs and reference data (attribute progression grouping, etc.).

## Screenshots

`screenshots/` — UI captures specifically for the Shipments route (table, BottomBar, FilterPanel, ColumnPanel, etc.).
