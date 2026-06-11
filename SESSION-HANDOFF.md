# Session Handoff — 2026-06-11 (normalization session: ButtonToggle text mode, Cell/table, Tab)

> **Temporal file** — written so a parallel/next session picks up without conflict.
> Delete once absorbed. Everything below is committed at the end of this session
> (branch `shipments/global-search`). Authoritative detail lives in
> `playground/normalization-tracker.md`; this is the orientation map.

## 1. ButtonToggle — `Content=Icon|Text` axis (APPROVED, published)

- **Figma** `ButtonToggle` set `2978:330` (Components-Molecules): added `Content=Icon|Text` × `Selected=First|Second` (4 variants). Text variants: selected segment = nested exposed Button (**Secondary/sm**, `Show icon` false, native 14px h-pad restored), labels `label/sm medium` **DSN/500 both states** (user call — Button Secondary's DSN/700 overridden per-instance). New TEXT props `First label` / `Second label` reach the *unselected* label (selected via exposed Button picker). User published.
- **Code** `packages/ui/src/ButtonToggle.jsx`: new `firstLabel`/`secondLabel` props → whole-component text mode (icons ignored, never mixed). Thumb in text mode is **computed** from measured label widths (`useLayoutEffect`, constants `TEXT_SEL_PAD 14 / TEXT_UNSEL_PAD 12 / TRACK_GAP 4` mirroring the CSS); icon mode keeps the fixed 36px CSS geometry untouched.
- **CSS** `components.css`: `.button-toggle__segment--text` (pad 6/12 → 14 selected), `width` added to thumb transition.
- **Code Connect**: `ButtonToggle.figma.tsx` split into two variant-restricted connects (`Content=Icon` → icon props, `Content=Text` → label props). **Published.**
- **Demo**: text-mode sections added to `ButtonToggle.demo.jsx`.

## 2. Cell — table-cell contract (APPROVED) + the sticky-header saga

Figma `Cell` set `2714:505` (Panels) intaken **read-only by design** (user: tables are TanStack-rendered, normalization = how cells look; nothing pushed to Figma).

- **Contract** `.odyssey-table` in `apps/odyssey-one/src/styles/components.css` (old dormant block + `-nested` variant replaced): 48px cells (14px v-pad raw + `--spacing-4` h-pad), `--border-subtle` bottom borders, th = `--text-primary` semibold, td = `--text-tertiary` regular; variant classes `__cell--title` (+`text-label-sm-medium`), `__cell--control` (16px pad), `__cell--gray`, `__th-sub` (12/12 unit line); hover + `[data-selected]` rows → `--bg-secondary` (code + DSM only). **`border-collapse: separate; border-spacing: 0`** — Chrome won't paint cell box-shadows in collapsed tables (Safari does); visually identical here.
- **OrdersTable** (`apps/odyssey-one/src/components/orders/OrdersTable.jsx`) migrated; per-column looks via TanStack `meta.cellClass`/`meta.headClass` (select = control cells, Customer = Title emphasis). **Action header keeps the "Action" label** (user call — Figma `Blind Head` NOT applied there).
- **Container** (user-specced): wrap = `--radius-2xl` 16px, **no outer border** (page bg provides contrast).
- **Sticky header — final architecture** (user iterated hard on this; do NOT regress):
  - JS-translateY on the thead was tried and **rejected** — composited scrolling makes any transform-sync trail by a frame (visible gap on scroll-up).
  - Final: **split sticky header**. Thead in its own table inside `.orders-table-head` (native `position: sticky`; `top` measured from the toolbar's stuck bottom). Both halves live in `.orders-table-card` (`overflow: clip` — NOT a scroll container, so sticky binds to the page scroller = the AppShell `<main>`, *not the window*; card carries the 16px radius).
  - Column widths: two-pass — render shrink-to-fit (`width: auto`), measure th/td maxes per column, lock into shared `<colgroup>` + `table-layout: fixed`; container surplus distributed to **data columns only** (select stays 48px = Figma control cell; Action snug ~76px). Re-measured on rows change + debounced resize.
  - Horizontal: body wrap drives the strip's `scrollLeft`; strip top corners rounded via gray outer + white inner (`__inner`) so the radius holds while stuck.
  - `.orders-table__cell--action` sticky-right is scoped to `.orders-table-card` (applies in both halves).
  - `overscroll-behavior-x: none` on the wrap (no horizontal rubber-band; bounce desynced the header).
  - All verified headless (playwright-core + cached Chromium, scripts in `/tmp/table-verify/`): anchor exact at all scroll states, 0/11 columns misaligned, sync exact.
- **Demo** `Cell.demo.jsx` (composed table + 14-variant reference). **Tracker** has 4 Figma-side flags for Efrain (foreign gray/300 radio border, un-normalized "Component 1" checkbox/radio nesting, unbound raw hexes, Head icon not an INSTANCE_SWAP).

## 3. Tab — underline filter tab (APPROVED, promoted to Atoms)

- **Discovery**: the Tab master screens reference (`2671:1212`) is a **REMOTE Tailwind-kit component** (foreign text styles, indigo/gray filler variants, foreign nested Badge, State axis). User: we own our components — so:
- **Built OUR local master** `Tab` set **`3057:362`** on Components-Atoms: `Current=False|True` + `Label` TEXT + `Show count` BOOLEAN; nested **exposed Badge (metric `1858:296`)** carries the count value; fills/paddings/gap variable-bound (DSN/500 / DSN/900 / Spacing 1/2/4), `label/sm medium`; no State axis (control state model). User approved + published library.
- **Code** `packages/ui/src/Tab.jsx` (+ export in `index.js`): `label`, `count` (→ Badge metric), `current`, `onClick`. Idle `--text-tertiary`; current `--text-primary` + 2px `--text-tertiary` underline; hover (not current) DSN/800 + `--border-default` underline — code + DSM only. `.tab-group` = 24px row. Selected text = **DSN/900** (user call; kit's DSN/800 was a remnant).
- **Code Connect** `Tab.figma.tsx` → `3057:362`. **Published.**
- **Demo** `Tab.demo.jsx` — went through the **Normalizing tab** first (user reminder: new demos ALWAYS land there until approval), now promoted to Atoms.

## Open items / don'ts for the next session

1. **Swap screen instances to our Tab master** (with Efrain): frames like Tabs `3050:1838` still instance the foreign kit Tab `2671:1212`. Tracker row exists.
2. **Shipments migration pass (later, user-confirmed)**: ShipmentTabs → `Tab` atom AND ShipmentTable → `.odyssey-table` contract. Do not touch Shipments UI until that pass.
3. **Cell Figma-side flags** for Efrain (see tracker Pending Figma Sync).
4. The Orders table header **anchors against the AppShell `<main>` scroller** — any refactor of AppShell scrolling must re-test `/orders` (scroll down/up, horizontal, resize).
5. Dev server may still be running on :5173 (background task) from this session.

## Files touched (all committed by /wrap)

- `packages/ui/src/`: `ButtonToggle.jsx`, `ButtonToggle.figma.tsx`, `Tab.jsx` (new), `Tab.figma.tsx` (new), `index.js`
- `apps/odyssey-one/src/styles/components.css` (odyssey-table contract, button-toggle text mode, tab atom)
- `apps/odyssey-one/src/components/orders/`: `OrdersTable.jsx` (split sticky header), `orders.css` (card/head/wrap plumbing)
- `apps/odyssey-one/src/routes/design-system/demos/`: `Cell.demo.jsx` (new), `Tab.demo.jsx` (new), `ButtonToggle.demo.jsx`
- `playground/normalization-tracker.md` (Cell + Tab entries, ButtonToggle update, Pushed-to-Figma + Code Connect rows, pending flags)
