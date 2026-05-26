# Cognizant POC — Repo Analysis & Migration Prompt

**Purpose:** This file is the briefing for a fresh Claude session that will analyze a Cognizant-owned Angular codebase (newly cloned in a separate working directory) and produce two POCs supporting the Odyssey/Cognizant meeting on **2026-05-22**.

You — the sister session — should be invoked from inside the cloned Cognizant repo. The Odyssey React project lives at the absolute path below and is your **read-only reference** for design system, tokens, and the source component to migrate.

---

## Why this exists (strategic framing)

Odyssey is currently building a multi-domain React prototype (the "Odyssey-One" repo at the path below). In parallel, there's a proposed track where Cognizant would port the same UI to Angular. The meeting on 2026-05-22 needs to decide which path is real, with evidence.

Two POCs anchor the conversation:

### POC 1 — "We may not need to migrate"
**Claim:** This React app can read real data from the existing backend APIs that the Angular project consumes, which means the React prototype could become production.
**Evidence to produce:** one Home widget tile in the React app fetching live data from an endpoint the Cognizant project already uses. Bonus: produce the same widget in Angular against the same endpoint to show "AI can build either."

### POC 2 — "If we do migrate, AI carries the design system"
**Claim:** Even on the slower Angular path, the Odyssey React component library and tokens can be ported with AI assistance — design system is preserved, no visual drift, the Figma→code workflow still applies.
**Evidence to produce:** port one component (the **Button** atom) from React to Angular following the Cognizant repo's existing component patterns, with Odyssey tokens mapped into their style system.

The third deliverable is a **presentation outline** explaining both POCs and the trade-off so the meeting has a single artifact to walk through.

---

## Working setup (read first)

- **Your CWD:** the cloned Cognizant Angular repo (path varies — wherever the user clones it). Treat this repo as **read-only** unless explicitly given write permission later.
- **Odyssey React reference (absolute path):** `/Users/manuelramirez/Documents/iris/Odyssey/Shipments/odyssey-one`
- **Deliverables go in the Odyssey repo** at `cognizant-poc/` (already created), not in the Cognizant repo.

---

## Required reading in the Odyssey React project

Before doing anything, read these (in order) so you understand what you're comparing against:

1. `CLAUDE.md` — project conventions, directory map, deploy posture
2. `cognizant-handoff-prep.md` — the proposed React-led workflow + the value pitch (this is the framing Cognizant has already seen)
3. `progress.md` — skim Session 26+ only (most recent state)
4. `design.md` — design system source of truth (tokens, typography, radii)
5. `packages/tokens/tokens.css` — the actual token file
6. `packages/ui/src/Button.jsx` — POC 2 source (53 lines, atom-level)
7. `packages/ui/src/Button.figma.tsx` — Code Connect mapping (shows variants/props mapped to Figma)
8. `apps/odyssey-one/src/styles/components.css` lines 480–600ish — the `.btn*` CSS rules
9. `apps/odyssey-one/src/routes/Home.jsx` — Home widget grid (POC 1 target surface)
10. `playground/normalization-tracker.md` — design system status (which components are normalized)

You do **not** need to read full session histories or domain analyses. Stop at the references above.

---

## Tasks — execute in order, **stop at every GATE**

### GATE 1 — Inventory the Cognizant repo (analysis only)

Produce `cognizant-poc/cognizant-analysis.md` in the Odyssey repo with:

1. **Stack:** Angular version, build tool (Angular CLI / Nx / Vite / esbuild), TypeScript strictness, package manager, state management (NgRx / signals / services), routing approach.
2. **Project tree:** top 3 levels, callout which folders are shared/library vs feature/page.
3. **Component pattern:** pick one existing real component (a button or input if available, otherwise the simplest atom you find) and document:
   - File layout (single file vs split .ts/.html/.scss)
   - Standalone component vs NgModule
   - Inputs / Outputs / signals API
   - Style approach (component-scoped CSS, SCSS, CSS Modules, Tailwind, PrimeNG override)
   - Naming conventions
4. **Design system status:** do they have their own tokens, theme file, or rely on PrimeNG / Material defaults? Where do shared styles live?
5. **API / data layer:**
   - Backend stack (Node / .NET / Java / Spring / etc.) — infer from API URLs, env files, README, or proxy config
   - Where HTTP calls live (services? facades? interceptors?)
   - Auth pattern (JWT in header / cookie / OAuth flow)
   - **Pick ONE concrete endpoint** that returns shipment-, order-, or carrier-shaped data. Note: method, URL, payload shape (JSON example), auth requirement.
6. **How to run locally:** install + dev commands, any required env vars or backends.
7. **Risks / unknowns:** anything you couldn't determine from static analysis.

Length target: 600–900 words. Use sub-headings, code blocks for tree and payload samples.

**🛑 STOP after writing the analysis. Wait for the user to approve before proceeding to POC 1 or POC 2.**

---

### GATE 2 — POC 1 plan (no code yet)

Produce `cognizant-poc/poc1-data-integration.md` with:

1. Chosen endpoint (from inventory step 5) + why it's the best fit (simple payload, exists in current Cognizant project, returns data a Home widget can render)
2. Chosen Home widget tile in the React app (likely a `WidgetMetricRow` instance — confirm which one in `apps/odyssey-one/src/routes/Home.jsx`)
3. Data shape mapping: API response → widget props (small table)
4. Auth strategy for the demo:
   - Where the token comes from (env var, fixture, mock interceptor)
   - **Hard rule:** no real credentials in any committed file; use placeholder `<TOKEN>` and document how reviewers swap in their own
