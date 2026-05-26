# Presentation Outline — Odyssey × Cognizant Design System

**Audience:** Odyssey leadership + Cognizant team
**Format:** Outline only. Manuela renders into slides or uses as talking points against the live demos directly.
**Date:** 2026-05-26

> ⚠️ AI-generated. Validate the numeric claims (component counts, version pins, hex codes) before presenting — drift between this doc and the live state is exactly the problem we're discussing.

---

## Slide 1 — Title

**On the slide:**
- **Two POCs. One question.**
- Migrate, or integrate? Either way, the design system holds.

**Speaker notes:**
"We're going to walk through two proof-of-concepts. They're complementary evidence — not competing options. The first asks whether migration is even necessary. The second asks what happens if we migrate anyway. Either path leads to the same conclusion about who owns the design system going forward."

**Assets:** none.

---

## Slide 2 — Status today

**On the slide:**
- **36 normalized React components** in `packages/ui` (`@odyssey/ui`)
- Figma masters with Code Connect mappings (`*.figma.tsx` files, file key `vodiHJU38YWZYmTz81uOk7`)
- The `/normalize` workflow gates every component addition through token validation + Figma↔code alignment
- All values flow through CSS custom properties in `packages/tokens/tokens.css` — no hardcoded colors anywhere in `apps/odyssey-one`

**Speaker notes:**
"Here's what Odyssey UX has actually shipped. 36 components live in the React library. Every one of them is locked to the Figma master through Code Connect. Every visual value resolves through a token — that's enforced by the `/normalize` routine, not by convention. The handoff-prep doc has the per-feature numbers behind this."

**Assets:** `cognizant-handoff-prep.md` (numbers), `packages/ui/`, `packages/tokens/tokens.css`, `playground/figma-component-routine.md`.

---

## Slide 3 — POC 1: Live data integration

**On the slide:**
- The `shipments-exceptions` widget on the Odyssey-One Home reads from `POST https://odyssey-one.com/tracking/api/uiapi/loads/statistics`
- Real production backend. Real-time counts (Scheduled P/U Today, EnRoute, Delivered, At Risk).
- Demo URL: `http://localhost:5173/` after `npm run dev:odyssey-one`

**Speaker notes:**
"This is the Home dashboard widget you've seen in the prototype — but the number in the center is now live from the Tracking platform's actual API. I'll refresh the page, and you'll see the count drift. That's not animation; that's the production database moving. Same backend your operations team queries every day."

**Assets:** live demo, `apps/odyssey-one/src/routes/Home.jsx:290`, `apps/odyssey-one/src/hooks/useTrackingLoadStatistics.js`, `cognizant-poc/poc1-data-integration.md`.

---

## Slide 4 — POC 1 implication: maybe no migration is needed

**On the slide:**
- The React prototype can talk to existing Odyssey backend infrastructure today
- Production-grade next step: OIDC against the `oneodyssey` Keycloak realm at `trapi-prd-serv01.odysseylogistics.com:8443/realms/oneodyssey`
- Demo uses a cookie/token-paste workflow — explicitly **scaffolding only**, not the proposed pattern

**Speaker notes:**
"The cookie-paste in the demo is a deliberate shortcut so we could verify the live integration without standing up auth infrastructure. The real pattern is OIDC against the `oneodyssey` Keycloak realm — the same auth the Angular apps already use. If this path is chosen, the React prototype becomes the new frontend; the migration question goes away."

**Assets:** `cognizant-poc/poc1-runbook.md` (auth workflow), `cognizant-poc/poc1-data-integration.md` §5.

---

## Slide 5 — POC 2: Button port + visual parity

**On the slide:**
- Angular 17.2 demo at `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-angular-button-demo/`
- Side-by-side with the React Button at `apps/odyssey-one/src/routes/ButtonDemo.jsx`
- Identical tokens (`src/styles/_tokens.scss` is a 1:1 port of `packages/tokens/tokens.css`)
- Stack-provenance badges visible top-right of each demo: **React 19.2.4 / Vite 8.0.1** ↔ **Angular 17.2.0 / Node 20.20.2**

