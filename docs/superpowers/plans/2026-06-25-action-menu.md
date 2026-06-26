# ActionMenu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a normalized `@odyssey/ui` `ActionMenu` molecule (customizable icon trigger → anchored, flipping `DropdownMenu` of options + full a11y) and migrate Orders + the DSM demo onto it, retiring the divergent `OrderRowActionMenu` and `RowActionsCell`.

**Architecture:** `ActionMenu` owns the trigger button + measure-then-place positioning (vertical flip reuses the tested `computeVerticalPlacement`; horizontal honors an `align` prop) + a11y, composing the existing `DropdownMenu` + `MenuRow` for the surface. The library stays icon-agnostic (consumer passes the trigger `icon`) and dependency-free. Code-first; Angular twin + Figma retro-sync follow.

**Tech Stack:** React 19, `@odyssey/ui` workspace package, CSS custom-property tokens, Vitest (node).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/ui/src/ActionMenu.jsx` (new) | The component: trigger + flipping anchored menu + a11y. |
| `packages/ui/src/index.js` (edit) | Export `ActionMenu` (Molecules). |
| `apps/odyssey-one/src/styles/components.css` (edit) | `.action-menu` / `.action-menu__trigger` + `.menu-row--danger`. |
| `apps/odyssey-one/src/routes/design-system/demos/ActionMenu.demo.jsx` (new) | DSM demo: ⋮ + ⚡ triggers, align, disabled/danger. |
| `apps/odyssey-one/src/components/orders/OrdersTable.jsx` (edit) | Consume `ActionMenu`. |
| `apps/odyssey-one/src/components/orders/orders.css` (edit) | Drop the `.order-row-actions__*` block. |
| `apps/odyssey-one/src/components/orders/OrderRowActionMenu.jsx` (delete) | Replaced by `ActionMenu`. |
| `apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx` (edit) | Replace `RowActionsCell` with `ActionMenu`. |
| `playground/normalization-tracker.md` (edit) | Track `ActionMenu` (in-progress). |

No `MenuRow.jsx` change: it already supports `disabled` (with `.menu-row[data-disabled]` styling) + `className` + `...rest` spread.

---

## Task 1: ActionMenu CSS contract

**Files:**
- Modify: `apps/odyssey-one/src/styles/components.css` (insert after the `.dropdown-menu` block, ~line 2410)

- [ ] **Step 1: Add the trigger + danger rules**

After the `.dropdown-menu__empty { … }` rule, insert:

```css
/* ----------------------------------------
   ActionMenu — a customizable icon trigger that opens a DropdownMenu of
   row/toolbar actions. The menu surface is the normalized .dropdown-menu;
   only the trigger + the destructive-item color live here.
   ---------------------------------------- */
.action-menu {
  display: inline-flex;
  vertical-align: middle; /* center the trigger in a table action cell's line box */
}

.action-menu__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
}

