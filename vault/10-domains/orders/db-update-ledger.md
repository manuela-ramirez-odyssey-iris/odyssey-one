---
title: Orders DB-update ledger (end-of-Orders reseed shopping list)
domain: orders
type: reference
tags: [orders, database, neon, reseed, ledger]
date: 2026-07-28
status: active
---

# DB-update ledger

Running list of changes deferred to the **end-of-Orders regen + Neon reseed +
deploy** (one motion, permission-gated — user directive 2026-07-28: "we will do
the reseed when we are done with orders"). Add items as they accrue; nothing
here ships until the user green-lights the reseed.

| # | Item | Detail | Logged |
|---|---|---|---|
| 1 | Equipment code vocabulary swap | Shared pool `EQUIPMENT_CODES` (FLT/LTH/VAN/REEFER in `tools/data-pools.mjs`) → real catalog (LTL/LTR/LTH/TL/TLR/TLH/TT/TLF/LCL/FCL/RR per `lookup-vocabularies-2026-07-27.md`). Create-order lookup already swapped (lookup-only, `EQUIPMENT_LABELS`/`EQUIPMENT_LOOKUP_CODES` in master-data); the shipments grid/DB rows still carry old codes until reseed. Old `LTH = "Lowboy"` mock meaning conflicts with real `LTH = LTL Hazmat` — the pool swap resolves it. | 2026-07-28 |
| 2 | Freight Term wire codes | CONFIRMED via live dev capture: codes are single letters `{P: Pre-Paid, C: Collect, N: No Charge, T: Third Party, A: Pre-Paid/Add}`. At reseed, generator + `freight_term` columns store the letter codes. Ship direction likewise: `{O: Outbound, I: Inbound}`. | 2026-07-28 |
| 3 | EXTRA_ORGS scope check | ~43 create-order-only owning orgs are lookup-only by design (not in the shared pool/DB). Decide at reseed time whether any should become real DB customers. | 2026-07-28 |
| 4 | Product line fields | New order-line fields (hazardous, handling unit/count, dims, harmonized, declared value+currency, country, STCC) exist only in the create-form wire mapping (PROVISIONAL keys). If the DB `manual_order` JSONB should carry them for reopened drafts/views, reseed-time is the checkpoint. | 2026-07-28 |
| 5 | Product ID external-ID format | Create-order product lookup now serves 18-digit zero-padded external IDs (`000000000000100027` style, Master Data LLD `mf_ship_item.external_id`) derived lookup-only from `CHEMICAL_PRODUCTS` indexes. Pool/DB still carry short item codes (`32041H1D`) — at reseed, decide whether product lines store the external-ID form so lists/details match the create flow. | 2026-07-28 |
| 6 | Product Class + Handling Unit catalogs | CONFIRMED via live dev capture (research note §Live Dev Capture): `HANDLING_UNITS` = the complete real 5-entry catalog {PLT/BOX/DRM/BUL/CRT}, `PRODUCT_CLASSES` = NMFC scale incl. 350/450/650 (dev's dirty rows excluded). At reseed, order lines should store handling-unit CODES (PLT…) not labels. | 2026-07-28 |

Related open questions (Ramesh/master-data): authoritative equipment
descriptions per code; mode-category chips legacy-or-spec; TLF matrix case;
LINX-6099 org-scoping in real master data.
