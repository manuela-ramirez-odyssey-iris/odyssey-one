# ActionMenu — design

**Date:** 2026-06-25 (Session 66)
**Status:** approved (brainstorm) — ready for implementation plan
**Owner:** Manuela
**Related:** memory `project_datatable_followups` · `project_table_strategy_tanstack` · the Dropdown flip (`85f2cc0`) · backlog SHP-66 (generic-dropdown normalization)

## Context & goal
Three divergent row-action menus exist today — Orders `OrderRowActionMenu` (⋮ ellipsis, right-aligned, full a11y + flip), the DSM `RowActionsCell` (⋮, left-aligned, minimal a11y), and Shipments' own `ActionMenu` inside `ShipmentTable.jsx` (⚡ Zap trigger, its own positioning). They share **intent** (invoke a row action) and **structure** (icon trigger → anchored menu) but drift on a11y, alignment, and trigger. Cognizant is waiting on this batch specifically for Shipments. Goal: one normalized `@odyssey/ui` **`ActionMenu`** molecule (React canonical + Angular twin) that unifies them — closing SHP-66. Code-first (Figma retro-sync later), folds into the held **0.3.0**.

## Component
`ActionMenu` — a `@odyssey/ui` molecule; `Dropdown`'s action-flavored sibling (`Dropdown` selects a value; `ActionMenu` invokes an action). It owns the trigger button + positioning + flip + a11y in one place. Supersedes `OrderRowActionMenu`, the demo `RowActionsCell`, and (later) Shipments' local `ActionMenu`.

## API
```jsx
<ActionMenu
  icon={<EllipsisVertical {...ICON_MD} />}   // trigger glyph — REQUIRED; the library stays icon-agnostic (no lucide dep — consumer passes ⋮ / ⚡ / anything)
  options={[
    { label: 'View',    onSelect: fn },
    { label: 'Restore', onSelect: fn, disabled: true },
    { label: 'Delete',  onSelect: fn, danger: true },
  ]}
  align="right"            // 'right' (default — safe for far-right action columns) | 'left'
  ariaLabel="Row actions"  // trigger button aria-label (required for the icon-only trigger)
  className
/>
```
Option shape: `{ label: string, onSelect: () => void, disabled?: boolean, danger?: boolean }`. The component renders one `MenuRow` per option, calls `onSelect` + closes on click. `disabled` → inert + muted + `aria-disabled`. `danger` → destructive styling.

## Encapsulated behavior (the whole point — one implementation)
- **Trigger:** a normalized button `.action-menu__trigger` (generalized from Orders' `.order-row-actions__trigger`: transparent at rest, 28×28, centered icon, hover fill, pointer, radius). `aria-haspopup="menu"`, `aria-expanded`.
- **Menu:** the normalized `DropdownMenu` surface + `MenuRow` rows (this is the normalization — see "Orders migration" note).
- **Positioning + flip:** measure-then-place (flash-free, hidden until measured); **vertical flip reuses the tested `computeVerticalPlacement`** (opens up near the viewport bottom); horizontal honors `align` — `right` anchors the menu's right edge to the trigger right (the far-right-column case), `left` anchors its left edge.
- **a11y:** focus first item on open; `Escape` closes + restores focus to the trigger; close on outside-click / scroll (capture) / resize. Items are `role="menuitem"` in a `role="menu"`.

## CSS
`.action-menu__trigger` (+ a muted `disabled` item state and a `danger` item state) added to the app's `components.css` contract — the library's established CSS model (the Angular twin gets component-scoped SCSS). The bespoke `.order-row-actions__*` rules are removed when Orders migrates.

## MenuRow
`MenuRow` is the menu-item primitive but has no `disabled`/`danger` today. This build adds minimal support so `ActionMenu` can express those states — either small `disabled`/`danger` props on `MenuRow` (preferred — it's the item primitive) or a `className` pass-through that `ActionMenu` styles. The plan picks one after reading `MenuRow`'s current API. Existing `MenuRow` consumers are unaffected (new props default off).

## Migrations (this batch)
- **Orders** `OrdersTable`: replace `<OrderRowActionMenu />` with `<ActionMenu icon={<EllipsisVertical {...ICON_MD}/>} options={ORDER_ACTIONS} align="right" ariaLabel="Order actions" />` (the 6 canonical labels, currently inert). **Delete `OrderRowActionMenu.jsx`** (grep-verify it's the only JSX consumer first). **Preservation:** trigger look, right-alignment, the flip, and a11y are equivalent (Δ=0 on behavior); the **menu surface intentionally normalizes** from the bespoke `.order-row-actions__menu` to the normalized `DropdownMenu`/`MenuRow` — that IS the normalization (SHP-66), not a regression. User verifies the new menu looks right.
- **DSM** `DataTable.demo.jsx`: replace the inline `RowActionsCell` with `<ActionMenu>` (delete `RowActionsCell`). The DataTable demo keeps demonstrating the action menu, now via the real component.
- **New `ActionMenu` DSM demo** (`ActionMenu.demo.jsx`, `normalizing: true`): a ⋮ ellipsis example AND a ⚡ Zap example (proves trigger customization = the Shipments case, without touching the live table), `align` left/right, plus a `disabled` and a `danger` item.

## Not in scope
- The **live virtualized `ShipmentTable`** menu — left as-is (the table retires with the DataTable migration; migrate its menu then). Its ⚡ case is exercised by the demo instead.
- Reconciling whether Orders (⋮) and Shipments (⚡) *should* share a trigger glyph — a design-alignment question for Efrain (flagged, not blocking).
- De-dup of the app-local `useAnchoredPortal` copy (separate follow-up).

## Testing
- The flip math (`computeVerticalPlacement`) is already TDD'd (node).
- `ActionMenu` rendering + a11y wiring need real layout → verified via the **DSM demo** + the **Orders migration** (behavior Δ=0: trigger/position/flip/a11y) + manual, the library convention. If any pure helper falls out (e.g. an alignment-to-`left` computation), TDD it.

## Sequence tail (Cognizant 0.3.0)
Angular twin `odyssey-action-menu` (via `/port-to-angular`, structural parity, component SCSS) → Figma retro-sync a master (trigger + `DropdownMenu` instance, closed/open states) + Code Connect → set the demo's `figmaNode`/`codeConnect`, clear `normalizing`.

## Files
- **New:** `packages/ui/src/ActionMenu.jsx` (+ `index.js` export) · `apps/odyssey-one/src/routes/design-system/demos/ActionMenu.demo.jsx`.
- **Edit:** `packages/ui/src/MenuRow.jsx` (disabled/danger support, minimal) · `apps/odyssey-one/src/styles/components.css` (add `.action-menu__trigger` + disabled/danger item states) · `apps/odyssey-one/src/components/orders/OrdersTable.jsx` (consume `ActionMenu`) · `apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx` (consume `ActionMenu`, drop `RowActionsCell`) · `apps/odyssey-one/src/components/orders/orders.css` (drop the `.order-row-actions__*` block — trigger/menu/item) · `playground/normalization-tracker.md`.
- **Remove:** `apps/odyssey-one/src/components/orders/OrderRowActionMenu.jsx`.
