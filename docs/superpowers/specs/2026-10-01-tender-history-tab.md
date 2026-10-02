---
domain: shipments
type: spec
tags: [tender, history, tender-history]
date: 2026-10-01
status: approved 2026-10-01 (user, T1–T4 defaults)
stories: [LINX-17756]
---

# Tender History tab (LINX-17756)

## 1. Sources
- **LINX-17756** "Display Tender History for a Shipment" — Ready for Grooming. AC-01…AC-08 (customfield_10032, fetched 2026-10-01). Pappu (2026-09-30): *"Tender History screen's VD will be similar to the Shipment history"*; VD requested from Manuela, Adam asked to approve.
- **Code today** (`apps/odyssey-one/`):
  - `src/components/detail/BottomBar.jsx:76` already has a **Tender History** tab (`key: 'tender'`) → `TenderHistoryTab.jsx`, a `PaneEmpty` stub.
  - `src/components/detail/HistoryTab.jsx:132` `HistoryEntries` — the newest-first timeline renderer (badge · author · UTC time, details, diff row, Option Note). Shared already with the lineage preview.
  - Every tender event already carries `category: 'tender'`: seed `Auto Tender Validation`, `Tender Sent`, `Tender Response Received` (`tools/generate.mjs:1970-2084`), and DEC-232's five actions (`api/_lib/shipments.mjs` `tenderHistoryEntry`, live + seed).
  - System actors already render as **System (OdysseyOne)** (DEC-89).

## 2. Build

| # | AC | Today | Target | Files |
|---|---|---|---|---|
| 1 | AC-01 dedicated tab | stub | the Tender History tab renders a static SubAccordion **"Tender History"** holding `HistoryEntries` — same anatomy as Shipment History (Pappu) | `TenderHistoryTab.jsx`, `HistoryTab.jsx` (export `HistoryEntries`), `BottomBar.jsx` (pass `historyData`) |
| 2 | AC-02 only tender events / separate from Shipment History | tender events sit in Shipment History | Tender History = `category === 'tender'`; **Shipment History (incl. the lineage panels) drops them** | `TenderHistoryTab.jsx`, `HistoryTab.jsx` |
| 3 | AC-03 reverse chronological | `orderNewestFirst` | unchanged (reused) | — |
| 4 | AC-04/06/07 description: carrier, notify method, response method, tender status, reason/comments | free text; DEC-232 rows carry `scac` + status diff + Option Note; seed rows carry text only | every tender row carries structured fields — `scac`, `carrierName`, `notifyMethod` (option `apiSource`), `responseMethod` — rendered as one muted facts line under the details: **Carrier** SCAC – Name · **Notify** Email · **Response** Email Links Update. Status stays the existing diff row; reason/comments stay the Option Note. Absent fields are omitted (AC "where applicable"). | `shipments.mjs` `tenderHistoryEntry`, `generate.mjs` (Tender Sent / Response pushes add the fields — no faker draws), `HistoryTab.jsx` `HistoryEntries` |
| 5 | AC-05 initiator | DEC-89 | unchanged | — |
| 6 | AC-08 empty state | stub copy | verbatim — heading **No tender history is available**, description **Tender history will appear here once tender-related events are recorded for this shipment.** | `TenderHistoryTab.jsx` |

Seed change rides the ONE batched reseed already owed (feedback: batch reseeds). Ids unmoved: added fields only.

## 3. Assumptions pending ruling (defaults → approve as-is)

| # | Question | Default |
|---|---|---|
| T1 | Story lists events we **don't emit**: carrier additions, quote updates, notes, order-change tender decisions (Bypass / Re-Tender / Approve). | **Out of this slice.** The trail renders recorded events only (DEC-80); none of those writes a history row today. List them as follow-ups. |
| T2 | Move tender events OUT of Shipment History, or show them in both? | **Move** — AC-02 + Scope "separates tender activity from Shipment History". |
| T3 | Facts line format/labels (no VD yet). | The line in row 4; restyle when the VD lands. |
| T4 | `Auto Tender Validation` (system check before tender) counts as tender? | **Yes** — already `category: 'tender'`. |

## 4. Tests
- `TenderHistoryTab.test.jsx`: only tender entries, newest first, facts line, empty-state copy verbatim.
- `HistoryTab.test.jsx`: tender entries no longer in Shipment History.
- `shipments.test.mjs`: `tenderHistoryEntry` carries the four fields.
- `generate.test.mjs`: tender rows carry `scac`/`carrierName`/`notifyMethod`.
