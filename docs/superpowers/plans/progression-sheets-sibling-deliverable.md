# Spec — Progression sheets as Shipments/Orders siblings (Cognizant deliverable)

**Session:** S146 · **Author:** main thread (Opus) · **Implementer:** Sonnet subagent
**Thread tag:** `S146:`

## Goal

Ship the Shipments and Orders **search progression** documentation as true siblings — one
workbook shape, one style, one md shape — generated FROM the code so they cannot drift from
what is deployed on Vercel.

## Acceptance criteria (user, verbatim intent)

1. Orders mirrors Shipments' **style, coloring and format** — both look like the same idea.
2. Both are **aligned with what is implemented on Vercel**. Named example: `Pickup #` is NO
   LONGER skipped. Also: a column showing **which labels we actually use for the suggestions
   panel header**, so Cognizant can tell which label is which.
3. **Every** future change to search functionality must re-align the xlsx AND the md. So the
   sheets are GENERATED, and there is a `--check` mode that fails when code and sheet disagree.
4. Both md files share one format, as siblings.

## Non-goals

- Do NOT touch any file under `apps/odyssey-one/src/`. This is a documentation deliverable;
  the code is the source of truth, not the thing being changed.
- Do NOT invent attributes, enum values, examples or labels. Everything derivable comes from
  the code at generate time. Everything else comes from the prose sidecar (below).
- Do NOT write the md files. The main thread owns those.
- Do NOT commit. Leave the working tree dirty for review.

## Technical approach (de-risked — do not substitute another)

`src/search/**` uses extensionless imports and imports a **TypeScript** module
(`src/api/mappers/mapOrderListRow.ts`), so plain `node` CANNOT import it. Load the modules
through Vite's own resolver instead, and **run from the repo root** (that is where `vite` is
hoisted):

```js
import { createServer } from 'vite'
const root = 'apps/odyssey-one'
const server = await createServer({
  root, configFile: `${root}/vite.config.js`,
  server: { middlewareMode: true }, logLevel: 'error',
})
const o = await server.ssrLoadModule('/src/search/orders/progression.js')
const s = await server.ssrLoadModule('/src/search/shipments/progression.js')
const r = await server.ssrLoadModule('/src/search/orders/registry.js')
// ... then: await server.close()
```

Verified working: yields `ORDERS_ATTRIBUTES` = 20, `SHIPMENTS_ATTRIBUTES` = 27,
`ORDERS_FILTER_ATTRS` from the registry.

xlsx is written with **openpyxl**, which is already installed in the repo's MarkItDown venv at
`/tmp/pptx_env/bin/python` (3.1.5). Do NOT add an npm dependency for xlsx.

So: **two files**, one Node (code truth → JSON) and one Python (JSON → xlsx), with the Node
side driving the Python side as a subprocess so the operator runs ONE command.

## Files to create

| Path | What |
|---|---|
| `tools/progression-sheets.mjs` | Node entry. Loads both progressions + the Orders registry via Vite, joins the prose sidecar, writes the CSVs, then shells out to the Python renderer for the xlsx. Flags: `--check` (see below). |
| `tools/progression-sheets.py` | openpyxl renderer. Reads the JSON the Node side hands it on stdin, writes both workbooks. Styling lives HERE and is shared by both domains by construction. |
| `docs/progression/prose.json` | The hand-maintained half: per-attribute Description + Notes, the not-built lists, the open questions, the README rows. |

Plus in the ROOT `package.json` scripts:

```
"progression:sheets": "node tools/progression-sheets.mjs",
"progression:audit":  "node tools/progression-sheets.mjs --check"
```

## Outputs (exact paths — regeneration overwrites in place)

| Path | Notes |
|---|---|
| `docs/story-packs/shipments-search-progression.xlsx` | NEW. The Cognizant deliverable. |
| `docs/story-packs/orders-search-progression.xlsx` | NEW (undated sibling). Leave the existing `orders-search-progression-2026-09-04.xlsx` alone as history. |
| `vault/10-domains/shipments/data/attributes-progression-grouping.csv` | REGENERATED (currently stale). |
| `vault/10-domains/orders/data/attributes-progression-grouping.csv` | REGENERATED. |

