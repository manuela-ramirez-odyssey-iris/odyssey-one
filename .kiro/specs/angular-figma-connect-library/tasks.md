# Implementation Plan: Angular Figma Connect Library

## Overview

Build out `@odyssey/ui-angular` as a full Angular standalone-component library with Figma Connect parity. The `ButtonComponent` already exists as the reference implementation. This plan covers all remaining ~34 components (atoms → molecules → organisms), the public `index.ts` barrel, `COMPONENT_STATUS.md` tracking, and property-based tests for the two universal correctness properties from the design.

Each task builds incrementally on the previous one so nothing is left orphaned. All components follow the established pattern in `packages/ui-angular/src/button/`.

## Tasks

- [x] 1. Set up package scaffold and COMPONENT_STATUS.md
  - Add `COMPONENT_STATUS.md` to `packages/ui-angular/` listing all ~35 components (Button already `done`, rest `pending`) with columns: Component | Implementation | Figma Connect
  - Verify `figma.config.json` has `"parser": "html"` and the glob `"src/**/*.figma.ts"` — update if needed
  - Verify root `package.json` exposes `connect:publish` and `connect:parse` scripts delegating to `@odyssey/ui-angular` via the `-w` flag; add if missing
  - _Requirements: 2.1, 2.4, 5.1, 5.2, 5.3, 5.4, 7.1, 7.3_

- [x] 2. Implement Atom tier — Badge, IconButton, IconButtonGhost, FilterButton
  - [x] 2.1 Implement `BadgeComponent` (`src/badge/badge.component.ts`)
    - Selector `od-badge`; inputs: `variant` (10-value union, default `'blue'`), `statusDot`, `leftIconTemplate: TemplateRef`, `rightIconTemplate: TemplateRef`
    - `hostClasses` getter with valid-variant guard (fallback to `'blue'`) matching design error-handling pattern
    - `ViewEncapsulation.None`; re-use BEM classes from tokens.css (`badge`, `badge--{variant}`, `badge-metric`, `text-badge`)
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [ ]* 2.2 Write unit tests for BadgeComponent
    - Test all 10 variants produce correct BEM class
    - Test invalid variant falls back to `badge--blue`
    - Test `statusDot=true` renders the dot span
    - _Requirements: 3.6_

  - [x] 2.3 Add `badge.figma.ts` — Figma node `213-27`
    - Map `figma.enum('Variant', …)` for all 10 variant values
    - `imports` must reference `@odyssey/ui-angular` only
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.4 Implement `IconButtonComponent` (`src/icon-button/icon-button.component.ts`)
    - Selector `od-icon-button`; inputs: `ariaLabel`, `interactive` (default `true`)
    - Renders `<button>` when `interactive=true`, `<span>` otherwise; emits `clicked`
    - `ng-content` default slot for icon projection
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 2.5 Add `icon-button.figma.ts` — Figma node `1754-295`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 2.6 Implement `IconButtonGhostComponent` (`src/icon-button-ghost/icon-button-ghost.component.ts`)
    - Selector `od-icon-button-ghost`; inputs: `ariaLabel`; emits `clicked`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 2.7 Add `icon-button-ghost.figma.ts` — Figma node `2138-304`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 2.8 Implement `FilterButtonComponent` (`src/filter-button/filter-button.component.ts`)
    - Selector `od-filter-button`; input: `active` (default `false`); emits `clicked`
    - BEM: `filter-btn`, `filter-btn--active`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 2.9 Add `filter-button.figma.ts` — Figma node `2347-325`
    - Map `figma.boolean('Active', …)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [x] 3. Implement Atom tier — SidebarButton, OdysseyLogo, EmptyState, SectionLabel, AddSectionDivider, AddSectionButton
  - [x] 3.1 Implement `SidebarButtonComponent` (`src/sidebar-button/sidebar-button.component.ts`)
    - Selector `od-sidebar-button`; input: `state: 'default'|'hover'|'selected'`
    - `ng-content` slot for icon; BEM: `sidebar-btn`, `sidebar-btn--{state}`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.2 Add `sidebar-button.figma.ts` — Figma node `514-2479`
    - Map `figma.enum('State', …)` for default/hover/selected
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.3 Implement `OdysseyLogoComponent` (`src/odyssey-logo/odyssey-logo.component.ts`)
    - Selector `od-odyssey-logo`; input: `variant: 'light'|'dark'` (default `'light'`)
    - Inline SVG logo; swap fill token based on variant
    - No Figma Connect file (no confirmed node ID per design doc)
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.4 Implement `EmptyStateComponent` (`src/empty-state/empty-state.component.ts`)
    - Selector `od-empty-state`; input: `message`
    - `ng-content select="[slot=icon]"` for icon slot
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 3.5 Add `empty-state.figma.ts` — Figma node `2159-295`
    - Map `figma.string('Message', …)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7_

  - [x] 3.6 Implement `SectionLabelComponent` (`src/section-label/section-label.component.ts`)
    - Selector `od-section-label`; inputs: `label`, `mode: 'default'|'edit'`
    - Outputs: `editClicked`, `deleteClicked`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 3.7 Add `section-label.figma.ts` — Figma node `2198-308`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.8 Implement `AddSectionDividerComponent` (`src/add-section-divider/add-section-divider.component.ts`)
    - Selector `od-add-section-divider`; input: `label`
    - _Requirements: 3.1, 3.2_

  - [x] 3.9 Add `add-section-divider.figma.ts` — Figma node `2203-297`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.10 Implement `AddSectionButtonComponent` (`src/add-section-button/add-section-button.component.ts`)
    - Selector `od-add-section-button`; emits `clicked`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 3.11 Add `add-section-button.figma.ts` — Figma node `2210-302`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4. Checkpoint — wire atoms into index.ts and update COMPONENT_STATUS.md
  - Export all 10 atom components (+ `ButtonComponent` already there) from `src/index.ts`
  - Update `COMPONENT_STATUS.md` to mark atoms as `done` / `done` as files are completed
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 2.4, 7.1_

