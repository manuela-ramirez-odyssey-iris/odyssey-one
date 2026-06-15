# Design Document — Angular Figma Connect Library

## Overview

This document describes the technical design for `@odyssey/ui-angular`, an Angular standalone-component library that mirrors the existing React `@odyssey/ui` library and wires every component to its Figma node via `@figma/code-connect` using the HTML parser.

The two key goals are:

1. **Visual parity** — Angular components render the same Odyssey design system UI as their React counterparts, consuming the same `@odyssey/tokens` CSS custom properties and BEM class names.
2. **Figma Connect parity** — every Figma component set that today shows a React snippet will instead show an Angular HTML snippet, with the same Figma property mappings preserved.

The React library is strictly a **reference** source (for Figma node IDs and prop naming conventions). It is never imported by the Angular package.

### Scope

~30 components, grouped into three tiers that mirror the Figma Design System pages:

| Tier | Components |
|------|-----------|
| **Atoms** | Badge, Button *(done)*, IconButton, IconButtonGhost, FilterButton, SidebarButton, OdysseyLogo, EmptyState, SectionLabel, AddSectionDivider, AddSectionButton |
| **Molecules** | LeadNav, GlobalSearch, TrailNav, PageHeader, SectionHeader, EntityChip, WidgetMetricRow, WidgetPieChart, WidgetCtaRow, MenuRow, MenuDropdown, SearchField, CustomerRow, FormField, FilterSuggestions, MatchRow |
| **Organisms** | Navbar, Widget, WidgetsLeftMenu, ModalLarge, ModalMedium, WidgetVariantPicker, AuthModal, AuthContent, ResultsPreview |

---

## Architecture

### Package layout

```
packages/ui-angular/
├── src/
│   ├── badge/
│   │   ├── badge.component.ts
│   │   └── badge.figma.ts
│   ├── button/          ← already implemented (reference)
│   │   ├── button.component.ts
│   │   └── button.figma.ts
│   ├── icon-button/
│   │   ├── icon-button.component.ts
│   │   └── icon-button.figma.ts
│   ├── … (one folder per component)
│   └── index.ts         ← single public entry-point
├── figma.config.json
├── package.json
├── COMPONENT_STATUS.md
└── .env / .env.example  ← FIGMA_ACCESS_TOKEN (gitignored)
```

Every component lives in its own folder (`src/{kebab-name}/`) containing exactly two files:

- **`{name}.component.ts`** — the Angular standalone component.
- **`{name}.figma.ts`** — the Figma Connect mapping for that node.

### Dependency graph

```
apps/odyssey-one  ──► @odyssey/ui-angular  ──► @odyssey/tokens
                                           (peer) @angular/core
                                           (peer) @angular/common
```

`@odyssey/ui` is **not** in this graph. The Angular library is fully self-contained.

### Turborepo pipeline

The existing `turbo.json` `build` task uses `"dependsOn": ["^build"]`, which means `@odyssey/tokens` builds before `@odyssey/ui-angular` builds before any app that declares it as a dependency. No additional pipeline configuration is needed beyond registering the package in the npm workspace (it already is).

---

## Components and Interfaces

### Naming conventions

| Concern | Convention |
|---------|-----------|
| Component selector | `od-{kebab-name}` (e.g. `od-badge`, `od-form-field`) |
| `@Input()` names | Match the React prop name verbatim where possible |
| `@Output()` names | `clicked` (mirrors React `onClick`); secondary outputs like `cleared`, `toggled` where needed |
| CSS classes | Identical BEM class names from `@odyssey/tokens/tokens.css` (e.g. `btn`, `btn--primary`, `badge-metric`) |
| Icon slots | `ng-content` with a named select or `@Input() iconTemplate: TemplateRef` for template injection |

### Component interface catalogue

Below is the Angular `@Input()` / `@Output()` contract for every component, derived from the React props and Figma property mappings. These serve as the implementation contract for each `.component.ts` file.

#### Atoms

**BadgeComponent** (`od-badge`)
```
@Input() variant: 'amber'|'blue'|'green'|'red'|'purple'|'gray'|'notification'|'count'|'metric'|'favorite' = 'blue'
@Input() statusDot = false
@Input() leftIconTemplate: TemplateRef<void> | null = null
@Input() rightIconTemplate: TemplateRef<void> | null = null
// text content via ng-content (default slot)
```