.action-menu__trigger:hover {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

/* Destructive menu item — applied to a MenuRow via className. */
.menu-row--danger .menu-row__label {
  color: var(--text-error);
}
```

- [ ] **Step 2: Verify the app builds**

Run: `npm run build:odyssey-one`
Expected: build succeeds (additive CSS; nothing consumes it yet).

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/styles/components.css
git commit -m "feat(ui): .action-menu trigger contract + .menu-row--danger item"
```

---

## Task 2: Build `ActionMenu` + export it

**Files:**
- Create: `packages/ui/src/ActionMenu.jsx`
- Modify: `packages/ui/src/index.js` (Molecules group)

- [ ] **Step 1: Create `ActionMenu.jsx`**

Create `packages/ui/src/ActionMenu.jsx`:

```jsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import DropdownMenu from './DropdownMenu'
import MenuRow from './MenuRow'
import { computeVerticalPlacement } from './useAnchoredPortal.jsx'

/**
 * ActionMenu — molecule. Dropdown's action-flavored sibling: a customizable
 * icon trigger that opens an anchored DropdownMenu of action options. Owns the
 * trigger button + positioning + the viewport boundary flip + a11y in one place,
 * composing the normalized DropdownMenu + MenuRow for the surface.
 *
 * The consumer passes the trigger `icon` (the library stays icon-agnostic — no
 * lucide dep) and an `options` array; picking an option fires `onSelect` + closes.
 *
 * Positioning: measure-then-place (the menu mounts hidden until measured → no
 * flash). Vertical flips up near the viewport bottom (computeVerticalPlacement).
 * Horizontal honors `align`: 'right' anchors the menu's right edge to the trigger
 * right (safe for a far-right action column), 'left' anchors its left edge.
 *
 * a11y: the trigger has aria-haspopup/aria-expanded; items are role="menuitem";
 * focus moves to the first enabled item on open; Escape closes + restores focus
 * to the trigger; closes on outside-click / scroll (capture) / resize.
 *
 * Props:
 *   - `icon` — the trigger glyph (required), e.g. <EllipsisVertical {...ICON_MD}/>.
 *   - `options` — { label, onSelect, disabled?, danger? }[].
 *   - `align` — 'right' (default) | 'left'.
 *   - `ariaLabel` — the icon-only trigger's accessible name.
 *   - `className` — merged onto the root.
 *
 * Figma master: retro-synced (closed = trigger, open = trigger + DropdownMenu).
 */
export default function ActionMenu({ icon, options = [], align = 'right', ariaLabel, className = '' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null) // { top, left } once measured
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const close = () => setOpen(false)

  // Measure + place before paint (flash-free). Vertical flips via the shared
  // helper (gap 4); horizontal aligns the menu's right or left edge to the trigger.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const r = trigger.getBoundingClientRect()
    const { top } = computeVerticalPlacement(r.top, r.bottom, menu.offsetHeight, window.innerHeight, 4)
    const left = align === 'right' ? r.right - menu.offsetWidth : r.left
    setPos({ top, left })
  }, [open, align])

  // Close on outside-click / scroll / resize.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onScrollOrResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  // Move focus to the first enabled item on open.
  useEffect(() => {
    if (open) menuRef.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])')?.focus()
  }, [open])

  return (
    <span className={`action-menu${className ? ` ${className}` : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="action-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
      >
        {icon}
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          style={pos
            ? { position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000 }
            : { position: 'fixed', top: 0, left: 0, visibility: 'hidden', zIndex: 1000 }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
          }}
        >
          <DropdownMenu>
            {options.map((opt) => (
              <MenuRow
                key={opt.label}
                label={opt.label}
                variant="select"
                disabled={opt.disabled}
                className={opt.danger ? 'menu-row--danger' : ''}
                role="menuitem"
                tabIndex={opt.disabled ? -1 : 0}
                onClick={() => { opt.onSelect?.(); close() }}
                onKeyDown={(e) => {
                  if (opt.disabled) return
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.onSelect?.(); close() }
                }}
              />
            ))}
          </DropdownMenu>
        </div>,
        document.body,
      )}
    </span>
  )
}
```

- [ ] **Step 2: Export from the package index**

In `packages/ui/src/index.js`, in the Molecules group, immediately after the `Dropdown` export line (`export { default as Dropdown } from './Dropdown.jsx';`), add:

```js
export { default as ActionMenu } from './ActionMenu.jsx';
```

- [ ] **Step 3: Verify build + the existing suite**

Run: `npm run build:odyssey-one && cd apps/odyssey-one && npm test`
Expected: build succeeds; full suite green (192 tests — no new tests; the flip math is already covered by `useAnchoredPortal.test.jsx`).

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/ActionMenu.jsx packages/ui/src/index.js
git commit -m "feat(ui): ActionMenu molecule — icon trigger + flipping anchored DropdownMenu + a11y"
```

---

## Task 3: ActionMenu DSM demo

**Files:**
- Create: `apps/odyssey-one/src/routes/design-system/demos/ActionMenu.demo.jsx`

- [ ] **Step 1: Create the demo**

Create `apps/odyssey-one/src/routes/design-system/demos/ActionMenu.demo.jsx`:

```jsx
import { EllipsisVertical, Zap } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
import { ActionMenu } from '@odyssey/ui'

export const meta = {
  name: 'ActionMenu',
  tier: 'molecule',
  version: '0.3.0',
  // React built S66; Angular twin + Figma retro-sync pending → clears at the full-cycle GATE.
  normalizing: true,
}

export const props = [
  { name: 'icon', type: 'ReactNode', desc: 'The trigger glyph (required) — the library is icon-agnostic, so pass a real icon (⋮, ⚡, …). Lives inside a normalized 28×28 transparent trigger button.' },
  { name: 'options', type: '{ label, onSelect, disabled?, danger? }[]', desc: 'The action items. Each fires onSelect + closes. disabled → inert + muted; danger → destructive color.' },
  { name: 'align', type: "'right' | 'left'", desc: "Horizontal anchor. 'right' (default) pins the menu's right edge to the trigger (safe for far-right action columns); 'left' pins its left edge." },
  { name: 'ariaLabel', type: 'string', desc: 'Accessible name for the icon-only trigger button.' },
  { name: 'className', type: 'string', desc: 'Merged onto the root.' },
]

export const tokens = [
  { token: '(composed)', resolves: 'DropdownMenu + MenuRow', usage: 'the menu surface + rows come from the normalized primitives' },
  { token: '--text-tertiary', resolves: 'Deep Sea Neutral/500', usage: 'trigger icon at rest' },
  { token: '--bg-secondary', resolves: 'Deep Sea Neutral/50', usage: 'trigger hover fill' },
  { token: '--text-error', resolves: 'Bittersweet/600 (#D23930)', usage: 'danger item label' },
]

const ACTIONS = [
  { label: 'View', onSelect: () => {} },
  { label: 'Edit', onSelect: () => {} },
  { label: 'Duplicate', onSelect: () => {} },
  { label: 'Delete', onSelect: () => {}, danger: true },
]

const WITH_DISABLED = [
  { label: 'View', onSelect: () => {} },
  { label: 'Restore', onSelect: () => {}, disabled: true },
  { label: 'Delete', onSelect: () => {}, danger: true },
]

function Row({ children, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </div>
  )
}

export default function ActionMenuDemo() {
  return (
    <div>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        <code>Dropdown</code>'s action-flavored sibling — a customizable icon trigger that opens an
        anchored <code>DropdownMenu</code> of actions. One implementation owns the trigger,
        positioning, the boundary <strong>flip</strong> (open near the window bottom → it opens
        upward), and a11y (focus-first, Escape, outside-click close). Per-table option sets are just
        an array; the trigger glyph is whatever you pass.
      </p>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Triggers + alignment</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <Row label="Ellipsis (⋮), align right (default)">
            <ActionMenu icon={<EllipsisVertical {...ICON_MD} />} options={ACTIONS} ariaLabel="Row actions" />
          </Row>
          <Row label="Custom trigger (⚡ Zap), align left">
            <ActionMenu icon={<Zap {...ICON_MD} />} options={ACTIONS} align="left" ariaLabel="Quick actions" />
          </Row>
        </div>
      </div>

      <div className="ds-demo-section">
        <h4 className="ds-demo-section__title">Disabled + danger items</h4>
        <Row label="Restore disabled, Delete destructive">
          <ActionMenu icon={<EllipsisVertical {...ICON_MD} />} options={WITH_DISABLED} ariaLabel="Row actions" />
        </Row>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the demo collects + renders**

Run: `npm run dev:odyssey-one`, open `http://localhost:5173/design-system` → **Normalize** tab → **ActionMenu**. Confirm: clicking ⋮ opens a menu (View/Edit/Duplicate/Delete, Delete in red); the ⚡ trigger opens the same menu left-aligned; the disabled-items example shows Restore muted + non-clickable; opening near the window bottom flips upward; Escape + outside-click close.

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/demos/ActionMenu.demo.jsx
git commit -m "feat(dsm): ActionMenu demo (Normalize tab) — ⋮/⚡ triggers, align, disabled/danger"
```

---

## Task 4: Migrate Orders to `ActionMenu` + delete `OrderRowActionMenu`

**Files:**
- Modify: `apps/odyssey-one/src/components/orders/OrdersTable.jsx`
- Modify: `apps/odyssey-one/src/components/orders/orders.css`
- Delete: `apps/odyssey-one/src/components/orders/OrderRowActionMenu.jsx`

- [ ] **Step 1: Confirm `OrderRowActionMenu` has only the one consumer**

Run: `grep -rn "OrderRowActionMenu" apps/odyssey-one/src --include="*.jsx"`
Expected: only `OrdersTable.jsx` (the import + the `<OrderRowActionMenu />` in the action column) and `OrderRowActionMenu.jsx` itself. If any other consumer appears, STOP and report it.

- [ ] **Step 2: Swap the import in `OrdersTable.jsx`**

Replace the line `import OrderRowActionMenu from './OrderRowActionMenu'` with (add to the existing `@odyssey/ui` + lucide imports — `Button, Checkbox, DataTable, Paginator` already come from `@odyssey/ui`):

```jsx
import { EllipsisVertical } from 'lucide-react'
import { ICON_MD } from '@odyssey/tokens'
```

and add `ActionMenu` to the existing `@odyssey/ui` import so it reads:

```jsx
import { Button, Checkbox, DataTable, Paginator, ActionMenu } from '@odyssey/ui'
```

- [ ] **Step 3: Add the action set + use `ActionMenu` in the action column**

Above the `COLUMNS` array (after `const columnHelper = createColumnHelper()`), add:

```jsx
// Canonical row actions (spec §2) — inert this build; each wires up with its
// own feature (detail page, edit, copy, cancel/restore, delete).
const ORDER_ACTIONS = ['View', 'Edit', 'Copy', 'Cancel', 'Restore', 'Delete'].map(
  (label) => ({ label, onSelect: () => {} }),
)
```

Replace the action column's `cell`:

```jsx
  columnHelper.display({
    id: 'action',
    header: 'Action',
    cell: () => (
      <ActionMenu
        icon={<EllipsisVertical {...ICON_MD} />}
        options={ORDER_ACTIONS}
        align="right"
        ariaLabel="Order actions"
      />
    ),
    meta: { sticky: 'right', fixedWidth: true },
  }),
