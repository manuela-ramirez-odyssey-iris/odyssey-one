# Requirements Document

## Introduction

This feature adds an Angular component library (`packages/ui-angular/`) to the Odyssey monorepo that mirrors the existing React component library (`packages/ui/`). Each Angular component is linked to its corresponding Figma node via Figma Connect, enabling Figma's in-editor code generation to produce Angular-idiomatic snippets instead of React snippets. The library consumes the shared `@odyssey/tokens` design-token package and is published as `@odyssey/ui-angular` within the Turborepo workspace.

The initial scope covers the ~30 components already present in `packages/ui/src/`, using the same Figma file and node IDs already mapped in the React `.figma.tsx` files.

---

## Glossary

- **Angular_Library**: The new `packages/ui-angular/` package (`@odyssey/ui-angular`) containing Angular standalone components.
- **Figma_Connect_File**: A TypeScript file (`.figma.ts`) that calls `figma.connect()` to map an Angular component to a Figma node, using `@figma/code-connect` with `parser: "html"`.
- **React_Library**: The existing `packages/ui/` package (`@odyssey/ui`) containing React JSX components and their `.figma.tsx` connect files.
- **Token_Package**: The existing `packages/tokens/` package (`@odyssey/tokens`) exposing `index.js` (JS constants) and `tokens.css` (CSS custom properties).
- **Figma_Config**: The `figma.config.json` file at the root of a package that controls which parser and file patterns `figma connect` CLI commands use.
- **Component**: A single UI element (e.g., `Badge`, `Button`, `MatchRow`) implemented as an Angular standalone component class decorated with `@Component`.
- **Figma_Node_ID**: The `node-id` URL parameter in a Figma share link that uniquely identifies a frame or component set in the Figma file.
- **Storybook**: An optional interactive component browser used during development and QA.
- **Monorepo**: The Turborepo workspace rooted at the repository root, managing `apps/*` and `packages/*` via npm workspaces.
- **Reference_Only**: Reading a file solely to inspect its content (e.g., Figma node IDs, prop mappings) without importing, modifying, or depending on it programmatically.

---

## Requirements

### Requirement 1: React Library Isolation

**User Story:** As a developer, I want the Angular library to be completely self-contained, so that the existing React library remains untouched and continues to work exactly as it does today.

#### Acceptance Criteria

1. THE Angular_Library SHALL NOT modify any file under `packages/ui/`, including but not limited to `src/**/*.jsx`, `src/**/*.figma.tsx`, `figma.config.json`, and `package.json`.
2. THE Angular_Library SHALL NOT import any module from `packages/ui/` at runtime or at build time; the React_Library is strictly a Reference_Only source of Figma node IDs and prop mappings.
3. WHEN a developer reads a React_Library `.figma.tsx` file to identify Figma_Node_IDs or prop mappings, THE Angular_Library source files SHALL replicate that information as independent, hand-authored values rather than programmatic imports or re-exports.
4. THE Angular_Library `package.json` SHALL NOT list `@odyssey/ui` (the React_Library) as a dependency, devDependency, or peerDependency.
5. IF a React_Library component is updated or removed, THEN THE Angular_Library SHALL continue to build and publish without error, because it holds its own copy of all required Figma_Node_IDs and prop mapping values.

---

### Requirement 2: Angular Library Package Scaffold

**User Story:** As a developer, I want a dedicated Angular package in the monorepo, so that Angular components are isolated, versioned, and consumable independently from the React library.

#### Acceptance Criteria

1. THE Angular_Library SHALL be located at `packages/ui-angular/` and registered as an npm workspace package named `@odyssey/ui-angular`.
2. THE Angular_Library SHALL declare `@angular/core` and `@angular/common` as peer dependencies with a compatible major version range.
3. THE Angular_Library SHALL depend on `@odyssey/tokens` using the workspace wildcard (`"*"`), identical to how the React_Library declares it.
4. THE Angular_Library SHALL export all public components from a single entry-point file (`src/index.ts`), so that consumers import from `@odyssey/ui-angular`.
5. THE Monorepo SHALL include `@odyssey/ui-angular` in Turborepo pipeline definitions so that `turbo run build` and `turbo run lint` include the Angular_Library.

---

### Requirement 3: Angular Component Implementation

**User Story:** As a developer, I want Angular standalone components that match the visual and behavioural contract of the existing React components, so that Angular apps render the same Odyssey design system UI.

#### Acceptance Criteria

1. WHEN a React_Library component exists in `packages/ui/src/`, THE Angular_Library SHALL provide a functionally equivalent Angular standalone component covering the same props/inputs and visual states.
2. THE Angular_Library SHALL implement each component as an Angular standalone component (using `standalone: true` in the `@Component` decorator) compatible with Angular 17+.
3. THE Angular_Library SHALL use the CSS custom properties defined in `@odyssey/tokens/tokens.css` for all colour, spacing, radius, and typography values, rather than hard-coding style values.
4. WHEN a React component accepts an `icon` slot backed by a Lucide React icon, THE equivalent Angular component SHALL accept an `ng-content` slot or an `@Input() icon` property that accepts an Angular template reference or component, so that icon substitution is preserved.
5. WHEN a React component exposes an `onClick` callback prop, THE equivalent Angular component SHALL emit an equivalent `@Output() clicked` EventEmitter, so that event binding follows Angular conventions.
6. IF an Angular component receives an input value outside its defined enum or union type, THEN THE Angular_Library SHALL ignore the invalid value and render the component's default visual state.

---

### Requirement 4: Figma Connect Integration for Angular

