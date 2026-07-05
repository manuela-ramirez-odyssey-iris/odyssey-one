---
domain: cross-cutting
type: functional-overview
tags: [global-search, user-stories, handoff, pm]
date: 2026-07-01
status: active
---

# Global Search — Functional Overview (for User Stories)

> **Purpose of this document.** A plain-language description of what Global Search
> does and how a user experiences it, written so a product manager can turn each
> capability into user stories. It describes *behavior and intent*, not code.
>
> **Scope note.** The design was drawn on a Tracking-style canvas, but the **first
> real deployment target is Shipments** — the domain that already has search and
> real data. Wherever this doc says "shipment," that's the v1 reality. The feature
> is built to be **domain-agnostic**, so the same experience later serves Orders,
> Carriers, Tracking, etc. — each domain just hands it a list of its own searchable
> fields.

---

## 1. What Global Search is, in one paragraph

Global Search is the single search bar that lives in the top navigation bar of the
app. Its job is to take a user from a **fuzzy intent** — "I need to find *a* shipment"
— to a **specific record or a filtered set of records**, by letting them stack up
search conditions one at a time. Instead of a single keyword box, it builds a little
row of **filter "chips"** (e.g. `Carrier: ABC Logistic`, `Status: Delivered`), and
each chip narrows the results further. It replaces the three separate search/filter
tools Shipments uses today (the search box, the chip row, and the right-side filter
drawer) with one unified surface.

---

## 2. The core idea: building a search from "chips"

- The user types, and the system **suggests conditions** to add.
- Selecting a suggestion turns it into a **chip** that sits inside the search bar.
- Chips **stack** — each new chip is an additional requirement. A record must match
  **all** chips to appear ("AND" logic). Example: `Carrier: ABC Logistic` + `Status:
  Delivered` returns only shipments that are *both* on that carrier *and* delivered.
