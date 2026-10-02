---
domain: design-system
type: spec
status: approved
date: 2026-09-30
tags: [normalize, TimelineDot, history]
---

# TimelineDot — normalize spec (APPROVED by user 2026-09-30)

Figma master: `TimelineDot` COMPONENT_SET **6945:301** (Components-Atoms › Badges section),
URL `https://www.figma.com/design/vodiHJU38YWZYmTz81uOk7/Design-System---MCP?node-id=6945-301`.
Published. One VARIANT property `Color` = amber | blue | green | red | purple | gray | info.
Built from the History mock 6944:2928 (dot 6942:2846).

## Anatomy (Figma → code)
- 10×10px circle, `border-radius: var(--radius-full)`.
- 2px **inside** White ring → `border: 2px solid var(--white); box-sizing: border-box;` (6px of color shows).
- Effect style `shadow/base` → `box-shadow: var(--shadow-base);`
- Fill per color (all existing tokens in packages/tokens/tokens.css — no new tokens):

| color  | fill token |
|--------|-----------|
| amber  | `--sunrise-yellow-300` |
| blue   | `--ice-blue-600` |
| green  | `--caribbean-green-600` |
| red    | `--bittersweet-600` |
| purple | `--purple-800` |
| gray   | `--deep-sea-neutral-400` |
| info   | `--carolina-blue-400` |

Rationale (keep in the docblock): the color NAMES mirror Badge variants so a History row's dot
matches its Badge; the SHADES are one step brighter than `--badge-*-text` because a 6px dot in the
dark badge-text shade reads almost black (user, 2026-09-30).

## Files

1. **`packages/ui/src/TimelineDot.jsx`** (new) —
   `export default function TimelineDot({ color = 'gray', className = '', ...rest })`
   renders `<span aria-hidden="true" className={`odyssey-timeline-dot odyssey-timeline-dot--${c}${className ? ' ' + className : ''}`} {...rest} />`
   where `c` = `color` if in the 7-name list, else `'gray'` (unknown/missing → neutral, never crash).
   Docblock in the style of `SummaryStrip.jsx` (Figma node, anatomy, token table, rationale).
   Default `gray` differs from Figma's default `amber` on purpose (unknown → neutral) — say so.
2. **`packages/ui/src/index.js`** — `export { default as TimelineDot } from './TimelineDot.jsx';`
3. **`apps/odyssey-one/src/styles/components.css`** — a `.odyssey-timeline-dot` block (display
   inline-block, flex: none, 10px, radius-full, border, box-sizing, shadow-base, background) + 7
   `.odyssey-timeline-dot--<color>` modifiers setting `background`. Place it next to the other
   `.odyssey-timeline` rules. Raw `10px` / `2px` are OK (strategic-tokens: tiny component geometry).
4. **`packages/ui/src/TimelineDot.test.jsx`** (new, vitest + @testing-library/react, jsdom — copy
   the header style of `SummaryStrip.test.jsx`): default → `--gray` class; each of the 7 colors →
   its modifier; unknown color → `--gray`; `aria-hidden="true"`; className + rest forwarded.
5. **`packages/ui/src/TimelineDot.figma.tsx`** (new, Code Connect, pattern of `SummaryStrip.figma.tsx`)
   — node-id 6945-301, `props: { color: figma.enum('Color', { amber:'amber', blue:'blue', green:'green', red:'red', purple:'purple', gray:'gray', info:'info' }) }`,
   `example: ({ color }) => <TimelineDot color={color} />`. NO ternaries (parser trips on them).
6. **`apps/odyssey-one/src/routes/design-system/demos/TimelineDot.demo.jsx`** (new) — follow
   `SummaryStrip.demo.jsx` conventions: `meta = { name: 'TimelineDot', tier: 'atom', version: '1.0.0', createdVersion: '1.0.0', normalizing: true, figmaNode: '6945:301', codeConnect: 'packages/ui/src/TimelineDot.figma.tsx' }`
   (NO `approved`/`ported`), `props`, `tokens` table, a Schematic (the 7 dots with their token
   names + one mini rail showing dot-over-line usage) and ONE Playground (`DemoSelect` for color).
7. **History wiring** — `apps/odyssey-one/src/components/detail/HistoryTab.jsx` +
   `apps/odyssey-one/src/styles/panes/history.css`. ⚠ Both files carry LARGE UNCOMMITTED edits
   from another session (S164 lineage work). Edit ONLY the lines named here, in place; never
   rewrite/reformat the file, never revert anything.
   - Replace `<div className="history-dot" style={{ background: getDotColor(entry.outcome) }} />`
     with `<TimelineDot className="history-dot" color={BADGE_VARIANTS[entry.outcome] || BADGE_VARIANTS.default} />`
     (same outcome→Badge mapping the row's Badge uses on the `<Badge variant=…>` line, so dot = badge).
     Add `TimelineDot` to the existing `@odyssey/ui` import.
   - Delete `getDotColor` and its comment block (now dead). Grep first: if anything else calls
     `getDotColor`, stop and report instead.
   - `.history-dot` in history.css keeps ONLY positioning: `position: absolute;` and re-center the
     10px dot on the same point the 7px one sat on — old center = (left -21 + 3.5, top 6 + 3.5) →
     new `left: -23px; top: 4px;` (rounded). Remove width/height/border-radius/box-shadow (the
     component owns them). Update its comment to say the dot is `TimelineDot` (normalized
     2026-09-30) and color = the row's Badge variant.
   - Update any HistoryTab test that asserted the dot's inline `background` style to assert the
     `odyssey-timeline-dot--<color>` class instead.
8. **`playground/normalization-tracker.md`** — add a TimelineDot row/section consistent with the
   file's existing entries (status NORMALIZING, Figma 6945:301, tokens all existing, Angular port
   pending React approval). This file also has another session's uncommitted edit — append only.

## Out of scope — do NOT do
- No Angular port, no angular-map/angular DSM edits (HARD rule: never before React approval).
- No `approved`/`ported` flags, no version bump elsewhere, no commits (orchestrator commits).
- Don't touch the History rail line color.

## Verify
`cd apps/odyssey-one && npx vitest run ../../packages/ui/src/TimelineDot.test.jsx src/components/detail/HistoryTab.test.jsx`
and `npm run build:odyssey-one` from the repo root — both green. Report file list + results.