## `--check` mode

Regenerate every output into a temp directory and byte-compare against the committed files.
Print one line per file (`ok` / `DRIFT`) and `process.exit(1)` on any drift or on any sidecar
error. This is the `npm run tokens:audit` idiom — `/wrap` can run it.

Sidecar errors that must fail the run (not warn):

- an attribute exists in code but has no prose entry (you added a field and did not document it);
- a prose entry names an attribute key that no longer exists in code (you removed a field and
  left its documentation behind).

Report the offending `<domain>:<key>` in the error message.

## Workbook structure — SEVEN sheets, IDENTICAL in both domains

Sheet order matters. The only thing that differs between the two workbooks is the rows.

### 1. `README`
Two columns: `Topic` | `Detail`. Rows come from `prose.json → readme[domain]`, plus two rows the
generator always appends last:
- `Generated` — ISO date + short git SHA (`git rev-parse --short HEAD`) + the exact command.
- `Keeping this aligned` — `npm run progression:audit` fails when the sheet and the code
  disagree; regenerate with `npm run progression:sheets`.

### 2. `Progression`
The drill sequence. One row per group, in code order.

| Col | Header | Source |
|---|---|---|
| A | `Step` | 1-based index |
| B | `Group (filters panel header)` | `group.group` |
| C | `Suggestions panel header` | `group.label` |
| D | `# Attrs` | count |
| E | `Attributes` | the group's attribute labels joined with ` · ` |

**The B/C split is AC #2's "which labels we are actually using".** It is real: the Shipments
filters panel renders `group.group` as its section header
(`ShipmentsFiltersView.jsx` → `<SectionHeader>{group.group}</SectionHeader>`) while the
suggestions panel renders `group.label` as its section title
(`search/shipments/adapter.js` → `sections.push({ title: group.label, items })`, and
`search/orders/adapter.js` does the same). Do not collapse the two columns.

### 3. `Attributes`
One row per attribute, in progression order, then the not-built rows appended after the
implemented ones.

| Col | Header | Source |
|---|---|---|
| A | `#` | 1-based, implemented rows only; blank for not-built rows |
| B | `Group` | `attr.group` |
| C | `Suggestions panel header` | the owning group's `label` |
| D | `Attribute (bar label)` | `attr.label` |
| E | `dataKey` | `attr.dataKey` |
| F | `Match` | `attr.match` |
| G | `Exact?` | `Yes` when `attr.exact`, else blank |
| H | `Enum values` | `attr.values.join(' · ')` when present, else blank |
| I | `Example (seeded)` | prose sidecar (real seeded values — listed below) |
| J | `Panel control` | derived (see "Panel control derivation") |
| K | `Panel label` | derived |
| L | `Free-text` | `Yes` when the dataKey is in the domain's free-text key list |
| M | `Status` | `Implemented` · `Proposed — not built` · `Skipped` |
| N | `Description` | prose sidecar |
| O | `Notes` | prose sidecar |

### 4. `Match Types`
`Match` | `Behaviour` | `Applies to`. Identical wording in both workbooks — the match
vocabulary is domain-agnostic (`search/criteria-core.js`). `Applies to` is per-domain and
computed: the attribute labels in that domain carrying that match type. Rows: `both`,
`letters`, `digits`, `date`, `enum`. Behaviour text comes from `prose.json → matchTypes`
(shared, one copy).

### 5. `Panel Filters`
The FILTERS PANEL vocabulary, which is a different thing from the bar in Orders and the same
thing in Shipments — say so in the sheet's own header note row.

Columns: `Filter (panel label)` | `Control` | `Request param` | `Scope` | `Notes`.

- **Orders** — from `ORDERS_FILTER_ATTRS` in `src/search/orders/registry.js`: 13 fields, every
  field on every tab since ORD-23. `Scope` = `All tabs`.
