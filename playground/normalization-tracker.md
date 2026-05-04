# Normalization Tracker

> Tracks which components have been normalized via the `/normalize` routine.
> Used by future purge routines to know what's safe vs still in legacy state.

---

## Normalized Components

| Component | File | Text Utility | Date | Notes |
|---|---|---|---|---|
| Badge | `packages/ui/src/Badge.jsx` | `text-badge` | 2026-04-27 (extended 2026-05-04) | Props: `variant`, `leftIcon`, `rightIcon`, `statusDot`. Variants: amber, blue, green, red, purple, gray, **notification** (added 2026-05-04). The `notification` variant is a complete preset: `--bittersweet-600` bg + `--text-inverse` text + circular shape (`--radius-full`, 4px symmetric padding, min 20×20). Used for count indicators (e.g. unread notifications). Symmetric padding-per-side via `getPadding(leftIcon, rightIcon, isDot)`. Gray's icon override applies to both slots. Figma component set `213:27` has matching 7 variants (amber/blue/green/red/purple/gray/notification). |
| SidebarButton (atom) | `packages/ui/src/SidebarButton.jsx` | — | 2026-04-28 | 40×40 button with 20px icon slot. Three states: Default (transparent bg, icon `--text-tertiary`), Hover (transparent bg, icon `--text-primary`), Selected (`--deep-sea-neutral-300` bg, icon `--text-primary`). Hover and Selected share the icon color (`--text-primary` / 900) — they differ only by background, semantic-driven (2026-04-29 update). Border radius `--radius-lg`. Transitions on color via `transition-colors duration-150` (matches `--transition-fast`). Props: `state` ('default' / 'hover' / 'selected', defaults to 'default'), `icon` (React node, mirrors Badge's icon-slot pattern). Renders a `<div>` so it can be wrapped by `<a>` (NavLink) or `<button>` without invalid HTML nesting. Figma component set: `514:2479` with three variants (`Property 1=Default/Hover/Selected`) and an `Icon#580:0` `INSTANCE_SWAP` property pointing to placeholder `512:2395`. Hover variant `573:2` and Icon swap property added 2026-04-28 via `use_figma`. Code Connect mapping at `packages/ui/src/SidebarButton.figma.tsx` (publish via `npx figma connect publish` from `packages/ui/`). |
| Sidebar (organism) | `apps/odyssey-one/src/components/layout/Sidebar.jsx` (app-local) | — | 2026-04-29 | 7 items in 2 groups. Top transactional: Home (House) / Orders (ClipboardList) / Shipments (Container) / Tracking (Route). Bottom master: Carriers (Truck) / User Management (UserCog) / Partners (Handshake). 64px sidebar width, 12px uniform padding (`--spacing-3`), 8px button gap (`--spacing-2`), 24px group-separator gap (`--spacing-6`) above + below the divider, 1px solid `--deep-sea-neutral-300` border-top on the bottom group. Composes `SidebarButton` from `@odyssey/ui`. NavLink for routed items (all 6 of them); plain `<button>` for `Partners` (no route yet). Drops legacy "Settings" entry. Order follows David's 2026-04-29 grooming (transactional-vs-master framing — see `domain-documentation/domains-overview.md`). Figma component at node `597:514`; horizontal padding, button gap, and group-separator gap bound to `Spacing/3`, `Spacing/2`, `Spacing/6` Figma variables (added to `4. Sizing` collection 2026-04-29). Top padding dropped from 76px (Figma drift to clear a hypothetical fixed navbar) to 12px uniform — the navbar is a flex-column sibling in `AppShell.jsx`, no overlap. **Stays app-local** (not in `@odyssey/ui`) because it imports `react-router-dom` and depends on the app's specific routes. |
| GlobalSearch (molecule) | `packages/ui/src/GlobalSearch.jsx` | — | 2026-04-30 | History nav (chevron-left/right, lg, DSN/400) + Searchbar wrapper (`flex: 1`, `min-width: 400`, `max-width: 800`, DSN/900 bg, Carolina Blue/400 border via `::after` pseudo-element so child backgrounds don't clip it, `--radius-lg`) + Search Scope (DSN/700 bg, DSN/600 right divider, "All" label DSN/400) + input + Circle-X clear (md, DSN/400). Internal `focused` state (input focus OR `dropdownOpen` prop): border 1→2px, scope text + dropdown chevron + circle-x shift to DSN/200. Hover ladder on scope/clear buttons: 400→200 idle, 200→100 focused. Clear button uses `onMouseDown preventDefault` so clicking it doesn't blur the input. Props: `scope`, `onScopeClick`, `dropdownOpen`, `dropdownIcon` (slot — maps to Figma `Dropdown icon` INSTANCE_SWAP), `value`, `onChange`, `onClear`, `onBack`, `onForward`, `placeholder`, `minWidth`, `maxWidth`. Placeholder color + focus outline suppression in `apps/odyssey-one/src/styles/components.css`. Figma component set: `658:18` with `State=Default/Focused` variants. Code Connect: `packages/ui/src/GlobalSearch.figma.tsx`. Used in `Navbar.jsx`. **Note:** the scope dropdown menu (categories list) is still inline in Navbar — see SHP-66. |
| OdysseyLogo (atom) | `packages/ui/src/OdysseyLogo.jsx` | — | 2026-05-04 | Inline SVG (172×24, viewBox 0 0 172 24). Two color groups: "Odyssey" wordmark (white in light, DSN/900 in dark) + "One" wordmark (Carolina Blue/400 both variants). Props: `variant` (`'light'` / `'dark'`, defaults to light), `width`, `height`. Figma source: variant component `Property 1=Light` (id 484:2264) + presumed Dark variant. Extracted from inline SVG in `Navbar.jsx`. |
| LeadNav (molecule) | `packages/ui/src/LeadNav.jsx` | — | 2026-05-04 | Hamburger button (36×36, padding 8 / `--spacing-2`, icon DSN/500, Lucide Menu lg) + logo slot, gap 16 (`--spacing-4`). Props: `logo` (React node — defaults to `<OdysseyLogo />`, maps to Figma `Logo` INSTANCE_SWAP), `onMenuClick`. Figma component: `639:564` with `Logo#1211:0` INSTANCE_SWAP (default = OdysseyLogo Light). Code Connect: `packages/ui/src/LeadNav.figma.tsx`. Used in `Navbar.jsx` replacing the inline hamburger + huge SVG. |
| TrailNav (molecule) | `packages/ui/src/TrailNav.jsx` | — | 2026-05-04 | Right-side navbar molecule (mirrors `LeadNav`). Composes: bell button (32×32, Lucide Bell lg, DSN/500) with `<Badge variant="notification">` overlay (absolute, top:-6/left:16) + DSN/700 vertical divider + avatar slot (32×32, `--radius-lg`) + name (DSN/300, sm/medium) + role (DSN/400, xs/regular, line-height 12) + chevron (md, DSN/500, swaps Down→Up via `dropdownOpen`, or replaced via `chevron` slot prop). Props: `name`, `role`, `avatar` (React node), `notificationCount`, `showNotification` (default = `notificationCount > 0`, maps to Figma `Show notification` BOOLEAN), `chevron` (slot, maps to Figma `Chevron` INSTANCE_SWAP), `dropdownOpen`, `onNotificationClick`, `onProfileClick`. Layout gaps: bell↔divider `--spacing-4` (16px), divider↔profile `--spacing-5` (20px). Hover (code-only, deliberately not pushed to Figma): bell brightens 500→200; profile button brightens name 300→100, role 400→200, chevron 500→200. Figma component `639:562` (renamed from `User`) with 4 properties: Name (TEXT), Role (TEXT), Show notification (BOOLEAN, wired to Badge `visible`), Chevron (INSTANCE_SWAP, default `lucide/chevron-down`). The notification chip is a real instance of `Badge / Variant=notification` (1256:2), not a hand-built frame. All colors bound to `Deep Sea Neutral/*` + `Bittersweet/600` (via Badge variant). Avatar in Navbar consumer comes from `apps/odyssey-one/src/data/sso-mock.js` (currentUser.avatarUrl, name, role). Code Connect: `packages/ui/src/TrailNav.figma.tsx`. Used in `Navbar.jsx`. **Profile dropdown menu** (Account / Manage Users / Sign out) is still inline in Navbar — same future work as SHP-66. |

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

---

## Pending Figma Sync

Variants/props defined in code but not yet pushed to Figma. Push all at once when ready.

| Component | Variant/Prop | Description | Deferred On |
|---|---|---|---|
| Badge | pulse animation on `statusDot` | CSS keyframes — not representable in Figma. Documented in component description. | 2026-04-27 |
| Badge | asymmetric padding logic | `getPadding(icon, statusDot)` returns different padding per state. Figma uses static 2px 10px symmetric — code-only behavior. | 2026-04-27 |
| Badge | gray-only icon color override | Code: gray variant icon uses `--text-tertiary`; other variants use `currentColor`. In Figma, icon is an instance-swap slot — color comes from swapped icon content, not parent. Cannot model as a single variable binding. | 2026-04-27 |
| GlobalSearch | hover state — scope button (text + chevron) | Default 400 → hover 200; Focused 200 → hover 100. Same shift applies to the clear button (same rule). Needs new Figma sub-variants or hover-flagged states. | 2026-05-04 |
| GlobalSearch | hover state — clear button (CircleX) | Same color ladder as scope hover. | 2026-05-04 |
| GlobalSearch | focus also triggers when scope dropdown is open | Focused state in Figma covers input focus only. In code, `dropdownOpen` prop also flips the focused styling. Either add a "Dropdown open" variant or document this as a state-merge in the component description. | 2026-05-04 |

## Pushed to Figma

Components pushed back to Figma via the `/normalize` skill's Step 8 routine.

| Component | Figma File | Component Set ID | Pushed | Notes |
|---|---|---|---|---|
| Badge | Design System - MCP (`vodiHJU38YWZYmTz81uOk7`) | `213:27` | 2026-04-27 | First push — seeded 5 variable collections (85 vars). Properties: Variant (6 colors), Show dot (bool), Show right icon (bool), Right icon (instance-swap), Show left icon (bool), Left icon (instance-swap). |
| Badge — leftIcon update | same | `213:27` | 2026-04-27 | Added Left icon slot + Show left icon + Left icon properties. Renamed Show icon → Show right icon, Icon → Right icon. Showcase has 4 columns: Default / Dot / Left / Right. **Convention: never set both leftIcon and rightIcon on a single Badge.** Code permits it structurally but it's not a valid state — the showcase intentionally omits a "Both" example. |

## Pushed to Figma → Code Connect

Mappings published via `npx figma connect publish` from `packages/ui/`. Re-run when a `.figma.tsx` is added or modified.

| Component | Mapping File | Figma Node | Published | Notes |
|---|---|---|---|---|
| Badge | `packages/ui/src/Badge.figma.tsx` | `213:27` | 2026-04-28 | First mapping. Explicit `imports: ["import { Badge } from '@odyssey/ui'"]` to override auto-detected relative path. |
| SidebarButton | `packages/ui/src/SidebarButton.figma.tsx` | `514:2479` | 2026-05-04 | Maps `Property 1` enum → `state` ('default'/'hover'/'selected'); `Icon` instance → `icon` slot. |
| GlobalSearch | `packages/ui/src/GlobalSearch.figma.tsx` | `658:18` | 2026-05-04 | Maps `Dropdown icon` instance → `dropdownIcon` slot. State variant currently not mapped to a prop in code (focus is internal); Figma snippet shows the variant via the swap-slot value. |
| LeadNav | `packages/ui/src/LeadNav.figma.tsx` | `639:564` | 2026-05-04 | Maps `Logo` INSTANCE_SWAP → `logo` slot. The logo's nested variant property (`Property 1`: Light/Dark) is exposed via `isExposedInstance: true` on the inner logo instance, so LeadNav instances expose both the swap picker AND the variant dropdown. |
| TrailNav | `packages/ui/src/TrailNav.figma.tsx` | `639:562` | 2026-05-04 | Maps Name/Role TEXT → `name`/`role`, Show notification BOOLEAN → `showNotification`, Chevron INSTANCE_SWAP → `chevron` slot. Avatar consumer-provided. (Renamed from `User` 2026-05-04.) |

## Icon Tracker

Lucide icons needed in the Figma library are tracked in `playground/icon-tracker.html`. Open in a browser to see pending vs done icons with their config (plugin search name, target Figma name, size, stroke). Updated by the `/normalize` routine's Step 8b whenever a normalized component touches a new icon.

---

## Purge Notes

When running a purge routine:
1. Read this file first
2. **SKIP** anything listed in "Ad-hoc Implementations" — those still need their inline styles
3. Only remove old patterns from components listed in "Normalized Components"
4. Check "Composite Text Utilities" — if a utility is listed, it's in use and must not be removed
