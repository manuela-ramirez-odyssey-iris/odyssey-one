# Odyssey Frontend — Proposed Workflow

A faster, more consistent way for design and engineering to work together. Built around a working frontend, not a deck.

---

## TL;DR

We've built a production-grade frontend implementation of the Odyssey design system in React — 28 normalized components, design tokens, CSS, a Figma library, a visual contract (DesignSystemMap), and the documentation behind every decision.

We're proposing a workflow where:

1. The design team delivers a **validated, running prototype** instead of static specs.
2. Your team **AI-assists the port to Angular / PrimeNG** instead of rebuilding visually from PDFs.
3. The design system stays the **single source of truth** for both sides.

The result: **~60-70% less dev time per feature**, near-zero visual rework, no design drift, and a maintainable shared system.

---

## 1. The numbers to put on the table

| Metric | Current | Proposed | Delta |
|---|---|---|---|
| Dev-days per feature | **5.5–10** | **2–4** | **~60-70% reduction** |
| Visual rework cycles | 2–3 | ~0 | ~100% eliminated |
| Drift bugs over time | continuous | ~zero | Continuous savings, hard to quantify but real |
| UI debt accumulation | yes | no | Compounds over months |

**Break-even: feature 2.** One-time setup cost is ~1 dev-week. Every feature after that ships 3-6 dev-days faster than today.

---

## 2. The problem we're solving

Today, frontend features cross from design to engineering through **visual interpretation**:

```
Story written → dev reads PDF/Figma → dev interprets visually → builds in Angular
              → QA finds discrepancies → fix → re-QA → ship
```

This guarantees:
- Design-vs-code drift on every feature
- 2-3 rework cycles per ticket
- ~50-60% of dev time spent on rework, not new work
- Continuous accumulation of UI debt
- Grooming time burned on UI corrections that should never have happened

The bridge is the bug. We can replace it.

---

## 3. The design workflow (upstream of handoff)

Before anything reaches Cognizant, the design team runs a parallel, iterative process that turns requirements into a validated, running prototype. **The handoff isn't a one-shot delivery — it's the output of this loop.**

```
1. Requirements come in
2. Analyze + groom (design team + PM + stakeholders)
3. Efra designs in Figma using the design system
4. Manuela prototypes in React — IN PARALLEL with Efra, not after
   ├─ Need new components? → /normalize cycle (Figma master → DSM → React)
   └─ Existing only? → assemble from @odyssey/ui
5. Stakeholder grooming on the running prototype (not screenshots)
6. Iterate cheaply — Figma + React stay in sync
7. → APPROVAL GATE → handoff to Cognizant
```

**Key properties:**

- **Parallel, not sequential.** Design and prototype evolve together. The prototype catches missing states, edge cases, and component gaps in real time — while Efra is still iterating in Figma. Issues that would normally surface in QA round 2 surface here instead.
- **Component-system gated.** New components don't enter `@odyssey/ui` until they pass `/normalize`. Figma master → DesignSystemMap → React implementation. This protects the system as it grows.
- **Stakeholder-validated on running code.** Manager grooming happens on the running React prototype, not on static specs or screenshots. By the time the handoff happens, the spec is real — not aspirational.
- **Documented as it happens.** Decisions land in `decision-log.md`. Component status lands in `normalization-tracker.md`. Obsidian integration in progress for cross-domain knowledge management.

What Cognizant receives at the approval gate is therefore not a "design" — it's a contract: running React + finalized Figma + visual reference + decision rationale.

---

## 4. The proposal — end-to-end workflow

The design team workflow above feeds into the engineering workflow below. Together they form the end-to-end flow.

```
Design team                     │ Engineering (Cognizant)
────────────────────────────────┼────────────────────────────────
1. Groom (joint)                │
2. Efra designs in Figma        │
3. We build in React            │ (observe / async feedback)
4. Stakeholder review on        │
   running prototype            │
5. Iterate cheaply              │
────────────────────────────────┼────────────────────────────────
6. ✅ APPROVAL GATE — UI locked
────────────────────────────────┼────────────────────────────────
                                │ 7. AI-assisted port to Angular
                                │ 8. Backend wiring
                                │ 9. Ship
────────────────────────────────┼────────────────────────────────
10. Maintenance: all changes loop back through steps 3-6.
    Never patch only-Angular. (Non-negotiable.)
```

**What this gives you:**
- A locked, validated spec — no interpretation needed
- A working reference implementation — pixel-accurate
- A shared design system — tokens, CSS, components, contract
- AI-assisted porting — fast and mechanical

---

## 5. Cognizant's participation per feature

| Stage | Your role |
|---|---|
| 1. Groom | Tech lead in the room |
| 2-5. Design + prototype | Observer; async feedback welcome |
| 6. Approval gate | Sign off on spec freeze |
| 7. Port to Angular | Your team does it (AI-assisted), we pair on first few |
| 8. Backend wiring | You own fully |
| 9. Ship | You own |
| 10. Maintenance | Bugs route back to step 3, not patched directly |

**You are not a translator.** You are the implementation owner against a locked design contract.

