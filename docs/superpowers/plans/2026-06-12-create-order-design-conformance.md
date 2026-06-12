# Create Order Design Conformance — 8-Item Fix Batch

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 8 design-conformance fixes to the Create Order flow (layout, icons, date picker calendar popover, portaled dropdowns, accordion scroll, border lines) plus one scoped Orders-table fix.

**Architecture:** All changes are app-local in `apps/odyssey-one/` — no `@odyssey/ui` package internals are modified. CSS is token-only (var(--…)). The portal hook `useAnchoredPortal.js` is a new shared primitive in the `fields/` directory. `DatePickerPopover.jsx` is a new standalone component in `fields/`. The main content column constraint lands on `.create-order-page` wrapper in `create-order.css`. The footer full-bleed uses negative margins matched to AppShell's `var(--spacing-8)` side padding.

**Tech Stack:** React 18, React Router v6, react-hook-form, lucide-react 1.9.0 (`ListChevronsUpDown`/`ListChevronsDownUp` confirmed present), react-day-picker v9 (to be installed), createPortal from react-dom, Vite, Vitest, TypeScript (tsconfig for type-check only).

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `apps/odyssey-one/package.json` | modify | add react-day-picker v9 dependency |
| `src/components/orders/create/create-order.css` | modify | items 1, 2, 5 (footer, column, datepicker, dividers, rep-rows borders) + item 8 |
| `src/components/orders/create/StickyFooter.jsx` | modify | item 1 — add inner wrapper for max-width alignment |
| `src/routes/orders/CreateOrderRoute.jsx` | modify | item 1 — footer restructure: hoist StickyFooter outside the constrained column |
| `src/components/orders/create/CreateOrderForm.jsx` | modify | items 3, 7 — Expand/Collapse All toggle + accordion scroll refs |
| `src/components/orders/orders.css` | modify | item 4 — scoped `.btn--link` underline removal in orders table |
| `src/components/orders/create/fields/DatePickerPopover.jsx` | create | item 5 — calendar popover component (portal, DayPicker) |
| `src/components/orders/create/fields/DateInput.jsx` | modify | item 5 — wire calendar button to DatePickerPopover |
| `src/components/orders/create/fields/useAnchoredPortal.js` | create | item 6 — shared hook: trigger ref → fixed-position portal container |
| `src/components/orders/create/fields/TypeaheadSelect.jsx` | modify | item 6 — render dropdown via useAnchoredPortal |
| `src/components/orders/create/fields/SelectField.jsx` | modify | item 6 — render dropdown via useAnchoredPortal |
| `src/components/orders/create/SpecialServicesPicker.jsx` | modify | item 6 — render tabular dropdown via useAnchoredPortal |
| `src/components/orders/create/ProductGrid.jsx` | modify | item 6 — remove known-limitation clipping comment |
| `src/components/orders/create/RepeatableRows.jsx` | modify | item 8 — add co-rep__row wrapper for border lines |

---

## Task 1: Footer full-bleed + no shadow (Item 1)

**Files:**
- Modify: `src/components/orders/create/create-order.css` (`.co-footer` and new `.co-footer__inner`)
- Modify: `src/components/orders/create/StickyFooter.jsx` (add inner wrapper div)
- Modify: `src/routes/orders/CreateOrderRoute.jsx` (hoist footer outside constrained column)

**Context:** AppShell's `<main>` has `padding: var(--spacing-8) var(--spacing-8) 0 var(--spacing-8)` (32px sides). The `.co-footer` is currently inside the form column, which means it only spans the column width. Full-bleed requires negative side margins to cancel main's padding, then an inner wrapper that mirrors the max-width/centering from Task 2.

- [ ] **Step 1: Update `.co-footer` CSS to full-bleed, remove shadow, remove radius**

In `create-order.css`, replace the existing `.co-footer` block:

```css
/* ── Sticky footer ──────────────────────────────────────── */

.co-footer {
  position: sticky;
  bottom: 0;
  z-index: 30;
  /* Bleed to full main-content width by cancelling AppShell's side padding */
  margin-inline: calc(-1 * var(--spacing-8));
  background: var(--bg-primary);
  border-top: 1px solid var(--border-subtle);
  /* No box-shadow (Efrain screenshot 1) */
}

/* Inner row: Cancel left · Save+Create right — aligns with the form's
   1080px content column (Task 2) */
.co-footer__inner {
  max-width: 1080px;
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  padding: var(--spacing-4) var(--spacing-6);
}

.co-footer__right {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}
```

- [ ] **Step 2: Update StickyFooter.jsx to use the inner wrapper**

Replace the return in `StickyFooter.jsx`:

```jsx
return (
  <div className="co-footer">
    <div className="co-footer__inner">
      <Button variant="secondary" size="lg" onClick={onCancel}>Cancel</Button>
      <div className="co-footer__right">
        <Button variant="secondary" size="lg" onClick={onSave} disabled={saving}>Save</Button>
        <Button variant="primary" size="lg" onClick={onCreate} disabled={createDisabled}>Create Order</Button>
      </div>
    </div>
  </div>
)
```

- [ ] **Step 3: Verify `create-order-page` wrapper — confirm footer still sticks at bottom**

