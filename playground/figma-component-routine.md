# Figma Component Intake Routine

> Triggered when user shares a Figma component URL for normalization.
> Follow every step in order. Do not skip steps.

---

## Step 1: Pull from Figma

- Use `get_design_context` on the shared node URL
- Extract: padding, border-radius, gap, auto-layout direction, sizing, colors (bg, text, border), font properties (size, weight, line-height, letter-spacing), icon positions/sizes
- For icons: note position (left/right of text), size, and color — map to Lucide equivalent, never recreate SVGs
- **Icon swap slots — `lucide / Placeholder*` instances:** When a component contains an instance whose name starts with `lucide / Placeholder` (e.g., `lucide / Placeholder-16`, `lucide / Placeholder-20`), this is a **swap slot** — designers replace it with a real Lucide icon when composing screens. This signals three connected actions:
  1. **Figma side:** the Figma component must expose an `INSTANCE_SWAP` component property for the placeholder. If it doesn't yet, add one via `use_figma` (default value = the placeholder master's `key`) and wire each variant's placeholder instance via `componentPropertyReferences.mainComponent = propertyName`. Use the property name `Icon` for single-slot components, or `Left icon` / `Right icon` for multi-slot components.
  2. **Code side:** the React component needs a matching prop — `icon` for single-slot, `leftIcon` / `rightIcon` for multi-slot. The prop type is a React node (e.g. `<Home size={20} />`), mirroring the Badge pattern.
  3. **Code Connect:** map them via `figma.instance('Icon')` (or matching property name). For optional slots, wrap in `figma.boolean('Show icon', { true: figma.instance('Icon'), false: undefined })`.
  - **Canonical examples in this codebase:** `Badge` (multi-slot: `leftIcon` / `rightIcon`, both optional), `SidebarButton` (single-slot: `icon`, always required).

## Step 2: Token Validation (BLOCKING)

Before proceeding, check **every** extracted value against `design.md` and `tokens.css`. This includes:
- **Colors** (background, text, border, icon colors)
- **Typography** (font-size, font-weight, line-height, letter-spacing)
- **Border radius** (check against `--radius-sm/md/lg/xl/pill/full`)
- **Spacing** (padding, gap, margin — check if they match any defined spacing pattern)

Validate against code only (`design.md` + `tokens.css`) — do NOT call Figma MCP for validation. Figma sync is a separate routine (`/sync-check`).

- **If a value matches an existing token** → note the mapping, continue
- **If a value does NOT match any token** → **STOP and flag it to the user**:
  - Show the exact value (e.g., `#3B82F6`, `13px`, `border-radius: 8px`)
  - Ask: "This value isn't in our token system. Is this intentional (new token to add) or a mistake (should map to an existing token)?"
  - Wait for user response before continuing
  - If new token: add to `design.md`, `tokens.css`, and push to Figma
  - If mistake: user fixes in Figma and re-shares, or user tells you which token to use

## Step 3: Component Classification & Naming

Read the Figma component/layer name (e.g., "Badge", "Button", "Tooltip"). Infer matches by searching the codebase (`src/components/`) — fuzzy match by name, not exact string comparison (e.g., Figma "badge" matches `Badge.jsx`, `StatusBadge.jsx`, etc.).

### Naming enforcement (PascalCase)
- Check the Figma component name against PascalCase convention
- **If not PascalCase** (e.g., "badge1", "my-badge", "BADGE") → suggest the correct PascalCase name (e.g., `Badge`) and rename the Figma component via `use_figma` after user approves
- **If PascalCase but poor name** (e.g., "BadgeComponent", "Badge1") → suggest a better name and explain why
- The approved PascalCase name becomes the React component name AND the Figma component name — they must match

### If component EXISTS in code (exact or single match):
- This is an **update** — even if the Figma version introduces new features (icons, new props, new variants) that the code doesn't have yet
- Proceed to Step 4 (Compare). The diff will surface what's new.

### If MULTIPLE partial matches exist in code:
- **STOP and ask the user:** "Found multiple potential matches: `ComponentA`, `ComponentB`. Which one does this Figma component map to? Or is this a new unified component that replaces them?"
- Wait for user response before proceeding

### If component is NEW (not in codebase):
- **STOP and ask the user:**
  1. "What is this component for?" — get a description and use cases
  2. "Should I implement it now, or park it for later?"
