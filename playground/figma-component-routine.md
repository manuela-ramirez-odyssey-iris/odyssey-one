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
- For each **icon** in the component, ask up-front: **static or switchable?**
  - **Static** = the icon never changes for this component type (e.g. the bell in TrailNav, a chevron in a navigation control). Use a real `lucide/<kebab-name>` master from `Icons md` (`230:1054`) at 16px or `Icons lg` (`366:619`) at 20px — pick by slot dimensions.
  - **Switchable** = the icon varies per consumer instance, exposed as an `INSTANCE_SWAP` property + a React `icon` prop. **Default the slot to a placeholder, never to a real lucide icon.** The dashed-square placeholder visually signals "swap me out"; defaulting to a real icon (e.g. `lucide/plus`) implies wrong semantics ("+ button") that may not match the consumer's actual usage.
  - Placeholder masters live in the **`Icons Placeholder`** frame on the Icons page (separate from `Icons md` / `Icons lg`): `placeholder-16` for 16px slots (md), `placeholder-20` for 20px slots (lg). Both already exist — never create new placeholders without explicit user confirmation.
  - Size mapping: **16 = md, 20 = lg.** The size comes from the slot dimensions in the Figma component, not from a name suffix on the source icon.
  - Canonical examples: Badge (multi-slot switchable, defaults to placeholder), SidebarButton (single-slot switchable, defaults to `placeholder-20` at `512:2395`), Button (single-slot switchable, defaults to `placeholder-20`), TrailNav bell (static, real `lucide/bell` at lg).

### Step 1b: Read the component's property definitions (its real API)

