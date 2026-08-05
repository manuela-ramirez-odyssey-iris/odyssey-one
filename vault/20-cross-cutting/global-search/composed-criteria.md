---
title: GlobalSearch — Composed Criteria (working spec)
domain: cross-cutting
type: spec
status: in-progress
date: 2026-06-04
tags: [global-search, search, composed-criteria, chips, entity-scope, api-design]
---

# GlobalSearch — Composed Criteria (working spec)

Living discovery log for **multi-chip ("composed") search behavior**. When a user
commits more than one chip, what does the result set mean? This doc captures the
rules as we discover them, case by case, building toward a single overview that
feeds **API design + documentation**.

> **Why a separate doc:** the behavior has many corner cases that need
> experimentation, not a one-shot statement. We log cases here, extract the
> general rule, and only promote firm rules to [[decisions/decision-log]] (GS-NN)
> + the [[global-search|canon]] once they stabilize. The goal is to express
> behavior as **taxonomy-driven rules** (attribute → entity scope), NOT as
> per-pair enumeration of the ~40 attributes.

Companion to the [[global-search|canon]] (mechanics/UI) and the
[[data/attribute-schema|attribute schema]]. Implementation seam:
`apps/odyssey-one/src/search/shipments/adapter.js` (`searchShipments`).

---

## Core model (working)

Four concepts drive everything below.

### 0. The domain is the implicit search context

Every search inherits the **current domain as its universe**. In Shipments, you
are always searching *shipment-related* data — committing `Customer ID` first does
**not** mean "find a customer," it means "shipment data scoped to this customer."
In Tracking, the same chip means tracking data for that customer. The domain is
the frame; chips refine within it.

Counter-pressure from business (Jana): users sometimes want to drill to a
*different* entity than the domain's headline noun — *"orders delivered in a date
range for two customers,"* *"customers that have hazmat products in an order."*
That's reconciled by concept #1: the **leading chip picks the entity granularity**
(order / shipment / customer) *within* the domain context. Domain = universe;
leading chip = which grain of it you get back.

### 1. The leading chip sets the result ENTITY

> **The first committed chip (`chips[0]`) determines the *entity* the results
> represent — the "noun" you're searching for. Every other chip is a filter on
> that entity.**