**ButtonComponent** (`od-button`) — *already implemented*
```
@Input() variant: 'primary'|'secondary'|'outline'|'ghost'|'link' = 'primary'
@Input() size: 'sm'|'md'|'lg' = 'md'
@Input() disabled = false
@Input() hasLeadingIcon = false
@Input() hasTrailingIcon = false
@Input() type: 'button'|'submit'|'reset' = 'button'
@Output() clicked = new EventEmitter<MouseEvent>()
// ng-content (default), [slot=icon], [slot=iconRight]
```

**IconButtonComponent** (`od-icon-button`)
```
@Input() ariaLabel = ''
@Input() interactive = true          // false → renders as <span>
@Output() clicked = new EventEmitter<MouseEvent>()
// ng-content (icon)
```

**IconButtonGhostComponent** (`od-icon-button-ghost`)
```
@Input() ariaLabel = ''
@Output() clicked = new EventEmitter<MouseEvent>()
// ng-content (icon)
```

**FilterButtonComponent** (`od-filter-button`)
```
@Input() active = false
@Output() clicked = new EventEmitter<MouseEvent>()
```

**SidebarButtonComponent** (`od-sidebar-button`)
```
@Input() state: 'default'|'hover'|'selected' = 'default'
// ng-content (icon)
```

**OdysseyLogoComponent** (`od-odyssey-logo`)
```
@Input() variant: 'light'|'dark' = 'light'
```

**EmptyStateComponent** (`od-empty-state`)
```
@Input() message = ''
// ng-content [slot=icon]
```

**SectionLabelComponent** (`od-section-label`)
```
@Input() label = ''
@Input() mode: 'default'|'edit' = 'default'
@Output() editClicked = new EventEmitter<void>()
@Output() deleteClicked = new EventEmitter<void>()
```

**AddSectionDividerComponent** (`od-add-section-divider`)
```
@Input() label = ''
```

**AddSectionButtonComponent** (`od-add-section-button`)
```
@Output() clicked = new EventEmitter<MouseEvent>()
```

#### Molecules

**LeadNavComponent** (`od-lead-nav`)
```
// ng-content [slot=logo]
```

**GlobalSearchComponent** (`od-global-search`)
```
@Input() mode: 'search'|'title' = 'search'
@Input() title = ''
@Input() value = ''
@Input() placeholder = 'Search anything...'
@Output() valueChange = new EventEmitter<string>()
@Output() cleared = new EventEmitter<void>()
```

**TrailNavComponent** (`od-trail-nav`)
```
@Input() mode: 'profile'|'editor' = 'profile'
@Input() name = ''
@Input() role = ''
@Input() showNotification = false
@Input() notificationCount = 0
@Input() showPrimaryButton = true
@Input() showSecondaryButton = true
@Input() showHelpIcon = true
@Input() showRightIcon = true
@Output() profileClicked = new EventEmitter<MouseEvent>()
// ng-content [slot=avatar], [slot=rightIcon], [slot=chevron]
```

**PageHeaderComponent** (`od-page-header`)
```
@Input() title = ''
```

**SectionHeaderComponent** (`od-section-header`)
```
@Input() title = ''
@Input() supportingText = ''
```

**EntityChipComponent** (`od-entity-chip`)
```
@Input() name = 'Customers'
@Input() count = 1
@Input() showAddButton = true
@Output() addClicked = new EventEmitter<void>()
// ng-content [slot=entityIcon]
```

**WidgetMetricRowComponent** (`od-widget-metric-row`)
```
@Input() label = ''
@Input() value = ''
@Input() showIndicator = false
@Input() indicatorColor = ''
@Output() clicked = new EventEmitter<MouseEvent>()
```

**WidgetPieChartComponent** (`od-widget-pie-chart`)
```
@Input() size: 'md'|'lg' = 'md'
@Input() centerText = ''
@Input() showCenterText = false
@Input() segments: Array<{ value: number; color: string }> = []
@Input() total: number | null = null
@Input() delayMs = 0
```

**WidgetCtaRowComponent** (`od-widget-cta-row`)
```
@Input() label = ''
@Output() clicked = new EventEmitter<MouseEvent>()
// ng-content [slot=icon]
```

**MenuRowComponent** (`od-menu-row`)
```
@Input() label = ''
@Output() clicked = new EventEmitter<MouseEvent>()
```

