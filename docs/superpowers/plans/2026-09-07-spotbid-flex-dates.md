# SpotBid Flexible Dates — Carrier Picks From Allowable Days

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a quote direction is flagged Flexible, each carrier's bid page offers a date picker restricted to that carrier's allowable days, the chosen dates ride on the bid, and the planner sees them in Live Bids and Award.

**Architecture:** Send RFQ computes a per-carrier, per-direction allow-list (`planned ± N days` from `flexConfig`, minus a seeded operating calendar) and stores it on the carrier row. CarrierBid renders `@odyssey/ui` `DatePicker` with `enabledDates` from that list; the picked dates persist on `bid`. LiveBids/award read `bid.pickupDate`/`bid.deliveryDate`. The DSM picker gains an `isDateEnabled` predicate so devs never hand-format strings for local rules; the array stays the wire form.

**Tech Stack:** React 18, Vitest + Testing Library (jsdom), `@odyssey/ui` DatePicker/CalendarPicker, `spotStore` (localStorage + `spot_state` jsonb blob — the quote is persisted whole, so new carrier/bid fields need no migration).

**Canon:** SPB-13, SPB-60, SPB-69, SPB-73 (`vault/10-domains/spotboard/decisions/decision-log.md`). Dates are date-only (Kathleen written answer #5). **Assumption (open with Kathleen):** the window is `± N` around the planned date — both legacy exhibits show both sides; her 08/20 wording says "before". One constant in Task 2 flips it.

**Conventions:** every commit subject starts with `S140: `. Run tests with `rtk npx vitest run <path>` from the repo root. Planned dates on carrier rows are `"MM/DD/YYYY"` strings (SetupCarriers → DateField); allow-lists are `'YYYY-MM-DD'` strings (what `enabledDates` accepts).

---

## File map

| File | Change |
|---|---|
| `packages/ui/src/CalendarPicker.jsx` | new `isDateEnabled` predicate prop, composed with bounds + `enabledDates` |
| `packages/ui/src/CalendarPicker.test.jsx` | 1 test |
| `packages/ui/src/DatePicker.jsx` | forward predicate; typed entry respects it |
| `packages/ui/src/DatePicker.test.jsx` | 1 test |
| `apps/odyssey-one/src/routes/design-system/demos/CalendarPicker.demo.jsx` | props-table row + a "weekdays only" option |
| `playground/normalization-tracker.md` | append note to both rows |
| `apps/odyssey-one/src/spotboard/flexDates.js` (new) | `allowableDates(anchorMdy, days, scac)` pure |
| `apps/odyssey-one/src/spotboard/flexDates.test.js` (new) | 4 tests |
| `apps/odyssey-one/src/spotboard/spotStore.js` | `sendRFQ` stamps `allowablePickupDates`/`allowableDeliveryDates`; `submitBid` keeps `bid.pickupDate`/`bid.deliveryDate` |
| `apps/odyssey-one/src/spotboard/spotStore.test.js` | 2 tests |
| `apps/odyssey-one/src/routes/CarrierBid.jsx` | picker per flagged direction, submit gate, dates on bid |
| `apps/odyssey-one/src/routes/CarrierBid.test.jsx` | 3 tests |
| `apps/odyssey-one/src/spotboard/LiveBids.jsx` | Pickup/Delivery columns when the quote has flex |
| `apps/odyssey-one/src/spotboard/LiveBids.test.jsx` | 1 test |
| `apps/odyssey-one/src/spotboard/award.js` | bid dates win over planned dates |
| `apps/odyssey-one/src/spotboard/award.test.js` | 1 test |
| `vault/10-domains/spotboard/decisions/decision-log.md` | SPB-81 (build note + the ±/before assumption) |

---

### Task 1: `isDateEnabled` predicate on CalendarPicker and DatePicker

**Files:**
- Modify: `packages/ui/src/CalendarPicker.jsx:20-41`, `:110-116`
- Modify: `packages/ui/src/DatePicker.jsx:23-24`, `:119-143`, `:314`, `:329`
- Test: `packages/ui/src/CalendarPicker.test.jsx`, `packages/ui/src/DatePicker.test.jsx`
- Modify: `apps/odyssey-one/src/routes/design-system/demos/CalendarPicker.demo.jsx:23`, `:100-135`
- Modify: `playground/normalization-tracker.md` (CalendarPicker + DatePicker rows)

- [ ] **Step 1: Failing CalendarPicker test** — append inside the existing `describe` in `CalendarPicker.test.jsx`, after the two `enabledDates` tests:

```jsx
  test('isDateEnabled — predicate greys out days it rejects, composed with enabledDates', () => {
    const onChange = vi.fn()
    render(
      <CalendarPicker
        defaultMonth={new Date(2024, 10, 1)}
        enabledDates={['2024-11-15', '2024-11-16']}      // Fri, Sat
        isDateEnabled={d => d.getDay() !== 6}             // no Saturdays
        onChange={onChange}
      />,
    )
    expect(screen.getByLabelText('Friday, November 15, 2024').disabled).toBe(false)
    expect(screen.getByLabelText('Saturday, November 16, 2024').disabled).toBe(true)
    fireEvent.click(screen.getByLabelText('Saturday, November 16, 2024'))
    expect(onChange).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run** `rtk npx vitest run packages/ui/src/CalendarPicker.test.jsx` — expected: 1 FAIL (Saturday `disabled` is `false`).

- [ ] **Step 3: Implement in CalendarPicker.jsx.** Doc block (after the `enabledDates` paragraph, line 24):

```js
 *
 * `isDateEnabled(date) => boolean` — optional predicate for rules the caller
 * owns locally (weekends, a holiday set). Composed with bounds and
 * `enabledDates`: a day must pass ALL that are given. Prefer this over
 * hand-building a date list; use `enabledDates` for lists an API returns.
```

Destructuring (line 39): add `isDateEnabled = null,` after `enabledDates = null,`. Replace the `isEnabled` function (lines 114-116):

```js
  function isEnabled(d) {
    return inBounds(d) && (!allowed || allowed.has(iso(d))) && (!isDateEnabled || !!isDateEnabled(d))
  }
```

- [ ] **Step 4: Run** the same command — expected: all PASS.

- [ ] **Step 5: Failing DatePicker test** — append to `DatePicker.test.jsx` (the `dayButtons` helper already exists there):

```jsx
describe('DatePicker — isDateEnabled predicate', () => {
  test('rejects a typed date the predicate refuses and greys it in the calendar', () => {
    const onChange = vi.fn()
    render(
      <DatePicker id="dp" label="Date" value={null} onChange={onChange}
        isDateEnabled={d => d.getDay() !== 0} />   // no Sundays
    )
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '07/12/2026' } }) // a Sunday
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Sunday, July 12, 2026').disabled).toBe(true)
  })
})
```

- [ ] **Step 6: Run** `rtk npx vitest run packages/ui/src/DatePicker.test.jsx` — expected: 1 FAIL.

- [ ] **Step 7: Implement in DatePicker.jsx.** Doc comment after the `enabledDates` lines (23-24):

```js
 *   isDateEnabled — optional (date) => boolean; rejected days grey out AND fail typed entry