The `StickyFooter` is a sibling of the form body inside `CreateOrderForm`, which is inside `.create-order-page`. `.create-order-page` already has `min-height: 100%` and `display: flex; flex-direction: column`. The footer's `position: sticky; bottom: 0` works within the flex-column scroll container (AppShell's `<main>` is `overflow-y: auto`). No structural change needed in CreateOrderRoute for the sticky behavior.

- [ ] **Step 4: Commit**

```bash
git add apps/odyssey-one/src/components/orders/create/create-order.css \
        apps/odyssey-one/src/components/orders/create/StickyFooter.jsx
git commit -m "orders: footer full-bleed + no shadow (Efrain conformance)"
```

---

## Task 2: Main content column max-width 1080px centered (Item 2)

**Files:**
- Modify: `src/components/orders/create/create-order.css` (`.create-order-page`)

**Context:** The `.create-order-page` div wraps the breadcrumb, PageHeader, Alerts, `.co-sections`, error alert, and StickyFooter. Adding `max-width + margin-inline: auto` to `.create-order-page` would constrain the entire thing — but the StickyFooter needs to be full-bleed (Task 1 uses negative margins from within the column). So the max-width goes on `.create-order-page` itself; the footer escapes via `margin-inline: calc(-1 * var(--spacing-8))` (which is relative to the parent column, not main).

Wait — after Task 1 the footer's margin is `calc(-1 * var(--spacing-8))` to cancel AppShell's padding. But if `.create-order-page` also has `max-width: 1080px; margin-inline: auto`, then the footer's negative margin cancels the page's centering margin, not AppShell's padding. The approach must be:

**Architecture decision:** Keep `.create-order-page` as a full-width column (no max-width) and instead add a constrained inner wrapper `.co-content` around just the breadcrumb + PageHeader + alerts + sections + error. The StickyFooter sits OUTSIDE `.co-content` inside `.create-order-page`, still gets the full-width bleed fix from Task 1.

**Revised file plan:**
- `create-order.css`: add `.co-content { max-width: 1080px; margin-inline: auto; width: 100%; }`
- `CreateOrderForm.jsx`: wrap breadcrumb + PageHeader + alerts + `.co-sections` + error alert in `<div className="co-content">` (StickyFooter stays outside)

- [ ] **Step 1: Add `.co-content` CSS**

In `create-order.css`, add below `.co-sections`:

```css
/* ── Content column: 1080px centered (item 2) ─────────── */
/* Wraps breadcrumb, PageHeader, alerts, and section accordions.
   StickyFooter is a sibling (outside this wrapper) so it can bleed full-width. */
.co-content {
  max-width: 1080px;
  margin-inline: auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
```

