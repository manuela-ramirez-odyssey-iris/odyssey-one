# Cognizant Repo Analysis — `linx-odyssey-usermanagement-ui`

**Date:** 2026-05-21
**Author:** Claude (sister session, invoked from the Cognizant repo)
**Confidence:** High on stack/structure/endpoints (verified by reading source). Medium on auth flow and backend tech (inferred — no server code in this repo).
**Status:** GATE 1 — analysis only. No code written.

> ⚠️ AI-generated. Validate with the Cognizant engineering team before acting on the API or auth conclusions.

---

## Strategic finding (read this first)

The repo we're analyzing is **not a greenfield Angular shell** — it is the **User Management** microfrontend, one feature domain inside a larger federated Angular host. Two consequences for the POC framing:

1. **An Odyssey-owned Angular design system already exists** — `@oneodyssey/components` v2.5.17, imported as the source of variables and component styles. POC 2 is therefore not "port the React Button to Angular from zero." It's "does `@oneodyssey/components` already have a Button, and how aligned is it with the React `@odyssey/ui` Button?" That changes the conversation on 2026-05-22 from *can we port?* to *do these two systems agree, and which is canonical?*
2. **This app is a Module Federation remote** (`webpack.config.js` exposes `./EntryModule` as `linxUserManagement.js`). POC 1's live-data demo can target its endpoints, but the dev server runs on port 4201 and expects auth context from an upstream host. We will need a token workaround.

---

## 1. Stack