- **If implement now:** proceed to Step 4 with the new component spec
- **If park for later:**
  - Add a story to the backlog with status "Not Started" (it hasn't been groomed)
  - Document the component spec (from Figma) in the story description
  - Add it to `playground/DesignSystemMap.html` in a "Planned Components" section so user remembers
  - **Do not create any React code** — stop here

## Step 4: Compare Figma vs Code

Show a side-by-side comparison:

```
| Property       | Figma              | Code               | Match? |
|---------------|--------------------|--------------------|--------|
| padding       | 2px 8px            | 2px 8px            | ✅     |
| border-radius | 4px                | 4px                | ✅     |
| font-size     | 12px               | 12px               | ✅     |
| font-weight   | 600                | 500                | ❌     |
| background    | --badge-green-bg   | --badge-green-bg   | ✅     |
| icon-left     | TriangleAlert 12px | (none)             | ❌     |
```

- Flag every ❌ difference clearly
- For new components, show "Code" column as "(new — not yet implemented)"

## Step 5: Playground Preview

**Use a subagent** for all DesignSystemMap.html updates — these are token-intensive operations.

- Add the preview to the **"Normalize" tab** in `playground/DesignSystemMap.html` — this is a fixed tab on the trailing (right) side of the header, separate from Badges/Colors/Typography
- The Normalize tab is **only active during the routine** (Steps 5–6). It shows a visible indicator that a normalization is in progress.
- For existing components: render both "Current" (red border) and "Proposed" (green border) versions side by side
- For new components: render the "Proposed" version only
- User reviews visually before any code changes

## Step 6: User Approval

- Present the diff and playground preview
- Wait for explicit approval: "go ahead", "looks good", "implement it", etc.
- If user requests adjustments:
  - If Figma needs to change → user updates Figma and re-shares the link, restart from Step 1
  - If code should deviate from Figma → document the reason, proceed with user's direction

## Step 7: Implement

### 7a. Component code

**Use a subagent** for refactoring work — these are token-intensive operations.

- Update or create the React component to match approved spec
- Use design tokens (`var(--token-name)`), **never hardcoded values**
- Wire up any new props (e.g., `icon`, `statusDot`) if the Figma component introduces them
- Update all non ad-hoc usages across the codebase that use this component
- Leave ad-hoc implementations untouched — they will be normalized in a future pass when new variants may be needed

### 7b. Composite text utilities
- For each unique typography combination used by the component, check if a `@utility` class exists in `src/styles/components.css`
- **If it doesn't exist**, create it:
  ```css
  @utility text-badge {
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
  }
  ```
- **Apply** the composite class to the normalized component instead of inline font styles or stacked Tailwind classes
- **Do NOT remove** old Tailwind classes or inline styles from non-normalized components — they still depend on them
- Naming convention: `text-{component}` (e.g., `text-badge`, `text-table-header`, `text-section-label`)

### 7c. Color convention
- All colors must use CSS variable references: `var(--token-name)`
- Never hardcode hex, rgb, or rgba values in normalized components
- If the component needs a color that isn't a token, it should have been caught in Step 2

## Step 8: Sync Back

- Update `design.md` if new tokens or component rules were introduced
- Push any new tokens to Figma if they originated in code
- **If new variants or prop combinations were defined during the routine** (e.g., statusDot, icon patterns) that don't exist in the Figma component → **flag it to the user**: "We defined [variant X] in code. Want me to push it to Figma now, or add it to the pending Figma sync list?"
  - If push now → push to Figma via MCP
  - If defer → add to the **Pending Figma Sync** section in `playground/normalization-tracker.md` so user can push all deferred items in one batch later
- **Clear the Normalize tab** in `playground/DesignSystemMap.html` — remove the preview content and deactivate the tab (set to disabled/hidden state). The Normalize tab should only be visible and populated during an active routine.
- **Update the permanent tabs** (Badges/Colors/Typography) in `playground/DesignSystemMap.html` to reflect the final implemented state (**use a subagent** for this)
- If component was in a backlog story, update status to "Completed"
- **Update the normalization tracker** (`playground/normalization-tracker.md`)

### Step 8b: Icon Tracking (code → Figma, one-way)

If the normalized component imports any icons from `lucide-react`, ensure each icon exists in the Figma library so designers can swap them into instance-swap slots.

**Workflow (Claude's actions during normalization):**

1. **Identify icons in the Figma component being normalized** — look at the icon slots/layers in the Figma file. The size segment of the path comes from the Figma layer's width × height (a 16×16 layer becomes `lucide/16/...`). The icon's *name* comes from user confirmation during the routine — typically matches the corresponding `lucide-react` PascalCase export. **Do not derive sizes from current code** — the existing React component's `size={N}` prop may diverge from what the normalized Figma component dictates. Figma is the source of truth during normalization.

   **Cross-check against current code usage (mandatory, evidence-based):**
   Before settling on the icon list, grep the codebase for existing icon usage *of the component being normalized and its instance call sites*. Two patterns to catch:
   - **Direct imports in the component file** (`import { X } from 'lucide-react'`) — icons baked into the component itself.
   - **Icons passed as props from instance call sites** (e.g., `<Badge ... icon={<Info size={16} />}>`) — icons the component renders via slot but doesn't import. *These are easy to miss by reading the component alone* — they live in callers, not the component definition. The Badge → Info case (ShipmentTable) is the canonical example: Badge.jsx never mentions Info; only call sites do.

   The grep result is a **floor**, not the truth — Figma may add icons the code doesn't have yet (new variants), or normalize away icons the code uses. But the floor exists so we don't ship a tracker batch missing icons that are demonstrably in production.
2. Open `playground/icon-tracker.html` and check whether `lucide/<size>/<Name>` is already listed.
3. **For icons not yet listed**, add a new card to the appropriate tier section with:
   - PascalCase name (confirmed by user; should match `lucide-react`'s export so Code Connect can map later)
   - kebab-case plugin search name
   - Intended Figma component name: `lucide/<size-token>/PascalCase` where size-token is `md` (16px) or `lg` (20px). Examples: `lucide/md/TriangleAlert`, `lucide/lg/Search`. **Use the size token, not the pixel number** — `md`/`lg` mirror our `--icon-size-md`/`--icon-size-lg` CSS variables.
   - Size — **from the Figma layer dimensions**, mapped to the closest size token (16 → md, 20 → lg). If a Figma layer is at a non-tokenized size, flag it and ask the user before proceeding.
   - Stroke width — from token (`--icon-stroke-md` = 2.25 for md; `--icon-stroke-lg` = 2 for lg).
   - Color (`currentColor` unless overridden)
   - Components that use it
   - Status: `pending`
4. **For icons already listed as `pending`**, append the current component to its "Used in" list (don't re-suggest, don't duplicate the card).
5. **For icons already listed as `done`**, no action needed — they're in the Figma library and instances can swap them in.
6. **Tell the user** which new pending icons need manual addition via the Lucide plugin in Figma. Specify which frame to add to: **md icons → frame `230:1054` (`Lucide Icons md`)**, **lg icons → frame `366:619` (`Lucide Icons lg`)**. The tracker HTML is the visual checklist; pending icons are the backlog and future normalizations consume them when sizes match.
7. **When the user confirms an icon is added** ("TriangleAlert added"):
   a. **Look inside the appropriate Figma frame** (`230:1054` for md, `366:619` for lg) and verify the new component is present (it will have the plugin-default kebab name like `lucide/triangle-alert`).
   b. **Do NOT rename the component.** As of 2026-04-28 the convention is to keep the plugin-default name (`lucide/<kebab-name>`) — size differentiation comes from which frame the component lives in (md vs lg), not from the name path. Verify the component is created (Cmd+Opt+K), at the right size (16px for md, 20px for lg), with the right stroke width (`--icon-stroke-md` 2.25 / `--icon-stroke-lg` 2), and that its color is bound to the appropriate variable (e.g. `Deep Sea Neutral/500` for sidebar icons).
   c. Update the tracker card: change class from `pending` to `done` and `<span class="status pending">Pending</span>` to `<span class="status done">Done</span>`. The "Figma name" field on the card should match the kebab plugin output (`lucide/<kebab-name>`).
   d. Code-side update (`size`, `strokeWidth` props) follows the new Figma values, since Figma is the source.

**Direction:**
- This flow is **code → Figma only**. Lucide is the source of truth; Figma mirrors its naming.
- The only exception: if the component requires a non-Lucide custom icon (e.g., Odyssey brand mark), follow a different (not-yet-defined) flow — flag it and ask before proceeding.

**Why one-way:** the `lucide-react` package is the contract. We don't want Figma drift from the npm package. By mirroring code names (`TriangleAlert`, not `WarningTriangle`), we keep Code Connect feasible for the future.

---

## Rules

- **Figma** is the visual source of truth for how components look
- **Code (`design.md` + `tokens.css`)** is the source of truth for token values
- **Neither changes without user seeing the diff first**
- **Icons** are always mapped to Lucide — never recreate SVGs from Figma
- **Unknown tokens** always block the flow until validated by user
- **New components** always require user description + implement/park decision
- **Colors** always use `var(--token-name)` — never hardcoded hex/rgb/rgba
- **Typography** always uses composite `@utility` classes — never inline font styles or stacked Tailwind classes for normalized components