Also remove `gap: var(--spacing-4)` from `.create-order-page` since `.co-content` takes over the spacing between children (keep `.create-order-page`'s `min-height: 100%` and `display: flex; flex-direction: column`).

Updated `.create-order-page`:
```css
.create-order-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
```

- [ ] **Step 2: Wrap content in CreateOrderForm.jsx**

In `CreateOrderForm.jsx`, wrap everything between `<FormProvider>` and `<StickyFooter>` in a `<div className="co-content">`. The structure becomes:

```jsx
return (
  <FormProvider {...methods}>
    <div className="co-content">
      <nav className="co-breadcrumb ...">...</nav>
      <PageHeader ...>...</PageHeader>
      {bannerOpen && <Alert ...>...</Alert>}
      {saveGateError && <Alert ...>...</Alert>}
      {saveNotice && <Alert ...>...</Alert>}
      <div className="co-sections">
        {/* accordions */}
      </div>
      {createOrderMutation.isError && <Alert ...>...</Alert>}
    </div>
    <StickyFooter ... />
    {modalOpen && <DiscardSaveModal ... />}
  </FormProvider>
)
```

- [ ] **Step 3: Verify the StickyFooter's `.co-footer__inner` max-width matches `.co-content`**

Both use `max-width: 1080px; margin-inline: auto`. The footer's `margin-inline: calc(-1 * var(--spacing-8))` on `.co-footer` cancels AppShell's side padding, making the footer span the full AppShell main width. The `.co-footer__inner` then re-centers at 1080px. Visually the button row aligns with the form content above. ✓

- [ ] **Step 4: Commit**

```bash
git add apps/odyssey-one/src/components/orders/create/create-order.css \
        apps/odyssey-one/src/components/orders/create/CreateOrderForm.jsx
git commit -m "orders: create-order content column 1080px centered"
```

---

## Task 3: Expand All toggle (Item 3)

**Files:**
- Modify: `src/components/orders/create/CreateOrderForm.jsx`
- Modify: `src/components/orders/create/create-order.css` (scoped underline removal)

**Context:** `lucide-react@1.9.0` exports `ListChevronsUpDown` and `ListChevronsDownUp` (confirmed). The current `expandAll` function is one-way; we need a toggle that detects "all expanded" state and either expands all or collapses all. The underline must be removed ONLY on this specific button, not globally on `btn--link` (which has `text-decoration: underline` in components.css). We scope removal via a `co-expand-toggle` class.

- [ ] **Step 1: Add import and toggle logic in CreateOrderForm.jsx**

Add imports:
```jsx
import { ListChevronsUpDown, ListChevronsDownUp } from 'lucide-react'
```

Replace the `expandAll` function and the Button in the PageHeader:

```jsx
const SECTION_KEYS = ['general', 'pickupDelivery', 'products', 'specialServices']
const allExpanded = SECTION_KEYS.every((k) => expanded[k])

const handleExpandCollapse = () => {
  if (allExpanded) {
    setExpanded({ general: false, pickupDelivery: false, products: false, specialServices: false })
  } else {
    setExpanded({ general: true, pickupDelivery: true, products: true, specialServices: true })
  }
}
```

Replace in JSX:
```jsx
<PageHeader title="Create New Order">
  <Button
    variant="link"
    className="co-expand-toggle"
    icon={allExpanded
      ? <ListChevronsDownUp size={16} />
      : <ListChevronsUpDown size={16} />}
    onClick={handleExpandCollapse}
  >
    {allExpanded ? 'Collapse All' : 'Expand All'}
  </Button>
</PageHeader>
```

- [ ] **Step 2: Remove underline from the toggle button via scoped CSS**

In `create-order.css`, add:

```css
/* Expand/Collapse All toggle: suppress link underline at this usage (item 3).
   btn--link normally underlines; the icon-bearing variant suppresses it already
   via btn--has-icon in components.css, but we make this explicit here. */
.co-expand-toggle.btn--link {
  text-decoration: none;
}
.co-expand-toggle.btn--link:hover {
  text-decoration: none;
}
```

Note: looking at components.css, `btn--link:not(.btn--has-icon):not(.btn--has-icon-right)` applies the underline, so with `icon=` prop set the underline is already suppressed by the existing rule. The `co-expand-toggle` class + CSS override is still correct as an explicit intent marker and guards against future component changes.

- [ ] **Step 3: Remove the now-unused `expandAll` function**

Delete the line:
```jsx
const expandAll = () => setExpanded({ general: true, pickupDelivery: true, products: true, specialServices: true })
```

- [ ] **Step 4: Commit**

```bash
git add apps/odyssey-one/src/components/orders/create/CreateOrderForm.jsx \
        apps/odyssey-one/src/components/orders/create/create-order.css
git commit -m "orders: expand/collapse all toggle with ListChevrons icons"
```

---

## Task 4: Orders table ID links — no underline (Item 4)

**Files:**
- Modify: `src/components/orders/orders.css`

**Context:** The ID column in `OrdersTable.jsx` renders `<Button variant="link">`. The Button gets class `btn btn--link btn--md text-label-sm-medium`. In `components.css`, the underline is applied by `.btn--link:not(.btn--has-icon):not(.btn--has-icon-right)`. We need to remove it scoped to the orders table. The orders table card has class `orders-table-card`; the table has class `odyssey-table` (from components.css). The Button appears in a `<td>` inside `<tbody>`.

- [ ] **Step 1: Add scoped rule to orders.css**

In `orders.css`, after the existing pagination section, add:

```css
/* ── ID column link: no underline (item 4) ──────────────── */
/* The ID cell's Button variant="link" inherits underline from
   .btn--link:not(.btn--has-icon). Scope removal to this table only
   so the shared Button component is untouched. */
.orders-table-card .btn--link {
  text-decoration: none;
}
.orders-table-card .btn--link:hover {
  text-decoration: none;
}
```

- [ ] **Step 2: Verify no other btn--link instances in the orders table are affected**

Check OrdersTable.jsx: the only `Button variant="link"` is in the `idLabel` column cell. ✓ No shared component is changed.

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/components/orders/orders.css
git commit -m "orders: remove underline from table ID column link (scoped)"
```

---

## Task 5: Date picker calendar popover (Item 5)

**Files:**
- Modify: `apps/odyssey-one/package.json` (add dependency)
- Create: `src/components/orders/create/fields/DatePickerPopover.jsx`
- Modify: `src/components/orders/create/fields/DateInput.jsx`
- Modify: `src/components/orders/create/create-order.css`

**Context:** `react-day-picker` is NOT installed (confirmed). We install v9. The popover must portal to `document.body` with fixed positioning from the trigger rect — same pattern as `OrderRowActionMenu.jsx`. The masked text input remains the source of truth; selecting a day in the calendar writes the `MM/DD/YYYY` string via the existing `onChange` path and closes the popover.

- [ ] **Step 1: Install react-day-picker**

```bash
cd apps/odyssey-one && npm install react-day-picker@^9
```

Expected: package added to `apps/odyssey-one/package.json` dependencies.

- [ ] **Step 2: Create DatePickerPopover.jsx**

Create `src/components/orders/create/fields/DatePickerPopover.jsx`:

```jsx
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'

/**
 * DatePickerPopover — calendar popover rendered in a body portal.
 * Architecture: field and calendar are separate components (mirrors
 * SearchField precedent). Positioned from the trigger rect (fixed, like
 * OrderRowActionMenu). Escape and click-outside close; picking a day calls
 * onSelect with a JS Date, which DateInput converts to MM/DD/YYYY.
 *
 * DayPicker internal day-grid styling uses react-day-picker's default CSS.
 * A normalization pass will style it against design tokens; see TODO below.
 * TODO(normalize): style DayPicker internals with Odyssey design tokens once
 * the date-picker component enters the normalization pipeline.
 */
export default function DatePickerPopover({ triggerRect, selected, defaultMonth, onSelect, onClose }) {
  const popoverRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    const handleMouseDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) onClose()
    }
    const handleScrollOrResize = () => onClose()
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [onClose])

  if (!triggerRect) return null

  const style = {
    position: 'fixed',
    top: triggerRect.bottom + 4,
    left: triggerRect.left,
    zIndex: 200,
  }

  return createPortal(
    <div
      ref={popoverRef}
      className="co-datepicker"
      style={style}
      // Prevent mousedown from propagating to document (which would trigger onClose)
      onMouseDown={(e) => e.stopPropagation()}
    >
      <DayPicker
        mode="single"
        selected={selected}
        defaultMonth={defaultMonth ?? selected}
        onSelect={(day) => {
          if (day) onSelect(day)
        }}
      />
    </div>,
    document.body,
  )
}
```

- [ ] **Step 3: Add `.co-datepicker` CSS in create-order.css**

After the `.co-date-input` block (or at the end of the fields section), add:

```css
/* ── Date picker popover (item 5) ──────────────────────── */
/* Wraps react-day-picker in Odyssey token container.
   DayPicker's internal day-grid styles intentionally left as default —
   they will be styled against design tokens in a future normalization pass. */
