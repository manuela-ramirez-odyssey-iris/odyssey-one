---
title: Orders DB-update ledger (end-of-Orders reseed shopping list)
domain: orders
type: reference
tags: [orders, database, neon, reseed, ledger]
date: 2026-07-28
status: active  # Round 1 shipped 2026-07-29; Round 2 open (S104)
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
| 5 | Product ID external-ID format | Create-order product lookup now serves 18-digit zero-padded external IDs (`000000000000100027` style, Master Data LLD `mf_ship_item.external_id`) derived lookup-only from `CHEMICAL_PRODUCTS` indexes. Pool/DB still carry short item codes (`32041H1D`) — at reseed, decide whether product lines store the external-ID form so lists/details match the create flow. **Final decision 2026-07-29 (user): 13-digit external IDs** — the 18-digit form minus its 5 leading zeros — single-sourced via `productExternalId` (pool + DB + create flow all share it). | 2026-07-28 |
| 6 | Product Class + Handling Unit catalogs | CONFIRMED via live dev capture (research note §Live Dev Capture): `HANDLING_UNITS` = the complete real 5-entry catalog {PLT/BOX/DRM/BUL/CRT}, `PRODUCT_CLASSES` = NMFC scale incl. 350/450/650 (dev's dirty rows excluded). At reseed, order lines should store handling-unit CODES (PLT…) not labels. | 2026-07-28 |
| 7 | Validation-error counts: weighted-low, never uniform-high | `generate.mjs` seeds `errorCount = faker.number.int({min:1,max:12})` (uniform — high counts over-represented; user flagged too many 12s). At reseed: weight LOW (most orders 1–4 errors, tail to ~8; hard cap ≤ 12 and ≤ the OIF `RESOLVE_POOL` size, currently 15 — see `validationErrors.js`). errorCount must remain consistent with the resolve view's derivation (it seeds from orderNumber + errorCount). Reminder: the S99 resolve seam loses `errorCount` on a direct/refreshed `?resolve=` URL (falls back to 3) — if the reseed adds a per-order errors payload, that seam closes. | 2026-07-29 |
| 8 | +1000 order records | User directive 2026-07-29: next-session seeding plan (subagent-driven) adds ~1000 more orders on top of the existing dataset, incorporating all Orders-era updates above. | 2026-07-29 |
| 9 | Order status-update endpoint (closes the live-mode Purge/Resolve/Submit/Cancel gap) | Our API has no status-write path, so `resolveOrder`/`submitDraftOrder`/`cancelOrder` all throw behind the live guard — Purge visibly "does nothing" in live mode (user-hit 2026-07-29). Add a status-update endpoint (e.g. `PATCH /order-service/v3/order/status` → `orders.order_status`) and wire the three service fns' live branches to it. Ships in the same motion as the reseed + deploy (S93 lesson: API changes ride with their deploy). | 2026-07-29 |

| 10 | Order-number format | Canon (LINX-9742/9279): Order Number = optional user free text (≤150 chars, unique per owning org); blank → BE generates `orderNumber = orderId`. The invented `ACM100028` shape (S80) was never specced. **Final decision (user, 2026-07-29): 71% auto-generated numeric in the 13-digit zero-padded convention** (mirrors the row-5 product external-ID style — the padding itself is our seed styling, canon only says "= orderId") **/ 29% user-provided free text with customer initials** (`COV-91150`-style; shape invented — intent "user typed it to remember the customer"; ratio + shape have no Jira source). Write-path mock aligned (blank create → same 13-digit form). | 2026-07-29 |
| 11 | Per-order validation-errors payload | Close the `?resolve=` refresh seam for real (row 7 reminder): resolve view should get authoritative per-order errors/errorCount from the API rather than list-row fallback. **Verified S101: NO-OP.** S100 already closed it — direct `?resolve=` URLs fetch real errorCount via the order-list endpoint (CreateOrderForm.jsx:116–125, mock+live); errors stay deterministically derived from orderNumber+errorCount by design (the OIF seam). A stored errors payload waits for a real OIF feed. | 2026-07-29 |

**SHIPPED 2026-07-29** — orders-reseed motion (plan
`docs/superpowers/plans/2026-07-29-orders-reseed-motion.md`); rows 1–9 all
closed.

Related open questions (Ramesh/master-data): authoritative equipment
descriptions per code; mode-category chips legacy-or-spec; TLF matrix case;
LINX-6099 org-scoping in real master data.

---

# Round 2 — opened 2026-08-01 (S104)

User-supplied list + carried-over S103 item. **Classified by what actually
needs a reseed**, because most of this is code, not data — lumping it together
would make the reseed look like a prerequisite it isn't.

## 2A — Needs a generator change + reseed (data shape changes)

| # | Item | Detail | Logged |
|---|---|---|---|
| R2-1 | **Tracking Link** (Shipments) | Carried from S103 — `ShipmentDetailsModal.jsx:147` hardcodes `{ label: 'Tracking Link', value: null }` because **no tracking URL exists anywhere in the contract** (modal spec 2026-07-30 §4 "Still open"). Giving it a real value = seeding the field. Shape is ours to invent (flag as invented); the artifact shows it as a hyperlink hanging off the Pro/Booking # value. | 2026-08-01 |
| R2-2 | **Pickup # missing** (Orders) | Per LINX-8128, References pre-seeds **PO Number + Pickup Number** as Reference Type/Value pairs. Our generator seeds reference values but Pickup # is absent from the order view. Needs: confirm whether it should be a seeded Reference row (canon says yes, pre-seeded) and add it. **Investigate first** — may be partly a UI gap rather than data. | 2026-08-01 |
| R2-3 | **Created / Last Edit Date need a timezone** (Orders) | Both currently carry no zone. S103 moved shipments to IANA zones + `tzAbbrev()` per-instant derivation (TR-04); Orders never got the same pass. Apply the SAME mechanism (city → IANA, abbreviation derived per instant so DST is correct), **not** a hardcoded suffix — that was the exact S102/S103 bug. | 2026-08-01 |
| R2-4 | **`Last Edited By` column + username identity** (Orders) | Two parts: (a) NEW column `last_edited_by`; (b) **both** `created_by` and `last_edited_by` must store the **Odyssey username**, not the display name — user rationale: *multiple users share a display name, so the name is ambiguous as an identity*. `last_edit_at` already exists (S102). Seed from the 13 seeded users + the 4 sso-mock personas (S101). | 2026-08-01 |

## 2B — Code only (NO reseed needed)

| # | Item | Detail | Logged |
|---|---|---|---|
| R2-5 | **Order creation doesn't persist** | Create Order must write to the DB and then show the defined summary/confirmation to complete the flow. S102 shipped `PUT /order-service/v3/order` (edit); **creation** still needs its write path + the LINX-9002 confirmation page contract (order number provided → "Your order was created successfully."; not provided → async-assignment message that flips when the number arrives). Pure API + UI. | 2026-08-01 |
| R2-6 | **Appointment flag invisible in Edit flow** | **Definition found in vault** — David Johns, Apr 9 2026 (`grooming/feedback/0409-jana-david.vtt` 15:12–15:49): a pickup/delivery date normally expresses an early/late **window** (*"that's a pickup between noon and 8:00 PM"*); checking the Appointment box **collapses the window to a firm slot** (*"then that noon becomes the appointment"*) and **must be transmitted to the carrier** (*"the carrier knows … you have an appointment to pick it up at"*). Related: DEC-34 (time is only meaningful for appointments), DEC-36 (in the **Shipments** Order tab the checkbox is **display-only**). Open: in **Orders** it should presumably be editable — confirm with Ramesh. | 2026-08-01 |
| R2-7 | **Appointment & Hazardous flags invisible in View Order** | Hazardous is already specced: per LINX-8121 the line-level checkbox auto-checks when a UN Number is entered, and *"if at least 1 product in the order is hazardous, the entire order is considered as hazardous"* — so View Order needs the derived ORDER-level flag plus the per-line flag. Appointment per R2-6. | 2026-08-01 |
| R2-8 | **Product Information columns not inline with LINX-13893** | The columns are **not a fixed set** — LINX-13893 ("Lauren's feedback") is an **equipment applicability matrix**: **Case 1** LTL/LTR/LTH → +Product Class, +Handling Unit Name/Description/Count, +L/W/H; **Case 2** TL/TLR/TLH/TT → same **minus Product Class**; **Case 3** LCL/FCL (Ocean) → +Harmonized Code, +Declared Value & Currency, +Manufacturing Country Code; **Case 4** RR (Rail) → +STCC (non-mandatory, TMS-validated, error *"Incorrect STCC Code. Please check the value & re-enter"*). Full text: `research/jira-create-order-sections-2026-07-26.md` §3. **Known unreconciled conflict:** STCC is struck from the base grid (8121/8131) but live for Rail (13893 Case 4) — flag to Ramesh. `TLF` exists in the legacy catalog but appears in **no** matrix case. | 2026-08-01 |

## 2C — Search architecture (separate motion, see spec)

| # | Item | Detail | Logged |
|---|---|---|---|
| R2-9 | `search_index` projection table | ONLY needed for the target-scale architecture (`docs/superpowers/specs/2026-07-31-progressive-search-architecture-design.md`). **Wiring search to Neon does NOT require it** — every searchable column already exists on `shipments` (schema verified 2026-08-01), so a direct-SQL implementation needs zero reseed. The projection is the scale answer, not a prerequisite. | 2026-08-01 |

**Reseed gate unchanged:** nothing here ships to prod without explicit
permission for that specific reseed. Round-2 reseed items (2A) should ride ONE
motion, ideally on a Neon **branch** first.
