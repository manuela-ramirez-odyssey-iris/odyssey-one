# Flow Deliverable — design

**Date:** 2026-08-24
**Thread:** D (design-system / dev-tooling)
**Pilot:** SpotBid
**Status:** approved design, not yet planned

## Why this exists

A dev-ready feature normally ships as four artifacts: stories with acceptance criteria, flows, a UI spec, and a data contract. Odyssey has three of them. The story pack (`docs/story-packs/spotbid-2026-08-21/`) carries the what and why. Dev mode plus the two published DSMs replaced the static UI spec with something better — a live prototype that names its own components in both frameworks. The flow is missing outright: SpotBid's flow was never drawn in Figma, so there is no artifact that says which screen leads to which, under what condition, and what happens when the condition fails.

The gap is not decorative. The story pack's §2 lists twenty-four behaviors (`A1`–`A12`, `B1`–`B9`, `C1`–`C3`), the screens folder holds eighteen PNGs, and §3 slices eighteen stories — three flat lists that only a human can join. Nothing states that screen `05` is where behavior `A6` lives and story `S5` is written against it.

This spec defines the flow deliverable format, using SpotBid as the pilot. The format is meant to be reused for Orders, Shipments, and whatever comes next.

## What a flow is, in this format

A flow is a set of diagrams generated from one data module. The module is the deliverable; the diagrams and the Markdown export are renderings of it.

### Node kinds

Five kinds, and this vocabulary is the reusable core:

| Kind | Meaning | Mermaid shape |
|---|---|---|
| `screen` | A state the user sees. Carries a screenshot. | rectangle |
| `action` | Something the user does. | rounded |
| `decision` | A branch. The guard rides on the outgoing edges, not in the node. | diamond |
| `system` | Async or backend work — token minting, the poll, the email send. | parallelogram |
| `terminal` | An end state, including the unhappy ones. | stadium |

### Build state and provenance

Every node also declares `state` — `built`, `stand-in`, or `not-built` — and `source`, using the same vocabulary §2 of the story pack already uses (`PRD`, `CALL <date>`, `SPB-NN`, `LINX-NNNN`, `OURS`).

This is the part that differs from a conventional flow diagram. A normal flow shows the happy built path and says nothing about the rest, so the RFQ email — a core V1 deliverable that does not exist — is invisible except as a bullet in §4 that no developer reads. Here it renders as a dashed `not-built` node in its rightful position between "planner confirms send" and "carrier opens link", with story `S7` attached. The stand-ins from §4 (overflow membership, charge catalog, fuel source, simulated bids) render the same way, in place. The flow shows its own gaps.

### Edges

An edge carries `trigger` (what the user or system did) and `guard` (the condition that must hold), plus the behavior IDs that govern it. Per the design decision, edges reference rules; they never restate them. "Both planned dates present" is a guard; the full rule about auto-checking and select-all scoping stays in `A5` and is linked, not copied.

An edge appears in a diagram if and only if both its endpoints appear in that diagram. Diagram membership is declared on nodes only, so there is no second list to keep in sync.

## The four diagrams

1. **Overview** — both actors in swimlanes, roughly fifteen nodes, from "planner opens the SpotBid tab" to "awarded carrier enters the normal tender flow". This is the PM's read.
2. **Planner detail** — the SpotBid tab: eligibility gate, derived carrier list, per-carrier dates and inclusion, Quote Setup, send confirmation, live bids, award, drafts.
3. **Carrier detail** — the tokenized bid page: token validation branch, shipment summary, charge sheet, submit / update / decline confirmations, and the three terminal states (submitted, declined, window closed).
4. **Quote lifecycle** — a state machine: `none → setup → open → closed → awarded`. Drawn separately because two rules are most likely to be built wrong from prose alone: a closed quote is immutable (`SPB-29`), and "Modify & Resend" creates a new quote instance rather than reopening the old one.

## Architecture

### Source of truth

`apps/odyssey-one/src/flows/spotbid.js` exports one object:

```js
export default {
  id: 'spotbid',
  title: 'SpotBid — planner-initiated spot bidding',
  storyPack: 'docs/story-packs/spotbid-2026-08-21/spotbid-story-pack.md',
  screensDir: 'docs/story-packs/spotbid-2026-08-21/screens',
  sampleShipmentId: '25378332',
  actors: [ /* id, label, lane order */ ],
  diagrams: [ { id, title, kind: 'flow' | 'state', entry: 'node-id' } ],
  unmappedStories: { S17: 'Cross-cutting persistence — no single node owns it.' },
  nodes: {
    'setup-fresh': {
      kind: 'screen',
      actor: 'planner',
      label: 'Setup & Carriers',
      diagrams: ['overview', 'planner'],
      screen: '02-setup-fresh.png',
      behaviors: ['A4', 'A5'],
      story: 'S3',
      state: 'built',
      source: ['CALL 08-07', 'OURS'],
      href: '/shipments/{sampleShipmentId}?tab=spotbid',
    },
  },
  edges: [
    { from: 'setup-fresh', to: 'quote-setup', trigger: 'Opens Quote Setup', behaviors: ['A6'] },
    { from: 'row-dates', to: 'row-included', trigger: 'Fills planned dates',
      guard: 'both dates present', behaviors: ['A5'] },
  ],
}
```

