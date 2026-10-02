---
domain: design-system
type: spec
status: approved
date: 2026-10-01
tags: [dsm, tokens, export, D22]
---

# Downloadable design-system Markdown (tokens + usage) — spec

User ask (2026-10-01): "give me the latest design system md file and add a download button in both
DSM for they to download the design system in a separate md file … tokens only and literal
description of where each color, typography, etc is being used, so another external agent can
build stuff from it (e.g. Laura's Gemini making presentations)." Keep the old root `design.md`
untouched (it is stale: last edit 2026-06-09, 36 of 217 tokens).

## 1. Generator — `tools/design-system-md.mjs` (new, Node ESM, NO new dependencies)

Output: **`docs/design-system/odyssey-design-system.md`** (committed), plus byte-identical copies to
- `apps/odyssey-one/public/odyssey-design-system.md` (React DSM serves it at `/odyssey-design-system.md`)
- `../odyssey-one-library-ui/src/assets/odyssey-design-system.md` (Angular DSM; `src/assets` is
  already in angular.json `assets`). Skip this copy with a printed warning if that sibling repo
  dir doesn't exist.

Content, in order:
1. The hand-authored intro, verbatim: `tools/design-system-md.intro.md`.
2. A line `_Generated <YYYY-MM-DD> from tokens.css (<N> tokens) and <M> DSM token-usage rows._`
   — use the date only (no time) so re-runs on the same day are byte-stable.
3. One `## <Section>` per `/* --- <Section> --- */` comment group in
   `packages/tokens/tokens.css` (`:root` block), in file order (Primitives: Deep Sea Neutral,
   Semantic: Text, Component: Button, Typography Scale, Spacing Scale, …). Skip any group that is
   purely layout-internal plumbing ONLY if it has zero tokens. Each section = a table:

   | Token | Value | Resolves to | Used for |
   - **Token**: `` `--name` ``.
   - **Value**: the literal declared value (e.g. `var(--deep-sea-neutral-900)`, `16px`, `'Inter', sans-serif`).
   - **Resolves to**: fully resolved final value following `var()` chains through tokens.css
     (e.g. `#1B2537`); for colors also the primitive name in parentheses
     (`#1B2537 (Deep Sea Neutral 900)`). Blank if Value is already final.
   - **Used for**: a short literal description, built from (in this order, de-duplicated, joined
     with `; `):
     a. the token's inline/preceding `/* … */` comment in tokens.css, condensed to its first
        sentence (strip session ids like `(S136)`, `D17`, dates, and `Figma `x/y`` noise);
     b. every DSM usage row that names this token: in each
        `apps/odyssey-one/src/routes/design-system/demos/*.demo.jsx`, the exported
        `tokens` array rows `{ token, resolves, usage }`. A row's `token` field can name several
        tokens (`'--spacing-4 / --spacing-3'`) or a type style (`'label/xs medium'`); match a CSS
        token when its `--name` appears in the field. Render as `<Component>: <usage>`
        (component = the demo's `meta.name`). Cap at 8 component mentions per token, then
        `+N more`.
     c. if still empty for a **semantic or component** token, `Alias of --x` from its value; for a
        primitive with no usage, `Palette primitive — not used directly by components`.
     Escape `|` in cells. Keep cells single-line.
4. `## Type styles` — a table of the named type styles referenced in demo token rows that are NOT
   CSS vars (e.g. `label/xs medium`, `label/base semibold`, `display/4xl semibold`): style name,
   size/line-height/weight resolved from tokens (`label/xs medium` → 12px / 16px / 500), and
   which components use it (same `<Component>: <usage>` format, capped at 8).
5. `## Shadows`, `## Radius` are just the tokens.css sections above — no special handling needed.

Reading demo `tokens` + `meta.name` without executing JSX: parse each demo file's source, take
the `export const tokens = [ … ]` and `export const meta = { … }` literals (bracket-balanced, they
contain only string/number/boolean literals) and evaluate them with `new Function('return ' + src)`.
If a demo's literal can't be parsed, print a warning naming the file and continue.

CLI: `node tools/design-system-md.mjs` writes all outputs; `--check` regenerates into memory and
exits 1 if `docs/design-system/odyssey-design-system.md` differs (ignoring the generated-date
line), printing which sections drifted.

Root `package.json` scripts: `"ds:md": "node tools/design-system-md.mjs"`,
`"ds:md:audit": "node tools/design-system-md.mjs --check"`.

Test: `tools/design-system-md.test.mjs` in the style of `tools/token-check.test.mjs` (same runner as
that file) — covers var() chain resolution, multi-token usage-row matching, comment condensing,
`|` escaping, and the `--check` drift exit code (use small fixture strings, not the real files).

## 2. React DSM button — `apps/odyssey-one/src/routes/design-system/DesignSystem.jsx`

In `<header className="ds-header">`, put the `<h1>` and a download control on one row (wrap
them in a `ds-header__title` div, mirroring the Angular DSM's existing `.ds-header__title`
inline-flex row). The control is the normalized `@odyssey/ui` `Button` (secondary, small, Lucide
`Download` icon left) rendered as / wrapping a link:
`<a href="/odyssey-design-system.md" download="odyssey-design-system.md">` — use whatever
`Button` already supports for link rendering (check its props; do not add an escape hatch; if
Button can't render as a link, use a plain `<a>` styled with the existing `btn btn--secondary
btn--sm` classes). Label: **"Download tokens (.md)"**. Add the `.ds-header__title` CSS next to
the other `ds-header` rules (tokens only).

## 3. Angular DSM button — `../odyssey-one-library-ui/src/app/app.component.html`

Inside the existing `<div class="ds-header__title">`, after the version span, the same control:
an `<a href="assets/odyssey-design-system.md" download="odyssey-design-system.md">` using the
library's button styling (check how other DSM chrome uses `odyssey-button` / its classes; same
label, same Download icon if the lib exposes lucide there, else label only). Angular repo:
edit + build only — **do NOT commit or push** the Angular repo (orchestrator handles it; pushing
needs user approval).

## Out of scope
No component sections, no props tables, no changes to `design.md`, no Figma changes, no deploys,
no commits in either repo.

## Verify
1. `npm run ds:md` then `npm run ds:md:audit` (exit 0) from odyssey-one root; the test file passes.
2. Spot-check the output: `--text-primary` row resolves to `#1B2537 (Deep Sea Neutral 900)` and
   has DSM usage mentions; `--spacing-4` row lists SummaryStrip.
3. `npm run build:odyssey-one` green; in the Angular repo `npx ng build odyssey-ui && npx ng build`
   green.
4. Report: files created/changed in both repos, token count, usage-row count, any demo files that
   failed to parse, and test/build results.
