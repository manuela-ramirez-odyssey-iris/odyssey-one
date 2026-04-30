# Normalization Tracker

> Tracks which components have been normalized via the `/normalize` routine.
> Used by future purge routines to know what's safe vs still in legacy state.

---

## Normalized Components

| Component | File | Text Utility | Date | Notes |
|---|---|---|---|---|
| Badge | `packages/ui/src/Badge.jsx` | `text-badge` | 2026-04-27 | Props: `variant`, `leftIcon`, `rightIcon`, `statusDot`. Symmetric padding-per-side via `getPadding(leftIcon, rightIcon)`. Gray's icon override applies to both slots. (Original 2026-04-15: had single `icon` prop; renamed to `rightIcon` and added `leftIcon` after Figma alignment with Efrain.) |
| SidebarButton (atom) | `packages/ui/src/SidebarButton.jsx` | — | 2026-04-28 | 40×40 button with 20px icon slot. Three states: Default (transparent bg, icon `--text-tertiary`), Hover (transparent bg, icon `--text-primary`), Selected (`--deep-sea-neutral-300` bg, icon `--text-primary`). Hover and Selected share the icon color (`--text-primary` / 900) — they differ only by background, semantic-driven (2026-04-29 update). Border radius `--radius-lg`. Transitions on color via `transition-colors duration-150` (matches `--transition-fast`). Props: `state` ('default' / 'hover' / 'selected', defaults to 'default'), `icon` (React node, mirrors Badge's icon-slot pattern). Renders a `<div>` so it can be wrapped by `<a>` (NavLink) or `<button>` without invalid HTML nesting. Figma component set: `514:2479` with three variants (`Property 1=Default/Hover/Selected`) and an `Icon#580:0` `INSTANCE_SWAP` property pointing to placeholder `512:2395`. Hover variant `573:2` and Icon swap property added 2026-04-28 via `use_figma`. Code Connect mapping at `packages/ui/src/SidebarButton.figma.tsx` (publish via `npx figma connect publish` from `packages/ui/`). |
| Sidebar (organism) | `apps/odyssey-one/src/components/layout/Sidebar.jsx` (app-local) | — | 2026-04-29 | 7 items in 2 groups. Top transactional: Home (House) / Orders (ClipboardList) / Shipments (Container) / Tracking (Route). Bottom master: Carriers (Truck) / User Management (UserCog) / Partners (Handshake). 64px sidebar width, 12px uniform padding (`--spacing-3`), 8px button gap (`--spacing-2`), 24px group-separator gap (`--spacing-6`) above + below the divider, 1px solid `--deep-sea-neutral-300` border-top on the bottom group. Composes `SidebarButton` from `@odyssey/ui`. NavLink for routed items (all 6 of them); plain `<button>` for `Partners` (no route yet). Drops legacy "Settings" entry. Order follows David's 2026-04-29 grooming (transactional-vs-master framing — see `domain-documentation/domains-overview.md`). Figma component at node `597:514`; horizontal padding, button gap, and group-separator gap bound to `Spacing/3`, `Spacing/2`, `Spacing/6` Figma variables (added to `4. Sizing` collection 2026-04-29). Top padding dropped from 76px (Figma drift to clear a hypothetical fixed navbar) to 12px uniform — the navbar is a flex-column sibling in `AppShell.jsx`, no overlap. **Stays app-local** (not in `@odyssey/ui`) because it imports `react-router-dom` and depends on the app's specific routes. |

## Composite Text Utilities Created

| Utility Class | Properties | Used By | Safe to Purge? |
|---|---|---|---|
| `text-badge` | font-size: 12px; line-height: 16px; font-weight: 500 | Badge | No — Badge depends on it |

## Ad-hoc Implementations (NOT yet normalized)

These still use inline styles or local components. Do NOT purge their dependencies.

| Element | File | Blocks Purge Of | Notes |
|---|---|---|---|
| StatusBadge | `apps/odyssey-one/src/components/detail/RoutingGuideTab.jsx` | inline font-size: 12px, font-weight: 600 | May need new variant (semibold weight differs) |
| TypeBadge | `apps/odyssey-one/src/components/detail/DocumentsTab.jsx` | inline font-size: 12px, font-weight: 600 | Same pattern as StatusBadge |
| HazmatTag | `apps/odyssey-one/src/components/detail/ProductTab.jsx` | inline rgba colors, TriangleAlert 12px | Migrate to `Badge variant="amber" icon={...}` |
| Hazmat inline | `apps/odyssey-one/src/components/shipments/ShipmentTable.jsx` (grep TriangleAlert) | inline rgba colors, TriangleAlert 12px | Same as HazmatTag |
| Appointment badge | `apps/odyssey-one/src/components/detail/OrderTab.jsx` | inline rgba colors, font-size: 11px | Unique size — may need new text utility |
| History action badges | `apps/odyssey-one/src/components/detail/HistoryTab.jsx` | pill shape (border-radius: 9999px), font-size: 11px | Different shape — may need `pill` variant |
| Cost order tabs | `apps/odyssey-one/src/components/detail/CostAllocationTab.jsx` | inline rgba BADGE_BG/TEXT maps | Interactive tabs, not pure badges |
| Tab count pills | `apps/odyssey-one/src/components/shipments/ShipmentTabs.jsx` | font-weight: 700, border-radius: 10px | Count indicator, different pattern |
| Notification circle | `apps/odyssey-one/src/components/layout/Navbar.jsx` | #D23930, circular 20x20px | Unique element |

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