```

Destructuring: add `isDateEnabled = null,` after `enabledDates = null,` (line 128). Replace the `parse` wrapper (lines 139-143):

```js
  const parse = (t) => {
    const d = parseDate(t, format, minDate, maxDate)
    if (!d) return null
    if (allowedIso && !allowedIso.has(isoOf(d))) return null
    if (isDateEnabled && !isDateEnabled(d)) return null
    return d
  }
```

Both `<CalendarPicker … enabledDates={enabledDates}` sites (lines ~314 and ~329): add `isDateEnabled={isDateEnabled}` on the next line.

- [ ] **Step 8: Run** `rtk npx vitest run packages/ui/src/DatePicker.test.jsx packages/ui/src/CalendarPicker.test.jsx` — expected: all PASS.

- [ ] **Step 9: Demo.** In `CalendarPicker.demo.jsx` props table, after the `enabledDates` row (line 23) add:

```js
  { name: 'isDateEnabled', type: '(date: Date) => boolean | null', desc: 'Predicate for rules the caller owns (weekends, a holiday set). Composed with min/max and enabledDates — a day must pass all that are given. Use this instead of hand-building a date list; use enabledDates for lists an API returns (SpotBid flex dates). DatePicker forwards it and rejects typed dates it refuses.' },
```

Playground: the `enabledDates` `<select>` gains a third option and the state becomes a string. Replace `const [flex, setFlex] = useState(false)` with `const [gate, setGate] = useState('none')`. Replace the select:

```jsx
        <label style={labelStyle}>
          date gating
          <select
            value={gate}
            onChange={e => { setGate(e.target.value); setValue(mode === 'single' ? null : { start: null, end: null }) }}
            style={inputStyle}
          >
            <option value="none">none (every day)</option>
            <option value="flex">enabledDates — carrier flex dates (5)</option>
            <option value="weekdays">isDateEnabled — weekdays only</option>
          </select>
        </label>
