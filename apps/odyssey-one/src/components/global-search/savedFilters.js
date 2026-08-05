import { SHIPMENTS_PROGRESSION } from '../../search/shipments/progression'

/**
 * savedFilters — pure persistence shape for Save Filters (S108 spec rev 4,
 * "Data model" + "Testing"). No React: `ShipmentsGlobalSearch` is the only
 * caller, and it pairs every write with a `setQueryData` (see that file for
 * why — `useUserPreference`'s `save()` never seeds the query cache).
 *
 * Stored shape: `{ v: 1, custom: [ { id, name, chips } ] }` — array position
 * IS the order; there is no separate `position` field (spec, "Data model").
 */

// Every attribute key the search vocabulary currently knows about — used by
// `hydrate` to drop chips whose attribute has since been removed, so a stale
// filter can't silently apply as 0 results (spec, "Chip rules").
const KNOWN_ATTR_KEYS = new Set(
  SHIPMENTS_PROGRESSION.flatMap((g) => g.attributes.map((a) => a.key)),
)

// The attribute key a chip resolves to. Mirrors `chipFilterKey`'s inverse
// mapping in ShipmentsFiltersView.jsx (same regex): a date chip's `key` is
// `date-<attrKey>` (single) or `date-range-<attrKey>` (range); every other
// chip's `key` IS the attribute key already.
const attrKeyForChip = (chip) =>
  chip.kind === 'date-range' ? chip.key.replace(/^date(-range)?-/, '') : chip.key

// Strip transient UI-only fields — the EXACT field list `chipsSearchKey` uses
// (useGlobalSearch.js) so the two can't drift. A saved date chip carrying
// `open: true` would reopen its CalendarPicker under the bar on hydrate;
// `monthHint` is calendar-navigation state, not search criteria.
export function stripChip(chip) {
  const { open, monthHint, ...rest } = chip
  return rest
}

// Chips persisted at save time: stripped of transient fields, and `invalid`
// chips (an unfinished/malformed date, e.g. "40/") dropped — there is nothing
// useful to re-apply later.
export function toStored(chips) {
  return chips.filter((c) => !c.invalid).map(stripChip)
}

export function newFilter(name, chips) {
  return { id: crypto.randomUUID(), name, chips: toStored(chips) }
}

// A stored/committed chip list may carry ONE free-text/set query-badge entry
// (`key: '__free-text__'`) folded in by `barChips` at save time (spec
// "Behaviour" 1 — excluding it would silently save nothing for a pasted
// multi-code search). `useGlobalSearch` keeps that entry OUT of its `chips`
// array on purpose (`onTextCommit`/`onSetCommit`: no `dataKey`/`queryValue`,
// it's not an attribute criterion) — feeding it back into `searchShipments`'s
// `chips` list or `applyChips`'s `chips` state like a normal AND'd chip would
// make `matchesChip` reject it on EVERY row (no `dataKey` to read), zeroing
// the count. Both S108 1e (counting) and 1e (applying) need the split: real
// chips go where chips go, the free-text entry's `.value` goes wherever the
// consumer keeps free text (the adapter's `query` arg / the hook's `textChip`).
export function splitFreeText(chips) {
  const freeText = chips.find((c) => c.key === '__free-text__') || null
  return { chips: chips.filter((c) => c.key !== '__free-text__'), freeText }
}

