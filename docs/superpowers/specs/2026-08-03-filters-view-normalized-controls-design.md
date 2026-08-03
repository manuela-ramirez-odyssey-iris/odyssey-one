# Filters view — normalized controls (S107)

**Date:** 2026-08-03 · **Status:** approved (user, this session) · **Scope:** `apps/odyssey-one/src/components/global-search/ShipmentsFiltersView.jsx` + shipments search adapter

Replace the S106 prototype stubs in the GlobalSearch Filters view with existing
normalized `@odyssey/ui` components. App-local view (GlobalSearch v1 skips
normalization until the API stabilizes — `project_global_search_no_normalize_v1`).
No new library components, no Figma work.

## Control mapping (by `match` type in `SHIPMENTS_PROGRESSION`)

| match | Old control | New control |
|---|---|---|
| `letters` | dead `DropdownStub` button | **ComboBox** (`variant='select'`, typable) fed by `loadOptions` → new adapter method `getAttributeValues(dataKey, query)` |
| `digits` / `both` | raw `<input>` | **FormField** |
| `date` | 2× native `<input type=date>` | **DatePicker ×2 per attribute**: single ("Pickup Date") + range ("Pickup Date Range"), `format='MM/DD/YYYY'` — mirrors the search bar's plain + Range chip pairing (user ruling, this session) |
| `enum` | single-select prototype chips | same chips, **multi-select** — value packed as comma list (`"TL,LTL"`) |

## Key decisions

1. **ComboBox data source (D1).** `getAttributeValues(dataKey, query)` on the
   shipments adapter. Mock: prefix matches from the existing `searchIndex.js`
   distinct-values cache (capped 50). Live: returns `[]` — honest free-text
   degradation, same class as the per-needle validation endpoint carry-forward
   (S106). Free-typed text is a legal filter value (`onChange`); a pick commits
   via `onSelect`.
2. **Multi-enum = GS-12 IN-list, no new chip kind (D2).** `tokenizeChipValue`
   already splits committed `queryValue` on commas as an IN-list, and the live
   server has handled in-chip IN-lists since S105 — so `mergeFiltersIntoChips`,
   saved-profile parsing, and both search backends work unchanged. Only
   `EnumChips` changes: toggle membership in the comma list.
3. **Date filter state splits per control (D3).** Filters keys become
   `<key>` (single, ISO date) and `<key>-range` (ISO `"from|to"`).
   Inbound: chip `single:true` → single control, else range control.
   Outbound: single control → `kind:'date-range', single:true` chip
   (`date-<key>`); range control → range chip (`date-range-<key>`), as today.
4. **Field labels** stay rendered by the view's `FieldLabel` (uniform layout
   across control types); ComboBox/FormField/DatePicker render label-less.

## Testing

- `chipsToFilters.test.js`: multi-enum round-trip (chips ⇄ comma value),
  single-date vs range-date routing both directions.
- `getAttributeValues` unit test (prefix match, cap, unknown key → []).
- Component internals already covered by their own suites.

## Out of scope

Saved-tab persistence / drag-reorder / Save Filter modal · FilterChip master
(Efrain) · live values endpoint · later audit may REMOVE some text-input
filters entirely (user, this session) — build lean.
