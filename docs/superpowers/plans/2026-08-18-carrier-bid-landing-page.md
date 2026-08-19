# Carrier Bid landing page — rebuild (2026-08-18)

Target: `apps/odyssey-one/src/routes/CarrierBid.jsx` + `carrierBid.css` — the external `/spot-bid/:token` page. This is the surface [[SPB-43]] lists as a **core V1 deliverable** ("the carrier quote entry"), so it outranks further `/spotbid` board polish.

User directive, 2026-08-18 (verbatim intent preserved per bullet below).

---

## 1. Chrome — white Navbar

Replace the hand-rolled `<header>` (logo + `<h1>`) with the package `Navbar`:

| Slot | Content |
|---|---|
| `lead` | Odyssey logo only — **no hamburger** |
| `search` | `GlobalSearch mode="title" title="Carrier Portal"` |
| `trail` | `TrailNav` profile: `name` = carrier name, **no notification bell**, **no customer button**, dropdown reading *"Soon, your operations in ONE place"* |

- Navbar background: **white** (today hardcoded dark via `--navbar-bg: var(--bg-inverse)`).
- **Not sticky** — free: package `Navbar` is `position: relative` already, nothing to add.

### Component gaps (see §7 — DS governance)
| Need | Today | Verdict |
|---|---|---|
| White navbar | `background: var(--navbar-bg)` hardcoded, no `variant`, no `className` passthrough | **build** |
| No hamburger | `LeadNav` renders `<Menu>` unconditionally | **build** a toggle, or compose a custom `lead` node (no DS change) |
| Title in navbar | `GlobalSearch mode="title"` **exists** | reuse — but its `color: var(--white)` is invisible on white → needs a tone |
| No customer button | `TrailNav showCustomers={false}` **exists** | reuse as-is |
| No notification | `showNotification` gates only the *badge*; the bell always renders | **build** a bell toggle |
| Profile dropdown copy | TrailNav renders no dropdown at all — consumer builds the panel, anchored via `Navbar`'s `trailRef` | compose locally (the app's own Navbar already does this) |

---

## 2. Bid timer → sticky SummaryStrip

The `Countdown` `Badge` is too small for the page's most important number. Replace with a **`SummaryStrip` instance, sticky directly below the Navbar, centered**.

Cells: `Bid closes in:` · `9` · `7` · `:` · `1` · `5` — one digit per cell, so the time reads as a row of large values. **"Bid closes in:" goes in a cell's `label` slot**, so it renders at the smaller uppercase label size while the digits render at value size.

- Centered: **free** — `.summary-strip` is always `justify-content: center`.
- Sticky: **free** — `className` is forwarded; a consumer rule does it.
- **Gap:** `SummaryStrip` requires a `label` on every cell (it is the React key) and renders a literal `--` for an empty value. **Label-only and value-only cells must be built.**
- Live tick: reuse `Countdown`'s interval logic; render digits into cells rather than a badge. Keep the sub-15-minute urgent treatment.

---

## 3. Background + scroll + section entrance (the "marketing effect")

Reuse the Home page's treatment. It is **not a filter** — it is three layers (`Home.css:25-101`):

1. `.home-background` base fill `--deep-sea-neutral-50`, `isolation: isolate` (load-bearing — scopes the blend).
2. `.home-background__photo` — hero `.webp` from `heroImages.js`, `background-size: cover`, bottom fade `mask-image`.
3. `.home-background::after` — `--deep-sea-neutral-900` at `mix-blend-mode: color`, masked to a band.

**All of it is Home-local CSS.** Lift the `.home-background*` blocks and the `.home-widget-cell--enter` keyframes into a shared stylesheet (e.g. `src/styles/hero.css`) with neutral class names, and have both Home and this page consume it. Do **not** duplicate. Tokens it uses are already global.

**Scroll — deliberate deviation from Home.** Home's background scrolls *with* the content (`position: absolute` inside `.home-content`). Here the background must **stay put while nav + sections scroll over it** → fixed background layer, scrolling content above it.