**Speaker notes:**
"Two browser tabs open. Same Button, same five variants, same three sizes, same interactive states. I'll switch between them — there is no visual delta. The stack badges in the top-right show you which framework is rendering each tab. Same design system, two stacks."

**Assets:** live side-by-side, `apps/odyssey-one/src/routes/ButtonDemo.jsx`, `odyssey-angular-button-demo/` running on a separate port, `cognizant-poc/poc2-button-migration.md`.

---

## Slide 6 — POC 2 implication: if we migrate, the design system survives

**On the slide:**
- The visual contract carries cleanly across stacks
- The real deliverable: `src/app/components/odyssey-button/Button.figma-link.md`
- Frontmatter pins the component to Figma node `1307:333` + the canonical React source at `packages/ui/src/Button.jsx`
- **Tokens are the easy part. The alignment machinery is what prevents drift over time.**

**Speaker notes:**
"Anyone can copy a token file. What you can't easily copy is the discipline that keeps it honest a year from now. The alignment artifact is a single markdown file next to the component — it ties the Angular Button to the Figma master and the React canonical source, and it carries a `last_synced` date. That's the deliverable we'd want every Angular component to ship with."

**Assets:** `odyssey-angular-button-demo/src/app/components/odyssey-button/Button.figma-link.md`, `packages/ui/src/Button.figma.tsx` (React parallel).

---

## Slide 7 — Drift evidence: what happens without alignment machinery

