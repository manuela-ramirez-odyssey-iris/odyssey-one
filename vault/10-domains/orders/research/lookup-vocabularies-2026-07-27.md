---
title: Create-order lookup vocabularies (Equipment, Freight Term, Carrier, Owning Org)
domain: orders
type: research
tags: [orders, equipment, freight-terms, carriers, master-data, lookups, create-order]
date: 2026-07-27
status: active
source: "Inbox screenshots (QA build + old TMS system, 2026-07-27) + QA network captures + LINX-13893 AC (jira-create-order-sections research §3)"
---

# Carrier + Owning Org lookups — QA network captures (2026-07-27)

Real QA endpoints (both `POST`, master-data service — NOT order-service as the LLD catalog implied; note the host):
- Carriers: `https://qa.masterdata.linx.odysseylogistics.com/master-data/v1/scac-carrier/lookup`
- Owning orgs: `https://qa.masterdata.linx.odysseylogistics.com/master-data/v1/customer-service/v1/owning-org/lookup`

Dropdown behavior (both fields, per QA UI): typing searches; clicking the chevron BROWSES — an initial page renders, the rest lazy-loads on scroll.

Value formats (screenshots `carriers.png` / `organizations.png` in vault-sources/10-domains/orders/):
- Carriers: `"<SCAC> - <NAME>"`, alphabetical by NAME, many QA rows prefixed `(DNU)` (Do Not Use) — e.g. `TAPT - (DNU) GLEN TAY TRANS`, `GBYN - (DNU) GO BY TRUCK`.
- Orgs: `"<NAME> (SOURCE)"` and `"*<NAME> SOURCE SYSTEM 01"` styles — e.g. `REHEIS INC (SOURCE)`, `*ADAMS-REMCO SOURCE SYSTEM 01`.

Applied to the prototype 2026-07-27: `CARRIERS` pool expanded to ~50 in the QA format (7 QA-verbatim), served `"<SCAC> - <NAME>"` alphabetical; `EXTRA_ORGS` (~43, create-order lookup only — NOT in the shared generator pool/DB) appended to the owning-org lookup; lookup service gained browse mode (empty query = full catalog) and the section pages it 25/request into ComboBox's lazy-scroll mode.

# Freight Term catalog — QA build (`Freight term screenshot.png`)

Five display labels, default **Pre-Paid**: `Pre-Paid, Collect, Pre-Paid/Add, Third Party, No Charge`. The UI shows display names, not codes — the wire `freightTermCode` values (PPD/COL/…?) remain unconfirmed (open Q against the `freight-terms` lookup / PRD PPD/COL/3RD triple, which the 5-value catalog supersedes). Applied to our mock `FREIGHT_TERMS` 2026-07-27 (value=label until codes land); Q20 Inbound default now maps to `Collect`.

# Equipment lookup vocabulary — what the real systems serve

Two screenshots (archived at `vault-sources/10-domains/orders/`) settle what the `equipment/lookup` (LINX-6099) actually returns:

## QA build (new Angular app) — `Equipment qa screenshot.png`
The Equipment* typeahead lists **bare codes, no descriptions**: `RR, LCL, LTL, TL, FCL`. This matches the LINX-13893 equipment applicability matrix vocabulary exactly (the matrix drives which Product Information columns render per equipment). Descriptions appear missing in the QA master data — codes only.

## Old TMS system — `Equipment old system screenshot.png`
The legacy lookup is richer:
- Entries formatted **"CODE - Description"**: `TL - Truck Load`, `TLF - Frozen Box Trailer`, `TLR - Refrigerated Box Trailer`.
- **Mode-category filter chips** above the list: `All | TL | LTL | IM | SP` (intermodal + special?), i.e., equipment is categorized by transport mode.
- Note `TLF` (Frozen Box Trailer) exists in the legacy catalog but NOT in the LINX-13893 matrix cases.

## Consolidated code set
| Code | Family (13893 case) | Description (provenance) |
|---|---|---|
| LTL | Case 1 (LTL family) | Less Than Truckload (inferred) |
| LTR | Case 1 | LTL Refrigerated (inferred from TLR pattern) |
| LTH | Case 1 | LTL Hazmat? (inferred — UNCONFIRMED; our old mock wrongly used LTH = "Lowboy") |
| TL | Case 2 (TL family) | Truck Load (old-system verbatim) |
| TLR | Case 2 | Refrigerated Box Trailer (old-system verbatim) |
| TLH | Case 2 | TL Hazmat? (inferred — UNCONFIRMED) |
| TT | Case 2 | Tank Truck? (inferred — UNCONFIRMED) |
| LCL | Case 3 (Ocean) | Less than Container Load (standard shipping term) |
| FCL | Case 3 (Ocean) | Full Container Load (standard shipping term) |
| RR | Case 4 (Rail) | Rail (per 13893 "RR (Rail)") |
| TLF | — (legacy only) | Frozen Box Trailer (old-system verbatim; absent from matrix) |

## Open questions (Ramesh/master-data)
1. Authoritative description strings per code (QA serves codes only; is that a data gap or the intended UI?).
2. Are the mode-category chips (All/TL/LTL/IM/SP) part of the new UI spec or legacy-only?
3. TLF and other legacy codes outside the 13893 matrix — valid in the new system? What matrix case governs them?
4. Org-scoping (LINX-6099): which orgs see which subsets in real master data.

## Impact on our prototype
Our mock pool (`tools/data-pools.mjs` `EQUIPMENT_CODES` = FLT/LTH/VAN/REEFER) doesn't match this vocabulary, and the pool is SHARED with the shipments generator — swapping it implies regen + Neon reseed (permission-gated). The LINX-13893 matrix work (Product Information, next up) needs these codes to key column sets.
