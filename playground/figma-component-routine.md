# Figma Component Intake Routine

> Triggered by `/normalize <figma-url>`. Be **concise** — one short status line per phase, batch decisions, only block on genuinely unknown values.

---

## ⛔ BEFORE EVERY TOOL CALL — READ THIS

The routine is split into **three phases separated by hard gates**. Each gate blocks the next phase until the user explicitly says go.

```
PHASE 1 — Figma  (Steps 1-3 + Figma writes)
   │
   ▼
GATE A — User approves the Figma changes via screenshot
   │   ┌── User must say one of: "go", "yes", "approved", "looks good", "ok", "proceed"
   │   └── Anything else (silence, more questions, edits requested) = NOT approved, stay in Phase 1
   ▼
PHASE 2 — Code  (Steps 4-7)
   │
   ▼
GATE B — User approves the running app behavior
   │
   ▼
PHASE 3 — Sync Back  (Step 8 + 8a + 8b)
```

### Hard rules

1. **Never call `Edit`, `Write`, or `Bash` against `*.jsx`, `*.tsx`, `*.css`, `*.js`, `*.ts` until GATE A has been crossed.** If the user shared a Figma URL and you haven't yet (a) shown them the Figma changes and (b) received an explicit approval phrase, you are still in Phase 1. Code edits are forbidden.
2. **Never call `connect:publish`, push to Figma library, or update `playground/DesignSystemMap.html` until GATE B has been crossed.** Phase 3 work is irreversible-ish (publish goes live, library push affects designers). Approval required.
3. **Pre-flight check before every code-touching tool call**: ask yourself "did the user explicitly approve the Figma changes I made?" If you can't quote the phrase, stop and ask.
4. **The default mode is Figma-first.** A Figma URL with no explicit override means: do Figma work first, screenshot, wait. The user opting into "code-first" is rare and must be stated in their words ("code-first", "skip Figma", "code only").

If you find yourself about to write code without a quotable approval phrase from the user, that's the violation. Stop, summarize what you intended to change, and ask for explicit go.

---

## Phase 1 — Figma

### Step 1: Pull from Figma