**On the slide:**
- Inspected `linx-odyssey-usermanagement-ui` (consumer of `@oneodyssey/components` v2.5.17)
- **23 PrimeNG override files** in `src/styles/components/*.scss` — every shipped component bent at the consumer
- Heavy `!important` specificity hacks (consumer fighting the upstream library)
- Palette bifurcation — alignment once existed (DSN-900 `#1B2537` still matches), then forked:
  - `#063A83` (a separate "primary blue", used 4+ places — no React equivalent)
  - `#1F5E88` (accordion header — no React equivalent)
  - `#42AD98` ("success green" — close to but not equal to React's `#237E70`)
  - `#c64535` ("error red" — close to but not equal to React's `#D23930`)
- **Zero Code Connect artifacts. Zero Figma URL references. No `/normalize`-like CI gate.**
- Magnitude: **medium-to-large drift**.

**Speaker notes:**
"This isn't anyone's fault — it's what naturally happens to a design system when no machinery holds it in place. The DSN-900 match proves these two systems were aligned at some point. Then the palette forked into multiple almost-but-not blues, greens, and reds. No Code Connect mappings. No documented Figma source. No CI gate on hardcoded values. The gap today is the floor, not the ceiling."

**Assets:** `cognizant-poc/cognizant-analysis.md` Alternative B section.

---

## Slide 8 — Cross-stack parity gotchas, debugged this week

**On the slide:**
- Three font-rendering bugs caught **only** by side-by-side visual review:
  1. Google Fonts CDN (variable subset) vs `@fontsource/inter` (static 400/500/600) — Angular text rendered bolder
  2. `.text-label-base-medium` / `.text-label-sm-medium` utility classes lived in React's global `components.css` — missed during the verbatim `.btn*` port
  3. `-webkit-font-smoothing: antialiased` + `-moz-osx-font-smoothing: grayscale` on `<body>` — Angular defaulted to macOS subpixel antialiasing (heavier strokes)
- All three are invisible until the demos are side-by-side. Token files alone don't catch any of them.

**Speaker notes:**
"These three bugs are exactly the kind of thing that drifts when no alignment workflow exists. Same upstream Inter font, same tokens, same component spec — and the Angular text still read heavier for two reasons that took a side-by-side compare to spot. The Figma master plus the markdown alignment artifact plus a side-by-side verification step is what catches this. Without the workflow, the drift looks invisible to whoever's shipping."

**Assets:** `cognizant-poc/poc2-button-migration.md` "GATE 5 visual parity diff" → "Post-GATE-5 corrections" section.

---

## Slide 9 — Proposed follow-up: `/normalize-angular` Claude skill

**On the slide:**
- Figma Code Connect supports Angular only **partially** (via the HTML adapter, not a first-class integration) per `@figma/code-connect` v1.4.5
- Closes the gap with a markdown-authored, design-team-maintained Claude skill that does for Angular what `/normalize` does for React
- Same gates: token validation, Figma master tethering, alignment-artifact freshness
- **No engineering dependency. No tooling lock-in. Travels with the design team.**

**Speaker notes:**
"Code Connect doesn't formally support Angular yet — only through its HTML adapter. So we close that gap ourselves. A Claude skill is just a markdown file the design team owns. It runs the same gates `/normalize` runs today, applied to Angular components. The point isn't the skill — it's that the discipline extends to wherever the design needs to go next."

**Assets:** `packages/ui/.claude/skills/normalize.md` (existing React-side reference), proposed `/normalize-angular` follow-up.

---

## Slide 10 — Two paths summarized

**On the slide:**

|  | **Path A: Integrate** (React stays, OIDC backend) | **Path B: Migrate** (Angular adopts our design system) |
|---|---|---|
| Time to production | Weeks — OIDC integration on existing prototype | Months — port surface area component-by-component |
| Design-drift risk | Low — single source of truth in React | Medium — requires Angular alignment workflow active |
| Workflow continuity | Direct — `/normalize` already runs | Requires `/normalize-angular` skill (Slide 9) |
| Future flexibility | Tied to React stack | Stack-agnostic if alignment machinery is honored |
| Total ownership cost | Lower — one codebase, one design system | Higher — two codebases, one design system, ongoing parity work |

**Speaker notes:**
"This is the honest tradeoff. Path A is faster and lower-cost. Path B is harder but leaves Odyssey stack-agnostic for the future. Both paths require Odyssey UX to own the design system and the alignment machinery. The migrate-vs-integrate question is a leadership call — we're not making it on this slide."

**Assets:** none.

---

## Slide 11 — Recommendation + next steps

**On the slide:**
- **The design system and the alignment workflow live with Odyssey UX, regardless of path.**
- If Path A: production-grade OIDC integration on the React prototype, replace the cookie-paste scaffolding (POC 1 demo) with the canonical auth flow
- If Path B: ship `/normalize-angular` skill, require `*.figma-link.md` artifacts for every ported Angular component, side-by-side review on every visual change
- **Open question for leadership:** which path, and on what timeline?

**Speaker notes:**
"Whichever direction Odyssey leadership chooses, the recommendation is the same: design system ownership and alignment workflow ownership stay with Odyssey UX. That's the durable claim. The migrate-vs-integrate call we leave to you — we've put the evidence in front of you for both paths. Next-step planning depends on the direction."

**Assets:** none. End of deck.

---

## Appendix — talking-point anchors for Q&A

- *"How was POC 1 demoed without exposing credentials?"* — Vite proxy injects `Authorization: Bearer <JWT>` server-side from `apps/odyssey-one/.env.local` (gitignored); the JWT was captured from a logged-in dashboard session and has a ~10h lifetime. See `cognizant-poc/poc1-runbook.md`.
- *"What if Code Connect adds first-class Angular support later?"* — The `Button.figma-link.md` markdown artifact is forward-compatible. If `.figma.ts` becomes idiomatic for Angular, both can coexist; the discipline is in the linkage, not the format.
- *"Why didn't `@oneodyssey/components` already solve this?"* — It's evidence of drift from the canonical system, not a peer system. See `cognizant-analysis.md` "Alternative B: drift evidence" for the specific hex codes and override surface area. Magnitude is medium-to-large.
- *"What's the cost of the `/normalize-angular` skill?"* — Authoring is a markdown task for the design team, not an engineering build. Existing `/normalize` provides the template.