- [x] 5. Implement Molecule tier — navigation and header components
  - [x] 5.1 Implement `LeadNavComponent` (`src/lead-nav/lead-nav.component.ts`)
    - Selector `od-lead-nav`; `ng-content select="[slot=logo]"` for logo slot
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 5.2 Add `lead-nav.figma.ts` — Figma node `639-564`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.3 Implement `GlobalSearchComponent` (`src/global-search/global-search.component.ts`)
    - Selector `od-global-search`; inputs: `mode: 'search'|'title'`, `title`, `value`, `placeholder`
    - Outputs: `valueChange`, `cleared`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 5.4 Add `global-search.figma.ts` — Figma node `658-18`
    - Map `figma.enum('Mode', …)`, `figma.string('Title', …)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [x] 5.5 Implement `TrailNavComponent` (`src/trail-nav/trail-nav.component.ts`)
    - Selector `od-trail-nav`; all inputs per design interface catalogue
    - Outputs: `profileClicked`; slots: `[slot=avatar]`, `[slot=rightIcon]`, `[slot=chevron]`
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 5.6 Add `trail-nav.figma.ts` — Figma node `1565-648`
    - Map `figma.enum('Mode', …)`, `figma.boolean` flags for notification/buttons
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.7 Implement `PageHeaderComponent` (`src/page-header/page-header.component.ts`)
    - Selector `od-page-header`; input: `title`
    - BEM: `page-header`, `text-heading-xl-semibold`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 5.8 Add `page-header.figma.ts` — Figma node `1693-49`
    - Map `figma.string('Title', …)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7_

  - [x] 5.9 Implement `SectionHeaderComponent` (`src/section-header/section-header.component.ts`)
    - Selector `od-section-header`; inputs: `title`, `supportingText`
    - _Requirements: 3.1, 3.2_

  - [x] 5.10 Add `section-header.figma.ts` — Figma node `1696-49`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Implement Molecule tier — EntityChip, Widget sub-components, MenuRow/Dropdown
  - [x] 6.1 Implement `EntityChipComponent` (`src/entity-chip/entity-chip.component.ts`)
    - Selector `od-entity-chip`; inputs: `name`, `count`, `showAddButton`
    - Output: `addClicked`; `ng-content select="[slot=entityIcon]"`
    - Stacked slot logic: count 0 = no icons, 1–3 = that many icon slots, 4+ = 3 + overflow badge
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 6.2 Add `entity-chip.figma.ts` — Figma node `1716-60`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.3 Implement `WidgetMetricRowComponent` (`src/widget-metric-row/widget-metric-row.component.ts`)
    - Selector `od-widget-metric-row`; inputs: `label`, `value`, `showIndicator`, `indicatorColor`
    - Output: `clicked`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 6.4 Add `widget-metric-row.figma.ts` — Figma node `1814-7`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.5 Implement `WidgetPieChartComponent` (`src/widget-pie-chart/widget-pie-chart.component.ts`)
    - Selector `od-widget-pie-chart`; inputs: `size`, `centerText`, `showCenterText`, `segments`, `total`, `delayMs`
    - SVG donut rendered via `*ngFor` over segments; CSS grow-in animation on mount
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 6.6 Add `widget-pie-chart.figma.ts` — Figma node `1881-77`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.7 Implement `WidgetCtaRowComponent` (`src/widget-cta-row/widget-cta-row.component.ts`)
    - Selector `od-widget-cta-row`; input: `label`; output: `clicked`
    - `ng-content select="[slot=icon]"`
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 6.8 Add `widget-cta-row.figma.ts` — Figma node `1927-84`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.9 Implement `MenuRowComponent` (`src/menu-row/menu-row.component.ts`)
    - Selector `od-menu-row`; input: `label`; output: `clicked`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 6.10 Add `menu-row.figma.ts` — Figma node `1973-87`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.11 Implement `MenuDropdownComponent` (`src/menu-dropdown/menu-dropdown.component.ts`)
    - Selector `od-menu-dropdown`; inputs: `title`, `expanded`; output: `toggled`
    - `ng-content` for `MenuRow` children; toggle chevron direction via `expanded`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 6.12 Add `menu-dropdown.figma.ts` — Figma node `1981-79`
    - Map `figma.boolean('Expanded', …)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [x] 7. Implement Molecule tier — SearchField, CustomerRow, FormField, FilterSuggestions, MatchRow
  - [x] 7.1 Implement `SearchFieldComponent` (`src/search-field/search-field.component.ts`)
    - Selector `od-search-field`; inputs: `value`, `placeholder`, `showLabel`, `label`, `showInfoIcon`
    - Outputs: `valueChange`, `cleared`, `infoClicked`
    - Controlled input pattern; focus-border style via host class `search-field--focused`
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 7.2 Add `search-field.figma.ts` — Figma node `1959-76`
    - Map `figma.boolean('Show Label', …)`, `figma.string('Placeholder', …)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7_

  - [x] 7.3 Implement `CustomerRowComponent` (`src/customer-row/customer-row.component.ts`)
    - Selector `od-customer-row`; inputs: `mode`, `favorite`, `label`
    - Outputs: `favoriteToggled`, `deleteClicked`; `ng-content select="[slot=icon]"`
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 7.4 Add `customer-row.figma.ts` — Figma node `2029-461`
    - Map `figma.enum('Mode', …)`, `figma.boolean('Favorite', …)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 7.5 Implement `FormFieldComponent` (`src/form-field/form-field.component.ts`)
    - Selector `od-form-field`; all inputs per design catalogue: `label`, `placeholder`, `value`, `type`, `error`, `locked`, `id`, `name`, `required`
    - Output: `valueChange`; `ng-content select="[slot=trailingIcon]"` with auto-resolved fallback icon (locked → Lock, error → CircleAlert, else none)
    - `aria-invalid`, `aria-describedby`, `aria-readonly` set from inputs
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 7.6 Write unit tests for FormFieldComponent
    - Test locked state sets `readOnly` and renders Lock icon
    - Test error state sets `aria-invalid` and renders CircleAlert icon
    - Test explicit `[slot=trailingIcon]` overrides auto-resolved icon
    - _Requirements: 3.4, 3.6_

  - [x] 7.7 Add `form-field.figma.ts` — Figma node `2255-98`
    - Map `figma.enum('State', …)` → locked/error/default; `figma.string('Label', …)`, `figma.string('Placeholder', …)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [x] 7.8 Implement `FilterSuggestionsComponent` (`src/filter-suggestions/filter-suggestions.component.ts`)
    - Selector `od-filter-suggestions`; inputs: `title`, `items: string[]`
    - Output: `itemSelected` emitting the clicked item string
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 7.9 Add `filter-suggestions.figma.ts` — Figma node `2400-2`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.10 Implement `MatchRowComponent` (`src/match-row/match-row.component.ts`)
    - Selector `od-match-row`; all inputs per design catalogue: `matchId`, `route`, `customer`, `carrier`, `bol`, `shipmentId`, `sourceLabel`, `sourceVariant`
    - Output: `clicked`; `ng-content select="[slot=icon]"` for avatar icon
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 7.11 Add `match-row.figma.ts` — Figma node `2460-2`
    - Map `figma.enum('Source Variant', …)`, `figma.string` fields for route/customer/carrier
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