---

## 6. Current Cognizant dev cycle (post-design)

| Stage | Time | Notes |
|---|---|---|
| Dev reads spec, interprets, builds in Angular | 2–4 days | Visual interpretation = guaranteed drift |
| QA round 1: discrepancies vs Figma | 0.5–1 day | |
| Fix round 1 | 1–2 days | |
| QA round 2 | 0.5 day | |
| Fix round 2 (frequently needed) | 1–2 days | |
| Final QA + ship | 0.5 day | |
| **Total** | **5.5–10 dev-days per feature** | **~50–60% of that is rework** |

---

## 7. Proposed dev cycle (post-approval-gate)

| Stage | Time | Notes |
|---|---|---|
| Approval gate (spec locked in running React) | 0 days | Checkpoint, not work |
| AI-assisted Angular port | 0.5–1.5 days | Library components already exist; only route-level code per feature |
| Backend wiring + ship | 1–2 days | |
| QA | 0.5 day | Visual QA is contractually impossible to fail — DSM bridges the gap |
| **Total** | **2–4 dev-days per feature** | **~zero rework on UI side** |

---

## 8. Feature-by-feature savings projection

Assumes ~5 dev-day one-time setup (component library port) and ~4 dev-day average savings per feature. Conservative midpoint of the ranges above.

| Features shipped | Current cost (cumulative) | Proposed cost (cumulative) | Cumulative savings |
|---|---|---|---|
| Setup only | 0 | 5 | -5 (investment) |
| 1 feature | ~8 days | ~8 days | break-even |
| **2 features** | ~16 days | ~11 days | **+5 days** ✅ payback |
| 5 features | ~39 days | ~20 days | **+19 days** (~4 weeks) |
| 10 features | ~78 days | ~35 days | **+43 days** (~2 months) |
| 20 features | ~155 days | ~65 days | **+90 days** (~4.5 months) |
| 40 features (~1 year) | ~310 days | ~125 days | **+185 days** (~9 months) |

**At a year of typical cadence: ~9 months of one developer's capacity recovered.** That's the case to put in front of the program manager.

---

## 9. What transfers, what doesn't

| Artifact | Transfers? | Your effort |
|---|---|---|
| Design tokens (`tokens.css`) | ✅ as-is | Drop in |
| Component CSS (`components.css`) | ✅ as-is | Consume directly |
| Figma library (28 components) | ✅ as-is | Adopt as canonical |
| DesignSystemMap (visual contract) | ✅ as-is | Use to validate Angular renders |
| Documentation + decision log | ✅ as-is | Shared reference |
| Code Connect bridge to Figma | ⚠️ React today | Write Angular `.figma.ts` against same masters |
| React components (`.jsx`) | ❌ React-specific | Port to Angular (one-time, ~1 dev-week, AI-assisted) |
| Route code (Home, Shipments) | ❌ React-specific | Port + wire your backend |

**~80% of the work transfers untouched.** The remaining ~20% is what AI-assisted porting handles in days, not weeks.

---

## 10. Working with PrimeNG

Our design system complements PrimeNG, it doesn't replace it.

| Where | Approach |
|---|---|
| Buttons, dialogs, dropdowns, basic primitives | **Wrap PrimeNG** with our tokens + CSS so the API stays PrimeNG-native, the look stays Odyssey |
| Complex data tables, calendars, advanced controls | **Use PrimeNG directly**, styled with our tokens |
| Domain-specific widgets (Widget, WidgetVariantPicker, EntityChip, etc.) | **Use Odyssey components** — no PrimeNG equivalent, these are our design language |
| Layout shells (Sidebar, Navbar, AppShell) | **Use Odyssey components** — domain-specific chrome |

**The win:** you keep PrimeNG's accessibility, keyboard handling, and Angular-native ergonomics. We bring the visual identity, tokens, and design-system discipline. The two layers compose cleanly.

---

## 11. Component port example — Button

Our components are intentionally **dumb**: pure presentational, props in / events out. No global state, no effect chains, no React-specific gymnastics. This is by design — it's what makes them portable.

**React (today):**
```jsx
export default function Button({
  children, variant = 'primary', size = 'md',
  disabled = false, icon, iconRight, ...props
}) {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`,
    icon && 'btn--has-icon'].filter(Boolean).join(' ')

  return (
    <button className={classes} disabled={disabled} {...props}>
      {icon && <span className="btn__icon">{icon}</span>}
      {children}
      {iconRight && <span className="btn__icon btn__icon--right">{iconRight}</span>}
    </button>
  )
}
```

**Angular (the port):**
```ts
@Component({
  selector: 'ody-button',
  standalone: true,
  template: `
    <button [class]="classes" [disabled]="disabled" (click)="clicked.emit($event)">
      <span class="btn__icon" *ngIf="icon">
        <ng-content select="[icon]"></ng-content>
      </span>
      <ng-content></ng-content>
      <span class="btn__icon btn__icon--right" *ngIf="iconRight">
        <ng-content select="[iconRight]"></ng-content>
      </span>
    </button>
  `,
})
export class ButtonComponent {
  @Input() variant: 'primary'|'secondary'|'outline'|'ghost'|'link' = 'primary';
  @Input() size: 'sm'|'md'|'lg' = 'md';
  @Input() disabled = false;
  @Input() icon = false;
  @Input() iconRight = false;
  @Output() clicked = new EventEmitter<MouseEvent>();