**User Story:** As a designer or developer using Figma, I want Figma Connect files for every Angular component, so that selecting a component in Figma shows Angular code snippets instead of React snippets.

#### Acceptance Criteria

1. THE Angular_Library SHALL contain a `figma.config.json` that sets `"parser": "html"` and includes the glob patterns `"src/**/*.figma.ts"` and `"src/**/*.{ts}"`, mirroring the structure of the React_Library's `figma.config.json`.
2. WHEN a React_Library `.figma.tsx` file maps a component to a Figma_Node_ID, THE Angular_Library SHALL contain a corresponding `.figma.ts` file mapping the Angular component to the same Figma_Node_ID; the React_Library `.figma.tsx` files are consulted as a Reference_Only source — they are not imported and are not modified.
3. THE Figma_Connect_File for each Angular component SHALL use the `figma.connect()` API with an `example` function that returns an Angular HTML template string showing the component's selector and bound inputs.
4. THE Figma_Connect_File SHALL declare `imports` that reference `@odyssey/ui-angular`, so that the generated snippet shows the correct import statement.
5. WHEN a Figma property is mapped via `figma.enum()` in the React_Library connect file, THE corresponding Angular Figma_Connect_File SHALL map the same Figma property to the Angular component's equivalent `@Input()` using `figma.enum()`; the mapping values are copied by hand, not imported from the React_Library.
6. WHEN a Figma property is mapped via `figma.boolean()` with `true`/`false` template branches in the React_Library connect file, THE corresponding Angular Figma_Connect_File SHALL replicate the same conditional mapping using `figma.boolean()`; the mapping values are copied by hand, not imported from the React_Library.
7. WHEN a Figma property is mapped via `figma.string()` or `figma.textContent()` in the React_Library connect file, THE Angular Figma_Connect_File SHALL map the same Figma property to the matching Angular input using `figma.string()` or `figma.textContent()`.
8. WHEN a Figma property is mapped via `figma.instance()` in the React_Library connect file, THE Angular Figma_Connect_File SHALL map the same Figma property to the matching Angular content slot or input using `figma.instance()`.

---

### Requirement 5: Figma Connect CLI Workflow

**User Story:** As a developer, I want npm scripts that publish and manage Figma Connect definitions for the Angular library, so that I can keep the Figma code snippets up to date without manual steps.

#### Acceptance Criteria

1. THE Angular_Library `package.json` SHALL include a `connect:publish` script that runs `figma connect publish` authenticated via a `.env` file using `dotenv-cli`, identical in pattern to the React_Library's `connect:publish` script.
2. THE Angular_Library `package.json` SHALL include a `connect:parse` script that runs `figma connect parse` to validate connect files locally without publishing.
3. THE Angular_Library `package.json` SHALL include a `connect:unpublish` script that runs `figma connect unpublish` to remove published snippets when required.
4. WHERE the Monorepo root `package.json` already exposes workspace-scoped `connect:*` scripts for the React_Library, THE Monorepo root `package.json` SHALL add equivalent scripts that delegate to `@odyssey/ui-angular` via the `-w` flag; these additions SHALL NOT alter, rename, or remove the existing React_Library script entries.

---

### Requirement 6: Design Token Consumption

**User Story:** As a developer, I want the Angular components to use the shared Odyssey design tokens, so that visual updates to the token package propagate to both React and Angular components simultaneously.

#### Acceptance Criteria

1. THE Angular_Library SHALL import `@odyssey/tokens/tokens.css` globally (via the application's `angular.json` styles array or a root stylesheet), so that all CSS custom properties are available to every component.
2. THE Angular_Library SHALL reference token JS constants from `@odyssey/tokens` for any numeric values shared with icons (e.g., `ICON_LG`, `ICON_MD`), keeping Angular and React in sync.
3. IF the Token_Package adds a new CSS custom property, THEN THE Angular_Library component styles SHALL reference it without requiring changes to the Angular component TypeScript, so that styling updates are decoupled from component logic.

---

### Requirement 7: Component Parity Tracking

**User Story:** As a developer, I want a clear record of which React components have Angular equivalents and Figma Connect files, so that I can track the migration progress and identify gaps.

#### Acceptance Criteria

1. THE Angular_Library root SHALL contain a `COMPONENT_STATUS.md` file that lists every component in `packages/ui/src/` and records its Angular implementation status (`done`, `in-progress`, `pending`) and Figma Connect status (`published`, `draft`, `pending`).
2. WHEN a new component is added to the React_Library, THE `COMPONENT_STATUS.md` SHALL be updated to include the new component with status `pending` for both columns.
3. THE `COMPONENT_STATUS.md` SHALL be maintained as a human-readable Markdown table, so that it is viewable directly in GitHub or any Markdown renderer.

---

### Requirement 8: Build and Quality Gates

**User Story:** As a developer, I want the Angular library to compile cleanly and pass linting on every build, so that broken components are caught before they reach consumers.

#### Acceptance Criteria

1. THE Angular_Library SHALL compile without TypeScript errors using the Angular compiler (`ngc` / `ng build`) in strict mode (`"strict": true` in `tsconfig.json`).
2. THE Angular_Library SHALL pass ESLint with `@angular-eslint` rules on every build, so that Angular-specific anti-patterns are caught automatically.
3. WHEN the Turborepo `build` pipeline runs, THE Angular_Library build task SHALL complete successfully before any downstream app that depends on `@odyssey/ui-angular` begins its build.
4. IF the Angular compiler reports a template type-check error in a Figma_Connect_File example template, THEN THE Angular_Library build SHALL fail with a descriptive error message, so that malformed connect files are not silently published.
