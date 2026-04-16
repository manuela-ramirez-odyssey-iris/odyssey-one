# Normalization Tracker

> Tracks which components have been normalized via the `/normalize` routine.
> Used by future purge routines to know what's safe vs still in legacy state.

---

## Normalized Components

| Component | File | Text Utility | Date | Notes |
|---|---|---|---|---|
| Badge | `src/components/ui/Badge.jsx` | `text-badge` | 2026-04-15 | Added `icon`, `statusDot` props. Asymmetric padding logic. Gray icon uses --text-tertiary. |

## Composite Text Utilities Created

| Utility Class | Properties | Used By | Safe to Purge? |
|---|---|---|---|
| `text-badge` | font-size: 12px; line-height: 16px; font-weight: 500 | Badge | No — Badge depends on it |

## Ad-hoc Implementations (NOT yet normalized)

These still use inline styles or local components. Do NOT purge their dependencies.

| Element | File | Blocks Purge Of | Notes |
|---|---|---|---|
| StatusBadge | `RoutingGuideTab.jsx` | inline font-size: 12px, font-weight: 600 | May need new variant (semibold weight differs) |
| TypeBadge | `DocumentsTab.jsx` | inline font-size: 12px, font-weight: 600 | Same pattern as StatusBadge |
| HazmatTag | `ProductTab.jsx` | inline rgba colors, TriangleAlert 12px | Migrate to `Badge variant="amber" icon={...}` |
| Hazmat inline | `ShipmentTable.jsx:147-163` | inline rgba colors, TriangleAlert 12px | Same as HazmatTag |
| Appointment badge | `OrderTab.jsx` | inline rgba colors, font-size: 11px | Unique size — may need new text utility |
| History action badges | `HistoryTab.jsx` | pill shape (border-radius: 9999px), font-size: 11px | Different shape — may need `pill` variant |
| Cost order tabs | `CostAllocationTab.jsx` | inline rgba BADGE_BG/TEXT maps | Interactive tabs, not pure badges |
| Tab count pills | `ShipmentTabs.jsx` | font-weight: 700, border-radius: 10px | Count indicator, different pattern |
| Notification circle | `Navbar.jsx` | #D23930, circular 20x20px | Unique element |

---

## Pending Figma Sync

Variants/props defined in code but not yet pushed to Figma. Push all at once when ready.

| Component | Variant/Prop | Description | Deferred On |
|---|---|---|---|
| Badge | `statusDot` | Animated 6x6 dot on the left side | 2026-04-15 |
| Badge | `icon` (right) | 16px icon on the right, gray uses --text-tertiary | 2026-04-15 |
| Badge | padding rules | Asymmetric/symmetric logic based on icon+dot state | 2026-04-15 |

---

## Purge Notes

When running a purge routine:
1. Read this file first
2. **SKIP** anything listed in "Ad-hoc Implementations" — those still need their inline styles
3. Only remove old patterns from components listed in "Normalized Components"
4. Check "Composite Text Utilities" — if a utility is listed, it's in use and must not be removed
