# Figma Component Intake Routine

> Triggered when user shares a Figma component URL for normalization.
> Follow every step in order. Do not skip steps.

---

## Step 1: Pull from Figma

- Use `get_design_context` on the shared node URL
- Extract: padding, border-radius, gap, auto-layout direction, sizing, colors (bg, text, border), font properties (size, weight, line-height, letter-spacing), icon positions/sizes
- For icons: note position (left/right of text), size, and color — map to Lucide equivalent, never recreate SVGs

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