**Section entrance — deterministic, top-first.** Reuse `home-widget-enter` (600ms `cubic-bezier(0.22,1,0.36,1)`, `translateY(80px) scale(0.98)` → rest, delay via `--enter-delay`). Home's order is **random today** (Fisher-Yates shuffle + `Math.random()` jitter, keyed off declaration order). Here: `delay = index * 90ms`, no shuffle, no jitter, ordered top → bottom. Keep the existing `prefers-reduced-motion` fallback (200ms fade, stagger preserved).

---

## 4. Shipment Details — fields

- **Weight** — add. Available at `shipment.stopsData.summary.grossWeight` (`StopsSummaryVM`); fallbacks `order.totalWeight` / `order.grossWeight`.
- **Distance** — already rendered from `shipment.stopsData.summary.distance`. Per the ruling it is **derived from origin/destination and is never empty**, so it must never render `--`; if the summary value is missing, derive it rather than blanking.

---

## 5. Bid Entry — restructure

One `SubAccordion` containing two labelled sections:

**Base Charge**
- `Linehaul` — `MeasureField`, USD-locked, `decimals={2}` (as today).
- `Fuel` — label reads **"Fuel (Estimated)"**, **`disabled`** (not `readOnly` — matches the ruling already applied on the SpotBid detail page). Value from `shipment.costData.planned.summary.fuel`.

**Additional Charges**
Replace the current one-`FormField`-per-special-service list with the **same structure as the Add/Edit Quote modal** (`components/detail/QuoteModal.jsx`, styles `components.css` ~3830-3878):

```
.quote-charges           grid: 84px | minmax(0,1fr) | 164px | 24px
  __head                 Code · Description · Amount · (remove)
  __row--editable
    ComboBox variant="select"  loadOptions={(q) => getLookupOptions('charge-code', q)}
    FormField  disabled        ← description auto-derived from the picked code
    MeasureField decimals={6}  ← amount, currency-locked
    button.quote-charges__remove  <Trash2 size={20}/>
  Button variant="link" icon={<Plus/>}  "Add Row"
```
Row shape `{ code, description, amount, currency }`; codes come from `CHARGE_CODES` in `data/master-data.js:207` via `lookupService`.