```

DatePicker usage:

```jsx
          enabledDates={gate === 'flex' ? FLEX_DATES : null}
          isDateEnabled={gate === 'weekdays' ? (d => d.getDay() !== 0 && d.getDay() !== 6) : null}
```

The `{flex && (…Allowed…)}` paragraph becomes `{gate === 'flex' && (…)}`.

- [ ] **Step 10: Tracker.** In `playground/normalization-tracker.md`, append to the END of the CalendarPicker row's last cell (inside the bold block that begins "Back to NORMALIZING 2026-09-02 (D10)"):

```
 **2026-09-07 (S140): `isDateEnabled(date) => boolean` predicate added — composed AND with bounds + `enabledDates`. Rationale: devs writing local rules (weekends, holidays) should not hand-format string lists; the array stays the wire form for API-computed lists. Angular twin OWED the same input.**
```

And to the DatePicker row's last cell: ` **2026-09-07 (S140): forwards `isDateEnabled` to CalendarPicker in both modes and rejects typed dates it refuses. Angular twin OWED.**`

- [ ] **Step 11: Run** `rtk npx vitest run apps/odyssey-one/src/routes/design-system` (demo smoke) — expected: PASS. Then commit:

```bash
git add packages/ui/src/CalendarPicker.jsx packages/ui/src/CalendarPicker.test.jsx packages/ui/src/DatePicker.jsx packages/ui/src/DatePicker.test.jsx apps/odyssey-one/src/routes/design-system/demos/CalendarPicker.demo.jsx playground/normalization-tracker.md
git commit -m "S140: DatePicker/CalendarPicker isDateEnabled predicate beside the enabledDates list (SPB-69)"
```

(Includes the S138 `enabledDates` work still on the tree — same component, same batch.)

---

### Task 2: `flexDates.js` — the seeded allow-list

**Files:**
- Create: `apps/odyssey-one/src/spotboard/flexDates.js`
- Test: `apps/odyssey-one/src/spotboard/flexDates.test.js`

- [ ] **Step 1: Failing tests**

```js
import { describe, it, expect } from 'vitest'
import { allowableDates } from './flexDates.js'

// 10/14/2026 is a Wednesday. Sundays are out for everyone; ODFL's hash also
// drops Saturdays (see NON_OP_SATURDAY in the module).
describe('allowableDates', () => {
  it('returns planned ± N as YYYY-MM-DD, skipping Sundays', () => {
    expect(allowableDates('10/14/2026', 2, 'SAIA')).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16',
    ])
    expect(allowableDates('10/17/2026', 1, 'SAIA')).toEqual(['2026-10-16', '2026-10-17']) // Sun 18th dropped
  })
  it('drops Saturdays for a carrier whose calendar has them off', () => {
    expect(allowableDates('10/17/2026', 1, 'ODFL')).toEqual(['2026-10-16']) // Sat 17th + Sun 18th dropped
  })
  it('drops seeded holidays', () => {
    expect(allowableDates('12/24/2026', 1, 'SAIA')).toEqual(['2026-12-23', '2026-12-24']) // Christmas dropped
  })
  it('returns [] when the anchor is not MM/DD/YYYY or N is not configured', () => {
    expect(allowableDates('', 3, 'SAIA')).toEqual([])
    expect(allowableDates('2026-08-10 08:00', 3, 'SAIA')).toEqual([])
    expect(allowableDates('10/14/2026', null, 'SAIA')).toEqual([])
  })
})
```

- [ ] **Step 2: Run** `rtk npx vitest run apps/odyssey-one/src/spotboard/flexDates.test.js` — expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```js
// flexDates.js — the per-carrier allowable-date list behind a Flexible
// pickup/delivery (SPB-69/73). Two steps: a window of planned ± N days from
// the OCM flex config, then the days the org/carrier operating calendar
// removes. In TMS the calendar walk is APEX code Doug hands to Yuri; here it
// is SEEDED, deterministic per SCAC, never computed from real calendars.
//
// ponytail: window is ± N (both legacy exhibits show both sides). Kathleen's
// 08/20 text says "days permitted BEFORE the requested date" — if she
// confirms before-only, set AFTER_DAYS_FACTOR to 0.
import { strToDate } from '../components/orders/create/fields/DateField.jsx'