- Lead with an **order-scoped** attribute (e.g. Order #) → results are **orders**.
  A shipment with 3 matching orders produces **3 rows**. `total` = matching orders.
- Lead with anything else → results are **shipments**. **1 row per shipment**.
  `total` = matching shipments.

The leading chip also drives the **bold field** in `MatchRow`, the **avatar icon**,
and which **status badge** is shown (see Conventions).

### 2. Every attribute has an entity SCOPE

Scope = the entity level an attribute lives at. It decides both how the attribute
filters AND what entity it produces when it leads.

| Scope | Meaning | Attributes (draft — needs validation vs CSV/Jana) |
|---|---|---|
| **order** | belongs to a single order | Order # |
| **shipment** | belongs to the shipment | Buy/Sell Shipment #, Pro#, Origin, Destination, Pickup/Delivery Date, Mode, Equipment Code, Equipment #, Seal, SCAC, Tender Status, Shipment Status, Gross Weight, AP Freight Cost, Load #, Load Count |
| **customer** | a party on the shipment | Customer ID, Customer Name, Consignor, Consignee |

**Cross-scope filtering rule** (generalizes — no per-pair logic):
- A shipment **qualifies** if *every* chip matches it. For an order-scoped chip,
  "matches" = at least one of the shipment's orders contains the value.
- When result entity = **order**, after shipment qualification we **explode** each
  shipment into its orders and keep only the orders that satisfy the order-scoped
  chips. Shipment-scoped + customer-scoped chips never filter individual orders —
  they only decide which shipments survive.

> Code marker: `ORDER_KEYS` / `CUSTOMER_KEYS` sets in the adapter. Today
> `order` scope = `{orders}` only. The full scope map is the open taxonomy
> (see Open Questions Q1).

### 3. All combinations are valid; progression only *suggests*

Any chip can combine with any other — **progression order never restricts what's
valid**. `Mode: LTL` then `Buy Shipment #: 25` is fine even though Mode sits far
below shipment-id in the progression. Progression order does exactly one thing:
it orders the **empty-input suggestions** (see next section). Typing always
value-matches across *all* attributes regardless of group.

---

## Empty-suggestion progression

What the suggestion list shows **when the input is empty** (it's a guide, never a
constraint):

- **No chips committed** → entry points: the first `INITIAL_COUNT` (5) attributes
  at the top of the progression. Title: *"Suggested Filters"*.
- **≥1 chip committed** → the **next progression GROUP** — don't repeat the entry
  set (repeating it reads as "you must reuse these"). The next group = the group
  *after the furthest group any committed chip belongs to* (drill forward). The
  suggestion list title becomes that group's drill-stage **label**
  (e.g. *"Who it belongs to"*, *"Where it goes"*).
- **On / past the last group** → stay on the last group, minus committed.
- Fully-committed groups are skipped so the panel is never empty.

The progression groups, in order, with their drill-stage labels:

| # | Group | Label (suggestion title) |
|---|---|---|
| 0 | Shipment Identifiers | Find the shipment |
| 1 | Customers & Parties | Who it belongs to |
| 2 | Route & Geography | Where it goes |
| 3 | Schedule & Appointments | When it moves |
| 4 | Transport & Equipment | How it moves |
| 5 | Carrier & Tender Status | Operational status |
| 6 | Cargo & Handling | Cargo details |
| 7 | Rates & Costs | Financial details |
| 8 | Load Details | Load logistics |

Example: commit `Customer ID: Erco` (group 1) → empty suggestions show group 2
*"Where it goes"* = Origin / Destination. Reads as *"shipments for Erco — now,
where do they go?"*

> Code: `nextProgressionGroup(chips)` + `getInitial(chips)` in the adapter.
> The hook (`useGlobalSearch`) just passes committed chips to `getInitial`; it
> knows nothing about group order (domain-agnostic). Anchoring = **furthest group
> reached** (not last-committed-chip) so out-of-order commits never backslide —
> noted as a sub-decision; revisit if last-chip anchoring feels better in use.

---

## Conventions driven by the leading chip

| Leading scope | Bold field (`matchId`) | Avatar icon | Badge | Extra meta cell |
|---|---|---|---|---|
| order | the matching order # | `package` | **tender status** (Accepted/Sent/Declined/Cancelled) | `Shipment #:` (the parent buy shipment) |
| customer | the matched party value | `handshake` | shipment status (Done/Review) | — |
| shipment (default) | the leading attr's value | `container` | shipment status (Done/Review) | — |

Rationale for tender-status on order searches: showing *shipment* status in an
*order* search is confusing — orders are pre-shipment-decision entities, so the
tender outcome is the relevant signal. (S-? refinement, 2026-06-04.)

---

## Cases log

### Case 1 — Order # (empty) + Buy Shipment # = X  →  the shipment's orders
**Date:** 2026-06-04 · **Status:** ✅ implemented

- **Input:** commit `Order #` chip empty, type a valid shipment number, commit
  `Buy Shipment #` chip.
- **Intent (user words):** *"Order numbers that belong or match with X buy
  shipment #"* — i.e. all 3 orders of that shipment.
- **Before:** 1 shipment row, showing only the first order. ❌
- **After:** N order rows (one per order on shipment X), bold = order #, meta
  shows `Shipment #: X`, badge = tender status. ✅
- **Rule extracted:** leading order-scoped chip → result entity = order (the
  Core Model above). The empty order chip contributes no per-order narrowing
  (`includes('')` matches all), so all orders of the qualifying shipment surface.

### Case 2 — Empty-input suggestions don't repeat the entry set; they drill forward
**Date:** 2026-06-04 · **Status:** ✅ implemented

- **Problem:** after committing the first chip, the empty-input suggestion list
  re-showed the *same* top-of-progression attributes — reads as "you must reuse
  these filters," even though reusing them would still be valid.
- **Decision:** empty-input suggestions advance to the **next progression group**
  (titled by the group's drill-stage label); on the last group, stay there;
  suggestions only, never enforced; typing still matches any attribute. See
  *Empty-suggestion progression* above.
- **Realizations captured (Core model #0/#3):** the domain is the implicit search
  context; the leading chip picks entity grain within it; all chip combinations
  are valid regardless of progression order — progression only orders suggestions.

### Case 3 — A bare code, type unknown  →  rows say WHAT the code is
**Date:** 2026-07-31 (S104) · **Status:** ✅ implemented · **Decision:** [[decisions/decision-log|GS-15]]

- **Input:** no chips. Paste a code into the bar — `0000000091000`.
- **Intent (user words):** *"we type 00000001234, quick results should not assume
  that is a shipment, it needs to match to the closest value types"* — and the
  row should read `order #00000001233`, not the bare code.
- **Before:** the row rendered `43708610` — the **shipment** number, because the
  no-chip path hardcoded `primaryKey = 'buyShipment'`. Ranking scored against
  `buyShipment` too, so a query that matched an order number was ordered by a
  field it never touched. Worse: a pasted **Pro/BOL number returned 0 results**
  (`pro` was not in `FREE_TEXT_KEYS`). ❌
- **After:** `Order #0000000091000`. Each row resolves its own best-matching
  attribute (3/2/1 exact/prefix/contains, progression order breaking ties) and
  labels itself with it. Measured: typing a Pro number now returns
  `Pro#/Booking #442376` **and** `Seal Number S442376`, exact first — one code,
  two attribute types, correctly ordered. ✅
- **Rule extracted:** with no chips, the *result rows* answer "what is this?" the
  same way the *suggestion chips* already did. The row label is the attribute
  identity; the bold value alone is never enough when the user doesn't know what
  they pasted.
- **Grain, deliberately unchanged:** rows stay one-per-shipment. An order-number
  match labels the row `Order #…` but does not explode into order rows —
  explosion stays chip-driven (Case 1) so the glimpse `total` keeps equalling the
  table's (S79c decision 7).

### Case 4 — An untouched bar offers nothing
**Date:** 2026-07-31 (S104) · **Status:** ✅ implemented · **Decision:** [[decisions/decision-log|GS-14]]
**Supersedes:** the *entry-point* half of Case 2 (the drill-forward half stands).

- **Input:** focus the bar. Type nothing. No chips.
- **Intent (user words):** *"suggested filters shows is a bit confusing because
  users can click without understanding what to expect."*
- **Before:** 5 entry-point attribute chips under "Suggested Filters". ❌
- **After:** no panel. Suggestions are reactive — they appear when you type, or
  when a committed chip earns the next progression group. ✅
- **Rule extracted:** a suggestion needs a footing in user intent. Typing is
  intent; a committed chip is intent; an empty focused field is not.

### Case 5 — The typed-suggestion header names its own job
**Date:** 2026-07-31 (S104) · **Status:** ✅ implemented

- **Before:** typing showed the header "Suggested Filters" — the same title the
  (now-removed) entry-point list used.
- **After:** **"What is it?"** — because at that moment the panel is not offering
  filters, it is telling the user what the thing they typed could be. Pairs
  directly with Case 3, which answers the same question in the results rows.

### Case 6 — "Show all results" preserves the preview's order
**Date:** 2026-07-31 (S104) · **Status:** ✅ implemented · **Decision:** [[decisions/decision-log|GS-16]]

- **Input:** any search, then click **Show all N results**.
- **Intent (user words):** *"if i click on show all, data shown in the table is
  in the same order as in the results preview?"*
- **Before:** no. The preview ranked by match quality; the table applied no sort
  at all unless a column header had been clicked, so rows came back in generator
  order and the exact match landed wherever it fell. ❌
- **After:** the grid defaults to the preview's relevance order when criteria
  arrive from search. An explicit column sort still wins. ✅
- **Rule extracted:** the preview is a promise about what the table will show —
  membership *and* ordering. Breaking either makes the preview a separate
  surface rather than a window onto the same result.
- **Testing note:** the guard uses a *discriminating* query derived from the
  fixture — one whose exact match is not already first in natural order. The
  first version of this test passed with the sort disabled (the fixture happened
  to agree), which is worth remembering: a passing order-assertion proves
  nothing unless the two orders provably differ.

### Case 7 — The tabs are post-filters (landing rule SUPERSEDED by Case 8)
**Date:** 2026-07-31 (S104) · **Status:** ⚠️ partly superseded · **Decision:** [[decisions/decision-log|GS-17]]

> The **post-filter model below still stands** (tabs partition one result set;
> the total stays global). Only the *which tab* rule was replaced — see
> **Case 8**, where user testing showed "fullest panel" landed on rows the user
> could see nothing of.

- **Observed:** on `FXFE` the button read **Show all 123 results**, but the table
  showed **90** — the other **33** were in the Exceptions tab. Both numbers were
  correct; the pairing wasn't.
- **Intent (user words):** *"123 is ALL results if some of them are in monitoring
  and others in exceptions … you should take as those tabs as post filters …
  always open the tab where it shows most of the previewed results."*
- **Decision:** keep the total global (it is the honest answer to "how many
  matched"), and **move the user to the panel holding the most matches** on each
  newly committed search. `FXFE` → lands on Monitoring (90).
- **Rule extracted:** the panel tabs partition **one** result set. A search
  result therefore belongs to no single tab, and the tab the user happened to be
  on before searching carries no information about where their answer is.
- **Scope note:** the jump fires once per committed criteria — a manual tab pick
  afterwards stands, because that IS information about where they want to be.
- **Interpretation flagged:** implemented against the full per-panel counts, not
  the 15 preview rows (a relevance-capped sample shouldn't choose the tab). ← the
  flag that turned out to matter; see Case 8.

### Case 8 — The landing tab follows what the eyes already saw
**Date:** 2026-07-31 (S104) · **Status:** ✅ implemented · **Decision:** [[decisions/decision-log|GS-18]]
**Supersedes:** the landing rule of Case 7 (the post-filter model survives).

- **Observed (user testing):** typing `12` previewed 5 Buy Shipment # rows, 5
  Equipment # rows and 2 Load # rows — and the jump landed on Monitoring, whose
  top rows matched none of those leading groups.
- **Intent (user words):** *"in case we have a group like that 5, 5, 2 we should
  choose the group that shows first in the preview panel to pick the tab. The
  idea behind this is to give user eyes what they are seeing."*
- **Decision:** take the attribute group of the **first preview row**, keep that
  group's rows, and open the panel most of them live in. Ties fall to the
  earliest (highest-relevance) row. Falls back to the fullest panel only when the
  preview can't answer, and never lands on a zero-match tab.
- **Rule extracted:** attention is the ranking signal. The biggest tab is not
  where the user is looking; the top of the preview is the only thing they have
  actually read.

### Case 9 — Multiple codes, comma- or space-separated
**Date:** 2026-08-01 (S104) · **Status:** ✅ implemented (mock) · **Decision:** [[decisions/decision-log|GS-20]]

- **Input:** paste a list — `442376, 448275` or `0000000091000 SCAC`.
- **Intent (user words):** *"show CODE123 results AND Code223 results, doesn't
  matter if they are of the same attribute or they are different … first
  rankings of CODE123 will get mixed with first rankings of Code223 as the
  overall results."*
- **Semantics — UNION.** A row matches if it matches **any** code; the per-code
  result sets interleave, ranked by match quality (exact before prefix before
  contains, whichever code produced the hit).
- **Naming trap, recorded:** the first implementation read "AND" as boolean AND
  (all codes on the SAME row → narrowing) and shipped it. In boolean search,
  AND/OR describe conditions **on one row**, so "show A's results and B's
  results" is what boolean logic calls **OR**. Measured: a cross-row pro pair
  → **0 rows under AND, 4 under union**.
- **Each row labels itself by ITS OWN matched code** — `Order #CODE123` on one
  row, `Buy Shipment #CODE223` on the next. There is no shared leading code,
  because a row only has to match one. (The landing TAB still follows the
  preview's first group — GS-18 is unaffected.)
- **Phrase-first, code-list fallback:** the whole string is tried as one needle
  against the full dataset; only when it matches nothing is it tokenized. Under
  union this is load-bearing — tokenizing `"Weyerhaeuser Company"` would union
  in every row containing "company". Pinned by a test.
- **Chips:** a same-attribute list offers ONE IN-list chip
  (`Pro#/Booking #: 442376, 448275`) which matches ANY of its values (GS-12);
  a mixed-attribute list offers no chip but still text-searches.
- **Interpretation resolved once per query** against the full dataset, so
  preview, table and counts read the query identically.
- **⚠ Open, user-flagged:** mixed result sets mean rows of different entity
  types share one list. **Row presentation per type (order-format row vs
  shipment-format row) is not yet designed** — see Open questions.

### Case 10 — Natural-language search ("intelligent" button) — FUTURE SCOPE
**Date:** 2026-08-01 (S104) · **Status:** 📋 logged, deliberately not explored

- **Intent (user words):** vectorized queries triggered by an explicit
  "intelligent" button — not implicit, not v1.
- **Architecture note:** the search spec (2026-07-31) reserves the seam — an
  explicit `mode: 'semantic'` on the same endpoint contract, pgvector available
  on Neon when the time comes. Nothing else designed yet by user direction.

### Case 11 — Bulk paste becomes ONE expandable set chip
**Date:** 2026-08-02 · **Status:** ✅ spec confirmed, component in build · **Decision:** [[decisions/decision-log|GS-21]]

- **Input:** paste many identifiers (Scenario 2 — tracking teams), press Enter.
- **Before:** the committed chip rendered the raw list (`"10075537, 10039336"`) — unmanageable at bulk scale; mixed lists got no chip at all.
- **After (spec):** one **expandable chip**. Collapsed: `<Attribute> Set • N IDs` (single detected type — *named-set rule:* every valid code's best match resolves to the same attribute) or `Multiple Set • N IDs` (mixed). Chevron expands an **EditableMiniPanel** anchored 4px below the badge (follows the badge position) for manual add/remove; **edits apply only on collapse/Enter**. Invalid/not-found codes paint **red** and are **decounted** + excluded from search.
- **Rejected:** gray per-code type initials — a code's type is a set of matches, not a fact (`442376` = Pro# AND Seal, S104). Row-level self-labeling (GS-15/GS-20) already answers "what is it?".
- **Type application:** on a Mixed set the suggestion panel offers attribute types; clicking one converts the batch to a single GS-12 IN-list chip of that type; non-matching codes go red + decounted.
- **Search semantics unchanged:** union across codes (GS-20); rows self-label.

### Case 12 — Dates: typed slashes suggest date/range chips; the empty bar offers them cold
**Date:** 2026-08-03 · **Status:** ⚠️ partially reversed 2026-08-04 (see below) · **Decision:** [[decisions/decision-log|GS-22]]
**Amends:** Case 4 / GS-14 (the "untouched bar offers nothing" rule gets a DATE carve-out).

> **Reversal (user, 2026-08-04):** the empty-bar carve-out below confused
> users and was reverted — an untouched/empty focused bar now suggests
> NOTHING again, restoring the plain GS-14 rule. The typed-slash behavior
> (`2/`, `2/3`, `2/3/2026` → "Filter by date") is UNCHANGED and still applies.

- **Input:** type a slashed date fragment (`2/`, `2/3`, `2/3/2026`).
- **Suggestions:** every date-typed attribute offers TWO chips — the plain date
  (`Pickup Date`) and its **Range** twin (`Pickup Date Range`). A slashed query
  leads with this "Filter by date" section; **bare digits never trigger it** (a
  pro/shipment number must not collapse into dates). ~~The **empty focused
  bar** now shows the same section~~ — *"dates are one of the cases where
  suggested filters should appear when searchbar is empty… later we might add
  more suggested filters to this case"* (user, 2026-08-03) — **reversed
  2026-08-04**: an empty bar suggests nothing (user, 2026-08-04 — reversal of
  the S106 carve-out: an empty bar suggests nothing). Attribute entry points
  stay gone regardless.
- **Commit:** the chip lands **expanded** with a **CalendarPicker** in the mini
  panel (same anchoring as the set chip's EditableMiniPanel). A complete typed
  date pre-fills one bound (`Pickup Date Range: 2/6/2026-`); picking the other
  completes the label (`…: 2/6/2026-4/6/2026`). Single-date chips complete on
  one pick and auto-collapse; ranges collapse via chevron/outside click.
- **Matching:** `kind: 'date-range'` chips compare **calendar days** (inclusive
  from/to; a missing bound leaves that side open; single = one-day range; no
  bounds yet = no narrowing so a half-built chip still previews). Shared
  `matchesChip` — glimpse and table agree by construction (S79c d.7).
- **Future field names:** the user's examples included *"Latest Pickup Date
  Range" / "Earliest Delivery Date Range"* — today's data carries only
  `pickupDate`/`deliveryDate`; the Latest/Earliest variants join when those
  fields exist in the index.
- **Partial pre-fill (2026-08-03):** the typed fragment shows in the chip like
  any other criterion — `Pickup Date: 12/../....`, `Pickup Date Range:
  12/../.... - ../../....`. Month+day default the year to CURRENT and pre-fill
  `from`; a month alone steers the calendar to that month/current year. M/D
  reading (matches every displayed date); a first segment > 12 can't be a
  month, so it's a DAY in the current month.
- **Invalid dates (user, 2026-08-03):** an impossible fragment (`40/`,
  `12/40`, `2/30/2026`) suggests as `Pickup Date: Invalid Date`; committing it
  anyway lands a **collapsed red "Invalid Date" chip whose calendar never
  opens** (nothing to pick). It carries no bounds, so it doesn't narrow;
  remove via X.
- **Single-date semantics CONFIRMED (user, 2026-08-03):** a lone date chip =
  *all shipments whose <attribute> falls on that day* — the one-day range
  (`from === to`) under calendar-day matching, shipment-grained per Core model
  #0/#1: *"in shipments everything is defaulted to shipments if no other
  option — or same-amount-of-results competing options — exist."* (Also feeds
  Q2's eventual answer: shipment grain is the domain default.)
- **Reopen-with-date refinement (user, 2026-08-03):** an open date chip
  suppresses the results panel only while it has NO date yet (fresh pick —
  the calendar owns the space below the bar as above). A **committed chip
  reopened for editing** (`open: true`, `from` already set) leaves the panel
  exactly as it was — reopening it must not force-close an already-open
  results panel behind it. Fixed in `ShipmentsGlobalSearch.jsx`'s open/close
  effect; suggestions gating (`pendingDateChip` in the hook) is unchanged.
- **No spurious search on reopen (user, 2026-08-03):** reopening a committed
  date chip's calendar must not re-fire the results search — nothing
  search-relevant changed, only the chip's UI-only `open` flag. Fixed in
  `useGlobalSearch.js`: the results-search effect now keys off a
  content-only serialization of chips (excludes `open`/`monthHint`), not the
  chips array's identity, so an `open`-only toggle no longer re-triggers
  `adapter.searchShipments`. A real bounds change (`onDateCommit`) still
  re-runs it.
- **Selecting a shipment is a pure dismissal, never a commit (user,
  2026-08-03):** clicking a match row (or the docked ShipmentsBar) while a
  date chip's calendar is open must close the results panel, suggestions, and
  the open chip — WITHOUT committing anything or firing a search. Previously
  this raced with the chip's own outside-click auto-commit (Case 12) and the
  "chip closed → open results" (`dateCompleted`) heuristic, which could
  reopen the panel right after the click closed it. Fixed in
  `ShipmentsGlobalSearch.jsx` via a `dismissSearchUI` helper (used by
  `handleMatchClick` and by the outside-click handler when the click lands on
  `.shipments-bar`) that force-closes any open date chip and suppresses that
  one heuristic pass via a one-shot ref guard. Clicks elsewhere outside the
  bar are unaffected — that's still the legitimate outside-click commit
  (S106) and may still open results.

---

## Open questions

- **Q6 — Result-row FORM per entity type (user-flagged 2026-08-01).** Case 9
  makes mixed-type result sets normal: an order-number code and a shipment
  code can both appear in one list. Today every row renders through `MatchRow`
  with the same shape, distinguished only by its label prefix and avatar icon.
  *"CODE123 might need an order format row and Code223 a shipment format row —
  btw we are still going to define how rows look."* Needs a design pass with
  Efrain before the server contract fixes the per-row payload; the projection
  already carries `attr` per hit, so the data is there whatever the design.

- **Q1 — Full entity-scope taxonomy.** The scope of all ~40 attributes needs to
  be settled (likely derivable from the CSV grouping + Jana). Drives every
  composed case. The draft table above is a starting guess.
- **Q2 — Customer-leading entity.** When the leading chip is customer-scoped,
  is the result entity a **customer** (one row per matching customer) or
  **shipments scoped to that customer**? Per Core model #0, the domain context
  (Shipments) argues the headline result is shipment-grained even when you lead
  with a customer — BUT Jana's examples (*"customers that have hazmat products in
  an order"*) show users sometimes genuinely want a **customer** result. Likely
  answer: customer-leading defaults to shipment-grained within Shipments, with an
  explicit way to flip the grain to customer when that's the intent. Currently:
  shipment entity + handshake icon. Needs a UX call — flagged, not decided.
- **Q3 — Order-row data shape.** Order rows currently inherit the *shipment's*
  route / customer / carrier / BOL (only order IDs exist at the main-row level).
  `orderDetails` has per-order shipFrom/shipTo, but lives in the on-demand detail
  file (too heavy to fetch for live preview). If per-order origin/destination is
  wanted in results, those fields must be lifted into the search index.
- **Q4 — Dedup / ordering of order rows** across multiple qualifying shipments
  when the order chip has a value (e.g. partial order # shared across shipments).
  Current: relevance-sorted by order # against the query, then sliced to 15.
- **Q5 — `total` semantics for "Show N results".** For order entity, N = matching
  orders. Confirm this is the number we route the table to (table is order-filtered
  vs shipment-filtered — interacts with the deferred table-filtering work).

---

## Promotion path

Firm rules graduate from this doc →
[[decisions/decision-log]] (`GS-NN`, with rationale/source) → [[global-search|canon]]
(mechanics) → eventual API contract docs. Until then, treat everything here as
the working model, subject to change as cases accumulate.