**Prefill — RULED 2026-08-18 (user): map `order.specialServices`.** QuoteModal prefills from `carrierData.rateDetails.additionalCharges` (a routing option's stored quote), which does not exist on the carrier side. Instead, seed the rows from `order.specialServices` — the same source the page's loose accessorial fields use today — matched to `CHARGE_CODES` (`data/master-data.js:207`) for `code` + `description`, amount blank for the carrier to fill. A special service with no matching charge code still gets a row (description carried, code blank) rather than being silently dropped.

---

## 6. Price Summary — third SubAccordion

Model on QuoteModal's local `SummaryCard` (`fmtDollar` from `utils/money`):
- **Base Charge summary** — Linehaul + Fuel (Estimated).
- **Additional Charges summary** — one row per coded charge (`[code, amount]`).
- **Grand Total** — base + fuel + charge total, visually distinct.

No markup line — `QMU` is Odyssey-side and applied after award; **carriers never see it** ([[SPB-15]]).

---

## 7. Design-system governance — DECISION REQUIRED BEFORE IMPLEMENTATION

This spec modifies **four normalized `@odyssey/ui` components** (`Navbar`, `LeadNav`, `TrailNav`, `SummaryStrip`) plus a tone fix on `GlobalSearch`'s title mode. `Alert` is already sitting modified from 2026-08-17.

Per standing rules that means each goes back to **NORMALIZING** in both DSMs with a version bump, the Angular twins need the same capability, and Figma should have led. Lanes offered to the user:

> ✅ **RULED 2026-08-18 (user): Figma first, then code.** §3–§6 shipped app-local. §1's Figma work is now **DONE** (below); §2 (SummaryStrip cell modes) is still outstanding.

### ✅ Figma DELIVERED 2026-08-18 — `Navbar` is now a variant set

**The external variant is NOT a light twin of the dark navbar.** User ruling: *"is not a parallel white variant of dark, is a variant that is made for external odyssey landing pages."*

| Node | State |
|---|---|
| `Navbar` set **5152:3908** | property **`Context = Internal \| External`** (default Internal) |
| `Context=Internal` **1661:206** | the original dark app chrome, node id preserved so Code Connect still resolves |
| `Context=External` **5152:3904** | white surface bound to semantic `Background/primary`; OdysseyLogo swapped to its **Dark** variant; **no hamburger** (`Show menu=false`), **no notification bell** (`Show bell=false`), **no customers/handshake** (`Show customers=false`), **no left divider** (stroke removed); GlobalSearch kept in **`State=Title`** reading **"Carrier Portal"**, title bound to `Text/secondary`; both **User Details** captions bound to `Text/secondary-soft`; left padding 24 |
| `LeadNav` **639:564** | new boolean **`Show menu`** → hamburger Container |
| `TrailNav` **1565:648** | new booleans **`Show bell`** → Notification Container, **`Show customers`** → Customers Container (the latter closes drift — code had `showCustomers`, Figma never did) |

**Corrections to the original gap analysis** (found by inspection, 2026-08-18):
- `GlobalSearch` **already had** `State=Title` — nothing to build.
- `TrailNav`'s existing `Show notification` gates only the **badge** in Figma *and* in code — they already agreed; the missing thing was a bell toggle, now added.
- The `2. Color Semantic` collection has two modes but **identical values in both** — there is no light/dark theming mechanism to lean on, which is why appearance is a variant rather than a mode swap.

### ✅ §2 DELIVERED 2026-08-18 — no Figma change was needed after all

The bid timer ships as a real `SummaryStrip` instance: first cell carries **"Bid closes in:"** in the *label* slot (no value), then one cell per character of the remaining time (`9` `7` `:` `1` `5`). Sticky via a page-scoped `position: sticky; top: 0` rule (`SummaryStrip` forwards `className`), centered by the component's own `justify-content: center`. The navbar is non-sticky and scrolls away above it.

**Figma needed nothing** — its `SummaryStrip` cells are plain Label+Value text pairs with no component properties, so a blank label is already achievable on an instance. Only the React component needed to tolerate it: cells are now keyed by index instead of `label`, an omitted `label` renders no `<dt>`, and an omitted `value` renders no `<dd>`. The `'--'` placeholder is preserved for callers that pass `value` explicitly-but-empty (`'value' in item`), so StopsTab / ShipmentDetailsModal / CostAllocationTab / LiveBids are byte-identical.

Tick logic was **extracted, not duplicated**: `useCountdown(closeAt, onExpire)` + `formatMMSS` + `URGENT_MS` are now named exports of `spotboard/Countdown.jsx`, and `Countdown` itself just calls the hook. Over 99 minutes the strip simply grows a cell (`1 2 0 : 0 0`) rather than truncating or switching format.

### Still outstanding in Figma

| Component | Variant / property needed |
|---|---|
| `SummaryStrip` **4254:904** (page *Components-Molecules*) | **label-only** and **value-only** cell modes. Today it is a set with variant `Cells = 4\|5\|6\|7\|8`, and in code every cell needs a `label` (it is the React key) while an empty value renders a literal `--`. The bid timer needs one label cell (`Bid closes in:`) plus per-digit value cells |

`GlobalSearch`'s on-light title tone is **no longer needed** — the external navbar drops GlobalSearch entirely.

Sticky and centered need nothing from Figma: `Navbar` is already non-sticky, `.summary-strip` is already centered, and `className` is forwarded for the sticky rule.

---

## 8. Open / flagged

- Additional-charges **prefill source** on the carrier side (§5) — `specialServices` mapping is inference, not a ruling.
- The timer's digit-per-cell treatment assumes `MM:SS`; hours would need a sixth digit cell.
- Two carrier bid surfaces still diverge on charge model (this page vs `SpotBidDetailRoute`) — build-delta #5 from the 2026-08-11 call. This spec brings THIS page to the QuoteModal model; `SpotBidDetailRoute`'s fixed five-name list stays out of sync until ruled.
- Hero photo cross-fade is not gated on `prefers-reduced-motion` (pre-existing gap inherited with the lift).
