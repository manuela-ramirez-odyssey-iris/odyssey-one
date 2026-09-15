# Odyssey Shipment Identifier — design spec (S148)

**Source:** `vault-sources/10-domains/shipments/sources/laurie-dave-odyssey-shipment-identifier-2026-09-15.md`
(Laurie's column/filter note + update; Dave Schultz on format and on where it lives).
**Status:** awaiting 2 rulings (§7) + explicit Neon go-ahead (§5, T3).

---

## 1. What it is

A new shipment attribute, **`odysseyShipmentIdentifier`**, UI label **"Odyssey Shipment Identifier"**.

Not an invention: the field name is already the Shipment Service LLD's
(`"odysseyShipmentIdentifier": "C813888"`, 15 occurrences), and Dave confirms the
column has always existed in the TMS shipment table as `odyssey_shipment_id`.

**Format:** `<prefix><sequence>` as a **string**.
- prefix `O` — single-order shipment
- prefix `C` — multi-order (consolidated) shipment
- sequence — system-generated, starting at **50,000,000** in O2 so it cannot collide
  with a TMS-generated id
- **length is not fixed.** The sequence grows. Nothing may pad, zero-fill,
  length-validate, or regex a fixed width.

**Cardinality:** one per shipment, common to that shipment's buy and sell side.
In the real schema buy and sell are separate rows sharing one `odyssey_shipment_id`;
our prototype collapses that pair into a single row, so it is exactly **one per row**.
Multi-leg chains generate each leg as its own shipment, so a 3-leg chain gets 3.

## 2. What it is NOT

- **Not the primary key.** Dave: `shipment_id` is the PK and "you are already
  displaying that correctly in the UI" — in our row that's the
  `buyShipment`/`sellShipment` pair. Row keying (`ShipmentRowVM.id = sellShipment`),
  the `:sellShipment` route param, the per-shipment detail filenames and the
  `sell-shipment-out/{id}` contract path are all **untouched**.
- **Not a replacement** for Buy/Sell Shipment #. Those stay as columns —
  "Buy and Sell Shipment IDs are Internal Only" describes who they're *sent* to,
  and our grid is the internal view.

## 3. Generation (prototype)

The discriminator already exists: `generate.mjs:2009` sets
`shipmentType: orderCount === 1 ? 'Direct' : 'Consolidation'` — Dave's O/C split verbatim.

```js
// tools/generate.mjs
const ODYSSEY_SHIPMENT_SEQ_BASE = 50_000_000; // O2 base — above every TMS-generated id
let odysseySeq = ODYSSEY_SHIPMENT_SEQ_BASE;   // reset in resetGeneratorState()
// assigned after orderCount is known (:709), prefix frozen at creation:
const odysseyShipmentIdentifier = `${orderCount === 1 ? 'O' : 'C'}${odysseySeq++}`;
```

**No faker draw.** A plain counter consumes no randomness, so every existing
buy/sell/order id keeps its current value and every hardcoded id in the test
suite survives. This is load-bearing — a new faker draw would re-number the
entire dataset.

Seeded distribution is already healthy: orderCount `1→1002, 2→529, 3→333, 4→232, 5→104`
= **1002 `O` / 1198 `C`**, so both prefixes are reachable in the UI.

The prefix is **stored, not computed**, so it is frozen at creation by
construction (see §7 open question 1).

## 4. Where it shows

- **Grid:** first column, far left. There is no left-pin mechanism —
  `DataTable.jsx` implements only `meta.sticky === 'right'` — so "far left" is
  purely array order in `ColumnPanel.jsx`.
- **Search:** first attribute of the **Shipment Identifiers** group,
  **`match: 'both'`** (NOT `'digits'` — a leading `C`/`O` means a digits-only
  matcher would never suggest the chip), and a filter-panel selection.
- **Details modal:** alongside Buy/Sell in the identifiers block.

## 5. Task breakdown

| # | Layer | Files | Notes |
|---|---|---|---|
| T1 | Generator | `tools/generate.mjs` | counter + `resetGeneratorState()`; assign after `:709`; add to row (`:2003`) and detail |
| T2 | Mock data | `node tools/generate.mjs` | regenerate; **assert existing buy/sell ids are byte-identical** |
| T3 | Database | `packages/db/migrations/00X_*.sql`, `tools/seed.mjs` | `ALTER TABLE shipments ADD COLUMN odyssey_shipment_id text`; add to seed column list; **reseed Neon — needs explicit permission for that run** |
| T4 | API | `api/_lib/shipments.mjs` | `ROW_COLUMNS` alias, `SORT_MAP`, `FIELD_MAP`, `FREE_TEXT_COLUMNS` — all four, or the column renders blank / sorts dead / filters inert |
| T5 | Search registry | `api/_lib/search-registry.mjs` | new `SHIPMENTS_ATTRS` entry at priority 0; buy→1, sell→2; add to `hydrate.columns` |
| T6 | Search | `search/shipments/progression.js`, `criteria.js` | first in group; `match: 'both'`; add to `FREE_TEXT_KEYS`; keep flattened index in parity with T5 (`registryParity.test.js`) |
| T7 | Grid | `detail/ColumnPanel.jsx`, `shipments/ShipmentTable.jsx` | `ALL_COLUMNS` + 3 default profiles + 3 named views, first position; `COLUMN_CONFIG`; extend the identity-cell title-styling list at `:242` |
| T8 | Detail | `detail/ShipmentDetailsModal.jsx` | add to the identifiers field block (`:500`) |
| T9 | Deliverables | `docs/progression/prose.json`, `csv-fallback.json`, `npm run progression:sheets` | + update both `*-search-progression.md`; `progression:audit` green. **Same commit** (CLAUDE.md) |
| T10 | Canon | `vault/10-domains/shipments/domain-analysis.md`, `decisions/decision-log.md` | progression table §621; decision traced to source + previous state |
| T11 | Tests | per layer | incl. a generator assertion that prefix matches `shipmentType` |

## 6. Verification

- `generate.test.mjs`: every id matches `/^[OC]\d+$/`, unique, prefix agrees with
  `shipmentType`, sequence starts at 50000000, **and existing ids unchanged**.
- `registryParity.test.js` green (priority shift).
- `progression:audit` exits 0.
- Live check in the browser — `.env.local` is `VITE_API_MODE=live`, so the mock
  path passing proves nothing about what the user sees.

## 7. Open — blocking nothing, but unresolved

1. ~~**O→C flip on consolidation.**~~ **RESOLVED (Dave Schultz, 2026-09-15):** "when you are creating a shipment, you know whether it only has one order or is a consolidation. So, at that moment, the correct prefix can be assigned. **A shipment cannot change from one type to another.**" The stored-not-computed implementation is correct as built. **New tension it exposes:** `buildSaveStopsQuery` writes `order_count` from the order roster, so our Order Change flow CAN move a shipment across the 1↔2 boundary (LINX-15872 external move in, DEC-141 pending-order drop out) — producing a shipment whose frozen prefix disagrees with its live order count, a state Dave says cannot exist. Not fixed here: recomputing the prefix would contradict the ruling, and constraining Order Change is that feature's call. Raised for Dave/Jana.
2. ~~**Sell Shipment # relabel.**~~ **RESOLVED (user, 2026-09-15): the Sell Shipment # column header stays as it is.** "Planned Shipment ID" is the outward-facing name for the sell shipment — what Odyssey sends the customer and the carrier — not the internal grid label. Laurie's own note puts Buy and Sell under "Internal Only", and our grid is the internal view. No rename in `ColumnPanel`, `ShipmentTable`, `progression.js` or `search-registry.mjs`; the contract name `plannedShipmentIdentifier` is mapped at the API boundary if and when the real contract lands. (The field itself was never in question: `sell_shipment` is the PK and the FK target of `orders`, `stops`, `tenders` and `events`.)
3. **Mandatory or hideable?** Is the new column pinned in the column panel
   (non-hideable) or just first in default order like every other column?
