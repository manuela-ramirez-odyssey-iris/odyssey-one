---
title: Orders Domain — Map of Content
domain: orders
type: moc
tags: [moc, orders]
date: 2026-06-10
status: active
---

# Orders — Map of Content

Hub for the Orders domain canon in OdysseyONE. Orders create the customer order that feeds shipment planning, execution, invoicing, and visibility.

## Canon

- [[10-domains/orders/domain-analysis|Orders domain analysis]] — the synthesized Orders domain analysis (entity model, three creation paths, lifecycle, overview grid, actions, fallout review, audit trail, cross-domain touchpoints, open gaps). *(Path-qualified link: three vault files share the name `domain-analysis` — a bare wikilink resolves to the wrong domain.)*
- [[10-domains/orders/section-map|Section map]] — UI section ↔ data ↔ endpoint matrix + suggested vertical-slice order. The GATE 0 artifact.
- [[10-domains/orders/open-questions|Open questions]] — the question list for Ramesh / Priya / the Orders team.
- [[10-domains/orders/screens-reference|Screens reference]] — 18 Figma design JPG exports from Efrain correlated against the canon (per-screen confirms/discrepancies + consolidated component-gap list for the React rebuild).
- [[10-domains/orders/requirements-tracker|Requirements tracker]] — synthesized story matrix from Ramesh's master FR tracker (LINX-5943), with a per-story **Prototype state** column (Built / Partial / Stub / Absent / backend) and a UI coverage summary.
- [[10-domains/orders/decisions/decision-log|Decision log]] — implemented Orders decisions + PO-conformance observations (`ORD-` prefix). ORD-01 = Ramesh's 2026-06-15 prototype gap report.

## API & integration

- [[order-service-api]] — order-service endpoints (v3 UI/CRUD, v1 lookups, OrderHeader model).

## Cross-domain

- [[10-domains/shipments/domain-analysis|Shipments domain analysis]] — downstream consumer; Order → Load → Shipment three-tier model and the rules for propagating order changes onto shipments.

## Research

- [[10-domains/orders/research/jira-orders-table-columns-2026-07-26|Orders main table — Jira research (2026-07-26)]] — full Jira column-spec extraction (Draft/Validation Errors/All tabs, row actions, backend data model) ahead of the Figma contrast session.
- [[10-domains/orders/research/jira-create-order-sections-2026-07-26|Create Manual Order + Confirmation pages — Jira research (2026-07-26)]] — full Jira spec extraction for the Quick/Long Order Creation flow (General Info, Pickup/Delivery, Product Info, Special Services), validation-error model, and Confirmation pages, contrasted against our React implementation.

## Sources

Raw Jira story dumps (852 stories, 12 epics) live **outside the vault** at `vault-sources/10-domains/orders/jira-stories/` (start with `_inventory.md`). These are the un-synthesized inputs the domain analysis condenses; they are not Obsidian-indexed.

## Screenshots

`screenshots/` — Orders-related captures (changes-badge, legacy quote form).