const AFTER_DAYS_FACTOR = 1

// Seeded org holidays (US). Real ones come from the TMS org calendar.
const HOLIDAYS = new Set(['2026-09-07', '2026-11-26', '2026-12-25', '2027-01-01'])

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Every carrier is off Sundays; about half are also off Saturdays.
function nonOpSaturday(scac) {
  const h = [...String(scac)].reduce((a, c) => a + c.charCodeAt(0), 0)
  return h % 2 === 1 // ODFL (293) → off Saturdays; SAIA (286) → operates
}

/** @returns {string[]} 'YYYY-MM-DD' ascending; [] when nothing applies */
export function allowableDates(anchorMdy, days, scac) {
  const anchor = strToDate(anchorMdy)
  if (!anchor || !(days > 0)) return []
  const out = []
  for (let off = -days; off <= days * AFTER_DAYS_FACTOR; off++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + off)
    if (d.getDay() === 0) continue
    if (d.getDay() === 6 && nonOpSaturday(scac)) continue
    if (HOLIDAYS.has(iso(d))) continue
    out.push(iso(d))
  }
  return out
}
```

- [ ] **Step 4: Run** the test — expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/spotboard/flexDates.js apps/odyssey-one/src/spotboard/flexDates.test.js
git commit -m "S140: seeded per-carrier allowable flex dates (planned ± N minus operating calendar)"
```

---

### Task 3: Store — stamp allow-lists at Send, keep dates on the bid

**Files:**
- Modify: `apps/odyssey-one/src/spotboard/spotStore.js:81-112`
- Test: `apps/odyssey-one/src/spotboard/spotStore.test.js`

- [ ] **Step 1: Failing tests** — append to `spotStore.test.js` (it already imports `saveDraft`, `sendRFQ`, `submitBid`, `getQuote` and defines `CARRIERS` + a shipment id; reuse its `beforeEach` localStorage reset):

```js
describe('flex dates (SPB-69)', () => {
  const dated = CARRIERS.map((c) => ({ ...c, plannedPickup: '10/14/2026', plannedDelivery: '10/16/2026' }))

  test('sendRFQ stamps per-carrier allowable lists only for flagged directions', () => {
    saveDraft(SHIPMENT_ID, { listId: 'tl-se', listName: 'TL', durationMin: 30, carriers: dated, flexiblePickup: true, flexibleDelivery: false })
    const q = sendRFQ(SHIPMENT_ID, Date.now())
    const saia = q.carriers.find((c) => c.scac === 'SAIA')
    expect(saia.allowablePickupDates).toContain('2026-10-14')
    expect(saia.allowablePickupDates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true)
    expect(saia.allowableDeliveryDates).toBeUndefined()
  })

  test('submitBid keeps the carrier-chosen dates on the bid', () => {
    saveDraft(SHIPMENT_ID, { listId: 'tl-se', listName: 'TL', durationMin: 30, carriers: dated, flexiblePickup: true })
    const now = Date.now()
    sendRFQ(SHIPMENT_ID, now)
    const q = submitBid(SHIPMENT_ID, 'SAIA', { linehaul: 1000, fuel: 0, accessorials: [], total: 1000, currency: 'USD', pickupDate: '10/15/2026', deliveryDate: '10/16/2026' }, now + 1000)
    const saia = q.carriers.find((c) => c.scac === 'SAIA')
    expect(saia.bid.pickupDate).toBe('10/15/2026')
    expect(saia.bid.deliveryDate).toBe('10/16/2026')
  })
})
```

If the file's shipment-id constant has a different name, use that name.

- [ ] **Step 2: Run** `rtk npx vitest run apps/odyssey-one/src/spotboard/spotStore.test.js` — expected: first test FAIL (`allowablePickupDates` undefined); second may already pass (spread) — fine.

