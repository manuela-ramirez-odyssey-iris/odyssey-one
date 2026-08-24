# DSM staging triage — 2026-08-24

Triage of every component flagged `normalizing: true`, run before any bulk approve/release.
Read-only analysis across both repos; **no flags were changed**.

**Result: 1 of 12 can be released. 10 are not ready. 1 cannot be ported at all.**

The request that prompted this was "they seem ok, approve them and port them." They are not ok. Nine of
the twelve are waiting on Angular work that was never started, and the flags are the only thing that
recorded it.

---

## Two corrections to the mental model

**`--approve` does not clear the NORMALIZING badge.** `tools/dsm-flags.mjs:132` sets `approved: true`
while deliberately *keeping* `normalizing: true`. Only `--release <x.y.z>` sets `normalizing: false` and
stamps a version. "Clean the DSM" means release, not approve.

**"Port them" was already done for 11 of 12.** Eleven have Angular twins. The gap is not that they were
never ported — it is that React moved afterwards and Angular did not follow. `DurationPicker` is the only
one with no Angular counterpart, and it turns out to be unportable for an unrelated reason.

---

## Verdicts

| Component | Verdict | What is owed |
|---|---|---|
| **ShipmentsBar** | **READY** | Nothing for the demotion. Fix `--bottombar-partial` drift first (below). |
| TimePicker | NOT READY | Angular listbox still inline `position:absolute`; React portaled it. |
| GroupTable | NOT READY | Missing `detailScroll`, `detailNote`, `DetailBand` containment wrapper. |
| ModalMedium | NOT READY | Escape-stack unported; header still hand-rolled instead of composing `odyssey-modal-header`. |
| ModalLarge | NOT READY | Escape-stack unported. API parity otherwise clean. |
| Navbar | NOT READY | No `context="external"` variant at all; also blocked by its own children. |
| SummaryStrip | NOT READY | No `emphasis: 'display'`; `label` typed required; missing `value` renders `'--'` instead of omitting. |
| TrailNav | NOT READY | No `showBell`; still carries the profile `border-left` Figma dropped. |
| Alert | NOT READY | Missing the `items`/`summary` collapsible-list branch + its SCSS. |
| GlobalSearch | NOT READY | Title colour still inline; no `global-search-title` hook. Blocked on Navbar. |
| LeadNav | NOT READY | Missing `showMenu`. Smallest fix of the set. |
| **DurationPicker** | **BLOCKED** | React-side normalization has never started. See below. |

---

## Root causes, not twelve separate stories

**S126's navbar arc was never ported (6 components).** Alert, GlobalSearch, LeadNav, Navbar, SummaryStrip
and TrailNav were all demoted by one React commit (`b777c4b`) that added the Figma `Context = Internal |
External` component set plus `LeadNav showMenu` and `TrailNav showBell`. The Angular repo received **none
of it** — its working tree shows only the six demo-meta flag flips and `domain-usage.json`, with no
component source modified. The flags were raised correctly; the work behind them was never begun.

**The overlay/portal seam (1 + latent).** React moved TimePicker's listbox into a body-level portal to
escape clipping inside a scrollable modal. Angular still renders it inline. The Angular infrastructure
exists (`_shared/anchored-position.ts`, already used by dropdown, action-menu, date-picker) — TimePicker
just does not use it.

**The Escape stack (2 components).** React's `useEscapeStack.js` makes Escape close only the topmost
dialog. Both Angular modals still use `@HostListener('document:keydown.escape')`, which fires on every
mounted instance — so the bug React fixed is live, and reachable via ModalMedium's own navigation-stack
demo.

**GroupTable's containment redesign (1).** React abandoned the pinned-column `colSpan` approach and solved
it with a self-healing `DetailBand` wrapper plus `detailScroll` / `detailNote`. None of that is in Angular.

**DurationPicker was never normalized (1).** It is not in `packages/ui/` at all — it lives app-local at
`apps/odyssey-one/src/components/fields/DurationPicker.jsx`, with `figmaNode: null`, no Code Connect, and
no row in `normalization-tracker.md`. `progress.md:59` carries it forward verbatim: *"owes Figma +
/normalize + Angular before leaving app-local."* Since `/normalize` is Figma-first, there is nothing to
port from yet. `tools/port-readiness.mjs DurationPicker` fails outright — it looks for
`packages/ui/src/DurationPicker.jsx`, which does not exist. The script's own failure is the verdict.