- [x] 8. Checkpoint — wire molecules into index.ts and update COMPONENT_STATUS.md
  - Export all molecule components from `src/index.ts`
  - Update `COMPONENT_STATUS.md` rows for all implemented molecules
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 2.4, 7.1_

- [x] 9. Implement Organism tier — Navbar, Widget, WidgetsLeftMenu
  - [x] 9.1 Implement `NavbarComponent` (`src/navbar/navbar.component.ts`)
    - Selector `od-navbar`; input: `compact` (default `false`)
    - Three named slots: `ng-content select="[slot=lead]"`, `[slot=search]"`, `[slot=trail]"`
    - Vertical padding switches 14px → 12px when `compact=true`; uses `var(--navbar-bg)` token
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 9.2 Add `navbar.figma.ts` — Figma node `1661-206`
    - Map `figma.boolean('Compact', …)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 9.3 Implement `WidgetComponent` (`src/widget/widget.component.ts`)
    - Selector `od-widget`; all inputs per design catalogue: `variant`, `title`, `showGrip`, `value`, `label`, `percentage`, `rows`, `ctaRows`, `chartSegments`, `chartTotal`, `showChart`, `goToLabel`, `editMode`
    - Outputs: `closeClicked`, `goToClicked`, `removeClicked`; `ng-content select="[slot=domainIcon]"`
    - Render variant-specific content sub-template using `[ngSwitch]` on `variant`; delegate chart to `WidgetPieChartComponent`, metric rows to `WidgetMetricRowComponent`, cta rows to `WidgetCtaRowComponent`
    - Import peer sub-components in `imports: []` array (standalone)
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 9.4 Add `widget.figma.ts` — Figma node `1825-7`
    - Map `figma.enum('Variant', …)` for all 5 variants; `figma.string('Title', …)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [x] 9.5 Implement `WidgetsLeftMenuComponent` (`src/widgets-left-menu/widgets-left-menu.component.ts`)
    - Selector `od-widgets-left-menu`; inputs: `title`, `searchValue`, `groups`
    - Output: `searchChange`; renders `SearchFieldComponent` + grouped list using `MenuDropdownComponent` + `MenuRowComponent`
    - Import peer sub-components in `imports: []`
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 9.6 Add `widgets-left-menu.figma.ts` — Figma node `1961-393`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10. Implement Organism tier — Modals, WidgetVariantPicker, Auth components, ResultsPreview
  - [x] 10.1 Implement `ModalLargeComponent` (`src/modal-large/modal-large.component.ts`)
    - Selector `od-modal-large`; inputs: `title`, `subtitle`, `showSubtitle`
    - Output: `closeClicked`; slots: default body `ng-content`, `ng-content select="[slot=footer]"`
    - ESC key listener via `HostListener('document:keydown.escape')`; overlay click dismisses
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 10.2 Add `modal-large.figma.ts` — Figma node `2006-663`
    - Map `figma.boolean('Show Subtitle', …)`, `figma.string('Title', …)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7_

  - [x] 10.3 Implement `ModalMediumComponent` (`src/modal-medium/modal-medium.component.ts`)
    - Selector `od-modal-medium`; inputs: `title`, `ariaLabel`
    - Output: `closeClicked`; slots: default body, `[slot=footer]`
    - ESC key dismiss via `HostListener`; `role="dialog"`, `aria-modal="true"`, `aria-label` bound
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 10.4 Add `modal-medium.figma.ts` — Figma node `2032-915`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 10.5 Implement `WidgetVariantPickerComponent` (`src/widget-variant-picker/widget-variant-picker.component.ts`)
    - Selector `od-widget-variant-picker`; input: `variant: '1x'|'2x'|'3x'|'3xChart'`
    - Output: `variantChange`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 10.6 Add `widget-variant-picker.figma.ts` — Figma node `2005-554`
    - Map `figma.enum('Variant', …)` for 4 values
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 10.7 Implement `AuthModalComponent` (`src/auth-modal/auth-modal.component.ts`)
    - Selector `od-auth-modal`; `ng-content` default slot for `AuthContent`
    - _Requirements: 3.1, 3.2_

  - [x] 10.8 Add `auth-modal.figma.ts` — Figma node `2244-1373`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 10.9 Implement `AuthContentComponent` (`src/auth-content/auth-content.component.ts`)
    - Selector `od-auth-content`; input: `variant: 'login'` (extensible)
    - Outputs: `loginSubmitted`, `forgotPasswordClicked`, `createAccountClicked`
    - Renders login form using `FormFieldComponent` for email/password fields; imports `FormFieldComponent` and `ButtonComponent` in `imports: []`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 10.10 Add `auth-content.figma.ts` — Figma node `2264-712`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 10.11 Implement `ResultsPreviewComponent` (`src/results-preview/results-preview.component.ts`)
    - Selector `od-results-preview`; inputs: `title`, `matches`
    - Outputs: `clearClicked`, `showResultsClicked`, `filtersClicked`
    - Renders `MatchRowComponent` for each match; imports in `imports: []`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 10.12 Add `results-preview.figma.ts` — Figma node `2462-149`
    - Map `figma.string('Title', …)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7_