**MenuDropdownComponent** (`od-menu-dropdown`)
```
@Input() title = ''
@Input() expanded = true
@Output() toggled = new EventEmitter<void>()
// ng-content (MenuRow children)
```

**SearchFieldComponent** (`od-search-field`)
```
@Input() value = ''
@Input() placeholder = 'Search'
@Input() showLabel = false
@Input() label = 'Label'
@Input() showInfoIcon = false
@Output() valueChange = new EventEmitter<string>()
@Output() cleared = new EventEmitter<void>()
@Output() infoClicked = new EventEmitter<void>()
```

**CustomerRowComponent** (`od-customer-row`)
```
@Input() mode: 'list'|'result' = 'list'
@Input() favorite = false
@Input() label = ''
@Output() favoriteToggled = new EventEmitter<boolean>()
@Output() deleteClicked = new EventEmitter<void>()
// ng-content [slot=icon]
```

**FormFieldComponent** (`od-form-field`)
```
@Input() label = ''
@Input() placeholder = ''
@Input() value = ''
@Input() type = 'text'
@Input() error = ''
@Input() locked = false
@Input() id = ''
@Input() name = ''
@Input() required = false
@Output() valueChange = new EventEmitter<string>()
// ng-content [slot=trailingIcon] — optional override; auto-resolved from state otherwise
```

**FilterSuggestionsComponent** (`od-filter-suggestions`)
```
@Input() title = ''
@Input() items: string[] = []
@Output() itemSelected = new EventEmitter<string>()
```

**MatchRowComponent** (`od-match-row`)
```
@Input() matchId = ''
@Input() route = ''
@Input() customer = ''
@Input() carrier = ''
@Input() bol = ''
@Input() shipmentId = ''
@Input() sourceLabel = 'FourKites, Inc.'
@Input() sourceVariant: 'blue'|'purple' = 'blue'
@Output() clicked = new EventEmitter<MouseEvent>()
// ng-content [slot=icon]  (avatar icon)
```

#### Organisms

**NavbarComponent** (`od-navbar`)
```
@Input() compact = false
// ng-content [slot=lead], [slot=search], [slot=trail]
```

**WidgetComponent** (`od-widget`)
```
@Input() variant: '1x'|'2x'|'3x'|'3xChart'|'3xCta' = '1x'
@Input() title = ''
@Input() showGrip = false
@Input() value = ''
@Input() label = ''
@Input() percentage = ''
@Input() rows: Array<{ label: string; value: string; indicatorColor?: string }> = []
@Input() ctaRows: Array<{ label: string }> = []
@Input() chartSegments: Array<{ value: number; color: string }> = []
@Input() chartTotal: number | null = null
@Input() showChart = true
@Input() goToLabel = ''
@Input() editMode = false
@Output() closeClicked = new EventEmitter<void>()
@Output() goToClicked = new EventEmitter<void>()
@Output() removeClicked = new EventEmitter<void>()
// ng-content [slot=domainIcon]
```

**WidgetsLeftMenuComponent** (`od-widgets-left-menu`)
```
@Input() title = ''
@Input() searchValue = ''
@Input() groups: Array<{ title: string; items: string[] }> = []
@Output() searchChange = new EventEmitter<string>()
```

**ModalLargeComponent** (`od-modal-large`)
```
@Input() title = ''
@Input() subtitle = ''
@Input() showSubtitle = false
@Output() closeClicked = new EventEmitter<void>()
// ng-content (body), [slot=footer]
```

**ModalMediumComponent** (`od-modal-medium`)
```
@Input() title = ''
@Input() ariaLabel = ''
@Output() closeClicked = new EventEmitter<void>()
// ng-content (body), [slot=footer]
```

**WidgetVariantPickerComponent** (`od-widget-variant-picker`)
```
@Input() variant: '1x'|'2x'|'3x'|'3xChart' = '1x'
@Output() variantChange = new EventEmitter<'1x'|'2x'|'3x'|'3xChart'>()
```

**AuthModalComponent** (`od-auth-modal`)
```
// ng-content (content / AuthContent)
```

**AuthContentComponent** (`od-auth-content`)
```
@Input() variant: 'login' = 'login'
@Output() loginSubmitted = new EventEmitter<{ email: string; password: string }>()
@Output() forgotPasswordClicked = new EventEmitter<void>()
@Output() createAccountClicked = new EventEmitter<void>()
```