Two further blockers sit behind it even once Figma lands: its RUNNING state depends on `useCountdown` /
`formatHMS` / `formatMMSS`, which are app-local in `spotboard/Countdown.jsx` with no Angular counterpart;
and it shares TimePicker's portal seam, so porting it before TimePicker's portal parity would ship it
stale on arrival.

---

## Dependency ordering

Navbar cannot be released ahead of GlobalSearch and TrailNav — its external variant is *implemented as*
descendant rules on them (`.navbar--external .global-search-title`, `.navbar--external
.trail-nav-profile-name`). Conversely GlobalSearch cannot be finished before Angular Navbar gains the
`context` input, because there is no `.navbar--external` scope for the override to land under. They must
move together.

Alert and LeadNav are independent and each is small and self-contained.

---

## Findings beyond the twelve

**Three already-released Angular components may carry a live bug.** React's portal commit also patched the
shared hook so scrolls *originating inside* the popover no longer close it. Angular's `date-picker`
(`odyssey-date-picker.component.ts:164-171`), `dropdown` (`:78`) and `action-menu` (`:104`) close on any
capture-phase scroll with no `contains(e.target)` guard — meaning scrolling their own option list dismisses
it. These are `normalizing: false`, i.e. shipped. **Needs independent confirmation before action.**

**Versions were never bumped for the S126 modifications.** Alert `0.9.0`, LeadNav `0.2.0`, GlobalSearch
`0.13.0` are identical on both sides despite their props having changed. The version-on-modification rule
says these should have moved when the changes landed.

**`playground/normalization-tracker.md` is stale for S126.** Searching it for `showMenu`,
`global-search-title`, `alert--list` or `navbar--external` returns zero hits. The LeadNav row still lists
props as "`logo`, `onMenuClick`".

**GroupTable's demotion commit message is actively misleading.** `fc717a3` names a `colSpan` pinned-column
fix that React applied, reverted, reapplied and reverted seven times on 2026-08-17 before abandoning it —
the current source documents the reversal explicitly. Angular matches today's React canon on that point
only because it was never touched. **A port that followed that commit message literally would reintroduce a
reserved column lane that was deliberately rejected.**

**`--bottombar-partial` drift.** React `calc(60dvh + 50px)`, Angular plain `60dvh` — the Angular bar's
default open stage is 50px short of canon. One line in `_tokens.scss`. Both DSMs' prop docs still say
"60dvh", so the React doc is stale too.

**Stale DSM prop documentation.** `SummaryStrip.demo.jsx:15` omits `emphasis`. `TrailNav.demo.jsx:25`
documents an `onMenuClick` prop that does not exist in the component, while the real `chevron` prop is
undocumented. The Angular GroupTable meta omits both React-only props.

---

## The version question is unresolved and blocks any release

Three sources disagree and none is authoritative here:

| Source | Value |
|---|---|
| Angular `projects/odyssey-ui/package.json` | `0.14.0` |
| Newest git tag | `v0.9.1` |
| Demo metas | up to `0.13.0` (28 still at `0.2.0`) |
| `npm view @oneodyssey/ui version` | 404 — private, or not authenticated |

The DSM version-sync rule requires metas to match the **actually published** release. `package.json`
records what the repo intends to publish next, not what is live, so stamping from it risks both DSMs
advertising a version nobody can install. Cognizant owns publishing — the published number has to come
from them.

---

## Recommended sequence

1. **Ask Cognizant the published `@oneodyssey/ui` version.** Blocks every release; independent of all
   code work, so start it now.
2. **Fix `--bottombar-partial` in Angular `_tokens.scss`**, then ShipmentsBar is releasable — the only one.
3. **Commit the seven loose Angular files** so the working tree stops carrying S126 state uncommitted.
4. **Port the S126 delta.** Order: LeadNav and Alert (small, independent) → TrailNav → Navbar +
   GlobalSearch together.
5. **Port the portal/overlay seam:** TimePicker, plus the scroll-exemption guard — and verify whether
   date-picker / dropdown / action-menu need it too.
6. **Port the Escape stack** as a shared Angular service, then both modals.
7. **GroupTable** — `detailScroll`, `detailNote`, `DetailBand`. Ignore the demotion commit message.
8. **DurationPicker** is not port work. It needs Figma → `/normalize` → promotion out of app-local first,
   and `useCountdown` promoted to `@odyssey/ui`.
9. **Refresh `normalization-tracker.md`** and the stale prop docs; bump versions for the S126
   modifications.

Nothing in steps 2–9 touches the Angular remote. Pushing that repo stays user-gated.

---

*Triage run 2026-08-24 by five parallel read-only agents across `odyssey-one` and `odyssey-one-library-ui`.
No flags, versions, or component sources were modified.*