5. CORS / proxy plan if backend isn't reachable from the React dev server directly (Vite proxy in `apps/odyssey-one/vite.config.js`)
6. Optional: outline the Angular twin widget (which Cognizant component to add it next to, same endpoint, same payload mapping)
7. Risk list: what could break the live demo (token expiry, CORS, backend down)

**🛑 STOP. Wait for approval before writing code.**

---

### GATE 3 — POC 1 implementation

Only after GATE 2 approval. On the React side, the changes should be:

- A small fetch hook (no Tanstack/SWR — keep dependency-free)
- The chosen widget tile reading from the hook
- A `.env.local` template (not committed) and a documented env var like `VITE_COGNIZANT_API_BASE`
- A fallback to existing mock data if the fetch fails (so the demo never shows broken UI)

Report files touched + commands to run. Do not start the dev server yourself — the user will run it manually.

---

### GATE 4 — POC 2 plan (Button migration)

Produce `cognizant-poc/poc2-button-migration.md` with:

1. Side-by-side anatomy of the React Button:
   - Props: `variant` (5: primary/secondary/outline/ghost/link), `size` (3: sm/md/lg), `disabled`, `icon`, `iconRight`, `type`
   - CSS structure: `.btn` base + `.btn--<variant>` + `.btn--<size>` modifier classes + state pseudo-classes
   - Token bindings: which CSS custom properties from `packages/tokens/tokens.css` it consumes
2. Mapping to the Cognizant component pattern (from GATE 1 inventory):
   - File layout you'll mirror
   - `@Input()` signatures matching the React props
   - How to express the modifier-class composition in their template approach
   - Where the styles go (SCSS file? PrimeNG theme override? Tailwind extension?)
3. Token strategy: do we **copy** `tokens.css` into the Angular project, or **re-emit** as SCSS variables? Recommend one with rationale.
4. Files to be created in the Cognizant repo (proposed paths, not yet written)
5. Risks: PrimeNG/Material style collisions, focus-visible behavior differences, ng-content for icon slot vs React children

**🛑 STOP. Wait for approval before writing the Angular Button.**

---

### GATE 5 — POC 2 implementation

Only after GATE 4 approval. Write the Angular Button + styles + a demo page showing all 15 variant×size combinations. Files land **in the Cognizant repo** (this is the only write to that repo in the whole flow). Mirror token consumption from the React version exactly — same custom property names if possible.

Also produce a 1-page diff doc in `cognizant-poc/poc2-button-migration.md` (append section) listing every visual difference vs the React reference, however small.

---

### GATE 6 — Presentation outline

Produce `cognizant-poc/presentation-outline.md` with:

1. **Slide 1:** Title + the question being answered ("Migrate, or integrate?")
2. **Slide 2:** Status today — what Odyssey has built (one-line summary, link to numbers from cognizant-handoff-prep.md)
3. **Slide 3:** POC 1 demo — live data into the Home widget. Include: endpoint chosen, payload shape, screenshot placeholder
4. **Slide 4:** POC 1 implication — if this works, the migration may be unnecessary; React becomes production. Include the Angular twin demo if it was built.
5. **Slide 5:** POC 2 demo — Button React→Angular. Side-by-side screenshots, token parity, time-to-port estimate based on actual effort
6. **Slide 6:** POC 2 implication — even if we migrate, the design system survives the move; the Figma→code workflow from `cognizant-handoff-prep.md` still applies
7. **Slide 7:** Two paths summarized as a decision table (rows: speed, risk, design system continuity, future flexibility; columns: integrate vs migrate)
8. **Slide 8:** Recommendation + next steps

Outline only — no slide markup, no rendering. Just the speaker notes per slide and the assets each slide references. The user will build the actual slides separately.

---

## Hard rules (apply throughout)

- **Spec-before-code.** Do not implement either POC without explicit user approval at the relevant gate.
- **No credentials in any file**, ever. Use placeholders.
- **No commits to the Cognizant repo** unless explicitly requested. Read-only by default; GATE 5 is the only write.
- **No edits to the Odyssey React project** unless explicitly requested. Deliverables go in `cognizant-poc/` only; don't touch other files there.
- **Token discipline:** if the Cognizant repo has tokens of its own that already align with Odyssey's, use theirs; if they don't exist, recommend importing Odyssey's. Never hardcode color/spacing values in the Angular Button.
- **No dependencies added without flagging.** If you think the Angular Button needs a polyfill, a class-variance-authority equivalent, or a clsx port, raise it at GATE 4, not after.
- **Use sub-agents (Explore, general-purpose) liberally** for codebase inventory — both repos may be large and parallel exploration is cheaper than sequential reads.

---

## Stakeholder context (one paragraph)

The Odyssey team running this meeting: Manuela (designer-developer, leading the React prototype), Efra (designer, Figma), Jana (PM-Shipments), David (PM-cross-Odyssey, co-PM Home), Kathleen (co-PM Home). The Cognizant side is the Angular implementation team. The strategic decision-maker is Odyssey leadership; this meeting feeds their call. The two POCs are framed as **complementary evidence**, not competing options — POC 1 supports "don't migrate," POC 2 supports "if we migrate, here's how we keep what we built." Either way, the design system + Figma→code workflow survives.

---

## When you're done

Final state in the Odyssey repo (`cognizant-poc/`):
- `POC-PROMPT.md` (this file)
- `cognizant-analysis.md` (GATE 1)
- `poc1-data-integration.md` (GATE 2 plan + GATE 3 implementation notes)
- `poc2-button-migration.md` (GATE 4 plan + GATE 5 diff)
- `presentation-outline.md` (GATE 6)

In the Cognizant repo: only the Angular Button + demo page from GATE 5. Nothing else.

Stop and report after each GATE. The user is your decision authority between gates.