```

- [ ] **Step 4: Drop the `.order-row-actions__*` block from `orders.css`**

In `apps/odyssey-one/src/components/orders/orders.css`, delete the entire `── Row action menu (three-dot) ──` section — the comment plus `.order-row-actions__trigger`, `.order-row-actions__trigger:hover`, `.order-row-actions__menu`, `.order-row-actions__item`, `.order-row-actions__item:hover` (lines 41–86). Also update the file's top comment: change `toolbar, row menu, page status` to `toolbar, page status`. Keep `.orders-page`, the `── Toolbar ──` block, and `.orders-page__status`.

- [ ] **Step 5: Delete the component**

Run: `git rm apps/odyssey-one/src/components/orders/OrderRowActionMenu.jsx`

- [ ] **Step 6: Verify build + suite**

Run: `npm run build:odyssey-one && cd apps/odyssey-one && npm test`
Expected: build succeeds; full suite green.

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/src/components/orders/OrdersTable.jsx apps/odyssey-one/src/components/orders/orders.css
git commit -m "refactor(orders): row actions use @odyssey/ui ActionMenu; retire OrderRowActionMenu"
```

---

## Task 5: Migrate the DataTable demo to `ActionMenu`

**Files:**
- Modify: `apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx`

- [ ] **Step 1: Replace the imports**

Change the first import from `import { useState, useCallback } from 'react'` to:

```jsx
import { useState } from 'react'
```

Change the `@odyssey/ui` import from `import { DataTable, Paginator, Checkbox, Badge, DropdownMenu, MenuRow, useAnchoredPortal } from '@odyssey/ui'` to:

```jsx
import { DataTable, Paginator, Checkbox, Badge, ActionMenu } from '@odyssey/ui'
```

(`EllipsisVertical` from lucide and `ICON_MD` imports stay.)

- [ ] **Step 2: Delete the `RowActionsCell` component + make `ROW_ACTIONS` an options array**

Remove the entire `function RowActionsCell({ options, onAction }) { … }` definition. Replace the `const ROW_ACTIONS = ['View', 'Edit', 'Duplicate', 'Delete']` line with:

```jsx
// Per-table row actions — the option SET is the consumer's (Orders ~3, Shipments ~5).
const ROW_ACTIONS = ['View', 'Edit', 'Duplicate', 'Delete'].map((label) => ({ label, onSelect: () => {} }))
```

- [ ] **Step 3: Use `ActionMenu` in the action column**

Replace the action column's `cell: () => <RowActionsCell options={ROW_ACTIONS} />,` with:

```jsx
    cell: () => (
      <ActionMenu icon={<EllipsisVertical {...ICON_MD} />} options={ROW_ACTIONS} align="left" ariaLabel="Row actions" />
    ),
```

(Keep the `// Thin-shell row-action menu …` comment trimmed to `// Row-action menu — the normalized ActionMenu.`)

- [ ] **Step 4: Verify build**

Run: `npm run build:odyssey-one`
Expected: build succeeds (no unused-import errors — `DropdownMenu`/`MenuRow`/`useAnchoredPortal`/`useCallback` are gone).

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/routes/design-system/demos/DataTable.demo.jsx
git commit -m "refactor(dsm): DataTable demo uses ActionMenu (drops the inline RowActionsCell)"
```

---

## Task 6: GATE — verify + tracker

**Files:**
- Modify: `playground/normalization-tracker.md`

- [ ] **Step 1: Build + full suite**

Run: `npm run build:odyssey-one && cd apps/odyssey-one && npm test`
Expected: build succeeds; full suite green.

- [ ] **Step 2: Manual verification (dev server)**

With `http://localhost:5173` running:
- **Orders** (`/orders`): the three-dot menu still opens, **right-aligned**, **flips up** near the window bottom, focus-first + Escape + outside-click close all work. The trigger looks identical; the **menu surface is now the normalized `DropdownMenu`/`MenuRow`** (intentional normalization — confirm it looks right).
- **DSM** (`/design-system` → Normalize → **ActionMenu**): ⋮ + ⚡ triggers, align, disabled/danger, flip — all per Task 3.
- **DSM → DataTable**: the action cell now uses `ActionMenu` (same behavior as before, now the real component).

- [ ] **Step 3: Tracker entry**

In `playground/normalization-tracker.md`, add an **ActionMenu** entry (molecule), matching the file's format: React done (Session 66); Angular twin + Figma master + Code Connect pending; composes `DropdownMenu` + `MenuRow`; reuses `computeVerticalPlacement` for the flip; supersedes `OrderRowActionMenu` (closes SHP-66) + the demo's `RowActionsCell`; first consumers = Orders + the DataTable demo.

- [ ] **Step 4: Commit**

```bash
git add playground/normalization-tracker.md
git commit -m "docs(dsm): track ActionMenu — React done (S66), Angular + Figma pending"
```

---

## Done (React phase) → sequence tail (Cognizant 0.3.0)

1. **Angular twin** `odyssey-action-menu` via `/port-to-angular` (structural parity, component SCSS, the same flip).
2. **Figma retro-sync** — a master (closed = trigger; open = trigger + `DropdownMenu`) + Code Connect; set the demo `figmaNode`/`codeConnect`, clear `normalizing`.
3. Folds into the held **0.3.0** wave.

---

## Self-Review

**Spec coverage:**
- Component + API (`icon`/`options`/`align`/`ariaLabel`/`className`) → Task 2. ✓
- Encapsulated behavior (trigger button, measure-then-flip, align, a11y) → Task 2 + Task 1 (CSS). ✓
- Flip reuses `computeVerticalPlacement` → Task 2. ✓
- `DropdownMenu` + `MenuRow` surface; `disabled` via MenuRow, `danger` via `.menu-row--danger` → Task 1 + Task 2. ✓ (no MenuRow.jsx change — confirmed)
- Orders migration + delete `OrderRowActionMenu` + drop `.order-row-actions__*` → Task 4. ✓
- DSM `RowActionsCell` → `ActionMenu` → Task 5. ✓
- New ActionMenu demo with ⋮ + ⚡ + align + disabled/danger → Task 3. ✓
- Live `ShipmentTable` untouched → not in any task (correct). ✓
- Testing = flip already TDD'd + demo + Orders behavior → Task 6. ✓

**Placeholder scan:** no TBD/TODO; every code step shows full code; commands have expected output. ✓

**Type/name consistency:** `ActionMenu({ icon, options, align, ariaLabel, className })`, option `{ label, onSelect, disabled?, danger? }`, classes `.action-menu` / `.action-menu__trigger` / `.menu-row--danger` — identical across Tasks 1, 2, 3, 4, 5. `ORDER_ACTIONS`/`ROW_ACTIONS` are options arrays in Tasks 4/5 (match the `options` prop shape). ✓
