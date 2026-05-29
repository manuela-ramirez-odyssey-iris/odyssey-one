---
title: GlobalSearch — Attribute Schema Contract
domain: cross-cutting
type: spec
tags: [global-search, schema, attributes, contract]
status: draft
date: 2026-05-28
---

# GlobalSearch — Attribute Schema Contract

The shape every consuming domain provides so GlobalSearch can render against its data. This is the **contract**, not the data — each domain ships its own attributes file matching this shape.

> **Draft.** Final shape will lock once the Shipments v1 implementation validates it. Shipments is the v1 target; Tracking will validate the cross-domain reuse when that domain is built.

## Working shape (proposed, subject to revision)

```ts
type GlobalSearchAttribute = {
  key: string                    // stable identifier — used by query model + saved-filter conditions
  label: string                  // user-facing label rendered on chips and filter panel
  progressionTier: 1..10         // intent group (see canon's progression model)
  stakeholderGroup: string       // human label for the tier ("Customers & Parties", etc.)
  type: 'text' | 'number-text' | 'dropdown' | 'date-range' | 'numeric-range' | 'toggle' | 'duration-shortcut' | 'location'
  dataKey: string                // path into the domain's row object
  values?: string[]              // for type='dropdown' or 'duration-shortcut' — enum or dynamically derived
  locked?: boolean               // always visible in the filter panel (cannot be hidden)
  hidden?: boolean               // hidden by default; revealed under "More filters"
  multiValue?: boolean           // GS-12 — true means attribute remains in Suggested Filters after chip applied
  valueOverlapsWith?: string[]   // GS-05 — list of attribute keys whose values could legitimately match this attribute's value
  fieldType?: string             // Figma input-control mapping (Text/Number Input, Date Range Picker, etc.)
  defaultValue?: unknown         // silent default (e.g. Last Days: 30 Days); counted in badge but not chipped until user changes
  // ... TBD as design firms up
}

type GlobalSearchSchema = GlobalSearchAttribute[]
```

### Field additions captured 2026-05-28

- **`multiValue`** — added to back GS-12. Origin and Destination are multi-value for v1 (frame 237 shows both remaining in Suggested Filters after Origin chip applied; frame 217b same for Destination). Status / Carrier / Customer / Equipment / Last Days / Pickup Date Range / Delivery Date Range are single-value (drop out after chip — frame 216 shows Status removed after `Status: Delivered`).
- **`valueOverlapsWith`** — added to back GS-05. `Origin` value-overlaps-with `Destination` and vice versa. `Status`, `Client`, `Carrier` all overlap on the substring `del` (frame 213 — typing `del` surfaces options from all three). The schema can list which other attribute-keys to consult when computing ambiguity.
- **`defaultValue`** — added to model the silent `Last Days: 30 Days`. The attribute is in the schema with `defaultValue: '30 Days'`; it contributes to the active-conditions badge but renders as a chip only when the user explicitly sets a different value (Sc 7 frame 248).
- **`duration-shortcut` type** — distinct from `date-range` because the values are enumerated (Today / Yesterday / 7 Days / 30 Days / 60 Days / 90 Days / 180 Days / 365 Days, per frame 247), not a free calendar selection.
- **`location` type** — distinct from generic `text` because the value carries city/state/country structure (`Origin: New York, NY` vs `Origin: Sparta, NJ, US`) and feeds the value-overlap rule.

## Reference implementations

- **Shipments (v1 target)** — current shape lives at `apps/odyssey-one/src/data/index.js` as `SEARCH_ATTRIBUTES` (15 of ~55 attributes); full taxonomy in [[../../../10-domains/shipments/data/attributes-progression-grouping|attributes-progression-grouping.csv]] (56 rows incl. header). Note: current code shape is missing `progressionTier`, `stakeholderGroup`, `locked`, `hidden`, `multiValue`, `valueOverlapsWith`, `defaultValue` — these will be added during the GlobalSearch v1 build. Shipments-unique attributes that don't appear in the Tracking demo:
  - `shipmentType` — Pooling / Cross customer / Line haul / Rule 11 (dropdown)
  - `shipmentSequenceLeg` — 1 / 2 / 3 (dropdown)
  - `nextShipmentId` — pooling/Rule 11 linkage (text)
- **Tracking** — pending the Tracking domain build. Will reuse the contract.

## Gaps to close

- `progressionTier` / `stakeholderGroup` not yet in code (chips today appear in array order, not progression order).
- `locked` / `hidden` not modeled (the "More filters" expansion per [[../../../10-domains/shipments/domain-analysis|domain-analysis §11]] has nowhere to read from).
- `multiValue` / `valueOverlapsWith` / `defaultValue` (added today) not yet modeled.
- `fieldType` from the Shipments CSV (Text Input, Date Range Picker, Numeric Range, Dropdown, Toggle, Autocomplete Text, Location Search) maps to filter-panel inputs — needs corresponding Figma masters.
- Cross-customer / multi-value handling at the **value** level (e.g. `Customer ID` containing `*G20TECH_SYS_01, 2nd customer ID` separated by comma) — schema needs to flag the value as multi-valued at the *data* level, distinct from `multiValue: true` which is about *how many chips the attribute can have in the bar*. Naming TBD.

## Per-domain caveats

Each domain may need to express attribute behavior that doesn't fit the generic schema. Examples for Shipments (v1 target):

- **Default chips shown before user types** (per-domain — Shipments may want different defaults than Tracking).
- **Locked filters per panel** — Shipments Monitoring panel always shows Rank / SCAC / Carrier Name / Equipment / AP Cost / Tender Status / Pickup Date / Delivery Date (see [[../../../10-domains/shipments/domain-analysis|domain-analysis §11]]). Different panels (Exceptions / Monitoring / PGI) may lock different attributes.
- **Skipped attributes** — the CSV explicitly skips `Pickup #` and the `Validation Message` field in the current Shipments grouping — schema needs a `hidden: true` or "deferred" state to record this.
- **Three-panel cardinality** — Shipments has Exceptions / Monitoring / PGI panel types, each with its own status-categorization tabs. Tracking has one panel. GlobalSearch is unaware of this; the consuming domain's downstream view (panel tabs) handles it via GS-07 pruning.
- **Entity-hierarchy-aware results** (GS-13) — Shipments rows can be multi-stop; the result-card adapts. Schema doesn't need to know about this — the row shape itself drives the card variant.
