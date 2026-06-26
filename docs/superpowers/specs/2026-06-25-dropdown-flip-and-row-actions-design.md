# Dropdown boundary-aware flip + thin-shell row-action menu — design

**Date:** 2026-06-25 (Session 66)
**Status:** approved (brainstorm) — ready for implementation plan
**Owner:** Manuela
**Related:** memory `project_datatable_followups` · `project_table_strategy_tanstack` · the DataTable shell (merged `b58e229`)

Two follow-ups requested after the DataTable shell shipped. Both are code-first (Figma retro-sync later), fold into the held **0.3.0**, and must be visible/exercisable in the DSM.

---

## Feature 1 — Dropdown boundary-aware flip

### Problem
`packages/ui/src/useAnchoredPortal.jsx` always positions the popover at `top: triggerRect.bottom + 2`. Near the viewport bottom (where the Paginator's rows-per-page `Dropdown` lives) the menu clips. It must open **upward** when it won't fit below.

### Approach
Flip inside the hook (the single positioning seam). Default stays **down**; flip **up** only when the menu doesn't fit below (least-surprising). The popover already closes on scroll/resize, so placement is computed **once on open** — no live tracking. No new dependency (rejected floating-ui/popper — the library is dep-free; rejected a `max-height`+scroll cap — that shrinks, it doesn't flip).

### The pure decision (node-testable — the `getColWidths`/`getPageItems` pattern)
```js
export function computeVerticalPlacement(triggerTop, triggerBottom, menuHeight, viewportHeight, gap = 2) {
  const spaceBelow = viewportHeight - triggerBottom
  const spaceAbove = triggerTop
  const openUp = menuHeight + gap > spaceBelow && (menuHeight + gap <= spaceAbove || spaceAbove > spaceBelow)
  return { placement: openUp ? 'top' : 'bottom',
           top: openUp ? triggerTop - menuHeight - gap : triggerBottom + gap }
}
```
Rules: fits below → **bottom**; doesn't fit below but fits above → **top**; fits neither → the side with **more room**.

### Flash-free measurement
The popover must be in the DOM to measure its height. So when `open`, the portal mounts immediately but renders **`visibility: hidden` at `top:0`** until measured; a **`useLayoutEffect`** reads `dropdownRef.offsetHeight` + the trigger rect, calls `computeVerticalPlacement`, and sets the final position **before paint** (no visible jump). `visibility:hidden` (not `display:none`) so `offsetHeight` is real. A `data-placement="top|bottom"` attribute goes on the portal wrapper for future styling/animation-origin/tests. The existing scroll/resize/outside-click close behavior is unchanged.

### Public API change
**Export `useAnchoredPortal` from `@odyssey/ui`** (`index.js`). It is currently internal (only `Dropdown` uses it); the thin-shell row-action menu (Feature 2) needs it to compose an anchored, flip-aware menu. This is the deliberate enabler for consumer composition.

### Scope
**Library hook only** → fixes `Dropdown` → the **Paginator** (the reported case) and any future `Dropdown`/anchored-menu consumer. The app-local duplicate (`apps/odyssey-one/src/components/orders/create/fields/useAnchoredPortal.jsx`) is left alone — noted as a de-dup follow-up.

---

## Feature 2 — Row-action menu (thin-shell composition)

### Decision
**No new library component.** Per the thin-shell stance the user chose: the consumer composes the row-action menu in its table's action-column cell from existing normalized primitives — the **ellipsis trigger** + `useAnchoredPortal` (now exported) + `DropdownMenu` + `MenuRow`. The option *set* is per table (Orders ~3, Shipments ~5) — just an array the consumer passes. The library ships the primitives; the table wires them.

### The composition (what a consumer writes)
A small cell component that owns open state:
- a **trigger button** — minimal/transparent, centered ellipsis-vertical icon, `cursor: pointer` (the Orders `.order-row-actions__trigger` look — a clickable icon, not `IconButtonGhost`). It carries `triggerRef`.
- on click → toggles `open`; renders `<AnchoredPortal><div ref={dropdownRef}><DropdownMenu>{options.map(o => <MenuRow label onClick={() => { onAction(o); close() } } />)}</DropdownMenu></div></AnchoredPortal>`.
- Inherits the flip automatically (it uses the flip-aware hook), so a menu opened on a low row flips up.

Note on the action cell: making the trigger a **button** means the icon is centered by the button (flex), like Orders — so the `.odyssey-table__cell--sticky-right > svg` centering rule (added earlier for a *bare* icon) no longer applies to this cell, but it is kept in the contract for any bare-icon sticky-right cell. The cell's `cursor: pointer` remains harmless.

### DSM demonstration (the user wants to SEE both)
- **DataTable demo** (`DataTable.demo.jsx`): replace the bare ellipsis icon in the action column with the composed **`RowActionsCell`** (a demo-local component, ~25 lines — proving the thin-shell pattern). Sample per-row options, e.g. `['View', 'Edit', 'Duplicate', 'Delete']`; `onAction` is a no-op/`console.log`. Opening it on a lower row demonstrates the **flip**. A short caption documents that this is consumer composition (no library RowActions component) and that the menu flips near the viewport bottom.
- **Dropdown demo** (`Dropdown.demo.jsx`): add a one-line caption that the menu opens upward near the viewport bottom (the flip), so the behavior is documented where `Dropdown` lives. The Paginator demo + `/orders` Paginator also exhibit it.

---

## Testing

- **Vitest (node):** TDD `computeVerticalPlacement` (exported from `useAnchoredPortal.jsx`) — fits-below → bottom + exact `top`; doesn't-fit-below-fits-above → top + exact `top`; fits-neither-more-above → top; fits-neither-more-below → bottom; the `gap` is applied. (DOM measurement / render / flash-free behavior need real layout → verified in the DSM + manually, same split as the rest of the library.)
- **Manual / DSM:** Paginator rows-per-page menu at the bottom of `/orders` flips up; the DataTable demo action menu opens, lists the per-table options, fires `onAction`, closes on select/outside/scroll, and flips on a low row; dropdowns elsewhere still open down; no flash.

---

## Files

- **Edit** `packages/ui/src/useAnchoredPortal.jsx` — add `computeVerticalPlacement` (exported) + rewrite the hook to measure/flip flash-free + `data-placement`.
- **New** `packages/ui/src/useAnchoredPortal.test.jsx` — `computeVerticalPlacement` TDD.
- **Edit** `packages/ui/src/index.js` — export `useAnchoredPortal`.
- **Edit** `apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx` — `RowActionsCell` composition in the action column + caption.
- **Edit** `apps/odyssey-one/src/routes/design-system/demos/Dropdown.demo.jsx` — flip caption.

## Not in scope (follow-ups)
- De-dup the app-local `useAnchoredPortal` copy (order-create form selects) onto the library hook.
- Angular twin parity: the `@oneodyssey/ui` `Dropdown` needs the same flip logic.
- A `max-height`+scroll cap on `DropdownMenu` for very long lists (the fits-neither edge).
- Figma retro-sync / Code Connect for any of this.