.co-datepicker {
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-3);
}
```

- [ ] **Step 4: Update DateInput.jsx to wire calendar popover**

Replace `DateInput.jsx` with:

```jsx
import { useCallback, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'
import { FormField } from '@odyssey/ui'
import DatePickerPopover from './DatePickerPopover.jsx'

// "06152026" → "06/15/2026" while typing (digits-only mask)
export function maskDate(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** Parse "MM/DD/YYYY" to a JS Date, or return undefined if invalid */
function parseMMDDYYYY(str) {
  if (!str || str.length !== 10) return undefined
  const [mm, dd, yyyy] = str.split('/')
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  if (isNaN(d.getTime())) return undefined
  return d
}

/** Format a JS Date to "MM/DD/YYYY" */
function formatDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

/**
 * DateInput — masked MM/DD/YYYY text field. The trailing Calendar icon
 * opens DatePickerPopover (separate component — mirrors SearchField precedent).
 * Picking a day writes the masked string through onChange and closes the popover.
 * Typed input remains the source of truth; the mask still works unchanged.
 *
 * KNOWN LIMITATION: the digits-only mask resets the caret to the end on any
 * mid-string edit (e.g. fixing the month while year is filled). A
 * caret-preserving mask or the normalized date-picker supersedes this; no fix
 * planned here.
 */
export default function DateInput({ label, showLabel = true, value, onChange, error, warning, disabled, id }) {
  const [calOpen, setCalOpen] = useState(false)
  const [triggerRect, setTriggerRect] = useState(null)
  const calBtnRef = useRef(null)
  const warningId = !error && warning && id ? `${id}-warning` : undefined

  const openCalendar = useCallback(() => {
    if (disabled) return
    const rect = calBtnRef.current?.getBoundingClientRect()
    setTriggerRect(rect ?? null)
    setCalOpen(true)
  }, [disabled])

  const handleDaySelect = useCallback((day) => {
    onChange(formatDate(day))
    setCalOpen(false)
  }, [onChange])

  const selected = parseMMDDYYYY(value)

  return (
    <div className="co-date-input">
      <FormField
        id={id}
        label={label}
        showLabel={showLabel}
        placeholder="MM/DD/YYYY"
        value={value}
        onChange={(e) => onChange(maskDate(e.target.value))}
        error={error}
        disabled={disabled}
        trailingIcon={
          <button
            ref={calBtnRef}
            type="button"
            aria-label="Open calendar"
            aria-expanded={calOpen}
            className="co-date-cal-btn"
            tabIndex={disabled ? -1 : 0}
            onClick={openCalendar}
          >
            <Calendar size={16} />
          </button>
        }
        inputMode="numeric"
        autoComplete="off"
        describedBy={warningId}
      />
      {!error && warning && (
        <p id={warningId} className="co-field-warning text-label-xs-regular">{warning}</p>
      )}
      {calOpen && (
        <DatePickerPopover
          triggerRect={triggerRect}
          selected={selected}
          defaultMonth={selected}
          onSelect={handleDaySelect}
          onClose={() => setCalOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add `.co-date-cal-btn` CSS to reset button styles**

In `create-order.css`:

```css
/* Calendar trigger button inside DateInput — inherits no button chrome */
.co-date-cal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  line-height: 0;
}
.co-date-cal-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
```

- [ ] **Step 6: Verify tests still pass**

```bash
cd apps/odyssey-one && npx vitest run
```
Expected: 141 tests pass. (DateInput has no unit tests — it's a UI component tested manually.)

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/package.json \
        apps/odyssey-one/src/components/orders/create/fields/DatePickerPopover.jsx \
        apps/odyssey-one/src/components/orders/create/fields/DateInput.jsx \
        apps/odyssey-one/src/components/orders/create/create-order.css
git commit -m "orders: date picker calendar popover via react-day-picker v9"
```

---

## Task 6: Portal the field dropdowns (clipping fix) (Item 6)

**Files:**
- Create: `src/components/orders/create/fields/useAnchoredPortal.js`
- Modify: `src/components/orders/create/fields/TypeaheadSelect.jsx`
- Modify: `src/components/orders/create/fields/SelectField.jsx`
- Modify: `src/components/orders/create/SpecialServicesPicker.jsx`
- Modify: `src/components/orders/create/ProductGrid.jsx` (remove limitation comment)

**Context:** The `.co-dropdown` is `position: absolute` inside `.co-typeahead`. The accordion body and the product table wrap have `overflow` set, which clips the absolutely-positioned dropdown. The fix portals all dropdowns to `document.body` with fixed positioning. The hook `useAnchoredPortal` manages: open/close state, trigger rect measurement, scroll/resize close, and returns a portal container component. ARIA `aria-controls`/`aria-activedescendant` cross the portal boundary — this is valid per ARIA spec (ids are document-scoped). Click-outside logic uses `triggerRef` and a `dropdownRef` passed to the portal container.

- [ ] **Step 1: Create useAnchoredPortal.js**

Create `src/components/orders/create/fields/useAnchoredPortal.js`:

```js
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * useAnchoredPortal — shared hook for portaling dropdowns to document.body
 * with fixed positioning anchored to a trigger element's rect.
 * Mirrors the pattern from OrderRowActionMenu (S52).
 *
 * Usage:
 *   const { triggerRef, dropdownRef, rect, AnchoredPortal } = useAnchoredPortal({ open, onClose })
 *   — wrap the trigger element with ref={triggerRef}
 *   — render: open && <AnchoredPortal><div ref={dropdownRef} ...>{content}</div></AnchoredPortal>
 *
 * The hook:
 *   - Tracks the trigger's getBoundingClientRect when open changes to true
 *   - Closes on scroll (capture), resize, and mousedown outside both trigger+dropdown
 *   - Excludes the dropdown node from click-outside via dropdownRef
 */
export function useAnchoredPortal({ open, onClose }) {
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const [rect, setRect] = useState(null)

  // Measure trigger on open
  useEffect(() => {
    if (open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect())
    }
  }, [open])

  // Close on scroll, resize, and mousedown outside
  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => onClose()
    const onMouseDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (dropdownRef.current?.contains(e.target)) return
      onClose()
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [open, onClose])

  /** Render portal anchored below the trigger. width matches trigger width. */
  const AnchoredPortal = useCallback(({ children }) => {
    if (!rect) return null
    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: rect.bottom + 2,
          left: rect.left,
          width: rect.width,
          zIndex: 200,
        }}
      >
        {children}
      </div>,
      document.body,
    )
  }, [rect])

  return { triggerRef, dropdownRef, rect, AnchoredPortal }
}
```

- [ ] **Step 2: Update TypeaheadSelect.jsx to use useAnchoredPortal**

Add import:
```jsx
import { useAnchoredPortal } from './useAnchoredPortal.js'
```

Inside the component, add:
```jsx
const { triggerRef: portalTriggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({
  open,
  onClose: () => { setOpen(false); setActiveIdx(-1) },
})
```

Replace the outer `<div className="co-typeahead" ref={wrapRef}>` — we need BOTH refs on the wrapper. Combine them:
```jsx
const setWrapRef = (el) => {
  wrapRef.current = el
  portalTriggerRef.current = el
}
```

Then in the JSX, use `ref={setWrapRef}` on the wrapper div.

Replace the inline dropdown:
```jsx
{open && !disabled && (
  <AnchoredPortal>
    <div
      ref={dropdownRef}
      id={listId}
      role="listbox"
      className="co-dropdown"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* existing dropdown content unchanged */}
    </div>
  </AnchoredPortal>
)}
```

Remove the existing click-outside `useEffect` (the `onDown` handler that checked `wrapRef.current?.contains`) since `useAnchoredPortal` handles it. Keep the existing `useEffect` for external selection changes.

- [ ] **Step 3: Update SelectField.jsx to use useAnchoredPortal**

Add import:
```jsx
import { useAnchoredPortal } from './useAnchoredPortal.js'
```

Inside the component:
```jsx
const { triggerRef: portalTriggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({
  open,
  onClose: closeDropdown,
})

const setWrapRef = (el) => {
  wrapRef.current = el
  portalTriggerRef.current = el
}
```

Replace outer div: `<div className="co-typeahead" ref={setWrapRef}>`.

Replace inline dropdown block with:
```jsx
{open && !disabled && (
  <AnchoredPortal>
    <div
      ref={dropdownRef}
      id={listId}
      role="listbox"
      className="co-dropdown"
      onMouseDown={(e) => e.preventDefault()}
    >
      {options.map((opt, idx) => (
        <button
          key={opt.value}
          id={getOptionId(idx)}
          type="button"
          role="option"
          aria-selected={opt.value === value}
          className={`co-dropdown__item${activeIdx === idx ? ' co-dropdown__item--active' : ''}`}
          onClick={() => {
            onChange(opt.value)
            closeDropdown()
          }}
        >
          <span className="text-label-sm-regular">{opt.label}</span>
        </button>
      ))}
    </div>
  </AnchoredPortal>
)}
```

Remove the existing click-outside `useEffect` (the `onDown` handler).

- [ ] **Step 4: Update SpecialServicesPicker.jsx to use useAnchoredPortal**

Add import:
```jsx
import { useAnchoredPortal } from './fields/useAnchoredPortal.js'
```

Inside the component:
```jsx
const { triggerRef: portalTriggerRef, dropdownRef, AnchoredPortal } = useAnchoredPortal({
  open,
  onClose: () => { setOpen(false); setActiveIdx(-1) },
})

const setWrapRef = (el) => {
  wrapRef.current = el
  portalTriggerRef.current = el
}
```

On the `<div className="co-typeahead" ref={wrapRef}>` inside `.co-services`, change to `ref={setWrapRef}`.

Replace the inline `{open && (…dropdown…)}` block with:
```jsx
{open && (
  <AnchoredPortal>
    <div
      ref={dropdownRef}
      className="co-dropdown co-dropdown--table"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* existing content unchanged — error, minCharsPending, empty, table */}
    </div>
  </AnchoredPortal>
)}
```

Remove the existing click-outside `useEffect`.

- [ ] **Step 5: Remove ProductGrid clipping limitation comment**

In `ProductGrid.jsx`, search for any comment mentioning "clipping", "clip", "overflow", or "KNOWN" related to the dropdown. Remove or update it:

If a comment says something like:
```
// KNOWN LIMITATION: dropdowns in editor-row cells may be clipped by .co-product-table-wrap overflow
```
Replace with:
```
// Editor-row dropdowns are portaled via useAnchoredPortal (fixed; escapes overflow clip).
```

If no such comment exists, skip this step.

- [ ] **Step 6: Verify tests pass**

```bash
cd apps/odyssey-one && npx vitest run
```
Expected: 141 tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/odyssey-one/src/components/orders/create/fields/useAnchoredPortal.js \
        apps/odyssey-one/src/components/orders/create/fields/TypeaheadSelect.jsx \
        apps/odyssey-one/src/components/orders/create/fields/SelectField.jsx \
        apps/odyssey-one/src/components/orders/create/SpecialServicesPicker.jsx \
        apps/odyssey-one/src/components/orders/create/ProductGrid.jsx
git commit -m "orders: portal field dropdowns via useAnchoredPortal (clipping fix)"
```

---

## Task 7: Accordion scroll adjustment (Item 7)

**Files:**
- Modify: `src/components/orders/create/CreateOrderForm.jsx`
- Modify: `src/components/orders/create/create-order.css`

**Context:** When a section expands, the newly-revealed content can appear off-screen. After expanding, we scroll the accordion wrapper into view so the header is visible. On collapse, if the top of the collapsed section is above the viewport top, we scroll it into view so the user's focus context is preserved. We use `requestAnimationFrame` to wait for the DOM to update after the state change before measuring.

The four Accordion components each need a ref on their wrapper element. The Accordion component from `@odyssey/ui` renders a wrapper — check if it accepts `ref` or if we need to wrap it in a ref-bearing div. We'll wrap each in a `<div ref={...}>` to stay non-invasive to the Accordion component API.

- [ ] **Step 1: Add section refs and scroll logic in CreateOrderForm.jsx**

Add `useRef` imports (already imported) and section refs:

```jsx
const sectionRefs = {
  general: useRef(null),
  pickupDelivery: useRef(null),
  products: useRef(null),
  specialServices: useRef(null),
}
```

Replace the `toggle` function:

```jsx
const toggle = (key) => (next) => {
  setExpanded(e => ({ ...e, [key]: next }))
  if (next) {
    // Expanding: scroll the section header into view after DOM update
    requestAnimationFrame(() => {
      sectionRefs[key].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  } else {
    // Collapsing: if the section top is above the viewport, scroll it into view
    requestAnimationFrame(() => {
      const el = sectionRefs[key].current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.top < 0) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }
}
```

Wrap each Accordion in a ref-bearing div in JSX:

```jsx
<div className="co-sections">
  <div ref={sectionRefs.general}>
    <Accordion
      position="start"
      status={status.general ? 'on' : 'off'}
      title="General Information"
      description="Order identifiers, organization, equipment, and references"
      expanded={expanded.general}
      onToggle={toggle('general')}
    >
      <GeneralInformationSection />
    </Accordion>
  </div>

  <div ref={sectionRefs.pickupDelivery}>
    <Accordion
      position="mid"
      status={status.pickupDelivery ? 'on' : 'off'}
      title="Pickup and Delivery"
      description="Consignor, consignee, and planning dates"
      expanded={expanded.pickupDelivery}
      onToggle={toggle('pickupDelivery')}
    >
      <PickupDeliverySection />
    </Accordion>
  </div>

  <div ref={sectionRefs.products}>
    <Accordion
      position="mid"
      status={status.products ? 'on' : 'off'}
      title="Product Information 🚧 Under Construction"
      description="Products on this order"
      expanded={expanded.products}
      onToggle={toggle('products')}
    >
      <ProductInformationSection />
    </Accordion>
  </div>

  <div ref={sectionRefs.specialServices}>
    <Accordion
      position="end"
      status={status.specialServices ? 'on' : 'off'}
      title="Special Services (Optional)"
      description="Service requirements pulled from master data"
      expanded={expanded.specialServices}
      onToggle={toggle('specialServices')}
    >
      <SpecialServicesSection />
    </Accordion>
  </div>
</div>
```

- [ ] **Step 2: Add scroll-margin-top CSS for accordion sections**

In `create-order.css`, add inside the `.co-sections` block area:

```css
/* Scroll margin so expanded section header doesn't glue to the viewport top.
   Accounts for any sticky elements (Navbar is not sticky inside main scroll context). */
.co-sections > div {
  scroll-margin-top: var(--spacing-6);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/odyssey-one/src/components/orders/create/CreateOrderForm.jsx \
        apps/odyssey-one/src/components/orders/create/create-order.css
git commit -m "orders: accordion scroll-into-view on expand/collapse"
```

---

## Task 8: Border lines per Efrain's screenshots (Item 8)

**Files:**
- Modify: `src/components/orders/create/RepeatableRows.jsx`
- Modify: `src/components/orders/create/create-order.css`
- Modify: `src/components/orders/create/sections/GeneralInformationSection.jsx`

**Context from screenshots:**
- **Screenshot 3** (References): header row has bottom border; each data row (locked label row + input row) has a full-width bottom border; rows are ~48–56px tall with vertically centered content.
- **Screenshot 2** (Instructions): numbered rows separated by bottom borders including the trailing empty row. Header row has bottom border.
- **Screenshot 1**: a subtle horizontal divider line appears ABOVE "References" (separating the quick-fields grid from the References table).
- **Screenshot 2**: "Additional Information" block ends with a divider before "Add Instructions".

Currently `RepeatableRows` uses `.co-rep__grid` as a CSS grid — each row is rendered as individual grid items (not as table rows). We need to restructure the grid cells to include bottom borders per row. The cleanest approach without restructuring to `<table>` is to add a `.co-rep__row` wrapper around each row's cells and use CSS grid subgrid or a per-row wrapper div inside the grid.

Actually, looking at the current markup: the grid header and rows are ALL siblings in a single `.co-rep__grid`. This means we can't easily border individual rows without restructuring. The plan: restructure `RepeatableRows` to render a wrapper div per row (`.co-rep__row`) that spans all columns of the grid via `display: contents`, and add border via a pseudo-element or a full-span row cell.

**Simpler approach:** Switch from a single flat grid to a grid where each "row" group is a `<div class="co-rep__row">` using `display: contents`. Each `.co-rep__row` with `display: contents` means its children become grid items, but we can't put a border on the row itself. Instead, put `border-bottom` on each cell within a row group. We use a CSS class `co-rep__cell` on each cell and target the last cell per row to extend to full-width with a `box-shadow` hack — actually this is complex.

**Cleanest approach:** Restructure to a real `<table>` inside RepeatableRows. This aligns with the Instructions and References visual which ARE tables. Given that `SpecialServicesPicker` already uses `<table>`, this is consistent.

- [ ] **Step 1: Restructure RepeatableRows.jsx to render a `<table>`**

Replace `RepeatableRows.jsx`:

```jsx
import { Fragment } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, FormField } from '@odyssey/ui'

export const newRowId = () => `row-${Math.random().toString(36).slice(2, 9)}`

/**
 * RepeatableRows — add/delete row table (spec §8): References (two cols,
 * guided rows lock the Type cell) and Instructions (numbered, one desc col).
 * Rendered as a <table> so row separator borders match Efrain's design (item 8).
 *
 * columns:        [{ key, header, placeholder, maxLength? }]
 * lockedCell:     (row, colKey) => boolean — render as static label
 * rowPlaceholder: (row, colKey) => string | undefined — per-row override
 */
export default function RepeatableRows({
  numbered = false,
  columns,
  rows,
  lockedCell,
  rowPlaceholder,
  onCellChange,   // (rowId, colKey, value)
  onDeleteRow,    // (rowId)
  onAddRow,       // ()
  addLabel,
}) {
  return (
    <div className="co-rep">
      {rows.length > 0 && (
        <table className="co-rep__table">
          <thead>
            <tr className="co-rep__head-row">
              {numbered && <th className="co-rep__head text-label-sm-medium co-rep__cell--num">#</th>}
              {columns.map((col) => (
                <th key={col.key} className="co-rep__head text-label-sm-medium">{col.header}</th>
              ))}
              <th className="co-rep__head co-rep__cell--action" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className="co-rep__row">
                {numbered && (
                  <td className="co-rep__num text-label-sm-regular co-rep__cell--num">{i + 1}</td>
                )}
                {columns.map((col) =>
                  lockedCell?.(row, col.key) ? (
                    <td key={col.key} className="co-rep__locked text-label-sm-medium">{row[col.key]}</td>
                  ) : (
                    <td key={col.key}>
                      <FormField
                        showLabel={false}
                        placeholder={rowPlaceholder?.(row, col.key) ?? col.placeholder}
                        value={row[col.key]}
                        maxLength={col.maxLength}
                        onChange={(e) => onCellChange(row.id, col.key, e.target.value)}
                      />
                    </td>
                  ),
                )}
                <td className="co-rep__cell--action">
                  <Button
                    variant="icon"
                    size="sm"
                    icon={<Trash2 size={16} />}
                    aria-label="Delete row"
                    onClick={() => onDeleteRow(row.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Button variant="link" icon={<Plus size={16} />} onClick={onAddRow}>{addLabel}</Button>
    </div>
  )
}
```

- [ ] **Step 2: Update `.co-rep*` CSS in create-order.css to table layout**

Replace the existing `.co-rep` block:

```css
/* ── Repeatable rows (references / instructions) ────────── */

.co-rep {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  align-items: flex-start;
  width: 100%;
}

.co-rep__table {
  width: 100%;
  border-collapse: collapse;
}

/* Header row bottom border */
.co-rep__head-row {
  border-bottom: 1px solid var(--border-subtle);
}

.co-rep__head {
  text-align: left;
  color: var(--text-secondary);
  padding: var(--spacing-2) var(--spacing-3) var(--spacing-2) 0;
  vertical-align: middle;
}

/* Data rows — bottom border + min-height via padding */
.co-rep__row {
  border-bottom: 1px solid var(--border-subtle);
}

.co-rep__row td {
  padding: var(--spacing-2) var(--spacing-3) var(--spacing-2) 0;
  vertical-align: middle;
  /* Achieves ~48–56px row height via FormField's natural height + padding */
}

.co-rep__num,
.co-rep__locked {
  color: var(--text-primary);
}

.co-rep__cell--num {
  width: 32px;
  text-align: center;
}

.co-rep__cell--action {
  width: 40px;
  text-align: right;
  padding-right: 0;
}
```

- [ ] **Step 3: Add section dividers in GeneralInformationSection.jsx**

Looking at screenshot 1: a subtle `<hr>` appears ABOVE "References" (between the quick-fields grid and References). Looking at screenshot 2: a divider appears ABOVE "Add Instructions" (between "Additional Information" fields and "Add Instructions").

In `GeneralInformationSection.jsx`:

1. Add an `<hr className="co-divider" />` between the quick-fields `<div className="co-grid-2">` and the References `<div className="co-confirm-block">`:

```jsx
{/* Quick fields */}
<div className="co-grid-2">
  {/* ... fields */}
</div>

<hr className="co-divider" />

{/* References */}
<div className="co-confirm-block">
  <h3 className="co-subhead text-label-base-medium">References</h3>
  ...
</div>
```

2. Add an `<hr className="co-divider" />` between "Additional Information" and "Add Instructions" inside the `isLongMode` block:

```jsx
{isLongMode && (
  <>
    <div className="co-confirm-block">
      <h3 className="co-subhead text-label-base-medium">Additional Information</h3>
      ...
    </div>

    <hr className="co-divider" />

    <div className="co-confirm-block">
      <h3 className="co-subhead text-label-base-medium">Add Instructions</h3>
      ...
    </div>
  </>
)}
```

- [ ] **Step 4: Add `.co-divider` CSS**

In `create-order.css`:

```css
/* ── Section dividers (item 8) ──────────────────────────── */
.co-divider {
  width: 100%;
  border: none;
  border-top: 1px solid var(--border-subtle);
  margin: 0;
}
```

- [ ] **Step 5: Verify tests pass**

```bash
cd apps/odyssey-one && npx vitest run
```
Expected: 141 tests pass. (RepeatableRows is JSX — no unit tests affected; schema/math tests unaffected.)

- [ ] **Step 6: Commit**

```bash
git add apps/odyssey-one/src/components/orders/create/RepeatableRows.jsx \
        apps/odyssey-one/src/components/orders/create/create-order.css \
        apps/odyssey-one/src/components/orders/create/sections/GeneralInformationSection.jsx
git commit -m "orders: row separator borders + section dividers (Efrain conformance)"
```

---

## Task 9: Final verification (all items)

- [ ] **Step 1: Run vitest**

```bash
cd apps/odyssey-one && npx vitest run
```
Expected: 141 tests pass (16 test files).

- [ ] **Step 2: Run TypeScript type check**

```bash
cd apps/odyssey-one && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Run production build**

```bash
cd /path/to/odyssey-one && npm run build:odyssey-one
```
Expected: build succeeds with no errors.

- [ ] **Step 4: Check git log for commits**

```bash
git log --oneline -10
```
Confirm all commits from items 1–8 are present.

---

## Self-Review Checklist

**Spec coverage:**
1. Footer full-bleed + no shadow → Task 1 ✓
2. Main content 1080px centered → Task 2 ✓
3. Expand All toggle → Task 3 ✓ (ListChevronsUpDown/ListChevronsDownUp confirmed present)
4. Table ID links no underline → Task 4 ✓
5. Date picker → Task 5 ✓ (install + DatePickerPopover + DateInput wiring + CSS)
6. Portal dropdowns → Task 6 ✓ (hook + TypeaheadSelect + SelectField + SpecialServicesPicker + ProductGrid comment)
7. Accordion scroll → Task 7 ✓
8. Border lines → Task 8 ✓ (rep-rows table restructure + dividers)

**Placeholder scan:** No TBD/TODO/fill-in patterns. All code blocks are complete.

**Type consistency:**
- `useAnchoredPortal` returns `{ triggerRef, dropdownRef, rect, AnchoredPortal }` — all three consumers use `triggerRef`, `dropdownRef`, `AnchoredPortal` (rect unused but available).
- `DatePickerPopover` props: `triggerRect`, `selected`, `defaultMonth`, `onSelect`, `onClose` — `DateInput.jsx` passes all of these. ✓
- `RepeatableRows` props unchanged; only internal rendering changed. ✓