  get classes() {
    return ['btn', `btn--${this.variant}`, `btn--${this.size}`,
      this.icon && 'btn--has-icon'].filter(Boolean).join(' ');
  }
}
```

**What stays identical:** all CSS classes, all design tokens, the rendered output (pixel-identical against DesignSystemMap).

**What changes:** function → class with `@Input` / `@Output`. JSX → Angular template syntax. `children` → `<ng-content>` projection.

This is mechanical. With AI assistance, a component like this takes **15-30 minutes** to port.

---

## 12. The qualitative benefits (not in the numbers table)

These are continuous and ambient. Hard to quantify per-day; impossible to ignore over months.

- **Zero design drift.** The #1 source of frontend bug tickets goes to ~zero. Today this drift is continuous, ambient cost we all pay for.
- **Consistent UX across the platform.** Visible to customers. They notice the difference between Shipments and Orders looking like the same product vs. two products glued together.
- **Onboarding new devs is faster.** A working component library + visual contract is a better onboarding artifact than a wiki of design rules.
- **Documentation lives in the system.** decision-log, normalization-tracker, DesignSystemMap. Not tribal knowledge. Cognizant inherits an asset, not a person.

---

## 13. How the source code is structured

```
odyssey-one/
├── apps/odyssey-one/        ← React app, 6 routes
│   ├── src/routes/          ← Home, Shipments, etc.
│   └── src/styles/          ← components.css (transfers)
├── packages/
│   ├── ui/                  ← 28 normalized components (port these)
│   ├── tokens/tokens.css    ← Design tokens (transfers)
│   └── db/                  ← Data layer (your backend goes here)
├── playground/
│   ├── DesignSystemMap.html ← Visual contract (transfers)
│   └── normalization-tracker.md
└── shipments-documentation/ ← Domain analysis + decisions
```

- **Monorepo with workspaces.** Clean separation between tokens, shared UI, and apps.
- **No Tailwind, no CSS-in-JS.** Pure CSS + tokens — directly consumable.
- **Quality gate:** components don't enter `@odyssey/ui` until they pass `/normalize`. No raw values. No drift.

---

## 14. Migration timeline — what we have today (Shipments + Home)

One-time port to your Angular stack.

| Phase | Effort |
|---|---|
| Port 28 components | ~5 dev-days |
| Port Home route | 1-2 dev-days |
| Port Shipments route | 2-3 dev-days |
| Angular Code Connect mappings | ~1 dev-day (parallel) |
| Integration into your app shell + backend wiring | ~1 dev-week |
| **Total** | **~2-3 dev-weeks** for one Angular dev, AI-assisted |

After this is done, the design system library is in your stack permanently. Every new feature inherits it.

---

## 15. Where documentation lives

JIRA stays the project management layer. The design system stays canonical in Figma + the repo.

| Artifact | Lives in | Owner |
|---|---|---|
| Requirements / user stories | **JIRA** | PM |
| Sprint planning + status | **JIRA** | PM / leads |
| Bug tickets | **JIRA** | QA / devs |
| Design source of truth | **Figma library** | Design team |
| Component specs + states | **DesignSystemMap** + Figma | Design team |
| Design tokens | **`packages/tokens/tokens.css`** | Design team |
| Decision log (with rationale) | **`decision-log.md`** | Design team |
| Domain analysis | **`shipments-documentation/`** | Design team + PM |

**JIRA tickets link to:** Figma master URL + DSM section + decision-log entry. No design system documentation lives inside JIRA itself.

---

## 16. The maintenance rule (non-negotiable)

> **All UI changes originate in React + Figma. Then port to Angular. Never patch only-Angular.**

If this rule slips, the design system drifts and we lose every benefit within 6 months. This is the single most important governance decision in the proposal — and it protects both teams equally.

---

## 17. What we're asking for

1. **Read access to your Angular repo.** We need to understand version, state management, styling, PrimeNG patterns, and module conventions before we can scope the port precisely.
2. **A feature branch for a proof-of-concept port** of 3-5 components — including one organism — running in your stack within the week.
3. **A 30-minute review session** to walk through the proof and decide who carries the remaining components.
4. **The tech lead's name and time** for the maintenance rule conversation.
5. **Acceptance of the approval gate** — once a feature is locked in React, no design changes without going back to step 3.

---

## 18. The closing claim

> Today, every feature costs 5-10 dev-days, with about half of that being rework driven by visual interpretation between Figma and code.
>
> The proposed flow replaces that bridge with a validated React prototype and an AI-assisted port — reducing per-feature dev time by 60-70%, eliminating visual rework, and producing a design system that doesn't drift over time.
>
> One-time setup: ~1 dev-week. Break-even: feature 2. Compounded savings: ~9 months of dev capacity recovered across a typical year.