- Call `get_design_context` + `get_variable_defs` + `get_metadata` (or `use_figma` for deeper inspection) in parallel for the node.
- Extract: layout, padding, gap, radius, fills, strokes, font props, icon positions/sizes/colors.
- Note any **icon swap slots** — instances named `lucide / Placeholder*` mean a slot needs an `INSTANCE_SWAP` property + a React `icon` prop. Canonical examples: Badge (multi-slot, optional), SidebarButton (single-slot, required). If user explicitly says icons are fixed (won't change per instance), skip the swap-slot wiring.

### Step 2: Token Validation

Map every Figma value to a token in `tokens.css` / `design.md`. **Decide and proceed**; only stop when:

- A color is genuinely off-palette (no nearby Deep Sea Neutral / brand color).
- A radius/spacing isn't in the existing scale and the design intent is unclear.
- The Figma file uses a different scale than ours (e.g. `DS-Gray-Neutral/950` vs our `Deep Sea Neutral/900`) — pick the closest match by intent, mention the substitution once, move on.

For exact matches with different precision (e.g. raw `#9DA3B0` vs bound `Deep Sea Neutral/400`), bind silently — that's the whole point of the routine.

### Step 3: Component Classification & Naming

Search `apps/odyssey-one/src/components/` and `packages/ui/src/` for matches by name (fuzzy).

- **Exists, exact match** → update.
- **Multiple partial matches** → ask which (one short question).
- **New** → ask: "What is this for, implement now or park?" (one short question). If park: backlog story + spec from Figma + stop.

#### Naming — always recommend, never just adopt Figma's

**Don't take the Figma component name as-is.** Designers often pick names that read fine in the design file but are vague, generic, or collide with existing types in the codebase ("User", "Card", "Item", "Container", "Group", etc.). Always evaluate the name and recommend something better when warranted, then ask the user.

When proposing a name, weigh:
- **Specificity** — does the name describe the component uniquely, or is it so generic it'll fight every other "User" / "Card" in the repo? Example: Figma "User" → recommend `TrailNav` (mirrors `LeadNav`, names the navbar position) or `UserMenu` (names the interactive role).
- **Symmetry** — does the codebase already have a sibling pair? `LeadNav` ⇄ `TrailNav`, `Header` ⇄ `Footer`, `OpenStop` ⇄ `CloseStop`.
- **Codebase collision** — if a domain model or context already owns the name (`User` is a session / data concept here), pick a different one for the UI component.
- **Tier** — atom / molecule / organism. A button atom doesn't deserve the same noun as the molecule that wraps it.
- **PascalCase** — required for React components. Rename Figma if it's off.

Output the recommendation as: *"Figma calls this `X`. I'd suggest `Y` instead because [reason]. Want `Y`, or stick with `X`?"* — one short question, then proceed with the user's choice.

After the name is confirmed, both the React component name **and** the Figma component name should match in PascalCase. Rename the Figma component as part of Phase 1 if needed.

### Step 3b: Apply Figma writes

Do all the Figma changes the normalization requires:
- Bind unbound colors / spacings / radii to existing variables.
- Add new variants (clone existing → modify → add to set) if the spec needs them.
- Add INSTANCE_SWAP / TEXT / BOOLEAN component properties as needed.
- Expose nested instance properties (`isExposedInstance: true`) where variant pickers should bubble up to parents.
- Take a screenshot of the result.

### Step 3c: Nested-component audit (mandatory for molecules + organisms)

**Normalizing a molecule or organism means normalizing everything inside it too.** Walk the component tree and verify:

- **Every color** is bound to a `Deep Sea Neutral/*`, `Carolina Blue/*`, `Bittersweet/*`, etc. variable — never raw hex, never legacy scales (e.g. `DS-Gray-Neutral/*` if those somehow exist). Use `use_figma` to read `boundVariables` on every fill / stroke. Raw hex on text fills, frame strokes, and icon strokes is the most common miss.
- **Every icon** is an instance of `lucide/*` from our `Icons md` (`230:1054`) or `Icons lg` (`366:619`) frames. Hand-drawn vectors don't count — replace them with the right lucide instance.
- **Every sub-component** that has a parallel in our library is an actual instance of that library component. A "badge" inside a molecule must be an INSTANCE of `Badge` (the component set `213:27`), not a frame styled to look like one. A "button" inside must be an instance of `SidebarButton` / future Button, not a frame with the same dimensions. **Frame-that-looks-like-component is a code smell — replace it with `createInstance()` of the real component, even if it costs a re-layout.**
- **Naming clarity:** when you insert an instance, name it after the source component (`Badge`, not `Notification Badge`) so the layers panel makes the relationship obvious to anyone reviewing the file. The custom name shouldn't disguise what it is.

If the audit surfaces something hand-built where a primitive exists, fix it in Phase 1 before screenshotting. Don't punt to a follow-up — the whole point of normalization is that the file becomes a true composition of our primitives.

> **The rule of normalization composition:** *every atom, molecule, and organism is built from the primitives in our library — colors from our variables, icons from our lucide frames, components from our `@odyssey/ui` set. Anything else is drift.*

### ✅ GATE A — Wait for explicit user approval

Output: a short summary + one screenshot.

> **STOP HERE. Do not write any code. Do not edit any `.jsx` / `.tsx` / `.css` / `.js` / `.ts` file. Do not run `npm run` anything. Do not start the dev server.**

Wait for the user to reply with an approval phrase: `go`, `yes`, `approved`, `looks good`, `ok`, `proceed`, or similar. Mid-stream questions / edit requests / silence are all "not approved" — stay in Phase 1, address the feedback, screenshot again, wait again.

If the user says "code-first" instead at the start of the routine, skip Phase 1 writes and go directly to Phase 2 — but that's an explicit opt-in, not a default.

---

## Phase 2 — Code

> Only enter this phase after GATE A has been crossed.

### Step 4: Compare Figma vs Code

One small table, only mismatches. No need to list matching props.

### Step 5: Write the component

- React component using `var(--token-name)` only. Update non-ad-hoc usages.
- Composite text utility in `apps/odyssey-one/src/styles/components.css` if a typography combo is reused (`text-{component}`).
- No hardcoded hex / rgb / rgba — every color goes through a token.
- Match the Figma's prop API where possible (e.g. Figma `Logo` INSTANCE_SWAP → React `logo` prop, name parity).
- Write a `.figma.tsx` Code Connect mapping next to the component. Use `imports: ["import { X } from '@odyssey/ui'"]` so the import path is the package name.
- Verify dev server compiles cleanly before declaring code done.

### Step 6: Wire the consumers

Update all non-ad-hoc call sites that should use the new component. Leave ad-hoc usages alone (those will be normalized in their own pass).

### ✅ GATE B — Wait for explicit user approval (running app)

User runs the dev server, reviews the live behavior, reports any Step-9-style refinements (hover, focus, edge cases). When they say "ok / good / done / publish it", proceed to Phase 3.

---

## Phase 3 — Sync Back

> Only enter this phase after GATE B has been crossed.

### Step 7: Update tracker + DesignSystemMap

A normalize cycle is **not done** until ALL of the following are updated. Treat this as a checklist; tick each item explicitly.

- [ ] `design.md` updated if new tokens / rules were introduced.
- [ ] **`playground/DesignSystemMap.html` Components tab updated with the new component section** (NORMALIZED pill, layout/states demo, props table, token contract table, Figma reference, Code Connect note). Use a subagent — token-heavy. Add the new function to the composition line at the bottom (e.g. `... + getNewComponentHTML()`). Mirror the existing Badge / SidebarButton / Sidebar / GlobalSearch / LeadNav / TrailNav sections for visual DNA.
- [ ] Normalize tab cleared (any temporary preview content removed).
- [ ] `playground/normalization-tracker.md` updated with a row in "Normalized Components" + (if applicable) entries in "Pushed to Figma" / "Pending Figma Sync" / "Pushed to Figma → Code Connect".
- [ ] Old ad-hoc entries that are now solved → **remove from the ad-hoc list**.

**Audit-the-code rule:** The DesignSystemMap demo is a **faithful HTML/CSS reproduction of the React component as it currently renders**, including any Step 9 refinements that landed before Phase 3. **Re-read the source files** (`packages/ui/src/<Component>.jsx` AND `apps/odyssey-one/src/styles/components.css` for any class-based hover/focus rules) before writing the section. Don't trust the spec, the screenshot, or earlier intent — diff against the actual code at HEAD. Common drift sources to verify:
- Sizing primitives (`width`/`height`/`min-*`/`max-*`) — the Badge `notification` dot, for example, used `min-width`/`min-height` in v1 and switched to fixed `width`/`height` + `box-sizing: border-box` after Step 9. The DesignSystemMap demo must match the latest CSS.
- Hover / focus / active states defined in `components.css` — these are usually code-only (per Step 9 batching); the DesignSystemMap is the only place they get documented, so add demo cards for each.
- Default values of props that changed during the cycle.

**The DesignSystemMap update is not optional and not a "nice-to-have"** — it is the visible source of truth for what's been normalized. If the Components tab doesn't show the new component (or shows a stale version), the normalization is invisible / misleading to anyone who didn't run it.

### Step 8: Code Connect Publish

If the component has a `.figma.tsx`, run `npm run connect:publish` from the repo root automatically (no need to ask — `.env` handles the token). Verify the success output lists the new mapping. Add to the "Pushed to Figma → Code Connect" sub-table in the tracker.

**Pre-flight:** if `packages/ui/.env` is missing, ask the user once to create it. That's the only blocking gate in this step.

### Step 8c: Figma library publish reminder (manual user action)

Whenever a normalize cycle modifies the **structure** of the Figma file in ways that other Figma files would consume, the user needs to **re-publish the Figma library** (manual step in Figma desktop: Assets panel → "Publish library / Update"). The library publish is what makes the changes flow to other Figma files where designers compose product screens.

**Push the library when this cycle:**
- Added new components or new component variants
- Added or renamed component properties (TEXT, BOOLEAN, INSTANCE_SWAP, VARIANT)
- Renamed components
- Changed structural properties (size / layout / auto-layout settings) that affect external composition
- Added new icons in the Lucide frames

**Skip the library push when this cycle:**
- Only bound colors / spacings to existing variables (purely an internal cleanup; visuals are unchanged)
- Only updated nested instance properties' default values
- Only renamed layers (not the component itself)

**At the end of every Phase 3, output a one-line reminder telling the user whether to push:**

> "Library publish: **needed** — added [X] / renamed [Y] / [...]. Open Figma → Assets panel → Publish library / Update."

OR

> "Library publish: not needed this cycle (only internal binding cleanup)."

This is a Claude-side reminder, not an action Claude takes — Figma library publish is Figma-UI-only.

### Step 8b: Icon Tracking (code → Figma, one-way)

Only run this when icons are baked into the component (not when icons are passed as props by callers).

1. List icons used by the component, sized from the Figma layer (16 → md, 20 → lg). Cross-check with grep on call sites — icons passed in via props count too.
2. For each, check `playground/icon-tracker.html`:
   - Already `done` → done.
   - Already `pending` → append the component to "Used in".
   - Not listed → add a `pending` card with kebab plugin name, size, stroke (`--icon-stroke-md` 2.25 / `--icon-stroke-lg` 2).
3. List the **new pending** icons and which frame to add them to: md → `230:1054`, lg → `366:619`. User adds via Lucide plugin.
4. When user confirms ("X added"): verify the icon is in the right frame at the right size and stroke, update the card to `done`. **Don't rename** — keep `lucide/<kebab-name>` as produced by the plugin; size differentiation comes from the parent frame.

---

## Step 9: Live grooming & iteration

The first pass through Phases 1–3 is rarely the final shape. Once the component is in real use, small details surface: hover states, focus interactions, edge cases. Treat these as a **recurring, lightweight pass** rather than a one-time gate.

When the user reports / requests a refinement after the implement step:

1. **Classify it once, briefly.** Three buckets:
   - **Visual addition** (hover, active, disabled, error) — needs Figma update.
   - **Behavior fix** (focus management, click handling, keyboard) — code-only.
   - **Implementation detail** (inset border via pseudo-element, mouse-down preventDefault) — code-only, never Figma.
2. **Apply the fix.** Small, focused changes — don't bundle multiples.
3. **Visual additions go to `playground/normalization-tracker.md` → "Pending Figma Sync"** with a one-line spec. Don't push to Figma immediately — batch them up.
4. **At a natural pause** (component feels stable, or before re-normalizing it), ask: "ready to push the queued visual additions to Figma?" If yes, do GATE A again for the batched changes.

**Visual signal that you're in Step 9, not still in Phase 2:** the user is responding to the *running app*, not to a Figma diff or playground preview.

---

## Rules

- **Figma** is the visual source of truth.
- **Code (`design.md` + `tokens.css`)** is the source of truth for token values.
- Neither changes without the user seeing the diff (one screenshot is enough).
- Icons map to Lucide; never recreate SVGs by hand unless the Figma file is missing the master and waiting on the user would block work — then create programmatically and flag.
- Hard-blocking gates: GATE A (Figma → Code), GATE B (Code → Sync Back), genuinely unknown tokens, multiple component matches, new-component implement/park.
- No hardcoded hex/rgb/rgba in normalized components — always tokens.
- Pre-flight check before every code-touching tool call: did the user explicitly approve the Figma changes? If you can't quote the approval phrase, you haven't crossed GATE A.