- [ ] **Step 3: Implement.** Add imports at the top of `spotStore.js`:

```js
import { getFlexConfig } from './flexConfig.js'
import { allowableDates } from './flexDates.js'
```

Replace the `carriers:` line inside `sendRFQ` (line 93):

```js
    // SPB-69/73: a flagged direction gets a per-carrier allow-list, computed
    // once here at Send (same moment the token is minted) off the planner's
    // planned date. Unflagged directions carry no list — the bid page shows
    // the planned date read-only. N comes from the same seeded OCM config
    // that gated the checkbox in Quote Setup.
    carriers: quote.carriers.map((c) => {
      const flex = getFlexConfig(shipmentId)
      return {
        ...c,
        token: mintToken(shipmentId, c.scac),
        ...(quote.flexiblePickup ? { allowablePickupDates: allowableDates(c.plannedPickup, flex.pickupDays, c.scac) } : {}),
        ...(quote.flexibleDelivery ? { allowableDeliveryDates: allowableDates(c.plannedDelivery, flex.deliveryDays, c.scac) } : {}),
      }
    }),
```

`submitBid` needs no change: `{ ...bid, status, respondedAt }` already keeps `pickupDate`/`deliveryDate`. Add one comment above its `write`: `// bid may carry pickupDate/deliveryDate ("MM/DD/YYYY") when the quote is flexible (SPB-69).`