- [x] 11. Wire all organisms into index.ts and finalize COMPONENT_STATUS.md
  - Export all organism components from `src/index.ts`
  - Mark all completed components as `done` / `done` in `COMPONENT_STATUS.md`
  - _Requirements: 2.4, 7.1, 7.3_

- [ ] 12. Write property-based tests
  - [ ]* 12.1 Write property test: all exported components use standalone mode
    - Install `fast-check` as a devDependency in `packages/ui-angular/` if not present
    - Create `src/__tests__/standalone.property.spec.ts`
    - Import all exports from `@odyssey/ui-angular`; filter to Angular component classes via `Reflect.hasMetadata('annotations', v)`
    - Use `fc.assert(fc.property(fc.constantFrom(...componentClasses), cls => cls.ɵcmp?.standalone === true))`
    - **Property 1: All exported components use standalone mode**
    - **Validates: Requirements 3.2**

  - [ ]* 12.2 Write property test: all Figma Connect files reference correct package
    - Create `src/__tests__/figma-imports.property.spec.ts`
    - Read all `src/**/*.figma.ts` file contents as strings (via `fs.readdirSync` / `fs.readFileSync`)
    - Use `fc.assert` over the file list: each file's source must include `@odyssey/ui-angular` and must NOT include `@odyssey/ui'` (the React package)
    - **Property 2: All Figma Connect files reference the correct package**
    - **Validates: Requirements 4.4, 1.2**

- [ ] 13. Final checkpoint — full test suite and build verification
  - Run `figma connect parse` to validate all `.figma.ts` files parse without error
  - Confirm `src/index.ts` exports all 35 components (34 new + Button already present)
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 4.1, 8.1, 8.2, 8.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Button (`od-button`) is already implemented — all tasks build on that pattern
- `ViewEncapsulation.None` is used on all components so globally-loaded `tokens.css` BEM classes apply without encapsulation leakage
- The design doc does not confirm a Figma node ID for `OdysseyLogo` — implement the component but skip its `.figma.ts` until a node ID is confirmed
- Property tests in task 12 require `vitest` (already used in `apps/odyssey-one`) and `fast-check`
- Each `.figma.ts` file's `imports` array must only reference `@odyssey/ui-angular`, never `@odyssey/ui`
- Organism components that compose sub-components (Widget, WidgetsLeftMenu, AuthContent, ResultsPreview) must list those sub-components in their `imports: []` array — they are standalone and cannot rely on NgModule declarations
