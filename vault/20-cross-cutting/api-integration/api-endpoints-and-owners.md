---
domain: cross-cutting
type: reference
tags: [api, backend, integration, ownership, micro-frontends, production-readiness]
date: 2026-06-05
status: active
source: "Confluence TMS/3737550853 — OdysseyONE API Endpoints and Owners (author: Laurie Blumsack, modified 2026-06-04)"
---

# OdysseyONE API Endpoints & Owners

> Synthesized from Confluence (TMS space, page 3737550853). The master index of backend services behind the OdysseyONE front end — which framework each domain uses in production, the API surface, and who owns each. This is the backbone for the **seam-to-API mapping** in `docs/`.

## Service / ownership matrix (as of 2026-06-03)

| Domain | Service | **Prod UI** | API surface | Product Owner | Eng Owner | LLD |
|---|---|---|---|---|---|---|
| **Orders** | `order-service` | **React** | 9 endpoints — `/order-service/v3/order`, `…/order-status`, `…/audit-report`, `…/order/validation`, `…/manual-order`, `…/order/list`, `…/order/view`, `…/order/cancel`, `…/order/restore` | Ramesh Raman | Venkata Kesavarao Seerla | TMS/3401056276 |
| **Shipments** | `shipment-service` | **React** | **1 endpoint** — `/shipment-service/v2/load` | **Janardhana (Jana)** | **Soni Sinha** | TMS/3525869576 |
| **Carrier** | `carrier-service` | **React** | ~30 endpoints (`/carrier-service/v1/...` — list/lookup/filter/add/update/columns/contacts) | Kathleen O'Donnell | Utkarsh Tripathi (Cognizant) | TMS/2643066896 |
| **User Management** | `user-service` | **Angular** | ~18 endpoints (`/user-service/v1/external-user/...`) | — | Utkarsh Tripathi (Cognizant) | TMS/3616538625 |
| **Tracking** | — | **Angular** | — | — | Irina Jachimek | — |
| **Home Page** | — | **React** | — | — | — | — |

## Strategic reading (for the Monday architect reconvene)

1. **React is the SANCTIONED production UI for Shipments, Orders, Carrier, and Home — not a rogue prototype choice.** This page (owned by Laurie Blumsack, updated the day before the critique meeting) lists those four domains as React in production. Manuela's React umbrella app is *aligned with the official architecture*. The "is this even real React / should this be Angular" subtext collapses against Odyssey's own service registry.
2. **The Shipments backend surface is ONE endpoint: `/shipment-service/v2/load`.** The "backend integration will be a nightmare" claim shrinks dramatically — the domain the prototype is deepest in integrates through a single load service. This is the cleanest possible first integration to demo.
3. **The owners are already in Manuela's orbit.** Shipments Eng Owner = **Soni Sinha** (her pending CloudFront+S3+SSO infra contact); PO = **Jana** (her existing source of truth). The people who can unblock integration are people she already works with.
4. **Tracking & User Management stay Angular** — consistent with the meeting decision. The React/Angular split is settled per-domain; the prototype respects it.
5. **Affiliation note:** Carrier + User Management Eng Owner is Utkarsh Tripathi (Cognizant); Shipments Eng Owner is Soni Sinha. Useful when reading who pushes which framework.

## LLD child pages (under TMS/2395963400 "Low Level Design")

**Synthesized (2026-06-05):**
- Shipments → [[shipment-service-api]] (from 3525869576, 2778202116, 2643099672)
- Orders → [[order-service-api]] (from 3401056276, 2361917446, 2630090754; FE-creation page image-only)
- Carrier → [[carrier-service-api]] (from 2643066896)
- Auth → [[auth-sso]] (2538373145, 2660139009 are **image-only** — MSAL/Entra inferred, full flow pending diagram export)

**Not yet synthesized:**
- Master/Address/Product domains + API Consumption Mapping pages (Master 3670212609, Address 3669327928)
- Legacy TMS→LINX domain (2619572230) + TMS-NN-LINX Mappings (2893938834)

→ All feed the **production-readiness roadmap**: `docs/production-readiness-roadmap.md` (seam-to-API map + phased plan).

## Sensitive notes (internal only)
- Contains internal endpoint paths + personnel names (owners). Internal vault only — do not externalize.
- No credentials/secrets/customer data on this page.