- [ ] **Step 4: Run** the store tests + `rtk npx vitest run apps/odyssey-one/src/spotboard` — expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/spotboard/spotStore.js apps/odyssey-one/src/spotboard/spotStore.test.js
git commit -m "S140: sendRFQ stamps per-carrier allowable flex dates; bid carries chosen dates"
```

---

### Task 4: CarrierBid — the carrier picks a date

**Files:**
- Modify: `apps/odyssey-one/src/routes/CarrierBid.jsx:5`, `:399-414`, `:639`, `:677-689`, `:906`
- Test: `apps/odyssey-one/src/routes/CarrierBid.test.jsx` (the `Flexible badges` describe, ~line 1028)

- [ ] **Step 1: Failing tests** — replace the two tests in `describe('CarrierBid — Flexible badges (Task 10)')` with:

```jsx
describe('CarrierBid — Flexible dates (SPB-69/73)', () => {
  // Wed 10/14/2026; ODFL's seeded calendar is off Sat+Sun, so ±N lists never
  // include the 17th/18th. The picker is only offered for a flagged direction.
  const DATED = CARRIERS.map((c) => ({ ...c, plannedPickup: '10/14/2026', plannedDelivery: '10/16/2026' }))
  const open = async (flags) => {
    saveDraft(SHIPMENT_ID, { listId: 'tl-se', listName: 'TL Southeast Overflow', durationMin: 120, carriers: DATED, ...flags })
    const quote = sendRFQ(SHIPMENT_ID, Date.now())
    renderAt(`/spot-bid/${tokenFor(quote, SCAC)}`)
    await screen.findByText('Acme Houston Plant')
    return quote
  }

  it('pickup flagged: shows a Flexible badge and a Pickup date picker defaulted to the planned date; Delivery stays text', async () => {
    await open({ flexiblePickup: true })
    const detail = screen.getByRole('button', { name: /shipment detail/i }).closest('.sub-accordion')
    expect(within(detail).getAllByText('Flexible')).toHaveLength(1)
    expect(within(detail).getByLabelText('Pickup').value).toBe('10/14/2026')
    expect(within(detail).queryByLabelText('Delivery')).toBeNull()
  })

  it('a day outside the carrier list is disabled in the calendar', async () => {
    await open({ flexiblePickup: true })
    const detail = screen.getByRole('button', { name: /shipment detail/i }).closest('.sub-accordion')
    fireEvent.focus(within(detail).getByLabelText('Pickup'))
    expect(screen.getByLabelText('Sunday, October 18, 2026').disabled).toBe(true)
  })

  it('submitting sends the chosen dates on the bid, and Submit is blocked while a flagged date is empty', async () => {
    await open({ flexiblePickup: true, flexibleDelivery: true })
    const detail = screen.getByRole('button', { name: /shipment detail/i }).closest('.sub-accordion')
    const pickup = within(detail).getByLabelText('Pickup')
    // Clear the pickup date → Submit disabled even with a valid rate.
    fireEvent.change(screen.getByLabelText(/base rate/i), { target: { value: '1500' } })
    fireEvent.focus(pickup)
    fireEvent.change(pickup, { target: { value: '' } })
    fireEvent.keyDown(pickup, { key: 'Enter' })
    expect(screen.getByRole('button', { name: /^submit/i })).toBeDisabled()
    // Pick Thu 10/15 in the calendar.
    fireEvent.focus(pickup)
    fireEvent.click(screen.getByLabelText('Thursday, October 15, 2026'))
    expect(screen.getByRole('button', { name: /^submit/i })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: /^submit/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirm|yes/i }))
    const c = getQuote(SHIPMENT_ID).carriers.find((x) => x.scac === SCAC)
    expect(c.bid.pickupDate).toBe('10/15/2026')
    expect(c.bid.deliveryDate).toBe('10/16/2026')
  })
})
```

Adapt the base-rate field query and the confirm-modal button name to what the existing submit test in this file uses (search the file for `confirmAction` / an existing "submits a bid" test and copy its selectors verbatim).

- [ ] **Step 2: Run** `rtk npx vitest run apps/odyssey-one/src/routes/CarrierBid.test.jsx` — expected: 3 FAIL.

- [ ] **Step 3: Implement.** Imports (line 5): add `DatePicker` to the `@odyssey/ui` list. Add after line 6:

```js
import { strToDate, dateToStr } from '../components/orders/create/fields/DateField.jsx'
```

After `const order = …` (line 399) add:

```js
  // SPB-69/73: a flagged direction with a non-empty allow-list gets a picker;
  // the picker is bounded to the list the store stamped at Send. Defaults to
  // the planner's planned date when that date is itself allowable. Dates are
  // date-only (Kathleen written answer #5); "MM/DD/YYYY" like the planner side.
  const pickupChoices = quote?.flexiblePickup ? carrier?.allowablePickupDates ?? [] : []
  const deliveryChoices = quote?.flexibleDelivery ? carrier?.allowableDeliveryDates ?? [] : []
  const pickupFlex = pickupChoices.length > 0
  const deliveryFlex = deliveryChoices.length > 0
  const isoOfMdy = (s) => { const d = strToDate(s); return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '' }
  const defaultChoice = (planned, choices) => (choices.includes(isoOfMdy(planned)) ? planned : '')
  const [pickupDate, setPickupDate] = useState(() => priorBid?.pickupDate ?? defaultChoice(carrier?.plannedPickup, pickupChoices))
  const [deliveryDate, setDeliveryDate] = useState(() => priorBid?.deliveryDate ?? defaultChoice(carrier?.plannedDelivery, deliveryChoices))
  const datesMissing = (pickupFlex && !pickupDate) || (deliveryFlex && !deliveryDate)
```

`priorBid` is declared around line 405; place this block AFTER it (move it below `priorBid` if needed so the initializers can read it).

Replace the two date groups (lines 682-689):

```jsx
              <div className="carrier-bid-card__date-group">
                {pickupFlex ? (
                  <DatePicker id="cb-pickup" label="Pickup" value={strToDate(pickupDate)} onChange={(d) => setPickupDate(dateToStr(d))} enabledDates={pickupChoices} />
                ) : (
                  <TitleSubtitle title={order.earliestPickup} subtitle="Pickup" />
                )}
                {quote.flexiblePickup && <Badge variant="blue">Flexible</Badge>}
              </div>
              <div className="carrier-bid-card__date-group">
                {deliveryFlex ? (
                  <DatePicker id="cb-delivery" label="Delivery" value={strToDate(deliveryDate)} onChange={(d) => setDeliveryDate(dateToStr(d))} enabledDates={deliveryChoices} />
                ) : (
                  <TitleSubtitle title={order.earliestDelivery} subtitle="Delivery" />
                )}
                {quote.flexibleDelivery && <Badge variant="blue">Flexible</Badge>}
              </div>