**ResultsPreviewComponent** (`od-results-preview`)
```
@Input() title = ''
@Input() matches: Array<{
  matchId: string; route: string; customer: string;
  carrier: string; bol: string;
  source?: { label: string; variant: 'blue'|'purple' }
}> = []
@Output() clearClicked = new EventEmitter<void>()
@Output() showResultsClicked = new EventEmitter<void>()
@Output() filtersClicked = new EventEmitter<void>()
```

### Icon slot strategy

Angular does not have React's "pass a JSX node as a prop" pattern. The chosen strategy uses a two-tiered approach:

1. **Simple icon-only slots** (IconButton, IconButtonGhost, EmptyState, WidgetCtaRow, SidebarButton, MatchRow, LeadNav): use a named `ng-content` selector:
   ```html
   <od-icon-button ariaLabel="Delete">
     <lucide-icon name="trash" slot="icon"></lucide-icon>
   </od-icon-button>
   ```

2. **Conditional icon props** (Badge left/right icons, FormField trailing icon, Button leading/trailing): use `@Input() hasLeadingIcon = false` boolean + `ng-content select="[slot=icon]"`. The boolean gates the wrapper span so the icon slot only renders when slotted content is present.

This matches the established pattern in `ButtonComponent` exactly and keeps the Figma Connect `.figma.ts` examples straightforward.

---

## Data Models

### Figma Connect node ID registry

All Figma node IDs are hand-authored in each `.figma.ts` file, copied from the corresponding React `.figma.tsx` file as a reference-only act. The canonical mapping is:

| Component | Figma Node ID |
|-----------|--------------|
| Badge | `213-27` |
| Button | `1307-333`, `1895-7` (link) |
| IconButton | `1754-295` |
| IconButtonGhost | `2138-304` |
| FilterButton | `2347-325` |
| SidebarButton | `514-2479` |
| EmptyState | `2159-295` |
| SectionLabel | `2198-308` |
| AddSectionDivider | `2203-297` |
| AddSectionButton | `2210-302` |
| LeadNav | `639-564` |
| GlobalSearch | `658-18` |
| TrailNav | `1565-648` |
| PageHeader | `1693-49` |
| SectionHeader | `1696-49` |
| EntityChip | `1716-60` |
| WidgetMetricRow | `1814-7` |
| WidgetPieChart | `1881-77` |
| WidgetCtaRow | `1927-84` |
| MenuRow | `1973-87` |
| MenuDropdown | `1981-79` |
| SearchField | `1959-76` |
| CustomerRow | `2029-461` |
| FormField | `2255-98` |
| FilterSuggestions | `2400-2` |
| MatchRow | `2460-2` |
| Navbar | `1661-206` |
| Widget | `1825-7` |
| WidgetsLeftMenu | `1961-393` |
| ModalLarge | `2006-663` |
| ModalMedium | `2032-915` |
| WidgetVariantPicker | `2005-554` |
| AuthModal | `2244-1373` |
| AuthContent | `2264-712` |
| ResultsPreview | `2462-149` |

OdysseyLogo has no `.figma.tsx` in the React library — it is an SVG-only component. It will be implemented in Angular but may not have a Figma Connect file until a Figma node ID is confirmed.

### Token consumption model

```
@odyssey/tokens/tokens.css  ──► loaded globally by consuming app's angular.json styles array
@odyssey/tokens (index.js)  ──► imported in .component.ts where icon size constants (ICON_MD, ICON_LG) are needed
```

Angular's view encapsulation is set to `ViewEncapsulation.None` for all components so that the globally loaded `tokens.css` BEM classes are accessible inside component templates without style leakage issues.

### COMPONENT_STATUS.md schema

