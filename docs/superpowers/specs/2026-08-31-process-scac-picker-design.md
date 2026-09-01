# Process SCAC picker — design (LINX-15075 / 15076 / 15077)

**Date:** 2026-08-31 · **Status:** approved for build · **Epic:** LINX-5921 Tender Process

## What this is

Routing produces the **Routing Options** (tender) list. Carriers routing rejects fall into
**Dropped Carriers** below it. **Process SCAC** means *"put that carrier in my list anyway"* —
a planner overrides the engine and adds a carrier as a tender option.

There are **two doorways into one flow**. Jana, 2026-08-17
(`vault/10-domains/shipments/decisions/dropped-carrier-decisions.md:191-196`):

> *"There are two ways to process SCAC. We saw from drop carrier list, and the other one is you
> will see here Process SCAC. I can select a carrier from this list… and then I can select the
> equipment."* … *"Both are same. **Steps are the same.** But in the drop carrier list, it is
> returned by routing. Here, the user is going and adding it."*

| Doorway | Story | State |
|---|---|---|
| Per-row button in Dropped Carriers | LINX-13954 | **Shipped** (S120) |
| SCAC + Equipment picker | LINX-15075/76/77 | **This spec** |

LINX-15075 *is* the `Refer Story xxxx` the 13954 AC red-flagged and the 13954 plan scoped out as
*"Jana owns that story and it does not exist yet."* It exists now.

## Source of truth

- LINX-15075 — picker, validation, insertion (UI)
- LINX-15076 — routing call + result (mostly backend)
- LINX-15077 — lock, focus, audit, errors
- LINX-13397 §12/§13/§14 — master-data lookups. **§12/§13 supersede §1/§2 for this screen**
  (`carr_scac_id` + `carr_short_desc`, plus `carr_cd_pending_status_flag='N'`; equipment joins
  `mf_carrier_equipment` per SCAC)

## Architecture

Reuse the state machine; add a second doorway. `src/lib/processScac.js` already decides every
branch. 15075 changes only where the carrier comes from.

```
                    ┌─ DroppedCarrierSection row button   (13954, shipped)
carrier object ─────┤
                    └─ ProcessScacBar picker              (15075, new)
                              │
                              ▼
                    handleProcessScac ── lock ──▶ planProcessScac
                              │
                              ▼
                    insertRank ▶ renumber ▶ persist(high→low) ▶ highlight ▶ unlock
```

## Placement

**Revised 2026-09-01**, after the first build (`f0d8d5c`…`ac03afe`) shipped `ProcessScacBar` as a
strip above the table. User feedback: it should read as a trailing row of the table itself, not a
form bolted above it — collapsed to a single button until clicked, so "I'm bringing something to
this table" is the affordance, not a permanently-open form competing with the table for attention.

`ProcessScacBar` mounts **inside** `.tender-pane__table-card`, immediately after `RoutingTable`'s
own markup (`RoutingGuideTab.jsx` — `RoutingTable` returns/closes ~line 800):

```
tender-pane
├── pane-tabs-band                ← sub-tabs + conditional "Review Order Change"
└── pane-col--wide
    ├── tender-pane__table-card
    │   ├── RoutingTable                  (the split locked/scrollable tables)
    │   └── ProcessScacBar                ← NEW, trailing row, inside the card
    └── tender-pane__table-card   ← DroppedCarrierSection
```

