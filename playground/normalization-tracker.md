# Normalization Tracker

> Tracks which components have been normalized via the `/normalize` routine.
> Used by future purge routines to know what's safe vs still in legacy state.

---

## Normalized Components

| Component | File | Text Utility | Date | Notes |
|---|---|---|---|---|
| Badge | `packages/ui/src/Badge.jsx` | `text-badge` | 2026-04-27 | Props: `variant`, `leftIcon`, `rightIcon`, `statusDot`. Symmetric padding-per-side via `getPadding(leftIcon, rightIcon)`. Gray's icon override applies to both slots. (Original 2026-04-15: had single `icon` prop; renamed to `rightIcon` and added `leftIcon` after Figma alignment with Efrain.) |

## Composite Text Utilities Created

| Utility Class | Properties | Used By | Safe to Purge? |
|---|---|---|---|
| `text-badge` | font-size: 12px; line-height: 16px; font-weight: 500 | Badge | No — Badge depends on it |

## Ad-hoc Implementations (NOT yet normalized)

These still use inline styles or local components. Do NOT purge their dependencies.

| Element | File | Blocks Purge Of | Notes |
|---|---|---|---|
| StatusBadge | `apps/shipments/src/components/detail/RoutingGuideTab.jsx` | inline font-size: 12px, font-weight: 600 | May need new variant (semibold weight differs) |
| TypeBadge | `apps/shipments/src/components/detail/DocumentsTab.jsx` | inline font-size: 12px, font-weight: 600 | Same pattern as StatusBadge |
| HazmatTag | `apps/shipments/src/components/detail/ProductTab.jsx` | inline rgba colors, TriangleAlert 12px | Migrate to `Badge variant="amber" icon={...}` |
| Hazmat inline | `apps/shipments/src/components/shipments/ShipmentTable.jsx` (grep TriangleAlert) | inline rgba colors, TriangleAlert 12px | Same as HazmatTag |
| Appointment badge | `apps/shipments/src/components/detail/OrderTab.jsx` | inline rgba colors, font-size: 11px | Unique size — may need new text utility |
| History action badges | `apps/shipments/src/components/detail/HistoryTab.jsx` | pill shape (border-radius: 9999px), font-size: 11px | Different shape — may need `pill` variant |
| Cost order tabs | `apps/shipments/src/components/detail/CostAllocationTab.jsx` | inline rgba BADGE_BG/TEXT maps | Interactive tabs, not pure badges |
| Tab count pills | `apps/shipments/src/components/shipments/ShipmentTabs.jsx` | font-weight: 700, border-radius: 10px | Count indicator, different pattern |
| Notification circle | `apps/shipments/src/components/layout/Navbar.jsx` | #D23930, circular 20x20px | Unique element |

---

## Pending Figma Sync

Variants/props defined in code but not yet pushed to Figma. Push all at once when ready.

| Component | Variant/Prop | Description | Deferred On |
|---|---|---|---|
| Badge | pulse animation on `statusDot` | CSS keyframes — not representable in Figma. Documented in component description. | 2026-04-27 |
| Badge | asymmetric padding logic | `getPadding(icon, statusDot)` returns different padding per state. Figma uses static 2px 10px symmetric — code-only behavior. | 2026-04-27 |
| Badge | gray-only icon color override | Code: gray variant icon uses `--text-tertiary`; other variants use `currentColor`. In Figma, icon is an instance-swap slot — color comes from swapped icon content, not parent. Cannot model as a single variable binding. | 2026-04-27 |

## Pushed to Figma

Components pushed back to Figma via the `/normalize` skill's Step 8 routine.

| Component | Figma File | Component Set ID | Pushed | Notes |
|---|---|---|---|---|
| Badge | Design System - MCP (`vodiHJU38YWZYmTz81uOk7`) | `213:27` | 2026-04-27 | First push — seeded 5 variable collections (85 vars). Properties: Variant (6 colors), Show dot (bool), Show right icon (bool), Right icon (instance-swap), Show left icon (bool), Left icon (instance-swap). |
| Badge — leftIcon update | same | `213:27` | 2026-04-27 | Added Left icon slot + Show left icon + Left icon properties. Renamed Show icon → Show right icon, Icon → Right icon. Showcase has 4 columns: Default / Dot / Left / Right. **Convention: never set both leftIcon and rightIcon on a single Badge.** Code permits it structurally but it's not a valid state — the showcase intentionally omits a "Both" example. |

## Icon Tracker

Lucide icons needed in the Figma library are tracked in `playground/icon-tracker.html`. Open in a browser to see pending vs done icons with their config (plugin search name, target Figma name, size, stroke). Updated by the `/normalize` routine's Step 8b whenever a normalized component touches a new icon.

---

## Purge Notes

When running a purge routine:
1. Read this file first
2. **SKIP** anything listed in "Ad-hoc Implementations" — those still need their inline styles
3. Only remove old patterns from components listed in "Normalized Components"
4. Check "Composite Text Utilities" — if a utility is listed, it's in use and must not be removed
