# Odyssey Design System

> Source of truth for design tokens across Odyssey applications.
> Generated from Figma (Test-MCP) and the audited color system (March 2026).

---

## Table of Contents

- [How to Use This File](#how-to-use-this-file)
- [Color Tokens](#color-tokens)
  - [Primitives](#primitives)
  - [Semantic Tokens](#semantic-tokens)
  - [Component Tokens](#component-tokens)
- [Typography](#typography)
- [Border Radius](#border-radius)
- [Shadows](#shadows)
- [Icons](#icons)
- [Setup & Code Deliverables](#setup--code-deliverables)
- [Extending This System](#extending-this-system)

---

## How to Use This File

This document is both **human-readable documentation** and a **machine-readable source** for generating code tokens. Each token section uses a consistent table format that tooling can parse to produce framework-specific outputs.

**Setup:** Run `node setup-design-system.mjs` to generate stack-specific token files. It will prompt for your target stack (React or PrimeNG).

When this file is updated, re-run setup to regenerate code deliverables.

---

## Color Tokens

### Naming Convention

| Context | Format | Primitive Example | Semantic Example |
|---------|--------|-------------------|------------------|
| Display | Spaced | Deep Sea Neutral 900 | Text Primary |
| Figma | Lowercase / slashed | `deep-sea-neutral/900` | `text/primary` |
| SCSS | $kebab-case | `$deep-sea-neutral-900` | `$text-primary` |
| TypeScript | camelCase | `deepSeaNeutral900` | `textPrimary` |

### Primitives

#### Deep Sea Neutral (10 tokens)

Unified neutral scale. Consolidated from DS-Gray-Neutral, Gray/*, gray/*, neutral/700, and DS-Gray-Blue.

| Step | Hex | Figma Token | Usage |
|------|-----|-------------|-------|
| 50 | #F7F8FA | `deep-sea-neutral/50` | Page backgrounds, subtle fills |
| 100 | #F2F3F5 | `deep-sea-neutral/100` | Hover states, alternating rows |
| 200 | #E4E6EB | `deep-sea-neutral/200` | Card borders, dropdown outlines |
| 300 | #D0D4DB | `deep-sea-neutral/300` | Input borders, dividers, disabled bg |
| 400 | #9DA3B0 | `deep-sea-neutral/400` | Placeholder text, disabled icons |
| 500 | #6B7280 | `deep-sea-neutral/500` | Secondary body text, helper text |
| 600 | #4C5463 | `deep-sea-neutral/600` | Muted labels, captions |
| 700 | #384253 | `deep-sea-neutral/700` | Button text, body copy |
| 800 | #283142 | `deep-sea-neutral/800` | Strong emphasis text |
| 900 | #1B2537 | `deep-sea-neutral/900` | Headings, highest contrast text |

#### White (1 token)

| Step | Hex | Figma Token |
|------|-----|-------------|
| — | #FFFFFF | `white` |

#### Carolina Blue (2 tokens) — Links, Info

| Step | Hex | Figma Token |
|------|-----|-------------|
| 400 | #5BA4D4 | `carolina-blue/400` |
| 600 | #276DA2 | `carolina-blue/600` |

#### Bittersweet (3 tokens) — Error, Red Badges

| Step | Hex | Figma Token |
|------|-----|-------------|
| 100 | #FDE5E3 | `bittersweet/100` |
| 600 | #D23930 | `bittersweet/600` |
| 800 | #922922 | `bittersweet/800` |

#### Caribbean Green (3 tokens) — Success, Green Badges

| Step | Hex | Figma Token |
|------|-----|-------------|
| 100 | #D4F3EB | `caribbean-green/100` |
| 600 | #237E70 | `caribbean-green/600` |
| 800 | #1D524A | `caribbean-green/800` |

#### Sunrise Yellow (5 tokens) — Warning, Yellow Badges

| Step | Hex | Figma Token |
|------|-----|-------------|
| 50 | #FFFBEB | `sunrise-yellow/50` |
| 100 | #FDF1C8 | `sunrise-yellow/100` |
| 200 | #FADF7E | `sunrise-yellow/200` |
| 300 | #F8CE51 | `sunrise-yellow/300` |
| 800 | #8F3F11 | `sunrise-yellow/800` |

#### Bay of Many (2 tokens) — Blue Badges

| Step | Hex | Figma Token |
|------|-----|-------------|
| 100 | #D0F1FF | `bay-of-many/100` |
| 950 | #063A83 | `bay-of-many/950` |

#### Purple (2 tokens) — Purple Badges

| Step | Hex | Figma Token |
|------|-----|-------------|
| 100 | #EDE9FE | `purple/100` |
| 800 | #5B21B6 | `purple/800` |

### Semantic Tokens

Semantic tokens reference primitives by name, not by hex value.

#### Text

| Display Name | Figma Token | Primitive | Hex |
|-------------|-------------|-----------|-----|
| Text Primary | `text/primary` | `deep-sea-neutral/900` | #1B2537 |
| Text Secondary | `text/secondary` | `deep-sea-neutral/700` | #384253 |
| Text Tertiary | `text/tertiary` | `deep-sea-neutral/500` | #6B7280 |
| Text Placeholder | `text/placeholder` | `deep-sea-neutral/400` | #9DA3B0 |
| Text Inverse | `text/inverse` | `white` | #FFFFFF |
| Text Inverse Muted | `text/inverse-muted` | `deep-sea-neutral/300` | #D0D4DB |
| Text Link | `text/link` | `carolina-blue/600` | #276DA2 |
| Text Error | `text/error` | `bittersweet/600` | #D23930 |
| Text Success | `text/success` | `caribbean-green/600` | #237E70 |
| Text Warning | `text/warning` | `sunrise-yellow/800` | #8F3F11 |

#### Background

| Display Name | Figma Token | Primitive | Hex |
|-------------|-------------|-----------|-----|
| BG Primary | `bg/primary` | `white` | #FFFFFF |
| BG Secondary | `bg/secondary` | `deep-sea-neutral/50` | #F7F8FA |
| BG Tertiary | `bg/tertiary` | `deep-sea-neutral/100` | #F2F3F5 |
| BG Inverse | `bg/inverse` | `deep-sea-neutral/900` | #1B2537 |
| BG Error | `bg/error` | `bittersweet/100` | #FDE5E3 |
| BG Success | `bg/success` | `caribbean-green/100` | #D4F3EB |
| BG Warning | `bg/warning` | `sunrise-yellow/50` | #FFFBEB |

#### Border

| Display Name | Figma Token | Primitive | Hex |
|-------------|-------------|-----------|-----|
| Border Default | `border/default` | `deep-sea-neutral/300` | #D0D4DB |
| Border Subtle | `border/subtle` | `deep-sea-neutral/200` | #E4E6EB |
| Border Strong | `border/strong` | `deep-sea-neutral/900` | #1B2537 |
| Border Focus | `border/focus` | `carolina-blue/400` | #5BA4D4 |
| Border Inverse | `border/inverse` | `deep-sea-neutral/600` | #4C5463 |

### Component Tokens

Component tokens are for Figma organization. In code, components consume semantic tokens directly.

#### Navbar

| Figma Token | Resolves To | Hex |
|-------------|-------------|-----|
| `navbar/bg` | `bg/inverse` | #1B2537 |
| `navbar/text` | `deep-sea-neutral/50` | #F7F8FA |
| `navbar/text-muted` | `text/placeholder` | #9DA3B0 |
| `navbar/search-bg` | `bg/inverse` | #1B2537 |
| `navbar/search-focus` | `border/focus` | #5BA4D4 |
| `navbar/search-dropdown` | `deep-sea-neutral/700` | #384253 |
| `navbar/divider` | `border/inverse` | #4C5463 |
| `navbar/notification` | `bittersweet/600` | #D23930 |
| `navbar/user-name` | `text/inverse-muted` | #D0D4DB |

#### Button

| Figma Token | Resolves To | Hex |
|-------------|-------------|-----|
| `btn/primary-bg` | `bg/inverse` | #1B2537 |
| `btn/primary-text` | `text/inverse` | #FFFFFF |
| `btn/secondary-bg` | `bg/primary` | #FFFFFF |
| `btn/secondary-border` | `border/default` | #D0D4DB |
| `btn/secondary-text` | `text/secondary` | #384253 |
| `btn/disabled-bg` | `deep-sea-neutral/300` | #D0D4DB |
| `btn/disabled-text` | `text/inverse` | #FFFFFF |
| `btn/link-text` | `text/link` | #276DA2 |

#### Input / Form Field

| Figma Token | Resolves To | Hex |
|-------------|-------------|-----|
| `input/bg` | `bg/primary` | #FFFFFF |
| `input/border` | `border/default` | #D0D4DB |
| `input/border-focus` | `border/strong` | #1B2537 |
| `input/text` | `text/primary` | #1B2537 |
| `input/placeholder` | `text/placeholder` | #9DA3B0 |
| `input/label` | `text/secondary` | #384253 |

#### Radio / Checkbox

| Figma Token | Resolves To | Hex |
|-------------|-------------|-----|
| `radio/border` | `border/default` | #D0D4DB |
| `radio/selected-bg` | `bg/inverse` | #1B2537 |
| `radio/indicator` | `text/inverse` | #FFFFFF |

#### Tabs

| Figma Token | Resolves To | Hex |
|-------------|-------------|-----|
| `tab/active-bg` | `deep-sea-neutral/200` | #E4E6EB |
| `tab/active-text` | `text/primary` | #1B2537 |
| `tab/inactive-text` | `deep-sea-neutral/600` | #4C5463 |

#### Panel / Sidebar

| Figma Token | Resolves To | Hex |
|-------------|-------------|-----|
| `panel/bg` | `bg/primary` | #FFFFFF |
| `panel/border` | `border/subtle` | #E4E6EB |
| `panel/heading` | `text/primary` | #1B2537 |
| `panel/footer-border` | `border/subtle` | #E4E6EB |

#### Badge

| Figma Token | Resolves To | Hex |
|-------------|-------------|-----|
| `badge/blue-bg` | `bay-of-many/100` | #D0F1FF |
| `badge/blue-text` | `bay-of-many/950` | #063A83 |
| `badge/green-bg` | `caribbean-green/100` | #D4F3EB |
| `badge/green-text` | `caribbean-green/800` | #1D524A |
| `badge/yellow-bg` | `sunrise-yellow/100` | #FDF1C8 |
| `badge/yellow-text` | `sunrise-yellow/800` | #8F3F11 |
| `badge/red-bg` | `bittersweet/100` | #FDE5E3 |
| `badge/red-text` | `bittersweet/800` | #922922 |
| `badge/purple-bg` | `purple/100` | #EDE9FE |
| `badge/purple-text` | `purple/800` | #5B21B6 |

#### Dropdown

| Figma Token | Resolves To | Hex |
|-------------|-------------|-----|
| `dropdown/bg` | `bg/primary` | #FFFFFF |
| `dropdown/border` | `border/subtle` | #E4E6EB |
| `dropdown/hover-bg` | `bg/tertiary` | #F2F3F5 |

#### Alert / Banner

| Figma Token | Resolves To | Hex |
|-------------|-------------|-----|
| `alert/warning-bg` | `bg/warning` | #FFFBEB |
| `alert/warning-border` | `sunrise-yellow/200` | #FADF7E |
| `alert/warning-text` | `text/warning` | #8F3F11 |
| `alert/error-bg` | `bg/error` | #FDE5E3 |
| `alert/error-text` | `text/error` | #D23930 |
| `alert/success-bg` | `bg/success` | #D4F3EB |
| `alert/success-text` | `text/success` | #237E70 |

---

## Typography

### Font Families

| Token | Family | Usage |
|-------|--------|-------|
| `font-primary` | Inter | All UI text — labels, body, headings, buttons, tabs, form data |

> Public Sans and IBM Plex Sans were normalized to Inter. Both were 14px/20px with exact Inter equivalents.

### Type Scale

All sizes extracted from Figma variables and component inspection.

| Token | Size | Line Height | Weight | Family | Usage |
|-------|------|-------------|--------|--------|-------|
| `text-xs-normal` | 12px | 16px (1.33) | 400 (Regular) | Inter | Small annotations |
| `text-xs-medium` | 12px | 16px (1.33) | 500 (Medium) | Inter | Badge labels, count text |
| `text-xs-tight` | 12px | 12px (1.0) | 400 (Regular) | Inter | Compact labels |
| `text-sm-normal` | 14px | 20px (1.43) | 400 (Regular) | Inter | Body text, form values |
| `text-sm-medium` | 14px | 20px (1.43) | 500 (Medium) | Inter | Labels, menu items |
| `text-sm-semibold` | 14px | 20px (1.43) | 600 (Semi Bold) | Inter | Emphasized labels |
| `text-base-normal` | 16px | 24px (1.5) | 400 (Regular) | Inter | Large body text |
| `text-base-medium` | 16px | 24px (1.5) | 500 (Medium) | Inter | Button text (secondary) |
| `text-base-semibold` | 16px | 24px (1.5) | 600 (Semi Bold) | Inter | Section headings |
| `text-lg-semibold` | 18px | 24px (1.33) | 600 (Semi Bold) | Inter | Panel/filter headings |
| ~~`text-sm-sans-medium`~~ | — | — | — | ~~Public Sans~~ | Normalized to `text-sm-medium` (Inter) |
| ~~`text-sm-data`~~ | — | — | — | ~~IBM Plex Sans~~ | Normalized to `text-sm-normal` (Inter) |

### Letter Spacing

All typography tokens use `0` letter-spacing (normal).

---

## Border Radius

Consistent scale derived from Figma component inspection across all screens.

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Status badges |
| `radius-md` | 6px | Inputs, form fields, tabs, small icon buttons |
| `radius-lg` | 8px | Buttons (primary/secondary), cards, select menus |
| `radius-xl` | 16px | Tables, large panels |
| `radius-pill` | 10px | Count badges, pill shapes |
| `radius-full` | 9999px | Fully round elements (avatars, radio buttons) |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0px 1px 2px 0px rgba(0, 0, 0, 0.05)` | Inputs, buttons, cards |

---

## Icons

| Library | Package | URL |
|---------|---------|-----|
| Lucide | `lucide-react` (React) / `lucide-angular` (PrimeNG) | https://lucide.dev/icons/ |

Lucide is the sole icon library for Odyssey. Use it for all iconography. Do not mix with other icon sets.

**Setup install:**
- React: `npm install lucide-react`
- PrimeNG: `npm install lucide-angular`

---

## Setup & Code Deliverables

### Setup Script

Run from the `Documentation Guides/` directory:

```bash
node setup-design-system.mjs
```

This prompts for your target stack and generates only the relevant files:

| Stack | Generated Files | Icons |
|-------|----------------|-------|
| **React** | `odyssey-tokens.css` (CSS custom properties), `odyssey-tokens.ts` | `lucide-react` |
| **PrimeNG** | `_odyssey-tokens.scss` (SCSS variables), `odyssey-tokens.ts` | `lucide-angular` |

### File Reference

| File | Format | Description |
|------|--------|-------------|
| `odyssey-tokens.css` | CSS custom properties | For React projects using pure CSS |
| `_odyssey-tokens.scss` | SCSS variables | For Angular + PrimeNG projects |
| `odyssey-tokens.ts` | TypeScript constants | Shared — runtime access to token values |
| `setup-design-system.mjs` | Node script | Stack picker + file generator |

---

## Extending This System

This design system is intended to grow. Future token types to add:

- **Spacing / Padding** — consistent padding scale (4, 8, 12, 16, 24, 32px etc.)
- **Sizing** — icon sizes, component min/max dimensions
- **Z-Index** — layering scale for modals, dropdowns, tooltips
- **Transitions** — duration and easing curves
- **Breakpoints** — responsive design breakpoints

When adding a new token type:
1. Add a new `##` section to this file following the same table format
2. Regenerate all code deliverables
3. Update the Table of Contents
