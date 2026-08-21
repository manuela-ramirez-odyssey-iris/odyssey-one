# SpotBid Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Model tier (hard rule):** all code implementation by **Sonnet** subagents; the main (Fable) session plans and reviews only.

**Goal:** Session-129 SpotBid layout & component pass — bid-page navbar countdown becomes a center title, the internal SpotBid tab gets a sticky tooltip-backed summary strip + a Quote Setup modal, DurationPicker becomes typable, modals stop clipping, Live Bids gets a Total column, and a Drafts sub-tab lands.

**Architecture:** All app-local (`apps/odyssey-one/src`) except two `@odyssey/ui` **call-site** fixes (portal wraps around `ModalMedium` consumers — the component itself is NOT modified, mirroring `ShipmentDetailsModal.jsx:410`'s existing `createPortal` precedent, so no DSM demotion cycle is triggered). DurationPicker gains TimePicker-parity interaction and a DSM demo under NORMALIZING. New `draftStore.js` (localStorage) backs the Drafts tab.

**Tech Stack:** React 18, Vitest + Testing Library, `@odyssey/ui` primitives (SummaryStrip, PillTab, ModalMedium, Badge, Tooltip via app-local `TooltipTrigger`), localStorage.

**User's spec (2026-08-20, verbatim intent), with gap-fills marked `[assumption]`:**
1. Bid page navbar: remove SummaryStrip; standard center title showing `HH : MM : SS` with Hours/Minutes/Seconds labels below each value, size-shrink on scroll preserved; the status badge floats below/outside the nav.
2. Internal SpotBid tab: sticky summary strip (cost-allocation style) — Duration (once set up) · Origin (city, state) · Destination (city, state) · Pickup Window (compact) — full content on hover per cell via Tooltip. Replaces the Shipment Summary sub-accordion. Sticky with blurred background like the bid page.
3. Setup & Carriers sub-accordion below the strip; pill sub-tabs with count badges, **All first**.
4. DurationPicker: typable + dropdown opens on field click (exactly like TimePicker), min-width; visible in the DSM NORMALIZING tab.
5. Quote Duration + "Planned Pickup for All" + "Planned Delivery for All" + Flexible checkbox move into a ModalMedium opened from a secondary button trailing the carrier-count row. Flexible ⇒ "Flexible" badge next to Pickup and Delivery on the bid page.
6. Remove the bottom Cancel button.
7. Send RFQ modal + Add Document modal clipping — portal like ShipmentDetailsModal.
8. Live Bids: Total column in the outer table; quote strip outside the accordion, sticky.
9. Send RFQ button reads "Send x/y RFQ"; after sending, auto-switch to Live Bids.
10. Drafts sub-tab: save planned drafts, restore them.

`[assumption]` list: modal trigger label "Setup Quote"; drafts are unnamed snapshots (timestamp identifies them); restore is disabled while a quote is open/awarded; typed durations accept any integer 1..max (the option list stays a quick-pick, like TimePicker); pickup-window compaction = time range when same-day, date range otherwise.

---

### Task 1: DurationPicker — typable, click-to-open, min-width (TimePicker parity)

**Files:**
- Modify: `apps/odyssey-one/src/components/fields/DurationPicker.jsx`
- Modify: `apps/odyssey-one/src/components/fields/durationPicker.css`
- Test: `apps/odyssey-one/src/components/fields/DurationPicker.test.jsx`

Read `packages/ui/src/TimePicker.jsx` first (lines 130–300) — this task copies its interaction contract verbatim: free-typed draft text, blur/Enter commit with liberal parse, field click/focus opens the listbox, chevron toggles, internal parse error.

- [ ] **Step 1: Write failing tests** (append to `DurationPicker.test.jsx`):

```jsx
describe('typable input (TimePicker parity)', () => {
  it('opens the listbox on field click', async () => {
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value={30} onChange={() => {}} />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('commits a typed integer on blur, clamped to the unit ceiling', async () => {
    const onChange = vi.fn()
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value={30} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    await userEvent.clear(input)
    await userEvent.type(input, '45')
    await userEvent.tab()
    expect(onChange).toHaveBeenCalledWith(45)
  })

  it('accepts "45 min" text and strips the unit suffix', async () => {
    const onChange = vi.fn()
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value={30} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    await userEvent.clear(input)
    await userEvent.type(input, '45 min')
    await userEvent.tab()
    expect(onChange).toHaveBeenCalledWith(45)
  })

  it('shows an error and does not commit on unparseable text', async () => {
    const onChange = vi.fn()
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value={30} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    await userEvent.clear(input)
    await userEvent.type(input, 'abc')
    await userEvent.tab()
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/invalid/i)).toBeInTheDocument()
  })

  it('clamps typed values above the ceiling to max', async () => {
    const onChange = vi.fn()
    render(<DurationPicker id="d" label="Quote Duration" unit="minutes" value={30} onChange={onChange} />)
    const input = screen.getByRole('combobox')
    await userEvent.clear(input)
    await userEvent.type(input, '999')
    await userEvent.tab()
    expect(onChange).toHaveBeenCalledWith(120) // UNIT_CONFIG.minutes.max
  })
})
```

- [ ] **Step 2:** Run `cd apps/odyssey-one && npx vitest run src/components/fields/DurationPicker.test.jsx` — expect the new tests to FAIL (field is readOnly today; click does nothing).

- [ ] **Step 3: Implement.** In `DurationPicker.jsx`:
  - Add a `parseDuration(raw, unit)` export: `const n = parseInt(String(raw).replace(/[^\d]/g, ''), 10)` → `Number.isNaN(n) || n < 1 ? null : Math.min(n, cfg.max)`.
  - Replace the idle `FormField`'s `readOnly` with a draft-text pattern: local `text` state synced from `value` via effect (`value → formatDuration(value, unit)`); `onChange={(e) => { setText(e.target.value); if (!open) setOpen(true) }}`; `onFocus={fieldProps.onFocus}` stays (useFieldPopover opens on focus — verify it does; if not, call `setOpen(true)` in onFocus); add `onClick={() => setOpen(true)}` on the field.
  - Blur commit (on the wrapper's existing `onBlur`, after `wrapperProps.onBlur`): parse `text`; null → set internal error `'Invalid duration'` and keep prior `value`; else `onChange(parsed)`, clear error. Enter key commits the same way (extend the wrapper `onKeyDown`).
  - Picking a row still commits and closes; picking clears the error.
  - Internal error renders through FormField's existing `error` prop (external `error` prop wins when set, mirroring TimePicker's `error`/`externalError` split).
- [ ] **Step 4:** In `durationPicker.css` add width discipline (mirror `.time-picker`'s pattern at `styles/components.css:7193`):

```css
.duration-picker { min-width: 124px; width: 150px; }
```

(150px = the app's general field floor; the field no longer stretches to its grid track.)
- [ ] **Step 5:** Run the full file: `npx vitest run src/components/fields/DurationPicker.test.jsx` — all pass. Also run `src/spotboard/SetupCarriers.test.jsx` (its Quote Duration assertions may reference the readOnly field — update any that break to the typable contract, keeping their intent).
- [ ] **Step 6: Commit** `feat(spotbid): DurationPicker typable + click-to-open, TimePicker parity`

### Task 2: DurationPicker in the DSM NORMALIZING tab

**Files:**
- Create: `apps/odyssey-one/src/routes/design-system/demos/DurationPicker.demo.jsx`

- [ ] **Step 1:** Read one existing demo for the exact meta/props/playground shape (`demos/CalendarPicker.demo.jsx`) and the DSM demo convention (Schematic + ONE Playground — no enumerated cases). Check `tools/`/`scripts/` for the S85 dsm-flags script header (`node scripts/dsm-flags.mjs` or similar) — if it has a verb for ADDING a normalizing entry, use it; otherwise a new demo file with `normalizing: true` is the documented path (collectDemos accepts it).
- [ ] **Step 2:** Create the demo importing the app-local component (`import DurationPicker from '../../../components/fields/DurationPicker.jsx'`), meta:

```jsx
export const meta = {
  name: 'DurationPicker',
  tier: 'molecule',
  version: '0.1.0',
  createdVersion: '0.1.0',
  normalizing: true,   // app-local; owes Figma + /normalize + Angular before promotion
  figmaNode: null,
  codeConnect: null,
}
```

Schematic: idle picker + running countdown (use `running`, `endsAt: Date.now() + 90_000`, `totalMs: 300_000`). Playground: unit select (hours/minutes/seconds), typable value, running toggle.
- [ ] **Step 3:** `npx vitest run src/routes/design-system/collectDemos.test.js` and `npm run build:odyssey-one` from repo root (the demo glob is build-time). Load `/design-system` in the dev server and confirm DurationPicker appears under NORMALIZING.
- [ ] **Step 4: Commit** `feat(dsm): register DurationPicker demo as NORMALIZING`

### Task 3: Modal clipping — portal ModalMedium call sites

**Files:**
- Modify: `apps/odyssey-one/src/spotboard/SetupCarriers.jsx` (Send RFQ confirm modal, currently inside the SubAccordion)
- Modify: `apps/odyssey-one/src/components/detail/DocumentsTab.jsx` (both ModalMediums, lines ~237 and ~270)

Root-cause note: `ModalMedium` renders in place; any transformed/overflow ancestor clips it. `ShipmentDetailsModal.jsx:410` already solves this with `createPortal(<ModalMedium…/>, document.body)`. We replicate at call sites rather than patching `@odyssey/ui` (a component modification would trigger the demote-to-NORMALIZING lifecycle for a behavior change better made during its next normalization cycle — leave a `ponytail:` comment at each wrap saying exactly that).

- [ ] **Step 1:** In `SetupCarriers.jsx`: move the `{confirming && <ModalMedium…>}` block OUT of the `<SubAccordion>` (to the component's root fragment, after the actions) and wrap: `createPortal(<ModalMedium …>…</ModalMedium>, document.body)`. Import `{ createPortal } from 'react-dom'`.
- [ ] **Step 2:** Same wrap for both DocumentsTab modals.
- [ ] **Step 3:** `npx vitest run src/spotboard/SetupCarriers.test.jsx src/components/detail/DocumentsTab.test.jsx` — portals render into document.body, Testing Library queries still find them via `screen`; fix any `within(container)` scoped queries.
- [ ] **Step 4: Commit** `fix(modals): portal Send RFQ + Add Document ModalMediums to body (clipping)`

### Task 4: Strip formatters + sticky SpotSummaryStrip (Setup tab)

**Files:**
- Create: `apps/odyssey-one/src/spotboard/stripFormat.js`
- Create: `apps/odyssey-one/src/spotboard/stripFormat.test.js`
- Create: `apps/odyssey-one/src/spotboard/SpotSummaryStrip.jsx`
- Modify: `apps/odyssey-one/src/components/detail/SpotBoardTab.jsx`
- Modify: `apps/odyssey-one/src/spotboard/SetupCarriers.jsx` (remove Shipment Summary SubAccordion + `summaryFields` prop)
- Modify: `apps/odyssey-one/src/spotboard/spotboard.css`

Location strings are `"FacilityName, City, TX 77001 US"` (mapSellShipmentOutToDetail.ts:143–146). Order dates are `"MM/DD/YYYY HH:MM TZ"` (or `--`).

- [ ] **Step 1: Failing tests** (`stripFormat.test.js`):

```js
import { describe, it, expect } from 'vitest'
import { cityState, compactWindow } from './stripFormat.js'

describe('cityState', () => {
  it('extracts "City, ST" from a full stop location', () => {
    expect(cityState('NOURYON COLUMBUS PL, Kansas City, MO 64101 US')).toBe('Kansas City, MO')
  })
  it('passes through short/unparseable values', () => {
    expect(cityState('Kansas City')).toBe('Kansas City')
    expect(cityState(undefined)).toBe(undefined)
  })
})

describe('compactWindow', () => {
  it('same-day window → time range', () => {
    expect(compactWindow('03/23/2026 08:00 CDT', '03/23/2026 12:00 CDT')).toBe('08:00 – 12:00 CDT')
  })
  it('multi-day window → date range', () => {
    expect(compactWindow('03/23/2026 08:00 CDT', '03/25/2026 12:00 CDT')).toBe('03/23 – 03/25')
  })
  it('missing side → the present side, dash when neither', () => {
    expect(compactWindow('03/23/2026 08:00 CDT', '--')).toBe('03/23/2026 08:00 CDT')
    expect(compactWindow('--', '--')).toBe('--')
  })
})
```

- [ ] **Step 2:** Run → FAIL. Implement `stripFormat.js`:

```js
// cityState — "Name, City, REGION POSTAL COUNTRY" → "City, REGION".
// The stop-location format is stated at mapSellShipmentOutToDetail.ts:143-146.
export function cityState(loc) {
  if (typeof loc !== 'string') return loc
  const parts = loc.split(', ')
  if (parts.length < 2) return loc
  const city = parts[parts.length - 2]
  const region = parts[parts.length - 1].split(' ')[0]
  return region ? `${city}, ${region}` : city
}

const DT = /^(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})\s*(\S*)/
// compactWindow — only the DISTINCTIVE part of the pickup window: same-day
// windows differ by time, multi-day by date. Full strings live in the tooltip.
export function compactWindow(earliest, latest) {
  const e = typeof earliest === 'string' ? earliest.match(DT) : null
  const l = typeof latest === 'string' ? latest.match(DT) : null
  if (!e && !l) return '--'
  if (!e || !l) return (e ? earliest : latest)
  if (e[1] === l[1]) return `${e[2]} – ${l[2]}${l[3] ? ` ${l[3]}` : ''}`
  return `${e[1].slice(0, 5)} – ${l[1].slice(0, 5)}`
}
```

- [ ] **Step 3:** `SpotSummaryStrip.jsx` — SummaryStrip whose cells carry hover tooltips via the existing app-local `TooltipTrigger` (`components/ui/TooltipTrigger.jsx`):

```jsx
import { SummaryStrip } from '@odyssey/ui'
import TooltipTrigger from '../components/ui/TooltipTrigger.jsx'

// SpotSummaryStrip — sticky shipment-context band for the SpotBid tab
// (user, 2026-08-20): Duration (once set) · Origin · Destination · Pickup
// Window, each cell compacted to its distinctive info with the FULL value in
// a hover Tooltip (cost-allocation strip look, bid-page sticky treatment).
// `items`: [{ label, value, full? }] — `full` (when present and different)
// wraps the value in a TooltipTrigger.
export default function SpotSummaryStrip({ items, className = '', ...rest }) {
  const cells = items.map(({ label, value, full }) => ({
    label,
    value: full && full !== value
      ? (
        <TooltipTrigger asSpan tooltipProps={{ groups: [{ subtitle: label, content: full }] }}>
          <span>{value ?? '--'}</span>
        </TooltipTrigger>
      )
      : value,
  }))
  return <SummaryStrip className={`spot-sticky-strip ${className}`.trim()} items={cells} {...rest} />
}
```

- [ ] **Step 4:** In `SpotBoardTab.jsx`:
  - Add `const [terms, setTerms] = useState(null)` (filled by Task 5's modal via `onTermsChange`; until then stays null — wire the prop now, the modal lands next task).
  - Build strip items off the existing `header` memo (which stays; the `summaryFields` memo is deleted):

```jsx
const durationMin = quote?.durationMin ?? terms?.durationMin ?? null
const stripItems = [
  ...(durationMin != null ? [{ label: 'Duration', value: `${durationMin} min` }] : []),
  { label: 'Origin', value: cityState(header?.origin), full: header?.origin },
  { label: 'Destination', value: cityState(header?.destination), full: header?.destination },
  {
    label: 'Pickup Window',
    value: compactWindow(firstOrder?.earliestPickup, firstOrder?.latestPickup),
    full: header?.pickupWindow,
  },
]
```

  (`firstOrder` = `shipmentDetails?.orderDetails?.[0]` — lift it out of `buildHeader` or re-read it here.) Render `<SpotSummaryStrip aria-label="Shipment summary" items={stripItems} />` directly under the sub-tab band, ABOVE the pane-col, on the **setup** tab. Remove the `summaryFields` prop from `<SetupCarriers …>`.
  - In `SetupCarriers.jsx`: delete the `summaryFields` prop + the Shipment Summary `<SubAccordion>` block; drop the now-unused `TitleSubtitle` import if nothing else uses it.
- [ ] **Step 5:** Sticky + blur CSS in `spotboard.css` (bid-page treatment: 0-alpha top → white bottom + blur 8, cf. Navbar external):

```css
/* Sticky context: verify in the browser which ancestor scrolls the detail
   pane (RightPanel content vs window) and adjust `top` to sit under any
   sticky tab band above it. */
.spot-sticky-strip {
  position: sticky;
  top: 0;
  z-index: 5;
  background: linear-gradient(rgba(255, 255, 255, 0) 0%, var(--white) 100%);
}
@supports (backdrop-filter: blur(8px)) {
  .spot-sticky-strip { backdrop-filter: blur(8px); }
}
```

- [ ] **Step 6:** Update `SpotBoardTab.test.jsx` / `SetupCarriers.test.jsx`: assertions on the Shipment Summary accordion / `summaryFields` grid move to the strip (origin cell reads "Kansas City, MO", tooltip appears on hover via `userEvent.hover`). Run both files.
- [ ] **Step 7: Commit** `feat(spotbid): sticky tooltip summary strip replaces Shipment Summary accordion`

### Task 5: Quote Setup modal (Duration · Planned Pickup for All · Planned Delivery for All · Flexible)

**Files:**
- Modify: `apps/odyssey-one/src/spotboard/SetupCarriers.jsx`
- Modify: `apps/odyssey-one/src/components/detail/SpotBoardTab.jsx` (receive `onTermsChange`)
- Test: `apps/odyssey-one/src/spotboard/SetupCarriers.test.jsx`

- [ ] **Step 1: Failing tests:** "Setup Quote" secondary button renders trailing the carrier-count row; clicking opens a dialog with the four fields; Apply sets every visible row's Planned Pickup/Delivery and closes; duration picked in the modal reaches `onTermsChange`.
- [ ] **Step 2: Implement.**
  - Remove the `setup-carriers__controls` block (DurationPicker + Flexible checkbox) from the head. `durationMin`/`flexiblePickup` state stays where it is.
  - Add state `const [setupOpen, setSetupOpen] = useState(false)` and local drafts for the modal (`draftDuration`, `draftPickup`, `draftDelivery`, `draftFlexible` — seeded from current values when opening).
  - Toolbar row becomes a flex row: count on the left, `<Button variant="secondary" disabled={readOnly} onClick={openSetup}>Setup Quote</Button>` trailing right.
  - Modal (portal to body, per Task 3's idiom):

```jsx
{setupOpen && createPortal(
  <ModalMedium
    title="Quote Setup"
    onClose={() => setSetupOpen(false)}
    footer={
      <>
        <Button variant="secondary" size="lg" onClick={() => setSetupOpen(false)}>Cancel</Button>
        <Button variant="primary" size="lg" onClick={applySetup}>Apply</Button>
      </>
    }
  >
    <div className="setup-carriers__setup-grid">
      <DurationPicker id="quote-duration" label="Quote Duration" unit="minutes"
        value={draftDuration} onChange={setDraftDuration} />
      <DateField id="setup-pickup-all" label="Planned Pickup for All"
        value={draftPickup} onChange={setDraftPickup} />
      <DateField id="setup-delivery-all" label="Planned Delivery for All"
        value={draftDelivery} onChange={setDraftDelivery} />
      <Checkbox label="Flexible" checked={draftFlexible}
        onChange={(e) => setDraftFlexible(e.target.checked)} />
    </div>
  </ModalMedium>,
  document.body
)}
```

  Check `DateField`'s actual props (`components/orders/create/fields/DateField.jsx`) — it's used label-less in the table today; if it lacks a label prop, wrap in the FormField label markup the table omits.
  - `applySetup()`: commit drafts to `durationMin`/`flexiblePickup`; if `draftPickup`/`draftDelivery` set, map ALL rows: `plannedPickup/plannedDelivery = draft value`, recompute `incl = !!(pickup && delivery)` per row (same rule as `updateDate`); call `onTermsChange?.({ durationMin: draftDuration, flexiblePickup: draftFlexible })`; close.
  - The DurationPicker keeps its running-countdown role: when `quote?.status === 'open'`, ALSO render the running DurationPicker back in the head area (running state only) so the planner still sees the burn-down `[assumption: the live countdown stays visible outside the modal]` — one instance, `running`/`endsAt` props as today.
  - `SpotBoardTab`: pass `onTermsChange={setTerms}` (state added in Task 4 — duration now appears in the strip once Apply fires).
- [ ] **Step 3:** Run `SetupCarriers.test.jsx` + `SpotBoardTab.test.jsx`; migrate old head-control tests (duration default 30, flexible checkbox) into the modal flow rather than deleting them.
- [ ] **Step 4: Commit** `feat(spotbid): Quote Setup modal (duration, planned dates for all, flexible)`

### Task 6: Pill tabs — All first, count badges

**Files:**
- Modify: `apps/odyssey-one/src/spotboard/SetupCarriers.jsx`
- Test: `apps/odyssey-one/src/spotboard/SetupCarriers.test.jsx`

- [ ] **Step 1: Failing test:** pills render in order All · TL · LTL; each shows its row count (All = total rows, TL/LTL = rows of that list); default mode is `'all'`.
- [ ] **Step 2:** Reorder `MODE_TABS = [{ key: MODE_ALL, label: 'All' }, ...MODES.map(...)]`; default `useState(MODE_ALL)`; pass `count` to `PillTab` (it already renders a metric Badge):

```jsx
const countFor = (key) =>
  key === MODE_ALL ? rows.length : rows.filter((r) => listIdOf(r) === MODES.find((m) => m.key === key).list.id).length
// in render: <PillTab key={m.key} label={m.label} count={countFor(m.key)} … />
```

- [ ] **Step 3:** Run tests; update any test assuming default mode `'first'`.
- [ ] **Step 4: Commit** `feat(spotbid): All-first pill tabs with count badges`

### Task 7: Actions row — drop Cancel, "Send x/y RFQ", auto-jump to Live Bids

**Files:**
- Modify: `apps/odyssey-one/src/spotboard/SetupCarriers.jsx`
- Modify: `apps/odyssey-one/src/components/detail/SpotBoardTab.jsx`
- Tests: both `.test.jsx` files

- [ ] **Step 1: Failing tests:** no "Cancel" button in the actions row; primary button text is `Send 2/5 RFQ` (2 included of 5 rows); after Confirm & Send, `SpotBoardTab` shows the Live Bids sub-tab.
- [ ] **Step 2:** In `SetupCarriers.jsx` actions: delete the Cancel `<Button>` (keep the `onCancel` prop only if something else still uses it — nothing does after this; remove the prop and its JSDoc). Primary label: `` `Send ${includedRows.length}/${rows.length} RFQ` ``. Confirm modal lead already states the count — leave it.
- [ ] **Step 3:** In `SpotBoardTab.handleSendRFQ`, after `scheduleSimulatedBids(...)`: `setSubTab('bids')`.
- [ ] **Step 4:** Run both test files.
- [ ] **Step 5: Commit** `feat(spotbid): Send x/y RFQ label, auto-open Live Bids, remove Cancel`

### Task 8: Live Bids — Total outer column, strip outside + sticky

**Files:**
- Modify: `apps/odyssey-one/src/spotboard/LiveBids.jsx`
- Modify: `apps/odyssey-one/src/spotboard/liveBids.css` (only if the strip needs local spacing)
- Test: `apps/odyssey-one/src/spotboard/LiveBids.test.jsx`

- [ ] **Step 1: Failing tests:** outer table has a "Total" header; a carrier with a bid shows its `fmtDollar(bid.total)` in the OUTER row; the quote SummaryStrip renders outside/above the "Live Bids" SubAccordion with the sticky class.
- [ ] **Step 2:** `COLUMNS` gains `{ key: 'total', label: 'Total', align: 'right' }` (verify GroupTable outer columns honor `align` — the detail columns do; if not, right-align via CSS on the cell). Each group's `values.total = c.bid?.status === 'bid' ? fmtDollar(c.bid.total) : '—'`.
- [ ] **Step 3:** Move the `<SummaryStrip className="live-bids__summary" …>` out of the SubAccordion: LiveBids returns a fragment — strip first (add `spot-sticky-strip` to its className), then the SubAccordion with the table/actions.
- [ ] **Step 4:** Run `LiveBids.test.jsx` + `e2e.test.jsx`.
- [ ] **Step 5: Commit** `feat(spotbid): Live Bids Total column + sticky quote strip outside accordion`

### Task 9: Drafts sub-tab (save + restore)

**Files:**
- Create: `apps/odyssey-one/src/spotboard/draftStore.js`
- Create: `apps/odyssey-one/src/spotboard/draftStore.test.js`
- Create: `apps/odyssey-one/src/spotboard/DraftsPanel.jsx`
- Modify: `apps/odyssey-one/src/components/detail/SpotBoardTab.jsx`
- Test: `apps/odyssey-one/src/components/detail/SpotBoardTab.test.jsx`

- [ ] **Step 1: Failing store tests:**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { listDrafts, saveDraftSnapshot, removeDraft } from './draftStore.js'

const PAYLOAD = { listId: 'a', listName: 'TL', durationMin: 30, carriers: [], flexiblePickup: false }

beforeEach(() => localStorage.clear())

it('saves and lists snapshots, newest first', () => {
  saveDraftSnapshot('S1', PAYLOAD, 1000)
  saveDraftSnapshot('S1', { ...PAYLOAD, durationMin: 60 }, 2000)
  const drafts = listDrafts('S1')
  expect(drafts).toHaveLength(2)
  expect(drafts[0].payload.durationMin).toBe(60)
  expect(drafts[0].savedAt).toBe(2000)
})

it('removes by id and is scoped per shipment', () => {
  const d = saveDraftSnapshot('S1', PAYLOAD, 1000)
  saveDraftSnapshot('S2', PAYLOAD, 1000)
  removeDraft('S1', d.id)
  expect(listDrafts('S1')).toHaveLength(0)
  expect(listDrafts('S2')).toHaveLength(1)
})
```

- [ ] **Step 2:** Implement `draftStore.js` (same localStorage idiom as `spotStore.js`):

```js
// Named-snapshot store for SpotBid draft plans — separate from spotStore's
// single live quote: a snapshot is a restorable copy of the Setup payload,
// identified by savedAt (no user naming in v1).
const key = (shipmentId) => `spotboard:drafts:${shipmentId}`

function read(shipmentId) {
  try { return JSON.parse(localStorage.getItem(key(shipmentId))) ?? [] } catch { return [] }
}

export function listDrafts(shipmentId) {
  return read(shipmentId).sort((a, b) => b.savedAt - a.savedAt)
}

export function saveDraftSnapshot(shipmentId, payload, nowMs) {
  const draft = { id: crypto.randomUUID(), savedAt: nowMs, payload }
  localStorage.setItem(key(shipmentId), JSON.stringify([...read(shipmentId), draft]))
  return draft
}

export function removeDraft(shipmentId, id) {
  localStorage.setItem(key(shipmentId), JSON.stringify(read(shipmentId).filter((d) => d.id !== id)))
}
```

- [ ] **Step 3:** `DraftsPanel.jsx` — plain `odyssey-table` (Saved · Duration · Carriers · Lists · actions). Restore = `<Button size="sm" variant="secondary">`; Delete = plain `Trash2` icon button (row-action convention — never a Button). Empty state via `EmptyState` ("No saved drafts yet — Save Draft from Setup & Carriers."). Props: `{ drafts, restoreDisabled, onRestore(draft), onDelete(draft) }`. Carriers cell: `${payload.carriers.filter((c) => c.incl).length}/${payload.carriers.length}`; Saved cell via `formatDateTimeMDYHM(new Date(savedAt))`.
- [ ] **Step 4:** Wire `SpotBoardTab`:
  - `SUB_TABS` gains `{ key: 'drafts', label: 'Drafts' }`.
  - `const [drafts, setDrafts] = useState(() => listDrafts(shipment?.sellShipment))`.
  - Save: wrap the existing prop — `onSaveDraft={(payload) => { saveDraft(payload); setDrafts(listDrafts(sid)) after saveDraftSnapshot(sid, payload, Date.now()) }}`.
  - Restore (only while no open/awarded quote — pass `restoreDisabled={quote?.status === 'open' || quote?.status === 'awarded'}`): `clearQuote(); saveDraft(draft.payload); setSubTab('setup')`.
  - Key the `<SetupCarriers>` element with `key={quote?.quoteId ?? 'fresh'}` so a restore remounts it and its state reseeds from the restored quote.
  - Delete: `removeDraft(sid, draft.id); setDrafts(listDrafts(sid))`.
- [ ] **Step 5: Component tests** in `SpotBoardTab.test.jsx`: Drafts tab renders saved snapshot; Restore repopulates Setup (duration visible in strip); Restore disabled while quote open.
- [ ] **Step 6:** Run `draftStore.test.js`, `SpotBoardTab.test.jsx`.
- [ ] **Step 7: Commit** `feat(spotbid): Drafts sub-tab with snapshot save/restore`

### Task 10: Bid page — countdown center title + floating badge + Flexible badges

**Files:**
- Modify: `apps/odyssey-one/src/routes/CarrierBid.jsx`
- Modify: `apps/odyssey-one/src/routes/carrierBid.css`
- Test: `apps/odyssey-one/src/routes/CarrierBid.test.jsx`

- [ ] **Step 1: Failing tests:** open-bid branch renders a `role="timer"` titled countdown with visible "Hours"/"Minutes"/"Seconds" labels and `:` separators, NOT a SummaryStrip; the "Bid Open" badge renders outside the navbar element; `quote.flexiblePickup: true` renders a "Flexible" badge beside both Pickup and Delivery.
- [ ] **Step 2:** Replace `BidCountdownStrip` with `BidCountdownTitle` (same file, same hooks — keep the export name change mirrored in tests):

```jsx
export function BidCountdownTitle({ closeAt, onExpire }) {
  const remaining = useCountdown(closeAt, onExpire)
  const expired = remaining <= 0
  const urgent = !expired && remaining < URGENT_MS
  const { hh, mm, ss } = formatHMS(remaining)

  if (expired) return <div className="carrier-bid-countdown-title" role="timer">Closed</div>

  return (
    <div
      className={`carrier-bid-countdown-title${urgent ? ' carrier-bid-countdown-title--urgent' : ''}`}
      role="timer"
      aria-label={`Bid closes in ${hh}:${mm}:${ss}`}
    >
      {[['Hours', hh], ['Minutes', mm], ['Seconds', ss]].map(([label, v], i) => (
        <Fragment key={label}>
          {i > 0 && <span className="carrier-bid-countdown-title__sep" aria-hidden="true">:</span>}
          <span className="carrier-bid-countdown-title__unit">
            <span className="carrier-bid-countdown-title__value">{v}</span>
            <span className="carrier-bid-countdown-title__label">{label}</span>
          </span>
        </Fragment>
      ))}
    </div>
  )
}
```

- [ ] **Step 3:** Badge floats below the nav: inside `.carrier-bid-navbar-wrap` (which is the sticky element), after `<Navbar …/>`, render on the open branch only:

```jsx
<div className="carrier-bid-status-float">
  <Badge variant="green" statusDot>Bid Open</Badge>
</div>
```

- [ ] **Step 4:** CSS (`carrierBid.css`): DELETE the `.summary-strip` cell/width/compact overrides that existed only for the countdown strip (lines ~100–260 — every rule scoped to `.carrier-bid-navbar-wrap .summary-strip*` / `.carrier-bid-page .summary-strip__cell` / `--display` sizing; keep anything a NON-countdown SummaryStrip on this page still needs — grep the page for other SummaryStrip uses first: there are none after this change). Add:

```css
.carrier-bid-countdown-title {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: var(--spacing-3);
}
.carrier-bid-countdown-title__unit { display: flex; flex-direction: column; align-items: center; }
.carrier-bid-countdown-title__value {
  font-size: var(--font-size-4xl);
  line-height: var(--line-height-4xl);
  font-weight: 600;
  transition: font-size 200ms ease, line-height 200ms ease;
}
.carrier-bid-countdown-title__sep {
  font-size: var(--font-size-4xl);
  line-height: var(--line-height-4xl);
  font-weight: 600;
  transition: font-size 200ms ease, line-height 200ms ease;
}
.carrier-bid-countdown-title__label {
  font-size: var(--font-size-xs);
  font-weight: 500;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
/* Scroll-shrink preserved — same trigger class as before */
.carrier-bid-navbar-wrap--compact .carrier-bid-countdown-title__value,
.carrier-bid-navbar-wrap--compact .carrier-bid-countdown-title__sep {
  font-size: var(--font-size-lg);
  line-height: var(--line-height-lg);
}
.carrier-bid-navbar-wrap--compact .carrier-bid-countdown-title__label {
  font-size: var(--font-size-xs); /* labels stay readable; only digits shrink */
}
.carrier-bid-countdown-title--urgent .carrier-bid-countdown-title__value { color: var(--text-error, #dc2626); }
/* Badge floats OUTSIDE the nav surface, centered below it, riding the sticky wrap */
.carrier-bid-status-float {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: var(--spacing-2);
}
.carrier-bid-navbar-wrap { position: sticky; /* existing */ }
.carrier-bid-navbar-wrap { position: relative; } /* merge into the existing rule — sticky already establishes a containing block; verify */
```

  (Check existing tokens for the urgent red — the old urgent rule used a specific color; reuse it.) Sanity: `position: sticky` boxes ARE containing blocks for absolute children — the second rule above is unnecessary if so; verify in browser and keep only what's needed.
- [ ] **Step 5: Flexible badges** — in the Shipment Detail grid, when `quote.flexiblePickup`:

```jsx
<div className="carrier-bid-card__date-group">
  <TitleSubtitle title={order.earliestPickup} subtitle="Pickup" />
  {quote.flexiblePickup && <Badge variant="blue">Flexible</Badge>}
</div>
<div className="carrier-bid-card__date-group">
  <TitleSubtitle title={order.earliestDelivery} subtitle="Delivery" />
  {quote.flexiblePickup && <Badge variant="blue">Flexible</Badge>}
</div>
```

  Style `.carrier-bid-card__date-group` like the existing `__hazmat-group` (flex row, badge beside value). `[assumption: one flexiblePickup flag drives BOTH badges — the spec says "next to pickup and delivery"; blue variant, subject to the user's later call]`
- [ ] **Step 6:** Run `CarrierBid.test.jsx` — rewrite `BidCountdownStrip` tests against `BidCountdownTitle` (expired → "Closed", urgent class, label text), keep their intent.
- [ ] **Step 7: Commit** `feat(carrier-bid): countdown center title in navbar, floating status badge, Flexible badges`

### Task 11: Full verification

- [ ] **Step 1:** `cd apps/odyssey-one && npx vitest run` — full app suite green (S128 baseline: 1519).
- [ ] **Step 2:** `npm run build:odyssey-one` from repo root — clean build.
- [ ] **Step 3:** Browser pass (`npm run dev:odyssey-one`): shipment detail → SpotBid tab: strip sticks with blur while scrolling; tooltips on hover; Setup Quote modal opens un-clipped and applies dates to all rows; pills All·TL·LTL with counts; Send 2/5 RFQ → auto-jump to Live Bids; Total column populated; Drafts save/restore round-trip. Bid page (`/spot-bid/:token` from the RFQ links panel): H:M:S title with labels, shrink on scroll, badge floating below nav, Flexible badges. Documents tab: Add Document modal un-clipped. DSM `/design-system`: DurationPicker under NORMALIZING; duration field typable, opens on click, holds 150px.
- [ ] **Step 4:** No deploy (hard rule — no prod deploy without explicit permission).

---

**Carry-forwards this plan creates:** DurationPicker still owes Figma + `/normalize` + Angular (now visible in DSM as NORMALIZING); ModalMedium's in-component portal deferred to its next normalization cycle (`ponytail:` comments at the three call-site wraps); drafts are localStorage-only (no API); "Flexible" badge variant/wording needs the user's confirmation.