| Area | Value |
|---|---|
| Framework | Angular **17.2.0** |
| Build | Angular CLI 17.2.0 + `ngx-build-plus` + custom Webpack (Module Federation via `@angular-architects/module-federation` v17) |
| TypeScript | 5.2.2, **full strict** (`strict`, `strictNullChecks`, `strictTemplates`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature` all on) |
| Package manager | npm |
| State | RxJS only — `BehaviorSubject` + `shareReplay`. **No NgRx. No signals.** Classic decorator-based components. |
| Routing | NgModule-based with lazy-loading. Root path `/user` → `EntryModule`. Not using `provideRouter`/standalone APIs. |
| UI library | **`@oneodyssey/components` v2.5.17** (Odyssey's own Angular design system). PrimeNG-style overrides live in `src/styles/components/*.scss` (24 files). |
| Testing | Karma + Jasmine (no E2E framework configured). |
| Date util | Moment 2.30.1 (deprecated; flag for future). |

## 2. Project tree (top 3 levels)

```
src/
├── app/
│   ├── core/                # services: user, user-management, filter, permission/*
│   ├── shared/              # 1 shared component (user-status), interfaces/, services/
│   ├── entry/               # the federated entry module
│   ├── config/constants.ts
│   ├── user-management/     # feature: list/search
│   ├── user-detail/         # feature
│   ├── add-user/  edit-user/  duplicate-user/  download-csv/  external-user/
│   ├── permissions/         # feature: RBAC (6 sub-features incl. user-role, role-permission, resource-set)
│   ├── app.module.ts  app-routing.module.ts  app.component.ts
├── styles/                  # global + 24 PrimeNG-style component overrides
├── environments/            # local, dev, qa, stage, preprod, prod, local-ssl
└── assets/user/             # SVGs
```

**Library vs feature:** `core/`, `shared/`, and `styles/` are shared. Everything else under `app/` is a feature module. The repo follows the conventional Angular "feature-module-per-route" layout, not Nx, not a library workspace.

## 3. Component pattern (anchor for POC 2)

Pick: **`user-status`** (`src/app/shared/components/user-status/`) — the only atom-level shared component.

- **Files:** split `.ts` + `.html` + `.scss` + `.module.ts` + `.ts` (enum/types). Five files per atom.
- **Decorator:** `@Component({ selector: 'linx-usermanagement-user-status', templateUrl: …, styleUrls: […] })`. **Not standalone.** No `ChangeDetectionStrategy.OnPush`.
- **API:** classic `@Input()` (no `input()` signal API): `statusKey` (required), `label`, `isProfile`, `styleClass`. No `@Output()`.
- **Lifecycle:** `implements OnChanges` — recomputes a derived `statusColor` field on input changes.
- **Styles:** SCSS, BEM-ish naming (`.user-status`, `.user-status-activated`), imports variables from `@oneodyssey/components/style/themes/olt-portal/_variables.scss`. **No `::ng-deep`** in this component.
- **Consistency:** features sampled (`duplicate-user`, `permissions/user-role`) follow the same split-file + NgModule pattern. OnPush is **not** applied systematically.

## 4. Design system status

There is no `tokens.scss` in this repo — design tokens live in the external `@oneodyssey/components` package and are imported via `src/styles/index.scss`:

```scss
@import "node_modules/@oneodyssey/components/style/themes/olt-portal/_variables.scss";
```

Then `src/styles/components/index.scss` pulls in 24 per-component overrides (accordion, button, dropdown, etc.) — these are PrimeNG-style component theme overrides scoped to this app. Tokens themselves are SCSS variables (e.g. `$font-size-xs`), **not** CSS custom properties like the React side. This is the single biggest mechanical gap for a port.

## 5. API / data layer (anchor for POC 1)

**Backend stack:** inferred REST/JSON microservices behind Odyssey gateway hostnames. No server code in repo. URLs are environment-keyed:

| Env | `apiUserUrl` |
|---|---|
| dev | `https://dev.user.api.linx.odysseylogistics.com` |
| stage | `https://stage.cx.odysseylogistics.com` |
| prod | `https://user.odysseyone.odysseylogistics.com` |

**Where calls live:** plain `@Injectable({ providedIn: 'root' })` services in `src/app/core/**` using `HttpClient` directly. **No HTTP interceptors** in this repo. There is a custom header constant `Disable-Error-Notification` to opt-out specific requests from a global error toaster handled upstream.

**Auth pattern:** **session-based, handled upstream.** The app reads `sessionStorage.getItem('userDetails')` to get the current user. No JWT bearer logic, no refresh-token handling — the federated host or API gateway injects auth. **This is the main risk for POC 1's live demo.**

**~40+ endpoints catalogued** under `/user-service/v1`. Best candidate for POC 1:

```
POST {apiUserUrl}/user-service/v1/users/{status}
```

`status ∈ { all, activated, locked, terminated }`. Returns a paged user list. The React Home widget `um-locked` (variant `1x`) already shows literally "**8 Locked**" — the count of the response array (or a `totalCount` field) maps 1:1. Confirmed shape via `UserEmailResponse` interface:

```ts
interface UserEmailResponse {
  userId: number; firstName: string; lastName: string;
  middleName: string; emailId: string; isOnboardingLinxUser: boolean;
}
```

Alternative candidates (simpler payload, less narrative pull): `GET /user/country-call-code` (a list of country codes) or `POST /user/email/list`.

## 6. How to run locally

```bash
npm install
npm start              # ng serve --configuration local, port 4201 (hardcoded)
```

Local config in `environment.ts` points all three API base URLs at `http://localhost:4200` — i.e. it expects a local backend or proxy. No `.env.example`. The `run:all` script (`@angular-architects/module-federation/src/server/mf-dev-server.js`) is the Module Federation host runner — only needed when testing inside the host shell.

## 7. Risks / unknowns

- **Auth for POC 1:** session is set by an upstream host. Direct calls from the React dev server (port 5173) to the dev API host will fail without a real session cookie or a manually-pasted token. We will need a CORS proxy + a token placeholder in `.env.local`. *Will be detailed in GATE 2 plan.*
- **Hardcoded dev port (4201)** and **hardcoded API base in local env (4200)** — no override flags. Acceptable for POC, flag for prod-quality.
- **No OnPush, no standalone components, no signals.** A ported Angular Button will follow the *current* pattern (NgModule, decorator `@Input()`) for consistency. If the meeting wants to also push the codebase to Angular 17 modern style, that's a separate conversation.
- **Module Federation versioning:** `shareAll({ strictVersion: true })` will reject any version mismatch with the host. A POC 2 Button added here ties to the host's Angular/RxJS versions.
- **Design system overlap unknown:** `@oneodyssey/components` likely already has a Button. We have not yet inspected the published package to see whether it conflicts with, agrees with, or pre-empts the React Button. **This needs answering before GATE 4.**
- **No backend code in this repo** — the API shape claims above are inferred from service files and TS interfaces, not contract-tested. Validate one endpoint with curl + a real token before committing to it in POC 1.

---

## Recommended next step (alternatives presented for your call)

**Recommendation (high confidence):** proceed to GATE 2 with `POST /users/locked` (or `/users/{status}` with `locked`) as the POC 1 endpoint, targeting the `um-locked` 1x widget in `Home.jsx`. The 1:1 narrative ("the live count from your real backend") is the strongest demo material on 2026-05-22.

**Alternative A:** target a 2x widget (e.g. `carriers-active`) instead — richer visual but no equivalent endpoint exists in *this* repo. Would require pointing at a different domain's backend.

**Alternative B:** before GATE 2, do a 30-minute side investigation of `@oneodyssey/components` to see if a Button already ships there. If yes, POC 2's deliverable changes from "build a Button in Angular" to "diff the existing `@oneodyssey/components` Button against the React `@odyssey/ui` Button." That's a stronger story for leadership and probably reframes the whole migration conversation. **I'd suggest doing this before committing to GATE 4.**

🛑 Stopping per GATE 1 instructions. Awaiting approval to proceed to GATE 2 (POC 1 plan) — and a decision on Alternative B above.

---

## Alternative B: drift evidence (visual + alignment workflow)

**Date:** 2026-05-23
**Scope constraint:** The `@oneodyssey/components` package itself is published privately to GitHub Packages (`npm.pkg.github.com/OneOdyssey`). Manuela's account doesn't have package-read permission on it, and the org admin would need to grant access — out of band for this investigation. So this section measures drift from the **consumer side**: what the Cognizant repo actually does with the package, which is a stronger signal than reading the package's own claims about itself.

### A) Visual drift evidence

**1 — Override surface area.** `src/styles/components/` contains **23 PrimeNG-style override files** (accordion, autocomplete, button, calendar, card, chips, confirmpopup, dialog, dropdown, filter, iconfield, input, inputSwitch, menu, messages, misc, multiselect, overlay, paginator, panelmenu, radiobutton, tabview, toast) plus an `index.scss` aggregator. Their existence is itself the headline drift signal: the default theme from `@oneodyssey/components` doesn't match what designers wanted, so every shipped component is being bent at the consumer.

**2 — `!important` specificity hacks.** Sampled overrides show heavy reliance on `!important` and selector escalation, e.g. `accordion.scss`:
```scss
.accordionTab-header {
   background-color: #1F5E88 !important;
   color: #FFFFFF !important;
   border-radius: 8px;
}
```
and `button.scss` chains like `p-button.org-search-btn .p-button { border-radius: 5px !important; }`. These patterns appear when a consumer is fighting the upstream library's defaults — not consuming a healthy design system.

**3 — Palette divergence (concrete side-by-side).** Hardcoded hex values are sprawled across feature SCSS files (`add-user.component.scss` and `profile-completion.component.scss` each carry 15–25+ hex literals; `user-status.component.scss` defines its own status color map). Sampling against the React `packages/tokens/tokens.css`:

| Cognizant repo (hardcoded) | Closest React token | Match? |
|---|---|---|
| `#1B2537` (add-user, profile-completion) | `--deep-sea-neutral-900: #1B2537` | **Exact** — evidence of *partial* historical alignment |
| `#063A83` (used 4+ places as a "primary blue") | nothing in React palette | **No match** — a separate Odyssey-ish blue |
| `#1F5E88` (accordion header bg) | nothing close | **No match** |
| `#6F95CC` (border, button bg) | nothing close | **No match** |
| `#42AD98` (success-ish green) | `--caribbean-green-600: #237E70` | **Close but not equal** (~30 hex units off) |
| `#c64535` (error red) | `--bittersweet-600: #D23930` | **Close but not equal** |
| `#3C3C3C` (user-status "locked") | nothing in palette | **No match** — generic grey |
| `#535F75` (user-status "terminated") | `--deep-sea-neutral-700: #384253` | **Close but not equal** |

The pattern is "almost-but-not": brand identity is recognizable (the DSN-900 match proves alignment once existed), but the palette has bifurcated into multiple slightly-mutated blues/greens/reds with no single source of truth.

**4 — Paradigm gap.** React tokens are CSS custom properties (`--deep-sea-neutral-900`). Cognizant tokens are SCSS variables (`$font-size-xs`) imported from `_variables.scss`. Same conceptual category, different consumption model — runtime themable vs build-time substituted. Means token transport for a port is not a copy-paste; it's a re-emit.

### B) Alignment workflow drift

**1 — Zero Code Connect artifacts.** Grep across the entire repo: no `.figma.ts`, no `.figma.tsx`, no `@figma/code-connect` import, no reference to the string `code-connect`. The Angular side has no formal Figma↔code linkage.

**2 — Zero Figma URL references.** No README, package.json field, or component file references a canonical Figma library, file key, or node id. The package is untethered to any design source-of-truth document.

**3 — No normalize-like discipline.** `package.json` scripts are vanilla Angular: `ng serve / build / test / lint / e2e`. No `lint:tokens`, no `audit:styles`, no `validate:design`, no stylelint config, no CI gate on hardcoded colors. Nothing prevents future drift from compounding.

### Magnitude call

**Medium-to-large.** The brand identity is partially intact (DSN-900 matches; semantic intent is recognizably Odyssey). But the palette has multiple "almost-but-not" forks, override files exist for nearly every shipped component, and there is **no alignment machinery** to prevent further drift. Absence of Code Connect, Figma references, and normalize-style CI gating is itself a drift finding — without those, the gap visible today is the floor, not the ceiling.

The canonical React design system (`@odyssey/ui` + tokens + Figma masters + Code Connect + `/normalize`) holds defensible ground here. The Angular side has divergent values, no source-of-truth document, and no workflow discipline — so any "we already have a design system" claim from `@oneodyssey/components` is on shaky empirical footing.