```markdown
| Component | Implementation | Figma Connect |
|-----------|---------------|---------------|
| Badge     | done          | done          |
| Button    | done          | done          |
| ...       | pending       | pending       |
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Most of the acceptance criteria for this feature are structural (package configuration, file existence, authoring conventions) or build-system concerns. After the prework analysis, two universal properties emerged as genuinely amenable to property-based testing.

### Property 1: All exported components use standalone mode

*For any* component class exported from `@odyssey/ui-angular`'s public entry-point, reflecting its `@Component` decorator metadata must reveal `standalone === true`.

**Validates: Requirements 3.2**

### Property 2: All Figma Connect files reference the correct package

*For any* `.figma.ts` file in `packages/ui-angular/src/`, the `imports` array passed to `figma.connect()` must contain the string `@odyssey/ui-angular` and must not contain `@odyssey/ui`.

**Validates: Requirements 4.4, 1.2**

---

## Error Handling

### Invalid `@Input()` values

When an Angular component receives an `@Input()` value outside its defined union type (e.g. `variant="superblue"` on `BadgeComponent`), the component falls back to its default variant silently. This is implemented by guarding the `hostClasses` getter:

```typescript
get hostClasses(): string {
  const safeVariant = VALID_VARIANTS.includes(this.variant) ? this.variant : 'blue';
  return `badge badge--${safeVariant}`;
}
```

No error is thrown; the component renders in its default visual state. This matches Requirement 3.6.

### Missing icon slot content

`ng-content` slots that receive no projected content simply render nothing. No null checks are needed in the template — Angular's content projection is a no-op for empty slots.

### Figma Connect parse failures

If a `.figma.ts` file contains a malformed example template, `figma connect parse` exits with a non-zero code and prints a descriptive error. The `connect:parse` npm script surfaces this in CI.

### Build failures

The package has no runtime error boundary — compilation errors surface as TypeScript/Angular template type errors during `ng build` or `tsc`. Strict mode (`"strict": true`) is enforced in `tsconfig.json` so all type errors are caught at compile time, not runtime.

---

## Testing Strategy

### Overview

This feature is primarily a **structural implementation task** (authoring ~30 component files + their Figma Connect files) rather than a complex algorithmic feature. The most impactful tests are:

1. **Unit tests** for component rendering logic (CSS class composition, slot visibility, default state fallback).
2. **Property-based tests** for the two universal properties identified above.
3. **Configuration smoke tests** to verify package.json, figma.config.json, and index.ts are correct.

PBT is applicable in a limited form — the Angular component framework's reflection API makes it straightforward to assert universal properties over all exported components.

### Property-Based Testing

Use **fast-check** (the TypeScript PBT library of choice in npm-workspace monorepos) for the two identified properties.

**Property 1 test** — standalone metadata check:
```typescript
// Feature: angular-figma-connect-library, Property 1: All exported components use standalone mode
import fc from 'fast-check';
import * as components from '@odyssey/ui-angular';

it('every exported component has standalone: true', () => {
  const componentClasses = Object.values(components).filter(
    (v) => typeof v === 'function' && Reflect.hasMetadata('annotations', v)
  );
  fc.assert(
    fc.property(fc.constantFrom(...componentClasses), (ComponentClass) => {
      const meta = (ComponentClass as any).ɵcmp;
      return meta?.standalone === true;
    }),
    { numRuns: componentClasses.length }
  );
});
```

**Property 2 test** — figma.ts import correctness: iterate all `.figma.ts` files as strings and assert the `imports` field contains `@odyssey/ui-angular`.

Both tests should run with `vitest` (the workspace's existing test runner in `apps/odyssey-one`).

### Unit Tests

Per-component unit tests verify:
- Correct BEM CSS classes emitted by `hostClasses` getters.
- Icon slot wrappers render/hide based on boolean `@Input()` flags.
- `@Output() clicked` emits on native button click.
- Default-state fallback for out-of-range `@Input()` variant strings.

Example (ButtonComponent, already has a reference implementation):
```typescript
it('applies correct classes for primary md', () => {
  const fixture = TestBed.createComponent(ButtonComponent);
  fixture.componentInstance.variant = 'primary';
  fixture.componentInstance.size = 'md';
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('button').className)
    .toContain('btn--primary');
});
```

### Integration / Configuration Tests

- **package.json validation**: parse and assert `@odyssey/ui` is absent from all dependency fields.
- **index.ts completeness**: import `@odyssey/ui-angular` and verify all 35 expected named exports are present.
- **figma.config.json validation**: parse and assert `parser === 'html'`.

### Figma Connect Validation

Run `figma connect parse` as part of the CI `lint` step. This validates all `.figma.ts` example templates without publishing. A non-zero exit code from the CLI blocks the build.

### Build Quality Gate

`ng build` (or `tsc --noEmit`) runs in Turborepo's `build` task with `"strict": true`. Any template type error or TypeScript error fails the build immediately.