A registry (`src/flows/index.js`) lists the available flows. SpotBid is the first entry; adding a second flow means adding a module and a registry line, nothing else.

### Rule text is parsed, never retyped

The side panel shows the real behavior text, not a paraphrase. `tools/gen-flow.mjs` parses the `§2A` / `§2B` / `§2C` Markdown tables out of the story pack into `src/flows/spotbid.rules.json` (id, behavior, source, screen). This follows the `gen-angular-names.mjs` precedent already in the repo: generated data committed, regenerated when the source changes.

The parser fails loudly rather than silently degrading — if a `§2` heading is missing or a section yields zero rows, the tool exits non-zero.

### One tool, three jobs

`tools/gen-flow.mjs <flowId>` does all of:

1. **Parse** the story pack's rule tables into the rules JSON.
2. **Validate** the flow module (see below), exiting non-zero on any failure.
3. **Emit** `docs/flows/<flowId>.md` — fenced Mermaid per diagram plus a node table — for Jira, Confluence, and Obsidian, all of which render Mermaid natively. It also copies referenced screenshots into `public/flows/<flowId>/`.

One script rather than three, because the three jobs share the parse and always run together.

### Validation — the reason to generate rather than draw

The build fails if any of these do not hold:

- Every behavior ID referenced by a node exists in the parsed rules.
- Every `screen` filename exists in `screensDir`.
- Every `screen`-kind node has a `story`. (`system` and `terminal` nodes may omit it.)
- Every edge endpoint resolves to a declared node.
- Every node is reachable from its diagram's declared `entry` node, in every diagram it claims membership in.
- Every story `S1`–`S18` is referenced by at least one node, **or** listed in `unmappedStories` with a written reason. `S17` and `S18` are cross-cutting and will be listed there; anything else appearing in that list is a real coverage gap made visible.

This is where trace closes. Screens, rules, and stories stop being three lists a human joins by eye.

### Renderer

`/flows` is a registry index; `/flows/:flowId` renders the flow with a tab per diagram and a detail side panel. Both routes are lazy-loaded so Mermaid never enters the main bundle.

Mermaid text is generated from the module by a pure function, `toMermaid(flow, diagramId)`. Node kind maps to shape; build state maps to a `classDef` (solid for `built`, amber dashed for `stand-in`, grey dashed for `not-built`), with the palette taken from `@odyssey/tokens` rather than hardcoded hexes.

Click handling attaches listeners to the rendered SVG's node groups by id after render, rather than using Mermaid's `click … call` directive. The directive requires `securityLevel: 'loose'` and a global callback; DOM attachment needs neither.

Clicking a node opens the panel: screenshot, the behavior rows verbatim from the rules JSON with their sources, the story ID, the build-state badge, and an "Open live" link.

### Seeded IDs are load-bearing

Deep links that name a shipment would die at the next reseed, silently. The module holds one `sampleShipmentId`, and `href` values interpolate `{sampleShipmentId}`; a reseed is a one-line fix. Where a route needs no specific record, the `href` names the bare route. Validation warns on any `href` containing a bare numeric id.

## Testing

Unit tests cover what carries logic: the rule-table parser (including its failure modes), each validation rule, and `toMermaid` output for each node kind, each build state, and diagram membership filtering.

Mermaid's SVG rendering is not exercised in jsdom — per the repo's known jsdom ceilings, that measures the library rather than our code. Node-click-opens-panel and the visual weighting of build states go to browser QA, matching how dev mode was verified.

## Delivery

`docs/flows/spotbid.md` is the portable copy for Jira and Confluence. The story pack gains a pointer to the live `/flows/spotbid` URL, and its screenshot appendix becomes redundant — the flow now indexes the screens.

Deploy is user-gated, as always.

## Out of scope

- A FigJam or Figma mirror of the flow. It would be a second copy that drifts, and Mermaid renders natively in every tool the PMs use.
- The "you are here" flow layer inside dev mode. Different concern, and dev mode is stable — leave it alone.
- Editing flows through the UI. The module is the artifact; a text editor is the editor.
- Deriving flows automatically from routes or code. Flows encode intent, including the parts not built yet, which no static analysis can see.
- Flows for any domain other than SpotBid. The registry makes the second one cheap; authoring it is its own session.