- The user can remove any single chip, or clear everything at once.
- The **first chip decides what kind of record you're looking for.** If the first
  condition is order-related (e.g. an Order #), results come back as **orders**. Any
  other starting point returns **shipments**. Every chip after the first just filters
  that set.

> **Why it matters for stories:** the chip model is the heart of the feature. Most
> stories describe *adding, removing, combining, and interpreting* chips.

---

## 3. What a user can search for

Global Search is organized as a **guided progression** — a natural order of "what
you usually want to narrow down next." When the user hasn't typed anything yet, the
suggestions start at the top of this list; as they add chips, the suggestions walk
down it.

| Step | Theme (what the user is answering) | Example things they can search by |
|------|-----------------------------------|-----------------------------------|
| 1 | **Find the shipment** (identifiers) | Shipment #, Order #, Pro#, BOL#, Tracking # |
| 2 | **Who it belongs to** | Customer ID, Customer Name, Consignor, Consignee |
| 3 | **Where it goes** | Origin, Destination, Distance, Stops |
| 4 | **When it moves** | Pickup Date, Delivery Date (and earliest/latest variants) |
| 5 | **How it moves** | Mode (TL, LTL, Rail, Air…), Equipment, Seal # |
| 6 | **Operational status** | Carrier code (SCAC), Tender Status, Shipment Status |
| 7 | **Cargo details** | Weight, Package Count, Hazmat yes/no |
| 8 | **Financial details** | Freight cost (payable / receivable) |
| 9 | **Load logistics** | Load #, Load Count, Load Status |

**Notes for stories:**
- The full Shipments target is roughly **55 searchable fields**; today's prototype
  wires up about 15 of them. This gap is itself a body of work (adding the remaining
  fields).
- Some fields accept a **date range**, chosen with a small calendar pop-up.
- Some fields are **pick-lists** (e.g. Mode, Tender Status) — the user picks a value
  rather than typing it freely.
- Some fields allow **multiple values** (e.g. you can add two Origins), while most
  drop out of the suggestions once used (e.g. you only set Status once).

---

## 4. How searching feels, step by step

### 4.1 Typing and getting suggestions
- As the user types, suggestions appear **live** (with a tiny delay so it doesn't
  flicker on every keystroke).
- Suggestions are **ranked** — an exact match ("Accepted" → `Tender Status: Accepted`)
  ranks above a loose partial match.
- If the user types a value that could belong to more than one field, the system
  **offers both and does not guess.** Example: typing "New York" offers *both*
  `Origin: New York, NY` *and* `Destination: New York, NY`, and the user chooses.
- If the user types a word like "carrier," the system recognizes the **field name**
  itself and suggests it.

### 4.2 The suggestion dropdown has two sides
When the user is searching, a panel opens below the bar with two areas:

- **Best Match (left):** a preview of actual records that fit the search so far —
  showing route (origin → destination), customer, carrier, status, and key IDs. The
  part that matched the query is highlighted.
- **Suggested Filters (right):** the conditions the user could add next. With nothing
  typed, this shows the natural entry points. Once a chip is added, it advances to the
  *next* theme — e.g. after choosing a customer, it nudges toward "where do they go?"

At the bottom of this panel: an **"All Filters"** link (opens the full filter drawer),
a **"Clear all"**, and a prominent **"Show N results"** button.

### 4.3 Pasting a batch of IDs
- If a user pastes a big list of tracking/shipment IDs (comma or space separated),
  the system collapses them into **one compact chip** like `Trackings Set • 12 IDs`,
  with a small expander to see the full list.
- This supports the real workflow of "I have a spreadsheet column of 40 IDs, show me
  all of them."

### 4.4 Seeing results
- The **"Show N results"** button always reflects how many records currently match.
- Results are searched across the **entire pool of records**, *not* just whatever
  queue/tab the user happens to be looking at. (People routinely search beyond their
  current view — e.g. across all customers.)
- After a search, the **result category tabs auto-trim** to only the categories that
  still have matches, and their counts update. Empty categories disappear. Example:
  after adding `Status: Delivered`, only the delivered-related tabs remain.

---

## 5. The Filters drawer (form-based alternative)

Not everyone wants to build a search by typing chips. The **Filter button** (on the
right of the search bar) opens a **filter drawer** — a form view of the same search.

- It can be opened **at any time, even on an empty bar** — it's a first-class entry
  point, not just an "advanced" afterthought.
- The Filter button shows a **badge with the number of active conditions.**
- The drawer and the chip bar are **always in sync**: chips show up as filled-in form
  fields, and editing a form field updates the chips. There's one shared search behind
  both — they can never disagree.
- The drawer has two tabs:
  - **All Filters** — the form, grouped by category (status, client, location, etc.).
  - **Saved** — the user's saved searches (see below), reorderable by dragging.

---

## 6. Saved searches ("Saved Filters")

- A user can **save the current set of conditions** as a named, reusable filter.
- The save dialog **pre-fills a suggested name** from the conditions (e.g.
  `ABC Logistic - Delivered`) and lets the user rename it or drop specific conditions
  before saving.
- A saved filter, when applied, appears as **one single chip** carrying its name —
  even though it represents several underlying conditions. This keeps the bar tidy.
- Saved filters can be **reordered** (drag handle) and edited.

---

## 7. States the user will encounter

| Situation | What the user sees |
|-----------|--------------------|
| Nothing typed, not focused | Empty bar. The filter badge may show a count if a default is active (see below). |
| Focused, empty | Bar highlights; dropdown opens with the natural starting suggestions. |
| Typing | Dropdown narrows suggestions to the query. |
| Typing with chips already added | Dropdown shows matching record previews **and** the next suggested filters. |
| Chips applied | Chips sit in the bar; the input still accepts the next condition. |
| Saved filter applied | A single named chip represents the whole saved set. |
| No matches | A clear "No matches" message; the user can clear and retry. |
| Filter drawer open | A panel appears anchored under the bar; the page dims behind it. |

**Silent default:** the search starts with a quiet **"Last 30 Days"** time window that
counts toward the filter badge but doesn't show as a chip until the user changes it.
(There's a quick "Last Days" shortcut with Today / Yesterday / 7 / 30 / 60 / 90 / 180
/ 365 day options.)

---

## 8. Result cards — two shapes

Search results are shown as cards. There appear to be **two card layouts**:

- **Compact card** — for a simple single-leg shipment: tracking #, customer, carrier,
  mode, origin → destination, status, key IDs, latest event, and a "View Details" link.
- **Denser multi-stop card** — for a shipment with multiple stops: labeled Origin and
  Destination, a "N stops" indicator, scheduled pickup/delivery, and a progress rail.

The working assumption is that the **card shape is driven by the record itself**
(single-leg vs. multi-stop), not by a user toggle. *This is still to be confirmed with
design (Efrain).*

---

## 9. What's explicitly **future scope** (not v1)

- **Natural-language search.** Typing a sentence like *"tracking delayed today"* and
  having the system automatically break it into `Status: Delayed` + `Last Days: Today`.
  This is a stated v2 goal — powerful, but it adds a language-parsing layer that would
  delay the first release. **Not in v1.**
- **Rolling the same search out to other domains** (Orders, Carriers, Tracking). The
  feature is built to allow this, but v1 only targets Shipments.

---

## 10. Open questions the PM should resolve (each may spawn a story or a spec task)

These are known gaps/decisions that affect scope:

1. **Per-chip remove control** — the exact interaction to delete one chip (hover "×"?)
   isn't nailed down in the design.
2. **Result card trigger** — confirm that "single vs. multi-stop record" is what
   switches the card layout (with Efrain).
3. **List vs. map view** of results — a map view is hinted at but never shown.
4. **"Watchlist" tab** — its purpose/content is undefined.
5. **"Show N results" on the Saved tab** — does it preview the pointed-at saved
   filter, the applied one, or a combination?
6. **Behavior when chips overflow** the bar (wrapping to a second line vs. folding
   into a "+N" pill).
7. **Label consistency** — "Customer" vs "Customer Name" vs "Client" should be
   standardized across chips, suggestions, and the drawer.
8. **Saved filter edit/delete** affordances need to be fully defined.
9. **Shipments-specific field accuracy** (for Jana): are the date-field distinctions
   and any per-panel locked filters still correct? Is comma-separated Customer ID
   still a real thing?
10. **Result presentation in Shipments** (for Efrain): Shipments today shows table
    rows, while the design shows cards — decide whether to keep rows, introduce cards,
    or use a hybrid.

---

## 11. Quick reference — capabilities checklist (story seeds)

A user can:

- [ ] Type to get live, ranked search suggestions
- [ ] Add a condition as a chip by selecting a suggestion
- [ ] Stack multiple chips (AND filtering)
- [ ] Remove a single chip, or clear all
- [ ] Search by any of ~55 shipment fields (identifiers, parties, route, dates, mode,
      status, cargo, cost, load)
- [ ] Pick a date range from a calendar
- [ ] Choose from pick-list values (mode, status, etc.)
- [ ] Add multiple values for multi-value fields (e.g. two origins)
- [ ] Paste a batch of IDs and have them collapse into one chip
- [ ] Preview best-matching records before committing to a full search
- [ ] See a live "Show N results" count
- [ ] Search across the whole record pool, not just the current view
- [ ] See result category tabs auto-trim and recount as they filter
- [ ] Open a form-based filter drawer at any time
- [ ] Have the drawer and chip bar stay perfectly in sync
- [ ] Save the current search as a named, reusable filter
- [ ] Apply a saved filter as a single named chip
- [ ] Reorder and edit saved filters

---

*Sources: `vault/20-cross-cutting/global-search/` canon (spec, composed-criteria,
decision log GS-01–GS-13, attribute schema), the Shipments adaptation notes, and the
current implementation in `packages/ui/` and `apps/odyssey-one/src/search/`.*
