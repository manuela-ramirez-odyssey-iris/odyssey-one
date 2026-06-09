# React Design-System Explorer — Design Spec

**Date:** 2026-06-09
**Status:** Approved (brainstorm) — pending implementation plan
**Author:** Manuela + Claude

## Problem

The current design-system reference, `playground/DesignSystemMap.html`, is a ~12k-line **static HTML** file. Each normalized component is a hand-written `getXComponentHTML()` function emitting scoped HTML/CSS that *reproduces* the component. Two structural problems:

1. **No real interactivity** — static markup can *show* states but can't *prove* them. Hover (e.g. the FormField clear-X), focus transitions, pressed states, `FieldSelect` click-to-open, and input typing only truly exist in React. We can't verify the component actually works.
2. **Duplication that drifts** — every `/normalize` cycle spends a subagent re-writing scoped HTML that mirrors the real component. The mirror can (and does) drift from the shipped code, and it's expensive to produce.

## Goal

A **React-based design-system explorer** that renders the **real `@odyssey/ui` components** so interaction is genuine, organized into **Atoms / Molecules / Organisms** tabs. It supersedes the static file's component showcase and removes the HTML-reproduction step from `/normalize`.

## Decisions (from brainstorm)

- **Scope:** component explorer first. Atoms / Molecules / Organisms tabs rendering live components, superseding the static **Components + Normalize** tabs. The static **Badges** (color-token inventory) + **Typography** inventory tabs stay as-is for now (plain data tables — migrating them is out of scope for v1).
- **Location:** a `/design-system` route in the existing `apps/odyssey-one` app (reuses the Vite build, `@odyssey/ui` imports, and global `tokens.css`; same precedent as the existing `/button-demo` route). Ships with the prototype deploy (acceptable; can be dev-gated later).
- **Demo model:** per-component co-located demo files, auto-collected and grouped by tier.

## Architecture

### Shell
- `apps/odyssey-one/src/routes/design-system/DesignSystem.jsx` — page with tier tabs (Atoms / Molecules / Organisms), mirroring the existing Badges-tab tab UX. Optional details panel/modal per component (props + token-contract tables + Figma + Code Connect), mirroring today's `compDetails` modal.
- Registered as `<Route path="/design-system" element={<DesignSystem />} />` in `App.jsx`.

### Demo contract
Each component gets `apps/odyssey-one/src/routes/design-system/demos/<Component>.demo.jsx`, which **imports the real component from `@odyssey/ui`** and exports:

```jsx
import { Badge } from '@odyssey/ui'

export const meta = {
  name: 'Badge',
  tier: 'atom',                 // 'atom' | 'molecule' | 'organism'
  figmaNode: '213:27',
  codeConnect: 'packages/ui/src/Badge.figma.tsx',
}

export const props = [
  { name: 'variant', type: 'string', desc: '...' },
  // ...
]

export const tokens = [
  { token: '--badge-blue-bg', resolves: 'Bay of Many/100', usage: 'blue bg' },
  // ...
]

// Interactive: renders the REAL component. A states/variants grid +
// (optionally) a useState-driven playground with control toggles.
export default function BadgeDemo() {
  return (/* grid of <Badge> variants + interactive examples */)
}
```

- **Demos live in the app route dir, not `packages/ui`** — keeps the library shippable-clean (no dev artifacts in the package) and the glob local. (Co-locating in `packages/ui` is the rejected alternative.)
- The page collects demos via `import.meta.glob('./demos/*.demo.jsx', { eager: true })`, groups by `meta.tier`, and renders each.

### Interactivity
Because demos render real components, hover / focus / pressed / typing / click-to-open all work natively. Demos may include `useState` playgrounds (e.g. a `FormField` with error/disabled toggle buttons, a controlled value, a working clear-X).

## Coexistence & migration

- The explorer replaces the static **Components + Normalize** tabs as the component source of truth.
- `playground/DesignSystemMap.html` **stays** for the Badges + Typography **inventory** tabs only (v1 does not migrate those).
- **v1 deliverable:** explorer shell + demo infra + **seed demos for this session's 5 components**: Button, Checkbox, Radio, FieldSelect, FormField.
- **Backfill:** the remaining ~35 normalized components are ported **incrementally** — future `/normalize` cycles add their demo; existing ones ported in batches (subagent-assisted). Retire the static Components tab once backfill completes.

## `/normalize` routine impact (to update when building)

- **Phase 3** changes from "subagent writes `getXComponentHTML` scoped HTML in `DesignSystemMap.html`" → "add/update `<Component>.demo.jsx` (real React, imports the component)."
- The **DSM-always-subagent** rule relaxes: demo files are small real-React modules, not token-heavy HTML. Delegation optional, not mandated.
- Update `playground/figma-component-routine.md` + `.claude/skills/normalize/SKILL.md` accordingly.

## Success criteria

1. `/design-system` route renders, with Atoms / Molecules / Organisms tabs.
2. The 5 seed components render as **live, interactive** instances (verify: type in a FormField, hover the clear-X, click a FieldSelect, focus an input → border + divider react).
3. Each demo shows its states/variants grid + props + token-contract + Figma/Code-Connect references.
4. Adding a new component to the explorer = adding one `<Component>.demo.jsx` (no central-file edit beyond the glob, which is automatic).
5. App build + existing tests stay green.

## Out of scope (YAGNI for v1)

- Migrating the Badges / Typography token-inventory tabs to React.
- Search / filter across components.
- Dark-mode / theming toggle.
- Storybook or any external explorer dependency.
- Backfilling all ~35 existing component demos (incremental, post-v1).

## Open questions for the implementation plan

- Exact details-panel UX (inline expandable vs modal) — mirror the current `compDetails` modal unless a simpler inline panel is preferred.
- Whether seed demos should be authored by hand or via a subagent per component (likely hand-authored for the 5 exemplars to establish the pattern, then subagent-assisted backfill).