// ── Odyssey defaults (S108 Phase 2, still no DB — code constants, mirroring
// how `PRESETS.odyssey` ships for column presets in ColumnPanel.jsx) ────────
//
// ⚠ INVENTED — no canon defines these. GS-24 BUG (2026-08-05): the original
// picks — Mode: TL, Tender Status: Sent — verified only against
// SHIPMENTS_PROGRESSION (the CLIENT vocabulary), which is NOT the whole
// story. Live search routes through a SEPARATE server-side registry
// (api/_lib/search-registry.mjs SHIPMENTS_ATTRS) that only indexes a subset
// of attributes into `search_index`; `mode`/`tender-status` aren't in it, so
// `validChips` (api/_lib/search.mjs) silently dropped both chips, leaving
// nothing to search on, and `buildHits` fell to its honest-empty branch —
// both shipped defaults returned 0 results in live mode despite working fine
// against the mock adapter. THE RULE, so this doesn't happen again: a
// default's attribute key must exist in BOTH vocabularies — check it against
// api/_lib/search-registry.mjs's SHIPMENTS_ATTRS keys AND SHIPMENTS_PROGRESSION
// (progression.js) before shipping it here. Neither list alone is sufficient;
// the client builds the chip, the server matches it, and either one missing
// the key silently zeroes the result the same way this bug did.
//
// Current picks — both keys confirmed in SHIPMENTS_ATTRS (registry, `scac` /
// `origin`) AND SHIPMENTS_PROGRESSION (client, same keys, `match: 'letters'`)
// — plus real, non-zero, MEASURED values from the generated mock dataset
// (savedFilters.test.js asserts `total > 0` against the real mock adapter for
// each, so a future dataset reseed that drops these values fails the suite
// instead of shipping silently broken again):
//   SCAC: SEFL   — Southeastern Freight Lines, one of the 15 CARRIERS
//                  (tools/generate.mjs) drawn near-uniformly per shipment;
//                  166/2200 mock rows carry it.
//   Origin: Houston — one of the 30 LOCATIONS (tools/data-pools.mjs) drawn
//                  near-uniformly as shipment origin; stored as
//                  "HOUSTON TX US 77001" (generate.mjs's `origin` field) —
//                  the chip's substring match ("Houston") doesn't need the
//                  full "City, ST" format, only to appear IN that string;
//                  95/2200 mock rows carry it.
// Both are genuinely useful planner lenses (carrier-scoped and lane-origin-
// scoped worklists) and replace the old status-based picks, which have no
// substitute in the registry (no enum/status attribute is projected — see
// search.mjs's "deviation 2" comment). Flagged for a decision-log entry
// (GS-24) and to raise with Jana (Shipments PM) before this reaches a demo —
// still a guess at useful defaults, not sourced from any transcript or Jira
// ticket.
const attrByKey = new Map(
  SHIPMENTS_PROGRESSION.flatMap((g) => g.attributes.map((a) => [a.key, { ...a, group: g.group }])),
)
// Builds a `kind: 'attribute'` chip in the EXACT shape `mergeFiltersIntoChips`
// produces (ShipmentsFiltersView.jsx's non-date branch) — so applying a
// default takes the IDENTICAL code path (`onApplySaved` → `applyChips`
// wholesale) as applying a custom filter; nothing downstream can tell the
// difference.
function attrChip(key, value) {
  const attr = attrByKey.get(key)
  return {
    key, label: `${attr.label}: ${value}`, attrLabel: attr.label, queryValue: value,
    dataKey: attr.dataKey, group: attr.group, ...(attr.exact && { exact: true }), kind: 'attribute',
  }
}

// Stable ids — `odyssey-` prefixed so they can never collide with a
// `crypto.randomUUID()` custom-filter id (spec, "Data model": `id =
// crypto.randomUUID()` for Custom; UUIDs never start with a bare word).
// Fixed array order = fixed display order (spec "Behaviour" 2: "nobody drags
// inside it").
export const ODYSSEY_DEFAULT_FILTERS = [
  { id: 'odyssey-scac-sefl', name: 'SEFL Carrier', chips: [attrChip('scac', 'SEFL')] },
  { id: 'odyssey-origin-houston', name: 'Ex-Houston', chips: [attrChip('origin', 'Houston')] },
]

// Raw preference value → `{ v: 1, custom: [...] }`. Tolerates null/undefined/
// garbage input (empty list). The free-text chip (`key: '__free-text__'`, no
// attribute — see useGlobalSearch.js) always survives; every other chip is
// dropped if its attribute no longer exists in SHIPMENTS_PROGRESSION.
export function hydrate(stored) {
  const custom = Array.isArray(stored?.custom) ? stored.custom : []
  return {
    v: 1,
    custom: custom.map((f) => ({
      ...f,
      chips: (Array.isArray(f?.chips) ? f.chips : []).filter(
        (c) => c && (c.key === '__free-text__' || KNOWN_ATTR_KEYS.has(attrKeyForChip(c))),
      ),
    })),
  }
}