**Before inferring anything from rendered geometry, read the contract.** Pull `componentSet.componentPropertyDefinitions` (and, on a representative variant, each node's `componentPropertyReferences`) via `use_figma`. This is the single most reliable source for:

- **The component's real API** — every `VARIANT` / `BOOLEAN` / `INSTANCE_SWAP` / `TEXT` property with its default. Mirror these into the React prop API (e.g. `Show info icon` BOOLEAN → `showInfo`; `Leading Icon` INSTANCE_SWAP + `Show Leading Icon` BOOLEAN → a `leadingIcon` node prop; `Label` TEXT → `label`). The Figma property set IS the spec — don't guess props from pixels.
- **Intentional slot vs leftover** — a hidden node whose `componentPropertyReferences` binds its `visible` to a BOOLEAN (or `mainComponent` to an INSTANCE_SWAP) is an **intentional, toggleable slot** (it just happens to be off in this variant), NOT a mistake. Only a hidden node with **no** property reference is a possible leftover worth flagging. (A `findAll` tree-walk surfaces hidden layers; without this check you'll mis-flag deliberate toggle slots as stray.)
- **Composition that the variant axis encodes** — Figma often encodes "has a leading select" etc. as extra `State`/`Variant` values because it can't compose freely; in code those collapse to independent props. Read the axis options to see what's really one component vs separate states.

Output a short prop-map (Figma property → React prop) as part of the Step 4 compare.

### Step 2: Token Validation

Map every Figma value to a token in `tokens.css` / `design.md`. **Decide and proceed**; only stop when:

- A color is genuinely off-palette (no nearby Deep Sea Neutral / brand color).
- A radius/spacing isn't in the existing scale and the design intent is unclear.
- The Figma file uses a different scale than ours (e.g. `DS-Gray-Neutral/950` vs our `Deep Sea Neutral/900`) — pick the closest match by intent, mention the substitution once, move on.

For exact matches with different precision (e.g. raw `#9DA3B0` vs bound `Deep Sea Neutral/400`), bind silently — that's the whole point of the routine.

#### Legal vs illegal tokens — the origin discriminator (run when a value doesn't map to an existing `tokens.css` token)

Designers do two different things, and they get opposite treatment. The single question that decides it: **"Is the underlying variable already in OUR Figma variable collections (1. Color Primitives · 2. Semantic · 3. Badge · 4. Sizing · 5. Typography · 6. Icon)?"** Check via `use_figma` (`getVariableByIdAsync` on the node's `boundVariables`, or search the collections by name) — don't guess from the value.

- **LEGAL — the variable IS in our Figma collections, just not yet mirrored to `tokens.css`** (e.g. a primitive Efrain added like `Bittersweet/200`). It's canonical by definition — it lives in our own design system. **Mirror it into `tokens.css` (and `design.md`) with a one-line mention, then bind and proceed. NO approval gate. NO "add it to Figma" (it's already there).** A legal token never blocks the cycle.
- **ILLEGAL — the variable is NOT in our collections** (raw hex with no binding, a foreign-kit name like `gray/300` / `DS-Gray-Neutral`, or a text/paint style from an external library). This is drift. **Block, flag it, and either rebind to our closest existing token (mention the substitution) or propose a brand-new token — approval required.** This is "normalize as usual."
- **BRAND-NEW to BOTH our Figma and our code** (exists nowhere yet). Propose the token (name + value + scope), add it to **both** `tokens.css` and the matching Figma collection, get approval, then bind.

Mnemonic: *legal → mirror-with-mention (no gate); illegal/new → flag-and-gate.* The mistake to avoid is treating a legal-but-unmirrored token (already in our Figma) as if it were brand-new and stopping to ask — it only needs mirroring + a mention.

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

#### Tier classification — assign it now, carry it through Phase 3

Every normalized component is an **atom**, **molecule**, or **organism**. Decide the tier as part of classification and state it out loud (e.g. *"MatchRow → molecule"*). It is NOT a loose label — it drives concrete placement in three synced surfaces (enforced in Step 7):

1. The **Figma page** the master lives on: `Components-Atoms` / `Components-Molecules` / `Components-Organisms`. **This is the single source of truth.** If the master is on the wrong page, move it (Phase 1) — don't let the page and the code label disagree.
2. The **`packages/ui/src/index.js` export group** (`── Atoms ──` / `── Molecules ──` / `── Organisms ──`).
3. The **`playground/normalization-tracker.md` → `## Normalized Components` sub-table** (`### Atoms` / `### Molecules` / `### Organisms`), with the row's leading cell labeled `Name (tier)`.

All three MUST agree. A mismatch (e.g. a tracker row labeled `(molecule)` for a master on the Organisms page) is the exact drift this step exists to prevent — it forces a later full audit. Rough guide: **atom** = indivisible primitive (Button, Badge, IconButton); **molecule** = a few atoms composed into one unit (SearchField, MatchRow, EntityChip); **organism** = a self-contained section composing molecules/atoms (Navbar, Widget, ModalLarge, ResultsPreview). When in doubt, the Figma page already reflects the designer's intent — match it.

### Step 3b: Apply Figma writes

Do all the Figma changes the normalization requires:
- Bind unbound colors / spacings / radii to existing variables.
- Add new variants (clone existing → modify → add to set) if the spec needs them.
- Add INSTANCE_SWAP / TEXT / BOOLEAN component properties as needed. **INSTANCE_SWAP icon slot defaults follow this rule:**
  - **No universal default** (e.g. `Button.icon`, Badge `leftIcon` / `rightIcon` — every consumer brings a different icon, no realistic shared default) → default to placeholder (`Icons Placeholder/placeholder-16` for 16px slots, `Icons Placeholder/placeholder-20` for 20px slots).
  - **Has a universal default** (e.g. TrailNav Profile chevron defaults to `lucide/chevron-down` — the closed-state default; TrailNav Editor right-icon defaults to `lucide/x` — close is the typical role) → default to the realistic icon, since defaulting to a placeholder would force every consumer to swap.
  - Real lucide as a default for a "no universal default" slot is drift — swap it for the placeholder.
- **Picker scoping via collection artboards:** when a switchable slot has ≥2 realistic alternatives (chevron-up/down, X/help, etc.), create a "collection" frame on the **Icons page** named after the pair (examples: `Chevron Up/Down`, `X / Help`). Place INSTANCES of the masters inside the frame. Then set the INSTANCE_SWAP property's `preferredValues` to the master component KEYS (not the instance IDs — `preferredValues` accepts component keys only). The collection frame is a visual reference for designers ("here are the options for this slot"); `preferredValues` is the technical restriction that scopes the picker. Both work together.
- Expose nested instance properties (`isExposedInstance: true`) where variant pickers should bubble up to parents.
- Take a screenshot of the result.

### Step 3c: Nested-component audit (mandatory for molecules + organisms)

**Normalizing a molecule or organism means normalizing everything inside it too.** Walk the component tree and verify:

**Run ONE comprehensive sweep first, then fix in batch.** Do not sample-and-fix iteratively. The pattern is: write a single `use_figma` script that enumerates EVERY violation across the component tree — every legacy icon master, every unbound fill/stroke/spacing/radius, every text node inheriting an external `textStyleId`, every text node missing local text-style application — produce one report, present it to the user for batch decisions, then execute fixes in one script. Sample-and-fix surfaces missed items at every review and burns user time on re-corrections.

- **Every color** is bound to a `Deep Sea Neutral/*`, `Carolina Blue/*`, `Bittersweet/*`, etc. variable — never raw hex, never legacy scales (e.g. `DS-Gray-Neutral/*` if those somehow exist). Use `use_figma` to read `boundVariables` on every fill / stroke. Raw hex on text fills, frame strokes, and icon strokes is the most common miss.
- **Every icon** is an instance of the right master, depending on whether the slot is static or switchable:
  - Static slots → `lucide/<kebab-name>` from `Icons md` (`230:1054`) at 16px or `Icons lg` (`366:619`) at 20px.
  - Switchable slots (INSTANCE_SWAP) → `placeholder-16` or `placeholder-20` from the `Icons Placeholder` frame.
  Hand-drawn vectors don't count — replace them with the right master. A switchable slot defaulting to a real lucide icon is also drift — swap it for the matching placeholder.
- **Every sub-component** that has a parallel in our library is an actual instance of that library component. A "badge" inside a molecule must be an INSTANCE of `Badge` (the component set `213:27`), not a frame styled to look like one. A "button" inside must be an instance of `SidebarButton` / future Button, not a frame with the same dimensions. **Frame-that-looks-like-component is a code smell — replace it with `createInstance()` of the real component, even if it costs a re-layout.**
- **Naming clarity:** when you insert an instance, name it after the source component (`Badge`, not `Notification Badge`) so the layers panel makes the relationship obvious to anyone reviewing the file. The custom name shouldn't disguise what it is.
- **Every text node uses a LOCAL text style.** Two failure modes to catch:
  - **External library text styles** — when a text node has a `textStyleId` pointing to a style from a *different* file (e.g. the legacy OdysseyOne library: `inter-text-sm/leading-5/font-medium` etc.), that's drift. The publish drags the external dependency. Detach by replacing the styleId with a local equivalent: `await textNode.setTextStyleIdAsync(localStyle.id)`.
  - **No style applied + individual variable bindings** — binding `fontSize` / `lineHeight` / `fontWeight` / `fontFamily` individually on a text node works for runtime values but doesn't carry semantic meaning ("this is a heading", "this is a label"). Apply a local text style instead — it composes the typography variables under one semantic name.

  Local text style catalog should cover the cross-component typography needs (display/heading/body/label tiers × size × weight). Each style binds `fontFamily`/`fontSize`/`lineHeight`/`fontWeight` to typography variables so token changes cascade. If a needed style doesn't exist, create it (in Figma via `figma.createTextStyle()`) AND mirror as a `.text-{tier}-{size}-{weight}` utility class in `components.css`.

- **Icon color tracks the parent's text color (Buttons + similar).** When an icon sits inside a Button, IconButton, or any text-and-icon container, its vector strokes adopt the same color as the label — unless the consumer explicitly overrides. In **code** this is automatic: Lucide React icons default to `stroke="currentColor"`, and the surrounding component sets `color: var(--text-X)`, so the icon inherits via CSS. In **Figma** this is harder — `lucide/*` masters ship with their vector strokes pre-bound to a specific color (typically `Deep Sea Neutral/500`), and per-variant overrides don't reliably survive INSTANCE_SWAP because `placeholder-16` (the default swap target) has no Vector descendants. Two practical options: (a) **per-instance manual override** — when you swap a real lucide icon into a Button variant in Figma, also override that icon's inner Vector strokes to match the variant's label-color variable; (b) **mode-based theming** (parked, larger architectural lift) — define a `Color Mode` collection with one mode per Button variant, bind every lucide icon's strokes to a single `Icon color/active` variable, and call `setExplicitVariableModeForCollection` at each Button variant to switch modes for its subtree. Until (b) ships, code is the source of truth for icon-in-button colors; Figma renderings may drift on the master, which is acceptable as long as the consumer-side render in the running app is correct.

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

### Step 4b: Phase 2 path choice — ask the user

Before writing code, ask explicitly:

> "DesignSystemMap.html validation first, or straight to wiring consumers in the project?"

**Default suggestion for multi-state atoms** (Button, Input, Toggle, Select, etc., where hover/pressed/disabled live on the component) **is DesignSystemMap-first.** The reason: hover/pressed/focus states can't be exercised without consumers, and consumers may not exist yet for every state. Wiring consumers first risks shipping broken interactive states because no one tested them.

For single-state components or when the project already has consumers exercising every state, going straight to consumers is fine.

The choice changes the Step 5 → Step 6 ordering, NOT what gets done. Phase 3 still updates the DesignSystemMap as a tracker entry regardless.

#### Path A — DesignSystemMap-first (default for multi-state atoms)

**The whole point of Path A is to validate the *design* before committing to *code*.** Do NOT write the React component or any production CSS until DSM validation passes. The DSM section uses self-contained scoped CSS (e.g. `.btn-demo` classes inside a `<style>` block within the section's HTML) so it stands alone, independent of any React work.

**Section placement:** In-progress sections live in the **Normalize tab** (`tab-nav-right`, activated via `activateNormalizeTab(content)`), NOT in the Components tab composition line. They render WITHOUT the green `NORMALIZED` pill — that pill is the post-validation marker. After GATE B-DSM passes, the section is *moved* to the Components tab and the pill is added.

1. **Delegate to a subagent** to add the in-progress section to the **Normalize tab** of `playground/DesignSystemMap.html` with demo cards for every variant × size × state. The section ships its own scoped `<style>` block (no production CSS touched yet). NO `NORMALIZED` pill on the section title. Mirror existing Components-tab sections for visual DNA but skip the pill. (See "DesignSystemMap = always subagent" rule below.)
2. **GATE B-DSM** — user opens the Normalize tab in a browser, hovers/clicks every state, signs off. If anything's off, iterate on the Normalize-tab section only — still no React.
3. **Sync Figma masters with any spec deltas from DSM iterations.** Dispatch a subagent (`use_figma`) to update the Figma component set so the masters reflect the FINAL agreed spec — not the GATE-A-era spec. **This is non-negotiable: Figma is updated before any production code is written.** See the "Figma always before code" rule below.
4. **Subagent moves the validated section** from Normalize tab → Components tab: removes from `activateNormalizeTab(...)` content, adds to the composition line `compTab.innerHTML = ... + getXyzComponentHTML() + ...`, adds the `NORMALIZED` pill to the section title, adds the `compDetails.<Name>` modal entry.
5. Step 5: Write the React component + `.figma.tsx` + production CSS classes (the DSM scoped styles port to `components.css` cleanly here).
6. Step 6: Wire consumers.
7. **GATE B-Project** — user runs the dev server, reports any Step-9 refinements.

> **Path A common mistakes:**
> - Writing the React component in step 1 alongside the DSM section — defeats the whole point. If you're going to write React anyway, do Path B.
> - Dumping the in-progress section directly into the Components tab with the `NORMALIZED` pill — that lies to anyone scanning the page. Use the Normalize tab until GATE B-DSM passes.
> - **Skipping step 3 (Figma sync) and going straight to React after GATE B-DSM** — the masters then lag the running app. Designers composing product screens get the wrong visuals. ALWAYS sync Figma between GATE B-DSM and Step 5.
> - Editing DSM directly from the main thread instead of via a subagent — see the rule below. No exceptions, even for one-line bug fixes.

### Figma always before code (system-wide rule)

**Whenever the spec changes — at GATE A, mid-Phase-2 during DSM iteration, or post-GATE-B refinements — the order is always: Figma → DSM → Code. Never reverse.**

If you catch yourself about to edit production code (`packages/ui/`, `apps/odyssey-one/src/`) while the Figma component set is on an older spec, that's the violation. Stop, dispatch a subagent to update Figma first, then continue. This rule is what makes Code Connect publish meaningful — designers dragging instances see the same component the user runs.

#### Path B — Consumer-first
1. Step 5: Write the component + `.figma.tsx`.
2. Step 6: Wire consumers.
3. **GATE B** — user runs the dev server.
4. Phase 3 adds the DesignSystemMap section as documentation.

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
- [ ] **`playground/DesignSystemMap.html` Components tab updated with the new component section** (NORMALIZED pill, layout/states demo, props table, token contract table, Figma reference, Code Connect note). **Always use a subagent** (general-purpose) — see "DesignSystemMap = always subagent" rule below. Add the new function to the composition line at the bottom (e.g. `... + getNewComponentHTML()`). Mirror the existing Badge / Button / SidebarButton / Sidebar / GlobalSearch / LeadNav / TrailNav sections for visual DNA.
- [ ] Normalize tab cleared (any temporary preview content removed).
- [ ] **`packages/ui/src/index.js` export added under the correct tier group** (`── Atoms ──` / `── Molecules ──` / `── Organisms ──`) — matching the tier assigned in Step 3. Don't append to the bottom; place it in its section.
- [ ] **`playground/normalization-tracker.md` → `## Normalized Components` row added under the correct tier sub-table** (`### Atoms` / `### Molecules` / `### Organisms`), leading cell labeled `Name (tier)`. Plus (if applicable) entries in "Pushed to Figma" / "Pending Figma Sync" / "Pushed to Figma → Code Connect".
- [ ] **Tier consistency check:** the Figma page, the `index.js` group, and the tracker sub-section all agree on the tier (per Step 3). If they don't, fix it now — this is what prevents a future full-library audit.
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
3. List the **new pending** icons and which frame to add them to: md → `Icons md` (`230:1054`), lg → `Icons lg` (`366:619`). User adds via Lucide plugin. **Placeholders are never "new pending"** — `placeholder-16` and `placeholder-20` already exist in the separate `Icons Placeholder` frame; if you think you need a new placeholder size, stop and ask first.
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
- Pre-flight check before every code-touching tool call: did the user explicitly approve the Figma changes? If you can't quote the approval phrase, you haven't crossed GATE A.

### Token inventory pre-flight (run FIRST, before any writing)

**Before writing a single line of CSS, DSM section, or Figma master — inventory tokens.** This is non-negotiable. The token-discipline failures in past cycles all came from skipping this and discovering existing tokens *after* the work was done.

Required reads at the start of Phase 2 (and again at the start of any DSM/code work):

1. **`packages/tokens/tokens.css`** — read top to bottom. Note every existing token by category:
   - Colors (DSN scale, brand colors, semantic colors)
   - Typography (`--font-primary`, `--font-size-xs/sm/base/lg`, `--line-height-xs/sm/base/lg`, weights if any)
   - Spacing (`--spacing-1/2/3/4/5/6/8/12`)
   - Radius (`--radius-sm/md/lg/xl/pill/full`)
   - Shadow (`--shadow-sm/md/lg/up-md`)
   - Icon (`--icon-size-md/lg`, `--icon-stroke-md/lg`)
   - Transition (`--transition-fast/base/slow`)
   - Layout (`--navbar-height`, etc.)
   - Component tokens (`--btn-*`, `--badge-*`, etc. — re-use or supersede)
2. **Figma variable collections** (via `use_figma`): list every collection's vars — colors (1–3), sizing (4 — Spacing + Radius), typography (5 — Font Size + Line Height + Font Weight), icon (6).
3. **Match the spec to the inventory.** For each value category the new component touches (e.g. font-size, line-height, padding, gap, border-width, transition, shadow, icon-size, focus outline), confirm a token exists.
4. **If a token is missing, propose it BEFORE writing.** Don't hardcode and tokenize later.

Common categories that get skipped — verify these explicitly each cycle:
- `--font-primary` (font-family) — never write `'Inter', sans-serif` directly
- `--font-size-*` and `--line-height-*` — never write raw `14px`/`20px`/`16px`/`24px`
- `--icon-size-md` (16) and `--icon-size-lg` (20) — never write raw width/height for icons
- `--transition-fast` (150ms) — never write raw `120ms ease` or `200ms`
- `--shadow-sm` — never write the full `0 1px 2px rgba(0,0,0,0.05)` literal
- `--border-focus` — for focus rings, use the semantic token

Skipping this pre-flight is the single most expensive mistake in past cycles: it forces a full revisit of CSS, Figma, and DSM after the user catches the drift. Always inventory first.

### Token discipline — every value goes through a token

Hardcoded values are normalization failures. The "no hardcoded hex/rgb/rgba" rule extends to **every value category**:

| Category | What must be a token |
|---|---|
| Color | fills, strokes, text colors, shadow color |
| Spacing | padding, gap, margin |
| Radius | corner radius |
| Typography | font-family, font-size, line-height, letter-spacing, font-weight |
| Sizing | icon dimensions, fixed widths/heights, min/max constraints |
| Border | border-width if we use multiple (1, 1.5, 2px) |
| Effect | shadow blur, offset, spread |
| Outline | focus-ring color, width, offset |
| Transition | duration, easing curves |

**If a needed token isn't in `tokens.css`,** first apply the origin discriminator from Step 2:
- **Legal** (the variable already exists in our Figma collections — e.g. an Efrain-added primitive): mirror it into `packages/tokens/tokens.css` (+ `design.md`) **with a one-line mention, no approval gate**, then bind. Don't re-add it to Figma — it's already there.
- **Illegal / brand-new** (foreign token, or exists in neither our Figma nor code): **stop, propose it** (name + value + scope) to the user; for brand-new add it to `tokens.css` AND the matching Figma collection; for foreign rebind to our closest token or propose a replacement. Either way, approval required. Never hardcode and "tokenize later."

**This rule applies in three places, not just one:**

1. **Production code** (`packages/ui/<Component>.jsx`, `apps/odyssey-one/src/styles/components.css`): only `var(--token)` references. Pre-flight grep for `\d+px`, raw hex `#`, `rgb(`, `rgba(` on the changed files — every match is suspect.
2. **Figma masters**: every fill/stroke/padding/gap/radius shows a bound variable in `boundVariables`. Every text node has a text-style applied or font properties bound to typography variables. Inspect via `use_figma` before screenshotting at GATE A.
3. **DSM section**: even though demos are scoped HTML/CSS, prefer `var(--token, fallback)` references so the DSM stays in sync if tokens shift, and the in-file inspector can read them.

**Consumer migration is part of normalization.** When you wire consumers to the new component, also normalize their usage — icon sizes must match the new component's spec (e.g. `<Button>` expects 20px icons, so consumers passing `{...ICON_MD}` = 16 need to switch to `{...ICON_LG}` = 20 or migrate to the `icon` prop). Don't leave consumers calling the new API with old-API assumptions.

### Pre-completion checklist (run before declaring any phase done)

- [ ] No raw px values in the new component or its CSS (except width/height for icons that map to a sizing token).
- [ ] No raw hex / rgb / rgba.
- [ ] All Figma fills/strokes show `boundVariables`.
- [ ] All Figma text nodes apply a LOCAL text style (not external library style, not just individual property bindings). Verify via `textNode.textStyleId` resolving to a style returned by `figma.getLocalTextStylesAsync()`.
- [ ] Consumer call sites updated to the new component's spec (icon sizes, prop API).
- [ ] Any new tokens are in BOTH `tokens.css` AND the Figma variable collection.

### DesignSystemMap = always subagent

**Building or updating any section of `playground/DesignSystemMap.html` is always delegated to a subagent (`general-purpose`). No exceptions** — applies to both Phase 2 Path A and Phase 3.

Why:
- DSM sections are token-heavy, repetitive HTML strings (long concatenations, demo card scaffolding, modal tables) that bloat the main conversation context with low-information bytes.
- The main thread's job is to **spec** the section (what to demo, what tokens to surface, modal table contents) and **review** the result, not to type the concatenations.
- Verification still requires the user to open the page in a browser regardless of who wrote the section — delegating doesn't slow the GATE loop.

How to dispatch:
- Subagent type: `general-purpose`.
- Hand it: the path to `DesignSystemMap.html`, the current insertion point or function to edit, the source-of-truth React component file (for the audit-the-code rule), the props + tokens content for the modal entry, and the composition-line update (`... + getNewComponentHTML() + ...`).
- After it reports back, main thread verifies: section renders, modal trigger works, no broken HTML, composition line is correct.

This rule applies retroactively to any future edits of existing sections (refinements, hover-state additions, tracker corrections) — they go through a subagent too.