```

Bid payload (line 639): add `pickupDate: pickupFlex ? pickupDate : undefined, deliveryDate: deliveryFlex ? deliveryDate : undefined,` inside the `bid` object. Submit button (line 906): `disabled={linehaulInvalid || datesMissing}`.

If the flex `DatePicker` collides visually with `TitleSubtitle` sizing inside `carrier-bid-card__grid--pairs`, add to `carrierBid.css`: `.carrier-bid-card__date-group .date-picker { min-width: 0; width: 100%; }`. Nothing else.

- [ ] **Step 4: Run** the CarrierBid tests — expected: all PASS (whole file, not just the new describe).

- [ ] **Step 5: Commit**

```bash
git add apps/odyssey-one/src/routes/CarrierBid.jsx apps/odyssey-one/src/routes/CarrierBid.test.jsx apps/odyssey-one/src/routes/carrierBid.css
git commit -m "S140: carrier picks pickup/delivery from its allowable flex dates; Submit waits for them (SPB-69/73)"
```

---

### Task 5: Planner sees the chosen dates — LiveBids + Award

**Files:**
- Modify: `apps/odyssey-one/src/spotboard/LiveBids.jsx:31-42`, `:167-185`, `:373`
- Modify: `apps/odyssey-one/src/spotboard/award.js:45-46`
- Test: `apps/odyssey-one/src/spotboard/LiveBids.test.jsx`, `apps/odyssey-one/src/spotboard/award.test.js`

- [ ] **Step 1: Failing LiveBids test** — append (reuse the file's `carrier`, `bidOf`, `CLOSED_QUOTE`, and however the other tests render `<LiveBids quote=… />`):

```jsx
describe('flex dates (SPB-69)', () => {
  test('a flexible quote shows Pickup/Delivery columns with the carrier-chosen dates', () => {
    const quote = {
      ...CLOSED_QUOTE,
      flexiblePickup: true,
      carriers: [carrier('ODFL', 'Old Dominion', { ...bidOf({ linehaul: 1000, fuel: 0, total: 1000, submittedBy: 'a@b' }), pickupDate: '10/15/2026' })],
    }
    render(<LiveBids quote={quote} />)
    expect(screen.getByRole('columnheader', { name: 'Pickup' })).toBeInTheDocument()
    expect(screen.getByText('10/15/2026')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Delivery' })).toBeNull()
  })

  test('a non-flexible quote has no date columns', () => {
    render(<LiveBids quote={CLOSED_QUOTE} />)
    expect(screen.queryByRole('columnheader', { name: 'Pickup' })).toBeNull()
  })
})
```

If `GroupTable` renders headers as `th` without the `columnheader` role, query with `screen.getByText('Pickup')` scoped to the table head instead.

- [ ] **Step 2: Run** `rtk npx vitest run apps/odyssey-one/src/spotboard/LiveBids.test.jsx` — expected: first FAIL.

- [ ] **Step 3: Implement.** In `LiveBids.jsx`, keep `COLUMNS` as is and derive per quote. Above the `groups` map (line 167):

```js
  // SPB-69: a flexible direction adds the carrier-chosen date as a column,
  // only for that direction — a non-flex quote keeps the six-column shape.
  const columns = [
    ...COLUMNS.slice(0, 4),
    ...(quote.flexiblePickup ? [{ key: 'pickupDate', label: 'Pickup' }] : []),
    ...(quote.flexibleDelivery ? [{ key: 'deliveryDate', label: 'Delivery' }] : []),
    ...COLUMNS.slice(4),
  ]
```

In `values` (after `response:`):

```js
        pickupDate: bid?.pickupDate ?? '—',
        deliveryDate: bid?.deliveryDate ?? '—',
```

Line 373: `columns={columns}`.

- [ ] **Step 4: Run** — expected: PASS.

- [ ] **Step 5: Failing award test** — append to `award.test.js`:

```js
  it('carrier-chosen flex dates win over the planned dates', () => {
    const c = { ...winningCarrier, bid: { ...winningCarrier.bid, pickupDate: '01/09/2026', deliveryDate: '01/10/2026' } }
    const option = buildSpotRateOption(c, quote, [], markup)
    expect(option.pickupDateTime).toBe('01/09/2026')
    expect(option.deliveryDateTime).toBe('01/10/2026')
  })
```

- [ ] **Step 6: Run** `rtk npx vitest run apps/odyssey-one/src/spotboard/award.test.js` — expected: FAIL.

- [ ] **Step 7: Implement** in `award.js` (lines 45-46):

```js
    // SPB-69: on a flexible quote the carrier's chosen date is the date that
    // goes to Tender; the planner's planned date is the fallback.
    pickupDateTime: winningCarrier.bid?.pickupDate || winningCarrier.plannedPickup || '--',
    deliveryDateTime: winningCarrier.bid?.deliveryDate || winningCarrier.plannedDelivery || '--',
```

- [ ] **Step 8: Run** `rtk npx vitest run apps/odyssey-one/src/spotboard apps/odyssey-one/src/routes` — expected: all PASS. Commit:

```bash
git add apps/odyssey-one/src/spotboard/LiveBids.jsx apps/odyssey-one/src/spotboard/LiveBids.test.jsx apps/odyssey-one/src/spotboard/award.js apps/odyssey-one/src/spotboard/award.test.js
git commit -m "S140: Live Bids shows carrier-chosen flex dates; Award carries them to Tender"
```

---

### Task 6: Decision log

**Files:**
- Modify: `vault/10-domains/spotboard/decisions/decision-log.md` (append)
- Modify: `vault/10-domains/spotboard/_moc.md:81` (`SPB-80` → `SPB-81` in the Decision Log line)

- [ ] **Step 1: Append**

```markdown

### SPB-81 — Flex dates built end to end on seeded calendars: Send stamps per-carrier allow-lists, the carrier picks inside them, Live Bids and Award carry the pick; window assumed ± N pending Kathleen
**Decided:** 2026-09-07, build decision (Manuela + Claude) on [[#spb-69|SPB-69]] / [[#spb-73|SPB-73]].
**Previous state:** SPB-69's delta (c) open — the carrier saw a `Flexible` badge and no date capture; CalendarPicker/DatePicker had gained `enabledDates` (D10, 2026-09-02) with no consumer.
**Decision:** (1) `sendRFQ` computes `allowablePickupDates` / `allowableDeliveryDates` per carrier for each FLAGGED direction only: planned date ± N (N from the seeded OCM `flexConfig`) minus a seeded operating calendar (Sundays for all, Saturdays for about half the SCACs, four US holidays). The APEX algorithm is Yuri's; ours is a stand-in. (2) The bid page renders a `DatePicker` bounded by that list for a flagged direction, defaulted to the planned date when allowable; Submit waits for every flagged date. (3) `bid.pickupDate` / `bid.deliveryDate` (`MM/DD/YYYY`, date-only per Kathleen #5) surface as Live Bids columns only on flexible quotes and replace the planned dates on the Award → Tender option. (4) DSM: `isDateEnabled(date)` predicate added beside `enabledDates` so local rules never hand-format lists; the array remains the API wire form.
**Assumption flagged:** window is **± N around the planned date** — both legacy exhibits (`image (3)`, Doug's Teams calendar) show Earliest before and Latest after. Kathleen's 08/20 sentence reads *"number of days permitted before the requested pickup/delivery date."* One constant (`AFTER_DAYS_FACTOR`, `flexDates.js`) flips to before-only. **Ask Kathleen.**
**Source:** SPB-69, SPB-73, PRD 08/31 Feature 1; user session 2026-09-07.
**Affects:** CE-1 carrier email still prints one pickup date — on a flexible quote it should say the carrier chooses (next email pass). Angular twins owe `isDateEnabled`.
```

- [ ] **Step 2: Commit**

```bash
git add vault/10-domains/spotboard/decisions/decision-log.md vault/10-domains/spotboard/_moc.md
git commit -m "S140: SPB-81 flex dates build decision + the ±N assumption for Kathleen"
```

---

## Self-review

- **Coverage:** predicate (T1), lists at Send (T2/T3), carrier picks + gate + bid dates (T4), planner sees + award (T5), traceability + open question (T6). Email change deliberately deferred (SPB-81 "Affects").
- **Names:** `allowableDates`, `allowablePickupDates`/`allowableDeliveryDates`, `bid.pickupDate`/`bid.deliveryDate`, `isDateEnabled`, `AFTER_DAYS_FACTOR` used consistently across tasks.
- **Ceilings:** seeded calendar is a stand-in (comment in `flexDates.js`); the CarrierBid DatePicker sizing tweak is conditional and one CSS rule.