**Collapsed state:** a single row-height bar, `borderTop: 1px solid var(--border-subtle)` — the
same token the table's own row dividers use, so it reads as the table's last row without being a
synced `<tr>` across the split left/right tables (it carries no per-column data, so there is
nothing to sync). Contains one `Button variant="secondary" size="sm"` labelled **`Add Carrier`**
(user ruling, 2026-09-01 — plain language for "I'm manually bringing a carrier to this list";
matches the app's existing Add-X convention).

**Expanded state**, on click, same bar space becomes, in this order:

```
[Cancel]     Select SCAC ▾     Equipment ▾     [ Process ]
                                                    ^ primary — the row's one emphasized action
```

**Revised 2026-09-01 (user ruling).** Cancel leads (ghost variant, ties off the row), fields sit
in the middle, `Process` closes it as `variant="primary"` — the only primary-variant control in
this component, since it is the row's single point of commitment. Labelled **`Process`**, not
`Process SCAC`: once SCAC + Equipment are already visible as picked fields in the same row,
restating "SCAC" in the button is redundant. The dropped-carrier doorway's own button keeps the
full `Process SCAC` name — it has no adjacent fields to lean on, so it must stand alone.

**On success:** collapses back to the button state. One carrier per click — matches the existing
`processingScac` lock, which already serializes adds to one at a time.

**The overflow:hidden clipping risk this placement raised does not exist.** `ComboBox` already
portals its open menu to `document.body` at `position: fixed`, tracking the trigger's rect
(`packages/ui/src/ComboBox.jsx:174-177`, `typeaheadPopover`) — it was built to escape exactly this
kind of container. The picker can live inside the `overflow: hidden` card with no menu clipping.
(The first build's placement OUTSIDE the card was dodging a risk that, on inspection, ComboBox
already solves — that reasoning is superseded, not wrong at the time it was written.)

## Controls

Both are **ComboBox**, not Dropdown — the option lists are fetched/derived, and Equipment refetches
per SCAC.

| Control | Behaviour |
|---|---|
| Select SCAC | Searchable on **SCAC or Carrier Name**; option shows both. Selecting either fills the pair. |
| Equipment | Disabled until a SCAC is chosen. Options filtered to that SCAC. **Never auto-selects**, even with one option. Resets when SCAC changes. |
| Process (confirm button, primary) | Disabled unless both set, **and** disabled while `processingScac != null`. |

**SCAC with no equipment:** list renders empty, **no validation message**, button stays disabled.
This is a legitimate state (the §13 join simply returns nothing), not an error.

## Data

No carrier endpoint exists and no `mf_carrier` equivalent is seeded. **Use the catalog the app
already has.**

`src/data/master-data.js` exports a **51-entry `CARRIERS`** (LINX-8126, the order-creation SCAC
typeahead, consumed by `src/api/services/lookupService.ts`), shaped
`{ scac, name, mode: 'TL' | 'LTL' }`. That is this app's TMS master data for SCACs, which is exactly
what 15075 names as the source. Do not create a second carrier list.

> **Corrected 2026-08-31.** An earlier draft of this spec moved the 15-entry generator pool from
> `tools/generate.mjs` into `data-pools.mjs` and hand-mapped equipment for it. That was written
> without checking for the existing catalog; it shipped as `19782e6` and was reverted in `08448e5`.
> Nothing consumed it, and `generate-orders.mjs` never used `CARRIERS`, so the move bought nothing
> and left an alias dodging a collision with the real list.

Add to `src/data/master-data.js`, beside `CARRIERS`:

```js
// LINX-13397 §12 filters `carr_cd_pending_status_flag = 'N'`. Our stand-in for
// "not active": the catalog's own (DNU) = Do Not Use marker. 51 → 43 selectable.
export const TENDER_SCAC_OPTIONS = CARRIERS.filter((c) => !c.name.includes('(DNU)'))

// LINX-13397 §13 joins mf_carrier_equipment per SCAC. We have no such table, so
// equipment derives from the catalog's own `mode` — every carrier is covered, and
// nothing is hand-maintained per SCAC.
const MODE_EQUIPMENT = {
  TL:  ['TL', 'TLR', 'TLH', 'TT', 'TLF'],
  LTL: ['LTL', 'LTR', 'LTH'],
}

// PS2 — a carrier with no ACTIVE equipment rows is a real state in §13, and
// 15075 specifies UI for it. Without one seeded, that branch is unreachable.
const SCACS_WITHOUT_EQUIPMENT = ['WERN']

export function equipmentForScac(scac) {
  if (SCACS_WITHOUT_EQUIPMENT.includes(scac)) return []
  const carrier = CARRIERS.find((c) => c.scac === scac)
  return carrier ? (MODE_EQUIPMENT[carrier.mode] ?? []) : []
}
```

Equipment codes must come from the existing `EQUIPMENT_CODES` / `EQUIPMENT_LABELS` vocabulary —
`master-data.js` already imports both. Labels render as `CODE — Label` (e.g. `TLR — Refrigerated
Box Trailer`).

**No changes to `tools/`.** No regen, no Neon reseed.

## Rank insertion — supersedes plan decision D3

15075: insert at the **bottom of the matching Equipment group**; if no group matches, bottom of the
list. Carriers above keep their rank; the inserted row and everything below renumber.

```
BEFORE                ADD: DDDD / TL          AFTER
1  AAAA  TL                                   1  AAAA  TL
2  BBBB  TL                                   2  BBBB  TL
3  CCCC  LTL                                  3  DDDD  TL    ← bottom of the TL run
                                              4  CCCC  LTL   ← renumbered 3 → 4
```

"Equipment group" means **a contiguous run of rows sharing an equipment value** in the flat list —
15075's own example list is flat and still inserts mid-list. The 13954 plan's D3 reasoned this away
as *"our tender list is flat, so the AC's fallback applies verbatim."* That reading does not
survive 15075's example. **D3 is superseded.**

`nextRank()` → `insertRank()`, swapped at **both** call sites. One rule, both doorways — not a
second rank function that drifts.

**Persistence order is the whole trick.** The write is addressed `WHERE rank = $8`
(`api/_lib/shipments.mjs`), so shifting a row onto an occupied rank would clobber it. Write
affected rows **highest rank first** — each destination is vacated before it is written. No API
change, no migration.

## Failure paths — the two doorways diverge here

13954 and 15076 are **not** identical on failure, despite *"both are same."*

| | Dropped-carrier doorway (13954) | Picker doorway (15076) |
|---|---|---|
| Routing fails | Opens `ManualDatesModal`, user types Pickup/Delivery | **No modal.** Dates stay blank |
| Message | *(rating notice)* | *"Routing could not be completed for the selected carrier. The carrier has been added to the Routing Options list."* |
| Recovery | — | `Call Routing` on that row; failed-routing indicator on the SCAC |

15076's AC never mentions manual date entry, and its failure message (*"has been added"*) only makes
sense if nothing interrupted to collect dates. **Built per 15076: the picker does not open
`ManualDatesModal`.** Flagged for Jana — he described one flow, and this is the seam.

## Decisions that are ours, not the ticket's

Annotate each in code so a later reader does not mistake it for spec.

- **PS1 — D3 superseded; group-aware insertion at both doorways.** Persist highest-rank-first.
- **PS2 — `WERN` has no equipment.** Otherwise 15075's empty-equipment rule ships against a screen
  that can never show it. One entry in `SCACS_WITHOUT_EQUIPMENT`, deleted when a real
  `mf_carrier_equipment` exists.
- **PS3 — manual carriers route successfully unless their SCAC is in `ROUTING_FAILS`.** Set it to
  `['EXLA']`. A picked carrier has no `dropCode`, so `planProcessScac`'s existing simulation would
  always succeed and 15076's failure branch + 15077's indicator would be unreachable. Deterministic,
  repeatable, one line to delete when real routing lands. `ROUTING_FAILS` lives in
  `src/lib/processScac.js` beside the other simulation code — it is a prototype knob, **not** master
  data, and keeping it there avoids a dependency from the lib onto the seed pools.
- **PS4 — audit logging still not built** (extends D5). No table, no endpoint. Known gap.

## States

| State | Behaviour |
|---|---|
| No SCAC | Equipment disabled, button disabled |
| SCAC with no equipment | Empty list, no message, button disabled |
| Both set | Button enabled |
| In flight | Picker button **and every** dropped-carrier button disabled — shared `processingScac`, so the doorways cannot race |
| Duplicate SCAC+Equipment | OK-only notice. **Dropped Carriers excluded** from the check (`isDuplicate` reads `options` only — already correct) |
| Routing OK | Row inserted at its group position, success `Alert`, auto-dismiss 3s |
| Routing failed | Row inserted with blank rank/dates/cost, failure message, `Call Routing` available |
| System error | Row rolled back, OK-only notice, retry available |

Route Rank and RPC-ID land **empty** — Jana's explicit ruling for the from-scratch branch.

After success, focus stays in the Tender tab and the new row is highlighted (`setHighlightedRank`)
— LINX-15077 Focus Management.

## Files

| File | Action |
|---|---|
| `src/data/master-data.js` | Add `TENDER_SCAC_OPTIONS` + `equipmentForScac()` beside the existing `CARRIERS` |
| `src/lib/processScac.js` | ✅ done (`3ffd8e6`) — `insertRank`, `ROUTING_FAILS`, manual-carrier branch |
| `src/lib/processScac.test.js` | Extend |
| `src/components/detail/ProcessScacBar.jsx` | **New** — presentational |
| `src/components/detail/ProcessScacBar.test.jsx` | **New** |
| `src/components/detail/RoutingGuideTab.jsx` | Mount the bar, own picker state, swap `nextRank`→`insertRank` |
| `src/components/detail/RoutingGuideTab.test.jsx` | Extend |
| `vault/10-domains/shipments/decisions/dropped-carrier-decisions.md` | Record PS1–PS4, mark D3 superseded |

`DroppedCarrierSection.jsx` is **not** modified.

## Testing

- `processScac.test.js` — `insertRank` group found / no match / empty list / single group /
  duplicate equipment runs; renumber write ordering; manual-carrier planning.
- `ProcessScacBar.test.jsx` — dependent enablement, empty-equipment branch, no auto-select, reset on
  SCAC change, lock.
- `RoutingGuideTab.test.jsx` — insert-at-position end to end, duplicate refusal, shared lock across
  both doorways.
- **Browser check is mandatory.** jsdom cannot see ComboBox menu clipping, strip crowding, or
  survival at the bottom bar's `partial` stage. S121/122/123 each shipped something green in jsdom
  and wrong on screen.

## Scope

**In:** the picker; group-aware insertion at both doorways; 15076 success/failure messaging;
15077 lock, focus, failed-routing indicator.

**Out:** audit logging (PS4); a real carrier/equipment API; Figma (no new `@odyssey/ui` component,
so no `/normalize` gate — flag the strip to Efrain once it is on screen).

## Open for Jana

1. **Failure-path divergence** — does the picker inherit `ManualDatesModal`, or is 15076's
   blank-and-retry correct? Built per 15076.
2. **Can the picker add a SCAC that is currently sitting in Dropped Carriers?** The duplicate rule
   excludes that section, which implies yes. Confirm.
3. **Carrier short name vs long name** — §12 says `carr_short_desc`, §2 says `carr_long_name`.
   Using short.