- **Shipments** — the panel is built from `SHIPMENTS_PROGRESSION` itself
  (`ShipmentsFiltersView.jsx` imports it directly), so every one of the 27 attributes is a
  panel field. `Scope` = `All` (the panel's only non-saved tab). `Request param` = `attr.key`.

### 6. `Not Implemented`
The record of what was proposed and is NOT in the deployed app. Columns:
`Attribute` | `Proposed group` | `Source` | `Status` | `Why not built / what replaced it`.
Rows from `prose.json → notBuilt[domain]`.

This sheet is why AC #2 does not destroy information: the stakeholder proposal stays visible,
it just stops masquerading as implemented.

### 7. `Open Questions`
`Topic` | `The conflict` | `Consequence` | `Owner` | `Impact`. Rows from
`prose.json → openQuestions[domain]`.

## Styling — one function, both workbooks

Mirror the existing story pack (`docs/story-packs/orders-search-progression-2026-09-04.xlsx`),
which is the house style:

- Header row: fill `1F3864` solid, font bold, size 10, color `FFFFFF`, `wrap_text=True`,
  vertical `center`.
- Body: size 10, `wrap_text=True`, vertical `top`.
- `freeze_panes='A2'` on every sheet.
- Per-sheet column widths — set them explicitly; never leave a prose column at default width.
- `ws.auto_filter.ref = ws.dimensions` on `Attributes` and `Panel Filters` only.

**Status coloring** (the `Attributes` sheet's `Status` column AND the `Not Implemented`
sheet's), so "what is actually on Vercel" is readable at a glance:

| Status | Fill | Font |
|---|---|---|
| `Implemented` | `E2EFDA` | `375623` |
| `Proposed — not built` | `FFF2CC` | `7F6000` |
| `Skipped` | `EDEDED` | `595959` |

Group banding on `Attributes`: fill column B `F2F2F2` on alternate GROUPS (not alternate rows)
so a group reads as one block. Same rule in both workbooks.

## Panel control derivation

**Orders** — read it off the registry field's `control`, and use the registry's `label` for
`Panel label`. An attribute with no registry counterpart gets `— none` / blank. There are
seven of those: Equipment, Ship Direction, Freight Terms, Order Source, Hazardous,
Gross Weight, Volume.

**Shipments** — the panel is generated from the progression, so derive from `attr.match`
exactly as `ShipmentsFiltersView.renderControl` does:

| `match` | Panel control |
|---|---|
| `enum` | `enum chips (multi-select)` |
| `letters` | `combobox (typable, lazy in live)` |
| `date` | `date picker + date range` |
| anything else (`digits`, `both`) | `text field` |

`Panel label` = `attr.label` for Shipments (same catalog), except `date` attributes which also
render a second field labelled `<label> Range`. Put that in the Notes column, not the label.

## The code truth — assert these, do not retype them

The generator reads all of this from the modules. It is recorded here so a wrong number is
caught in review.

- **Shipments: 27 attributes in 10 groups.** Identifiers 6 · Customers & Parties 4 ·
  Route & Geography 2 · Schedule & Appointments 2 · Transport & Equipment 4 ·
  Carrier & Tender Status 3 · Classification 2 · Cargo & Handling 1 · Rates & Costs 1 ·
  Load Details 2.
- **Orders: 20 attributes in 9 groups.** Order Identifiers 1 · Customers & Parties 1 ·
  Route & Geography 2 · Schedule & Appointments 2 · Transport & Equipment 3 ·
  Order Status & Source 4 · Classification 1 · Cargo & Handling 2 · Created & Edited 4.
- **Orders panel: 13 fields.**
- Enum catalogs (from `apps/odyssey-one/tools/data-pools.mjs` and
  `search/orders/registry.js`):
  - `MODES` = TL · LTL · RR · IMD · AIR
  - `EQUIPMENT_CODES` = LTL · LTR · LTH · TL · TLR · TLH · TT · TLF · LCL · FCL · RR (11)
  - Tender Status = Sent · Accepted · Declined · Cancelled
  - Shipment Status = Review · Done
  - Shipment Type = Direct · Consolidation (LINX-11597)
  - Planning Type = RDD · SSD (LINX-12902)
  - `ORDER_STATUS_VALUES` (8) = Draft · Ready for Planning · Planned Load · Planned Shipment ·
    Planning Failed · Shipment Failed · Hold · Cancelled
  - `DRAFT_ORDER_STATUS_VALUES` (3) = Error · Complete · Purge  ← `Ready` is GONE (LINX-16391)
  - Ship Direction = Outbound · Inbound · Freight Terms = Pre-Paid · Collect · Pre-Paid/Add ·
    Third Party · No Charge
- **Shipments free-text keys** (`search/shipments/criteria.js` → `FREE_TEXT_KEYS`):
  buyShipment, sellShipment, customerId, customerName, origin, destination, scac, orders, pro,
  load, equipment, seal, consignor, consignee, pickupNumbers. Import the list; do not retype.
  Orders has no equivalent export — put `n/a` in the `Free-text` column for every Orders row
  and say why in the README (Orders' bar matches across all 20 attributes; there is no
  restricted free-text subset).

## Seeded examples for the `Example (seeded)` column

Real values, pulled this session from `src/data/shipments.json` (2,200 rows) and the projected
`orders.json` (5,077 rows). Put them in `prose.json`; do not re-derive at generate time (a
reseed would churn every sheet).

**Shipments:** buyShipment `11852604` · sellShipment `25969909` · orders `0000000091000` ·
orderCount `1` · pro `441275` · pickupNumbers `PU-929686` · customerId `WEYERH_01` ·
customerName `Weyerhaeuser Company` · consignor `G2O TECH SOLUTIONS` ·
consignee `SOLVAY CHEMICALS PL` · origin `Bastrop LA US 71202` ·
destination `Green River WY US 82935` · pickupDate `06/05/2026 12:30 CDT` ·
deliveryDate `06/07/2026 12:30 CDT` · mode `LTL` · equipmentCode `LTH` · equipment `4575` ·
seal `S447972` · scac `XPOL` · tenderStatus `Sent` · shipmentStatus `Done` ·
shipmentType `Direct` · planningType `SSD` · grossWeight `6129` · apFreightCost `4,624.99` ·
load `23492` · loadCount `1`

**Orders:** keep the examples already in
`vault/10-domains/orders/data/attributes-progression-grouping.csv` and
`vault/10-domains/orders/orders-search-progression.md` §8 — they are real seeded values.
Order Status example is `Planned Load`; Validation Status `Complete`; Errors Count `1`.

## Prose sidecar content

Seed `Description` and `Notes` from the two existing CSVs, which already carry good prose:

- `vault/10-domains/shipments/data/attributes-progression-grouping.csv` — the stakeholder sheet's
  Description/Notes per attribute. Carry them over VERBATIM for attributes that still exist.
- `vault/10-domains/orders/data/attributes-progression-grouping.csv` — same, and its Notes are
  already long-form and current (they carry the S145 rulings). Keep them.

For the Shipments attributes the stakeholder sheet never had, write the Notes from the code
comments, which state the reasoning:

- **Order Count** — new; not in the stakeholder proposal. `exact: true`: "Order Count: 2" must
  not match a count of 12.
- **Pickup #** — **NOW IMPLEMENTED** (was `Pickup # (skipped)` in the stakeholder sheet).
  An ORDER-header reference copied to the load, so a shipment carries N of them, which is why
  it could not be found as a shipment column (D3, R2-2). Added to free-text in S104 (R2-2):
  the customer's own pickup reference is a prime paste. **This is AC #2's named example — the
  `Status` cell must read `Implemented` and the Notes must say it was previously skipped.**
- **Classification group** — new since S108. Shipment Type = Direct (1 mapped order) vs
  Consolidation (>1), LINX-11597 verbatim. Planning Type = RDD if ANY mapped order is RDD, else
  SSD, LINX-12902 verbatim. Deliberately NOT promoted to the top of the progression: prime
  empty-input suggestion slots belong to high-selectivity needles, and a 2-value enum matches
  about half the table.
- **Every enum is `exact`** since S130: a substring match over a fixed catalog is never what
  the user meant — "Mode: TL" was matching every LTL shipment.

### `notBuilt.shipments` — proposed in the stakeholder sheet, NOT in the app (22 rows)

Source for all of these: `stakeholder grouping, 2026-05`. Status `Proposed — not built` except
the two marked `Skipped`, which the stakeholder sheet itself marked skipped.

- Route & Geography: `Distance`, `Stops`, `Ship Direction`
- Schedule & Appointments: `Earliest Pickup Date`, `Latest Pickup Date`,
  `Earliest Delivery Date`, `Latest Delivery Date` — the app ships `Pickup Date` /
  `Delivery Date` only; the four order-derived min/max variants were not built.
- Transport & Equipment: `Incoterm Info`, `Freight Terms`
- Cargo & Handling: `Net Weight`, `Tare Weight`, `Pkg Count`, `Hazardous (Y/N)` — the app
  ships `Gross Weight` only.
- Rates & Costs: `Preferred AP Direct Cost`, `AR Freight Cost`, `Preferred AR Direct Cost` —
  the app ships `AP Freight Cost` only.
- Load Details: `Load Status`
- Advanced / Rare Fields: `Shipment Type (Pooling · Cross customer · Line haul · Rule 11)`,
  `Shipment Sequence Leg`, `Next Shipment ID`. **Flag the name collision explicitly**: the
  implemented `Shipment Type` is a DIFFERENT attribute with a different catalog
  (Direct/Consolidation, LINX-11597). Whoever reads only the stakeholder sheet will assume the
  Pooling/Rule 11 catalog shipped. It did not.
- `Validation Message` — `Skipped` (stakeholder sheet's own marking).
- `SCAC - Tender Status` (combined) — `Skipped`; the stakeholder split produced the two
  separate `SCAC` and `Tender Status` attributes the app implements.

### `notBuilt.orders` — row fields deliberately excluded (4 rows)

Orders' progression is column-derived, so there is no stakeholder proposal to reconcile. What
the sheet should record is the fields that exist on the row and are deliberately NOT
searchable, because `progression.test.js` enforces "nothing that is not a column":
`poNumber`, `commodity`, `planningDateType`, and the `earliest*` timestamps.
Status `Proposed — not built`; Why: on the row but on no grid — adding one means adding a
column, an attribute and an `orderSearchRow` field together.

### `openQuestions`

- **Orders** — carry over the existing story pack's `Open Questions` sheet rows
  (`docs/story-packs/orders-search-progression-2026-09-04.xlsx`), plus the location naming
  conflict from `orders-search-progression.md` §7: the panel filters `origin`/`destination` as
  City|State|Country triples and labels them `Origin City, State, Country`, while the column
  and the bar say `Shipper Location` / `Destination Location` and match the flattened string
  WITH the facility name. Owner Ramesh / Orders.
- **Shipments** — write these three:
  1. `Stakeholder attributes not built` — 22 proposed attributes are not in the app (sheet 6).
     Consequence: the stakeholder sheet reads as a spec; it is a proposal. Owner: Jana /
     Shipments. Impact: scope.
  2. `Shipment Type name collision` — as above. Owner: Jana / Shipments. Impact: correctness of
     the stakeholder sheet.
  3. `Panel and bar share one catalog` — Shipments' filters panel is generated from the
     progression, so every attribute is both a bar attribute and a panel field. Orders has two
     catalogs (progression + registry). Consequence: a new Shipments attribute appears in the
     panel automatically; a new Orders attribute does not. Owner: Manuela / design system.
     Impact: know which model a new field lands in.

## Verification before reporting done

1. `npm run progression:sheets` completes with no error.
2. `npm run progression:audit` prints `ok` for all four files and exits 0.
3. Re-open both workbooks with openpyxl and print, for each: sheet names in order, row counts,
   and the header fill of A1. Paste that output in your report.
4. Assert and report: Shipments `Attributes` sheet has 27 implemented rows + 22 not-built;
   Orders has 20 + 4. Shipments `Progression` 10 rows; Orders 9. Orders `Panel Filters` 13
   rows; Shipments 27.
5. Assert and report: the `Pickup #` row exists in the Shipments `Attributes` sheet, its
   `Status` is `Implemented`, and the string `skipped` appears in its Notes.
6. `git status --short` — confirm you changed ONLY the files this spec names, and that nothing
   under `apps/odyssey-one/src/` is touched.
